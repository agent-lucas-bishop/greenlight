import { GameState, GamePhase, Talent, Script, CastSlot, ProductionState, ProductionCard, StudioPerk, MarketCondition, SynergyContext, SynergyResult, RewardTier, CardTemplate, DrawChoice, PendingChallenge } from './types';
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
    cardType: template.cardType,
    baseQuality: template.baseQuality,
    synergyText: template.synergyText,
    synergyCondition: template.synergyCondition,
    riskTag: template.riskTag,
    challengeBet: template.challengeBet,
    budgetMod: template.budgetMod,
    special: template.special,
  };
}

function buildProductionDeck(castSlots: CastSlot[], script: Script): ProductionCard[] {
  const deck: ProductionCard[] = [];

  for (const template of script.cards) {
    deck.push(templateToCard(template, script.title, 'script'));
  }

  for (const slot of castSlots) {
    if (!slot.talent) continue;
    const t = slot.talent;
    const sourceType: ProductionCard['sourceType'] =
      t.type === 'Lead' || t.type === 'Support' ? 'actor' :
      t.type === 'Director' ? 'director' : 'crew';

    for (const template of t.cards) {
      deck.push(templateToCard(template, t.name, sourceType));
    }

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

function buildSynergyContext(played: ProductionCard[], totalQuality: number, drawNumber: number, castSlots: CastSlot[], remainingDeck: ProductionCard[]): SynergyContext {
  const leadSlot = castSlots.find(s => s.slotType === 'Lead' && s.talent);
  const leadSkill = leadSlot?.talent?.skill || 0;
  const incidentCount = played.filter(c => c.cardType === 'incident').length;
  const previousCard = played.length > 0 ? played[played.length - 1] : null;

  let greenStreak = 0;
  for (let i = played.length - 1; i >= 0; i--) {
    if (played[i].cardType === 'action') greenStreak++;
    else break;
  }

  return {
    playedCards: played,
    totalQuality,
    drawNumber,
    leadSkill,
    redCount: incidentCount,
    incidentCount,
    previousCard,
    greenStreak,
    remainingDeck,
    actionCardsPlayed: played.filter(c => c.cardType === 'action').length,
    challengeCardsPlayed: played.filter(c => c.cardType === 'challenge').length,
  };
}

function evaluateSynergy(card: ProductionCard, played: ProductionCard[], totalQuality: number, drawNumber: number, castSlots: CastSlot[], remainingDeck: ProductionCard[]): SynergyResult {
  if (!card.synergyCondition) return { bonus: 0 };
  const ctx = buildSynergyContext(played, totalQuality, drawNumber, castSlots, remainingDeck);
  return card.synergyCondition(ctx);
}

function resolveCardPlay(card: ProductionCard, prod: ProductionState, castSlots: CastSlot[]): ProductionState {
  const p = { ...prod };
  const drawNumber = p.drawCount; // already incremented
  const played = [...p.played];
  const deck = [...p.deck];

  const synResult = evaluateSynergy(card, played, p.qualityTotal, drawNumber, castSlots, deck);
  
  let totalCardValue = card.baseQuality + synResult.bonus;

  // Apply poison from previous card
  if (p.poisonNext !== 0) {
    totalCardValue += p.poisonNext;
  }

  // Apply actor buff if actor card
  if (card.sourceType === 'actor' && p.actorBuff !== 0) {
    totalCardValue += p.actorBuff;
  }

  // Crisis Manager: halve incident penalties
  if (card.cardType === 'incident' && state.perks.some(pk => pk.effect === 'crisisManager')) {
    if (totalCardValue < 0) {
      totalCardValue = Math.ceil(totalCardValue / 2);
    }
  }

  card.synergyBonus = synResult.bonus;
  card.synergyFired = synResult.bonus !== 0 || !!synResult.multiply;
  card.totalValue = totalCardValue;
  card.budgetMod = (synResult.budgetMod || 0) + (card.budgetMod || 0);

  let newQuality = p.qualityTotal + totalCardValue;

  if (synResult.multiply) {
    newQuality = Math.floor(newQuality * synResult.multiply);
    card.synergyBonus = Math.floor(p.qualityTotal * synResult.multiply) - p.qualityTotal + card.baseQuality;
    card.totalValue = newQuality - p.qualityTotal;
  }

  played.push(card);
  let incidentCount = p.incidentCount + (card.cardType === 'incident' ? 1 : 0);
  let cleanWrap = p.cleanWrap && card.cardType !== 'incident';
  let budgetChange = p.budgetChange + (card.budgetMod || 0);
  let actorBuff = p.actorBuff;
  let poisonNext = 0;
  let forceExtraDraw = p.forceExtraDraw;

  if (card.special === 'buffActors') actorBuff += 1;
  if (card.special === 'poisonNext') poisonNext = -2;
  if (card.special === 'poisonActors') actorBuff -= 1;
  if (card.special === 'forceExtraDraw') forceExtraDraw = true;
  if (card.special === 'removeRed') {
    const redIdx = deck.findIndex(c => c.cardType === 'incident');
    if (redIdx >= 0) deck.splice(redIdx, 1);
  }
  if (card.special === 'buffNext') poisonNext = 2;

  // 3 Incidents = DISASTER — lose ALL quality
  const isDisaster = incidentCount >= 3;

  // Script ability: Crowd Pleaser (consecutive Action card tracking)
  let scriptAbilityBonus = p.scriptAbilityBonus;
  if (state.currentScript?.ability === 'crowdPleaser') {
    let streak = 0;
    let maxStreak = 0;
    for (const c of played) {
      if (c.cardType === 'action') { streak++; maxStreak = Math.max(maxStreak, streak); }
      else streak = 0;
    }
    scriptAbilityBonus = Math.floor(maxStreak / 3) * 2;
  }

  return {
    ...p,
    deck,
    played,
    redCount: incidentCount,
    incidentCount,
    qualityTotal: newQuality,
    budgetChange,
    isDisaster,
    isWrapped: isDisaster,
    cleanWrap,
    actorBuff,
    poisonNext,
    forceExtraDraw,
    scriptAbilityBonus,
    currentDraw: null,
    pendingChallenge: null,
    challengeBetActive: false,
  };
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
    perks.push({ id: 'neow_perk', name: 'Crisis Manager', cost: 0, description: 'Incident card quality penalties halved', effect: 'crisisManager' });
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
      discarded: [],
      redCount: 0,
      incidentCount: 0,
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
      currentDraw: null,
      pendingChallenge: null,
      challengeBetActive: false,
    },
  });
}

