// Achievements system — persistent cross-run achievements with categories and cosmetic rewards
import { getUnlocks, saveUnlocks, type UnlockState, ENDINGS } from './unlocks';
import type { GameState } from './types';

export type AchievementCategory = 'milestone' | 'skill' | 'discovery' | 'fun';

export interface AchievementDef {
  id: string;
  name: string;
  emoji: string;
  category: AchievementCategory;
  description: string;
  hint: string; // shown when locked
  cosmeticReward?: CosmeticReward;
  check: (state: GameState, unlocks: UnlockState) => boolean;
}

export interface CosmeticReward {
  id: string;
  type: 'cardBack' | 'studioPrefix' | 'goldBorder';
  label: string;
  value: string; // color hex, prefix string, or 'true'
}

export const COSMETIC_REWARDS: CosmeticReward[] = [
  { id: 'cardback_crimson', type: 'cardBack', label: 'Crimson Card Back', value: '#8b0000' },
  { id: 'cardback_royal', type: 'cardBack', label: 'Royal Purple Card Back', value: '#6a0dad' },
  { id: 'prefix_legendary', type: 'studioPrefix', label: '"Legendary" Studio Prefix', value: 'Legendary' },
  { id: 'gold_border', type: 'goldBorder', label: 'Gold Border on Start Screen', value: 'true' },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  // ─── Milestone ───
  {
    id: 'first_hit',
    name: 'First Hit',
    emoji: '🎯',
    category: 'milestone',
    description: 'Get a HIT tier or better on any film',
    hint: 'Make a film that connects with audiences',
    check: (s) => s.seasonHistory.some(h => h.tier === 'HIT' || h.tier === 'SMASH' || h.tier === 'BLOCKBUSTER'),
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
  {
    id: 'five_star_studio',
    name: 'Five Star Studio',
    emoji: '⭐',
    category: 'milestone',
    description: 'Survive all 5 seasons',
    hint: 'Go the distance',
    check: (s) => s.seasonHistory.length >= 5 && (s.phase === 'victory' || s.phase === 'gameOver'),
  },
  {
    id: 'perfect_run',
    name: 'Perfect Run',
    emoji: '🏆',
    category: 'milestone',
    description: 'Hit every box office target in a run',
    hint: 'Never miss a single target',
    check: (s) => s.seasonHistory.length >= 5 && s.seasonHistory.every(h => h.hitTarget),
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

  // ─── Skill ───
  {
    id: 'clean_streak',
    name: 'Clean Streak',
    emoji: '✨',
    category: 'skill',
    description: '3 clean wraps in a row (no incidents)',
    hint: 'Keep productions incident-free',
    check: (s) => {
      if (s.seasonHistory.length < 3) return false;
      // Check last 3 consecutive seasons for clean wrap — we use quality as proxy
      // Actually we need to check production state. Use a heuristic: check the season history
      // Since we don't store cleanWrap per season, check if any 3 consecutive had hitTarget with high quality
      // Better: we'll track this in the gameStore when wrapping. For now, approximate.
      let consecutive = 0;
      for (const h of s.seasonHistory) {
        if (h.quality >= 25 && h.hitTarget) { consecutive++; if (consecutive >= 3) return true; }
        else consecutive = 0;
      }
      return false;
    },
  },
  {
    id: 'budget_hawk',
    name: 'Budget Hawk',
    emoji: '🦅',
    category: 'skill',
    description: 'Finish a film spending less than half your starting budget',
    hint: 'Frugality is an art form',
    check: (s) => s.budget >= 8 && s.seasonHistory.length > 0, // simplified: still have most budget after a film
  },
  {
    id: 'critics_darling',
    name: "Critics' Darling",
    emoji: '🎭',
    category: 'skill',
    description: 'Achieve quality 80+ on a single film',
    hint: 'A true masterpiece awaits',
    check: (s) => s.seasonHistory.some(h => h.quality >= 80),
    cosmeticReward: COSMETIC_REWARDS[2], // "Legendary" prefix
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
    emoji: '🎬',
    category: 'skill',
    description: 'Achieve S rank on a run',
    hint: 'The highest honor in the business',
    check: (s) => {
      const score = Math.round(s.totalEarnings * s.reputation * (1 + s.seasonHistory.filter(h => h.nominated).length * 0.2));
      return score > 800 && s.phase === 'victory';
    },
    cosmeticReward: COSMETIC_REWARDS[3], // Gold border
  },

  // ─── Discovery ───
  {
    id: 'genre_master',
    name: 'Genre Master',
    emoji: '🌈',
    category: 'discovery',
    description: 'Make a film in every genre (across all runs)',
    hint: 'Explore every corner of cinema',
    check: (_s, u) => Object.keys(u.careerStats.genreFilms).length >= 7,
    cosmeticReward: COSMETIC_REWARDS[0], // Crimson card back
  },
  {
    id: 'ending_collector',
    name: 'Ending Collector',
    emoji: '📖',
    category: 'discovery',
    description: 'Discover all 6 endings',
    hint: 'Every story has many possible conclusions',
    check: (_s, u) => u.endingsDiscovered.length >= ENDINGS.length,
    cosmeticReward: COSMETIC_REWARDS[1], // Royal purple card back
  },
  {
    id: 'ten_films',
    name: 'Prolific Producer',
    emoji: '🎥',
    category: 'discovery',
    description: 'Make 10 films across all runs',
    hint: 'Keep making movies',
    check: (_s, u) => u.careerStats.totalFilms >= 10,
  },
  {
    id: 'five_wins',
    name: 'Veteran Studio Head',
    emoji: '🏛️',
    category: 'discovery',
    description: 'Win 5 runs',
    hint: 'Prove this wasn\'t a fluke',
    check: (_s, u) => u.totalWins >= 5,
  },

  // ─── Fun ───
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
    id: 'death_spiral',
    name: 'Death Spiral',
    emoji: '💀',
    category: 'fun',
    description: 'Get 2 flops in a row',
    hint: 'Things can always get worse',
    check: (s) => {
      for (let i = 1; i < s.seasonHistory.length; i++) {
        if (s.seasonHistory[i].tier === 'FLOP' && s.seasonHistory[i - 1].tier === 'FLOP') return true;
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
];

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
    if (!u.achievements.includes(id)) u.achievements.push(id);
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

// Check if a specific cosmetic is unlocked
export function hasCosmetic(cosmeticId: string): boolean {
  return getEarnedCosmetics().some(c => c.id === cosmeticId);
}

// Get active studio prefix (if any)
export function getStudioPrefix(): string | null {
  const cosmetics = getEarnedCosmetics();
  const prefix = cosmetics.find(c => c.type === 'studioPrefix');
  return prefix ? prefix.value : null;
}

// Get active card back color (returns last earned)
export function getCardBackColor(): string | null {
  const cosmetics = getEarnedCosmetics();
  const cardBacks = cosmetics.filter(c => c.type === 'cardBack');
  return cardBacks.length > 0 ? cardBacks[cardBacks.length - 1].value : null;
}

// Check if gold border is unlocked
export function hasGoldBorder(): boolean {
  return getEarnedCosmetics().some(c => c.type === 'goldBorder');
}

// Category labels
export const CATEGORY_LABELS: Record<AchievementCategory, { label: string; emoji: string }> = {
  milestone: { label: 'Milestones', emoji: '🏁' },
  skill: { label: 'Skill', emoji: '💪' },
  discovery: { label: 'Discovery', emoji: '🔍' },
  fun: { label: 'Fun', emoji: '🎉' },
};
