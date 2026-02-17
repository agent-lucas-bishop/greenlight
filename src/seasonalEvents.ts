/**
 * R245 — Seasonal Events + Limited Content
 *
 * Real-world date-driven events that modify gameplay:
 * - Awards Season (Feb-Mar): +25% quality, Oscar Bait modifier, golden borders
 * - Summer Blockbuster (Jun-Aug): +50% BO for Action/Sci-Fi, Blockbuster Rush cards
 * - Horror Month (Oct): Horror 2x revenue, spooky theme, jump-scare SFX
 * - Holiday Season (Dec): Family/Comedy bonus, gift-wrapped borders, snow CSS
 * - Indie Spring (Apr-May): Budget -20%, festival awards doubled
 */

import type { Genre, CardTemplate, SynergyContext, SynergyResult } from './types';

/* ─── Types ─── */

export interface SeasonalEventDateRange {
  startMonth: number; // 1-indexed (Jan=1)
  startDay: number;
  endMonth: number;
  endDay: number;
}

export interface SeasonalEventModifiers {
  revenueMultiplier: number;   // 1.0 = no change
  qualityMultiplier: number;   // 1.0 = no change (applied as % bonus to quality)
  budgetMultiplier: number;    // 1.0 = no change (< 1 = cheaper)
  affectedGenres: Genre[];     // genres that receive the modifiers
  festivalAwardsMultiplier?: number; // multiplier for festival award scores
}

export interface SeasonalEventTheme {
  '--event-accent': string;
  '--event-bg': string;
  '--event-glow': string;
  '--event-border-style'?: string;
  '--event-card-border'?: string;
  '--event-snow'?: string;       // '1' to enable snow
  '--event-spooky'?: string;     // '1' to enable spooky theme
  [key: string]: string | undefined;
}

export interface SeasonalEventCard {
  name: string;
  cardType: 'action' | 'challenge';
  baseQuality: number;
  synergyText: string;
  synergyCondition: ((ctx: SynergyContext) => SynergyResult) | null;
  riskTag: '🟢' | '🟡';
  tags?: ('momentum' | 'precision' | 'chaos' | 'heart' | 'spectacle')[];
}

export interface SeasonalEvent {
  id: string;
  name: string;
  emoji: string;
  dateRange: SeasonalEventDateRange;
  months: number[];              // 0-indexed for backward compat
  affectedGenres: Genre[];
  boMultiplier: number;          // backward compat
  qualityBonus: number;          // backward compat (flat)
  criticBonus: number;           // backward compat
  themeColor: string;
  description: string;
  modifiers: SeasonalEventModifiers;
  themeOverrides: SeasonalEventTheme;
  specialCards: SeasonalEventCard[];
}

/* ─── Helper: check if a date falls within a range ─── */

function isDateInRange(date: Date, range: SeasonalEventDateRange): boolean {
  const m = date.getMonth() + 1; // 1-indexed
  const d = date.getDate();
  const { startMonth, startDay, endMonth, endDay } = range;

  // Handle same-year ranges only (no year wrapping needed for our events)
  if (startMonth < endMonth) {
    if (m < startMonth || m > endMonth) return false;
    if (m === startMonth && d < startDay) return false;
    if (m === endMonth && d > endDay) return false;
    return true;
  }
  if (startMonth === endMonth) {
    return m === startMonth && d >= startDay && d <= endDay;
  }
  // Wrapping (e.g. Dec-Jan) — not needed but handle anyway
  if (m > startMonth || m < endMonth) return true;
  if (m === startMonth && d >= startDay) return true;
  if (m === endMonth && d <= endDay) return true;
  return false;
}

