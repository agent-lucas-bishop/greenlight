// Difficulty mode definitions, game modifiers, and helpers
import type { Difficulty, GameModifiers, Genre } from './types';

export interface DifficultyConfig {
  id: Difficulty;
  name: string;
  label: string;
  emoji: string;
  color: string;
  description: string;
  startBudget: number;
  startReputation: number;
  marketMultiplierBonus: number;
  maxSeasons: number;
  maxStrikes: number;
  incidentFrequencyMod: number;
  rivalAggressiveness: number;
  marketVolatility: number;
  noShopDiscounts: boolean;
  scoreMultiplier: number;
  qualityThresholdMod: number;   // multiplier on quality thresholds (>1 = harder)
  cardDrawBonus: number;          // extra cards drawn per turn (negative = fewer)
  rerollLimit?: number;           // max rerolls per production (undefined = default)
  boxOfficeMarginMod: number;     // multiplier on box office margins (>1 = tighter)
}

export const DIFFICULTIES: DifficultyConfig[] = [
  {
    id: 'indie',
    name: 'Indie',
    label: 'For learning the ropes',
    emoji: '🟢',
    color: '#2ecc71',
    description: 'Generous budget (+20%), forgiving audiences, more generous card draws. Perfect for your first run.',
    startBudget: 18,  // +20% over normal ($15)
    startReputation: 4, // +1 starting rep
    marketMultiplierBonus: 0.1,
    maxSeasons: 6,
    maxStrikes: 4,
    incidentFrequencyMod: 0.5,  // 50% less frequent
    rivalAggressiveness: 0.5,    // 50% weaker
    marketVolatility: 1.0,
    noShopDiscounts: false,
    scoreMultiplier: 0.5,
    qualityThresholdMod: 0.85,   // quality thresholds lowered 15%
    cardDrawBonus: 1,             // +1 card drawn per turn
    boxOfficeMarginMod: 1.0,
  },
  {
    id: 'studio',
    name: 'Studio',
    label: 'Balanced experience',
    emoji: '🟡',
    color: 'var(--gold)',
    description: 'The classic Hollywood experience. Balanced and fair.',
    startBudget: 15,
    startReputation: 3,
    marketMultiplierBonus: 0,
    maxSeasons: 5,
    maxStrikes: 3,
    incidentFrequencyMod: 1.0,
    rivalAggressiveness: 1.0,
    marketVolatility: 1.0,
    noShopDiscounts: false,
    scoreMultiplier: 1.0,
    qualityThresholdMod: 1.0,
    cardDrawBonus: 0,
    boxOfficeMarginMod: 1.0,
  },
  {
    id: 'auteur',
    name: 'Auteur',
    label: 'Uncompromising vision',
    emoji: '🎬',
    color: '#9b59b6',
    description: 'Reduced budget (-15%), harsher critics, tighter box office margins, fewer rerolls. For seasoned directors.',
    startBudget: 13,  // -15% (~$12.75, rounded up)
    startReputation: 3,
    marketMultiplierBonus: 0,
    maxSeasons: 5,
    maxStrikes: 3,
    incidentFrequencyMod: 1.1,
    rivalAggressiveness: 1.15,
    marketVolatility: 1.2,
    noShopDiscounts: false,
    scoreMultiplier: 1.75,
    qualityThresholdMod: 1.2,    // quality thresholds raised 20%
    cardDrawBonus: 0,
    rerollLimit: 1,               // fewer reroll opportunities
    boxOfficeMarginMod: 1.25,    // tighter margins on box office
  },
  {
    id: 'mogul',
    name: 'Mogul',
    label: 'Cutthroat Hollywood',
    emoji: '🔴',
    color: '#e74c3c',
    description: 'Tight budget, stronger rivals, more incidents, volatile markets.',
    startBudget: 12,  // -$3M
    startReputation: 3,
    marketMultiplierBonus: 0,
    maxSeasons: 5,
    maxStrikes: 3,
    incidentFrequencyMod: 1.25,  // +25%
    rivalAggressiveness: 1.25,    // +25%
    marketVolatility: 1.5,
    noShopDiscounts: false,
    scoreMultiplier: 1.5,
    qualityThresholdMod: 1.15,
    cardDrawBonus: 0,
    boxOfficeMarginMod: 1.15,
  },
  {
    id: 'nightmare',
    name: 'Nightmare',
    label: 'For masochists',
    emoji: '💀',
    color: '#8b0000',
    description: 'Brutal budget, crippled reputation, savage rivals, double incidents, no discounts.',
    startBudget: 10,  // -$5M
    startReputation: 2, // -1 starting rep
    marketMultiplierBonus: -0.1,
    maxSeasons: 5,
    maxStrikes: 2,
    incidentFrequencyMod: 2.0,  // double incidents
    rivalAggressiveness: 1.5,    // 50% stronger
    marketVolatility: 1.8,
    noShopDiscounts: true,
    scoreMultiplier: 2.5,
    qualityThresholdMod: 1.3,
    cardDrawBonus: -1,
    boxOfficeMarginMod: 1.3,
  },
];

