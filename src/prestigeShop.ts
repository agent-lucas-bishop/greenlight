// ─── Prestige Shop & Star Power System (R227) ───
// Permanent upgrades purchased with Star Power currency
// Persisted in localStorage under "greenlight-prestige"

export interface PrestigeShopState {
  starPower: number;
  prestigeLevel: number; // 0-10, earned by winning on Mogul difficulty + prestige reset
  upgrades: Record<string, number>; // upgradeId → current level
  equippedCosmetics: {
    logoFrame: string | null;
    cardBack: string | null;
    uiTheme: string | null;
  };
  unlockedCosmetics: string[]; // cosmetic IDs
  totalStarPowerEarned: number;
  prestigeResetCount: number;
}

export interface PrestigeUpgrade {
  id: string;
  name: string;
  emoji: string;
  description: string;
  maxLevel: number;
  costPerLevel: number[]; // Star Power cost for each level (index 0 = level 1)
  effectDescription: (level: number) => string;
}

export interface PrestigeCosmetic {
  id: string;
  name: string;
  emoji: string;
  type: 'logoFrame' | 'cardBack' | 'uiTheme';
  description: string;
  unlockCondition: string; // human-readable
  prestigeRequired: number; // prestige level needed
}

// ─── Upgrade Definitions ───

export const PRESTIGE_UPGRADES: PrestigeUpgrade[] = [
  {
    id: 'budget_bonus',
    name: 'Starting Budget Bonus',
    emoji: '💰',
    description: 'Start each run with extra budget',
    maxLevel: 5,
    costPerLevel: [10, 20, 35, 55, 80],
    effectDescription: (l) => `+$${l * 2}M starting budget`,
  },
  {
    id: 'extra_draw',
    name: 'Extra Card Draw',
    emoji: '🃏',
    description: 'See more cards in the shop each season',
    maxLevel: 3,
    costPerLevel: [15, 30, 50],
    effectDescription: (l) => `+${l} card${l > 1 ? 's' : ''} in shop`,
  },
  {
    id: 'rep_shield',
    name: 'Reputation Shield',
    emoji: '🛡️',
    description: 'Start with free strikes absorbed',
    maxLevel: 2,
    costPerLevel: [25, 50],
    effectDescription: (l) => `${l} free strike${l > 1 ? 's' : ''} absorbed at start`,
  },
  {
    id: 'genre_mastery_1',
    name: 'Genre Mastery I',
    emoji: '🎭',
    description: 'Permanent +5 quality for one genre',
    maxLevel: 1,
    costPerLevel: [20],
    effectDescription: () => '+5 quality for chosen genre',
  },
  {
    id: 'genre_mastery_2',
    name: 'Genre Mastery II',
    emoji: '🎭',
    description: 'Permanent +5 quality for a second genre',
    maxLevel: 1,
    costPerLevel: [35],
    effectDescription: () => '+5 quality for chosen genre',
  },
  {
    id: 'genre_mastery_3',
    name: 'Genre Mastery III',
    emoji: '🎭',
    description: 'Permanent +5 quality for a third genre',
    maxLevel: 1,
    costPerLevel: [55],
    effectDescription: () => '+5 quality for chosen genre',
  },
  {
    id: 'talent_scout',
    name: 'Talent Scout',
    emoji: '🔍',
    description: 'Better talent pool quality each season',
    maxLevel: 3,
    costPerLevel: [15, 30, 50],
    effectDescription: (l) => `+${l} minimum talent skill`,
  },
  {
    id: 'lucky_break',
    name: 'Lucky Break',
    emoji: '🍀',
    description: 'Chance to upgrade film tier on release',
    maxLevel: 3,
    costPerLevel: [20, 40, 65],
    effectDescription: (l) => `${l * 8}% chance to upgrade tier`,
  },
  {
    id: 'vip_legend_1',
    name: 'VIP: The Auteur\'s Cut',
    emoji: '🌟',
    description: 'Unlock legendary card: The Auteur\'s Cut',
    maxLevel: 1,
    costPerLevel: [40],
    effectDescription: () => 'Legendary card unlocked',
  },
  {
    id: 'vip_legend_2',
    name: 'VIP: Oscar Whisperer',
    emoji: '🌟',
    description: 'Unlock legendary card: Oscar Whisperer',
    maxLevel: 1,
    costPerLevel: [40],
    effectDescription: () => 'Legendary card unlocked',
  },
  {
    id: 'vip_legend_3',
    name: 'VIP: Box Office Alchemy',
    emoji: '🌟',
    description: 'Unlock legendary card: Box Office Alchemy',
    maxLevel: 1,
    costPerLevel: [40],
    effectDescription: () => 'Legendary card unlocked',
  },
  {
    id: 'vip_legend_4',
    name: 'VIP: Studio System',
    emoji: '🌟',
    description: 'Unlock legendary card: Studio System',
    maxLevel: 1,
    costPerLevel: [40],
    effectDescription: () => 'Legendary card unlocked',
  },
];

