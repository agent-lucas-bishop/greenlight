// R187: Steam-Style Trading Cards & Collectibles System
// Collectible cards earned through gameplay achievements, persisted in localStorage

export type CardRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface TradingCard {
  id: string;
  name: string;
  rarity: CardRarity;
  artworkDesc: string;
  flavorText: string;
  unlockCondition: string;
  /** Function key used to check unlock — evaluated in checkTradingCardUnlocks */
  checkId: string;
}

export interface CollectedCard {
  cardId: string;
  unlockedAt: string; // ISO date
}

const STORAGE_KEY = 'greenlight_trading_cards';

// ─── Card Definitions (20+ cards) ───

export const TRADING_CARDS: TradingCard[] = [
  // COMMON (gray) — 6 cards
  {
    id: 'tc_first_film',
    name: 'Opening Night',
    rarity: 'common',
    artworkDesc: 'A single spotlight illuminating an empty theater seat',
    flavorText: '"Every legend starts with a single frame."',
    unlockCondition: 'Complete your first film',
    checkId: 'first_film',
  },
  {
    id: 'tc_first_flop',
    name: 'Box Office Poison',
    rarity: 'common',
    artworkDesc: 'A crumbling movie ticket dissolving into ash',
    flavorText: '"Not every story deserves a sequel."',
    unlockCondition: 'Experience your first FLOP',
    checkId: 'first_flop',
  },
  {
    id: 'tc_five_films',
    name: 'The Slate',
    rarity: 'common',
    artworkDesc: 'Five film reels stacked like poker chips',
    flavorText: '"Quantity has a quality all its own."',
    unlockCondition: 'Produce 5 films across all runs',
    checkId: 'five_films',
  },
  {
    id: 'tc_first_win',
    name: 'Wrap Party',
    rarity: 'common',
    artworkDesc: 'Champagne glasses clinking under studio lights',
    flavorText: '"To surviving Hollywood — barely."',
    unlockCondition: 'Win your first run',
    checkId: 'first_win',
  },
  {
    id: 'tc_genre_action',
    name: 'Explosions & One-Liners',
    rarity: 'common',
    artworkDesc: 'A silhouette walking away from an explosion',
    flavorText: '"Cool guys don\'t look at explosions."',
    unlockCondition: 'Make 3 Action films',
    checkId: 'genre_action',
  },
  {
    id: 'tc_budget_broke',
    name: 'Empty Pockets',
    rarity: 'common',
    artworkDesc: 'A producer turning out empty pockets under a marquee',
    flavorText: '"Art doesn\'t pay the rent."',
    unlockCondition: 'End a season with $0 budget',
    checkId: 'budget_broke',
  },

  // UNCOMMON (green) — 6 cards
  {
    id: 'tc_first_blockbuster',
    name: 'Opening Weekend',
    rarity: 'uncommon',
    artworkDesc: 'A massive crowd flooding into a neon-lit cinema',
    flavorText: '"They came in droves. They left believers."',
    unlockCondition: 'Earn your first BLOCKBUSTER tier',
    checkId: 'first_blockbuster',
  },
  {
    id: 'tc_ten_films',
    name: 'The Filmography',
    rarity: 'uncommon',
    artworkDesc: 'A wall of framed movie posters in a dark hallway',
    flavorText: '"Ten films. Ten chances to get it right."',
    unlockCondition: 'Produce 10 films across all runs',
    checkId: 'ten_films',
  },
  {
    id: 'tc_nomination',
    name: 'The Envelope',
    rarity: 'uncommon',
    artworkDesc: 'A golden envelope being opened on a dark stage',
    flavorText: '"And the nominee is..."',
    unlockCondition: 'Receive a festival nomination',
    checkId: 'nomination',
  },
  {
    id: 'tc_chemistry',
    name: 'On-Screen Magic',
    rarity: 'uncommon',
    artworkDesc: 'Two actors in silhouette, sparks flying between them',
    flavorText: '"Some pairs just have it."',
    unlockCondition: 'Trigger a chemistry bonus',
    checkId: 'chemistry',
  },
  {
    id: 'tc_three_wins',
    name: 'The Comeback',
    rarity: 'uncommon',
    artworkDesc: 'A phoenix rising from scattered film negatives',
    flavorText: '"Three times they said it couldn\'t be done."',
    unlockCondition: 'Win 3 runs',
    checkId: 'three_wins',
  },
  {
    id: 'tc_genre_variety',
    name: 'Renaissance Studio',
    rarity: 'uncommon',
    artworkDesc: 'A kaleidoscope of genre icons — sword, spaceship, heart, ghost',
    flavorText: '"Why limit yourself to one story?"',
    unlockCondition: 'Make films in 5 different genres',
    checkId: 'genre_variety',
  },

  // RARE (blue) — 5 cards
  {
    id: 'tc_s_rank',
    name: 'The S-Rank',
    rarity: 'rare',
    artworkDesc: 'A blazing golden "S" seared into a director\'s chair',
    flavorText: '"Perfection isn\'t a goal. It\'s a habit."',
    unlockCondition: 'Achieve an S-rank score',
    checkId: 's_rank',
  },
  {
    id: 'tc_perfect_run',
    name: 'Flawless',
    rarity: 'rare',
    artworkDesc: 'Five golden stars aligned in a perfect row',
    flavorText: '"Not a single miss. Not a single doubt."',
    unlockCondition: 'Hit every target in a winning run',
    checkId: 'perfect_run',
  },
  {
    id: 'tc_festival_win',
    name: 'Grand Prix',
    rarity: 'rare',
    artworkDesc: 'A golden palm frond resting on a velvet cushion',
    flavorText: '"The critics bow. The audience weeps."',
    unlockCondition: 'Win a festival grand prize',
    checkId: 'festival_win',
  },
  {
    id: 'tc_twenty_films',
    name: 'The Archive',
    rarity: 'rare',
    artworkDesc: 'An endless library of film canisters stretching into darkness',
    flavorText: '"Twenty stories. Twenty worlds. One vision."',
    unlockCondition: 'Produce 20 films across all runs',
    checkId: 'twenty_films',
  },
  {
    id: 'tc_half_billion',
    name: 'Money Machine',
    rarity: 'rare',
    artworkDesc: 'A mountain of gold coins with a film projector at the peak',
    flavorText: '"Half a billion. And they said art doesn\'t sell."',
    unlockCondition: 'Earn $500M total box office in a single run',
    checkId: 'half_billion',
  },

  // LEGENDARY (purple) — 4 cards
  {
    id: 'tc_triple_crown',
    name: 'Triple Crown',
    rarity: 'legendary',
    artworkDesc: 'Three intertwined golden crowns floating above a red carpet',
    flavorText: '"Best Picture. Box Office Champion. Audience Favorite. One film."',
    unlockCondition: 'Win all three awards with one film',
    checkId: 'triple_crown',
  },
  {
    id: 'tc_mogul',
    name: 'The Mogul',
    rarity: 'legendary',
    artworkDesc: 'A shadowy figure on a throne made of film reels, city skyline behind',
    flavorText: '"They don\'t make movies. They make empires."',
    unlockCondition: 'Win on Mogul difficulty',
    checkId: 'mogul_win',
  },
  {
    id: 'tc_endless',
    name: 'Eternal Studio',
    rarity: 'legendary',
    artworkDesc: 'An infinity symbol woven from celluloid film, glowing with golden light',
    flavorText: '"Some studios never close. They become immortal."',
    unlockCondition: 'Survive 10+ seasons in Endless Mode',
    checkId: 'endless_ten',
  },
  {
    id: 'tc_legend',
    name: 'Studio Legend',
    rarity: 'legendary',
    artworkDesc: 'A star on the Hollywood Walk of Fame, pulsing with ethereal light',
    flavorText: '"When history remembers Hollywood, it remembers you."',
    unlockCondition: 'Reach max meta-progression level',
    checkId: 'meta_max',
  },
];

