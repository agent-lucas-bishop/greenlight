// R179: Procedural Soundtrack / Score System

export interface SoundtrackProfile {
  composerName: string;
  composerTier: number; // 1-3 (talent level, correlates with cost)
  style: string;
  qualityRating: number; // 1-5 🎵
  qualityBonus: number; // +0 to +2 added to film quality
  cost: number; // $M spent hiring
}

const COMPOSERS: { name: string; tier: number; styles: string[] }[] = [
  // Tier 1 — budget composers ($1M)
  { name: 'Danny Synthfeld', tier: 1, styles: ['synth-wave', 'minimalist', 'electronic'] },
  { name: 'Yoko Stringbend', tier: 1, styles: ['minimalist', 'ambient', 'jazz'] },
  { name: 'Rico Bassline', tier: 1, styles: ['jazz', 'funk', 'synth-wave'] },
  { name: 'Petra Humsworth', tier: 1, styles: ['folk', 'minimalist', 'acoustic'] },
  // Tier 2 — mid-range ($2M)
  { name: 'Ennio Wavecone', tier: 2, styles: ['orchestral', 'epic choir', 'western'] },
  { name: 'John Scoresworth', tier: 2, styles: ['orchestral', 'adventure', 'epic choir'] },
  { name: 'Trent Razorback', tier: 2, styles: ['industrial', 'synth-wave', 'ambient'] },
  { name: 'Clara Harmonique', tier: 2, styles: ['orchestral', 'jazz', 'romantic'] },
  // Tier 3 — elite ($3M)
  { name: 'Hans Glimmer', tier: 3, styles: ['orchestral', 'epic choir', 'bombastic'] },
  { name: 'Junko Dreamweave', tier: 3, styles: ['orchestral', 'minimalist', 'ethereal'] },
  { name: 'Ludwig von Beatsworth', tier: 3, styles: ['orchestral', 'epic choir', 'classical'] },
];

// Genre → preferred styles mapping
const GENRE_STYLES: Record<string, string[]> = {
  Action: ['orchestral', 'epic choir', 'bombastic', 'industrial'],
  Comedy: ['jazz', 'funk', 'acoustic', 'quirky'],
  Drama: ['orchestral', 'minimalist', 'romantic', 'classical'],
  Horror: ['ambient', 'industrial', 'minimalist', 'synth-wave'],
  'Sci-Fi': ['synth-wave', 'electronic', 'orchestral', 'ethereal'],
  Romance: ['romantic', 'jazz', 'orchestral', 'acoustic'],
  Thriller: ['ambient', 'synth-wave', 'industrial', 'minimalist'],
};

/**
 * Pick the best style for a composer given the film's genre
 */
function pickStyle(composer: typeof COMPOSERS[0], genre: string, rng: () => number): string {
  const preferred = GENRE_STYLES[genre] || GENRE_STYLES['Drama'];
  const matching = composer.styles.filter(s => preferred.includes(s));
  if (matching.length > 0) return matching[Math.floor(rng() * matching.length)];
  return composer.styles[Math.floor(rng() * composer.styles.length)];
}

/**
 * Generate a soundtrack profile.
 * If no composer is hired (cost=0), a random tier-1 composer is assigned for free (lower quality).
 * filmQuality is the raw quality score of the film (used to influence soundtrack rating).
 */
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
    // Free default: random tier-1 composer
    const tier1 = COMPOSERS.filter(c => c.tier === 1);
    composer = tier1[Math.floor(rng() * tier1.length)];
  }

  const style = pickStyle(composer, genre, rng);

  // Quality rating (1-5 🎵):
  // Base from composer tier (1→1-2, 2→2-4, 3→3-5)
  // Film quality adds: high quality films inspire better scores
  const tierBase = composer.tier; // 1, 2, or 3
  const qualityInfluence = filmQuality >= 40 ? 1 : filmQuality >= 25 ? 0.5 : 0;
  const roll = rng(); // 0-1
  let rating = Math.round(tierBase + roll * 1.5 + qualityInfluence);
  rating = Math.max(1, Math.min(5, rating));

  // Quality bonus: rating 4 → +1, rating 5 → +2
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

/**
 * Get available composers for hiring, grouped by tier
 */
export function getComposerOptions(): { name: string; tier: number; cost: number; styles: string[] }[] {
  return COMPOSERS.map(c => ({
    name: c.name,
    tier: c.tier,
    cost: c.tier, // $1M, $2M, $3M
    styles: c.styles,
  }));
}

/**
 * Get composers available at a specific tier
 */
export function getComposersByTier(tier: number): { name: string; cost: number; styles: string[] }[] {
  return COMPOSERS.filter(c => c.tier === tier).map(c => ({
    name: c.name,
    cost: c.tier,
    styles: c.styles,
  }));
}

/**
 * Format quality rating as emoji string
 */
export function formatSoundtrackRating(rating: number): string {
  return '🎵'.repeat(rating) + '⬜'.repeat(5 - rating);
}
