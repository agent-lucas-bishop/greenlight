/**
 * R233: Endless Mode — No season limit, escalating difficulty
 *
 * Difficulty escalates every 3 seasons:
 *   - Rival aggression +5%
 *   - Incident rate +3%
 *   - Market volatility +10%
 * 
 * Survival scoring with growing multiplier.
 * Run ends on reputation hitting zero (3 strikes equivalent).
 * Tracks personal bests in localStorage.
 */

// ─── Difficulty Escalation ───

export interface EndlessEscalation {
  /** How many escalation tiers have been applied (every 3 seasons) */
  tier: number;
  /** Additive rival aggression bonus (0.05 per tier) */
  rivalAggressionBonus: number;
  /** Additive incident rate bonus (0.03 per tier) */
  incidentRateBonus: number;
  /** Multiplicative market volatility factor (1.0 + 0.10 per tier) */
  marketVolatilityMult: number;
  /** Difficulty label for display */
  label: string;
}

export function getEndlessEscalation(season: number): EndlessEscalation {
  const tier = Math.floor((season - 1) / 3);
  return {
    tier,
    rivalAggressionBonus: tier * 0.05,
    incidentRateBonus: tier * 0.03,
    marketVolatilityMult: 1.0 + tier * 0.10,
    label: getEscalationLabel(tier),
  };
}

function getEscalationLabel(tier: number): string {
  if (tier <= 0) return 'Studio';
  if (tier === 1) return 'Studio+';
  if (tier === 2) return 'Mogul';
  if (tier === 3) return 'Mogul+';
  if (tier === 4) return 'Legendary';
  return `Legendary ${tier - 3}`;
}

// ─── Survival Scoring ───

export interface EndlessScore {
  /** Cumulative score across all seasons */
  cumulative: number;
  /** Current season multiplier */
  multiplier: number;
}

/**
 * Calculate score for a single season in endless mode.
 * multiplier grows 0.1 per season survived.
 */
export function calculateEndlessSeasonScore(
  season: number,
  boxOffice: number,
  quality: number,
  streakLength: number,
): { seasonScore: number; multiplier: number } {
  const multiplier = 1.0 + (season - 1) * 0.1;
  const base = Math.round(boxOffice * 0.5 + quality * 2 + streakLength * 5);
  const seasonScore = Math.round(base * multiplier);
  return { seasonScore, multiplier };
}

// ─── Personal Best Tracking ───

const ENDLESS_PB_KEY = 'greenlight_endless_personal_best';

export interface EndlessPersonalBest {
  highestSeason: number;
  bestCumulativeScore: number;
  longestStreak: number;
  lastUpdated: string;
}

export function getEndlessPersonalBest(): EndlessPersonalBest {
  try {
    const saved = localStorage.getItem(ENDLESS_PB_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* empty */ }
  return { highestSeason: 0, bestCumulativeScore: 0, longestStreak: 0, lastUpdated: '' };
}

export function updateEndlessPersonalBest(
  season: number,
  cumulativeScore: number,
  streak: number,
): EndlessPersonalBest {
  const pb = getEndlessPersonalBest();
  const updated: EndlessPersonalBest = {
    highestSeason: Math.max(pb.highestSeason, season),
    bestCumulativeScore: Math.max(pb.bestCumulativeScore, cumulativeScore),
    longestStreak: Math.max(pb.longestStreak, streak),
    lastUpdated: new Date().toISOString(),
  };
  try {
    localStorage.setItem(ENDLESS_PB_KEY, JSON.stringify(updated));
  } catch { /* empty */ }
  return updated;
}

// ─── Endless Season Target (escalates beyond normal) ───

/**
 * Endless mode uses steeper target scaling past season 8.
 * Season 12+ goes beyond Mogul difficulty.
 */
export function getEndlessSeasonTarget(season: number): number {
  const BASE_TARGETS = [20, 28, 38, 50, 62, 74, 86, 98];
  if (season <= 8) return BASE_TARGETS[season - 1];
  // Beyond season 8: +14 per season, matching Mogul-level pressure
  const extra = (season - 8) * 14;
  return 98 + extra;
}

// ─── Run State (for in-progress tracking) ───

export interface EndlessRunState {
  cumulativeScore: number;
  bestStreakThisRun: number;
  currentStreak: number;
  seasonsCompleted: number;
  strikesUsed: number;
}

export function createEndlessRunState(): EndlessRunState {
  return {
    cumulativeScore: 0,
    bestStreakThisRun: 0,
    currentStreak: 0,
    seasonsCompleted: 0,
    strikesUsed: 0,
  };
}
