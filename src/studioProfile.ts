// ─── Studio Profile: Meta-Progression Prestige System (R294) ───
// Tracks cumulative lifetime stats across all runs.
// localStorage key: gl_studio_meta
// Studio Level 1-50 with named tiers, permanent unlocks, and cosmetic badges.

export interface StudioMetaStats {
  totalFilmsProduced: number;
  totalBoxOffice: number;       // in $M
  totalAwards: number;          // nominations/wins
  totalRunsCompleted: number;
  totalVictories: number;
  totalBlockbusters: number;
  totalScore: number;
  version: number;              // migration version
}

export interface StudioMetaState {
  stats: StudioMetaStats;
  level: number;
  unlockedPerks: string[];      // perk IDs that have been unlocked
}

export interface StudioLevelDef {
  level: number;
  xpRequired: number;  // cumulative "XP" = weighted stat composite
  name: string;
  emoji: string;
  tier: string;         // tier name group
}

export interface StudioPerkDef {
  id: string;
  level: number;        // studio level required
  name: string;
  description: string;
  emoji: string;
  type: 'gameplay' | 'cosmetic';
}

// ─── XP Calculation ───
// Composite XP from lifetime stats, weighted:
//   films × 10 + boxOffice × 0.5 + awards × 25 + runs × 20 + victories × 50 + blockbusters × 15 + score × 0.1
export function calculateStudioXP(stats: StudioMetaStats): number {
  return Math.floor(
    stats.totalFilmsProduced * 10 +
    stats.totalBoxOffice * 0.5 +
    stats.totalAwards * 25 +
    stats.totalRunsCompleted * 20 +
    stats.totalVictories * 50 +
    stats.totalBlockbusters * 15 +
    stats.totalScore * 0.1
  );
}

