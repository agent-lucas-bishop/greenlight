/**
 * R211: Run Replay System
 * Records every decision point during a run as a compact event log.
 * Stores in localStorage, keeping last 10 replays.
 */

import type { Genre, RewardTier, GamePhase, Difficulty } from './types';

// ─── Event Types ───

export type ReplayEventType =
  | 'run_start'
  | 'archetype_pick'
  | 'neow_pick'
  | 'script_pick'
  | 'talent_hire'
  | 'talent_assign'
  | 'talent_fire'
  | 'production_start'
  | 'card_play'
  | 'card_pick'        // draw-2-keep-1 choice
  | 'challenge_bet'
  | 'block_decision'
  | 'directors_cut'
  | 'reshoots'
  | 'encore'
  | 'post_prod'        // marketing + option + composer
  | 'season_result'
  | 'perk_buy'
  | 'workshop_action'
  | 'festival_submit'
  | 'season_event'
  | 'debt_payment'
  | 'extended_cut'
  | 'loan_taken'
  | 'loan_repaid'
  | 'investment_bought'
  | 'streaming_deal_accepted'
  | 'insurance_bought'
  | 'run_end';

export interface ReplayEvent {
  /** Event type */
  t: ReplayEventType;
  /** Timestamp (ms since run start) */
  ts: number;
  /** Season number */
  s: number;
  /** Game phase at time of event */
  p: GamePhase;
  /** Event-specific data (compact) */
  d: Record<string, unknown>;
}

export interface ReplayMoment {
  type: 'first_hit' | 'biggest_flop' | 'turning_point' | 'blockbuster' | 'perfect_season' | 'comeback';
  eventIndex: number;
  label: string;
  description: string;
}

export interface ReplayData {
  /** Unique replay ID */
  id: string;
  /** Run start timestamp */
  startTime: number;
  /** Run end timestamp */
  endTime: number;
  /** Studio name */
  studioName: string;
  /** Difficulty */
  difficulty: Difficulty;
  /** Game mode */
  gameMode: string;
  /** Final score */
  score: number;
  /** Won or lost */
  won: boolean;
  /** Total seasons played */
  seasons: number;
  /** Total box office */
  totalBO: number;
  /** Events log */
  events: ReplayEvent[];
  /** Key moments (computed on finalize) */
  moments: ReplayMoment[];
  /** Version for forward compat */
  version: number;
}

// ─── Storage ───

const STORAGE_KEY = 'greenlight_replays';
const MAX_REPLAYS = 10;
const REPLAY_VERSION = 1;

export function loadReplays(): ReplayData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ReplayData[];
  } catch {
    return [];
  }
}

