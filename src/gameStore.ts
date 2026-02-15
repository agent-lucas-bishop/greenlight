import { GameState, GamePhase, Talent, Script, CastSlot, ProductionState, ProductionCard, StudioPerk, MarketCondition, SynergyContext, SynergyResult, RewardTier, CardTemplate } from './types';
import {
  starterRoster, generateScripts, generateTalentMarket,
  generateMarketConditions, generatePerkMarket, getSeasonTarget, neowTalent,
  INDUSTRY_EVENTS,
} from './data';

let _cardId = 0;
const cardUid = () => `card_${_cardId++}`;

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
    lastTier: null,
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

// ─── BUILD PRODUCTION DECK ───

function templateToCard(template: CardTemplate, source: string, sourceType: ProductionCard['sourceType']): ProductionCard {
  return {
    id: cardUid(),
    name: template.name,
    source,
    sourceType,
    baseQuality: template.baseQuality,
    synergyText: template.synergyText,
    synergyCondition: template.synergyCondition,
    riskTag: template.riskTag,
    budgetMod: template.budgetMod,
    special: template.special,
  };
}

function buildProductionDeck(castSlots: CastSlot[], script: Script): ProductionCard[] {
  const deck: ProductionCard[] = [];

  // Add script cards
  for (const template of script.cards) {
    deck.push(templateToCard(template, script.title, 'script'));
  }

  // Add talent cards
  for (const slot of castSlots) {
    if (!slot.talent) continue;
    const t = slot.talent;
    const sourceType: ProductionCard['sourceType'] =
      t.type === 'Lead' || t.type === 'Support' ? 'actor' :
      t.type === 'Director' ? 'director' : 'crew';

    for (const template of t.cards) {
      deck.push(templateToCard(template, t.name, sourceType));
    }

    // Heat 4+: add extra 🔴 cards
    if (t.heat >= 4 && t.heatCards) {
      for (const template of t.heatCards) {
        deck.push(templateToCard(template, t.name, sourceType));
      }
    }
  }

  // Shuffle (Fisher-Yates)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function evaluateSynergy(card: ProductionCard, played: ProductionCard[], totalQuality: number, drawNumber: number, castSlots: CastSlot[]): SynergyResult {
  if (!card.synergyCondition) return { bonus: 0 };

  const leadSlot = castSlots.find(s => s.slotType === 'Lead' && s.talent);
  const leadSkill = leadSlot?.talent?.skill || 0;
  const redCount = played.filter(c => c.riskTag === '🔴').length;
  const previousCard = played.length > 0 ? played[played.length - 1] : null;

  // Calculate green streak
  let greenStreak = 0;
  for (let i = played.length - 1; i >= 0; i--) {
    if (played[i].riskTag === '🟢') greenStreak++;
    else break;
  }

  const ctx: SynergyContext = {
    playedCards: played,
    totalQuality,
    drawNumber,
    leadSkill,
    redCount,
    previousCard,
    greenStreak,
  };

  return card.synergyCondition(ctx);
}

// ─── ACTIONS ───

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
    perks.push({ id: 'neow_perk', name: 'Crisis Manager', cost: 0, description: '🔴 card quality penalties halved', effect: 'crisisManager' });
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
  slots.forEach((s, i) => { if (s.talent?.id === talent.id) slots[i] = { ...s, talent: null }; });
  slots[slotIndex] = { ...slots[slotIndex], talent };
  setState({ castSlots: slots });
}

export function unassignTalent(slotIndex: number) {
  const slots = [...state.castSlots];
  slots[slotIndex] = { ...slots[slotIndex], talent: null };
  setState({ castSlots: slots });
}

export function hireTalent(talent: Talent) {
  if (state.budget < talent.cost) return;
  if (state.roster.length >= 8) return;
  setState({
    roster: [...state.roster, talent],
    budget: state.budget - talent.cost,
    talentMarket: state.talentMarket.filter(t => t.id !== talent.id),
  });
}

export function fireTalent(talentId: string) {
  const assigned = new Set(state.castSlots.map(s => s.talent?.id).filter(Boolean));
  if (assigned.has(talentId)) return;
  setState({ roster: state.roster.filter(t => t.id !== talentId) });
}

