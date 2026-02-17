// R179: Procedural Soundtrack / Score System
// R266: Soundtrack Composer System — Musical Theme mini-game

import type { Genre } from './types';

// ─── R266: MUSICAL THEMES ───

export type MusicalThemeId =
  | 'epic_orchestral'
  | 'synth_wave'
  | 'jazz_noir'
  | 'acoustic_indie'
  | 'electronic_pulse'
  | 'classical_piano'
  | 'world_fusion'
  | 'rock_anthem';

export interface MusicalTheme {
  id: MusicalThemeId;
  name: string;
  emoji: string;
  color: string;
  description: string;
  genreAffinities: { genre: Genre; bonus: number }[]; // +5 to +15 quality %
}

export const MUSICAL_THEMES: MusicalTheme[] = [
  {
    id: 'epic_orchestral',
    name: 'Epic Orchestral',
    emoji: '🎻',
    color: '#c0392b',
    description: 'Sweeping strings and thundering brass. The sound of heroes rising.',
    genreAffinities: [
      { genre: 'Action', bonus: 15 },
      { genre: 'Sci-Fi', bonus: 12 },
      { genre: 'Drama', bonus: 8 },
    ],
  },
  {
    id: 'synth_wave',
    name: 'Synth Wave',
    emoji: '🌊',
    color: '#8e44ad',
    description: 'Retro-futuristic pulses and neon-drenched pads. Pure 80s energy.',
    genreAffinities: [
      { genre: 'Sci-Fi', bonus: 15 },
      { genre: 'Thriller', bonus: 10 },
      { genre: 'Action', bonus: 8 },
    ],
  },
  {
    id: 'jazz_noir',
    name: 'Jazz Noir',
    emoji: '🎷',
    color: '#2c3e50',
    description: 'Smoky clubs, lonely saxophones, and midnight rain on pavement.',
    genreAffinities: [
      { genre: 'Thriller', bonus: 15 },
      { genre: 'Drama', bonus: 12 },
      { genre: 'Romance', bonus: 8 },
    ],
  },
  {
    id: 'acoustic_indie',
    name: 'Acoustic Indie',
    emoji: '🎸',
    color: '#27ae60',
    description: 'Warm guitar fingerpicking and heartfelt vocals. Intimate and raw.',
    genreAffinities: [
      { genre: 'Romance', bonus: 15 },
      { genre: 'Comedy', bonus: 12 },
      { genre: 'Drama', bonus: 10 },
    ],
  },
  {
    id: 'electronic_pulse',
    name: 'Electronic Pulse',
    emoji: '⚡',
    color: '#2980b9',
    description: 'Driving beats and glitchy textures. The future sounds electric.',
    genreAffinities: [
      { genre: 'Sci-Fi', bonus: 12 },
      { genre: 'Action', bonus: 10 },
      { genre: 'Thriller', bonus: 10 },
    ],
  },
  {
    id: 'classical_piano',
    name: 'Classical Piano',
    emoji: '🎹',
    color: '#f39c12',
    description: 'Elegant keys that speak volumes. Every note carries weight.',
    genreAffinities: [
      { genre: 'Drama', bonus: 15 },
      { genre: 'Romance', bonus: 12 },
      { genre: 'Horror', bonus: 5 },
    ],
  },
  {
    id: 'world_fusion',
    name: 'World Fusion',
    emoji: '🌍',
    color: '#e67e22',
    description: 'Tabla, kora, duduk — a global tapestry of sound and rhythm.',
    genreAffinities: [
      { genre: 'Drama', bonus: 10 },
      { genre: 'Action', bonus: 8 },
      { genre: 'Comedy', bonus: 8 },
      { genre: 'Sci-Fi', bonus: 5 },
    ],
  },
  {
    id: 'rock_anthem',
    name: 'Rock Anthem',
    emoji: '🤘',
    color: '#e74c3c',
    description: 'Power chords and stadium-filling riffs. Turn it up to eleven.',
    genreAffinities: [
      { genre: 'Action', bonus: 12 },
      { genre: 'Comedy', bonus: 10 },
      { genre: 'Horror', bonus: 8 },
    ],
  },
];

export function getThemeById(id: MusicalThemeId): MusicalTheme | undefined {
  return MUSICAL_THEMES.find(t => t.id === id);
}

/**
 * Calculate the quality bonus percentage for a theme + genre combo.
 * Returns 0 if no affinity match.
 */
export function getThemeGenreBonus(themeId: MusicalThemeId, genre: Genre | string): number {
  const theme = getThemeById(themeId);
  if (!theme) return 0;
  const match = theme.genreAffinities.find(a => a.genre === genre);
  return match ? match.bonus : 0;
}

/**
 * Check if a theme is "mastered" — used 3+ times across film history.
 * Returns usage count.
 */
export function getThemeUsageCount(themeId: MusicalThemeId, soundtrackHistory: SoundtrackHistoryEntry[]): number {
  return soundtrackHistory.filter(e => e.themeId === themeId).length;
}

export function isThemeMastered(themeId: MusicalThemeId, soundtrackHistory: SoundtrackHistoryEntry[]): boolean {
  return getThemeUsageCount(themeId, soundtrackHistory) >= 3;
}

/**
 * Mastered themes get a bigger bonus: +5% extra on top of the affinity bonus.
 */
export const MASTERY_BONUS_PERCENT = 5;

