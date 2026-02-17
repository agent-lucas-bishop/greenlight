// Contextual tooltip system — shows tips on first encounter of game mechanics
// Separate from the main tutorial (which covers phases); these fire on specific events

const STORAGE_KEY = 'greenlight_contextual_tips';

export interface ContextualTip {
  id: string;
  title: string;
  text: string;
  /** CSS selector of the element to point at (optional — centers if missing) */
  targetSelector?: string;
  /** Preferred position relative to target */
  position: 'top' | 'bottom' | 'left' | 'right';
}

export const CONTEXTUAL_TIPS: Record<string, ContextualTip> = {
  firstAbility: {
    id: 'firstAbility',
    title: '⚡ Card Ability!',
    text: 'This card has a special ability that triggered! Abilities activate automatically when conditions are met — look for the glowing border. Abilities can turn a mediocre hand into a great one.',
    targetSelector: '.ability-glow',
    position: 'top',
  },
  firstSynergy: {
    id: 'firstSynergy',
    title: '🔗 Synergy Bonus!',
    text: 'Cards from the same genre or matching talent types create synergies — bonus quality points! Build your deck around complementary cards to maximize synergy chains.',
    targetSelector: '.synergy-active',
    position: 'top',
  },
  firstRetirement: {
    id: 'firstRetirement',
    title: '👋 Talent Retirement',
    text: 'Talent ages over time and eventually retires. Plan ahead — don\'t build your whole strategy around one star. Keep your roster diverse so retirements don\'t derail your studio.',
    position: 'bottom',
  },
  firstWorldEvent: {
    id: 'firstWorldEvent',
    title: '🌍 World Event!',
    text: 'World events shake up the industry for everyone. They can change market conditions, costs, or available talent. Adapt your strategy — or lean into the chaos for big rewards.',
    targetSelector: '.world-event-banner',
    position: 'bottom',
  },
  firstFestival: {
    id: 'firstFestival',
    title: '🏆 Film Festival!',
    text: 'Your film has been selected for a festival! Festivals offer prestige bonuses and can turn a modest hit into a career-defining moment. Higher quality films perform better at festivals.',
    position: 'top',
  },
  firstPrestige: {
    id: 'firstPrestige',
    title: '🌟 Prestige Opportunity!',
    text: 'Prestige points are the ultimate measure of your studio\'s legacy. Earn them through critical acclaim, festival wins, and genre mastery. They\'re the key to climbing the leaderboard!',
    position: 'top',
  },
};

function getShownTips(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function saveShownTips(tips: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...tips]));
}

/** Check if a tip has already been shown */
export function hasTipBeenShown(tipId: string): boolean {
  return getShownTips().has(tipId);
}

/** Mark a tip as shown */
export function markTipShown(tipId: string) {
  const tips = getShownTips();
  tips.add(tipId);
  saveShownTips(tips);
}

/** Get a tip if it hasn't been shown yet, or null */
export function getTipIfNew(tipId: string): ContextualTip | null {
  if (hasTipBeenShown(tipId)) return null;
  return CONTEXTUAL_TIPS[tipId] || null;
}

/** Reset all contextual tips (for testing) */
export function resetContextualTips() {
  localStorage.removeItem(STORAGE_KEY);
}
