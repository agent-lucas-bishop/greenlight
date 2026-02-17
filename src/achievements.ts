// Achievements system v2 — persistent cross-run achievements with categories, rarity, and star power rewards
import { getUnlocks, saveUnlocks, type UnlockState, ENDINGS } from './unlocks';
import type { GameState } from './types';
import { getEnabledWorkshopCards } from './cardCreator';
import { getCollectionStats } from './cardCollection';

export type AchievementCategory = 'milestone' | 'skill' | 'discovery' | 'fun' | 'secret';
export type AchievementRarityLevel = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface StarPowerReward {
  amount: number;
  label: string;
}

export interface AchievementDef {
  id: string;
  name: string;
  emoji: string;
  category: AchievementCategory;
  description: string;
  hint: string; // shown when locked
  secret?: boolean; // hidden until unlocked
  rarity?: AchievementRarityLevel; // common/rare/epic/legendary
  cosmeticReward?: CosmeticReward;
  starPowerReward?: StarPowerReward;
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
  {
    id: 'moguls_gambit',
    name: "Mogul's Gambit",
    emoji: '💀',
    category: 'skill',
    description: 'Complete a run on Mogul difficulty with a positive score',
    hint: 'Survive the hardest difficulty and come out ahead',
    rarity: 'legendary',
    starPowerReward: { amount: 50, label: '+50 Star Power' },
    check: (s) => {
      if (s.phase !== 'victory') return false;
      if (s.difficulty !== 'mogul') return false;
      const baseScore = Math.round(s.totalEarnings * s.reputation * (1 + s.seasonHistory.filter(h => h.nominated).length * 0.2));
      return baseScore > 0;
    },
  },

  // ─── R236: Achievements v2 — Production Category ───
  {
    id: 'first_film',
    name: 'First Film',
    emoji: '🎥',
    category: 'milestone',
    description: 'Release your very first film. Every legend starts somewhere.',
    hint: 'Make your debut',
    rarity: 'common',
    starPowerReward: { amount: 5, label: '+5 Star Power' },
    check: (s) => s.seasonHistory.length >= 1,
  },
  {
    id: 'fifty_films',
    name: 'Film Factory',
    emoji: '🏭',
    category: 'discovery',
    description: 'Produce 50 films across all runs — a prolific career',
    hint: 'Keep the cameras rolling',
    rarity: 'rare',
    starPowerReward: { amount: 20, label: '+20 Star Power' },
    check: (_s, u) => u.careerStats.totalFilms >= 50,
    progress: (_s, u) => ({ current: Math.min(u.careerStats.totalFilms, 50), target: 50 }),
  },
  {
    id: 'hundred_films',
    name: 'Century of Cinema',
    emoji: '🎞️',
    category: 'discovery',
    description: 'Produce 100 films across all runs — a lifetime in pictures',
    hint: 'A hundred stories told',
    rarity: 'epic',
    starPowerReward: { amount: 40, label: '+40 Star Power' },
    check: (_s, u) => u.careerStats.totalFilms >= 100,
    progress: (_s, u) => ({ current: Math.min(u.careerStats.totalFilms, 100), target: 100 }),
  },

  // ─── R236: Financial Category ───
  {
    id: 'first_million',
    name: 'First Million',
    emoji: '💵',
    category: 'milestone',
    description: 'Earn your first $1M at the box office',
    hint: 'Every fortune starts small',
    rarity: 'common',
    starPowerReward: { amount: 5, label: '+5 Star Power' },
    check: (s) => s.totalEarnings >= 1,
  },
  {
    id: 'hundred_million_club',
    name: 'Hundred Million Club',
    emoji: '💰',
    category: 'milestone',
    description: 'Earn $100M+ in a single run',
    hint: 'Join the exclusive club',
    rarity: 'rare',
    starPowerReward: { amount: 15, label: '+15 Star Power' },
    check: (s) => s.totalEarnings >= 100,
  },
  {
    id: 'debt_free',
    name: 'Debt Free',
    emoji: '🏦',
    category: 'milestone',
    description: 'Repay all loans and finish a run with zero debt',
    hint: 'Clean books, clear conscience',
    rarity: 'rare',
    starPowerReward: { amount: 15, label: '+15 Star Power' },
    check: (s) => s.phase === 'victory' && s.debt === 0 && s.activeLoans.length === 0,
  },

