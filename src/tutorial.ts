// Interactive step-by-step tutorial system for first-time players
// Tracks completion in localStorage under 'greenlight-tutorial'

import { GamePhase } from './types';
import { getSettings } from './settings';

const STORAGE_KEY = 'greenlight-tutorial';

export interface TutorialStep {
  id: string;
  phase: GamePhase;
  title: string;
  text: string;
  targetSelector?: string; // CSS selector to highlight
  position: 'top' | 'bottom' | 'center' | 'left' | 'right';
  dismissLabel?: string;
  action?: string; // describes what completes this step (informational)
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    phase: 'neow',
    title: '🎬 Welcome to GREENLIGHT!',
    text: 'You\'re now a Hollywood studio head. Your mission: survive 5 seasons of moviemaking, hit box office targets, and build your reputation. Let\'s learn the ropes!',
    position: 'center',
    dismissLabel: 'Let\'s go!',
    action: 'click-next',
  },
  {
    id: 'budget-explanation',
    phase: 'neow',
    title: '💰 Your Budget',
    text: 'Budget is your lifeblood — use it to hire talent, buy perks, and improve your studio. Overspending creates debt that eats into future earnings. Spend wisely!',
    position: 'top',
    dismissLabel: 'Got it!',
    action: 'click-next',
  },
  {
    id: 'neow-intro',
    phase: 'neow',
    title: '🎁 Your Starting Bonus',
    text: 'Each option shapes your early game. The star is powerful but fades, cash gives flexibility, and the perk protects you from bad luck. Pick one!',
    position: 'top',
    dismissLabel: 'Got it!',
    action: 'pick-bonus',
  },
  {
    id: 'greenlight-intro',
    phase: 'greenlight',
    title: '📝 Pick a Script',
    text: 'Choose a script for your movie. Each has a genre, base score, and cast slots. Try to match the genre to Hot 🔥 trends for bonus earnings!',
    targetSelector: '.card-grid',
    position: 'top',
    dismissLabel: 'Pick a script →',
    action: 'select-script',
  },
  {
    id: 'genre-selection',
    phase: 'greenlight',
    title: '🎭 Genre Strategy',
    text: 'Genres matter! Hot genres earn bonus box office, while cold genres are harder to profit from. Look at the market conditions panel for tips on what\'s trending.',
    targetSelector: '.market-info, .market-panel',
    position: 'top',
    dismissLabel: 'Understood!',
    action: 'click-next',
  },
  {
    id: 'deck-overview',
    phase: 'casting',
    title: '🃏 Your Deck = Your Cast',
    text: 'Each actor you cast adds their cards to your production deck. High Skill = great Action cards. High Heat = powerful cards AND risky Incident cards. Your cast IS your deck!',
    targetSelector: '.cast-slots',
    position: 'top',
    dismissLabel: 'Start casting →',
    action: 'cast-talent',
  },
  {
    id: 'first-card-draw',
    phase: 'production',
    title: '🃏 Drawing Cards',
    text: 'You just drew your first cards! Each round you draw 2 and pick 1 to play. Action cards boost quality, while Incident cards are risks from high-Heat talent.',
    targetSelector: '.hand-cards, .card-choices',
    position: 'top',
    dismissLabel: 'Pick a card! →',
    action: 'draw-cards',
  },
  {
    id: 'first-card-play',
    phase: 'production',
    title: '🎬 Playing a Card',
    text: 'Nice pick! Each card you play adds to your film\'s quality score. Some cards have bonus effects — look for synergy with your genre and cast.',
    targetSelector: '.production-controls',
    position: 'top',
    dismissLabel: 'Keep shooting! 🎬',
    action: 'play-card',
  },
  {
    id: 'first-production',
    phase: 'production',
    title: '🎥 Production Has Begun!',
    text: 'Your film is in production! Draw and play cards to build quality. Watch the incident counter — 3 incidents = DISASTER and you lose everything. Wrap early if it gets risky.',
    targetSelector: '.production-controls',
    position: 'top',
    dismissLabel: 'Let\'s shoot! 🎬',
    action: 'start-production',
  },
  {
    id: 'quality-vs-budget',
    phase: 'production',
    title: '⚖️ Quality vs Budget Tradeoff',
    text: 'Higher quality earns more at the box office, but elite talent costs more budget. Balance your spending against your expected returns. Sometimes a lean film beats an expensive flop!',
    position: 'top',
    dismissLabel: 'Smart thinking!',
    action: 'click-next',
  },
  {
    id: 'box-office-results',
    phase: 'release',
    title: '📊 Box Office Results',
    text: 'Your quality × market conditions = box office. Hit the target to avoid a strike. 3 strikes and you\'re fired! After this, you\'ll shop for upgrades.',
    position: 'top',
    dismissLabel: 'See results →',
    action: 'view-results',
  },
  {
    id: 'reputation',
    phase: 'release',
    title: '⭐ Reputation Matters',
    text: 'Your star rating (1–5) multiplies ALL box office earnings. Hits boost it, flops drop it. If reputation reaches 0, game over! Protect those stars.',
    position: 'top',
    dismissLabel: 'I\'ll guard my stars!',
    action: 'click-next',
  },
  {
    id: 'event-intro',
    phase: 'event',
    title: '📰 Season Events',
    text: 'Between seasons, industry news shakes things up! Pick one event to shape your next season — or skip if none look good. Events add strategic variety to every run.',
    position: 'top',
    dismissLabel: 'Interesting! →',
    action: 'pick-event',
  },
  {
    id: 'shop-intro',
    phase: 'shop',
    title: '🏠 Between Seasons',
    text: 'Buy studio perks for permanent bonuses, hire new talent, or train existing talent to improve their cards. Then it\'s on to the next season!',
    position: 'top',
    dismissLabel: 'Got it!',
    action: 'visit-shop',
  },
  {
    id: 'seasons-explained',
    phase: 'shop',
    title: '📅 Seasons & Progression',
    text: 'Each season the box office target increases. You get a $5 stipend per season plus your earnings. Plan ahead — early investments in perks and talent pay off in later seasons!',
    position: 'top',
    dismissLabel: 'Strategic!',
    action: 'click-next',
  },
  {
    id: 'winning-condition',
    phase: 'shop',
    title: '🏆 How to Win',
    text: 'Survive all 5 seasons without getting 3 strikes or losing all reputation. The higher your total box office and reputation at the end, the better your score. Good luck, Studio Head!',
    position: 'center',
    dismissLabel: 'Let\'s make movies! 🎬',
    action: 'click-next',
  },
  {
    id: 'first-award',
    phase: 'festival',
    title: '🏆 Awards & Festivals',
    text: 'Your film has been nominated! Awards boost reputation and can unlock prestige bonuses. High-quality films with strong casts have the best chances.',
    targetSelector: '.festival-panel, .award-panel',
    position: 'top',
    dismissLabel: 'Fingers crossed! 🤞',
    action: 'view-festival',
  },
  {
    id: 'endgame-tips',
    phase: 'victory',
    title: '🌟 Congratulations!',
    text: 'You survived! Try again at higher prestige for tougher targets and new legacy perks. Experiment with different genres, archetypes, and strategies. Every run is different!',
    position: 'center',
    dismissLabel: 'One more run! 🎬',
    action: 'click-next',
  },
];

