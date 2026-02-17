/**
 * Daily Challenge Mode
 * 
 * Every player gets the same seed based on today's date (YYYY-MM-DD).
 * Fixed setup: Studio difficulty, random archetype from seed, 3 seasons.
 * One attempt per day, streak tracking, shareable results.
 */

import { mulberry32, getDailySeed, getDailyDateString, getDailyNumber, hashString } from './seededRng';
import { STUDIO_ARCHETYPES } from './data';
import type { StudioArchetypeId } from './types';

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

// ─── R233: Seeded Challenge Constraints ───

import type { Genre } from './types';

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
