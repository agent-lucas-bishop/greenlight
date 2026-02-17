// Studio Prestige System — persistent level that increases across runs
// XP earned from: total box office, achievements unlocked, challenge modes completed, legacy ratings

export interface PrestigeState {
  xp: number;
  level: number;
}

export interface PrestigeLevel {
  level: number;
  title: string;
  emoji: string;
  xpRequired: number; // cumulative XP to reach this level
}

export interface PrestigeReward {
  type: 'studioColor' | 'titleBadge' | 'victoryTheme';
  id: string;
  label: string;
  value: string; // CSS color, badge text, or theme name
}

export const PRESTIGE_LEVELS: PrestigeLevel[] = [
  { level: 0, title: 'Film Student', emoji: '🎓', xpRequired: 0 },
  { level: 1, title: 'Indie Upstart', emoji: '📹', xpRequired: 50 },
  { level: 2, title: 'Scrappy Producer', emoji: '🎬', xpRequired: 150 },
  { level: 3, title: 'Rising Studio', emoji: '🌅', xpRequired: 350 },
  { level: 4, title: 'Established Player', emoji: '🏢', xpRequired: 650 },
  { level: 5, title: 'Industry Veteran', emoji: '🎖️', xpRequired: 1100 },
  { level: 6, title: 'Major Studio', emoji: '🏛️', xpRequired: 1700 },
  { level: 7, title: 'Award Powerhouse', emoji: '🏆', xpRequired: 2500 },
  { level: 8, title: 'Box Office Titan', emoji: '⚡', xpRequired: 3500 },
  { level: 9, title: 'Hollywood Royalty', emoji: '👑', xpRequired: 5000 },
  { level: 10, title: 'Cinematic Empire', emoji: '🌟', xpRequired: 7000 },
  { level: 11, title: 'Entertainment Conglomerate', emoji: '🌍', xpRequired: 10000 },
  { level: 12, title: 'Living Legend', emoji: '💎', xpRequired: 15000 },
];

// Cosmetic rewards unlocked at each prestige level
export const PRESTIGE_REWARDS: Record<number, PrestigeReward> = {
  1: { type: 'titleBadge', id: 'badge_newcomer', label: '🎬 Newcomer Badge', value: '🎬' },
  2: { type: 'studioColor', id: 'color_teal', label: 'Teal Studio Name', value: '#1abc9c' },
  3: { type: 'victoryTheme', id: 'theme_sunset', label: 'Sunset Victory Theme', value: 'sunset' },
  4: { type: 'studioColor', id: 'color_coral', label: 'Coral Studio Name', value: '#e74c3c' },
  5: { type: 'titleBadge', id: 'badge_veteran', label: '🎖️ Veteran Badge', value: '🎖️' },
  6: { type: 'studioColor', id: 'color_electric', label: 'Electric Blue Studio Name', value: '#3498db' },
  7: { type: 'victoryTheme', id: 'theme_golden', label: 'Golden Age Victory Theme', value: 'golden' },
  8: { type: 'studioColor', id: 'color_purple', label: 'Royal Purple Studio Name', value: '#9b59b6' },
  9: { type: 'titleBadge', id: 'badge_crown', label: '👑 Crown Badge', value: '👑' },
  10: { type: 'victoryTheme', id: 'theme_neon', label: 'Neon Noir Victory Theme', value: 'neon' },
  11: { type: 'studioColor', id: 'color_gold', label: 'Gold Studio Name', value: '#ffd700' },
  12: { type: 'titleBadge', id: 'badge_diamond', label: '💎 Diamond Badge', value: '💎' },
};

// ─── PRESTIGE MILESTONES (R128) ───
// Milestone rewards at specific prestige levels

export interface PrestigeMilestone {
  level: number;
  id: string;
  name: string;
  emoji: string;
  description: string;
  type: 'cosmetic' | 'script' | 'budget' | 'title';
}

