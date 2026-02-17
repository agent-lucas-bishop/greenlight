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

// ─── Re-exports for convenience ───

export { getDailySeed, getDailyDateString, getDailyNumber } from './seededRng';
