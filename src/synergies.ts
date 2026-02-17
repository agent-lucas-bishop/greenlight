// R257: Card Synergy & Combo System — Strategic deck-building synergies
// This module defines combo synergies that reward strategic talent + card choices.
// Complements the R217 cardSynergies system with higher-level strategic combos.

import type { GameState, Genre, Talent, CastSlot, ProductionCard } from './types';
import { detectSynergies as detectCardSynergies, computeSynergyEffects as computeCardSynergyEffects, type DetectedSynergy as CardDetectedSynergy, type AppliedSynergyEffects as CardAppliedEffects } from './cardSynergies';

// ─── TYPES ───

export type ComboRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface ComboSynergy {
  id: string;
  name: string;
  emoji: string;
  rarity: ComboRarity;
  description: string;
  hint: string; // vague hint for undiscovered combos
  conditions: (ctx: ComboContext) => boolean;
  effects: ComboEffect;
}

export interface ComboEffect {
  qualityBonus?: number;
  costReduction?: number; // percentage, e.g. 30 = -30%
  reputationBonus?: number;
  boxOfficeMultiplier?: number; // e.g. 1.4 = +40%
  festivalChanceMultiplier?: number; // e.g. 2 = 2x festival chance
  incidentChanceBonus?: number; // 0-1 additional incident chance
  label: string;
}

export interface ComboContext {
  genre: Genre;
  budget: number;
  castSlots: CastSlot[];
  talents: Talent[];
  deck: ProductionCard[];
  played: ProductionCard[];
  seasonHistory: { genre: Genre; quality: number; tier: string }[];
  genreMastery: Record<string, number>;
  studioArchetype: string | null;
  // Derived helpers
  leadTalents: Talent[];
  directorTalent: Talent | null;
  supportTalents: Talent[];
  crewTalents: Talent[];
  allCards: ProductionCard[];
  totalTalentSkill: number;
  eliteCount: number;
}

export interface ActiveCombo {
  combo: ComboSynergy;
  involvedNames: string[];
}

export interface CombinedSynergyResult {
  /** R217 card-level synergies */
  cardSynergies: CardDetectedSynergy[];
  /** R257 strategic combo synergies */
  comboSynergies: ActiveCombo[];
  /** Merged effect totals */
  totalQualityBonus: number;
  totalBoxOfficeMultiplier: number;
  totalCriticBonus: number;
  totalBudgetRefund: number;
  totalCostReduction: number; // percentage
  totalReputationBonus: number;
  totalFestivalChanceMultiplier: number;
  totalIncidentChanceBonus: number;
  totalSynergyCount: number;
}

// ─── COMBO DEFINITIONS (15+ strategic synergies) ───

