import { rng } from './seededRng';
import { Genre, RewardTier, GameState, RivalAction, RivalActionType, RivalPersonalityId, RivalStats, Difficulty } from './types';

// ─── R180: ADVANCED AI RIVAL PERSONALITIES ───

export type RivalPersonality = 'aggressive' | 'steady' | 'scrappy';

export interface RivalStudio {
  id: RivalPersonalityId;
  name: string;
  emoji: string;
  style: string;
  personality: RivalPersonality;
  qualityRange: [number, number];
  genrePool: Genre[];
  budgetTier: 'high' | 'mid' | 'low';
  breakoutChance: number;
  consistencyBonus: number;
  // R180: action weights [stealTalent, competingFilm, prCampaign/stealScript]
  actionWeights: [number, number, number];
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

// ─── THE SIX RIVAL PERSONALITIES ───

const RIVAL_STUDIOS: RivalStudio[] = [
  {
    id: 'pinnacle',
    name: 'Titan Pictures',
    emoji: '🏔️',
    style: 'Blockbuster focused, huge budgets. Go big or go home.',
    personality: 'aggressive',
    qualityRange: [15, 50],
    genrePool: ['Action', 'Sci-Fi', 'Thriller', 'Action', 'Sci-Fi', 'Action'],
    budgetTier: 'high',
    breakoutChance: 0.25,
    consistencyBonus: 0,
    actionWeights: [0.15, 0.65, 0.20], // loves competing films
  },
  {
    id: 'arthouse',
    name: 'Lumière Films',
    emoji: '🎭',
    style: 'Art house, festival darlings. Quality over quantity.',
    personality: 'steady',
    qualityRange: [25, 42],
    genrePool: ['Drama', 'Romance', 'Thriller', 'Drama', 'Drama'],
    budgetTier: 'mid',
    breakoutChance: 0.10,
    consistencyBonus: 6,
    actionWeights: [0.50, 0.20, 0.30], // steals talent (quality matters)
  },
  {
    id: 'sequel_machine',
    name: 'Apex Entertainment',
    emoji: '🦈',
    style: 'Aggressive and cutthroat. Steals talent, counter-programs.',
    personality: 'aggressive',
    qualityRange: [12, 45],
    genrePool: ['Action', 'Sci-Fi', 'Thriller', 'Action', 'Action', 'Drama'],
    budgetTier: 'high',
    breakoutChance: 0.18,
    consistencyBonus: 3,
    actionWeights: [0.45, 0.30, 0.25], // heavy talent poaching
  },
  {
    id: 'flash',
    name: 'Neon Pulse',
    emoji: '👾',
    style: 'Genre specialists. Horror and sci-fi masters.',
    personality: 'scrappy',
    qualityRange: [8, 35],
    genrePool: ['Horror', 'Sci-Fi', 'Thriller', 'Horror', 'Horror', 'Sci-Fi'],
    budgetTier: 'low',
    breakoutChance: 0.20,
    consistencyBonus: 0,
    actionWeights: [0.35, 0.35, 0.30], // balanced
  },
  {
    id: 'golden_age',
    name: 'Heartland Studios',
    emoji: '🌾',
    style: 'Family and comedy. Consistent, reliable, crowd-pleasing.',
    personality: 'steady',
    qualityRange: [20, 40],
    genrePool: ['Comedy', 'Romance', 'Drama', 'Comedy', 'Comedy'],
    budgetTier: 'mid',
    breakoutChance: 0.08,
    consistencyBonus: 5,
    actionWeights: [0.15, 0.40, 0.45], // protects turf, less aggressive
  },
  {
    id: 'chaos',
    name: 'Phoenix Rising',
    emoji: '🔥',
    style: 'Comeback kings. Volatile swings between genius and disaster.',
    personality: 'scrappy',
    qualityRange: [3, 55],
    genrePool: ['Drama', 'Action', 'Thriller', 'Sci-Fi', 'Comedy', 'Horror', 'Romance'],
    budgetTier: 'low',
    breakoutChance: 0.30,
    consistencyBonus: 0,
    actionWeights: [0.33, 0.34, 0.33], // truly unpredictable
  },
];

// ─── RIVAL SELECTION ───

export function selectActiveRivals(difficulty: Difficulty): RivalPersonalityId[] {
  const count = difficulty === 'mogul' ? 3 : difficulty === 'studio' ? 3 : 2;
  const shuffled = [...RIVAL_STUDIOS].sort(() => rng() - 0.5);
  return shuffled.slice(0, count).map(r => r.id);
}

export function getActiveRivalStudios(activeIds: RivalPersonalityId[]): RivalStudio[] {
  return RIVAL_STUDIOS.filter(r => activeIds.includes(r.id));
}

export function getRivalById(id: RivalPersonalityId): RivalStudio | undefined {
  return RIVAL_STUDIOS.find(r => r.id === id);
}

export function initRivalStats(activeIds: RivalPersonalityId[]): Record<string, RivalStats> {
  const stats: Record<string, RivalStats> = {};
  for (const id of activeIds) {
    const rival = getRivalById(id);
    if (rival) {
      stats[rival.name] = { filmsMade: 0, totalBoxOffice: 0, reputation: 3, seasonEarnings: [], timesBeatenPlayer: 0 };
    }
  }
  return stats;
}

// ─── NEMESIS SYSTEM ───

export function checkNemesis(rivalStats: Record<string, RivalStats>): string | null {
  for (const [name, stats] of Object.entries(rivalStats)) {
    if (stats.timesBeatenPlayer >= 3) return name;
  }
  return null;
}

export function getNemesisBoost(studioName: string, nemesisStudio: string | null): number {
  return studioName === nemesisStudio ? 1.15 : 1.0; // +15% aggression
}

// ─── RIVAL COMMENTARY ───

interface CommentaryContext {
  playerTotalEarnings: number;
  rivalTotalEarnings: number;
  playerLastTier: RewardTier | null;
  playerRep: number;
  season: number;
  playerRank: number;
  isNemesis: boolean;
}

const AGGRESSIVE_TAUNTS: Record<string, string[]> = {
  playerFlopped: [
    "Your last film flopped? That's cute — we just greenlit a $50M blockbuster.",
    "We heard about your little... disaster. Don't worry, we'll keep the lights on in Hollywood.",
    "Flopping is a choice. We choose to dominate.",
    "Our marketing budget alone is bigger than your entire film.",
    "Our intern's short film outgrossed your feature. Awkward.",
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
    "You're ahead? Good. We perform better as the underdog.",
  ],
  neutral: [
    "Every dollar you earn is a dollar we're coming for.",
    "We don't make films. We make events.",
    "Sleep well. We won't.",
  ],
  nemesis: [
    "We OWN you. Three times beaten — accept it.",
    "Your nemesis is here. And we're not done yet.",
    "Every time you think you've caught up, we'll remind you who's boss.",
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
    "Another season, another reliable slate. That's our way.",
    "We'll be here long after the flash-in-the-pans burn out.",
    "No drama off-screen. All of it on-screen.",
  ],
  nemesis: [
    "We've quietly surpassed you three times now. The pattern is clear.",
    "Consistency beats flash. We've proven it again and again.",
  ],
};

const SCRAPPY_COMMENTS: Record<string, string[]> = {
  playerFlopped: [
    "Hey, at least you can afford to flop! We literally can't.",
    "Join the club. We've flopped on a fraction of your budget.",
    "Your flop cost more than our entire annual output. Wild.",
  ],
  playerBehind: [
    "We're behind too, but we spent 1/10th of what you did. Who's really winning?",
    "Punching above our weight is kind of our thing.",
    "We're technically last place but we're vibing.",
  ],
  playerAhead: [
    "Nice work! Honestly, we're just happy to be here.",
    "You're crushing it. We'll catch up... probably... maybe.",
    "One breakout hit and we're right back in this. Watch.",
  ],
  neutral: [
    "We found $200 in the couch cushions. That's our marketing budget.",
    "Who needs CGI when you have passion and a borrowed camera?",
    "Small budget, big heart. That's our promise.",
  ],
  nemesis: [
    "We beat you THREE TIMES on a shoestring budget. Legend status.",
    "David vs Goliath, baby. And David keeps winning.",
  ],
};

function pickComment(pool: string[]): string {
  return pool[Math.floor(rng() * pool.length)];
}

function getCommentaryKey(ctx: CommentaryContext): string {
  if (ctx.isNemesis && rng() < 0.4) return 'nemesis';
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
  isNemesis: boolean;
}

export function generateRivalCommentary(state: GameState): RivalCommentary[] {
  const activeStudios = getActiveRivalStudios(state.activeRivalIds || []);
  if (activeStudios.length === 0) return generateLegacyRivalCommentary(state);
  
  const cumulative = state.cumulativeRivalEarnings;
  const allEarnings = [
    { name: 'player', total: state.totalEarnings },
    ...activeStudios.map(r => ({ name: r.name, total: cumulative[r.name] || 0 })),
  ].sort((a, b) => b.total - a.total);
  const playerRank = allEarnings.findIndex(e => e.name === 'player') + 1;

  return activeStudios.map(rival => {
    const ctx: CommentaryContext = {
      playerTotalEarnings: state.totalEarnings,
      rivalTotalEarnings: cumulative[rival.name] || 0,
      playerLastTier: state.lastTier,
      playerRep: state.reputation,
      season: state.season,
      playerRank,
      isNemesis: state.nemesisStudio === rival.name,
    };
    const key = getCommentaryKey(ctx);
    let pool: string[];
    switch (rival.personality) {
      case 'aggressive': pool = AGGRESSIVE_TAUNTS[key] || AGGRESSIVE_TAUNTS['neutral']; break;
      case 'steady': pool = STEADY_COMMENTS[key] || STEADY_COMMENTS['neutral']; break;
      case 'scrappy': pool = SCRAPPY_COMMENTS[key] || SCRAPPY_COMMENTS['neutral']; break;
    }
    return {
      studioName: rival.name,
      studioEmoji: rival.emoji,
      personality: rival.personality,
      comment: pickComment(pool),
      isNemesis: state.nemesisStudio === rival.name,
    };
  });
}

// Legacy fallback for old saves without activeRivalIds
function generateLegacyRivalCommentary(state: GameState): RivalCommentary[] {
  return RIVAL_STUDIOS.slice(0, 3).map(rival => ({
    studioName: rival.name,
    studioEmoji: rival.emoji,
    personality: rival.personality,
    comment: 'The competition heats up...',
    isNemesis: false,
  }));
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

function generateRivalFilm(studio: RivalStudio, season: number, target: number, nemesisBoost: number): RivalFilm {
  const genre = studio.genrePool[Math.floor(rng() * studio.genrePool.length)];
  const [minQ, maxQ] = studio.qualityRange;
  const seasonBoost = (season - 1) * 4;
  let quality = Math.round(minQ + seasonBoost + studio.consistencyBonus + rng() * (maxQ - minQ));

  const isBreakout = rng() < studio.breakoutChance;
  if (isBreakout) {
    quality = Math.round(quality * (studio.personality === 'scrappy' ? 1.8 : 1.4));
  }

  let baseMultLow: number, baseMultHigh: number;
  switch (studio.personality) {
    case 'aggressive':
      baseMultLow = 0.5 + season * 0.05;
      baseMultHigh = 1.4 + season * 0.15;
      break;
    case 'steady':
      baseMultLow = 0.85 + season * 0.03;
      baseMultHigh = 1.15 + season * 0.08;
      break;
    case 'scrappy':
      baseMultLow = 0.6 + season * 0.04;
      baseMultHigh = 1.1 + season * 0.1;
      if (isBreakout) { baseMultLow = 1.3; baseMultHigh = 2.0; }
      break;
    default:
      baseMultLow = 0.7 + season * 0.05;
      baseMultHigh = 1.2 + season * 0.1;
  }

  const multiplier = baseMultLow + rng() * (baseMultHigh - baseMultLow);
  let boxOffice = Math.round(quality * multiplier * nemesisBoost * 10) / 10;
  const tier = getTier(boxOffice, target);
  const title = generateRivalTitle(genre);

  return { studioName: studio.name, studioEmoji: studio.emoji, title, genre, boxOffice, tier, quality };
}

export function generateRivalSeason(
  season: number, target: number,
  hotGenres?: Genre[], coldGenres?: Genre[],
  playerTotal?: number, rivalCumulativeEarnings?: Record<string, number>,
  activeRivalIds?: RivalPersonalityId[], nemesisStudio?: string | null,
): RivalFilm[] {
  const studios = activeRivalIds && activeRivalIds.length > 0
    ? getActiveRivalStudios(activeRivalIds)
    : RIVAL_STUDIOS.slice(0, 3); // fallback for old saves

  let rubberBandMult = 1.0;
  if (playerTotal !== undefined && rivalCumulativeEarnings) {
    const rivalTotals = Object.values(rivalCumulativeEarnings);
    const rivalAvg = rivalTotals.length > 0 ? rivalTotals.reduce((a, b) => a + b, 0) / rivalTotals.length : 0;
    rubberBandMult = calculateRubberBand(playerTotal, rivalAvg).multiplier;
  }

  return studios.map(studio => {
    const nemesisBoost = getNemesisBoost(studio.name, nemesisStudio || null);
    const film = generateRivalFilm(studio, season, target, nemesisBoost);

    const chaseChance = studio.personality === 'aggressive' ? 0.75 : 0.5;
    if (hotGenres && hotGenres.length > 0 && rng() < chaseChance) {
      film.genre = hotGenres[Math.floor(rng() * hotGenres.length)];
      film.title = generateRivalTitle(film.genre);
      film.boxOffice = Math.round(film.boxOffice * 1.2 * 10) / 10;
    }
    if (coldGenres && coldGenres.includes(film.genre)) {
      film.boxOffice = Math.round(film.boxOffice * 0.8 * 10) / 10;
    }
    film.boxOffice = Math.round(film.boxOffice * rubberBandMult * 10) / 10;
    film.tier = getTier(film.boxOffice, target);
    return film;
  });
}

// ─── R180: UPDATE RIVAL STATS AFTER SEASON ───

export function updateRivalStats(
  currentStats: Record<string, RivalStats>,
  rivalFilms: RivalFilm[],
  playerSeasonBO: number,
): { stats: Record<string, RivalStats>; newNemesis: string | null } {
  const updated = { ...currentStats };
  let newNemesis: string | null = null;

  for (const film of rivalFilms) {
    if (!updated[film.studioName]) {
      updated[film.studioName] = { filmsMade: 0, totalBoxOffice: 0, reputation: 3, seasonEarnings: [], timesBeatenPlayer: 0 };
    }
    const s = { ...updated[film.studioName] };
    s.filmsMade += 1;
    s.totalBoxOffice = Math.round((s.totalBoxOffice + film.boxOffice) * 10) / 10;
    s.seasonEarnings = [...s.seasonEarnings, film.boxOffice];

    // Reputation evolution based on tier
    if (film.tier === 'BLOCKBUSTER') s.reputation = Math.min(5, s.reputation + 1);
    else if (film.tier === 'FLOP') s.reputation = Math.max(1, s.reputation - 1);

    // Track if rival beat player this season
    if (film.boxOffice > playerSeasonBO) {
      s.timesBeatenPlayer += 1;
      if (s.timesBeatenPlayer >= 3) newNemesis = film.studioName;
    }

    updated[film.studioName] = s;
  }

  return { stats: updated, newNemesis: newNemesis || checkNemesis(updated) };
}

// ─── RIVALRY LEADERBOARD ───

export interface RivalryLeaderboardEntry {
  name: string;
  emoji: string;
  totalEarnings: number;
  personality?: RivalPersonality;
  isPlayer: boolean;
  filmCount: number;
  strategyLabel?: string;
  latestFilm?: { title: string; boxOffice: number; tier: RewardTier; genre: Genre };
  reputation?: number;
  isNemesis?: boolean;
  seasonEarnings?: number[];
}

const STRATEGY_LABELS: Record<RivalPersonalityId, string> = {
  pinnacle: 'Blockbuster · Huge Budgets',
  arthouse: 'Art House · Festival Darlings',
  sequel_machine: 'Aggressive · Steals Talent',
  flash: 'Genre Specialist · Horror/Sci-Fi',
  golden_age: 'Family/Comedy · Consistent',
  chaos: 'Comeback Kings · Volatile',
};

export function getRivalryLeaderboard(state: GameState): RivalryLeaderboardEntry[] {
  const activeStudios = getActiveRivalStudios(state.activeRivalIds || []);
  const seasonCount = state.seasonHistory.length;
  
  const latestFilms: Record<string, RivalFilm> = {};
  if (state.rivalHistory.length > 0) {
    const lastSeason = state.rivalHistory[state.rivalHistory.length - 1];
    for (const f of lastSeason.films) {
      latestFilms[f.studioName] = f;
    }
  }

  const entries: RivalryLeaderboardEntry[] = [
    {
      name: state.studioName || 'Your Studio',
      emoji: '🎬',
      totalEarnings: state.totalEarnings,
      isPlayer: true,
      filmCount: seasonCount,
      seasonEarnings: state.seasonHistory.map(h => h.boxOffice),
      latestFilm: state.seasonHistory.length > 0 ? {
        title: state.lastFilmTitle || state.seasonHistory[state.seasonHistory.length - 1].title,
        boxOffice: state.seasonHistory[state.seasonHistory.length - 1].boxOffice,
        tier: state.seasonHistory[state.seasonHistory.length - 1].tier,
        genre: state.seasonHistory[state.seasonHistory.length - 1].genre,
      } : undefined,
    },
    ...activeStudios.map(r => {
      const latest = latestFilms[r.name];
      const stats = state.rivalStats?.[r.name];
      return {
        name: r.name,
        emoji: r.emoji,
        totalEarnings: state.cumulativeRivalEarnings[r.name] || 0,
        personality: r.personality,
        isPlayer: false,
        filmCount: stats?.filmsMade || seasonCount,
        strategyLabel: STRATEGY_LABELS[r.id],
        reputation: stats?.reputation,
        isNemesis: state.nemesisStudio === r.name,
        seasonEarnings: stats?.seasonEarnings || [],
        latestFilm: latest ? { title: latest.title, boxOffice: latest.boxOffice, tier: latest.tier, genre: latest.genre } : undefined,
      };
    }),
  ];
  return entries.sort((a, b) => b.totalEarnings - a.totalEarnings);
}

// ─── RUBBER-BAND DIFFICULTY ───

export type MarketPressure = 'competitive' | 'yourLead' | 'underdog' | 'neutral';

export interface RubberBandResult {
  multiplier: number;
  label: MarketPressure;
  flavorText: string;
}

export function calculateRubberBand(playerTotal: number, rivalAvgTotal: number): RubberBandResult {
  if (rivalAvgTotal === 0 && playerTotal === 0) {
    return { multiplier: 1.0, label: 'neutral', flavorText: 'Market Conditions: Opening Day' };
  }
  const ratio = playerTotal / Math.max(rivalAvgTotal, 1);
  if (ratio > 1.35) {
    const boost = Math.min(0.10, (ratio - 1.35) * 0.15);
    return { multiplier: 1 + boost, label: 'competitive', flavorText: 'Market Conditions: Competitive — rivals are hungry 🔥' };
  }
  if (ratio > 1.15) {
    return { multiplier: 1.05, label: 'yourLead', flavorText: 'Market Conditions: Your Lead — stay sharp' };
  }
  if (ratio < 0.75) {
    const penalty = Math.min(0.10, (0.75 - ratio) * 0.15);
    return { multiplier: 1 - penalty, label: 'underdog', flavorText: 'Market Conditions: Underdog — the industry is rooting for you' };
  }
  return { multiplier: 1.0, label: 'neutral', flavorText: 'Market Conditions: Wide Open' };
}

// ─── RIVAL EVENTS ───

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
    flavorText: '"🏔️ Titan Pictures is throwing money around. Match their offer or lose out."',
    effect: 'biddingWar',
  },
  {
    id: 'poached',
    name: 'Poached!',
    emoji: '🦅',
    description: 'A rival steals your lowest-skill talent from your roster.',
    flavorText: '"🦈 Apex Entertainment made them an offer they couldn\'t refuse. Your loss."',
    effect: 'talentPoached',
  },
  {
    id: 'award_snub',
    name: 'Award Snub',
    emoji: '😤',
    description: 'A rival\'s film wins the big award over yours. Lose 1 reputation, but gain +$3M sympathy press.',
    flavorText: '"The envelope, please... 🎭 Lumière Films! The crowd gasps. You were robbed."',
    effect: 'awardSnub',
  },
  {
    id: 'award_season_rivalry',
    name: 'Award Season Rivalry',
    emoji: '🏆',
    description: 'Head-to-head with your top rival for nominations. Quality > 30 = +2 rep and +$8M. Quality ≤ 30 = rival wins, -1 rep.',
    flavorText: '"The critics are split. Two studios, one golden statue. Who takes it home?"',
    effect: 'awardSeasonRivalry',
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

// ─── R180: ENHANCED RIVAL ACTIONS ───

export function generateRivalActions(
  season: number, prCampaignActive: boolean, playerGenre?: string,
  activeRivalIds?: RivalPersonalityId[], nemesisStudio?: string | null,
): RivalAction[] {
  const studios = activeRivalIds && activeRivalIds.length > 0
    ? getActiveRivalStudios(activeRivalIds)
    : RIVAL_STUDIOS.slice(0, 3);

  const actions: RivalAction[] = [];
  const maxActions = prCampaignActive ? 1 : (season <= 1 ? 1 : (rng() < 0.4 ? 3 : 2));
  const shuffled = [...studios].sort(() => rng() - 0.5);
  const actingRivals = shuffled.slice(0, Math.min(maxActions, shuffled.length));

  for (const rival of actingRivals) {
    // Use personality-driven action weights
    const [wTalent, wFilm, wScript] = rival.actionWeights;
    const roll = rng();
    let actionType: RivalActionType;
    if (roll < wTalent) actionType = 'snipeTalent';
    else if (roll < wTalent + wFilm) actionType = 'competingFilm';
    else actionType = 'stealScript';

    // Nemesis rivals get extra actions
    const isNemesis = rival.name === nemesisStudio;
    const dampening = prCampaignActive ? 0.5 : 1.0;

    if (actionType === 'snipeTalent') {
      actions.push({
        studioName: rival.name,
        studioEmoji: rival.emoji,
        actionType: 'snipeTalent',
        description: `${rival.emoji} ${rival.name} poached a talent from the market!${isNemesis ? ' (Nemesis!)' : ''}`,
        removedTalentIndex: Math.floor(rng() * 6),
      });
    } else if (actionType === 'stealScript') {
      actions.push({
        studioName: rival.name,
        studioEmoji: rival.emoji,
        actionType: 'stealScript',
        description: `${rival.emoji} ${rival.name} snatched a script before you could greenlight it!${isNemesis ? ' (Nemesis!)' : ''}`,
        blockedScriptIndex: Math.floor(rng() * 3),
      });
    } else {
      const basePenalty = (0.1 + rng() * 0.2) * dampening;
      const penalty = isNemesis ? basePenalty * 1.3 : basePenalty; // Nemesis hits harder
      const genre = playerGenre || rival.genrePool[Math.floor(rng() * rival.genrePool.length)];
      actions.push({
        studioName: rival.name,
        studioEmoji: rival.emoji,
        actionType: 'competingFilm',
        description: `${rival.emoji} ${rival.name} released a competing ${genre} film! (−${penalty.toFixed(1)}× multiplier)${isNemesis ? ' (Nemesis!)' : ''}`,
        multiplierPenalty: Math.round(penalty * 100) / 100,
        competingGenre: genre as Genre,
      });
    }

    // Nemesis gets a bonus action 40% of the time
    if (isNemesis && !prCampaignActive && rng() < 0.4) {
      const bonusType: RivalActionType = rng() < 0.5 ? 'snipeTalent' : 'competingFilm';
      if (bonusType === 'snipeTalent') {
        actions.push({
          studioName: rival.name,
          studioEmoji: rival.emoji,
          actionType: 'snipeTalent',
          description: `${rival.emoji} ${rival.name} strikes again! Another talent poached! (Nemesis!)`,
          removedTalentIndex: Math.floor(rng() * 6),
        });
      } else {
        const penalty = (0.1 + rng() * 0.15);
        const genre = rival.genrePool[Math.floor(rng() * rival.genrePool.length)];
        actions.push({
          studioName: rival.name,
          studioEmoji: rival.emoji,
          actionType: 'competingFilm',
          description: `${rival.emoji} ${rival.name} doubles down with another ${genre} release! (Nemesis!)`,
          multiplierPenalty: Math.round(penalty * 100) / 100,
          competingGenre: genre as Genre,
        });
      }
    }
  }

  return actions;
}

// ─── R180: END-OF-RUN LEADERBOARD ───

export interface EndRunLeaderboardEntry {
  name: string;
  emoji: string;
  totalEarnings: number;
  seasonEarnings: number[];
  filmCount: number;
  reputation: number;
  isPlayer: boolean;
  isNemesis: boolean;
  strategyLabel?: string;
}

export function getEndRunLeaderboard(state: GameState): EndRunLeaderboardEntry[] {
  const activeStudios = getActiveRivalStudios(state.activeRivalIds || []);
  const playerSeasonEarnings = state.seasonHistory.map(h => h.boxOffice);

  const entries: EndRunLeaderboardEntry[] = [
    {
      name: state.studioName || 'Your Studio',
      emoji: '🎬',
      totalEarnings: state.totalEarnings,
      seasonEarnings: playerSeasonEarnings,
      filmCount: state.seasonHistory.length,
      reputation: state.reputation,
      isPlayer: true,
      isNemesis: false,
    },
    ...activeStudios.map(r => {
      const stats = state.rivalStats?.[r.name];
      return {
        name: r.name,
        emoji: r.emoji,
        totalEarnings: state.cumulativeRivalEarnings[r.name] || 0,
        seasonEarnings: stats?.seasonEarnings || [],
        filmCount: stats?.filmsMade || 0,
        reputation: stats?.reputation || 3,
        isPlayer: false,
        isNemesis: state.nemesisStudio === r.name,
        strategyLabel: STRATEGY_LABELS[r.id],
      };
    }),
  ];

  return entries.sort((a, b) => b.totalEarnings - a.totalEarnings);
}

export { RIVAL_STUDIOS };
