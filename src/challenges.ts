// Challenge Modes — unique rule modifiers for replayability

export interface ChallengeMode {
  id: string;
  name: string;
  emoji: string;
  description: string;
  rules: string[]; // displayed to player
  scoreMultiplier: number; // applied to final score
  unlockRequirement?: string; // shown when locked
  unlockCheck?: (stats: { totalWins: number; challengesCompleted: string[] }) => boolean;
}

export const CHALLENGE_MODES: ChallengeMode[] = [
  {
    id: 'one_take',
    name: 'One Take',
    emoji: '🎥',
    description: 'No wrapping early. You must draw every card.',
    rules: [
      'Cannot wrap production early — must draw all cards',
      'Encore is disabled',
      'Director\'s Cut still available',
    ],
    scoreMultiplier: 1.5,
  },
  {
    id: 'shoestring',
    name: 'Shoestring Budget',
    emoji: '💸',
    description: 'Start with only $8M. Every dollar counts.',
    rules: [
      'Starting budget reduced to $8M (from $15M)',
      'Season stipend reduced to $3M',
      'Shop perk prices +$1',
    ],
    scoreMultiplier: 1.8,
  },
  {
    id: 'critics_choice',
    name: 'Critics\' Choice',
    emoji: '📝',
    description: 'Quality targets are 50% higher. Only excellence survives.',
    rules: [
      'All box office targets ×1.5',
      'FLOP penalty: lose 2 reputation instead of 1',
      'But BLOCKBUSTER gives +$10M extra bonus',
    ],
    scoreMultiplier: 1.6,
  },
  {
    id: 'typecast',
    name: 'Typecast',
    emoji: '🎭',
    description: 'Must make the same genre every season.',
    rules: [
      'Your first script\'s genre locks in for all 5 seasons',
      'Only scripts matching your locked genre appear',
      'Genre mastery accumulates faster (+3 per film instead of +2)',
    ],
    scoreMultiplier: 1.4,
  },
  {
    id: 'speed_run',
    name: 'Speed Run',
    emoji: '⚡',
    description: 'Only 3 seasons to prove yourself.',
    rules: [
      'Game ends after 3 seasons instead of 5',
      'Targets are seasons 2/3/4 difficulty',
      '2 strikes = fired (instead of 3)',
    ],
    scoreMultiplier: 2.0,
  },
  {
    id: 'chaos_reigns',
    name: 'Chaos Reigns',
    emoji: '🌪️',
    description: 'Every talent gets +2 Heat. Incidents everywhere.',
    rules: [
      'All talent Heat increased by 2',
      'More incident cards in every deck',
      'But incidents give +1 quality each',
    ],
    scoreMultiplier: 1.7,
  },
  // ─── NEW CHALLENGE MODES (R68) ───
  {
    id: 'auteur',
    name: 'Auteur Mode',
    emoji: '🎬',
    description: 'One director for the entire run. Their vision, your studio.',
    rules: [
      'Only 1 Director allowed on your roster for the entire run',
      'That director must direct every film',
      'Each consecutive film with same director: +3 quality bonus',
      'Firing your director costs $10M and 1 reputation',
    ],
    scoreMultiplier: 1.6,
    unlockRequirement: 'Win 1 run',
    unlockCheck: (stats) => stats.totalWins >= 1,
  },
  {
    id: 'budget_hell',
    name: 'Budget Hell',
    emoji: '🔥',
    description: 'Start broke. Everything costs more. But the box office rewards...',
    rules: [
      'Starting budget: $5M (instead of $15M)',
      'All talent hiring costs +$2',
      'All perk costs +$2',
      'Box office multiplier ×1.5 on all films',
    ],
    scoreMultiplier: 2.0,
    unlockRequirement: 'Win 2 runs',
    unlockCheck: (stats) => stats.totalWins >= 2,
  },
  {
    id: 'critics_only',
    name: 'Critics Only',
    emoji: '⭐',
    description: 'Reputation is everything. Reach 5 stars to win.',
    rules: [
      'Win condition: reach 5-star reputation (not just survive)',
      'Box office doesn\'t count toward winning — only reputation',
      'Reputation gains +1 from every HIT or better',
      'Reputation loss doubled on FLOPs (-2 instead of -1)',
      'You still need money to make films!',
    ],
    scoreMultiplier: 1.8,
    unlockRequirement: 'Complete any challenge',
    unlockCheck: (stats) => stats.challengesCompleted.length >= 1,
  },
  {
    id: 'marathon',
    name: 'Marathon',
    emoji: '🏃',
    description: '8 seasons. The ultimate endurance test.',
    rules: [
      '8 seasons instead of 5',
      'Box office targets scale up: Season 6 = $74M, S7 = $86M, S8 = $98M',
      '4 strikes allowed (instead of 3)',
      'Score multiplier applies to a longer run',
    ],
    scoreMultiplier: 1.5,
    unlockRequirement: 'Win 3 runs',
    unlockCheck: (stats) => stats.totalWins >= 3,
  },
];

