// R217: Advanced Card Synergies & Combo System
// Detects synergy pairs/groups among cast, script, and production cards

import type { GameState, Genre, Talent, CastSlot, ProductionCard } from './types';

export type SynergyRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface CardSynergy {
  id: string;
  name: string;
  emoji: string;
  rarity: SynergyRarity;
  category: 'genre' | 'talent' | 'budget' | 'ability';
  description: string; // conditions description
  flavorText: string; // discovery flavor text
  conditions: (ctx: SynergyDetectionContext) => boolean;
  effect: SynergyEffect;
}

export interface SynergyEffect {
  qualityBonus?: number;
  boxOfficeMultiplier?: number; // e.g. 1.15 = +15%
  criticBonus?: number; // added to quality for tier calc
  budgetRefund?: number; // $M refunded
  label: string; // e.g. "+3 Quality"
}

export interface DetectedSynergy {
  synergy: CardSynergy;
  involvedCards: string[]; // card/talent names involved
}

export interface SynergyDetectionContext {
  genre: Genre;
  budget: number;
  castSlots: CastSlot[];
  talents: Talent[];
  deck: ProductionCard[];
  hasElite: boolean;
  talentTypes: Set<string>;
  genreBonuses: Genre[];
  cardAbilities: Set<string>;
  cardTags: Set<string>;
  totalTalentSkill: number;
}

// ─── SYNERGY DEFINITIONS ───

