// Achievement Gallery system — R209: categorized display with rarity, trophy shelf data
// Extends the existing achievements.ts with gallery-specific categorization and metadata

import { ACHIEVEMENTS, getUnlockedAchievements, getAchievementDates } from './achievements';
import type { AchievementDef, AchievementCategory } from './achievements';

// ─── Gallery Categories ───
export type GalleryCategory = 'career' | 'collection' | 'mastery' | 'secret';

export interface GalleryCategoryDef {
  id: GalleryCategory;
  label: string;
  emoji: string;
  description: string;
  /** Maps to internal AchievementCategory values */
  internal: AchievementCategory[];
}

export const GALLERY_CATEGORIES: GalleryCategoryDef[] = [
  {
    id: 'career',
    label: 'Career',
    emoji: '🏛️',
    description: 'Win conditions, milestones, and studio growth',
    internal: ['milestone'],
  },
  {
    id: 'collection',
    label: 'Collection',
    emoji: '🎬',
    description: 'Cards, genres, talent, and content discovery',
    internal: ['discovery'],
  },
  {
    id: 'mastery',
    label: 'Mastery',
    emoji: '💪',
    description: 'Difficulty challenges, streaks, and perfect scores',
    internal: ['skill'],
  },
  {
    id: 'secret',
    label: 'Secret',
    emoji: '🔮',
    description: 'Hidden achievements revealed only on unlock',
    internal: ['secret', 'fun'],
  },
];

// ─── Category mapping ───
const CATEGORY_MAP = new Map<AchievementCategory, GalleryCategory>();
for (const gc of GALLERY_CATEGORIES) {
  for (const ic of gc.internal) {
    CATEGORY_MAP.set(ic, gc.id);
  }
}

export function getGalleryCategory(cat: AchievementCategory): GalleryCategory {
  return CATEGORY_MAP.get(cat) ?? 'career';
}

// ─── Rarity ───
export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface RarityDef {
  id: AchievementRarity;
  label: string;
  color: string;
  glowColor: string;
  /** Percentage of players who unlock (simulated from achievement difficulty) */
  percentile: string;
}

export const RARITY_DEFS: Record<AchievementRarity, RarityDef> = {
  common:    { id: 'common',    label: 'Common',    color: '#888',    glowColor: 'rgba(136,136,136,0.3)', percentile: '~70%' },
  uncommon:  { id: 'uncommon',  label: 'Uncommon',  color: '#2ecc71', glowColor: 'rgba(46,204,113,0.3)',  percentile: '~40%' },
  rare:      { id: 'rare',      label: 'Rare',      color: '#3498db', glowColor: 'rgba(52,152,219,0.3)',  percentile: '~20%' },
  epic:      { id: 'epic',      label: 'Epic',      color: '#9b59b6', glowColor: 'rgba(155,89,182,0.3)',  percentile: '~8%' },
  legendary: { id: 'legendary', label: 'Legendary', color: '#f39c12', glowColor: 'rgba(243,156,18,0.4)',  percentile: '~2%' },
};

/** Assign rarity based on achievement properties — uses explicit rarity field if set */
export function getAchievementRarity(ach: AchievementDef): AchievementRarity {
  // Use explicit rarity from v2 achievements if available
  if ((ach as any).rarity) {
    const r = (ach as any).rarity;
    // Map 'uncommon' to itself, others match
    if (r === 'common' || r === 'uncommon' || r === 'rare' || r === 'epic' || r === 'legendary') return r;
  }

  // Secret achievements are at least rare
  if (ach.secret) return 'epic';

  // Achievements with cosmetic rewards are rare+
  if (ach.cosmeticReward) return 'rare';

  // Check for known hard achievements
  const hardIds = ['rank_s', 'prestige_mogul', 'moguls_gambit', 'billion_club', 'speed_demon_threshold', 'the_mogul_billion', 'award_sweep', 'speed_run_15', 'perfect_critic_score', 'secret_the_auteur'];
  if (hardIds.includes(ach.id)) return 'legendary';

  const epicIds = ['perfect_run', 'five_star_studio', 'marathon_finisher', 'all_star_cast', 'blockbuster_trio', 'critical_darling_niche', 'franchise_king', 'genre_specialist', 'indie_spirit', 'triple_threat'];
  if (epicIds.includes(ach.id)) return 'epic';

  const rareIds = ['half_billion', 'box_office_king', 'rival_crusher', 'auteur_master', 'prestige_oscar_bait', 'box_office_bomb', 'budget_master', 'comeback_kid', 'festival_darling', 'nemesis_defeated', 'world_event_survivor', 'double_down'];
  if (rareIds.includes(ach.id)) return 'rare';

  const uncommonIds = ['five_wins', 'genre_master', 'ending_collector', 'daily_driver', 'twenty_films', 'chemistry_lab', 'prestige_studio_lot', 'cult_classic', 'soundtrack_maestro', 'loan_shark'];
  if (uncommonIds.includes(ach.id)) return 'uncommon';

  return 'common';
}

// ─── Gallery data helpers ───

export interface GalleryAchievement {
  def: AchievementDef;
  galleryCategory: GalleryCategory;
  rarity: AchievementRarity;
  isUnlocked: boolean;
  unlockDate: string | null;
}

