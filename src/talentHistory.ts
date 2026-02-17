// Talent History — loyalty & retirement tracking
// Stored in localStorage separate from game saves
// Uses careerAnalytics talentHireCounts as the source of truth

import { getCareerAnalytics } from './careerAnalytics';

const RETIRED_KEY = 'greenlight_talent_retired';

export const LOYALTY_THRESHOLD = 3;
export const RETIREMENT_THRESHOLD = 8;
export const MAX_RETIREMENT_REP_BONUS = 3;

// ─── LOYALTY ───

export function isLoyalTalent(name: string): boolean {
  const data = getCareerAnalytics();
  return (data.talentHireCounts[name] || 0) >= LOYALTY_THRESHOLD;
}

export function getTalentHireCount(name: string): number {
  const data = getCareerAnalytics();
  return data.talentHireCounts[name] || 0;
}

// ─── RETIREMENT ───

function loadRetired(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RETIRED_KEY) || '[]');
  } catch { return []; }
}

function saveRetired(names: string[]) {
  try { localStorage.setItem(RETIRED_KEY, JSON.stringify(names)); } catch {}
}

export function getRetiredTalent(): string[] {
  return loadRetired();
}

export function isTalentRetired(name: string): boolean {
  return loadRetired().includes(name);
}

/** Check if talent should retire after being hired. Returns true if newly retired. */
export function checkRetirement(name: string): boolean {
  const data = getCareerAnalytics();
  const count = data.talentHireCounts[name] || 0;
  if (count < RETIREMENT_THRESHOLD) return false;
  const retired = loadRetired();
  if (retired.includes(name)) return false;
  retired.push(name);
  saveRetired(retired);
  return true;
}

/** Permanent rep bonus from retired talent (max 3) */
export function getRetirementRepBonus(): number {
  return Math.min(loadRetired().length, MAX_RETIREMENT_REP_BONUS);
}

// ─── AGENT FEES ───

export function getAgentFee(skill: number): number {
  return skill >= 5 ? 1 : 0;
}

/** Get loyalty discount for a talent */
export function getLoyaltyDiscount(name: string): number {
  return isLoyalTalent(name) ? 1 : 0;
}

/** Get loyalty quality bonus for a talent */
export function getLoyaltyQualityBonus(name: string): number {
  return isLoyalTalent(name) ? 2 : 0;
}