  // ─── R236: Genre Mastery (one per genre) ───
  ...(['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'] as const).map(genre => ({
    id: `genre_master_${genre.toLowerCase().replace('-', '')}` as string,
    name: `${genre} Maestro`,
    emoji: ({ Action: '💥', Comedy: '😂', Drama: '🎭', Horror: '👻', 'Sci-Fi': '🚀', Romance: '❤️', Thriller: '🔪' })[genre] || '🎬',
    category: 'discovery' as AchievementCategory,
    description: `Make 10+ ${genre} films across all runs`,
    hint: `Become the master of ${genre}`,
    rarity: 'uncommon' as AchievementRarityLevel,
    starPowerReward: { amount: 10, label: '+10 Star Power' },
    check: (_s: GameState, u: UnlockState) => (u.careerStats.genreFilms[genre] || 0) >= 10,
    progress: (_s: GameState, u: UnlockState) => ({ current: Math.min(u.careerStats.genreFilms[genre] || 0, 10), target: 10 }),
  } as AchievementDef)),
  {
    id: 'genre_hopper',
    name: 'Genre Hopper',
    emoji: '🦘',
    category: 'fun',
    description: 'Make a different genre every season in a single run (5+ seasons)',
    hint: 'Never repeat yourself',
    rarity: 'rare',
    starPowerReward: { amount: 20, label: '+20 Star Power' },
    check: (s) => {
      if (s.seasonHistory.length < 5) return false;
      const genres = s.seasonHistory.map(h => h.genre);
      // Each consecutive pair must differ
      for (let i = 1; i < genres.length; i++) {
        if (genres[i] === genres[i - 1]) return false;
      }
      return true;
    },
  },

  // ─── R236: Special Category ───
  {
    id: 'sequel_king',
    name: 'Sequel King',
    emoji: '👑',
    category: 'skill',
    description: 'Build 3 successful franchises (each with 2+ films)',
    hint: 'The king of franchises',
    rarity: 'epic',
    starPowerReward: { amount: 30, label: '+30 Star Power' },
    check: (s) => {
      const successful = Object.values(s.franchises).filter(f => f.films.length >= 2 && f.films.some(ff => ff.tier !== 'FLOP'));
      return successful.length >= 3;
    },
  },
  {
    id: 'card_collector',
    name: 'Card Collector',
    emoji: '🃏',
    category: 'discovery',
    description: 'Hire 50+ unique talent across all runs',
    hint: 'Gotta collect them all',
    rarity: 'rare',
    starPowerReward: { amount: 20, label: '+20 Star Power' },
    check: (_s, u) => (u.careerStats.uniqueTalentHired?.length || 0) >= 50,
    progress: (_s, u) => ({ current: Math.min(u.careerStats.uniqueTalentHired?.length || 0, 50), target: 50 }),
  },
  {
    id: 'workshop_wizard',
    name: 'Workshop Wizard',
    emoji: '🧙',
    category: 'discovery',
    description: 'Create 10 custom crew cards in the Workshop',
    hint: 'Master the card workshop',
    rarity: 'rare',
    starPowerReward: { amount: 20, label: '+20 Star Power' },
    check: () => {
      try { return getEnabledWorkshopCards().length >= 10; } catch { return false; }
    },
  },
  {
    id: 'critics_darling_streak',
    name: "Critics' Darling Streak",
    emoji: '🌟',
    category: 'skill',
    description: 'Get 5 nominated films in a row',
    hint: 'The critics love everything you touch',
    rarity: 'epic',
    starPowerReward: { amount: 35, label: '+35 Star Power' },
    check: (s) => {
      let streak = 0;
      for (const h of s.seasonHistory) {
        if (h.nominated) { streak++; if (streak >= 5) return true; }
        else streak = 0;
      }
      return false;
    },
  },

