/**
 * ══════════════════════════════════════════════════════════════════════
 * R278 — Seasonal Events & Limited-Time Content
 * ══════════════════════════════════════════════════════════════════════
 *
 * Time-based event system that activates real-world seasonal events,
 * adding exclusive cards, modifiers, and rewards during each window.
 */

import type { CardTemplate, Genre } from './types';

// ─── TYPES ───

export interface EventObjective {
  id: string;
  description: string;
  target: number; // e.g. produce 3 horror films
  progressKey: string; // key used to track progress in localStorage
}

export interface EventReward {
  id: string;
  name: string;
  type: 'cardBack' | 'nameplate' | 'theme';
  description: string;
  emoji: string;
  objectiveId: string; // which objective unlocks this
}

export interface EventModifier {
  id: string;
  description: string;
  /** Applied as a multiplier to box office (1.3 = +30%) */
  boxOfficeMultiplier?: number;
  /** Flat quality bonus added during production */
  qualityBonus?: number;
  /** Genre this modifier targets, or null for all genres */
  targetGenre?: Genre | null;
  /** Multiplier applied to award/nomination value */
  awardMultiplier?: number;
  /** Multiplier applied to critic scores */
  criticScoreMultiplier?: number;
}

export interface SeasonalEvent {
  id: string;
  name: string;
  emoji: string;
  description: string;
  startDate: { month: number; day: number };
  endDate: { month: number; day: number };
  themeColor: string;
  themeColors: { primary: string; secondary: string; accent: string };
  specialCards: CardTemplate[];
  modifiers: EventModifier[];
  exclusiveRewards: EventReward[];
  objectives: EventObjective[];
}

// ─── EVENT DEFINITIONS ───

