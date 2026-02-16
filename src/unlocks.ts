// Persistent progress across runs — unlocks, achievements, game modes, legacy perks

export interface UnlockState {
  totalWins: number;
  totalRuns: number;
  bestScore: number;
  unlockedTalent: string[];
  unlockedScripts: string[];
  achievements: string[];
  newGamePlusUnlocked: boolean;
  directorModeUnlocked: boolean;
  ngPlusWins: number;
  // Legacy system
  legacyPerks: string[]; // IDs of unlocked legacy perks
  // Endings discovered
  endingsDiscovered: string[]; // ending IDs seen
  careerStats: {
    totalFilms: number;
    totalBlockbusters: number;
    totalFlops: number;
    totalBoxOffice: number; // lifetime cumulative box office
    genreFilms: Record<string, number>; // genre -> count
    tagFocusWins: Record<string, number>; // tag -> wins with that focus
    perfectRuns: number;
    disasterCount: number;
    highestQuality: number;
    ranksAchieved: Record<string, number>; // rank -> count (S, A, B, C, D)
    archetypesUsed: Record<string, number>; // archetype -> count
    challengesCompleted: string[]; // challenge IDs won
  };
  // Daily challenge streak
  dailyStreak: {
    current: number;
    best: number;
    lastDate: string; // YYYY-MM-DD of last daily played
  };
  // Weekly challenge streak
  weeklyStreak: {
    current: number;
    best: number;
    lastWeek: string; // YYYY-MM-DD of last weekly Monday
  };
}

const STORAGE_KEY = 'greenlight_unlocks';

function defaultCareerStats() {
  return {
    totalFilms: 0,
    totalBlockbusters: 0,
    totalFlops: 0,
    totalBoxOffice: 0,
    genreFilms: {} as Record<string, number>,
    tagFocusWins: {} as Record<string, number>,
    perfectRuns: 0,
    disasterCount: 0,
    highestQuality: 0,
    ranksAchieved: {} as Record<string, number>,
    archetypesUsed: {} as Record<string, number>,
    challengesCompleted: [] as string[],
  };
}

function defaultDailyStreak() {
  return { current: 0, best: 0, lastDate: '' };
}

function defaultWeeklyStreak() {
  return { current: 0, best: 0, lastWeek: '' };
}

export function getUnlocks(): UnlockState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        totalWins: parsed.totalWins || 0,
        totalRuns: parsed.totalRuns || 0,
        bestScore: parsed.bestScore || 0,
        unlockedTalent: parsed.unlockedTalent || [],
        unlockedScripts: parsed.unlockedScripts || [],
        achievements: parsed.achievements || [],
        newGamePlusUnlocked: parsed.newGamePlusUnlocked || false,
        directorModeUnlocked: parsed.directorModeUnlocked || false,
        ngPlusWins: parsed.ngPlusWins || 0,
        legacyPerks: parsed.legacyPerks || [],
        endingsDiscovered: parsed.endingsDiscovered || [],
        careerStats: { ...defaultCareerStats(), ...(parsed.careerStats || {}) },
        dailyStreak: { ...defaultDailyStreak(), ...(parsed.dailyStreak || {}) },
        weeklyStreak: { ...defaultWeeklyStreak(), ...(parsed.weeklyStreak || {}) },
      };
    }
  } catch {}
  return {
    totalWins: 0,
    totalRuns: 0,
    bestScore: 0,
    unlockedTalent: [],
    unlockedScripts: [],
    achievements: [],
    newGamePlusUnlocked: false,
    directorModeUnlocked: false,
    ngPlusWins: 0,
    legacyPerks: [],
    endingsDiscovered: [],
    careerStats: defaultCareerStats(),
    dailyStreak: defaultDailyStreak(),
    weeklyStreak: defaultWeeklyStreak(),
  };
}

