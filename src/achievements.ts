// Achievements system — persistent cross-run achievements with categories and cosmetic rewards
import { getUnlocks, saveUnlocks, type UnlockState, ENDINGS } from './unlocks';
import type { GameState } from './types';

export type AchievementCategory = 'milestone' | 'skill' | 'discovery' | 'fun' | 'secret';

export interface AchievementDef {
  id: string;
  name: string;
  emoji: string;
  category: AchievementCategory;
  description: string;
  hint: string; // shown when locked
  secret?: boolean; // hidden until unlocked
  cosmeticReward?: CosmeticReward;
  check: (state: GameState, unlocks: UnlockState) => boolean;
  progress?: (state: GameState, unlocks: UnlockState) => { current: number; target: number } | null;
}

export interface CosmeticReward {
  id: string;
  type: 'cardBack' | 'studioPrefix' | 'goldBorder';
  label: string;
  value: string;
}

export const COSMETIC_REWARDS: CosmeticReward[] = [
  { id: 'cardback_crimson', type: 'cardBack', label: 'Crimson Card Back', value: '#8b0000' },
  { id: 'cardback_royal', type: 'cardBack', label: 'Royal Purple Card Back', value: '#6a0dad' },
  { id: 'prefix_legendary', type: 'studioPrefix', label: '"Legendary" Studio Prefix', value: 'Legendary' },
  { id: 'gold_border', type: 'goldBorder', label: 'Gold Border on Start Screen', value: 'true' },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  // ─── Run Milestones ───
  {
    id: 'first_blockbuster',
    name: 'First Blockbuster',
    emoji: '🎬',
    category: 'milestone',
    description: 'Get a BLOCKBUSTER tier on any film',
    hint: 'Make a film that takes the world by storm',
    check: (s) => s.seasonHistory.some(h => h.tier === 'BLOCKBUSTER'),
  },
  {
    id: 'five_star_studio',
    name: '5-Star Studio',
    emoji: '⭐',
    category: 'milestone',
    description: 'All films HIT or better in a single run',
    hint: 'Every film a winner',
    check: (s) => s.seasonHistory.length >= 5 && s.seasonHistory.every(h => h.tier !== 'FLOP') && (s.phase === 'victory'),
  },
  {
    id: 'perfect_run',
    name: 'Perfect Run',
    emoji: '🏆',
    category: 'milestone',
    description: 'Hit every box office target in a run',
    hint: 'Never miss a single target',
    check: (s) => s.seasonHistory.length >= 5 && s.seasonHistory.every(h => h.hitTarget) && (s.phase === 'victory'),
  },
  {
    id: 'underdog',
    name: 'Underdog',
    emoji: '🐕',
    category: 'milestone',
    description: 'Win a run with $0 budget remaining (or in debt)',
    hint: 'Victory from the brink of financial ruin',
    check: (s) => s.phase === 'victory' && s.budget <= 0,
  },
  {
    id: 'half_billion',
    name: 'Half Billion Club',
    emoji: '💰',
    category: 'milestone',
    description: 'Earn $500M+ total in a single run',
    hint: 'Stack that box office cash',
    check: (s) => s.totalEarnings >= 500,
  },
  {
    id: 'box_office_king',
    name: 'Box Office King',
    emoji: '👑',
    category: 'milestone',
    description: 'Earn $100M+ box office on a single film',
    hint: 'One massive opening weekend...',
    check: (s) => s.seasonHistory.some(h => h.boxOffice >= 100),
  },

  // ─── Content Discovery ───
  {
    id: 'full_cast',
    name: 'Full Cast',
    emoji: '🎭',
    category: 'discovery',
    description: 'Hire 15+ unique talent across all runs',
    hint: 'Explore the full talent pool',
    check: (_s, u) => (u.careerStats.uniqueTalentHired?.length || 0) >= 15,
    progress: (_s, u) => ({ current: Math.min(u.careerStats.uniqueTalentHired?.length || 0, 15), target: 15 }),
  },
  {
    id: 'genre_master',
    name: 'Genre Master',
    emoji: '🌈',
    category: 'discovery',
    description: 'Make a film in every genre (across all runs)',
    hint: 'Explore every corner of cinema',
    check: (_s, u) => Object.keys(u.careerStats.genreFilms).length >= 7,
    progress: (_s, u) => ({ current: Object.keys(u.careerStats.genreFilms).length, target: 7 }),
    cosmeticReward: COSMETIC_REWARDS[0],
  },
  {
    id: 'chemistry_lab',
    name: 'Chemistry Lab',
    emoji: '⚗️',
    category: 'discovery',
    description: 'Trigger 10 chemistry bonuses across all runs',
    hint: 'Pair the right talent together',
    check: (_s, u) => (u.careerStats.chemistryTriggered || 0) >= 10,
    progress: (_s, u) => ({ current: Math.min(u.careerStats.chemistryTriggered || 0, 10), target: 10 }),
  },
  {
    id: 'ending_collector',
    name: 'Ending Collector',
    emoji: '📖',
    category: 'discovery',
    description: 'Discover all 6 endings',
    hint: 'Every story has many possible conclusions',
    check: (_s, u) => u.endingsDiscovered.length >= ENDINGS.length,
    progress: (_s, u) => ({ current: u.endingsDiscovered.length, target: ENDINGS.length }),
    cosmeticReward: COSMETIC_REWARDS[1],
  },
  {
    id: 'ten_films',
    name: 'Prolific Producer',
    emoji: '🎥',
    category: 'discovery',
    description: 'Make 10 films across all runs',
    hint: 'Keep making movies',
    check: (_s, u) => u.careerStats.totalFilms >= 10,
    progress: (_s, u) => ({ current: Math.min(u.careerStats.totalFilms, 10), target: 10 }),
  },
  {
    id: 'five_wins',
    name: 'Veteran Studio Head',
    emoji: '🏛️',
    category: 'discovery',
    description: 'Win 5 runs',
    hint: 'Prove this wasn\'t a fluke',
    check: (_s, u) => u.totalWins >= 5,
    progress: (_s, u) => ({ current: Math.min(u.totalWins, 5), target: 5 }),
  },

  // ─── Challenge ───
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    emoji: '⚡',
    category: 'skill',
    description: 'Complete the Speed Run challenge',
    hint: 'Three seasons. No margin for error.',
    check: (_s, u) => u.careerStats.challengesCompleted.includes('speed_run'),
  },
  {
    id: 'auteur_master',
    name: 'Auteur Vision',
    emoji: '🎬',
    category: 'skill',
    description: 'Direct 8+ films with the same director across all Auteur Mode runs',
    hint: 'One director to rule them all.',
    check: (_s, u) => (u.careerStats as any).auteurFilms >= 8,
    progress: (_s, u) => ({ current: Math.min((u.careerStats as any).auteurFilms || 0, 8), target: 8 }),
  },
  {
    id: 'budget_hell_survivor',
    name: 'Penny Pincher',
    emoji: '🔥',
    category: 'skill',
    description: 'Win Budget Hell with $20M+ in the bank',
    hint: 'Start broke, end rich.',
    check: (s, u) => s.phase === 'victory' && s.challengeId === 'budget_hell' && s.budget >= 20,
  },
  {
    id: 'critics_only_perfect',
    name: 'Five Star General',
    emoji: '⭐',
    category: 'skill',
    description: 'Win Critics Only by reaching 5 stars before Season 4',
    hint: 'The fastest path to critical acclaim.',
    check: (s) => s.phase === 'victory' && s.challengeId === 'critics_only' && s.season <= 3,
  },
  {
    id: 'marathon_finisher',
    name: 'Iron Studio',
    emoji: '🏃',
    category: 'skill',
    description: 'Complete Marathon with no FLOPs',
    hint: '8 seasons of pure consistency.',
    check: (s) => s.phase === 'victory' && s.challengeId === 'marathon' && s.seasonHistory.every(h => h.tier !== 'FLOP'),
  },
  {
    id: 'daily_driver',
    name: 'Daily Driver',
    emoji: '📅',
    category: 'skill',
    description: 'Achieve a 7-day daily challenge streak',
    hint: 'Play the daily challenge every day for a week',
    check: (_s, u) => u.dailyStreak.best >= 7,
    progress: (_s, u) => ({ current: Math.min(u.dailyStreak.best, 7), target: 7 }),
  },
  {
    id: 'rival_crusher',
    name: 'Rival Crusher',
    emoji: '💪',
    category: 'skill',
    description: 'Out-earn all 3 rival studios in a single run',
    hint: 'Dominate every rival at once',
    check: (s) => {
      if (s.phase !== 'victory') return false;
      const rivalNames = Object.keys(s.cumulativeRivalEarnings);
      if (rivalNames.length < 3) return false;
      return rivalNames.every(name => s.totalEarnings > (s.cumulativeRivalEarnings[name] || 0));
    },
  },
  {
    id: 'critics_darling',
    name: "Critics' Darling",
    emoji: '🎭',
    category: 'skill',
    description: 'Achieve quality 80+ on a single film',
    hint: 'A true masterpiece awaits',
    check: (s) => s.seasonHistory.some(h => h.quality >= 80),
    cosmeticReward: COSMETIC_REWARDS[2],
  },
  {
    id: 'max_reputation',
    name: 'A-List Studio',
    emoji: '🌟',
    category: 'skill',
    description: 'Reach maximum reputation (5)',
    hint: 'The industry respects you',
    check: (s) => s.reputation >= 5,
  },
  {
    id: 'rank_s',
    name: 'Hollywood Legend',
    emoji: '👑',
    category: 'skill',
    description: 'Achieve S rank on a run',
    hint: 'The highest honor in the business',
    check: (s) => {
      const score = Math.round(s.totalEarnings * s.reputation * (1 + s.seasonHistory.filter(h => h.nominated).length * 0.2));
      return score > 800 && s.phase === 'victory';
    },
    cosmeticReward: COSMETIC_REWARDS[3],
  },

  // ─── Fun ───
  {
    id: 'flop_comeback',
    name: 'Flop Comeback',
    emoji: '🔄',
    category: 'fun',
    description: 'Get a FLOP then a SMASH or BLOCKBUSTER in the same run',
    hint: 'Fall down, get back up swinging',
    check: (s) => {
      let hadFlop = false;
      for (const h of s.seasonHistory) {
        if (h.tier === 'FLOP') hadFlop = true;
        if (hadFlop && (h.tier === 'SMASH' || h.tier === 'BLOCKBUSTER')) return true;
      }
      return false;
    },
  },
  {
    id: 'blockbuster_trio',
    name: 'Blockbuster Trilogy',
    emoji: '🎆',
    category: 'fun',
    description: 'Get 3 Blockbusters in a single run',
    hint: 'A franchise-worthy achievement',
    check: (s) => s.seasonHistory.filter(h => h.tier === 'BLOCKBUSTER').length >= 3,
  },
  {
    id: 'debt_lord',
    name: 'Debt Lord',
    emoji: '💸',
    category: 'fun',
    description: 'Survive a season with $20M+ debt',
    hint: 'Borrow like there\'s no tomorrow',
    check: (s) => s.debt >= 20,
  },
  {
    id: 'one_take_wonder',
    name: 'One Take Wonder',
    emoji: '🎞️',
    category: 'fun',
    description: 'Wrap a film in 5 or fewer card draws',
    hint: 'Sometimes less is more',
    check: (s) => s.production?.isWrapped === true && s.production?.drawCount <= 5 && s.production?.drawCount > 0,
  },

  // ─── Secret ───
  {
    id: 'secret_all_flops',
    name: 'The Disaster Artist',
    emoji: '🎪',
    category: 'secret',
    description: 'Every film in a run is a FLOP (all 5 seasons)',
    hint: '???',
    secret: true,
    check: (s) => s.seasonHistory.length >= 5 && s.seasonHistory.every(h => h.tier === 'FLOP') && (s.phase === 'gameOver' || s.phase === 'victory'),
  },
  {
    id: 'secret_horror_comedy',
    name: 'Scream Laughing',
    emoji: '🤡',
    category: 'secret',
    description: 'Make a Horror film and a Comedy film back-to-back, both BLOCKBUSTER',
    hint: '???',
    secret: true,
    check: (s) => {
      for (let i = 1; i < s.seasonHistory.length; i++) {
        const prev = s.seasonHistory[i - 1];
        const curr = s.seasonHistory[i];
        if (prev.tier === 'BLOCKBUSTER' && curr.tier === 'BLOCKBUSTER') {
          const genres = [prev.genre, curr.genre];
          if (genres.includes('Horror') && genres.includes('Comedy')) return true;
        }
      }
      return false;
    },
  },
  {
    id: 'secret_budget_zero',
    name: 'Broke But Not Broken',
    emoji: '🪙',
    category: 'secret',
    description: 'Win a run while in debt the entire final season',
    hint: '???',
    secret: true,
    check: (s) => s.phase === 'victory' && s.debt > 0 && s.budget <= 0,
  },
];