// ─── Persistence ───

export function getCollectedCards(): CollectedCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isCardCollected(cardId: string): boolean {
  return getCollectedCards().some(c => c.cardId === cardId);
}

export function collectCard(cardId: string): boolean {
  if (isCardCollected(cardId)) return false;
  const collected = getCollectedCards();
  collected.push({ cardId, unlockedAt: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collected));
  return true;
}

export function getCollectionProgress(): { collected: number; total: number } {
  return { collected: getCollectedCards().length, total: TRADING_CARDS.length };
}

// ─── Rarity helpers ───

export const RARITY_CONFIG: Record<CardRarity, { label: string; color: string; borderColor: string; bgGlow: string }> = {
  common: { label: 'Common', color: '#999', borderColor: '#666', bgGlow: 'rgba(150,150,150,0.1)' },
  uncommon: { label: 'Uncommon', color: '#2ecc71', borderColor: '#27ae60', bgGlow: 'rgba(46,204,113,0.1)' },
  rare: { label: 'Rare', color: '#3498db', borderColor: '#2980b9', bgGlow: 'rgba(52,152,219,0.1)' },
  legendary: { label: 'Legendary', color: '#9b59b6', borderColor: '#8e44ad', bgGlow: 'rgba(155,89,182,0.15)' },
};