/* ─── Event Definitions ─── */

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    id: 'awards_season',
    name: 'Awards Season',
    emoji: '🏆',
    dateRange: { startMonth: 2, startDay: 1, endMonth: 3, endDay: 31 },
    months: [1, 2], // Feb-Mar (0-indexed)
    affectedGenres: ['Drama', 'Thriller'],
    boMultiplier: 1.0,
    qualityBonus: 0,
    criticBonus: 4,
    themeColor: '#d4a843',
    description: '+25% quality bonus. Oscar Bait genre modifier. Golden card borders.',
    modifiers: {
      revenueMultiplier: 1.0,
      qualityMultiplier: 1.25,
      budgetMultiplier: 1.0,
      affectedGenres: ['Drama', 'Thriller'],
    },
    themeOverrides: {
      '--event-accent': '#d4a843',
      '--event-bg': 'rgba(212,168,67,0.08)',
      '--event-glow': 'rgba(212,168,67,0.4)',
      '--event-card-border': '2px solid #d4a843',
    },
    specialCards: [
      {
        name: 'Oscar Bait Script',
        cardType: 'action',
        baseQuality: 7,
        synergyText: 'Awards Season special: +7 quality. If genre is Drama: +5 bonus.',
        synergyCondition: (ctx: SynergyContext) => ({
          bonus: 5,
          description: 'Oscar Bait — prestige drama bonus',
        }),
        riskTag: '🟢',
        tags: ['heart'],
      },
      {
        name: 'For Your Consideration',
        cardType: 'action',
        baseQuality: 5,
        synergyText: 'Awards push: +5 quality, critic darling.',
        synergyCondition: (ctx: SynergyContext) => ({
          bonus: 3,
          description: 'FYC campaign pays off',
        }),
        riskTag: '🟢',
        tags: ['precision'],
      },
    ],
  },
  {
    id: 'summer_blockbuster',
    name: 'Summer Blockbuster',
    emoji: '☀️',
    dateRange: { startMonth: 6, startDay: 1, endMonth: 8, endDay: 31 },
    months: [5, 6, 7], // Jun-Aug
    affectedGenres: ['Action', 'Sci-Fi'],
    boMultiplier: 1.50,
    qualityBonus: 0,
    criticBonus: 0,
    themeColor: '#f59e0b',
    description: '+50% box office for Action & Sci-Fi. Blockbuster Rush event cards.',
    modifiers: {
      revenueMultiplier: 1.50,
      qualityMultiplier: 1.0,
      budgetMultiplier: 1.0,
      affectedGenres: ['Action', 'Sci-Fi'],
    },
    themeOverrides: {
      '--event-accent': '#f59e0b',
      '--event-bg': 'rgba(245,158,11,0.08)',
      '--event-glow': 'rgba(245,158,11,0.4)',
    },
    specialCards: [
      {
        name: 'Blockbuster Rush',
        cardType: 'action',
        baseQuality: 6,
        synergyText: 'Summer spectacle: +6 quality. If 3+ spectacle tags: +4 bonus.',
        synergyCondition: (ctx: SynergyContext) => ({
          bonus: (ctx.tagsPlayed?.['spectacle'] || 0) >= 3 ? 4 : 0,
          description: 'Blockbuster Rush — spectacle chain',
        }),
        riskTag: '🟢',
        tags: ['spectacle'],
      },
      {
        name: 'Opening Weekend Hype',
        cardType: 'challenge',
        baseQuality: 8,
        synergyText: 'Big gamble: +8 quality if accepted. Massive opening potential.',
        synergyCondition: null,
        riskTag: '🟡',
        tags: ['momentum'],
      },
    ],
  },
  {
    id: 'horror_month',
    name: 'Horror Month',
    emoji: '🎃',
    dateRange: { startMonth: 10, startDay: 1, endMonth: 10, endDay: 31 },
    months: [9], // Oct
    affectedGenres: ['Horror'],
    boMultiplier: 2.0,
    qualityBonus: 3,
    criticBonus: 0,
    themeColor: '#dc2626',
    description: 'Horror films get 2× revenue! Spooky UI theme.',
    modifiers: {
      revenueMultiplier: 2.0,
      qualityMultiplier: 1.0,
      budgetMultiplier: 1.0,
      affectedGenres: ['Horror'],
    },
    themeOverrides: {
      '--event-accent': '#dc2626',
      '--event-bg': 'rgba(220,38,38,0.08)',
      '--event-glow': 'rgba(220,38,38,0.5)',
      '--event-spooky': '1',
      '--event-card-border': '2px solid #8b0000',
    },
    specialCards: [
      {
        name: 'Jump Scare Setup',
        cardType: 'action',
        baseQuality: 5,
        synergyText: 'Scare the audience: +5 quality. If 2+ chaos tags: +6 bonus.',
        synergyCondition: (ctx: SynergyContext) => ({
          bonus: (ctx.tagsPlayed?.['chaos'] || 0) >= 2 ? 6 : 0,
          description: 'Jump Scare — chaos amplifies fear',
        }),
        riskTag: '🟢',
        tags: ['chaos'],
      },
      {
        name: 'Final Girl Moment',
        cardType: 'action',
        baseQuality: 6,
        synergyText: 'Iconic horror trope: +6 quality, heart bonus.',
        synergyCondition: (ctx: SynergyContext) => ({
          bonus: 3,
          description: 'Final Girl — audience cheers',
        }),
        riskTag: '🟢',
        tags: ['heart'],
      },
    ],
  },
  {
    id: 'holiday_season',
    name: 'Holiday Season',
    emoji: '🎄',
    dateRange: { startMonth: 12, startDay: 1, endMonth: 12, endDay: 31 },
    months: [11], // Dec
    affectedGenres: ['Comedy', 'Drama'],
    boMultiplier: 1.30,
    qualityBonus: 0,
    criticBonus: 0,
    themeColor: '#16a34a',
    description: 'Family & Comedy bonus. Gift-wrapped card borders. Snow effect!',
    modifiers: {
      revenueMultiplier: 1.30,
      qualityMultiplier: 1.15,
      budgetMultiplier: 1.0,
      affectedGenres: ['Comedy', 'Drama'],
    },
    themeOverrides: {
      '--event-accent': '#16a34a',
      '--event-bg': 'rgba(22,163,74,0.08)',
      '--event-glow': 'rgba(22,163,74,0.4)',
      '--event-card-border': '3px solid #c41e3a',
      '--event-border-style': 'dashed',
      '--event-snow': '1',
    },
    specialCards: [
      {
        name: 'Holiday Magic',
        cardType: 'action',
        baseQuality: 6,
        synergyText: 'Heartwarming holiday moment: +6 quality, +3 if 2+ heart tags.',
        synergyCondition: (ctx: SynergyContext) => ({
          bonus: (ctx.tagsPlayed?.['heart'] || 0) >= 2 ? 3 : 0,
          description: 'Holiday Magic — warm hearts',
        }),
        riskTag: '🟢',
        tags: ['heart'],
      },
    ],
  },
  {
    id: 'indie_spring',
    name: 'Indie Spring',
    emoji: '🌸',
    dateRange: { startMonth: 4, startDay: 1, endMonth: 5, endDay: 31 },
    months: [3, 4], // Apr-May
    affectedGenres: ['Drama', 'Romance', 'Thriller'],
    boMultiplier: 1.10,
    qualityBonus: 5,
    criticBonus: 2,
    themeColor: '#a855f7',
    description: 'Budget costs −20%. Festival awards doubled. Indie darlings shine.',
    modifiers: {
      revenueMultiplier: 1.10,
      qualityMultiplier: 1.0,
      budgetMultiplier: 0.80,
      affectedGenres: ['Drama', 'Romance', 'Thriller'],
      festivalAwardsMultiplier: 2.0,
    },
    themeOverrides: {
      '--event-accent': '#a855f7',
      '--event-bg': 'rgba(168,85,247,0.08)',
      '--event-glow': 'rgba(168,85,247,0.4)',
    },
    specialCards: [
      {
        name: 'Festival Darling',
        cardType: 'action',
        baseQuality: 6,
        synergyText: 'Indie prestige: +6 quality. Precision focus rewarded.',
        synergyCondition: (ctx: SynergyContext) => ({
          bonus: (ctx.tagsPlayed?.['precision'] || 0) >= 2 ? 4 : 0,
          description: 'Festival Darling — precision craft',
        }),
        riskTag: '🟢',
        tags: ['precision'],
      },
      {
        name: 'Breakout Performance',
        cardType: 'action',
        baseQuality: 5,
        synergyText: 'Unknown actor shines: +5 quality, heart tag.',
        synergyCondition: (ctx: SynergyContext) => ({
          bonus: 2,
          description: 'Breakout — star is born',
        }),
        riskTag: '🟢',
        tags: ['heart'],
      },
    ],
  },
];