export function startProduction() {
  if (!state.currentScript) return;
  const deck = buildProductionDeck(state.castSlots, state.currentScript);
  const hasReshoots = state.perks.some(p => p.effect === 'reshoots');
  setState({
    phase: 'production',
    hasReshoots,
    reshootsUsed: false,
    production: {
      deck,
      played: [],
      redCount: 0,
      qualityTotal: 0,
      budgetChange: 0,
      isDisaster: false,
      isWrapped: false,
      drawCount: 0,
      cleanWrap: true,
      actorBuff: 0,
      poisonNext: 0,
      forceExtraDraw: false,
      scriptAbilityBonus: 0,
    },
  });
}

export function drawProductionCard() {
  if (!state.production || state.production.isWrapped) return;
  const prod = { ...state.production };
  const maxDraws = prod.forceExtraDraw ? 7 : 6;
  if (prod.drawCount >= maxDraws) return;

  const deck = [...prod.deck];
  if (deck.length === 0) { wrapProduction(); return; }

  const card = { ...deck.shift()! };
  const drawNumber = prod.drawCount + 1;

  // Evaluate synergy
  const synResult = evaluateSynergy(card, prod.played, prod.qualityTotal, drawNumber, state.castSlots);

  let totalCardValue = card.baseQuality + synResult.bonus;

  // Apply poison from previous card
  if (prod.poisonNext !== 0) {
    totalCardValue += prod.poisonNext;
  }

  // Apply actor buff if this is an actor card
  if (card.sourceType === 'actor' && prod.actorBuff !== 0) {
    totalCardValue += prod.actorBuff;
  }

  // Crisis Manager: halve negative quality from 🔴 cards
  if (card.riskTag === '🔴' && state.perks.some(p => p.effect === 'crisisManager')) {
    if (totalCardValue < 0) {
      totalCardValue = Math.ceil(totalCardValue / 2);
    }
  }

  // Store computed values on card for display
  card.synergyBonus = synResult.bonus;
  card.synergyFired = synResult.bonus !== 0 || !!synResult.multiply;
  card.totalValue = totalCardValue;
  card.budgetMod = (synResult.budgetMod || 0) + (card.budgetMod || 0);

  let newQuality = prod.qualityTotal + totalCardValue;

  // Apply multiplier
  if (synResult.multiply) {
    newQuality = Math.floor(newQuality * synResult.multiply);
    // The "bonus" from multiplication
    card.synergyBonus = Math.floor(prod.qualityTotal * synResult.multiply) - prod.qualityTotal + card.baseQuality;
    card.totalValue = newQuality - prod.qualityTotal;
  }

  const played = [...prod.played, card];
  let redCount = prod.redCount + (card.riskTag === '🔴' ? 1 : 0);
  let cleanWrap = prod.cleanWrap && card.riskTag !== '🔴';
  let budgetChange = prod.budgetChange + (card.budgetMod || 0);
  let actorBuff = prod.actorBuff;
  let poisonNext = 0; // reset poison for next draw
  let forceExtraDraw = prod.forceExtraDraw;

  // Handle special effects
  if (card.special === 'buffActors') {
    actorBuff += 1;
  }
  if (card.special === 'poisonNext') {
    poisonNext = -2;
  }
  if (card.special === 'poisonActors') {
    // This is handled through actorBuff (negative)
    actorBuff -= 1;
  }
  if (card.special === 'forceExtraDraw') {
    forceExtraDraw = true;
  }
  if (card.special === 'removeRed') {
    // Remove one 🔴 card from remaining deck
    const redIdx = deck.findIndex(c => c.riskTag === '🔴');
    if (redIdx >= 0) deck.splice(redIdx, 1);
  }
  if (card.special === 'buffNext') {
    poisonNext = 2; // positive "poison" = buff
  }

  const isDisaster = redCount >= 3;
  const isWrapped = isDisaster;

  // Script ability: Crowd Pleaser (consecutive 🟢 tracking)
  let scriptAbilityBonus = prod.scriptAbilityBonus;
  if (state.currentScript?.ability === 'crowdPleaser') {
    // Count current max consecutive 🟢
    let streak = 0;
    let maxStreak = 0;
    for (const c of played) {
      if (c.riskTag === '🟢') { streak++; maxStreak = Math.max(maxStreak, streak); }
      else streak = 0;
    }
    scriptAbilityBonus = Math.floor(maxStreak / 3) * 2;
  }

  setState({
    production: {
      deck,
      played,
      redCount,
      qualityTotal: newQuality,
      budgetChange,
      isDisaster,
      isWrapped,
      drawCount: drawNumber,
      cleanWrap,
      actorBuff,
      poisonNext,
      forceExtraDraw,
      scriptAbilityBonus,
    },
  });
}