interface TutorialState {
  active: boolean;
  stepsCompleted: string[];
  dismissed: boolean;
}

function getTutorialState(): TutorialState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    // Migrate from old key if present
    const oldRaw = localStorage.getItem('greenlight_tutorial');
    if (oldRaw) {
      const old = JSON.parse(oldRaw);
      saveTutorialState(old);
      try { localStorage.removeItem('greenlight_tutorial'); } catch {}
      return old;
    }
  } catch {}
  return { active: true, stepsCompleted: [], dismissed: false };
}

function saveTutorialState(s: TutorialState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function isTutorialActive(): boolean {
  // Respect the tutorial_hints gameplay setting toggle
  try {
    if (!getSettings().gameplay.tutorialHints) return false;
  } catch {}
  const s = getTutorialState();
  return s.active && !s.dismissed;
}

export function getTutorialStepForPhase(phase: GamePhase): TutorialStep | null {
  if (!isTutorialActive()) return null;
  const s = getTutorialState();
  const step = TUTORIAL_STEPS.find(t => t.phase === phase && !s.stepsCompleted.includes(t.id));
  return step || null;
}

/** Returns step index (1-based) for current step and total steps */
export function getTutorialProgress(stepId: string): { current: number; total: number } {
  const idx = TUTORIAL_STEPS.findIndex(t => t.id === stepId);
  return { current: idx + 1, total: TUTORIAL_STEPS.length };
}

export function completeTutorialStep(stepId: string) {
  const s = getTutorialState();
  if (!s.stepsCompleted.includes(stepId)) {
    s.stepsCompleted.push(stepId);
  }
  if (TUTORIAL_STEPS.every(t => s.stepsCompleted.includes(t.id))) {
    s.active = false;
    try { localStorage.setItem('gl_tutorial_completed', '1'); } catch {}
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

/** Alias for completeTutorialStep — matches onboarding API convention */
export function markStepSeen(stepId: string) {
  completeTutorialStep(stepId);
}

/** Start (or restart) the tutorial from scratch */
export function startTutorial() {
  saveTutorialState({ active: true, stepsCompleted: [], dismissed: false });
  try { localStorage.removeItem('gl_tutorial_completed'); } catch {}
}

/** Advance to the next uncompleted step — completes the current step for the given phase */
export function advanceTutorial(phase: GamePhase) {
  const step = getTutorialStepForPhase(phase);
  if (step) completeTutorialStep(step.id);
}

/** Skip the entire tutorial and mark as completed */
export function skipTutorial() {
  dismissTutorial();
  try { localStorage.setItem('gl_tutorial_completed', '1'); } catch {}
}

/** Returns true when every tutorial step has been completed (or tutorial was dismissed) */
export function isTutorialComplete(): boolean {
  const s = getTutorialState();
  if (s.dismissed) return true;
  return TUTORIAL_STEPS.every(t => s.stepsCompleted.includes(t.id));
}

/** Returns true if this is a first-time player (no tutorial state saved yet) */
export function isFirstTimePlayer(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === null && localStorage.getItem('greenlight_tutorial') === null;
  } catch {
    return true;
  }
}