// Draw-2-Keep-1: reveals 2 cards, auto-resolves incidents/challenges, lets player pick from remaining action cards
export function drawProductionCards() {
  if (!state.production || state.production.isWrapped) return;
  const prod = { ...state.production };
  const maxDraws = getMaxDraws(prod);
  if (prod.drawCount >= maxDraws) return;
  if (prod.currentDraw || prod.pendingChallenge) return; // already in a draw

  const deck = [...prod.deck];
  if (deck.length === 0) { wrapProduction(); return; }

  prod.drawCount++;

  // Draw up to 2 cards
  const card1 = deck.shift()!;
  const card2 = deck.length > 0 ? deck.shift()! : null;

  const cards = card2 ? [card1, card2] : [card1];
  const resolved: ProductionCard[] = [];
  const choosable: ProductionCard[] = [];

  // Categorize: incidents auto-play, challenges auto-play, actions are choosable
  for (const c of cards) {
    if (c.cardType === 'incident') {
      resolved.push(c);
    } else if (c.cardType === 'challenge') {
      resolved.push(c);
    } else {
      choosable.push(c);
    }
  }

  // Auto-resolve incidents immediately
  let updatedProd: ProductionState = { ...prod, deck };
  for (const inc of resolved.filter(c => c.cardType === 'incident')) {
    updatedProd = resolveCardPlay({ ...inc }, updatedProd, state.castSlots);
    if (updatedProd.isDisaster) {
      setState({ production: updatedProd });
      return;
    }
  }

  // Handle challenge cards
  const challenges = resolved.filter(c => c.cardType === 'challenge');
  if (challenges.length > 0) {
    // Play challenge card first, then show bet prompt
    const challengeCard = challenges[0];
    // Auto-play the challenge (base value)
    updatedProd = resolveCardPlay({ ...challengeCard }, updatedProd, state.castSlots);
    
    if (challengeCard.challengeBet) {
      // Show bet prompt to player
      const ctx = buildSynergyContext(updatedProd.played, updatedProd.qualityTotal, updatedProd.drawCount, state.castSlots, updatedProd.deck);
      updatedProd.pendingChallenge = {
        card: challengeCard,
        bet: challengeCard.challengeBet,
      };
      updatedProd.challengeBetActive = true;
      // If there are also choosable action cards, save them for after bet resolves
      if (choosable.length > 0) {
        updatedProd.currentDraw = {
          card1: cards[0],
          card2: card2 || cards[0],
          resolved,
          choosable,
        };
      }
      setState({ production: updatedProd });
      return;
    }
  }

  // If only action cards remain for choice
  if (choosable.length === 2) {
    // Player must pick one
    updatedProd.currentDraw = {
      card1: choosable[0],
      card2: choosable[1],
      resolved,
      choosable,
    };
    setState({ production: updatedProd });
    return;
  } else if (choosable.length === 1) {
    // Auto-keep the single action card
    updatedProd = resolveCardPlay({ ...choosable[0] }, updatedProd, state.castSlots);
    setState({ production: updatedProd });
    return;
  }

  // No choosable cards (all were incidents/challenges, already resolved)
  setState({ production: updatedProd });
}

