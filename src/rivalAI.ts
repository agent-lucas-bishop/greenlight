/**
 * ══════════════════════════════════════════════════════════════════════
 * R268: RIVAL STUDIO AI ENHANCEMENT
 * ══════════════════════════════════════════════════════════════════════
 * Six named rival studios with distinct personalities, strategy weights
 * for genre picks, budget allocation, and talent hiring.
 */

import { Genre } from './types';

// ─── STRATEGY WEIGHTS ───

export interface StrategyWeights {
  /** Genre preference weights — higher = more likely to pick */
  genrePicks: Record<Genre, number>;
  /** Budget allocation style */
  budgetAllocation: {
    minBudgetPct: number;   // minimum % of available budget to spend (0-1)
    maxBudgetPct: number;   // maximum % of available budget to spend (0-1)
    preferBigBets: boolean; // true = tends toward max, false = conservative
  };
  /** Talent hiring priorities */
  talentHiring: {
    prioritizeStar: number;    // 0-1, how much they value star power (heat)
    prioritizeSkill: number;   // 0-1, how much they value raw skill
    prioritizeCheap: number;   // 0-1, how much they value bargains
    poachAggressiveness: number; // 0-1, chance to poach talent from player
    loyaltyFactor: number;     // 0-1, how likely to keep talent across films
  };
}

// ─── RIVAL STUDIO DEFINITION ───

export interface RivalStudioAI {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  specialty: string;
  description: string;
  /** CSS color theme */
  themeColor: string;
  accentColor: string;
  /** Logo character (CSS-rendered) */
  logoChar: string;
  strategy: StrategyWeights;
  /** Personality traits that affect commentary and behavior */
  traits: string[];
  /** Signature move description */
  signatureMove: string;
  /** How volatile their performance is (0 = steady, 1 = wild swings) */
  volatility: number;
  /** Base reputation level (1-5) */
  baseReputation: number;
  /** Breakout hit chance per season */
  breakoutChance: number;
}

// ─── THE SIX RIVAL STUDIOS ───

