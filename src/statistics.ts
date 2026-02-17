/**
 * R193: Statistics & Analytics Engine
 * Tracks per-run and lifetime player analytics, persisted in localStorage.
 */

import type { Genre, SeasonResult, Difficulty } from './types';

// ─── Types ───

export interface RunStats {
  id: string;
  date: string;
  totalBO: number;
  filmsMade: number;
  avgQuality: number;
  avgCriticScore: number;
  avgAudienceScore: number;
  genresUsed: string[];
  moneySpent: number;
  bestFilm: { title: string; bo: number; quality: number; genre: string } | null;
  worstFilm: { title: string; bo: number; quality: number; genre: string } | null;
  won: boolean;
  difficulty: Difficulty;
  score: number;
  studioName: string;
  films: { title: string; genre: string; quality: number; bo: number; tier: string; criticScore?: number; audienceScore?: number }[];
}

export interface LifetimeStats {
  totalRuns: number;
  totalFilms: number;
  totalBO: number;
  genreFilmCounts: Record<string, number>;
  genreBOTotals: Record<string, number>;
  difficultyStats: Record<string, { runs: number; wins: number; totalBO: number; totalFilms: number }>;
  longestWinStreak: number;
  currentWinStreak: number;
  runHistory: RunStats[];
  records: {
    biggestBO: { value: number; filmTitle: string; runDate: string } | null;
    worstFlop: { value: number; filmTitle: string; runDate: string } | null;
    highestCriticScore: { value: number; filmTitle: string; runDate: string } | null;
    highestQuality: { value: number; filmTitle: string; runDate: string } | null;
    mostFilmsInRun: { value: number; runDate: string } | null;
    highestRunBO: { value: number; runDate: string } | null;
  };
}

const STORAGE_KEY = 'greenlight_statistics_v1';

// ─── Persistence ───

function loadStats(): LifetimeStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return defaultStats();
}

function saveStats(stats: LifetimeStats): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function defaultStats(): LifetimeStats {
  return {
    totalRuns: 0,
    totalFilms: 0,
    totalBO: 0,
    genreFilmCounts: {},
    genreBOTotals: {},
    difficultyStats: {},
    longestWinStreak: 0,
    currentWinStreak: 0,
    runHistory: [],
    records: {
      biggestBO: null,
      worstFlop: null,
      highestCriticScore: null,
      highestQuality: null,
      mostFilmsInRun: null,
      highestRunBO: null,
    },
  };
}

// ─── Record a completed run ───

export function recordRunStats(input: {
  seasonHistory: SeasonResult[];
  totalEarnings: number;
  won: boolean;
  difficulty: Difficulty;
  score: number;
  studioName: string;
  budget: number;
  startBudget: number;
}): void {
  const stats = loadStats();
  const { seasonHistory, totalEarnings, won, difficulty, score, studioName } = input;

  const films = seasonHistory.map(s => ({
    title: s.title,
    genre: s.genre,
    quality: s.quality,
    bo: s.boxOffice,
    tier: s.tier,
    criticScore: s.criticScore,
    audienceScore: s.audienceScore,
  }));

  const filmsMade = films.length;
  const avgQuality = filmsMade > 0 ? films.reduce((s, f) => s + f.quality, 0) / filmsMade : 0;
  const filmsWithCritic = films.filter(f => f.criticScore != null);
  const avgCriticScore = filmsWithCritic.length > 0 ? filmsWithCritic.reduce((s, f) => s + (f.criticScore || 0), 0) / filmsWithCritic.length : 0;
  const filmsWithAudience = films.filter(f => f.audienceScore != null);
  const avgAudienceScore = filmsWithAudience.length > 0 ? filmsWithAudience.reduce((s, f) => s + (f.audienceScore || 0), 0) / filmsWithAudience.length : 0;
  const genresUsed = [...new Set(films.map(f => f.genre))];

  const bestFilm = films.length > 0 ? films.reduce((best, f) => f.bo > best.bo ? f : best) : null;
  const worstFilm = films.length > 0 ? films.reduce((worst, f) => f.bo < worst.bo ? f : worst) : null;

  const runStats: RunStats = {
    id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    date: new Date().toISOString().slice(0, 10),
    totalBO: totalEarnings,
    filmsMade,
    avgQuality: Math.round(avgQuality),
    avgCriticScore: Math.round(avgCriticScore),
    avgAudienceScore: Math.round(avgAudienceScore),
    genresUsed,
    moneySpent: Math.max(0, input.startBudget + totalEarnings - input.budget),
    bestFilm: bestFilm ? { title: bestFilm.title, bo: bestFilm.bo, quality: bestFilm.quality, genre: bestFilm.genre } : null,
    worstFilm: worstFilm ? { title: worstFilm.title, bo: worstFilm.bo, quality: worstFilm.quality, genre: worstFilm.genre } : null,
    won,
    difficulty,
    score,
    studioName,
    films,
  };

  // Update lifetime
  stats.totalRuns++;
  stats.totalFilms += filmsMade;
  stats.totalBO += totalEarnings;

  // Genre counts
  for (const f of films) {
    stats.genreFilmCounts[f.genre] = (stats.genreFilmCounts[f.genre] || 0) + 1;
    stats.genreBOTotals[f.genre] = (stats.genreBOTotals[f.genre] || 0) + f.bo;
  }

  // Difficulty stats
  const ds = stats.difficultyStats[difficulty] || { runs: 0, wins: 0, totalBO: 0, totalFilms: 0 };
  ds.runs++;
  if (won) ds.wins++;
  ds.totalBO += totalEarnings;
  ds.totalFilms += filmsMade;
  stats.difficultyStats[difficulty] = ds;

  // Win streak
  if (won) {
    stats.currentWinStreak++;
    stats.longestWinStreak = Math.max(stats.longestWinStreak, stats.currentWinStreak);
  } else {
    stats.currentWinStreak = 0;
  }

  // Records
  for (const f of films) {
    if (!stats.records.biggestBO || f.bo > stats.records.biggestBO.value) {
      stats.records.biggestBO = { value: f.bo, filmTitle: f.title, runDate: runStats.date };
    }
    if (!stats.records.worstFlop || f.bo < stats.records.worstFlop.value) {
      stats.records.worstFlop = { value: f.bo, filmTitle: f.title, runDate: runStats.date };
    }
    if (f.criticScore != null && (!stats.records.highestCriticScore || f.criticScore > stats.records.highestCriticScore.value)) {
      stats.records.highestCriticScore = { value: f.criticScore, filmTitle: f.title, runDate: runStats.date };
    }
    if (!stats.records.highestQuality || f.quality > stats.records.highestQuality.value) {
      stats.records.highestQuality = { value: f.quality, filmTitle: f.title, runDate: runStats.date };
    }
  }
  if (!stats.records.mostFilmsInRun || filmsMade > stats.records.mostFilmsInRun.value) {
    stats.records.mostFilmsInRun = { value: filmsMade, runDate: runStats.date };
  }
  if (!stats.records.highestRunBO || totalEarnings > stats.records.highestRunBO.value) {
    stats.records.highestRunBO = { value: totalEarnings, runDate: runStats.date };
  }

  // Keep last 50 runs in history
  stats.runHistory.push(runStats);
  if (stats.runHistory.length > 50) stats.runHistory = stats.runHistory.slice(-50);

  saveStats(stats);
}

