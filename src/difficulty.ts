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
}

export const DIFFICULTIES: DifficultyConfig[] = [
  {
    id: 'indie',
    name: 'Easy',
    label: 'For learning the ropes',
    emoji: '🟢',
    color: '#2ecc71',
    description: 'Generous budget, weaker rivals, fewer incidents. Perfect for your first run.',
    startBudget: 20,  // +$5M over normal
    startReputation: 4, // +1 starting rep
    marketMultiplierBonus: 0.1,
    maxSeasons: 6,
    maxStrikes: 4,
    incidentFrequencyMod: 0.5,  // 50% less frequent
    rivalAggressiveness: 0.5,    // 50% weaker
    marketVolatility: 1.0,
    noShopDiscounts: false,
    scoreMultiplier: 0.5,
  },
  {
    id: 'studio',
    name: 'Normal',
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
  },
  {
    id: 'mogul',
    name: 'Hard',
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
  };
}

// ─── All Genres for genre restriction ───
export const ALL_GENRES: Genre[] = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];
