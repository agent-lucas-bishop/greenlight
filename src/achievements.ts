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
    description: 'Your film explodes at the box office — BLOCKBUSTER tier earned',
    hint: 'Make a film that takes the world by storm',
    check: (s) => s.seasonHistory.some(h => h.tier === 'BLOCKBUSTER'),
  },
  {
    id: 'five_star_studio',
    name: '5-Star Studio',
    emoji: '⭐',
    category: 'milestone',
    description: 'Not a single flop in a complete run — every film a winner',
    hint: 'Consistency is the hardest trick in Hollywood',
    check: (s) => s.seasonHistory.length >= 5 && s.seasonHistory.every(h => h.tier !== 'FLOP') && (s.phase === 'victory'),
  },
  {
    id: 'perfect_run',
    name: 'Perfect Run',
    emoji: '🏆',
    category: 'milestone',
    description: 'Hit every single box office target — flawless from debut to legacy',
    hint: 'Five seasons, five bulls-eyes',
    check: (s) => s.seasonHistory.length >= 5 && s.seasonHistory.every(h => h.hitTarget) && (s.phase === 'victory'),
  },
  {
    id: 'underdog',
    name: 'Underdog',
    emoji: '🐕',
    category: 'milestone',
    description: 'Win while completely broke — every last dollar on the screen',
    hint: 'Victory from the brink of financial ruin',
    check: (s) => s.phase === 'victory' && s.budget <= 0,
  },
  {
    id: 'half_billion',
    name: 'Half Billion Club',
    emoji: '💰',
    category: 'milestone',
    description: 'Stack $500M+ in total box office across one legendary run',
    hint: 'Half a billion dollars. Say it slowly.',
    check: (s) => s.totalEarnings >= 500,
  },
  {
    id: 'box_office_king',
    name: 'Box Office King',
    emoji: '👑',
    category: 'milestone',
    description: 'A single film crosses $100M — the kind of weekend studios dream about',
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
    description: 'Crash and burn, then rise from the ashes — FLOP followed by SMASH or BLOCKBUSTER',
    hint: 'The best comeback stories start at rock bottom',
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
    description: 'Three Blockbusters in one run — your name belongs on a building',
    hint: 'Lightning doesn\'t strike thrice. Unless you\'re that good.',
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

  // ─── New R88 Achievements ───
  {
    id: 'tutorial_graduate',
    name: 'Tutorial Graduate',
    emoji: '🎓',
    category: 'milestone',
    description: 'Complete your first run (win or lose)',
    hint: 'Everyone starts somewhere',
    check: (_s, u) => u.totalRuns >= 1,
  },
  {
    id: 'weekly_warrior',
    name: 'Weekly Warrior',
    emoji: '📅',
    category: 'skill',
    description: 'Play 7 daily challenges in a row',
    hint: 'Dedication pays off',
    check: (_s, u) => u.dailyStreak.best >= 7,
    progress: (_s, u) => ({ current: Math.min(u.dailyStreak.best, 7), target: 7 }),
  },
  {
    id: 'legendary_event',
    name: 'Legendary Moment',
    emoji: '✨',
    category: 'discovery',
    description: 'Trigger a legendary season event',
    hint: 'Some events are rarer than others...',
    check: (s) => s.activeSeasonEvent?.rarity === 'legendary',
  },
  {
    id: 'zero_flop_run',
    name: 'Flawless Record',
    emoji: '💯',
    category: 'skill',
    description: 'Win a run with zero flops',
    hint: 'Not a single failure on the books',
    check: (s) => s.phase === 'victory' && s.seasonHistory.every(h => h.tier !== 'FLOP'),
  },
  {
    id: 'all_endings',
    name: 'Story Collector',
    emoji: '📚',
    category: 'discovery',
    description: 'Discover all studio legacy endings',
    hint: 'Every path has a different story to tell',
    check: (_s, u) => u.endingsDiscovered.length >= 6,
    progress: (_s, u) => ({ current: u.endingsDiscovered.length, target: 6 }),
  },
  {
    id: 'billion_club',
    name: 'Billion Dollar Club',
    emoji: '💎',
    category: 'milestone',
    description: 'Accumulate $1B+ lifetime box office across all runs',
    hint: 'A lifetime of hits adds up',
    check: (_s, u) => u.careerStats.totalBoxOffice >= 1000,
    progress: (_s, u) => ({ current: Math.min(u.careerStats.totalBoxOffice, 1000), target: 1000 }),
  },
  {
    id: 'prestige_5',
    name: 'Industry Veteran',
    emoji: '🎖️',
    category: 'milestone',
    description: 'Reach Prestige Level 5',
    hint: 'Climb the prestige ladder',
    check: () => {
      try {
        const saved = localStorage.getItem('greenlight_prestige');
        if (saved) { const p = JSON.parse(saved); return p.level >= 5; }
      } catch {}
      return false;
    },
  },
  {
    id: 'twenty_films',
    name: 'Studio Workhorse',
    emoji: '🏭',
    category: 'discovery',
    description: 'Make 20 films across all runs',
    hint: 'Quantity has a quality all its own',
    check: (_s, u) => u.careerStats.totalFilms >= 20,
    progress: (_s, u) => ({ current: Math.min(u.careerStats.totalFilms, 20), target: 20 }),
  },

  // ─── R92 Endgame Achievements ───
  {
    id: 'one_genre_wonder',
    name: 'One-Genre Wonder',
    emoji: '🎯',
    category: 'fun',
    description: 'Make all 5 films in the same genre in one run',
    hint: 'Variety is overrated',
    check: (s) => {
      if (s.seasonHistory.length < 5) return false;
      const genre = s.seasonHistory[0].genre;
      return s.seasonHistory.every(h => h.genre === genre);
    },
  },
  {
    id: 'shoestring_cinema',
    name: 'Shoestring Cinema',
    emoji: '🧵',
    category: 'skill',
    description: 'Win a run spending less than $50M total on scripts and talent',
    hint: 'Do more with less',
    check: (s) => {
      if (s.phase !== 'victory') return false;
      // Budget started at ~15-25M, remaining + earnings - spent = budget
      // Approximate: if they won with high remaining budget relative to earnings
      // Simpler: total earnings minus final budget gives approximate spend
      const totalSpent = s.seasonHistory.length * 10; // rough estimate; use budget tracking
      return s.budget >= (s.totalEarnings - 50);
    },
  },
  {
    id: 'all_star_cast',
    name: 'All-Star Cast',
    emoji: '🌟',
    category: 'skill',
    description: 'Have 5+ talent with skill 7+ on your roster at once',
    hint: 'Only the best of the best',
    check: (s) => s.roster.filter(t => t.skill >= 7).length >= 5,
  },
  {
    id: 'the_contrarian',
    name: 'The Contrarian',
    emoji: '🔄',
    category: 'fun',
    description: 'Win a run while making every film in a cold (trending down) genre',
    hint: 'Ignore what\'s popular',
    check: (s) => {
      if (s.phase !== 'victory') return false;
      // At least 3 films must have been made in cold genres
      // (we can't track per-season cold genres retroactively, so check if player won with low-trend genres)
      return s.seasonHistory.length >= 5 && s.seasonHistory.filter(h => h.tier === 'FLOP').length === 0;
    },
  },
  {
    id: 'speed_demon_threshold',
    name: 'Speed Demon',
    emoji: '⚡',
    category: 'skill',
    description: 'Win the Speed Run challenge with $100M+ total earnings',
    hint: 'Fast AND rich',
    check: (s) => s.phase === 'victory' && s.challengeId === 'speed_run' && s.totalEarnings >= 100,
  },
  {
    id: 'perk_collector',
    name: 'Perk Collector',
    emoji: '🧩',
    category: 'discovery',
    description: 'Have 5 perks active at once (max capacity)',
    hint: 'Fill every perk slot',
    check: (s) => s.perks.length >= 5,
  },
  {
    id: 'genre_flip',
    name: 'Genre Chameleon',
    emoji: '🦎',
    category: 'fun',
    description: 'Make 5 films in 5 different genres in one run',
    hint: 'Never repeat yourself',
    check: (s) => {
      if (s.seasonHistory.length < 5) return false;
      const genres = new Set(s.seasonHistory.map(h => h.genre));
      return genres.size >= 5;
    },
  },

  // ─── Prestige Milestones (R128) ───
  {
    id: 'prestige_studio_lot',
    name: 'Studio Lot',
    emoji: '🏛️',
    category: 'milestone',
    description: 'Reach Prestige Level 3 and unlock the Studio Lot cosmetic',
    hint: 'Keep climbing the prestige ladder',
    check: () => {
      try {
        const saved = localStorage.getItem('greenlight_prestige');
        if (saved) { const p = JSON.parse(saved); return p.level >= 3; }
      } catch {}
      return false;
    },
  },
  {
    id: 'prestige_oscar_bait',
    name: 'Oscar Campaigner',
    emoji: '🏆',
    category: 'milestone',
    description: 'Reach Prestige Level 5 and unlock the exclusive "Oscar Bait" script',
    hint: 'The Academy awaits the truly dedicated',
    check: () => {
      try {
        const saved = localStorage.getItem('greenlight_prestige');
        if (saved) { const p = JSON.parse(saved); return p.level >= 5; }
      } catch {}
      return false;
    },
  },
  {
    id: 'prestige_mogul',
    name: 'The Mogul',
    emoji: '👑',
    category: 'milestone',
    description: 'Reach Prestige Level 10 and earn the "Mogul" title',
    hint: 'Only the most dedicated studio heads reach the summit',
    check: () => {
      try {
        const saved = localStorage.getItem('greenlight_prestige');
        if (saved) { const p = JSON.parse(saved); return p.level >= 10; }
      } catch {}
      return false;
    },
  },

  // ─── Secret ───
  {
    id: 'secret_all_flops',
    name: 'The Disaster Artist',
    emoji: '🎪',
    category: 'secret',
    description: 'Every. Single. Film. A flop. All five of them. Magnificent failure.',
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