// ─── Unlock Checking ───
// Called from EndScreen; checks game state + cross-run stats

export function checkTradingCardUnlocks(gameState: any): string[] {
  const newlyUnlocked: string[] = [];

  // Helper to try unlocking a card
  const tryUnlock = (cardId: string) => {
    if (collectCard(cardId)) newlyUnlocked.push(cardId);
  };

  const h = gameState.seasonHistory || [];
  const isVictory = gameState.phase === 'victory';

  // Load cross-run stats from localStorage
  let unlocks: any = {};
  try { unlocks = JSON.parse(localStorage.getItem('greenlight_unlocks') || '{}'); } catch {}

  const totalFilmsAllRuns = (unlocks.totalFilms || 0) + h.length;
  const totalWins = (unlocks.wins || 0) + (isVictory ? 1 : 0);

  // COMMON
  if (h.length >= 1) tryUnlock('tc_first_film');
  if (h.some((s: any) => s.tier === 'FLOP')) tryUnlock('tc_first_flop');
  if (totalFilmsAllRuns >= 5) tryUnlock('tc_five_films');
  if (isVictory) tryUnlock('tc_first_win');
  if ((unlocks.careerStats?.genreFilms?.Action || 0) >= 3 || h.filter((s: any) => s.genre === 'Action').length >= 3) tryUnlock('tc_genre_action');
  if (gameState.budget <= 0) tryUnlock('tc_budget_broke');

  // UNCOMMON
  if (h.some((s: any) => s.tier === 'BLOCKBUSTER')) tryUnlock('tc_first_blockbuster');
  if (totalFilmsAllRuns >= 10) tryUnlock('tc_ten_films');
  if (h.some((s: any) => s.nominated)) tryUnlock('tc_nomination');
  if (gameState.chemistryTriggered || h.some((s: any) => s.chemistryBonus)) tryUnlock('tc_chemistry');
  if (totalWins >= 3) tryUnlock('tc_three_wins');
  const allGenres = new Set([...Object.keys(unlocks.careerStats?.genreFilms || {}), ...h.map((s: any) => s.genre)]);
  if (allGenres.size >= 5) tryUnlock('tc_genre_variety');

  // RARE
  const score = gameState._endScore || 0;
  if (score > 800) tryUnlock('tc_s_rank');
  if (isVictory && h.length >= 5 && h.every((s: any) => s.hitTarget)) tryUnlock('tc_perfect_run');
  if (gameState.festivalHistory?.some((f: any) => f.award === 'grandPrize')) tryUnlock('tc_festival_win');
  if (totalFilmsAllRuns >= 20) tryUnlock('tc_twenty_films');
  if (gameState.totalEarnings >= 500) tryUnlock('tc_half_billion');

  // LEGENDARY
  if (gameState._tripleCrown) tryUnlock('tc_triple_crown');
  if (isVictory && gameState.difficulty === 'mogul') tryUnlock('tc_mogul');
  if (gameState.gameMode === 'endless' && h.length >= 10) tryUnlock('tc_endless');
  try {
    const meta = JSON.parse(localStorage.getItem('greenlight_meta_progression') || '{}');
    if ((meta.xp || 0) >= 5000) tryUnlock('tc_legend'); // approximate max level threshold
  } catch {}

  return newlyUnlocked;
}
