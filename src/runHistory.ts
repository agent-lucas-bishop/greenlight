// ─── Run History & Local Leaderboard ───
// Stores ALL past runs in localStorage (`gl_leaderboard`).
// Provides stats summary, personal bests, and full run history.

const GL_LB_KEY = 'gl_leaderboard';
const MAX_HISTORY = 500; // keep last 500 runs max

export interface RunHistoryEntry {
  id: string;
  runNumber: number;
  date: string;              // ISO date string
  score: number;
  rank: string;              // S/A/B/C/D/F
  totalBoxOffice: number;
  filmsProduced: number;
  highestRatedFilm: string;  // title of best film
  highestRatedFilmScore: number; // quality of best film
  studioLevel: number;       // prestige level at time of run
  won: boolean;
  studioName?: string;
  difficulty?: string;
  mode?: string;
  archetype?: string;
}

export interface LeaderboardStats {
  totalRuns: number;
  averageScore: number;
  bestScore: number;
  totalLifetimeBoxOffice: number;
  winRate: number;           // percentage 0-100
  successfulRuns: number;    // score > threshold
  personalBests: {
    bestScore: { value: number; runId: string; date: string } | null;
    bestBoxOffice: { value: number; runId: string; date: string } | null;
    mostFilms: { value: number; runId: string; date: string } | null;
    highestRatedFilm: { value: string; quality: number; runId: string; date: string } | null;
  };
}

// Success threshold: score > 300 counts as "successful"
const SUCCESS_THRESHOLD = 300;

// ─── Storage ───

export function getAllRunHistory(): RunHistoryEntry[] {
  try {
    const raw = localStorage.getItem(GL_LB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveRunHistory(entries: RunHistoryEntry[]): void {
  try {
    localStorage.setItem(GL_LB_KEY, JSON.stringify(entries.slice(-MAX_HISTORY)));
  } catch {}
}

// ─── Record a Run ───

export function recordRunToHistory(data: Omit<RunHistoryEntry, 'id' | 'runNumber'>): RunHistoryEntry {
  const history = getAllRunHistory();
  const runNumber = history.length > 0 ? Math.max(...history.map(h => h.runNumber)) + 1 : 1;
  const entry: RunHistoryEntry = {
    ...data,
    id: `glr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    runNumber,
  };
  history.push(entry);
  saveRunHistory(history);
  return entry;
}

// ─── Top 50 Leaderboard (sorted by score) ───

export function getTop50(): RunHistoryEntry[] {
  return [...getAllRunHistory()].sort((a, b) => b.score - a.score).slice(0, 50);
}

// ─── Stats ───

export function getLeaderboardStats(): LeaderboardStats {
  const history = getAllRunHistory();

  if (history.length === 0) {
    return {
      totalRuns: 0,
      averageScore: 0,
      bestScore: 0,
      totalLifetimeBoxOffice: 0,
      winRate: 0,
      successfulRuns: 0,
      personalBests: {
        bestScore: null,
        bestBoxOffice: null,
        mostFilms: null,
        highestRatedFilm: null,
      },
    };
  }

  const totalScore = history.reduce((s, h) => s + h.score, 0);
  const wins = history.filter(h => h.won).length;
  const successful = history.filter(h => h.score > SUCCESS_THRESHOLD).length;

  // Personal bests
  let bestScoreEntry: RunHistoryEntry | null = null;
  let bestBOEntry: RunHistoryEntry | null = null;
  let mostFilmsEntry: RunHistoryEntry | null = null;
  let bestFilmEntry: RunHistoryEntry | null = null;

  for (const h of history) {
    if (!bestScoreEntry || h.score > bestScoreEntry.score) bestScoreEntry = h;
    if (!bestBOEntry || h.totalBoxOffice > bestBOEntry.totalBoxOffice) bestBOEntry = h;
    if (!mostFilmsEntry || h.filmsProduced > mostFilmsEntry.filmsProduced) mostFilmsEntry = h;
    if (!bestFilmEntry || h.highestRatedFilmScore > bestFilmEntry.highestRatedFilmScore) bestFilmEntry = h;
  }

  return {
    totalRuns: history.length,
    averageScore: Math.round(totalScore / history.length),
    bestScore: bestScoreEntry?.score || 0,
    totalLifetimeBoxOffice: Math.round(history.reduce((s, h) => s + h.totalBoxOffice, 0) * 10) / 10,
    winRate: Math.round((wins / history.length) * 100),
    successfulRuns: successful,
    personalBests: {
      bestScore: bestScoreEntry ? { value: bestScoreEntry.score, runId: bestScoreEntry.id, date: bestScoreEntry.date } : null,
      bestBoxOffice: bestBOEntry ? { value: Math.round(bestBOEntry.totalBoxOffice * 10) / 10, runId: bestBOEntry.id, date: bestBOEntry.date } : null,
      mostFilms: mostFilmsEntry ? { value: mostFilmsEntry.filmsProduced, runId: mostFilmsEntry.id, date: mostFilmsEntry.date } : null,
      highestRatedFilm: bestFilmEntry ? { value: bestFilmEntry.highestRatedFilm, quality: bestFilmEntry.highestRatedFilmScore, runId: bestFilmEntry.id, date: bestFilmEntry.date } : null,
    },
  };
}

// ─── Best Run ID ───

export function getBestRunId(): string | null {
  const top = getTop50();
  return top.length > 0 ? top[0].id : null;
}
