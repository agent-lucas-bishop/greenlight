// ─── WORKSHOP: Custom Crew Card Creator ───
// R230: Design custom crew cards with balance constraints

import type { Genre, CardAbility, CardTemplate } from './types';

// ─── TYPES ───

export type CrewRole = 'Director' | 'Actor' | 'Writer' | 'Cinematographer' | 'Composer';
export type CrewRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface CrewCard {
  id: string;
  name: string;
  role: CrewRole;
  genreAffinities: Genre[]; // 1-3
  qualityBonusMin: number;
  qualityBonusMax: number;
  salaryMin: number;
  salaryMax: number;
  ability: CardAbility | 'none';
  rarity: CrewRarity;
  flavorText: string;
  enabled: boolean; // include in card pool for runs
  createdAt: number;
  // computed at save time
  powerBudget: number;
  balanceRating: BalanceRating;
}

export type BalanceRating = 'fair' | 'strong' | 'overpowered';

// ─── CONSTANTS ───

export const CREW_ROLES: CrewRole[] = ['Director', 'Actor', 'Writer', 'Cinematographer', 'Composer'];
export const RARITIES: CrewRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const ALL_GENRES: Genre[] = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];
export const ABILITY_POOL: (CardAbility | 'none')[] = ['none', 'combo', 'momentum', 'wildcard', 'insurance', 'spotlight'];

export const RARITY_COLORS: Record<CrewRarity, string> = {
  common: '#888',
  uncommon: '#4a9',
  rare: '#48f',
  epic: '#a4f',
  legendary: '#fa4',
};

export const ROLE_EMOJI: Record<CrewRole, string> = {
  Director: '🎬',
  Actor: '🎭',
  Writer: '✍️',
  Cinematographer: '📷',
  Composer: '🎵',
};

// ─── POWER BUDGET PER RARITY ───

const POWER_BUDGET: Record<CrewRarity, number> = {
  common: 8,
  uncommon: 12,
  rare: 16,
  epic: 22,
  legendary: 28,
};

// Ability cost scales with rarity
const ABILITY_COST: Record<CardAbility, number> = {
  combo: 3,
  momentum: 2,
  wildcard: 4,
  insurance: 2,
  spotlight: 3,
};

// ─── POWER CALCULATION ───

export function calculatePowerUsed(card: Partial<CrewCard>): number {
  let power = 0;
  // Quality: average of min/max, scaled
  const avgQuality = ((card.qualityBonusMin || 0) + (card.qualityBonusMax || 0)) / 2;
  power += avgQuality * 3;
  // Salary: lower salary = more power used (inverted)
  const avgSalary = ((card.salaryMin || 1) + (card.salaryMax || 1)) / 2;
  power += Math.max(0, (6 - avgSalary)) * 1.5;
  // Genre affinities
  power += (card.genreAffinities?.length || 0) * 1.5;
  // Ability
  if (card.ability && card.ability !== 'none') {
    power += ABILITY_COST[card.ability] || 0;
  }
  return Math.round(power * 10) / 10;
}

export function getPowerBudget(rarity: CrewRarity): number {
  return POWER_BUDGET[rarity];
}

export function getBalanceRating(card: Partial<CrewCard>): BalanceRating {
  const used = calculatePowerUsed(card);
  const budget = getPowerBudget(card.rarity || 'common');
  const ratio = used / budget;
  if (ratio <= 1.0) return 'fair';
  if (ratio <= 1.3) return 'strong';
  return 'overpowered';
}

export function getBalanceColor(rating: BalanceRating): string {
  switch (rating) {
    case 'fair': return '#4a4';
    case 'strong': return '#da4';
    case 'overpowered': return '#d44';
  }
}

// ─── VALIDATION ───

export interface ValidationError {
  field: string;
  message: string;
}

