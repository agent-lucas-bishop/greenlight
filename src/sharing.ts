/**
 * R196 + R244: Social Sharing & Screenshot System
 * Utilities for generating shareable run summaries, canvas share cards,
 * Web Share API integration, and screenshot downloads.
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
  genreBreakdown: { genre: string; count: number; pct: number }[];
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
    genreBreakdown: Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([genre, count]) => ({ genre, count, pct: h.length > 0 ? Math.round((count / h.length) * 100) : 0 })),
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

// ─── Canvas-based Share Card Generation (R244) ───

const CARD_WIDTH = 600;
const CARD_HEIGHT = 800;

const TIER_COLORS: Record<string, string> = {
  BLOCKBUSTER: '#2ecc71',
  SMASH: '#f1c40f',
  HIT: '#e67e22',
  FLOP: '#e74c3c',
};

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawStars(ctx: CanvasRenderingContext2D, x: number, y: number, filled: number, total: number, size: number) {
  for (let i = 0; i < total; i++) {
    ctx.font = `${size}px serif`;
    ctx.fillText(i < filled ? '★' : '☆', x + i * (size + 2), y);
  }
}

/**
 * Generate a canvas-based film poster style share card.
 * Returns a canvas element that can be converted to blob/dataURL.
 */
export function generateShareCard(data: RunShareData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bg.addColorStop(0, '#1a1a2e');
  bg.addColorStop(0.4, '#0f0f1a');
  bg.addColorStop(1, '#1a1020');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Film grain texture (subtle noise)
  const imgData = ctx.getImageData(0, 0, CARD_WIDTH, CARD_HEIGHT);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 8;
    imgData.data[i] += noise;
    imgData.data[i + 1] += noise;
    imgData.data[i + 2] += noise;
  }
  ctx.putImageData(imgData, 0, 0);

  // Gold border
  ctx.strokeStyle = 'rgba(212,168,67,0.5)';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 8, 8, CARD_WIDTH - 16, CARD_HEIGHT - 16, 16);
  ctx.stroke();

  // Corner accents
  ctx.strokeStyle = 'rgba(212,168,67,0.6)';
  ctx.lineWidth = 2;
  const corners = [
    [16, 16, 1, 1], [CARD_WIDTH - 40, 16, -1, 1],
    [16, CARD_HEIGHT - 40, 1, -1], [CARD_WIDTH - 40, CARD_HEIGHT - 40, -1, -1],
  ];
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + 24);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + 24, cy);
    ctx.stroke();
  }

  let y = 50;

  // Header subtitle
  ctx.fillStyle = '#d4a843';
  ctx.font = '600 12px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '4px';
  ctx.fillText(data.isVictory ? '★  A  F I L M  L E G A C Y  ★' : '★  T H E  F I N A L  C U T  ★', CARD_WIDTH / 2, y);
  y += 36;

  // Studio name
  ctx.fillStyle = '#d4a843';
  ctx.font = 'bold 36px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText(data.studioName, CARD_WIDTH / 2, y);
  y += 28;

  // Director style
  ctx.fillStyle = '#bb86fc';
  ctx.font = '16px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText(data.directorStyle, CARD_WIDTH / 2, y);
  y += 16;

  // Difficulty
  if (data.difficulty) {
    ctx.fillStyle = '#888';
    ctx.font = '11px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(`${data.difficulty.toUpperCase()} DIFFICULTY`, CARD_WIDTH / 2, y);
    y += 12;
  }
  y += 12;

  // Divider
  const divGrad = ctx.createLinearGradient(80, 0, CARD_WIDTH - 80, 0);
  divGrad.addColorStop(0, 'transparent');
  divGrad.addColorStop(0.5, 'rgba(212,168,67,0.5)');
  divGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = divGrad;
  ctx.fillRect(80, y, CARD_WIDTH - 160, 1);
  y += 24;

  // Tier grid
  const tierEmojis = data.tierGrid;
  ctx.font = '28px serif';
  ctx.textAlign = 'center';
  ctx.fillText(tierEmojis, CARD_WIDTH / 2, y);
  y += 36;

  // Stats row
  const stats = [
    { value: String(data.score), label: 'SCORE', color: '#d4a843' },
    { value: `$${Math.round(data.totalBO)}M`, label: 'BOX OFFICE', color: '#2ecc71' },
    { value: data.rank, label: 'RANK', color: data.rank === 'S' ? '#ff6b6b' : data.rank === 'A' ? '#ffd93d' : '#5dade2' },
  ];
  const colW = CARD_WIDTH / 3;
  for (let i = 0; i < stats.length; i++) {
    const cx = colW * i + colW / 2;
    ctx.fillStyle = stats[i].color;
    ctx.font = 'bold 32px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stats[i].value, cx, y);
    ctx.fillStyle = '#888';
    ctx.font = '10px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(stats[i].label, cx, y + 16);
  }
  y += 44;

  // Reputation stars
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d4a843';
  ctx.font = '20px serif';
  const starStr = '★'.repeat(data.reputation) + '☆'.repeat(Math.max(0, 5 - data.reputation));
  ctx.fillText(starStr, CARD_WIDTH / 2, y);
  y += 32;

  // Top Films section
  ctx.fillStyle = '#d4a843';
  ctx.font = '600 11px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('T O P   F I L M S', CARD_WIDTH / 2, y);
  y += 18;

  const medals = ['🥇', '🥈', '🥉'];
  for (let i = 0; i < Math.min(data.topFilms.length, 3); i++) {
    const film = data.topFilms[i];
    const rowY = y + i * 36;

    // Background for first film
    if (i === 0) {
      ctx.fillStyle = 'rgba(212,168,67,0.08)';
      drawRoundedRect(ctx, 40, rowY - 14, CARD_WIDTH - 80, 32, 6);
      ctx.fill();
    }

    ctx.textAlign = 'left';
    ctx.font = '18px serif';
    ctx.fillStyle = '#eee';
    ctx.fillText(medals[i], 56, rowY + 4);

    ctx.font = '15px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#eee';
    const title = `"${film.title}"`;
    const maxTitleW = 300;
    const truncTitle = ctx.measureText(title).width > maxTitleW
      ? title.slice(0, 25) + '…"' : title;
    ctx.fillText(truncTitle, 86, rowY + 2);

    ctx.font = '11px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText(film.genre, 86, rowY + 16);

    ctx.textAlign = 'right';
    ctx.fillStyle = TIER_COLORS[film.tier] || '#888';
    ctx.font = '15px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(`$${film.boxOffice.toFixed(1)}M`, CARD_WIDTH - 56, rowY + 2);

    if (film.criticScore != null) {
      ctx.font = '11px "Helvetica Neue", Arial, sans-serif';
      ctx.fillStyle = film.criticScore >= 60 ? '#e74c3c' : '#7f8c2a';
      ctx.fillText(`${film.criticScore >= 60 ? '🍅' : '🤢'}${film.criticScore}%`, CARD_WIDTH - 56, rowY + 16);
    }
  }
  y += Math.min(data.topFilms.length, 3) * 36 + 16;

  // Bottom stats
  const bottomStats = [
    `🎥 ${data.filmCount} Films`,
    `💰 ${data.blockbusters} Blockbusters`,
    `🏆 ${data.nominations} Noms`,
    `🎭 ${data.favoriteGenre}`,
  ];
  ctx.textAlign = 'center';
  ctx.fillStyle = '#999';
  ctx.font = '12px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText(bottomStats.join('  ·  '), CARD_WIDTH / 2, y);
  y += 24;

  // Bottom divider
  ctx.fillStyle = divGrad;
  ctx.fillRect(80, y, CARD_WIDTH - 160, 1);
  y += 20;

  // Legacy rating
  ctx.fillStyle = '#d4a843';
  ctx.font = 'bold 14px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Legacy: ${data.legacyRating}`, CARD_WIDTH / 2, y);
  y += 28;

  // Footer
  ctx.fillStyle = '#d4a843';
  ctx.font = 'bold 18px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('G R E E N L I G H T', CARD_WIDTH / 2, CARD_HEIGHT - 40);
  ctx.fillStyle = '#666';
  ctx.font = '10px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('greenlight-plum.vercel.app', CARD_WIDTH / 2, CARD_HEIGHT - 22);

  return canvas;
}

