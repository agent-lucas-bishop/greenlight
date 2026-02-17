import { GameState, GamePhase, GameMode, Talent, Script, CastSlot, ProductionState, ProductionCard, StudioPerk, MarketCondition, SynergyContext, SynergyResult, RewardTier, CardTemplate, ArchetypeFocus, Genre } from './types';
import type { StudioArchetypeId } from './types';
import {
  starterRoster, generateScripts, generateTalentMarket,
  generateMarketConditions, generatePerkMarket, getSeasonTarget, neowTalent,
  INDUSTRY_EVENTS, getActiveChemistry, STUDIO_ARCHETYPES, generateSeasonEvents,
  ALL_LEADS, ALL_SUPPORTS, ALL_DIRECTORS, ALL_CREW, ALL_SCRIPTS,
} from './data';
import type { SeasonEventChoice } from './types';
import { getActiveLegacyPerks, getUnlocks, saveUnlocks } from './unlocks';
import { rng, activateSeed, deactivateSeed, getDailySeed, getDailyDateString } from './seededRng';
import { getChallengeById } from './challenges';
import { generateRivalSeason, getSeasonIdentity, RIVAL_EVENTS } from './rivals';
import { generateStudioName, generateFilmTitle } from './narrative';
import { isSimplifiedRun } from './onboarding';
import { trackRunStart, trackTalentPick, trackGenrePick } from './analytics';
import { saveGameState, clearSave } from './saveGame';
import { getGenreMasteryBonus } from './genreMastery';
import { getTodayModifier, getWeeklyModifiers } from './dailyModifiers';

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
    studioArchetype: null,
    studioName: '',
    studioTagline: '',
    lastFilmTitle: '',
    genreMastery: {},
    rivalHistory: [],
    cumulativeRivalEarnings: {},
    gameMode: 'normal' as GameMode,
    maxSeasons: 5,
    maxStrikes: 3,
    hotGenres: [],
    coldGenres: [],
    debt: 0,
    seasonEventChoices: null,
    activeSeasonEvent: null,
    streamingDealActive: false,
  };
}

type Listener = () => void;
let state: GameState = createInitialState();
const listeners: Set<Listener> = new Set();

export function getState(): GameState { return state; }

function setState(partial: Partial<GameState>) {
  state = { ...state, ...partial };
  listeners.forEach(l => l());
  // Auto-save on every state change (phase transitions and mid-phase)
  if (state.phase !== 'start') {
    saveGameState(state);
  }
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
    tags: template.tags,
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
      const card = templateToCard(template, t.name, sourceType);
      // Daily modifier: Union Strike — crew cards get +2 base quality
      if ((state.dailyModifierId === 'union_strike' || state.dailyModifierId2 === 'union_strike') && t.type === 'Crew' && card.cardType === 'action') {
        card.baseQuality += 2;
      }
      deck.push(card);
    }

    if (t.heat >= 4 && t.heatCards) {
      for (const template of t.heatCards) {
        deck.push(templateToCard(template, t.name, sourceType));
      }
    }

    // Baggage: method_dangerous adds extra incident card to deck
    if (t.baggage?.incidentChance && rng() < t.baggage.incidentChance) {
      deck.push({
        id: cardUid(),
        name: `${t.name}'s Baggage`,
        source: t.name,
        sourceType,
        cardType: 'incident',
        baseQuality: -4,
        synergyText: `${t.baggage.label} — ${t.baggage.description}`,
        synergyCondition: null,
        riskTag: '🔴',
      });
    }
  }

  // Insurance Fraud event: add 2 extra incidents
  if (state.activeSeasonEvent?.effect === 'insuranceFraud') {
    for (let k = 0; k < 2; k++) {
      deck.push({
        id: cardUid(),
        name: 'Insurance Investigator',
        source: 'Season Event',
        sourceType: 'crew',
        cardType: 'incident',
        baseQuality: -4,
        synergyText: 'Investigators are snooping around the set.',
        synergyCondition: null,
        riskTag: '🔴',
      });
    }
  }

  // Shuffle (Fisher-Yates)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function buildSynergyContext(played: ProductionCard[], totalQuality: number, drawNumber: number, castSlots: CastSlot[], remainingDeck: ProductionCard[], discardedCount?: number): SynergyContext {
  const leadSlot = castSlots.find(s => s.slotType === 'Lead' && s.talent);
  const leadSkill = leadSlot?.talent?.skill || 0;
  const incidentCount = played.filter(c => c.cardType === 'incident').length;
  const previousCard = played.length > 0 ? played[played.length - 1] : null;

  let greenStreak = 0;
  for (let i = played.length - 1; i >= 0; i--) {
    if (played[i].cardType === 'action') greenStreak++;
    else break;
  }

  // Count tags from all played cards
  const tagsPlayed: Record<string, number> = {};
  for (const c of played) {
    if (c.tags) {
      for (const tag of c.tags) {
        tagsPlayed[tag] = (tagsPlayed[tag] || 0) + 1;
      }
    }
  }

  // Count consecutive same-source cards from end
  let consecutiveSources = 0;
  if (played.length > 0) {
    const lastSource = played[played.length - 1].sourceType;
    for (let i = played.length - 1; i >= 0; i--) {
      if (played[i].sourceType === lastSource) consecutiveSources++;
      else break;
    }
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
    tagsPlayed,
    discardedCount: discardedCount || 0,
    consecutiveSources,
  };
}

function evaluateSynergy(card: ProductionCard, played: ProductionCard[], totalQuality: number, drawNumber: number, castSlots: CastSlot[], remainingDeck: ProductionCard[], discardedCount?: number): SynergyResult {
  if (!card.synergyCondition) return { bonus: 0 };
  const ctx = buildSynergyContext(played, totalQuality, drawNumber, castSlots, remainingDeck, discardedCount);
  return card.synergyCondition(ctx);
}

function resolveCardPlay(card: ProductionCard, prod: ProductionState, castSlots: CastSlot[]): ProductionState {
  const p = { ...prod };
  const drawNumber = p.drawCount; // already incremented
  const played = [...p.played];
  const deck = [...p.deck];

  const synResult = evaluateSynergy(card, played, p.qualityTotal, drawNumber, castSlots, deck, p.discarded.length);
  
  let cardBase = card.baseQuality;
  
  // Slow Burn script ability: cards after draw 4 get +1 base
  if (state.currentScript?.ability === 'slowBurn' && drawNumber > 4) {
    cardBase += 1;
  }
  
  let totalCardValue = cardBase + synResult.bonus;

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

  // Track tags
  const tagsPlayed = { ...p.tagsPlayed };
  if (card.tags) {
    for (const tag of card.tags) {
      tagsPlayed[tag] = (tagsPlayed[tag] || 0) + 1;
    }
  }

  if (card.special === 'buffActors') actorBuff += 1;
  if (card.special === 'poisonNext') poisonNext = -2;
  if (card.special === 'poisonActors') actorBuff -= 1;
  if (card.special === 'forceExtraDraw') forceExtraDraw = true;
  if (card.special === 'removeRed') {
    const redIdx = deck.findIndex(c => c.cardType === 'incident');
    if (redIdx >= 0) deck.splice(redIdx, 1);
  }
  if (card.special === 'buffNext') poisonNext = 2;

  // 3 Incidents = DISASTER — lose ALL quality (4 for Wildcard Entertainment)
  const disasterThreshold = state.studioArchetype === 'chaos' ? 4 : 3;
  const isDisaster = incidentCount >= disasterThreshold;

  // Challenge: Chaos Reigns — incidents give +1 quality
  if (card.cardType === 'incident' && state.challengeId === 'chaos_reigns') {
    totalCardValue += 1;
    newQuality += 1;
  }

  // Survival Mode script: removed incident budget recovery (incidents should always hurt)

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
  
  // Script ability: Thriller Twist — if you have exactly 2 incidents, +8 quality (living on the edge)
  // Only applies to scripts with the 'slowBurn' ability (Shadow Protocol)
  if (state.currentScript?.ability === 'slowBurn' && incidentCount === 2) {
    scriptAbilityBonus = Math.max(scriptAbilityBonus, 8);
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
    directorsCutUsed: p.directorsCutUsed,
    directorsCutActive: false,
    directorsCutCards: [],
    currentDraw: null,
    pendingChallenge: null,
    challengeBetActive: false,
    pendingBlock: null,
    tagsPlayed,
    encoreState: p.encoreState,
  };
}

