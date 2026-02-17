// First-time player detection and contextual tips

const STORAGE_KEY = 'greenlight_onboarding';

interface OnboardingState {
  hasPlayedBefore: boolean;
  firstRunComplete: boolean; // true after completing first full run
  phasesVisited: Record<string, boolean>;
  tipsDissmissed: Record<string, boolean>;
  runCount: number;
  shownUnlockToast: boolean; // true after showing "new systems" toast
  narrativeShown: boolean; // true after studio founding narrative played
}

function getOnboarding(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate old state
      if (parsed.firstRunComplete === undefined) parsed.firstRunComplete = parsed.runCount > 1;
      if (parsed.shownUnlockToast === undefined) parsed.shownUnlockToast = false;
      if (parsed.narrativeShown === undefined) parsed.narrativeShown = false;
      return parsed;
    }
  } catch {}
  return { hasPlayedBefore: false, firstRunComplete: false, phasesVisited: {}, tipsDissmissed: {}, runCount: 0, shownUnlockToast: false, narrativeShown: false };
}

function saveOnboarding(s: OnboardingState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function isFirstRun(): boolean {
  return !getOnboarding().hasPlayedBefore;
}

/** True if this is the player's first-ever run (simplified mode: no debt, no trends) */
export function isSimplifiedRun(): boolean {
  const s = getOnboarding();
  return !s.firstRunComplete;
}

/** Mark that the player has completed their first full run */
export function markFirstRunComplete() {
  const s = getOnboarding();
  if (!s.firstRunComplete) {
    s.firstRunComplete = true;
    saveOnboarding(s);
  }
}

/** Should we show the "New systems unlocked!" toast? */
export function shouldShowUnlockToast(): boolean {
  const s = getOnboarding();
  return s.firstRunComplete && !s.shownUnlockToast;
}

/** Mark the unlock toast as shown */
export function markUnlockToastShown() {
  const s = getOnboarding();
  s.shownUnlockToast = true;
  saveOnboarding(s);
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

/** Permanently dismiss all phase tips */
export function dismissAllTips() {
  const s = getOnboarding();
  for (const key of Object.keys(PHASE_TIPS)) {
    s.tipsDissmissed[key] = true;
  }
  saveOnboarding(s);
}

/** Check if all tips are dismissed */
export function areAllTipsDismissed(): boolean {
  const s = getOnboarding();
  return Object.keys(PHASE_TIPS).every(k => !!s.tipsDissmissed[k]);
}

export function getRunCount(): number {
  return getOnboarding().runCount;
}

/** Should we show the studio founding narrative? (first-ever run only) */
export function shouldShowNarrative(): boolean {
  const s = getOnboarding();
  return !s.narrativeShown;
}

/** Mark the studio founding narrative as shown */
export function markNarrativeShown() {
  const s = getOnboarding();
  s.narrativeShown = true;
  saveOnboarding(s);
}

// Phase-specific contextual tips shown on first visit
export const PHASE_TIPS: Record<string, { icon: string; title: string; text: string; nudge?: string }> = {
  neow: {
    icon: '🎁',
    title: 'Starting Bonus',
    text: 'Each option shapes your early game differently. The cash is safe, the star is powerful but risky, and the perk protects against bad luck.',
    nudge: 'Tip: Extra cash gives flexibility, but a free perk can pay off all game long.',
  },
  greenlight: {
    icon: '📝',
    title: 'Pick Your Script',
    text: 'This determines your film\'s genre, base score, and cast slots. Match the genre to 🔥 Hot trends and 📈 market conditions for a big box office multiplier.',
    nudge: 'Tip: A "Hot" genre with a market match can double your earnings — that combo is hard to beat.',
  },
  casting: {
    icon: '🎭',
    title: 'Cast Your Crew',
    text: 'Each talent adds their cards to your production deck. High Skill = great cards. High Heat = powerful BUT adds Incident cards. Look for 💕 chemistry pairs!',
    nudge: 'Tip: Check the deck preview at the bottom — if incidents outnumber actions, you\'re in danger territory.',
  },
  production: {
    icon: '🎬',
    title: 'Lights, Camera, Action!',
    text: 'Draw 2 cards, keep 1. Incidents auto-play — 3 incidents = DISASTER (lose ALL quality). Wrap early to play safe, or push for more.',
    nudge: 'Tip: At 2 incidents, seriously consider wrapping. One more and you lose everything.',
  },
  release: {
    icon: '📊',
    title: 'Box Office Results',
    text: 'Your quality × market conditions × reputation determines earnings. Hit the target to avoid a strike. 3 strikes = game over!',
    nudge: 'Tip: Reputation stars multiply everything — protecting your rep is as important as raw quality.',
  },
  event: {
    icon: '📰',
    title: 'Season Events',
    text: 'Industry news shakes things up between seasons! Pick one event to shape your next movie, or skip if none look good. Events add strategic variety — no two runs play the same.',
    nudge: 'Tip: Budget Windfall and Creative Retreat are safe picks early on. Streaming Deal is a trap if you need multipliers.',
  },
  shop: {
    icon: '🏠',
    title: 'Between Seasons',
    text: 'Buy studio perks for permanent bonuses. Hire new talent. Train existing talent to remove bad cards or improve good ones.',
    nudge: 'Tip: Training away incident cards from high-heat talent can be more valuable than buying a new perk.',
  },
};

// Inline contextual tips for specific mechanics (shown once ever, dismissed permanently)
export const MECHANIC_TIPS: Record<string, string> = {
  directorVision: 'Director\'s Vision gives +5 quality if fulfilled or −2 if not — read the condition before you wrap.',
  reshoots: 'Reshoots re-roll all incident cards after wrap. Could fix a bad shoot — or make it worse.',
  extendedCut: 'Extended Cut adds bonus draws after release. Only available on HIT or better — skip if quality is already high.',
  completionBond: 'Completion Bond upgrades your next FLOP to a MISS (no strike). One-use insurance — save it for risky films.',
  scriptRewrite: 'Script Rewrite swaps one card in your deck mid-production. Use it to ditch a bad draw.',
  rivals: 'Rival studios compete for the same audience. Their earnings affect market conditions and end-of-run rankings.',
  legendaryScript: 'Legendary scripts have unique abilities and higher base scores — but they cost more and set expectations high.',
  eliteTalent: 'Elite talent have powerful unique cards but high Heat. Worth it if you can manage the incident risk.',
};

