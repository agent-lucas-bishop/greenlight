import { GameState, GamePhase, Talent, Script, CastSlot, ProductionState, StudioPerk, MarketCondition } from './types';
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

// --- HELPERS ---

/** Calculate effective skill for a talent in context */
function effectiveSkill(talent: Talent, slotType: string, script: Script, castSlots: CastSlot[], lastFlop: boolean, drawCount?: number): number {
  let skill = talent.skill;
  
  // Trait: Diva — must be Lead or -2
  if (talent.trait === 'Diva' && slotType !== 'Lead') {
    skill -= 2;
  }
  // Trait: Comeback Kid — +3 if last film flopped
  if (talent.trait === 'Comeback Kid' && lastFlop) {
    skill += 3;
  }
  // Trait: Perfectionist — +3 if 5+ draws (only in release calc)
  if (talent.trait === 'Perfectionist' && drawCount !== undefined && drawCount >= 5) {
    skill += 3;
  }
  // Trait: Mentor — adjacent talent gets +1 (handled separately)
  
  return Math.max(0, skill);
}

/** Compute script ability bonus at release */
function scriptAbilityBonus(script: Script, castSlots: CastSlot[]): number {
  let bonus = 0;
  if (!script.ability) return 0;
  
  switch (script.ability) {
    case 'directorDouble': {
      // Director skill counts double — add their skill again
      const directors = castSlots.filter(s => s.talent?.type === 'Director');
      for (const d of directors) {
        if (d.talent) bonus += d.talent.skill;
      }
      break;
    }
    case 'crewBonus': {
      const crewSkill = castSlots.reduce((s, c) => s + (c.talent?.type === 'Crew' ? c.talent.skill : 0), 0);
      if (crewSkill >= 6) bonus += 3;
      break;
    }
    case 'starChemistry': {
      const starCount = castSlots.filter(s => s.talent?.type === 'Star').length;
      if (starCount >= 2) bonus += 4;
      break;
    }
    case 'coolCast': {
      const coolStars = castSlots.filter(s => s.talent?.type === 'Star' && (s.talent?.heat || 0) <= 1);
      bonus += coolStars.length * 2;
      break;
    }
    case 'directorSkill': {
      const dir = castSlots.find(s => s.talent?.type === 'Director');
      if (dir?.talent && dir.talent.skill >= 4) bonus += 3;
      break;
    }
    case 'uniqueTypes': {
      const types = new Set(castSlots.map(s => s.talent?.type).filter(Boolean));
      bonus += types.size;
      break;
    }
  }
  return bonus;
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
  // Can't fire talent that's currently assigned
  const assigned = new Set(state.castSlots.map(s => s.talent?.id).filter(Boolean));
  if (assigned.has(talentId)) return;
  setState({
    roster: state.roster.filter(t => t.id !== talentId),
  });
}

