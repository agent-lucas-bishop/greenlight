// ─── MODDING & CUSTOM CONTENT SYSTEM ───
// R205: Mod packs with custom cards, events, genres, and talent

import type { Genre, CardTag, SlotType, TalentType } from './types';
import type { CustomCard, CustomScript, CustomTalent, CustomEvent, CustomCardEffect } from './customCards';
import { DEFAULT_EFFECT, validateCard } from './customCards';

// ─── MOD PACK SCHEMA ───

export interface ModPack {
  id: string;
  name: string;
  author: string;
  version: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  cards: CustomCard[];
  genres: ModGenre[];
  events: ModEvent[];
  enabled: boolean;
}

export interface ModGenre {
  name: string;
  icon: string;       // emoji
  description: string;
}

export interface ModEvent {
  id: string;
  name: string;
  description: string;
  effect: 'bonus' | 'penalty' | 'mixed';
  qualityMod: number;
  budgetMod: number;
  heatMod: number;
}

// ─── SCHEMA VALIDATION ───

export interface ModValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_GENRES: Genre[] = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];
const VALID_TALENT_TYPES: TalentType[] = ['Lead', 'Support', 'Director', 'Crew'];
const VALID_CARD_TYPES = ['script', 'talent', 'event'];

function validateModGenre(g: unknown, idx: number): string[] {
  const errors: string[] = [];
  if (!g || typeof g !== 'object') return [`genres[${idx}]: not an object`];
  const genre = g as Record<string, unknown>;
  if (typeof genre.name !== 'string' || !genre.name) errors.push(`genres[${idx}].name: required string`);
  if (typeof genre.icon !== 'string') errors.push(`genres[${idx}].icon: required string`);
  if (typeof genre.description !== 'string') errors.push(`genres[${idx}].description: required string`);
  return errors;
}

function validateModEvent(e: unknown, idx: number): string[] {
  const errors: string[] = [];
  if (!e || typeof e !== 'object') return [`events[${idx}]: not an object`];
  const ev = e as Record<string, unknown>;
  if (typeof ev.name !== 'string' || !ev.name) errors.push(`events[${idx}].name: required string`);
  if (!['bonus', 'penalty', 'mixed'].includes(ev.effect as string)) errors.push(`events[${idx}].effect: must be bonus|penalty|mixed`);
  if (typeof ev.qualityMod !== 'number') errors.push(`events[${idx}].qualityMod: required number`);
  if (typeof ev.budgetMod !== 'number') errors.push(`events[${idx}].budgetMod: required number`);
  if (typeof ev.heatMod !== 'number') errors.push(`events[${idx}].heatMod: required number`);
  return errors;
}

function validateModCard(c: unknown, idx: number): string[] {
  const errors: string[] = [];
  if (!c || typeof c !== 'object') return [`cards[${idx}]: not an object`];
  const card = c as Record<string, unknown>;
  if (!VALID_CARD_TYPES.includes(card.type as string)) {
    errors.push(`cards[${idx}].type: must be script|talent|event`);
    return errors;
  }
  if (typeof card.name !== 'string' || !card.name) errors.push(`cards[${idx}].name: required`);
  // Delegate deeper validation to customCards.validateCard after hydration
  return errors;
}