export function getChallengeById(id: string): ChallengeMode | undefined {
  return CHALLENGE_MODES.find(c => c.id === id);
}

export function isChallengeUnlocked(challenge: ChallengeMode, stats: { totalWins: number; challengesCompleted: string[] }): boolean {
  if (!challenge.unlockCheck) return true; // original challenges always unlocked
  return challenge.unlockCheck(stats);
}

// ═══════════════════════════════════════════════════════════════════════
// Community Challenges & Weekly Goals (R215)
// Deterministic daily/weekly challenges all players share, tracked in localStorage
// ═══════════════════════════════════════════════════════════════════════

import { mulberry32, getDailySeed, getWeeklySeed, getDailyDateString, getWeeklyDateString } from './seededRng';
import type { Genre, Difficulty } from './types';

export type CommunityChallengeType = 'daily' | 'weekly';

export interface CommunityChallenge {
  id: string;
  type: CommunityChallengeType;
  title: string;
  description: string;
  emoji: string;
  /** XP reward on completion */
  xpReward: number;
  /** Optional: unlocks a special card variant id */
  cardVariantReward?: string;
  /** Condition checker — receives run summary, returns true if satisfied */
  check: (summary: RunSummary) => boolean;
  /** For progress tracking: returns 0-1 progress toward completion */
  progress?: (summary: RunSummary) => number;
  /** Goal number for display (e.g. "3" for "Hire 3 talent") */
  goal?: number;
}

export interface RunSummary {
  won: boolean;
  difficulty: Difficulty;
  genres: Genre[];
  totalEarnings: number;
  maxSingleFilmBO: number;
  filmsProduced: number;
  talentHiredInSeason: number[];  // count per season
  maxTalentHiredInOneSeason: number;
  sRankCount: number;
  hitCount: number;
  blockbusterCount: number;
  flopCount: number;
  reputation: number;
  score: number;
  uniqueGenres: number;
  streakFilmsNoFlop: number;
  seasonsCompleted: number;
  rank: string;
}

// ─── Daily Challenge Pool ───

interface ChallengeTemplate {
  title: string;
  description: string;
  emoji: string;
  xpReward: number;
  cardVariantReward?: string;
  check: (summary: RunSummary) => boolean;
  progress?: (summary: RunSummary) => number;
  goal?: number;
}

