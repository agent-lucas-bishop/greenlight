// Local leaderboard — persisted in localStorage

export interface FilmDetail {
  title: string;
  genre: string;
  tier: string;
  quality?: number;
  boxOffice?: number;
  season?: number;
  cast?: string[];
  director?: string;
  budgetSpent?: number;
  nominated?: boolean;
  criticScore?: number; // R173: fresh percentage (0-100)
  criticStars?: number; // R173: average star rating (1-5)
}

export interface LeaderboardEntry {
  id: string;
  date: string;
  score: number;
  rank: string;
  seasons: number;
  earnings: number;
  reputation: number;
  mode: string;
  challenge?: string;
  archetype: string;
  films: FilmDetail[];
  won: boolean;
  dailySeed?: string; // date string if daily run
  difficulty?: string;
  studioName?: string;
  runTitle?: string;
  prestigeLevel?: number;
  prestigeTitle?: string;
  legacyRating?: string;
  playerName?: string;
  directorStyle?: string;
  runHash?: string;
}

const LB_KEY = 'greenlight_leaderboard';
const MAX_ENTRIES = 50;
const PLAYER_NAME_KEY = 'greenlight_player_name';

// ─── Player Name ───

export function getPlayerName(): string | null {
  try { return localStorage.getItem(PLAYER_NAME_KEY); } catch { return null; }
}

export function setPlayerName(name: string): void {
  try { localStorage.setItem(PLAYER_NAME_KEY, name.trim().slice(0, 24)); } catch {}
}

export function hasPlayerName(): boolean {
  return !!getPlayerName();
}

// ─── Score Calculation ───

export interface ScoreInput {
  totalBO: number;
  criticAvg: number;    // average critic score across films (0-100)
  audienceAvg: number;  // average audience/quality score across films
  achievementsUnlocked: number;
  filmsCount: number;
  isVictory: boolean;
  difficulty: string;
  challengeMultiplier?: number;
  modifierMultiplier?: number;
}

export function calculateLeaderboardScore(input: ScoreInput): number {
  const boScore = input.totalBO * 2;
  const criticScore = input.criticAvg * 1.5;
  const audienceScore = input.audienceAvg * 1.0;
  const achievementBonus = input.achievementsUnlocked * 25;
  const filmBonus = input.filmsCount * 10;
  const victoryBonus = input.isVictory ? 200 : 0;
  const diffMultiplier = input.difficulty === 'nightmare' ? 2.5 : input.difficulty === 'mogul' ? 1.5 : input.difficulty === 'indie' ? 0.8 : input.difficulty === 'custom' ? 1.0 : 1.0;
  const base = (boScore + criticScore + audienceScore + achievementBonus + filmBonus + victoryBonus) * diffMultiplier;
  return Math.round(base * (input.challengeMultiplier || 1) * (input.modifierMultiplier || 1));
}

// ─── Run Hash ───

export function generateRunHash(entry: Omit<LeaderboardEntry, 'id'>): string {
  const raw = `${entry.date}|${entry.score}|${entry.earnings}|${entry.films.length}|${entry.playerName || ''}|${entry.difficulty || ''}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36).padStart(6, '0').slice(0, 6).toUpperCase();
}

// ─── Difficulty-specific Leaderboard ───

export function getLeaderboardByDifficulty(difficulty: string): LeaderboardEntry[] {
  return getLeaderboard().filter(e => (e.difficulty || 'studio') === difficulty);
}

export function getPersonalBestByDifficulty(difficulty: string): LeaderboardEntry | null {
  const board = getLeaderboardByDifficulty(difficulty);
  return board.length > 0 ? board[0] : null;
}

export function getEntryRank(entry: LeaderboardEntry): number {
  const board = getLeaderboardByDifficulty(entry.difficulty || 'studio');
  const idx = board.findIndex(e => e.id === entry.id);
  return idx >= 0 ? idx + 1 : -1;
}

export function isNewHighScore(score: number, difficulty: string): boolean {
  const board = getLeaderboardByDifficulty(difficulty);
  if (board.length < 10) return true;
  return score > (board[9]?.score || 0);
}

// ─── Shareable Run Card ───

export function generateRunCard(entry: LeaderboardEntry): string {
  const hash = entry.runHash || generateRunHash(entry);
  const bestFilm = entry.films.length > 0
    ? entry.films.reduce((a, b) => (b.boxOffice || 0) > (a.boxOffice || 0) ? b : a)
    : null;
  const tierEmoji: Record<string, string> = { BLOCKBUSTER: '🟩', SMASH: '🟨', HIT: '🟧', FLOP: '🟥' };
  const grid = entry.films.map(f => tierEmoji[f.tier] || '⬜').join('');
  const diffBadge = entry.difficulty === 'nightmare' ? '💀 Nightmare' : entry.difficulty === 'mogul' ? '🔴 Hard' : entry.difficulty === 'indie' ? '🟢 Easy' : entry.difficulty === 'custom' ? '⚙️ Custom' : '🟡 Normal';

  const lines = [
    `🎬 GREENLIGHT ${entry.won ? '🏆' : '💀'} #${hash}`,
    '',
    entry.playerName ? `🎭 ${entry.playerName}` : null,
    entry.studioName ? `🏛️ ${entry.studioName}` : null,
    `${diffBadge} · ${entry.directorStyle || 'Director'}`,
    '',
    grid,
    '',
    `⭐ Score: ${entry.score} (${entry.rank}-Rank)`,
    `💰 $${entry.earnings.toFixed(1)}M · 🎥 ${entry.films.length} Films`,
    bestFilm ? `👑 "${bestFilm.title}" ($${(bestFilm.boxOffice || 0).toFixed(1)}M)` : null,
    '',
    'greenlight-plum.vercel.app',
  ];
  return lines.filter(l => l !== null).join('\n');
}

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const saved = localStorage.getItem(LB_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

export function addLeaderboardEntry(entry: Omit<LeaderboardEntry, 'id'>): LeaderboardEntry {
  const lb = getLeaderboard();
  const playerName = entry.playerName || getPlayerName() || undefined;
  const runHash = generateRunHash(entry);
  const full: LeaderboardEntry = { ...entry, id: `lb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, playerName, runHash };
  lb.push(full);
  lb.sort((a, b) => b.score - a.score);
  const trimmed = lb.slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(LB_KEY, JSON.stringify(trimmed));
  } catch {}
  return full;
}

export function getDailyBest(dateStr: string): LeaderboardEntry | null {
  const lb = getLeaderboard();
  const daily = lb.filter(e => e.dailySeed === dateStr);
  return daily.length > 0 ? daily[0] : null;
}

export function hasDailyRun(dateStr: string): boolean {
  return getLeaderboard().some(e => e.dailySeed === dateStr);
}

/** Get all runs for a specific seed (daily, weekly, or custom), sorted by score */
export function getSeedLeaderboard(seed: string): LeaderboardEntry[] {
  const lb = getLeaderboard();
  return lb.filter(e => e.dailySeed === seed).sort((a, b) => b.score - a.score);
}

export function hasWeeklyRun(weekStr: string): boolean {
  return getLeaderboard().some(e => e.dailySeed === `weekly:${weekStr}`);
}

export function getWeeklyBest(weekStr: string): LeaderboardEntry | null {
  const lb = getLeaderboard();
  const weekly = lb.filter(e => e.dailySeed === `weekly:${weekStr}`).sort((a, b) => b.score - a.score);
  return weekly.length > 0 ? weekly[0] : null;
}