export function validateModPack(raw: unknown): ModValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!raw || typeof raw !== 'object') return { valid: false, errors: ['Not a valid object'], warnings };
  const mod = raw as Record<string, unknown>;

  // Required top-level fields
  if (typeof mod.name !== 'string' || !mod.name) errors.push('name: required string');
  if (typeof mod.author !== 'string' || !mod.author) errors.push('author: required string');
  if (typeof mod.version !== 'string' || !mod.version) errors.push('version: required string');
  if (typeof mod.description !== 'string') warnings.push('description: missing, will default to empty');

  // Cards
  if (mod.cards !== undefined) {
    if (!Array.isArray(mod.cards)) {
      errors.push('cards: must be an array');
    } else {
      mod.cards.forEach((c: unknown, i: number) => errors.push(...validateModCard(c, i)));
      if (mod.cards.length > 200) warnings.push(`cards: ${mod.cards.length} cards — large mod pack`);
    }
  }

  // Genres
  if (mod.genres !== undefined) {
    if (!Array.isArray(mod.genres)) {
      errors.push('genres: must be an array');
    } else {
      mod.genres.forEach((g: unknown, i: number) => errors.push(...validateModGenre(g, i)));
    }
  }

  // Events
  if (mod.events !== undefined) {
    if (!Array.isArray(mod.events)) {
      errors.push('events: must be an array');
    } else {
      mod.events.forEach((e: unknown, i: number) => errors.push(...validateModEvent(e, i)));
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── HYDRATION (fill defaults for optional fields) ───

function hydrateCard(raw: Record<string, unknown>): CustomCard {
  const base = {
    id: (raw.id as string) || `mod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: raw.name as string || 'Unnamed',
    description: (raw.description as string) || '',
    tags: (raw.tags as CardTag[]) || [],
    active: true,
    createdAt: (raw.createdAt as number) || Date.now(),
    cardEffect: {
      ...DEFAULT_EFFECT,
      ...(raw.cardEffect as Partial<CustomCardEffect> || {}),
    },
  };

  if (raw.type === 'script') {
    return {
      ...base,
      type: 'script',
      genre: (VALID_GENRES.includes(raw.genre as Genre) ? raw.genre : 'Drama') as Genre,
      cost: (raw.cost as number) || 3,
      baseScore: (raw.baseScore as number) || 5,
      slots: (raw.slots as SlotType[]) || ['Lead', 'Support', 'Director'],
    } as CustomScript;
  }
  if (raw.type === 'talent') {
    return {
      ...base,
      type: 'talent',
      talentType: (VALID_TALENT_TYPES.includes(raw.talentType as TalentType) ? raw.talentType : 'Lead') as TalentType,
      skill: Math.min(5, Math.max(1, (raw.skill as number) || 2)),
      cost: (raw.cost as number) || 3,
    } as CustomTalent;
  }
  return {
    ...base,
    type: 'event',
  } as CustomEvent;
}

function hydrateModPack(raw: Record<string, unknown>): ModPack {
  const now = Date.now();
  return {
    id: (raw.id as string) || `modpack_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name: (raw.name as string) || 'Unnamed Mod',
    author: (raw.author as string) || 'Unknown',
    version: (raw.version as string) || '1.0.0',
    description: (raw.description as string) || '',
    createdAt: (raw.createdAt as number) || now,
    updatedAt: (raw.updatedAt as number) || now,
    cards: Array.isArray(raw.cards) ? raw.cards.map((c: unknown) => hydrateCard(c as Record<string, unknown>)) : [],
    genres: Array.isArray(raw.genres) ? (raw.genres as ModGenre[]) : [],
    events: Array.isArray(raw.events) ? (raw.events as ModEvent[]) : [],
    enabled: false,
  };
}

// ─── STORAGE ───

const MODS_STORAGE_KEY = 'greenlight_mod_packs';

export function getAllModPacks(): ModPack[] {
  try {
    return JSON.parse(localStorage.getItem(MODS_STORAGE_KEY) || '[]');
  } catch { return []; }
}

export function saveAllModPacks(mods: ModPack[]) {
  localStorage.setItem(MODS_STORAGE_KEY, JSON.stringify(mods));
}

export function importModPack(json: string): { mod: ModPack | null; errors: string[]; warnings: string[] } {
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { return { mod: null, errors: ['Invalid JSON'], warnings: [] }; }

  const validation = validateModPack(parsed);
  if (!validation.valid) return { mod: null, errors: validation.errors, warnings: validation.warnings };

  const mod = hydrateModPack(parsed as Record<string, unknown>);
  const mods = getAllModPacks();
  // Replace if same id exists
  const existingIdx = mods.findIndex(m => m.id === mod.id);
  if (existingIdx >= 0) {
    mods[existingIdx] = mod;
  } else {
    mods.push(mod);
  }
  saveAllModPacks(mods);
  return { mod, errors: [], warnings: validation.warnings };
}

export function removeModPack(id: string) {
  saveAllModPacks(getAllModPacks().filter(m => m.id !== id));
}

export function toggleModPack(id: string) {
  const mods = getAllModPacks();
  const mod = mods.find(m => m.id === id);
  if (mod) { mod.enabled = !mod.enabled; saveAllModPacks(mods); }
}

export function exportModPack(id: string): string | null {
  const mod = getAllModPacks().find(m => m.id === id);
  if (!mod) return null;
  return JSON.stringify(mod, null, 2);
}

// ─── MOD SHARING (URL encoding) ───

export function modToShareURL(mod: ModPack): string {
  const json = JSON.stringify(mod);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  const base = window.location.origin + window.location.pathname;
  return `${base}?mod=${encoded}`;
}

export function modFromShareURL(url: string): { mod: ModPack | null; errors: string[] } {
  try {
    const params = new URL(url).searchParams;
    const encoded = params.get('mod');
    if (!encoded) return { mod: null, errors: ['No mod data in URL'] };
    const json = decodeURIComponent(escape(atob(encoded)));
    const parsed = JSON.parse(json);
    const validation = validateModPack(parsed);
    if (!validation.valid) return { mod: null, errors: validation.errors };
    return { mod: hydrateModPack(parsed as Record<string, unknown>), errors: [] };
  } catch (e) {
    return { mod: null, errors: [`Failed to decode: ${(e as Error).message}`] };
  }
}

export function checkURLForMod(): ModPack | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('mod');
    if (!encoded) return null;
    const json = decodeURIComponent(escape(atob(encoded)));
    const parsed = JSON.parse(json);
    const validation = validateModPack(parsed);
    if (!validation.valid) return null;
    return hydrateModPack(parsed as Record<string, unknown>);
  } catch { return null; }
}

