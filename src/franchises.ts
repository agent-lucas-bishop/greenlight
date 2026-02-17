/**
 * R220: Film Franchise System
 * 
 * When a film earns BLOCKBUSTER or HIT tier, unlock sequel option.
 * Sequels inherit genre, get BO bonus from brand recognition (diminishing),
 * but critic scores get harsher (fatigue penalty).
 * Track franchise chains: original → sequel → threequel. Max 5 films per franchise.
 */

import type { FranchiseEntry, Genre, RewardTier, Script, GameState } from './types';

// ─── FRANCHISE BONUS MULTIPLIERS (diminishing per sequel) ───
const SEQUEL_BO_BONUS: Record<number, number> = {
  2: 0.40, // sequel: +40%
  3: 0.25, // threequel: +25%
  4: 0.10, // 4th film: +10%
  5: 0.10, // 5th film: +10%
};

// ─── CRITIC FATIGUE PENALTY (applied to critic score) ───
const CRITIC_FATIGUE: Record<number, number> = {
  2: -5,
  3: -10,
  4: -18,
  5: -25,
};

export const MAX_FRANCHISE_FILMS = 5;

// ─── Sequel subtitle pool ───
const SEQUEL_SUBTITLES: string[][] = [
  // Film #2 options
  ['II', 'Returns', 'Reloaded', 'Rising', 'Unleashed', 'The Sequel'],
  // Film #3 options
  ['III', 'Revolutions', 'The Final Chapter', 'Reckoning', 'Endgame'],
  // Film #4 options
  ['IV', 'Legacy', 'Resurrection', 'Redemption', 'Origins'],
  // Film #5 options
  ['V', 'The Last Stand', 'Forever', 'Apocalypse', 'Infinity'],
];

/** Generate a sequel title with variety */
export function generateSequelTitle(rootTitle: string, sequelNum: number): string {
  const idx = Math.min(sequelNum - 2, SEQUEL_SUBTITLES.length - 1);
  const pool = SEQUEL_SUBTITLES[idx];
  // Use a simple hash of root title to pick consistently
  const hash = rootTitle.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  // First sequel always gets the numeral, later ones get creative names
  if (sequelNum === 2) {
    return `${rootTitle} 2`;
  }
  const suffix = pool[(hash + sequelNum) % pool.length];
  // Sometimes use "Name: Subtitle" format
  if (sequelNum >= 3 && (hash + sequelNum) % 3 !== 0) {
    return `${rootTitle}: ${suffix}`;
  }
  return `${rootTitle} ${suffix}`;
}

/** Check if a franchise is eligible for a sequel */
export function canMakeSequel(franchise: FranchiseEntry): boolean {
  if (franchise.sequelNumber >= MAX_FRANCHISE_FILMS) return false;
  const lastFilm = franchise.films[franchise.films.length - 1];
  if (!lastFilm) return false;
  // Must be HIT or BLOCKBUSTER (or SMASH which is between HIT and BLOCKBUSTER)
  return lastFilm.tier === 'HIT' || lastFilm.tier === 'SMASH' || lastFilm.tier === 'BLOCKBUSTER';
}

/** Get all franchises eligible for sequels */
export function getEligibleFranchises(state: GameState): FranchiseEntry[] {
  return Object.values(state.franchises).filter(canMakeSequel);
}

/** Get franchise BO multiplier bonus for a given film number in the franchise */
export function getFranchiseBOBonus(filmNumber: number): number {
  return SEQUEL_BO_BONUS[filmNumber] || 0.05;
}

/** Get critic fatigue penalty for a given film number */
export function getCriticFatiguePenalty(filmNumber: number): number {
  return CRITIC_FATIGUE[filmNumber] || -25;
}