export function getGalleryAchievements(): GalleryAchievement[] {
  const unlocked = new Set(getUnlockedAchievements());
  const dates = getAchievementDates();

  return ACHIEVEMENTS.map(ach => ({
    def: ach,
    galleryCategory: getGalleryCategory(ach.category),
    rarity: getAchievementRarity(ach),
    isUnlocked: unlocked.has(ach.id),
    unlockDate: dates[ach.id] ?? null,
  }));
}

export function getCompletionStats() {
  const all = getGalleryAchievements();
  const unlocked = all.filter(a => a.isUnlocked);
  const total = all.length;
  const pct = total > 0 ? Math.round((unlocked.length / total) * 100) : 0;

  const byCategory: Record<GalleryCategory, { total: number; unlocked: number }> = {
    career: { total: 0, unlocked: 0 },
    collection: { total: 0, unlocked: 0 },
    mastery: { total: 0, unlocked: 0 },
    secret: { total: 0, unlocked: 0 },
  };

  for (const a of all) {
    byCategory[a.galleryCategory].total++;
    if (a.isUnlocked) byCategory[a.galleryCategory].unlocked++;
  }

  return { total, unlockedCount: unlocked.length, pct, byCategory };
}

// ─── Trophy shelf: top achievements for display ───
export const TROPHY_ACHIEVEMENT_IDS = [
  'rank_s',
  'perfect_run',
  'prestige_mogul',
  'moguls_gambit',
  'billion_club',
  'blockbuster_trio',
  'the_mogul_billion',
  'award_sweep',
  'secret_the_auteur',
];

export function getTrophyShelfAchievements(): GalleryAchievement[] {
  const all = getGalleryAchievements();
  return TROPHY_ACHIEVEMENT_IDS
    .map(id => all.find(a => a.def.id === id))
    .filter((a): a is GalleryAchievement => a !== undefined);
}

// ─── R269: Achievement Point System ───
export const ACHIEVEMENT_POINTS: Record<AchievementRarity, number> = {
  common: 10,
  uncommon: 25,
  rare: 50,
  epic: 100,
  legendary: 250,
};

export function getAchievementScore(): { total: number; earned: number; byCategory: Record<GalleryCategory, { total: number; earned: number }> } {
  const all = getGalleryAchievements();
  const byCategory: Record<GalleryCategory, { total: number; earned: number }> = {
    career: { total: 0, earned: 0 },
    collection: { total: 0, earned: 0 },
    mastery: { total: 0, earned: 0 },
    secret: { total: 0, earned: 0 },
  };
  let total = 0;
  let earned = 0;
  for (const a of all) {
    const pts = ACHIEVEMENT_POINTS[a.rarity];
    total += pts;
    byCategory[a.galleryCategory].total += pts;
    if (a.isUnlocked) {
      earned += pts;
      byCategory[a.galleryCategory].earned += pts;
    }
  }
  return { total, earned, byCategory };
}

/** Achievements with >50% progress that are not yet unlocked */
export function getNearestToUnlock(): GalleryAchievement[] {
  // We need game state to evaluate progress
  try {
    const { getState } = require('./gameStore') as { getState: () => import('./types').GameState };
    const { getUnlocks } = require('./unlocks') as { getUnlocks: () => import('./unlocks').UnlockState };
    const state = getState();
    const unlockState = getUnlocks();
    const all = getGalleryAchievements();
    const suggestions: { ach: GalleryAchievement; pct: number }[] = [];
    for (const a of all) {
      if (a.isUnlocked) continue;
      if (!a.def.progress) continue;
      try {
        const prog = a.def.progress(state, unlockState);
        if (prog && prog.target > 0) {
          const pct = prog.current / prog.target;
          if (pct > 0.5 && pct < 1) {
            suggestions.push({ ach: a, pct });
          }
        }
      } catch { /* skip */ }
    }
    return suggestions.sort((a, b) => b.pct - a.pct).map(s => s.ach);
  } catch {
    return [];
  }
}

// ─── R269: Trophy material based on rarity ───
export type TrophyMaterial = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export const RARITY_TO_MATERIAL: Record<AchievementRarity, TrophyMaterial> = {
  common: 'bronze',
  uncommon: 'silver',
  rare: 'gold',
  epic: 'platinum',
  legendary: 'diamond',
};

export const MATERIAL_COLORS: Record<TrophyMaterial, { primary: string; secondary: string; glow: string }> = {
  bronze:   { primary: '#cd7f32', secondary: '#a0522d', glow: 'rgba(205,127,50,0.3)' },
  silver:   { primary: '#c0c0c0', secondary: '#808080', glow: 'rgba(192,192,192,0.3)' },
  gold:     { primary: '#ffd700', secondary: '#b8860b', glow: 'rgba(255,215,0,0.4)' },
  platinum: { primary: '#e5e4e2', secondary: '#9b59b6', glow: 'rgba(155,89,182,0.4)' },
  diamond:  { primary: '#b9f2ff', secondary: '#00bfff', glow: 'rgba(0,191,255,0.5)' },
};
