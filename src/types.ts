export type Genre = 'Action' | 'Comedy' | 'Drama' | 'Horror' | 'Sci-Fi' | 'Romance' | 'Thriller';

export type RiskTag = '🟢' | '🟡' | '🔴';
export type CardSourceType = 'actor' | 'director' | 'crew' | 'script';

export interface ProductionCard {
  id: string;
  name: string;
  source: string; // role/talent name
  sourceType: CardSourceType;
  baseQuality: number;
  synergyText: string; // display text for the synergy
  synergyCondition: ((ctx: SynergyContext) => SynergyResult) | null;
  riskTag: RiskTag;
  // Runtime state (set during play)
  synergyBonus?: number;
  synergyFired?: boolean;
  totalValue?: number;
  budgetMod?: number;
  special?: string; // special effects like 'forceExtraDraw', 'rerollNext', 'removeRed', 'poisonNext', 'cancelLastDirector', 'buffActors', 'coinFlip'
}

export interface SynergyContext {
  playedCards: ProductionCard[];
  totalQuality: number;
  drawNumber: number; // 1-indexed
  leadSkill: number;
  redCount: number;
  previousCard: ProductionCard | null;
  greenStreak: number; // consecutive 🟢 cards ending at previous card
}

export interface SynergyResult {
  bonus: number; // flat quality bonus (or negative)
  multiply?: number; // multiply total quality by this (e.g., 1.3)
  budgetMod?: number;
  description?: string; // what triggered
}

export interface CardTemplate {
  name: string;
  baseQuality: number;
  synergyText: string;
  synergyCondition: ((ctx: SynergyContext) => SynergyResult) | null;
  riskTag: RiskTag;
  budgetMod?: number;
  special?: string;
}

export interface Script {
  id: string;
  title: string;
  genre: Genre;
  baseScore: number;
  slots: SlotType[];
  cost: number;
  cards: CardTemplate[];
  ability?: string;
  abilityDesc?: string;
}

export type SlotType = 'Lead' | 'Support' | 'Director' | 'Crew' | 'Wild';

export type TalentType = 'Lead' | 'Support' | 'Director' | 'Crew';

export interface Talent {
  id: string;
  name: string;
  type: TalentType;
  skill: number;
  heat: number;
  genreBonus?: { genre: Genre; bonus: number };
  trait?: string;
  traitDesc?: string;
  cards: CardTemplate[];
  heatCards?: CardTemplate[]; // extra 🔴 cards added at Heat 4+
  cost: number;
  filmsLeft?: number;
}

export interface StudioPerk {
  id: string;
  name: string;
  cost: number;
  description: string;
  effect: string;
}

export interface MarketCondition {
  id: string;
  name: string;
  description: string;
  genreBonus?: Genre;
  multiplier: number;
  condition?: string;
}

export type GamePhase =
  | 'start'
  | 'neow'
  | 'greenlight'
  | 'casting'
  | 'production'
  | 'release'
  | 'awards'
  | 'shop'
  | 'gameOver'
  | 'victory';

export interface CastSlot {
  slotType: SlotType;
  talent: Talent | null;
}

export type RewardTier = 'FLOP' | 'HIT' | 'SMASH' | 'BLOCKBUSTER';

export interface ProductionState {
  deck: ProductionCard[];
  played: ProductionCard[];
  redCount: number;
  qualityTotal: number;
  budgetChange: number;
  isDisaster: boolean;
  isWrapped: boolean;
  drawCount: number;
  cleanWrap: boolean; // true if 0 🔴 cards drawn
  actorBuff: number; // from "Drama On Set" etc.
  poisonNext: number; // from "Onset Altercation" etc.
  forceExtraDraw: boolean; // from "Perfection Paralysis"
  scriptAbilityBonus: number;
}

export interface GameState {
  phase: GamePhase;
  season: number;
  budget: number;
  reputation: number;
  roster: Talent[];
  perks: StudioPerk[];
  totalEarnings: number;
  strikes: number;
  currentScript: Script | null;
  scriptChoices: Script[];
  castSlots: CastSlot[];
  production: ProductionState | null;
  marketConditions: MarketCondition[];
  activeMarket: MarketCondition | null;
  talentMarket: Talent[];
  perkMarket: StudioPerk[];
  lastBoxOffice: number;
  lastQuality: number;
  lastTier: RewardTier | null;
  seasonHistory: SeasonResult[];
  hasReshoots: boolean;
  reshootsUsed: boolean;
  industryEvent: string | null;
  neowChoice: number | null;
}

export interface SeasonResult {
  season: number;
  title: string;
  genre: Genre;
  quality: number;
  boxOffice: number;
  tier: RewardTier;
  hitTarget: boolean;
  nominated: boolean;
}