const noSynergy = null;

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  // 🏆 Awards Season
  {
    id: 'awards_season',
    name: 'Awards Season',
    emoji: '🏆',
    description: 'The Academy is watching! Awards are worth double and quality bonuses abound.',
    startDate: { month: 2, day: 15 },
    endDate: { month: 3, day: 15 },
    themeColor: "#FFD700",
    themeColors: { primary: '#FFD700', secondary: '#B8860B', accent: '#FFF8DC' },
    specialCards: [
      {
        name: 'Oscar Buzz',
        cardType: 'action',
        baseQuality: 3,
        synergyText: 'Awards season hype! +3 quality, +2 if total quality > 30.',
        synergyCondition: (ctx) => ({
          bonus: ctx.totalQuality > 30 ? 2 : 0,
          description: ctx.totalQuality > 30 ? 'Oscar frontrunner!' : undefined,
        }),
        riskTag: '🟢',
        tags: ['heart'],
      },
      {
        name: 'Campaign Trail',
        cardType: 'action',
        baseQuality: 2,
        synergyText: 'For Your Consideration — +2 quality, awards doubled.',
        synergyCondition: noSynergy,
        riskTag: '🟢',
        tags: ['precision'],
      },
    ],
    modifiers: [
      {
        id: 'awards_2x',
        description: 'Awards & nominations are worth 2×',
        awardMultiplier: 2.0,
      },
      {
        id: 'awards_quality',
        description: 'Quality bonus +3 for Drama & Romance films',
        qualityBonus: 3,
        targetGenre: 'Drama',
      },
    ],
    objectives: [
      { id: 'awards_nom', description: 'Earn a nomination during Awards Season', target: 1, progressKey: 'evt_awards_nom' },
      { id: 'awards_quality', description: 'Produce a film with quality 60+', target: 1, progressKey: 'evt_awards_quality' },
      { id: 'awards_dramas', description: 'Produce 2 Drama films', target: 2, progressKey: 'evt_awards_dramas' },
    ],
    exclusiveRewards: [
      { id: 'cb_gold_statue', name: 'Gold Statue Card Back', type: 'cardBack', description: 'A gilded card back for award winners', emoji: '🏆', objectiveId: 'awards_nom' },
      { id: 'np_academy', name: 'Academy Nameplate', type: 'nameplate', description: '"Academy Award Winner"', emoji: '⭐', objectiveId: 'awards_quality' },
      { id: 'th_awards', name: 'Awards Night Theme', type: 'theme', description: 'Red carpet and gold accents', emoji: '🌟', objectiveId: 'awards_dramas' },
    ],
  },

  // ☀️ Summer Blockbuster
  {
    id: 'summer_blockbuster',
    name: 'Summer Blockbuster',
    emoji: '☀️',
    description: 'Summer\'s here and audiences want spectacle! Box office +30% for Action & Sci-Fi.',
    startDate: { month: 6, day: 1 },
    endDate: { month: 8, day: 31 },
    themeColor: '#FF6B35',
    themeColors: { primary: '#FF6B35', secondary: '#FF8C42', accent: '#FFF3E0' },
    specialCards: [
      {
        name: 'Explosive Finale',
        cardType: 'action',
        baseQuality: 2,
        synergyText: 'Big summer energy! +2 quality, ×1.1 if 3+ action cards played.',
        synergyCondition: (ctx) => ({
          bonus: 0,
          multiply: ctx.actionCardsPlayed >= 3 ? 1.1 : undefined,
          description: ctx.actionCardsPlayed >= 3 ? 'Summer spectacular!' : undefined,
        }),
        riskTag: '🟢',
        tags: ['spectacle'],
      },
      {
        name: 'Opening Weekend Hype',
        cardType: 'action',
        baseQuality: 1,
        synergyText: 'Massive marketing push — +1 quality, +$2M budget.',
        synergyCondition: () => ({ bonus: 0, budgetMod: 2 }),
        riskTag: '🟢',
        tags: ['momentum'],
      },
    ],
    modifiers: [
      {
        id: 'summer_bo',
        description: 'Box office +30% for Action & Adventure films',
        boxOfficeMultiplier: 1.3,
        targetGenre: 'Action',
      },
      {
        id: 'summer_scifi',
        description: 'Box office +30% for Sci-Fi films',
        boxOfficeMultiplier: 1.3,
        targetGenre: 'Sci-Fi',
      },
    ],
    objectives: [
      { id: 'summer_blockbuster', description: 'Earn BLOCKBUSTER tier', target: 1, progressKey: 'evt_summer_blockbuster' },
      { id: 'summer_action', description: 'Produce 3 Action or Sci-Fi films', target: 3, progressKey: 'evt_summer_action' },
      { id: 'summer_earnings', description: 'Earn $100M+ total box office', target: 1, progressKey: 'evt_summer_earnings' },
    ],
    exclusiveRewards: [
      { id: 'cb_explosion', name: 'Explosion Card Back', type: 'cardBack', description: 'Fiery action card back', emoji: '💥', objectiveId: 'summer_blockbuster' },
      { id: 'np_summer', name: 'Summer King Nameplate', type: 'nameplate', description: '"Ruler of the Summer Box Office"', emoji: '👑', objectiveId: 'summer_action' },
      { id: 'th_summer', name: 'Sunset Boulevard Theme', type: 'theme', description: 'Warm orange sunset vibes', emoji: '🌅', objectiveId: 'summer_earnings' },
    ],
  },

  // 🎃 Horror Fest
  {
    id: 'horror_fest',
    name: 'Horror Fest',
    emoji: '🎃',
    description: 'Spooky season! Horror films get +50% box office and terrifying new events.',
    startDate: { month: 10, day: 1 },
    endDate: { month: 10, day: 31 },
    themeColor: '#6B0F6B',
    themeColors: { primary: '#6B0F6B', secondary: '#9B59B6', accent: '#F5E6FF' },
    specialCards: [
      {
        name: 'Jump Scare',
        cardType: 'action',
        baseQuality: 1,
        synergyText: 'BOO! +1 quality, +3 if this is the 4th+ card played.',
        synergyCondition: (ctx) => ({
          bonus: ctx.drawNumber >= 4 ? 3 : 0,
          description: ctx.drawNumber >= 4 ? 'Perfect scare timing!' : undefined,
        }),
        riskTag: '🟢',
        tags: ['chaos'],
      },
      {
        name: 'Final Girl',
        cardType: 'action',
        baseQuality: 2,
        synergyText: 'Survivor energy — +2 quality, +2 if exactly 2 incidents played.',
        synergyCondition: (ctx) => ({
          bonus: ctx.incidentCount === 2 ? 2 : 0,
          description: ctx.incidentCount === 2 ? 'She survives!' : undefined,
        }),
        riskTag: '🟢',
        tags: ['heart'],
      },
    ],
    modifiers: [
      {
        id: 'horror_bo',
        description: 'Horror films get +50% box office',
        boxOfficeMultiplier: 1.5,
        targetGenre: 'Horror',
      },
      {
        id: 'horror_thriller',
        description: 'Thriller films get +20% box office',
        boxOfficeMultiplier: 1.2,
        targetGenre: 'Thriller',
      },
    ],
    objectives: [
      { id: 'horror_films', description: 'Produce 3 Horror films during Horror Fest', target: 3, progressKey: 'evt_horror_films' },
      { id: 'horror_survive', description: 'Survive a Disaster production', target: 1, progressKey: 'evt_horror_survive' },
      { id: 'horror_smash', description: 'Get SMASH or BLOCKBUSTER on a Horror film', target: 1, progressKey: 'evt_horror_smash' },
    ],
    exclusiveRewards: [
      { id: 'cb_spooky', name: 'Haunted Card Back', type: 'cardBack', description: 'Ghostly card back with fog', emoji: '👻', objectiveId: 'horror_films' },
      { id: 'np_scream', name: 'Scream Queen Nameplate', type: 'nameplate', description: '"Master of Horror"', emoji: '🎃', objectiveId: 'horror_survive' },
      { id: 'th_horror', name: 'Midnight Premiere Theme', type: 'theme', description: 'Dark purple with eerie glow', emoji: '🌙', objectiveId: 'horror_smash' },
    ],
  },

  // 🎄 Holiday Season
  {
    id: 'holiday_season',
    name: 'Holiday Season',
    emoji: '🎄',
    description: 'Spread holiday cheer! Family & Comedy films get bonuses and feel-good vibes.',
    startDate: { month: 12, day: 1 },
    endDate: { month: 12, day: 25 },
    themeColor: '#C41E3A',
    themeColors: { primary: '#C41E3A', secondary: '#228B22', accent: '#FFF5F5' },
    specialCards: [
      {
        name: 'Holiday Spirit',
        cardType: 'action',
        baseQuality: 2,
        synergyText: 'Feel-good vibes! +2 quality, +2 if no incidents so far.',
        synergyCondition: (ctx) => ({
          bonus: ctx.incidentCount === 0 ? 2 : 0,
          description: ctx.incidentCount === 0 ? 'Pure holiday magic!' : undefined,
        }),
        riskTag: '🟢',
        tags: ['heart'],
      },
      {
        name: 'Box Office Miracle',
        cardType: 'action',
        baseQuality: 3,
        synergyText: 'A Christmas miracle — +3 quality flat.',
        synergyCondition: noSynergy,
        riskTag: '🟢',
        tags: ['momentum'],
      },
    ],
    modifiers: [
      {
        id: 'holiday_comedy',
        description: 'Comedy films get +25% box office',
        boxOfficeMultiplier: 1.25,
        targetGenre: 'Comedy',
      },
      {
        id: 'holiday_quality',
        description: 'All films get +2 quality (feel-good modifier)',
        qualityBonus: 2,
        targetGenre: null,
      },
    ],
    objectives: [
      { id: 'holiday_comedies', description: 'Produce 2 Comedy films', target: 2, progressKey: 'evt_holiday_comedies' },
      { id: 'holiday_clean', description: 'Clean wrap 3 films (0 incidents)', target: 3, progressKey: 'evt_holiday_clean' },
      { id: 'holiday_cheer', description: 'End a run with $50M+ budget', target: 1, progressKey: 'evt_holiday_cheer' },
    ],
    exclusiveRewards: [
      { id: 'cb_holiday', name: 'Gift Wrapped Card Back', type: 'cardBack', description: 'Festive red and green wrapping', emoji: '🎁', objectiveId: 'holiday_comedies' },
      { id: 'np_holiday', name: 'Holiday Hero Nameplate', type: 'nameplate', description: '"Spreading Holiday Cheer"', emoji: '🎅', objectiveId: 'holiday_clean' },
      { id: 'th_holiday', name: 'Winter Wonderland Theme', type: 'theme', description: 'Snowflakes and warm lights', emoji: '❄️', objectiveId: 'holiday_cheer' },
    ],
  },

  // 🎬 Film Festival
  {
    id: 'film_festival',
    name: 'Film Festival',
    emoji: '🎬',
    description: 'The festival circuit is in full swing! Indie & Drama quality bonuses, critics love you.',
    startDate: { month: 5, day: 1 },
    endDate: { month: 5, day: 31 },
    themeColor: '#2C3E50',
    themeColors: { primary: '#2C3E50', secondary: '#E74C3C', accent: '#ECF0F1' },
    specialCards: [
      {
        name: 'Palme d\'Or Contender',
        cardType: 'action',
        baseQuality: 3,
        synergyText: 'Art house prestige — +3 quality, +2 if lead skill ≥ 5.',
        synergyCondition: (ctx) => ({
          bonus: ctx.leadSkill >= 5 ? 2 : 0,
          description: ctx.leadSkill >= 5 ? 'Festival darling!' : undefined,
        }),
        riskTag: '🟢',
        tags: ['precision'],
      },
      {
        name: 'Standing Ovation',
        cardType: 'action',
        baseQuality: 2,
        synergyText: 'The crowd erupts! +2 quality, +1 per 10 total quality.',
        synergyCondition: (ctx) => ({
          bonus: Math.floor(ctx.totalQuality / 10),
          description: `${Math.floor(ctx.totalQuality / 10)} bonus from audience reaction`,
        }),
        riskTag: '🟢',
        tags: ['heart'],
      },
    ],
    modifiers: [
      {
        id: 'festival_critics',
        description: 'Critic scores +20% for all films',
        criticScoreMultiplier: 1.2,
      },
      {
        id: 'festival_drama',
        description: 'Drama films get +4 quality bonus',
        qualityBonus: 4,
        targetGenre: 'Drama',
      },
    ],
    objectives: [
      { id: 'festival_dramas', description: 'Produce 3 Drama or Romance films', target: 3, progressKey: 'evt_festival_dramas' },
      { id: 'festival_quality', description: 'Produce a film with quality 70+', target: 1, progressKey: 'evt_festival_quality' },
      { id: 'festival_critics', description: 'Get 90%+ critic score', target: 1, progressKey: 'evt_festival_critics' },
    ],
    exclusiveRewards: [
      { id: 'cb_laurel', name: 'Festival Laurels Card Back', type: 'cardBack', description: 'Official selection laurel wreath', emoji: '🎬', objectiveId: 'festival_dramas' },
      { id: 'np_auteur', name: 'Auteur Nameplate', type: 'nameplate', description: '"Celebrated Auteur"', emoji: '🎭', objectiveId: 'festival_quality' },
      { id: 'th_arthouse', name: 'Art House Theme', type: 'theme', description: 'Minimalist black and red', emoji: '🖤', objectiveId: 'festival_critics' },
    ],
  },

  // 🌟 Anniversary Event
  {
    id: 'anniversary',
    name: 'Anniversary Event',
    emoji: '🌟',
    description: 'Happy Birthday Greenlight! All genres get +10% box office and a special commemorative card.',
    startDate: { month: 7, day: 17 },
    endDate: { month: 7, day: 24 },
    themeColor: '#9B59B6',
    themeColors: { primary: '#9B59B6', secondary: '#3498DB', accent: '#F8F0FF' },
    specialCards: [
      {
        name: 'Commemorative Take',
        cardType: 'action',
        baseQuality: 4,
        synergyText: 'A once-a-year celebration! +4 quality, ×1.05 always.',
        synergyCondition: () => ({
          bonus: 0,
          multiply: 1.05,
          description: 'Anniversary bonus!',
        }),
        riskTag: '🟢',
        tags: ['heart'],
      },
    ],
    modifiers: [
      {
        id: 'anniversary_all',
        description: 'All genres get +10% box office',
        boxOfficeMultiplier: 1.1,
        targetGenre: null,
      },
    ],
    objectives: [
      { id: 'anniversary_play', description: 'Complete a run during the Anniversary Event', target: 1, progressKey: 'evt_anniversary_play' },
      { id: 'anniversary_blockbuster', description: 'Earn BLOCKBUSTER tier', target: 1, progressKey: 'evt_anniversary_blockbuster' },
    ],
    exclusiveRewards: [
      { id: 'cb_anniversary', name: 'Anniversary Card Back', type: 'cardBack', description: 'Special commemorative edition', emoji: '🎂', objectiveId: 'anniversary_play' },
      { id: 'np_anniversary', name: 'Founding Member Nameplate', type: 'nameplate', description: '"Day One Player"', emoji: '🌟', objectiveId: 'anniversary_blockbuster' },
    ],
  },
];