export function useReshoots() {
  if (!state.production || state.reshootsUsed || !state.hasReshoots) return;
  const prod = { ...state.production };
  const played = [...prod.played];
  if (played.length === 0) return;
  const last = played.pop()!;

  // Undo the card's effects
  let redCount = prod.redCount - (last.riskTag === '🔴' ? 1 : 0);
  let qualityTotal = prod.qualityTotal - (last.totalValue || 0);
  let budgetChange = prod.budgetChange - (last.budgetMod || 0);
  let cleanWrap = redCount === 0;

  // Draw replacement
  const deck = [...prod.deck];
  if (deck.length > 0) {
    const newCard = deck.shift()!;
    const synResult = evaluateSynergy(newCard, played, qualityTotal, prod.drawCount, state.castSlots);
    let totalVal = newCard.baseQuality + synResult.bonus;
    newCard.synergyBonus = synResult.bonus;
    newCard.synergyFired = synResult.bonus !== 0;
    newCard.totalValue = totalVal;
    newCard.budgetMod = synResult.budgetMod || 0;

    played.push(newCard);
    redCount += newCard.riskTag === '🔴' ? 1 : 0;
    qualityTotal += totalVal;
    budgetChange += newCard.budgetMod || 0;
    cleanWrap = cleanWrap && newCard.riskTag !== '🔴';
  }

  setState({
    reshootsUsed: true,
    production: { ...prod, deck, played, redCount, qualityTotal, budgetChange, isDisaster: redCount >= 3, isWrapped: redCount >= 3, cleanWrap },
  });
}

export function wrapProduction() {
  if (!state.production) return;
  if (state.production.forceExtraDraw && state.production.drawCount < 7 && !state.production.isDisaster) {
    // Can't wrap yet — must draw one more
    return;
  }
  setState({ production: { ...state.production, isWrapped: true } });
}

export function calculateQuality(s: GameState): {
  rawQuality: number;
  scriptBase: number;
  talentSkill: number;
  productionBonus: number;
  cleanWrapBonus: number;
  scriptAbilityBonus: number;
} {
  const script = s.currentScript!;
  const prod = s.production!;

  const scriptBase = script.baseScore;
  const talentSkill = s.castSlots.reduce((sum, slot) => sum + (slot.talent?.skill || 0), 0);
  const productionBonus = prod.qualityTotal;

  // Clean Wrap bonus
  const precisionFilm = s.perks.some(p => p.effect === 'precisionFilm');
  let cleanWrapBonus = 0;
  if (prod.cleanWrap && prod.drawCount > 0) {
    cleanWrapBonus = precisionFilm ? 8 : 5;
  }

  // Script ability bonuses
  let scriptAbilityBonus = prod.scriptAbilityBonus;
  if (script.ability === 'finalGirl' && prod.drawCount === 5) {
    scriptAbilityBonus += 5;
  }

  let rawQuality = scriptBase + talentSkill + productionBonus + cleanWrapBonus + scriptAbilityBonus;

  if (prod.isDisaster) {
    const insuranceReduction = s.perks.some(p => p.effect === 'insurance') ? 0.75 : 0.5;
    rawQuality = Math.floor(rawQuality * insuranceReduction);
  }

  return { rawQuality, scriptBase, talentSkill, productionBonus, cleanWrapBonus, scriptAbilityBonus };
}

