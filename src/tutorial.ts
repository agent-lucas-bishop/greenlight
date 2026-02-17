// Interactive step-by-step tutorial system for first-time players
// Replaces static "How to Play" modal with contextual guided steps

import { GamePhase } from './types';

const STORAGE_KEY = 'greenlight_tutorial';

export interface TutorialStep {
  id: string;
  phase: GamePhase;
  title: string;
  text: string;
  targetSelector?: string; // CSS selector to highlight
  position: 'top' | 'bottom' | 'center';
  dismissLabel?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'neow-intro',
    phase: 'neow',
    title: '🎁 Your Starting Bonus',
    text: 'Each option shapes your early game. The star is powerful but fades, cash gives flexibility, and the perk protects you from bad luck. Pick one!',
    position: 'top',
    dismissLabel: 'Got it!',
  },
  {
    id: 'greenlight-intro',
    phase: 'greenlight',
    title: '📝 Step 1: Pick a Script',
    text: 'Choose a script for your movie. Each has a genre, base score, and cast slots. Try to match the genre to Hot trends for bonus earnings!',
    targetSelector: '.card-grid',
    position: 'top',
    dismissLabel: 'Pick a script →',
  },
  {
    id: 'casting-intro',
    phase: 'casting',
    title: '🎭 Step 2: Cast Your Talent',
    text: 'Drag talent into slots. Each actor adds cards to your production deck. High Skill = good cards. High Heat = powerful BUT adds risky Incident cards.',
    targetSelector: '.cast-slots',
    position: 'top',
    dismissLabel: 'Start casting →',
  },
  {
    id: 'production-intro',
    phase: 'production',
    title: '🎬 Step 3: Production!',
    text: 'Draw 2 cards, keep 1. Incidents auto-play — if you get 3, it\'s a DISASTER and you lose all quality! You can wrap early to play it safe.',
    targetSelector: '.production-controls',
    position: 'top',
    dismissLabel: 'Let\'s shoot! 🎬',
  },
  {
    id: 'release-intro',
    phase: 'release',
    title: '📊 Step 4: Box Office!',
    text: 'Your quality × market conditions = box office. Hit the target to avoid a strike. 3 strikes and you\'re fired! After this, you\'ll shop for upgrades.',
    position: 'top',
    dismissLabel: 'See results →',
  },
  {
    id: 'event-intro',
    phase: 'event',
    title: '📰 Season Events (NEW!)',
    text: 'Between seasons, industry news shakes things up! Pick one event to shape your next season — or skip if none look good. Events add strategic variety to every run.',
    position: 'top',
    dismissLabel: 'Interesting! →',
  },
  {
    id: 'shop-intro',
    phase: 'shop',
    title: '🏠 Between Seasons',
    text: 'Buy studio perks for permanent bonuses, hire new talent, or train existing talent to improve their cards. Then it\'s on to the next season!',
    position: 'top',
    dismissLabel: 'Got it!',
  },
];

interface TutorialState {
  active: boolean; // tutorial is running
  stepsCompleted: string[]; // step IDs completed
  dismissed: boolean; // player dismissed the whole tutorial
}

function getTutorialState(): TutorialState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { active: true, stepsCompleted: [], dismissed: false };
}

function saveTutorialState(s: TutorialState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function isTutorialActive(): boolean {
  const s = getTutorialState();
  return s.active && !s.dismissed;
}

export function getTutorialStepForPhase(phase: GamePhase): TutorialStep | null {
  if (!isTutorialActive()) return null;
  const s = getTutorialState();
  const step = TUTORIAL_STEPS.find(t => t.phase === phase && !s.stepsCompleted.includes(t.id));
  return step || null;
}

export function completeTutorialStep(stepId: string) {
  const s = getTutorialState();
  if (!s.stepsCompleted.includes(stepId)) {
    s.stepsCompleted.push(stepId);
  }
  // If all steps completed, deactivate
  if (TUTORIAL_STEPS.every(t => s.stepsCompleted.includes(t.id))) {
    s.active = false;
  }
  saveTutorialState(s);
}

export function dismissTutorial() {
  const s = getTutorialState();
  s.dismissed = true;
  s.active = false;
  saveTutorialState(s);
}

export function resetTutorial() {
  saveTutorialState({ active: true, stepsCompleted: [], dismissed: false });
}