/**
 * Generate short shareable text for a game result.
 */
export function generateShareText(data: RunShareData): string {
  const best = data.topFilms[0];
  const stars = '⭐'.repeat(Math.min(data.reputation, 5));
  const filmLine = best ? ` with "${best.title}"` : '';
  return `🎬 GREENLIGHT | My studio just grossed $${Math.round(data.totalBO)}M${filmLine}! Season ${data.filmCount} | Rating: ${stars} | ${BASE_URL}`;
}

/**
 * Share using Web Share API if available, fallback to clipboard copy.
 * Returns true if shared/copied successfully.
 */
export async function shareResult(
  type: 'text' | 'image' | 'both',
  data: RunShareData,
): Promise<{ method: 'native' | 'clipboard'; success: boolean }> {
  const text = type === 'image'
    ? generateShareText(data)
    : generateTextSummary(data);

  // Try Web Share API
  if (navigator.share) {
    try {
      const shareData: ShareData = {
        title: `GREENLIGHT — ${data.studioName}`,
        text,
        url: BASE_URL,
      };

      // For image sharing, generate canvas and convert to file
      if (type === 'image' || type === 'both') {
        try {
          const canvas = generateShareCard(data);
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
          });
          const file = new File([blob], 'greenlight-share.png', { type: 'image/png' });
          if (navigator.canShare?.({ files: [file] })) {
            shareData.files = [file];
          }
        } catch {
          // Image share not supported, continue with text only
        }
      }

      await navigator.share(shareData);
      return { method: 'native', success: true };
    } catch (e: any) {
      // User cancelled or share failed — fall back to clipboard
      if (e?.name === 'AbortError') {
        return { method: 'native', success: false };
      }
    }
  }

  // Fallback: clipboard
  const ok = await copyToClipboard(text);
  return { method: 'clipboard', success: ok };
}

/**
 * Download the canvas share card as a PNG file.
 */
export async function downloadShareCard(data: RunShareData, filename?: string): Promise<boolean> {
  try {
    const canvas = generateShareCard(data);
    const safeName = data.studioName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
    const fname = filename || `greenlight_${safeName}_${data.score}.png`;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    console.error('downloadShareCard failed:', e);
    return false;
  }
}
