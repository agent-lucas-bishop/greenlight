/**
 * ══════════════════════════════════════════════════════════════════════
 * R197 — Dynamic World Events & Industry News
 * ══════════════════════════════════════════════════════════════════════
 * 
 * Unpredictable industry-wide effects that last 1-3 seasons.
 * 1-2 events fire per season, weighted by difficulty and game state.
 * Events modify box office, costs, quality, and reputation.
 */

import type { Genre } from './types';

export type WorldEventCategory = 'market' | 'industry' | 'cultural' | 'disaster';
export type WorldEventSentiment = 'positive' | 'negative' | 'mixed';

export interface WorldEventDef {
  id: string;
  name: string;
  emoji: string;
  category: WorldEventCategory;
  sentiment: WorldEventSentiment;
  headline: string;       // Breaking news style
  description: string;    // Detailed effect text
  durationRange: [number, number]; // min/max seasons
  weight: number;         // Base selection weight (higher = more common)
  /** Effects applied while event is active */
  effects: WorldEventEffects;
  /** Optional: only fire if condition met */
  condition?: (ctx: WorldEventContext) => boolean;
}

export interface WorldEventEffects {
  boMultiplier?: number;           // Multiply all BO (e.g. 0.6 = -40%)
  genreBOBonus?: { genres: Genre[] | 'random'; multiplier: number };
  genreBOPenalty?: { genres: Genre[] | 'random'; multiplier: number };
  talentCostMultiplier?: number;   // Multiply talent hiring costs
  budgetMultiplier?: number;       // Multiply script costs
  qualityBonus?: number;           // Flat quality bonus
  qualityBonusCondition?: 'vfx' | 'lowBudget' | 'all';
  reputationChange?: number;       // One-time rep change on start
  streamingBonus?: number;         // Flat BO bonus for streaming deals
  rivalSkipChance?: number;        // Chance a rival skips this season
}

export interface WorldEventContext {
  season: number;
  difficulty: string;
  reputation: number;
  budget: number;
  seasonHistory: { genre: Genre; boxOffice: number }[];
  activeWorldEvents: ActiveWorldEvent[];
}

export interface ActiveWorldEvent {
  id: string;
  name: string;
  emoji: string;
  category: WorldEventCategory;
  sentiment: WorldEventSentiment;
  headline: string;
  description: string;
  effects: WorldEventEffects;
  startSeason: number;
  endSeason: number;        // Inclusive — event active through this season
  resolvedGenre?: Genre;    // For 'random' genre effects, resolved at activation
}

// ─── EVENT DEFINITIONS ───

const ALL_GENRES: Genre[] = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];

