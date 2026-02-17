/**
 * R256: Challenge Editor — data model for user-created challenges
 * Encode/decode as shareable URL hash strings (base64 JSON)
 */

import type { Genre } from './types';
import type { GameModifiers } from './types';

// ─── Data Model ───

export interface CustomChallenge {
  /** Schema version for forward compat */
  v: 1;
  /** Challenge name */
  name: string;
  /** Short description */
  desc: string;
  /** Genre lock (null = any genre allowed) */
  genre: Genre | null;
  /** Budget override in $M (null = default) */
  budget: number | null;
  /** All 9 difficulty modifiers from R248 GameModifiers */
  modifiers: GameModifiers;
  /** Starting card names selected from catalog */
  startingCards: string[];
  /** Bonus objectives — id from pool or custom text */
  objectives: ChallengeObjective[];
  /** Win condition */
  winCondition: WinCondition;
  /** Turn/season limit (null = default 5) */
  turnLimit: number | null;
  /** Author name (optional) */
  author?: string;
  /** Creation timestamp */
  created?: number;
}

export interface ChallengeObjective {
  type: 'pool' | 'custom';
  /** For pool: objective id from BONUS_OBJECTIVES; for custom: display text */
  value: string;
}

export type WinCondition =
  | { type: 'survive' }               // default: survive all seasons
  | { type: 'earnings'; target: number } // earn $X total
  | { type: 'reputation'; target: number } // reach X reputation
  | { type: 'blockbusters'; target: number } // get X blockbusters
  | { type: 'quality'; target: number }; // avg quality >= X

export const WIN_CONDITION_OPTIONS: { type: WinCondition['type']; label: string; emoji: string; hasTarget: boolean; defaultTarget: number }[] = [
  { type: 'survive', label: 'Survive All Seasons', emoji: '🏁', hasTarget: false, defaultTarget: 0 },
  { type: 'earnings', label: 'Earn Total $M', emoji: '💰', hasTarget: true, defaultTarget: 100 },
  { type: 'reputation', label: 'Reach Reputation', emoji: '⭐', hasTarget: true, defaultTarget: 5 },
  { type: 'blockbusters', label: 'Get X Blockbusters', emoji: '💥', hasTarget: true, defaultTarget: 3 },
  { type: 'quality', label: 'Avg Quality ≥', emoji: '🎯', hasTarget: true, defaultTarget: 35 },
];

// ─── Bonus Objective Pool (reuse from dailyChallenge) ───

export const OBJECTIVE_POOL: { id: string; description: string; emoji: string }[] = [
  { id: 'comedy_100m', description: 'Earn $100M+ total with only Comedies', emoji: '😂' },
  { id: 'max_2_leads', description: 'Never hire more than 2 leads in any film', emoji: '🎭' },
  { id: 'no_strikes', description: 'Complete the run with zero strikes', emoji: '🛡️' },
  { id: 'horror_master', description: 'Make 3+ Horror films that are all SMASH or better', emoji: '👻' },
  { id: 'quality_40', description: 'Average quality ≥ 40 across all films', emoji: '⭐' },
  { id: 'blockbuster_streak', description: 'Get 3 BLOCKBUSTERs in a row', emoji: '💥' },
  { id: 'genre_variety', description: 'Use 5+ different genres across the run', emoji: '🎨' },
  { id: 'budget_run', description: 'Win with total earnings under $60M', emoji: '💰' },
  { id: 'drama_only', description: 'Make only Drama films and win', emoji: '🎭' },
  { id: 'scifi_200m', description: 'Earn $200M+ total with Sci-Fi films only', emoji: '🚀' },
  { id: 'perfect_run', description: 'Win with all BLOCKBUSTERs', emoji: '👑' },
  { id: 'thriller_no_incidents', description: 'Make a Thriller with zero incidents', emoji: '🔪' },
];

// ─── Starting Card Pool ───

export const STARTING_CARD_POOL = [
  'Script Polish', 'Method Acting', 'Lucky Break', 'Reshoot Scene',
  'Chemistry Read', 'Stunt Double', 'VFX Enhancement', 'Focus Group',
  'Marketing Push', 'Award Bait', 'Indie Cred', 'Star Power',
  'Location Scout', 'Costume Design', 'Sound Design', 'Film Score',
  'Practical Effects', 'CGI Spectacle', 'Dialogue Polish', 'Action Choreography',
];

// ─── Default Challenge ───

export function createDefaultChallenge(): CustomChallenge {
  return {
    v: 1,
    name: '',
    desc: '',
    genre: null,
    budget: null,
    modifiers: {
      budgetAdjustment: 0,
      rivalAggressiveness: 1.0,
      incidentFrequency: 1.0,
      marketVolatility: 1.0,
      cardDrawAdjustment: 0,
      genreRestriction: null,
      noLegendary: false,
      speedMode: false,
      ironMan: false,
    },
    startingCards: [],
    objectives: [],
    winCondition: { type: 'survive' },
    turnLimit: null,
  };
}

// ─── Encode / Decode ───

const CHALLENGE_PREFIX = 'glc_'; // greenlight challenge

/** Encode a challenge to a shareable string */
export function encodeChallenge(challenge: CustomChallenge): string {
  // Strip undefined fields for compact encoding
  const compact = { ...challenge };
  if (!compact.author) delete compact.author;
  if (!compact.created) delete compact.created;
  const json = JSON.stringify(compact);
  // Use base64url encoding (no padding, URL-safe)
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return CHALLENGE_PREFIX + b64;
}

/** Decode a challenge string back to data */
export function decodeChallenge(code: string): CustomChallenge | null {
  try {
    let b64 = code;
    if (b64.startsWith(CHALLENGE_PREFIX)) {
      b64 = b64.slice(CHALLENGE_PREFIX.length);
    }
    // Restore base64 padding
    b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const json = decodeURIComponent(escape(atob(b64)));
    const parsed = JSON.parse(json);
    if (parsed.v !== 1) return null;
    return parsed as CustomChallenge;
  } catch {
    return null;
  }
}

/** Build a full shareable URL with the challenge in the hash */
export function buildShareableUrl(challenge: CustomChallenge): string {
  const code = encodeChallenge(challenge);
  return `${window.location.origin}${window.location.pathname}#challenge=${code}`;
}

/** Check URL hash for a challenge code */
export function getChallengeFromUrl(): CustomChallenge | null {
  const hash = window.location.hash;
  if (!hash) return null;
  const match = hash.match(/challenge=(glc_[A-Za-z0-9_-]+)/);
  if (!match) return null;
  return decodeChallenge(match[1]);
}

/** Clear challenge from URL hash without reload */
export function clearChallengeFromUrl(): void {
  if (window.location.hash.includes('challenge=')) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

// ─── Validation ───

export function validateChallenge(c: CustomChallenge): string[] {
  const errors: string[] = [];
  if (!c.name.trim()) errors.push('Name is required');
  if (c.name.length > 50) errors.push('Name must be 50 chars or less');
  if (c.desc.length > 200) errors.push('Description must be 200 chars or less');
  if (c.budget !== null && (c.budget < 1 || c.budget > 100)) errors.push('Budget must be 1-100 $M');
  if (c.turnLimit !== null && (c.turnLimit < 1 || c.turnLimit > 12)) errors.push('Turn limit must be 1-12');
  if (c.startingCards.length > 5) errors.push('Max 5 starting cards');
  if (c.objectives.length > 3) errors.push('Max 3 objectives');
  return errors;
}
