/**
 * R235: Narrative Campaign System
 * 5 campaign storylines with objectives, starting conditions, and rewards.
 */

import type { Genre } from './types';

// ─── Types ───

export interface CampaignObjective {
  id: string;
  description: string;
  /** Check function receives campaign progress state */
  check: (progress: CampaignProgress) => boolean;
  /** Milestone label shown when completed */
  milestoneLabel: string;
}

export interface CampaignStartingConditions {
  budgetMod: number;       // added to starting budget
  reputationMod: number;   // added to starting reputation
  extraCards?: string[];    // bonus card IDs at start
}

export interface CampaignReward {
  type: 'cosmetic' | 'card' | 'title';
  id: string;
  name: string;
  description: string;
  emoji: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  artDescription: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  startingConditions: CampaignStartingConditions;
  objectives: CampaignObjective[];
  rewards: CampaignReward[];
  /** Index in the campaign list; used for unlock gating */
  order: number;
}

/** Tracks a single film result for campaign objective checking */
export interface CampaignFilmRecord {
  title: string;
  genre: Genre;
  quality: number;
  boxOffice: number;
  tier: 'FLOP' | 'HIT' | 'SMASH' | 'BLOCKBUSTER';
  season: number;
  nominated: boolean;
  festivalAwards?: { festivalId: string; award: string }[];
}

export interface CampaignProgress {
  campaignId: string;
  films: CampaignFilmRecord[];
  totalBoxOffice: number;
  completedObjectiveIds: string[];
  roundsPlayed: number;
  startedAt: string;       // ISO date
  completedAt?: string;    // ISO date when all objectives done
  active: boolean;
}

export interface CampaignSaveData {
  /** Progress for each campaign attempted */
  progress: Record<string, CampaignProgress>;
  /** IDs of completed campaigns (all objectives met) */
  completedCampaignIds: string[];
}

// ─── Quality helpers ───

function isSRank(quality: number): boolean {
  // S-rank = quality >= 70 (top tier)
  return quality >= 70;
}

function isHitInGenre(film: CampaignFilmRecord, genre: Genre): boolean {
  return film.genre === genre && (film.tier === 'SMASH' || film.tier === 'BLOCKBUSTER');
}

// ─── Campaign Definitions ───

