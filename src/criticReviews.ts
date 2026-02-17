// Critic reviews generator (R170/R173)

export interface CriticConsensus {
  freshPercent: number;
  avgStars: number;
  reviews: { critic: string; quote: string; score: number }[];
}

export function generateCriticReviews(quality: number, tier: string, genre: string, _title: string): CriticConsensus {
  // Simple quality-to-score mapping
  const freshPercent = Math.min(100, Math.max(0, Math.round(quality * 2 + (tier === 'BLOCKBUSTER' ? 20 : tier === 'SMASH' ? 10 : tier === 'HIT' ? 0 : -20))));
  const avgStars = Math.min(5, Math.max(0.5, quality / 10));
  return { freshPercent, avgStars, reviews: [] };
}
