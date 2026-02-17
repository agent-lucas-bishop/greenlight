/**
 * Daily Challenges Real-Time Tracker (R292)
 * 
 * Tracks in-run progress for daily challenges so the UI can show
 * live progress bars during gameplay, not just at end-of-run.
 */

import type { RunSummary } from './challenges';
import { getDailyDateString } from './seededRng';

const PROGRESS_KEY = 'greenlight_daily_challenges_progress';
const RUN_START_KEY = 'greenlight_run_start_time';

export interface DailyChallengeProgress {
  date: string;
  /** Partial RunSummary built up during the run */
  partial: Partial<RunSummary>;
}

function getStoredProgress(): DailyChallengeProgress | null {
  try {
    const saved = localStorage.getItem(PROGRESS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.date === getDailyDateString()) return parsed;
    }
  } catch {}
  return null;
}

function saveProgress(progress: DailyChallengeProgress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {}
}

/** Call when a run starts to reset tracking */
export function startRunTracking(): void {
  try {
    localStorage.setItem(RUN_START_KEY, String(Date.now()));
  } catch {}
  saveProgress({
    date: getDailyDateString(),
    partial: {
      won: false,
      genres: [],
      totalEarnings: 0,
      maxSingleFilmBO: 0,
      filmsProduced: 0,
      sRankCount: 0,
      hitCount: 0,
      blockbusterCount: 0,
      flopCount: 0,
      reputation: 0,
      score: 0,
      uniqueGenres: 0,
      streakFilmsNoFlop: 0,
      seasonsCompleted: 0,
      sequelsProduced: 0,
      wonAward: false,
      runDurationSeconds: 0,
      maxFranchiseLength: 0,
    },
  });
}

/** Get run duration in seconds */
export function getRunDuration(): number {
  try {
    const start = localStorage.getItem(RUN_START_KEY);
    if (start) return Math.floor((Date.now() - parseInt(start, 10)) / 1000);
  } catch {}
  return 0;
}

/** Update progress mid-run (call after key game events) */
export function updateRunProgress(update: Partial<RunSummary>): void {
  const current = getStoredProgress() || {
    date: getDailyDateString(),
    partial: {},
  };
  current.partial = { ...current.partial, ...update, runDurationSeconds: getRunDuration() };
  saveProgress(current);
}

/** Get current in-run progress for UI display */
export function getCurrentProgress(): Partial<RunSummary> {
  const stored = getStoredProgress();
  if (!stored) return {};
  return { ...stored.partial, runDurationSeconds: getRunDuration() };
}
