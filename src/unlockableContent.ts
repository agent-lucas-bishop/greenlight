// Meta-Progression: Unlockable Scripts & Talent
// Stored in localStorage (separate key from saves), checked at run end and film completion.
// Unlocked content enters normal random pools.

import type { CardTemplate, CardTag, SynergyContext, SynergyResult } from './types';
import type { UnlockState } from './unlocks';
import { getUnlocks, saveUnlocks } from './unlocks';
import { getGenreMasteryState, getMasteryTier } from './genreMastery';
import { CHALLENGE_MODIFIERS } from './challengeModifiers';

const noSynergy = () => ({ bonus: 0 });

// ─── UNLOCK DEFINITIONS ───

export interface UnlockableDef {
  id: string;
  name: string;
  emoji: string;
  type: 'script' | 'talent';
  conditionText: string; // shown to player as "???" requirement
  check: (u: UnlockState) => boolean;
}

export const UNLOCKABLE_DEFS: UnlockableDef[] = [
  // ── Unlockable Scripts ──
  {
    id: 'script_crimson_ritual',
    name: 'Crimson Ritual',
    emoji: '🩸',
    type: 'script',
    conditionText: 'Produce 10 Horror films across all runs',
    check: (u) => (u.careerStats.genreFilms['Horror'] || 0) >= 10,
  },
  {
    id: 'script_golden_age',
    name: 'The Golden Age',
    emoji: '✨',
    type: 'script',
    conditionText: 'Reach Prestige Level 5',
    check: (_u) => {
      // Check prestige from localStorage directly (avoid circular import)
      try {
        const p = JSON.parse(localStorage.getItem('greenlight_prestige') || '{}');
        return (p.level || 0) >= 5;
      } catch { return false; }
    },
  },
  {
    id: 'script_billion_dollar_baby',
    name: 'Billion Dollar Baby',
    emoji: '💰',
    type: 'script',
    conditionText: 'Earn $500M career total box office',
    check: (u) => u.careerStats.totalBoxOffice >= 500,
  },
  {
    id: 'script_impossible_dream',
    name: 'The Impossible Dream',
    emoji: '🏔️',
    type: 'script',
    conditionText: 'Win a run with all 4 challenge modifiers active',
    check: (u) => {
      // Check if challengesCompleted contains 'all_modifiers'
      return u.careerStats.challengesCompleted?.includes('all_modifiers_win') || false;
    },
  },
  // ── Unlockable Talent ──
  {
    id: 'talent_consistency_king',
    name: 'Morgan Steele',
    emoji: '🎯',
    type: 'talent',
    conditionText: 'Complete a run with zero FLOPs',
    check: (u) => {
      return u.careerStats.challengesCompleted?.includes('zero_flops_run') || false;
    },
  },
  {
    id: 'talent_genre_specialist',
    name: 'Yara Okonkwo',
    emoji: '🌈',
    type: 'talent',
    conditionText: 'Reach genre "Gold" tier or higher in any genre',
    check: (_u) => {
      try {
        const state = getGenreMasteryState();
        return Object.values(state.genres).some(g => {
          const tier = getMasteryTier(g.totalBoxOffice);
          return tier.tier === 'gold' || tier.tier === 'platinum';
        });
      } catch { return false; }
    },
  },
];

// ─── UNLOCKABLE SCRIPT DATA ───

