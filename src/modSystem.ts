// ─── MOD SYSTEM ───
// R275: Enhanced mod loading, management, validation, conflict detection
// Uses glm_ prefix for base64-encoded mod sharing

import type { Genre, CardTag, SlotType, TalentType, CardRarity } from './types';

// ─── MOD CONTENT TYPES ───

export interface ModTalentCard {
  id: string;
  name: string;
  role: TalentType;
  rarity: CardRarity;
  starRating: number; // 1-5
  trait: string;
  genreAffinity: Genre | null;
  tags: CardTag[];
}

export interface ModNarrativeEvent {
  id: string;
  title: string;
  description: string;
  choices: ModEventChoice[];
}

export interface ModEventChoice {
  label: string;
  outcome: ModEventOutcome;
}

export interface ModEventOutcome {
  description: string;
  budgetMod: number;      // -5 to +5
  qualityMod: number;     // -5 to +5
  reputationMod: number;  // -3 to +3
}

export interface ModGenre {
  id: string;
  name: string;
  icon: string;
  description: string;
  boxOfficeCurve: 'linear' | 'exponential' | 'bell' | 'flat';
  baseMult: number; // 0.5 to 2.0
}

export interface ModDifficultyModifier {
  id: string;
  name: string;
  description: string;
  budgetAdjustment: number;     // -10 to +10
  qualityMultiplier: number;    // 0.5 to 2.0
  incidentFrequency: number;    // 0.5 to 2.0
}

export interface ModContent {
  cards: ModTalentCard[];
  events: ModNarrativeEvent[];
  genres: ModGenre[];
  modifiers: ModDifficultyModifier[];
}

export interface GameMod {
  id: string;
  name: string;
  author: string;
  version: string;
  description: string;
  content: ModContent;
  createdAt: number;
  updatedAt: number;
  enabled: boolean;
}

// ─── VALIDATION ───

export interface ModValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_GENRES: Genre[] = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];
const VALID_ROLES: TalentType[] = ['Lead', 'Support', 'Director', 'Crew'];
const VALID_RARITIES: CardRarity[] = ['common', 'rare', 'epic'];
const VALID_CURVES = ['linear', 'exponential', 'bell', 'flat'];

const MAX_STAT_BONUS = 5;
const MAX_BUDGET_MOD = 10;
const MAX_QUALITY_MULT = 2.0;
const MIN_QUALITY_MULT = 0.5;
const MAX_ACTIVE_MODS = 5;

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function validateCard(c: unknown, idx: number): string[] {
  const errors: string[] = [];
  if (!c || typeof c !== 'object') return [`cards[${idx}]: not an object`];
  const card = c as Record<string, unknown>;
  if (typeof card.name !== 'string' || !card.name.trim()) errors.push(`cards[${idx}].name: required`);
  if (typeof card.name === 'string' && card.name.length > 50) errors.push(`cards[${idx}].name: max 50 chars`);
  if (!VALID_ROLES.includes(card.role as TalentType)) errors.push(`cards[${idx}].role: must be Lead|Support|Director|Crew`);
  if (!VALID_RARITIES.includes(card.rarity as CardRarity)) errors.push(`cards[${idx}].rarity: must be common|rare|epic`);
  if (typeof card.starRating !== 'number' || card.starRating < 1 || card.starRating > 5) errors.push(`cards[${idx}].starRating: must be 1-5`);
  if (card.genreAffinity !== null && !VALID_GENRES.includes(card.genreAffinity as Genre)) errors.push(`cards[${idx}].genreAffinity: invalid genre`);
  return errors;
}

