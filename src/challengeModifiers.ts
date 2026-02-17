// Challenge Modifiers — optional toggleable modifiers for any run
// Each adds a score multiplier. Multiple can stack.

const CM_KEY = 'greenlight_active_modifiers';

export interface ChallengeModifier {
  id: string;
  name: string;
  emoji: string;
  description: string;
  shortDesc: string;
  scoreMultiplier: number; // e.g. 1.2 = 20% bonus
  effect: string; // key used by game logic
}

export const CHALLENGE_MODIFIERS: ChallengeModifier[] = [
  {
    id: 'shoestring_mod',
    name: 'Shoestring',
    emoji: '💸',
    description: 'Start with 50% budget. Every dollar is precious.',
    shortDesc: 'Start with 50% budget',
    scoreMultiplier: 1.3,
    effect: 'shoestring',
  },
  {
    id: 'critics_darling_mod',
    name: "Critics' Darling",
    emoji: '📝',
    description: 'Quality thresholds for box office tiers raised by 20%. Only greatness succeeds.',
    shortDesc: 'Tier thresholds +20%',
    scoreMultiplier: 1.3,
    effect: 'criticsDarling',
  },
  {
    id: 'speed_run_mod',
    name: 'Speed Run',
    emoji: '⚡',
    description: 'Only 3 seasons instead of 5. No time to waste.',
    shortDesc: '3 seasons only',
    scoreMultiplier: 1.5,
    effect: 'speedRun',
  },
  {
    id: 'no_safety_net_mod',
    name: 'No Safety Net',
    emoji: '🚫',
    description: 'No shop access between seasons. What you start with is what you get.',
    shortDesc: 'No shop access',
    scoreMultiplier: 1.4,
    effect: 'noSafetyNet',
  },
];

/** Get the combined score multiplier from a set of active modifier IDs */
export function getCombinedModifierMultiplier(modifierIds: string[]): number {
  let mult = 1.0;
  for (const id of modifierIds) {
    const mod = CHALLENGE_MODIFIERS.find(m => m.id === id);
    if (mod) mult *= mod.scoreMultiplier;
  }
  return Math.round(mult * 100) / 100;
}

/** Get modifier by ID */
export function getModifier(id: string): ChallengeModifier | undefined {
  return CHALLENGE_MODIFIERS.find(m => m.id === id);
}

/** Save active modifiers to localStorage for persistence across start screen */
export function saveActiveModifiers(ids: string[]) {
  try { localStorage.setItem(CM_KEY, JSON.stringify(ids)); } catch {}
}

/** Load saved active modifiers */
export function loadActiveModifiers(): string[] {
  try {
    const saved = localStorage.getItem(CM_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

// Weekly challenge: harder preset modifiers
export const WEEKLY_MODIFIERS: string[] = ['shoestring_mod', 'critics_darling_mod'];