export const PRESTIGE_MILESTONES: PrestigeMilestone[] = [
  { level: 3, id: 'studio_lot', name: 'Studio Lot', emoji: '🏛️', description: 'Gold border on start screen', type: 'cosmetic' },
  { level: 5, id: 'oscar_bait', name: 'Oscar Bait Script', emoji: '🏆', description: 'Unlock exclusive "Oscar Bait" script', type: 'script' },
  { level: 8, id: 'budget_bonus', name: 'Executive Suite', emoji: '💰', description: 'Start with +$2M bonus budget', type: 'budget' },
  { level: 10, id: 'mogul_title', name: 'Mogul', emoji: '👑', description: '"Mogul" title displayed on start screen & in share text', type: 'title' },
];

export function getUnlockedMilestones(level: number): PrestigeMilestone[] {
  return PRESTIGE_MILESTONES.filter(m => level >= m.level);
}

export function hasMilestone(milestoneId: string): boolean {
  const prestige = getPrestige();
  return PRESTIGE_MILESTONES.some(m => m.id === milestoneId && prestige.level >= m.level);
}

// ─── LEGACY RUN BONUSES (R128) ───
// Passive bonuses that scale with prestige level

export function getLegacyRunBonuses(): { reputationBonus: number; budgetBonus: number } {
  const prestige = getPrestige();
  const level = prestige.level;
  // +1 starting reputation per prestige level (cap at +5)
  const reputationBonus = Math.min(level, 5);
  // $1M per 2 prestige levels
  const budgetBonus = Math.floor(level / 2);
  return { reputationBonus, budgetBonus };
}

// Get all cosmetic rewards unlocked at or below a prestige level
export function getUnlockedPrestigeRewards(level: number): PrestigeReward[] {
  const rewards: PrestigeReward[] = [];
  for (let i = 1; i <= level; i++) {
    if (PRESTIGE_REWARDS[i]) rewards.push(PRESTIGE_REWARDS[i]);
  }
  return rewards;
}

// Get the active studio name color (highest unlocked)
export function getPrestigeStudioColor(): string | null {
  const prestige = getPrestige();
  const rewards = getUnlockedPrestigeRewards(prestige.level);
  const colors = rewards.filter(r => r.type === 'studioColor');
  return colors.length > 0 ? colors[colors.length - 1].value : null;
}

// Get the active title badge (highest unlocked)
export function getPrestigeBadge(): string | null {
  const prestige = getPrestige();
  const rewards = getUnlockedPrestigeRewards(prestige.level);
  const badges = rewards.filter(r => r.type === 'titleBadge');
  return badges.length > 0 ? badges[badges.length - 1].value : null;
}

// Get the active victory theme (highest unlocked)
export function getPrestigeVictoryTheme(): string | null {
  const prestige = getPrestige();
  const rewards = getUnlockedPrestigeRewards(prestige.level);
  const themes = rewards.filter(r => r.type === 'victoryTheme');
  return themes.length > 0 ? themes[themes.length - 1].value : null;
}

const PRESTIGE_KEY = 'greenlight_prestige';

