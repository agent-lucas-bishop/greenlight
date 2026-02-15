import { GameState, GamePhase, Talent, Script, CastSlot, ProductionState, StudioPerk } from './types';
import {
  starterRoster, generateScripts, generateTalentMarket, buildProductionDeck,
  generateMarketConditions, generatePerkMarket, getSeasonTarget, neowTalent,
  INDUSTRY_EVENTS,
} from './data';

function createInitialState(): GameState {
  return {
    phase: 'start',
    season: 1,
    budget: 15,
    reputation: 3,
    roster: [],
    perks: [],
    totalEarnings: 0,
    strikes: 0,
    currentScript: null,
    scriptChoices: [],
    castSlots: [],
    production: null,
    marketConditions: [],
    activeMarket: null,
    talentMarket: [],
    perkMarket: [],
    lastBoxOffice: 0,
    lastQuality: 0,
    seasonHistory: [],
    hasReshoots: false,
    reshootsUsed: false,
    industryEvent: null,
    neowChoice: null,
  };
}

type Listener = () => void;
let state: GameState = createInitialState();
const listeners: Set<Listener> = new Set();

export function getState(): GameState { return state; }

function setState(partial: Partial<GameState>) {
  state = { ...state, ...partial };
  listeners.forEach(l => l());
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// --- ACTIONS ---

export function startGame() {
  setState({ ...createInitialState(), phase: 'neow' });
}

export function pickNeow(choice: number) {
  let roster = starterRoster();
  let budget = 15;
  let perks: StudioPerk[] = [];
  if (choice === 0) {
    roster.push(neowTalent());
  } else if (choice === 1) {
    budget += 10;
  } else {
    perks.push({ id: 'neow_perk', name: 'Crisis Manager', cost: 0, description: 'Bad card effects halved', effect: 'crisisManager' });
  }
  setState({ neowChoice: choice, roster, budget, perks, phase: 'greenlight' as GamePhase });
  beginSeason();
}

function beginSeason() {
  const devSlate = state.perks.some(p => p.effect === 'devSlate');
  const scripts = generateScripts(devSlate ? 4 : 3, state.season);
  const markets = generateMarketConditions(3);
  setState({ scriptChoices: scripts, marketConditions: markets });
}

export function pickScript(script: Script) {
  if (state.budget < script.cost) return;
  const slots: CastSlot[] = script.slots.map(s => ({ slotType: s, talent: null }));
  const moreTalent = state.perks.some(p => p.effect === 'moreTalent');
  const market = generateTalentMarket(moreTalent ? 6 : 4, state.season);
  setState({
    currentScript: script,
    budget: state.budget - script.cost,
    castSlots: slots,
    talentMarket: market,
    phase: 'casting',
  });
}

export function assignTalent(slotIndex: number, talent: Talent) {
  const slots = [...state.castSlots];
  // Check if already assigned elsewhere - remove first
  slots.forEach((s, i) => { if (s.talent?.id === talent.id) slots[i] = { ...s, talent: null }; });
  slots[slotIndex] = { ...slots[slotIndex], talent };
  setState({ castSlots: slots });
}

export function hireTalent(talent: Talent) {
  if (state.budget < talent.cost) return;
  setState({
    roster: [...state.roster, talent],
    budget: state.budget - talent.cost,
    talentMarket: state.talentMarket.filter(t => t.id !== talent.id),
  });
}

export function startProduction() {
  const totalHeat = state.castSlots.reduce((sum, s) => sum + (s.talent?.heat || 0), 0);
  const deck = buildProductionDeck(totalHeat);
  const hasReshoots = state.perks.some(p => p.effect === 'reshoots');
  setState({
    phase: 'production',
    hasReshoots,
    reshootsUsed: false,
    production: {
      deck,
      drawn: [],
      badCount: 0,
      qualityBonus: 0,
      budgetChange: 0,
      isDisaster: false,
      isWrapped: false,
      drawCount: 0,
    },
  });
}

export function drawProductionCard() {
  if (!state.production || state.production.isWrapped || state.production.drawCount >= 6) return;
  const prod = { ...state.production };
  const deck = [...prod.deck];
  if (deck.length === 0) { wrapProduction(); return; }
  const card = deck.shift()!;
  const drawn = [...prod.drawn, card];
  let badCount = prod.badCount + (card.type === 'bad' ? 1 : 0);
  let qualityBonus = prod.qualityBonus + card.qualityMod;
  let budgetChange = prod.budgetChange + (card.budgetMod || 0);
  
  // Crisis Manager halves bad effects
  if (card.type === 'bad' && state.perks.some(p => p.effect === 'crisisManager')) {
    qualityBonus -= card.qualityMod; // undo
    qualityBonus += Math.ceil(card.qualityMod / 2); // halved
    if (card.budgetMod) {
      budgetChange -= card.budgetMod;
      budgetChange += Math.ceil(card.budgetMod / 2);
    }
  }

  const isDisaster = badCount >= 3;
  const isWrapped = isDisaster;
  
  setState({
    production: { deck, drawn, badCount, qualityBonus, budgetChange, isDisaster, isWrapped, drawCount: prod.drawCount + 1 },
  });
}

export function useReshoots() {
  if (!state.production || state.reshootsUsed || !state.hasReshoots) return;
  const prod = { ...state.production };
  const drawn = [...prod.drawn];
  if (drawn.length === 0) return;
  const last = drawn.pop()!;
  let badCount = prod.badCount - (last.type === 'bad' ? 1 : 0);
  let qualityBonus = prod.qualityBonus - last.qualityMod;
  let budgetChange = prod.budgetChange - (last.budgetMod || 0);
  // Draw replacement
  const deck = [...prod.deck];
  if (deck.length > 0) {
    const newCard = deck.shift()!;
    drawn.push(newCard);
    badCount += newCard.type === 'bad' ? 1 : 0;
    qualityBonus += newCard.qualityMod;
    budgetChange += (newCard.budgetMod || 0);
  }
  setState({
    reshootsUsed: true,
    production: { ...prod, deck, drawn, badCount, qualityBonus, budgetChange, isDisaster: badCount >= 3, isWrapped: badCount >= 3, drawCount: prod.drawCount },
  });
}

export function wrapProduction() {
  if (!state.production) return;
  setState({ production: { ...state.production, isWrapped: true } });
}

export function resolveRelease() {
  if (!state.production || !state.currentScript) return;
  const script = state.currentScript;
  const prod = state.production;
  
  // Calculate quality
  let talentSkill = state.castSlots.reduce((sum, s) => sum + (s.talent?.skill || 0), 0);
  let genreBonus = state.castSlots.reduce((sum, s) => {
    if (s.talent?.genreBonus?.genre === script.genre) return sum + s.talent.genreBonus.bonus;
    return sum;
  }, 0);
  
  let rawQuality = script.baseScore + talentSkill + prod.qualityBonus + genreBonus;
  if (prod.isDisaster) rawQuality = Math.floor(rawQuality * 0.5);
  
  // Pick market (random or chosen)
  const chooseMarket = state.perks.some(p => p.effect === 'chooseMarket');
  let market = state.activeMarket;
  if (!market) {
    if (chooseMarket) {
      // Find best matching
      market = state.marketConditions.reduce((best, m) => {
        const mult = (m.genreBonus === script.genre || !m.genreBonus) ? m.multiplier : 1.0;
        const bestMult = (best.genreBonus === script.genre || !best.genreBonus) ? best.multiplier : 1.0;
        return mult > bestMult ? m : best;
      });
    } else {
      market = state.marketConditions[Math.floor(Math.random() * state.marketConditions.length)];
    }
  }
  
  let multiplier = (market.genreBonus === script.genre || !market.genreBonus) ? market.multiplier : 1.0;
  
  // Perk multiplier bonuses
  const totalHeat = state.castSlots.reduce((sum, s) => sum + (s.talent?.heat || 0), 0);
  if (state.perks.some(p => p.effect === 'indieSpirit') && totalHeat <= 4) multiplier += 0.5;
  if (state.perks.some(p => p.effect === 'buzz') && rawQuality > 35) multiplier += 0.5;
  
  // Reputation bonus
  const repBonus = [0, 0.5, 0.75, 1.0, 1.25, 1.5][state.reputation] || 1.0;
  
  const boxOffice = Math.round(rawQuality * multiplier * repBonus * 10) / 10;
  const target = getSeasonTarget(state.season);
  const hit = boxOffice >= target;
  const newRep = hit ? Math.min(state.reputation + 1, 5) : Math.max(state.reputation - 1, 0);
  const nominated = rawQuality > 25 + state.season * 5;
  
  const result = {
    season: state.season,
    title: script.title,
    genre: script.genre,
    quality: rawQuality,
    boxOffice,
    hitTarget: hit,
    nominated,
  };
  
  setState({
    phase: 'release',
    lastBoxOffice: boxOffice,
    lastQuality: rawQuality,
    activeMarket: market,
    budget: state.budget + boxOffice + prod.budgetChange,
    totalEarnings: state.totalEarnings + boxOffice,
    reputation: newRep,
    strikes: hit ? state.strikes : state.strikes + 1,
    seasonHistory: [...state.seasonHistory, result],
  });
}

export function proceedToShop() {
  if (state.reputation <= 0 || state.strikes >= 3) {
    setState({ phase: 'gameOver' });
    return;
  }
  if (state.season >= 5) {
    setState({ phase: 'victory' });
    return;
  }
  const perkMarket = generatePerkMarket(4, state.perks.map(p => p.name));
  const talentMarket = generateTalentMarket(4, state.season);
  const event = INDUSTRY_EVENTS[Math.floor(Math.random() * INDUSTRY_EVENTS.length)];
  setState({
    phase: 'shop',
    perkMarket,
    talentMarket,
    industryEvent: event,
  });
}

export function buyPerk(perk: StudioPerk) {
  if (state.budget < perk.cost || state.perks.length >= 5) return;
  setState({
    perks: [...state.perks, perk],
    budget: state.budget - perk.cost,
    perkMarket: state.perkMarket.filter(p => p.id !== perk.id),
  });
}

export function nextSeason() {
  setState({
    season: state.season + 1,
    currentScript: null,
    castSlots: [],
    production: null,
    activeMarket: null,
    phase: 'greenlight',
  });
  beginSeason();
}
