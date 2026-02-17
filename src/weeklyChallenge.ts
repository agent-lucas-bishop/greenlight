/**
 * Weekly Challenge Mode (R261)
 *
 * Harder than dailies: multi-part objectives, genre sequences, restricted card pools,
 * marathon mode, cumulative earnings targets. Uses ISO week number as seed.
 * Score multiplier: 2.0× base, 3.0× with all bonus objectives.
 */

import { mulberry32, getWeeklySeed, getWeeklyDateString, hashString } from './seededRng';
import { getWeeklyNumber } from './seededRng';
import type { Genre } from './types';

// ─── Types ───

export type WeeklyChallengeType = 'genre_sequence' | 'earnings_target' | 'restricted_pool' | 'marathon';

export interface WeeklyObjective {
  id: string;
  description: string;
  emoji: string;
  completed: boolean;
}

export interface WeeklyChallenge {
  weekNumber: number;
  weekDate: string;
  seed: number;
  title: string;
  description: string;
  type: WeeklyChallengeType;
  objectives: WeeklyObjective[];
  genreSequence: Genre[] | null;
  earningsTarget: number | null;
  restrictedPool: boolean; // B-tier and below only
  marathonSeasons: number | null; // 8+ seasons required
  baseMultiplier: number; // 2.0
  bonusMultiplier: number; // 3.0 (all objectives)
  difficulty: 'mogul';
}

// ─── Challenge Generation ───

const GENRES: Genre[] = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];

const CHALLENGE_TEMPLATES: { type: WeeklyChallengeType; titlePrefix: string; emoji: string }[] = [
  { type: 'genre_sequence', titlePrefix: 'Genre Gauntlet', emoji: '🎭' },
  { type: 'earnings_target', titlePrefix: 'Box Office Blitz', emoji: '💰' },
  { type: 'restricted_pool', titlePrefix: 'Indie Grind', emoji: '🎬' },
  { type: 'marathon', titlePrefix: 'Marathon Mode', emoji: '🏃' },
];

function pickGenreSequence(rng: () => number): Genre[] {
  const count = 3 + Math.floor(rng() * 2); // 3-4 genres
  const seq: Genre[] = [];
  for (let i = 0; i < count; i++) {
    seq.push(GENRES[Math.floor(rng() * GENRES.length)]);
  }
  return seq;
}