export function saveUnlocks(state: UnlockState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// Legacy perks — permanent bonuses unlocked by career achievements
export interface LegacyPerk {
  id: string;
  name: string;
  emoji: string;
  description: string;
  requirement: string;
  check: (u: UnlockState) => boolean;
  effect: string; // key used by game logic
}

export const LEGACY_PERKS: LegacyPerk[] = [
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    emoji: '⭐',
    description: 'Start each run with Crisis Manager perk (incident penalties halved)',
    requirement: 'Complete a perfect run (all 5 targets hit)',
    check: (u) => u.careerStats.perfectRuns >= 1,
    effect: 'startCrisisManager',
  },
  {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    emoji: '🔄',
    description: 'After a FLOP, next film gets +5 quality. Changes how you recover from bad seasons.',
    requirement: 'Win a run after having 2 flops',
    check: (u) => u.careerStats.totalFlops >= 4 && u.totalWins >= 1,
    effect: 'comebackBonus',
  },
  {
    id: 'precision_master',
    name: 'Precision Master',
    emoji: '💎',
    description: 'Clean Wrap bonus +3. Rewards disciplined play across runs.',
    requirement: 'Win 2 runs with Precision focus',
    check: (u) => (u.careerStats.tagFocusWins['precision'] || 0) >= 2,
    effect: 'precisionCleanWrap3',
  },
  {
    id: 'talent_whisperer',
    name: 'Talent Whisperer',
    emoji: '🎭',
    description: 'All talent hiring costs $1 less (min $1). Opens up expensive roster strategies.',
    requirement: 'Win 5 runs',
    check: (u) => u.totalWins >= 5,
    effect: 'cheaperTalent',
  },
  {
    id: 'blockbuster_factory',
    name: 'Blockbuster Factory',
    emoji: '🏭',
    description: 'All market multipliers +0.1. Small edge that compounds across a full run.',
    requirement: 'Make 5 Blockbusters across all runs',
    check: (u) => u.careerStats.totalBlockbusters >= 5,
    effect: 'marketBoost01',
  },
  {
    id: 'indie_darling',
    name: 'Indie Darling',
    emoji: '🎬',
    description: 'Start with +$2M budget. Reward for prolific filmmaking.',
    requirement: 'Make 10 films across all runs',
    check: (u) => u.careerStats.totalFilms >= 10,
    effect: 'startBudget2',
  },
  {
    id: 'mogul',
    name: 'Mogul',
    emoji: '💰',
    description: 'Start with +$3M budget. The money follows the money.',
    requirement: 'Earn $500M lifetime box office',
    check: (u) => u.careerStats.totalBoxOffice >= 500,
    effect: 'startBudget3',
  },
  {
    id: 'genre_savant',
    name: 'Genre Savant',
    emoji: '🌈',
    description: 'Genre mastery starts at +1 for all genres. A true student of cinema.',
    requirement: 'Make films in all 7 genres',
    check: (u) => Object.keys(u.careerStats.genreFilms).length >= 7,
    effect: 'genreMasteryHead',
  },
  {
    id: 'daily_devotee',
    name: 'Daily Devotee',
    emoji: '📅',
    description: 'Daily runs give +$3M starting budget. Consistency pays.',
    requirement: 'Achieve a 7-day daily challenge streak',
    check: (u) => u.dailyStreak.best >= 7,
    effect: 'dailyBudget3',
  },
];

export function getActiveLegacyPerks(): LegacyPerk[] {
  const u = getUnlocks();
  return LEGACY_PERKS.filter(p => p.check(u));
}

