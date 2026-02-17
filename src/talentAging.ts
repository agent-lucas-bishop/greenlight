// Talent Aging System — Dynamic talent evolution within a run
// Tracks seasons on market, hire counts, moods, and rising stars

import type { Talent, TalentType, Genre, CardTemplate, RewardTier } from './types';
import { rng } from './seededRng';

// ─── TYPES ───

export type TalentMood = 'cautious' | 'hot' | 'hungry' | null;

export interface TalentAgingData {
  seasonsOnMarket: number;     // how many seasons available without being hired
  timesHiredThisRun: number;   // hire count within the current run
  peakSeasonsLeft: number;     // remaining seasons of "peak" bonus (0 = not peaking)
  isRisingStar: boolean;       // rising star flag
  risingStarSkill: number;     // base skill before rising star bonuses (tracks growth)
  mood: TalentMood;
  moodApplied: boolean;        // whether mood cost/quality modifier has been consumed
  lastFilmTier: RewardTier | null; // tier of last film this talent was in
  seasonsUnhired: number;      // consecutive seasons not hired (for "hungry")
  faded: boolean;              // has faded (skill reduced)
}

// Global aging state for the current run, keyed by talent name
let agingState: Record<string, TalentAgingData> = {};

export function getAgingState(): Record<string, TalentAgingData> {
  return agingState;
}

export function resetAgingState() {
  agingState = {};
}

export function getAgingData(name: string): TalentAgingData {
  if (!agingState[name]) {
    agingState[name] = {
      seasonsOnMarket: 0,
      timesHiredThisRun: 0,
      peakSeasonsLeft: 0,
      isRisingStar: false,
      risingStarSkill: 0,
      mood: null,
      moodApplied: false,
      lastFilmTier: null,
      seasonsUnhired: 0,
      faded: false,
    };
  }
  return agingState[name];
}

// ─── SEASON PROGRESSION ───

/** Call at end of each season to age all talent in the market (not hired this season) */
export function ageTalentOnMarket(marketNames: string[]) {
  for (const name of marketNames) {
    const data = getAgingData(name);
    data.seasonsOnMarket++;
    data.seasonsUnhired++;
  }
}

/** Call when a talent is hired */
export function recordHire(name: string) {
  const data = getAgingData(name);
  data.timesHiredThisRun++;
  data.seasonsUnhired = 0;
  
  // Rising star: +1 skill each hire, up to skill 5
  // (actual skill modification happens in applyAgingToTalent)
  
  // Peak: after 2+ hires, peak for 2 seasons
  if (data.timesHiredThisRun >= 2) {
    data.peakSeasonsLeft = 2;
  }
}

/** Call after a film resolves to set mood based on result */
export function recordFilmResult(castNames: string[], tier: RewardTier) {
  for (const name of castNames) {
    const data = getAgingData(name);
    data.lastFilmTier = tier;
    data.moodApplied = false;
    
    if (tier === 'FLOP') {
      data.mood = 'cautious';
    } else if (tier === 'BLOCKBUSTER') {
      data.mood = 'hot';
    }
    // HIT and SMASH don't change mood
  }
}

/** Tick peak counters at season end */
export function tickPeakCounters() {
  for (const data of Object.values(agingState)) {
    if (data.peakSeasonsLeft > 0) {
      data.peakSeasonsLeft--;
    }
  }
}

/** Check and apply hungry mood for talent unhired for 3+ seasons */
export function checkHungryMood() {
  for (const [, data] of Object.entries(agingState)) {
    if (data.seasonsUnhired >= 3 && data.mood !== 'cautious' && data.mood !== 'hot') {
      data.mood = 'hungry';
      data.moodApplied = false;
    }
  }
}

// ─── APPLY AGING TO TALENT ───

/** Apply aging modifiers to a talent object. Returns modified copy. */
export function applyAgingToTalent(talent: Talent): Talent {
  const data = getAgingData(talent.name);
  let t = { ...talent };
  
  // Fade: 4+ seasons on market without hire → skill -1, min 1
  if (data.seasonsOnMarket >= 4 && !data.faded) {
    t.skill = Math.max(1, t.skill - 1);
    data.faded = true;
  }
  
  // Peak: +1 skill while peaking
  if (data.peakSeasonsLeft > 0) {
    t.skill = t.skill + 1;
  }
  
  // Rising star growth: +1 skill per hire, up to 5
  if (data.isRisingStar && data.timesHiredThisRun > 0) {
    const bonusSkill = Math.min(data.timesHiredThisRun, 5 - data.risingStarSkill);
    if (bonusSkill > 0) {
      t.skill = Math.min(5, data.risingStarSkill + bonusSkill);
    }
  }
  
  // Mood cost/quality adjustments
  if (data.mood === 'cautious') {
    t.cost = t.cost + 1;
  } else if (data.mood === 'hot') {
    t.cost = t.cost + 2;
  } else if (data.mood === 'hungry') {
    t.cost = Math.max(1, t.cost - 2);
  }
  
  return t;
}