// ─── Unlock date tracking ───
const DATES_KEY = 'greenlight_achievement_dates';

export function getAchievementDates(): Record<string, string> {
  try {
    const saved = localStorage.getItem(DATES_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {};
}

function saveAchievementDate(id: string) {
  const dates = getAchievementDates();
  if (!dates[id]) {
    dates[id] = new Date().toISOString().split('T')[0];
    try { localStorage.setItem(DATES_KEY, JSON.stringify(dates)); } catch {}
  }
}

// Check which achievements are newly earned this run
export function checkAchievements(state: GameState): AchievementDef[] {
  const unlocks = getUnlocks();
  const newlyEarned: AchievementDef[] = [];

  for (const ach of ACHIEVEMENTS) {
    if (unlocks.achievements.includes(ach.id)) continue;
    try {
      if (ach.check(state, unlocks)) {
        newlyEarned.push(ach);
      }
    } catch {
      // skip broken checks
    }
  }

  return newlyEarned;
}

// Persist newly earned achievements
export function persistAchievements(ids: string[]) {
  const u = getUnlocks();
  for (const id of ids) {
    if (!u.achievements.includes(id)) {
      u.achievements.push(id);
      saveAchievementDate(id);
    }
  }
  saveUnlocks(u);
}

// Get all unlocked achievement IDs
export function getUnlockedAchievements(): string[] {
  return getUnlocks().achievements;
}

// Get earned cosmetic rewards
export function getEarnedCosmetics(): CosmeticReward[] {
  const unlocked = getUnlockedAchievements();
  return ACHIEVEMENTS
    .filter(a => a.cosmeticReward && unlocked.includes(a.id))
    .map(a => a.cosmeticReward!);
}

export function hasCosmetic(cosmeticId: string): boolean {
  return getEarnedCosmetics().some(c => c.id === cosmeticId);
}

export function getStudioPrefix(): string | null {
  const cosmetics = getEarnedCosmetics();
  const prefix = cosmetics.find(c => c.type === 'studioPrefix');
  return prefix ? prefix.value : null;
}

export function getCardBackColor(): string | null {
  const cosmetics = getEarnedCosmetics();
  const cardBacks = cosmetics.filter(c => c.type === 'cardBack');
  return cardBacks.length > 0 ? cardBacks[cardBacks.length - 1].value : null;
}

export function hasGoldBorder(): boolean {
  return getEarnedCosmetics().some(c => c.type === 'goldBorder');
}

// Category labels
export const CATEGORY_LABELS: Record<AchievementCategory, { label: string; emoji: string }> = {
  milestone: { label: 'Run Milestones', emoji: '🏁' },
  skill: { label: 'Challenge & Skill', emoji: '💪' },
  discovery: { label: 'Content Discovery', emoji: '🔍' },
  fun: { label: 'Fun & Chaos', emoji: '🎉' },
  secret: { label: 'Secret', emoji: '🔮' },
};
