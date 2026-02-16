// Daily Modifiers — each day gets a unique rule modifier for daily challenge runs

import { mulberry32, getDailySeed } from './seededRng';

export interface DailyModifier {
  id: string;
  name: string;
  emoji: string;
  description: string;
  shortDesc: string; // one-liner for share text
}

export const DAILY_MODIFIERS: DailyModifier[] = [
  {
    id: 'budget_crunch',
    name: 'Budget Crunch',
    emoji: '💸',
    description: 'Start with 30% less money. Every dollar counts.',
    shortDesc: 'Start -30% budget',
  },
  {
    id: 'critics_darling',
    name: "Critics' Darling",
    emoji: '📝',
    description: 'Quality bonuses doubled, but box office -20%.',
    shortDesc: 'Quality ×2 but BO -20%',
  },
  {
    id: 'blockbuster_summer',
    name: 'Blockbuster Summer',
    emoji: '☀️',
    description: 'Action & Sci-Fi scripts get +2 base score. Everything else -1.',
    shortDesc: 'Action/Sci-Fi +2, others -1',
  },
  {
    id: 'indie_spirit',
    name: 'Indie Spirit',
    emoji: '🎭',
    description: 'No S-tier talent (skill 5+) available, but all costs halved.',
    shortDesc: 'No S-tier, costs halved',
  },
  {
    id: 'award_season',
    name: 'Award Season',
    emoji: '🏆',
    description: 'Reputation gains doubled, but quality targets +5.',
    shortDesc: 'Rep ×2, targets +5',
  },
  {
    id: 'sequel_mania',
    name: 'Sequel Mania',
    emoji: '2️⃣',
    description: 'Making the same genre twice in a row gives +30% box office.',
    shortDesc: 'Same genre streak +30% BO',
  },
  {
    id: 'method_madness',
    name: 'Method Madness',
    emoji: '🎪',
    description: 'All talent Heat +1, but every card gets +1 base quality.',
    shortDesc: 'All Heat +1, cards +1',
  },
  {
    id: 'producers_cut',
    name: "Producer's Cut",
    emoji: '✂️',
    description: 'Max draws reduced by 2, but clean wrap bonus is doubled.',
    shortDesc: '-2 max draws, clean wrap ×2',
  },
];

/** Get today's daily modifier using the daily seed */
export function getTodayModifier(): DailyModifier {
  const seed = getDailySeed();
  // Use a separate RNG stream so modifier selection doesn't affect game RNG
  const modRng = mulberry32(seed + 99999);
  const idx = Math.floor(modRng() * DAILY_MODIFIERS.length);
  return DAILY_MODIFIERS[idx];
}

/** Get modifier for a specific date string (YYYY-MM-DD) */
export function getModifierForDate(dateStr: string): DailyModifier {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const modRng = mulberry32(Math.abs(hash) + 99999);
  const idx = Math.floor(modRng() * DAILY_MODIFIERS.length);
  return DAILY_MODIFIERS[idx];
}

export function getModifierById(id: string): DailyModifier | undefined {
  return DAILY_MODIFIERS.find(m => m.id === id);
}