export const COMBO_SYNERGIES: ComboSynergy[] = [
  // 1. Dream Team — A-list lead + A-list director
  {
    id: 'dream_team_combo',
    name: 'Dream Team',
    emoji: '🌟',
    rarity: 'legendary',
    description: 'Cast an elite Lead AND an elite Director together',
    hint: 'Pair your brightest stars with a visionary director...',
    conditions: (ctx) =>
      ctx.leadTalents.some(t => t.elite) && ctx.directorTalent?.elite === true,
    effects: { qualityBonus: 6, label: '+20% Quality (approx +6)' },
  },

  // 2. Genre Master — 3+ cards matching film genre
  {
    id: 'genre_master',
    name: 'Genre Master',
    emoji: '🎯',
    rarity: 'uncommon',
    description: '3+ talents with a genre bonus matching the current film',
    hint: 'Fill your cast with genre specialists...',
    conditions: (ctx) =>
      ctx.talents.filter(t => t.genreBonus?.genre === ctx.genre).length >= 3,
    effects: { qualityBonus: 5, label: '+15% Quality (approx +5)' },
  },

  // 3. Budget Crew — all B-tier (non-elite) talent
  {
    id: 'budget_crew',
    name: 'Budget Crew',
    emoji: '💸',
    rarity: 'common',
    description: 'Cast only non-elite talent (all B-tier)',
    hint: 'Sometimes less famous means more savings...',
    conditions: (ctx) =>
      ctx.talents.length >= 3 && ctx.eliteCount === 0,
    effects: { costReduction: 30, label: '-30% Costs' },
  },

  // 4. Auteur Vision — same director 3+ films in a run
  {
    id: 'auteur_vision_combo',
    name: 'Auteur Vision',
    emoji: '🎬',
    rarity: 'rare',
    description: 'Use the same director for 3+ films in one run',
    hint: 'Loyalty to a single director pays dividends...',
    conditions: (ctx) => {
      if (!ctx.directorTalent) return false;
      // filmsLeft starts high and decrements. If they've been used, filmsLeft will be lower.
      // We check if current season >= 3 and director has been on roster long enough
      const dirFilmsLeft = ctx.directorTalent.filmsLeft ?? 0;
      const dirOriginalFilms = 4; // default contract length
      const filmsDirected = dirOriginalFilms - dirFilmsLeft;
      return filmsDirected >= 2; // directing current film would be the 3rd
    },
    effects: { reputationBonus: 1, qualityBonus: 4, label: '+25% Reputation, +4 Quality' },
  },

  // 5. Comedy Duo — 2 comedy-genre leads
  {
    id: 'comedy_duo',
    name: 'Comedy Duo',
    emoji: '😂',
    rarity: 'uncommon',
    description: 'Cast 2+ leads with Comedy genre bonus on a Comedy film',
    hint: 'Two funny people are funnier than one...',
    conditions: (ctx) =>
      ctx.genre === 'Comedy' &&
      ctx.leadTalents.filter(t => t.genreBonus?.genre === 'Comedy').length >= 2,
    effects: { boxOfficeMultiplier: 1.20, label: '+20% Comedy Revenue' },
  },

  // 6. Method Acting — lead with intensive trait
  {
    id: 'method_acting',
    name: 'Method Acting',
    emoji: '🎭',
    rarity: 'uncommon',
    description: 'Cast a lead with a baggage trait (method dangerous)',
    hint: 'Some actors go dangerously deep into character...',
    conditions: (ctx) =>
      ctx.leadTalents.some(t => t.baggage?.type === 'method_dangerous'),
    effects: { qualityBonus: 3, incidentChanceBonus: 0.05, label: '+10% Quality, +5% Incident Risk' },
  },

  // 7. Festival Circuit — indie director + art cinematographer
  {
    id: 'festival_circuit',
    name: 'Festival Circuit',
    emoji: '🏆',
    rarity: 'rare',
    description: 'Non-elite director + Drama/Romance genre + budget ≤ $15M',
    hint: 'Small budgets and artistic vision catch festival eyes...',
    conditions: (ctx) =>
      ctx.directorTalent !== null &&
      !ctx.directorTalent.elite &&
      (ctx.genre === 'Drama' || ctx.genre === 'Romance') &&
      ctx.budget <= 15,
    effects: { festivalChanceMultiplier: 2, qualityBonus: 2, label: '2× Festival Chance, +2 Quality' },
  },

  // 8. Blockbuster Formula — action lead + big budget + VFX crew
  {
    id: 'blockbuster_formula',
    name: 'Blockbuster Formula',
    emoji: '💥',
    rarity: 'rare',
    description: 'Action film + elite lead + budget ≥ $30M',
    hint: 'The proven formula: big stars, big budget, big explosions...',
    conditions: (ctx) =>
      ctx.genre === 'Action' &&
      ctx.leadTalents.some(t => t.elite) &&
      ctx.budget >= 30,
    effects: { boxOfficeMultiplier: 1.40, label: '+40% Opening Weekend' },
  },

  // 9. Ensemble Power — 4+ talents all with skill ≥ 5
  {
    id: 'ensemble_power',
    name: 'Ensemble Power',
    emoji: '🎪',
    rarity: 'rare',
    description: 'Cast 4+ talents, all with skill ≥ 5',
    hint: 'When every cast member is talented, magic happens...',
    conditions: (ctx) =>
      ctx.talents.length >= 4 && ctx.talents.every(t => t.skill >= 5),
    effects: { qualityBonus: 4, boxOfficeMultiplier: 1.10, label: '+4 Quality, +10% BO' },
  },

  // 10. Shoestring Masterpiece — very low budget, high talent
  {
    id: 'shoestring_masterpiece',
    name: 'Shoestring Masterpiece',
    emoji: '🧵',
    rarity: 'rare',
    description: 'Budget ≤ $8M with total talent skill ≥ 20',
    hint: 'Prove that raw talent outshines deep pockets...',
    conditions: (ctx) =>
      ctx.budget <= 8 && ctx.totalTalentSkill >= 20,
    effects: { qualityBonus: 5, boxOfficeMultiplier: 1.30, label: '+5 Quality, +30% BO' },
  },

  // 11. Horror Nights — horror genre + low budget + chaos cards
  {
    id: 'horror_nights',
    name: 'Horror Nights',
    emoji: '🌙',
    rarity: 'uncommon',
    description: 'Horror film with budget ≤ $12M and 2+ chaos-tagged cards',
    hint: 'The scariest films are made on the smallest budgets...',
    conditions: (ctx) =>
      ctx.genre === 'Horror' &&
      ctx.budget <= 12 &&
      ctx.allCards.filter(c => c.tags?.includes('chaos')).length >= 2,
    effects: { boxOfficeMultiplier: 1.35, qualityBonus: 2, label: '+35% BO, +2 Quality' },
  },

  // 12. Star-Studded — 3+ elite talents
  {
    id: 'star_studded',
    name: 'Star-Studded',
    emoji: '⭐',
    rarity: 'legendary',
    description: 'Cast 3+ elite talents in one film',
    hint: 'Fill every slot with A-listers...',
    conditions: (ctx) => ctx.eliteCount >= 3,
    effects: { qualityBonus: 5, boxOfficeMultiplier: 1.25, label: '+5 Quality, +25% BO' },
  },

  // 13. Genre Hopper — make films in 3+ different genres in one run
  {
    id: 'genre_hopper',
    name: 'Genre Hopper',
    emoji: '🔀',
    rarity: 'uncommon',
    description: 'Have made films in 3+ different genres this run',
    hint: 'Versatility is its own reward...',
    conditions: (ctx) => {
      const genres = new Set(Object.keys(ctx.genreMastery).filter(g => ctx.genreMastery[g] > 0));
      genres.add(ctx.genre);
      return genres.size >= 3;
    },
    effects: { qualityBonus: 3, reputationBonus: 0, label: '+3 Quality' },
  },

  // 14. Thriller Tension — thriller + 2+ precision cards + director
  {
    id: 'thriller_tension',
    name: 'White-Knuckle Tension',
    emoji: '😰',
    rarity: 'uncommon',
    description: 'Thriller film with a Director and 2+ precision-tagged cards',
    hint: 'A skilled director crafts tension through precise filmmaking...',
    conditions: (ctx) =>
      ctx.genre === 'Thriller' &&
      ctx.directorTalent !== null &&
      ctx.allCards.filter(c => c.tags?.includes('precision')).length >= 2,
    effects: { qualityBonus: 3, boxOfficeMultiplier: 1.15, label: '+3 Quality, +15% BO' },
  },

  // 15. Romance Magic — romance + 2 leads + heart cards
  {
    id: 'romance_magic',
    name: 'Romance Magic',
    emoji: '💕',
    rarity: 'uncommon',
    description: 'Romance film with 2+ leads and 2+ heart-tagged cards',
    hint: 'Love stories need chemistry and heart...',
    conditions: (ctx) =>
      ctx.genre === 'Romance' &&
      ctx.leadTalents.length >= 2 &&
      ctx.allCards.filter(c => c.tags?.includes('heart')).length >= 2,
    effects: { qualityBonus: 4, boxOfficeMultiplier: 1.15, label: '+4 Quality, +15% BO' },
  },

  // 16. Sci-Fi Visionary — sci-fi + spectacle cards + high budget
  {
    id: 'scifi_visionary',
    name: 'Sci-Fi Visionary',
    emoji: '🚀',
    rarity: 'rare',
    description: 'Sci-Fi film with 3+ spectacle-tagged cards and budget ≥ $25M',
    hint: 'Big ideas need big spectacle...',
    conditions: (ctx) =>
      ctx.genre === 'Sci-Fi' &&
      ctx.budget >= 25 &&
      ctx.allCards.filter(c => c.tags?.includes('spectacle')).length >= 3,
    effects: { qualityBonus: 3, boxOfficeMultiplier: 1.30, label: '+3 Quality, +30% BO' },
  },

  // 17. Underdog Story — all non-elite, budget ≤ $10M, quality film
  {
    id: 'underdog_story',
    name: 'Underdog Story',
    emoji: '🐕',
    rarity: 'common',
    description: 'Non-elite cast only + budget ≤ $10M',
    hint: 'Nobody expected anything from this crew...',
    conditions: (ctx) =>
      ctx.eliteCount === 0 && ctx.budget <= 10 && ctx.talents.length >= 2,
    effects: { qualityBonus: 3, costReduction: 15, label: '+3 Quality, -15% Costs' },
  },
];

