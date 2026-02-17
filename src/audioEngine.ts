/**
 * R281: AudioEngine — Singleton facade over Web Audio API procedural sound system.
 * Wraps existing sound.ts and adds missing SFX. No external audio files.
 */

import {
  isMuted, setMuted, toggleMute, getVolume, setVolume,
  getSfxVolume, setSfxVolume, getMusicVolume, setMusicVolume, sfx,
  startAmbientDrone, stopAmbientDrone as stopDefaultDrone,
} from './sound';
import { getSettings, subscribeSettings } from './settings';
import type { Genre } from './types';

// ──── Genre drone mapping ────────────────────────────────────

type DroneState = { oscs: OscillatorNode[]; gain: GainNode; genre: string } | null;

let _droneState: DroneState = null;
let _ctx: AudioContext | null = null;
let _masterGain: GainNode | null = null;
let _musicGain: GainNode | null = null;

function ensureCtx(): AudioContext {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new AudioContext();
  }
  if (_ctx.state === 'suspended') void _ctx.resume();
  if (!_masterGain) {
    _masterGain = _ctx.createGain();
    const s = getSettings().audio;
    _masterGain.gain.value = s.muteAll ? 0 : s.masterVolume / 100;
    _masterGain.connect(_ctx.destination);
  }
  if (!_musicGain) {
    _musicGain = _ctx.createGain();
    _musicGain.gain.value = getSettings().audio.musicVolume / 100;
    _musicGain.connect(_masterGain!);
  }
  return _ctx;
}

const GENRE_DRONE_PARAMS: Record<string, { freqs: number[]; types: OscillatorType[]; detune: number }> = {
  Action:   { freqs: [55, 82.5],   types: ['sawtooth', 'sine'],    detune: 5 },
  Comedy:   { freqs: [130, 196],   types: ['triangle', 'sine'],    detune: 0 },
  Drama:    { freqs: [65, 98],     types: ['sine', 'triangle'],    detune: 3 },
  Horror:   { freqs: [45, 67.5],   types: ['sawtooth', 'sawtooth'],detune: 12 },
  'Sci-Fi': { freqs: [55, 110],    types: ['square', 'sine'],      detune: 8 },
  Romance:  { freqs: [98, 147],    types: ['sine', 'triangle'],    detune: 0 },
  Thriller: { freqs: [50, 75],     types: ['triangle', 'sawtooth'],detune: 7 },
};

// ──── Additional procedural SFX (missing from sound.ts) ─────

function playSfxProc(fn: (c: AudioContext, out: AudioNode) => void): void {
  if (isMuted()) return;
  try {
    const c = ensureCtx();
    // Route through a temp gain for SFX volume
    const g = c.createGain();
    const s = getSettings().audio;
    g.gain.value = (s.sfxVolume / 100) * (s.masterVolume / 100);
    g.connect(c.destination);
    fn(c, g);
  } catch { /* silent */ }
}

function note(c: AudioContext, dest: AudioNode, freq: number, start: number, dur: number, vol = 0.15, type: OscillatorType = 'sine') {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
  o.connect(g).connect(dest);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.05);
}

