/*
 * ══════════════════════════════════════════════════════════════════════
 * R212 — Story Events: Narrative Milestones
 * ══════════════════════════════════════════════════════════════════════
 * Scripted narrative events that fire at career milestones.
 * Each event has a trigger predicate, dialog text, two player choices,
 * and outcome effects (reputation / budget / morale-as-quality-bonus).
 * ══════════════════════════════════════════════════════════════════════
 */

import type { GameState, SeasonResult } from './types';

// ── Types ──────────────────────────────────────────────────────────

export interface StoryEventOutcome {
  reputation: number;  // delta
  budget: number;      // delta ($M)
  morale: number;      // delta (applied as quality bonus next film)
  label: string;       // short preview shown on hover
}

export interface StoryEventChoice {
  text: string;
  outcome: StoryEventOutcome;
}

export interface StoryEvent {
  id: string;
  title: string;
  portrait: string;       // emoji placeholder for character portrait
  dialog: string[];       // 2-3 lines of typewriter text
  choices: [StoryEventChoice, StoryEventChoice];
  trigger: (state: GameState, firedIds: Set<string>) => boolean;
}

// ── Helpers ────────────────────────────────────────────────────────

function flopStreak(history: SeasonResult[]): number {
  let count = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].tier === 'FLOP') count++;
    else break;
  }
  return count;
}

function totalFilms(state: GameState): number {
  return state.seasonHistory.length;
}

function hasS(history: SeasonResult[]): boolean {
  return history.some(h => h.tier === 'BLOCKBUSTER');
}

// ── Event Definitions ──────────────────────────────────────────────

