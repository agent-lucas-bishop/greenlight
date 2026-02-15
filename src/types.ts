export type Genre = 'Action' | 'Comedy' | 'Drama' | 'Horror' | 'Sci-Fi' | 'Romance' | 'Thriller';

export type CardType = 'action' | 'challenge' | 'incident';
export type RiskTag = '🟢' | '🟡' | '🔴'; // kept for backward compat, maps to CardType
export type CardSourceType = 'actor' | 'director' | 'crew' | 'script';

export interface ChallengeBet {
  description: string; // e.g. "Bet the next card is an Action card"
  successBonus: number; // +3 to +6
  failPenalty: number; // -2 to -4
  condition: (ctx: SynergyContext) => boolean; // evaluated when bet resolves
  oddsHint?: (ctx: SynergyContext) => string; // e.g. "3 Action cards remain in deck of 8"
}

export interface ProductionCard {
  id: string;
  name: string;
  source: string;
  sourceType: CardSourceType;
  cardType: CardType;
  baseQuality: number;
  synergyText: string;
  synergyCondition: ((ctx: SynergyContext) => SynergyResult) | null;
  riskTag: RiskTag; // legacy, derived from cardType
  challengeBet?: ChallengeBet;
  // Runtime state
  synergyBonus?: number;
  synergyFired?: boolean;
  totalValue?: number;
  budgetMod?: number;
  special?: string;
}

export interface SynergyContext {
  playedCards: ProductionCard[];
  totalQuality: number;
  drawNumber: number;
  leadSkill: number;
  redCount: number; // now incidentCount
  incidentCount: number;
  previousCard: ProductionCard | null;
  greenStreak: number;
  remainingDeck: ProductionCard[];
  actionCardsPlayed: number;
  challengeCardsPlayed: number;
}

export interface SynergyResult {
  bonus: number;
  multiply?: number;
  budgetMod?: number;
  description?: string;
}

export interface CardTemplate {
  name: string;
  cardType: CardType;
  baseQuality: number;
  synergyText: string;
  synergyCondition: ((ctx: SynergyContext) => SynergyResult) | null;
  riskTag: RiskTag; // derived from cardType for display
  challengeBet?: ChallengeBet;
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
  heatCards?: CardTemplate[];
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

// Draw-2-keep-1 state
export interface DrawChoice {
  card1: ProductionCard;
  card2: ProductionCard;
  // After auto-resolving incidents/challenges, what's left to choose
  resolved: ProductionCard[]; // auto-played cards (incidents, challenges)
  choosable: ProductionCard[]; // action cards player picks from (0-2)
}

export interface PendingChallenge {
  card: ProductionCard;
  bet: ChallengeBet;
}

export interface ProductionState {
  deck: ProductionCard[];
  played: ProductionCard[];
  discarded: ProductionCard[];
  redCount: number; // legacy alias for incidentCount
  incidentCount: number;
  qualityTotal: number;
  budgetChange: number;
  isDisaster: boolean;
  isWrapped: boolean;
  drawCount: number;
  cleanWrap: boolean;
  actorBuff: number;
  poisonNext: number;
  forceExtraDraw: boolean;
  scriptAbilityBonus: number;
  // Draw-2-keep-1 state
  currentDraw: DrawChoice | null;
  pendingChallenge: PendingChallenge | null;
  challengeBetActive: boolean;
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
