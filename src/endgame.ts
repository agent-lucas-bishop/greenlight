// ═══════════════════════════════════════════════════════════════
// R177: Endgame Content — Hall of Fame, Legacy Films, Endless Mode, Studio Milestones
// ═══════════════════════════════════════════════════════════════

import type { LeaderboardEntry } from './leaderboard';
import { getLeaderboard } from './leaderboard';

// ─── HALL OF FAME (Top 10 All-Time Runs) ───

export interface HallOfFameEntry extends LeaderboardEntry {
  careerEarnings?: number;
}

export function getHallOfFameTop10(): LeaderboardEntry[] {
  const lb = getLeaderboard();
  return [...lb].sort((a, b) => b.score - a.score).slice(0, 10);
}

export function getHallOfFameByEarnings(): LeaderboardEntry[] {
  const lb = getLeaderboard();
  return [...lb].sort((a, b) => b.earnings - a.earnings).slice(0, 10);
}

export function getTotalCareerEarnings(): number {
  const lb = getLeaderboard();
  return lb.reduce((sum, e) => sum + e.earnings, 0);
}

export function getTotalCareerFilms(): number {
  const lb = getLeaderboard();
  return lb.reduce((sum, e) => sum + e.films.length, 0);
}

// ─── LEGACY FILMS ───

export interface LegacyFilm {
  title: string;
  genre: string;
  tier: string;
  quality: number;
  boxOffice: number;
  studioName: string;
  runDate: string;
  criticScore?: number;
  criticStars?: number;
  season?: number;
}

const LEGACY_KEY = 'greenlight_legacy_films';
const MAX_LEGACY = 20;

export function getLegacyFilms(): LegacyFilm[] {
  try {
    const saved = localStorage.getItem(LEGACY_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function saveLegacyFilms(films: LegacyFilm[]) {
  try {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(films));
  } catch {}
}

export function addLegacyFilm(film: LegacyFilm): boolean {
  const films = getLegacyFilms();
  // Don't add duplicates
  if (films.some(f => f.title === film.title && f.runDate === film.runDate)) return false;
  films.push(film);
  // Sort by box office descending, keep top MAX_LEGACY
  films.sort((a, b) => b.boxOffice - a.boxOffice);
  saveLegacyFilms(films.slice(0, MAX_LEGACY));
  return true;
}

/** Get legacy films that could appear as "classic films" in rival rankings */
export function getLegacyFilmsForRivals(count: number): LegacyFilm[] {
  const films = getLegacyFilms();
  if (films.length === 0) return [];
  // Shuffle and pick
  const shuffled = [...films].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, films.length));
}

// ─── ENDLESS MODE ───

const ENDLESS_UNLOCK_KEY = 'greenlight_endless_unlocked';
const ENDLESS_LB_KEY = 'greenlight_endless_leaderboard';

export function isEndlessUnlocked(): boolean {
  try {
    return localStorage.getItem(ENDLESS_UNLOCK_KEY) === 'true';
  } catch {}
  return false;
}

export function unlockEndless() {
  try {
    localStorage.setItem(ENDLESS_UNLOCK_KEY, 'true');
  } catch {}
}

/** Check if this run qualifies for endless unlock (won on Mogul) */
export function checkEndlessUnlock(won: boolean, difficulty: string): boolean {
  if (won && difficulty === 'mogul') {
    unlockEndless();
    return true;
  }
  return false;
}

export interface EndlessLeaderboardEntry {
  id: string;
  date: string;
  studioName: string;
  seasons: number;
  totalEarnings: number;
  films: number;
  archetype: string;
  finalBudget: number;
}

