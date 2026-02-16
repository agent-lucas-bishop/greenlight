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
  tags?: CardTag[];
  // Runtime state
  synergyBonus?: number;
  synergyFired?: boolean;
  totalValue?: number;
  budgetMod?: number;
  special?: string;
}

export type CardTag = 'momentum' | 'precision' | 'chaos' | 'heart' | 'spectacle';

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
  // Tag tracking for keyword synergies
  tagsPlayed: Record<string, number>; // tag -> count of cards with that tag played
  discardedCount: number; // cards discarded (from draw-2-keep-1)
  consecutiveSources: number; // how many cards in a row from the same source type
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
  tags?: CardTag[]; // keyword tags for cross-talent synergies
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

export type BaggageType = 'salary_demand' | 'diva' | 'schedule_conflict' | 'entourage' | 'method_dangerous';

export interface TalentBaggage {
  type: BaggageType;
  label: string;
  description: string;
  // Mechanical effects
  extraCost?: number; // additional per-film salary on top of hire cost
  qualityPenalty?: number; // flat quality penalty if baggage triggers
  budgetDrain?: number; // $M drained during production
  slotBlocked?: SlotType; // blocks a specific slot type (schedule conflict)
  incidentChance?: number; // 0-1, chance of adding an extra incident card to deck
}

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
  baggage?: TalentBaggage;
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
  | 'seasonRecap'
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

export interface PendingBlock {
  incident: ProductionCard;
  actionCard: ProductionCard;
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
  // Director's Cut: peek/rearrange top 3 cards, once per production
  directorsCutUsed: boolean;
  directorsCutActive: boolean;
  directorsCutCards: ProductionCard[]; // top 3 cards being rearranged
  // Draw-2-keep-1 state
  currentDraw: DrawChoice | null;
  pendingChallenge: PendingChallenge | null;
  challengeBetActive: boolean;
  pendingBlock: PendingBlock | null;
  // Tag tracking
  tagsPlayed: Record<string, number>;
  // Encore push-your-luck
  encoreState: EncoreState | null;
}

export type StudioArchetypeId = 'prestige' | 'blockbuster' | 'indie' | 'chaos';

export type GameMode = 'normal' | 'newGamePlus' | 'directorMode' | 'daily' | 'challenge';

// Archetype Focus — rewarded when deck is dominated by one tag
export interface ArchetypeFocus {
  tag: string;
  percentage: number; // 0-100
  bonus: number; // quality bonus applied
  label: string; // e.g. "MOMENTUM FOCUS"
}

// Encore — push-your-luck after wrapping
export interface EncoreState {
  available: boolean;
  used: boolean;
  card: ProductionCard | null;
  result: 'pending' | 'success' | 'failure' | null;
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
  industryEvent: { name: string; description: string; effect: string } | null;
  neowChoice: number | null;
  studioArchetype: StudioArchetypeId | null;
  genreMastery: Record<string, number>; // genre -> count of films made in that genre
  rivalHistory: RivalSeasonData[]; // rival films per season
  cumulativeRivalEarnings: Record<string, number>; // rival studio name -> total earnings
  studioName: string;
  studioTagline: string;
  lastFilmTitle: string; // procedurally generated film title for release
  gameMode: GameMode;
  challengeId?: string;
  dailySeed?: string;
  dailyModifierId?: string; // daily modifier active for this run
  lockedGenre?: string; // for Typecast challenge
  maxSeasons: number; // normally 5, Speed Run = 3
  maxStrikes: number; // normally 3, Speed Run = 2
  // Genre market trends
  hotGenres: Genre[]; // 1-2 genres with box office bonus this season
  coldGenres: Genre[]; // 1-2 genres with box office penalty this season
  // Budget debt
  debt: number; // accumulated debt from overspending ($M)
}

export interface RivalSeasonData {
  season: number;
  films: { studioName: string; studioEmoji: string; title: string; genre: Genre; boxOffice: number; tier: RewardTier; quality: number }[];
}

export interface Chemistry {
  talent1: string; // name
  talent2: string;
  name: string; // "Power Couple", "Old Rivals"
  description: string;
  qualityBonus: number;
}

export interface StudioArchetype {
  id: string;
  name: string;
  emoji: string;
  description: string;
  effect: string; // key used by game logic
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