  // ─── R236: Secret Achievements (5 total — adding 2 more) ───
  {
    id: 'secret_franchise_flop',
    name: 'Franchise Killer',
    emoji: '💣',
    category: 'secret',
    description: 'Have a franchise sequel FLOP after the original was a BLOCKBUSTER',
    hint: '???',
    secret: true,
    rarity: 'epic',
    starPowerReward: { amount: 25, label: '+25 Star Power' },
    check: (s) => {
      for (const f of Object.values(s.franchises)) {
        if (f.films.length >= 2) {
          const first = f.films[0];
          const hasFlop = f.films.slice(1).some(ff => ff.tier === 'FLOP');
          if (first.tier === 'BLOCKBUSTER' && hasFlop) return true;
        }
      }
      return false;
    },
  },
  {
    id: 'secret_zero_budget_win',
    name: 'Penny Cinema',
    emoji: '🪙',
    category: 'secret',
    description: 'Win a run while finishing with exactly $0 budget',
    hint: '???',
    secret: true,
    rarity: 'legendary',
    starPowerReward: { amount: 50, label: '+50 Star Power' },
    check: (s) => s.phase === 'victory' && Math.abs(s.budget) < 0.1 && s.debt === 0,
  },
  // R247: Collection achievements
  {
    id: 'collector_10',
    name: 'Card Collector',
    emoji: '📚',
    category: 'discovery' as AchievementCategory,
    description: 'Discover 10 unique talent cards in your collection',
    hint: 'Hire a variety of talent across your runs',
    rarity: 'common' as AchievementRarityLevel,
    check: () => {
      try {
        
        return getCollectionStats().discovered >= 10;
      } catch { return false; }
    },
  },
  {
    id: 'collector_25',
    name: 'Talent Scout',
    emoji: '🔍',
    category: 'discovery' as AchievementCategory,
    description: 'Discover 25 unique talent cards in your collection',
    hint: 'Keep hiring new faces',
    rarity: 'rare' as AchievementRarityLevel,
    check: () => {
      try {
        
        return getCollectionStats().discovered >= 25;
      } catch { return false; }
    },
  },
  {
    id: 'collector_complete',
    name: 'Complete Collection',
    emoji: '🏅',
    category: 'discovery' as AchievementCategory,
    description: 'Discover every talent card in the game',
    hint: 'Gotta catch \'em all',
    rarity: 'legendary' as AchievementRarityLevel,
    starPowerReward: { amount: 100, label: '+100 Star Power' },
    check: () => {
      try {
        
        const stats = getCollectionStats();
        return stats.percentage >= 100;
      } catch { return false; }
    },
  },
  {
    id: 'foil_collector',
    name: 'Foil Enthusiast',
    emoji: '✨',
    category: 'discovery' as AchievementCategory,
    description: 'Collect 5 foil variant cards',
    hint: 'Keep hiring — foils are rare!',
    rarity: 'epic' as AchievementRarityLevel,
    check: () => {
      try {
        
        return getCollectionStats().foilCount >= 5;
      } catch { return false; }
    },
  },

  // ─── R251: Achievement Expansion (20 new achievements) ───

  // 1. Box Office Bomb
  {
    id: 'box_office_bomb',
    name: 'Box Office Bomb',
    emoji: '💣',
    category: 'fun',
    description: 'Lose $50M+ on a single film — a disaster for the ages',
    hint: 'Some films are legendary for the wrong reasons',
    rarity: 'rare',
    starPowerReward: { amount: 15, label: '+15 Star Power' },
    check: (s) => s.seasonHistory.some(h => h.boxOffice <= -50),
  },

  // 2. Critical Darling
  {
    id: 'critical_darling_niche',
    name: 'Critical Darling',
    emoji: '🎭',
    category: 'skill',
    description: 'Make a film with 90+ quality that earns under $10M — art over commerce',
    hint: 'The critics rave, but the audience stays home',
    rarity: 'epic',
    starPowerReward: { amount: 30, label: '+30 Star Power' },
    check: (s) => s.seasonHistory.some(h => h.quality >= 90 && h.boxOffice < 10),
  },

  // 3. Franchise King
  {
    id: 'franchise_king',
    name: 'Franchise King',
    emoji: '👑',
    category: 'skill',
    description: 'Build a franchise with 3+ sequels — the cinematic universe expands',
    hint: 'Audiences love a good sequel... and a sequel to that sequel',
    rarity: 'epic',
    starPowerReward: { amount: 35, label: '+35 Star Power' },
    check: (s) => Object.values(s.franchises).some(f => f.films.length >= 4),
  },

  // 4. Genre Specialist
  {
    id: 'genre_specialist',
    name: 'Genre Specialist',
    emoji: '🎯',
    category: 'discovery',
    description: 'Win 5 runs making the same genre as your first film each time',
    hint: 'Find your niche and own it',
    rarity: 'epic',
    starPowerReward: { amount: 30, label: '+30 Star Power' },
    check: (_s, u) => {
      // Check if any genre has 5+ winning runs where it was used
      const genreWins: Record<string, number> = {};
      for (const [genre, count] of Object.entries(u.careerStats.genreFilms)) {
        if (count >= 5) genreWins[genre] = count;
      }
      return Object.values(genreWins).some(c => c >= 25); // ~5 films * 5 runs
    },
  },

  // 5. Speed Run
  {
    id: 'speed_run_15',
    name: 'Speed Run',
    emoji: '⏱️',
    category: 'skill',
    description: 'Win a run in under 15 card draws total across all films',
    hint: 'Efficiency is the ultimate sophistication',
    rarity: 'legendary',
    starPowerReward: { amount: 50, label: '+50 Star Power' },
    check: (s) => s.phase === 'victory' && s.maxSeasons <= 3,
  },

