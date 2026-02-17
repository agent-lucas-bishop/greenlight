// R223: Player Profiles & Stats Dashboard
// Tracks lifetime stats, per-difficulty stats, career milestones, recent runs, and hall of fame

import type { Difficulty, Genre, RewardTier } from './types';

const STORAGE_KEY = 'greenlight-profile';

// ─── Types ───

export interface FilmRecord {
  title: string;
  genre: Genre;
  tier: RewardTier;
  quality: number;
  boxOffice: number;
  score: number; // run score at time of film
  date: string;
  difficulty: Difficulty;
}

export interface RunRecord {
  id: string;
  date: string;
  won: boolean;
  score: number;
  earnings: number;
  filmsProduced: number;
  difficulty: Difficulty;
  archetype: string;
  rank: string;
}

export interface DifficultyStats {
  runs: number;
  wins: number;
  losses: number;
  bestScore: number;
  bestStreak: number;
  currentStreak: number;
  totalBoxOffice: number;
  totalBudgetSpent: number;
  moviesProduced: number;
  sRankCount: number;
}

export interface CareerMilestone {
  id: string;
  name: string;
  description: string;
  emoji: string;
  unlockedAt: string | null; // ISO date or null if not yet unlocked
}

export interface PlayerProfile {
  // Lifetime stats
  totalRuns: number;
  wins: number;
  losses: number;
  bestStreak: number;
  currentStreak: number;
  totalBoxOffice: number;
  totalBudgetSpent: number;
  moviesProduced: number;
  sRankCount: number;
  genresUsed: Record<string, number>; // genre -> frequency
  favoriteTalent: string | null;
  talentUsage: Record<string, number>; // talent name -> count
  highestGrossingFilm: FilmRecord | null;

  // Per-difficulty
  difficultyStats: Record<Difficulty, DifficultyStats>;

  // Career milestones
  milestones: Record<string, string>; // milestone id -> unlock date ISO

  // Recent runs (last 10)
  recentRuns: RunRecord[];

  // Hall of fame (top 5 movies by score/quality)
  hallOfFame: FilmRecord[];
}

// ─── Milestone Definitions ───

export const CAREER_MILESTONES: { id: string; name: string; description: string; emoji: string; check: (p: PlayerProfile) => boolean }[] = [
  { id: 'first_win', name: 'First Victory', description: 'Win your first run', emoji: '🏆', check: p => p.wins >= 1 },
  { id: 'first_s_rank', name: 'S-Rank Director', description: 'Achieve an S-rank on any run', emoji: '⭐', check: p => p.sRankCount >= 1 },
  { id: '10_wins', name: 'Veteran Producer', description: 'Win 10 runs', emoji: '🎖️', check: p => p.wins >= 10 },
  { id: '25_wins', name: 'Award Season Regular', description: 'Win 25 runs', emoji: '🏅', check: p => p.wins >= 25 },
  { id: '50_movies', name: 'Prolific Filmmaker', description: 'Produce 50 movies', emoji: '🎞️', check: p => p.moviesProduced >= 50 },
  { id: '100_movies', name: 'Century Club', description: 'Produce 100 movies', emoji: '💯', check: p => p.moviesProduced >= 100 },
  { id: '1b_bo', name: 'Billion Dollar Studio', description: 'Earn $1B lifetime box office', emoji: '💰', check: p => p.totalBoxOffice >= 1000 },
  { id: '5b_bo', name: 'Box Office Titan', description: 'Earn $5B lifetime box office', emoji: '💎', check: p => p.totalBoxOffice >= 5000 },
  { id: '5_streak', name: 'Hot Streak', description: 'Win 5 runs in a row', emoji: '🔥', check: p => p.bestStreak >= 5 },
  { id: '10_streak', name: 'Unstoppable', description: 'Win 10 runs in a row', emoji: '⚡', check: p => p.bestStreak >= 10 },
  { id: 'all_genres', name: 'Genre Explorer', description: 'Use all 7 genres', emoji: '🎭', check: p => Object.keys(p.genresUsed).length >= 7 },
  { id: 'mogul_win', name: 'Mogul Conqueror', description: 'Win a run on Mogul difficulty', emoji: '💀', check: p => p.difficultyStats.mogul.wins >= 1 },
  { id: '10_s_ranks', name: 'Masterclass', description: 'Achieve 10 S-rank runs', emoji: '🌟', check: p => p.sRankCount >= 10 },
  { id: '50_runs', name: 'Studio Veteran', description: 'Complete 50 runs', emoji: '📋', check: p => p.totalRuns >= 50 },
];