export const ALL_SYNERGIES: CardSynergy[] = [
  // ═══ GENRE COMBOS ═══
  {
    id: 'cult_classic',
    name: 'Cult Classic',
    emoji: '🎭',
    rarity: 'uncommon',
    category: 'genre',
    description: 'Make a Horror or Comedy film with budget ≤ $15M',
    flavorText: '"It\'s so bad it\'s good!" — Every midnight screening audience ever.',
    conditions: (ctx) => (ctx.genre === 'Horror' || ctx.genre === 'Comedy') && ctx.budget <= 15,
    effect: { qualityBonus: 2, boxOfficeMultiplier: 1.20, label: '+2 Quality, +20% BO' },
  },
  {
    id: 'scifi_spectacle',
    name: 'Sci-Fi Spectacle',
    emoji: '🚀',
    rarity: 'uncommon',
    category: 'genre',
    description: 'Make a Sci-Fi film with budget ≥ $30M',
    flavorText: 'The VFX budget alone could fund a small country.',
    conditions: (ctx) => ctx.genre === 'Sci-Fi' && ctx.budget >= 30,
    effect: { boxOfficeMultiplier: 1.25, label: '+25% Box Office' },
  },
  {
    id: 'prestige_drama',
    name: 'Prestige Picture',
    emoji: '🏆',
    rarity: 'rare',
    category: 'genre',
    description: 'Make a Drama with an elite Director',
    flavorText: 'Oscar bait? Perhaps. But the craft is undeniable.',
    conditions: (ctx) => ctx.genre === 'Drama' && ctx.talents.some(t => t.type === 'Director' && t.elite),
    effect: { qualityBonus: 4, criticBonus: 3, label: '+4 Quality, +3 Critic' },
  },
  {
    id: 'romantic_thriller',
    name: 'Dangerous Liaisons',
    emoji: '💋',
    rarity: 'uncommon',
    category: 'genre',
    description: 'Make a Romance or Thriller film with 2+ Lead/Support talents',
    flavorText: 'The tension between them is... electric.',
    conditions: (ctx) => (ctx.genre === 'Romance' || ctx.genre === 'Thriller') &&
      ctx.talents.filter(t => t.type === 'Lead' || t.type === 'Support').length >= 2,
    effect: { qualityBonus: 2, boxOfficeMultiplier: 1.10, label: '+2 Quality, +10% BO' },
  },
  {
    id: 'action_blockbuster',
    name: 'Summer Blockbuster',
    emoji: '💥',
    rarity: 'common',
    category: 'genre',
    description: 'Make an Action film with budget ≥ $25M',
    flavorText: 'Explosions. Car chases. Opening weekend records.',
    conditions: (ctx) => ctx.genre === 'Action' && ctx.budget >= 25,
    effect: { boxOfficeMultiplier: 1.15, label: '+15% Box Office' },
  },

  // ═══ TALENT COMBOS ═══
  {
    id: 'dream_team',
    name: 'Dream Team',
    emoji: '⭐',
    rarity: 'legendary',
    category: 'talent',
    description: 'Cast an elite Director AND an elite Lead',
    flavorText: 'When legends collide, cinema history is made.',
    conditions: (ctx) => ctx.talents.some(t => t.type === 'Director' && t.elite) &&
      ctx.talents.some(t => t.type === 'Lead' && t.elite),
    effect: { qualityBonus: 5, boxOfficeMultiplier: 1.30, criticBonus: 3, label: '+5 Quality, +30% BO, +3 Critic' },
  },
  {
    id: 'ensemble_cast',
    name: 'Ensemble Cast',
    emoji: '🎪',
    rarity: 'rare',
    category: 'talent',
    description: 'Fill all cast slots (4+ talents)',
    flavorText: 'Every role is perfectly cast. The reviews write themselves.',
    conditions: (ctx) => ctx.talents.length >= 4,
    effect: { qualityBonus: 3, criticBonus: 2, label: '+3 Quality, +2 Critic' },
  },
  {
    id: 'chemistry_bonus',
    name: 'On-Screen Chemistry',
    emoji: '💫',
    rarity: 'uncommon',
    category: 'talent',
    description: 'Have 2+ talents with bonuses for the current genre',
    flavorText: 'They finish each other\'s sentences. And the audience loves it.',
    conditions: (ctx) => {
      const genreMatchCount = ctx.talents.filter(t => t.genreBonus?.genre === ctx.genre).length;
      return genreMatchCount >= 2;
    },
    effect: { qualityBonus: 3, label: '+3 Quality' },
  },
  {
    id: 'rising_stars',
    name: 'Rising Stars',
    emoji: '🌟',
    rarity: 'common',
    category: 'talent',
    description: 'Cast 3+ non-elite talents with skill ≥ 5',
    flavorText: 'Nobody knew their names. After this film, everybody will.',
    conditions: (ctx) => ctx.talents.filter(t => !t.elite && t.skill >= 5).length >= 3,
    effect: { qualityBonus: 2, budgetRefund: 3, label: '+2 Quality, +$3M Refund' },
  },
  {
    id: 'auteur_vision',
    name: 'Auteur Vision',
    emoji: '🎬',
    rarity: 'rare',
    category: 'talent',
    description: 'Have an elite Director with a genre bonus matching the film',
    flavorText: 'This isn\'t just a movie. It\'s a statement.',
    conditions: (ctx) => ctx.talents.some(t => t.type === 'Director' && t.elite && t.genreBonus?.genre === ctx.genre),
    effect: { qualityBonus: 4, criticBonus: 4, label: '+4 Quality, +4 Critic' },
  },

  // ═══ BUDGET COMBOS ═══
  {
    id: 'indie_darling',
    name: 'Indie Darling',
    emoji: '🌿',
    rarity: 'uncommon',
    category: 'budget',
    description: 'Make a Horror film with budget ≤ $10M',
    flavorText: 'Shot on a shoestring. Scared the world.',
    conditions: (ctx) => ctx.genre === 'Horror' && ctx.budget <= 10,
    effect: { qualityBonus: 3, boxOfficeMultiplier: 1.40, label: '+3 Quality, +40% BO' },
  },
  {
    id: 'low_budget_gem',
    name: 'Hidden Gem',
    emoji: '💎',
    rarity: 'common',
    category: 'budget',
    description: 'Make any film with budget ≤ $8M and total talent skill ≥ 15',
    flavorText: 'Proof that you don\'t need money. Just talent.',
    conditions: (ctx) => ctx.budget <= 8 && ctx.totalTalentSkill >= 15,
    effect: { qualityBonus: 3, boxOfficeMultiplier: 1.25, label: '+3 Quality, +25% BO' },
  },
  {
    id: 'money_no_object',
    name: 'Money Is No Object',
    emoji: '💰',
    rarity: 'rare',
    category: 'budget',
    description: 'Spend $40M+ on a single film',
    flavorText: 'The catering budget alone was seven figures.',
    conditions: (ctx) => ctx.budget >= 40,
    effect: { boxOfficeMultiplier: 1.20, qualityBonus: 1, label: '+1 Quality, +20% BO' },
  },
  {
    id: 'scrappy_comedy',
    name: 'Scrappy Comedy',
    emoji: '😂',
    rarity: 'common',
    category: 'budget',
    description: 'Make a Comedy with budget ≤ $12M',
    flavorText: 'Who needs explosions when you have punchlines?',
    conditions: (ctx) => ctx.genre === 'Comedy' && ctx.budget <= 12,
    effect: { qualityBonus: 2, boxOfficeMultiplier: 1.15, label: '+2 Quality, +15% BO' },
  },

  // ═══ ABILITY COMBOS ═══
  {
    id: 'double_momentum',
    name: 'Unstoppable Force',
    emoji: '🔥',
    rarity: 'uncommon',
    category: 'ability',
    description: 'Have 3+ cards with the "momentum" tag in deck',
    flavorText: 'Once it starts rolling, nothing can stop this production.',
    conditions: (ctx) => {
      const count = ctx.deck.filter(c => c.tags?.includes('momentum')).length;
      return count >= 3;
    },
    effect: { qualityBonus: 2, label: '+2 Quality' },
  },
  {
    id: 'precision_strike',
    name: 'Surgical Precision',
    emoji: '🎯',
    rarity: 'uncommon',
    category: 'ability',
    description: 'Have 3+ cards with the "precision" tag in deck',
    flavorText: 'Every shot is planned. Every edit is intentional.',
    conditions: (ctx) => {
      const count = ctx.deck.filter(c => c.tags?.includes('precision')).length;
      return count >= 3;
    },
    effect: { qualityBonus: 2, criticBonus: 1, label: '+2 Quality, +1 Critic' },
  },
  {
    id: 'heart_and_soul',
    name: 'Heart & Soul',
    emoji: '❤️',
    rarity: 'rare',
    category: 'ability',
    description: 'Have 4+ cards with the "heart" tag in deck',
    flavorText: 'There wasn\'t a dry eye in the theater.',
    conditions: (ctx) => {
      const count = ctx.deck.filter(c => c.tags?.includes('heart')).length;
      return count >= 4;
    },
    effect: { qualityBonus: 3, criticBonus: 3, label: '+3 Quality, +3 Critic' },
  },
  {
    id: 'chaos_engine',
    name: 'Controlled Chaos',
    emoji: '🌀',
    rarity: 'rare',
    category: 'ability',
    description: 'Have 3+ cards with the "chaos" tag in deck',
    flavorText: 'The production was a nightmare. The result was a masterpiece.',
    conditions: (ctx) => {
      const count = ctx.deck.filter(c => c.tags?.includes('chaos')).length;
      return count >= 3;
    },
    effect: { qualityBonus: 1, boxOfficeMultiplier: 1.25, label: '+1 Quality, +25% BO' },
  },
  {
    id: 'insurance_wall',
    name: 'Safety Net',
    emoji: '🛡️',
    rarity: 'common',
    category: 'ability',
    description: 'Have 2+ cards with the "insurance" ability in deck',
    flavorText: 'Nothing can go wrong. We planned for everything.',
    conditions: (ctx) => {
      const count = ctx.deck.filter(c => c.ability === 'insurance').length;
      return count >= 2;
    },
    effect: { qualityBonus: 1, label: '+1 Quality' },
  },
  {
    id: 'spectacle_showdown',
    name: 'Visual Feast',
    emoji: '🎆',
    rarity: 'uncommon',
    category: 'ability',
    description: 'Have 3+ cards with the "spectacle" tag in deck',
    flavorText: 'Every frame is a painting. Every scene is iconic.',
    conditions: (ctx) => {
      const count = ctx.deck.filter(c => c.tags?.includes('spectacle')).length;
      return count >= 3;
    },
    effect: { qualityBonus: 1, boxOfficeMultiplier: 1.20, label: '+1 Quality, +20% BO' },
  },
  {
    id: 'wildcard_gambit',
    name: 'Wildcard Gambit',
    emoji: '🃏',
    rarity: 'rare',
    category: 'ability',
    description: 'Have 2+ cards with the "wildcard" ability in deck',
    flavorText: 'Nobody knew what would happen next. Including the director.',
    conditions: (ctx) => {
      const count = ctx.deck.filter(c => c.ability === 'wildcard').length;
      return count >= 2;
    },
    effect: { qualityBonus: 2, boxOfficeMultiplier: 1.15, label: '+2 Quality, +15% BO' },
  },
  {
    id: 'tag_rainbow',
    name: 'Full Spectrum',
    emoji: '🌈',
    rarity: 'legendary',
    category: 'ability',
    description: 'Have all 5 card tags represented in deck (momentum, precision, chaos, heart, spectacle)',
    flavorText: 'A film that has everything. And somehow, it all works.',
    conditions: (ctx) => {
      const allTags = ['momentum', 'precision', 'chaos', 'heart', 'spectacle'];
      return allTags.every(tag => ctx.cardTags.has(tag));
    },
    effect: { qualityBonus: 5, boxOfficeMultiplier: 1.20, criticBonus: 3, label: '+5 Quality, +20% BO, +3 Critic' },
  },
];

