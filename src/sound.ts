// Procedural sound effects using Web Audio API — no external files needed
let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

// Mute state — persisted in localStorage
let _muted = typeof localStorage !== 'undefined' ? localStorage.getItem('greenlight-muted') === 'true' : false;

// Volume state — persisted in localStorage (0.0 – 1.0)
let _volume = typeof localStorage !== 'undefined' ? parseFloat(localStorage.getItem('greenlight-volume') || '0.7') : 0.7;
if (isNaN(_volume) || _volume < 0 || _volume > 1) _volume = 0.7;

export function isMuted(): boolean { return _muted; }
export function setMuted(m: boolean) {
  _muted = m;
  try { localStorage.setItem('greenlight-muted', String(m)); } catch {}
}
export function toggleMute(): boolean {
  setMuted(!_muted);
  return _muted;
}

export function getVolume(): number { return _volume; }
export function setVolume(v: number) {
  _volume = Math.max(0, Math.min(1, v));
  try { localStorage.setItem('greenlight-volume', String(_volume)); } catch {}
  if (masterGain) masterGain.gain.value = _volume;
}

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = _volume;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function getMaster(): GainNode {
  getCtx();
  return masterGain!;
}

function play(fn: (c: AudioContext) => void) {
  if (_muted) return;
  try { fn(getCtx()); } catch { /* silent fail on browsers that block audio */ }
}

// Quick note helper — routes through master gain
function note(c: AudioContext, freq: number, start: number, dur: number, vol = 0.15, type: OscillatorType = 'sine') {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
  o.connect(g).connect(getMaster());
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.05);
}