// ─── Cosmetic Definitions ───

export const PRESTIGE_COSMETICS: PrestigeCosmetic[] = [
  { id: 'frame_bronze', name: 'Bronze Frame', emoji: '🥉', type: 'logoFrame', description: 'Bronze studio logo frame', unlockCondition: 'Prestige 1', prestigeRequired: 1 },
  { id: 'frame_silver', name: 'Silver Frame', emoji: '🥈', type: 'logoFrame', description: 'Silver studio logo frame', unlockCondition: 'Prestige 3', prestigeRequired: 3 },
  { id: 'frame_gold', name: 'Gold Frame', emoji: '🥇', type: 'logoFrame', description: 'Gold studio logo frame', unlockCondition: 'Prestige 5', prestigeRequired: 5 },
  { id: 'frame_diamond', name: 'Diamond Frame', emoji: '💎', type: 'logoFrame', description: 'Diamond studio logo frame', unlockCondition: 'Prestige 8', prestigeRequired: 8 },
  { id: 'frame_star', name: 'Star Frame', emoji: '⭐', type: 'logoFrame', description: 'Legendary star frame', unlockCondition: 'Prestige 10', prestigeRequired: 10 },
  { id: 'back_classic', name: 'Classic Back', emoji: '🎬', type: 'cardBack', description: 'Classic film reel card back', unlockCondition: 'Prestige 2', prestigeRequired: 2 },
  { id: 'back_neon', name: 'Neon Back', emoji: '💜', type: 'cardBack', description: 'Neon glow card back', unlockCondition: 'Prestige 4', prestigeRequired: 4 },
  { id: 'back_gold', name: 'Gold Back', emoji: '✨', type: 'cardBack', description: 'Golden card back', unlockCondition: 'Prestige 6', prestigeRequired: 6 },
  { id: 'back_holographic', name: 'Holographic Back', emoji: '🌈', type: 'cardBack', description: 'Holographic card back', unlockCondition: 'Prestige 9', prestigeRequired: 9 },
  { id: 'theme_midnight', name: 'Midnight Theme', emoji: '🌙', type: 'uiTheme', description: 'Deep midnight blue UI theme', unlockCondition: 'Prestige 2', prestigeRequired: 2 },
  { id: 'theme_sunset', name: 'Sunset Theme', emoji: '🌅', type: 'uiTheme', description: 'Warm sunset gradient UI', unlockCondition: 'Prestige 4', prestigeRequired: 4 },
  { id: 'theme_royal', name: 'Royal Theme', emoji: '👑', type: 'uiTheme', description: 'Royal purple & gold UI', unlockCondition: 'Prestige 7', prestigeRequired: 7 },
  { id: 'theme_legendary', name: 'Legendary Theme', emoji: '🌟', type: 'uiTheme', description: 'Legendary golden UI theme', unlockCondition: 'Prestige 10', prestigeRequired: 10 },
];

