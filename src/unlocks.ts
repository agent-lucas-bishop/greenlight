// Legacy unlock system — persistent progress across runs

export interface UnlockState {
  totalWins: number;
  totalRuns: number;
  bestScore: number;
  unlockedTalent: string[]; // talent names unlocked
  unlockedScripts: string[]; // script titles unlocked
  achievements: string[];
}

const STORAGE_KEY = 'greenlight_unlocks';

export function getUnlocks(): UnlockState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    totalWins: 0,
    totalRuns: 0,
    bestScore: 0,
    unlockedTalent: [],
    unlockedScripts: [],
    achievements: [],
  };
}

export function saveUnlocks(state: UnlockState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function recordRunEnd(won: boolean, score: number, achievementIds: string[]) {
  const u = getUnlocks();
  u.totalRuns++;
  if (won) u.totalWins++;
  u.bestScore = Math.max(u.bestScore, score);
  for (const a of achievementIds) {
    if (!u.achievements.includes(a)) u.achievements.push(a);
  }
  saveUnlocks(u);
}

// Run stats shown on start screen
export function getRunStats(): { wins: number; runs: number; bestScore: number; winRate: string } {
  const u = getUnlocks();
  return {
    wins: u.totalWins,
    runs: u.totalRuns,
    bestScore: u.bestScore,
    winRate: u.totalRuns > 0 ? `${Math.round(u.totalWins / u.totalRuns * 100)}%` : 'N/A',
  };
}