// ─── Level Definitions (1-50) ───
export const STUDIO_LEVELS: StudioLevelDef[] = [
  { level: 1,  xpRequired: 0,      name: 'Indie Garage',         emoji: '🎥', tier: 'Indie' },
  { level: 2,  xpRequired: 50,     name: 'Film School Grad',     emoji: '🎓', tier: 'Indie' },
  { level: 3,  xpRequired: 120,    name: 'Short Film Maker',     emoji: '📹', tier: 'Indie' },
  { level: 4,  xpRequired: 200,    name: 'Festival Hopeful',     emoji: '🎪', tier: 'Indie' },
  { level: 5,  xpRequired: 300,    name: 'Indie Darling',        emoji: '💡', tier: 'Indie' },
  { level: 6,  xpRequired: 420,    name: 'Boutique Studio',      emoji: '🏠', tier: 'Boutique' },
  { level: 7,  xpRequired: 560,    name: 'Rising Producer',      emoji: '📈', tier: 'Boutique' },
  { level: 8,  xpRequired: 720,    name: 'Talent Scout',         emoji: '🔍', tier: 'Boutique' },
  { level: 9,  xpRequired: 900,    name: 'Genre Specialist',     emoji: '🎭', tier: 'Boutique' },
  { level: 10, xpRequired: 1100,   name: 'Award Contender',      emoji: '🏅', tier: 'Boutique' },
  { level: 11, xpRequired: 1350,   name: 'Mid-Major Studio',     emoji: '🏢', tier: 'Major' },
  { level: 12, xpRequired: 1650,   name: 'Box Office Player',    emoji: '💰', tier: 'Major' },
  { level: 13, xpRequired: 2000,   name: 'Hit Factory',          emoji: '🏭', tier: 'Major' },
  { level: 14, xpRequired: 2400,   name: 'Franchise Builder',    emoji: '🔗', tier: 'Major' },
  { level: 15, xpRequired: 2850,   name: 'Major Studio',         emoji: '⭐', tier: 'Major' },
  { level: 16, xpRequired: 3350,   name: 'Critics\' Favorite',   emoji: '📰', tier: 'Major' },
  { level: 17, xpRequired: 3900,   name: 'Blockbuster Machine',  emoji: '💥', tier: 'Major' },
  { level: 18, xpRequired: 4500,   name: 'Award Season Regular', emoji: '🏆', tier: 'Major' },
  { level: 19, xpRequired: 5200,   name: 'Industry Titan',       emoji: '🗼', tier: 'Major' },
  { level: 20, xpRequired: 6000,   name: 'Hollywood Power',      emoji: '👔', tier: 'Hollywood' },
  { level: 21, xpRequired: 6900,   name: 'Global Distributor',   emoji: '🌍', tier: 'Hollywood' },
  { level: 22, xpRequired: 7900,   name: 'Cultural Tastemaker',  emoji: '🎨', tier: 'Hollywood' },
  { level: 23, xpRequired: 9000,   name: 'Dream Factory',        emoji: '✨', tier: 'Hollywood' },
  { level: 24, xpRequired: 10200,  name: 'Oscar Magnet',         emoji: '🏆', tier: 'Hollywood' },
  { level: 25, xpRequired: 11500,  name: 'Hollywood Empire',     emoji: '🏰', tier: 'Hollywood' },
  { level: 26, xpRequired: 13000,  name: 'Media Conglomerate',   emoji: '📡', tier: 'Empire' },
  { level: 27, xpRequired: 14600,  name: 'Entertainment Mogul',  emoji: '👑', tier: 'Empire' },
  { level: 28, xpRequired: 16400,  name: 'Cinematic Visionary',  emoji: '🔮', tier: 'Empire' },
  { level: 29, xpRequired: 18400,  name: 'Master Storyteller',   emoji: '📜', tier: 'Empire' },
  { level: 30, xpRequired: 20600,  name: 'Cinema Royalty',       emoji: '👸', tier: 'Empire' },
  { level: 31, xpRequired: 23000,  name: 'Immortal Director',    emoji: '🎬', tier: 'Legend' },
  { level: 32, xpRequired: 25600,  name: 'Hall of Fame',         emoji: '🏛️', tier: 'Legend' },
  { level: 33, xpRequired: 28500,  name: 'Golden Age Icon',      emoji: '🌟', tier: 'Legend' },
  { level: 34, xpRequired: 31700,  name: 'Eternal Filmmaker',    emoji: '♾️', tier: 'Legend' },
  { level: 35, xpRequired: 35200,  name: 'Legendary Studio',     emoji: '🌠', tier: 'Legend' },
  { level: 36, xpRequired: 39000,  name: 'Mythic Producer',      emoji: '⚡', tier: 'Legend' },
  { level: 37, xpRequired: 43200,  name: 'Timeless Auteur',      emoji: '🎞️', tier: 'Legend' },
  { level: 38, xpRequired: 47800,  name: 'Seventh Art Master',   emoji: '🖼️', tier: 'Legend' },
  { level: 39, xpRequired: 52800,  name: 'Cinéma Verité',        emoji: '🎩', tier: 'Legend' },
  { level: 40, xpRequired: 58200,  name: 'Apex Studio',          emoji: '💎', tier: 'Apex' },
  { level: 41, xpRequired: 64000,  name: 'Peerless Vision',      emoji: '👁️', tier: 'Apex' },
  { level: 42, xpRequired: 70200,  name: 'Infinite Cinema',      emoji: '🌀', tier: 'Apex' },
  { level: 43, xpRequired: 76800,  name: 'Transcendent',         emoji: '🕊️', tier: 'Apex' },
  { level: 44, xpRequired: 83800,  name: 'Celestial Studio',     emoji: '🌌', tier: 'Apex' },
  { level: 45, xpRequired: 91200,  name: 'Galactic Premiere',    emoji: '🚀', tier: 'Apex' },
  { level: 46, xpRequired: 99000,  name: 'Cosmic Auteur',        emoji: '🪐', tier: 'Apex' },
  { level: 47, xpRequired: 107200, name: 'Universal Legend',     emoji: '🌟', tier: 'Apex' },
  { level: 48, xpRequired: 115800, name: 'Eternal Legacy',       emoji: '🔱', tier: 'Apex' },
  { level: 49, xpRequired: 125000, name: 'The One Studio',       emoji: '☀️', tier: 'Apex' },
  { level: 50, xpRequired: 135000, name: 'GREENLIGHT IMMORTAL',  emoji: '🎬', tier: 'Apex' },
];

// ─── Permanent Unlock Perks ───
export const STUDIO_PERKS: StudioPerkDef[] = [
  { id: 'budget_2m',         level: 5,  name: 'Seed Funding',        description: 'Start every run with +$2M budget',                  emoji: '💰', type: 'gameplay' },
  { id: 'bonus_card',        level: 10, name: 'Bonus Starting Card',  description: 'Begin each production with a bonus Action card',    emoji: '🃏', type: 'gameplay' },
  { id: 'audience_5',        level: 15, name: 'Fan Following',        description: '+5% audience appeal baseline on all films',          emoji: '📣', type: 'gameplay' },
  { id: 'free_research',     level: 20, name: 'Market Intelligence',  description: 'Start each run with a free market research action', emoji: '🔬', type: 'gameplay' },
  { id: 'studio_legacy_card',level: 25, name: 'Studio Legacy',        description: 'Unlock the powerful "Studio Legacy" card',          emoji: '🏛️', type: 'gameplay' },
  { id: 'title_mogul',       level: 30, name: 'Cinema Royalty',       description: '"Cinema Royalty" title on your profile',             emoji: '👸', type: 'cosmetic' },
  { id: 'badge_gold',        level: 35, name: 'Golden Badge',         description: 'Gold studio badge on leaderboards',                 emoji: '🥇', type: 'cosmetic' },
  { id: 'title_immortal',    level: 40, name: 'Apex Title',           description: '"Apex Studio" title with diamond border',            emoji: '💎', type: 'cosmetic' },
  { id: 'badge_diamond',     level: 45, name: 'Diamond Badge',        description: 'Diamond studio badge on leaderboards',              emoji: '💠', type: 'cosmetic' },
  { id: 'title_greenlight',  level: 50, name: 'GREENLIGHT IMMORTAL',  description: 'The ultimate title — you\'ve seen it all',          emoji: '🎬', type: 'cosmetic' },
];