export function validateCrewCard(card: Partial<CrewCard>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!card.name?.trim()) errors.push({ field: 'name', message: 'Name is required' });
  if ((card.name?.length || 0) > 30) errors.push({ field: 'name', message: 'Name must be ≤30 characters' });
  if (!card.role) errors.push({ field: 'role', message: 'Role is required' });
  if (!card.genreAffinities?.length) errors.push({ field: 'genres', message: 'Pick at least 1 genre affinity' });
  if ((card.genreAffinities?.length || 0) > 3) errors.push({ field: 'genres', message: 'Max 3 genre affinities' });

  const qMin = card.qualityBonusMin ?? 0;
  const qMax = card.qualityBonusMax ?? 0;
  if (qMin < 0 || qMin > 5) errors.push({ field: 'qualityMin', message: 'Quality min must be 0-5' });
  if (qMax < 0 || qMax > 8) errors.push({ field: 'qualityMax', message: 'Quality max must be 0-8' });
  if (qMin > qMax) errors.push({ field: 'quality', message: 'Min quality cannot exceed max' });

  const sMin = card.salaryMin ?? 1;
  const sMax = card.salaryMax ?? 1;
  if (sMin < 1 || sMin > 10) errors.push({ field: 'salaryMin', message: 'Salary min must be 1-10' });
  if (sMax < 1 || sMax > 15) errors.push({ field: 'salaryMax', message: 'Salary max must be 1-15' });
  if (sMin > sMax) errors.push({ field: 'salary', message: 'Min salary cannot exceed max' });

  // Legendary balance constraint: can't have max quality AND low salary
  if (card.rarity === 'legendary') {
    if (qMax >= 7 && sMax <= 3) {
      errors.push({ field: 'balance', message: 'Legendary cards can\'t have both max quality AND low salary' });
    }
  }

  // Ability power scales with rarity
  if (card.ability && card.ability !== 'none') {
    const abilityPower = ABILITY_COST[card.ability];
    const rarityIdx = RARITIES.indexOf(card.rarity || 'common');
    if (abilityPower >= 4 && rarityIdx < 2) {
      errors.push({ field: 'ability', message: `${card.ability} ability requires at least rare rarity` });
    }
  }

  if ((card.flavorText?.length || 0) > 120) errors.push({ field: 'flavorText', message: 'Flavor text must be ≤120 characters' });

  return errors;
}

// ─── STORAGE ───

const STORAGE_KEY = 'greenlight-custom-cards';

export function getWorkshopCards(): CrewCard[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

export function saveWorkshopCards(cards: CrewCard[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function addWorkshopCard(card: CrewCard): CrewCard {
  const cards = getWorkshopCards();
  card.id = `crew_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  card.createdAt = Date.now();
  card.powerBudget = calculatePowerUsed(card);
  card.balanceRating = getBalanceRating(card);
  cards.push(card);
  saveWorkshopCards(cards);
  return card;
}

export function updateWorkshopCard(card: CrewCard) {
  const cards = getWorkshopCards();
  card.powerBudget = calculatePowerUsed(card);
  card.balanceRating = getBalanceRating(card);
  const idx = cards.findIndex(c => c.id === card.id);
  if (idx >= 0) { cards[idx] = card; saveWorkshopCards(cards); }
}

export function deleteWorkshopCard(id: string) {
  saveWorkshopCards(getWorkshopCards().filter(c => c.id !== id));
}

export function toggleWorkshopCardEnabled(id: string) {
  const cards = getWorkshopCards();
  const card = cards.find(c => c.id === id);
  if (card) { card.enabled = !card.enabled; saveWorkshopCards(cards); }
}

// ─── IMPORT / EXPORT (base64) ───

export function exportCard(card: CrewCard): string {
  const json = JSON.stringify(card);
  return btoa(unescape(encodeURIComponent(json)));
}

export function importCard(base64: string): { card: CrewCard | null; error: string | null } {
  try {
    const json = decodeURIComponent(escape(atob(base64.trim())));
    const card = JSON.parse(json) as CrewCard;
    if (!card.name || !card.role || !card.rarity) {
      return { card: null, error: 'Invalid card data' };
    }
    const errors = validateCrewCard(card);
    if (errors.length) return { card: null, error: errors.map(e => e.message).join(', ') };
    // Assign new ID
    card.id = `crew_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    card.createdAt = Date.now();
    card.enabled = false;
    card.powerBudget = calculatePowerUsed(card);
    card.balanceRating = getBalanceRating(card);
    return { card, error: null };
  } catch {
    return { card: null, error: 'Invalid base64 string' };
  }
}

// ─── CONVERT TO GAME CARD TEMPLATE ───

export function crewCardToCardTemplate(card: CrewCard): CardTemplate {
  const avgQuality = (card.qualityBonusMin + card.qualityBonusMax) / 2;
  // OP penalty: -10% quality for overpowered cards
  const opPenalty = card.balanceRating === 'overpowered' ? 0.9 : 1.0;
  const finalQuality = Math.round(avgQuality * opPenalty * 10) / 10;

  return {
    name: `${card.name} (${card.role})`,
    cardType: 'action',
    baseQuality: finalQuality,
    synergyText: card.flavorText || `Custom ${card.role}`,
    synergyCondition: card.genreAffinities.length > 0
      ? (_ctx) => ({ bonus: 1, description: `${card.name} genre affinity bonus` })
      : null,
    riskTag: '🟢',
    tags: undefined,
  };
}

export function getEnabledWorkshopCards(): CrewCard[] {
  return getWorkshopCards().filter(c => c.enabled);
}

// ─── BLANK CARD FACTORY ───

export function createBlankCrewCard(): CrewCard {
  return {
    id: '',
    name: '',
    role: 'Actor',
    genreAffinities: [],
    qualityBonusMin: 1,
    qualityBonusMax: 3,
    salaryMin: 2,
    salaryMax: 5,
    ability: 'none',
    rarity: 'common',
    flavorText: '',
    enabled: true,
    createdAt: 0,
    powerBudget: 0,
    balanceRating: 'fair',
  };
}