function noiseBurst(c: AudioContext, dest: AudioNode, start: number, dur: number, vol = 0.08) {
  const len = Math.max(1, Math.round(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  const g = c.createGain();
  src.buffer = buf;
  g.gain.setValueAtTime(vol, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
  src.connect(g).connect(dest);
  src.start(c.currentTime + start);
}

// ──── AudioEngine Singleton ──────────────────────────────────

export class AudioEngine {
  private static _instance: AudioEngine | null = null;
  private _unsubSettings: (() => void) | null = null;

  private constructor() {
    // Sync volumes when settings change
    this._unsubSettings = subscribeSettings((s) => {
      const a = s.audio;
      setVolume(a.masterVolume / 100);
      setSfxVolume(a.sfxVolume / 100);
      setMusicVolume(a.musicVolume / 100);
      setMuted(a.muteAll);
      // Sync local gains
      if (_masterGain) _masterGain.gain.value = a.muteAll ? 0 : a.masterVolume / 100;
      if (_musicGain) _musicGain.gain.value = a.musicVolume / 100;
    });
  }

  static getInstance(): AudioEngine {
    if (!AudioEngine._instance) {
      AudioEngine._instance = new AudioEngine();
    }
    return AudioEngine._instance;
  }

  /** Initialize AudioContext (call on first user interaction) */
  init(): void {
    ensureCtx();
  }

  // ── Volume controls ──

  get muted(): boolean { return isMuted(); }
  get masterVolume(): number { return getVolume(); }
  get sfxVolume(): number { return getSfxVolume(); }
  get musicVolume(): number { return getMusicVolume(); }

  setMasterVolume(v: number): void { setVolume(v); }
  setSfxVolume(v: number): void { setSfxVolume(v); }
  setMusicVolume(v: number): void { setMusicVolume(v); }
  setMuted(m: boolean): void { setMuted(m); }
  toggleMute(): boolean { return toggleMute(); }

  // ── Delegated SFX (existing in sound.ts) ──

  playClick(): void { sfx.click(); }
  playCardDraw(): void { sfx.cardFlip(); }
  playCardPlay(): void { sfx.cardPick(); }
  playBlockbuster(): void { sfx.blockbuster(); }
  playFlop(): void { sfx.flop(); }
  playAchievement(): void { sfx.achievementUnlock(); }

  // ── New procedural SFX ──

  /** Ascending major triad chime */
  playSuccess(): void {
    playSfxProc((c, out) => {
      // C5 → E5 → G5 (major triad)
      note(c, out, 523, 0, 0.2, 0.12, 'sine');
      note(c, out, 659, 0.1, 0.2, 0.12, 'sine');
      note(c, out, 784, 0.2, 0.3, 0.14, 'sine');
      // Shimmer
      note(c, out, 1568, 0.25, 0.2, 0.04, 'sine');
    });
  }

  /** Descending minor tones */
  playFailure(): void {
    playSfxProc((c, out) => {
      // Eb5 → C5 → Ab4 (minor descent)
      note(c, out, 622, 0, 0.2, 0.12, 'sine');
      note(c, out, 523, 0.12, 0.2, 0.11, 'sine');
      note(c, out, 415, 0.24, 0.3, 0.1, 'triangle');
      noiseBurst(c, out, 0.2, 0.1, 0.03);
    });
  }

  /** Sparkle — high freq randomized pings */
  playAward(): void {
    playSfxProc((c, out) => {
      for (let i = 0; i < 8; i++) {
        const freq = 2000 + Math.random() * 3000;
        const t = i * 0.06;
        note(c, out, freq, t, 0.12, 0.06 + Math.random() * 0.04, 'sine');
      }
      // Warm base
      note(c, out, 880, 0.1, 0.4, 0.08, 'triangle');
      note(c, out, 1320, 0.15, 0.35, 0.06, 'sine');
    });
  }

  /** Rapid clicking for dice/randomization */
  playDiceRoll(): void {
    playSfxProc((c, out) => {
      for (let i = 0; i < 10; i++) {
        const t = i * 0.03;
        const freq = 800 + Math.random() * 600;
        note(c, out, freq, t, 0.025, 0.07 + Math.random() * 0.03, 'square');
        noiseBurst(c, out, t, 0.02, 0.04);
      }
      // Final settle
      note(c, out, 1200, 0.32, 0.08, 0.1, 'sine');
    });
  }

  // ── Ambient Drone ──

  /** Start genre-specific ambient drone (looping, subtle) */
  playAmbientDrone(genre?: Genre | string): void {
    // Stop existing drone first
    this.stopAmbientDrone();

    if (isMuted()) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (getSettings().visual.reduceMotion) return;

    if (!genre || !GENRE_DRONE_PARAMS[genre]) {
      // Fall back to default drone from sound.ts
      startAmbientDrone();
      return;
    }

    try {
      const c = ensureCtx();
      const params = GENRE_DRONE_PARAMS[genre];
      const droneGain = c.createGain();
      droneGain.gain.setValueAtTime(0.001, c.currentTime);
      droneGain.gain.linearRampToValueAtTime(0.04, c.currentTime + 2.0);
      droneGain.connect(_musicGain!);

      const oscs: OscillatorNode[] = [];
      params.freqs.forEach((freq, i) => {
        const o = c.createOscillator();
        o.type = params.types[i] || 'sine';
        o.frequency.value = freq;
        o.detune.value = params.detune * (i === 0 ? 1 : -1);
        const g = c.createGain();
        g.gain.value = i === 0 ? 0.6 : 0.3;
        o.connect(g).connect(droneGain);
        o.start();
        oscs.push(o);
      });

      _droneState = { oscs, gain: droneGain, genre };
    } catch { /* silent */ }
  }

  /** Stop ambient drone with fade-out */
  stopAmbientDrone(): void {
    if (_droneState && _ctx) {
      try {
        const now = _ctx.currentTime;
        _droneState.gain.gain.setValueAtTime(_droneState.gain.gain.value, now);
        _droneState.gain.gain.linearRampToValueAtTime(0.001, now + 1.0);
        const oscs = _droneState.oscs;
        setTimeout(() => { oscs.forEach(o => { try { o.stop(); } catch {} }); }, 1200);
      } catch {}
      _droneState = null;
    }
    // Also stop default drone
    stopDefaultDrone();
  }

  /** Check reduced-motion preference */
  get shouldReduceAudio(): boolean {
    if (getSettings().visual.reduceMotion) return true;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
    return false;
  }

  /** Play a named sound by string key */
  play(name: string): void {
    if (this.shouldReduceAudio && name !== 'click') return;
    const map: Record<string, () => void> = {
      click: () => this.playClick(),
      cardDraw: () => this.playCardDraw(),
      cardPlay: () => this.playCardPlay(),
      success: () => this.playSuccess(),
      failure: () => this.playFailure(),
      blockbuster: () => this.playBlockbuster(),
      flop: () => this.playFlop(),
      award: () => this.playAward(),
      achievement: () => this.playAchievement(),
      diceRoll: () => this.playDiceRoll(),
    };
    map[name]?.();
  }

  dispose(): void {
    this.stopAmbientDrone();
    this._unsubSettings?.();
    this._unsubSettings = null;
  }
}

/** Convenience accessor */
export function getAudioEngine(): AudioEngine {
  return AudioEngine.getInstance();
}