// ─── DETECTION ENGINE ───

export function buildSynergyContext(gameState: GameState): SynergyDetectionContext {
  const talents = gameState.castSlots.map(s => s.talent).filter(Boolean) as Talent[];
  const deck = gameState.production?.deck ?? [];
  const played = gameState.production?.played ?? [];
  const allCards = [...deck, ...played];
  
  const cardTags = new Set<string>();
  const cardAbilities = new Set<string>();
  for (const c of allCards) {
    if (c.tags) c.tags.forEach(t => cardTags.add(t));
    if (c.ability) cardAbilities.add(c.ability);
  }

  return {
    genre: gameState.currentScript?.genre ?? 'Action',
    budget: gameState.budget,
    castSlots: gameState.castSlots,
    talents,
    deck: allCards,
    hasElite: talents.some(t => t.elite),
    talentTypes: new Set(talents.map(t => t.type)),
    genreBonuses: talents.filter(t => t.genreBonus).map(t => t.genreBonus!.genre),
    cardAbilities,
    cardTags,
    totalTalentSkill: talents.reduce((sum, t) => sum + t.skill, 0),
  };
}

export function detectSynergies(gameState: GameState): DetectedSynergy[] {
  const ctx = buildSynergyContext(gameState);
  const detected: DetectedSynergy[] = [];

  for (const synergy of ALL_SYNERGIES) {
    try {
      if (synergy.conditions(ctx)) {
        // Build involved card/talent names
        const involved: string[] = [];
        if (synergy.category === 'talent') {
          ctx.talents.forEach(t => involved.push(t.name));
        } else if (synergy.category === 'genre') {
          involved.push(ctx.genre);
          if (gameState.currentScript) involved.push(gameState.currentScript.title);
        } else if (synergy.category === 'budget') {
          involved.push(`$${ctx.budget}M Budget`);
          involved.push(ctx.genre);
        } else if (synergy.category === 'ability') {
          // List cards with relevant tags/abilities
          const relevant = ctx.deck.filter(c => {
            if (synergy.id.includes('momentum')) return c.tags?.includes('momentum');
            if (synergy.id.includes('precision')) return c.tags?.includes('precision');
            if (synergy.id.includes('heart')) return c.tags?.includes('heart');
            if (synergy.id.includes('chaos')) return c.tags?.includes('chaos');
            if (synergy.id.includes('spectacle')) return c.tags?.includes('spectacle');
            if (synergy.id.includes('insurance')) return c.ability === 'insurance';
            if (synergy.id.includes('wildcard')) return c.ability === 'wildcard';
            if (synergy.id === 'tag_rainbow') return true;
            return false;
          });
          relevant.slice(0, 4).forEach(c => involved.push(c.name));
        }
        detected.push({ synergy, involvedCards: involved });
      }
    } catch {
      // Skip broken synergy conditions
    }
  }

  return detected;
}