// ─── HELPERS ───

/**
 * Get the currently active seasonal event based on the real-world date.
 * Returns null if no event is active.
 */
export function getActiveEvent(now: Date = new Date()): SeasonalEvent | null {
  const month = now.getMonth() + 1; // 1-indexed
  const day = now.getDate();

  for (const event of SEASONAL_EVENTS) {
    const { startDate, endDate } = event;

    // Handle events that don't cross year boundary
    if (startDate.month <= endDate.month) {
      if (
        (month > startDate.month || (month === startDate.month && day >= startDate.day)) &&
        (month < endDate.month || (month === endDate.month && day <= endDate.day))
      ) {
        return event;
      }
    } else {
      // Handle year-crossing events (none currently, but future-proof)
      if (
        (month > startDate.month || (month === startDate.month && day >= startDate.day)) ||
        (month < endDate.month || (month === endDate.month && day <= endDate.day))
      ) {
        return event;
      }
    }
  }
  return null;
}

/**
 * Get event-exclusive cards for the currently active event.
 * These should be added to the card pool during deck building.
 */
export function getEventCards(event: SeasonalEvent | null): CardTemplate[] {
  if (!event) return [];
  return event.specialCards;
}

/**
 * Apply event modifiers to box office calculation.
 * Returns a combined multiplier (1.0 = no change).
 */
