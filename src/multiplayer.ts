/**
 * ══════════════════════════════════════════════════════════════════════
 * R276 — Local Hot-Seat Multiplayer Engine
 * ══════════════════════════════════════════════════════════════════════
 *
 * Manages 2-4 players taking turns through seasons. Each player has
 * their own studio state. Shared market saturation and competitive
 * award seasons add interaction between players.
 */

import type { Genre, StudioArchetypeId, RewardTier, SeasonResult } from './types';

// ─── Types ───

export type VictoryCondition = 'most_earnings' | 'score_threshold' | 'highest_reputation';

export interface MultiplayerFilmResult {
  title: string;
  genre: Genre;
  quality: number;
  boxOffice: number;
  tier: RewardTier;
  season: number;
}

export interface PlayerState {
  id: number; // 0-based index
  name: string;
  studioName: string;
  archetype: StudioArchetypeId;
  budget: number;
  reputation: number;
  totalEarnings: number;
  score: number;
  films: MultiplayerFilmResult[];
  /** Best single-film box office */
  bestFilmBO: number;
  bestFilmTitle: string;
  /** Has this player been eliminated (reputation 0 or 3 strikes)? */
  eliminated: boolean;
  strikes: number;
}

export interface MarketSaturation {
  /** genre -> number of films released in that genre this season */
  [genre: string]: number;
}

export interface AwardCompetitor {
  playerId: number;
  filmTitle: string;
  quality: number;
  boxOffice: number;
  genre: Genre;
}

export interface AwardResult {
  winnerId: number;
  winnerName: string;
  filmTitle: string;
  nominees: AwardCompetitor[];
}

export interface MultiplayerSettings {
  playerCount: number; // 2-4
  seasonCount: 5 | 8 | 12;
  victoryCondition: VictoryCondition;
  scoreThreshold: number; // only used if victoryCondition === 'score_threshold'
}

export interface TurnSummary {
  playerName: string;
  studioName: string;
  filmTitle: string;
  genre: Genre;
  boxOffice: number;
  tier: RewardTier;
  marketNews: string[];
}

export interface MultiplayerSession {
  id: string;
  settings: MultiplayerSettings;
  players: PlayerState[];
  currentSeason: number;
  /** Index of current player within the season (0 to playerCount-1) */
  currentPlayerIndex: number;
  /** Market saturation per season — genre -> count of films this season */
  seasonSaturation: MarketSaturation;
  /** Turn summaries from completed turns this season */
  turnSummaries: TurnSummary[];
  /** Award results per season (index = season - 1) */
  awardHistory: (AwardResult | null)[];
  /** Is the game finished? */
  finished: boolean;
  /** Winner player id (set when finished) */
  winnerId: number | null;
  /** Timestamp for save ordering */
  createdAt: number;
  updatedAt: number;
}

// ─── Session Creation ───

let _sessionCounter = 0;