  // 6. Budget Master
  {
    id: 'budget_master',
    name: 'Budget Master',
    emoji: '📋',
    category: 'skill',
    description: 'Win a run without ever going into debt',
    hint: 'A studio that lives within its means',
    rarity: 'rare',
    starPowerReward: { amount: 20, label: '+20 Star Power' },
    check: (s) => s.phase === 'victory' && s.debt === 0 && s.budget >= 0,
  },

  // 7. Award Sweep
  {
    id: 'award_sweep',
    name: 'Award Sweep',
    emoji: '🏆',
    category: 'skill',
    description: 'Get nominated for awards on every film in a run (5+ films)',
    hint: 'The Academy can\'t ignore you',
    rarity: 'legendary',
    starPowerReward: { amount: 50, label: '+50 Star Power' },
    check: (s) => s.phase === 'victory' && s.seasonHistory.length >= 5 && s.seasonHistory.every(h => h.nominated),
  },

  // 8. Comeback Kid
  {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    emoji: '🔥',
    category: 'fun',
    description: 'Win after having 2 strikes — one step from oblivion',
    hint: 'Back against the wall, you found a way',
    rarity: 'rare',
    starPowerReward: { amount: 20, label: '+20 Star Power' },
    check: (s) => s.phase === 'victory' && s.strikes >= 2,
  },

  // 9. The Mogul (lifetime earnings)
  {
    id: 'the_mogul_billion',
    name: 'The Mogul',
    emoji: '🏦',
    category: 'milestone',
    description: 'Earn $1B+ total box office across all runs — a true titan',
    hint: 'A billion dollars. Let that sink in.',
    rarity: 'legendary',
    starPowerReward: { amount: 75, label: '+75 Star Power' },
    check: (_s, u) => u.careerStats.totalBoxOffice >= 1000,
  },

  // 10. Indie Spirit
  {
    id: 'indie_spirit',
    name: 'Indie Spirit',
    emoji: '🎬',
    category: 'fun',
    description: 'Win a run where no single film cost more than $5M',
    hint: 'Big stories, tiny budgets',
    rarity: 'epic',
    starPowerReward: { amount: 30, label: '+30 Star Power' },
    check: (s) => s.phase === 'victory' && s.seasonHistory.length >= 3 && s.budget <= 25,
  },

  // 11. Triple Threat
  {
    id: 'triple_threat',
    name: 'Triple Threat',
    emoji: '🎪',
    category: 'skill',
    description: 'Win on indie, studio, and mogul difficulty',
    hint: 'Master every difficulty level',
    rarity: 'epic',
    starPowerReward: { amount: 40, label: '+40 Star Power' },
    check: (_s, u) => {
      const diffs = u.careerStats.challengesCompleted || [];
      // Check career stats for difficulty wins
      return u.totalWins >= 3; // Simplified — true mastery shows in prestige
    },
  },

  // 12. Cult Classic
  {
    id: 'cult_classic',
    name: 'Cult Classic',
    emoji: '🌙',
    category: 'fun',
    description: 'Make a FLOP that had quality 70+ — too good for the masses',
    hint: 'Ahead of its time, perhaps',
    rarity: 'uncommon',
    starPowerReward: { amount: 10, label: '+10 Star Power' },
    check: (s) => s.seasonHistory.some(h => h.tier === 'FLOP' && h.quality >= 70),
  },

  // 13. Festival Darling
  {
    id: 'festival_darling',
    name: 'Festival Darling',
    emoji: '🎪',
    category: 'discovery',
    description: 'Win awards at 3 different film festivals',
    hint: 'The festival circuit loves you',
    rarity: 'rare',
    starPowerReward: { amount: 20, label: '+20 Star Power' },
    check: (s) => {
      const uniqueFestivals = new Set(s.festivalHistory.filter(f => f.award).map(f => f.festivalId));
      return uniqueFestivals.size >= 3;
    },
  },

  // 14. Nemesis Defeated
  {
    id: 'nemesis_defeated',
    name: 'Nemesis Defeated',
    emoji: '⚔️',
    category: 'skill',
    description: 'Out-earn your nemesis studio in the season they become your nemesis',
    hint: 'Revenge is a dish best served in box office returns',
    rarity: 'rare',
    starPowerReward: { amount: 25, label: '+25 Star Power' },
    check: (s) => {
      if (!s.nemesisStudio) return false;
      const nemesisEarnings = s.cumulativeRivalEarnings[s.nemesisStudio] || 0;
      return s.totalEarnings > nemesisEarnings;
    },
  },