const DAILY_CHALLENGE_POOL: ChallengeTemplate[] = [
  {
    title: 'Horror Auteur',
    description: 'Make a Horror film',
    emoji: '🧟',
    xpReward: 50,
    check: (s) => s.genres.includes('Horror'),
    progress: (s) => s.genres.includes('Horror') ? 1 : 0,
  },
  {
    title: 'Action Hero',
    description: 'Make an Action film',
    emoji: '💥',
    xpReward: 50,
    check: (s) => s.genres.includes('Action'),
    progress: (s) => s.genres.includes('Action') ? 1 : 0,
  },
  {
    title: 'Romantic at Heart',
    description: 'Make a Romance film',
    emoji: '💕',
    xpReward: 50,
    check: (s) => s.genres.includes('Romance'),
    progress: (s) => s.genres.includes('Romance') ? 1 : 0,
  },
  {
    title: 'Sci-Fi Visionary',
    description: 'Make a Sci-Fi film',
    emoji: '🚀',
    xpReward: 50,
    check: (s) => s.genres.includes('Sci-Fi'),
    progress: (s) => s.genres.includes('Sci-Fi') ? 1 : 0,
  },
  {
    title: 'Talent Scout',
    description: 'Hire 3 talent in one season',
    emoji: '🔍',
    xpReward: 75,
    check: (s) => s.maxTalentHiredInOneSeason >= 3,
    progress: (s) => Math.min(1, s.maxTalentHiredInOneSeason / 3),
    goal: 3,
  },
  {
    title: 'Box Office Smash',
    description: 'Reach $50M BO on a single film',
    emoji: '💰',
    xpReward: 100,
    check: (s) => s.maxSingleFilmBO >= 50,
    progress: (s) => Math.min(1, s.maxSingleFilmBO / 50),
    goal: 50,
  },
  {
    title: 'Blockbuster Baby',
    description: 'Get a BLOCKBUSTER result',
    emoji: '🎆',
    xpReward: 100,
    check: (s) => s.blockbusterCount >= 1,
    progress: (s) => s.blockbusterCount >= 1 ? 1 : 0,
  },
  {
    title: 'No Flops Allowed',
    description: 'Complete a run with zero FLOPs',
    emoji: '🛡️',
    xpReward: 100,
    check: (s) => s.flopCount === 0 && s.filmsProduced >= 3,
    progress: (s) => s.flopCount === 0 ? 1 : 0,
  },
  {
    title: 'Triple Threat',
    description: 'Produce 3 films in one run',
    emoji: '🎬',
    xpReward: 50,
    check: (s) => s.filmsProduced >= 3,
    progress: (s) => Math.min(1, s.filmsProduced / 3),
    goal: 3,
  },
  {
    title: 'Genre Hopper',
    description: 'Make films in 3 different genres',
    emoji: '🎭',
    xpReward: 75,
    check: (s) => s.uniqueGenres >= 3,
    progress: (s) => Math.min(1, s.uniqueGenres / 3),
    goal: 3,
  },
  {
    title: 'Centimillionaire',
    description: 'Earn $100M total box office',
    emoji: '🏦',
    xpReward: 100,
    check: (s) => s.totalEarnings >= 100,
    progress: (s) => Math.min(1, s.totalEarnings / 100),
    goal: 100,
  },
  {
    title: 'Critical Darling',
    description: 'Achieve S-rank on a film',
    emoji: '⭐',
    xpReward: 100,
    check: (s) => s.sRankCount >= 1,
    progress: (s) => s.sRankCount >= 1 ? 1 : 0,
  },
  {
    title: 'Crowd Pleaser',
    description: 'Get 3 HITs or better in one run',
    emoji: '👏',
    xpReward: 75,
    check: (s) => s.hitCount >= 3,
    progress: (s) => Math.min(1, s.hitCount / 3),
    goal: 3,
  },
  {
    title: 'Comedy Night',
    description: 'Make a Comedy film',
    emoji: '😂',
    xpReward: 50,
    check: (s) => s.genres.includes('Comedy'),
    progress: (s) => s.genres.includes('Comedy') ? 1 : 0,
  },
  {
    title: 'Drama Queen',
    description: 'Make a Drama film',
    emoji: '🎭',
    xpReward: 50,
    check: (s) => s.genres.includes('Drama'),
    progress: (s) => s.genres.includes('Drama') ? 1 : 0,
  },
  {
    title: 'Thriller Master',
    description: 'Make a Thriller film',
    emoji: '🔪',
    xpReward: 50,
    check: (s) => s.genres.includes('Thriller'),
    progress: (s) => s.genres.includes('Thriller') ? 1 : 0,
  },
  {
    title: 'Five Star Studio',
    description: 'Reach 5 reputation',
    emoji: '🌟',
    xpReward: 100,
    check: (s) => s.reputation >= 5,
    progress: (s) => Math.min(1, s.reputation / 5),
    goal: 5,
  },
  {
    title: 'Survivor',
    description: 'Complete all 5 seasons',
    emoji: '🏁',
    xpReward: 75,
    check: (s) => s.seasonsCompleted >= 5,
    progress: (s) => Math.min(1, s.seasonsCompleted / 5),
    goal: 5,
  },
];

