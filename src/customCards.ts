// ─── CUSTOM CARD CREATOR & MODDING SUPPORT ───
// R194: Let players design their own script/talent/event cards

import type { Genre, CardTag, CardTemplate, SlotType, TalentType } from './types';

// ─── TYPES ───

export type CustomCardType = 'script' | 'talent' | 'event';

export interface CustomCardEffect {
  qualityBonus: number;       // flat quality bonus per card (-3 to +5)
  boxOfficeMultiplier: number; // BO multiplier (0.8 to 1.5)
  budgetMod: number;          // budget modifier in $M (-3 to +3)
  extraSlots: number;         // extra talent slots (0 to 2)
}

export interface CustomScript {
  id: string;
  type: 'script';
  name: string;
  description: string;
  genre: Genre;
  cost: number;
  baseScore: number;
  slots: SlotType[];
  cardEffect: CustomCardEffect;
  tags: CardTag[];
  active: boolean;
  createdAt: number;
}

export interface CustomTalent {
  id: string;
  type: 'talent';
  name: string;
  description: string;
  talentType: TalentType;
  skill: number;
  cost: number;
  cardEffect: CustomCardEffect;
  tags: CardTag[];
  active: boolean;
  createdAt: number;
}

export interface CustomEvent {
  id: string;
  type: 'event';
  name: string;
  description: string;
  cardEffect: CustomCardEffect;
  tags: CardTag[];
  active: boolean;
  createdAt: number;
}

export type CustomCard = CustomScript | CustomTalent | CustomEvent;

// ─── DEFAULTS ───

export const DEFAULT_EFFECT: CustomCardEffect = {
  qualityBonus: 0,
  boxOfficeMultiplier: 1.0,
  budgetMod: 0,
  extraSlots: 0,
};

// ─── BALANCE VALIDATION ───

export type BalanceRating = 'underpowered' | 'balanced' | 'overpowered';

export function getBalanceScore(card: CustomCard): number {
  const e = card.cardEffect;
  let score = e.qualityBonus * 2 + (e.boxOfficeMultiplier - 1) * 10 + e.budgetMod * -1 + e.extraSlots * 3;
  if (card.type === 'script') score += card.baseScore * 0.5;
  if (card.type === 'talent') score += card.skill * 0.8;
  const cost = card.type === 'event' ? 3 : card.cost;
  return score - cost * 0.6;
}

export function getBalanceRating(card: CustomCard): BalanceRating {
  const s = getBalanceScore(card);
  if (s < -2) return 'underpowered';
  if (s > 4) return 'overpowered';
  return 'balanced';
}

export function getBalanceLabel(rating: BalanceRating): { emoji: string; label: string; color: string } {
  switch (rating) {
    case 'underpowered': return { emoji: '⬇️', label: 'Underpowered', color: '#6688cc' };
    case 'balanced': return { emoji: '⚖️', label: 'Balanced', color: '#66cc66' };
    case 'overpowered': return { emoji: '⬆️', label: 'Overpowered', color: '#cc6644' };
  }
}

// ─── VALIDATION ───

export interface ValidationError {
  field: string;
  message: string;
}

export function validateCard(card: CustomCard): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!card.name.trim()) errors.push({ field: 'name', message: 'Name is required' });
  if (card.name.length > 40) errors.push({ field: 'name', message: 'Name must be ≤40 characters' });
  if (card.description.length > 200) errors.push({ field: 'description', message: 'Description must be ≤200 characters' });
  
  const e = card.cardEffect;
  if (e.qualityBonus < -3 || e.qualityBonus > 5) errors.push({ field: 'qualityBonus', message: 'Quality bonus must be -3 to +5' });
  if (e.boxOfficeMultiplier < 0.5 || e.boxOfficeMultiplier > 2.0) errors.push({ field: 'boxOfficeMultiplier', message: 'BO multiplier must be 0.5x to 2.0x' });
  if (e.budgetMod < -5 || e.budgetMod > 5) errors.push({ field: 'budgetMod', message: 'Budget mod must be -5 to +5' });
  if (e.extraSlots < 0 || e.extraSlots > 2) errors.push({ field: 'extraSlots', message: 'Extra slots must be 0-2' });

  if (card.type === 'script') {
    if (card.cost < 1 || card.cost > 15) errors.push({ field: 'cost', message: 'Script cost must be 1-15' });
    if (card.baseScore < 0 || card.baseScore > 10) errors.push({ field: 'baseScore', message: 'Base score must be 0-10' });
  }
  if (card.type === 'talent') {
    if (card.cost < 1 || card.cost > 12) errors.push({ field: 'cost', message: 'Talent cost must be 1-12' });
    if (card.skill < 1 || card.skill > 5) errors.push({ field: 'skill', message: 'Skill must be 1-5' });
  }

  return errors;
}