// ─── Default Game Modifiers ───

export const DEFAULT_MODIFIERS: GameModifiers = {
  budgetAdjustment: 0,
  rivalAggressiveness: 1.0,
  incidentFrequency: 1.0,
  marketVolatility: 1.0,
  cardDrawAdjustment: 0,
  genreRestriction: null,
  noLegendary: false,
  speedMode: false,
  ironMan: false,
};

// ─── Modifier Definitions for UI ───

export interface ModifierDef {
  id: keyof GameModifiers;
  name: string;
  emoji: string;
  description: string;
  type: 'slider' | 'toggle' | 'genre';
  min?: number;
  max?: number;
  step?: number;
  default: number | boolean | null;
  scoreImpact: (value: number | boolean | Genre | null) => number; // multiplier contribution
}

export const MODIFIER_DEFS: ModifierDef[] = [
  {
    id: 'budgetAdjustment',
    name: 'Starting Budget',
    emoji: '💰',
    description: 'Adjust starting budget by -$10M to +$10M',
    type: 'slider',
    min: -10,
    max: 10,
    step: 1,
    default: 0,
    scoreImpact: (v) => {
      const val = v as number;
      if (val < 0) return 1 + Math.abs(val) * 0.03;
      if (val > 0) return 1 - val * 0.02;
      return 1;
    },
  },
  {
    id: 'rivalAggressiveness',
    name: 'Rival Aggressiveness',
    emoji: '🏢',
    description: 'How aggressive rival studios are (0.5× to 2×)',
    type: 'slider',
    min: 0.5,
    max: 2.0,
    step: 0.1,
    default: 1.0,
    scoreImpact: (v) => {
      const val = v as number;
      return 0.8 + val * 0.2;
    },
  },
  {
    id: 'incidentFrequency',
    name: 'Incident Frequency',
    emoji: '⚠️',
    description: 'How often incidents occur (0× to 2×)',
    type: 'slider',
    min: 0,
    max: 2.0,
    step: 0.1,
    default: 1.0,
    scoreImpact: (v) => {
      const val = v as number;
      return 0.7 + val * 0.3;
    },
  },
  {
    id: 'marketVolatility',
    name: 'Market Volatility',
    emoji: '📈',
    description: 'How volatile market conditions are (0.5× to 2×)',
    type: 'slider',
    min: 0.5,
    max: 2.0,
    step: 0.1,
    default: 1.0,
    scoreImpact: (v) => {
      const val = v as number;
      return 0.9 + val * 0.1;
    },
  },
  {
    id: 'cardDrawAdjustment',
    name: 'Card Draw per Turn',
    emoji: '🃏',
    description: 'Adjust cards drawn per turn (-2 to +2)',
    type: 'slider',
    min: -2,
    max: 2,
    step: 1,
    default: 0,
    scoreImpact: (v) => {
      const val = v as number;
      if (val < 0) return 1 + Math.abs(val) * 0.1;
      if (val > 0) return 1 - val * 0.08;
      return 1;
    },
  },
  {
    id: 'genreRestriction',
    name: 'Genre Restriction',
    emoji: '🎭',
    description: 'Lock to a single genre for the entire run',
    type: 'genre',
    default: null,
    scoreImpact: (v) => v ? 1.3 : 1.0,
  },
  {
    id: 'noLegendary',
    name: 'No Legendary Scripts',
    emoji: '📜',
    description: 'Legendary scripts never appear',
    type: 'toggle',
    default: false,
    scoreImpact: (v) => v ? 1.15 : 1.0,
  },
  {
    id: 'speedMode',
    name: 'Speed Mode',
    emoji: '⚡',
    description: 'Halved season count — less time to prove yourself',
    type: 'toggle',
    default: false,
    scoreImpact: (v) => v ? 1.4 : 1.0,
  },
  {
    id: 'ironMan',
    name: 'Iron Man',
    emoji: '☠️',
    description: 'No retries — 1 missed target and you\'re fired',
    type: 'toggle',
    default: false,
    scoreImpact: (v) => v ? 1.8 : 1.0,
  },
];

// ─── Score Multiplier Calculation ───

export function calculateCustomScoreMultiplier(modifiers: GameModifiers): number {
  let mult = 1.0;
  for (const def of MODIFIER_DEFS) {
    const value = modifiers[def.id];
    mult *= def.scoreImpact(value as any);
  }
  return Math.round(mult * 100) / 100;
}

export function getScoreMultiplier(difficulty: Difficulty, modifiers?: GameModifiers): number {
  if (difficulty === 'custom' && modifiers) {
    return calculateCustomScoreMultiplier(modifiers);
  }
  const config = getDifficultyConfig(difficulty);
  return config.scoreMultiplier;
}