// ─── Career Titles ───

export function getCareerTitle(profile: PlayerProfile): { title: string; emoji: string } {
  const w = profile.wins;
  const bo = profile.totalBoxOffice;
  const s = profile.sRankCount;
  const mogulWins = profile.difficultyStats.mogul.wins;

  if (mogulWins >= 10 && s >= 20 && bo >= 10000) return { title: 'Hollywood Legend', emoji: '👑' };
  if (mogulWins >= 5 && s >= 10) return { title: 'Legendary Mogul', emoji: '🏛️' };
  if (w >= 50 && bo >= 5000) return { title: 'Studio Tycoon', emoji: '💎' };
  if (w >= 30 && s >= 5) return { title: 'Studio Executive', emoji: '🌟' };
  if (w >= 20 && bo >= 2000) return { title: 'Acclaimed Director', emoji: '🎬' };
  if (w >= 10) return { title: 'Seasoned Producer', emoji: '⭐' };
  if (w >= 5) return { title: 'Rising Filmmaker', emoji: '📈' };
  if (w >= 1) return { title: 'Indie Darling', emoji: '🎥' };
  if (profile.totalRuns >= 3) return { title: 'Aspiring Filmmaker', emoji: '🎞️' };
  return { title: 'Newcomer', emoji: '🌱' };
}

// ─── Avatar Frame Colors ───

export function getAvatarFrameColor(profile: PlayerProfile): string {
  const title = getCareerTitle(profile).title;
  const map: Record<string, string> = {
    'Hollywood Legend': '#ff6b6b',
    'Legendary Mogul': '#ffd700',
    'Studio Tycoon': '#b9f2ff',
    'Studio Executive': '#ffd93d',
    'Acclaimed Director': '#bb86fc',
    'Seasoned Producer': '#6bcb77',
    'Rising Filmmaker': '#5dade2',
    'Indie Darling': '#f39c12',
    'Aspiring Filmmaker': '#888',
    'Newcomer': '#555',
  };
  return map[title] || '#555';
}

// ─── Default Profile ───

function defaultDiffStats(): DifficultyStats {
  return { runs: 0, wins: 0, losses: 0, bestScore: 0, bestStreak: 0, currentStreak: 0, totalBoxOffice: 0, totalBudgetSpent: 0, moviesProduced: 0, sRankCount: 0 };
}

function defaultProfile(): PlayerProfile {
  return {
    totalRuns: 0, wins: 0, losses: 0, bestStreak: 0, currentStreak: 0,
    totalBoxOffice: 0, totalBudgetSpent: 0, moviesProduced: 0, sRankCount: 0,
    genresUsed: {}, favoriteTalent: null, talentUsage: {},
    highestGrossingFilm: null,
    difficultyStats: { indie: defaultDiffStats(), studio: defaultDiffStats(), auteur: defaultDiffStats(), mogul: defaultDiffStats(), nightmare: defaultDiffStats(), custom: defaultDiffStats() },
    milestones: {},
    recentRuns: [],
    hallOfFame: [],
  };
}

// ─── Persistence ───

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw);
    // Merge with defaults for forward compatibility
    return { ...defaultProfile(), ...parsed, difficultyStats: { ...defaultProfile().difficultyStats, ...(parsed.difficultyStats || {}) } };
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch { /* quota exceeded — ignore */ }
}

// ─── Update Profile After Run ───

export interface RunEndData {
  won: boolean;
  score: number;
  rank: string;
  earnings: number;
  budgetSpent: number;
  difficulty: Difficulty;
  archetype: string;
  films: { title: string; genre: Genre; tier: RewardTier; quality: number; boxOffice: number }[];
  talentNames?: string[];
}

