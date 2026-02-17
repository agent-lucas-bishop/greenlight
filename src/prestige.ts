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

const PRESTIGE_KEY = 'greenlight_prestige';

export function getPrestige(): PrestigeState {
  try {
    const saved = localStorage.getItem(PRESTIGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { xp: 0, level: 0 };
}

function savePrestige(state: PrestigeState) {
  try { localStorage.setItem(PRESTIGE_KEY, JSON.stringify(state)); } catch {}
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
