// Procedural sound effects using Web Audio API — no external files needed
let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function play(fn: (c: AudioContext) => void) {
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
  o.connect(g).connect(c.destination);
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
  src.connect(g).connect(c.destination);
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
      o.connect(g).connect(c.destination);
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
      o.connect(g).connect(c.destination);
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
};