function validateEvent(e: unknown, idx: number): string[] {
  const errors: string[] = [];
  if (!e || typeof e !== 'object') return [`events[${idx}]: not an object`];
  const ev = e as Record<string, unknown>;
  if (typeof ev.title !== 'string' || !ev.title.trim()) errors.push(`events[${idx}].title: required`);
  if (!Array.isArray(ev.choices) || ev.choices.length === 0) errors.push(`events[${idx}].choices: need at least 1 choice`);
  if (Array.isArray(ev.choices)) {
    for (let i = 0; i < ev.choices.length; i++) {
      const ch = ev.choices[i] as Record<string, unknown>;
      if (!ch || typeof ch.label !== 'string') errors.push(`events[${idx}].choices[${i}].label: required`);
      if (ch.outcome && typeof ch.outcome === 'object') {
        const out = ch.outcome as Record<string, unknown>;
        if (typeof out.budgetMod === 'number' && Math.abs(out.budgetMod as number) > MAX_BUDGET_MOD)
          errors.push(`events[${idx}].choices[${i}].outcome.budgetMod: capped at ±${MAX_BUDGET_MOD}`);
        if (typeof out.qualityMod === 'number' && Math.abs(out.qualityMod as number) > MAX_STAT_BONUS)
          errors.push(`events[${idx}].choices[${i}].outcome.qualityMod: capped at ±${MAX_STAT_BONUS}`);
      }
    }
  }
  return errors;
}

function validateModGenre(g: unknown, idx: number): string[] {
  const errors: string[] = [];
  if (!g || typeof g !== 'object') return [`genres[${idx}]: not an object`];
  const genre = g as Record<string, unknown>;
  if (typeof genre.name !== 'string' || !genre.name.trim()) errors.push(`genres[${idx}].name: required`);
  if (typeof genre.icon !== 'string') errors.push(`genres[${idx}].icon: required`);
  if (!VALID_CURVES.includes(genre.boxOfficeCurve as string)) errors.push(`genres[${idx}].boxOfficeCurve: must be linear|exponential|bell|flat`);
  if (typeof genre.baseMult === 'number' && (genre.baseMult < MIN_QUALITY_MULT || genre.baseMult > MAX_QUALITY_MULT))
    errors.push(`genres[${idx}].baseMult: must be ${MIN_QUALITY_MULT}-${MAX_QUALITY_MULT}`);
  return errors;
}

function validateModifier(m: unknown, idx: number): string[] {
  const errors: string[] = [];
  if (!m || typeof m !== 'object') return [`modifiers[${idx}]: not an object`];
  const mod = m as Record<string, unknown>;
  if (typeof mod.name !== 'string' || !mod.name.trim()) errors.push(`modifiers[${idx}].name: required`);
  if (typeof mod.budgetAdjustment === 'number' && Math.abs(mod.budgetAdjustment as number) > MAX_BUDGET_MOD)
    errors.push(`modifiers[${idx}].budgetAdjustment: capped at ±${MAX_BUDGET_MOD}`);
  if (typeof mod.qualityMultiplier === 'number') {
    const qm = mod.qualityMultiplier as number;
    if (qm < MIN_QUALITY_MULT || qm > MAX_QUALITY_MULT)
      errors.push(`modifiers[${idx}].qualityMultiplier: must be ${MIN_QUALITY_MULT}-${MAX_QUALITY_MULT}`);
  }
  return errors;
}