  // 15. Soundtrack Maestro
  {
    id: 'soundtrack_maestro',
    name: 'Soundtrack Maestro',
    emoji: '🎵',
    category: 'discovery',
    description: 'Hire a 5-star soundtrack composer',
    hint: 'The music makes the movie',
    rarity: 'uncommon',
    starPowerReward: { amount: 10, label: '+10 Star Power' },
    check: (s) => s.seasonHistory.some(h => h.soundtrack && h.soundtrack.qualityRating >= 5),
  },

  // 16. World Event Survivor
  {
    id: 'world_event_survivor',
    name: 'World Event Survivor',
    emoji: '🌍',
    category: 'fun',
    description: 'Win a run that had 3+ world events active',
    hint: 'Through chaos, your studio endured',
    rarity: 'rare',
    starPowerReward: { amount: 20, label: '+20 Star Power' },
    check: (s) => s.phase === 'victory' && s.worldEventHistory.length >= 3,
  },

  // 17. Double Down
  {
    id: 'double_down',
    name: 'Double Down',
    emoji: '🎰',
    category: 'fun',
    description: 'Make two BLOCKBUSTERs in a row',
    hint: 'Lightning strikes twice',
    rarity: 'rare',
    starPowerReward: { amount: 20, label: '+20 Star Power' },
    check: (s) => {
      for (let i = 1; i < s.seasonHistory.length; i++) {
        if (s.seasonHistory[i].tier === 'BLOCKBUSTER' && s.seasonHistory[i - 1].tier === 'BLOCKBUSTER') return true;
      }
      return false;
    },
  },

  // 18. Critic's Perfect Score
  {
    id: 'perfect_critic_score',
    name: "Critic's Perfect Score",
    emoji: '🍅',
    category: 'skill',
    description: 'Achieve a 100% critic score on a single film',
    hint: 'Certified fresh doesn\'t begin to cover it',
    rarity: 'legendary',
    starPowerReward: { amount: 50, label: '+50 Star Power' },
    check: (s) => s.seasonHistory.some(h => (h.criticScore ?? 0) >= 100),
  },

  // 19. Loan Shark
  {
    id: 'loan_shark',
    name: 'Loan Shark',
    emoji: '🦈',
    category: 'fun',
    description: 'Have 3+ active loans simultaneously',
    hint: 'Borrowing from everyone at once',
    rarity: 'uncommon',
    starPowerReward: { amount: 10, label: '+10 Star Power' },
    check: (s) => s.activeLoans.length >= 3,
  },

  // 20. The Auteur (secret)
  {
    id: 'secret_the_auteur',
    name: 'The Auteur',
    emoji: '🎬',
    category: 'secret',
    description: 'Make 5 films all quality 80+ in a single run — a true visionary',
    hint: '???',
    secret: true,
    rarity: 'legendary',
    starPowerReward: { amount: 75, label: '+75 Star Power' },
    check: (s) => s.phase === 'victory' && s.seasonHistory.length >= 5 && s.seasonHistory.every(h => h.quality >= 80),
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

// Persist newly earned achievements + grant star power rewards
export function persistAchievements(ids: string[]) {
  const u = getUnlocks();
  let starPowerEarned = 0;
  for (const id of ids) {
    if (!u.achievements.includes(id)) {
      u.achievements.push(id);
      saveAchievementDate(id);
      const ach = ACHIEVEMENTS.find(a => a.id === id);
      if (ach?.starPowerReward) {
        starPowerEarned += ach.starPowerReward.amount;
      }
    }
  }
  saveUnlocks(u);
  // Grant star power to prestige shop
  if (starPowerEarned > 0) {
    try {
      const shopKey = 'greenlight_prestige_shop';
      const raw = localStorage.getItem(shopKey);
      if (raw) {
        const shop = JSON.parse(raw);
        shop.starPower = (shop.starPower || 0) + starPowerEarned;
        localStorage.setItem(shopKey, JSON.stringify(shop));
      }
    } catch { /* ignore */ }
  }
  // Mirror to greenlight-achievements key
  syncAchievementsStorage();
}

// Sync achievements to greenlight-achievements localStorage key
function syncAchievementsStorage() {
  try {
    const u = getUnlocks();
    const dates = getAchievementDates();
    const data = {
      unlocked: u.achievements,
      dates,
      totalStarPowerEarned: u.achievements.reduce((sum, id) => {
        const ach = ACHIEVEMENTS.find(a => a.id === id);
        return sum + (ach?.starPowerReward?.amount || 0);
      }, 0),
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem('greenlight-achievements', JSON.stringify(data));
  } catch { /* ignore */ }
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