// ─── DETECTION ───

export function buildComboContext(state: GameState): ComboContext {
  const talents = state.castSlots.map(s => s.talent).filter(Boolean) as Talent[];
  const deck = state.production?.deck ?? [];
  const played = state.production?.played ?? [];
  const allCards = [...deck, ...played];

  return {
    genre: state.currentScript?.genre ?? 'Action',
    budget: state.budget,
    castSlots: state.castSlots,
    talents,
    deck,
    played,
    seasonHistory: state.seasonHistory.map(h => ({ genre: h.genre, quality: h.quality, tier: h.tier })),
    genreMastery: state.genreMastery,
    studioArchetype: state.studioArchetype,
    leadTalents: talents.filter(t => t.type === 'Lead'),
    directorTalent: talents.find(t => t.type === 'Director') ?? null,
    supportTalents: talents.filter(t => t.type === 'Support'),
    crewTalents: talents.filter(t => t.type === 'Crew'),
    allCards,
    totalTalentSkill: talents.reduce((sum, t) => sum + t.skill, 0),
    eliteCount: talents.filter(t => t.elite).length,
  };
}

export function detectComboSynergies(state: GameState): ActiveCombo[] {
  const ctx = buildComboContext(state);
  const active: ActiveCombo[] = [];

  for (const combo of COMBO_SYNERGIES) {
    try {
      if (combo.conditions(ctx)) {
        const names: string[] = [];
        ctx.talents.forEach(t => names.push(t.name));
        if (combo.id.includes('budget') || combo.id.includes('shoestring') || combo.id.includes('underdog'))
          names.push(`$${ctx.budget}M`);
        active.push({ combo, involvedNames: names.slice(0, 4) });
      }
    } catch {
      // Skip broken conditions
    }
  }

  return active;
}