/** Generate a sequel script from a franchise */
export function generateSequelScript(franchise: FranchiseEntry, originalScript: Script | null): Script {
  const sequelNum = franchise.sequelNumber + 1;
  const title = generateSequelTitle(franchise.rootTitle, sequelNum);
  
  // Base score diminishes per sequel
  const baseScore = Math.max(5, Math.round(franchise.lastQuality * (sequelNum === 2 ? 0.75 : sequelNum === 3 ? 0.65 : 0.55)));
  
  // Cost escalates
  const cost = franchise.lastCost + (sequelNum - 1) * 2;
  
  // Inherit slots and cards from original or use defaults
  const slots = originalScript?.slots || ['Lead', 'Support', 'Director', 'Crew'] as any;
  const cards = originalScript?.cards || [];
  
  return {
    id: `sequel-${franchise.rootTitle}-${sequelNum}-${Date.now()}`,
    title,
    genre: franchise.genre,
    baseScore,
    slots,
    cost,
    cards,
    abilityDesc: `Franchise sequel #${sequelNum}. Brand recognition: +${Math.round(getFranchiseBOBonus(sequelNum) * 100)}% BO. Critic fatigue: ${getCriticFatiguePenalty(sequelNum)} score.`,
  };
}

/** Create or update a franchise entry when a film releases */
export function updateFranchiseOnRelease(
  franchises: Record<string, FranchiseEntry>,
  sequelOrigins: Record<string, string>,
  filmTitle: string,
  genre: Genre,
  season: number,
  quality: number,
  boxOffice: number,
  tier: RewardTier,
  scriptCost: number,
  marketMultiplier: number,
): { franchises: Record<string, FranchiseEntry>; sequelOrigins: Record<string, string> } {
  const newFranchises = { ...franchises };
  const newSequelOrigins = { ...sequelOrigins };
  
  const franchiseRoot = sequelOrigins[filmTitle] || null;
  
  // Update existing franchise
  if (franchiseRoot && newFranchises[franchiseRoot]) {
    const f = { ...newFranchises[franchiseRoot] };
    f.films = [...f.films, { title: filmTitle, season, quality, boxOffice, tier }];
    f.totalBoxOffice += boxOffice;
    f.sequelNumber = f.films.length;
    f.lastQuality = quality;
    f.lastCost = scriptCost;
    f.lastMarketMultiplier = marketMultiplier;
    newFranchises[franchiseRoot] = f;
  }
  
  // Create franchise entry if HIT/SMASH/BLOCKBUSTER and not already in one
  if ((tier === 'HIT' || tier === 'SMASH' || tier === 'BLOCKBUSTER') && !franchiseRoot) {
    const rootTitle = filmTitle;
    if (!newFranchises[rootTitle]) {
      newFranchises[rootTitle] = {
        rootTitle,
        genre,
        films: [{ title: filmTitle, season, quality, boxOffice, tier }],
        totalBoxOffice: boxOffice,
        sequelNumber: 1,
        lastQuality: quality,
        lastCost: scriptCost,
        lastMarketMultiplier: marketMultiplier,
      };
    }
  }
  
  return { franchises: newFranchises, sequelOrigins: newSequelOrigins };
}

/** Get franchise stats summary for statistics dashboard */
export function getFranchiseStats(state: GameState): {
  totalFranchises: number;
  longestFranchise: { name: string; films: number } | null;
  highestGrossingFranchise: { name: string; total: number } | null;
  totalSequels: number;
  avgSequelPerformance: number;
} {
  const entries = Object.values(state.franchises);
  if (entries.length === 0) {
    return { totalFranchises: 0, longestFranchise: null, highestGrossingFranchise: null, totalSequels: 0, avgSequelPerformance: 0 };
  }
  
  const longest = entries.reduce((a, b) => a.films.length > b.films.length ? a : b);
  const highest = entries.reduce((a, b) => a.totalBoxOffice > b.totalBoxOffice ? a : b);
  const totalSequels = entries.reduce((sum, f) => sum + Math.max(0, f.films.length - 1), 0);
  
  // Average sequel BO compared to original
  let sequelPerfs: number[] = [];
  for (const f of entries) {
    if (f.films.length >= 2) {
      const origBO = f.films[0].boxOffice;
      for (let i = 1; i < f.films.length; i++) {
        if (origBO > 0) sequelPerfs.push(f.films[i].boxOffice / origBO);
      }
    }
  }
  const avgSequelPerformance = sequelPerfs.length > 0
    ? sequelPerfs.reduce((a, b) => a + b, 0) / sequelPerfs.length
    : 0;
  
  return {
    totalFranchises: entries.length,
    longestFranchise: { name: longest.rootTitle, films: longest.films.length },
    highestGrossingFranchise: { name: highest.rootTitle, total: highest.totalBoxOffice },
    totalSequels,
    avgSequelPerformance,
  };
}