export const STORY_EVENTS: StoryEvent[] = [
  // 1. First Film Greenlit (tutorial flavor)
  {
    id: 'first_film_greenlit',
    title: 'Lights, Camera…',
    portrait: '🎬',
    dialog: [
      'The studio lot smells like fresh paint and ambition.',
      'Your first film is greenlit. The industry is watching.',
      'How you start will define everything that follows.',
    ],
    choices: [
      {
        text: 'Play it safe — stick to the formula',
        outcome: { reputation: 0, budget: 3, morale: 0, label: '+$3M budget' },
      },
      {
        text: 'Swing for the fences — make a statement',
        outcome: { reputation: 1, budget: -2, morale: 2, label: '+1 rep, +2 morale, −$2M' },
      },
    ],
    trigger: (state, fired) => !fired.has('first_film_greenlit') && state.season === 1 && state.seasonHistory.length === 0,
  },

  // 2. First Hit
  {
    id: 'first_hit',
    title: 'Opening Weekend Magic',
    portrait: '🎉',
    dialog: [
      'The numbers are in. Your film is a hit.',
      'Champagne corks pop in the executive suite.',
      'Now the question: what do you do with momentum?',
    ],
    choices: [
      {
        text: 'Reinvest in quality — hire better talent',
        outcome: { reputation: 0, budget: -3, morale: 3, label: '+3 morale, −$3M' },
      },
      {
        text: 'Cash in — maximize the returns',
        outcome: { reputation: 0, budget: 5, morale: -1, label: '+$5M, −1 morale' },
      },
    ],
    trigger: (state, fired) => !fired.has('first_hit') && state.seasonHistory.some(h => h.tier === 'HIT' || h.tier === 'BLOCKBUSTER'),
  },

  // 3. First Flop
  {
    id: 'first_flop',
    title: 'The Morning After',
    portrait: '📉',
    dialog: [
      'The reviews are brutal. The box office is worse.',
      'Your phone stops ringing. The trades are circling.',
      'Every great studio has a flop. It\'s what comes next that matters.',
    ],
    choices: [
      {
        text: 'Lay low — cut costs and regroup',
        outcome: { reputation: 0, budget: 4, morale: -1, label: '+$4M, −1 morale' },
      },
      {
        text: 'Double down — announce something bold',
        outcome: { reputation: 1, budget: -3, morale: 2, label: '+1 rep, +2 morale, −$3M' },
      },
    ],
    trigger: (state, fired) => !fired.has('first_flop') && state.seasonHistory.some(h => h.tier === 'FLOP'),
  },

  // 4. Studio Milestone — 10 Films
  {
    id: 'milestone_10',
    title: 'A Decade of Dreams',
    portrait: '🏛️',
    dialog: [
      'Ten films. Your studio has a filmography now.',
      'The trades run a retrospective. "A studio to watch," they say.',
    ],
    choices: [
      {
        text: 'Stay the course — consistency builds empires',
        outcome: { reputation: 1, budget: 0, morale: 1, label: '+1 rep, +1 morale' },
      },
      {
        text: 'Pivot hard — reinvent the brand',
        outcome: { reputation: 0, budget: 0, morale: 3, label: '+3 morale' },
      },
    ],
    trigger: (state, fired) => !fired.has('milestone_10') && totalFilms(state) >= 10,
  },

  // 5. Studio Milestone — 25 Films
  {
    id: 'milestone_25',
    title: 'Silver Screen Legacy',
    portrait: '🌟',
    dialog: [
      'Twenty-five films. You\'ve outlasted studios twice your size.',
      'A journalist asks: "What\'s the secret?"',
    ],
    choices: [
      {
        text: '"We never compromise on story."',
        outcome: { reputation: 1, budget: 0, morale: 2, label: '+1 rep, +2 morale' },
      },
      {
        text: '"We give the audience what they want."',
        outcome: { reputation: 0, budget: 5, morale: 0, label: '+$5M' },
      },
    ],
    trigger: (state, fired) => !fired.has('milestone_25') && totalFilms(state) >= 25,
  },

  // 6. Studio Milestone — 50 Films
  {
    id: 'milestone_50',
    title: 'The Golden Lot',
    portrait: '👑',
    dialog: [
      'Fifty films. Your studio gate is a landmark.',
      'They want to name a soundstage after you.',
      'This is what permanence feels like.',
    ],
    choices: [
      {
        text: 'Accept gracefully — you\'ve earned it',
        outcome: { reputation: 1, budget: 5, morale: 2, label: '+1 rep, +$5M, +2 morale' },
      },
      {
        text: '"We\'re just getting started."',
        outcome: { reputation: 0, budget: 0, morale: 5, label: '+5 morale' },
      },
    ],
    trigger: (state, fired) => !fired.has('milestone_50') && totalFilms(state) >= 50,
  },

  // 7. Rival Encounter — nemesis beats you
  {
    id: 'rival_encounter',
    title: 'Outgunned',
    portrait: '🎭',
    dialog: [
      'Your rival\'s latest film crushed yours at the box office.',
      'The trades are already calling it a rivalry.',
      'The town only remembers winners.',
    ],
    choices: [
      {
        text: 'Study their playbook — learn from the loss',
        outcome: { reputation: 0, budget: 0, morale: 3, label: '+3 morale' },
      },
      {
        text: 'Outspend them — pour money into the next one',
        outcome: { reputation: 0, budget: -5, morale: 1, label: '−$5M, +1 morale' },
      },
    ],
    trigger: (state, fired) => !fired.has('rival_encounter') && state.nemesisStudio !== null,
  },

  // 8. Oscar Moment — first BLOCKBUSTER (S-rank)
  {
    id: 'oscar_moment',
    title: 'And the Award Goes To…',
    portrait: '🏆',
    dialog: [
      'The envelope opens. Your film\'s name echoes through the hall.',
      'The standing ovation lasts forty-five seconds.',
      'Everything you sacrificed led to this.',
    ],
    choices: [
      {
        text: 'Stay humble — "This belongs to the whole team."',
        outcome: { reputation: 1, budget: 3, morale: 2, label: '+1 rep, +$3M, +2 morale' },
      },
      {
        text: 'Go big — announce your magnum opus next',
        outcome: { reputation: 0, budget: -5, morale: 5, label: '−$5M, +5 morale' },
      },
    ],
    trigger: (state, fired) => !fired.has('oscar_moment') && hasS(state.seasonHistory),
  },

  // 9. Career Crisis — 3 flops in a row
  {
    id: 'career_crisis',
    title: 'The Darkest Hour',
    portrait: '🌑',
    dialog: [
      'Three flops in a row. The board wants your head.',
      'Your office is quiet. Too quiet.',
      'This is where careers die — or legends are born.',
    ],
    choices: [
      {
        text: 'Accept the restructuring — survive to fight again',
        outcome: { reputation: -1, budget: 8, morale: -2, label: '−1 rep, +$8M, −2 morale' },
      },
      {
        text: 'Bet everything on one last film',
        outcome: { reputation: 0, budget: -3, morale: 5, label: '−$3M, +5 morale' },
      },
    ],
    trigger: (state, fired) => !fired.has('career_crisis') && flopStreak(state.seasonHistory) >= 3,
  },

  // 10. Legacy Moment — high prestige run
  {
    id: 'legacy_moment',
    title: 'Written in the Stars',
    portrait: '✨',
    dialog: [
      'Your name is spoken alongside the greats.',
      'They\'re already writing books about your studio.',
      'The only question left: how does the story end?',
    ],
    choices: [
      {
        text: 'Go out on top — make one perfect film',
        outcome: { reputation: 1, budget: -5, morale: 5, label: '+1 rep, −$5M, +5 morale' },
      },
      {
        text: 'Build a dynasty — invest in the future',
        outcome: { reputation: 0, budget: 10, morale: 0, label: '+$10M' },
      },
    ],
    trigger: (state, fired) => !fired.has('legacy_moment') && state.reputation >= 5 && totalFilms(state) >= 4,
  },
];

// ── Runtime ────────────────────────────────────────────────────────

/** Check all story events and return the first one whose trigger fires, or null. */
export function checkStoryEvents(state: GameState, firedIds: Set<string>): StoryEvent | null {
  for (const event of STORY_EVENTS) {
    if (event.trigger(state, firedIds)) {
      return event;
    }
  }
  return null;
}
