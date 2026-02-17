/**
 * R210 — Seasonal Events Calendar
 *
 * Maps real-world months to in-game seasonal events that affect
 * box office calculations, genre quality bonuses, and critic scores.
 */

import type { Genre } from './types';

export interface SeasonalEvent {
  id: string;
  name: string;
  emoji: string;
  months: number[];            // 0-indexed (Jan=0)
  affectedGenres: Genre[];
  boMultiplier: number;        // applied to box office (1.0 = no change)
  qualityBonus: number;        // flat quality bonus for affected genres
  criticBonus: number;         // flat critic score bonus
  themeColor: string;
  description: string;
}

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    id: 'awards_season',
    name: 'Awards Season',
    emoji: '🏆',
    months: [0, 1],
    affectedGenres: ['Drama', 'Thriller'],
    boMultiplier: 1.0,
    qualityBonus: 0,
    criticBonus: 4,
    themeColor: '#d4a843',
    description: 'Critics sharpen their pens — prestige films get extra attention.',
  },
  {
    id: 'summer_blockbuster',
    name: 'Summer Blockbuster Season',
    emoji: '☀️',
    months: [5, 6, 7],
    affectedGenres: ['Action', 'Sci-Fi'],
    boMultiplier: 1.20,
    qualityBonus: 0,
    criticBonus: 0,
    themeColor: '#f59e0b',
    description: 'Audiences flock to theaters for big-budget spectacles.',
  },
  {
    id: 'horror_month',
    name: 'Horror Month',
    emoji: '🎃',
    months: [9],
    affectedGenres: ['Horror'],
    boMultiplier: 1.25,
    qualityBonus: 3,
    criticBonus: 0,
    themeColor: '#dc2626',
    description: 'October belongs to horror — scares sell like candy.',
  },
  {
    id: 'holiday_season',
    name: 'Holiday Season',
    emoji: '🎄',
    months: [10, 11],
    affectedGenres: ['Comedy', 'Drama'],
    boMultiplier: 1.15,
    qualityBonus: 0,
    criticBonus: 0,
    themeColor: '#16a34a',
    description: 'Families head to theaters — feel-good films thrive.',
  },
  {
    id: 'sundance',
    name: 'Sundance Season',
    emoji: '🏔️',
    months: [0],
    affectedGenres: ['Drama', 'Thriller'],
    boMultiplier: 1.0,
    qualityBonus: 5,
    criticBonus: 2,
    themeColor: '#60a5fa',
    description: 'Indie darlings shine — quality trumps budget.',
  },
  {
    id: 'cannes',
    name: 'Cannes Festival',
    emoji: '🌴',
    months: [4],
    affectedGenres: ['Drama', 'Romance'],
    boMultiplier: 1.10,
    qualityBonus: 3,
    criticBonus: 3,
    themeColor: '#a855f7',
    description: 'International prestige — auteur cinema gets its moment.',
  },
  {
    id: 'valentines',
    name: "Valentine's Season",
    emoji: '💕',
    months: [1],
    affectedGenres: ['Romance'],
    boMultiplier: 1.30,
    qualityBonus: 2,
    criticBonus: 0,
    themeColor: '#f43f5e',
    description: "Love is in the air — romance films dominate date night.",
  },
];

/**
 * Get all seasonal events active for a given month (0-indexed).
 */
export function getActiveSeasonalEvents(month?: number): SeasonalEvent[] {
  const m = month ?? new Date().getMonth();
  return SEASONAL_EVENTS.filter(e => e.months.includes(m));
}

/**
 * Get the combined BO multiplier for a genre from all active seasonal events.
 */
export function getSeasonalBOMultiplier(genre: Genre, month?: number): number {
  const active = getActiveSeasonalEvents(month);
  let mult = 1.0;
  for (const event of active) {
    if (event.affectedGenres.includes(genre)) {
      mult *= event.boMultiplier;
    }
  }
  return mult;
}

/**
 * Get the combined quality bonus for a genre from all active seasonal events.
 */
export function getSeasonalQualityBonus(genre: Genre, month?: number): number {
  const active = getActiveSeasonalEvents(month);
  let bonus = 0;
  for (const event of active) {
    if (event.affectedGenres.includes(genre)) {
      bonus += event.qualityBonus;
    }
  }
  return bonus;
}

/**
 * Get the combined critic score bonus from all active seasonal events.
 */
export function getSeasonalCriticBonus(genre: Genre, month?: number): number {
  const active = getActiveSeasonalEvents(month);
  let bonus = 0;
  for (const event of active) {
    if (event.affectedGenres.includes(genre)) {
      bonus += event.criticBonus;
    }
  }
  return bonus;
}
