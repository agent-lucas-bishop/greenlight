export type Genre = 'Action' | 'Comedy' | 'Drama' | 'Horror' | 'Sci-Fi' | 'Romance' | 'Thriller';

export type CardType = 'action' | 'challenge' | 'incident';
export type IncidentSeverity = 'minor' | 'major' | 'catastrophic';
export type RiskTag = '🟢' | '🟡' | '🔴'; // kept for backward compat, maps to CardType
export type CardSourceType = 'actor' | 'director' | 'crew' | 'script';

export interface ChallengeBet {
  description: string; // e.g. "Bet the next card is an Action card"
  successBonus: number; // +3 to +6
  failPenalty: number; // -2 to -4
  condition: (ctx: SynergyContext) => boolean; // evaluated when bet resolves
  oddsHint?: (ctx: SynergyContext) => string; // e.g. "3 Action cards remain in deck of 8"
}

export type CardAbility = 'combo' | 'momentum' | 'wildcard' | 'insurance' | 'spotlight';

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
  rarity?: CardRarity;
  // Runtime state
  synergyBonus?: number;
  synergyFired?: boolean;
  totalValue?: number;
  budgetMod?: number;
  special?: string;
  severity?: IncidentSeverity; // incident severity level (assigned at deck build)
  ability?: CardAbility; // R170: card ability
  abilityActivated?: boolean; // R170: whether ability has been triggered
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
  legendary?: boolean;
  keywordTags?: CardTag[]; // extra keyword tags for legendary scripts
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
  elite?: boolean;
  elitePassive?: string; // description of passive ability
  elitePassiveEffect?: string; // key for game logic
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

export type CardRarity = 'common' | 'rare' | 'epic';

export type GamePhase =
  | 'start'
  | 'neow'
  | 'greenlight'
  | 'casting'
  | 'production'
  | 'postProduction'
  | 'release'
  | 'shop'
  | 'workshop'
  | 'event'
  | 'festival'
  | 'gameOver'
  | 'victory';

export type MarketingTier = 'none' | 'standard' | 'premium' | 'viral';
export type PostProdOption = 'directorsCut' | 'testScreening' | 'reshoot' | 'rushRelease';

// R179: Soundtrack system
export interface SoundtrackData {
  composerName: string;
  composerTier: number;
  style: string;
  qualityRating: number; // 1-5
  qualityBonus: number; // +0 to +2
  cost: number;
}

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

export interface DirectorVision {
  description: string; // e.g. "Wants a Heart-tagged lead"
  condition: (ctx: DirectorVisionContext) => boolean;
  met?: boolean; // resolved after wrap
}

export interface DirectorVisionContext {
  castSlots: CastSlot[];
  tagsPlayed: Record<string, number>;
  played: ProductionCard[];
  incidentCount: number;
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
  // Script Rewrite: re-roll 1-2 script keyword tags, costs $3M, once per film
  scriptRewriteUsed: boolean;
  // Director's Vision: bonus condition from hired director
  directorVision: DirectorVision | null;
}

export type StudioArchetypeId = 'prestige' | 'blockbuster' | 'indie' | 'chaos';

export type GameMode = 'normal' | 'newGamePlus' | 'directorMode' | 'daily' | 'weekly' | 'challenge' | 'seeded' | 'endless';

