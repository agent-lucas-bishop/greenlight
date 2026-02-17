// ─── DIRECTOR PROFILE & AUTEUR SYSTEM (R186) ───
// Tracks the player's directorial identity across a run.
// Signature style emerges from genre choices and card patterns.

import type { Genre, SeasonResult, CardType } from './types';

const STORAGE_KEY = 'greenlight_director_career';

// ─── Style Titles ───

export interface StyleRule {
  id: string;
  title: string;
  emoji: string;
  condition: (ctx: DirectorProfileContext) => boolean;
}

export interface DirectorProfileContext {
  genreCounts: Record<string, number>;
  filmCount: number;
  topGenre: string | null;
  topGenreCount: number;
  uniqueGenres: number;
  avgQuality: number;
  cardTypeCounts: Record<string, number>;
  streak: number; // current same-genre streak
}

const STYLE_RULES: StyleRule[] = [
  { id: 'master_suspense', title: 'Master of Suspense', emoji: '🔪', condition: ctx => (ctx.genreCounts['Thriller'] || 0) + (ctx.genreCounts['Horror'] || 0) >= 3 },
  { id: 'action_auteur', title: 'Action Auteur', emoji: '💥', condition: ctx => (ctx.genreCounts['Action'] || 0) >= 3 },
  { id: 'comedy_king', title: 'Comedy King', emoji: '😂', condition: ctx => (ctx.genreCounts['Comedy'] || 0) >= 3 },
  { id: 'romantic_visionary', title: 'Romantic Visionary', emoji: '💕', condition: ctx => (ctx.genreCounts['Romance'] || 0) >= 3 },
  { id: 'sci_fi_pioneer', title: 'Sci-Fi Pioneer', emoji: '🚀', condition: ctx => (ctx.genreCounts['Sci-Fi'] || 0) >= 3 },
  { id: 'drama_maestro', title: 'Drama Maestro', emoji: '🎭', condition: ctx => (ctx.genreCounts['Drama'] || 0) >= 3 },
  { id: 'genre_bender', title: 'Genre-Bender', emoji: '🌀', condition: ctx => ctx.uniqueGenres >= 4 && ctx.filmCount >= 4 },
  { id: 'consistent_auteur', title: 'Consistent Auteur', emoji: '🎯', condition: ctx => ctx.streak >= 3 },
  { id: 'blockbuster_machine', title: 'Blockbuster Machine', emoji: '💰', condition: ctx => ctx.avgQuality >= 30 && ctx.filmCount >= 3 },
  { id: 'rising_talent', title: 'Rising Talent', emoji: '📈', condition: ctx => ctx.filmCount >= 2 && ctx.filmCount < 4 },
  { id: 'newcomer', title: 'Newcomer', emoji: '🎬', condition: () => true }, // fallback
];

// ─── Director Profile ───

export interface DirectorProfile {
  styleTitle: string;
  styleEmoji: string;
  styleId: string;
  directorRating: number; // 0-100 aggregate quality rating
  stylePoints: number; // from genre consistency
  versatilityPoints: number; // from genre switching
  genreStreak: number; // current consecutive same-genre count
  lastGenre: string | null;
  filmography: { genre: string; quality: number; title: string }[];
  signature: string; // procedurally generated director signature
}

export function buildDirectorProfile(seasonHistory: SeasonResult[], cardTypeCounts?: Record<string, number>): DirectorProfile {
  const genreCounts: Record<string, number> = {};
  const filmography: { genre: string; quality: number; title: string }[] = [];
  let totalQuality = 0;

  for (const s of seasonHistory) {
    genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1;
    totalQuality += s.quality;
    filmography.push({ genre: s.genre, quality: s.quality, title: s.title });
  }

  const filmCount = seasonHistory.length;
  const avgQuality = filmCount > 0 ? totalQuality / filmCount : 0;
  const uniqueGenres = Object.keys(genreCounts).length;

  // Find top genre
  let topGenre: string | null = null;
  let topGenreCount = 0;
  for (const [g, c] of Object.entries(genreCounts)) {
    if (c > topGenreCount) { topGenre = g; topGenreCount = c; }
  }

  // Calculate genre streak (consecutive same genre from the end)
  let streak = 0;
  let lastGenre: string | null = null;
  if (filmCount > 0) {
    lastGenre = seasonHistory[filmCount - 1].genre;
    for (let i = filmCount - 1; i >= 0; i--) {
      if (seasonHistory[i].genre === lastGenre) streak++;
      else break;
    }
  }

  // Style points: +1 per consecutive same-genre film beyond the first
  let stylePoints = 0;
  let currentStreak = 1;
  for (let i = 1; i < filmCount; i++) {
    if (seasonHistory[i].genre === seasonHistory[i - 1].genre) {
      currentStreak++;
      stylePoints += currentStreak - 1; // +1 for 2nd, +2 for 3rd, etc.
    } else {
      currentStreak = 1;
    }
  }

  // Versatility points: +1 per genre switch
  let versatilityPoints = 0;
  for (let i = 1; i < filmCount; i++) {
    if (seasonHistory[i].genre !== seasonHistory[i - 1].genre) {
      versatilityPoints++;
    }
  }

  // Director rating: weighted average quality, normalized to 0-100
  // Uses a "Rotten Tomatoes"-style aggregate
  const directorRating = filmCount > 0
    ? Math.min(100, Math.max(0, Math.round((avgQuality / 40) * 100)))
    : 0;

  // Determine style title
  const ctx: DirectorProfileContext = {
    genreCounts, filmCount, topGenre, topGenreCount, uniqueGenres, avgQuality,
    cardTypeCounts: cardTypeCounts || {},
    streak,
  };

  const matchedStyle = STYLE_RULES.find(r => r.condition(ctx)) || STYLE_RULES[STYLE_RULES.length - 1];

  // Generate signature
  const signature = generateSignature(matchedStyle.id, topGenre || 'Drama');

  return {
    styleTitle: matchedStyle.title,
    styleEmoji: matchedStyle.emoji,
    styleId: matchedStyle.id,
    directorRating,
    stylePoints,
    versatilityPoints,
    genreStreak: streak,
    lastGenre,
    filmography,
    signature,
  };
}

