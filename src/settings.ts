/**
 * R241: Centralized settings state with localStorage persistence under `greenlight-settings`
 */

// ──── Types ──────────────────────────────────────────────────

export type ColorblindMode = 'off' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface AudioSettings {
  masterVolume: number;   // 0-100
  sfxVolume: number;      // 0-100
  musicVolume: number;    // 0-100
  muteAll: boolean;
}

export interface VisualSettings {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  colorblindMode: ColorblindMode;
}

export interface GameplaySettings {
  autoSave: boolean;
  confirmEndTurn: boolean;
  showTooltips: boolean;
  tutorialHints: boolean;
}

export interface Settings {
  audio: AudioSettings;
  visual: VisualSettings;
  gameplay: GameplaySettings;
}

// ──── Defaults ───────────────────────────────────────────────

const DEFAULTS: Settings = {
  audio: { masterVolume: 70, sfxVolume: 100, musicVolume: 100, muteAll: false },
  visual: { reduceMotion: false, highContrast: false, largeText: false, colorblindMode: 'off' },
  gameplay: { autoSave: true, confirmEndTurn: false, showTooltips: true, tutorialHints: true },
};

const STORAGE_KEY = 'greenlight-settings';

// ──── State ──────────────────────────────────────────────────

let _settings: Settings = loadSettings();
let _listeners: Array<(s: Settings) => void> = [];

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return migrateOldSettings();
    const parsed = JSON.parse(raw);
    return {
      audio: { ...DEFAULTS.audio, ...parsed.audio },
      visual: { ...DEFAULTS.visual, ...parsed.visual },
      gameplay: { ...DEFAULTS.gameplay, ...parsed.gameplay },
    };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Migrate from old scattered localStorage keys to unified settings */
function migrateOldSettings(): Settings {
  const s = structuredClone(DEFAULTS);
  try {
    const v = localStorage.getItem('greenlight-volume');
    if (v) s.audio.masterVolume = Math.round(parseFloat(v) * 100);
    const sfx = localStorage.getItem('greenlight-sfx-volume');
    if (sfx) s.audio.sfxVolume = Math.round(parseFloat(sfx) * 100);
    const muted = localStorage.getItem('greenlight-muted');
    if (muted === 'true') s.audio.muteAll = true;
    const rm = localStorage.getItem('greenlight-reduce-motion');
    if (rm === 'true') s.visual.reduceMotion = true;
    const hc = localStorage.getItem('greenlight-high-contrast');
    if (hc === 'true') s.visual.highContrast = true;
    const ts = localStorage.getItem('greenlight-text-size');
    if (ts === 'large') s.visual.largeText = true;
    const cb = localStorage.getItem('greenlight-colorblind');
    if (cb === 'true') s.visual.colorblindMode = 'deuteranopia'; // best guess
    const as2 = localStorage.getItem('greenlight-auto-save');
    if (as2 === 'false') s.gameplay.autoSave = false;
    const cet = localStorage.getItem('greenlight-confirm-end-turn');
    if (cet === 'true') s.gameplay.confirmEndTurn = true;
    const tt = localStorage.getItem('greenlight-show-tooltips');
    if (tt === 'false') s.gameplay.showTooltips = false;
  } catch {}
  // Save migrated settings
  persistSettings(s);
  return s;
}

function persistSettings(s: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

// ──── Public API ─────────────────────────────────────────────

export function getSettings(): Settings { return _settings; }

export function updateSettings(patch: Partial<Settings>): Settings {
  if (patch.audio) _settings.audio = { ..._settings.audio, ...patch.audio };
  if (patch.visual) _settings.visual = { ..._settings.visual, ...patch.visual };
  if (patch.gameplay) _settings.gameplay = { ..._settings.gameplay, ...patch.gameplay };
  persistSettings(_settings);
  applySettings(_settings);
  _listeners.forEach(fn => fn(_settings));
  return _settings;
}

export function subscribeSettings(fn: (s: Settings) => void): () => void {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

export function resetSettings(): Settings {
  _settings = structuredClone(DEFAULTS);
  persistSettings(_settings);
  applySettings(_settings);
  _listeners.forEach(fn => fn(_settings));
  return _settings;
}

// ──── Apply settings to DOM + audio ──────────────────────────

export function applySettings(s: Settings) {
  const root = document.documentElement;

  // Audio — sync with sound.ts
  import('./sound').then(sound => {
    sound.setVolume(s.audio.masterVolume / 100);
    sound.setSfxVolume(s.audio.sfxVolume / 100);
    sound.setMusicVolume(s.audio.musicVolume / 100);
    sound.setMuted(s.audio.muteAll);
  }).catch(() => {});

  // Visual — reduce motion
  root.classList.toggle('force-reduce-motion', s.visual.reduceMotion);

  // Visual — high contrast
  root.classList.toggle('high-contrast', s.visual.highContrast);

  // Visual — large text
  root.dataset.textSize = s.visual.largeText ? 'large' : 'medium';

  // Visual — colorblind mode
  root.classList.remove('colorblind-mode', 'colorblind-protanopia', 'colorblind-deuteranopia', 'colorblind-tritanopia');
  if (s.visual.colorblindMode !== 'off') {
    root.classList.add('colorblind-mode', `colorblind-${s.visual.colorblindMode}`);
  }

  // Sync old localStorage keys for backward compat with existing code that reads them
  try {
    localStorage.setItem('greenlight-volume', String(s.audio.masterVolume / 100));
    localStorage.setItem('greenlight-sfx-volume', String(s.audio.sfxVolume / 100));
    localStorage.setItem('greenlight-muted', String(s.audio.muteAll));
    localStorage.setItem('greenlight-reduce-motion', String(s.visual.reduceMotion));
    localStorage.setItem('greenlight-high-contrast', String(s.visual.highContrast));
    localStorage.setItem('greenlight-text-size', s.visual.largeText ? 'large' : 'medium');
    localStorage.setItem('greenlight-colorblind', String(s.visual.colorblindMode !== 'off'));
    localStorage.setItem('greenlight-auto-save', String(s.gameplay.autoSave));
    localStorage.setItem('greenlight-confirm-end-turn', String(s.gameplay.confirmEndTurn));
    localStorage.setItem('greenlight-show-tooltips', String(s.gameplay.showTooltips));
  } catch {}
}

// ──── Data management ────────────────────────────────────────

export function exportAllSaveData(): string {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith('greenlight')) data[k] = localStorage.getItem(k) || '';
  }
  return JSON.stringify(data, null, 2);
}

export function importSaveData(json: string): { success: boolean; count: number; error?: string } {
  try {
    const data = JSON.parse(json);
    if (typeof data !== 'object' || data === null) throw new Error('Invalid format');
    let count = 0;
    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith('greenlight') && typeof v === 'string') {
        localStorage.setItem(k, v);
        count++;
      }
    }
    return { success: true, count };
  } catch (e: any) {
    return { success: false, count: 0, error: e.message || 'Invalid file' };
  }
}

export function resetAllProgress(): void {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('greenlight'));
  keys.forEach(k => localStorage.removeItem(k));
}

// ──── Initialize on import ───────────────────────────────────

applySettings(_settings);
