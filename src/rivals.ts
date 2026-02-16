import { rng } from './seededRng';
import { Genre, RewardTier } from './types';

// ─── RIVAL STUDIOS ───
// Simple AI studios that "release" films each season alongside the player

export interface RivalStudio {
  name: string;
  emoji: string;
  style: string; // flavor description
  // Tendencies affect their random rolls
  qualityRange: [number, number]; // min, max quality
  genrePool: Genre[];
}

export interface RivalFilm {
  studioName: string;
  studioEmoji: string;
  title: string;
  genre: Genre;
  boxOffice: number;
  tier: RewardTier;
  quality: number;
}

const RIVAL_STUDIOS: RivalStudio[] = [
  {
    name: 'Apex Global',
    emoji: '🦅',
    style: 'Big-budget blockbuster factory',
    qualityRange: [15, 45],
    genrePool: ['Action', 'Sci-Fi', 'Thriller', 'Action', 'Sci-Fi'], // weighted toward action/sci-fi
  },
  {
    name: 'Lumière Collective',
    emoji: '🕯️',
    style: 'Prestige arthouse darling',
    qualityRange: [18, 40],
    genrePool: ['Drama', 'Romance', 'Thriller', 'Drama', 'Drama'],
  },
  {
    name: 'Fright Factory',
    emoji: '👻',
    style: 'Genre specialists with cult followings',
    qualityRange: [12, 42],
    genrePool: ['Horror', 'Thriller', 'Comedy', 'Horror', 'Horror'],
  },
];

// Film title templates per genre
const TITLE_PARTS: Record<Genre, string[][]> = {
  Action: [['Iron', 'Steel', 'Shadow', 'Final', 'Lethal', 'Crimson'], ['Protocol', 'Strike', 'Fury', 'Judgment', 'Dawn', 'Horizon']],
  Comedy: [['My Big', 'Totally', 'Operation', 'The Last', 'Super'], ['Weekend', 'Disaster', 'Reunion', 'Oops', 'Chaos']],
  Drama: [['The Weight of', 'Still', 'Between', 'After the', 'All the'], ['Silence', 'Water', 'Everything', 'Storm', 'Light']],
  Horror: [['The', 'Last', 'Don\'t', 'They', 'Below the'], ['Hollow', 'Whisper', 'Look', 'Watch', 'Surface']],
  'Sci-Fi': [['Neon', 'Beyond', 'The Last', 'Zero', 'Star'], ['Frontier', 'Orbit', 'Signal', 'Point', 'Colony']],
  Romance: [['Before', 'Letters to', 'One More', 'The Way', 'Always'], ['Sunrise', 'Paris', 'Chance', 'Home', 'You']],
  Thriller: [['The', 'No', 'Behind', 'Red', 'Silent'], ['Informant', 'Exit', 'Closed Doors', 'Line', 'Witness']],
};

function generateRivalTitle(genre: Genre): string {
  const parts = TITLE_PARTS[genre] || TITLE_PARTS['Action'];
  const p1 = parts[0][Math.floor(rng() * parts[0].length)];
  const p2 = parts[1][Math.floor(rng() * parts[1].length)];
  return `${p1} ${p2}`;
}

function getTier(boxOffice: number, target: number): RewardTier {
  const ratio = boxOffice / target;
  if (ratio >= 1.5) return 'BLOCKBUSTER';
  if (ratio >= 1.25) return 'SMASH';
  if (ratio >= 1.0) return 'HIT';
  return 'FLOP';
}

// Generate a rival film for a given season
function generateRivalFilm(studio: RivalStudio, season: number, target: number): RivalFilm {
  const genre = studio.genrePool[Math.floor(rng() * studio.genrePool.length)];
  const [minQ, maxQ] = studio.qualityRange;
  // Quality scales up slightly with season (rivals get better too)
  const seasonBoost = (season - 1) * 3;
  const quality = Math.round(minQ + seasonBoost + rng() * (maxQ - minQ));
  // Simple box office: quality * random multiplier (0.8 - 1.6)
  const multiplier = 0.8 + rng() * 0.8;
  const boxOffice = Math.round(quality * multiplier * 10) / 10;
  const tier = getTier(boxOffice, target);
  const title = generateRivalTitle(genre);

  return {
    studioName: studio.name,
    studioEmoji: studio.emoji,
    title,
    genre,
    boxOffice,
    tier,
    quality,
  };
}

// Generate all rival films for a season
// hotGenres: rivals are more likely to chase trends (50% chance to switch to a hot genre)
export function generateRivalSeason(season: number, target: number, hotGenres?: Genre[], coldGenres?: Genre[]): RivalFilm[] {
  return RIVAL_STUDIOS.map(studio => {
    const film = generateRivalFilm(studio, season, target);
    // Rivals chase hot genres 50% of the time
    if (hotGenres && hotGenres.length > 0 && rng() < 0.5) {
      film.genre = hotGenres[Math.floor(rng() * hotGenres.length)];
      film.title = generateRivalTitle(film.genre);
      // Hot genre bonus for rivals too
      film.boxOffice = Math.round(film.boxOffice * 1.2 * 10) / 10;
    }
    // Cold genre penalty for rivals
    if (coldGenres && coldGenres.includes(film.genre)) {
      film.boxOffice = Math.round(film.boxOffice * 0.8 * 10) / 10;
    }
    film.tier = getTier(film.boxOffice, target);
    return film;
  });
}

// ─── SEASON IDENTITY ───

export interface SeasonIdentity {
  season: number;
  name: string;
  subtitle: string;
  description: string;
  talentPoolSize: number; // how many talent in market
  budgetBonus: number; // extra budget at season start (on top of normal)
  targetMultiplier: number; // already handled by getSeasonTarget, this is flavor only
}

export const SEASON_IDENTITIES: SeasonIdentity[] = [
  {
    season: 1,
    name: 'THE DEBUT',
    subtitle: 'Prove You Belong',
    description: 'Limited budget, unknown talent. The industry doesn\'t know your name yet.',
    talentPoolSize: 3,
    budgetBonus: 0,
    targetMultiplier: 1.0,
  },
  {
    season: 2,
    name: 'THE SOPHOMORE',
    subtitle: 'Avoid the Slump',
    description: 'Your first film set expectations. Now deliver again — or be a one-hit wonder.',
    talentPoolSize: 4,
    budgetBonus: 0,
    targetMultiplier: 1.0,
  },
  {
    season: 3,
    name: 'THE PRIME',
    subtitle: 'Peak of Your Powers',
    description: 'More talent, bigger budgets, higher stakes. This is your moment.',
    talentPoolSize: 5,
    budgetBonus: 2,
    targetMultiplier: 1.0,
  },
  {
    season: 4,
    name: 'THE RECKONING',
    subtitle: 'The Industry Pushes Back',
    description: 'Rivals are catching up. The market is ruthless. Only the best survive.',
    talentPoolSize: 5,
    budgetBonus: 3,
    targetMultiplier: 1.0,
  },
  {
    season: 5,
    name: 'THE LEGACY',
    subtitle: 'Define Your Studio Forever',
    description: 'This is how you\'ll be remembered. Make it count.',
    talentPoolSize: 6,
    budgetBonus: 5,
    targetMultiplier: 1.0,
  },
];

export function getSeasonIdentity(season: number): SeasonIdentity {
  return SEASON_IDENTITIES[Math.min(season - 1, SEASON_IDENTITIES.length - 1)];
}

