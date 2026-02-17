import { rng } from './seededRng';
import { Genre, RewardTier } from './types';

// ─── R225: ADVANCED AI DIRECTOR BATTLES ───

export interface AIDirector {
  id: string;
  name: string;
  portrait: string;
  personality: string;
  preferredGenres: Genre[];
  strategyStyle: 'prestige' | 'blockbuster' | 'indie' | 'balanced' | 'franchise' | 'experimental';
  difficultyModifier: number; // 0.8 = easier, 1.2 = harder
  budgetStyle: 'lavish' | 'moderate' | 'frugal';
  talentPreference: 'star-power' | 'ensemble' | 'unknown-gems' | 'method-actors';
  catchphrase: string;
  description: string;
}

export interface DirectorFilm {
  directorId: string;
  directorName: string;
  directorPortrait: string;
  title: string;
  genre: Genre;
  budget: number;
  boxOffice: number;
  quality: number;
  tier: RewardTier;
  season: number;
}

export interface DirectorStanding {
  directorId: string;
  name: string;
  portrait: string;
  totalBoxOffice: number;
  films: DirectorFilm[];
  seasonsActive: number;
  lastRank: number;
  currentRank: number;
  winsVsPlayer: number;
  lossesVsPlayer: number;
}

export interface BoxOfficeShowdown {
  playerFilmTitle: string;
  playerGenre: Genre;
  playerBO: number;
  rivalDirector: AIDirector;
  rivalFilm: DirectorFilm;
  playerWon: boolean;
  margin: number;
}

// ─── THE 8 AI DIRECTORS ───

export const AI_DIRECTORS: AIDirector[] = [
  {
    id: 'victoria',
    name: 'Victoria Sterling',
    portrait: '👸',
    personality: 'Imperious prestige auteur who only makes "important" films',
    preferredGenres: ['Drama', 'Romance'],
    strategyStyle: 'prestige',
    difficultyModifier: 1.15,
    budgetStyle: 'lavish',
    talentPreference: 'star-power',
    catchphrase: 'Art doesn\'t have a budget ceiling, darling.',
    description: 'Oscar-bait queen. High-budget prestige dramas that critics adore.',
  },
  {
    id: 'max',
    name: 'Max Thunder',
    portrait: '💪',
    personality: 'Brash action mogul who lives for explosions and opening weekends',
    preferredGenres: ['Action', 'Sci-Fi'],
    strategyStyle: 'blockbuster',
    difficultyModifier: 1.2,
    budgetStyle: 'lavish',
    talentPreference: 'star-power',
    catchphrase: 'If the budget isn\'t nine figures, is it even a movie?',
    description: 'Franchise king. Action blockbusters that dominate opening weekends.',
  },
  {
    id: 'luna',
    name: 'Luna Nightshade',
    portrait: '🌙',
    personality: 'Cerebral horror specialist who turns $2M into $200M',
    preferredGenres: ['Horror', 'Thriller'],
    strategyStyle: 'indie',
    difficultyModifier: 1.0,
    budgetStyle: 'frugal',
    talentPreference: 'unknown-gems',
    catchphrase: 'Fear is the most profitable emotion.',
    description: 'Low-budget horror genius. Tiny budgets, massive ROI.',
  },
  {
    id: 'raj',
    name: 'Raj Patel',
    portrait: '🎯',
    personality: 'Strategic polymath who adapts to market trends instantly',
    preferredGenres: ['Comedy', 'Drama', 'Action'],
    strategyStyle: 'balanced',
    difficultyModifier: 1.1,
    budgetStyle: 'moderate',
    talentPreference: 'ensemble',
    catchphrase: 'Read the market. Then read it again.',
    description: 'Genre chameleon. Balanced approach that\'s hard to outmaneuver.',
  },
  {
    id: 'cassandra',
    name: 'Cassandra Voss',
    portrait: '🔮',
    personality: 'Avant-garde visionary who makes films no one asked for — and they work',
    preferredGenres: ['Sci-Fi', 'Drama', 'Thriller'],
    strategyStyle: 'experimental',
    difficultyModifier: 0.9,
    budgetStyle: 'moderate',
    talentPreference: 'method-actors',
    catchphrase: 'The audience doesn\'t know what it wants until I show them.',
    description: 'Wild card auteur. Unpredictable quality but occasional masterpieces.',
  },
  {
    id: 'frank',
    name: 'Frank "The Tank" Moretti',
    portrait: '🦈',
    personality: 'Old-school studio boss who cranks out franchise sequels relentlessly',
    preferredGenres: ['Action', 'Comedy'],
    strategyStyle: 'franchise',
    difficultyModifier: 1.15,
    budgetStyle: 'lavish',
    talentPreference: 'star-power',
    catchphrase: 'Every hit deserves a sequel. Every sequel deserves a cinematic universe.',
    description: 'Sequel machine. Reliable profits from franchise IP.',
  },
  {
    id: 'yuki',
    name: 'Yuki Tanaka',
    portrait: '🌸',
    personality: 'Meticulous craftsperson who never rushes and rarely misses',
    preferredGenres: ['Romance', 'Drama', 'Comedy'],
    strategyStyle: 'prestige',
    difficultyModifier: 1.05,
    budgetStyle: 'moderate',
    talentPreference: 'ensemble',
    catchphrase: 'Patience is the only cheat code.',
    description: 'Steady hand. Consistent quality, few flops, slow-burn success.',
  },
  {
    id: 'diego',
    name: 'Diego Santos',
    portrait: '🔥',
    personality: 'Passionate risk-taker who swings between disaster and genius',
    preferredGenres: ['Thriller', 'Horror', 'Sci-Fi'],
    strategyStyle: 'experimental',
    difficultyModifier: 0.95,
    budgetStyle: 'frugal',
    talentPreference: 'unknown-gems',
    catchphrase: 'Safe is the most dangerous thing you can be.',
    description: 'High variance gambler. Legendary highs, spectacular lows.',
  },
];

