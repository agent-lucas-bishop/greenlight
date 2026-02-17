import { rng } from './seededRng';
import { Genre, RewardTier, GameState } from './types';

// ─── RIVAL STUDIOS ───
// Three distinct rivals with personality, strategy, and trash talk

export type RivalPersonality = 'aggressive' | 'steady' | 'scrappy';

export interface RivalStudio {
  name: string;
  emoji: string;
  style: string;
  personality: RivalPersonality;
  qualityRange: [number, number];
  genrePool: Genre[];
  // Personality-driven behavior
  budgetTier: 'high' | 'mid' | 'low';
  breakoutChance: number; // chance of an exceptional film (0-1)
  consistencyBonus: number; // reduces variance
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

// ─── THE THREE RIVALS ───

const RIVAL_STUDIOS: RivalStudio[] = [
  {
    name: 'Titan Pictures',
    emoji: '⚡',
    style: 'Big-budget blockbuster factory. Go big or go bankrupt.',
    personality: 'aggressive',
    qualityRange: [10, 50], // wide range — high risk
    genrePool: ['Action', 'Sci-Fi', 'Thriller', 'Action', 'Sci-Fi', 'Action'],
    budgetTier: 'high',
    breakoutChance: 0.25, // often swings for the fences
    consistencyBonus: 0, // no consistency — boom or bust
  },
  {
    name: 'Lumière Collective',
    emoji: '🕯️',
    style: 'Reliable mid-tier prestige. Never the best, never the worst.',
    personality: 'steady',
    qualityRange: [20, 38], // narrow, consistent range
    genrePool: ['Drama', 'Thriller', 'Romance', 'Drama', 'Drama'],
    budgetTier: 'mid',
    breakoutChance: 0.08, // rarely surprises
    consistencyBonus: 5, // always adds a floor
  },
  {
    name: 'Neon Vagrant',
    emoji: '🎪',
    style: 'Scrappy indie darling. Tiny budgets, big dreams, occasional lightning.',
    personality: 'scrappy',
    qualityRange: [8, 35], // usually low, but...
    genrePool: ['Horror', 'Comedy', 'Drama', 'Romance', 'Horror'],
    budgetTier: 'low',
    breakoutChance: 0.18, // the breakout hit chance
    consistencyBonus: 0,
  },
];

// ─── RIVAL COMMENTARY (procedural trash talk / flavor) ───

interface CommentaryContext {
  playerTotalEarnings: number;
  rivalTotalEarnings: number;
  playerLastTier: RewardTier | null;
  playerRep: number;
  season: number;
  playerRank: number; // 1-4 in cumulative standings
}

const AGGRESSIVE_TAUNTS: Record<string, string[]> = {
  playerFlopped: [
    "Your last film flopped? That's cute — we just greenlit a $50M blockbuster.",
    "We heard about your little... disaster. Don't worry, we'll keep the lights on in Hollywood.",
    "Flopping is a choice. We choose to dominate.",
    "Our marketing budget alone is bigger than your entire film.",
  ],
  playerBehind: [
    "Check the scoreboard. Actually, don't. It'll just make you sad.",
    "We're not even trying and we're ahead of you.",
    "This isn't a competition anymore. It's an exhibition.",
    "You're playing checkers. We're playing 4D chess with a $200M budget.",
  ],
  playerAhead: [
    "Enjoy the lead while it lasts. We've got three tentpoles in the pipeline.",
    "Lucky streak. That's all it is. We'll see who's standing in Season 5.",
    "You're ahead? Good. We perform better as the underdog. Ask anyone.",
    "The bigger they are...",
  ],
  neutral: [
    "Every dollar you earn is a dollar we're coming for.",
    "We don't make films. We make events.",
    "Sleep well. We won't.",
  ],
};

const STEADY_COMMENTS: Record<string, string[]> = {
  playerFlopped: [
    "Tough break. Consistency is what separates the studios that last.",
    "We've all been there. The key is not to panic and overspend.",
    "A flop stings, but it's the rebounds that define a studio.",
  ],
  playerBehind: [
    "Steady wins the race. We're not flashy, but we're profitable.",
    "We don't chase trends. We set the standard.",
    "Our shareholders are happy. Are yours?",
  ],
  playerAhead: [
    "Well played. But there's a lot of season left.",
    "Impressive run. We respect the craft, even from competitors.",
    "You're having a moment. We're building a legacy.",
  ],
  neutral: [
    "Another season, another reliable slate. That's the Lumière way.",
    "We'll be here long after the flash-in-the-pans burn out.",
    "No drama off-screen. All of it on-screen.",
  ],
};

const SCRAPPY_COMMENTS: Record<string, string[]> = {
  playerFlopped: [
    "Hey, at least you can afford to flop! We literally can't.",
    "Join the club. We've flopped on a fraction of your budget.",
    "Flops build character. Or so we keep telling ourselves.",
  ],
  playerBehind: [
    "We're behind too, but we spent 1/10th of what you did. Who's really winning?",
    "Punching above our weight is kind of our thing.",
    "Budget doesn't equal quality. We prove it every season.",
  ],
  playerAhead: [
    "Nice work! Honestly, we're just happy to be here.",
    "You're crushing it. We'll catch up... probably... maybe.",
    "One breakout hit and we're right back in this. Watch.",
  ],
  neutral: [
    "We found $200 in the couch cushions. That's our marketing budget.",
    "Who needs CGI when you have passion and a borrowed camera?",
    "Small budget, big heart. That's the Neon Vagrant promise.",
    "Our entire studio runs on coffee and delusion. It's working.",
  ],
};

function pickComment(pool: string[]): string {
  return pool[Math.floor(rng() * pool.length)];
}

function getCommentaryKey(ctx: CommentaryContext): string {
  if (ctx.playerLastTier === 'FLOP') return 'playerFlopped';
  if (ctx.playerRank > 2) return 'playerBehind';
  if (ctx.playerRank === 1) return 'playerAhead';
  return 'neutral';
}

export interface RivalCommentary {
  studioName: string;
  studioEmoji: string;
  personality: RivalPersonality;
  comment: string;
}

export function generateRivalCommentary(state: GameState): RivalCommentary[] {
  const cumulative = state.cumulativeRivalEarnings;
  
  // Calculate player rank among all studios
  const allEarnings = [
    { name: 'player', total: state.totalEarnings },
    ...RIVAL_STUDIOS.map(r => ({ name: r.name, total: cumulative[r.name] || 0 })),
  ].sort((a, b) => b.total - a.total);
  const playerRank = allEarnings.findIndex(e => e.name === 'player') + 1;

  return RIVAL_STUDIOS.map(rival => {
    const ctx: CommentaryContext = {
      playerTotalEarnings: state.totalEarnings,
      rivalTotalEarnings: cumulative[rival.name] || 0,
      playerLastTier: state.lastTier,
      playerRep: state.reputation,
      season: state.season,
      playerRank,
    };
    const key = getCommentaryKey(ctx);
    let pool: string[];
    switch (rival.personality) {
      case 'aggressive': pool = AGGRESSIVE_TAUNTS[key]; break;
      case 'steady': pool = STEADY_COMMENTS[key]; break;
      case 'scrappy': pool = SCRAPPY_COMMENTS[key]; break;
    }
    return {
      studioName: rival.name,
      studioEmoji: rival.emoji,
      personality: rival.personality,
      comment: pickComment(pool),
    };
  });
}

// ─── FILM GENERATION ───

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

function generateRivalFilm(studio: RivalStudio, season: number, target: number): RivalFilm {
  const genre = studio.genrePool[Math.floor(rng() * studio.genrePool.length)];
  const [minQ, maxQ] = studio.qualityRange;
  const seasonBoost = (season - 1) * 4;
  let quality = Math.round(minQ + seasonBoost + studio.consistencyBonus + rng() * (maxQ - minQ));

  // Breakout hit — scrappy studios occasionally have lightning-in-a-bottle moments
  const isBreakout = rng() < studio.breakoutChance;
  if (isBreakout) {
    quality = Math.round(quality * (studio.personality === 'scrappy' ? 1.8 : 1.4));
  }

  // Aggressive studios have wider multiplier swings
  let baseMultLow: number, baseMultHigh: number;
  switch (studio.personality) {
    case 'aggressive':
      baseMultLow = 0.5 + season * 0.05; // can flop hard
      baseMultHigh = 1.4 + season * 0.15; // or hit huge
      break;
    case 'steady':
      baseMultLow = 0.85 + season * 0.03;
      baseMultHigh = 1.15 + season * 0.08;
      break;
    case 'scrappy':
      baseMultLow = 0.6 + season * 0.04;
      baseMultHigh = 1.1 + season * 0.1;
      if (isBreakout) { baseMultLow = 1.3; baseMultHigh = 2.0; } // breakout goes big
      break;
    default:
      baseMultLow = 0.7 + season * 0.05;
      baseMultHigh = 1.2 + season * 0.1;
  }

  const multiplier = baseMultLow + rng() * (baseMultHigh - baseMultLow);
  const boxOffice = Math.round(quality * multiplier * 10) / 10;
  const tier = getTier(boxOffice, target);
  const title = generateRivalTitle(genre);

  return { studioName: studio.name, studioEmoji: studio.emoji, title, genre, boxOffice, tier, quality };
}

export function generateRivalSeason(season: number, target: number, hotGenres?: Genre[], coldGenres?: Genre[]): RivalFilm[] {
  return RIVAL_STUDIOS.map(studio => {
    const film = generateRivalFilm(studio, season, target);
    // Aggressive rivals always chase hot genres; others 50% chance
    const chaseChance = studio.personality === 'aggressive' ? 0.75 : 0.5;
    if (hotGenres && hotGenres.length > 0 && rng() < chaseChance) {
      film.genre = hotGenres[Math.floor(rng() * hotGenres.length)];
      film.title = generateRivalTitle(film.genre);
      film.boxOffice = Math.round(film.boxOffice * 1.2 * 10) / 10;
    }
    if (coldGenres && coldGenres.includes(film.genre)) {
      film.boxOffice = Math.round(film.boxOffice * 0.8 * 10) / 10;
    }
    film.tier = getTier(film.boxOffice, target);
    return film;
  });
}

// ─── RIVALRY LEADERBOARD ───

export interface LeaderboardEntry {
  name: string;
  emoji: string;
  totalEarnings: number;
  personality?: RivalPersonality;
  isPlayer: boolean;
  filmCount: number;
}

export function getRivalryLeaderboard(state: GameState): LeaderboardEntry[] {
  const seasonCount = state.seasonHistory.length;
  const entries: LeaderboardEntry[] = [
    {
      name: state.studioName || 'Your Studio',
      emoji: '🎬',
      totalEarnings: state.totalEarnings,
      isPlayer: true,
      filmCount: seasonCount,
    },
    ...RIVAL_STUDIOS.map(r => ({
      name: r.name,
      emoji: r.emoji,
      totalEarnings: state.cumulativeRivalEarnings[r.name] || 0,
      personality: r.personality,
      isPlayer: false,
      filmCount: seasonCount, // rivals release one film per season too
    })),
  ];
  return entries.sort((a, b) => b.totalEarnings - a.totalEarnings);
}

// ─── RIVAL EVENTS (for the season event pool) ───

export interface RivalEvent {
  id: string;
  name: string;
  emoji: string;
  description: string;
  flavorText: string;
  effect: string;
}

export const RIVAL_EVENTS: RivalEvent[] = [
  {
    id: 'bidding_war',
    name: 'Bidding War',
    emoji: '💸',
    description: 'A rival wants the same talent! All talent costs +$3 next season, but talent quality is higher (+1 skill).',
    flavorText: `"${RIVAL_STUDIOS[0].emoji} ${RIVAL_STUDIOS[0].name} is throwing money around. Match their offer or lose out."`,
    effect: 'biddingWar',
  },
  {
    id: 'poached',
    name: 'Poached!',
    emoji: '🦅',
    description: 'A rival steals your lowest-reputation talent from your roster.',
    flavorText: `"${RIVAL_STUDIOS[2].emoji} ${RIVAL_STUDIOS[2].name} made them an offer they couldn't refuse. Your loss."`,
    effect: 'talentPoached',
  },
  {
    id: 'award_snub',
    name: 'Award Snub',
    emoji: '😤',
    description: 'A rival\'s film wins the big award over yours. Lose 1 reputation, but gain +$3M sympathy press.',
    flavorText: `"The envelope, please... ${RIVAL_STUDIOS[1].emoji} ${RIVAL_STUDIOS[1].name}! The crowd gasps. You were robbed."`,
    effect: 'awardSnub',
  },
];

// ─── SEASON NARRATIVE ───

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
  return '📊 The competition was fierce this season.';
}