// ─── ACTIONS ───

// Rebuild synergy/challenge functions on cards after loading from JSON save
function rebuildCardFunctions(cards: ProductionCard[]): void {
  // Build name → template lookup from ALL talent and scripts
  const templateMap = new Map<string, CardTemplate>();
  const allTalent = [...ALL_LEADS, ...ALL_SUPPORTS, ...ALL_DIRECTORS, ...ALL_CREW];
  for (const t of allTalent) {
    for (const c of t.cards) templateMap.set(c.name, c);
    if (t.heatCards) for (const c of t.heatCards) templateMap.set(c.name, c);
  }
  for (const s of ALL_SCRIPTS) {
    for (const c of s.cards) templateMap.set(c.name, c);
  }

  for (const card of cards) {
    const template = templateMap.get(card.name);
    if (template) {
      card.synergyCondition = template.synergyCondition;
      if (template.challengeBet) {
        card.challengeBet = template.challengeBet;
      }
    }
  }
}

export function resumeGame(saved: Partial<GameState>) {
  clearSave();
  state = { ...createInitialState(), ...saved };

  // Rebuild synergy/challenge functions stripped during JSON serialization
  if (state.production) {
    rebuildCardFunctions(state.production.deck);
    rebuildCardFunctions(state.production.played);
    rebuildCardFunctions(state.production.discarded);
    if (state.production.directorsCutCards) rebuildCardFunctions(state.production.directorsCutCards);
    if (state.production.currentDraw?.choosable) rebuildCardFunctions(state.production.currentDraw.choosable);
    if (state.production.pendingChallenge?.card) rebuildCardFunctions([state.production.pendingChallenge.card]);
    if (state.production.pendingBlock) {
      rebuildCardFunctions([state.production.pendingBlock.incident, state.production.pendingBlock.actionCard]);
    }
  }
  // Also rebuild talent card functions on roster and cast
  const allTalentPools = [...ALL_LEADS, ...ALL_SUPPORTS, ...ALL_DIRECTORS, ...ALL_CREW];
  const talentTemplateMap = new Map<string, typeof allTalentPools[0]>();
  for (const t of allTalentPools) talentTemplateMap.set(t.name, t);
  for (const t of [...state.roster, ...state.castSlots.map(s => s.talent).filter(Boolean) as Talent[]]) {
    const template = talentTemplateMap.get(t.name);
    if (template) {
      t.cards = template.cards;
      if (template.heatCards) t.heatCards = template.heatCards;
    }
  }
  // Rebuild script card functions
  if (state.currentScript) {
    const scriptTemplate = ALL_SCRIPTS.find(s => s.title === state.currentScript!.title);
    if (scriptTemplate) state.currentScript.cards = scriptTemplate.cards;
  }

  // Migrate old emoji-prefixed rival earnings keys to plain names
  if (state.cumulativeRivalEarnings) {
    const migrated: Record<string, number> = {};
    for (const [key, val] of Object.entries(state.cumulativeRivalEarnings)) {
      // Strip leading emoji + space (e.g. "⚡ Titan Pictures" -> "Titan Pictures")
      const plainName = key.replace(/^[^\w\s]*\s+/, '').trim() || key;
      migrated[plainName] = (migrated[plainName] || 0) + val;
    }
    state.cumulativeRivalEarnings = migrated;
  }
  listeners.forEach(l => l());
  // Re-save immediately to persist
  if (state.phase !== 'start') saveGameState(state);
}

export function startGame(mode: GameMode = 'normal', challengeId?: string) {
  clearSave();
  // Activate seeded RNG for daily runs
  if (mode === 'daily') {
    activateSeed(getDailySeed());
  } else {
    deactivateSeed();
  }

  const challenge = challengeId ? getChallengeById(challengeId) : undefined;
  let maxSeasons = 5;
  let maxStrikes = 3;

  if (challenge?.id === 'speed_run') {
    maxSeasons = 3;
    maxStrikes = 2;
  }
  if (challenge?.id === 'marathon') {
    maxSeasons = 8;
    maxStrikes = 4;
  }

  setState({
    ...createInitialState(),
    phase: 'start',
    gameMode: mode,
    challengeId,
    dailySeed: mode === 'daily' ? getDailyDateString() : undefined,
    dailyModifierId: mode === 'daily' ? getTodayModifier().id : undefined,
    dailyModifierId2: mode === 'daily' ? getWeeklyModifiers()[0].id : undefined,
    maxSeasons,
    maxStrikes,
  });
}

export function pickArchetype(archetypeId: StudioArchetypeId) {
  let budget = 15;
  if (archetypeId === 'blockbuster') budget += 5;
  // NG+ bonuses: start with more budget to offset harder targets
  if (state.gameMode === 'newGamePlus') budget += 5;
  if (state.gameMode === 'directorMode') budget += 10;
  const legacyPerks = getActiveLegacyPerks();
  // Legacy perk: Indie Darling — start with +$2M
  if (legacyPerks.some(p => p.effect === 'startBudget2')) budget += 2;
  // Legacy perk: Mogul — start with +$3M
  if (legacyPerks.some(p => p.effect === 'startBudget3')) budget += 3;
  // Legacy perk: Daily Devotee — daily runs get +$3M
  if (state.gameMode === 'daily' && legacyPerks.some(p => p.effect === 'dailyBudget3')) budget += 3;
  // Challenge: Shoestring Budget
  if (state.challengeId === 'shoestring') budget = 8;
  // Challenge: Budget Hell — start with $5M
  if (state.challengeId === 'budget_hell') budget = 5;
  const studio = generateStudioName();
  trackRunStart(state.gameMode, state.challengeId, archetypeId);
  setState({ studioArchetype: archetypeId, budget, studioName: studio.name, studioTagline: studio.tagline, phase: 'neow' as GamePhase });
}

export function pickNeow(choice: number) {
  let roster = starterRoster();
  // Moonlight Films (indie) starts with an extra Support
  if (state.studioArchetype === 'indie') {
    const extraSupport = generateTalentMarket(1, 1, roster).find(t => t.type === 'Support') || generateTalentMarket(4, 1, roster).find(t => t.type === 'Support');
    if (extraSupport) roster.push({ ...extraSupport, cost: 0 });
  }
  let budget = state.budget; // already set by archetype
  let perks: StudioPerk[] = [];
  if (choice === 0) {
    roster.push(neowTalent());
  } else if (choice === 1) {
    budget += 10;
  } else {
    perks.push({ id: 'neow_perk', name: 'Crisis Manager', cost: 0, description: 'Incident card quality penalties halved', effect: 'crisisManager' });
  }
  // Legacy perk: Perfectionist — start with Crisis Manager
  const legacyPerks = getActiveLegacyPerks();
  if (legacyPerks.some(p => p.effect === 'startCrisisManager') && !perks.some(p => p.effect === 'crisisManager')) {
    perks.push({ id: 'legacy_crisis', name: 'Crisis Manager (Legacy)', cost: 0, description: 'Incident card quality penalties halved (Legacy Perk)', effect: 'crisisManager' });
  }
  // Legacy perk: Genre Savant — start with +1 mastery in all genres
  let genreMastery: Record<string, number> = {};
  if (legacyPerks.some(p => p.effect === 'genreMasteryHead')) {
    for (const g of ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller']) {
      genreMastery[g] = 1;
    }
  }
  setState({ neowChoice: choice, roster, budget, perks, genreMastery, phase: 'greenlight' as GamePhase });
  beginSeason();
}

