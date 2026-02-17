// Procedural sound effects using Web Audio API — no external files needed
let ctx: AudioContext | null = null;

// Mute state — persisted in localStorage
let _muted = typeof localStorage !== 'undefined' ? localStorage.getItem('greenlight-muted') === 'true' : false;

// Master volume (0.0 – 1.0) — persisted in localStorage
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
  // Update master gain if it exists
  if (_masterGain) _masterGain.gain.value = _volume;
}

let _masterGain: GainNode | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  if (!_masterGain) {
    _masterGain = ctx.createGain();
    _masterGain.gain.value = _volume;
    _masterGain.connect(ctx.destination);
  }
  return ctx;
}

// Get the master output node (gain node for volume control)
function getMaster(): AudioNode {
  getCtx(); // ensure masterGain exists
  return _masterGain!;
}

// Debounce tracking to prevent overlapping rapid-fire sounds
const _lastPlayed: Record<string, number> = {};
const MIN_INTERVAL_MS = 50; // minimum ms between same sound effect

function play(fn: (c: AudioContext) => void, key?: string) {
  if (_muted) return;
  if (key) {
    const now = Date.now();
    if (_lastPlayed[key] && now - _lastPlayed[key] < MIN_INTERVAL_MS) return;
    _lastPlayed[key] = now;
  }
  try { fn(getCtx()); } catch { /* silent fail on browsers that block audio */ }
}

// Quick note helper
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

