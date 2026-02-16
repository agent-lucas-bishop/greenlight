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
  careerStats: {
    totalFilms: number;
    totalBlockbusters: number;
    totalFlops: number;
    genreFilms: Record<string, number>; // genre -> count
    tagFocusWins: Record<string, number>; // tag -> wins with that focus
    perfectRuns: number;
    disasterCount: number;
    highestQuality: number;
  };
}

const STORAGE_KEY = 'greenlight_unlocks';

function defaultCareerStats() {
  return {
    totalFilms: 0,
    totalBlockbusters: 0,
    totalFlops: 0,
    genreFilms: {} as Record<string, number>,
    tagFocusWins: {} as Record<string, number>,
    perfectRuns: 0,
    disasterCount: 0,
    highestQuality: 0,
  };
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
        careerStats: { ...defaultCareerStats(), ...(parsed.careerStats || {}) },
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
    careerStats: defaultCareerStats(),
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
];

export function getActiveLegacyPerks(): LegacyPerk[] {
  const u = getUnlocks();
  return LEGACY_PERKS.filter(p => p.check(u));
}

export function recordRunEnd(won: boolean, score: number, achievementIds: string[], gameMode: string = 'normal', seasonHistory?: { genre: string; tier: string; quality: number; hitTarget: boolean }[], dominantTag?: string) {
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

  // Check for newly unlocked legacy perks
  for (const perk of LEGACY_PERKS) {
    if (perk.check(u) && !u.legacyPerks.includes(perk.id)) {
      u.legacyPerks.push(perk.id);
    }
  }

  saveUnlocks(u);
}

export function getRunStats(): { wins: number; runs: number; bestScore: number; winRate: string; ngPlusUnlocked: boolean; directorUnlocked: boolean; legacyPerks: LegacyPerk[]; careerStats: UnlockState['careerStats'] } {
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
  };
}