// Player picks one of two action cards
export function pickCard(cardIndex: 0 | 1) {
  if (!state.production?.currentDraw) return;
  const prod = { ...state.production };
  const draw = prod.currentDraw!;
  const chosen = { ...draw.choosable[cardIndex] };
  const discardIdx = cardIndex === 0 ? 1 : 0;
  
  if (draw.choosable.length > 1) {
    const discarded = draw.choosable[discardIdx];
    prod.discarded = [...prod.discarded, discarded];
  }
  
  prod.currentDraw = null;
  const updatedProd = resolveCardPlay(chosen, prod, state.castSlots);
  setState({ production: updatedProd });
}

// Player accepts or declines a challenge bet
export function resolveChallengeBet(accept: boolean) {
  if (!state.production?.pendingChallenge) return;
  const prod = { ...state.production };
  const challenge = prod.pendingChallenge!;
  
  if (accept && challenge.bet) {
    const ctx = buildSynergyContext(prod.played, prod.qualityTotal, prod.drawCount, state.castSlots, prod.deck);
    const success = challenge.bet.condition(ctx);
    const bonus = success ? challenge.bet.successBonus : challenge.bet.failPenalty;
    
    prod.qualityTotal += bonus;
    
    // Update the challenge card's display values
    const lastPlayed = prod.played[prod.played.length - 1];
    if (lastPlayed && lastPlayed.id === challenge.card.id) {
      lastPlayed.synergyBonus = bonus;
      lastPlayed.synergyFired = true;
      lastPlayed.totalValue = (lastPlayed.totalValue || 0) + bonus;
    }
  }
  
  prod.pendingChallenge = null;
  prod.challengeBetActive = false;
  
  // If there was a pending card choice, show it now
  if (prod.currentDraw && prod.currentDraw.choosable.length > 0) {
    setState({ production: prod });
    return;
  }
  
  prod.currentDraw = null;
  setState({ production: prod });
}