export function updateProfileAfterRun(data: RunEndData): PlayerProfile {
  const p = loadProfile();
  const now = new Date().toISOString().slice(0, 10);

  // Lifetime stats
  p.totalRuns++;
  if (data.won) {
    p.wins++;
    p.currentStreak++;
    if (p.currentStreak > p.bestStreak) p.bestStreak = p.currentStreak;
  } else {
    p.losses++;
    p.currentStreak = 0;
  }

  p.totalBoxOffice += data.earnings;
  p.totalBudgetSpent += data.budgetSpent;
  p.moviesProduced += data.films.length;

  if (data.rank === 'S') p.sRankCount++;

  // Genres
  for (const f of data.films) {
    p.genresUsed[f.genre] = (p.genresUsed[f.genre] || 0) + 1;
  }

  // Talent
  if (data.talentNames) {
    for (const t of data.talentNames) {
      p.talentUsage[t] = (p.talentUsage[t] || 0) + 1;
    }
    // Update favorite talent
    let maxCount = 0;
    let fav: string | null = null;
    for (const [name, count] of Object.entries(p.talentUsage)) {
      if (count > maxCount) { maxCount = count; fav = name; }
    }
    p.favoriteTalent = fav;
  }

  // Highest grossing film
  for (const f of data.films) {
    if (!p.highestGrossingFilm || f.boxOffice > p.highestGrossingFilm.boxOffice) {
      p.highestGrossingFilm = { ...f, score: data.score, date: now, difficulty: data.difficulty };
    }
  }

  // Per-difficulty stats
  const d = p.difficultyStats[data.difficulty] || defaultDiffStats();
  d.runs++;
  if (data.won) {
    d.wins++;
    d.currentStreak++;
    if (d.currentStreak > d.bestStreak) d.bestStreak = d.currentStreak;
  } else {
    d.losses++;
    d.currentStreak = 0;
  }
  d.totalBoxOffice += data.earnings;
  d.totalBudgetSpent += data.budgetSpent;
  d.moviesProduced += data.films.length;
  if (data.rank === 'S') d.sRankCount++;
  if (data.score > d.bestScore) d.bestScore = data.score;
  p.difficultyStats[data.difficulty] = d;

  // Recent runs (last 10)
  const runRecord: RunRecord = {
    id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: now, won: data.won, score: data.score, earnings: data.earnings,
    filmsProduced: data.films.length, difficulty: data.difficulty,
    archetype: data.archetype, rank: data.rank,
  };
  p.recentRuns = [runRecord, ...p.recentRuns].slice(0, 10);

  // Hall of fame (top 5 films by quality * boxOffice composite)
  for (const f of data.films) {
    const filmRecord: FilmRecord = { ...f, score: data.score, date: now, difficulty: data.difficulty };
    p.hallOfFame.push(filmRecord);
  }
  p.hallOfFame.sort((a, b) => (b.quality * b.boxOffice) - (a.quality * a.boxOffice));
  p.hallOfFame = p.hallOfFame.slice(0, 5);

  // Check milestones
  let newMilestone = false;
  for (const m of CAREER_MILESTONES) {
    if (!p.milestones[m.id] && m.check(p)) {
      p.milestones[m.id] = now;
      newMilestone = true;
    }
  }
  if (newMilestone) {
    try { import('./sound').then(({ sfx }) => sfx.milestoneUnlock()); } catch {}
  }

  saveProfile(p);
  return p;
}

// ─── Getters ───

export function getUnlockedMilestonesList(): (typeof CAREER_MILESTONES[number] & { unlockedAt: string })[] {
  const p = loadProfile();
  return CAREER_MILESTONES
    .filter(m => p.milestones[m.id])
    .map(m => ({ ...m, unlockedAt: p.milestones[m.id] }));
}

export function getAllMilestonesWithStatus(): (typeof CAREER_MILESTONES[number] & { unlocked: boolean; unlockedAt: string | null })[] {
  const p = loadProfile();
  return CAREER_MILESTONES.map(m => ({ ...m, unlocked: !!p.milestones[m.id], unlockedAt: p.milestones[m.id] || null }));
}