// ─── Persistence ───

const STORAGE_KEY = 'greenlight-prestige';

export function getPrestigeShop(): PrestigeShopState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    starPower: 0,
    prestigeLevel: 0,
    upgrades: {},
    equippedCosmetics: { logoFrame: null, cardBack: null, uiTheme: null },
    unlockedCosmetics: [],
    totalStarPowerEarned: 0,
    prestigeResetCount: 0,
  };
}

function savePrestigeShop(state: PrestigeShopState): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

// ─── Star Power Earning ───

export interface StarPowerEarning {
  source: string;
  amount: number;
}

export function calculateStarPowerFromRun(data: {
  isVictory: boolean;
  difficulty: string;
  legacyRating: string;
  filmCount: number;
  totalBoxOffice: number;
  achievementCount: number;
}): StarPowerEarning[] {
  const earnings: StarPowerEarning[] = [];

  // Mogul victory = big Star Power
  if (data.isVictory && data.difficulty === 'mogul') {
    earnings.push({ source: 'Mogul Victory', amount: 15 });
  } else if (data.isVictory) {
    earnings.push({ source: 'Victory', amount: 3 });
  }

  // S-rank bonus
  if (data.legacyRating === 'S') {
    earnings.push({ source: 'S-Rank', amount: 5 });
  } else if (data.legacyRating === 'A') {
    earnings.push({ source: 'A-Rank', amount: 2 });
  }

  // Box office milestones
  if (data.totalBoxOffice >= 500) {
    earnings.push({ source: '$500M+ Box Office', amount: 3 });
  } else if (data.totalBoxOffice >= 200) {
    earnings.push({ source: '$200M+ Box Office', amount: 1 });
  }

  // Film count milestones
  if (data.filmCount >= 5) {
    earnings.push({ source: '5+ Films', amount: 2 });
  }

  // Achievement bonus
  if (data.achievementCount >= 3) {
    earnings.push({ source: '3+ Achievements', amount: 2 });
  }

  return earnings;
}

export function awardStarPower(earnings: StarPowerEarning[]): number {
  const total = earnings.reduce((s, e) => s + e.amount, 0);
  if (total <= 0) return 0;
  const state = getPrestigeShop();
  state.starPower += total;
  state.totalStarPowerEarned += total;
  savePrestigeShop(state);
  return total;
}

// ─── Upgrade Management ───

export function getUpgradeLevel(upgradeId: string): number {
  const state = getPrestigeShop();
  return state.upgrades[upgradeId] || 0;
}

export function canPurchaseUpgrade(upgradeId: string): boolean {
  const state = getPrestigeShop();
  const upgrade = PRESTIGE_UPGRADES.find(u => u.id === upgradeId);
  if (!upgrade) return false;
  const currentLevel = state.upgrades[upgradeId] || 0;
  if (currentLevel >= upgrade.maxLevel) return false;
  const cost = upgrade.costPerLevel[currentLevel];
  return state.starPower >= cost;
}

export function purchaseUpgrade(upgradeId: string): boolean {
  const state = getPrestigeShop();
  const upgrade = PRESTIGE_UPGRADES.find(u => u.id === upgradeId);
  if (!upgrade) return false;
  const currentLevel = state.upgrades[upgradeId] || 0;
  if (currentLevel >= upgrade.maxLevel) return false;
  const cost = upgrade.costPerLevel[currentLevel];
  if (state.starPower < cost) return false;
  state.starPower -= cost;
  state.upgrades[upgradeId] = currentLevel + 1;
  savePrestigeShop(state);
  return true;
}

// ─── Cosmetic Management ───

export function isCosmeticUnlocked(cosmeticId: string): boolean {
  const state = getPrestigeShop();
  const cosmetic = PRESTIGE_COSMETICS.find(c => c.id === cosmeticId);
  if (!cosmetic) return false;
  return state.prestigeLevel >= cosmetic.prestigeRequired;
}