/**
 * Calculate total quality bonus (percentage) for a theme pick.
 * Includes base affinity + mastery bonus if applicable.
 */
export function calculateThemeQualityBonus(
  themeId: MusicalThemeId,
  genre: Genre | string,
  soundtrackHistory: SoundtrackHistoryEntry[],
): number {
  const base = getThemeGenreBonus(themeId, genre);
  const mastered = isThemeMastered(themeId, soundtrackHistory);
  return base + (mastered ? MASTERY_BONUS_PERCENT : 0);
}

// ─── SOUNDTRACK HISTORY ───

export interface SoundtrackHistoryEntry {
  themeId: MusicalThemeId;
  filmTitle: string;
  genre: Genre | string;
  season: number;
  qualityBonusPercent: number; // actual bonus applied
  mastered: boolean;
}

// ─── R179: ORIGINAL COMPOSER SYSTEM (kept for backward compat) ───

export interface SoundtrackProfile {
  composerName: string;
  composerTier: number;
  style: string;
  qualityRating: number;
  qualityBonus: number;
  cost: number;
  // R266: theme data
  themeId?: MusicalThemeId;
  themeBonusPercent?: number;
}

const COMPOSERS: { name: string; tier: number; styles: string[] }[] = [
  { name: 'Danny Synthfeld', tier: 1, styles: ['synth-wave', 'minimalist', 'electronic'] },
  { name: 'Yoko Stringbend', tier: 1, styles: ['minimalist', 'ambient', 'jazz'] },
  { name: 'Rico Bassline', tier: 1, styles: ['jazz', 'funk', 'synth-wave'] },
  { name: 'Petra Humsworth', tier: 1, styles: ['folk', 'minimalist', 'acoustic'] },
  { name: 'Ennio Wavecone', tier: 2, styles: ['orchestral', 'epic choir', 'western'] },
  { name: 'John Scoresworth', tier: 2, styles: ['orchestral', 'adventure', 'epic choir'] },
  { name: 'Trent Razorback', tier: 2, styles: ['industrial', 'synth-wave', 'ambient'] },
  { name: 'Clara Harmonique', tier: 2, styles: ['orchestral', 'jazz', 'romantic'] },
  { name: 'Hans Glimmer', tier: 3, styles: ['orchestral', 'epic choir', 'bombastic'] },
  { name: 'Junko Dreamweave', tier: 3, styles: ['orchestral', 'minimalist', 'ethereal'] },
  { name: 'Ludwig von Beatsworth', tier: 3, styles: ['orchestral', 'epic choir', 'classical'] },
];

const GENRE_STYLES: Record<string, string[]> = {
  Action: ['orchestral', 'epic choir', 'bombastic', 'industrial'],
  Comedy: ['jazz', 'funk', 'acoustic', 'quirky'],
  Drama: ['orchestral', 'minimalist', 'romantic', 'classical'],
  Horror: ['ambient', 'industrial', 'minimalist', 'synth-wave'],
  'Sci-Fi': ['synth-wave', 'electronic', 'orchestral', 'ethereal'],
  Romance: ['romantic', 'jazz', 'orchestral', 'acoustic'],
  Thriller: ['ambient', 'synth-wave', 'industrial', 'minimalist'],
};

function pickStyle(composer: typeof COMPOSERS[0], genre: string, rng: () => number): string {
  const preferred = GENRE_STYLES[genre] || GENRE_STYLES['Drama'];
  const matching = composer.styles.filter(s => preferred.includes(s));
  if (matching.length > 0) return matching[Math.floor(rng() * matching.length)];
  return composer.styles[Math.floor(rng() * composer.styles.length)];
}

export function generateSoundtrackProfile(
  genre: string,
  filmQuality: number,
  hiredComposerName: string | null,
  cost: number,
  rng: () => number,
): SoundtrackProfile {
  let composer: typeof COMPOSERS[0];

  if (hiredComposerName) {
    composer = COMPOSERS.find(c => c.name === hiredComposerName) || COMPOSERS[0];
  } else {
    const tier1 = COMPOSERS.filter(c => c.tier === 1);
    composer = tier1[Math.floor(rng() * tier1.length)];
  }

  const style = pickStyle(composer, genre, rng);

  const tierBase = composer.tier;
  const qualityInfluence = filmQuality >= 40 ? 1 : filmQuality >= 25 ? 0.5 : 0;
  const roll = rng();
  let rating = Math.round(tierBase + roll * 1.5 + qualityInfluence);
  rating = Math.max(1, Math.min(5, rating));

  const qualityBonus = rating >= 5 ? 2 : rating >= 4 ? 1 : 0;

  return {
    composerName: composer.name,
    composerTier: composer.tier,
    style,
    qualityRating: rating,
    qualityBonus,
    cost,
  };
}

export function getComposerOptions(): { name: string; tier: number; cost: number; styles: string[] }[] {
  return COMPOSERS.map(c => ({
    name: c.name,
    tier: c.tier,
    cost: c.tier,
    styles: c.styles,
  }));
}

export function getComposersByTier(tier: number): { name: string; cost: number; styles: string[] }[] {
  return COMPOSERS.filter(c => c.tier === tier).map(c => ({
    name: c.name,
    cost: c.tier,
    styles: c.styles,
  }));
}

export function formatSoundtrackRating(rating: number): string {
  return '🎵'.repeat(rating) + '⬜'.repeat(5 - rating);
}