export function createMultiplayerSession(
  settings: MultiplayerSettings,
  playerConfigs: { name: string; studioName: string; archetype: StudioArchetypeId }[],
): MultiplayerSession {
  if (playerConfigs.length < 2 || playerConfigs.length > 4) {
    throw new Error('Multiplayer requires 2-4 players');
  }
  if (playerConfigs.length !== settings.playerCount) {
    throw new Error('Player config count must match settings.playerCount');
  }

  const players: PlayerState[] = playerConfigs.map((cfg, i) => ({
    id: i,
    name: cfg.name,
    studioName: cfg.studioName,
    archetype: cfg.archetype,
    budget: 15,
    reputation: 3,
    totalEarnings: 0,
    score: 0,
    films: [],
    bestFilmBO: 0,
    bestFilmTitle: '',
    eliminated: false,
    strikes: 0,
  }));

  return {
    id: `mp_${Date.now()}_${++_sessionCounter}`,
    settings,
    players,
    currentSeason: 1,
    currentPlayerIndex: 0,
    seasonSaturation: {},
    turnSummaries: [],
    awardHistory: [],
    finished: false,
    winnerId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ─── Turn Management ───

export function getCurrentPlayer(session: MultiplayerSession): PlayerState {
  return session.players[session.currentPlayerIndex];
}

export function isSeasonComplete(session: MultiplayerSession): boolean {
  return session.currentPlayerIndex >= session.settings.playerCount;
}

/**
 * Get the market saturation penalty for a genre this season.
 * Each prior film in the same genre this season reduces box office by 15%.
 */
export function getMarketSaturationMultiplier(session: MultiplayerSession, genre: Genre): number {
  const count = session.seasonSaturation[genre] || 0;
  // Each prior film in same genre = -15% (stacking)
  return Math.max(0.4, 1 - count * 0.15);
}

/**
 * Record a player's completed film result and advance to next player.
 */
export function recordFilmAndAdvance(
  session: MultiplayerSession,
  result: {
    title: string;
    genre: Genre;
    quality: number;
    boxOffice: number;
    tier: RewardTier;
    budgetAfter: number;
    reputationAfter: number;
    strikesAfter: number;
  },
): void {
  const player = session.players[session.currentPlayerIndex];

  // Apply saturation to the reported box office
  const satMult = getMarketSaturationMultiplier(session, result.genre);
  const adjustedBO = Math.round(result.boxOffice * satMult * 10) / 10;

  const film: MultiplayerFilmResult = {
    title: result.title,
    genre: result.genre,
    quality: result.quality,
    boxOffice: adjustedBO,
    tier: result.tier,
    season: session.currentSeason,
  };

  player.films.push(film);
  player.totalEarnings += adjustedBO;
  player.budget = result.budgetAfter;
  player.reputation = result.reputationAfter;
  player.strikes = result.strikesAfter;
  player.score += calculateFilmScore(result.tier, adjustedBO, result.quality);

  if (adjustedBO > player.bestFilmBO) {
    player.bestFilmBO = adjustedBO;
    player.bestFilmTitle = result.title;
  }

  if (player.reputation <= 0 || player.strikes >= 3) {
    player.eliminated = true;
  }

  // Update saturation
  session.seasonSaturation[result.genre] = (session.seasonSaturation[result.genre] || 0) + 1;

  // Build market news
  const news: string[] = [];
  if (satMult < 1) {
    news.push(`📉 Market saturation in ${result.genre} — box office reduced to ${Math.round(satMult * 100)}%`);
  }
  if (result.tier === 'BLOCKBUSTER') {
    news.push(`💥 "${result.title}" is a BLOCKBUSTER! ${result.genre} genre is now saturated.`);
  }
  if (player.eliminated) {
    news.push(`💀 ${player.studioName} has been eliminated!`);
  }

  session.turnSummaries.push({
    playerName: player.name,
    studioName: player.studioName,
    filmTitle: result.title,
    genre: result.genre,
    boxOffice: adjustedBO,
    tier: result.tier,
    marketNews: news,
  });

  // Advance to next player
  session.currentPlayerIndex++;
  session.updatedAt = Date.now();

  // Skip eliminated players
  while (
    session.currentPlayerIndex < session.settings.playerCount &&
    session.players[session.currentPlayerIndex].eliminated
  ) {
    session.currentPlayerIndex++;
  }
}

function calculateFilmScore(tier: RewardTier, boxOffice: number, quality: number): number {
  const tierBonus: Record<RewardTier, number> = {
    BLOCKBUSTER: 30,
    SMASH: 20,
    HIT: 10,
    FLOP: 0,
  };
  return Math.round(tierBonus[tier] + boxOffice * 0.5 + quality * 0.3);
}

// ─── Season Transition ───

/**
 * Call when all players have completed their turn for the season.
 * Resolves awards and advances to next season (or ends game).
 */
export function endSeason(session: MultiplayerSession): {
  awardResult: AwardResult | null;
  gameOver: boolean;
} {
  // Award competition — compare all films made this season
  const seasonFilms: AwardCompetitor[] = [];
  for (const player of session.players) {
    if (player.eliminated) continue;
    const thisSeasonFilms = player.films.filter(f => f.season === session.currentSeason);
    for (const film of thisSeasonFilms) {
      seasonFilms.push({
        playerId: player.id,
        filmTitle: film.title,
        quality: film.quality,
        boxOffice: film.boxOffice,
        genre: film.genre,
      });
    }
  }

  let awardResult: AwardResult | null = null;
  // Award every 2 seasons (or final season)
  const isAwardSeason = session.currentSeason % 2 === 0 || session.currentSeason === session.settings.seasonCount;

  if (isAwardSeason && seasonFilms.length >= 2) {
    // Sort by quality (primary) then box office (tiebreaker)
    const sorted = [...seasonFilms].sort((a, b) => {
      if (b.quality !== a.quality) return b.quality - a.quality;
      return b.boxOffice - a.boxOffice;
    });

    const winner = sorted[0];
    const winnerPlayer = session.players[winner.playerId];

    awardResult = {
      winnerId: winner.playerId,
      winnerName: winnerPlayer.studioName,
      filmTitle: winner.filmTitle,
      nominees: sorted.slice(0, Math.min(4, sorted.length)),
    };

    // Award bonus: +1 reputation, +$5M, +20 score
    winnerPlayer.reputation = Math.min(5, winnerPlayer.reputation + 1);
    winnerPlayer.budget += 5;
    winnerPlayer.score += 20;
  }

  session.awardHistory.push(awardResult);

  // Check victory / advance season
  session.currentSeason++;
  session.currentPlayerIndex = 0;
  session.seasonSaturation = {};
  session.turnSummaries = [];

  // Skip eliminated players at start of new season
  while (
    session.currentPlayerIndex < session.settings.playerCount &&
    session.players[session.currentPlayerIndex].eliminated
  ) {
    session.currentPlayerIndex++;
  }

  const gameOver = checkGameOver(session);

  if (gameOver) {
    session.finished = true;
    session.winnerId = determineWinner(session);
  }

  session.updatedAt = Date.now();

  return { awardResult, gameOver };
}

// ─── Victory Conditions ───

function checkGameOver(session: MultiplayerSession): boolean {
  // All but one player eliminated
  const alive = session.players.filter(p => !p.eliminated);
  if (alive.length <= 1) return true;

  // Exceeded season count
  if (session.currentSeason > session.settings.seasonCount) return true;

  // Score threshold reached
  if (session.settings.victoryCondition === 'score_threshold') {
    if (session.players.some(p => !p.eliminated && p.score >= session.settings.scoreThreshold)) {
      return true;
    }
  }

  return false;
}

function determineWinner(session: MultiplayerSession): number {
  const alive = session.players.filter(p => !p.eliminated);

  // Only one alive → they win
  if (alive.length === 1) return alive[0].id;
  if (alive.length === 0) return session.players[0].id; // shouldn't happen

  switch (session.settings.victoryCondition) {
    case 'most_earnings':
      return alive.sort((a, b) => b.totalEarnings - a.totalEarnings)[0].id;
    case 'highest_reputation':
      return alive.sort((a, b) => {
        if (b.reputation !== a.reputation) return b.reputation - a.reputation;
        return b.totalEarnings - a.totalEarnings;
      })[0].id;
    case 'score_threshold':
      return alive.sort((a, b) => b.score - a.score)[0].id;
    default:
      return alive.sort((a, b) => b.score - a.score)[0].id;
  }
}

// ─── Rankings ───

export interface PlayerRanking {
  playerId: number;
  playerName: string;
  studioName: string;
  rank: number;
  totalEarnings: number;
  reputation: number;
  score: number;
  filmCount: number;
  eliminated: boolean;
}

export function getStandings(session: MultiplayerSession): PlayerRanking[] {
  const sorted = [...session.players].sort((a, b) => {
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    if (b.score !== a.score) return b.score - a.score;
    if (b.totalEarnings !== a.totalEarnings) return b.totalEarnings - a.totalEarnings;
    return b.reputation - a.reputation;
  });

  return sorted.map((p, i) => ({
    playerId: p.id,
    playerName: p.name,
    studioName: p.studioName,
    rank: i + 1,
    totalEarnings: p.totalEarnings,
    reputation: p.reputation,
    score: p.score,
    filmCount: p.films.length,
    eliminated: p.eliminated,
  }));
}

// ─── Serialization ───

const MP_SAVE_KEY = 'greenlight_multiplayer_save';

export function saveMultiplayerSession(session: MultiplayerSession): void {
  try {
    localStorage.setItem(MP_SAVE_KEY, JSON.stringify(session));
  } catch {
    // silent fail
  }
}

export function loadMultiplayerSession(): MultiplayerSession | null {
  try {
    const raw = localStorage.getItem(MP_SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.id || !parsed.settings || !parsed.players) return null;
    return parsed as MultiplayerSession;
  } catch {
    return null;
  }
}

export function clearMultiplayerSave(): void {
  try {
    localStorage.removeItem(MP_SAVE_KEY);
  } catch {}
}

export function hasMultiplayerSave(): boolean {
  return loadMultiplayerSession() !== null;
}

// ─── Utility ───

export function getVictoryConditionLabel(vc: VictoryCondition): string {
  switch (vc) {
    case 'most_earnings': return 'Most Total Earnings';
    case 'score_threshold': return 'First to Score Threshold';
    case 'highest_reputation': return 'Highest Reputation';
  }
}

export function getLastTurnSummaries(session: MultiplayerSession): TurnSummary[] {
  return session.turnSummaries;
}