export function startProduction() {
  const totalHeat = state.castSlots.reduce((sum, s) => sum + (s.talent?.heat || 0), 0);
  const methodStudio = state.perks.some(p => p.effect === 'methodStudio');
  const deck = buildProductionDeck(totalHeat);
  
  // Method Studio: add extra good cards per 2 heat
  if (methodStudio && totalHeat > 0) {
    const extraGood = Math.floor(totalHeat / 2);
    // We need to import good cards... just add quality cards inline
    for (let i = 0; i < extraGood; i++) {
      const goodCards = deck.filter(c => c.type === 'good');
      if (goodCards.length > 0) {
        // Clone a random existing good card
        const template = goodCards[Math.floor(Math.random() * goodCards.length)];
        deck.push({ ...template, id: `ms_${i}_${Date.now()}` });
      }
    }
    // Re-shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }
  
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
  const card = { ...deck.shift()! };
  
  // Script ability: scandal cards
  const script = state.currentScript;
  if (card.isScandal && script?.ability === 'scandalHeal') {
    card.type = 'good';
    card.qualityMod = 2;
    card.effect = '✨ Scandal turned into gold! +2 quality';
  } else if (card.isScandal && script?.ability === 'scandalQuality') {
    card.type = 'good';
    card.qualityMod = 1;
    card.effect = '✨ Scandal adds mystique! +1 quality';
  }
  
  // Trait: Lucky — first bad card is ignored
  const hasLucky = state.castSlots.some(s => s.talent?.trait === 'Lucky');
  let isBad = card.type === 'bad';
  if (isBad && hasLucky && prod.badCount === 0) {
    // Lucky saves! Card still shows as bad visually but doesn't count
    card.effect += ' (Lucky saves!)';
    isBad = false; // don't count toward disaster
  }
  
  const drawn = [...prod.drawn, card];
  let badCount = prod.badCount + (isBad ? 1 : 0);
  let qualityBonus = prod.qualityBonus + card.qualityMod;
  let budgetChange = prod.budgetChange + (card.budgetMod || 0);
  
  // Crisis Manager halves bad effects
  if (card.type === 'bad' && state.perks.some(p => p.effect === 'crisisManager')) {
    qualityBonus -= card.qualityMod; // undo
    qualityBonus += Math.ceil(card.qualityMod / 2); // halved (ceil keeps negative closer to 0)
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

export function calculateQuality(s: GameState): { rawQuality: number; talentSkill: number; genreBonus: number; scriptAbility: number; productionBonus: number } {
  const script = s.currentScript!;
  const prod = s.production!;
  const lastFlop = s.seasonHistory.length > 0 && !s.seasonHistory[s.seasonHistory.length - 1].hitTarget;
  
  let talentSkill = 0;
  // Calculate effective skills with traits
  for (let i = 0; i < s.castSlots.length; i++) {
    const slot = s.castSlots[i];
    if (!slot.talent) continue;
    let skill = effectiveSkill(slot.talent, slot.slotType, script, s.castSlots, lastFlop, prod.drawCount);
    
    // Mentor: check if adjacent talent has Mentor
    if (i > 0 && s.castSlots[i - 1].talent?.trait === 'Mentor') skill += 1;
    if (i < s.castSlots.length - 1 && s.castSlots[i + 1].talent?.trait === 'Mentor') skill += 1;
    
    // Method Actor: +2 quality (we add to skill for simplicity)
    if (slot.talent.trait === 'Method Actor') skill += 2;
    
    talentSkill += skill;
  }
  
  let genreBonus = s.castSlots.reduce((sum, slot) => {
    if (!slot.talent?.genreBonus) return sum;
    // Chameleon: always matches
    if (slot.talent.trait === 'Chameleon' || slot.talent.genreBonus.genre === script.genre) {
      return sum + slot.talent.genreBonus.bonus;
    }
    return sum;
  }, 0);
  
  const scriptAbility = scriptAbilityBonus(script, s.castSlots);
  const productionBonus = prod.qualityBonus;
  
  let rawQuality = script.baseScore + talentSkill + productionBonus + genreBonus + scriptAbility;
  if (prod.isDisaster) {
    const insuranceReduction = s.perks.some(p => p.effect === 'insurance') ? 0.75 : 0.5;
    rawQuality = Math.floor(rawQuality * insuranceReduction);
  }
  
  return { rawQuality, talentSkill, genreBonus, scriptAbility, productionBonus };
}

export function resolveRelease() {
  if (!state.production || !state.currentScript) return;
  const script = state.currentScript;
  const prod = state.production;
  
  const { rawQuality } = calculateQuality(state);
  
  // Pick market (random or chosen)
  const chooseMarket = state.perks.some(p => p.effect === 'chooseMarket');
  let market = state.activeMarket;
  if (!market) {
    if (chooseMarket) {
      // Find best matching
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
  
  // Perk multiplier bonuses
  const totalHeat = state.castSlots.reduce((sum, s) => sum + (s.talent?.heat || 0), 0);
  if (state.perks.some(p => p.effect === 'indieSpirit') && totalHeat <= 4) multiplier += 0.5;
  if (state.perks.some(p => p.effect === 'buzz') && rawQuality > 35) multiplier += 0.5;
  
  // Reputation bonus — use CURRENT rep (before update)
  const currentRep = state.reputation;
  const repBonus = [0, 0.5, 0.75, 1.0, 1.25, 1.5][currentRep] || 1.0;
  
  // Box Office Draw trait
  let flatBonus = 0;
  for (const slot of state.castSlots) {
    if (slot.talent?.trait === 'Box Office Draw') flatBonus += 5;
  }
  
  const boxOffice = Math.round((rawQuality * multiplier * repBonus + flatBonus) * 10) / 10;
  const target = getSeasonTarget(state.season);
  const hit = boxOffice >= target;
  const newRep = hit ? Math.min(currentRep + 1, 5) : Math.max(currentRep - 1, 0);
  const nominated = rawQuality > 25 + state.season * 5;
  
  // Prestige label bonus for nominations
  let presBonus = 0;
  if (nominated && state.perks.some(p => p.effect === 'prestige')) {
    presBonus = rawQuality * 0.3;
  }
  
  const finalBoxOffice = Math.round((boxOffice + presBonus) * 10) / 10;
  
  const result = {
    season: state.season,
    title: script.title,
    genre: script.genre,
    quality: rawQuality,
    boxOffice: finalBoxOffice,
    hitTarget: finalBoxOffice >= target,
    nominated,
  };
  
  // Apply post-film trait effects
  let newRoster = [...state.roster];
  if (result.hitTarget) {
    // Rising Star: +1 skill on success
    newRoster = newRoster.map(t => {
      if (t.trait === 'Rising Star' && state.castSlots.some(s => s.talent?.id === t.id)) {
        return { ...t, skill: Math.min(t.skill + 1, 6) };
      }
      return t;
    });
  }
  // Method Actor: +1 Heat after each film
  newRoster = newRoster.map(t => {
    if (t.trait === 'Method Actor' && state.castSlots.some(s => s.talent?.id === t.id)) {
      return { ...t, heat: t.heat + 1 };
    }
    return t;
  });
  // Past Their Prime: -1 skill per season (applied at season end)
  newRoster = newRoster.map(t => {
    if (t.trait === 'Past Their Prime') {
      return { ...t, skill: Math.max(t.skill - 1, 1) };
    }
    return t;
  });
  
  setState({
    phase: 'release',
    lastBoxOffice: finalBoxOffice,
    lastQuality: rawQuality,
    activeMarket: market,
    budget: state.budget + finalBoxOffice + prod.budgetChange,
    totalEarnings: state.totalEarnings + finalBoxOffice,
    reputation: newRep,
    strikes: result.hitTarget ? state.strikes : state.strikes + 1,
    seasonHistory: [...state.seasonHistory, result],
    roster: newRoster,
  });
}

function getMarketMultiplier(market: MarketCondition, genre: string, quality: number): number {
  // Check conditions
  if (market.condition === 'quality>30' && quality <= 30) return 1.0;
  // Genre match
  if (market.genreBonus && market.genreBonus !== genre) return 1.0;
  return market.multiplier;
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
