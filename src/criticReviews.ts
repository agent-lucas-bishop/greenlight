// Critic Reviews System (R302)
// Generates deterministic, flavorful critic reviews based on film quality

import type { Genre } from './types';

// ── Critic Personas ──────────────────────────────────────────────────────────

export interface CriticPersona {
  name: string;
  publication: string;
}

export const CRITICS: CriticPersona[] = [
  { name: 'Margaret Chen', publication: 'The Hollywood Chronicle' },
  { name: 'David Rosenblatt', publication: 'CineScope Magazine' },
  { name: 'Aisha Okafor', publication: 'Screen & Sound' },
  { name: 'Rex Thornton', publication: 'The Film Ledger' },
  { name: 'Valentina Marchetti', publication: 'Celluloid Weekly' },
  { name: 'James Whitfield', publication: 'The Reel Report' },
  { name: 'Priya Sundaram', publication: 'Montage Review' },
  { name: 'Oscar Delgado', publication: 'Frame by Frame' },
  { name: 'Eleanor Bright', publication: 'The Picture Post' },
  { name: 'Marcus Tan', publication: 'Digital Cinema Digest' },
  { name: 'Sofia Petrov', publication: 'Art House Quarterly' },
  { name: 'Charles Beaumont', publication: 'The Evening Critic' },
  { name: 'Naomi Ito', publication: 'FilmFront' },
  { name: 'Gerald Fitzpatrick', publication: 'The Silver Screen' },
  { name: 'Lena Johansson', publication: 'Nordic Film Review' },
  { name: 'Antoine Dubois', publication: 'Cahiers du Cinéaste' },
  { name: 'Rachel Goldstein', publication: 'Metropolitan Arts' },
  { name: 'Kwame Asante', publication: 'Global Cinema Watch' },
  { name: 'Beatrice Harlow', publication: 'Premiere Insider' },
  { name: 'Tomás Reyes', publication: 'The Screening Room' },
  { name: 'Diana Volkov', publication: 'Dissolve Magazine' },
  { name: 'William Hurst', publication: 'The Broadsheet Review' },
  { name: 'Mei-Lin Wu', publication: 'Pacific Film Journal' },
  { name: 'Patrick O\'Malley', publication: 'Popcorn Confidential' },
  { name: 'Ingrid Sørensen', publication: 'The Auteur\'s Lens' },
  { name: 'Roberto Flores', publication: 'Cinema Nuevo' },
  { name: 'Hannah Castellan', publication: 'The Daily Frame' },
  { name: 'Sanjay Mehta', publication: 'Bollywood & Beyond' },
  { name: 'Colette Moreau', publication: 'Lumière Critique' },
  { name: 'Trevor Banks', publication: 'Midnight Movie Review' },
];

// ── Deterministic hash ───────────────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// ── Genre-contextual review templates ────────────────────────────────────────

const GENRE_NOUNS: Record<Genre, string[]> = {
  Action: ['setpieces', 'stunts', 'adrenaline', 'spectacle', 'fight choreography'],
  Comedy: ['gags', 'wit', 'comedic timing', 'laughs', 'humor'],
  Drama: ['performances', 'emotional depth', 'character work', 'nuance', 'gravitas'],
  Horror: ['scares', 'tension', 'atmosphere', 'dread', 'terror'],
  'Sci-Fi': ['world-building', 'vision', 'imagination', 'concepts', 'ambition'],
  Romance: ['chemistry', 'tenderness', 'heart', 'passion', 'intimacy'],
  Thriller: ['suspense', 'twists', 'tension', 'pacing', 'intrigue'],
};

const GLOWING_TEMPLATES: string[] = [
  'A masterpiece that redefines the {genre} genre. The {noun} alone are worth the price of admission.',
  'Breathtaking. Every frame pulses with {noun} that will leave audiences speechless.',
  'This is why we go to the movies. Extraordinary {noun} from start to finish.',
  'A triumph of cinema. The {noun} set a new standard for {genre} filmmaking.',
  'Instant classic. The kind of {noun} that remind you why {genre} matters.',
  'A towering achievement. The {noun} are nothing short of miraculous.',
  'Dazzling and deeply felt. The {noun} elevate this into the stratosphere.',
  'Pure cinematic magic. The {noun} had me on the edge of my seat the entire time.',
  'A revelation. This film\'s {noun} will be studied for years to come.',
  'Absolutely electric. The {noun} crackle with an energy rarely seen in {genre}.',
];

const MIXED_TEMPLATES: string[] = [
  'Ambitious but uneven. The {noun} impress, though the film stumbles in its second half.',
  'A solid {genre} entry with flashes of brilliance. The {noun} occasionally dazzle, but inconsistency holds it back.',
  'There\'s a great film buried in here somewhere. The {noun} hint at what could have been.',
  'Competent {genre} fare with moments of genuine {noun}, but it never quite finds its voice.',
  'Worth seeing for the {noun} alone, even if the whole doesn\'t quite come together.',
  'A mixed bag. When the {noun} land, they soar — but those moments are too infrequent.',
  'Passable entertainment. The {noun} are serviceable but rarely surprising.',
  'Workmanlike {genre} with decent {noun}. Not bad, not great — just there.',
  'Shows promise but can\'t sustain it. The {noun} peak early and coast from there.',
  'An interesting misfire. The {noun} reach for greatness but grasp only adequacy.',
];