// ─── COMBINED DETECTION (R217 card synergies + R257 combo synergies) ───

export function detectAllSynergies(state: GameState): CombinedSynergyResult {
  const cardSynergies = detectCardSynergies(state);
  const comboSynergies = detectComboSynergies(state);
  const cardEffects = computeCardSynergyEffects(cardSynergies);

  let totalQualityBonus = cardEffects.totalQualityBonus;
  let totalBoxOfficeMultiplier = cardEffects.totalBoxOfficeMultiplier;
  let totalCriticBonus = cardEffects.totalCriticBonus;
  let totalBudgetRefund = cardEffects.totalBudgetRefund;
  let totalCostReduction = 0;
  let totalReputationBonus = 0;
  let totalFestivalChanceMultiplier = 1;
  let totalIncidentChanceBonus = 0;

  for (const { combo } of comboSynergies) {
    const e = combo.effects;
    totalQualityBonus += e.qualityBonus ?? 0;
    if (e.boxOfficeMultiplier) totalBoxOfficeMultiplier *= e.boxOfficeMultiplier;
    totalCostReduction += e.costReduction ?? 0;
    totalReputationBonus += e.reputationBonus ?? 0;
    if (e.festivalChanceMultiplier) totalFestivalChanceMultiplier *= e.festivalChanceMultiplier;
    totalIncidentChanceBonus += e.incidentChanceBonus ?? 0;
  }

  return {
    cardSynergies,
    comboSynergies,
    totalQualityBonus,
    totalBoxOfficeMultiplier,
    totalCriticBonus,
    totalBudgetRefund,
    totalCostReduction,
    totalReputationBonus,
    totalFestivalChanceMultiplier,
    totalIncidentChanceBonus,
    totalSynergyCount: cardSynergies.length + comboSynergies.length,
  };
}

// ─── DISCOVERY TRACKING ───

const COMBO_CODEX_KEY = 'greenlight-combo-codex';

export function getDiscoveredComboIds(): Set<string> {
  try {
    const raw = localStorage.getItem(COMBO_CODEX_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export function markCombosDiscovered(ids: string[]): void {
  const existing = getDiscoveredComboIds();
  ids.forEach(id => existing.add(id));
  localStorage.setItem(COMBO_CODEX_KEY, JSON.stringify([...existing]));
}

export function getAllCombosForGuide(): Array<ComboSynergy & { discovered: boolean }> {
  const discovered = getDiscoveredComboIds();
  return COMBO_SYNERGIES.map(c => ({ ...c, discovered: discovered.has(c.id) }));
}

export function getTotalSynergyCountForRun(state: GameState): number {
  return detectAllSynergies(state).totalSynergyCount;
}
