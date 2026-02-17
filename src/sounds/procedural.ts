// R249: Procedural Sound Design Expansion
// Comprehensive SFX pack using Web Audio API oscillator-based procedural audio.
// All sounds route through the existing sound.ts gain chain (sfx + master + music).

import type { AudioSettings } from '../settings';

// ──── Audio context & gain references (shared with sound.ts) ────────────

let _ctx: AudioContext | null = null;
let _masterGain: GainNode | null = null;
let _sfxGain: GainNode | null = null;
let _musicGain: GainNode | null = null;

// Ambient drone state
let _droneOsc1: OscillatorNode | null = null;
let _droneOsc2: OscillatorNode | null = null;
let _droneGain: GainNode | null = null;
let _droneActive = false;

/**
 * Initialize the procedural audio system.
 * Must be called after user interaction (AudioContext requirement).
 * Shares context/gains with sound.ts via dynamic import.
 */
async function ensureCtx(): Promise<AudioContext> {
  if (_ctx && _ctx.state !== 'closed') {
    if (_ctx.state === 'suspended') await _ctx.resume();
    return _ctx;
  }

  // Import sound.ts to reuse its context/gains
  const sound = await import('../sound');
  // Trigger context creation by calling a no-op volume read
  sound.getVolume();

  // We create our own context that mirrors the same routing
  _ctx = new AudioContext();
  if (_ctx.state === 'suspended') await _ctx.resume();

  _masterGain = _ctx.createGain();
  _masterGain.gain.value = sound.getVolume();
  _masterGain.connect(_ctx.destination);

  _sfxGain = _ctx.createGain();
  _sfxGain.gain.value = sound.getSfxVolume();
  _sfxGain.connect(_masterGain);

  _musicGain = _ctx.createGain();
  _musicGain.gain.value = sound.getMusicVolume();
  _musicGain.connect(_masterGain);

  return _ctx;
}

function getSfxOut(): GainNode {
  return _sfxGain!;
}

function getMusicOut(): GainNode {
  return _musicGain!;
}

/** Sync volumes from settings (called by settings subscriber) */
export function syncVolumes(audio: AudioSettings): void {
  const master = audio.muteAll ? 0 : audio.masterVolume / 100;
  if (_masterGain) _masterGain.gain.value = master;
  if (_sfxGain) _sfxGain.gain.value = audio.sfxVolume / 100;
  if (_musicGain) _musicGain.gain.value = audio.musicVolume / 100;
  // Mute drone if muted
  if (_droneGain) {
    _droneGain.gain.value = audio.muteAll ? 0 : (audio.musicVolume / 100) * 0.06;
  }
}

// ──── Helpers ────────────────────────────────────────────────

