// Local leaderboard — persisted in localStorage

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
  films: { title: string; genre: string; tier: string }[];
  won: boolean;
  dailySeed?: string; // date string if daily run
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
