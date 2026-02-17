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
}

const LB_KEY = 'greenlight_leaderboard';
const MAX_ENTRIES = 20;

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const saved = localStorage.getItem(LB_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

export function addLeaderboardEntry(entry: Omit<LeaderboardEntry, 'id'>): LeaderboardEntry {
  const lb = getLeaderboard();
  const full: LeaderboardEntry = { ...entry, id: `lb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
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