// ─── TITLE GENERATION ───

const DIRECTOR_TITLE_PARTS: Record<Genre, [string[], string[]]> = {
  Action: [
    ['Iron', 'Steel', 'Shadow', 'Final', 'Crimson', 'Storm', 'Rogue', 'Burning', 'Titan', 'Savage'],
    ['Protocol', 'Strike', 'Fury', 'Dawn', 'Vengeance', 'Pursuit', 'Impact', 'Assault', 'Command', 'Siege'],
  ],
  Comedy: [
    ['My Big', 'Totally', 'Operation', 'The Last', 'Super', 'Accidentally', 'Uncle', 'Camp', 'Hot', 'Barely'],
    ['Weekend', 'Disaster', 'Reunion', 'Chaos', 'Fiasco', 'Getaway', 'Meltdown', 'Honeymoon', 'Mess', 'Legal'],
  ],
  Drama: [
    ['The Weight of', 'Still', 'Between', 'After the', 'Whispered', 'Ordinary', 'Broken', 'Quiet', 'A Map of', 'The Color of'],
    ['Silence', 'Water', 'Everything', 'Storm', 'Light', 'Grace', 'Bridges', 'Hours', 'Days', 'Morning'],
  ],
  Horror: [
    ['The', 'Last', 'Don\'t', 'Below the', 'Beneath', 'Unholy', 'Dead', 'Bone', 'Hollow', 'Wretched'],
    ['Hollow', 'Whisper', 'Look', 'Surface', 'Descent', 'Parish', 'Harvest', 'Echo', 'Cellar', 'Root'],
  ],
  'Sci-Fi': [
    ['Neon', 'Beyond', 'The Last', 'Zero', 'Quantum', 'Deep', 'Omega', 'Cryo', 'Astral', 'Void'],
    ['Frontier', 'Orbit', 'Signal', 'Colony', 'Protocol', 'Drift', 'Threshold', 'Gate', 'Nexus', 'Array'],
  ],
  Romance: [
    ['Before', 'Letters to', 'One More', 'Always', 'Meet Me in', 'Falling for', 'Written in', 'Close to', 'Say', 'Waiting for'],
    ['Sunrise', 'Paris', 'Chance', 'You', 'December', 'Florence', 'Starlight', 'Tomorrow', 'Nothing', 'Yes'],
  ],
  Thriller: [
    ['The', 'No', 'Behind', 'Red', 'Silent', 'Double', 'Final', 'Buried', 'Blind', 'Cold'],
    ['Informant', 'Exit', 'Closed Doors', 'Line', 'Witness', 'Cross', 'Trace', 'Alibi', 'Angle', 'Case'],
  ],
};