// Noise burst helper — routes through master gain
function noise(c: AudioContext, start: number, dur: number, vol = 0.08) {
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
  const src = c.createBufferSource();
  const g = c.createGain();
  src.buffer = buf;
  g.gain.setValueAtTime(vol, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
  src.connect(g).connect(getMaster());
  src.start(c.currentTime + start);
}

export const sfx = {
  // Card flip — quick "fwip" 
  cardFlip() {
    play(c => {
      noise(c, 0, 0.08, 0.1);
      note(c, 800, 0, 0.06, 0.06, 'square');
    });
  },

  // Pick card — satisfying "thunk"
  cardPick() {
    play(c => {
      note(c, 200, 0, 0.15, 0.2, 'sine');
      note(c, 400, 0.02, 0.1, 0.1, 'triangle');
      noise(c, 0, 0.05, 0.12);
    });
  },

  // Discard — whoosh away
  cardDiscard() {
    play(c => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(600, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.2);
      g.gain.setValueAtTime(0.08, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
      o.connect(g).connect(getMaster());
      o.start(); o.stop(c.currentTime + 0.25);
    });
  },

  // Synergy fired — sparkle chime
  synergy() {
    play(c => {
      note(c, 880, 0, 0.15, 0.1, 'sine');
      note(c, 1320, 0.05, 0.15, 0.08, 'sine');
      note(c, 1760, 0.1, 0.2, 0.06, 'sine');
    });
  },

  // Combo escalation — pitch rises with combo count
  combo(count: number) {
    play(c => {
      const baseFreq = 440 + count * 80;
      note(c, baseFreq, 0, 0.12, 0.12, 'sine');
      note(c, baseFreq * 1.5, 0.04, 0.12, 0.08, 'triangle');
      if (count >= 3) note(c, baseFreq * 2, 0.08, 0.15, 0.06, 'sine');
    });
  },

  // Incident — ominous thud
  incident() {
    play(c => {
      note(c, 80, 0, 0.4, 0.25, 'sine');
      note(c, 60, 0.05, 0.3, 0.15, 'triangle');
      noise(c, 0, 0.15, 0.15);
    });
  },

  // Disaster — dramatic crash
  disaster() {
    play(c => {
      note(c, 60, 0, 0.8, 0.3, 'sawtooth');
      note(c, 45, 0.1, 0.6, 0.2, 'sine');
      noise(c, 0, 0.4, 0.25);
      noise(c, 0.2, 0.3, 0.15);
    });
  },

  // Blockbuster reveal — triumphant fanfare
  blockbuster() {
    play(c => {
      // C major arpeggio
      note(c, 523, 0, 0.3, 0.15, 'triangle');
      note(c, 659, 0.1, 0.3, 0.15, 'triangle');
      note(c, 784, 0.2, 0.3, 0.15, 'triangle');
      note(c, 1047, 0.3, 0.5, 0.2, 'sine');
      // Shimmer
      note(c, 1568, 0.35, 0.4, 0.06, 'sine');
      note(c, 2093, 0.4, 0.4, 0.04, 'sine');
    });
  },

  // Hit/Smash — positive chime
  hit() {
    play(c => {
      note(c, 523, 0, 0.2, 0.12, 'triangle');
      note(c, 659, 0.08, 0.2, 0.1, 'triangle');
    });
  },

  // Flop — sad trombone descend
  flop() {
    play(c => {
      note(c, 440, 0, 0.25, 0.12, 'triangle');
      note(c, 370, 0.2, 0.25, 0.1, 'triangle');
      note(c, 311, 0.4, 0.25, 0.08, 'triangle');
      note(c, 261, 0.6, 0.4, 0.1, 'sine');
    });
  },

  // Button click — subtle tick
  click() {
    play(c => {
      note(c, 1200, 0, 0.04, 0.06, 'square');
    });
  },

  // Wrap production — film reel sound
  wrap() {
    play(c => {
      note(c, 600, 0, 0.1, 0.08, 'triangle');
      note(c, 800, 0.08, 0.1, 0.08, 'triangle');
      note(c, 600, 0.16, 0.15, 0.06, 'triangle');
    });
  },

  // Challenge bet — tension riser
  challenge() {
    play(c => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(200, c.currentTime);
      o.frequency.linearRampToValueAtTime(800, c.currentTime + 0.4);
      g.gain.setValueAtTime(0.06, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
      o.connect(g).connect(getMaster());
      o.start(); o.stop(c.currentTime + 0.55);
    });
  },

  // Victory — full celebration
  victory() {
    play(c => {
      [523, 659, 784, 1047].forEach((f, i) => {
        note(c, f, i * 0.12, 0.4, 0.12, 'triangle');
      });
      // Shimmer overlay
      [1568, 2093, 2637].forEach((f, i) => {
        note(c, f, 0.5 + i * 0.08, 0.5, 0.04, 'sine');
      });
    });
  },

  // Block incident — shield clang
  block() {
    play(c => {
      note(c, 300, 0, 0.2, 0.15, 'square');
      note(c, 600, 0.02, 0.15, 0.1, 'triangle');
      noise(c, 0, 0.1, 0.12);
    });
  },

  // ── New sounds for Round 29 ──

  // Box office counting — rising shimmer tone (play at start of count-up)
  boxOfficeReveal() {
    play(c => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(300, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(900, c.currentTime + 1.2);
      g.gain.setValueAtTime(0.06, c.currentTime);
      g.gain.setValueAtTime(0.08, c.currentTime + 0.6);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.4);
      o.connect(g).connect(getMaster());
      o.start(); o.stop(c.currentTime + 1.5);
      // Subtle noise crackle underneath
      noise(c, 0, 1.2, 0.03);
    });
  },

  // Season transition — whoosh sweep
  seasonTransition() {
    play(c => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.15);
      o.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.35);
      g.gain.setValueAtTime(0.1, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
      o.connect(g).connect(getMaster());
      o.start(); o.stop(c.currentTime + 0.45);
      noise(c, 0, 0.25, 0.06);
    });
  },

  // Script select — page flip
  scriptSelect() {
    play(c => {
      noise(c, 0, 0.06, 0.08);
      note(c, 500, 0.01, 0.08, 0.08, 'triangle');
      note(c, 700, 0.05, 0.1, 0.06, 'sine');
    });
  },

  // Talent hire — cha-ching
  hire() {
    play(c => {
      note(c, 1200, 0, 0.08, 0.08, 'square');
      note(c, 1600, 0.06, 0.12, 0.06, 'sine');
      note(c, 2000, 0.12, 0.15, 0.04, 'sine');
    });
  },

  // Purchase / perk buy — coin drop
  purchase() {
    play(c => {
      note(c, 1400, 0, 0.06, 0.07, 'square');
      note(c, 1800, 0.05, 0.08, 0.05, 'sine');
    });
  },

  // Debt warning — ominous low pulse
  debtWarning() {
    play(c => {
      note(c, 55, 0, 0.6, 0.15, 'sine');
      note(c, 50, 0.1, 0.5, 0.1, 'triangle');
      note(c, 110, 0.3, 0.3, 0.04, 'sawtooth');
    });
  },

  // Smash tier — brighter than hit, less than blockbuster
  smash() {
    play(c => {
      note(c, 523, 0, 0.25, 0.12, 'triangle');
      note(c, 659, 0.08, 0.25, 0.12, 'triangle');
      note(c, 784, 0.16, 0.3, 0.1, 'sine');
      note(c, 1047, 0.24, 0.2, 0.06, 'sine');
    });
  },

  // Game over — descending minor tones
  gameOver() {
    play(c => {
      note(c, 440, 0, 0.35, 0.12, 'triangle');
      note(c, 370, 0.25, 0.35, 0.12, 'triangle');
      note(c, 311, 0.5, 0.35, 0.1, 'triangle');
      note(c, 261, 0.75, 0.35, 0.1, 'sine');
      note(c, 196, 1.0, 0.6, 0.12, 'sine');
      // Low rumble underneath
      note(c, 55, 0.3, 1.2, 0.08, 'sine');
    });
  },

  // Clean wrap achieved — triumphant ascending arpeggio
  cleanWrap() {
    play(c => {
      // C major arpeggio up
      note(c, 523, 0, 0.2, 0.1, 'triangle');
      note(c, 659, 0.1, 0.2, 0.1, 'triangle');
      note(c, 784, 0.2, 0.2, 0.1, 'triangle');
      note(c, 1047, 0.3, 0.35, 0.12, 'sine');
      // Sparkle
      note(c, 2093, 0.35, 0.3, 0.04, 'sine');
    });
  },

  // Nomination fanfare — brief prestige chime
  nomination() {
    play(c => {
      note(c, 880, 0, 0.2, 0.08, 'sine');
      note(c, 1047, 0.1, 0.2, 0.08, 'sine');
      note(c, 1319, 0.2, 0.3, 0.1, 'sine');
      note(c, 1760, 0.3, 0.3, 0.06, 'sine');
    });
  },
};
