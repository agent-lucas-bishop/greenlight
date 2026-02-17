// R247: Card Collection & Trading System
// Tracks every talent card acquired across all runs with foil variants, duplicates, and trading

import { ALL_LEADS, ALL_SUPPORTS, ALL_DIRECTORS, ALL_CREW } from './data';
import type { Talent, TalentType, Genre } from './types';

// ─── Types ───

export type CollectionCardRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CollectionCardDef {
  id: string; // talent name as stable ID
  name: string;
  role: TalentType; // Lead, Support, Director, Crew
  skill: number;
  genreAffinity: Genre | null;
  trait: string | null;
  traitDesc: string | null;
  rarity: CollectionCardRarity;
  flavorText: string;
}

export interface CollectionEntry {
  cardId: string;
  timesAcquired: number;
  firstDiscovered: string; // ISO date
  isFoil: boolean; // has foil variant
  isFavorite: boolean;
  acquisitionHistory: { date: string; runSeason: number; wasFoil: boolean }[];
}

export interface CollectionState {
  entries: Record<string, CollectionEntry>;
  version: number;
}

const STORAGE_KEY = 'greenlight-collection';
const FOIL_CHANCE = 0.05;

// ─── Build Card Catalog from all talents ───

function talentToRarity(t: Omit<Talent, 'id'>): CollectionCardRarity {
  if (t.elite) return 'legendary';
  if (t.skill >= 5) return 'epic';
  if (t.skill >= 4) return 'rare';
  return 'common';
}

function talentToFlavor(t: Omit<Talent, 'id'>): string {
  if (t.traitDesc) return t.traitDesc;
  if (t.trait) return t.trait;
  return `A skilled ${t.type.toLowerCase()} in the film industry.`;
}

function buildCatalog(): CollectionCardDef[] {
  const catalog: CollectionCardDef[] = [];
  const allTalent: { talent: Omit<Talent, 'id'>; role: TalentType }[] = [
    ...ALL_LEADS.map(t => ({ talent: t, role: 'Lead' as TalentType })),
    ...ALL_SUPPORTS.map(t => ({ talent: t, role: 'Support' as TalentType })),
    ...ALL_DIRECTORS.map(t => ({ talent: t, role: 'Director' as TalentType })),
    ...ALL_CREW.map(t => ({ talent: t, role: 'Crew' as TalentType })),
  ];

  const seen = new Set<string>();
  for (const { talent, role } of allTalent) {
    if (seen.has(talent.name)) continue;
    seen.add(talent.name);
    catalog.push({
      id: talent.name,
      name: talent.name,
      role,
      skill: talent.skill,
      genreAffinity: talent.genreBonus?.genre ?? null,
      trait: talent.trait ?? null,
      traitDesc: talent.traitDesc ?? null,
      rarity: talentToRarity(talent),
      flavorText: talentToFlavor(talent),
    });
  }
  return catalog;
}

let _catalog: CollectionCardDef[] | null = null;
export function getCardCatalog(): CollectionCardDef[] {
  if (!_catalog) _catalog = buildCatalog();
  return _catalog;
}

// ─── Persistence ───

function loadCollection(): CollectionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { entries: {}, version: 1 };
}

