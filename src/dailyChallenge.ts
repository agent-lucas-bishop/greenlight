/**
 * Daily Challenge Mode
 * 
 * Every player gets the same seed based on today's date (YYYY-MM-DD).
 * Fixed setup: Studio difficulty, random archetype from seed, 3 seasons.
 * One attempt per day, streak tracking, shareable results.
 */

import { mulberry32, getDailySeed, getDailyDateString, getDailyNumber, getWeeklySeed, getWeeklyDateString, hashString } from './seededRng';
import { STUDIO_ARCHETYPES } from './data';
import type { StudioArchetypeId, Genre, CardTemplate } from './types';

// ─── Daily Archetype (deterministic from seed) ───

export function getDailyArchetype(): StudioArchetypeId {
  const seed = getDailySeed();
  const rng = mulberry32(seed);
  // Burn a few values to decorrelate from other seed uses
  rng(); rng(); rng();
  const index = Math.floor(rng() * STUDIO_ARCHETYPES.length);
  return STUDIO_ARCHETYPES[index].id as StudioArchetypeId;
}

export function getDailyArchetypeName(): string {
  const id = getDailyArchetype();
  return STUDIO_ARCHETYPES.find(a => a.id === id)?.name || id;
}

// ─── Attempt Tracking (localStorage) ───

const DAILY_ATTEMPT_KEY = 'greenlight_daily_attempt';

interface DailyAttemptRecord {
  date: string;
  completed: boolean;
  score?: number;
}

