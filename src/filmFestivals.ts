// R176: Film Festival Events — procedural festival judging system
import type { GameState, SeasonResult, Genre } from './types';

export type FestivalId = 'sundance' | 'cannes' | 'venice' | 'toronto' | 'oscars';
export type FestivalAward = 'nomination' | 'winner' | 'grandPrize';

export interface Festival {
  id: FestivalId;
  name: string;
  emoji: string;
  description: string;
  entryCost: number; // $M
  seasonWindow: 'early' | 'mid' | 'late' | 'final'; // when the festival occurs
  genreBonus: Genre[]; // genres that get judging bonus
  qualityThreshold: number; // minimum quality to enter
  prestige: number; // 1-5, affects judging difficulty
  bonusType: 'indie' | 'prestige' | 'artistic' | 'audience' | 'academy';
}

export interface FestivalResult {
  festivalId: FestivalId;
  filmTitle: string;
  filmGenre: Genre;
  season: number;
  award: FestivalAward | null; // null = entered but lost
  score: number; // judging score
}

export interface FestivalEntry {
  festivalId: FestivalId;
  filmIndex: number; // index into seasonHistory
}

export const FESTIVALS: Festival[] = [
  {
    id: 'sundance',
    name: 'Sundance Film Festival',
    emoji: '🏔️',
    description: 'The premier indie film showcase. Low-budget gems shine here.',
    entryCost: 1,
    seasonWindow: 'early',
    genreBonus: ['Drama', 'Horror', 'Thriller'],
    qualityThreshold: 15,
    prestige: 2,
    bonusType: 'indie',
  },
  {
    id: 'cannes',
    name: 'Cannes Film Festival',
    emoji: '🌴',
    description: 'The pinnacle of cinematic prestige. Only the finest films compete.',
    entryCost: 2,
    seasonWindow: 'mid',
    genreBonus: ['Drama', 'Romance', 'Thriller'],
    qualityThreshold: 25,
    prestige: 4,
    bonusType: 'prestige',
  },
  {
    id: 'venice',
    name: 'Venice Film Festival',
    emoji: '🦁',
    description: 'Celebrates artistic vision and bold filmmaking.',
    entryCost: 2,
    seasonWindow: 'mid',
    genreBonus: ['Drama', 'Sci-Fi', 'Horror'],
    qualityThreshold: 20,
    prestige: 3,
    bonusType: 'artistic',
  },
  {
    id: 'toronto',
    name: 'Toronto International Film Festival',
    emoji: '🍁',
    description: 'The audience\'s festival. Crowd-pleasers and future hits premiere here.',
    entryCost: 1,
    seasonWindow: 'late',
    genreBonus: ['Action', 'Comedy', 'Romance'],
    qualityThreshold: 15,
    prestige: 2,
    bonusType: 'audience',
  },
  {
    id: 'oscars',
    name: 'The Academy Awards',
    emoji: '🏆',
    description: 'The ultimate recognition. Only available in the final season for qualifying films.',
    entryCost: 3,
    seasonWindow: 'final',
    genreBonus: ['Drama', 'Romance'],
    qualityThreshold: 35,
    prestige: 5,
    bonusType: 'academy',
  },
];

/** Get festivals eligible for the current season */
export function getEligibleFestivals(season: number, maxSeasons: number): Festival[] {
  return FESTIVALS.filter(f => {
    if (f.seasonWindow === 'final') return season === maxSeasons;
    if (f.seasonWindow === 'early') return season <= Math.ceil(maxSeasons * 0.4);
    if (f.seasonWindow === 'mid') return season >= 2 && season <= maxSeasons - 1;
    if (f.seasonWindow === 'late') return season >= Math.floor(maxSeasons * 0.5);
    return true;
  });
}

/** Check if a film qualifies for a festival */
export function canSubmitToFestival(festival: Festival, film: SeasonResult, budget: number): { eligible: boolean; reason?: string } {
  if (budget < festival.entryCost) return { eligible: false, reason: 'Not enough budget' };
  if (film.quality < festival.qualityThreshold) return { eligible: false, reason: `Quality too low (need ${festival.qualityThreshold}+)` };
  return { eligible: true };
}

