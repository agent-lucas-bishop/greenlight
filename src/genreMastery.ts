// Genre Mastery — cumulative cross-run stats per genre
// Tracks: films produced, total box office, avg quality, best film per genre
// Mastery levels: Bronze/Silver/Gold/Platinum based on cumulative box office
// Gold+ genres give +1 quality in future runs

export type MasteryTier = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';

export interface GenreMasteryData {
  genre: string;
  filmsProduced: number;
  totalBoxOffice: number;
  totalQuality: number; // sum of quality for avg calculation
  bestFilm: { title: string; boxOffice: number; quality: number } | null;
}

export interface GenreMasteryState {
  genres: Record<string, GenreMasteryData>;
}

const MASTERY_KEY = 'greenlight_genre_mastery';

export function getGenreMasteryState(): GenreMasteryState {
  try {
    const saved = localStorage.getItem(MASTERY_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { genres: {} };
}

function saveGenreMastery(state: GenreMasteryState) {
  try { localStorage.setItem(MASTERY_KEY, JSON.stringify(state)); } catch {}
}

export const MASTERY_THRESHOLDS: { tier: MasteryTier; label: string; emoji: string; minBoxOffice: number }[] = [
  { tier: 'platinum', label: 'Platinum', emoji: '💎', minBoxOffice: 500 },
  { tier: 'gold', label: 'Gold', emoji: '🥇', minBoxOffice: 250 },
  { tier: 'silver', label: 'Silver', emoji: '🥈', minBoxOffice: 100 },
  { tier: 'bronze', label: 'Bronze', emoji: '🥉', minBoxOffice: 30 },
  { tier: 'none', label: 'Unranked', emoji: '⬜', minBoxOffice: 0 },
];

export function getMasteryTier(totalBoxOffice: number): typeof MASTERY_THRESHOLDS[0] {
  for (const t of MASTERY_THRESHOLDS) {
    if (totalBoxOffice >= t.minBoxOffice) return t;
  }
  return MASTERY_THRESHOLDS[MASTERY_THRESHOLDS.length - 1];
}

export function getGenreMasteryBonus(genre: string): number {
  const state = getGenreMasteryState();
  const data = state.genres[genre];
  if (!data) return 0;
  const tier = getMasteryTier(data.totalBoxOffice);
  // Gold+ = +1 quality bonus
  return (tier.tier === 'gold' || tier.tier === 'platinum') ? 1 : 0;
}

// Record film results at end of run
export interface FilmResult {
  genre: string;
  title: string;
  boxOffice: number;
  quality: number;
}

export function recordGenreMasteryFilms(films: FilmResult[]) {
  const state = getGenreMasteryState();

  for (const film of films) {
    if (!state.genres[film.genre]) {
      state.genres[film.genre] = {
        genre: film.genre,
        filmsProduced: 0,
        totalBoxOffice: 0,
        totalQuality: 0,
        bestFilm: null,
      };
    }
    const g = state.genres[film.genre];
    g.filmsProduced++;
    g.totalBoxOffice += film.boxOffice;
    g.totalQuality += film.quality;
    if (!g.bestFilm || film.boxOffice > g.bestFilm.boxOffice) {
      g.bestFilm = { title: film.title, boxOffice: film.boxOffice, quality: film.quality };
    }
  }

  saveGenreMastery(state);
}

// Get sorted genre stats for display
export function getAllGenreStats(): (GenreMasteryData & { avgQuality: number; tier: typeof MASTERY_THRESHOLDS[0] })[] {
  const state = getGenreMasteryState();
  return Object.values(state.genres)
    .map(g => ({
      ...g,
      avgQuality: g.filmsProduced > 0 ? Math.round(g.totalQuality / g.filmsProduced) : 0,
      tier: getMasteryTier(g.totalBoxOffice),
    }))
    .sort((a, b) => b.totalBoxOffice - a.totalBoxOffice);
}