export const WORLD_EVENTS: WorldEventDef[] = [
  // ═══ MARKET ═══
  {
    id: 'streaming_wars',
    name: 'Streaming Wars',
    emoji: '📺',
    category: 'market',
    sentiment: 'mixed',
    headline: 'STREAMING GIANTS CLASH — Theater Exclusives Under Threat',
    description: 'Streaming platforms are spending big. Sci-Fi and Action films get +20% BO from bidding wars, but Drama and Romance suffer -15%.',
    durationRange: [2, 3],
    weight: 8,
    effects: {
      genreBOBonus: { genres: ['Sci-Fi', 'Action'], multiplier: 1.2 },
      genreBOPenalty: { genres: ['Drama', 'Romance'], multiplier: 0.85 },
    },
  },
  {
    id: 'theater_closures',
    name: 'Theater Closures',
    emoji: '🏚️',
    category: 'market',
    sentiment: 'negative',
    headline: 'MAJOR THEATER CHAINS SHUTTERING — Box Office In Freefall',
    description: 'Widespread theater closures reduce all box office by 20%.',
    durationRange: [1, 2],
    weight: 5,
    effects: { boMultiplier: 0.8 },
  },
  {
    id: 'summer_blockbuster',
    name: 'Summer Blockbuster Season',
    emoji: '☀️',
    category: 'market',
    sentiment: 'positive',
    headline: 'SUMMER BLOCKBUSTER SEASON — Audiences Flock To Theaters',
    description: 'Action and Sci-Fi films get +25% box office during peak summer.',
    durationRange: [1, 2],
    weight: 10,
    effects: {
      genreBOBonus: { genres: ['Action', 'Sci-Fi'], multiplier: 1.25 },
    },
  },
  {
    id: 'awards_season',
    name: 'Awards Season',
    emoji: '🏆',
    category: 'market',
    sentiment: 'positive',
    headline: 'AWARDS SEASON HEATS UP — Prestige Films Dominate',
    description: 'Drama and Thriller films get +25% box office as awards buzz builds.',
    durationRange: [1, 2],
    weight: 10,
    effects: {
      genreBOBonus: { genres: ['Drama', 'Thriller'], multiplier: 1.25 },
    },
  },
  {
    id: 'imax_expansion',
    name: 'IMAX Expansion',
    emoji: '🎬',
    category: 'market',
    sentiment: 'positive',
    headline: 'IMAX OPENS 500 NEW SCREENS WORLDWIDE',
    description: 'Premium format expansion boosts Action and Sci-Fi box office by 15%.',
    durationRange: [2, 3],
    weight: 6,
    effects: {
      genreBOBonus: { genres: ['Action', 'Sci-Fi'], multiplier: 1.15 },
    },
  },
  {
    id: 'overseas_boom',
    name: 'International Box Office Boom',
    emoji: '🌍',
    category: 'market',
    sentiment: 'positive',
    headline: 'INTERNATIONAL MARKETS SURGE — Global Audiences Hungry For Content',
    description: 'All films get +10% box office from strong international markets.',
    durationRange: [2, 3],
    weight: 7,
    effects: { boMultiplier: 1.1 },
  },
  {
    id: 'home_video_revival',
    name: 'Physical Media Revival',
    emoji: '📀',
    category: 'market',
    sentiment: 'positive',
    headline: 'COLLECTORS DRIVE PHYSICAL MEDIA COMEBACK',
    description: 'Horror and Sci-Fi see +20% BO from collector\'s editions and special releases.',
    durationRange: [1, 2],
    weight: 5,
    effects: {
      genreBOBonus: { genres: ['Horror', 'Sci-Fi'], multiplier: 1.2 },
    },
  },

  // ═══ INDUSTRY ═══
  {
    id: 'actors_strike',
    name: 'Actors\' Strike',
    emoji: '✊',
    category: 'industry',
    sentiment: 'negative',
    headline: 'SAG-AFTRA STRIKES — All Productions On Hold',
    description: 'Talent costs increase by 50% as the industry negotiates.',
    durationRange: [1, 3],
    weight: 4,
    effects: { talentCostMultiplier: 1.5 },
  },
  {
    id: 'tax_incentives',
    name: 'Government Tax Incentives',
    emoji: '💰',
    category: 'industry',
    sentiment: 'positive',
    headline: 'NEW TAX INCENTIVES SLASH PRODUCTION COSTS',
    description: 'Script and production budgets reduced by 20%.',
    durationRange: [2, 3],
    weight: 7,
    effects: { budgetMultiplier: 0.8 },
  },
  {
    id: 'new_technology',
    name: 'VFX Revolution',
    emoji: '🤖',
    category: 'industry',
    sentiment: 'positive',
    headline: 'AI-POWERED VFX TRANSFORM FILMMAKING',
    description: 'Sci-Fi and Action films gain +5 quality from cutting-edge visual effects.',
    durationRange: [2, 3],
    weight: 6,
    effects: {
      qualityBonus: 5,
      qualityBonusCondition: 'vfx',
    },
  },
  {
    id: 'indie_renaissance',
    name: 'Indie Renaissance',
    emoji: '🎭',
    category: 'industry',
    sentiment: 'positive',
    headline: 'INDIE FILMS SWEEP CRITICS\' LISTS',
    description: 'Low-budget films (≤$5) gain +5 quality. The little guys are winning.',
    durationRange: [2, 3],
    weight: 6,
    effects: {
      qualityBonus: 5,
      qualityBonusCondition: 'lowBudget',
    },
  },
  {
    id: 'studio_consolidation',
    name: 'Studio Consolidation',
    emoji: '🏢',
    category: 'industry',
    sentiment: 'negative',
    headline: 'MEGA-MERGER RESHAPES HOLLYWOOD LANDSCAPE',
    description: 'Industry consolidation means higher talent costs (+25%) as fewer studios compete.',
    durationRange: [2, 3],
    weight: 5,
    effects: { talentCostMultiplier: 1.25 },
  },
  {
    id: 'crew_shortage',
    name: 'Crew Shortage',
    emoji: '🔧',
    category: 'industry',
    sentiment: 'negative',
    headline: 'INDUSTRY FACES CRITICAL CREW SHORTAGE',
    description: 'All films suffer -3 quality from understaffed productions.',
    durationRange: [1, 2],
    weight: 4,
    effects: { qualityBonus: -3, qualityBonusCondition: 'all' },
  },

  // ═══ CULTURAL ═══
  {
    id: 'genre_trend',
    name: 'Genre Trend',
    emoji: '📈',
    category: 'cultural',
    sentiment: 'positive',
    headline: 'AUDIENCES CAN\'T GET ENOUGH — One Genre Dominates',
    description: 'A random genre gets +30% box office as it becomes the hot trend.',
    durationRange: [1, 3],
    weight: 9,
    effects: {
      genreBOBonus: { genres: 'random', multiplier: 1.3 },
    },
  },
  {
    id: 'nostalgia_wave',
    name: 'Nostalgia Wave',
    emoji: '🕰️',
    category: 'cultural',
    sentiment: 'positive',
    headline: 'NOSTALGIA CRAZE GRIPS THE BOX OFFICE',
    description: 'Sequels and franchise films get an extra +15% BO. Audiences want what they know.',
    durationRange: [2, 3],
    weight: 7,
    effects: { boMultiplier: 1.15 }, // Applied to sequels in integration
  },
  {
    id: 'controversy',
    name: 'Genre Controversy',
    emoji: '😤',
    category: 'cultural',
    sentiment: 'negative',
    headline: 'BACKLASH ERUPTS — Studios Face Public Outrage',
    description: 'A random genre faces controversy, losing 25% box office.',
    durationRange: [1, 2],
    weight: 6,
    effects: {
      genreBOPenalty: { genres: 'random', multiplier: 0.75 },
    },
  },
  {
    id: 'tiktok_trend',
    name: 'Viral TikTok Trend',
    emoji: '📱',
    category: 'cultural',
    sentiment: 'positive',
    headline: 'TIKTOK SENDS AUDIENCES TO THEATERS IN DROVES',
    description: 'All films get +3 quality from viral social media buzz.',
    durationRange: [1, 1],
    weight: 8,
    effects: { qualityBonus: 3, qualityBonusCondition: 'all' },
  },
  {
    id: 'horror_renaissance',
    name: 'Horror Renaissance',
    emoji: '👻',
    category: 'cultural',
    sentiment: 'positive',
    headline: 'ELEVATED HORROR TAKES OVER — Critics And Audiences Agree',
    description: 'Horror films get +30% box office and +3 quality.',
    durationRange: [1, 2],
    weight: 5,
    effects: {
      genreBOBonus: { genres: ['Horror'], multiplier: 1.3 },
      qualityBonus: 3,
      qualityBonusCondition: 'all', // Only applies to Horror in integration
    },
  },
  {
    id: 'romcom_revival',
    name: 'Rom-Com Revival',
    emoji: '💕',
    category: 'cultural',
    sentiment: 'positive',
    headline: 'ROM-COMS ARE BACK BABY — Love Conquers All',
    description: 'Romance and Comedy films get +25% box office.',
    durationRange: [1, 2],
    weight: 6,
    effects: {
      genreBOBonus: { genres: ['Romance', 'Comedy'], multiplier: 1.25 },
    },
  },
  {
    id: 'true_crime_craze',
    name: 'True Crime Craze',
    emoji: '🔍',
    category: 'cultural',
    sentiment: 'positive',
    headline: 'TRUE CRIME OBSESSION DRIVES THRILLER DEMAND',
    description: 'Thriller films get +20% box office from the true crime wave.',
    durationRange: [1, 2],
    weight: 6,
    effects: {
      genreBOBonus: { genres: ['Thriller'], multiplier: 1.2 },
    },
  },

  // ═══ DISASTERS ═══
  {
    id: 'pandemic',
    name: 'Global Pandemic',
    emoji: '🦠',
    category: 'disaster',
    sentiment: 'negative',
    headline: 'PANDEMIC SHUTS DOWN THEATERS WORLDWIDE',
    description: 'All box office drops 40%, but streaming deals offer a safety net (+$5M flat).',
    durationRange: [2, 3],
    weight: 2,
    effects: {
      boMultiplier: 0.6,
      streamingBonus: 5,
    },
    condition: (ctx) => ctx.season >= 2, // Don't hit on season 1
  },
  {
    id: 'natural_disaster',
    name: 'Natural Disaster',
    emoji: '🌊',
    category: 'disaster',
    sentiment: 'negative',
    headline: 'DEVASTATING NATURAL DISASTER HALTS PRODUCTION',
    description: 'A rival studio is forced to skip this season. Your BO is unaffected but costs rise 10%.',
    durationRange: [1, 1],
    weight: 3,
    effects: {
      budgetMultiplier: 1.1,
      rivalSkipChance: 0.5,
    },
  },
  {
    id: 'studio_scandal',
    name: 'Industry Scandal',
    emoji: '📰',
    category: 'disaster',
    sentiment: 'negative',
    headline: 'SCANDAL ROCKS HOLLYWOOD — Public Trust Eroded',
    description: 'All studios lose 1 reputation. The industry\'s image takes a hit.',
    durationRange: [1, 2],
    weight: 4,
    effects: { reputationChange: -1 },
  },
  {
    id: 'cyberattack',
    name: 'Studio Cyberattack',
    emoji: '💻',
    category: 'disaster',
    sentiment: 'negative',
    headline: 'HACKERS LEAK UNRELEASED FILMS — Studios Scramble',
    description: 'All box office reduced by 15% from piracy.',
    durationRange: [1, 1],
    weight: 3,
    effects: { boMultiplier: 0.85 },
  },
  {
    id: 'economic_recession',
    name: 'Economic Recession',
    emoji: '📉',
    category: 'disaster',
    sentiment: 'negative',
    headline: 'RECESSION HITS — Entertainment Budgets Slashed',
    description: 'All BO -25%. Audiences tighten their wallets.',
    durationRange: [2, 3],
    weight: 3,
    effects: { boMultiplier: 0.75 },
    condition: (ctx) => ctx.season >= 3,
  },
];