// ─── SEASON IDENTITY ───

export interface SeasonIdentity {
  season: number;
  name: string;
  subtitle: string;
  description: string;
  talentPoolSize: number;
  budgetBonus: number;
  targetMultiplier: number;
}

export const SEASON_IDENTITIES: SeasonIdentity[] = [
  {
    season: 1, name: 'THE DEBUT', subtitle: 'Prove You Belong',
    description: 'Limited budget, unknown talent. The industry doesn\'t know your name yet.',
    talentPoolSize: 3, budgetBonus: 0, targetMultiplier: 1.0,
  },
  {
    season: 2, name: 'THE SOPHOMORE', subtitle: 'Avoid the Slump',
    description: 'Your first film set expectations. Now deliver again — or be a one-hit wonder.',
    talentPoolSize: 4, budgetBonus: 0, targetMultiplier: 1.0,
  },
  {
    season: 3, name: 'THE PRIME', subtitle: 'Peak of Your Powers',
    description: 'More talent, bigger budgets, higher stakes. This is your moment.',
    talentPoolSize: 5, budgetBonus: 2, targetMultiplier: 1.0,
  },
  {
    season: 4, name: 'THE RECKONING', subtitle: 'The Industry Pushes Back',
    description: 'Rivals are catching up. The market is ruthless. Only the best survive.',
    talentPoolSize: 5, budgetBonus: 3, targetMultiplier: 1.0,
  },
  {
    season: 5, name: 'THE LEGACY', subtitle: 'Define Your Studio Forever',
    description: 'This is how you\'ll be remembered. Make it count.',
    talentPoolSize: 6, budgetBonus: 5, targetMultiplier: 1.0,
  },
];

export function getSeasonIdentity(season: number): SeasonIdentity {
  return SEASON_IDENTITIES[Math.min(season - 1, SEASON_IDENTITIES.length - 1)];
}

export { RIVAL_STUDIOS };