export function getWeeklyChallenge(): WeeklyChallenge {
  const seed = getWeeklySeed();
  const r = mulberry32(seed);
  // Burn values to decorrelate
  for (let i = 0; i < 50; i++) r();

  const weekNumber = getWeeklyNumber();
  const weekDate = getWeeklyDateString();

  // Pick challenge type
  const template = CHALLENGE_TEMPLATES[Math.floor(r() * CHALLENGE_TEMPLATES.length)];
  const type = template.type;

  let genreSequence: Genre[] | null = null;
  let earningsTarget: number | null = null;
  let restrictedPool = false;
  let marathonSeasons: number | null = null;
  const objectives: WeeklyObjective[] = [];

  switch (type) {
    case 'genre_sequence': {
      genreSequence = pickGenreSequence(r);
      restrictedPool = r() < 0.4;
      objectives.push(
        { id: 'seq_complete', description: `Produce films in order: ${genreSequence.join(' → ')}`, emoji: '🎭', completed: false },
        { id: 'seq_all_hit', description: 'Every film must be HIT or better', emoji: '⭐', completed: false },
        { id: 'seq_no_strikes', description: 'Complete with zero strikes', emoji: '🛡️', completed: false },
      );
      if (restrictedPool) {
        objectives.push({ id: 'seq_restricted', description: 'B-tier cards and below only', emoji: '🃏', completed: false });
      }
      break;
    }
    case 'earnings_target': {
      earningsTarget = Math.round((150 + r() * 250) / 10) * 10; // $150M-$400M
      restrictedPool = r() < 0.5;
      const bonusGenre = GENRES[Math.floor(r() * GENRES.length)];
      objectives.push(
        { id: 'earn_target', description: `Reach $${earningsTarget}M total box office`, emoji: '💰', completed: false },
        { id: 'earn_genre_bonus', description: `Earn $${Math.round(earningsTarget * 0.4)}M+ from ${bonusGenre} films`, emoji: '🎬', completed: false },
        { id: 'earn_quality', description: 'Average quality ≥ 35 across all films', emoji: '⭐', completed: false },
      );
      if (restrictedPool) {
        objectives.push({ id: 'earn_restricted', description: 'B-tier cards and below only', emoji: '🃏', completed: false });
      }
      break;
    }
    case 'restricted_pool': {
      restrictedPool = true;
      const targetGenre = GENRES[Math.floor(r() * GENRES.length)];
      earningsTarget = Math.round((80 + r() * 120) / 10) * 10;
      objectives.push(
        { id: 'pool_win', description: 'Win the run using only B-tier cards and below', emoji: '🃏', completed: false },
        { id: 'pool_genre', description: `Make at least 3 ${targetGenre} films`, emoji: '🎭', completed: false },
        { id: 'pool_earnings', description: `Reach $${earningsTarget}M total earnings`, emoji: '💰', completed: false },
        { id: 'pool_no_legendary', description: 'No legendary or A-tier cards allowed', emoji: '🚫', completed: false },
      );
      break;
    }
    case 'marathon': {
      marathonSeasons = 8 + Math.floor(r() * 5); // 8-12 seasons
      const varietyCount = 4 + Math.floor(r() * 3);
      objectives.push(
        { id: 'marathon_survive', description: `Survive ${marathonSeasons} seasons`, emoji: '🏃', completed: false },
        { id: 'marathon_variety', description: `Use ${varietyCount}+ different genres`, emoji: '🎨', completed: false },
        { id: 'marathon_streak', description: 'Get a 3-film BLOCKBUSTER streak', emoji: '💥', completed: false },
        { id: 'marathon_earnings', description: `Reach $${Math.round(marathonSeasons * 25)}M total`, emoji: '💰', completed: false },
      );
      break;
    }
  }

  return {
    weekNumber,
    weekDate,
    seed,
    title: `${template.emoji} ${template.titlePrefix} #${weekNumber}`,
    description: generateDescription(type, genreSequence, earningsTarget, marathonSeasons, restrictedPool),
    type,
    objectives,
    genreSequence,
    earningsTarget,
    restrictedPool,
    marathonSeasons,
    baseMultiplier: 2.0,
    bonusMultiplier: 3.0,
    difficulty: 'mogul',
  };
}

function generateDescription(
  type: WeeklyChallengeType,
  genreSequence: Genre[] | null,
  earningsTarget: number | null,
  marathonSeasons: number | null,
  restrictedPool: boolean,
): string {
  switch (type) {
    case 'genre_sequence':
      return `Produce films in a specific genre order: ${genreSequence!.join(' → ')}. ${restrictedPool ? 'Only B-tier cards allowed. ' : ''}Every film must perform.`;
    case 'earnings_target':
      return `Hit $${earningsTarget}M total box office${restrictedPool ? ' with only B-tier cards' : ''}. Smart spending and genre mastery required.`;
    case 'restricted_pool':
      return `Win with only B-tier and below cards. No legendary shortcuts — pure skill only.`;
    case 'marathon':
      return `Survive ${marathonSeasons} grueling seasons. Pace yourself, diversify genres, and build momentum.`;
  }
}

// ─── Weekly Streak Tracking ───

const WEEKLY_STREAK_KEY = 'greenlight_weekly_streak';

export interface WeeklyStreakData {
  current: number;
  best: number;
  lastWeek: string; // week date string (Monday)
}

