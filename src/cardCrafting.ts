// R260: Card Crafting & Fusion System
// Players spend Star Dust (from duplicates) and Award Tokens (from achievements) to craft talent cards

import { getCardCatalog, getCollection, type CollectionCardDef, type CollectionCardRarity, type CollectionEntry } from './cardCollection';
import type { TalentType, Genre } from './types';

// ─── Crafting Materials ───

export interface CraftingMaterials {
  starDust: number;    // earned from duplicate cards
  awardTokens: number; // earned from achievements
}

const MATERIALS_KEY = 'greenlight-crafting-materials';

export function loadMaterials(): CraftingMaterials {
  try {
    const raw = localStorage.getItem(MATERIALS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { starDust: 0, awardTokens: 0 };
}

export function saveMaterials(m: CraftingMaterials): void {
  localStorage.setItem(MATERIALS_KEY, JSON.stringify(m));
}

export function addStarDust(amount: number): void {
  const m = loadMaterials();
  m.starDust += amount;
  saveMaterials(m);
}

export function addAwardTokens(amount: number): void {
  const m = loadMaterials();
  m.awardTokens += amount;
  saveMaterials(m);
}

// ─── Star Dust from Duplicates ───
// When a duplicate card is acquired, grant Star Dust based on rarity
const DUST_PER_DUPLICATE: Record<CollectionCardRarity, number> = {
  common: 5,
  rare: 15,
  epic: 40,
  legendary: 100,
};

export function getStarDustForDuplicate(rarity: CollectionCardRarity): number {
  return DUST_PER_DUPLICATE[rarity] ?? 5;
}

// ─── Award Tokens from Achievements ───
// Grant tokens based on achievement rarity
const TOKENS_PER_ACHIEVEMENT: Record<string, number> = {
  common: 2,
  uncommon: 5,
  rare: 10,
  epic: 20,
  legendary: 50,
};

export function getAwardTokensForAchievement(rarityLevel?: string): number {
  return TOKENS_PER_ACHIEVEMENT[rarityLevel ?? 'common'] ?? 2;
}

// ─── Fusion System ───
// Combine 2 cards of same role → higher-tier card with merged traits

export interface FusionPair {
  card1: CollectionCardDef;
  card2: CollectionCardDef;
  resultPreview: FusionResult;
  starDustCost: number;
  awardTokenCost: number;
}

export interface FusionResult {
  name: string;
  role: TalentType;
  skill: number;
  genreAffinity: Genre | null;
  trait: string | null;
  traitDesc: string | null;
  rarity: CollectionCardRarity;
}

const FUSION_COSTS: Record<CollectionCardRarity, { starDust: number; awardTokens: number }> = {
  common: { starDust: 20, awardTokens: 5 },
  rare: { starDust: 50, awardTokens: 15 },
  epic: { starDust: 100, awardTokens: 30 },
  legendary: { starDust: 200, awardTokens: 60 },
};

const NEXT_RARITY: Record<CollectionCardRarity, CollectionCardRarity> = {
  common: 'rare',
  rare: 'epic',
  epic: 'legendary',
  legendary: 'legendary',
};

function fusionPreview(card1: CollectionCardDef, card2: CollectionCardDef): FusionResult {
  const higherRarity = NEXT_RARITY[
    card1.rarity === card2.rarity ? card1.rarity :
    (['common', 'rare', 'epic', 'legendary'].indexOf(card1.rarity) >
     ['common', 'rare', 'epic', 'legendary'].indexOf(card2.rarity) ? card1.rarity : card2.rarity)
  ];

  // Merge traits: pick the more interesting one, combine flavor
  const primaryTrait = card1.trait || card2.trait;
  const secondaryTrait = card2.trait && card1.trait && card2.trait !== card1.trait ? card2.trait : null;
  const mergedTrait = secondaryTrait ? `${primaryTrait} + ${secondaryTrait}` : primaryTrait;
  const mergedDesc = [card1.traitDesc, card2.traitDesc].filter(Boolean).join(' · ') || null;

  return {
    name: `${card1.name} × ${card2.name}`,
    role: card1.role,
    skill: Math.min(7, Math.round((card1.skill + card2.skill) / 2) + 1),
    genreAffinity: card1.genreAffinity || card2.genreAffinity,
    trait: mergedTrait,
    traitDesc: mergedDesc,
    rarity: higherRarity,
  };
}

/** Get all compatible fusion pairs from player's collection */
export function getCompatibleFusionPairs(): FusionPair[] {
  const catalog = getCardCatalog();
  const collection = getCollection();
  const catalogMap = new Map(catalog.map(c => [c.id, c]));

  // Get owned cards (must have at least 1 copy)
  const owned = Object.entries(collection.entries)
    .filter(([, e]) => e.timesAcquired >= 1)
    .map(([id]) => catalogMap.get(id))
    .filter((c): c is CollectionCardDef => !!c);

  const pairs: FusionPair[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < owned.length; i++) {
    for (let j = i + 1; j < owned.length; j++) {
      const a = owned[i], b = owned[j];
      if (a.role !== b.role) continue;
      // Both must be same role, neither legendary already (can't fuse beyond legendary)
      if (a.rarity === 'legendary' && b.rarity === 'legendary') continue;

      const key = [a.id, b.id].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);

      const lowerRarity = ['common', 'rare', 'epic', 'legendary'].indexOf(a.rarity) <=
                          ['common', 'rare', 'epic', 'legendary'].indexOf(b.rarity) ? a.rarity : b.rarity;
      const costs = FUSION_COSTS[lowerRarity];

      pairs.push({
        card1: a,
        card2: b,
        resultPreview: fusionPreview(a, b),
        starDustCost: costs.starDust,
        awardTokenCost: costs.awardTokens,
      });
    }
  }

  return pairs;
}

/** Execute a fusion. Returns the fused result or null if can't afford. */
export function executeFusion(card1Id: string, card2Id: string): FusionResult | null {
  const pairs = getCompatibleFusionPairs();
  const pair = pairs.find(p =>
    (p.card1.id === card1Id && p.card2.id === card2Id) ||
    (p.card1.id === card2Id && p.card2.id === card1Id)
  );
  if (!pair) return null;

  const mats = loadMaterials();
  if (mats.starDust < pair.starDustCost || mats.awardTokens < pair.awardTokenCost) return null;

  mats.starDust -= pair.starDustCost;
  mats.awardTokens -= pair.awardTokenCost;
  saveMaterials(mats);

  // Record fusion in history
  recordCraftingAction('fusion', `${card1Id} + ${card2Id} → ${pair.resultPreview.name}`);

  return pair.resultPreview;
}

// ─── Reroll System ───
// Spend currency to reroll a card's secondary trait

export interface RerollOption {
  cardId: string;
  card: CollectionCardDef;
  currentTrait: string | null;
  possibleTraits: string[];
  starDustCost: number;
}

const REROLL_COST: Record<CollectionCardRarity, number> = {
  common: 10,
  rare: 25,
  epic: 50,
  legendary: 100,
};

const TRAIT_POOL: Record<TalentType, string[]> = {
  Lead: ['Method Actor', 'Box Office Draw', 'Versatile', 'Scene Stealer', 'Dramatic Range', 'Comedic Timing', 'Physical Performer', 'Voice Artist'],
  Support: ['Character Actor', 'Scene Stealer', 'Ensemble Player', 'Improvisator', 'Dramatic Range', 'Comedic Timing', 'Veteran Presence', 'Rising Star'],
  Director: ['Visionary', 'Actor\'s Director', 'Perfectionist', 'Crowd Pleaser', 'Auteur', 'Genre Master', 'Fast Worker', 'VFX Wizard'],
  Crew: ['Technical Wizard', 'Budget Savvy', 'Award Magnet', 'Versatile', 'Reliable', 'Innovative', 'Efficient', 'Detail Oriented'],
};

/** Get reroll options for all owned cards */
export function getRerollOptions(): RerollOption[] {
  const catalog = getCardCatalog();
  const collection = getCollection();
  const catalogMap = new Map(catalog.map(c => [c.id, c]));

  return Object.entries(collection.entries)
    .filter(([, e]) => e.timesAcquired >= 1)
    .map(([id]) => catalogMap.get(id))
    .filter((c): c is CollectionCardDef => !!c)
    .map(card => ({
      cardId: card.id,
      card,
      currentTrait: card.trait,
      possibleTraits: (TRAIT_POOL[card.role] || []).filter(t => t !== card.trait),
      starDustCost: REROLL_COST[card.rarity],
    }));
}

/** Execute a reroll. Returns the new trait or null. */
export function executeReroll(cardId: string): string | null {
  const options = getRerollOptions();
  const opt = options.find(o => o.cardId === cardId);
  if (!opt || opt.possibleTraits.length === 0) return null;

  const mats = loadMaterials();
  if (mats.starDust < opt.starDustCost) return null;

  mats.starDust -= opt.starDustCost;
  saveMaterials(mats);

  const newTrait = opt.possibleTraits[Math.floor(Math.random() * opt.possibleTraits.length)];
  recordCraftingAction('reroll', `${cardId}: ${opt.currentTrait} → ${newTrait}`);
  return newTrait;
}

// ─── Enhancement System ───
// Boost a card's star rating by 0.5 (max once per card)

export interface EnhanceOption {
  cardId: string;
  card: CollectionCardDef;
  currentSkill: number;
  newSkill: number;
  starDustCost: number;
  awardTokenCost: number;
  alreadyEnhanced: boolean;
}

const ENHANCE_COSTS: Record<CollectionCardRarity, { starDust: number; awardTokens: number }> = {
  common: { starDust: 15, awardTokens: 3 },
  rare: { starDust: 35, awardTokens: 8 },
  epic: { starDust: 75, awardTokens: 20 },
  legendary: { starDust: 150, awardTokens: 45 },
};

const ENHANCED_KEY = 'greenlight-enhanced-cards';

function getEnhancedCards(): Set<string> {
  try {
    const raw = localStorage.getItem(ENHANCED_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

function saveEnhancedCards(set: Set<string>): void {
  localStorage.setItem(ENHANCED_KEY, JSON.stringify([...set]));
}

/** Get enhancement options for all owned cards */
export function getEnhanceOptions(): EnhanceOption[] {
  const catalog = getCardCatalog();
  const collection = getCollection();
  const catalogMap = new Map(catalog.map(c => [c.id, c]));
  const enhanced = getEnhancedCards();

  return Object.entries(collection.entries)
    .filter(([, e]) => e.timesAcquired >= 1)
    .map(([id]) => catalogMap.get(id))
    .filter((c): c is CollectionCardDef => !!c)
    .map(card => {
      const costs = ENHANCE_COSTS[card.rarity];
      const alreadyEnhanced = enhanced.has(card.id);
      return {
        cardId: card.id,
        card,
        currentSkill: card.skill + (alreadyEnhanced ? 0.5 : 0),
        newSkill: card.skill + 0.5,
        starDustCost: costs.starDust,
        awardTokenCost: costs.awardTokens,
        alreadyEnhanced,
      };
    });
}

/** Execute enhancement. Returns true on success. */
export function executeEnhance(cardId: string): boolean {
  const enhanced = getEnhancedCards();
  if (enhanced.has(cardId)) return false;

  const options = getEnhanceOptions();
  const opt = options.find(o => o.cardId === cardId);
  if (!opt || opt.alreadyEnhanced) return false;

  const mats = loadMaterials();
  if (mats.starDust < opt.starDustCost || mats.awardTokens < opt.awardTokenCost) return false;

  mats.starDust -= opt.starDustCost;
  mats.awardTokens -= opt.awardTokenCost;
  saveMaterials(mats);

  enhanced.add(cardId);
  saveEnhancedCards(enhanced);

  recordCraftingAction('enhance', `${cardId}: ★${opt.currentSkill} → ★${opt.newSkill}`);
  return true;
}

export function isCardEnhanced(cardId: string): boolean {
  return getEnhancedCards().has(cardId);
}

// ─── Crafting History ───

export interface CraftingHistoryEntry {
  type: 'fusion' | 'reroll' | 'enhance';
  description: string;
  timestamp: string;
}

const HISTORY_KEY = 'greenlight-crafting-history';

function recordCraftingAction(type: CraftingHistoryEntry['type'], description: string): void {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const history: CraftingHistoryEntry[] = raw ? JSON.parse(raw) : [];
    history.unshift({ type, description, timestamp: new Date().toISOString() });
    // Keep last 50
    if (history.length > 50) history.length = 50;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch { /* ignore */ }
}

export function getCraftingHistory(): CraftingHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

// ─── Summary Stats ───

export function getCraftingStats(): {
  totalFusions: number;
  totalRerolls: number;
  totalEnhancements: number;
  materials: CraftingMaterials;
} {
  const history = getCraftingHistory();
  const materials = loadMaterials();
  return {
    totalFusions: history.filter(h => h.type === 'fusion').length,
    totalRerolls: history.filter(h => h.type === 'reroll').length,
    totalEnhancements: history.filter(h => h.type === 'enhance').length,
    materials,
  };
}