// ─── Getters ───

export function getLifetimeStats(): LifetimeStats {
  return loadStats();
}

export function getRecentRuns(count: number = 20): RunStats[] {
  const stats = loadStats();
  return stats.runHistory.slice(-count).reverse();
}

export function getFavoriteGenre(): string | null {
  const stats = loadStats();
  const entries = Object.entries(stats.genreFilmCounts);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

export function getMostProfitableGenre(): { genre: string; avgBO: number } | null {
  const stats = loadStats();
  let best: { genre: string; avgBO: number } | null = null;
  for (const [genre, totalBO] of Object.entries(stats.genreBOTotals)) {
    const count = stats.genreFilmCounts[genre] || 1;
    const avgBO = totalBO / count;
    if (!best || avgBO > best.avgBO) best = { genre, avgBO };
  }
  return best;
}

export function getDifficultyWinRates(): Record<string, { runs: number; wins: number; winRate: number; avgBO: number }> {
  const stats = loadStats();
  const result: Record<string, { runs: number; wins: number; winRate: number; avgBO: number }> = {};
  for (const [diff, ds] of Object.entries(stats.difficultyStats)) {
    result[diff] = {
      runs: ds.runs,
      wins: ds.wins,
      winRate: ds.runs > 0 ? Math.round((ds.wins / ds.runs) * 100) : 0,
      avgBO: ds.runs > 0 ? ds.totalBO / ds.runs : 0,
    };
  }
  return result;
}

/** Trend based on last N runs vs all-time average */
export function getTrend(n: number = 5): { bo: 'up' | 'down' | 'flat'; quality: 'up' | 'down' | 'flat'; winRate: 'up' | 'down' | 'flat' } {
  const stats = loadStats();
  const history = stats.runHistory;
  if (history.length < n + 1) return { bo: 'flat', quality: 'flat', winRate: 'flat' };

  const recent = history.slice(-n);
  const older = history.slice(0, -n);

  const recentAvgBO = recent.reduce((s, r) => s + r.totalBO, 0) / recent.length;
  const olderAvgBO = older.reduce((s, r) => s + r.totalBO, 0) / older.length;

  const recentAvgQ = recent.reduce((s, r) => s + r.avgQuality, 0) / recent.length;
  const olderAvgQ = older.reduce((s, r) => s + r.avgQuality, 0) / older.length;

  const recentWinRate = recent.filter(r => r.won).length / recent.length;
  const olderWinRate = older.filter(r => r.won).length / older.length;

  const threshold = 0.05; // 5% change threshold
  const dir = (recent: number, older: number): 'up' | 'down' | 'flat' => {
    if (older === 0) return recent > 0 ? 'up' : 'flat';
    const change = (recent - older) / older;
    return change > threshold ? 'up' : change < -threshold ? 'down' : 'flat';
  };

  return {
    bo: dir(recentAvgBO, olderAvgBO),
    quality: dir(recentAvgQ, olderAvgQ),
    winRate: dir(recentWinRate, olderWinRate),
  };
}

/** Quick summary for EndScreen */
export function getQuickSummary(): {
  totalRuns: number;
  totalFilms: number;
  lifetimeBO: number;
  winRate: number;
  longestWinStreak: number;
  currentWinStreak: number;
} {
  const stats = loadStats();
  return {
    totalRuns: stats.totalRuns,
    totalFilms: stats.totalFilms,
    lifetimeBO: stats.totalBO,
    winRate: stats.totalRuns > 0 ? Math.round((stats.runHistory.filter(r => r.won).length / stats.totalRuns) * 100) : 0,
    longestWinStreak: stats.longestWinStreak,
    currentWinStreak: stats.currentWinStreak,
  };
}

/** Backfill from existing leaderboard data if statistics are empty */
export function backfillFromLeaderboard(): void {
  const stats = loadStats();
  if (stats.totalRuns > 0) return; // already has data

  try {
    const raw = localStorage.getItem('greenlight_leaderboard');
    if (!raw) return;
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries) || entries.length === 0) return;

    for (const entry of entries) {
      const films = (entry.films || []).map((f: any) => ({
        title: f.title || 'Unknown',
        genre: f.genre || 'Drama',
        quality: f.quality || 0,
        bo: f.boxOffice || 0,
        tier: f.tier || 'FLOP',
        criticScore: f.criticScore,
        audienceScore: f.audienceScore,
      }));

      const filmsMade = films.length;
      const avgQuality = filmsMade > 0 ? Math.round(films.reduce((s: number, f: any) => s + f.quality, 0) / filmsMade) : 0;

      const runStats: RunStats = {
        id: entry.id || `backfill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        date: entry.date || 'Unknown',
        totalBO: entry.earnings || 0,
        filmsMade,
        avgQuality,
        avgCriticScore: 0,
        avgAudienceScore: 0,
        genresUsed: [...new Set(films.map((f: any) => f.genre))] as string[],
        moneySpent: 0,
        bestFilm: films.length > 0 ? films.reduce((best: any, f: any) => f.bo > best.bo ? f : best) : null,
        worstFilm: films.length > 0 ? films.reduce((worst: any, f: any) => f.bo < worst.bo ? f : worst) : null,
        won: entry.won ?? false,
        difficulty: (entry.difficulty as Difficulty) || 'studio',
        score: entry.score || 0,
        studioName: entry.studioName || '',
        films,
      };

      stats.totalRuns++;
      stats.totalFilms += filmsMade;
      stats.totalBO += entry.earnings || 0;

      for (const f of films) {
        stats.genreFilmCounts[f.genre] = (stats.genreFilmCounts[f.genre] || 0) + 1;
        stats.genreBOTotals[f.genre] = (stats.genreBOTotals[f.genre] || 0) + f.bo;
      }

      const diff = runStats.difficulty;
      const ds = stats.difficultyStats[diff] || { runs: 0, wins: 0, totalBO: 0, totalFilms: 0 };
      ds.runs++;
      if (runStats.won) ds.wins++;
      ds.totalBO += runStats.totalBO;
      ds.totalFilms += filmsMade;
      stats.difficultyStats[diff] = ds;

      if (runStats.won) {
        stats.currentWinStreak++;
        stats.longestWinStreak = Math.max(stats.longestWinStreak, stats.currentWinStreak);
      } else {
        stats.currentWinStreak = 0;
      }

      for (const f of films) {
        if (!stats.records.biggestBO || f.bo > stats.records.biggestBO.value) {
          stats.records.biggestBO = { value: f.bo, filmTitle: f.title, runDate: runStats.date };
        }
        if (!stats.records.worstFlop || f.bo < stats.records.worstFlop.value) {
          stats.records.worstFlop = { value: f.bo, filmTitle: f.title, runDate: runStats.date };
        }
        if (f.quality > 0 && (!stats.records.highestQuality || f.quality > stats.records.highestQuality.value)) {
          stats.records.highestQuality = { value: f.quality, filmTitle: f.title, runDate: runStats.date };
        }
      }
      if (!stats.records.mostFilmsInRun || filmsMade > stats.records.mostFilmsInRun.value) {
        stats.records.mostFilmsInRun = { value: filmsMade, runDate: runStats.date };
      }
      if (!stats.records.highestRunBO || runStats.totalBO > stats.records.highestRunBO.value) {
        stats.records.highestRunBO = { value: runStats.totalBO, runDate: runStats.date };
      }

      stats.runHistory.push(runStats);
    }

    if (stats.runHistory.length > 50) stats.runHistory = stats.runHistory.slice(-50);
    saveStats(stats);
  } catch { /* ignore backfill errors */ }
}