export function getEventBoxOfficeMultiplier(event: SeasonalEvent | null, genre: Genre): number {
  if (!event) return 1.0;
  let mult = 1.0;
  for (const mod of event.modifiers) {
    if (mod.boxOfficeMultiplier && (mod.targetGenre === null || mod.targetGenre === genre)) {
      mult *= mod.boxOfficeMultiplier;
    }
  }
  return mult;
}

/**
 * Get event quality bonus for the current genre.
 */
export function getEventQualityBonus(event: SeasonalEvent | null, genre: Genre): number {
  if (!event) return 0;
  let bonus = 0;
  for (const mod of event.modifiers) {
    if (mod.qualityBonus && (mod.targetGenre === null || mod.targetGenre === genre)) {
      bonus += mod.qualityBonus;
    }
  }
  return bonus;
}

/**
 * Get event award multiplier.
 */
export function getEventAwardMultiplier(event: SeasonalEvent | null): number {
  if (!event) return 1.0;
  let mult = 1.0;
  for (const mod of event.modifiers) {
    if (mod.awardMultiplier) {
      mult *= mod.awardMultiplier;
    }
  }
  return mult;
}

/**
 * Get event critic score multiplier.
 */
export function getEventCriticMultiplier(event: SeasonalEvent | null): number {
  if (!event) return 1.0;
  let mult = 1.0;
  for (const mod of event.modifiers) {
    if (mod.criticScoreMultiplier) {
      mult *= mod.criticScoreMultiplier;
    }
  }
  return mult;
}