/* ─── Core API ─── */

/**
 * Get the currently active seasonal event (first match), or null.
 */
export function getActiveEvent(date?: Date): SeasonalEvent | null {
  const d = date ?? new Date();
  for (const event of SEASONAL_EVENTS) {
    if (isDateInRange(d, event.dateRange)) return event;
  }
  return null;
}

/**
 * Get ALL active seasonal events for a given date.
 */
export function getActiveSeasonalEvents(month?: number): SeasonalEvent[] {
  const m = month ?? new Date().getMonth();
  return SEASONAL_EVENTS.filter(e => e.months.includes(m));
}

/**
 * Apply event modifiers to game state calculations.
 * Returns modifier values to be used in gameStore calculations.
 */
export function applyEventModifiers(genre: Genre, date?: Date): {
  revenueMultiplier: number;
  qualityMultiplier: number;
  budgetMultiplier: number;
  festivalAwardsMultiplier: number;
} {
  const active = getActiveEvent(date);
  if (!active) {
    return { revenueMultiplier: 1.0, qualityMultiplier: 1.0, budgetMultiplier: 1.0, festivalAwardsMultiplier: 1.0 };
  }
  const m = active.modifiers;
  const genreAffected = m.affectedGenres.includes(genre);
  return {
    revenueMultiplier: genreAffected ? m.revenueMultiplier : 1.0,
    qualityMultiplier: genreAffected ? m.qualityMultiplier : 1.0,
    budgetMultiplier: m.budgetMultiplier, // budget discount applies to all genres during event
    festivalAwardsMultiplier: m.festivalAwardsMultiplier ?? 1.0,
  };
}

