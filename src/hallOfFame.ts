// ═══════════════════════════════════════════════════════════════
// R272: Hall of Fame & Studio Rankings
// Track all-time best runs per difficulty, personal bests per archetype,
// and aggregate statistics across all runs.
// ═══════════════════════════════════════════════════════════════

import type { Difficulty, StudioArchetypeId, Genre } from './types';

const HOF_KEY = 'greenlight_hall_of_fame';

// ─── Types ───

export interface HallOfFameEntry {
  id: string;
  studioName: string;
  archetype: StudioArchetypeId;
  difficulty: Difficulty;
  finalScore: number;
  totalEarnings: number;
  filmsProduced: number;
  bestFilm: { title: string; genre: string; earnings: number };
  awardsWon: number;
  seasonsSurvived: number;
  date: string;
  replayId?: string;
  won: boolean;
}

export type HofDifficultyKey = Difficulty | 'allTime';

export interface PersonalBestEntry {
  archetype: StudioArchetypeId;
  bestScore: number;
  bestEarnings: number;
  bestDate: string;
  bestStudioName: string;
  totalRuns: number;
}

export interface HallOfFameData {
  entries: Record<Difficulty, HallOfFameEntry[]>; // top 10 per difficulty
  personalBests: Record<string, PersonalBestEntry>; // archetype id -> best
  stats: {
    totalRuns: number;
    totalWins: number;
    totalScore: number;
    totalEarnings: number;
    genreCounts: Record<string, number>;
    archetypeCounts: Record<string, number>;
    totalTimePlayed: number; // estimated minutes
  };
}

const DEFAULT_DATA: HallOfFameData = {
  entries: {
    indie: [],
    studio: [],
    mogul: [],
    nightmare: [],
    custom: [],
  },
  personalBests: {},
  stats: {
    totalRuns: 0,
    totalWins: 0,
    totalScore: 0,
    totalEarnings: 0,
    genreCounts: {},
    archetypeCounts: {},
    totalTimePlayed: 0,
  },
};

// ─── Storage ───

function loadData(): HallOfFameData {
  try {
    const raw = localStorage.getItem(HOF_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure all difficulty keys exist
      for (const d of ['indie', 'studio', 'mogul', 'nightmare', 'custom'] as Difficulty[]) {
        if (!parsed.entries[d]) parsed.entries[d] = [];
      }
      if (!parsed.personalBests) parsed.personalBests = {};
      if (!parsed.stats) parsed.stats = DEFAULT_DATA.stats;
      return parsed;
    }
  } catch {}
  return structuredClone(DEFAULT_DATA);
}

function saveData(data: HallOfFameData): void {
  try {
    localStorage.setItem(HOF_KEY, JSON.stringify(data));
  } catch {}
}

// ─── Public API ───

const MAX_PER_DIFFICULTY = 10;

export interface SubmitRunInput {
  studioName: string;
  archetype: StudioArchetypeId;
  difficulty: Difficulty;
  finalScore: number;
  totalEarnings: number;
  filmsProduced: number;
  bestFilm: { title: string; genre: string; earnings: number };
  awardsWon: number;
  seasonsSurvived: number;
  won: boolean;
  replayId?: string;
  genres: string[];
}

export interface SubmitResult {
  qualified: boolean;
  rank: number | null; // 1-10, null if not qualified
  isNewRecord: boolean; // beat a previous entry by same player
  difficulty: Difficulty;
}