// ─── EVENT PROGRESS TRACKING (localStorage) ───

const STORAGE_KEY = 'greenlight_event_progress';
const REWARD_KEY = 'greenlight_event_rewards';
const HISTORY_KEY = 'greenlight_event_history';

export interface EventProgress {
  eventId: string;
  objectives: Record<string, number>; // objectiveId -> current progress
}

export interface EventHistoryEntry {
  eventId: string;
  eventName: string;
  emoji: string;
  year: number;
  objectivesCompleted: string[];
  rewardsEarned: string[];
}

export function getEventProgress(eventId: string): EventProgress {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return data[eventId] || { eventId, objectives: {} };
  } catch {
    return { eventId, objectives: {} };
  }
}

export function updateEventProgress(eventId: string, objectiveId: string, amount: number = 1): void {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!data[eventId]) {
      data[eventId] = { eventId, objectives: {} };
    }
    data[eventId].objectives[objectiveId] = (data[eventId].objectives[objectiveId] || 0) + amount;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // silently fail
  }
}

export function getUnlockedRewards(): string[] {
  try {
    return JSON.parse(localStorage.getItem(REWARD_KEY) || '[]');
  } catch {
    return [];
  }
}

export function unlockReward(rewardId: string): void {
  try {
    const rewards = getUnlockedRewards();
    if (!rewards.includes(rewardId)) {
      rewards.push(rewardId);
      localStorage.setItem(REWARD_KEY, JSON.stringify(rewards));
    }
  } catch {
    // silently fail
  }
}