// Noise burst helper
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

  // Achievement unlock — bright chime arpeggio
  achievementUnlock() {
    play(c => {
      note(c, 1047, 0, 0.15, 0.1, 'sine');
      note(c, 1319, 0.08, 0.15, 0.1, 'sine');
      note(c, 1568, 0.16, 0.15, 0.1, 'sine');
      note(c, 2093, 0.24, 0.3, 0.12, 'sine');
      note(c, 2637, 0.32, 0.25, 0.06, 'sine');
    }, 'achievement');
  },

  // Strike added — warning buzz
  strikeAdded() {
    play(c => {
      note(c, 80, 0, 0.3, 0.2, 'sawtooth');
      note(c, 65, 0.05, 0.25, 0.15, 'sawtooth');
      noise(c, 0, 0.1, 0.1);
    }, 'strike');
  },

  // Greenlight stamp — dramatic low thud
  greenlightStamp() {
    play(c => {
      note(c, 60, 0, 0.4, 0.25, 'sine');
      note(c, 120, 0, 0.2, 0.12, 'triangle');
      noise(c, 0, 0.08, 0.2);
    }, 'greenlight');
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

  // ── New sounds for Round 90 ──

  // Card hover — very subtle tick/tap
  cardHover() {
    play(c => {
      note(c, 2400, 0, 0.025, 0.03, 'square');
    }, 'hover');
  },

  // Chemistry pair found — magical sparkle (ascending chime notes)
  chemistryPair() {
    play(c => {
      // Ascending sparkle: E6 → G#6 → B6 → E7
      note(c, 1319, 0, 0.12, 0.1, 'sine');
      note(c, 1661, 0.06, 0.12, 0.1, 'sine');
      note(c, 1976, 0.12, 0.12, 0.1, 'sine');
      note(c, 2637, 0.18, 0.25, 0.12, 'sine');
      // High shimmer overtones
      note(c, 3520, 0.2, 0.3, 0.04, 'sine');
      note(c, 4186, 0.25, 0.25, 0.03, 'sine');
    }, 'chemistry');
  },

  // Daily mode start — newspaper printing (filtered noise burst + mechanical clicks)
  dailyStart() {
    play(c => {
      // Mechanical clatter — filtered noise
      const buf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
      const src = c.createBufferSource();
      src.buffer = buf;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1200;
      bp.Q.value = 3;
      const g = c.createGain();
      g.gain.setValueAtTime(0.12, c.currentTime);
      g.gain.setValueAtTime(0.08, c.currentTime + 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.45);
      src.connect(bp).connect(g).connect(getMaster());
      src.start(c.currentTime);
      src.stop(c.currentTime + 0.5);
      // Rhythmic clicks (like rollers)
      note(c, 400, 0, 0.02, 0.08, 'square');
      note(c, 400, 0.08, 0.02, 0.06, 'square');
      note(c, 400, 0.16, 0.02, 0.06, 'square');
      note(c, 600, 0.24, 0.03, 0.05, 'square');
    }, 'daily');
  },

  // Legendary event — dramatic orchestral hit (low bass + high shimmer)
  legendaryEvent() {
    play(c => {
      // Deep bass impact
      note(c, 55, 0, 0.8, 0.3, 'sine');
      note(c, 82, 0, 0.6, 0.2, 'triangle');
      // Mid brass stab
      note(c, 220, 0, 0.4, 0.15, 'sawtooth');
      note(c, 330, 0.02, 0.35, 0.1, 'sawtooth');
      // High shimmer / cymbal
      noise(c, 0, 0.3, 0.15);
      note(c, 2093, 0.05, 0.5, 0.06, 'sine');
      note(c, 3136, 0.08, 0.5, 0.04, 'sine');
      note(c, 4186, 0.1, 0.4, 0.03, 'sine');
    }, 'legendary');
  },

  // ── New sounds for R104 ──

  // Script rewrite — paper shuffling/tearing (filtered noise burst + crinkle)
  scriptRewrite() {
    play(c => {
      // Crinkle: bandpass-filtered noise
      const buf = c.createBuffer(1, c.sampleRate * 0.35, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
      const src = c.createBufferSource();
      src.buffer = buf;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2400;
      bp.Q.value = 2;
      const g = c.createGain();
      g.gain.setValueAtTime(0.12, c.currentTime);
      g.gain.setValueAtTime(0.06, c.currentTime + 0.1);
      g.gain.setValueAtTime(0.1, c.currentTime + 0.18);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
      src.connect(bp).connect(g).connect(getMaster());
      src.start(c.currentTime);
      src.stop(c.currentTime + 0.35);
      // Tearing accent
      note(c, 1800, 0.05, 0.04, 0.06, 'square');
      note(c, 1200, 0.12, 0.04, 0.05, 'square');
    }, 'rewrite');
  },

  // Director vision reveal — dramatic reveal chord (low strings → resolve)
  directorVisionReveal() {
    play(c => {
      // Low strings swell
      note(c, 110, 0, 0.5, 0.12, 'sawtooth');
      note(c, 165, 0, 0.5, 0.08, 'sawtooth');
      // Resolve up to minor chord
      note(c, 220, 0.3, 0.4, 0.1, 'triangle');
      note(c, 262, 0.35, 0.35, 0.08, 'triangle');
      note(c, 330, 0.4, 0.3, 0.08, 'sine');
      // Subtle mystery shimmer
      note(c, 880, 0.45, 0.3, 0.03, 'sine');
    }, 'visionReveal');
  },

  // Director vision success — bright ascending arpeggio
  directorVisionSuccess() {
    play(c => {
      note(c, 659, 0, 0.15, 0.12, 'sine');
      note(c, 784, 0.08, 0.15, 0.12, 'sine');
      note(c, 988, 0.16, 0.15, 0.12, 'sine');
      note(c, 1319, 0.24, 0.3, 0.14, 'sine');
      // Sparkle
      note(c, 2637, 0.3, 0.25, 0.05, 'sine');
    }, 'visionSuccess');
  },

  // Director vision fail — muted descending minor
  directorVisionFail() {
    play(c => {
      note(c, 440, 0, 0.2, 0.08, 'triangle');
      note(c, 370, 0.15, 0.2, 0.07, 'triangle');
      note(c, 311, 0.3, 0.3, 0.06, 'triangle');
    }, 'visionFail');
  },

  // Legendary reveal — epic discovery fanfare (brass + shimmer, ~1s)
  legendaryReveal() {
    play(c => {
      // Brass stab (sawtooth = brassy)
      note(c, 165, 0, 0.6, 0.18, 'sawtooth');
      note(c, 220, 0, 0.5, 0.14, 'sawtooth');
      note(c, 330, 0.05, 0.45, 0.12, 'sawtooth');
      // Resolve chord
      note(c, 440, 0.2, 0.5, 0.1, 'triangle');
      note(c, 523, 0.25, 0.45, 0.08, 'triangle');
      note(c, 659, 0.3, 0.4, 0.08, 'triangle');
      // High shimmer
      noise(c, 0, 0.2, 0.1);
      note(c, 1760, 0.35, 0.5, 0.05, 'sine');
      note(c, 2637, 0.4, 0.5, 0.04, 'sine');
      note(c, 3520, 0.45, 0.4, 0.03, 'sine');
    }, 'legendaryReveal');
  },

  // Market forecast — newspaper printing/ticker for season headlines
  marketForecast() {
    play(c => {
      // Mechanical ticker clicks
      note(c, 600, 0, 0.02, 0.07, 'square');
      note(c, 600, 0.06, 0.02, 0.06, 'square');
      note(c, 600, 0.12, 0.02, 0.06, 'square');
      note(c, 800, 0.18, 0.02, 0.05, 'square');
      note(c, 800, 0.24, 0.02, 0.05, 'square');
      // Printing press rumble
      const buf = c.createBuffer(1, c.sampleRate * 0.4, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
      const src = c.createBufferSource();
      src.buffer = buf;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 600;
      const g = c.createGain();
      g.gain.setValueAtTime(0.06, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
      src.connect(lp).connect(g).connect(getMaster());
      src.start(c.currentTime);
      src.stop(c.currentTime + 0.4);
    }, 'forecast');
  },

  // Streak bonus — quick escalating ping
  streakBonus() {
    play(c => {
      note(c, 880, 0, 0.08, 0.1, 'sine');
      note(c, 1175, 0.06, 0.08, 0.1, 'sine');
      note(c, 1480, 0.12, 0.08, 0.1, 'sine');
      note(c, 1760, 0.18, 0.15, 0.12, 'sine');
    }, 'streak');
  },

  // ── New sounds for R121 ──

  // Content unlock — magical discovery fanfare
  contentUnlock() {
    play(c => {
      // Lock opening click
      noise(c, 0, 0.06, 0.12);
      note(c, 400, 0, 0.05, 0.1, 'square');
      // Ascending discovery arpeggio: E5 → G#5 → B5 → E6
      note(c, 659, 0.1, 0.2, 0.12, 'sine');
      note(c, 831, 0.2, 0.2, 0.12, 'sine');
      note(c, 988, 0.3, 0.2, 0.12, 'sine');
      note(c, 1319, 0.4, 0.4, 0.15, 'sine');
      // High shimmer
      note(c, 2637, 0.45, 0.35, 0.06, 'sine');
      note(c, 3520, 0.5, 0.3, 0.04, 'sine');
      // Warm resolve chord
      note(c, 330, 0.5, 0.5, 0.08, 'triangle');
      note(c, 494, 0.5, 0.5, 0.06, 'triangle');
    }, 'unlock');
  },

  // Challenge modifier toggle — satisfying click/switch
  modifierToggle() {
    play(c => {
      note(c, 1000, 0, 0.04, 0.1, 'square');
      note(c, 1400, 0.03, 0.05, 0.08, 'triangle');
      noise(c, 0.01, 0.03, 0.06);
    }, 'modToggle');
  },

  // Share/copy — brief camera shutter / clipboard snap
  shareSnap() {
    play(c => {
      // Sharp click
      noise(c, 0, 0.04, 0.15);
      note(c, 2000, 0, 0.03, 0.08, 'square');
      // Mechanical release
      note(c, 800, 0.04, 0.06, 0.06, 'square');
      noise(c, 0.05, 0.03, 0.08);
    }, 'share');
  },

  // Stats tab switch — subtle tab click
  tabSwitch() {
    play(c => {
      note(c, 1600, 0, 0.03, 0.05, 'square');
      note(c, 1200, 0.02, 0.03, 0.03, 'triangle');
    }, 'tab');
  },

  // Genre mastery milestone — celebration chime
  masteryMilestone() {
    play(c => {
      // Ascending major arpeggio: C5 E5 G5 C6
      note(c, 523, 0, 0.2, 0.12, 'sine');
      note(c, 659, 0.1, 0.2, 0.12, 'sine');
      note(c, 784, 0.2, 0.2, 0.12, 'sine');
      note(c, 1047, 0.3, 0.4, 0.15, 'sine');
      // Sparkle overlay
      note(c, 2093, 0.35, 0.3, 0.06, 'sine');
      note(c, 2637, 0.4, 0.25, 0.04, 'sine');
      // Tiny noise shimmer
      noise(c, 0.3, 0.15, 0.04);
    }, 'mastery');
  },

  // Weekly challenge start — intense version of dailyStart
  weeklyStart() {
    play(c => {
      // Heavier mechanical clatter
      const buf = c.createBuffer(1, c.sampleRate * 0.6, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
      const src = c.createBufferSource();
      src.buffer = buf;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1000;
      bp.Q.value = 2;
      const g = c.createGain();
      g.gain.setValueAtTime(0.15, c.currentTime);
      g.gain.setValueAtTime(0.1, c.currentTime + 0.2);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.55);
      src.connect(bp).connect(g).connect(getMaster());
      src.start(c.currentTime);
      src.stop(c.currentTime + 0.6);
      // More dramatic clicks — lower pitch, more of them
      note(c, 300, 0, 0.03, 0.1, 'square');
      note(c, 300, 0.06, 0.03, 0.08, 'square');
      note(c, 300, 0.12, 0.03, 0.08, 'square');
      note(c, 300, 0.18, 0.03, 0.07, 'square');
      note(c, 500, 0.24, 0.04, 0.06, 'square');
      note(c, 500, 0.30, 0.04, 0.06, 'square');
      // Low rumble undertone
      note(c, 80, 0, 0.5, 0.08, 'sine');
    }, 'weekly');
  },

  // Event resolution — positive outcome (warm ascending)
  eventPositive() {
    play(c => {
      note(c, 440, 0, 0.15, 0.1, 'triangle');
      note(c, 554, 0.08, 0.15, 0.1, 'triangle');
      note(c, 659, 0.16, 0.2, 0.12, 'sine');
    }, 'eventPos');
  },

  // Event resolution — negative outcome (dark descending)
  eventNegative() {
    play(c => {
      note(c, 440, 0, 0.15, 0.08, 'triangle');
      note(c, 370, 0.1, 0.15, 0.07, 'triangle');
      note(c, 311, 0.2, 0.2, 0.06, 'sine');
    }, 'eventNeg');
  },

  // Extended cut decision — dramatic film reel
  extendedCut() {
    play(c => {
      // Film reel sprocket clicks
      for (let i = 0; i < 6; i++) {
        note(c, 500 + i * 30, i * 0.05, 0.03, 0.07, 'square');
      }
      // Projector whir (filtered noise)
      const buf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
      const src = c.createBufferSource();
      src.buffer = buf;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 800;
      bp.Q.value = 4;
      const g = c.createGain();
      g.gain.setValueAtTime(0.06, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.45);
      src.connect(bp).connect(g).connect(getMaster());
      src.start(c.currentTime);
      src.stop(c.currentTime + 0.5);
      // Dramatic low tone
      note(c, 110, 0.1, 0.4, 0.1, 'sawtooth');
      note(c, 165, 0.15, 0.35, 0.06, 'triangle');
    }, 'extCut');
  },

  // Completion bond trigger — shield/protection activation
  completionBond() {
    play(c => {
      // Shield activation — resonant metallic ping
      note(c, 800, 0, 0.3, 0.15, 'sine');
      note(c, 1200, 0.02, 0.25, 0.12, 'sine');
      note(c, 1600, 0.04, 0.2, 0.08, 'sine');
      // Low protective hum
      note(c, 150, 0, 0.5, 0.1, 'triangle');
      note(c, 200, 0.05, 0.4, 0.08, 'triangle');
      // Shimmer
      noise(c, 0, 0.08, 0.1);
      note(c, 2400, 0.1, 0.3, 0.04, 'sine');
    }, 'bond');
  },

  // Prestige level up — epic ascending chord progression
  prestigeUp() {
    play(c => {
      // Chord 1: C major (C4-E4-G4)
      note(c, 262, 0, 0.4, 0.12, 'triangle');
      note(c, 330, 0, 0.4, 0.1, 'triangle');
      note(c, 392, 0, 0.4, 0.1, 'triangle');
      // Chord 2: F major (F4-A4-C5)
      note(c, 349, 0.3, 0.4, 0.12, 'triangle');
      note(c, 440, 0.3, 0.4, 0.1, 'triangle');
      note(c, 523, 0.3, 0.4, 0.1, 'triangle');
      // Chord 3: G major (G4-B4-D5)
      note(c, 392, 0.6, 0.4, 0.12, 'triangle');
      note(c, 494, 0.6, 0.4, 0.1, 'triangle');
      note(c, 587, 0.6, 0.4, 0.1, 'triangle');
      // Resolve: C major octave up (C5-E5-G5-C6)
      note(c, 523, 0.9, 0.6, 0.15, 'sine');
      note(c, 659, 0.9, 0.6, 0.12, 'sine');
      note(c, 784, 0.9, 0.6, 0.12, 'sine');
      note(c, 1047, 0.95, 0.55, 0.1, 'sine');
      // Final shimmer
      note(c, 2093, 1.0, 0.5, 0.05, 'sine');
      note(c, 2637, 1.05, 0.45, 0.04, 'sine');
    }, 'prestige');
  },
};
