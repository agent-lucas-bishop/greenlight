/**
 * R307: Film Awards System
 * End-of-run awards ceremony with persistent award history.
 */

import type { SeasonResult, RewardTier } from './types';

const AWARDS_HISTORY_KEY = 'greenlight_awards_history_v1';

export interface FilmAward {
  id: string;
  name: string;
  emoji: string;
  description: string;
  filmTitle: string;
  filmGenre: string;
  value: string;
}

export interface RunAwardsRecord {
  runId: string;
  date: string;
  studioName: string;
  awards: FilmAward[];
}

// ─── Calculate awards for a completed run ───

export function calculateFilmAwards(history: SeasonResult[], studioName: string): FilmAward[] {
  if (history.length === 0) return [];

  const awards: FilmAward[] = [];

  // Box Office Champion — highest grossing film
  const bestBO = history.reduce((a, b) => a.boxOffice > b.boxOffice ? a : b);
  awards.push({
    id: 'box_office_champion',
    name: 'Box Office Champion',
    emoji: '💰',
    description: 'Highest grossing film of the run',
    filmTitle: bestBO.title,
    filmGenre: bestBO.genre,
    value: `$${bestBO.boxOffice.toFixed(1)}M`,
  });

  // Critical Darling — best quality rating
  const bestQuality = history.reduce((a, b) => a.quality > b.quality ? a : b);
  if (bestQuality.quality > 0) {
    awards.push({
      id: 'critical_darling',
      name: 'Critical Darling',
      emoji: '🎭',
      description: 'Highest quality film of the run',
      filmTitle: bestQuality.title,
      filmGenre: bestQuality.genre,
      value: `Quality ${bestQuality.quality}`,
    });
  }

  // Genre Master — most films in one genre
  const genreCounts: Record<string, number> = {};
  for (const s of history) genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1;
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0];
  if (topGenre && topGenre[1] >= 2) {
    awards.push({
      id: 'genre_master',
      name: 'Genre Master',
      emoji: '🎬',
      description: `Most films in one genre (${topGenre[0]})`,
      filmTitle: `${topGenre[0]} specialist`,
      filmGenre: topGenre[0],
      value: `${topGenre[1]} films`,
    });
  }

  // Budget Wizard — best ROI (boxOffice relative to average)
  if (history.length >= 2) {
    const avgBO = history.reduce((s, h) => s + h.boxOffice, 0) / history.length;
    const tierValue: Record<RewardTier, number> = { BLOCKBUSTER: 4, SMASH: 3, HIT: 2, FLOP: 1 };
    let bestROI = history[0];
    let bestROIScore = 0;
    for (const h of history) {
      const score = tierValue[h.tier] * (h.boxOffice / Math.max(1, avgBO));
      if (score > bestROIScore) { bestROI = h; bestROIScore = score; }
    }
    awards.push({
      id: 'budget_wizard',
      name: 'Budget Wizard',
      emoji: '🧙',
      description: 'Best return on investment',
      filmTitle: bestROI.title,
      filmGenre: bestROI.genre,
      value: `${bestROI.tier} · $${bestROI.boxOffice.toFixed(1)}M`,
    });
  }

  // Comeback Kid — recovered from a flop (flop followed by HIT+ in next film)
  for (let i = 1; i < history.length; i++) {
    if (history[i - 1].tier === 'FLOP' && (history[i].tier === 'HIT' || history[i].tier === 'SMASH' || history[i].tier === 'BLOCKBUSTER')) {
      awards.push({
        id: 'comeback_kid',
        name: 'Comeback Kid',
        emoji: '🔥',
        description: 'Bounced back after a flop',
        filmTitle: history[i].title,
        filmGenre: history[i].genre,
        value: `FLOP → ${history[i].tier}`,
      });
      break;
    }
  }

  // Crowd Pleaser — best audience score (if available)
  const withAudience = history.filter(h => h.audienceScore != null && h.audienceScore! > 0);
  if (withAudience.length > 0) {
    const bestAudience = withAudience.reduce((a, b) => (a.audienceScore || 0) > (b.audienceScore || 0) ? a : b);
    if ((bestAudience.audienceScore || 0) >= 70) {
      awards.push({
        id: 'crowd_pleaser',
        name: 'Crowd Pleaser',
        emoji: '👏',
        description: 'Highest audience score',
        filmTitle: bestAudience.title,
        filmGenre: bestAudience.genre,
        value: `${bestAudience.audienceScore}% audience`,
      });
    }
  }

  // Fresh Streak — best critic score
  const withCritic = history.filter(h => h.criticScore != null && h.criticScore! > 0);
  if (withCritic.length > 0) {
    const bestCritic = withCritic.reduce((a, b) => (a.criticScore || 0) > (b.criticScore || 0) ? a : b);
    if ((bestCritic.criticScore || 0) >= 80) {
      awards.push({
        id: 'critics_choice',
        name: "Critics' Choice",
        emoji: '🍅',
        description: 'Highest critic score',
        filmTitle: bestCritic.title,
        filmGenre: bestCritic.genre,
        value: `${bestCritic.criticScore}% Fresh`,
      });
    }
  }

  return awards;
}

// ─── Persistence ───

export function getAwardsHistory(): RunAwardsRecord[] {
  try {
    const raw = localStorage.getItem(AWARDS_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveRunAwards(record: RunAwardsRecord): void {
  const history = getAwardsHistory();
  history.push(record);
  // Keep last 50
  if (history.length > 50) history.splice(0, history.length - 50);
  localStorage.setItem(AWARDS_HISTORY_KEY, JSON.stringify(history));
}

export function getTotalAwardCount(): number {
  return getAwardsHistory().reduce((s, r) => s + r.awards.length, 0);
}

export function getAwardCountByType(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const record of getAwardsHistory()) {
    for (const award of record.awards) {
      counts[award.id] = (counts[award.id] || 0) + 1;
    }
  }
  return counts;
}