function generateTitle(genre: Genre): string {
  const [firsts, seconds] = DIRECTOR_TITLE_PARTS[genre] || DIRECTOR_TITLE_PARTS['Action'];
  return `${firsts[Math.floor(rng() * firsts.length)]} ${seconds[Math.floor(rng() * seconds.length)]}`;
}

function getTier(bo: number, target: number): RewardTier {
  const r = bo / target;
  if (r >= 1.5) return 'BLOCKBUSTER';
  if (r >= 1.25) return 'SMASH';
  if (r >= 1.0) return 'HIT';
  return 'FLOP';
}

// ─── AI DECISION LOGIC ───

function pickGenre(director: AIDirector, hotGenres?: Genre[], coldGenres?: Genre[]): Genre {
  // 70% chance to pick from preferred genres, 30% to branch out
  if (rng() < 0.7) {
    const prefs = director.preferredGenres;
    // If a preferred genre is hot, strongly favor it
    if (hotGenres) {
      const hotPrefs = prefs.filter(g => hotGenres.includes(g));
      if (hotPrefs.length > 0 && rng() < 0.6) {
        return hotPrefs[Math.floor(rng() * hotPrefs.length)];
      }
    }
    return prefs[Math.floor(rng() * prefs.length)];
  }
  // Branch out
  const all: Genre[] = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];
  const viable = coldGenres ? all.filter(g => !coldGenres.includes(g)) : all;
  return viable[Math.floor(rng() * viable.length)];
}

function allocateBudget(director: AIDirector, season: number): number {
  const base = season * 5 + 10;
  switch (director.budgetStyle) {
    case 'lavish': return base * (1.3 + rng() * 0.4);
    case 'moderate': return base * (0.9 + rng() * 0.3);
    case 'frugal': return base * (0.5 + rng() * 0.3);
  }
}

function calculateQuality(director: AIDirector, budget: number, season: number): number {
  let base = 15 + season * 6 + rng() * 25;

  // Strategy modifiers
  switch (director.strategyStyle) {
    case 'prestige': base += 8 + rng() * 5; break;
    case 'blockbuster': base += 3 + rng() * 8; break;
    case 'indie': base += 5 + rng() * 6; break;
    case 'balanced': base += 4 + rng() * 5; break;
    case 'franchise': base += 2 + rng() * 7; break;
    case 'experimental':
      // High variance
      base += -5 + rng() * 20;
      break;
  }

  // Budget influence
  base += budget * 0.15;

  return Math.max(5, Math.round(base));
}

// ─── PRODUCE FILMS ───

export function produceDirectorFilms(
  directors: AIDirector[],
  season: number,
  target: number,
  hotGenres?: Genre[],
  coldGenres?: Genre[],
): DirectorFilm[] {
  const films: DirectorFilm[] = [];

  for (const dir of directors) {
    // Each director makes 1-2 films
    const filmCount = rng() < 0.4 ? 2 : 1;

    for (let i = 0; i < filmCount; i++) {
      const genre = pickGenre(dir, hotGenres, coldGenres);
      const budget = allocateBudget(dir, season);
      const quality = calculateQuality(dir, budget, season);

      // Box office calculation
      let mult = 0.7 + rng() * 0.8;
      mult *= dir.difficultyModifier;

      // Hot/cold genre effects
      if (hotGenres?.includes(genre)) mult *= 1.15;
      if (coldGenres?.includes(genre)) mult *= 0.8;

      const boxOffice = Math.round(quality * mult * 10) / 10;
      const tier = getTier(boxOffice, target);

      films.push({
        directorId: dir.id,
        directorName: dir.name,
        directorPortrait: dir.portrait,
        title: generateTitle(genre),
        genre,
        budget: Math.round(budget),
        boxOffice,
        quality,
        tier,
        season,
      });
    }
  }

  return films;
}