/**
 * Apply event CSS theme overrides to document root.
 */
export function applyEventTheme(date?: Date): void {
  const event = getActiveEvent(date);
  const root = document.documentElement;

  // Clear previous event vars
  root.style.removeProperty('--event-accent');
  root.style.removeProperty('--event-bg');
  root.style.removeProperty('--event-glow');
  root.style.removeProperty('--event-card-border');
  root.style.removeProperty('--event-border-style');
  root.style.removeProperty('--event-snow');
  root.style.removeProperty('--event-spooky');
  root.classList.remove('event-snow', 'event-spooky', 'event-awards-gold');

  if (!event) return;

  for (const [key, value] of Object.entries(event.themeOverrides)) {
    if (value) root.style.setProperty(key, value);
  }

  // Add body classes for CSS-driven effects
  if (event.themeOverrides['--event-snow'] === '1') root.classList.add('event-snow');
  if (event.themeOverrides['--event-spooky'] === '1') root.classList.add('event-spooky');
  if (event.id === 'awards_season') root.classList.add('event-awards-gold');
}

/**
 * Get special cards added by the active event.
 */
export function getEventSpecialCards(date?: Date): SeasonalEventCard[] {
  const event = getActiveEvent(date);
  return event?.specialCards ?? [];
}

/**
 * Get time remaining until event ends, or time until next event.
 */
export function getEventCountdown(date?: Date): {
  active: boolean;
  eventName: string;
  daysRemaining: number;
  endDate: Date;
} | null {
  const d = date ?? new Date();
  const active = getActiveEvent(d);

  if (active) {
    const endDate = new Date(d.getFullYear(), active.dateRange.endMonth - 1, active.dateRange.endDay, 23, 59, 59);
    const diff = endDate.getTime() - d.getTime();
    return {
      active: true,
      eventName: active.name,
      daysRemaining: Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))),
      endDate,
    };
  }

  // Find next upcoming event
  let closest: { event: SeasonalEvent; startDate: Date; diff: number } | null = null;
  for (const event of SEASONAL_EVENTS) {
    // Try this year
    let startDate = new Date(d.getFullYear(), event.dateRange.startMonth - 1, event.dateRange.startDay);
    let diff = startDate.getTime() - d.getTime();
    if (diff < 0) {
      // Try next year
      startDate = new Date(d.getFullYear() + 1, event.dateRange.startMonth - 1, event.dateRange.startDay);
      diff = startDate.getTime() - d.getTime();
    }
    if (!closest || diff < closest.diff) {
      closest = { event, startDate, diff };
    }
  }

  if (closest) {
    return {
      active: false,
      eventName: closest.event.name,
      daysRemaining: Math.ceil(closest.diff / (1000 * 60 * 60 * 24)),
      endDate: closest.startDate,
    };
  }

  return null;
}

/* ─── Backward compat wrappers ─── */

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