export function getWeeklyStreak(): WeeklyStreakData {
  try {
    const saved = localStorage.getItem(WEEKLY_STREAK_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { current: 0, best: 0, lastWeek: '' };
}

function getPreviousWeekDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

export function updateWeeklyStreak(): WeeklyStreakData {
  const thisWeek = getWeeklyDateString();
  const streak = getWeeklyStreak();

  if (streak.lastWeek === thisWeek) return streak;

  const prevWeek = getPreviousWeekDate();
  const newStreak: WeeklyStreakData = {
    current: streak.lastWeek === prevWeek ? streak.current + 1 : 1,
    best: 0,
    lastWeek: thisWeek,
  };
  newStreak.best = Math.max(streak.best, newStreak.current);

  try {
    localStorage.setItem(WEEKLY_STREAK_KEY, JSON.stringify(newStreak));
  } catch {}
  return newStreak;
}

// ─── Weekly Progress Tracking ───

const WEEKLY_PROGRESS_KEY = 'greenlight_weekly_progress';

export interface WeeklyProgressEntry {
  weekDate: string;
  weekNumber: number;
  objectivesCompleted: string[]; // objective IDs
  allObjectivesComplete: boolean;
  score: number;
  finalMultiplier: number;
  completedAt: string; // ISO timestamp
  challengeType: WeeklyChallengeType;
}

export function getWeeklyProgress(weekDate?: string): WeeklyProgressEntry | null {
  const key = weekDate || getWeeklyDateString();
  try {
    const saved = localStorage.getItem(WEEKLY_PROGRESS_KEY);
    if (saved) {
      const all: Record<string, WeeklyProgressEntry> = JSON.parse(saved);
      return all[key] || null;
    }
  } catch {}
  return null;
}

export function saveWeeklyProgress(entry: WeeklyProgressEntry): void {
  try {
    const saved = localStorage.getItem(WEEKLY_PROGRESS_KEY);
    const all: Record<string, WeeklyProgressEntry> = saved ? JSON.parse(saved) : {};
    all[entry.weekDate] = entry;
    // Keep last 26 weeks
    const keys = Object.keys(all).sort();
    while (keys.length > 26) {
      delete all[keys.shift()!];
    }
    localStorage.setItem(WEEKLY_PROGRESS_KEY, JSON.stringify(all));
  } catch {}
}

// ─── Weekly History ───

const WEEKLY_HISTORY_KEY = 'greenlight_weekly_history';

export function getWeeklyHistory(): WeeklyProgressEntry[] {
  try {
    const saved = localStorage.getItem(WEEKLY_HISTORY_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

export function addWeeklyHistoryEntry(entry: WeeklyProgressEntry): void {
  const history = getWeeklyHistory();
  history.push(entry);
  const trimmed = history.slice(-52); // Keep ~1 year
  try {
    localStorage.setItem(WEEKLY_HISTORY_KEY, JSON.stringify(trimmed));
  } catch {}
}

// ─── Score Calculation ───

export function calculateWeeklyScore(
  baseScore: number,
  objectivesCompleted: string[],
  totalObjectives: number,
): { score: number; multiplier: number } {
  const allComplete = objectivesCompleted.length >= totalObjectives;
  const multiplier = allComplete ? 3.0 : 2.0;
  return {
    score: Math.round(baseScore * multiplier),
    multiplier,
  };
}

// ─── Share Result ───

export function generateWeeklyShareText(challenge: WeeklyChallenge, score: number, objectivesCompleted: number): string {
  const total = challenge.objectives.length;
  const allDone = objectivesCompleted >= total;
  const mult = allDone ? '3.0×' : '2.0×';
  const checkmarks = challenge.objectives.map((_, i) => i < objectivesCompleted ? '✅' : '⬜').join('');

  return `GREENLIGHT Weekly #${challenge.weekNumber} — ${challenge.title}\n${checkmarks} ${objectivesCompleted}/${total} objectives (${mult})\nScore: ${score}\ngreenlight-plum.vercel.app`;
}

// ─── Re-exports ───

export { getWeeklySeed, getWeeklyDateString, getWeeklyNumber } from './seededRng';
