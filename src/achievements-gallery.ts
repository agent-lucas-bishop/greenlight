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
  const hardIds = ['rank_s', 'prestige_mogul', 'moguls_gambit', 'billion_club', 'speed_demon_threshold'];
  if (hardIds.includes(ach.id)) return 'legendary';

  const epicIds = ['perfect_run', 'five_star_studio', 'marathon_finisher', 'all_star_cast', 'blockbuster_trio'];
  if (epicIds.includes(ach.id)) return 'epic';

  const rareIds = ['half_billion', 'box_office_king', 'rival_crusher', 'auteur_master', 'prestige_oscar_bait'];
  if (rareIds.includes(ach.id)) return 'rare';

  const uncommonIds = ['five_wins', 'genre_master', 'ending_collector', 'daily_driver', 'twenty_films', 'chemistry_lab', 'prestige_studio_lot'];
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
];

export function getTrophyShelfAchievements(): GalleryAchievement[] {
  const all = getGalleryAchievements();
  return TROPHY_ACHIEVEMENT_IDS
    .map(id => all.find(a => a.def.id === id))
    .filter((a): a is GalleryAchievement => a !== undefined);
}