// ─── Weekly Challenge Pool ───

const WEEKLY_CHALLENGE_POOL: ChallengeTemplate[] = [
  {
    title: 'Mogul Victory',
    description: 'Win on Mogul difficulty',
    emoji: '👑',
    xpReward: 300,
    cardVariantReward: 'gold_director',
    check: (s) => s.won && s.difficulty === 'mogul',
  },
  {
    title: 'Action-Only Run',
    description: 'Complete a run making only Action films',
    emoji: '🎬💥',
    xpReward: 250,
    cardVariantReward: 'chrome_action',
    check: (s) => s.won && s.genres.length > 0 && s.genres.every(g => g === 'Action'),
  },
  {
    title: 'S-Rank Collector',
    description: 'Achieve S-rank 3 times in one run',
    emoji: '🏆',
    xpReward: 300,
    cardVariantReward: 'prismatic_star',
    check: (s) => s.sRankCount >= 3,
    progress: (s) => Math.min(1, s.sRankCount / 3),
    goal: 3,
  },
  {
    title: 'Genre Master',
    description: 'Make a film in every genre in one run',
    emoji: '🌈',
    xpReward: 250,
    cardVariantReward: 'rainbow_card',
    check: (s) => s.uniqueGenres >= 7,
    progress: (s) => Math.min(1, s.uniqueGenres / 7),
    goal: 7,
  },
  {
    title: 'Mega Mogul',
    description: 'Earn $200M total in a single run',
    emoji: '💎',
    xpReward: 300,
    cardVariantReward: 'diamond_producer',
    check: (s) => s.totalEarnings >= 200,
    progress: (s) => Math.min(1, s.totalEarnings / 200),
    goal: 200,
  },
  {
    title: 'Perfect Run',
    description: 'Win without any FLOPs on Studio+ difficulty',
    emoji: '✨',
    xpReward: 350,
    cardVariantReward: 'holographic_slate',
    check: (s) => s.won && s.flopCount === 0 && (s.difficulty === 'studio' || s.difficulty === 'mogul'),
  },
  {
    title: 'Horror Marathon',
    description: 'Complete a run making only Horror films',
    emoji: '🧟🎬',
    xpReward: 250,
    cardVariantReward: 'blood_horror',
    check: (s) => s.won && s.genres.length > 0 && s.genres.every(g => g === 'Horror'),
  },
  {
    title: 'Score Breaker',
    description: 'Reach a score of 200+',
    emoji: '📊',
    xpReward: 300,
    cardVariantReward: 'neon_score',
    check: (s) => s.score >= 200,
    progress: (s) => Math.min(1, s.score / 200),
    goal: 200,
  },
];

// ─── Deterministic Selection ───

export function getDailyChallenges(): CommunityChallenge[] {
  const seed = getDailySeed();
  const rng = mulberry32(seed ^ 0xDA11C); // unique salt for community challenges
  // Pick 2-3 daily challenges
  const count = rng() < 0.4 ? 2 : 3;
  const indices: number[] = [];
  while (indices.length < count) {
    const idx = Math.floor(rng() * DAILY_CHALLENGE_POOL.length);
    if (!indices.includes(idx)) indices.push(idx);
  }
  const dateStr = getDailyDateString();
  return indices.map((idx, i) => {
    const t = DAILY_CHALLENGE_POOL[idx];
    return {
      id: `daily_${dateStr}_${i}`,
      type: 'daily' as CommunityChallengeType,
      ...t,
      check: t.check,
      progress: t.progress,
    };
  });
}

