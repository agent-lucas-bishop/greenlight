/**
 * R196: Social Sharing & Screenshot System
 * Utilities for generating shareable run summaries, Twitter intents, and share URLs.
 */

import type { GameState, SeasonResult, RewardTier } from './types';

const BASE_URL = 'https://greenlight-plum.vercel.app';

// ─── Types ───

export interface RunShareData {
  studioName: string;
  directorStyle: string;
  totalBO: number;
  score: number;
  rank: string;
  legacyRating: string;
  filmCount: number;
  reputation: number;
  isVictory: boolean;
  difficulty?: string;
  topFilms: { title: string; genre: string; boxOffice: number; tier: RewardTier; criticScore?: number }[];
  tierGrid: string;
  blockbusters: number;
  flops: number;
  nominations: number;
  favoriteGenre: string;
}

// ─── Extract share data from game state ───

export function extractShareData(
  state: GameState,
  score: number,
  rank: string,
  legacyRating: string,
  isVictory: boolean,
  directorStyle: string,
): RunShareData {
  const h = state.seasonHistory;
  const genreCounts: Record<string, number> = {};
  h.forEach(s => { genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1; });
  const favoriteGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  const topFilms = [...h]
    .sort((a, b) => b.boxOffice - a.boxOffice)
    .slice(0, 3)
    .map(s => ({
      title: s.title,
      genre: s.genre,
      boxOffice: s.boxOffice,
      tier: s.tier,
      criticScore: s.criticScore,
    }));

  const tierEmoji: Record<RewardTier, string> = {
    BLOCKBUSTER: '🟩', SMASH: '🟨', HIT: '🟧', FLOP: '🟥',
  };
  const tierGrid = h.map(s => s.quality <= 0 ? '💀' : tierEmoji[s.tier]).join('');

  return {
    studioName: state.studioName || 'Unknown Studio',
    directorStyle,
    totalBO: state.totalEarnings,
    score,
    rank,
    legacyRating,
    filmCount: h.length,
    reputation: state.reputation,
    isVictory,
    difficulty: state.difficulty,
    topFilms,
    tierGrid,
    blockbusters: h.filter(s => s.tier === 'BLOCKBUSTER').length,
    flops: h.filter(s => s.tier === 'FLOP').length,
    nominations: h.filter(s => s.nominated).length,
    favoriteGenre,
  };
}

// ─── Formatted text summary ───

export function generateTextSummary(data: RunShareData): string {
  const lines: string[] = [
    `🎬 GREENLIGHT — ${data.isVictory ? 'VICTORY' : 'GAME OVER'}`,
    '',
    `🏢 ${data.studioName}`,
    `🎥 Director Style: ${data.directorStyle}`,
    `${data.difficulty ? `⚙️ Difficulty: ${data.difficulty}` : ''}`,
    '',
    data.tierGrid,
    '',
    `💰 Total Box Office: $${data.totalBO.toFixed(1)}M`,
    `⭐ Score: ${data.score} (${data.rank}-Rank)`,
    `🏆 Legacy: ${data.legacyRating}`,
    `🎥 Films: ${data.filmCount} | ⭐ Rep: ${'★'.repeat(data.reputation)}${'☆'.repeat(Math.max(0, 5 - data.reputation))}`,
    `🎯 ${data.blockbusters} Blockbusters · ${data.nominations} Nominations`,
    `🎭 Favorite Genre: ${data.favoriteGenre}`,
    '',
    '── Top Films ──',
    ...data.topFilms.map((f, i) => {
      const medal = ['🥇', '🥈', '🥉'][i];
      const critic = f.criticScore != null ? ` (${f.criticScore >= 60 ? '🍅' : '🤢'}${f.criticScore}%)` : '';
      return `${medal} "${f.title}" — ${f.genre} · $${f.boxOffice.toFixed(1)}M${critic}`;
    }),
    '',
    BASE_URL,
  ];
  return lines.filter(l => l !== undefined && l !== '').join('\n');
}

// ─── Twitter/X-ready text ───

export function generateTwitterText(data: RunShareData): string {
  const status = data.isVictory ? '🏆' : '💀';
  const best = data.topFilms[0];
  const bestLine = best ? ` Best: "${best.title}" $${best.boxOffice.toFixed(0)}M` : '';
  
  // Twitter has 280 char limit, keep it tight
  const lines = [
    `🎬 GREENLIGHT ${status}`,
    `${data.tierGrid}`,
    `Score: ${data.score} (${data.rank}) · $${data.totalBO.toFixed(0)}M BO`,
    `🎥 ${data.directorStyle}${bestLine}`,
    '',
    `${BASE_URL}`,
    '#GREENLIGHT #IndieGameDev',
  ];
  return lines.join('\n');
}

// ─── Twitter intent URL ───

export function getTwitterIntentUrl(text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

// ─── Copy to clipboard ───

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

// ─── Share URL with encoded run data ───

export function generateShareUrl(data: RunShareData): string {
  const params = new URLSearchParams({
    s: String(data.score),
    r: data.rank,
    bo: data.totalBO.toFixed(1),
    f: String(data.filmCount),
    v: data.isVictory ? '1' : '0',
    st: data.studioName,
    ds: data.directorStyle,
    g: data.tierGrid,
    lg: data.legacyRating,
  });
  if (data.topFilms[0]) {
    params.set('bf', data.topFilms[0].title);
    params.set('bbo', data.topFilms[0].boxOffice.toFixed(0));
  }
  return `${BASE_URL}?${params.toString()}`;
}