/** Get quality bonus from mood (applied during production/release) */
export function getMoodQualityBonus(name: string): number {
  const data = getAgingData(name);
  if (data.mood === 'hot') return 3;
  if (data.mood === 'hungry') return 1;
  return 0;
}

// ─── RISING STAR GENERATION ───

const RISING_STAR_NAMES: Record<TalentType, string[]> = {
  Lead: ['Aria Voss', 'Kai Reeves', 'Mira Shah', 'Dex Calloway', 'Luna Ferris', 'Nico Tran'],
  Support: ['Zion Blake', 'Petra Wells', 'Remy Cruz', 'Sage Ito', 'Cleo Marsh', 'Ori Bakker'],
  Director: ['Indy Morales', 'Kit Ashford', 'Sol Aguilar', 'Juno Ekström', 'Wren Okafor', 'Avery Lund'],
  Crew: ['River Nyx', 'Blair Kato', 'Emery Voss', 'Quinn Reece', 'Morgan Seo', 'Tatum Diaz'],
};

const usedRisingStarNames = new Set<string>();

/** Generate a single rising star talent for a new season */
export function generateRisingStar(season: number): Talent {
  const types: TalentType[] = ['Lead', 'Support', 'Director', 'Crew'];
  const type = types[Math.floor(rng() * types.length)];
  const names = RISING_STAR_NAMES[type].filter(n => !usedRisingStarNames.has(n));
  const name = names.length > 0 ? names[Math.floor(rng() * names.length)] : `Rising Star S${season}`;
  usedRisingStarNames.add(name);
  
  // Rising stars: skill 2, cost $3, simple but promising cards
  const cards: CardTemplate[] = [
    {
      name: 'Raw Talent',
      cardType: 'action',
      baseQuality: 3,
      synergyText: 'Potential: quality doubles if this is the first action card played',
      synergyCondition: (ctx) => ctx.actionCardsPlayed === 0 ? { bonus: 3 } : { bonus: 0 },
      riskTag: '🟢',
      tags: ['heart' as any],
    },
    {
      name: 'Eager Energy',
      cardType: 'action',
      baseQuality: 2,
      synergyText: '+2 if drawn in first 3 cards',
      synergyCondition: (ctx) => ctx.drawNumber <= 3 ? { bonus: 2 } : { bonus: 0 },
      riskTag: '🟢',
      tags: ['momentum' as any],
    },
  ];
  
  const id = `rising-star-${name.toLowerCase().replace(/\s+/g, '-')}-s${season}`;
  
  const talent: Talent = {
    id,
    name,
    type,
    skill: 2,
    heat: 0,
    cost: 3,
    cards,
    trait: 'Rising Star',
    traitDesc: 'Gains +1 skill each time hired (up to 5). Full of potential!',
  };
  
  // Initialize aging data
  const data = getAgingData(name);
  data.isRisingStar = true;
  data.risingStarSkill = 2;
  
  return talent;
}

export function resetRisingStarNames() {
  usedRisingStarNames.clear();
}

// ─── MOOD DISPLAY ───

export interface MoodBadge {
  emoji: string;
  label: string;
  color: string;
  description: string;
}

export function getMoodBadge(name: string): MoodBadge | null {
  const data = agingState[name];
  if (!data) return null;
  
  if (data.mood === 'cautious') {
    return { emoji: '😰', label: 'CAUTIOUS', color: '#e67e22', description: 'After a FLOP: costs +$1' };
  }
  if (data.mood === 'hot') {
    return { emoji: '🔥', label: 'HOT', color: '#e74c3c', description: 'After BLOCKBUSTER: costs +$2 but +3 quality' };
  }
  if (data.mood === 'hungry') {
    return { emoji: '🍽️', label: 'HUNGRY', color: '#2ecc71', description: 'Unhired 3 seasons: costs -$2, +1 quality' };
  }
  return null;
}

export function getStatusBadge(name: string): MoodBadge | null {
  const data = agingState[name];
  if (!data) return null;
  
  if (data.isRisingStar) {
    return { emoji: '⭐', label: 'RISING STAR', color: '#f1c40f', description: `Potential: +1 skill each hire (up to 5). Hired ${data.timesHiredThisRun}x` };
  }
  if (data.peakSeasonsLeft > 0) {
    return { emoji: '📈', label: 'PEAKING', color: '#2ecc71', description: `On fire! +1 skill for ${data.peakSeasonsLeft} more season${data.peakSeasonsLeft > 1 ? 's' : ''}` };
  }
  if (data.faded) {
    return { emoji: '📉', label: 'FADED', color: '#666', description: 'Too long without work. Skill reduced.' };
  }
  return null;
}