// ─── BOX OFFICE SHOWDOWN DETECTION ───

export function detectShowdowns(
  playerGenre: Genre,
  playerBO: number,
  playerTitle: string,
  directorFilms: DirectorFilm[],
): BoxOfficeShowdown[] {
  const collisions = directorFilms.filter(f => f.genre === playerGenre);
  if (collisions.length === 0) return [];

  return collisions.map(film => {
    const dir = AI_DIRECTORS.find(d => d.id === film.directorId)!;
    return {
      playerFilmTitle: playerTitle,
      playerGenre,
      playerBO,
      rivalDirector: dir,
      rivalFilm: film,
      playerWon: playerBO >= film.boxOffice,
      margin: Math.round(Math.abs(playerBO - film.boxOffice) * 10) / 10,
    };
  });
}

// ─── STANDINGS ───

export function calculateStandings(
  allFilms: DirectorFilm[][],  // films per season
  playerSeasonBOs: number[],
  previousRanks: Record<string, number>,
): DirectorStanding[] {
  const standings: Record<string, DirectorStanding> = {};

  for (const dir of AI_DIRECTORS) {
    standings[dir.id] = {
      directorId: dir.id,
      name: dir.name,
      portrait: dir.portrait,
      totalBoxOffice: 0,
      films: [],
      seasonsActive: 0,
      lastRank: previousRanks[dir.id] || 0,
      currentRank: 0,
      winsVsPlayer: 0,
      lossesVsPlayer: 0,
    };
  }

  for (let s = 0; s < allFilms.length; s++) {
    const seasonFilms = allFilms[s];
    const playerBO = playerSeasonBOs[s] || 0;

    // Group films by director and track best per season
    const dirSeasonBest: Record<string, number> = {};

    for (const film of seasonFilms) {
      if (!standings[film.directorId]) continue;
      standings[film.directorId].films.push(film);
      standings[film.directorId].totalBoxOffice = Math.round((standings[film.directorId].totalBoxOffice + film.boxOffice) * 10) / 10;
      standings[film.directorId].seasonsActive = s + 1;

      if (!dirSeasonBest[film.directorId] || film.boxOffice > dirSeasonBest[film.directorId]) {
        dirSeasonBest[film.directorId] = film.boxOffice;
      }
    }

    // Compare best film per director vs player
    for (const [dirId, best] of Object.entries(dirSeasonBest)) {
      if (best > playerBO) standings[dirId].winsVsPlayer++;
      else standings[dirId].lossesVsPlayer++;
    }
  }

  // Sort and assign ranks
  const sorted = Object.values(standings).sort((a, b) => b.totalBoxOffice - a.totalBoxOffice);
  sorted.forEach((s, i) => { s.currentRank = i + 1; });

  return sorted;
}

// ─── SEASON LEADERBOARD (includes player) ───

export interface LeaderboardEntry {
  name: string;
  portrait: string;
  totalBO: number;
  rank: number;
  prevRank: number;
  movement: 'up' | 'down' | 'same' | 'new';
  isPlayer: boolean;
  filmCount: number;
}

export function getSeasonLeaderboard(
  standings: DirectorStanding[],
  playerName: string,
  playerTotalBO: number,
  playerFilmCount: number,
  playerPrevRank: number,
): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = standings.map(s => ({
    name: s.name,
    portrait: s.portrait,
    totalBO: s.totalBoxOffice,
    rank: 0,
    prevRank: s.lastRank,
    movement: 'same' as const,
    isPlayer: false,
    filmCount: s.films.length,
  }));

  entries.push({
    name: playerName,
    portrait: '🎬',
    totalBO: playerTotalBO,
    rank: 0,
    prevRank: playerPrevRank,
    movement: 'same',
    isPlayer: true,
    filmCount: playerFilmCount,
  });

  entries.sort((a, b) => b.totalBO - a.totalBO);
  entries.forEach((e, i) => {
    e.rank = i + 1;
    if (e.prevRank === 0) e.movement = 'new';
    else if (e.rank < e.prevRank) e.movement = 'up';
    else if (e.rank > e.prevRank) e.movement = 'down';
    else e.movement = 'same';
  });

  return entries;
}
