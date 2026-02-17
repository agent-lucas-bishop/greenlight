/**
 * R270: Replay System — wraps replay.ts with base64 export/import
 * and provides structured interfaces for the Film Archive UI.
 */

export {
  loadReplays,
  deleteReplay,
  isRecording,
  startReplayRecording,
  recordEvent,
  finalizeReplay,
  snapshotState,
  describeEvent,
  addImportedReplay,
} from './replay';

export type {
  ReplayData,
  ReplayEvent,
  ReplayEventType,
  ReplayMoment,
} from './replay';

import { loadReplays, type ReplayData, type ReplayEvent } from './replay';
import type { Genre, RewardTier } from './types';

// ─── Base64 Export / Import ───

export function exportReplayBase64(replay: ReplayData): string {
  try {
    const json = JSON.stringify(replay);
    return btoa(unescape(encodeURIComponent(json)));
  } catch {
    return '';
  }
}

export function importReplayBase64(encoded: string): ReplayData | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const data = JSON.parse(json) as ReplayData;
    if (!data.id || !Array.isArray(data.events)) return null;
    return data;
  } catch {
    return null;
  }
}

// ─── Season Summary (extracted from replay events) ───

export interface SeasonSummary {
  season: number;
  filmTitle: string;
  genre: Genre;
  quality: number;
  boxOffice: number;
  tier: RewardTier;
  cardsPlayed: { name: string; cardType: string; value: number }[];
  talentHired: { name: string; type: string; skill: number }[];
  perksBought: string[];
  events: string[];
  budget: number;
  reputation: number;
  strikes: number;
  marketing?: string;
  postProdOption?: string;
  festivalAward?: string | null;
  encoreResult?: string | null;
}

export function extractSeasonSummaries(replay: ReplayData): SeasonSummary[] {
  const summaries: SeasonSummary[] = [];
  const seasonEvents = new Map<number, ReplayEvent[]>();

  for (const event of replay.events) {
    const s = event.s;
    if (!seasonEvents.has(s)) seasonEvents.set(s, []);
    seasonEvents.get(s)!.push(event);
  }

  for (const [season, events] of seasonEvents) {
    const resultEvent = events.find(e => e.t === 'season_result');
    if (!resultEvent) continue;

    const d = resultEvent.d;
    const cards = events
      .filter(e => e.t === 'card_play')
      .map(e => ({ name: e.d.name as string, cardType: e.d.cardType as string, value: e.d.value as number }));

    const talent = events
      .filter(e => e.t === 'talent_hire')
      .map(e => ({ name: e.d.name as string, type: e.d.type as string, skill: e.d.skill as number }));

    const perks = events
      .filter(e => e.t === 'perk_buy')
      .map(e => e.d.name as string);

    const seasonEventNames = events
      .filter(e => e.t === 'season_event')
      .map(e => e.d.eventName as string);

    const postProd = events.find(e => e.t === 'post_prod');
    const festival = events.find(e => e.t === 'festival_submit');
    const encore = events.find(e => e.t === 'encore');

    // Get state snapshot from result event or last available
    const state = (d.state || {}) as Record<string, unknown>;

    summaries.push({
      season,
      filmTitle: d.title as string,
      genre: d.genre as Genre,
      quality: d.quality as number,
      boxOffice: d.boxOffice as number,
      tier: d.tier as RewardTier,
      cardsPlayed: cards,
      talentHired: talent,
      perksBought: perks,
      events: seasonEventNames,
      budget: (state.budget as number) || 0,
      reputation: (state.rep as number) || 0,
      strikes: (state.strikes as number) || 0,
      marketing: postProd ? (postProd.d.marketing as string) : undefined,
      postProdOption: postProd ? (postProd.d.option as string) : undefined,
      festivalAward: festival ? (festival.d.award as string | null) : undefined,
      encoreResult: encore ? (encore.d.success ? 'Success' : 'Failed') : undefined,
    });
  }

  return summaries;
}

// ─── Run Stats Summary ───

export interface ReplayStats {
  bestFilm: { title: string; boxOffice: number; genre: Genre } | null;
  worstFlop: { title: string; boxOffice: number; genre: Genre } | null;
  totalEarnings: number;
  averageQuality: number;
  totalCardsPlayed: number;
  blockbusterCount: number;
  flopCount: number;
}

export function computeReplayStats(replay: ReplayData): ReplayStats {
  const summaries = extractSeasonSummaries(replay);

  let bestFilm: ReplayStats['bestFilm'] = null;
  let worstFlop: ReplayStats['worstFlop'] = null;
  let totalEarnings = 0;
  let totalQuality = 0;
  let totalCards = 0;
  let blockbusters = 0;
  let flops = 0;

  for (const s of summaries) {
    totalEarnings += s.boxOffice;
    totalQuality += s.quality;
    totalCards += s.cardsPlayed.length;

    if (s.tier === 'BLOCKBUSTER') blockbusters++;
    if (s.tier === 'FLOP') flops++;

    if (!bestFilm || s.boxOffice > bestFilm.boxOffice) {
      bestFilm = { title: s.filmTitle, boxOffice: s.boxOffice, genre: s.genre };
    }
    if (s.tier === 'FLOP' && (!worstFlop || s.boxOffice < worstFlop.boxOffice)) {
      worstFlop = { title: s.filmTitle, boxOffice: s.boxOffice, genre: s.genre };
    }
  }

  return {
    bestFilm,
    worstFlop,
    totalEarnings,
    averageQuality: summaries.length > 0 ? Math.round(totalQuality / summaries.length) : 0,
    totalCardsPlayed: totalCards,
    blockbusterCount: blockbusters,
    flopCount: flops,
  };
}