// Generate genre market trends for the season
function generateGenreTrends(): { hot: Genre[]; cold: Genre[] } {
  const genres: Genre[] = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];
  // Shuffle and pick 1-2 hot, 1-2 cold (never overlapping)
  const shuffled = [...genres].sort(() => rng() - 0.5);
  const hotCount = rng() < 0.4 ? 2 : 1;
  const coldCount = rng() < 0.4 ? 2 : 1;
  const hot = shuffled.slice(0, hotCount);
  const cold = shuffled.slice(hotCount, hotCount + coldCount);
  return { hot, cold };
}

function beginSeason() {
  // Apply season identity budget bonus (seasons 3+ give extra budget)
  const identity = getSeasonIdentity(state.season);
  if (identity.budgetBonus > 0 && state.season > 1) {
    setState({ budget: state.budget + identity.budgetBonus });
  }
  const devSlate = state.perks.some(p => p.effect === 'devSlate');
  let scripts = generateScripts(devSlate ? 4 : 3, state.season);
  // Typecast challenge: only show scripts matching locked genre
  if (state.challengeId === 'typecast' && state.lockedGenre) {
    const locked = state.lockedGenre;
    // Regenerate until we have enough matching scripts
    for (let attempt = 0; attempt < 10; attempt++) {
      const filtered = scripts.filter(s => s.genre === locked);
      if (filtered.length >= 2) { scripts = filtered.slice(0, devSlate ? 4 : 3); break; }
      scripts = generateScripts(devSlate ? 8 : 6, state.season);
    }
  }
  
  // Apply baseBoost industry event from previous season
  if (state.industryEvent?.effect === 'baseBoost') {
    scripts = scripts.map(s => ({ ...s, baseScore: s.baseScore + 2 }));
  }
  
  // Season event: Creative Retreat — next film gets +3 base quality
  if (state.activeSeasonEvent?.effect === 'creativeRetreat') {
    scripts = scripts.map(s => ({ ...s, baseScore: s.baseScore + 3 }));
  }
  // R80: Tax Incentive — scripts cost -30%, but locked to a random genre
  if (state.activeSeasonEvent?.effect === 'taxIncentive') {
    const allGenres: Genre[] = ['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller'];
    const lockedGenre = allGenres[Math.floor(rng() * allGenres.length)];
    scripts = scripts.map(s => ({ ...s, genre: lockedGenre as Genre, cost: Math.round(s.cost * 0.7) }));
  }
  
  // Pass script genres so market generation guarantees at least one matching market
  const scriptGenres = scripts.map(s => s.genre);
  const markets = generateMarketConditions(3, scriptGenres);
  
  // Generate genre trends for this season (hidden on first-ever run to reduce cognitive load)
  const simplified = isSimplifiedRun();
  const trends = simplified ? { hot: [] as Genre[], cold: [] as Genre[] } : generateGenreTrends();
  
  setState({ scriptChoices: scripts, marketConditions: markets, hotGenres: trends.hot, coldGenres: trends.cold });
}

export function pickScript(script: Script) {
  const slots: CastSlot[] = script.slots.map(s => ({ slotType: s, talent: null }));
  const moreTalent = state.perks.some(p => p.effect === 'moreTalent');
  const seasonIdentity = getSeasonIdentity(state.season);
  const baseTalentCount = seasonIdentity.talentPoolSize;
  let market = generateTalentMarket(moreTalent ? baseTalentCount + 2 : baseTalentCount, state.season, state.roster);
  // Challenge: Chaos Reigns — all talent +2 Heat, incidents give +1 quality
  if (state.challengeId === 'chaos_reigns') {
    market = market.map(t => ({ ...t, heat: t.heat + 2 }));
  }
  // Season event: Talent Showcase — all talent costs $3 less
  if (state.activeSeasonEvent?.effect === 'talentShowcase') {
    market = market.map(t => ({ ...t, cost: Math.max(1, t.cost - 3) }));
  }
  // Season event: Bidding War — talent costs +$3, but talent skill +1
  if (state.activeSeasonEvent?.effect === 'biddingWar') {
    market = market.map(t => ({ ...t, cost: t.cost + 3, skill: t.skill + 1 }));
  }
  // R80: Actor's Strike — lead hiring costs double, but leads get +2 skill
  if (state.activeSeasonEvent?.effect === 'actorsStrike') {
    market = market.map(t => t.type === 'Lead' ? { ...t, cost: t.cost * 2, skill: t.skill + 2 } : t);
  }
  // Season event: Union Dispute — crew costs +$2, but crew cards get +1 base quality
  if (state.activeSeasonEvent?.effect === 'unionDispute') {
    market = market.map(t => t.type === 'Crew' ? {
      ...t,
      cost: t.cost + 2,
      cards: t.cards.map(c => c.cardType === 'action' ? { ...c, baseQuality: c.baseQuality + 1 } : c),
    } : t);
  }
  // Daily modifier: Summer Blockbuster — Action/Sci-Fi -20% cost, others +$2
  let scriptCost = script.cost;
  if (state.dailyModifierId === 'summer_blockbuster' || state.dailyModifierId2 === 'summer_blockbuster') {
    if (script.genre === 'Action' || script.genre === 'Sci-Fi') {
      scriptCost = Math.round(scriptCost * 0.8);
    } else {
      scriptCost += 2;
    }
  }
  // Allow overspending — excess goes to debt (disabled on first-ever run)
  let newBudget = state.budget - scriptCost;
  let newDebt = state.debt;
  if (newBudget < 0 && !isSimplifiedRun()) {
    newDebt += Math.abs(newBudget);
    newBudget = 0;
  }
  trackGenrePick(script.genre);
  setState({
    currentScript: script,
    budget: newBudget,
    debt: newDebt,
    castSlots: slots,
    talentMarket: market,
    phase: 'casting',
    // Typecast: lock genre on first script pick
    lockedGenre: state.lockedGenre || (state.challengeId === 'typecast' ? script.genre : undefined),
  });
}

export function assignTalent(slotIndex: number, talent: Talent) {
  const slots = [...state.castSlots];
  // Enforce schedule_conflict baggage: block Wild slots when talent with slotBlocked is in cast
  if (talent.baggage?.slotBlocked && slots[slotIndex].slotType === talent.baggage.slotBlocked) return;
  slots.forEach((s, i) => { if (s.talent?.id === talent.id) slots[i] = { ...s, talent: null }; });
  slots[slotIndex] = { ...slots[slotIndex], talent };
  trackTalentPick(talent.name);
  setState({ castSlots: slots });
}

// Check if a slot is blocked by any cast talent's baggage
export function isSlotBlocked(slotType: string, castSlots: { talent: Talent | null }[]): boolean {
  return castSlots.some(s => s.talent?.baggage?.slotBlocked === slotType);
}

export function unassignTalent(slotIndex: number) {
  const slots = [...state.castSlots];
  slots[slotIndex] = { ...slots[slotIndex], talent: null };
  setState({ castSlots: slots });
}

export function hireTalent(talent: Talent) {
  // Legacy perk: Talent Whisperer — all hiring costs $1 less (min $1)
  const legacyPerks = getActiveLegacyPerks();
  const discount = legacyPerks.some(p => p.effect === 'cheaperTalent') ? 1 : 0;
  let actualCost = Math.max(1, talent.cost - discount);
  // Daily modifier: Union Strike — crew costs +$2
  if ((state.dailyModifierId === 'union_strike' || state.dailyModifierId2 === 'union_strike') && talent.type === 'Crew') {
    actualCost += 2;
  }
  // Challenge: Budget Hell — all hiring costs +$2
  if (state.challengeId === 'budget_hell') actualCost += 2;
  // Challenge: Auteur Mode — only 1 director allowed on roster
  if (state.challengeId === 'auteur' && talent.type === 'Director') {
    const existingDirectors = state.roster.filter(t => t.type === 'Director');
    if (existingDirectors.length >= 1) return; // blocked
  }
  if (state.roster.length >= (state.rosterCap ?? 8)) return;
  // Allow overspending — excess goes to debt (disabled on first-ever run)
  let newBudget = state.budget - actualCost;
  let newDebt = state.debt;
  if (newBudget < 0 && !isSimplifiedRun()) {
    newDebt += Math.abs(newBudget);
    newBudget = 0;
  }
  setState({
    roster: [...state.roster, talent],
    budget: newBudget,
    debt: newDebt,
    talentMarket: state.talentMarket.filter(t => t.id !== talent.id),
  });
  // Track unique talent hired for achievements
  try {
    const u = getUnlocks();
    if (!u.careerStats.uniqueTalentHired) u.careerStats.uniqueTalentHired = [];
    if (!u.careerStats.uniqueTalentHired.includes(talent.name)) {
      u.careerStats.uniqueTalentHired.push(talent.name);
      saveUnlocks(u);
    }
  } catch {}
}