const HARSH_TEMPLATES: string[] = [
  'A colossal misfire. The {noun} are so misjudged it borders on parody.',
  'Painful to sit through. Whatever passed for {noun} here should be classified as a war crime.',
  'This film makes a compelling argument against the {genre} genre entirely.',
  'Dead on arrival. The {noun} have all the vitality of a tax audit.',
  'A masterclass in how not to make a {genre} film. The {noun} are simply baffling.',
  'I want my two hours back. The {noun} are an insult to audiences everywhere.',
  'Staggeringly bad. The {noun} suggest no one involved had ever seen a {genre} film before.',
  'A train wreck you can\'t look away from — though you desperately want to.',
  'Somehow manages to be both boring and offensive. The {noun} are nonexistent.',
  'The cinematic equivalent of a migraine. Save your money.',
];

// ── Review Generation ────────────────────────────────────────────────────────

export interface CriticReview {
  criticName: string;
  publication: string;
  quote: string;
  stars: number; // 0.5 to 5, in 0.5 increments
  fresh: boolean; // true if 3+ stars
}

export interface CriticConsensus {
  freshPercent: number;
  avgStars: number;
  reviews: CriticReview[];
}

export function generateCriticReviews(
  quality: number,
  _tier: string,
  genre: string,
  title: string,
): CriticConsensus {
  const g = genre as Genre;
  const nouns = GENRE_NOUNS[g] || GENRE_NOUNS['Drama'];
  const seed = hashStr(title + genre);
  const rand = seededRandom(seed);

  // Pick 2-3 critics deterministically
  const numReviews = rand() > 0.5 ? 3 : 2;
  const criticIndices: number[] = [];
  const pool = [...Array(CRITICS.length).keys()];
  // Shuffle pool with seed
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (let i = 0; i < numReviews; i++) {
    criticIndices.push(pool[i]);
  }

  const reviews: CriticReview[] = criticIndices.map(ci => {
    const critic = CRITICS[ci];
    const reviewSeed = hashStr(title + critic.name);
    const rr = seededRandom(reviewSeed);

    // Determine star rating based on quality with per-critic variance
    const variance = (rr() - 0.5) * 20; // ±10 quality variance per critic
    const effectiveQuality = Math.max(0, Math.min(100, quality + variance));

    // Map quality to stars (0.5-5 in 0.5 increments)
    let stars: number;
    if (effectiveQuality >= 90) stars = 5;
    else if (effectiveQuality >= 80) stars = 4.5;
    else if (effectiveQuality >= 70) stars = 4;
    else if (effectiveQuality >= 60) stars = 3.5;
    else if (effectiveQuality >= 50) stars = 3;
    else if (effectiveQuality >= 40) stars = 2.5;
    else if (effectiveQuality >= 30) stars = 2;
    else if (effectiveQuality >= 20) stars = 1.5;
    else if (effectiveQuality >= 10) stars = 1;
    else stars = 0.5;

    // Pick template based on effective quality
    let templates: string[];
    if (effectiveQuality >= 80) templates = GLOWING_TEMPLATES;
    else if (effectiveQuality >= 50) templates = MIXED_TEMPLATES;
    else templates = HARSH_TEMPLATES;

    const templateIdx = Math.floor(rr() * templates.length);
    const nounIdx = Math.floor(rr() * nouns.length);
    const quote = templates[templateIdx]
      .replace(/\{noun\}/g, nouns[nounIdx])
      .replace(/\{genre\}/g, genre);

    return {
      criticName: critic.name,
      publication: critic.publication,
      quote,
      stars,
      fresh: stars >= 3,
    };
  });

  // Aggregate score
  const freshCount = reviews.filter(r => r.fresh).length;
  const freshPercent = Math.round((freshCount / reviews.length) * 100);
  const avgStars = Math.round((reviews.reduce((s, r) => s + r.stars, 0) / reviews.length) * 10) / 10;

  return { freshPercent, avgStars, reviews };
}

// ── Stars display helper ─────────────────────────────────────────────────────

export function starsToDisplay(stars: number): string {
  const full = Math.floor(stars);
  const half = stars % 1 >= 0.5;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
}

// ── localStorage Archive ─────────────────────────────────────────────────────

const STORAGE_KEY = 'gl_critic_reviews';

export interface ArchivedReview {
  filmTitle: string;
  genre: string;
  quality: number;
  season: number;
  freshPercent: number;
  avgStars: number;
  reviews: CriticReview[];
  timestamp: number;
}

export function saveReviewsToArchive(
  filmTitle: string,
  genre: string,
  quality: number,
  season: number,
  consensus: CriticConsensus,
): void {
  const archive = getReviewArchive();
  // Don't duplicate
  if (archive.some(a => a.filmTitle === filmTitle && a.season === season)) return;
  archive.push({
    filmTitle,
    genre,
    quality,
    season,
    freshPercent: consensus.freshPercent,
    avgStars: consensus.avgStars,
    reviews: consensus.reviews,
    timestamp: Date.now(),
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(archive));
  } catch { /* quota */ }
}

export function getReviewArchive(): ArchivedReview[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearReviewArchive(): void {
  localStorage.removeItem(STORAGE_KEY);
}
