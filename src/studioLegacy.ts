// Studio Legacy — cross-run meta-progression system
// Tracks lifetime stats, legacy milestones with tiered cosmetic rewards

import { GameState, Genre } from './types';
import { getUnlocks } from './unlocks';
import { getLeaderboard } from './leaderboard';

// ─── LIFETIME STATS ───

export interface LifetimeStats {
  totalFilmsProduced: number;
  totalRevenue: number;
  totalAwards: number; // nominations across all runs
  genreFilmCounts: Record<string, number>;
  highestSingleFilmRevenue: number;
  highestSingleFilmTitle: string;
  longestWinStreak: number;
  totalPlaytimeMinutes: number; // estimated
  totalBlockbusters: number;
  totalRuns: number;
  totalWins: number;
}

const LEGACY_STATS_KEY = 'greenlight_legacy_stats';

export function getLifetimeStats(): LifetimeStats {
  try {
    const saved = localStorage.getItem(LEGACY_STATS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return recomputeLifetimeStats();
}

export function recomputeLifetimeStats(): LifetimeStats {
  const lb = getLeaderboard();
  const stats: LifetimeStats = {
    totalFilmsProduced: 0,
    totalRevenue: 0,
    totalAwards: 0,
    genreFilmCounts: {},
    highestSingleFilmRevenue: 0,
    highestSingleFilmTitle: '',
    longestWinStreak: 0,
    totalPlaytimeMinutes: 0,
    totalBlockbusters: 0,
    totalRuns: lb.length,
    totalWins: 0,
  };

  let streak = 0;
  for (const entry of lb) {
    stats.totalFilmsProduced += entry.films.length;
    stats.totalRevenue += entry.earnings;
    if (entry.won) { stats.totalWins++; streak++; stats.longestWinStreak = Math.max(stats.longestWinStreak, streak); }
    else streak = 0;

    for (const f of entry.films) {
      stats.genreFilmCounts[f.genre] = (stats.genreFilmCounts[f.genre] || 0) + 1;
      if (f.nominated) stats.totalAwards++;
      if ((f.boxOffice || 0) > stats.highestSingleFilmRevenue) {
        stats.highestSingleFilmRevenue = f.boxOffice || 0;
        stats.highestSingleFilmTitle = f.title;
      }
      if (f.tier === 'BLOCKBUSTER') stats.totalBlockbusters++;
    }
  }

  // Estimate playtime: ~3 min per film + ~2 min per run overhead
  stats.totalPlaytimeMinutes = stats.totalFilmsProduced * 3 + stats.totalRuns * 2;

  try { localStorage.setItem(LEGACY_STATS_KEY, JSON.stringify(stats)); } catch {}
  return stats;
}

export function getGenresMastered(): string[] {
  const stats = getLifetimeStats();
  return Object.entries(stats.genreFilmCounts)
    .filter(([, count]) => count >= 10)
    .map(([genre]) => genre);
}

// ─── LEGACY MILESTONES (10 milestones × 3 tiers) ───

export type MilestoneTier = 'locked' | 'bronze' | 'silver' | 'gold';

export interface LegacyMilestoneDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  bronzeThreshold: number;
  silverThreshold: number;
  goldThreshold: number;
  getValue: (stats: LifetimeStats) => number;
  unit: string;
  rewardType: 'logo' | 'background' | 'cardBack' | 'theme';
  rewardLabel: string;
}

export const LEGACY_MILESTONES: LegacyMilestoneDef[] = [
  {
    id: 'prolific_producer',
    name: 'Prolific Producer',
    emoji: '🎬',
    description: 'Produce films across all runs',
    bronzeThreshold: 25,
    silverThreshold: 75,
    goldThreshold: 200,
    getValue: s => s.totalFilmsProduced,
    unit: 'films',
    rewardType: 'logo',
    rewardLabel: 'Classic Clapperboard Logo',
  },
  {
    id: 'box_office_titan',
    name: 'Box Office Titan',
    emoji: '💰',
    description: 'Earn lifetime box office revenue',
    bronzeThreshold: 500,
    silverThreshold: 2000,
    goldThreshold: 10000,
    getValue: s => s.totalRevenue,
    unit: '$M',
    rewardType: 'theme',
    rewardLabel: 'Golden Age Theme',
  },
  {
    id: 'award_magnet',
    name: 'Award Magnet',
    emoji: '🏆',
    description: 'Earn award nominations',
    bronzeThreshold: 5,
    silverThreshold: 20,
    goldThreshold: 50,
    getValue: s => s.totalAwards,
    unit: 'nominations',
    rewardType: 'background',
    rewardLabel: 'Red Carpet Background',
  },
  {
    id: 'genre_master',
    name: 'Genre Master',
    emoji: '🎭',
    description: 'Master genres (10+ films each)',
    bronzeThreshold: 1,
    silverThreshold: 3,
    goldThreshold: 7,
    getValue: s => Object.values(s.genreFilmCounts).filter(c => c >= 10).length,
    unit: 'genres',
    rewardType: 'cardBack',
    rewardLabel: 'Mosaic Card Back',
  },
  {
    id: 'blockbuster_king',
    name: 'Blockbuster King',
    emoji: '💎',
    description: 'Produce blockbuster-tier films',
    bronzeThreshold: 5,
    silverThreshold: 20,
    goldThreshold: 50,
    getValue: s => s.totalBlockbusters,
    unit: 'blockbusters',
    rewardType: 'logo',
    rewardLabel: 'Diamond Crown Logo',
  },
  {
    id: 'winning_streak',
    name: 'Winning Streak',
    emoji: '🔥',
    description: 'Achieve consecutive run wins',
    bronzeThreshold: 3,
    silverThreshold: 5,
    goldThreshold: 10,
    getValue: s => s.longestWinStreak,
    unit: 'wins',
    rewardType: 'background',
    rewardLabel: 'Blazing Streak Background',
  },
  {
    id: 'mega_hit',
    name: 'Mega Hit',
    emoji: '🌟',
    description: 'Highest single-film revenue',
    bronzeThreshold: 50,
    silverThreshold: 100,
    goldThreshold: 200,
    getValue: s => s.highestSingleFilmRevenue,
    unit: '$M',
    rewardType: 'cardBack',
    rewardLabel: 'Star Burst Card Back',
  },
  {
    id: 'veteran_runner',
    name: 'Veteran Runner',
    emoji: '🏃',
    description: 'Complete runs',
    bronzeThreshold: 10,
    silverThreshold: 30,
    goldThreshold: 100,
    getValue: s => s.totalRuns,
    unit: 'runs',
    rewardType: 'theme',
    rewardLabel: 'Neon Noir Theme',
  },
  {
    id: 'studio_legend',
    name: 'Studio Legend',
    emoji: '👑',
    description: 'Win runs',
    bronzeThreshold: 5,
    silverThreshold: 15,
    goldThreshold: 50,
    getValue: s => s.totalWins,
    unit: 'wins',
    rewardType: 'logo',
    rewardLabel: 'Crown & Laurel Logo',
  },
  {
    id: 'time_served',
    name: 'Time Served',
    emoji: '⏰',
    description: 'Spend time producing films',
    bronzeThreshold: 60,
    silverThreshold: 300,
    goldThreshold: 1000,
    getValue: s => s.totalPlaytimeMinutes,
    unit: 'minutes',
    rewardType: 'background',
    rewardLabel: 'Vintage Film Reel Background',
  },
];

export function getMilestoneTier(milestone: LegacyMilestoneDef, stats: LifetimeStats): MilestoneTier {
  const val = milestone.getValue(stats);
  if (val >= milestone.goldThreshold) return 'gold';
  if (val >= milestone.silverThreshold) return 'silver';
  if (val >= milestone.bronzeThreshold) return 'bronze';
  return 'locked';
}

export function getMilestoneProgress(milestone: LegacyMilestoneDef, stats: LifetimeStats): number {
  const val = milestone.getValue(stats);
  // Progress toward next tier
  const tier = getMilestoneTier(milestone, stats);
  if (tier === 'gold') return 1;
  if (tier === 'silver') return (val - milestone.silverThreshold) / (milestone.goldThreshold - milestone.silverThreshold);
  if (tier === 'bronze') return (val - milestone.bronzeThreshold) / (milestone.silverThreshold - milestone.bronzeThreshold);
  return val / milestone.bronzeThreshold;
}

export function getNextTierThreshold(milestone: LegacyMilestoneDef, stats: LifetimeStats): number | null {
  const tier = getMilestoneTier(milestone, stats);
  if (tier === 'gold') return null;
  if (tier === 'silver') return milestone.goldThreshold;
  if (tier === 'bronze') return milestone.silverThreshold;
  return milestone.bronzeThreshold;
}

// ─── COSMETIC REWARDS ───

export interface CosmeticReward {
  id: string;
  milestoneId: string;
  tier: MilestoneTier;
  type: 'logo' | 'background' | 'cardBack' | 'theme';
  label: string;
}

export function getUnlockedRewards(): CosmeticReward[] {
  const stats = getLifetimeStats();
  const rewards: CosmeticReward[] = [];
  for (const m of LEGACY_MILESTONES) {
    const tier = getMilestoneTier(m, stats);
    const tiers: MilestoneTier[] = ['bronze', 'silver', 'gold'];
    for (const t of tiers) {
      if (tiers.indexOf(tier) >= tiers.indexOf(t)) {
        rewards.push({
          id: `${m.id}_${t}`,
          milestoneId: m.id,
          tier: t,
          type: m.rewardType,
          label: `${t === 'gold' ? '🥇' : t === 'silver' ? '🥈' : '🥉'} ${m.rewardLabel} (${t})`,
        });
      }
    }
  }
  return rewards;
}

// ─── STUDIO LOGO SYSTEM ───

export type LogoShape = 'shield' | 'circle' | 'diamond' | 'star' | 'hexagon' | 'filmReel' | 'camera' | 'clapperboard' | 'spotlight' | 'megaphone' | 'ticket' | 'projector';
export const LOGO_SHAPES: LogoShape[] = ['shield', 'circle', 'diamond', 'star', 'hexagon', 'filmReel', 'camera', 'clapperboard', 'spotlight', 'megaphone', 'ticket', 'projector'];
export const LOGO_COLORS = ['#d4a843', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c', '#e91e63'];
export type AccentStyle = 'solid' | 'gradient' | 'outline' | 'glow';
export const ACCENT_STYLES: AccentStyle[] = ['solid', 'gradient', 'outline', 'glow'];

export interface StudioLogoConfig {
  shape: LogoShape;
  color: string;
  accent: AccentStyle;
}

const LOGO_CONFIG_KEY = 'greenlight_studio_logo';

export function getStudioLogoConfig(): StudioLogoConfig {
  try {
    const saved = localStorage.getItem(LOGO_CONFIG_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { shape: 'shield', color: '#d4a843', accent: 'solid' };
}

export function saveStudioLogoConfig(config: StudioLogoConfig) {
  try { localStorage.setItem(LOGO_CONFIG_KEY, JSON.stringify(config)); } catch {}
}

// ─── UI THEMES ───

export interface UITheme {
  id: string;
  name: string;
  bgColor: string;
  cardBg: string;
  accentColor: string;
  textColor: string;
}

export const UI_THEMES: UITheme[] = [
  { id: 'default', name: 'Classic Dark', bgColor: '#0a0a0a', cardBg: 'rgba(255,255,255,0.03)', accentColor: '#d4a843', textColor: '#ccc' },
  { id: 'golden_age', name: 'Golden Age', bgColor: '#1a1408', cardBg: 'rgba(212,168,67,0.05)', accentColor: '#ffd700', textColor: '#e8d5a3' },
  { id: 'neon_noir', name: 'Neon Noir', bgColor: '#0d0015', cardBg: 'rgba(155,89,182,0.05)', accentColor: '#bb86fc', textColor: '#d4b8f0' },
  { id: 'silver_screen', name: 'Silver Screen', bgColor: '#121212', cardBg: 'rgba(192,192,192,0.04)', accentColor: '#c0c0c0', textColor: '#b0b0b0' },
];

const ACTIVE_THEME_KEY = 'greenlight_active_theme';

export function getActiveTheme(): string {
  try { return localStorage.getItem(ACTIVE_THEME_KEY) || 'default'; } catch { return 'default'; }
}

export function setActiveTheme(id: string) {
  try { localStorage.setItem(ACTIVE_THEME_KEY, id); } catch {}
}

// ─── TRACK MILESTONES AT END OF RUN ───

export function updateLegacyAfterRun(): string[] {
  const oldStats = getLifetimeStats();
  const oldTiers: Record<string, MilestoneTier> = {};
  for (const m of LEGACY_MILESTONES) oldTiers[m.id] = getMilestoneTier(m, oldStats);

  const newStats = recomputeLifetimeStats();
  const newlyUnlocked: string[] = [];

  for (const m of LEGACY_MILESTONES) {
    const newTier = getMilestoneTier(m, newStats);
    if (newTier !== oldTiers[m.id] && newTier !== 'locked') {
      newlyUnlocked.push(`${m.emoji} ${m.name} — ${newTier.toUpperCase()}!`);
    }
  }

  return newlyUnlocked;
}

// ─── NARRATIVE LEGACY (kept from original) ───

export interface StudioLegacy {
  id: string;
  title: string;
  emoji: string;
  narrative: string;
  priority: number;
}

export function getStudioLegacy(state: GameState): StudioLegacy | null {
  const h = state.seasonHistory;
  if (h.length === 0) return null;

  const u = getUnlocks();
  const bigEarners = h.filter(s => s.boxOffice >= 80).length;
  const flops = h.filter(s => s.tier === 'FLOP').length;
  const nominations = h.filter(s => s.nominated).length;
  const chemistryCount = u.careerStats.chemistryTriggered || 0;

  const genreCounts: Record<string, number> = {};
  h.forEach(s => { genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1; });
  const maxGenreCount = Math.max(...Object.values(genreCounts));

  let maxConsecutiveFlops = 0, currentConsecutive = 0;
  for (const s of h) {
    if (s.tier === 'FLOP') { currentConsecutive++; maxConsecutiveFlops = Math.max(maxConsecutiveFlops, currentConsecutive); }
    else currentConsecutive = 0;
  }

  const legacies: (StudioLegacy & { check: () => boolean })[] = [
    { id: 'comeback_kid', title: 'THE COMEBACK KID', emoji: '🔄', narrative: `They wrote you off after strike two. But ${state.studioName || 'your studio'} clawed back from the brink.`, priority: 90, check: () => flops >= 2 && maxConsecutiveFlops >= 2 },
    { id: 'blockbuster_factory', title: 'THE BLOCKBUSTER FACTORY', emoji: '🏭', narrative: `${state.studioName || 'Your studio'} manufactured cultural events.`, priority: 85, check: () => bigEarners >= 3 },
    { id: 'talent_whisperer', title: 'THE TALENT WHISPERER', emoji: '🤝', narrative: `${state.studioName || 'Your studio'} had an uncanny gift for pairing talent.`, priority: 80, check: () => chemistryCount >= 5 },
    { id: 'critics_pet', title: "THE CRITIC'S PET", emoji: '🎭', narrative: `The critics championed ${state.studioName || 'your studio'}.`, priority: 75, check: () => nominations >= 4 },
    { id: 'genre_specialist', title: 'THE GENRE SPECIALIST', emoji: '🎯', narrative: `${state.studioName || 'Your studio'} doubled down on what it knew best.`, priority: 70, check: () => maxGenreCount >= 3 },
    { id: 'indie_darling', title: 'THE INDIE DARLING', emoji: '🌱', narrative: `Just pure, scrappy filmmaking on a shoestring.`, priority: 65, check: () => { const avgBO = state.totalEarnings / Math.max(1, h.length); return avgBO < 40 && h.every(s => s.tier !== 'BLOCKBUSTER'); } },
    { id: 'lucky_fool', title: 'THE LUCKY FOOL', emoji: '🍀', narrative: `Two flops and you still won? The math doesn't add up.`, priority: 60, check: () => flops >= 2 },
  ];

  for (const legacy of legacies.sort((a, b) => b.priority - a.priority)) {
    if (legacy.check()) return { id: legacy.id, title: legacy.title, emoji: legacy.emoji, narrative: legacy.narrative, priority: legacy.priority };
  }
  return null;
}

// ─── CAREER MILESTONES (kept from original) ───

export interface CareerMilestone {
  id: string;
  label: string;
  emoji: string;
  value: number | string;
}

export function getCareerMilestones(): CareerMilestone[] {
  const stats = getLifetimeStats();
  return [
    { id: 'total_films', label: 'Total Films Produced', emoji: '🎬', value: stats.totalFilmsProduced },
    { id: 'total_bo', label: 'Lifetime Box Office', emoji: '💰', value: `$${stats.totalRevenue.toFixed(0)}M` },
    { id: 'win_streak', label: 'Longest Win Streak', emoji: '🔥', value: stats.longestWinStreak },
    { id: 'blockbusters', label: 'Total Blockbusters', emoji: '💎', value: stats.totalBlockbusters },
    { id: 'total_runs', label: 'Total Runs', emoji: '🏃', value: stats.totalRuns },
    { id: 'total_wins', label: 'Total Wins', emoji: '🏆', value: stats.totalWins },
    { id: 'genres_mastered', label: 'Genres Mastered', emoji: '🎭', value: getGenresMastered().length },
    { id: 'playtime', label: 'Time Played', emoji: '⏰', value: `~${stats.totalPlaytimeMinutes}m` },
  ];
}