export function fireTalent(talentId: string) {
  const assigned = new Set(state.castSlots.map(s => s.talent?.id).filter(Boolean));
  if (assigned.has(talentId)) return;
  const talent = state.roster.find(t => t.id === talentId);
  // Challenge: Auteur Mode — firing a director costs $10M and 1 reputation
  if (state.challengeId === 'auteur' && talent?.type === 'Director') {
    setState({
      roster: state.roster.filter(t => t.id !== talentId),
      budget: state.budget - 10,
      reputation: Math.max(0, state.reputation - 1),
    });
    return;
  }
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
      directorsCutUsed: false,
      directorsCutActive: false,
      directorsCutCards: [],
      currentDraw: null,
      pendingChallenge: null,
      challengeBetActive: false,
      pendingBlock: null,
      tagsPlayed: {},
      encoreState: null,
    },
  });
}

// Draw-2-Keep-1: reveals 2 cards, auto-resolves incidents/challenges, lets player pick from remaining action cards
export function drawProductionCards() {
  if (!state.production || state.production.isWrapped) return;
  const prod = { ...state.production };
  const maxDraws = getMaxDraws(prod);
  if (prod.drawCount >= maxDraws) return;
  if (prod.currentDraw || prod.pendingChallenge || prod.pendingBlock) return; // already in a draw

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

  // BLOCK MECHANIC: If exactly 1 incident + 1 action card drawn together,
  // player can sacrifice the action card to block (discard) the incident.
  // Present this as a choice via pendingBlock state.
  const incidents = resolved.filter(c => c.cardType === 'incident');
  if (incidents.length === 1 && choosable.length === 1) {
    let updatedProd: ProductionState = { ...prod, deck };
    updatedProd.pendingBlock = {
      incident: incidents[0],
      actionCard: choosable[0],
    };
    // Also auto-resolve any challenge cards
    const challenges = resolved.filter(c => c.cardType === 'challenge');
    for (const ch of challenges) {
      updatedProd = resolveCardPlay({ ...ch }, updatedProd, state.castSlots);
      if (ch.challengeBet) {
        const ctx = buildSynergyContext(updatedProd.played, updatedProd.qualityTotal, updatedProd.drawCount, state.castSlots, updatedProd.deck);
        updatedProd.pendingChallenge = { card: ch, bet: ch.challengeBet };
        updatedProd.challengeBetActive = true;
      }
    }
    setState({ production: updatedProd });
    return;
  }

  // Auto-resolve incidents immediately
  let updatedProd: ProductionState = { ...prod, deck };
  for (const inc of incidents) {
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
  const deck = [...prod.deck];
  
  if (accept && challenge.bet && deck.length > 0) {
    // Draw next card from deck — this IS the bet
    const sacrificedCard = deck.shift()!;
    const discarded = [...prod.discarded, sacrificedCard];
    
    // Build context with the sacrificed card at position [0] of remaining deck
    // (condition checks remainingDeck[0] which was the card before we shifted)
    const ctxDeck = [sacrificedCard, ...deck];
    const ctx = buildSynergyContext(prod.played, prod.qualityTotal, prod.drawCount, state.castSlots, ctxDeck);
    const success = challenge.bet.condition(ctx);
    
    // Special handling for betSacrificeForDouble
    const isSacrificeDouble = challenge.bet.description.includes('Sacrifice next card');
    let bonus: number;
    
    if (isSacrificeDouble) {
      if (success) {
        // Double the quality of the most recent played card
        const lastPlayed = prod.played.length > 0 ? prod.played[prod.played.length - 1] : null;
        bonus = lastPlayed?.totalValue ? lastPlayed.totalValue : 0;
      } else {
        // Next card was an Incident — take its penalty
        bonus = sacrificedCard.baseQuality; // negative for incidents
      }
    } else {
      bonus = success ? challenge.bet.successBonus : challenge.bet.failPenalty;
    }
    
    prod.qualityTotal += bonus;
    prod.deck = deck;
    prod.discarded = discarded;
    
    // Handle incident from sacrifice
    if (isSacrificeDouble && sacrificedCard.cardType === 'incident') {
      prod.incidentCount++;
      prod.redCount++;
      if (prod.incidentCount >= 3) {
        prod.isDisaster = true;
        prod.isWrapped = true;
      }
    }
    
    // Update the challenge card's display values
    const challengeInPlayed = prod.played.find(c => c.id === challenge.card.id);
    if (challengeInPlayed) {
      challengeInPlayed.synergyBonus = bonus;
      challengeInPlayed.synergyFired = true;
      challengeInPlayed.totalValue = (challengeInPlayed.totalValue || 0) + bonus;
    }
  }
  
  prod.pendingChallenge = null;
  prod.challengeBetActive = false;
  
  // If there was a pending card choice, handle it
  if (prod.currentDraw && prod.currentDraw.choosable.length >= 2) {
    // Show picker UI for 2 choosable cards
    setState({ production: prod });
    return;
  }
  
  if (prod.currentDraw && prod.currentDraw.choosable.length === 1) {
    // Auto-pick the single remaining action card
    const single = { ...prod.currentDraw.choosable[0] };
    prod.currentDraw = null;
    const finalProd = resolveCardPlay(single, prod, state.castSlots);
    finalProd.pendingChallenge = null;
    finalProd.challengeBetActive = false;
    finalProd.currentDraw = null;
    setState({ production: finalProd });
    return;
  }
  
  // No choosable cards — clear everything so player can draw again
  prod.currentDraw = null;
  setState({ production: prod });
}

// Resolve block choice: sacrifice action card to discard incident, or let incident play
export function resolveBlock(block: boolean) {
  if (!state.production?.pendingBlock) return;
  const prod = { ...state.production };
  const { incident, actionCard } = prod.pendingBlock!;
  
  if (block) {
    // Sacrifice action card to block the incident — both go to discard, costs 2 quality
    prod.discarded = [...prod.discarded, incident, actionCard];
    prod.qualityTotal -= 2; // blocking costs production time
    prod.pendingBlock = null;
    setState({ production: prod });
  } else {
    // Let incident auto-play, then keep the action card
    prod.pendingBlock = null;
    let updatedProd = resolveCardPlay({ ...incident }, prod, state.castSlots);
    if (updatedProd.isDisaster) {
      setState({ production: updatedProd });
      return;
    }
    // Auto-keep the action card
    updatedProd = resolveCardPlay({ ...actionCard }, updatedProd, state.castSlots);
    setState({ production: updatedProd });
  }
}

// ─── DIRECTOR'S CUT ───
// Peek at top 3 cards of deck, rearrange them in any order. Once per production.
export function activateDirectorsCut() {
  if (!state.production || state.production.directorsCutUsed || state.production.directorsCutActive) return;
  if (state.production.currentDraw || state.production.pendingChallenge) return;
  if (state.production.deck.length < 2) return;
  
  const prod = { ...state.production };
  const peek = prod.deck.slice(0, Math.min(3, prod.deck.length));
  prod.directorsCutActive = true;
  prod.directorsCutUsed = true; // Consumed immediately — no take-backs after seeing cards
  prod.directorsCutCards = [...peek];
  setState({ production: prod });
}

export function confirmDirectorsCut(newOrder: number[]) {
  if (!state.production || !state.production.directorsCutActive) return;
  const prod = { ...state.production };
  const deck = [...prod.deck];
  const peekCount = prod.directorsCutCards.length;
  
  // Replace top cards with reordered version
  const reordered = newOrder.map(i => prod.directorsCutCards[i]);
  for (let i = 0; i < peekCount; i++) {
    deck[i] = reordered[i];
  }
  
  prod.deck = deck;
  prod.directorsCutUsed = true;
  prod.directorsCutActive = false;
  prod.directorsCutCards = [];
  setState({ production: prod });
}

export function cancelDirectorsCut() {
  if (!state.production) return;
  const prod = { ...state.production };
  prod.directorsCutActive = false;
  prod.directorsCutCards = [];
  setState({ production: prod });
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
  // Challenge: One Take — cannot wrap early, must draw all cards
  if (state.challengeId === 'one_take' && state.production.deck.length > 0 && !state.production.isDisaster) {
    return; // blocked
  }
  const maxDraws = getMaxDraws(state.production);
  if (state.production.forceExtraDraw && state.production.drawCount < maxDraws && !state.production.isDisaster) {
    return;
  }
  const hasCardsLeft = state.production.deck.length > 0;
  const encoreAvailable = hasCardsLeft && state.challengeId !== 'one_take';
  setState({
    production: {
      ...state.production,
      isWrapped: true,
      encoreState: encoreAvailable ? { available: true, used: false, card: null, result: null } : null,
    },
  });
}

// ─── ARCHETYPE FOCUS ───
// Calculate if the deck/played cards are dominated by one tag type
export function calculateArchetypeFocus(tagsPlayed: Record<string, number>): ArchetypeFocus | null {
  const entries = Object.entries(tagsPlayed);
  if (entries.length === 0) return null;
  const totalTags = entries.reduce((sum, [, count]) => sum + count, 0);
  if (totalTags < 3) return null; // Need at least 3 tags to trigger focus

  const [topTag, topCount] = entries.reduce((best, curr) => curr[1] > best[1] ? curr : best);
  const percentage = Math.round((topCount / totalTags) * 100);

  if (percentage < 60) return null; // Need 60%+ dominance

  const tagLabels: Record<string, string> = {
    momentum: '🔥 MOMENTUM FOCUS',
    precision: '🎯 PRECISION FOCUS',
    chaos: '💀 CHAOS FOCUS',
    heart: '💕 HEART FOCUS',
    spectacle: '✨ SPECTACLE FOCUS',
  };

  // Bonus scales: 60-69% = +2, 70-79% = +3, 80%+ = +5 (capped)
  const bonus = percentage >= 80 ? 5 : percentage >= 70 ? 3 : 2;

  return {
    tag: topTag,
    percentage,
    bonus,
    label: tagLabels[topTag] || `${topTag.toUpperCase()} FOCUS`,
  };
}

// ─── ENCORE (Push Your Luck at Wrap) ───
export function attemptEncore() {
  if (!state.production || !state.production.isWrapped || state.production.isDisaster) return;
  if (state.production.encoreState?.used) return;
  if (state.production.deck.length === 0) return;

  const prod = { ...state.production };
  const deck = [...prod.deck];
  const card = deck.shift()!;

  if (card.cardType === 'incident') {
    // Encore failure: incident hits harder (-5 extra penalty) and breaks clean wrap
    const penalty = card.baseQuality - 5;
    prod.qualityTotal += penalty;
    prod.incidentCount++;
    prod.cleanWrap = false;
    card.totalValue = penalty;
    card.synergyBonus = -5;
    card.synergyFired = true;
    prod.played = [...prod.played, card];
    prod.deck = deck;
    prod.encoreState = { available: false, used: true, card, result: 'failure' };
    // Check disaster
    const disasterThreshold = state.studioArchetype === 'chaos' ? 4 : 3;
    if (prod.incidentCount >= disasterThreshold) {
      prod.isDisaster = true;
    }
  } else {
    // Encore success: card plays with a +3 bonus on top of normal resolution
    const synResult = evaluateSynergy(card, prod.played, prod.qualityTotal, prod.drawCount + 1, state.castSlots, deck, prod.discarded.length);
    const totalVal = card.baseQuality + synResult.bonus + 3; // +3 encore bonus
    card.synergyBonus = synResult.bonus + 3;
    card.synergyFired = true;
    card.totalValue = totalVal;
    prod.qualityTotal += totalVal;
    // Track tags
    if (card.tags) {
      const tagsPlayed = { ...prod.tagsPlayed };
      for (const tag of card.tags) {
        tagsPlayed[tag] = (tagsPlayed[tag] || 0) + 1;
      }
      prod.tagsPlayed = tagsPlayed;
    }
    prod.played = [...prod.played, card];
    prod.deck = deck;
    prod.encoreState = { available: false, used: true, card, result: 'success' };
  }

  setState({ production: prod });
}

export function declineEncore() {
  if (!state.production) return;
  const prod = { ...state.production };
  prod.encoreState = { available: false, used: true, card: null, result: null };
  setState({ production: prod });
}

export function calculateQuality(s: GameState): {
  rawQuality: number;
  scriptBase: number;
  talentSkill: number;
  productionBonus: number;
  cleanWrapBonus: number;
  scriptAbilityBonus: number;
  genreMasteryBonus: number;
  chemistryBonus: number;
  archetypeFocusBonus: number;
  archetypeFocus: ArchetypeFocus | null;
} {
  const script = s.currentScript!;
  const prod = s.production!;

  const legacyPerks = getActiveLegacyPerks();
  const scriptBase = script.baseScore;
  const talentSkill = s.castSlots.reduce((sum, slot) => sum + (slot.talent?.skill || 0), 0);
  const productionBonus = prod.qualityTotal;

  const precisionFilm = s.perks.some(p => p.effect === 'precisionFilm');
  let cleanWrapBonus = 0;
  if (prod.cleanWrap && prod.drawCount > 0) {
    const baseCleanWrap = s.studioArchetype === 'prestige' ? 8 : 5;
    cleanWrapBonus = precisionFilm ? baseCleanWrap + 3 : baseCleanWrap;
    // Precision Craft script doubles clean wrap
    if (script.ability === 'precisionCraft') cleanWrapBonus *= 2;
    // Legacy perk: Precision Master — Clean Wrap +3
    if (legacyPerks.some(p => p.effect === 'precisionCleanWrap3')) cleanWrapBonus += 3;
  }

  let scriptAbilityBonus = prod.scriptAbilityBonus;
  if (script.ability === 'finalGirl') {
    if (prod.drawCount === 5) scriptAbilityBonus += 5;
    // Chaos tags add +1 quality each for horror
    scriptAbilityBonus += (prod.tagsPlayed?.['chaos'] || 0);
  }

  // Heart Engine: each Heart tag = +1 quality
  if (script.ability === 'heartEngine') {
    scriptAbilityBonus += (prod.tagsPlayed?.['heart'] || 0);
  }

  // Precision Craft: each Precision tag = +1 quality
  if (script.ability === 'precisionCraft') {
    scriptAbilityBonus += (prod.tagsPlayed?.['precision'] || 0);
  }

  // Survival Mode: each Chaos tag = +1 quality
  if (script.ability === 'survivalMode') {
    scriptAbilityBonus += (prod.tagsPlayed?.['chaos'] || 0);
  }

  // Genre mastery bonus: +2 per previous film in the same genre (+3 for Prestige, +3 for Typecast)
  const masteryPerFilm = (s.studioArchetype === 'prestige' || s.challengeId === 'typecast') ? 3 : 2;
  const inRunMastery = (s.genreMastery[script.genre] || 0) * masteryPerFilm;
  // Cross-run genre mastery: Gold+ tier gives +1 quality
  const crossRunMasteryBonus = getGenreMasteryBonus(script.genre);
  // Legacy perk: Franchise King — 2+ films same genre in one run gives +3 quality each
  const franchiseBonus = (legacyPerks.some(p => p.effect === 'franchiseBonus') && (s.genreMastery[script.genre] || 0) >= 1) ? 3 : 0;
  const genreMasteryBonus = inRunMastery + crossRunMasteryBonus + franchiseBonus;

  // Chemistry bonus
  const castNames = s.castSlots.map(slot => slot.talent?.name).filter(Boolean) as string[];
  const activeChemistry = getActiveChemistry(castNames);
  const chemistryBonus = activeChemistry.reduce((sum, c) => sum + c.qualityBonus, 0);
  
  // Archetype Focus bonus
  const archetypeFocus = calculateArchetypeFocus(prod.tagsPlayed || {});
  const archetypeFocusBonus = archetypeFocus?.bonus || 0;

  // Challenge: Auteur Mode — +3 quality per consecutive film with same director
  let auteurBonus = 0;
  if (s.challengeId === 'auteur') {
    const director = s.castSlots.find(slot => slot.talent?.type === 'Director')?.talent;
    if (director) {
      // Count how many previous films this director has directed (based on season count, since they must direct all)
      auteurBonus = s.seasonHistory.length * 3;
    }
  }

  let rawQuality = scriptBase + talentSkill + productionBonus + cleanWrapBonus + scriptAbilityBonus + genreMasteryBonus + chemistryBonus + archetypeFocusBonus + auteurBonus;

  // Daily modifier: Oscar Bait — Drama/Thriller +3, Action/Comedy -2
  const mod1 = s.dailyModifierId;
  const mod2 = s.dailyModifierId2;
  if (mod1 === 'oscar_bait' || mod2 === 'oscar_bait') {
    if (script.genre === 'Drama' || script.genre === 'Thriller') rawQuality += 3;
    if (script.genre === 'Action' || script.genre === 'Comedy') rawQuality -= 2;
  }

  // Industry event quality bonuses
  const ie = s.industryEvent;
  if (ie) {
    if (ie.effect === 'goldenAge') rawQuality += 3;
    if (ie.effect === 'baseBoost') rawQuality += 2;
    const totalHeatForEvent = s.castSlots.reduce((sum, slot) => sum + (slot.talent?.heat || 0), 0);
    if (ie.effect === 'indieBoost' && totalHeatForEvent <= 3) rawQuality += 5;
  }

  if (prod.isDisaster) {
    // 3 Incidents = lose ALL quality (insurance saves 25%)
    const insuranceKeep = s.perks.some(p => p.effect === 'insurance') ? 0.25 : 0;
    rawQuality = Math.floor(rawQuality * insuranceKeep);
  }

  return { rawQuality, scriptBase, talentSkill, productionBonus, cleanWrapBonus, scriptAbilityBonus, genreMasteryBonus, chemistryBonus, archetypeFocusBonus, archetypeFocus };
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

  let { rawQuality } = calculateQuality(state);

  // Track chemistry triggers for achievements (only here, not in calculateQuality which is called on every render)
  const castNamesForTracking = state.castSlots.map(slot => slot.talent?.name).filter(Boolean) as string[];
  const activeChemistryForTracking = getActiveChemistry(castNamesForTracking);
  if (activeChemistryForTracking.length > 0) {
    try {
      const u = getUnlocks();
      if (!u.careerStats.chemistryTriggered) u.careerStats.chemistryTriggered = 0;
      u.careerStats.chemistryTriggered += activeChemistryForTracking.length;
      saveUnlocks(u);
    } catch {}
  }

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
      market = state.marketConditions[Math.floor(rng() * state.marketConditions.length)];
    }
  }

  let multiplier = getMarketMultiplier(market, script.genre, rawQuality);

  // Legacy perk: Blockbuster Factory — all market multipliers +0.1
  const legacyPerksRelease = getActiveLegacyPerks();
  if (legacyPerksRelease.some(p => p.effect === 'marketBoost01')) multiplier += 0.1;

  // Legacy perk: Comeback Kid — after a FLOP, next film gets +5 quality
  if (legacyPerksRelease.some(p => p.effect === 'comebackBonus')) {
    const lastSeason = state.seasonHistory[state.seasonHistory.length - 1];
    if (lastSeason && lastSeason.tier === 'FLOP') rawQuality += 5;
  }

  if (script.ability === 'blockbusterBonus') {
    multiplier += 0.3;
    // Spectacle tags add +0.05 each
    multiplier += (prod.tagsPlayed?.['spectacle'] || 0) * 0.05;
  }

  // Heart Engine: 6+ hearts = ×1.2 multiplier
  if (script.ability === 'heartEngine' && (prod.tagsPlayed?.['heart'] || 0) >= 6) {
    multiplier *= 1.2;
  }

  // Apply industry event effects
  const ie = state.industryEvent;
  if (ie) {
    if (ie.effect === 'actionNerf' && script.genre === 'Action') multiplier -= 0.3;
    if (ie.effect === 'dramaBoost' && script.genre === 'Drama') multiplier += 0.5;
    if (ie.effect === 'horrorBoost' && script.genre === 'Horror') multiplier += 0.5;
    if (ie.effect === 'comedyBoost' && script.genre === 'Comedy') multiplier += 0.3;
  }

  // Genre trend multipliers (tuned R26: reduced from +0.4/-0.3 to +0.25/-0.2 — meaningful but not game-deciding)
  if (state.hotGenres.includes(script.genre as Genre)) multiplier += 0.25;
  if (state.coldGenres.includes(script.genre as Genre)) multiplier -= 0.2;
  
  // Season event effects on release
  const se = state.activeSeasonEvent;
  if (se) {
    if (se.effect === 'streamingDeal' || state.streamingDealActive) multiplier -= 0.4;
    if (se.effect === 'genreRevival') {
      // Boost most-made genre
      const entries = Object.entries(state.genreMastery);
      if (entries.length > 0) {
        const bestGenre = entries.reduce((a, b) => b[1] > a[1] ? b : a)[0];
        if (script.genre === bestGenre) multiplier += 0.4;
      }
    }
    if (se.effect === 'foreignDeal') multiplier += 0.3;
    if (se.effect === 'rivalFlop') multiplier += 0.2;
    if (se.effect === 'festivalInvitation') {
      if (rawQuality > 30) rawQuality += 8; // festival bonus baked into quality for box office
      else if (rawQuality <= 20) rawQuality -= 3; // embarrassing premiere
    }
    if (se.effect === 'legacyActor') rawQuality += 5;
    if (se.effect === 'criticDarling' && prod.cleanWrap && prod.drawCount > 0) {
      // Double the clean wrap bonus (already calculated above, add it again)
      const baseCleanWrap = state.studioArchetype === 'prestige' ? 8 : 5;
      rawQuality += baseCleanWrap;
    }
    // R80 events
    if (se.effect === 'foreignDistributionDeal') { multiplier += 0.3; rawQuality -= 5; }
    if (se.effect === 'castingScandal') rawQuality += 10; // +$10M worth via quality boost
    if (se.effect === 'nostalgiaWave') {
      // Double genre mastery bonus (same-genre) — add it again
      const genreCount = state.genreMastery[script.genre] || 0;
      if (genreCount > 0) multiplier += Math.min(genreCount * 0.1, 0.3); // double the existing genre mastery bonus
    }
  }

  const totalHeat = state.castSlots.reduce((sum, s) => sum + (s.talent?.heat || 0), 0);
  // Studio archetype effects
  if (state.studioArchetype === 'blockbuster') multiplier += 0.2;
  if (state.studioArchetype === 'indie') {
    const totalHeatForIndie = state.castSlots.reduce((sum, s) => sum + (s.talent?.heat || 0), 0);
    if (totalHeatForIndie <= 3) rawQuality += 5;
  }
  
  if (state.perks.some(p => p.effect === 'indieSpirit') && totalHeat <= 4) multiplier += 0.5;
  if (state.perks.some(p => p.effect === 'buzz') && rawQuality > 35) multiplier += 0.5;

  const currentRep = state.reputation;
  const repBonus = [0, 0.5, 0.75, 1.0, 1.25, 1.5][currentRep] || 1.0;

  // Challenge: Budget Hell — box office ×1.5
  if (state.challengeId === 'budget_hell') multiplier *= 1.5;

  // Streaming Bidding War: flat $40M, no multiplier
  let boxOffice: number;
  if (se?.effect === 'streamingBiddingWar') {
    boxOffice = Math.max(40, Math.round(rawQuality * 1.0 * repBonus * 10) / 10); // floor $40M, no market multiplier
  } else {
    boxOffice = Math.round(rawQuality * multiplier * repBonus * 10) / 10;
  }
  const target = getSeasonTarget(state.season, state.gameMode, state.challengeId, state.dailyModifierId, state.dailyModifierId2);
  const tier = getTier(boxOffice, target);

  let repChange = 0;
  let bonusMoney = 0;
  let earnings = boxOffice;

  // Baseline season income: prevents death spiral from bad seasons
  let seasonStipend = 5; // $5M guaranteed income per season
  if (state.challengeId === 'shoestring') seasonStipend = 3;
  
  // Season event: Viral Marketing — if quality > 25, earn +$5M bonus
  if (se?.effect === 'viralMarketing' && rawQuality > 25) {
    bonusMoney += 5;
  }
  // Season event: Festival Invitation — quality > 30 = +$8M, quality ≤ 20 = -$3M
  if (se?.effect === 'festivalInvitation') {
    if (rawQuality > 30) bonusMoney += 8;
    else if (rawQuality <= 20) bonusMoney -= 3;
  }

  switch (tier) {
    case 'FLOP':
      repChange = (state.challengeId === 'critics_choice' || state.challengeId === 'critics_only') ? -2 : -1;
      const streamingSafety = state.industryEvent?.effect === 'streamingSafety';
      earnings = Math.round(boxOffice * (streamingSafety ? 0.75 : 0.6) * 10) / 10;
      break;
    case 'HIT':
      repChange = 0;
      bonusMoney = 5;
      break;
    case 'SMASH':
      repChange = 1;
      bonusMoney = 12;
      break;
    case 'BLOCKBUSTER':
      repChange = 1;
      bonusMoney = state.challengeId === 'critics_choice' ? 32 : 22;
      break;
  }

  // Challenge: Critics Only — +1 rep for HIT or better (on top of normal)
  if (state.challengeId === 'critics_only' && tier !== 'FLOP') {
    repChange += 1;
  }

  // Challenge: Auteur Mode — consecutive films with same director give +3 quality each
  // (already baked into rawQuality via calculateQuality, but we track the bonus in rep)

  // Daily modifier: Festival Circuit — quality>30 doubles rep gains, <20 doubles rep loss
  if (state.dailyModifierId === 'festival_circuit' || state.dailyModifierId2 === 'festival_circuit') {
    if (rawQuality > 30 && repChange > 0) repChange *= 2;
    if (rawQuality < 20 && repChange < 0) repChange *= 2;
  }
  // Daily modifier: Award Season — rep gains doubled
  if (state.dailyModifierId === 'award_season' || state.dailyModifierId2 === 'award_season') {
    if (repChange > 0) repChange *= 2;
  }

  const newRep = Math.max(0, Math.min(5, currentRep + repChange));
  // Cosmic Harvest prestige ability: quality above 35 counts double for nomination threshold
  let nominationQuality = rawQuality;
  if (script.ability === 'prestige' && rawQuality > 35) {
    nominationQuality = 35 + (rawQuality - 35) * 2;
  }
  const nominated = nominationQuality > 25 + state.season * 5;

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

  // Decrement films left on talent used this season
  newRoster = newRoster.map(t => {
    const wasUsed = state.castSlots.some(s => s.talent?.id === t.id);
    if (wasUsed && t.filmsLeft !== undefined) {
      return { ...t, filmsLeft: t.filmsLeft - 1 };
    }
    return t;
  }).filter(t => t.filmsLeft === undefined || t.filmsLeft > 0);

  // Generate rival films for this season (rivals chase hot genres)
  let rivalFilms = generateRivalSeason(state.season, target, state.hotGenres, state.coldGenres);
  // Legacy perk: Rival Nemesis — rivals get -10% box office
  if (legacyPerksRelease.some(p => p.effect === 'rivalHandicap')) {
    rivalFilms = rivalFilms.map(rf => ({ ...rf, boxOffice: Math.round(rf.boxOffice * 0.9 * 10) / 10 }));
  }
  const newCumulativeRivalEarnings = { ...state.cumulativeRivalEarnings };
  for (const rf of rivalFilms) {
    newCumulativeRivalEarnings[rf.studioName] = (newCumulativeRivalEarnings[rf.studioName] || 0) + rf.boxOffice;
  }
  const rivalSeasonData = { season: state.season, films: rivalFilms };

  // Generate procedural film title based on genre + tags
  const filmTitle = generateFilmTitle(script.genre, prod.tagsPlayed);

  // Debt interest: 20% per season compounding
  let debt = state.debt;
  if (debt > 0) {
    debt = Math.round(debt * 1.2 * 10) / 10;
  }
  // Baggage salary demands: deduct per-film costs for cast talent with baggage
  let baggageCost = 0;
  for (const slot of state.castSlots) {
    if (slot.talent?.baggage?.extraCost) baggageCost += slot.talent.baggage.extraCost;
    if (slot.talent?.baggage?.budgetDrain) baggageCost += slot.talent.baggage.budgetDrain;
  }
  // Debt reputation penalty: lose 1 rep if in significant debt
  let debtRepPenalty = debt >= 15 ? -1 : 0;

  setState({
    phase: 'release',
    lastFilmTitle: filmTitle,
    lastBoxOffice: boxOffice,
    lastQuality: rawQuality,
    lastTier: tier,
    activeMarket: market,
    debt,
    budget: state.budget + earnings + bonusMoney + seasonStipend + prod.budgetChange - baggageCost,
    totalEarnings: state.totalEarnings + earnings,
    reputation: Math.max(0, Math.min(5, newRep + debtRepPenalty)),
    strikes: tier === 'FLOP' ? state.strikes + 1 : state.strikes,
    seasonHistory: [...state.seasonHistory, result],
    rivalHistory: [...state.rivalHistory, rivalSeasonData],
    cumulativeRivalEarnings: newCumulativeRivalEarnings,
    roster: newRoster,
    genreMastery: {
      ...state.genreMastery,
      [script.genre]: (state.genreMastery[script.genre] || 0) + 1,
    },
    // Clear season event effects after this film
    activeSeasonEvent: null,
    streamingDealActive: false,
  });
}