/** Submit a run to the Hall of Fame. Returns whether it qualified. */
export function submitRunToHallOfFame(input: SubmitRunInput): SubmitResult {
  const data = loadData();
  const diff = input.difficulty;
  const entries = data.entries[diff];

  const entry: HallOfFameEntry = {
    id: `hof_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    studioName: input.studioName,
    archetype: input.archetype,
    difficulty: diff,
    finalScore: input.finalScore,
    totalEarnings: input.totalEarnings,
    filmsProduced: input.filmsProduced,
    bestFilm: input.bestFilm,
    awardsWon: input.awardsWon,
    seasonsSurvived: input.seasonsSurvived,
    date: new Date().toISOString().slice(0, 10),
    replayId: input.replayId,
    won: input.won,
  };

  // Check if qualifies (top 10)
  const wouldQualify = entries.length < MAX_PER_DIFFICULTY ||
    input.finalScore > entries[entries.length - 1].finalScore;

  let rank: number | null = null;
  let isNewRecord = false;

  if (wouldQualify) {
    entries.push(entry);
    entries.sort((a, b) => b.finalScore - a.finalScore);
    if (entries.length > MAX_PER_DIFFICULTY) entries.length = MAX_PER_DIFFICULTY;
    rank = entries.findIndex(e => e.id === entry.id);
    if (rank >= 0) rank += 1; else rank = null;

    // Check if beat own previous record
    const prevBest = entries.find(e => e.id !== entry.id && e.studioName === input.studioName);
    if (prevBest && input.finalScore > prevBest.finalScore) isNewRecord = true;
    if (!prevBest && rank === 1) isNewRecord = true;
  }

  // Update personal bests per archetype
  const arch = input.archetype;
  const pb = data.personalBests[arch];
  if (!pb || input.finalScore > pb.bestScore) {
    data.personalBests[arch] = {
      archetype: arch,
      bestScore: input.finalScore,
      bestEarnings: input.totalEarnings,
      bestDate: entry.date,
      bestStudioName: input.studioName,
      totalRuns: (pb?.totalRuns || 0) + 1,
    };
  } else {
    pb.totalRuns += 1;
  }

  // Update aggregate stats
  data.stats.totalRuns += 1;
  if (input.won) data.stats.totalWins += 1;
  data.stats.totalScore += input.finalScore;
  data.stats.totalEarnings += input.totalEarnings;
  data.stats.totalTimePlayed += Math.max(2, input.filmsProduced * 3 + input.seasonsSurvived * 2);

  for (const g of input.genres) {
    data.stats.genreCounts[g] = (data.stats.genreCounts[g] || 0) + 1;
  }
  data.stats.archetypeCounts[arch] = (data.stats.archetypeCounts[arch] || 0) + 1;

  saveData(data);

  return { qualified: wouldQualify && rank !== null, rank, isNewRecord, difficulty: diff };
}

/** Get top entries for a specific difficulty or all-time combined. */
export function getHallOfFameEntries(key: HofDifficultyKey): HallOfFameEntry[] {
  const data = loadData();
  if (key === 'allTime') {
    const all: HallOfFameEntry[] = [];
    for (const diff of ['indie', 'studio', 'mogul', 'nightmare', 'custom'] as Difficulty[]) {
      all.push(...data.entries[diff]);
    }
    return all.sort((a, b) => b.finalScore - a.finalScore).slice(0, MAX_PER_DIFFICULTY);
  }
  return [...data.entries[key]];
}

/** Get personal best per archetype. */
export function getPersonalBestsPerArchetype(): PersonalBestEntry[] {
  const data = loadData();
  return Object.values(data.personalBests);
}

/** Get aggregate stats. */
export function getHofStats(): HallOfFameData['stats'] {
  return loadData().stats;
}

/** Get the favorite genre (most used). */
export function getFavoriteGenre(): string | null {
  const stats = getHofStats();
  const entries = Object.entries(stats.genreCounts);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

/** Get the most used archetype. */
export function getMostUsedArchetype(): string | null {
  const stats = getHofStats();
  const entries = Object.entries(stats.archetypeCounts);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

/** Check if a score would qualify for the hall of fame at a given difficulty. */
export function wouldQualify(score: number, difficulty: Difficulty): boolean {
  const entries = getHallOfFameEntries(difficulty);
  return entries.length < MAX_PER_DIFFICULTY || score > entries[entries.length - 1].finalScore;
}
