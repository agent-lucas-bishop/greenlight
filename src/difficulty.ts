// Difficulty mode definitions and helpers
import type { Difficulty } from './types';

export interface DifficultyConfig {
  id: Difficulty;
  name: string;
  label: string;
  emoji: string;
  color: string;
  description: string;
  startBudget: number;
  startReputation: number;
  marketMultiplierBonus: number; // added to all market multipliers
  maxSeasons: number;
  incidentFrequencyMod: number; // 1.0 = normal, 1.2 = 20% more frequent
  rivalAggressiveness: number; // 1.0 = normal, higher = more aggressive
}

export const DIFFICULTIES: DifficultyConfig[] = [
  {
    id: 'indie',
    name: 'Indie',
    label: 'Easy',
    emoji: '🎥',
    color: '#2ecc71',
    description: 'Generous budget, forgiving markets, 6 seasons to prove yourself.',
    startBudget: 15,
    startReputation: 4,
    marketMultiplierBonus: 0.1,
    maxSeasons: 6,
    incidentFrequencyMod: 1.0,
    rivalAggressiveness: 0.7,
  },
  {
    id: 'studio',
    name: 'Studio',
    label: 'Normal',
    emoji: '🎬',
    color: 'var(--gold)',
    description: 'The classic Hollywood experience. Balanced and fair.',
    startBudget: 15,
    startReputation: 3,
    marketMultiplierBonus: 0,
    maxSeasons: 5,
    incidentFrequencyMod: 1.0,
    rivalAggressiveness: 1.0,
  },
  {
    id: 'mogul',
    name: 'Mogul',
    label: 'Hard',
    emoji: '💀',
    color: '#e74c3c',
    description: 'Tight budget, cutthroat rivals, more incidents, only 4 seasons.',
    startBudget: 8,
    startReputation: 1,
    marketMultiplierBonus: 0,
    maxSeasons: 4,
    incidentFrequencyMod: 1.2,
    rivalAggressiveness: 1.4,
  },
];

export function getDifficultyConfig(difficulty: Difficulty): DifficultyConfig {
  return DIFFICULTIES.find(d => d.id === difficulty) || DIFFICULTIES[1]; // default to studio
}

export function getDifficultyBadge(difficulty: Difficulty): { emoji: string; name: string; color: string } {
  const config = getDifficultyConfig(difficulty);
  return { emoji: config.emoji, name: config.name, color: config.color };
}
