// First-time player detection and contextual tips

const STORAGE_KEY = 'greenlight_onboarding';

interface OnboardingState {
  hasPlayedBefore: boolean;
  phasesVisited: Record<string, boolean>;
  tipsDissmissed: Record<string, boolean>;
  runCount: number;
}

function getOnboarding(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { hasPlayedBefore: false, phasesVisited: {}, tipsDissmissed: {}, runCount: 0 };
}

function saveOnboarding(s: OnboardingState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function isFirstRun(): boolean {
  return !getOnboarding().hasPlayedBefore;
}

export function markRunStarted() {
  const s = getOnboarding();
  s.hasPlayedBefore = true;
  s.runCount++;
  // Reset phase visits each run so tips show again for new players
  s.phasesVisited = {};
  saveOnboarding(s);
}

export function isPhaseFirstVisit(phase: string): boolean {
  const s = getOnboarding();
  return !s.phasesVisited[phase];
}

export function markPhaseVisited(phase: string) {
  const s = getOnboarding();
  s.phasesVisited[phase] = true;
  saveOnboarding(s);
}

export function isTipDismissed(tipId: string): boolean {
  const s = getOnboarding();
  return !!s.tipsDissmissed[tipId];
}

export function dismissTip(tipId: string) {
  const s = getOnboarding();
  s.tipsDissmissed[tipId] = true;
  saveOnboarding(s);
}

export function getRunCount(): number {
  return getOnboarding().runCount;
}

// Phase-specific contextual tips shown on first visit
export const PHASE_TIPS: Record<string, { icon: string; title: string; text: string }> = {
  neow: {
    icon: '🎁',
    title: 'Starting Bonus',
    text: 'Each option shapes your early game differently. The cash is safe, the star is powerful but risky, and the perk protects against bad luck.',
  },
  greenlight: {
    icon: '📝',
    title: 'Pick Your Script',
    text: 'Match the genre to market conditions (shown above) for a big box office multiplier. Check the slot types — they determine who you can cast.',
  },
  casting: {
    icon: '🎭',
    title: 'Build Your Deck',
    text: 'Each talent adds their cards to production. High Skill = great cards. High Heat = powerful BUT adds Incident cards. Look for 💕 chemistry pairs and 🔥🎯💀💕✨ tag synergies!',
  },
  production: {
    icon: '🎬',
    title: 'Lights, Camera, Action!',
    text: 'Each draw reveals 2 cards. Incidents auto-play (bad!). You pick 1 of the remaining Action cards. 3 incidents = DISASTER. Wrap early to play safe, or push for more quality. Use Director\'s Cut to peek ahead!',
  },
  release: {
    icon: '🎬',
    title: 'Box Office',
    text: 'Your quality × market conditions determines earnings. Hit the target to avoid a strike. 3 strikes = game over!',
  },
  shop: {
    icon: '🏠',
    title: 'Prepare for Next Season',
    text: 'Buy studio perks for permanent bonuses. Hire new talent to expand your roster. Train existing talent to remove bad cards or boost good ones.',
  },
};