function saveReplays(replays: ReplayData[]): void {
  try {
    // Keep only last MAX_REPLAYS
    const trimmed = replays.slice(-MAX_REPLAYS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full — evict oldest
    try {
      const trimmed = replays.slice(-(MAX_REPLAYS - 2));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch { /* give up */ }
  }
}

// ─── Active Recording Session ───

let activeReplay: ReplayData | null = null;
let runStartTime = 0;

export function isRecording(): boolean {
  return activeReplay !== null;
}

export function startReplayRecording(studioName: string, gameMode: string, difficulty: Difficulty): void {
  runStartTime = Date.now();
  activeReplay = {
    id: `replay_${runStartTime}_${Math.random().toString(36).slice(2, 8)}`,
    startTime: runStartTime,
    endTime: 0,
    studioName,
    difficulty,
    gameMode,
    score: 0,
    won: false,
    seasons: 0,
    totalBO: 0,
    events: [],
    moments: [],
    version: REPLAY_VERSION,
  };
}

export function recordEvent(
  type: ReplayEventType,
  season: number,
  phase: GamePhase,
  data: Record<string, unknown> = {}
): void {
  if (!activeReplay) return;
  activeReplay.events.push({
    t: type,
    ts: Date.now() - runStartTime,
    s: season,
    p: phase,
    d: data,
  });
}

function computeMoments(replay: ReplayData): ReplayMoment[] {
  const moments: ReplayMoment[] = [];
  const seasonResults = replay.events
    .map((e, i) => ({ event: e, index: i }))
    .filter(({ event }) => event.t === 'season_result');

  let firstHitFound = false;
  let biggestFlopBO = Infinity;
  let biggestFlopIdx = -1;
  let prevTier: string | null = null;

  for (const { event, index } of seasonResults) {
    const tier = event.d.tier as string;
    const bo = event.d.boxOffice as number;
    const title = event.d.title as string;

    // First hit
    if (!firstHitFound && tier !== 'FLOP') {
      firstHitFound = true;
      moments.push({
        type: 'first_hit',
        eventIndex: index,
        label: '🎬 First Hit',
        description: `"${title}" — your first ${tier} ($${bo}M)`,
      });
    }

    // Biggest flop
    if (tier === 'FLOP' && bo < biggestFlopBO) {
      biggestFlopBO = bo;
      biggestFlopIdx = index;
    }

    // Blockbuster
    if (tier === 'BLOCKBUSTER') {
      moments.push({
        type: 'blockbuster',
        eventIndex: index,
        label: '💥 Blockbuster',
        description: `"${title}" hit BLOCKBUSTER ($${bo}M)`,
      });
    }

    // Turning point: FLOP -> HIT+ or HIT+ -> FLOP
    if (prevTier === 'FLOP' && tier !== 'FLOP') {
      moments.push({
        type: 'comeback',
        eventIndex: index,
        label: '🔄 Comeback',
        description: `Bounced back with "${title}" after a flop`,
      });
    } else if (prevTier && prevTier !== 'FLOP' && tier === 'FLOP') {
      moments.push({
        type: 'turning_point',
        eventIndex: index,
        label: '📉 Turning Point',
        description: `"${title}" flopped after a ${prevTier}`,
      });
    }

    prevTier = tier;
  }

  if (biggestFlopIdx >= 0) {
    const e = replay.events[biggestFlopIdx];
    moments.push({
      type: 'biggest_flop',
      eventIndex: biggestFlopIdx,
      label: '💀 Biggest Flop',
      description: `"${e.d.title}" — $${e.d.boxOffice}M`,
    });
  }

  return moments;
}

export function finalizeReplay(won: boolean, score: number, seasons: number, totalBO: number): ReplayData | null {
  if (!activeReplay) return null;

  activeReplay.endTime = Date.now();
  activeReplay.won = won;
  activeReplay.score = score;
  activeReplay.seasons = seasons;
  activeReplay.totalBO = totalBO;

  recordEvent('run_end', seasons, won ? 'victory' : 'gameOver', { won, score, totalBO });

  activeReplay.moments = computeMoments(activeReplay);

  const replay = activeReplay;
  const replays = loadReplays();
  replays.push(replay);
  saveReplays(replays);

  activeReplay = null;
  return replay;
}

export function deleteReplay(id: string): void {
  const replays = loadReplays().filter(r => r.id !== id);
  saveReplays(replays);
}

export function exportReplay(replay: ReplayData): string {
  return JSON.stringify(replay, null, 2);
}

export function importReplay(json: string): ReplayData | null {
  try {
    const data = JSON.parse(json) as ReplayData;
    if (!data.id || !data.events || !Array.isArray(data.events)) return null;
    if (data.version !== REPLAY_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export function addImportedReplay(replay: ReplayData): void {
  const replays = loadReplays();
  // Don't duplicate
  if (replays.some(r => r.id === replay.id)) return;
  replays.push(replay);
  saveReplays(replays);
}

// ─── Snapshot helper: extract minimal game state for display ───

export function snapshotState(state: {
  budget: number;
  reputation: number;
  strikes: number;
  season: number;
  totalEarnings: number;
  roster: { name: string }[];
  debt: number;
}): Record<string, unknown> {
  return {
    budget: state.budget,
    rep: state.reputation,
    strikes: state.strikes,
    season: state.season,
    earnings: state.totalEarnings,
    rosterSize: state.roster.length,
    debt: state.debt,
  };
}

// ─── Event description helpers for viewer ───

export function describeEvent(event: ReplayEvent): { icon: string; title: string; detail: string } {
  const d = event.d;
  switch (event.t) {
    case 'run_start':
      return { icon: '🎬', title: 'Run Started', detail: `${d.studioName} — ${d.gameMode} (${d.difficulty})` };
    case 'archetype_pick':
      return { icon: '🏛️', title: 'Archetype Chosen', detail: `${d.name}` as string };
    case 'neow_pick':
      return { icon: '🎁', title: 'Starting Bonus', detail: `Choice ${d.choice}` };
    case 'script_pick':
      return { icon: '📜', title: 'Script Selected', detail: `"${d.title}" (${d.genre}) — $${d.cost}M` };
    case 'talent_hire':
      return { icon: '🤝', title: 'Talent Hired', detail: `${d.name} (${d.type}, Skill ${d.skill}) — $${d.cost}M` };
    case 'talent_assign':
      return { icon: '🎭', title: 'Talent Assigned', detail: `${d.name} → ${d.slot}` };
    case 'talent_fire':
      return { icon: '👋', title: 'Talent Released', detail: `${d.name}` as string };
    case 'production_start':
      return { icon: '🎥', title: 'Production Started', detail: `${d.deckSize} cards in deck` };
    case 'card_play':
      return { icon: '🃏', title: 'Card Played', detail: `${d.name} (${d.cardType}) — ${(d.value as number) > 0 ? '+' : ''}${d.value}` };
    case 'card_pick':
      return { icon: '✋', title: 'Card Picked', detail: `Kept "${d.kept}" over "${d.discarded}"` };
    case 'challenge_bet':
      return { icon: '🎰', title: 'Challenge Bet', detail: d.accepted ? `Accepted — ${d.won ? 'Won!' : 'Lost'}` : 'Declined' };
    case 'block_decision':
      return { icon: '🛡️', title: 'Block Decision', detail: d.blocked ? 'Blocked incident' : 'Let it through' };
    case 'directors_cut':
      return { icon: '✂️', title: "Director's Cut", detail: 'Reordered cards' };
    case 'reshoots':
      return { icon: '🔄', title: 'Reshoots', detail: `Re-rolled ${d.count} incident(s)` };
    case 'encore':
      return { icon: '🌟', title: 'Encore', detail: d.success ? 'Success!' : 'Failed' };
    case 'post_prod':
      return { icon: '🎞️', title: 'Post-Production', detail: `Marketing: ${d.marketing}, Option: ${d.option || 'none'}${d.composer ? `, Composer: ${d.composer}` : ''}` };
    case 'season_result': {
      const tierEmoji: Record<string, string> = { BLOCKBUSTER: '🟩', SMASH: '🟨', HIT: '🟧', FLOP: '🟥' };
      return { icon: tierEmoji[d.tier as string] || '🎬', title: `Season ${event.s} Result`, detail: `"${d.title}" — ${d.tier} ($${d.boxOffice}M, Q:${d.quality})` };
    }
    case 'perk_buy':
      return { icon: '🏷️', title: 'Perk Purchased', detail: `${d.name} — $${d.cost}M` };
    case 'workshop_action':
      return { icon: '🔧', title: 'Workshop', detail: `${d.action}: ${d.cardName}` };
    case 'festival_submit':
      return { icon: '🏆', title: 'Festival', detail: `${d.festivalName} — ${d.award || 'No award'}` };
    case 'season_event':
      return { icon: '📰', title: 'Season Event', detail: `${d.eventName}` as string };
    case 'debt_payment':
      return { icon: '💰', title: 'Debt Paid', detail: `$${d.amount}M` };
    case 'extended_cut':
      return { icon: '🎞️', title: 'Extended Cut', detail: d.accepted ? 'Accepted' : 'Declined' };
    case 'run_end':
      return { icon: d.won ? '🏆' : '💔', title: d.won ? 'Victory!' : 'Game Over', detail: `Score: ${d.score} — $${d.totalBO}M total` };
    default:
      return { icon: '❓', title: event.t, detail: JSON.stringify(d) };
  }
}
