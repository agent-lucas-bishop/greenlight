export type Genre = 'Action' | 'Comedy' | 'Drama' | 'Horror' | 'Sci-Fi' | 'Romance' | 'Thriller';

export interface Script {
  id: string;
  title: string;
  genre: Genre;
  baseScore: number;
  slots: SlotType[];
  cost: number;
  ability?: string;
  abilityDesc?: string;
}

export type SlotType = 'Lead' | 'Support' | 'Director' | 'Crew' | 'Wild';

export interface Talent {
  id: string;
  name: string;
  type: 'Star' | 'Director' | 'Crew';
  skill: number;
  heat: number;
  genreBonus?: { genre: Genre; bonus: number };
  trait?: string;
  traitDesc?: string;
  demand?: string;
  cost: number;
  filmsLeft?: number;
}

export interface ProductionCard {
  id: string;
  name: string;
  type: 'good' | 'bad' | 'neutral';
  effect: string;
  qualityMod: number;
  budgetMod?: number;
  isScandal?: boolean;
  genreReq?: Genre;
  skillReq?: { type: string; min: number };
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

export interface ProductionState {
  deck: ProductionCard[];
  drawn: ProductionCard[];
  badCount: number;
  qualityBonus: number;
  budgetChange: number;
  isDisaster: boolean;
  isWrapped: boolean;
  drawCount: number;
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
  hitTarget: boolean;
  nominated: boolean;
}