export function getPrestige(): PrestigeState {
  try {
    const saved = localStorage.getItem(PRESTIGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { xp: 0, level: 0 };
}

// Callback to notify data.ts cache when prestige changes (avoids circular import)
let _onPrestigeChange: (() => void) | null = null;
export function setPrestigeChangeCallback(cb: () => void) { _onPrestigeChange = cb; }

function savePrestige(state: PrestigeState) {
  try { localStorage.setItem(PRESTIGE_KEY, JSON.stringify(state)); } catch {}
  _onPrestigeChange?.();
}

export function getPrestigeLevel(xp: number): PrestigeLevel {
  let result = PRESTIGE_LEVELS[0];
  for (const level of PRESTIGE_LEVELS) {
    if (xp >= level.xpRequired) result = level;
    else break;
  }
  return result;
}

export function getNextPrestigeLevel(xp: number): PrestigeLevel | null {
  for (const level of PRESTIGE_LEVELS) {
    if (xp < level.xpRequired) return level;
  }
  return null; // max level
}

export function getPrestigeXPProgress(xp: number): { current: number; next: number; progress: number } {
  const currentLevel = getPrestigeLevel(xp);
  const nextLevel = getNextPrestigeLevel(xp);
  if (!nextLevel) return { current: xp, next: xp, progress: 1 };
  const currentBase = currentLevel.xpRequired;
  const needed = nextLevel.xpRequired - currentBase;
  const earned = xp - currentBase;
  return { current: earned, next: needed, progress: Math.min(1, earned / needed) };
}

// Calculate XP earned from a completed run
export interface RunXPData {
  totalBoxOffice: number;
  achievementsUnlocked: number; // count of NEW achievements this run
  challengeCompleted: boolean;
  challengeId?: string; // which challenge was completed
  legacyRating: string; // S/A/B/C/D/F
  isVictory: boolean;
  filmCount: number;
}

const LEGACY_XP: Record<string, number> = {
  S: 100, A: 60, B: 35, C: 20, D: 10, F: 5,
};

export function calculateRunXP(data: RunXPData): { total: number; breakdown: { label: string; xp: number }[] } {
  const breakdown: { label: string; xp: number }[] = [];

  // Box office: 1 XP per $10M
  const boxOfficeXP = Math.floor(data.totalBoxOffice / 10);
  if (boxOfficeXP > 0) breakdown.push({ label: 'Box Office', xp: boxOfficeXP });

  // Achievements: 15 XP per new achievement
  const achXP = data.achievementsUnlocked * 15;
  if (achXP > 0) breakdown.push({ label: 'Achievements', xp: achXP });

  // Challenge completion: 40 XP base, +20 for harder challenges
  if (data.challengeCompleted) {
    const baseXP = 40;
    const bonusXP = data.challengeId && ['budget_hell', 'critics_only', 'marathon', 'auteur'].includes(data.challengeId) ? 20 : 0;
    breakdown.push({ label: 'Challenge Mode', xp: baseXP + bonusXP });
  }

  // Legacy rating XP
  const legXP = LEGACY_XP[data.legacyRating] || 5;
  breakdown.push({ label: `Legacy ${data.legacyRating}`, xp: legXP });

  // Victory bonus
  if (data.isVictory) breakdown.push({ label: 'Victory', xp: 25 });

  // Participation (always some XP)
  breakdown.push({ label: 'Films Made', xp: data.filmCount * 3 });

  const total = breakdown.reduce((sum, b) => sum + b.xp, 0);
  return { total, breakdown };
}

// Get veteran difficulty scaling info for UI display
export function getVeteranScaling(): { prestigeLevel: number; scalingPercent: number; activePerksCount: number; difficultyLabel: string } {
  const prestige = getPrestige();
  const level = prestige.level;
  const scalingPercent = level >= 5 ? (level - 4) * 5 : 0;
  
  // Count active legacy perks
  let activePerksCount = 0;
  try {
    const saved = localStorage.getItem('greenlight_unlocks');
    if (saved) {
      const u = JSON.parse(saved);
      // Count perks that pass their check (approximate by counting stored perk IDs)
      activePerksCount = (u.legacyPerks || []).length;
    }
  } catch {}
  
  let difficultyLabel: string;
  if (level >= 10) difficultyLabel = '🔥 LEGENDARY';
  else if (level >= 8) difficultyLabel = '⚡ BRUTAL';
  else if (level >= 5) difficultyLabel = '💀 VETERAN';
  else if (level >= 3) difficultyLabel = '🎬 EXPERIENCED';
  else if (level >= 1) difficultyLabel = '📹 LEARNING';
  else difficultyLabel = '🎓 NEWCOMER';
  
  return { prestigeLevel: level, scalingPercent, activePerksCount, difficultyLabel };
}

// Award XP from a run and return level-up info
export function awardRunXP(data: RunXPData): {
  xpGained: number;
  breakdown: { label: string; xp: number }[];
  oldLevel: PrestigeLevel;
  newLevel: PrestigeLevel;
  leveledUp: boolean;
  totalXP: number;
} {
  const prestige = getPrestige();
  const oldLevel = getPrestigeLevel(prestige.xp);
  const { total, breakdown } = calculateRunXP(data);

  prestige.xp += total;
  const newLevel = getPrestigeLevel(prestige.xp);
  prestige.level = newLevel.level;
  savePrestige(prestige);

  return {
    xpGained: total,
    breakdown,
    oldLevel,
    newLevel,
    leveledUp: newLevel.level > oldLevel.level,
    totalXP: prestige.xp,
  };
}