export function getEndlessLeaderboard(): EndlessLeaderboardEntry[] {
  try {
    const saved = localStorage.getItem(ENDLESS_LB_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

export function addEndlessLeaderboardEntry(entry: Omit<EndlessLeaderboardEntry, 'id'>): void {
  const lb = getEndlessLeaderboard();
  const full: EndlessLeaderboardEntry = { ...entry, id: `endless_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
  lb.push(full);
  lb.sort((a, b) => b.seasons - a.seasons || b.totalEarnings - a.totalEarnings);
  try {
    localStorage.setItem(ENDLESS_LB_KEY, JSON.stringify(lb.slice(0, 20)));
  } catch {}
}

// ─── STUDIO MILESTONES ───

export interface StudioMilestone {
  id: string;
  title: string;
  emoji: string;
  description: string;
  condition: (stats: MilestoneStats) => boolean;
}

export interface MilestoneStats {
  totalFilms: number;
  totalCareerEarnings: number;
  wonDifficulties: Set<string>;
  totalFreshScores: number; // critic scores >= 60
}

export const STUDIO_MILESTONES: StudioMilestone[] = [
  {
    id: 'century_club',
    title: 'Century Club',
    emoji: '🎬',
    description: 'Produce 100 total films across all runs',
    condition: (s) => s.totalFilms >= 100,
  },
  {
    id: 'billionaire_mogul',
    title: 'Billionaire Mogul',
    emoji: '💰',
    description: 'Earn $1B in career box office earnings',
    condition: (s) => s.totalCareerEarnings >= 1000,
  },
  {
    id: 'triple_crown',
    title: 'Triple Crown',
    emoji: '👑',
    description: 'Win on all 3 difficulties (Indie, Studio, Mogul)',
    condition: (s) => s.wonDifficulties.has('indie') && s.wonDifficulties.has('studio') && s.wonDifficulties.has('mogul'),
  },
  {
    id: 'critics_darling',
    title: "Critics' Darling",
    emoji: '🍅',
    description: 'Achieve 50 fresh critic scores (60%+) across all runs',
    condition: (s) => s.totalFreshScores >= 50,
  },
];

const MILESTONES_KEY = 'greenlight_studio_milestones';

export interface MilestoneState {
  unlocked: string[]; // IDs of unlocked milestones
  totalFreshScores: number;
}

export function getMilestoneState(): MilestoneState {
  try {
    const saved = localStorage.getItem(MILESTONES_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { unlocked: [], totalFreshScores: 0 };
}

function saveMilestoneState(state: MilestoneState) {
  try {
    localStorage.setItem(MILESTONES_KEY, JSON.stringify(state));
  } catch {}
}

export function isMilestoneUnlocked(id: string): boolean {
  return getMilestoneState().unlocked.includes(id);
}

export function getActiveTitles(): string[] {
  const state = getMilestoneState();
  return STUDIO_MILESTONES.filter(m => state.unlocked.includes(m.id)).map(m => `${m.emoji} ${m.title}`);
}

/** Called after each run to check and award milestones. Returns newly unlocked milestone IDs. */
export function checkAndAwardMilestones(freshScoresThisRun: number): string[] {
  const ms = getMilestoneState();
  ms.totalFreshScores += freshScoresThisRun;
  
  const lb = getLeaderboard();
  const totalFilms = lb.reduce((sum, e) => sum + e.films.length, 0);
  const totalCareerEarnings = lb.reduce((sum, e) => sum + e.earnings, 0);
  const wonDifficulties = new Set<string>();
  for (const e of lb) {
    if (e.won && e.difficulty) wonDifficulties.add(e.difficulty);
  }

  const stats: MilestoneStats = {
    totalFilms,
    totalCareerEarnings,
    wonDifficulties,
    totalFreshScores: ms.totalFreshScores,
  };

  const newlyUnlocked: string[] = [];
  for (const m of STUDIO_MILESTONES) {
    if (!ms.unlocked.includes(m.id) && m.condition(stats)) {
      ms.unlocked.push(m.id);
      newlyUnlocked.push(m.id);
    }
  }

  saveMilestoneState(ms);
  return newlyUnlocked;
}

/** Get progress for all milestones */
export function getMilestoneProgress(): { milestone: StudioMilestone; unlocked: boolean; progress: number }[] {
  const ms = getMilestoneState();
  const lb = getLeaderboard();
  const totalFilms = lb.reduce((sum, e) => sum + e.films.length, 0);
  const totalCareerEarnings = lb.reduce((sum, e) => sum + e.earnings, 0);
  const wonDifficulties = new Set<string>();
  for (const e of lb) {
    if (e.won && e.difficulty) wonDifficulties.add(e.difficulty);
  }

  return STUDIO_MILESTONES.map(m => {
    const unlocked = ms.unlocked.includes(m.id);
    let progress = 0;
    if (m.id === 'century_club') progress = Math.min(1, totalFilms / 100);
    else if (m.id === 'billionaire_mogul') progress = Math.min(1, totalCareerEarnings / 1000);
    else if (m.id === 'triple_crown') progress = wonDifficulties.size / 3;
    else if (m.id === 'critics_darling') progress = Math.min(1, ms.totalFreshScores / 50);
    return { milestone: m, unlocked, progress };
  });
}

// ─── TEXT-BASED FILM POSTER ───

const POSTER_FRAMES = ['═', '║', '╔', '╗', '╚', '╝'];

export function generateFilmPoster(film: { title: string; genre: string; tier: string; boxOffice: number; quality?: number }): string[] {
  const genreEmoji: Record<string, string> = {
    Action: '💥', Comedy: '😂', Drama: '🎭', Horror: '👻',
    'Sci-Fi': '🚀', Romance: '💕', Thriller: '🔍',
  };
  const tierStars: Record<string, string> = {
    BLOCKBUSTER: '★★★★★', SMASH: '★★★★☆', HIT: '★★★☆☆', FLOP: '★☆☆☆☆',
  };
  const emoji = genreEmoji[film.genre] || '🎬';
  const stars = tierStars[film.tier] || '★★★☆☆';
  const title = film.title.length > 18 ? film.title.slice(0, 16) + '…' : film.title;
  
  return [
    `╔══════════════════════╗`,
    `║  ${emoji}                   ║`,
    `║                      ║`,
    `║  ${title.padEnd(20)}║`,
    `║  ${film.genre.padEnd(20)}║`,
    `║  ${stars.padEnd(20)}║`,
    `║  $${film.boxOffice.toFixed(1)}M${' '.repeat(Math.max(0, 15 - `$${film.boxOffice.toFixed(1)}M`.length))}║`,
    `╚══════════════════════╝`,
  ];
}