export const RIVAL_STUDIO_AI: RivalStudioAI[] = [
  {
    id: 'titan',
    name: 'Titan Pictures',
    emoji: '🏔️',
    tagline: 'Go Big or Go Home',
    specialty: 'Blockbusters',
    description: 'The 800-pound gorilla of Hollywood. Massive budgets, massive marketing, massive egos. They don\'t make films — they make events.',
    themeColor: '#1a3a5c',
    accentColor: '#4a9eff',
    logoChar: 'T',
    strategy: {
      genrePicks: {
        'Action': 0.35, 'Sci-Fi': 0.25, 'Thriller': 0.15,
        'Comedy': 0.05, 'Drama': 0.05, 'Horror': 0.05, 'Romance': 0.10,
      },
      budgetAllocation: { minBudgetPct: 0.7, maxBudgetPct: 1.0, preferBigBets: true },
      talentHiring: {
        prioritizeStar: 0.9, prioritizeSkill: 0.5, prioritizeCheap: 0.1,
        poachAggressiveness: 0.3, loyaltyFactor: 0.4,
      },
    },
    traits: ['blockbuster-obsessed', 'big-budget', 'marketing-heavy', 'franchise-hungry'],
    signatureMove: 'Announces a $200M+ tentpole that dominates the cultural conversation',
    volatility: 0.3,
    baseReputation: 4,
    breakoutChance: 0.25,
  },
  {
    id: 'lumiere',
    name: 'Lumière Films',
    emoji: '🎭',
    tagline: 'Cinema Is Truth 24 Times Per Second',
    specialty: 'Art House / Festivals',
    description: 'The critics\' darling. Every film is a carefully crafted meditation on the human condition. They don\'t chase box office — they chase immortality.',
    themeColor: '#3d1f4e',
    accentColor: '#c084fc',
    logoChar: 'L',
    strategy: {
      genrePicks: {
        'Drama': 0.40, 'Romance': 0.20, 'Thriller': 0.15,
        'Comedy': 0.05, 'Action': 0.02, 'Horror': 0.08, 'Sci-Fi': 0.10,
      },
      budgetAllocation: { minBudgetPct: 0.3, maxBudgetPct: 0.6, preferBigBets: false },
      talentHiring: {
        prioritizeStar: 0.3, prioritizeSkill: 0.95, prioritizeCheap: 0.4,
        poachAggressiveness: 0.5, loyaltyFactor: 0.8,
      },
    },
    traits: ['prestige-focused', 'festival-circuit', 'auteur-driven', 'critic-beloved'],
    signatureMove: 'Sweeps Cannes with an intimate drama no one saw coming',
    volatility: 0.15,
    baseReputation: 4,
    breakoutChance: 0.10,
  },
  {
    id: 'neonpulse',
    name: 'Neon Pulse',
    emoji: '👾',
    tagline: 'Fear Is the Mind Killer. We Are the Fear.',
    specialty: 'Horror / Sci-Fi',
    description: 'Genre specialists who turned B-movie budgets into A-list profits. They know their audience, and their audience is loyal.',
    themeColor: '#1a2a1a',
    accentColor: '#39ff14',
    logoChar: 'N',
    strategy: {
      genrePicks: {
        'Horror': 0.35, 'Sci-Fi': 0.30, 'Thriller': 0.15,
        'Action': 0.10, 'Comedy': 0.05, 'Drama': 0.03, 'Romance': 0.02,
      },
      budgetAllocation: { minBudgetPct: 0.3, maxBudgetPct: 0.65, preferBigBets: false },
      talentHiring: {
        prioritizeStar: 0.4, prioritizeSkill: 0.7, prioritizeCheap: 0.7,
        poachAggressiveness: 0.35, loyaltyFactor: 0.6,
      },
    },
    traits: ['genre-specialist', 'cult-following', 'efficient-budgets', 'fan-favorite'],
    signatureMove: 'Drops a $15M horror film that grosses $150M and spawns a franchise',
    volatility: 0.4,
    baseReputation: 3,
    breakoutChance: 0.20,
  },
  {
    id: 'heartland',
    name: 'Heartland Studios',
    emoji: '🌾',
    tagline: 'Stories for Everyone',
    specialty: 'Family / Comedy',
    description: 'The reliable workhorse. They never make the best film of the year, but they never make the worst either. Consistent, profitable, boring in the best way.',
    themeColor: '#3d2b1a',
    accentColor: '#fbbf24',
    logoChar: 'H',
    strategy: {
      genrePicks: {
        'Comedy': 0.35, 'Romance': 0.20, 'Drama': 0.20,
        'Action': 0.10, 'Horror': 0.02, 'Sci-Fi': 0.05, 'Thriller': 0.08,
      },
      budgetAllocation: { minBudgetPct: 0.4, maxBudgetPct: 0.7, preferBigBets: false },
      talentHiring: {
        prioritizeStar: 0.5, prioritizeSkill: 0.6, prioritizeCheap: 0.6,
        poachAggressiveness: 0.15, loyaltyFactor: 0.9,
      },
    },
    traits: ['consistent', 'family-friendly', 'crowd-pleaser', 'reliable-profits'],
    signatureMove: 'Releases another feel-good comedy that quietly outearns the competition',
    volatility: 0.1,
    baseReputation: 3,
    breakoutChance: 0.08,
  },
  {
    id: 'phoenix',
    name: 'Phoenix Rising',
    emoji: '🔥',
    tagline: 'We\'ve Been Counted Out Before',
    specialty: 'Comebacks / Volatile',
    description: 'The studio that refuses to die. They\'ll have a catastrophic flop one season, then come back with the film of the year. You can never count them out.',
    themeColor: '#4a1a0a',
    accentColor: '#ff6b35',
    logoChar: 'P',
    strategy: {
      genrePicks: {
        'Drama': 0.20, 'Action': 0.20, 'Thriller': 0.15,
        'Sci-Fi': 0.15, 'Comedy': 0.10, 'Horror': 0.10, 'Romance': 0.10,
      },
      budgetAllocation: { minBudgetPct: 0.2, maxBudgetPct: 1.0, preferBigBets: true },
      talentHiring: {
        prioritizeStar: 0.6, prioritizeSkill: 0.6, prioritizeCheap: 0.3,
        poachAggressiveness: 0.4, loyaltyFactor: 0.3,
      },
    },
    traits: ['volatile', 'comeback-kings', 'unpredictable', 'high-risk-high-reward'],
    signatureMove: 'Comes back from near-bankruptcy with an award-winning masterpiece',
    volatility: 0.8,
    baseReputation: 2,
    breakoutChance: 0.30,
  },
  {
    id: 'apex',
    name: 'Apex Entertainment',
    emoji: '🦈',
    tagline: 'Second Place Is First Loser',
    specialty: 'Aggressive / Talent Poaching',
    description: 'The most hated studio in town. They\'ll steal your director mid-production, release a competing film on your opening weekend, and smile while doing it.',
    themeColor: '#1a1a2e',
    accentColor: '#e74c3c',
    logoChar: 'A',
    strategy: {
      genrePicks: {
        'Action': 0.25, 'Thriller': 0.20, 'Sci-Fi': 0.15,
        'Drama': 0.15, 'Comedy': 0.10, 'Horror': 0.10, 'Romance': 0.05,
      },
      budgetAllocation: { minBudgetPct: 0.5, maxBudgetPct: 0.9, preferBigBets: true },
      talentHiring: {
        prioritizeStar: 0.8, prioritizeSkill: 0.7, prioritizeCheap: 0.2,
        poachAggressiveness: 0.85, loyaltyFactor: 0.2,
      },
    },
    traits: ['aggressive', 'talent-stealer', 'cutthroat', 'counter-programmer'],
    signatureMove: 'Poaches your lead actor and releases a competing film on your opening weekend',
    volatility: 0.5,
    baseReputation: 3,
    breakoutChance: 0.18,
  },
];

// ─── HELPERS ───

export function getRivalAIById(id: string): RivalStudioAI | undefined {
  return RIVAL_STUDIO_AI.find(r => r.id === id);
}