function getMarketMultiplier(market: MarketCondition, genre: string, quality: number): number {
  if (market.condition === 'quality>30' && quality <= 30) return 1.0;
  if (market.genreBonus && market.genreBonus !== genre) return 1.0;
  return market.multiplier;
}

function getTier(boxOffice: number, target: number): RewardTier {
  const ratio = boxOffice / target;
  if (ratio >= 1.5) return 'BLOCKBUSTER';
  if (ratio >= 1.25) return 'SMASH';
  if (ratio >= 1.0) return 'HIT';
  return 'FLOP';
}

export function resolveRelease() {
  if (!state.production || !state.currentScript) return;
  const script = state.currentScript;
  const prod = state.production;

  const { rawQuality } = calculateQuality(state);

  // Pick market
  const chooseMarket = state.perks.some(p => p.effect === 'chooseMarket');
  let market = state.activeMarket;
  if (!market) {
    if (chooseMarket) {
      market = state.marketConditions.reduce((best, m) => {
        const mult = getMarketMultiplier(m, script.genre, rawQuality);
        const bestMult = getMarketMultiplier(best, script.genre, rawQuality);
        return mult > bestMult ? m : best;
      });
    } else {
      market = state.marketConditions[Math.floor(Math.random() * state.marketConditions.length)];
    }
  }

  let multiplier = getMarketMultiplier(market, script.genre, rawQuality);

  // Blockbuster script ability: +0.3 to market mult
  if (script.ability === 'blockbusterBonus') {
    multiplier += 0.3;
  }

  // Perk multiplier bonuses
  const totalHeat = state.castSlots.reduce((sum, s) => sum + (s.talent?.heat || 0), 0);
  if (state.perks.some(p => p.effect === 'indieSpirit') && totalHeat <= 4) multiplier += 0.5;
  if (state.perks.some(p => p.effect === 'buzz') && rawQuality > 35) multiplier += 0.5;

  // Reputation bonus
  const currentRep = state.reputation;
  const repBonus = [0, 0.5, 0.75, 1.0, 1.25, 1.5][currentRep] || 1.0;

  const boxOffice = Math.round(rawQuality * multiplier * repBonus * 10) / 10;
  const target = getSeasonTarget(state.season);
  const tier = getTier(boxOffice, target);

  // Tier rewards
  let repChange = 0;
  let bonusMoney = 0;
  let earnings = boxOffice;

  switch (tier) {
    case 'FLOP':
      repChange = -1;
      earnings = Math.round(boxOffice * 0.5 * 10) / 10;
      break;
    case 'HIT':
      repChange = 0;
      break;
    case 'SMASH':
      repChange = 1;
      bonusMoney = 10;
      break;
    case 'BLOCKBUSTER':
      repChange = 1;
      bonusMoney = 20;
      break;
  }

  const newRep = Math.max(0, Math.min(5, currentRep + repChange));
  const nominated = rawQuality > 25 + state.season * 5;

  const result = {
    season: state.season,
    title: script.title,
    genre: script.genre,
    quality: rawQuality,
    boxOffice,
    tier,
    hitTarget: tier !== 'FLOP',
    nominated,
  };

  // Post-film trait effects
  let newRoster = [...state.roster];
  if (result.hitTarget) {
    newRoster = newRoster.map(t => {
      if (t.trait === 'Rising Star' && state.castSlots.some(s => s.talent?.id === t.id)) {
        return { ...t, skill: Math.min(t.skill + 1, 6) };
      }
      return t;
    });
  }
  newRoster = newRoster.map(t => {
    if (t.trait === 'Past Their Prime') {
      return { ...t, skill: Math.max(t.skill - 1, 1) };
    }
    return t;
  });

  setState({
    phase: 'release',
    lastBoxOffice: boxOffice,
    lastQuality: rawQuality,
    lastTier: tier,
    activeMarket: market,
    budget: state.budget + earnings + bonusMoney + prod.budgetChange,
    totalEarnings: state.totalEarnings + earnings,
    reputation: newRep,
    strikes: tier === 'FLOP' ? state.strikes + 1 : state.strikes,
    seasonHistory: [...state.seasonHistory, result],
    roster: newRoster,
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
    lastTier: null,
    phase: 'greenlight',
  });
  beginSeason();
}