const CRIMSON_RITUAL_CARDS: CardTemplate[] = [
  {
    name: 'Blood Moon Rising',
    cardType: 'action',
    baseQuality: 2,
    synergyText: '💀 +3 if draw 1-2. +2 per Chaos tag (max +4). The ritual begins at dusk.',
    synergyCondition: (ctx) => {
      let bonus = ctx.drawNumber <= 2 ? 3 : 0;
      bonus += Math.min((ctx.tagsPlayed['chaos'] || 0) * 2, 4);
      return bonus > 0 ? { bonus, description: 'The ritual begins!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['chaos'] as CardTag[],
  },
  {
    name: 'Sacrificial Scene',
    cardType: 'action',
    baseQuality: 2,
    synergyText: '💀 +3 if any Incident played. +2 if Director card played. Dark perfection.',
    synergyCondition: (ctx) => {
      let bonus = ctx.incidentCount > 0 ? 3 : 0;
      if (ctx.playedCards.some(c => c.sourceType === 'director')) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Sacrifice accepted!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['chaos', 'spectacle'] as CardTag[],
  },
  {
    name: 'Final Incantation',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💀 +5 if draw 5+ AND 3+ Chaos tags. The ritual culminates.',
    synergyCondition: (ctx) => {
      return (ctx.drawNumber >= 5 && (ctx.tagsPlayed['chaos'] || 0) >= 3) ? { bonus: 5, description: 'THE RITUAL IS COMPLETE!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['chaos'] as CardTag[],
  },
  {
    name: 'Cursed Relic',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card IS an Incident. Win +6, Lose -2. Embrace the darkness!',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: {
      description: 'Bet the next card IS an Incident',
      successBonus: 6,
      failPenalty: -2,
      condition: (ctx: SynergyContext) => ctx.remainingDeck.length > 0 && ctx.remainingDeck[0].cardType === 'incident',
      oddsHint: (ctx: SynergyContext) => { const r = ctx.remainingDeck; const n = r.filter(c => c.cardType === 'incident').length; return `${n} of ${r.length} are Incidents`; },
    },
    tags: ['chaos'] as CardTag[],
  },
  {
    name: 'Demonic Possession',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: 'Actor goes full method. Adds 2 Chaos tags. But audiences can\'t look away.',
    synergyCondition: noSynergy,
    riskTag: '🔴',
    tags: ['chaos', 'chaos'] as CardTag[],
  },
  {
    name: 'Forbidden Knowledge',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'Some things should stay buried. Lose $2M.',
    synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'The cost of forbidden knowledge!' }),
    riskTag: '🔴',
    tags: ['chaos'] as CardTag[],
  },
];

const GOLDEN_AGE_CARDS: CardTemplate[] = [
  {
    name: 'Auteur\'s Vision',
    cardType: 'action',
    baseQuality: 2,
    synergyText: '🎯💕✨ +1 per unique tag type played (max +5). A masterclass in filmmaking.',
    synergyCondition: (ctx) => {
      const u = Object.keys(ctx.tagsPlayed).length;
      return u > 0 ? { bonus: Math.min(u, 5), description: `${u} tag types = auteur vision!` } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['precision', 'heart'] as CardTag[],
  },
  {
    name: 'Standing Ovation',
    cardType: 'action',
    baseQuality: 2,
    synergyText: '💕 +3 if 2+ Actor cards AND Director card played. The ensemble triumphs.',
    synergyCondition: (ctx) => {
      const hasActors = ctx.playedCards.filter(c => c.sourceType === 'actor').length >= 2;
      const hasDir = ctx.playedCards.some(c => c.sourceType === 'director');
      return (hasActors && hasDir) ? { bonus: 3, description: 'Standing ovation!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['heart', 'spectacle'] as CardTag[],
  },
  {
    name: 'Awards Speech',
    cardType: 'action',
    baseQuality: 2,
    synergyText: '🎯 +4 if draw 5+ AND 0 Incidents. Pristine filmmaking.',
    synergyCondition: (ctx) => {
      return (ctx.drawNumber >= 5 && ctx.incidentCount === 0) ? { bonus: 4, description: 'Flawless cinema!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['precision'] as CardTag[],
  },
  {
    name: 'Creative Differences',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card has high value. Win +6, Lose -4.',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: {
      description: 'Bet the next card has high positive value',
      successBonus: 6,
      failPenalty: -4,
      condition: (ctx: SynergyContext) => {
        if (ctx.remainingDeck.length === 0) return false;
        return ctx.remainingDeck[0].baseQuality >= 1 && ctx.remainingDeck[0].cardType === 'action';
      },
      oddsHint: (ctx: SynergyContext) => { const r = ctx.remainingDeck; const n = r.filter(c => c.cardType === 'action').length; return `${n} of ${r.length} are Actions`; },
    },
    tags: ['precision'] as CardTag[],
  },
  {
    name: 'Ego Clash',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'Two visionaries collide. -2 if no Precision tags. Lose $1M.',
    synergyCondition: (ctx) => ({ bonus: (ctx.tagsPlayed['precision'] || 0) === 0 ? -2 : 0, budgetMod: -1, description: 'Artistic disagreement!' }),
    riskTag: '🔴',
  },
  {
    name: 'Studio Pressure',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: 'Studio wants changes. The art suffers.',
    synergyCondition: noSynergy,
    riskTag: '🔴',
  },
];

const BILLION_DOLLAR_BABY_CARDS: CardTemplate[] = [
  {
    name: 'Opening Weekend Frenzy',
    cardType: 'action',
    baseQuality: 2,
    synergyText: '✨🔥 +3 if draw 1-2. +1 per Spectacle tag (max +3). Maximum hype.',
    synergyCondition: (ctx) => {
      let bonus = ctx.drawNumber <= 2 ? 3 : 0;
      bonus += Math.min(ctx.tagsPlayed['spectacle'] || 0, 3);
      return bonus > 0 ? { bonus, description: 'Record opening!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['spectacle', 'momentum'] as CardTag[],
  },
  {
    name: 'Global Premiere',
    cardType: 'action',
    baseQuality: 2,
    synergyText: '✨ +2 if Crew card played. +2 if 3+ Spectacle tags. Worldwide spectacle.',
    synergyCondition: (ctx) => {
      let bonus = ctx.playedCards.some(c => c.sourceType === 'crew') ? 2 : 0;
      if ((ctx.tagsPlayed['spectacle'] || 0) >= 3) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Global phenomenon!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['spectacle'] as CardTag[],
  },
  {
    name: 'Franchise Potential',
    cardType: 'action',
    baseQuality: 2,
    synergyText: '🔥 +3 if 3+ cards played. +2 if Lead Skill 5+. Universe-building.',
    synergyCondition: (ctx) => {
      let bonus = ctx.playedCards.length >= 3 ? 3 : 0;
      if (ctx.leadSkill >= 5) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Franchise launched!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['momentum'] as CardTag[],
  },
  {
    name: 'Box Office Bomb Risk',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card is Action. Win +5, Lose -5. Big budget, big risk.',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: {
      description: 'Bet the next card is an Action',
      successBonus: 5,
      failPenalty: -5,
      condition: (ctx: SynergyContext) => ctx.remainingDeck.length > 0 && ctx.remainingDeck[0].cardType === 'action',
      oddsHint: (ctx: SynergyContext) => { const r = ctx.remainingDeck; const n = r.filter(c => c.cardType === 'action').length; return `${n} of ${r.length} are Actions`; },
    },
    tags: ['spectacle'] as CardTag[],
  },
  {
    name: 'Bloated Budget',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'Money doesn\'t buy quality. Lose $3M.',
    synergyCondition: () => ({ bonus: 0, budgetMod: -3, description: 'Massively over budget!' }),
    riskTag: '🔴',
  },
  {
    name: 'Star Walkout',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'Lead demands more money. Production halts. Poisons next card.',
    synergyCondition: noSynergy,
    riskTag: '🔴',
    special: 'poisonNext',
  },
];

const IMPOSSIBLE_DREAM_CARDS: CardTemplate[] = [
  {
    name: 'Defying Expectations',
    cardType: 'action',
    baseQuality: 3,
    synergyText: '🎯💀✨💕🔥 +1 per unique tag type played (max +5). +3 if 0 Incidents. The impossible becomes real.',
    synergyCondition: (ctx) => {
      let bonus = Math.min(Object.keys(ctx.tagsPlayed).length, 5);
      if (ctx.incidentCount === 0) bonus += 3;
      return bonus > 0 ? { bonus, description: 'Defying all odds!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['precision', 'heart', 'spectacle', 'momentum', 'chaos'] as CardTag[],
  },
  {
    name: 'Against All Odds',
    cardType: 'action',
    baseQuality: 2,
    synergyText: '+2 per unique source type played (max +8). Every element in harmony.',
    synergyCondition: (ctx) => {
      const types = new Set(ctx.playedCards.map(c => c.sourceType));
      return types.size > 0 ? { bonus: Math.min(types.size * 2, 8), description: `${types.size} source types in harmony!` } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['precision', 'spectacle'] as CardTag[],
  },
  {
    name: 'The Impossible Shot',
    cardType: 'action',
    baseQuality: 2,
    synergyText: '+5 if draw 5+ AND Director AND Crew cards played. Technical miracle.',
    synergyCondition: (ctx) => {
      const hasDir = ctx.playedCards.some(c => c.sourceType === 'director');
      const hasCrew = ctx.playedCards.some(c => c.sourceType === 'crew');
      return (ctx.drawNumber >= 5 && hasDir && hasCrew) ? { bonus: 5, description: 'THE IMPOSSIBLE SHOT!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['spectacle', 'precision'] as CardTag[],
  },
  {
    name: 'Reality Check',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Sacrifice next card to double last card. All or nothing!',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: {
      description: 'Sacrifice the next card to double the last card\'s value',
      successBonus: 0,
      failPenalty: 0,
      condition: () => true,
    },
    tags: ['chaos'] as CardTag[],
  },
  {
    name: 'Production Nightmare',
    cardType: 'incident',
    baseQuality: -6,
    synergyText: 'Everything that can go wrong does. Lose $2M. But adds ALL tag types.',
    synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'Total chaos — but it\'s art!' }),
    riskTag: '🔴',
    tags: ['precision', 'heart', 'spectacle', 'momentum', 'chaos'] as CardTag[],
  },
];

// ─── UNLOCKABLE SCRIPT OBJECTS ───

export interface UnlockableScript {
  unlockId: string;
  script: {
    title: string;
    genre: string;
    baseScore: number;
    slots: string[];
    cost: number;
    cards: CardTemplate[];
    ability: string;
    abilityDesc: string;
  };
}

export const UNLOCKABLE_SCRIPTS: UnlockableScript[] = [
  {
    unlockId: 'script_crimson_ritual',
    script: {
      title: 'Crimson Ritual',
      genre: 'Horror',
      baseScore: 8,
      slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
      cost: 4,
      cards: CRIMSON_RITUAL_CARDS,
      ability: 'finalGirl',
      abilityDesc: '🔓 UNLOCKED: Ritual Horror — Chaos tags count as +1 quality each. Wrap at exactly 5 draws for +5 bonus. Embrace the darkness.',
    },
  },
  {
    unlockId: 'script_golden_age',
    script: {
      title: 'The Golden Age',
      genre: 'Drama',
      baseScore: 10,
      slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
      cost: 7,
      cards: GOLDEN_AGE_CARDS,
      ability: 'precisionCraft',
      abilityDesc: '🔓 UNLOCKED: Prestige Epic — Precision tags add +1 quality each. Clean wrap bonus doubled. The apex of cinema.',
    },
  },
  {
    unlockId: 'script_billion_dollar_baby',
    script: {
      title: 'Billion Dollar Baby',
      genre: 'Action',
      baseScore: 9,
      slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
      cost: 6,
      cards: BILLION_DOLLAR_BABY_CARDS,
      ability: 'blockbusterBonus',
      abilityDesc: '🔓 UNLOCKED: Blockbuster Machine — Market multiplier +0.3. Each Spectacle tag adds +0.05 more. Built to make billions.',
    },
  },
  {
    unlockId: 'script_impossible_dream',
    script: {
      title: 'The Impossible Dream',
      genre: 'Sci-Fi',
      baseScore: 12,
      slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
      cost: 10,
      cards: IMPOSSIBLE_DREAM_CARDS,
      ability: 'opusMagnum',
      abilityDesc: '🔓 UNLOCKED: Ultimate Challenge — Every unique tag type adds +2 quality. The ultimate test of studio mastery.',
    },
  },
];

// ─── UNLOCKABLE TALENT DATA ───

export interface UnlockableTalent {
  unlockId: string;
  talent: {
    name: string;
    type: 'Lead' | 'Support' | 'Director' | 'Crew';
    skill: number;
    heat: number;
    cost: number;
    genreBonus?: { genre: string; bonus: number };
    trait: string;
    traitDesc: string;
    cards: CardTemplate[];
  };
}

export const UNLOCKABLE_TALENT: UnlockableTalent[] = [
  {
    unlockId: 'talent_consistency_king',
    talent: {
      name: 'Morgan Steele',
      type: 'Lead',
      skill: 5,
      heat: 0,
      cost: 12,
      genreBonus: { genre: 'Drama', bonus: 2 },
      trait: 'Consistency King',
      traitDesc: '🔓🎯 UNLOCKED: Never delivers a bad performance. Precision specialist — 0 Incidents = massive bonus.',
      cards: [
        {
          name: 'Flawless Take',
          cardType: 'action',
          baseQuality: 2,
          synergyText: '🎯 +4 if 0 Incidents. +1 per Precision tag (max +3). Perfection personified.',
          synergyCondition: (ctx: SynergyContext) => {
            let bonus = ctx.incidentCount === 0 ? 4 : 0;
            bonus += Math.min(ctx.tagsPlayed['precision'] || 0, 3);
            return bonus > 0 ? { bonus, description: 'Flawless!' } : { bonus: 0 };
          },
          riskTag: '🟢' as const,
          tags: ['precision'] as CardTag[],
        },
        {
          name: 'Reliable Performance',
          cardType: 'action',
          baseQuality: 2,
          synergyText: '+2 if Director card played. +2 if Crew card played. The professional.',
          synergyCondition: (ctx: SynergyContext) => {
            let bonus = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0;
            if (ctx.playedCards.some(c => c.sourceType === 'crew')) bonus += 2;
            return bonus > 0 ? { bonus, description: 'Rock solid!' } : { bonus: 0 };
          },
          riskTag: '🟢' as const,
          tags: ['precision'] as CardTag[],
        },
        {
          name: 'Perfectionist Delay',
          cardType: 'incident',
          baseQuality: -3,
          synergyText: 'Wants one more take. Always. But adds Precision tag.',
          synergyCondition: noSynergy,
          riskTag: '🔴' as const,
          tags: ['precision'] as CardTag[],
        },
      ],
    },
  },
  {
    unlockId: 'talent_genre_specialist',
    talent: {
      name: 'Yara Okonkwo',
      type: 'Director',
      skill: 5,
      heat: 1,
      cost: 14,
      genreBonus: { genre: 'Thriller', bonus: 3 },
      trait: 'Genre Master',
      traitDesc: '🔓🌈 UNLOCKED: Genre mastery incarnate. Cross-tag synergies amplified.',
      cards: [
        {
          name: 'Genre Fusion',
          cardType: 'action',
          baseQuality: 2,
          synergyText: '🎯💕✨ +2 per unique tag type played (max +8). Genre fusion mastery.',
          synergyCondition: (ctx: SynergyContext) => {
            const u = Object.keys(ctx.tagsPlayed).length;
            return u > 0 ? { bonus: Math.min(u * 2, 8), description: `${u} tag types = genre fusion!` } : { bonus: 0 };
          },
          riskTag: '🟢' as const,
          tags: ['precision', 'spectacle'] as CardTag[],
        },
        {
          name: 'Masterclass Direction',
          cardType: 'action',
          baseQuality: 2,
          synergyText: '+3 if 2+ Actor cards played. +2 if Crew card played. Elevates everyone.',
          synergyCondition: (ctx: SynergyContext) => {
            let bonus = ctx.playedCards.filter(c => c.sourceType === 'actor').length >= 2 ? 3 : 0;
            if (ctx.playedCards.some(c => c.sourceType === 'crew')) bonus += 2;
            return bonus > 0 ? { bonus, description: 'Masterclass!' } : { bonus: 0 };
          },
          riskTag: '🟢' as const,
          tags: ['heart'] as CardTag[],
        },
        {
          name: 'Genre Clash',
          cardType: 'incident',
          baseQuality: -4,
          synergyText: 'Too many influences. -2 if only 1 tag type exists.',
          synergyCondition: (ctx: SynergyContext) => Object.keys(ctx.tagsPlayed).length <= 1 ? { bonus: -2, description: 'Not enough variety!' } : { bonus: 0 },
          riskTag: '🔴' as const,
        },
      ],
    },
  },
];

// ─── UNLOCK STATE MANAGEMENT ───

const UNLOCK_CONTENT_KEY = 'greenlight_unlocked_content';

export interface UnlockedContentState {
  unlockedIds: string[];
  newlyUnlocked: string[]; // IDs unlocked this session, for notifications
}

export function getUnlockedContent(): UnlockedContentState {
  try {
    const saved = localStorage.getItem(UNLOCK_CONTENT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        unlockedIds: parsed.unlockedIds || [],
        newlyUnlocked: [], // reset each load
      };
    }
  } catch {}
  return { unlockedIds: [], newlyUnlocked: [] };
}

function saveUnlockedContent(ids: string[]) {
  try {
    localStorage.setItem(UNLOCK_CONTENT_KEY, JSON.stringify({ unlockedIds: ids }));
  } catch {}
}

export function isContentUnlocked(id: string): boolean {
  return getUnlockedContent().unlockedIds.includes(id);
}

/** Check all unlock conditions and return newly unlocked IDs */
export function checkUnlockConditions(): string[] {
  const u = getUnlocks();
  const current = getUnlockedContent();
  const newlyUnlocked: string[] = [];

  for (const def of UNLOCKABLE_DEFS) {
    if (!current.unlockedIds.includes(def.id) && def.check(u)) {
      newlyUnlocked.push(def.id);
    }
  }

  if (newlyUnlocked.length > 0) {
    saveUnlockedContent([...current.unlockedIds, ...newlyUnlocked]);
  }

  return newlyUnlocked;
}

/** Record special achievements for unlock tracking */
export function recordZeroFlopsRun() {
  const u = getUnlocks();
  if (!u.careerStats.challengesCompleted.includes('zero_flops_run')) {
    u.careerStats.challengesCompleted.push('zero_flops_run');
    saveUnlocks(u);
  }
}

export function recordAllModifiersWin() {
  const u = getUnlocks();
  if (!u.careerStats.challengesCompleted.includes('all_modifiers_win')) {
    u.careerStats.challengesCompleted.push('all_modifiers_win');
    saveUnlocks(u);
  }
}

/** Get unlocked scripts to add to the pool */
export function getUnlockedScriptDefs(): UnlockableScript['script'][] {
  const content = getUnlockedContent();
  return UNLOCKABLE_SCRIPTS
    .filter(s => content.unlockedIds.includes(s.unlockId))
    .map(s => s.script);
}

/** Get unlocked talent to add to the pool */
export function getUnlockedTalentDefs(): UnlockableTalent['talent'][] {
  const content = getUnlockedContent();
  return UNLOCKABLE_TALENT
    .filter(t => content.unlockedIds.includes(t.unlockId))
    .map(t => t.talent);
}

/** Get all defs with unlock status for display */
export function getAllUnlockableStatus(): (UnlockableDef & { unlocked: boolean })[] {
  const content = getUnlockedContent();
  return UNLOCKABLE_DEFS.map(def => ({
    ...def,
    unlocked: content.unlockedIds.includes(def.id),
  }));
}