export function proceedFromRecap() {
  if (state.reputation <= 0 || state.strikes >= state.maxStrikes) {
    clearSave();
    setState({ phase: 'gameOver' });
    return;
  }
  if (state.season >= state.maxSeasons) {
    // Critics Only: must reach 5-star reputation to win
    if (state.challengeId === 'critics_only' && state.reputation < 5) {
      clearSave();
      setState({ phase: 'gameOver' });
      return;
    }
    clearSave();
    setState({ phase: 'victory' });
    return;
  }
  // Critics Only: can win early by reaching 5 stars
  if (state.challengeId === 'critics_only' && state.reputation >= 5) {
    clearSave();
    setState({ phase: 'victory' });
    return;
  }
  proceedToShop();
}

export function proceedToShop() {
  const perkMarket = generatePerkMarket(4, state.perks.map(p => p.name));
  const talentMarket = generateTalentMarket(4, state.season, state.roster);
  const event = INDUSTRY_EVENTS[Math.floor(rng() * INDUSTRY_EVENTS.length)];
  
  // Legacy perk: Talent Scout — guarantee at least one 4+ skill talent in shop
  const legacyPerksShop = getActiveLegacyPerks();
  if (legacyPerksShop.some(p => p.effect === 'guaranteeEliteTalent')) {
    const hasElite = talentMarket.some(t => t.skill >= 4);
    if (!hasElite && talentMarket.length > 0) {
      // Replace the weakest talent with a regenerated high-skill one
      const elite = generateTalentMarket(8, state.season, state.roster).find(t => t.skill >= 4);
      if (elite) {
        const weakestIdx = talentMarket.reduce((wIdx, t, i) => t.skill < talentMarket[wIdx].skill ? i : wIdx, 0);
        talentMarket[weakestIdx] = elite;
      }
    }
  }
  
  // Apply talent drought effect to market size
  let finalTalentMarket = talentMarket;
  if (event.effect === 'talentDrought') {
    finalTalentMarket = talentMarket.slice(0, 3);
  }
  
  // Apply cheap hires effect
  if (event.effect === 'cheapHires') {
    finalTalentMarket = finalTalentMarket.map(t => ({ ...t, cost: Math.max(1, t.cost - 2) }));
  }
  
  // Simplify first-season shop for new players: show fewer options
  const simplified = isSimplifiedRun();
  const finalPerkMarket = simplified && state.season <= 2 ? perkMarket.slice(0, 3) : perkMarket;
  if (simplified && state.season <= 2) {
    finalTalentMarket = finalTalentMarket.slice(0, 3);
  }

  setState({
    phase: 'shop',
    perkMarket: finalPerkMarket,
    talentMarket: finalTalentMarket,
    industryEvent: { name: event.name, description: event.description, effect: event.effect },
  });
}