// ─── EVENT GENERATION ───

function pickRandomGenre(rng: () => number): Genre {
  return ALL_GENRES[Math.floor(rng() * ALL_GENRES.length)];
}

/**
 * Generate world events for a new season.
 * Returns 1-2 new events, avoiding duplicates with currently active ones.
 */
export function generateWorldEvents(
  ctx: WorldEventContext,
  rng: () => number,
): ActiveWorldEvent[] {
  const activeIds = new Set(ctx.activeWorldEvents.map(e => e.id));
  
  // Filter eligible events
  const eligible = WORLD_EVENTS.filter(e => {
    if (activeIds.has(e.id)) return false;
    if (e.condition && !e.condition(ctx)) return false;
    return true;
  });
  
  if (eligible.length === 0) return [];
  
  // Determine count: 60% chance of 1, 40% chance of 2
  const count = rng() < 0.6 ? 1 : 2;
  
  // Weighted selection
  const selected: ActiveWorldEvent[] = [];
  const pool = [...eligible];
  
  for (let i = 0; i < count && pool.length > 0; i++) {
    const totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);
    let roll = rng() * totalWeight;
    let picked: WorldEventDef | null = null;
    
    for (const e of pool) {
      roll -= e.weight;
      if (roll <= 0) { picked = e; break; }
    }
    if (!picked) picked = pool[pool.length - 1];
    
    // Resolve duration
    const [minD, maxD] = picked.durationRange;
    const duration = minD + Math.floor(rng() * (maxD - minD + 1));
    
    // Resolve random genres
    let resolvedGenre: Genre | undefined;
    const effects = { ...picked.effects };
    
    if (effects.genreBOBonus?.genres === 'random') {
      resolvedGenre = pickRandomGenre(rng);
      effects.genreBOBonus = { genres: [resolvedGenre], multiplier: effects.genreBOBonus.multiplier };
    }
    if (effects.genreBOPenalty?.genres === 'random') {
      resolvedGenre = resolvedGenre || pickRandomGenre(rng);
      effects.genreBOPenalty = { genres: [resolvedGenre], multiplier: effects.genreBOPenalty.multiplier };
    }
    
    selected.push({
      id: picked.id,
      name: picked.name,
      emoji: picked.emoji,
      category: picked.category,
      sentiment: picked.sentiment,
      headline: picked.headline,
      description: resolvedGenre
        ? picked.description.replace(/A random genre/g, resolvedGenre)
        : picked.description,
      effects,
      startSeason: ctx.season,
      endSeason: ctx.season + duration - 1,
      resolvedGenre,
    });
    
    // Remove from pool to avoid duplicate picks
    const idx = pool.findIndex(e => e.id === picked!.id);
    if (idx >= 0) pool.splice(idx, 1);
  }
  
  return selected;
}

