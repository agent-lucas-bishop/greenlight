/*
 * ══════════════════════════════════════════════════════════════════════
 * R183 — Cinematic Cutscenes & Story Moments
 * ══════════════════════════════════════════════════════════════════════
 * Text-based "cinematic" moments that play at key game milestones.
 * Each cutscene has typewriter text, a themed gradient, and a mood.
 */

export interface CutsceneData {
  id: string;
  lines: string[];
  gradient: string; // CSS gradient for background
  mood: 'warm' | 'dramatic' | 'dark' | 'triumphant' | 'tense';
  typingSpeed?: number; // ms per character (default 35)
}

export const CUTSCENES: Record<string, CutsceneData> = {
  gameStart: {
    id: 'gameStart',
    lines: [
      'The studio lot is quiet.',
      'A single light flickers in the office window...',
      'You take a breath. This is your chance.',
      'Make something they\'ll remember.',
    ],
    gradient: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a3e 40%, #2a1a3e 100%)',
    mood: 'warm',
    typingSpeed: 40,
  },

  firstBlockbuster: {
    id: 'firstBlockbuster',
    lines: [
      'The premiere lights up Hollywood Boulevard.',
      'Flashbulbs pop. The crowd roars.',
      'Your name is on every marquee in town.',
      'This is what it feels like.',
    ],
    gradient: 'linear-gradient(180deg, #1a0a00 0%, #3d1a00 30%, #d4a843 100%)',
    mood: 'triumphant',
    typingSpeed: 35,
  },

  firstFlop: {
    id: 'firstFlop',
    lines: [
      'Critics sharpen their pens.',
      'The empty theater echoes with silence.',
      'But the best stories are about comebacks.',
    ],
    gradient: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a1a 100%)',
    mood: 'dark',
    typingSpeed: 45,
  },

  nemesisAppears: {
    id: 'nemesisAppears',
    lines: [
      'A shadow falls across your desk.',
      '{rivalName} has arrived.',
      'They\'re not here to share the spotlight.',
    ],
    gradient: 'linear-gradient(180deg, #0a0000 0%, #2a0a0a 40%, #1a0a1a 100%)',
    mood: 'tense',
    typingSpeed: 45,
  },

  endlessMode: {
    id: 'endlessMode',
    lines: [
      'They said you couldn\'t keep going.',
      'You smiled.',
      'The camera rolls. Again.',
    ],
    gradient: 'linear-gradient(180deg, #0a0a1a 0%, #1a2a3e 40%, #0a1a2a 100%)',
    mood: 'dramatic',
    typingSpeed: 40,
  },

  finalSeason: {
    id: 'finalSeason',
    lines: [
      'One last chance.',
      'Make it count.',
    ],
    gradient: 'linear-gradient(180deg, #1a0a00 0%, #2a1a0a 40%, #0a0a0a 100%)',
    mood: 'dramatic',
    typingSpeed: 50,
  },
};

/* ── Cutscene trigger tracking ────────────────────────────────── */

const LS_KEY = 'greenlight-cutscenes-seen';
const SETTING_KEY = 'greenlight-show-story-moments';

export function isStoryMomentsEnabled(): boolean {
  try {
    const v = localStorage.getItem(SETTING_KEY);
    return v === null ? true : v === 'true';
  } catch { return true; }
}

export function setStoryMomentsEnabled(v: boolean): void {
  try { localStorage.setItem(SETTING_KEY, String(v)); } catch {}
}

function getSeenSet(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function markSeen(id: string): void {
  const seen = getSeenSet();
  seen.add(id);
  try { localStorage.setItem(LS_KEY, JSON.stringify([...seen])); } catch {}
}

export function hasCutsceneBeenSeen(id: string): boolean {
  return getSeenSet().has(id);
}

export function markCutsceneSeen(id: string): void {
  markSeen(id);
}

/**
 * Resolve template variables in cutscene lines.
 * Currently supports: {rivalName}
 */
export function resolveLines(cutscene: CutsceneData, vars: Record<string, string> = {}): string[] {
  return cutscene.lines.map(line => {
    let result = line;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
  });
}