function getAttemptRecord(): DailyAttemptRecord | null {
  try {
    const saved = localStorage.getItem(DAILY_ATTEMPT_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

export function hasDailyAttemptToday(): boolean {
  const record = getAttemptRecord();
  return record !== null && record.date === getDailyDateString();
}

export function markDailyAttempt(): void {
  const record: DailyAttemptRecord = {
    date: getDailyDateString(),
    completed: false,
  };
  try {
    localStorage.setItem(DAILY_ATTEMPT_KEY, JSON.stringify(record));
  } catch {}
}

export function completeDailyAttempt(score: number): void {
  const record: DailyAttemptRecord = {
    date: getDailyDateString(),
    completed: true,
    score,
  };
  try {
    localStorage.setItem(DAILY_ATTEMPT_KEY, JSON.stringify(record));
  } catch {}
}

// ─── Streak Tracking ───

const STREAK_KEY = 'greenlight_daily_streak';

interface StreakData {
  current: number;
  best: number;
  lastDate: string; // YYYY-MM-DD of last played daily
}

export function getDailyStreak(): StreakData {
  try {
    const saved = localStorage.getItem(STREAK_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { current: 0, best: 0, lastDate: '' };
}

export function updateDailyStreak(): StreakData {
  const today = getDailyDateString();
  const streak = getDailyStreak();
  
  if (streak.lastDate === today) return streak; // Already updated today
  
  const yesterday = getYesterdayDateString();
  const newStreak: StreakData = {
    current: streak.lastDate === yesterday ? streak.current + 1 : 1,
    best: 0,
    lastDate: today,
  };
  newStreak.best = Math.max(streak.best, newStreak.current);
  
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(newStreak));
  } catch {}
  return newStreak;
}

function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Daily History (personal leaderboard) ───

const DAILY_HISTORY_KEY = 'greenlight_daily_history';

export interface DailyHistoryEntry {
  date: string;
  dayNumber: number;
  score: number;
  rank: string;
  films: number;
  earnings: number;
  won: boolean;
  archetype: string;
}

export function getDailyHistory(): DailyHistoryEntry[] {
  try {
    const saved = localStorage.getItem(DAILY_HISTORY_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

export function addDailyHistoryEntry(entry: Omit<DailyHistoryEntry, 'dayNumber'>): void {
  const history = getDailyHistory();
  const full: DailyHistoryEntry = {
    ...entry,
    dayNumber: getDailyNumber(),
  };
  history.push(full);
  // Keep last 90 days
  const trimmed = history.slice(-90);
  try {
    localStorage.setItem(DAILY_HISTORY_KEY, JSON.stringify(trimmed));
  } catch {}
}

// ─── Share Result ───

export function generateDailyShareText(score: number, films: number, won: boolean): string {
  const dayNum = getDailyNumber();
  const tier = getScoreTier(score);
  const winEmoji = won ? '🏆' : '💀';
  
  return `GREENLIGHT Daily #${dayNum} — Score: ${score} | ${tier.stars} | 🎬 Films: ${films} ${winEmoji}\ngreenlight-plum.vercel.app`;
}

function getScoreTier(score: number): { stars: string; label: string } {
  if (score >= 200) return { stars: '⭐⭐⭐⭐⭐', label: 'Legendary' };
  if (score >= 150) return { stars: '⭐⭐⭐⭐', label: 'Excellent' };
  if (score >= 100) return { stars: '⭐⭐⭐', label: 'Great' };
  if (score >= 50) return { stars: '⭐⭐', label: 'Good' };
  return { stars: '⭐', label: 'Rookie' };
}

// ─── R254: Bonus Objectives & Starting Cards ───

export interface BonusObjective {
  id: string;
  description: string;
  emoji: string;
  /** Evaluated at end of run to determine if bonus was achieved */
  check: (ctx: BonusObjectiveContext) => boolean;
}

export interface BonusObjectiveContext {
  totalEarnings: number;
  filmsProduced: number;
  genresUsed: Genre[];
  maxLeadsHired: number; // max leads hired in a single film
  totalStrikes: number;
  avgQuality: number;
  won: boolean;
  seasonHistory: { genre: Genre; quality: number; boxOffice: number; tier: string }[];
}

const BONUS_OBJECTIVES: BonusObjective[] = [
  { id: 'comedy_100m', description: 'Earn $100M+ total with only Comedies', emoji: '😂', check: ctx => ctx.totalEarnings >= 100 && ctx.genresUsed.every(g => g === 'Comedy') },
  { id: 'max_2_leads', description: 'Never hire more than 2 leads in any film', emoji: '🎭', check: ctx => ctx.maxLeadsHired <= 2 },
  { id: 'no_strikes', description: 'Complete the run with zero strikes', emoji: '🛡️', check: ctx => ctx.totalStrikes === 0 && ctx.won },
  { id: 'horror_master', description: 'Make 3+ Horror films that are all SMASH or better', emoji: '👻', check: ctx => { const h = ctx.seasonHistory.filter(s => s.genre === 'Horror' && (s.tier === 'SMASH' || s.tier === 'BLOCKBUSTER')); return h.length >= 3; } },
  { id: 'quality_40', description: 'Average quality ≥ 40 across all films', emoji: '⭐', check: ctx => ctx.avgQuality >= 40 },
  { id: 'blockbuster_streak', description: 'Get 3 BLOCKBUSTERs in a row', emoji: '💥', check: ctx => { let streak = 0, best = 0; for (const s of ctx.seasonHistory) { if (s.tier === 'BLOCKBUSTER') { streak++; best = Math.max(best, streak); } else streak = 0; } return best >= 3; } },
  { id: 'genre_variety', description: 'Use 5+ different genres across the run', emoji: '🎨', check: ctx => new Set(ctx.genresUsed).size >= 5 },
  { id: 'budget_run', description: 'Win with total earnings under $60M', emoji: '💰', check: ctx => ctx.won && ctx.totalEarnings < 60 },
  { id: 'drama_only', description: 'Make only Drama films and win', emoji: '🎭', check: ctx => ctx.won && ctx.genresUsed.every(g => g === 'Drama') },
  { id: 'scifi_200m', description: 'Earn $200M+ total with Sci-Fi films only', emoji: '🚀', check: ctx => ctx.totalEarnings >= 200 && ctx.genresUsed.every(g => g === 'Sci-Fi') },
  { id: 'perfect_run', description: 'Win with all BLOCKBUSTERs', emoji: '👑', check: ctx => ctx.won && ctx.seasonHistory.every(s => s.tier === 'BLOCKBUSTER') },
  { id: 'thriller_no_incidents', description: 'Make a Thriller with zero incidents', emoji: '🔪', check: ctx => ctx.seasonHistory.some(s => s.genre === 'Thriller' && s.quality >= 35) },
];

export function getDailyBonusObjective(): BonusObjective {
  const seed = getDailySeed();
  const r = mulberry32(seed);
  // Burn 20 values to decorrelate from other seed uses
  for (let i = 0; i < 20; i++) r();
  const idx = Math.floor(r() * BONUS_OBJECTIVES.length);
  return BONUS_OBJECTIVES[idx];
}

/** 1.5x score multiplier if bonus objective completed */
export const BONUS_OBJECTIVE_MULTIPLIER = 1.5;

export function getDailyStartingCards(): string[] {
  const seed = getDailySeed();
  const r = mulberry32(seed);
  // Burn 30 values
  for (let i = 0; i < 30; i++) r();
  // Pick 2-3 starting card names from a pool
  const STARTING_CARD_POOL = [
    'Script Polish', 'Method Acting', 'Lucky Break', 'Reshoot Scene',
    'Chemistry Read', 'Stunt Double', 'VFX Enhancement', 'Focus Group',
    'Marketing Push', 'Award Bait', 'Indie Cred', 'Star Power',
  ];
  const count = 2 + Math.floor(r() * 2); // 2-3 cards
  const picks: string[] = [];
  const available = [...STARTING_CARD_POOL];
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(r() * available.length);
    picks.push(available.splice(idx, 1)[0]);
  }
  return picks;
}

export function getDailyDifficultyModifiers(): { budgetAdjustment: number; incidentFrequency: number; marketVolatility: number } {
  const seed = getDailySeed();
  const r = mulberry32(seed);
  // Burn 40 values
  for (let i = 0; i < 40; i++) r();
  return {
    budgetAdjustment: Math.round((r() * 10 - 5)), // -5 to +5
    incidentFrequency: 0.8 + r() * 0.6, // 0.8 to 1.4
    marketVolatility: 0.7 + r() * 0.8, // 0.7 to 1.5
  };
}

/** Full daily challenge config combining all seed-derived parameters */
export interface DailyChallengeConfig {
  seed: number;
  dateString: string;
  dayNumber: number;
  archetype: StudioArchetypeId;
  archetypeName: string;
  genreRestriction: Genre | null;
  bonusObjective: BonusObjective;
  startingCards: string[];
  difficultyMods: { budgetAdjustment: number; incidentFrequency: number; marketVolatility: number };
  constraints: DailyChallengeConstraints;
}

export function getDailyConfig(): DailyChallengeConfig {
  return {
    seed: getDailySeed(),
    dateString: getDailyDateString(),
    dayNumber: getDailyNumber(),
    archetype: getDailyArchetype(),
    archetypeName: getDailyArchetypeName(),
    genreRestriction: getDailyChallengeConstraints().genreRestriction,
    bonusObjective: getDailyBonusObjective(),
    startingCards: getDailyStartingCards(),
    difficultyMods: getDailyDifficultyModifiers(),
    constraints: getDailyChallengeConstraints(),
  };
}

export type ChallengeGoalType = 'total_bo' | 'survive_seasons' | 'quality_avg';

export interface DailyChallengeConstraints {
  seed: number;
  genreRestriction: Genre | null;
  budgetCap: number;
  noLegendaryCards: boolean;
  goalType: ChallengeGoalType;
  goalValue: number;
  goalLabel: string;
  constraintLabel: string;
  difficulty: 'studio' | 'mogul';
}

const GENRES: Genre[] = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];

export function getDailyChallengeConstraints(): DailyChallengeConstraints {
  const seed = getDailySeed();
  const r = mulberry32(seed);
  // Burn values
  for (let i = 0; i < 10; i++) r();

  const genreRoll = r();
  const genreRestriction = genreRoll < 0.6 ? GENRES[Math.floor(r() * GENRES.length)] : null;
  const budgetCap = Math.round(5 + r() * 15); // $5M-$20M
  const noLegendary = r() < 0.3;

  const goalRoll = r();
  let goalType: ChallengeGoalType;
  let goalValue: number;
  let goalLabel: string;
  if (goalRoll < 0.45) {
    goalType = 'total_bo';
    goalValue = Math.round((50 + r() * 150) / 10) * 10;
    goalLabel = `Reach $${goalValue}M total box office`;
  } else if (goalRoll < 0.75) {
    goalType = 'survive_seasons';
    goalValue = Math.round(3 + r() * 5);
    goalLabel = `Survive ${goalValue} seasons`;
  } else {
    goalType = 'quality_avg';
    goalValue = Math.round(30 + r() * 30);
    goalLabel = `Average quality ≥ ${goalValue}`;
  }

  const parts: string[] = [];
  if (genreRestriction) parts.push(`${genreRestriction} only`);
  parts.push(`$${budgetCap}M budget`);
  if (noLegendary) parts.push('No legendary cards');

  return {
    seed,
    genreRestriction,
    budgetCap,
    noLegendaryCards: noLegendary,
    goalType,
    goalValue,
    goalLabel,
    constraintLabel: parts.join(', '),
    difficulty: r() < 0.3 ? 'mogul' : 'studio',
  };
}

export function getWeeklyChallengeConstraints(): DailyChallengeConstraints {
  const seed = getWeeklySeed();
  const r = mulberry32(seed);
  for (let i = 0; i < 10; i++) r();

  // Weekly is always harder
  const genreRestriction = GENRES[Math.floor(r() * GENRES.length)];
  const budgetCap = Math.round(3 + r() * 8); // $3M-$11M — tighter
  const goalType: ChallengeGoalType = 'survive_seasons';
  const goalValue = Math.round(5 + r() * 4);
  const goalLabel = `Survive ${goalValue} seasons`;

  return {
    seed,
    genreRestriction,
    budgetCap,
    noLegendaryCards: true,
    goalType,
    goalValue,
    goalLabel,
    constraintLabel: `${genreRestriction} only, $${budgetCap}M budget, No legendary cards, Mogul difficulty`,
    difficulty: 'mogul',
  };
}

// ─── R233: Daily/Weekly Leaderboard (localStorage, top 10 per day/week) ───

const DAILY_LB_KEY = 'greenlight_daily_leaderboard';
const WEEKLY_LB_KEY = 'greenlight_weekly_leaderboard';

export interface DailyLeaderboardEntry {
  date: string;
  score: number;
  timeSeconds: number;
  totalBO: number;
  qualityAvg: number;
  films: number;
  won: boolean;
}

function getLbEntries(key: string, dateKey: string): DailyLeaderboardEntry[] {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const all: Record<string, DailyLeaderboardEntry[]> = JSON.parse(saved);
      return all[dateKey] || [];
    }
  } catch { /* empty */ }
  return [];
}

function setLbEntries(key: string, dateKey: string, entries: DailyLeaderboardEntry[]): void {
  try {
    const saved = localStorage.getItem(key);
    const all: Record<string, DailyLeaderboardEntry[]> = saved ? JSON.parse(saved) : {};
    all[dateKey] = entries.slice(0, 10);
    // Keep only last 14 days/weeks
    const keys = Object.keys(all).sort();
    while (keys.length > 14) {
      delete all[keys.shift()!];
    }
    localStorage.setItem(key, JSON.stringify(all));
  } catch { /* empty */ }
}

export function getDailyLeaderboard(): DailyLeaderboardEntry[] {
  return getLbEntries(DAILY_LB_KEY, getDailyDateString());
}

export function addDailyLeaderboardEntry(entry: DailyLeaderboardEntry): void {
  const date = getDailyDateString();
  const entries = getLbEntries(DAILY_LB_KEY, date);
  entries.push({ ...entry, date });
  entries.sort((a, b) => b.score - a.score);
  setLbEntries(DAILY_LB_KEY, date, entries.slice(0, 10));
}

export function getWeeklyLeaderboard(): DailyLeaderboardEntry[] {
  return getLbEntries(WEEKLY_LB_KEY, getWeeklyDateString());
}

export function addWeeklyLeaderboardEntry(entry: DailyLeaderboardEntry): void {
  const date = getWeeklyDateString();
  const entries = getLbEntries(WEEKLY_LB_KEY, date);
  entries.push({ ...entry, date });
  entries.sort((a, b) => b.score - a.score);
  setLbEntries(WEEKLY_LB_KEY, date, entries.slice(0, 10));
}

// ─── R233: Daily Scoring ───

export function calculateDailyScore(
  timeSeconds: number,
  totalBO: number,
  qualityAvg: number,
): number {
  // Time bonus: faster = more points (max 100 at ≤60s, decays over 10 min)
  const timeBonus = Math.max(0, Math.round(100 - (timeSeconds / 6)));
  const boScore = Math.round(totalBO * 0.5);
  const qualityScore = Math.round(qualityAvg * 2);
  return timeBonus + boScore + qualityScore;
}

// ─── R233: Reset Countdown Helpers ───

export function getTimeUntilDailyReset(): { hours: number; minutes: number; seconds: number } {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const diff = tomorrow.getTime() - now.getTime();
  return {
    hours: Math.floor(diff / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

export function getTimeUntilWeeklyReset(): { days: number; hours: number; minutes: number } {
  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = day === 0 ? 1 : (8 - day);
  const nextMonday = new Date(now);
  nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  const diff = nextMonday.getTime() - now.getTime();
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
  };
}

// ─── Re-exports for convenience ───

export { getDailySeed, getDailyDateString, getDailyNumber } from './seededRng';