export const CAMPAIGNS: Campaign[] = [
  {
    id: 'indie_darling',
    name: 'Indie Darling',
    description: 'Start with a shoestring budget and prove yourself at film festivals before going mainstream. The ultimate underdog story.',
    artDescription: 'A cramped garage studio with a single camera, a folding chair director\'s seat, and fairy lights strung between exposed pipes. A Sundance laurel wreath glows on the wall.',
    difficulty: 2,
    order: 0,
    startingConditions: {
      budgetMod: -8,        // Start with tiny budget ($7M)
      reputationMod: -1,    // Lower starting rep
    },
    objectives: [
      {
        id: 'indie_festival',
        description: 'Win a festival award (Sundance equivalent)',
        milestoneLabel: '🎬 Festival Darling',
        check: (p) => p.films.some(f => f.festivalAwards && f.festivalAwards.length > 0),
      },
      {
        id: 'indie_smash',
        description: 'Release a SMASH or better film',
        milestoneLabel: '💥 Breakout Hit',
        check: (p) => p.films.some(f => f.tier === 'SMASH' || f.tier === 'BLOCKBUSTER'),
      },
      {
        id: 'indie_mainstream',
        description: 'Earn $50M total box office',
        milestoneLabel: '🌟 Gone Mainstream',
        check: (p) => p.totalBoxOffice >= 50,
      },
    ],
    rewards: [
      { type: 'title', id: 'title_indie_darling', name: 'Indie Darling', description: 'Awarded for completing the Indie Darling campaign', emoji: '🎬' },
      { type: 'cosmetic', id: 'frame_sundance', name: 'Festival Laurels Frame', description: 'A laurel wreath border for your studio card', emoji: '🏆' },
    ],
  },
  {
    id: 'studio_rescue',
    name: 'Studio Rescue',
    description: 'You\'ve inherited a failing studio drowning in debt. Clear the books and release 3 profitable films in 10 rounds — or watch it all crumble.',
    artDescription: 'A grand but crumbling art-deco studio gate with foreclosure notices plastered across it. Through the gate, soundstages sit dark and overgrown.',
    difficulty: 3,
    order: 1,
    startingConditions: {
      budgetMod: -5,
      reputationMod: -2,     // studio has bad reputation
    },
    objectives: [
      {
        id: 'rescue_profitable_3',
        description: 'Release 3 profitable films (HIT or better)',
        milestoneLabel: '💰 Back in Black',
        check: (p) => p.films.filter(f => f.tier !== 'FLOP').length >= 3,
      },
      {
        id: 'rescue_no_flop_streak',
        description: 'Complete 3 films in a row without a FLOP',
        milestoneLabel: '📈 Steady Hands',
        check: (p) => {
          let streak = 0;
          for (const f of p.films) {
            if (f.tier !== 'FLOP') streak++;
            else streak = 0;
            if (streak >= 3) return true;
          }
          return false;
        },
      },
      {
        id: 'rescue_within_10',
        description: 'Complete all objectives within 10 rounds',
        milestoneLabel: '⏱️ Beat the Clock',
        check: (p) => {
          // This objective is "meta" — it's satisfied if the other objectives
          // are completed and total rounds <= 10
          const profitable = p.films.filter(f => f.tier !== 'FLOP').length >= 3;
          let streak = 0, hasStreak = false;
          for (const f of p.films) {
            if (f.tier !== 'FLOP') streak++;
            else streak = 0;
            if (streak >= 3) hasStreak = true;
          }
          return profitable && hasStreak && p.roundsPlayed <= 10;
        },
      },
    ],
    rewards: [
      { type: 'title', id: 'title_studio_savior', name: 'Studio Savior', description: 'Rescued a failing studio from the brink', emoji: '🏗️' },
      { type: 'card', id: 'card_bailout', name: 'Emergency Bailout', description: 'A powerful crisis recovery card', emoji: '💸' },
    ],
  },
  {
    id: 'genre_master',
    name: 'Genre Master',
    description: 'Prove your versatility by releasing a hit in every genre. Hollywood\'s ultimate polymath challenge.',
    artDescription: 'A director\'s chair surrounded by seven doors, each opening to a different world — a neon-lit city, a haunted mansion, a starship bridge, a romantic Parisian café.',
    difficulty: 4,
    order: 2,
    startingConditions: {
      budgetMod: 0,
      reputationMod: 0,
    },
    objectives: [
      {
        id: 'genre_action',
        description: 'Release a hit Action film',
        milestoneLabel: '💥 Action Hero',
        check: (p) => p.films.some(f => isHitInGenre(f, 'Action')),
      },
      {
        id: 'genre_comedy',
        description: 'Release a hit Comedy film',
        milestoneLabel: '😂 Comedy King',
        check: (p) => p.films.some(f => isHitInGenre(f, 'Comedy')),
      },
      {
        id: 'genre_drama',
        description: 'Release a hit Drama film',
        milestoneLabel: '🎭 Drama Virtuoso',
        check: (p) => p.films.some(f => isHitInGenre(f, 'Drama')),
      },
      {
        id: 'genre_horror',
        description: 'Release a hit Horror film',
        milestoneLabel: '👻 Horror Master',
        check: (p) => p.films.some(f => isHitInGenre(f, 'Horror')),
      },
      {
        id: 'genre_scifi',
        description: 'Release a hit Sci-Fi film',
        milestoneLabel: '🚀 Sci-Fi Visionary',
        check: (p) => p.films.some(f => isHitInGenre(f, 'Sci-Fi')),
      },
      {
        id: 'genre_romance',
        description: 'Release a hit Romance film',
        milestoneLabel: '💕 Romance Auteur',
        check: (p) => p.films.some(f => isHitInGenre(f, 'Romance')),
      },
      {
        id: 'genre_thriller',
        description: 'Release a hit Thriller film',
        milestoneLabel: '🔪 Thriller Specialist',
        check: (p) => p.films.some(f => isHitInGenre(f, 'Thriller')),
      },
    ],
    rewards: [
      { type: 'title', id: 'title_genre_master', name: 'Genre Master', description: 'Proved mastery across every genre', emoji: '🌈' },
      { type: 'cosmetic', id: 'badge_versatile', name: 'Versatility Badge', description: 'A rainbow film strip badge', emoji: '🎞️' },
    ],
  },
  {
    id: 'oscar_chase',
    name: 'Oscar Chase',
    description: 'Forget the money — this is about art. Craft 3 S-rank masterpieces worthy of the Academy\'s highest honor.',
    artDescription: 'A spotlit podium on an empty stage, three golden statuettes waiting. The audience seats stretch into infinite darkness.',
    difficulty: 4,
    order: 3,
    startingConditions: {
      budgetMod: 3,         // Slightly more budget for quality investment
      reputationMod: 1,     // Start with good reputation
    },
    objectives: [
      {
        id: 'oscar_srank_1',
        description: 'Produce your first S-rank film (quality 70+)',
        milestoneLabel: '⭐ First Masterpiece',
        check: (p) => p.films.filter(f => isSRank(f.quality)).length >= 1,
      },
      {
        id: 'oscar_srank_2',
        description: 'Produce a second S-rank film',
        milestoneLabel: '⭐⭐ Acclaimed Auteur',
        check: (p) => p.films.filter(f => isSRank(f.quality)).length >= 2,
      },
      {
        id: 'oscar_srank_3',
        description: 'Produce a third S-rank film',
        milestoneLabel: '⭐⭐⭐ Living Legend',
        check: (p) => p.films.filter(f => isSRank(f.quality)).length >= 3,
      },
    ],
    rewards: [
      { type: 'title', id: 'title_oscar_winner', name: 'Academy Darling', description: 'Three S-rank masterpieces under your belt', emoji: '🏆' },
      { type: 'cosmetic', id: 'gold_studio_border', name: 'Golden Studio Border', description: 'A prestigious gold border for your studio card', emoji: '✨' },
    ],
  },
  {
    id: 'blockbuster_factory',
    name: 'Blockbuster Factory',
    description: 'Art is nice, but money talks. Pump out box office gold until you hit $500M total. Pure commercial domination.',
    artDescription: 'A massive industrial studio complex with smokestacks shaped like film reels, conveyor belts carrying movie posters, and a giant LED counter showing rising box office numbers.',
    difficulty: 5,
    order: 4,
    startingConditions: {
      budgetMod: 5,         // Extra starting capital
      reputationMod: 0,
    },
    objectives: [
      {
        id: 'factory_100m',
        description: 'Reach $100M total box office',
        milestoneLabel: '💵 First Hundred Mill',
        check: (p) => p.totalBoxOffice >= 100,
      },
      {
        id: 'factory_250m',
        description: 'Reach $250M total box office',
        milestoneLabel: '💰 Quarter Billion',
        check: (p) => p.totalBoxOffice >= 250,
      },
      {
        id: 'factory_500m',
        description: 'Reach $500M total box office',
        milestoneLabel: '🤑 Half Billion Club',
        check: (p) => p.totalBoxOffice >= 500,
      },
    ],
    rewards: [
      { type: 'title', id: 'title_blockbuster_king', name: 'Blockbuster King', description: 'Dominated the box office with $500M+', emoji: '👑' },
      { type: 'card', id: 'card_money_printer', name: 'Money Printer', description: 'A legendary revenue-boosting card', emoji: '🖨️' },
    ],
  },
];