export function getWeeklyChallenges(): CommunityChallenge[] {
  const seed = getWeeklySeed();
  const rng = mulberry32(seed ^ 0xEE14C);
  const idx = Math.floor(rng() * WEEKLY_CHALLENGE_POOL.length);
  const weekStr = getWeeklyDateString();
  const t = WEEKLY_CHALLENGE_POOL[idx];
  return [{
    id: `weekly_${weekStr}_0`,
    type: 'weekly' as CommunityChallengeType,
    ...t,
    check: t.check,
    progress: t.progress,
  }];
}

// ─── Completion Tracking (localStorage) ───

const COMMUNITY_CHALLENGES_KEY = 'greenlight_community_challenges';
const CHALLENGE_STREAK_KEY = 'greenlight_challenge_streak';
const CHALLENGE_XP_KEY = 'greenlight_challenge_xp';
const CARD_VARIANTS_KEY = 'greenlight_card_variants';

interface CompletionRecord {
  [challengeId: string]: { completedAt: string; xpAwarded: number };
}

function getCompletionRecord(): CompletionRecord {
  try {
    const saved = localStorage.getItem(COMMUNITY_CHALLENGES_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {};
}

function saveCompletionRecord(record: CompletionRecord): void {
  try { localStorage.setItem(COMMUNITY_CHALLENGES_KEY, JSON.stringify(record)); } catch {}
}

export function isCommunityChallCompleted(id: string): boolean {
  return id in getCompletionRecord();
}

export function markCommunityChallCompleted(challenge: CommunityChallenge): void {
  const record = getCompletionRecord();
  if (record[challenge.id]) return; // already done
  record[challenge.id] = { completedAt: new Date().toISOString(), xpAwarded: challenge.xpReward };
  saveCompletionRecord(record);
  // Award XP
  addChallengeXP(challenge.xpReward);
  // Unlock card variant
  if (challenge.cardVariantReward) unlockCardVariant(challenge.cardVariantReward);
  // Update streak
  updateChallengeStreak();
}

// ─── XP ───

export function getChallengeXP(): number {
  try {
    return parseInt(localStorage.getItem(CHALLENGE_XP_KEY) || '0', 10);
  } catch { return 0; }
}

function addChallengeXP(amount: number): void {
  const current = getChallengeXP();
  try { localStorage.setItem(CHALLENGE_XP_KEY, String(current + amount)); } catch {}
}

// ─── Card Variants ───

export function getUnlockedCardVariants(): string[] {
  try {
    const saved = localStorage.getItem(CARD_VARIANTS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function unlockCardVariant(id: string): void {
  const variants = getUnlockedCardVariants();
  if (!variants.includes(id)) {
    variants.push(id);
    try { localStorage.setItem(CARD_VARIANTS_KEY, JSON.stringify(variants)); } catch {}
  }
}

// ─── Streak ───

interface ChallengeStreakData {
  current: number;
  best: number;
  lastDate: string;
}

export function getChallengeStreakData(): ChallengeStreakData {
  try {
    const saved = localStorage.getItem(CHALLENGE_STREAK_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { current: 0, best: 0, lastDate: '' };
}

function updateChallengeStreak(): void {
  const today = getDailyDateString();
  const streak = getChallengeStreakData();
  if (streak.lastDate === today) return;
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const newCurrent = streak.lastDate === yesterday ? streak.current + 1 : 1;
  const data: ChallengeStreakData = {
    current: newCurrent,
    best: Math.max(streak.best, newCurrent),
    lastDate: today,
  };
  try { localStorage.setItem(CHALLENGE_STREAK_KEY, JSON.stringify(data)); } catch {}
}

// ─── Check challenges at end of run ───

export function checkCommunityChallenges(summary: RunSummary): CommunityChallenge[] {
  const all = [...getDailyChallenges(), ...getWeeklyChallenges()];
  const newlyCompleted: CommunityChallenge[] = [];
  for (const c of all) {
    if (isCommunityChallCompleted(c.id)) continue;
    if (c.check(summary)) {
      markCommunityChallCompleted(c);
      newlyCompleted.push(c);
    }
  }
  return newlyCompleted;
}
