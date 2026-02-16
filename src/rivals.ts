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
    genrePool: ['Action', 'Sci-Fi', 'Thriller', 'Action', 'Sci-Fi'],
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
  {
    name: 'Nova Pictures',
    emoji: '✨',
    style: 'Crowd-pleasing populist studio',
    qualityRange: [14, 38],
    genrePool: ['Comedy', 'Romance', 'Action', 'Comedy', 'Romance'],
  },
  {
    name: 'Ironclad Entertainment',
    emoji: '🛡️',
    style: 'Franchise-obsessed tentpole machine',
    qualityRange: [16, 44],
    genrePool: ['Action', 'Sci-Fi', 'Action', 'Thriller', 'Sci-Fi'],
  },
];

// Film title templates per genre
const TITLE_PARTS: Record<Genre, string[][]> = {
  Action: [
    ['Iron', 'Steel', 'Shadow', 'Final', 'Lethal', 'Crimson', 'Storm', 'Rogue', 'Black', 'Rapid', 'Dark', 'Burning', 'Thunder', 'Titan', 'Savage'],
    ['Protocol', 'Strike', 'Fury', 'Judgment', 'Dawn', 'Horizon', 'Vengeance', 'Operative', 'Pursuit', 'Impact', 'Zone', 'Assault', 'Recon', 'Command', 'Siege'],
  ],
  Comedy: [
    ['My Big', 'Totally', 'Operation', 'The Last', 'Super', 'Accidentally', 'Mostly', 'Uncle', 'Camp', 'Project'],
    ['Weekend', 'Disaster', 'Reunion', 'Oops', 'Chaos', 'Fiasco', 'Getaway', 'Meltdown', 'Honeymoon', 'Disaster Zone'],
  ],
  Drama: [
    ['The Weight of', 'Still', 'Between', 'After the', 'All the', 'Whispered', 'Ordinary', 'The Last', 'Broken', 'Quiet'],
    ['Silence', 'Water', 'Everything', 'Storm', 'Light', 'Truths', 'Grace', 'Letter', 'Bridges', 'Hours'],
  ],
  Horror: [
    ['The', 'Last', 'Don\'t', 'They', 'Below the', 'It Came from', 'Beneath', 'Unholy', 'Dead', 'Bone'],
    ['Hollow', 'Whisper', 'Look', 'Watch', 'Surface', 'Descent', 'Parish', 'Harvest', 'Echo', 'Cellar'],
  ],
  'Sci-Fi': [
    ['Neon', 'Beyond', 'The Last', 'Zero', 'Star', 'Quantum', 'Deep', 'Omega', 'Cryo', 'Astral'],
    ['Frontier', 'Orbit', 'Signal', 'Point', 'Colony', 'Protocol', 'Drift', 'Threshold', 'Gate', 'Nexus'],
  ],
  Romance: [
    ['Before', 'Letters to', 'One More', 'The Way', 'Always', 'Meet Me in', 'Falling for', 'Written in', 'Close to', 'A Year in'],
    ['Sunrise', 'Paris', 'Chance', 'Home', 'You', 'December', 'Florence', 'Starlight', 'Tomorrow', 'Your Eyes'],
  ],
  Thriller: [
    ['The', 'No', 'Behind', 'Red', 'Silent', 'Double', 'Final', 'Buried', 'Blind', 'Cold'],
    ['Informant', 'Exit', 'Closed Doors', 'Line', 'Witness', 'Cross', 'Trace', 'Alibi', 'Angle', 'Case'],
  ],
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
  // R33: Rivals scale more aggressively — season boost 3→4 per season, wider multiplier range
  // This makes late-game rivals a real threat and early rivals slightly easier
  const seasonBoost = (season - 1) * 4;
  const quality = Math.round(minQ + seasonBoost + rng() * (maxQ - minQ));
  // R33: multiplier range widens with season (more variance = less predictable)
  const baseMultLow = 0.7 + season * 0.05;  // 0.75 → 0.95
  const baseMultHigh = 1.2 + season * 0.1;  // 1.3 → 1.7
  const multiplier = baseMultLow + rng() * (baseMultHigh - baseMultLow);
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

// Generate a mega-blockbuster rival film for Season 5 finale
function generateMegaBlockbuster(season: number, target: number): RivalFilm {
  const megaTitles = ['Infinity Protocol', 'The Last Horizon', 'Endgame Rising', 'Titan\'s Fall', 'The Final Frontier'];
  const title = megaTitles[Math.floor(rng() * megaTitles.length)];
  const quality = 50 + Math.floor(rng() * 20); // 50-70 quality
  const multiplier = 1.5 + rng() * 0.5; // 1.5-2.0
  const boxOffice = Math.round(quality * multiplier * 10) / 10;
  return {
    studioName: 'Titan Pictures',
    studioEmoji: '⚡',
    title,
    genre: (['Action', 'Sci-Fi'] as Genre[])[Math.floor(rng() * 2)],
    boxOffice,
    tier: getTier(boxOffice, target),
    quality,
  };
}

// Generate all rival films for a season
// hotGenres: rivals are more likely to chase trends (50% chance to switch to a hot genre)
export function generateRivalSeason(season: number, target: number, hotGenres?: Genre[], coldGenres?: Genre[]): RivalFilm[] {
  // Season 5: add a mega-blockbuster rival that sets the bar
  const megaFilm = season >= 5 ? [generateMegaBlockbuster(season, target)] : [];
  
  return [...megaFilm, ...RIVAL_STUDIOS.map(studio => {
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
  })];
}

// ─── SEASON NARRATIVE (flavor text for how you did vs rivals) ───

export function getSeasonNarrative(
  playerBoxOffice: number,
  playerTier: RewardTier,
  rivalFilms: RivalFilm[],
): string {
  const allBoxOffice = [playerBoxOffice, ...rivalFilms.map(f => f.boxOffice)].sort((a, b) => b - a);
  const rank = allBoxOffice.indexOf(playerBoxOffice) + 1;
  const total = allBoxOffice.length;
  const topRival = rivalFilms.length > 0 ? rivalFilms.reduce((a, b) => a.boxOffice > b.boxOffice ? a : b) : null;

  if (rank === 1 && playerTier === 'BLOCKBUSTER') {
    return '🎆 Your film dominated the box office! No one came close.';
  }
  if (rank === 1) {
    const margin = topRival ? playerBoxOffice - topRival.boxOffice : 0;
    if (margin < 3) return '😅 A nail-biter finish — you barely edged out the competition!';
    return '💪 Your film topped the charts this season!';
  }
  if (rank === 2 && topRival) {
    return `📈 A strong showing, but ${topRival.studioEmoji} ${topRival.studioName} took the crown.`;
  }
  if (playerTier === 'FLOP' && total >= 4) {
    return '📉 Lost in a crowded field of releases...';
  }
  if (playerTier === 'FLOP') {
    return '💀 A tough season. The audience stayed home.';
  }
  if (rank <= Math.ceil(total / 2)) {
    return '🎬 A respectable mid-pack finish. Room to grow.';
  }
  if (playerTier === 'HIT' && rank > 2 && rivalFilms.some(f => f.tier === 'BLOCKBUSTER')) {
    return '⚡ A surprise upset against the blockbusters!';
  }
  return '📊 The competition was fierce this season.';
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