// ─── STORAGE (localStorage CRUD) ───

const STORAGE_KEY = 'greenlight_custom_cards';
const SETTINGS_KEY = 'greenlight_custom_cards_settings';

export interface CustomCardSettings {
  enabled: boolean;
  mode: 'mixed' | 'custom-only';
}

export function getSettings(): CustomCardSettings {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') as CustomCardSettings;
  } catch { return { enabled: false, mode: 'mixed' }; }
}

export function saveSettings(s: CustomCardSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function getAllCustomCards(): CustomCard[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

export function saveAllCustomCards(cards: CustomCard[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function addCustomCard(card: CustomCard): CustomCard {
  const cards = getAllCustomCards();
  card.id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  card.createdAt = Date.now();
  cards.push(card);
  saveAllCustomCards(cards);
  return card;
}

export function updateCustomCard(card: CustomCard) {
  const cards = getAllCustomCards();
  const idx = cards.findIndex(c => c.id === card.id);
  if (idx >= 0) { cards[idx] = card; saveAllCustomCards(cards); }
}

export function deleteCustomCard(id: string) {
  saveAllCustomCards(getAllCustomCards().filter(c => c.id !== id));
}

export function toggleCardActive(id: string) {
  const cards = getAllCustomCards();
  const card = cards.find(c => c.id === id);
  if (card) { card.active = !card.active; saveAllCustomCards(cards); }
}

// ─── IMPORT / EXPORT ───

export function exportCustomCards(): string {
  return JSON.stringify(getAllCustomCards(), null, 2);
}

export function importCustomCards(json: string): { imported: number; errors: string[] } {
  const errors: string[] = [];
  let parsed: unknown[];
  try { parsed = JSON.parse(json); } catch { return { imported: 0, errors: ['Invalid JSON'] }; }
  if (!Array.isArray(parsed)) return { imported: 0, errors: ['Expected an array'] };

  const existing = getAllCustomCards();
  let imported = 0;
  for (const raw of parsed) {
    const card = raw as CustomCard;
    if (!card.type || !card.name) { errors.push(`Skipped invalid card`); continue; }
    card.id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    card.createdAt = Date.now();
    card.active = false;
    const valErrors = validateCard(card);
    if (valErrors.length) { errors.push(`"${card.name}": ${valErrors.map(e => e.message).join(', ')}`); continue; }
    existing.push(card);
    imported++;
  }
  saveAllCustomCards(existing);
  return { imported, errors };
}

// ─── CONVERT TO GAME TYPES ───

export function customCardToCardTemplate(card: CustomCard): CardTemplate {
  const e = card.cardEffect;
  return {
    name: card.name,
    cardType: 'action',
    baseQuality: e.qualityBonus,
    synergyText: card.description || 'Custom card',
    synergyCondition: e.boxOfficeMultiplier !== 1 || e.budgetMod !== 0
      ? () => ({ bonus: 0, multiply: e.boxOfficeMultiplier, budgetMod: e.budgetMod, description: card.description })
      : null,
    riskTag: '🟢',
    tags: card.tags.length ? card.tags : undefined,
    budgetMod: e.budgetMod || undefined,
  };
}

export function getActiveCustomScripts(): CustomScript[] {
  return getAllCustomCards().filter((c): c is CustomScript => c.type === 'script' && c.active);
}

export function getActiveCustomTalents(): CustomTalent[] {
  return getAllCustomCards().filter((c): c is CustomTalent => c.type === 'talent' && c.active);
}

// ─── TEMPLATE FACTORIES ───

export function createBlankScript(): CustomScript {
  return {
    id: '', type: 'script', name: '', description: '', genre: 'Action',
    cost: 3, baseScore: 5, slots: ['Lead', 'Support', 'Director'],
    cardEffect: { ...DEFAULT_EFFECT }, tags: [], active: true, createdAt: 0,
  };
}

export function createBlankTalent(): CustomTalent {
  return {
    id: '', type: 'talent', name: '', description: '', talentType: 'Lead',
    skill: 2, cost: 3, cardEffect: { ...DEFAULT_EFFECT }, tags: [],
    active: true, createdAt: 0,
  };
}

export function createBlankEvent(): CustomEvent {
  return {
    id: '', type: 'event', name: '', description: '',
    cardEffect: { ...DEFAULT_EFFECT }, tags: [], active: true, createdAt: 0,
  };
}