export function recordRunEnd(won: boolean, score: number, achievementIds: string[], gameMode: string = 'normal', seasonHistory?: { genre: string; tier: string; quality: number; hitTarget: boolean }[], dominantTag?: string, extras?: { totalEarnings?: number; rank?: string; archetype?: string; challengeId?: string; dailySeed?: string; weeklySeed?: string }) {
  const u = getUnlocks();
  u.totalRuns++;
  if (won) {
    u.totalWins++;
    if (!u.newGamePlusUnlocked) u.newGamePlusUnlocked = true;
    if (gameMode === 'newGamePlus') {
      u.ngPlusWins++;
      if (!u.directorModeUnlocked) u.directorModeUnlocked = true;
    }
    if (gameMode === 'directorMode') {
      u.ngPlusWins++;
    }
    // Track tag focus wins
    if (dominantTag) {
      u.careerStats.tagFocusWins[dominantTag] = (u.careerStats.tagFocusWins[dominantTag] || 0) + 1;
    }
  }
  u.bestScore = Math.max(u.bestScore, score);
  for (const a of achievementIds) {
    if (!u.achievements.includes(a)) u.achievements.push(a);
  }

  // Update career stats from season history
  if (seasonHistory) {
    for (const s of seasonHistory) {
      u.careerStats.totalFilms++;
      u.careerStats.genreFilms[s.genre] = (u.careerStats.genreFilms[s.genre] || 0) + 1;
      if (s.tier === 'BLOCKBUSTER') u.careerStats.totalBlockbusters++;
      if (s.tier === 'FLOP') u.careerStats.totalFlops++;
      u.careerStats.highestQuality = Math.max(u.careerStats.highestQuality, s.quality);
    }
    const allHit = seasonHistory.length >= 5 && seasonHistory.every(s => s.hitTarget);
    if (allHit) u.careerStats.perfectRuns++;
  }

  // Track extras
  if (extras) {
    if (extras.totalEarnings) u.careerStats.totalBoxOffice += extras.totalEarnings;
    if (extras.rank) u.careerStats.ranksAchieved[extras.rank] = (u.careerStats.ranksAchieved[extras.rank] || 0) + 1;
    if (extras.archetype) u.careerStats.archetypesUsed[extras.archetype] = (u.careerStats.archetypesUsed[extras.archetype] || 0) + 1;
    if (extras.challengeId && won && !u.careerStats.challengesCompleted.includes(extras.challengeId)) {
      u.careerStats.challengesCompleted.push(extras.challengeId);
    }
    // Daily streak tracking
    if (extras.dailySeed) {
      const today = extras.dailySeed;
      const lastDate = u.dailyStreak.lastDate;
      if (lastDate) {
        const last = new Date(lastDate);
        const curr = new Date(today);
        const diffDays = Math.round((curr.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          u.dailyStreak.current++;
        } else if (diffDays > 1) {
          u.dailyStreak.current = 1;
        }
        // same day = no change
      } else {
        u.dailyStreak.current = 1;
      }
      u.dailyStreak.lastDate = today;
      u.dailyStreak.best = Math.max(u.dailyStreak.best, u.dailyStreak.current);
    }
    // Weekly streak tracking
    if (extras.weeklySeed) {
      const thisWeek = extras.weeklySeed;
      const lastWeek = u.weeklyStreak.lastWeek;
      if (lastWeek && lastWeek !== thisWeek) {
        const last = new Date(lastWeek);
        const curr = new Date(thisWeek);
        const diffDays = Math.round((curr.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 7) {
          u.weeklyStreak.current++;
        } else if (diffDays > 7) {
          u.weeklyStreak.current = 1;
        }
      } else if (!lastWeek) {
        u.weeklyStreak.current = 1;
      }
      u.weeklyStreak.lastWeek = thisWeek;
      u.weeklyStreak.best = Math.max(u.weeklyStreak.best, u.weeklyStreak.current);
    }
  }

  // Check for newly unlocked legacy perks
  for (const perk of LEGACY_PERKS) {
    if (perk.check(u) && !u.legacyPerks.includes(perk.id)) {
      u.legacyPerks.push(perk.id);
    }
  }

  saveUnlocks(u);
}

export function getRunStats(): { wins: number; runs: number; bestScore: number; winRate: string; ngPlusUnlocked: boolean; directorUnlocked: boolean; legacyPerks: LegacyPerk[]; careerStats: UnlockState['careerStats']; dailyStreak: UnlockState['dailyStreak']; weeklyStreak: UnlockState['weeklyStreak'] } {
  const u = getUnlocks();
  return {
    wins: u.totalWins,
    runs: u.totalRuns,
    bestScore: u.bestScore,
    winRate: u.totalRuns > 0 ? `${Math.round(u.totalWins / u.totalRuns * 100)}%` : 'N/A',
    ngPlusUnlocked: u.newGamePlusUnlocked,
    directorUnlocked: u.directorModeUnlocked,
    legacyPerks: getActiveLegacyPerks(),
    careerStats: u.careerStats,
    dailyStreak: u.dailyStreak,
    weeklyStreak: u.weeklyStreak,
  };
}

// ─── ENDINGS ───

export interface EndingDef {
  id: string;
  rank: string;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  flavorText: string;
}

export const ENDINGS: EndingDef[] = [
  {
    id: 'hollywood_legend',
    rank: 'S',
    title: 'HOLLYWOOD LEGEND',
    subtitle: 'Your studio joins the pantheon',
    emoji: '👑',
    color: '#ff6b6b',
    flavorText: 'They\'ll build a star on the Walk of Fame with your studio\'s name. Every film student will study your catalog. You didn\'t just make movies — you made history. The golden age of cinema has a new chapter, and it\'s yours.',
  },
  {
    id: 'critical_darling',
    rank: 'A',
    title: 'CRITICAL DARLING',
    subtitle: 'Respected, not dominant — but unforgettable',
    emoji: '🎭',
    color: '#ffd93d',
    flavorText: 'You never chased the box office — the box office chased you. Critics adore your work, cinephiles worship your name. You proved that art and commerce can coexist. Not every legend needs a billion-dollar franchise.',
  },
  {
    id: 'steady_hand',
    rank: 'B',
    title: 'STEADY HAND',
    subtitle: 'You survived and built something real',
    emoji: '🎬',
    color: '#6bcb77',
    flavorText: 'Not every studio needs to set the world on fire. You made solid films, kept the lights on, and gave people something to watch on Friday night. In a town that chews people up, you stood your ground. That\'s worth something.',
  },
  {
    id: 'one_hit_wonder',
    rank: 'C',
    title: 'ONE-HIT WONDER',
    subtitle: 'A flash of brilliance, then... silence',
    emoji: '💫',
    color: '#5dade2',
    flavorText: 'You had moments of magic — maybe one great film, one unforgettable scene. But the industry moves fast, and you couldn\'t keep up. They\'ll remember your name, but only when someone asks "whatever happened to...?"',
  },
  {
    id: 'straight_to_streaming',
    rank: 'D',
    title: 'STRAIGHT TO STREAMING',
    subtitle: 'Not even a theatrical release',
    emoji: '📺',
    color: '#999',
    flavorText: 'Your films ended up in the algorithmic void — sandwiched between true crime docs and reality TV. Not terrible, not memorable. The kind of studio that makes people say "oh yeah, I think I saw that" before changing the subject.',
  },
  {
    id: 'studio_bankruptcy',
    rank: 'F',
    title: 'STUDIO BANKRUPTCY',
    subtitle: 'The dream is over',
    emoji: '💀',
    color: '#e74c3c',
    flavorText: 'The accountants came first. Then the lawyers. The lot was sold, the back catalog auctioned off, and your name became a punchline at industry parties. Hollywood doesn\'t forgive, and it certainly doesn\'t forget.',
  },
];

export function getEndingForRank(rank: string, isVictory: boolean): EndingDef {
  if (!isVictory) return ENDINGS.find(e => e.id === 'studio_bankruptcy')!;
  const ending = ENDINGS.find(e => e.rank === rank);
  return ending || ENDINGS.find(e => e.id === 'straight_to_streaming')!;
}

export function recordEndingDiscovered(endingId: string) {
  const u = getUnlocks();
  if (!u.endingsDiscovered.includes(endingId)) {
    u.endingsDiscovered.push(endingId);
    saveUnlocks(u);
  }
}

export function getEndingsDiscovered(): string[] {
  return getUnlocks().endingsDiscovered;
}

// Get all milestone progress for Career Stats display
export interface MilestoneProgress {
  id: string;
  name: string;
  emoji: string;
  description: string;
  requirement: string;
  progress: number; // 0-1
  progressText: string;
  unlocked: boolean;
}

export function getMilestoneProgress(): MilestoneProgress[] {
  const u = getUnlocks();
  const milestones: MilestoneProgress[] = [
    {
      id: 'indie_darling', name: 'Indie Darling', emoji: '🎬',
      description: 'Start with +$2M budget', requirement: 'Make 10 films',
      progress: Math.min(1, u.careerStats.totalFilms / 10),
      progressText: `${u.careerStats.totalFilms}/10 films`,
      unlocked: u.careerStats.totalFilms >= 10,
    },
    {
      id: 'mogul', name: 'Mogul', emoji: '💰',
      description: 'Start with +$3M budget', requirement: '$500M lifetime BO',
      progress: Math.min(1, u.careerStats.totalBoxOffice / 500),
      progressText: `$${u.careerStats.totalBoxOffice.toFixed(0)}M/$500M`,
      unlocked: u.careerStats.totalBoxOffice >= 500,
    },
    {
      id: 'perfectionist', name: 'Perfectionist', emoji: '⭐',
      description: 'Start with Crisis Manager', requirement: 'Complete a perfect run',
      progress: u.careerStats.perfectRuns >= 1 ? 1 : 0,
      progressText: u.careerStats.perfectRuns >= 1 ? 'Unlocked!' : 'No perfect runs yet',
      unlocked: u.careerStats.perfectRuns >= 1,
    },
    {
      id: 'talent_whisperer', name: 'Talent Whisperer', emoji: '🎭',
      description: 'Talent hiring costs $1 less', requirement: 'Win 5 runs',
      progress: Math.min(1, u.totalWins / 5),
      progressText: `${u.totalWins}/5 wins`,
      unlocked: u.totalWins >= 5,
    },
    {
      id: 'blockbuster_factory', name: 'Blockbuster Factory', emoji: '🏭',
      description: 'Market multipliers +0.1', requirement: '5 Blockbusters',
      progress: Math.min(1, u.careerStats.totalBlockbusters / 5),
      progressText: `${u.careerStats.totalBlockbusters}/5 blockbusters`,
      unlocked: u.careerStats.totalBlockbusters >= 5,
    },
    {
      id: 'genre_savant', name: 'Genre Savant', emoji: '🌈',
      description: 'Genre mastery starts at +1', requirement: 'Film in all 7 genres',
      progress: Math.min(1, Object.keys(u.careerStats.genreFilms).length / 7),
      progressText: `${Object.keys(u.careerStats.genreFilms).length}/7 genres`,
      unlocked: Object.keys(u.careerStats.genreFilms).length >= 7,
    },
    {
      id: 'daily_devotee', name: 'Daily Devotee', emoji: '📅',
      description: 'Daily runs +$3M budget', requirement: '7-day streak',
      progress: Math.min(1, u.dailyStreak.best / 7),
      progressText: `Best: ${u.dailyStreak.best}/7 days`,
      unlocked: u.dailyStreak.best >= 7,
    },
    {
      id: 'comeback_kid', name: 'Comeback Kid', emoji: '🔄',
      description: '+5 quality after a FLOP', requirement: '4 flops + 1 win',
      progress: Math.min(1, (Math.min(u.careerStats.totalFlops, 4) + Math.min(u.totalWins, 1)) / 5),
      progressText: `${u.careerStats.totalFlops} flops, ${u.totalWins} wins`,
      unlocked: u.careerStats.totalFlops >= 4 && u.totalWins >= 1,
    },
    {
      id: 'precision_master', name: 'Precision Master', emoji: '💎',
      description: 'Clean Wrap +3', requirement: '2 wins with Precision focus',
      progress: Math.min(1, (u.careerStats.tagFocusWins['precision'] || 0) / 2),
      progressText: `${u.careerStats.tagFocusWins['precision'] || 0}/2 precision wins`,
      unlocked: (u.careerStats.tagFocusWins['precision'] || 0) >= 2,
    },
  ];
  return milestones;
}