// Legacy single-draw function (redirects to new system)
export function drawProductionCard() {
  drawProductionCards();
}

export function useReshoots() {
  if (!state.production || state.reshootsUsed || !state.hasReshoots) return;
  const prod = { ...state.production };
  const played = [...prod.played];
  if (played.length === 0) return;
  const last = played.pop()!;

  let incidentCount = prod.incidentCount - (last.cardType === 'incident' ? 1 : 0);
  let qualityTotal = prod.qualityTotal - (last.totalValue || 0);
  let budgetChange = prod.budgetChange - (last.budgetMod || 0);
  let cleanWrap = incidentCount === 0;

  const deck = [...prod.deck];
  if (deck.length > 0) {
    const newCard = deck.shift()!;
    const synResult = evaluateSynergy(newCard, played, qualityTotal, prod.drawCount, state.castSlots, deck);
    let totalVal = newCard.baseQuality + synResult.bonus;
    newCard.synergyBonus = synResult.bonus;
    newCard.synergyFired = synResult.bonus !== 0;
    newCard.totalValue = totalVal;
    newCard.budgetMod = synResult.budgetMod || 0;

    played.push(newCard);
    incidentCount += newCard.cardType === 'incident' ? 1 : 0;
    qualityTotal += totalVal;
    budgetChange += newCard.budgetMod || 0;
    cleanWrap = cleanWrap && newCard.cardType !== 'incident';
  }

  setState({
    reshootsUsed: true,
    production: { ...prod, deck, played, redCount: incidentCount, incidentCount, qualityTotal, budgetChange, isDisaster: incidentCount >= 3, isWrapped: incidentCount >= 3, cleanWrap },
  });
}

export function getMaxDraws(prod: ProductionState): number {
  const totalDeckSize = prod.deck.length + prod.played.length + prod.discarded.length;
  const baseDraw = Math.min(15, Math.max(6, Math.ceil(totalDeckSize * 0.55)));
  return baseDraw + (prod.forceExtraDraw ? 2 : 0);
}

export function wrapProduction() {
  if (!state.production) return;
  const maxDraws = getMaxDraws(state.production);
  if (state.production.forceExtraDraw && state.production.drawCount < maxDraws && !state.production.isDisaster) {
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

  const precisionFilm = s.perks.some(p => p.effect === 'precisionFilm');
  let cleanWrapBonus = 0;
  if (prod.cleanWrap && prod.drawCount > 0) {
    cleanWrapBonus = precisionFilm ? 8 : 5;
  }

  let scriptAbilityBonus = prod.scriptAbilityBonus;
  if (script.ability === 'finalGirl' && prod.drawCount === 5) {
    scriptAbilityBonus += 5;
  }

  let rawQuality = scriptBase + talentSkill + productionBonus + cleanWrapBonus + scriptAbilityBonus;

  if (prod.isDisaster) {
    // 3 Incidents = lose ALL quality (insurance saves 25%)
    const insuranceKeep = s.perks.some(p => p.effect === 'insurance') ? 0.25 : 0;
    rawQuality = Math.floor(rawQuality * insuranceKeep);
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

  if (script.ability === 'blockbusterBonus') {
    multiplier += 0.3;
  }

  const totalHeat = state.castSlots.reduce((sum, s) => sum + (s.talent?.heat || 0), 0);
  if (state.perks.some(p => p.effect === 'indieSpirit') && totalHeat <= 4) multiplier += 0.5;
  if (state.perks.some(p => p.effect === 'buzz') && rawQuality > 35) multiplier += 0.5;

  const currentRep = state.reputation;
  const repBonus = [0, 0.5, 0.75, 1.0, 1.25, 1.5][currentRep] || 1.0;

  const boxOffice = Math.round(rawQuality * multiplier * repBonus * 10) / 10;
  const target = getSeasonTarget(state.season);
  const tier = getTier(boxOffice, target);

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