// ─── CONVERT CUSTOM CARDS TO MOD PACK ───

export function customCardsToModPack(cards: CustomCard[], name: string, author: string, description: string): ModPack {
  return {
    id: `modpack_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    author,
    version: '1.0.0',
    description,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    cards,
    genres: [],
    events: [],
    enabled: false,
  };
}

// ─── GAME ENGINE INTEGRATION: merge mod content into pools ───

export function getEnabledModCards(): CustomCard[] {
  return getAllModPacks()
    .filter(m => m.enabled)
    .flatMap(m => m.cards);
}

export function getEnabledModScripts(): CustomScript[] {
  return getEnabledModCards().filter((c): c is CustomScript => c.type === 'script');
}

export function getEnabledModTalent(): CustomTalent[] {
  return getEnabledModCards().filter((c): c is CustomTalent => c.type === 'talent');
}

export function getEnabledModEvents(): ModEvent[] {
  return getAllModPacks()
    .filter(m => m.enabled)
    .flatMap(m => m.events);
}

export function getEnabledModGenres(): ModGenre[] {
  return getAllModPacks()
    .filter(m => m.enabled)
    .flatMap(m => m.genres);
}

export function getModStats(): { totalMods: number; enabledMods: number; totalCards: number; totalEvents: number; totalGenres: number } {
  const mods = getAllModPacks();
  const enabled = mods.filter(m => m.enabled);
  return {
    totalMods: mods.length,
    enabledMods: enabled.length,
    totalCards: enabled.reduce((sum, m) => sum + m.cards.length, 0),
    totalEvents: enabled.reduce((sum, m) => sum + m.events.length, 0),
    totalGenres: enabled.reduce((sum, m) => sum + m.genres.length, 0),
  };
}