export function getRivalAIByName(name: string): RivalStudioAI | undefined {
  return RIVAL_STUDIO_AI.find(r => r.name === name);
}

/** Get the predicted next move for a rival based on game state context */
export function predictNextMove(rival: RivalStudioAI, season: number, playerGenre?: Genre): string {
  const topGenre = Object.entries(rival.strategy.genrePicks)
    .sort(([, a], [, b]) => b - a)[0][0];

  if (rival.id === 'apex' && playerGenre) {
    return `Likely to counter-program your ${playerGenre} film with a competing release`;
  }
  if (rival.id === 'titan') {
    return `Preparing a big-budget ${topGenre} tentpole for Season ${season + 1}`;
  }
  if (rival.id === 'lumiere') {
    return `Developing an intimate ${topGenre} piece for the festival circuit`;
  }
  if (rival.id === 'neonpulse') {
    return `Workshopping a low-budget ${topGenre} film with franchise potential`;
  }
  if (rival.id === 'heartland') {
    return `Greenlit another crowd-pleasing ${topGenre} for wide release`;
  }
  if (rival.id === 'phoenix') {
    return season > 2 ? `Planning a bold comeback after recent struggles` : `Building momentum with a ${topGenre} project`;
  }
  return `Developing a ${topGenre} project`;
}

/** Calculate rivalry meter (0-100) based on how much a rival is competing with the player */
export function calculateRivalryMeter(
  rivalName: string,
  rivalStats: { totalBoxOffice: number; timesBeatenPlayer: number; filmsMade: number } | undefined,
  playerTotalEarnings: number,
  isNemesis: boolean,
): number {
  if (!rivalStats) return 20;
  let meter = 20; // base

  // Closer earnings = higher rivalry
  const earningsDiff = Math.abs(rivalStats.totalBoxOffice - playerTotalEarnings);
  const avgEarnings = (rivalStats.totalBoxOffice + playerTotalEarnings) / 2 || 1;
  const closeness = 1 - Math.min(earningsDiff / avgEarnings, 1);
  meter += closeness * 30;

  // Times beaten player increases rivalry
  meter += Math.min(rivalStats.timesBeatenPlayer * 8, 30);

  // Nemesis = max rivalry
  if (isNemesis) meter = Math.max(meter, 85);

  return Math.min(100, Math.round(meter));
}

// ─── NEWSFEED GENERATION ───

export interface RivalNewsItem {
  studioName: string;
  studioEmoji: string;
  headline: string;
  type: 'announcement' | 'award' | 'scandal' | 'release' | 'talent';
}

const ANNOUNCEMENT_TEMPLATES: Record<string, string[]> = {
  titan: [
    '{name} announces $200M sci-fi epic for summer release',
    '{name} secures exclusive deal with top VFX studio',
    '{name} greenlights third installment of blockbuster franchise',
    '{name} CEO: "We\'re doubling our slate next year"',
  ],
  lumiere: [
    '{name} wins Palme d\'Or at Cannes',
    '{name}\'s latest receives 15-minute standing ovation at Venice',
    '{name} signs three-picture deal with acclaimed auteur',
    '{name} film gets 98% on Rotten Tomatoes',
  ],
  neonpulse: [
    '{name}\'s $12M horror film crosses $100M worldwide',
    '{name} launches new sci-fi franchise with unknown cast',
    '{name} acquires rights to cult classic for remake',
    '{name}\'s latest becomes most profitable film of the quarter',
  ],
  heartland: [
    '{name}\'s family comedy tops weekend box office',
    '{name} extends deal with fan-favorite comedy duo',
    '{name} announces holiday film lineup — analysts predict steady returns',
    '{name}\'s animated feature crosses $200M globally',
  ],
  phoenix: [
    '{name} stuns critics with comeback film after disastrous year',
    '{name} restructures after box office disappointment',
    '{name} hires new creative head — promises "bold new direction"',
    '{name}\'s passion project unexpectedly dominates awards season',
  ],
  apex: [
    '{name} poaches top director from rival studio mid-production',
    '{name} releases counter-programmed film on competitor\'s opening weekend',
    '{name} acquires struggling indie studio in hostile takeover',
    '{name} CEO: "We don\'t make friends, we make money"',
  ],
};

export function generateNewsItems(activeRivalIds: string[], season: number, rngFn: () => number): RivalNewsItem[] {
  const items: RivalNewsItem[] = [];

  for (const id of activeRivalIds) {
    const rival = getRivalAIById(id);
    if (!rival) continue;

    const templates = ANNOUNCEMENT_TEMPLATES[id] || [];
    if (templates.length === 0) continue;

    // 1-2 news items per rival per season
    const count = rngFn() < 0.4 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const template = templates[Math.floor(rngFn() * templates.length)];
      const headline = template.replace('{name}', rival.name);
      const types: RivalNewsItem['type'][] = ['announcement', 'award', 'scandal', 'release', 'talent'];
      items.push({
        studioName: rival.name,
        studioEmoji: rival.emoji,
        headline,
        type: types[Math.floor(rngFn() * types.length)],
      });
    }
  }

  // Shuffle
  return items.sort(() => rngFn() - 0.5);
}