export function buyPerk(perk: StudioPerk) {
  let actualCost = state.challengeId === 'shoestring' ? perk.cost + 1 : perk.cost;
  if (state.challengeId === 'budget_hell') actualCost += 2;
  if (state.budget < actualCost || state.perks.length >= 5) return;
  setState({
    perks: [...state.perks, perk],
    budget: state.budget - actualCost,
    perkMarket: state.perkMarket.filter(p => p.id !== perk.id),
  });
}

// Train a talent: costs $5M, removes their worst incident card OR upgrades an action card
export function trainTalent(talentId: string, mode: 'removeIncident' | 'upgradeAction') {
  const cost = 5;
  if (state.budget < cost) return;
  
  const roster = state.roster.map(t => {
    if (t.id !== talentId) return t;
    const newCards = [...t.cards];
    
    if (mode === 'removeIncident') {
      // Remove the worst incident card (lowest base quality)
      const incidentIdx = newCards.reduce((worstIdx, card, idx) => {
        if (card.cardType !== 'incident') return worstIdx;
        if (worstIdx === -1) return idx;
        return card.baseQuality < newCards[worstIdx].baseQuality ? idx : worstIdx;
      }, -1);
      if (incidentIdx >= 0) {
        newCards.splice(incidentIdx, 1);
      } else {
        return t; // no incidents to remove
      }
    } else {
      // Upgrade the weakest action card (+1 base quality)
      const actionIdx = newCards.reduce((worstIdx, card, idx) => {
        if (card.cardType !== 'action') return worstIdx;
        if (worstIdx === -1) return idx;
        return card.baseQuality < newCards[worstIdx].baseQuality ? idx : worstIdx;
      }, -1);
      if (actionIdx >= 0) {
        newCards[actionIdx] = { ...newCards[actionIdx], baseQuality: newCards[actionIdx].baseQuality + 1 };
      } else {
        return t;
      }
    }
    
    return { ...t, cards: newCards };
  });
  
  setState({ roster, budget: state.budget - cost });
}

