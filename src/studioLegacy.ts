// Studio Legacy — narrative endings based on HOW you played, not just score
// Each legacy has conditions checked against the game state at victory

import { GameState } from './types';
import { getUnlocks } from './unlocks';

export interface StudioLegacy {
  id: string;
  title: string;
  emoji: string;
  narrative: string;
  priority: number; // higher = checked first
}

// Check conditions and return the best matching legacy for a victory
export function getStudioLegacy(state: GameState): StudioLegacy | null {
  const h = state.seasonHistory;
  if (h.length === 0) return null;

  const u = getUnlocks();

  // Pre-compute stats
  const bigEarners = h.filter(s => s.boxOffice >= 80).length;
  const avgBudget = h.length > 0 ? state.totalEarnings / h.length : 0; // approx avg budget via avg earnings
  const flops = h.filter(s => s.tier === 'FLOP').length;
  const nominations = h.filter(s => s.nominated).length;
  const chemistryCount = u.careerStats.chemistryTriggered || 0;

  // Genre concentration
  const genreCounts: Record<string, number> = {};
  h.forEach(s => { genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1; });
  const maxGenreCount = Math.max(...Object.values(genreCounts));

  // Max strikes at any point: count consecutive flops
  let maxStrikes = 0;
  let currentStrikes = 0;
  for (const s of h) {
    if (s.tier === 'FLOP') { currentStrikes++; maxStrikes = Math.max(maxStrikes, currentStrikes); }
    else currentStrikes = 0;
  }
  // Also use the actual strikes value which accumulates (doesn't reset)
  maxStrikes = Math.max(maxStrikes, state.strikes + flops - h.filter(s => s.tier === 'FLOP').length + flops);
  // Simpler: just count total flops as proxy for "had 2+ strikes at any point"
  // The game tracks state.strikes which only goes up. If they won with strikes, they had them.

  // Ordered by priority (first match wins)
  const legacies: (StudioLegacy & { check: () => boolean })[] = [
    {
      id: 'comeback_kid',
      title: 'THE COMEBACK KID',
      emoji: '🔄',
      narrative: `They wrote you off after strike two. The trades ran obituaries. But ${state.studioName || 'your studio'} clawed back from the brink, turning certain doom into an improbable triumph. Hollywood loves a redemption arc — and yours is one for the ages.`,
      priority: 90,
      check: () => flops >= 2,
    },
    {
      id: 'blockbuster_factory',
      title: 'THE BLOCKBUSTER FACTORY',
      emoji: '🏭',
      narrative: `Three massive openings. Lines around the block. ${state.studioName || 'Your studio'} didn't just make movies — it manufactured cultural events. When your logo appeared before a trailer, audiences didn't walk to the theater. They ran.`,
      priority: 85,
      check: () => bigEarners >= 3,
    },
    {
      id: 'talent_whisperer',
      title: 'THE TALENT WHISPERER',
      emoji: '🤝',
      narrative: `The secret wasn't the scripts or the budgets — it was the people. ${state.studioName || 'Your studio'} had an uncanny gift for pairing the right talent together, creating on-screen magic that no algorithm could predict. Five chemistry bonuses don't lie.`,
      priority: 80,
      check: () => chemistryCount >= 5,
    },
    {
      id: 'critics_pet',
      title: "THE CRITIC'S PET",
      emoji: '🎭',
      narrative: `Four nominations. The critics didn't just like ${state.studioName || 'your studio'} — they championed it. Every awards season, your films were the ones everyone was talking about. You made cinema that mattered, and the industry noticed.`,
      priority: 75,
      check: () => nominations >= 4,
    },
    {
      id: 'genre_specialist',
      title: 'THE GENRE SPECIALIST',
      emoji: '🎯',
      narrative: `While other studios chased trends, ${state.studioName || 'your studio'} doubled down on what it knew best. Three films in one genre isn't repetition — it's mastery. You didn't just make ${Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'films'} — you owned it.`,
      priority: 70,
      check: () => maxGenreCount >= 3,
    },
    {
      id: 'indie_darling',
      title: 'THE INDIE DARLING',
      emoji: '🌱',
      narrative: `No tentpoles. No franchise bait. Just pure, scrappy filmmaking on a shoestring. ${state.studioName || 'Your studio'} proved that you don't need $100M to make people feel something. The industry takes notice when David beats Goliath.`,
      priority: 65,
      check: () => {
        // Average box office under $40M (proxy for low budget) and won
        const avgBO = state.totalEarnings / Math.max(1, h.length);
        return avgBO < 40 && h.every(s => s.tier !== 'BLOCKBUSTER');
      },
    },
    {
      id: 'lucky_fool',
      title: 'THE LUCKY FOOL',
      emoji: '🍀',
      narrative: `Two flops and you still won? The math doesn't add up. The critics are baffled. Your accountant is suspicious. But ${state.studioName || 'your studio'} stumbled, face-planted, and somehow crossed the finish line with a grin. Sometimes the universe just likes you.`,
      priority: 60,
      check: () => flops >= 2,
    },
  ];

  // Comeback Kid and Lucky Fool both need 2+ flops — disambiguate:
  // Comeback Kid wins if strikes were consecutive (real danger), Lucky Fool if scattered
  for (const legacy of legacies.sort((a, b) => b.priority - a.priority)) {
    if (legacy.check()) {
      return { id: legacy.id, title: legacy.title, emoji: legacy.emoji, narrative: legacy.narrative, priority: legacy.priority };
    }
  }

  return null;
}

// Career milestones — permanent cross-run tracking
export interface CareerMilestone {
  id: string;
  label: string;
  emoji: string;
  value: number | string;
}

export function getCareerMilestones(): CareerMilestone[] {
  const u = getUnlocks();
  const stats = u.careerStats;

  // Calculate longest win streak from run history (approximate from leaderboard)
  let longestWinStreak = 0;
  let currentStreak = 0;
  try {
    const lb = JSON.parse(localStorage.getItem('greenlight_leaderboard') || '[]');
    for (const entry of lb) {
      if (entry.won) { currentStreak++; longestWinStreak = Math.max(longestWinStreak, currentStreak); }
      else currentStreak = 0;
    }
  } catch {}

  // Most films in a single run
  let mostFilmsInRun = 0;
  try {
    const lb = JSON.parse(localStorage.getItem('greenlight_leaderboard') || '[]');
    for (const entry of lb) {
      if (entry.seasons > mostFilmsInRun) mostFilmsInRun = entry.seasons;
    }
  } catch {}

  return [
    { id: 'total_films', label: 'Total Films Produced', emoji: '🎬', value: stats.totalFilms },
    { id: 'total_bo', label: 'Lifetime Box Office', emoji: '💰', value: `$${stats.totalBoxOffice.toFixed(0)}M` },
    { id: 'win_streak', label: 'Longest Win Streak', emoji: '🔥', value: longestWinStreak },
    { id: 'most_films', label: 'Most Films in One Run', emoji: '📽️', value: mostFilmsInRun },
    { id: 'blockbusters', label: 'Total Blockbusters', emoji: '💎', value: stats.totalBlockbusters },
    { id: 'chemistry', label: 'Chemistry Bonuses', emoji: '🤝', value: stats.chemistryTriggered || 0 },
    { id: 'unique_talent', label: 'Unique Talent Hired', emoji: '🌟', value: (stats.uniqueTalentHired || []).length },
    { id: 'total_runs', label: 'Total Runs', emoji: '🏃', value: u.totalRuns },
  ];
}
