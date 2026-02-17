// ─── STUDIO IDENTITY ───
// Stored in localStorage separately from game saves.
// Persists across runs — this is the player's permanent studio brand.

const STORAGE_KEY = 'greenlight_studio_identity';

export const STUDIO_LOGOS = ['🎬', '🎥', '🎞️', '🎪', '🌟', '⚡', '🔥', '🎭'] as const;
export type StudioLogo = typeof STUDIO_LOGOS[number];

export const DEFAULT_STUDIO_NAMES = [
  'Midnight Pictures',
  'Neon Reel Studios',
  'Velvet Curtain Films',
  'Electric Dream Studios',
  'Silver Screen Collective',
  'Crimson Gate Pictures',
  'Stardust Cinema',
  'Iron Lantern Films',
  'Golden Hour Studios',
  'Phantom Light Pictures',
];

export interface StudioIdentity {
  name: string;
  logo: StudioLogo;
}

export function getStudioIdentity(): StudioIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStudioIdentity(identity: StudioIdentity): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {}
}

export function hasStudioIdentity(): boolean {
  return getStudioIdentity() !== null;
}

export function getRandomDefaultName(): string {
  return DEFAULT_STUDIO_NAMES[Math.floor(Math.random() * DEFAULT_STUDIO_NAMES.length)];
}

// ─── RUN NAMING ───
// Auto-generate a run title based on performance

export function generateRunTitle(
  seasonHistory: { tier: string; genre: string }[],
  totalEarnings: number,
  reputation: number,
  studioName: string,
): string {
  if (seasonHistory.length === 0) return 'The Untold Story';

  const allBlockbusters = seasonHistory.every(s => s.tier === 'BLOCKBUSTER');
  const allFlops = seasonHistory.every(s => s.tier === 'FLOP');
  const highPrestige = reputation >= 5 && totalEarnings > 150;

  if (allBlockbusters) return 'The Golden Era';
  if (allFlops) return 'The Dark Times';
  if (highPrestige) return `The Legacy of ${studioName}`;

  // Mixed — find most common genre
  const genreCounts: Record<string, number> = {};
  for (const s of seasonHistory) {
    genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1;
  }
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0][0];
  return `The ${topGenre} Years`;
}
