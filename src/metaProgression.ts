// ─── Meta-Progression & Prestige System (R171) ───
// Persistent cross-run progression: Studio XP → Studio Level (1-20) → Prestige (reset + badge)
// All state stored in localStorage, separate from the existing prestige.ts cosmetic system.

export interface MetaProgressionState {
  xp: number;
  level: number;
  prestigeCount: number; // 0-5, number of times player has "prestiged"
  prestigeBadges: number[]; // which prestige levels have been completed (e.g. [1,2])
}

export interface MetaLevel {
  level: number;
  xpRequired: number; // cumulative XP to reach this level
  title: string;
  emoji: string;
  unlock?: string; // description of what's unlocked
}

// XP curve: each level requires progressively more
export const META_LEVELS: MetaLevel[] = [
  { level: 1,  xpRequired: 0,     title: 'Aspiring Filmmaker', emoji: '🎓' },
  { level: 2,  xpRequired: 100,   title: 'Script Scout',       emoji: '📝', unlock: '+2 starting scripts in Greenlight' },
  { level: 3,  xpRequired: 250,   title: 'Emerging Producer',  emoji: '📹' },
  { level: 4,  xpRequired: 450,   title: 'Up-and-Comer',       emoji: '🌅' },
  { level: 5,  xpRequired: 700,   title: 'Budget Boss',        emoji: '💰', unlock: 'Start with +$1M budget permanently' },
  { level: 6,  xpRequired: 1000,  title: 'Studio Regular',     emoji: '🏢' },
  { level: 7,  xpRequired: 1400,  title: 'Industry Player',    emoji: '🎖️' },
  { level: 8,  xpRequired: 1900,  title: 'Veteran Producer',   emoji: '⚡', unlock: 'Unlock "Veteran" talent tier (Skill 6)' },
  { level: 9,  xpRequired: 2500,  title: 'Acclaimed Director', emoji: '🏆' },
  { level: 10, xpRequired: 3200,  title: 'Dual Visionary',     emoji: '🎭', unlock: 'Second archetype perk slot' },
  { level: 11, xpRequired: 4000,  title: 'Award Magnet',       emoji: '✨' },
  { level: 12, xpRequired: 5000,  title: 'Reputation Pioneer', emoji: '⭐', unlock: 'Start with +1 extra reputation' },
  { level: 13, xpRequired: 6200,  title: 'Box Office King',    emoji: '👑' },
  { level: 14, xpRequired: 7600,  title: 'Entertainment Mogul', emoji: '🌍' },
  { level: 15, xpRequired: 9200,  title: 'Epic Storyteller',   emoji: '📜', unlock: 'Unlock Epic scripts (higher base quality)' },
  { level: 16, xpRequired: 11000, title: 'Cinema Titan',       emoji: '🏛️' },
  { level: 17, xpRequired: 13000, title: 'Dream Factory',      emoji: '🏗️' },
  { level: 18, xpRequired: 15500, title: 'Cultural Icon',      emoji: '🎆' },
  { level: 19, xpRequired: 18500, title: 'Hollywood Immortal',  emoji: '💫' },
  { level: 20, xpRequired: 22000, title: 'Studio Legend',       emoji: '🌟', unlock: '"Studio Legend" title + golden studio lot overlay' },
];

// ─── Prestige bonuses (stack per prestige level) ───
export const PRESTIGE_STACK_BONUS = {
  xpMultiplier: 0.05,  // +5% XP earned per prestige level
  startingBudget: 0.5,  // +$0.5M starting budget per prestige level
};

export const MAX_PRESTIGE = 5;

const META_KEY = 'greenlight_meta_progression';

// ─── State Management ───