/** Judge a film at a festival — returns score and award tier */
export function judgeFestival(
  festival: Festival,
  film: SeasonResult,
  rng: () => number,
  festivalHistory: FestivalResult[],
): FestivalResult {
  // Base score from film quality (0-50 range mapped to 0-40)
  let score = Math.min(40, film.quality * 0.8);

  // Genre fit bonus (+5-10)
  if (festival.genreBonus.includes(film.genre)) {
    score += 5 + rng() * 5;
  }

  // Critic score bonus (0-15)
  if (film.criticScore) {
    score += (film.criticScore / 100) * 15;
  }

  // Festival-specific bonuses
  switch (festival.bonusType) {
    case 'indie':
      // Lower quality films get a handicap at Sundance (indie spirit)
      if (film.quality < 25) score += 8;
      break;
    case 'prestige':
      // High quality is rewarded more at Cannes
      if (film.quality > 30) score += (film.quality - 30) * 0.5;
      break;
    case 'artistic':
      // Venice rewards quality consistency
      if (film.criticStars && film.criticStars >= 4) score += 7;
      break;
    case 'audience':
      // Toronto rewards box office potential
      if (film.tier === 'BLOCKBUSTER') score += 10;
      else if (film.tier === 'SMASH') score += 6;
      else if (film.tier === 'HIT') score += 3;
      break;
    case 'academy':
      // Oscars reward consistency — bonus for prior festival wins
      const priorWins = festivalHistory.filter(r => r.award === 'winner' || r.award === 'grandPrize').length;
      score += Math.min(10, priorWins * 3);
      break;
  }

  // RNG factor (+/- 10)
  score += (rng() - 0.5) * 20;

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Determine award based on score vs prestige-scaled thresholds
  const nominationThreshold = 35 + festival.prestige * 5; // 40-60
  const winnerThreshold = 55 + festival.prestige * 5; // 60-80
  const grandPrizeThreshold = 75 + festival.prestige * 3; // 78-90

  let award: FestivalAward | null = null;
  if (score >= grandPrizeThreshold) award = 'grandPrize';
  else if (score >= winnerThreshold) award = 'winner';
  else if (score >= nominationThreshold) award = 'nomination';

  return {
    festivalId: festival.id,
    filmTitle: film.title,
    filmGenre: film.genre,
    season: film.season,
    award,
    score: Math.round(score),
  };
}

/** Get reputation boost from a festival result */
export function getFestivalRepBoost(result: FestivalResult): number {
  if (!result.award) return 0;
  const festival = FESTIVALS.find(f => f.id === result.festivalId)!;
  const base = festival.prestige * 0.1;
  switch (result.award) {
    case 'nomination': return Math.round((base + 0.2) * 10) / 10; // 0.3-0.7
    case 'winner': return Math.round((base + 0.5) * 10) / 10; // 0.6-1.0
    case 'grandPrize': return Math.round((base + 1.0) * 10) / 10; // 1.1-1.5
  }
}

/** Get budget bonus from a festival win */
export function getFestivalBudgetBonus(result: FestivalResult): number {
  if (!result.award) return 0;
  switch (result.award) {
    case 'nomination': return 1;
    case 'winner': return 3;
    case 'grandPrize': return 5;
  }
}

/** Get award label for display */
export function getAwardLabel(award: FestivalAward): string {
  switch (award) {
    case 'nomination': return 'Nominated';
    case 'winner': return 'Winner';
    case 'grandPrize': return 'Grand Prize';
  }
}

/** Get laurel badge emoji for filmography display */
export function getLaurelBadge(award: FestivalAward | null): string {
  if (!award) return '';
  switch (award) {
    case 'nomination': return '🌿';
    case 'winner': return '🏅';
    case 'grandPrize': return '🏆';
  }
}

/** Get festival by ID */
export function getFestival(id: FestivalId): Festival {
  return FESTIVALS.find(f => f.id === id)!;
}
