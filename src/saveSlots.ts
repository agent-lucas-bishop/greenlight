/**
 * R255: Multi-Save Slot System
 * 3 manual save slots + 1 auto-save slot
 */

import { GameState } from './types';
import { getState } from './gameStore';

const SLOT_PREFIX = 'greenlight_slot_';
const AUTO_SLOT_KEY = 'greenlight_autosave';

export interface SaveSlotMeta {
  slotIndex: number; // 0-2 for manual, -1 for auto
  savedAt: string; // ISO date string
  season: number;
  phase: string;
  score: number; // totalEarnings
  budget: number;
  reputation: number;
  difficulty: string;
  archetype: string | null;
  studioName: string;
  gameMode: string;
  strikes: number;
  maxSeasons: number;
  filmsCompleted: number;
  thumbnail: string; // short text description of game state
}

export interface SaveSlot {
  meta: SaveSlotMeta;
  state: Partial<GameState>;
}

function getSlotKey(index: number): string {
  return index === -1 ? AUTO_SLOT_KEY : `${SLOT_PREFIX}${index}`;
}

function stripFunctions(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'function') return undefined;
  if (Array.isArray(obj)) return obj.map(stripFunctions);
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'function') {
        if (key === 'synergyCondition' || key === 'condition' || key === 'oddsHint') {
          result[key] = null;
        }
        continue;
      }
      result[key] = stripFunctions(value);
    }
    return result;
  }
  return obj;
}

function generateThumbnail(state: GameState): string {
  const parts: string[] = [];
  if (state.studioName) parts.push(state.studioName);
  parts.push(`Season ${state.season}/${state.maxSeasons}`);
  if (state.currentScript) parts.push(`Filming: ${state.currentScript.title}`);
  const lastFilm = state.seasonHistory.length > 0 ? state.seasonHistory[state.seasonHistory.length - 1] : null;
  if (lastFilm) parts.push(`Last: "${lastFilm.title}" (${lastFilm.tier})`);
  parts.push(`$${state.budget.toFixed(1)}M budget`);
  return parts.join(' · ');
}

function buildMeta(state: GameState, slotIndex: number): SaveSlotMeta {
  return {
    slotIndex,
    savedAt: new Date().toISOString(),
    season: state.season,
    phase: state.phase,
    score: state.totalEarnings,
    budget: state.budget,
    reputation: state.reputation,
    difficulty: state.difficulty,
    archetype: state.studioArchetype,
    studioName: state.studioName,
    gameMode: state.gameMode,
    strikes: state.strikes,
    maxSeasons: state.maxSeasons,
    filmsCompleted: state.seasonHistory.length,
    thumbnail: generateThumbnail(state),
  };
}

/** List all save slots (0-2 manual + auto). Returns null for empty slots. */
export function listSlots(): (SaveSlotMeta | null)[] {
  const slots: (SaveSlotMeta | null)[] = [];
  for (let i = 0; i < 3; i++) {
    try {
      const raw = localStorage.getItem(getSlotKey(i));
      if (raw) {
        const parsed: SaveSlot = JSON.parse(raw);
        slots.push(parsed.meta);
      } else {
        slots.push(null);
      }
    } catch {
      slots.push(null);
    }
  }
  return slots;
}

/** Get auto-save slot metadata, or null. */
export function getAutoSaveMeta(): SaveSlotMeta | null {
  try {
    const raw = localStorage.getItem(AUTO_SLOT_KEY);
    if (!raw) return null;
    const parsed: SaveSlot = JSON.parse(raw);
    return parsed.meta;
  } catch {
    return null;
  }
}

/** Save current game state to a manual slot (0-2). */
export function saveToSlot(slotIndex: number): boolean {
  if (slotIndex < 0 || slotIndex > 2) return false;
  const state = getState();
  if (state.phase === 'start') return false;
  // Don't allow saving daily/weekly runs
  if (state.gameMode === 'daily' || state.gameMode === 'weekly') return false;
  try {
    const slot: SaveSlot = {
      meta: buildMeta(state, slotIndex),
      state: stripFunctions(state),
    };
    localStorage.setItem(getSlotKey(slotIndex), JSON.stringify(slot));
    return true;
  } catch {
    return false;
  }
}

/** Load game state from a slot. Returns partial state or null. */
export function loadFromSlot(slotIndex: number): Partial<GameState> | null {
  try {
    const key = getSlotKey(slotIndex);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: SaveSlot = JSON.parse(raw);
    if (!parsed.state || !parsed.state.phase) return null;
    return parsed.state;
  } catch {
    return null;
  }
}

/** Load from the auto-save slot. */
export function loadAutoSave(): Partial<GameState> | null {
  return loadFromSlot(-1);
}

/** Delete a save slot. */
export function deleteSlot(slotIndex: number): void {
  try {
    localStorage.removeItem(getSlotKey(slotIndex));
  } catch {}
}

/** Auto-save to the dedicated auto-save slot. Called at end of each turn/phase. */
export function autoSave(): boolean {
  const state = getState();
  if (state.phase === 'start' || state.phase === 'gameOver' || state.phase === 'victory') return false;
  if (state.gameMode === 'daily' || state.gameMode === 'weekly') return false;
  try {
    const slot: SaveSlot = {
      meta: buildMeta(state, -1),
      state: stripFunctions(state),
    };
    localStorage.setItem(AUTO_SLOT_KEY, JSON.stringify(slot));
    return true;
  } catch {
    return false;
  }
}