export function equipCosmetic(cosmeticId: string): boolean {
  const state = getPrestigeShop();
  const cosmetic = PRESTIGE_COSMETICS.find(c => c.id === cosmeticId);
  if (!cosmetic) return false;
  if (state.prestigeLevel < cosmetic.prestigeRequired) return false;
  state.equippedCosmetics[cosmetic.type] = cosmeticId;
  if (!state.unlockedCosmetics.includes(cosmeticId)) {
    state.unlockedCosmetics.push(cosmeticId);
  }
  savePrestigeShop(state);
  return true;
}

export function unequipCosmetic(type: 'logoFrame' | 'cardBack' | 'uiTheme'): void {
  const state = getPrestigeShop();
  state.equippedCosmetics[type] = null;
  savePrestigeShop(state);
}

// ─── Prestige Reset (R227) ───

export function canPrestigeReset(): boolean {
  const state = getPrestigeShop();
  return state.prestigeLevel < 10;
}

export function performPrestigeReset(): { success: boolean; newLevel: number; starPowerAwarded: number } {
  const state = getPrestigeShop();
  if (state.prestigeLevel >= 10) return { success: false, newLevel: state.prestigeLevel, starPowerAwarded: 0 };
  
  state.prestigeLevel += 1;
  state.prestigeResetCount += 1;
  // Award Star Power for prestiging
  const starPowerBonus = 10 + (state.prestigeLevel * 5);
  state.starPower += starPowerBonus;
  state.totalStarPowerEarned += starPowerBonus;
  savePrestigeShop(state);
  
  return { success: true, newLevel: state.prestigeLevel, starPowerAwarded: starPowerBonus };
}

// ─── Gameplay Integration Helpers ───

/** Get starting budget bonus from prestige upgrades */
export function getPrestigeShopBudgetBonus(): number {
  return getUpgradeLevel('budget_bonus') * 2;
}

/** Get extra card draw count from prestige upgrades */
export function getPrestigeExtraCardDraw(): number {
  return getUpgradeLevel('extra_draw');
}

/** Get reputation shield strikes absorbed at start */
export function getPrestigeRepShield(): number {
  return getUpgradeLevel('rep_shield');
}

/** Get genre mastery bonuses: returns genre IDs with +5 quality */
export function getPrestigeGenreMasteryBonuses(): string[] {
  const state = getPrestigeShop();
  // Genre mastery stores chosen genres in upgrades as genre_mastery_1_genre, etc.
  const genres: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const genreKey = `genre_mastery_${i}_genre`;
    const upgradeLevel = state.upgrades[`genre_mastery_${i}`] || 0;
    if (upgradeLevel > 0) {
      const chosen = (state as unknown as Record<string, unknown>)[genreKey] as string | undefined;
      if (chosen) genres.push(chosen);
    }
  }
  return genres;
}

/** Set chosen genre for a genre mastery slot */
export function setGenreMasteryChoice(slot: number, genre: string): void {
  const state = getPrestigeShop();
  (state as unknown as Record<string, unknown>)[`genre_mastery_${slot}_genre`] = genre;
  savePrestigeShop(state);
}

/** Get talent scout bonus (minimum skill increase) */
export function getPrestigeTalentScoutBonus(): number {
  return getUpgradeLevel('talent_scout');
}

/** Get lucky break chance (0-1) */
export function getPrestigeLuckyBreakChance(): number {
  return getUpgradeLevel('lucky_break') * 0.08;
}

/** Check if a VIP legendary card is unlocked */
export function isVIPCardUnlocked(cardIndex: number): boolean {
  return getUpgradeLevel(`vip_legend_${cardIndex}`) > 0;
}

/** Get prestige stars display string */
export function getPrestigeStarsDisplay(level?: number): string {
  const l = level ?? getPrestigeShop().prestigeLevel;
  if (l <= 0) return '';
  return '⭐'.repeat(Math.min(l, 10));
}