const STORAGE_KEY = 'gl_studio_meta';

// ─── State Management ───

function defaultState(): StudioMetaState {
  return {
    stats: {
      totalFilmsProduced: 0,
      totalBoxOffice: 0,
      totalAwards: 0,
      totalRunsCompleted: 0,
      totalVictories: 0,
      totalBlockbusters: 0,
      totalScore: 0,
      version: 1,
    },
    level: 1,
    unlockedPerks: [],
  };
}

export function getStudioMeta(): StudioMetaState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Graceful migration
      if (!parsed.stats) return defaultState();
      if (!parsed.stats.version) parsed.stats.version = 1;
      if (parsed.stats.totalBlockbusters === undefined) parsed.stats.totalBlockbusters = 0;
      if (parsed.stats.totalScore === undefined) parsed.stats.totalScore = 0;
      if (!parsed.unlockedPerks) parsed.unlockedPerks = [];
      return parsed;
    }
  } catch {}
  return defaultState();
}

function saveStudioMeta(state: StudioMetaState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// ─── Level Queries ───

export function getStudioLevel(xp: number): StudioLevelDef {
  let result = STUDIO_LEVELS[0];
  for (const lvl of STUDIO_LEVELS) {
    if (xp >= lvl.xpRequired) result = lvl;
    else break;
  }
  return result;
}

export function getNextStudioLevel(xp: number): StudioLevelDef | null {
  for (const lvl of STUDIO_LEVELS) {
    if (xp < lvl.xpRequired) return lvl;
  }
  return null;
}

export function getStudioXPProgress(xp: number): { earned: number; needed: number; progress: number } {
  const current = getStudioLevel(xp);
  const next = getNextStudioLevel(xp);
  if (!next) return { earned: 0, needed: 0, progress: 1 };
  const base = current.xpRequired;
  const needed = next.xpRequired - base;
  const earned = xp - base;
  return { earned, needed, progress: Math.min(1, earned / needed) };
}

// ─── Perk Queries ───

export function getUnlockedStudioPerks(level: number): StudioPerkDef[] {
  return STUDIO_PERKS.filter(p => p.level <= level);
}

export function getNextStudioPerk(level: number): StudioPerkDef | null {
  return STUDIO_PERKS.find(p => p.level > level) || null;
}

export function hasStudioPerk(perkId: string): boolean {
  const state = getStudioMeta();
  return state.unlockedPerks.includes(perkId);
}

// ─── Gameplay Bonus Getters (called from gameStore) ───

export function getStudioProfileBudgetBonus(): number {
  return hasStudioPerk('budget_2m') ? 2 : 0;
}

export function hasStudioBonusCard(): boolean {
  return hasStudioPerk('bonus_card');
}

export function getStudioAudienceBonus(): number {
  return hasStudioPerk('audience_5') ? 5 : 0;
}

export function hasStudioFreeResearch(): boolean {
  return hasStudioPerk('free_research');
}

export function hasStudioLegacyCard(): boolean {
  return hasStudioPerk('studio_legacy_card');
}

// ─── Run End: Accumulate Stats ───

export interface StudioRunData {
  filmsProduced: number;
  totalBoxOffice: number;
  awards: number;
  isVictory: boolean;
  blockbusters: number;
  score: number;
}

export function accumulateRunStats(runData: StudioRunData): { leveledUp: boolean; oldLevel: number; newLevel: number; newPerks: StudioPerkDef[] } {
  const state = getStudioMeta();
  const oldXP = calculateStudioXP(state.stats);
  const oldLevelDef = getStudioLevel(oldXP);

  // Accumulate
  state.stats.totalFilmsProduced += runData.filmsProduced;
  state.stats.totalBoxOffice += runData.totalBoxOffice;
  state.stats.totalAwards += runData.awards;
  state.stats.totalRunsCompleted += 1;
  if (runData.isVictory) state.stats.totalVictories += 1;
  state.stats.totalBlockbusters += runData.blockbusters;
  state.stats.totalScore += runData.score;

  const newXP = calculateStudioXP(state.stats);
  const newLevelDef = getStudioLevel(newXP);
  state.level = newLevelDef.level;

  // Check for newly unlocked perks
  const newPerks: StudioPerkDef[] = [];
  for (const perk of STUDIO_PERKS) {
    if (perk.level <= newLevelDef.level && !state.unlockedPerks.includes(perk.id)) {
      state.unlockedPerks.push(perk.id);
      newPerks.push(perk);
    }
  }

  saveStudioMeta(state);

  return {
    leveledUp: newLevelDef.level > oldLevelDef.level,
    oldLevel: oldLevelDef.level,
    newLevel: newLevelDef.level,
    newPerks,
  };
}