// Pay down debt with available budget (shop phase action)
export function payDebt(amount: number) {
  const maxPayable = Math.min(amount, state.budget, state.debt);
  if (maxPayable <= 0) return;
  setState({
    budget: state.budget - maxPayable,
    debt: Math.round((state.debt - maxPayable) * 10) / 10,
  });
}

export function nextSeason() {
  // Generate 3-4 season events for player to choose from
  const legacyPerksEvent = getActiveLegacyPerks();
  const extraChoice = legacyPerksEvent.some(p => p.effect === 'extraEventChoice') ? 1 : 0;
  const eventCount = (rng() < 0.4 ? 4 : 3) + extraChoice;
  const events = generateSeasonEvents(eventCount, RIVAL_EVENTS);
  const eventChoices: SeasonEventChoice[] = events.map(e => ({
    id: e.id,
    name: e.name,
    emoji: e.emoji,
    description: e.description,
    flavorText: e.flavorText,
    effect: e.effect,
    rarity: e.rarity,
  }));
  
  setState({
    season: state.season + 1,
    currentScript: null,
    castSlots: [],
    production: null,
    activeMarket: null,
    lastTier: null,
    phase: 'event',
    seasonEventChoices: eventChoices,
    activeSeasonEvent: null,
  });
}

export function pickSeasonEvent(eventId: string) {
  const event = state.seasonEventChoices?.find(e => e.id === eventId);
  if (!event) return;
  
  // Apply immediate effects
  let budget = state.budget;
  let reputation = state.reputation;
  let roster = state.roster;
  let streamingDealActive = state.streamingDealActive;
  
  switch (event.effect) {
    case 'awardBuzz': {
      // +$5M bonus for best film
      budget += 5;
      break;
    }
    case 'scandal': {
      reputation = Math.max(0, reputation - 1);
      break;
    }
    case 'streamingDeal': {
      budget += 10;
      streamingDealActive = true;
      break;
    }
    case 'budgetWindfall': {
      budget += 8;
      break;
    }
    // Rival events (R60)
    case 'awardSnub': {
      reputation = Math.max(0, reputation - 1);
      budget += 3;
      break;
    }
    case 'talentPoached': {
      // Remove lowest-skill talent from roster
      if (state.roster.length > 0) {
        const sorted = [...state.roster].sort((a, b) => a.skill - b.skill);
        const poached = sorted[0];
        roster = state.roster.filter(t => t.id !== poached.id);
      }
      break;
    }
    // R67 events
    case 'rivalPoaching': {
      // Lose cheapest talent, gain $5M
      if (state.roster.length > 0) {
        const sorted = [...state.roster].sort((a, b) => a.cost - b.cost);
        const poached = sorted[0];
        roster = state.roster.filter(t => t.id !== poached.id);
      }
      budget += 5;
      break;
    }
    case 'genreMasterclass': {
      // +1 genre mastery for most-made genre, costs $4M
      budget -= 4;
      // genreMastery update is deferred to setState below
      break;
    }
    case 'insuranceFraud': {
      // +$8M now, next film gets 2 extra incidents (handled in production setup)
      budget += 8;
      break;
    }
    case 'festivalInvitation': {
      // Applied during release resolution
      break;
    }
    case 'rivalFlop': {
      // +0.2 multiplier applied during release resolution
      break;
    }
    case 'methodEpidemic': {
      // +1 Skill, +1 Heat to all talent this season (applied here)
      roster = state.roster.map(t => ({ ...t, skill: t.skill + 1, heat: t.heat + 1 }));
      break;
    }
    // R80 events
    case 'castingScandal': {
      reputation = Math.max(0, reputation - 1);
      // +$10M BO applied during release
      break;
    }
    case 'studioMerger': {
      budget += 15;
      break;
    }
    case 'filmFestivalAward': {
      // Check last film quality
      if (state.lastQuality > 30) {
        reputation = Math.min(5, reputation + 2);
      }
      break;
    }
    case 'actorsStrike': {
      // Effects applied during talent market generation
      break;
    }
    // biddingWar effect applied during next season in beginSeason
    // Other effects applied during next season in beginSeason/resolveRelease
  }
  
  // Genre Masterclass: +1 mastery for most-made genre (immutable update)
  let genreMastery = state.genreMastery;
  if (event.effect === 'genreMasterclass') {
    const entries = Object.entries(genreMastery);
    if (entries.length > 0) {
      const best = entries.sort((a, b) => b[1] - a[1])[0][0];
      genreMastery = { ...genreMastery, [best]: (genreMastery[best] || 0) + 1 };
    }
  }

  setState({
    budget,
    reputation,
    roster,
    streamingDealActive,
    genreMastery,
    activeSeasonEvent: event,
    seasonEventChoices: null,
    phase: 'greenlight',
  });
  beginSeason();
}

export function skipSeasonEvent() {
  setState({
    seasonEventChoices: null,
    activeSeasonEvent: null,
    phase: 'greenlight',
  });
  beginSeason();
}