// ─── Persistence ───

const STORAGE_KEY = 'greenlight-campaigns';

export function loadCampaignData(): CampaignSaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { progress: {}, completedCampaignIds: [] };
}

export function saveCampaignData(data: CampaignSaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

// ─── Campaign Unlock Logic ───

export function isCampaignUnlocked(campaign: Campaign, completedIds: string[]): boolean {
  // First campaign is always unlocked
  if (campaign.order === 0) return true;
  // Others require the previous campaign to be completed
  const prev = CAMPAIGNS.find(c => c.order === campaign.order - 1);
  return prev ? completedIds.includes(prev.id) : false;
}

// ─── Campaign Progress Helpers ───

export function createCampaignProgress(campaignId: string): CampaignProgress {
  return {
    campaignId,
    films: [],
    totalBoxOffice: 0,
    completedObjectiveIds: [],
    roundsPlayed: 0,
    startedAt: new Date().toISOString(),
    active: true,
  };
}

/**
 * Called after each film release to update campaign progress.
 * Returns newly completed objective IDs (for celebration UI).
 */
export function updateCampaignAfterFilm(
  film: CampaignFilmRecord,
  data: CampaignSaveData,
): { newlyCompleted: string[]; campaignComplete: boolean } {
  // Find active campaign progress
  const active = Object.values(data.progress).find(p => p.active);
  if (!active) return { newlyCompleted: [], campaignComplete: false };

  const campaign = CAMPAIGNS.find(c => c.id === active.campaignId);
  if (!campaign) return { newlyCompleted: [], campaignComplete: false };

  // Add film record
  active.films.push(film);
  active.totalBoxOffice += film.boxOffice;
  active.roundsPlayed++;

  // Check objectives
  const newlyCompleted: string[] = [];
  for (const obj of campaign.objectives) {
    if (active.completedObjectiveIds.includes(obj.id)) continue;
    if (obj.check(active)) {
      active.completedObjectiveIds.push(obj.id);
      newlyCompleted.push(obj.id);
    }
  }

  // Check if all objectives complete
  const allDone = campaign.objectives.every(o => active.completedObjectiveIds.includes(o.id));
  if (allDone && !active.completedAt) {
    active.completedAt = new Date().toISOString();
    active.active = false;
    if (!data.completedCampaignIds.includes(campaign.id)) {
      data.completedCampaignIds.push(campaign.id);
    }
  }

  saveCampaignData(data);
  return { newlyCompleted, campaignComplete: allDone };
}

export function getActiveCampaign(data: CampaignSaveData): { campaign: Campaign; progress: CampaignProgress } | null {
  const active = Object.values(data.progress).find(p => p.active);
  if (!active) return null;
  const campaign = CAMPAIGNS.find(c => c.id === active.campaignId);
  if (!campaign) return null;
  return { campaign, progress: active };
}

export function startCampaign(campaignId: string, data: CampaignSaveData): CampaignSaveData {
  // Deactivate any existing active campaign
  for (const p of Object.values(data.progress)) {
    p.active = false;
  }
  data.progress[campaignId] = createCampaignProgress(campaignId);
  saveCampaignData(data);
  return data;
}

export function getCampaignById(id: string): Campaign | undefined {
  return CAMPAIGNS.find(c => c.id === id);
}