// ─── EFFECT CALCULATION HELPERS ───

/**
 * Get combined BO multiplier from all active world events for a given genre.
 */
export function getWorldEventBOMultiplier(
  events: ActiveWorldEvent[],
  genre: Genre,
  isSequel: boolean,
): number {
  let mult = 1.0;
  
  for (const event of events) {
    const fx = event.effects;
    
    // Global BO multiplier
    if (fx.boMultiplier) {
      // Nostalgia wave only applies to sequels
      if (event.id === 'nostalgia_wave') {
        if (isSequel) mult *= fx.boMultiplier;
      } else {
        mult *= fx.boMultiplier;
      }
    }
    
    // Genre-specific bonus
    if (fx.genreBOBonus && Array.isArray(fx.genreBOBonus.genres)) {
      if ((fx.genreBOBonus.genres as Genre[]).includes(genre)) {
        mult *= fx.genreBOBonus.multiplier;
      }
    }
    
    // Genre-specific penalty
    if (fx.genreBOPenalty && Array.isArray(fx.genreBOPenalty.genres)) {
      if ((fx.genreBOPenalty.genres as Genre[]).includes(genre)) {
        mult *= fx.genreBOPenalty.multiplier;
      }
    }
  }
  
  return Math.round(mult * 1000) / 1000;
}

