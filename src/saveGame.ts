// Save/Resume system — persist game state to localStorage on every phase transition

import { GameState } from './types';

const SAVE_KEY = 'greenlight_save';

export function saveGameState(state: GameState): void {
  try {
    // Strip non-serializable fields (synergy functions in cards/scripts)
    const serializable = stripFunctions(state);
    localStorage.setItem(SAVE_KEY, JSON.stringify(serializable));
  } catch {
    // localStorage full or unavailable — silent fail
  }
}

export function loadGameState(): Partial<GameState> | null {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    // Basic validation — must have phase and season
    if (!parsed.phase || typeof parsed.season !== 'number') return null;
    // Don't restore completed games
    if (parsed.phase === 'gameOver' || parsed.phase === 'victory' || parsed.phase === 'start') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {}
}

export function hasSave(): boolean {
  return loadGameState() !== null;
}

// Strip function properties for JSON serialization
// Cards have synergyCondition functions, scripts have ability callbacks, etc.
function stripFunctions(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'function') return undefined;
  if (Array.isArray(obj)) return obj.map(stripFunctions);
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'function') {
        // Keep the key but set to null so we know it existed
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