export function getMetaProgression(): MetaProgressionState {
  try {
    const saved = localStorage.getItem(META_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { xp: 0, level: 1, prestigeCount: 0, prestigeBadges: [] };
}

function saveMetaProgression(state: MetaProgressionState): void {
  try { localStorage.setItem(META_KEY, JSON.stringify(state)); } catch {}
}

// ─── Level Queries ───

export function getMetaLevel(xp: number): MetaLevel {
  let result = META_LEVELS[0];
  for (const lvl of META_LEVELS) {
    if (xp >= lvl.xpRequired) result = lvl;
    else break;
  }
  return result;
}

export function getNextMetaLevel(xp: number): MetaLevel | null {
  for (const lvl of META_LEVELS) {
    if (xp < lvl.xpRequired) return lvl;
  }
  return null; // max level
}

export function getMetaXPProgress(xp: number): { earned: number; needed: number; progress: number } {
  const current = getMetaLevel(xp);
  const next = getNextMetaLevel(xp);
  if (!next) return { earned: 0, needed: 0, progress: 1 };
  const base = current.xpRequired;
  const needed = next.xpRequired - base;
  const earned = xp - base;
  return { earned, needed, progress: Math.min(1, earned / needed) };
}

// ─── Unlock Checks ───

export function hasMetaUnlock(unlockLevel: number): boolean {
  const state = getMetaProgression();
  return state.level >= unlockLevel;
}

/** Level 2: +2 starting scripts */
export function getExtraStartingScripts(): number {
  return hasMetaUnlock(2) ? 2 : 0;
}

/** Level 5: +$1M budget */
export function getMetaBudgetBonus(): number {
  const state = getMetaProgression();
  let bonus = 0;
  if (state.level >= 5) bonus += 1;
  // Prestige stacking bonus
  bonus += state.prestigeCount * PRESTIGE_STACK_BONUS.startingBudget;
  return bonus;
}

/** Level 8: Veteran talent tier unlocked (skill 6) */
export function isVeteranTalentUnlocked(): boolean {
  return hasMetaUnlock(8);
}

/** Level 10: Second archetype perk slot */
export function hasSecondPerkSlot(): boolean {
  return hasMetaUnlock(10);
}

/** Level 12: +1 extra reputation at start */
export function getMetaReputationBonus(): number {
  return hasMetaUnlock(12) ? 1 : 0;
}

/** Level 15: Epic scripts unlocked */
export function isEpicScriptsUnlocked(): boolean {
  return hasMetaUnlock(15);
}

/** Level 20: Studio Legend */
export function isStudioLegend(): boolean {
  return hasMetaUnlock(20);
}

/** Get prestige count */
export function getPrestigeCount(): number {
  return getMetaProgression().prestigeCount;
}

/** Get prestige badge emoji for display */
export function getPrestigeBadgeEmoji(count: number): string {
  const badges = ['', '🥉', '🥈', '🥇', '💎', '👑'];
  return badges[Math.min(count, 5)] || '';
}

// ─── XP Award ───

export interface MetaRunXPInput {
  score: number;
  filmCount: number;
  achievementCount: number;
  isVictory: boolean;
}

export interface MetaXPResult {
  xpGained: number;
  breakdown: { label: string; xp: number }[];
  oldLevel: MetaLevel;
  newLevel: MetaLevel;
  leveledUp: boolean;
  totalXP: number;
  unlocksGained: string[]; // descriptions of new unlocks
}

export function awardMetaXP(input: MetaRunXPInput): MetaXPResult {
  const state = getMetaProgression();
  const oldLevel = getMetaLevel(state.xp);

  const breakdown: { label: string; xp: number }[] = [];

  // Score-based XP (1 XP per 5 score)
  const scoreXP = Math.floor(input.score / 5);
  if (scoreXP > 0) breakdown.push({ label: 'Score', xp: scoreXP });

  // Films made (5 XP each)
  const filmXP = input.filmCount * 5;
  if (filmXP > 0) breakdown.push({ label: 'Films', xp: filmXP });

  // Achievements (20 XP each)
  const achXP = input.achievementCount * 20;
  if (achXP > 0) breakdown.push({ label: 'Achievements', xp: achXP });

  // Victory bonus
  if (input.isVictory) breakdown.push({ label: 'Victory', xp: 50 });

  // Participation
  breakdown.push({ label: 'Participation', xp: 10 });

  let baseTotal = breakdown.reduce((sum, b) => sum + b.xp, 0);

  // Prestige XP multiplier
  if (state.prestigeCount > 0) {
    const bonus = Math.floor(baseTotal * state.prestigeCount * PRESTIGE_STACK_BONUS.xpMultiplier);
    if (bonus > 0) breakdown.push({ label: `Prestige ×${state.prestigeCount}`, xp: bonus });
  }

  const total = breakdown.reduce((sum, b) => sum + b.xp, 0);
  state.xp += total;

  const newLevel = getMetaLevel(state.xp);
  state.level = newLevel.level;
  saveMetaProgression(state);

  // Determine which unlocks were gained
  const unlocksGained: string[] = [];
  for (const lvl of META_LEVELS) {
    if (lvl.level > oldLevel.level && lvl.level <= newLevel.level && lvl.unlock) {
      unlocksGained.push(lvl.unlock);
    }
  }

  return {
    xpGained: total,
    breakdown,
    oldLevel,
    newLevel,
    leveledUp: newLevel.level > oldLevel.level,
    totalXP: state.xp,
    unlocksGained,
  };
}

// ─── Prestige (Reset) ───

export interface PrestigeResetResult {
  newPrestigeCount: number;
  badge: string;
  success: boolean;
}

export function canPrestige(): boolean {
  const state = getMetaProgression();
  return state.level >= 20 && state.prestigeCount < MAX_PRESTIGE;
}

export function performPrestige(): PrestigeResetResult {
  const state = getMetaProgression();
  if (!canPrestige()) return { newPrestigeCount: state.prestigeCount, badge: '', success: false };

  state.prestigeCount += 1;
  state.prestigeBadges.push(state.prestigeCount);
  state.xp = 0;
  state.level = 1;
  saveMetaProgression(state);

  return {
    newPrestigeCount: state.prestigeCount,
    badge: getPrestigeBadgeEmoji(state.prestigeCount),
    success: true,
  };
}

// ─── Epic Scripts (Level 15) ───

export interface EpicScript {
  name: string;
  genre: string;
  baseQuality: number;
  budgetMod: number;
  description: string;
  special: string;
}

export const EPIC_SCRIPTS: EpicScript[] = [
  { name: 'The Magnum Opus', genre: 'Drama', baseQuality: 8, budgetMod: -3, description: 'A once-in-a-generation dramatic masterpiece.', special: '+3 quality if all cast have Skill 4+' },
  { name: 'Infinity Protocol', genre: 'Action', baseQuality: 7, budgetMod: -2, description: 'The ultimate action spectacle with groundbreaking effects.', special: 'Incidents add quality instead of removing it' },
  { name: 'Whispers in the Dark', genre: 'Horror', baseQuality: 7, budgetMod: -1, description: 'A psychological horror masterwork that redefines the genre.', special: '+2 quality per Incident (max 6)' },
  { name: 'The Last Frontier', genre: 'Sci-Fi', baseQuality: 8, budgetMod: -4, description: 'An epic sci-fi odyssey spanning galaxies.', special: 'Double market multiplier' },
];

// ─── Veteran Talent (Level 8) ───

export interface VeteranTalent {
  name: string;
  skill: number;
  heat: number;
  cost: number;
  specialty: string;
}

export const VETERAN_TALENT_POOL: VeteranTalent[] = [
  { name: 'Sir Reginald Thornton', skill: 6, heat: 4, cost: 12, specialty: 'Drama' },
  { name: 'Valentina Starr', skill: 6, heat: 5, cost: 14, specialty: 'Action' },
  { name: 'Kazuki Yamamoto', skill: 6, heat: 3, cost: 11, specialty: 'Horror' },
  { name: 'Isabella del Monte', skill: 6, heat: 4, cost: 13, specialty: 'Comedy' },
];