export function validateGameMod(raw: unknown): ModValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!raw || typeof raw !== 'object') return { valid: false, errors: ['Not a valid object'], warnings };
  const mod = raw as Record<string, unknown>;

  if (typeof mod.name !== 'string' || !mod.name.trim()) errors.push('name: required');
  if (typeof mod.author !== 'string' || !mod.author.trim()) errors.push('author: required');
  if (typeof mod.version !== 'string' || !mod.version.trim()) errors.push('version: required');
  if (typeof mod.description !== 'string') warnings.push('description: missing');

  const content = mod.content as Record<string, unknown> | undefined;
  if (!content || typeof content !== 'object') {
    errors.push('content: required object');
    return { valid: errors.length === 0, errors, warnings };
  }

  if (Array.isArray(content.cards)) {
    content.cards.forEach((c: unknown, i: number) => errors.push(...validateCard(c, i)));
    if (content.cards.length > 100) warnings.push(`${content.cards.length} cards — large mod`);
  }
  if (Array.isArray(content.events)) {
    content.events.forEach((e: unknown, i: number) => errors.push(...validateEvent(e, i)));
  }
  if (Array.isArray(content.genres)) {
    content.genres.forEach((g: unknown, i: number) => errors.push(...validateModGenre(g, i)));
  }
  if (Array.isArray(content.modifiers)) {
    content.modifiers.forEach((m: unknown, i: number) => errors.push(...validateModifier(m, i)));
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── HYDRATION (sanitize values) ───

function hydrateCard(raw: Record<string, unknown>): ModTalentCard {
  return {
    id: (raw.id as string) || `mc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: ((raw.name as string) || 'Unnamed').slice(0, 50),
    role: (VALID_ROLES.includes(raw.role as TalentType) ? raw.role : 'Lead') as TalentType,
    rarity: (VALID_RARITIES.includes(raw.rarity as CardRarity) ? raw.rarity : 'common') as CardRarity,
    starRating: clamp((raw.starRating as number) || 1, 1, 5),
    trait: ((raw.trait as string) || '').slice(0, 60),
    genreAffinity: VALID_GENRES.includes(raw.genreAffinity as Genre) ? raw.genreAffinity as Genre : null,
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t: unknown) => typeof t === 'string') as CardTag[] : [],
  };
}

function hydrateEvent(raw: Record<string, unknown>): ModNarrativeEvent {
  const choices = Array.isArray(raw.choices) ? (raw.choices as Record<string, unknown>[]).map(ch => ({
    label: ((ch.label as string) || 'Choice').slice(0, 80),
    outcome: {
      description: ((ch.outcome as Record<string, unknown>)?.description as string || '').slice(0, 200),
      budgetMod: clamp(((ch.outcome as Record<string, unknown>)?.budgetMod as number) || 0, -MAX_BUDGET_MOD, MAX_BUDGET_MOD),
      qualityMod: clamp(((ch.outcome as Record<string, unknown>)?.qualityMod as number) || 0, -MAX_STAT_BONUS, MAX_STAT_BONUS),
      reputationMod: clamp(((ch.outcome as Record<string, unknown>)?.reputationMod as number) || 0, -3, 3),
    },
  })) : [];
  return {
    id: (raw.id as string) || `me_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: ((raw.title as string) || 'Untitled').slice(0, 80),
    description: ((raw.description as string) || '').slice(0, 500),
    choices,
  };
}

function hydrateGenre(raw: Record<string, unknown>): ModGenre {
  return {
    id: (raw.id as string) || `mg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: ((raw.name as string) || 'Custom Genre').slice(0, 30),
    icon: ((raw.icon as string) || '🎬').slice(0, 4),
    description: ((raw.description as string) || '').slice(0, 200),
    boxOfficeCurve: VALID_CURVES.includes(raw.boxOfficeCurve as string) ? raw.boxOfficeCurve as ModGenre['boxOfficeCurve'] : 'linear',
    baseMult: clamp((raw.baseMult as number) || 1.0, MIN_QUALITY_MULT, MAX_QUALITY_MULT),
  };
}

function hydrateModifier(raw: Record<string, unknown>): ModDifficultyModifier {
  return {
    id: (raw.id as string) || `mm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: ((raw.name as string) || 'Custom Modifier').slice(0, 50),
    description: ((raw.description as string) || '').slice(0, 200),
    budgetAdjustment: clamp((raw.budgetAdjustment as number) || 0, -MAX_BUDGET_MOD, MAX_BUDGET_MOD),
    qualityMultiplier: clamp((raw.qualityMultiplier as number) || 1.0, MIN_QUALITY_MULT, MAX_QUALITY_MULT),
    incidentFrequency: clamp((raw.incidentFrequency as number) || 1.0, 0.5, 2.0),
  };
}

function hydrateMod(raw: Record<string, unknown>): GameMod {
  const now = Date.now();
  const content = (raw.content as Record<string, unknown>) || {};
  return {
    id: (raw.id as string) || `gm_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name: ((raw.name as string) || 'Unnamed Mod').slice(0, 60),
    author: ((raw.author as string) || 'Unknown').slice(0, 40),
    version: ((raw.version as string) || '1.0.0').slice(0, 20),
    description: ((raw.description as string) || '').slice(0, 300),
    content: {
      cards: Array.isArray(content.cards) ? (content.cards as Record<string, unknown>[]).map(hydrateCard) : [],
      events: Array.isArray(content.events) ? (content.events as Record<string, unknown>[]).map(hydrateEvent) : [],
      genres: Array.isArray(content.genres) ? (content.genres as Record<string, unknown>[]).map(hydrateGenre) : [],
      modifiers: Array.isArray(content.modifiers) ? (content.modifiers as Record<string, unknown>[]).map(hydrateModifier) : [],
    },
    createdAt: (raw.createdAt as number) || now,
    updatedAt: (raw.updatedAt as number) || now,
    enabled: false,
  };
}

// ─── IMPORT/EXPORT (glm_ prefix base64) ───

export function encodeMod(mod: GameMod): string {
  const json = JSON.stringify(mod);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  return `glm_${encoded}`;
}

export function decodeMod(code: string): { mod: GameMod | null; errors: string[]; warnings: string[] } {
  if (!code.startsWith('glm_')) {
    return { mod: null, errors: ['Invalid mod code: must start with glm_'], warnings: [] };
  }
  try {
    const base64 = code.slice(4);
    const json = decodeURIComponent(escape(atob(base64)));
    const parsed = JSON.parse(json);
    const validation = validateGameMod(parsed);
    if (!validation.valid) return { mod: null, errors: validation.errors, warnings: validation.warnings };
    return { mod: hydrateMod(parsed as Record<string, unknown>), errors: [], warnings: validation.warnings };
  } catch (e) {
    return { mod: null, errors: [`Failed to decode: ${(e as Error).message}`], warnings: [] };
  }
}

// ─── STORAGE ───

const MODS_KEY = 'greenlight_game_mods';

export function getAllMods(): GameMod[] {
  try {
    return JSON.parse(localStorage.getItem(MODS_KEY) || '[]');
  } catch { return []; }
}

export function saveAllMods(mods: GameMod[]): void {
  localStorage.setItem(MODS_KEY, JSON.stringify(mods));
}

export function importMod(code: string): { mod: GameMod | null; errors: string[]; warnings: string[] } {
  const result = decodeMod(code);
  if (!result.mod) return result;

  const mods = getAllMods();
  const existingIdx = mods.findIndex(m => m.id === result.mod!.id);
  if (existingIdx >= 0) {
    mods[existingIdx] = result.mod;
  } else {
    mods.push(result.mod);
  }
  saveAllMods(mods);
  return result;
}

export function removeMod(id: string): void {
  saveAllMods(getAllMods().filter(m => m.id !== id));
}

export function toggleMod(id: string): { success: boolean; error?: string } {
  const mods = getAllMods();
  const mod = mods.find(m => m.id === id);
  if (!mod) return { success: false, error: 'Mod not found' };

  if (!mod.enabled) {
    // Check max active
    const activeCount = mods.filter(m => m.enabled).length;
    if (activeCount >= MAX_ACTIVE_MODS) {
      return { success: false, error: `Maximum ${MAX_ACTIVE_MODS} mods can be active at once` };
    }
  }

  mod.enabled = !mod.enabled;
  saveAllMods(mods);
  return { success: true };
}

// ─── CONFLICT DETECTION ───

export interface ModConflict {
  modA: string;
  modB: string;
  type: 'card' | 'event' | 'genre' | 'modifier';
  itemName: string;
}

export function detectConflicts(mods: GameMod[]): ModConflict[] {
  const enabled = mods.filter(m => m.enabled);
  const conflicts: ModConflict[] = [];

  for (let i = 0; i < enabled.length; i++) {
    for (let j = i + 1; j < enabled.length; j++) {
      const a = enabled[i], b = enabled[j];

      // Card name conflicts
      const aCardNames = new Set(a.content.cards.map(c => c.name.toLowerCase()));
      for (const card of b.content.cards) {
        if (aCardNames.has(card.name.toLowerCase())) {
          conflicts.push({ modA: a.name, modB: b.name, type: 'card', itemName: card.name });
        }
      }

      // Event title conflicts
      const aEventTitles = new Set(a.content.events.map(e => e.title.toLowerCase()));
      for (const ev of b.content.events) {
        if (aEventTitles.has(ev.title.toLowerCase())) {
          conflicts.push({ modA: a.name, modB: b.name, type: 'event', itemName: ev.title });
        }
      }

      // Genre name conflicts
      const aGenreNames = new Set(a.content.genres.map(g => g.name.toLowerCase()));
      for (const genre of b.content.genres) {
        if (aGenreNames.has(genre.name.toLowerCase())) {
          conflicts.push({ modA: a.name, modB: b.name, type: 'genre', itemName: genre.name });
        }
      }

      // Modifier name conflicts
      const aModNames = new Set(a.content.modifiers.map(m => m.name.toLowerCase()));
      for (const mod of b.content.modifiers) {
        if (aModNames.has(mod.name.toLowerCase())) {
          conflicts.push({ modA: a.name, modB: b.name, type: 'modifier', itemName: mod.name });
        }
      }
    }
  }

  return conflicts;
}

// ─── ACTIVE MOD CONTENT ACCESSORS ───

export function getActiveModCards(): ModTalentCard[] {
  return getAllMods().filter(m => m.enabled).flatMap(m => m.content.cards);
}

export function getActiveModEvents(): ModNarrativeEvent[] {
  return getAllMods().filter(m => m.enabled).flatMap(m => m.content.events);
}

export function getActiveModGenres(): ModGenre[] {
  return getAllMods().filter(m => m.enabled).flatMap(m => m.content.genres);
}

export function getActiveModModifiers(): ModDifficultyModifier[] {
  return getAllMods().filter(m => m.enabled).flatMap(m => m.content.modifiers);
}

export function getModContentSummary(mod: GameMod): string {
  const parts: string[] = [];
  if (mod.content.cards.length) parts.push(`${mod.content.cards.length} card${mod.content.cards.length > 1 ? 's' : ''}`);
  if (mod.content.events.length) parts.push(`${mod.content.events.length} event${mod.content.events.length > 1 ? 's' : ''}`);
  if (mod.content.genres.length) parts.push(`${mod.content.genres.length} genre${mod.content.genres.length > 1 ? 's' : ''}`);
  if (mod.content.modifiers.length) parts.push(`${mod.content.modifiers.length} modifier${mod.content.modifiers.length > 1 ? 's' : ''}`);
  return parts.join(', ') || 'empty';
}

// ─── CREATE EMPTY MOD ───

export function createEmptyMod(name: string, author: string, description: string): GameMod {
  const now = Date.now();
  return {
    id: `gm_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    author,
    version: '1.0.0',
    description,
    content: { cards: [], events: [], genres: [], modifiers: [] },
    createdAt: now,
    updatedAt: now,
    enabled: false,
  };
}

export function createEmptyCard(): ModTalentCard {
  return {
    id: `mc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    role: 'Lead',
    rarity: 'common',
    starRating: 1,
    trait: '',
    genreAffinity: null,
    tags: [],
  };
}

export function createEmptyEvent(): ModNarrativeEvent {
  return {
    id: `me_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: '',
    description: '',
    choices: [{ label: 'Accept', outcome: { description: '', budgetMod: 0, qualityMod: 0, reputationMod: 0 } }],
  };
}

export function createEmptyModifier(): ModDifficultyModifier {
  return {
    id: `mm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    description: '',
    budgetAdjustment: 0,
    qualityMultiplier: 1.0,
    incidentFrequency: 1.0,
  };
}