function osc(
  c: AudioContext,
  dest: AudioNode,
  freq: number,
  start: number,
  dur: number,
  vol = 0.15,
  type: OscillatorType = 'sine',
) {
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

function noiseBurst(
  c: AudioContext,
  dest: AudioNode,
  start: number,
  dur: number,
  vol = 0.08,
) {
  const len = Math.max(1, Math.round(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  const g = c.createGain();
  src.buffer = buf;
  g.gain.setValueAtTime(vol, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
  src.connect(g).connect(dest);
  src.start(c.currentTime + start);
}

// Debounce
const _lastPlayed: Record<string, number> = {};
const MIN_GAP = 50;

async function playSfx(key: string, fn: (c: AudioContext, out: GainNode) => void): Promise<void> {
  // Check mute via sound.ts
  const sound = await import('../sound');
  if (sound.isMuted()) return;
  const now = Date.now();
  if (_lastPlayed[key] && now - _lastPlayed[key] < MIN_GAP) return;
  _lastPlayed[key] = now;
  try {
    const c = await ensureCtx();
    fn(c, getSfxOut());
  } catch { /* silent fail */ }
}

// ──── SFX Functions ─────────────────────────────────────────

/** Card play — cinematic whoosh (fast sweep up then down) */
export function cardPlayWhoosh(): void {
  playSfx('cardPlayWhoosh', (c, out) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(200, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(1400, c.currentTime + 0.08);
    o.frequency.exponentialRampToValueAtTime(150, c.currentTime + 0.22);
    g.gain.setValueAtTime(0.12, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
    o.connect(g).connect(out);
    o.start();
    o.stop(c.currentTime + 0.3);
    // Accompanying noise swoosh
    noiseBurst(c, out, 0, 0.18, 0.1);
  });
}

/** Card draw — shuffle / riffle sound (rapid filtered noise bursts) */
export function cardDrawShuffle(): void {
  playSfx('cardDrawShuffle', (c, out) => {
    // Multiple rapid paper-flick bursts simulating a riffle shuffle
    for (let i = 0; i < 5; i++) {
      const t = i * 0.04;
      noiseBurst(c, out, t, 0.035, 0.08 + i * 0.01);
      osc(c, out, 900 + i * 150, t, 0.03, 0.04, 'square');
    }
    // Final card settle
    osc(c, out, 500, 0.2, 0.08, 0.06, 'triangle');
  });
}

/** Currency gain — coin clink (bright metallic ping with harmonics) */
export function currencyGainClink(): void {
  playSfx('currencyGainClink', (c, out) => {
    // Primary metallic strike
    osc(c, out, 2200, 0, 0.15, 0.12, 'sine');
    // Harmonic overtones (metallic ring)
    osc(c, out, 4400, 0.005, 0.1, 0.06, 'sine');
    osc(c, out, 6600, 0.01, 0.08, 0.03, 'sine');
    // Secondary clink (slightly delayed, slightly lower — two coins)
    osc(c, out, 1900, 0.06, 0.12, 0.09, 'sine');
    osc(c, out, 3800, 0.065, 0.08, 0.04, 'sine');
    // Tiny impact noise
    noiseBurst(c, out, 0, 0.02, 0.06);
  });
}

/** Level up — triumphant fanfare (ascending brass-like arpeggio with resolve chord) */
export function levelUpFanfare(): void {
  playSfx('levelUpFanfare', (c, out) => {
    // Ascending brass: C5 → E5 → G5 → C6
    osc(c, out, 523, 0, 0.2, 0.14, 'sawtooth');
    osc(c, out, 659, 0.12, 0.2, 0.14, 'sawtooth');
    osc(c, out, 784, 0.24, 0.2, 0.16, 'sawtooth');
    osc(c, out, 1047, 0.36, 0.4, 0.18, 'triangle');
    // Resolve chord: C major
    osc(c, out, 523, 0.4, 0.5, 0.08, 'triangle');
    osc(c, out, 659, 0.4, 0.5, 0.08, 'triangle');
    osc(c, out, 784, 0.4, 0.5, 0.08, 'triangle');
    // Shimmer cascade
    osc(c, out, 1568, 0.45, 0.4, 0.05, 'sine');
    osc(c, out, 2093, 0.5, 0.35, 0.04, 'sine');
    osc(c, out, 2637, 0.55, 0.3, 0.03, 'sine');
    // Warm bass foundation
    osc(c, out, 262, 0.36, 0.5, 0.1, 'sine');
    noiseBurst(c, out, 0.4, 0.15, 0.05);
  });
}

/** Achievement unlock — bright chime (ascending crystalline tones) */
export function achievementChime(): void {
  playSfx('achievementChime', (c, out) => {
    // Crystalline ascending: E6 → G#6 → B6 → E7
    osc(c, out, 1319, 0, 0.15, 0.12, 'sine');
    osc(c, out, 1661, 0.08, 0.15, 0.11, 'sine');
    osc(c, out, 1976, 0.16, 0.15, 0.1, 'sine');
    osc(c, out, 2637, 0.24, 0.25, 0.12, 'sine');
    // High sparkle overtones
    osc(c, out, 3520, 0.28, 0.2, 0.05, 'sine');
    osc(c, out, 4186, 0.32, 0.18, 0.04, 'sine');
    // Warm undertone
    osc(c, out, 659, 0.16, 0.3, 0.06, 'triangle');
    noiseBurst(c, out, 0.2, 0.1, 0.03);
  });
}

/** Negative event — buzzer (dissonant low sawtooth burst) */
export function negativeEventBuzzer(): void {
  playSfx('negativeEventBuzzer', (c, out) => {
    // Harsh dissonant buzz: two slightly detuned sawtooth waves
    osc(c, out, 95, 0, 0.35, 0.18, 'sawtooth');
    osc(c, out, 100, 0, 0.35, 0.18, 'sawtooth');
    // Higher dissonant overtone
    osc(c, out, 190, 0.02, 0.25, 0.08, 'square');
    // Impact noise
    noiseBurst(c, out, 0, 0.08, 0.12);
    // Low sub-bass thud
    osc(c, out, 50, 0, 0.4, 0.12, 'sine');
  });
}

/** Turn end — swoosh (quick sweeping tone from left to right feel) */
export function turnEndSwoosh(): void {
  playSfx('turnEndSwoosh', (c, out) => {
    // Sweeping sine from low to high to mid
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(180, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(1000, c.currentTime + 0.1);
    o.frequency.exponentialRampToValueAtTime(300, c.currentTime + 0.25);
    g.gain.setValueAtTime(0.1, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
    o.connect(g).connect(out);
    o.start();
    o.stop(c.currentTime + 0.35);
    // Accompanying wind noise
    noiseBurst(c, out, 0, 0.2, 0.07);
    // Subtle trailing tone
    osc(c, out, 400, 0.15, 0.15, 0.04, 'triangle');
  });
}

/** Menu navigation — click (crisp UI interaction sound) */
export function menuClick(): void {
  playSfx('menuClick', (c, out) => {
    // Sharp transient click
    osc(c, out, 1400, 0, 0.03, 0.08, 'square');
    // Softer follow tone for body
    osc(c, out, 1000, 0.015, 0.04, 0.05, 'sine');
    // Tiny noise transient
    noiseBurst(c, out, 0, 0.015, 0.04);
  });
}

// ──── Ambient Background Drone ──────────────────────────────

/**
 * Start the ambient gameplay drone — a low synth pad that plays during gameplay.
 * Routes through the music gain channel so it respects music volume.
 */
export async function startAmbientDrone(): Promise<void> {
  if (_droneActive) return;
  try {
    const c = await ensureCtx();
    const musicOut = getMusicOut();

    _droneGain = c.createGain();
    _droneGain.gain.setValueAtTime(0.001, c.currentTime);
    _droneGain.gain.linearRampToValueAtTime(0.06, c.currentTime + 2.0); // 2s fade-in
    _droneGain.connect(musicOut);

    // Oscillator 1: low sine pad (C2 = ~65 Hz)
    _droneOsc1 = c.createOscillator();
    _droneOsc1.type = 'sine';
    _droneOsc1.frequency.value = 65;
    _droneOsc1.connect(_droneGain);
    _droneOsc1.start();

    // Oscillator 2: fifth above, triangle for warmth (G2 = ~98 Hz)
    _droneOsc2 = c.createOscillator();
    _droneOsc2.type = 'triangle';
    _droneOsc2.frequency.value = 98;
    const osc2Gain = c.createGain();
    osc2Gain.gain.value = 0.4; // quieter than fundamental
    _droneOsc2.connect(osc2Gain).connect(_droneGain);
    _droneOsc2.start();

    _droneActive = true;
  } catch { /* silent fail */ }
}

/**
 * Stop the ambient drone with a smooth fade-out.
 */
export async function stopAmbientDrone(): Promise<void> {
  if (!_droneActive || !_droneGain || !_ctx) return;
  try {
    const now = _ctx.currentTime;
    _droneGain.gain.setValueAtTime(_droneGain.gain.value, now);
    _droneGain.gain.linearRampToValueAtTime(0.001, now + 1.5); // 1.5s fade-out

    // Clean up after fade
    const osc1 = _droneOsc1;
    const osc2 = _droneOsc2;
    setTimeout(() => {
      try { osc1?.stop(); } catch {}
      try { osc2?.stop(); } catch {}
    }, 2000);

    _droneOsc1 = null;
    _droneOsc2 = null;
    _droneGain = null;
    _droneActive = false;
  } catch {
    _droneActive = false;
  }
}

/**
 * Fade the drone for menus (reduce volume) or restore for gameplay.
 */
export function fadeDrone(target: 'menu' | 'gameplay'): void {
  if (!_droneGain || !_ctx) return;
  const now = _ctx.currentTime;
  const targetVol = target === 'menu' ? 0.008 : 0.06;
  _droneGain.gain.setValueAtTime(_droneGain.gain.value, now);
  _droneGain.gain.linearRampToValueAtTime(targetVol, now + 0.8);
}

/** Check if drone is currently playing */
export function isDronePlaying(): boolean {
  return _droneActive;
}