export function getEventHistory(): EventHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addEventHistory(entry: EventHistoryEntry): void {
  try {
    const history = getEventHistory();
    history.push(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // silently fail
  }
}

/**
 * Check and unlock rewards based on current progress.
 * Call at end of each run during an active event.
 */
export function checkAndUnlockRewards(event: SeasonalEvent): string[] {
  const progress = getEventProgress(event.id);
  const newlyUnlocked: string[] = [];
  const alreadyUnlocked = getUnlockedRewards();

  for (const objective of event.objectives) {
    const current = progress.objectives[objective.id] || 0;
    if (current >= objective.target) {
      // Find associated reward
      const reward = event.exclusiveRewards.find(r => r.objectiveId === objective.id);
      if (reward && !alreadyUnlocked.includes(reward.id)) {
        unlockReward(reward.id);
        newlyUnlocked.push(reward.id);
      }
    }
  }

  return newlyUnlocked;
}

// ─── EVENT COUNTDOWN (used by EventBanner) ───

export interface EventCountdown {
  eventName: string;
  emoji: string;
  daysRemaining: number;
  active: boolean;
}

/**
 * Get countdown info for the active or next upcoming event.
 */
export function getEventCountdown(now: Date = new Date()): EventCountdown | null {
  const active = getActiveEvent(now);
  if (active) {
    const remaining = getEventTimeRemaining(active, now);
    return {
      eventName: active.name,
      emoji: active.emoji,
      daysRemaining: remaining.days,
      active: true,
    };
  }

  // Find next upcoming event
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const today = month * 100 + day;

  let bestEvent: SeasonalEvent | null = null;
  let bestDays = Infinity;

  for (const event of SEASONAL_EVENTS) {
    const startVal = event.startDate.month * 100 + event.startDate.day;
    let daysAway: number;
    if (startVal > today) {
      // Later this year
      const start = new Date(now.getFullYear(), event.startDate.month - 1, event.startDate.day);
      daysAway = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    } else {
      // Next year
      const start = new Date(now.getFullYear() + 1, event.startDate.month - 1, event.startDate.day);
      daysAway = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
    if (daysAway < bestDays) {
      bestDays = daysAway;
      bestEvent = event;
    }
  }

  if (!bestEvent) return null;
  return {
    eventName: bestEvent.name,
    emoji: bestEvent.emoji,
    daysRemaining: bestDays,
    active: false,
  };
}

// ─── COMPATIBILITY ALIASES (used by gameStore) ───

/**
 * Get seasonal box office multiplier for a genre.
 * Used by gameStore release calculation.
 */
export function getSeasonalBOMultiplier(genre: Genre): number {
  return getEventBoxOfficeMultiplier(getActiveEvent(), genre);
}

/**
 * Get seasonal quality bonus for a genre.
 * Used by gameStore quality calculation.
 */
export function getSeasonalQualityBonus(genre: Genre): number {
  return getEventQualityBonus(getActiveEvent(), genre);
}

/**
 * Apply event modifiers and return combined effects.
 * Used by gameStore for quality multiplier.
 */
export function applyEventModifiers(genre: Genre): { qualityMultiplier: number; boxOfficeMultiplier: number } {
  const event = getActiveEvent();
  if (!event) return { qualityMultiplier: 1.0, boxOfficeMultiplier: 1.0 };
  // Quality multiplier from critic score modifier (repurposed as quality mult)
  const criticMult = getEventCriticMultiplier(event);
  const boMult = getEventBoxOfficeMultiplier(event, genre);
  return { qualityMultiplier: criticMult, boxOfficeMultiplier: boMult };
}

/**
 * Get all active seasonal events (used by StatsDashboard).
 * Accepts optional arg for compat but only uses current time.
 */
export function getActiveSeasonalEvents(_unused?: unknown): SeasonalEvent[] {
  const now = new Date();
  const result: SeasonalEvent[] = [];
  for (const event of SEASONAL_EVENTS) {
    // Reuse same logic as getActiveEvent
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const { startDate, endDate } = event;
    let active = false;
    if (startDate.month <= endDate.month) {
      active = (month > startDate.month || (month === startDate.month && day >= startDate.day)) &&
               (month < endDate.month || (month === endDate.month && day <= endDate.day));
    } else {
      active = (month > startDate.month || (month === startDate.month && day >= startDate.day)) ||
               (month < endDate.month || (month === endDate.month && day <= endDate.day));
    }
    if (active) result.push(event);
  }
  return result;
}

/**
 * Apply seasonal event theme CSS overrides to the document root.
 */
export function applyEventTheme(now: Date = new Date()): void {
  const event = getActiveEvent(now);
  const root = document.documentElement;
  // Remove all event theme classes
  root.classList.forEach(cls => {
    if (cls.startsWith('event-theme-')) root.classList.remove(cls);
  });
  if (event) {
    root.classList.add(`event-theme-${event.id}`);
  }
}

/**
 * Calculate time remaining until event ends.
 */
export function getEventTimeRemaining(event: SeasonalEvent, now: Date = new Date()): { days: number; hours: number; minutes: number } {
  const year = now.getFullYear();
  let endDate = new Date(year, event.endDate.month - 1, event.endDate.day, 23, 59, 59);
  if (endDate < now) {
    endDate = new Date(year + 1, event.endDate.month - 1, event.endDate.day, 23, 59, 59);
  }
  const diff = endDate.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0 };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes };
}