/**
 * Get talent cost multiplier from active world events.
 */
export function getWorldEventTalentCostMultiplier(events: ActiveWorldEvent[]): number {
  let mult = 1.0;
  for (const event of events) {
    if (event.effects.talentCostMultiplier) mult *= event.effects.talentCostMultiplier;
  }
  return mult;
}

/**
 * Get budget/script cost multiplier from active world events.
 */
export function getWorldEventBudgetMultiplier(events: ActiveWorldEvent[]): number {
  let mult = 1.0;
  for (const event of events) {
    if (event.effects.budgetMultiplier) mult *= event.effects.budgetMultiplier;
  }
  return mult;
}

/**
 * Get flat quality bonus from active world events.
 */
export function getWorldEventQualityBonus(
  events: ActiveWorldEvent[],
  genre: Genre,
  scriptCost: number,
): number {
  let bonus = 0;
  for (const event of events) {
    const fx = event.effects;
    if (fx.qualityBonus && fx.qualityBonusCondition) {
      switch (fx.qualityBonusCondition) {
        case 'all':
          // Horror renaissance: only Horror gets quality bonus
          if (event.id === 'horror_renaissance') {
            if (genre === 'Horror') bonus += fx.qualityBonus;
          } else {
            bonus += fx.qualityBonus;
          }
          break;
        case 'vfx':
          if (genre === 'Sci-Fi' || genre === 'Action') bonus += fx.qualityBonus;
          break;
        case 'lowBudget':
          if (scriptCost <= 5) bonus += fx.qualityBonus;
          break;
      }
    }
  }
  return bonus;
}

/**
 * Get streaming bonus from active world events.
 */
export function getWorldEventStreamingBonus(events: ActiveWorldEvent[]): number {
  let bonus = 0;
  for (const event of events) {
    if (event.effects.streamingBonus) bonus += event.effects.streamingBonus;
  }
  return bonus;
}

/**
 * Tick active events: remove expired ones, return which ones ended.
 */
export function tickWorldEvents(
  events: ActiveWorldEvent[],
  currentSeason: number,
): { active: ActiveWorldEvent[]; ended: ActiveWorldEvent[] } {
  const active: ActiveWorldEvent[] = [];
  const ended: ActiveWorldEvent[] = [];
  
  for (const event of events) {
    if (currentSeason > event.endSeason) {
      ended.push(event);
    } else {
      active.push(event);
    }
  }
  
  return { active, ended };
}