function saveCollection(state: CollectionState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ─── Public API ───

export function getCollection(): CollectionState {
  return loadCollection();
}

/** Add a card to collection on acquire. Returns { isNew, isFoil } */
export function addCardToCollection(
  talentName: string,
  runSeason: number = 1,
  forceFoil?: boolean
): { isNew: boolean; isFoil: boolean } {
  const state = loadCollection();
  const isFoil = forceFoil ?? Math.random() < FOIL_CHANCE;
  const now = new Date().toISOString();

  const existing = state.entries[talentName];
  if (existing) {
    existing.timesAcquired++;
    if (isFoil) existing.isFoil = true;
    existing.acquisitionHistory.push({ date: now, runSeason, wasFoil: isFoil });
    saveCollection(state);
    return { isNew: false, isFoil };
  }

  state.entries[talentName] = {
    cardId: talentName,
    timesAcquired: 1,
    firstDiscovered: now,
    isFoil,
    isFavorite: false,
    acquisitionHistory: [{ date: now, runSeason, wasFoil: isFoil }],
  };
  saveCollection(state);
  return { isNew: true, isFoil };
}

export function toggleFavorite(cardId: string): boolean {
  const state = loadCollection();
  const entry = state.entries[cardId];
  if (!entry) return false;
  entry.isFavorite = !entry.isFavorite;
  saveCollection(state);
  return entry.isFavorite;
}

export function getCollectionStats(): {
  discovered: number;
  total: number;
  percentage: number;
  foilCount: number;
  favoriteCount: number;
} {
  const catalog = getCardCatalog();
  const state = loadCollection();
  const discovered = Object.keys(state.entries).length;
  const foilCount = Object.values(state.entries).filter(e => e.isFoil).length;
  const favoriteCount = Object.values(state.entries).filter(e => e.isFavorite).length;
  return {
    discovered,
    total: catalog.length,
    percentage: catalog.length > 0 ? Math.round((discovered / catalog.length) * 100) : 0,
    foilCount,
    favoriteCount,
  };
}

/** Get duplicate counts by rarity. Duplicates = timesAcquired - 1 for each card. */
export function getDuplicatesByRarity(): Record<CollectionCardRarity, { cardId: string; duplicates: number }[]> {
  const state = loadCollection();
  const catalog = getCardCatalog();
  const catalogMap = new Map(catalog.map(c => [c.id, c]));

  const result: Record<CollectionCardRarity, { cardId: string; duplicates: number }[]> = {
    common: [],
    rare: [],
    epic: [],
    legendary: [],
  };

  for (const [cardId, entry] of Object.entries(state.entries)) {
    if (entry.timesAcquired <= 1) continue;
    const def = catalogMap.get(cardId);
    if (!def) continue;
    result[def.rarity].push({ cardId, duplicates: entry.timesAcquired - 1 });
  }

  return result;
}

/** Trade 3 duplicates of same rarity for 1 random card of next rarity tier. Returns new card name or null. */
export function tradeDuplicates(rarity: CollectionCardRarity): string | null {
  const nextRarityMap: Record<CollectionCardRarity, CollectionCardRarity | null> = {
    common: 'rare',
    rare: 'epic',
    epic: 'legendary',
    legendary: null,
  };
  const nextRarity = nextRarityMap[rarity];
  if (!nextRarity) return null;

  const state = loadCollection();
  const catalog = getCardCatalog();
  const catalogMap = new Map(catalog.map(c => [c.id, c]));

  // Find cards with duplicates of this rarity
  const eligibleCards: string[] = [];
  for (const [cardId, entry] of Object.entries(state.entries)) {
    const def = catalogMap.get(cardId);
    if (!def || def.rarity !== rarity) continue;
    // Each card can contribute (timesAcquired - 1) duplicates
    for (let i = 0; i < entry.timesAcquired - 1; i++) {
      eligibleCards.push(cardId);
    }
  }

  if (eligibleCards.length < 3) return null;

  // Consume 3 duplicates (prefer spreading across different cards)
  const consumed = new Map<string, number>();
  let remaining = 3;
  for (const cardId of eligibleCards) {
    if (remaining <= 0) break;
    consumed.set(cardId, (consumed.get(cardId) || 0) + 1);
    remaining--;
  }

  for (const [cardId, count] of consumed) {
    state.entries[cardId].timesAcquired -= count;
  }

  // Pick random card of next rarity tier
  const nextTierCards = catalog.filter(c => c.rarity === nextRarity);
  if (nextTierCards.length === 0) { saveCollection(state); return null; }
  const picked = nextTierCards[Math.floor(Math.random() * nextTierCards.length)];

  // Add to collection
  const now = new Date().toISOString();
  const existing = state.entries[picked.id];
  if (existing) {
    existing.timesAcquired++;
    existing.acquisitionHistory.push({ date: now, runSeason: 0, wasFoil: false });
  } else {
    state.entries[picked.id] = {
      cardId: picked.id,
      timesAcquired: 1,
      firstDiscovered: now,
      isFoil: false,
      isFavorite: false,
      acquisitionHistory: [{ date: now, runSeason: 0, wasFoil: false }],
    };
  }

  saveCollection(state);
  return picked.id;
}

/** Check tradeable: has at least 3 duplicates of given rarity */
export function canTrade(rarity: CollectionCardRarity): boolean {
  const nextRarityMap: Record<CollectionCardRarity, CollectionCardRarity | null> = {
    common: 'rare', rare: 'epic', epic: 'legendary', legendary: null,
  };
  if (!nextRarityMap[rarity]) return false;

  const state = loadCollection();
  const catalog = getCardCatalog();
  const catalogMap = new Map(catalog.map(c => [c.id, c]));
  let totalDupes = 0;
  for (const [cardId, entry] of Object.entries(state.entries)) {
    const def = catalogMap.get(cardId);
    if (!def || def.rarity !== rarity) continue;
    totalDupes += Math.max(0, entry.timesAcquired - 1);
  }
  return totalDupes >= 3;
}

/** Get related cards (same role or genre affinity) */
export function getRelatedCards(cardId: string): CollectionCardDef[] {
  const catalog = getCardCatalog();
  const card = catalog.find(c => c.id === cardId);
  if (!card) return [];
  return catalog.filter(c =>
    c.id !== cardId && (c.role === card.role || (card.genreAffinity && c.genreAffinity === card.genreAffinity))
  ).slice(0, 6);
}

// ─── Achievement hooks ───

export function checkCollectionMilestones(): string[] {
  const stats = getCollectionStats();
  const milestones: string[] = [];
  if (stats.discovered >= 10) milestones.push('collector_10');
  if (stats.discovered >= 25) milestones.push('collector_25');
  if (stats.discovered >= 50) milestones.push('collector_50');
  if (stats.percentage >= 100) milestones.push('collector_complete');
  if (stats.foilCount >= 5) milestones.push('foil_collector');
  if (stats.foilCount >= 20) milestones.push('foil_hoarder');
  return milestones;
}