// ─── Modifiers from Preset ───

export function getModifiersForDifficulty(difficulty: Difficulty): GameModifiers {
  const config = getDifficultyConfig(difficulty);
  return {
    budgetAdjustment: config.startBudget - 15, // relative to normal
    rivalAggressiveness: config.rivalAggressiveness,
    incidentFrequency: config.incidentFrequencyMod,
    marketVolatility: config.marketVolatility,
    cardDrawAdjustment: 0,
    genreRestriction: null,
    noLegendary: false,
    speedMode: false,
    ironMan: difficulty === 'nightmare',
  };
}

// ─── Config Lookup ───

export function getDifficultyConfig(difficulty: Difficulty): DifficultyConfig {
  if (difficulty === 'custom') return DIFFICULTIES[1]; // use Normal as base for custom
  return DIFFICULTIES.find(d => d.id === difficulty) || DIFFICULTIES[1];
}

export function getDifficultyBadge(difficulty: Difficulty): { emoji: string; name: string; color: string } {
  if (difficulty === 'custom') return { emoji: '⚙️', name: 'Custom', color: '#9b59b6' };
  const config = getDifficultyConfig(difficulty);
  return { emoji: config.emoji, name: config.name, color: config.color };
}

// ─── Apply Modifiers to DifficultyConfig ───

export function getEffectiveConfig(difficulty: Difficulty, modifiers?: GameModifiers): DifficultyConfig {
  const base = getDifficultyConfig(difficulty);
  if (!modifiers || difficulty !== 'custom') return base;

  const seasons = modifiers.speedMode ? Math.max(2, Math.floor(base.maxSeasons / 2)) : base.maxSeasons;
  const strikes = modifiers.ironMan ? 1 : base.maxStrikes;

  return {
    ...base,
    id: 'custom',
    name: 'Custom',
    label: 'Your rules',
    emoji: '⚙️',
    color: '#9b59b6',
    startBudget: base.startBudget + modifiers.budgetAdjustment,
    rivalAggressiveness: modifiers.rivalAggressiveness,
    incidentFrequencyMod: modifiers.incidentFrequency,
    marketVolatility: modifiers.marketVolatility,
    maxSeasons: seasons,
    maxStrikes: strikes,
    noShopDiscounts: false,
    scoreMultiplier: calculateCustomScoreMultiplier(modifiers),
    qualityThresholdMod: 1.0,
    cardDrawBonus: modifiers.cardDrawAdjustment,
    boxOfficeMarginMod: 1.0,
  };
}

// ─── All Genres for genre restriction ───
export const ALL_GENRES: Genre[] = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];

// ─── New Game+ Legacy Deck ───

const NG_LEGACY_KEY = 'greenlight_ng_plus_legacy';

export interface LegacyCard {
  name: string;
  source: string;
  cardType: string;
  baseQuality: number;
  synergyText: string;
  tags?: string[];
}

export interface LegacyDeckData {
  cards: LegacyCard[];
  sourceRunScore: number;
  sourceRunDate: string;
  sourceStudioName: string;
}

/** Save the best 3 cards from a completed run for NG+ legacy deck */
export function saveLegacyDeck(cards: LegacyCard[], runScore: number, studioName: string): void {
  try {
    const existing = loadLegacyDeck();
    // Only overwrite if this run's score is higher
    if (existing && existing.sourceRunScore >= runScore) return;
    const data: LegacyDeckData = {
      cards: cards.slice(0, 3),
      sourceRunScore: runScore,
      sourceRunDate: new Date().toISOString().slice(0, 10),
      sourceStudioName: studioName,
    };
    localStorage.setItem(NG_LEGACY_KEY, JSON.stringify(data));
  } catch {}
}

/** Load the legacy deck for NG+ */
export function loadLegacyDeck(): LegacyDeckData | null {
  try {
    const raw = localStorage.getItem(NG_LEGACY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

/** Check if NG+ is unlocked (score > 500 in any run) */
export function isNGPlusUnlocked(): boolean {
  try {
    const raw = localStorage.getItem('greenlight_leaderboard');
    if (!raw) return false;
    const entries = JSON.parse(raw);
    return entries.some((e: any) => e.score > 500);
  } catch { return false; }
}

/** Check if Auteur difficulty is unlocked (completed at least one run) */
export function isAuteurUnlocked(): boolean {
  try {
    const raw = localStorage.getItem('greenlight_unlocks');
    if (!raw) return false;
    const u = JSON.parse(raw);
    return (u.totalRuns || 0) >= 1;
  } catch { return false; }
}

/** Check if a run is NG+ for leaderboard filtering */
export function isNGPlusRun(mode: string): boolean {
  return mode === 'newGamePlus';
}