// ─── Quality Bonus from Style/Versatility ───

export function getDirectorStyleBonus(seasonHistory: SeasonResult[], currentGenre: Genre): { qualityBonus: number; budgetDiscount: number; label: string } {
  if (seasonHistory.length === 0) return { qualityBonus: 0, budgetDiscount: 0, label: '' };

  // Count consecutive same-genre streak ending at current position
  let streak = 0;
  for (let i = seasonHistory.length - 1; i >= 0; i--) {
    if (seasonHistory[i].genre === currentGenre) streak++;
    else break;
  }

  // Style bonus: +1 for 3-streak, +2 for 5+
  if (streak >= 5) return { qualityBonus: 2, budgetDiscount: 0, label: `Auteur Style +2 (${streak} ${currentGenre} streak)` };
  if (streak >= 3) return { qualityBonus: 1, budgetDiscount: 0, label: `Auteur Style +1 (${streak} ${currentGenre} streak)` };

  // Versatility: if switching genres, count unique genres
  const lastGenre = seasonHistory[seasonHistory.length - 1]?.genre;
  if (lastGenre && lastGenre !== currentGenre) {
    const genres = new Set(seasonHistory.map(s => s.genre));
    genres.add(currentGenre);
    if (genres.size >= 3) return { qualityBonus: 0, budgetDiscount: 2, label: `Versatility Discount -$2M (${genres.size} genres)` };
  }

  return { qualityBonus: 0, budgetDiscount: 0, label: '' };
}

// ─── Procedural Signature ───

const SIGNATURE_PARTS: Record<string, string[]> = {
  master_suspense: ['Shadow', 'Tension', 'Dread', 'Silence'],
  action_auteur: ['Impact', 'Velocity', 'Thunder', 'Blaze'],
  comedy_king: ['Wit', 'Charm', 'Spark', 'Joy'],
  romantic_visionary: ['Heart', 'Grace', 'Bloom', 'Light'],
  sci_fi_pioneer: ['Nova', 'Quantum', 'Horizon', 'Arc'],
  drama_maestro: ['Depth', 'Truth', 'Soul', 'Weight'],
  genre_bender: ['Flux', 'Prism', 'Shift', 'Mosaic'],
  consistent_auteur: ['Focus', 'Craft', 'Vision', 'Lens'],
  blockbuster_machine: ['Gold', 'Crown', 'Peak', 'Titan'],
  rising_talent: ['Dawn', 'Spark', 'Rise', 'Glow'],
  newcomer: ['Fresh', 'New', 'First', 'Start'],
};

const GENRE_FLOURISHES: Record<string, string[]> = {
  Action: ['⚔️', '🔥', '💥'],
  Comedy: ['✨', '🎉', '😄'],
  Drama: ['🎭', '🖤', '📖'],
  Horror: ['🌑', '🕯️', '💀'],
  'Sci-Fi': ['🌌', '⚡', '🔮'],
  Romance: ['💫', '🌹', '💝'],
  Thriller: ['🔍', '🌀', '🗡️'],
};

function generateSignature(styleId: string, topGenre: string): string {
  const parts = SIGNATURE_PARTS[styleId] || SIGNATURE_PARTS['newcomer'];
  const flourishes = GENRE_FLOURISHES[topGenre] || ['🎬'];
  // Deterministic pick based on styleId + genre hash
  const hash = (styleId + topGenre).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const word = parts[hash % parts.length];
  const flourish = flourishes[hash % flourishes.length];
  return `${flourish} ${word} Films ${flourish}`;
}

// ─── Career Tracking (localStorage) ───

export interface DirectorCareer {
  bestRating: number;
  mostCommonStyle: string;
  styleCounts: Record<string, number>;
  totalFilms: number;
}

export function getDirectorCareer(): DirectorCareer {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { bestRating: 0, mostCommonStyle: 'Newcomer', styleCounts: {}, totalFilms: 0 };
}

export function recordDirectorRun(profile: DirectorProfile): void {
  const career = getDirectorCareer();
  career.bestRating = Math.max(career.bestRating, profile.directorRating);
  career.styleCounts[profile.styleTitle] = (career.styleCounts[profile.styleTitle] || 0) + 1;
  career.totalFilms += profile.filmography.length;

  // Find most common style
  let maxCount = 0;
  for (const [style, count] of Object.entries(career.styleCounts)) {
    if (count > maxCount) { maxCount = count; career.mostCommonStyle = style; }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(career));
  } catch {}
}