export type Difficulty = 'indie' | 'studio' | 'mogul';

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
  difficulty: Difficulty;
  challengeId?: string;
  dailySeed?: string;
  dailyModifierId?: string; // daily modifier active for this run
  dailyModifierId2?: string; // second modifier for weekly challenge
  customSeed?: string; // display string for custom/weekly seeds
  seedDisplay?: string; // human-readable seed label for header
  lockedGenre?: string; // for Typecast challenge
  maxSeasons: number; // normally 5, Speed Run = 3
  maxStrikes: number; // normally 3, Speed Run = 2
  // Genre market trends
  hotGenres: Genre[]; // 1-2 genres with box office bonus this season
  coldGenres: Genre[]; // 1-2 genres with box office penalty this season
  // Budget debt
  debt: number; // accumulated debt from overspending ($M)
  // Season events (R55)
  seasonEventChoices: SeasonEventChoice[] | null; // events to pick from between seasons
  activeSeasonEvent: SeasonEventChoice | null; // the chosen event for next season
  streamingDealActive: boolean; // next film -×0.3 mult from streaming deal
  rosterCap?: number; // max roster size (default 8), reduced by studio merger
  pendingSequelScript?: Script | null; // franchise sequel script for next season
  // R136: Franchise/Sequel system
  franchises: Record<string, FranchiseEntry>; // franchise root title -> franchise data
  sequelOrigins: Record<string, string>; // film title -> franchise root title (maps sequels to their franchise)
  // R106: Advanced strategy
  completionBond: boolean; // one-use: next FLOP → MISS (no strike)
  extendedCutAvailable: boolean; // after HIT+, can do extended cut
  extendedCutUsed: boolean; // used this season (skips next film slot)
  reshootsBudgetUsed: boolean; // $5M reshoots — re-roll incidents after wrap, once per film
  activeModifiers?: string[]; // IDs of toggled challenge modifiers
  weeklySeed?: string; // weekly seed display string
  retirementNotification?: string | null; // talent name that just retired
  // R153: Post-Production Phase
  postProdMarketing?: MarketingTier | null; // chosen marketing spend
  postProdOption?: PostProdOption | null; // chosen post-production option
  postProdMarketingMultiplier?: number; // resolved marketing multiplier (for viral randomness)
  postProdTestScreeningTier?: string | null; // preview tier shown during test screening
  // R179: Soundtrack system
  postProdComposer?: string | null; // hired composer name (null = no hire, use free default)
  postProdSoundtrack?: SoundtrackData | null; // generated soundtrack profile for current film
  // R150: Active Rival System
  prCampaignActive: boolean; // $2M PR Campaign reduces rival interference this season
  rivalActions: RivalAction[]; // rival actions applied this season
  // R162: Card Workshop — persistent deck upgrades between seasons
  workshopDeck: ProductionCard[];
  // R176: Film Festival system
  festivalHistory: { festivalId: string; filmTitle: string; filmGenre: Genre; season: number; award: string | null; score: number }[];
  festivalEligible: { id: string; name: string; emoji: string; entryCost: number }[] | null; // festivals available this between-season
  festivalResult: { festivalId: string; festivalName: string; festivalEmoji: string; filmTitle: string; award: string | null; score: number; repBoost: number; budgetBonus: number } | null;
  // R180: Advanced AI Rivals
  activeRivalIds: RivalPersonalityId[]; // 2-3 rivals active this run
  rivalStats: Record<string, RivalStats>; // rival name -> persistent stats
  nemesisStudio: string | null; // rival name that became nemesis (beaten player 3+ times)
  // R185: Audience reactions
  lastAudienceReaction: import('./audienceReactions').AudienceReaction | null;
}

// ─── RIVAL ACTIONS (R150) ───
export type RivalActionType = 'snipeTalent' | 'stealScript' | 'competingFilm';

export interface RivalAction {
  studioName: string;
  studioEmoji: string;
  actionType: RivalActionType;
  description: string;
  /** For snipeTalent: index of talent removed from market */
  removedTalentIndex?: number;
  /** For stealScript: index of script blocked from greenlight */
  blockedScriptIndex?: number;
  /** For competingFilm: multiplier penalty applied */
  multiplierPenalty?: number;
  /** Genre of competing film (for competingFilm action) */
  competingGenre?: Genre;
}

// ─── R180: Advanced AI Rivals ───
export type RivalPersonalityId = 'pinnacle' | 'arthouse' | 'sequel_machine' | 'flash' | 'golden_age' | 'chaos';

export interface RivalStats {
  filmsMade: number;
  totalBoxOffice: number;
  reputation: number;
  seasonEarnings: number[]; // earnings per season index
  timesBeatenPlayer: number; // seasons where this rival's BO > player's BO
}

export interface SeasonEventChoice {
  id: string;
  name: string;
  emoji: string;
  description: string;
  flavorText: string;
  effect: string;
  rarity?: 'common' | 'rare' | 'legendary';
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

// R136: Franchise tracking
export interface FranchiseEntry {
  rootTitle: string; // original film title
  genre: Genre;
  films: { title: string; season: number; quality: number; boxOffice: number; tier: RewardTier }[];
  totalBoxOffice: number;
  sequelNumber: number; // how many films in franchise so far
  lastQuality: number; // quality of most recent entry
  lastCost: number; // cost of most recent entry
  lastMarketMultiplier: number; // market multiplier of most recent entry
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
  criticScore?: number; // R173: fresh percentage (0-100)
  criticStars?: number; // R173: average star rating (1-5)
  festivalAwards?: { festivalId: string; award: string }[]; // R176: festival laurels
  soundtrack?: SoundtrackData | null; // R179: soundtrack profile
  audienceScore?: number; // R185: audience score (0-100)
}