// ─── APPLY SYNERGY EFFECTS ───

export interface AppliedSynergyEffects {
  totalQualityBonus: number;
  totalBoxOfficeMultiplier: number;
  totalCriticBonus: number;
  totalBudgetRefund: number;
}

export function computeSynergyEffects(synergies: DetectedSynergy[]): AppliedSynergyEffects {
  let totalQualityBonus = 0;
  let totalBoxOfficeMultiplier = 1;
  let totalCriticBonus = 0;
  let totalBudgetRefund = 0;

  for (const { synergy } of synergies) {
    const e = synergy.effect;
    totalQualityBonus += e.qualityBonus ?? 0;
    if (e.boxOfficeMultiplier) totalBoxOfficeMultiplier *= e.boxOfficeMultiplier;
    totalCriticBonus += e.criticBonus ?? 0;
    totalBudgetRefund += e.budgetRefund ?? 0;
  }

  return { totalQualityBonus, totalBoxOfficeMultiplier, totalCriticBonus, totalBudgetRefund };
}

// ─── SYNERGY CODEX (discovered tracking) ───

const CODEX_STORAGE_KEY = 'greenlight-synergy-codex';

export function getDiscoveredSynergyIds(): Set<string> {
  try {
    const raw = localStorage.getItem(CODEX_STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export function markSynergiesDiscovered(ids: string[]): void {
  const existing = getDiscoveredSynergyIds();
  ids.forEach(id => existing.add(id));
  localStorage.setItem(CODEX_STORAGE_KEY, JSON.stringify([...existing]));
}

export function getAllSynergiesForCodex(): Array<CardSynergy & { discovered: boolean }> {
  const discovered = getDiscoveredSynergyIds();
  return ALL_SYNERGIES.map(s => ({ ...s, discovered: discovered.has(s.id) }));
}
