/*
 * ══════════════════════════════════════════════════════════════════════
 * BALANCE NOTES R110 — Economy Audit & Tuning Pass
 * ══════════════════════════════════════════════════════════════════════
 *
 * 1. BUDGET CURVE (Start → 10 seasons)
 *    - Start: $15 (Neow +$10 → $25, Blockbuster +$5 → $20-30)
 *    - Season stipend: $5/season provides adequate death-spiral protection
 *    - FLOP floor: 60% BO + $5 stipend → even a bad $15 BO film yields $14
 *    - No dead spots found. Season 2→3 target jump (+36%) is steepest but
 *      offset by genre mastery (+4) and growing roster. Budget accumulates
 *      naturally at $30-50 by mid-game.
 *    - Money becomes less constraining by season 4-5 for skilled players,
 *      but debt mechanics and talent baggage costs prevent it from being
 *      truly meaningless. No changes needed.
 *
 * 2. TALENT COST vs VALUE
 *    - Cheap talent (skill 3, $6) = 0.50 skill/$ — best raw efficiency
 *    - Mid talent (skill 4, $10) = 0.40 skill/$
 *    - Expensive talent (skill 5, $15-18) = 0.28-0.33 skill/$
 *    - Chemistry pairs (+3 quality) make cheap talent far superior on ROI:
 *      two $6 talents with chemistry = effective +9 skill for $12 (0.75/dollar)
 *    - Expensive talent justified by: better card pools, synergy upside,
 *      and Method Acting perk. No cost changes needed, but Method Acting
 *      threshold lowered from skill ≥7 to ≥6 to broaden viability
 *      (only 4 talent in pool had skill 7+, making the $9 perk too narrow).
 *
 * 3. PERK TIER ANALYSIS (ranked by EV per dollar)
 *    ── ALWAYS BUY ──
 *    • Genre Specialist ($5→$7): permanent +0.3 mult = ~$5-8/film. Was $5,
 *      auto-buy for any strategy. Raised to $7 — still excellent but not free.
 *    • Completion Bond ($4→$6): saves a strike, game-saving value. Was $4,
 *      absurdly cheap for what it does. Raised to $6.
 *    • Independent Spirit ($6): +0.5 mult if Heat ≤4 = ~$8-10/film. Conditional
 *      but incredible for indie builds. Fair at $6.
 *    ── STRONG ──
 *    • Viral Marketing ($6): ×1.2 if script <$15 = ~$5-8/film. Great value.
 *    • Development Slate ($6): +1 script choice. Solid utility.
 *    • Marketing Machine ($10): choose market = ~$5-8/film. Reliable.
 *    • Buzz Machine ($10): +0.5 mult if quality>35 = huge late game.
 *    • Sequel Rights ($10): +10 quality same genre = strong for focused builds.
 *    ── SITUATIONAL ──
 *    • Crisis Manager ($8): ~$2-4/film. Good if incident-heavy deck.
 *    • Precision Filmmaking ($8): ~$3/film if clean-wrapping consistently.
 *    • Genre Pivot ($8): +3 quality if switching genres. Anti-synergy with mastery.
 *    • Chaos Dividend ($11): high risk/reward, prestige-gated. Fair.
 *    • Reshoots Budget ($12): ~$3-5/film value. Expensive for what it is.
 *    • Prestige Label ($12): conditional on nominations. Niche.
 *    ── NEVER BUY (was) ──
 *    • Insurance Policy ($15→$11): disaster protection is rare-case insurance.
 *      Was $15 — never worth it. Lowered to $11 for consideration in high-risk
 *      builds (Chaos archetype, Chaos Dividend combos).
 *    • Talent Agency ($14): +1 skill all hired, prestige-gated. Fair for late-game.
 *
 * 4. SCRIPT QUALITY DISTRIBUTION
 *    Quality = scriptBase + talentSkill + production + cleanWrap + ability
 *             + mastery + chemistry + focus + vision
 *    - Floor: ~6 (bad script + weak cast + disaster production)
 *    - Typical: ~35-45 (decent script + good cast + clean production)
 *    - Ceiling: ~85-95 (optimal everything, season 5+ bonuses)
 *    - BLOCKBUSTER requires BO ≥ target × 1.5
 *      Season 1: need ~$30 BO → quality ~30 with mult 1.0 → achievable
 *      Season 5: need ~$93 BO → quality ~62 with mult 1.5 → achievable
 *      without legendary scripts IF player has good multiplier stacking.
 *    - Legendary scripts not required but make BLOCKBUSTER more consistent.
 *
 * 5. PRESTIGE SCALING
 *    Veteran scaling (prestige 5+): +5% targets per level above 4
 *    - P5: +5%, P8: +20%, P10: +30%, P12: +40%
 *    - Feels appropriate: legacy perks accumulate power (+$2-5 start budget,
 *      cheaper talent, genre mastery head start) and scaling offsets this.
 *    - Season target curve: [20, 28, 38, 50, 62, 74, 86, 98]
 *      Jumps: +40%, +36%, +32%, +24%, +19%, +16%, +14%
 *      Steepest early, tapering late — correct feel for roguelite difficulty.
 *    - NG+ (×1.4) and Director Mode (×1.8) provide clear challenge tiers.
 *
 * 6. CHANGES MADE
 *    - Genre Specialist: $5 → $7 (was auto-buy, now competitive)
 *    - Completion Bond: $4 → $6 (was absurdly cheap for strike insurance)
 *    - Insurance Policy: $15 → $11 (was never worth buying)
 *    - Method Acting: skill ≥7 → ≥6 (too few qualifying talent at ≥7)
 * ══════════════════════════════════════════════════════════════════════
 */

import { GameState, GamePhase, GameMode, Talent, Script, CastSlot, ProductionState, ProductionCard, StudioPerk, MarketCondition, SynergyContext, SynergyResult, RewardTier, CardTemplate, ArchetypeFocus, Genre, DirectorVision, DirectorVisionContext, CardTag, MarketingTier, PostProdOption } from './types';
import type { StudioArchetypeId, CardRarity } from './types';
import {
  starterRoster, generateScripts, generateTalentMarket,
  generateMarketConditions, generatePerkMarket, getSeasonTarget, neowTalent,
  INDUSTRY_EVENTS, getActiveChemistry, STUDIO_ARCHETYPES, generateSeasonEvents,
  ALL_LEADS, ALL_SUPPORTS, ALL_DIRECTORS, ALL_CREW, ALL_SCRIPTS, isPerkLocked,
} from './data';
import type { SeasonEventChoice } from './types';
import { getActiveLegacyPerks, getUnlocks, saveUnlocks } from './unlocks';
import { rng, activateSeed, deactivateSeed, getDailySeed, getDailyDateString, getWeeklySeed, getWeeklyDateString } from './seededRng';
import { getChallengeById } from './challenges';
import { generateRivalSeason, getSeasonIdentity, RIVAL_EVENTS, calculateRubberBand, generateRivalActions } from './rivals';
import { generateStudioName, generateFilmTitle } from './narrative';
import { addFilmToArchive, getCurrentRunNumber } from './filmArchive';
import { isSimplifiedRun } from './onboarding';
import { resetAgingState, ageTalentOnMarket, recordHire, recordFilmResult, tickPeakCounters, checkHungryMood, applyAgingToTalent, getMoodQualityBonus, generateRisingStar, resetRisingStarNames, getAgingData } from './talentAging';
import { sfx } from './sound';
import { trackRunStart, trackTalentPick, trackGenrePick } from './analytics';
import { careerSessionStart, careerTrackTalentHire, careerTrackFilmComplete } from './careerAnalytics';
import { saveGameState, clearSave } from './saveGame';
import { getGenreMasteryBonus } from './genreMastery';
import { hasMilestone, getLegacyRunBonuses } from './prestige';
import { getTodayModifier, getWeeklyModifiers } from './dailyModifiers';
import { getCombinedModifierMultiplier, CHALLENGE_MODIFIERS } from './challengeModifiers';
import { isLoyalTalent, getLoyaltyDiscount, getLoyaltyQualityBonus, getAgentFee, checkRetirement, getRetirementRepBonus, isTalentRetired } from './talentHistory';
import { getDifficultyConfig } from './difficulty';
import type { Difficulty } from './types';

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
    difficulty: 'studio' as Difficulty,
    maxSeasons: 5,
    maxStrikes: 3,
    hotGenres: [],
    coldGenres: [],
    debt: 0,
    seasonEventChoices: null,
    activeSeasonEvent: null,
    streamingDealActive: false,
    pendingSequelScript: null,
    franchises: {},
    sequelOrigins: {},
    completionBond: false,
    extendedCutAvailable: false,
    extendedCutUsed: false,
    reshootsBudgetUsed: false,
    prCampaignActive: false,
    rivalActions: [],
    workshopDeck: [],
    postProdMarketing: null,
    postProdOption: null,
    postProdMarketingMultiplier: undefined,
    postProdTestScreeningTier: null,
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
  // Daily runs don't save — prevents save-scumming
  if (state.phase !== 'start' && state.gameMode !== 'daily' && state.gameMode !== 'weekly') {
    saveGameState(state);
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ─── CARD RARITY ───

function assignRarity(template: CardTemplate): CardRarity {
  const tagCount = template.tags?.length || 0;
  const val = template.baseQuality;
  // Epic: 3+ tags or base quality >= 6
  if (tagCount >= 3 || val >= 6) return 'epic';
  // Rare: 2 tags or base quality >= 4
  if (tagCount >= 2 || val >= 4) return 'rare';
  return 'common';
}

function rarityQualityBonus(rarity: CardRarity): number {
  if (rarity === 'epic') return 3;
  if (rarity === 'rare') return 1;
  return 0;
}

// ─── BUILD PRODUCTION DECK ───

function templateToCard(template: CardTemplate, source: string, sourceType: ProductionCard['sourceType']): ProductionCard {
  const rarity = assignRarity(template);
  return {
    id: cardUid(),
    name: template.name,
    source,
    sourceType,
    cardType: template.cardType,
    baseQuality: template.baseQuality + rarityQualityBonus(rarity),
    synergyText: template.synergyText,
    synergyCondition: template.synergyCondition,
    riskTag: template.riskTag,
    challengeBet: template.challengeBet,
    budgetMod: template.budgetMod,
    special: template.special,
    tags: template.tags,
    rarity,
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

  // Difficulty: Mogul adds 20% more incidents (duplicate random existing incidents)
  const diffConfigDeck = getDifficultyConfig(state.difficulty);
  if (diffConfigDeck.incidentFrequencyMod > 1.0) {
    const existingIncidents = deck.filter(c => c.cardType === 'incident');
    const extraCount = Math.round(existingIncidents.length * (diffConfigDeck.incidentFrequencyMod - 1.0));
    for (let i = 0; i < extraCount && existingIncidents.length > 0; i++) {
      const template = existingIncidents[Math.floor(rng() * existingIncidents.length)];
      deck.push({ ...template, id: cardUid() });
    }
  }

  // Assign incident severity and scale values for meaningful blocking decisions
  // Minor (-2 to -4): common. Major (-5 to -8): uncommon. Catastrophic (-10 + budget): rare.
  const incidents = deck.filter(c => c.cardType === 'incident');
  // ~15% chance each incident upgrades to catastrophic (rare)
  for (const card of incidents) {
    const roll = rng();
    if (roll < 0.08) {
      // Catastrophic: -10 quality + budget hit
      card.severity = 'catastrophic';
      card.baseQuality = -10;
      if (!card.synergyCondition || card.synergyCondition.toString().includes('bonus: 0')) {
        card.synergyCondition = () => ({ bonus: 0, budgetMod: -3, description: 'Catastrophic disaster on set!' });
      }
      card.synergyText = '☠️ CATASTROPHIC: ' + card.synergyText;
    } else {
      const absQ = Math.abs(card.baseQuality);
      if (absQ <= 4) {
        card.severity = 'minor';
      } else {
        card.severity = 'major';
      }
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

  // Legendary script: Midnight Masterpiece — incidents add +3 quality instead of hurting
  if (card.cardType === 'incident' && state.currentScript?.ability === 'midnightMasterpiece') {
    totalCardValue = 3;
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
    scriptRewriteUsed: p.scriptRewriteUsed,
    directorVision: p.directorVision,
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
  // Block resuming daily runs — no save-scumming allowed
  if (saved.gameMode === 'daily' || saved.gameMode === 'weekly') {
    clearSave();
    return;
  }
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
    // Rebuild directorVision condition function (lost during JSON serialization)
    if (state.production.directorVision) {
      state.production.directorVision = rebuildDirectorVision(state.production.directorVision);
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

export function startGame(mode: GameMode = 'normal', challengeId?: string, activeModifiers?: string[], difficulty: Difficulty = 'studio') {
  clearSave();
  resetAgingState();
  resetRisingStarNames();
  // Activate seeded RNG for daily/weekly runs
  if (mode === 'daily') {
    activateSeed(getDailySeed());
  } else if (mode === 'weekly') {
    activateSeed(getWeeklySeed());
  } else {
    deactivateSeed();
  }

  const challenge = challengeId ? getChallengeById(challengeId) : undefined;
  const diffConfig = getDifficultyConfig(difficulty);
  let maxSeasons = diffConfig.maxSeasons;
  let maxStrikes = 3;

  if (challenge?.id === 'speed_run') {
    maxSeasons = 3;
    maxStrikes = 2;
  }
  if (challenge?.id === 'marathon') {
    maxSeasons = 8;
    maxStrikes = 4;
  }

  // Apply challenge modifier effects
  const mods = activeModifiers || [];
  if (mods.includes('speed_run_mod')) {
    maxSeasons = 3;
    maxStrikes = 2;
  }

  // Daily mode: fixed 3 seasons
  if (mode === 'daily') {
    maxSeasons = 3;
  }

  // Weekly mode has harder defaults
  if (mode === 'weekly') {
    maxStrikes = 2; // tighter margin
  }

  setState({
    ...createInitialState(),
    phase: 'start',
    gameMode: mode,
    difficulty,
    challengeId,
    dailySeed: mode === 'daily' ? getDailyDateString() : mode === 'weekly' ? `weekly:${getWeeklyDateString()}` : undefined,
    weeklySeed: mode === 'weekly' ? getWeeklyDateString() : undefined,
    dailyModifierId: mode === 'daily' ? getTodayModifier().id : undefined,
    dailyModifierId2: mode === 'daily' ? getWeeklyModifiers()[0].id : undefined,
    maxSeasons,
    maxStrikes,
    activeModifiers: mods.length > 0 ? mods : undefined,
  });
}

export function pickArchetype(archetypeId: StudioArchetypeId) {
  const diffConfig = getDifficultyConfig(state.difficulty);
  let budget = diffConfig.startBudget;
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
  // R128: Prestige milestone P8 — +$2M bonus budget
  if (hasMilestone('budget_bonus')) budget += 2;
  // R128: Legacy run bonuses — $1M per 2 prestige levels
  const legacyBonuses = getLegacyRunBonuses();
  budget += legacyBonuses.budgetBonus;
  // Challenge: Shoestring Budget
  if (state.challengeId === 'shoestring') budget = 8;
  // Challenge: Budget Hell — start with $5M
  if (state.challengeId === 'budget_hell') budget = 5;
  // Challenge modifier: Shoestring — 50% budget
  if (state.activeModifiers?.includes('shoestring_mod')) budget = Math.round(budget * 0.5);
  // Weekly mode: start with less budget
  if (state.gameMode === 'weekly') budget = Math.round(budget * 0.75);
  const studio = generateStudioName();
  trackRunStart(state.gameMode, state.challengeId, archetypeId);
  careerSessionStart();
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
  // R128: Legacy run bonuses — +1 starting reputation per prestige level (cap +5)
  const legacyRunBonuses = getLegacyRunBonuses();
  const diffConfigNeow = getDifficultyConfig(state.difficulty);
  const startReputation = Math.min(diffConfigNeow.startReputation + legacyRunBonuses.reputationBonus + getRetirementRepBonus(), 5);
  setState({ neowChoice: choice, roster, budget, perks, genreMastery, reputation: startReputation, phase: 'greenlight' as GamePhase });
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
  const secondUnit = state.perks.some(p => p.effect === 'secondUnit');
  const baseScriptCount = 3 + (devSlate ? 1 : 0) + (secondUnit ? 1 : 0);
  let scripts = generateScripts(baseScriptCount, state.season);
  // Typecast challenge: only show scripts matching locked genre
  if (state.challengeId === 'typecast' && state.lockedGenre) {
    const locked = state.lockedGenre;
    // Regenerate until we have enough matching scripts
    for (let attempt = 0; attempt < 10; attempt++) {
      const filtered = scripts.filter(s => s.genre === locked);
      if (filtered.length >= 2) { scripts = filtered.slice(0, baseScriptCount); break; }
      scripts = generateScripts(baseScriptCount * 2, state.season);
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
  // R130: Celebrity Cameo — +3 base quality
  if (state.activeSeasonEvent?.effect === 'celebrityCameo') {
    scripts = scripts.map(s => ({ ...s, baseScore: s.baseScore + 3 }));
  }
  // R80: Tax Incentive — scripts cost -30%, but locked to a random genre
  if (state.activeSeasonEvent?.effect === 'taxIncentive') {
    const allGenres: Genre[] = ['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller'];
    const lockedGenre = allGenres[Math.floor(rng() * allGenres.length)];
    scripts = scripts.map(s => ({ ...s, genre: lockedGenre as Genre, cost: Math.round(s.cost * 0.7) }));
  }
  
  // R115: Market Crash — all script costs -$2 (min $1)
  if (state.activeSeasonEvent?.effect === 'marketCrash') {
    scripts = scripts.map(s => ({ ...s, cost: Math.max(1, s.cost - 2) }));
  }
  // R130: Tax Break — next script costs $2 less
  if (state.activeSeasonEvent?.effect === 'taxBreak') {
    scripts = scripts.map(s => ({ ...s, cost: Math.max(1, s.cost - 2) }));
  }
  // R115: Indie Darling Wave — scripts costing $3 or less get +5 base quality
  if (state.activeSeasonEvent?.effect === 'indieDarlingWave') {
    scripts = scripts.map(s => s.cost <= 3 ? { ...s, baseScore: s.baseScore + 5 } : s);
  }
  // Pass script genres so market generation guarantees at least one matching market
  const scriptGenres = scripts.map(s => s.genre);
  const markets = generateMarketConditions(3, scriptGenres);
  
  // Generate genre trends for this season (hidden on first-ever run to reduce cognitive load)
  const simplified = isSimplifiedRun();
  const trends = simplified ? { hot: [] as Genre[], cold: [] as Genre[] } : generateGenreTrends();
  
  // Legendary: The Franchise — inject pending sequel script into choices
  if (state.pendingSequelScript) {
    scripts = [state.pendingSequelScript, ...scripts];
  }

  // R150: Generate rival actions for this season
  const rivalActions = generateRivalActions(state.season, state.prCampaignActive);

  // Apply stealScript actions: remove blocked scripts
  for (const action of rivalActions) {
    if (action.actionType === 'stealScript' && action.blockedScriptIndex !== undefined && scripts.length > 1) {
      const idx = Math.min(action.blockedScriptIndex, scripts.length - 1);
      // Don't block sequel scripts
      if (!scripts[idx].legendary) {
        scripts.splice(idx, 1);
      }
    }
  }

  setState({ scriptChoices: scripts, marketConditions: markets, hotGenres: trends.hot, coldGenres: trends.cold, pendingSequelScript: null, rivalActions, prCampaignActive: false });
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
  // R115: Talent Strike — can't hire new talent, empty market
  if (state.activeSeasonEvent?.effect === 'talentStrike') {
    market = [];
  }
  // Season event: Union Dispute — crew costs +$2, but crew cards get +1 base quality
  if (state.activeSeasonEvent?.effect === 'unionDispute') {
    market = market.map(t => t.type === 'Crew' ? {
      ...t,
      cost: t.cost + 2,
      cards: t.cards.map(c => c.cardType === 'action' ? { ...c, baseQuality: c.baseQuality + 1 } : c),
    } : t);
  }
  // R150: Apply snipeTalent rival actions — remove talent from market
  for (const action of (state.rivalActions || [])) {
    if (action.actionType === 'snipeTalent' && action.removedTalentIndex !== undefined && market.length > 1) {
      const idx = Math.min(action.removedTalentIndex, market.length - 1);
      market.splice(idx, 1);
    }
  }

  // Talent Aging: apply aging modifiers to market talent & inject rising star
  market = market.map(t => applyAgingToTalent(t));
  if (state.season >= 2) {
    const star = generateRisingStar(state.season);
    market.push(star);
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
  careerTrackTalentHire(talent.name);
  setState({ castSlots: slots });
  // Check if this talent should retire (8+ career hires)
  if (checkRetirement(talent.name)) {
    setState({ retirementNotification: talent.name });
  }
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
  let actualCost = Math.max(1, talent.cost - discount - getLoyaltyDiscount(talent.name));
  // Agent fee: elite talent (skill 5) costs +$1
  actualCost += getAgentFee(talent.skill);
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
  // Talent Agency perk: hired talent gets +1 skill
  let hiredTalent = talent;
  if (state.perks.some(p => p.effect === 'talentAgency')) {
    hiredTalent = { ...talent, skill: talent.skill + 1 };
  }
  // Elite passive: rosterSkillBoost — Zara Osei-Mensah gives +1 skill to all existing roster talent
  let updatedRoster = [...state.roster];
  if (hiredTalent.elitePassiveEffect === 'rosterSkillBoost') {
    updatedRoster = updatedRoster.map(t => ({ ...t, skill: t.skill + 1 }));
  }

  // Record hire for aging system
  recordHire(hiredTalent.name);

  setState({
    roster: [...updatedRoster, hiredTalent],
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

export function clearRetirementNotification() {
  setState({ retirementNotification: null });
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

// ─── DIRECTOR'S VISION ───
// Vision condition templates keyed by pattern (director name is variable)
const VISION_TEMPLATES: { pattern: string; condition: (ctx: DirectorVisionContext) => boolean }[] = [
  {
    pattern: 'wants a Heart-tagged lead',
    condition: (ctx) => {
      const lead = ctx.castSlots.find(s => s.slotType === 'Lead' && s.talent);
      if (!lead?.talent) return false;
      return lead.talent.cards.some(c => c.tags?.includes('heart'));
    },
  },
  {
    pattern: 'prefers a small cast (≤3 talent)',
    condition: (ctx) => {
      const filled = ctx.castSlots.filter(s => s.talent).length;
      return filled <= 3;
    },
  },
  {
    pattern: 'wants zero incidents',
    condition: (ctx) => ctx.incidentCount === 0,
  },
  {
    pattern: 'wants 3+ unique tag types',
    condition: (ctx) => Object.keys(ctx.tagsPlayed).length >= 3,
  },
  {
    pattern: 'wants a Momentum-tagged lead',
    condition: (ctx) => {
      const lead = ctx.castSlots.find(s => s.slotType === 'Lead' && s.talent);
      if (!lead?.talent) return false;
      return lead.talent.cards.some(c => c.tags?.includes('momentum'));
    },
  },
  {
    pattern: 'wants 4+ Spectacle tags',
    condition: (ctx) => (ctx.tagsPlayed['spectacle'] || 0) >= 4,
  },
  {
    pattern: 'wants a full cast (all slots filled)',
    condition: (ctx) => ctx.castSlots.every(s => s.talent !== null),
  },
  {
    pattern: 'wants ≤1 incident',
    condition: (ctx) => ctx.incidentCount <= 1,
  },
];

// Generate a vision condition for the director based on RNG
function generateDirectorVision(castSlots: CastSlot[]): DirectorVision | null {
  const director = castSlots.find(s => s.talent?.type === 'Director')?.talent;
  if (!director) return null;

  const pick = VISION_TEMPLATES[Math.floor(rng() * VISION_TEMPLATES.length)];
  return { description: `${director.name} ${pick.pattern}`, condition: pick.condition };
}

// Rebuild directorVision condition function after JSON deserialization
function rebuildDirectorVision(vision: DirectorVision): DirectorVision {
  for (const tmpl of VISION_TEMPLATES) {
    if (vision.description.includes(tmpl.pattern)) {
      return { ...vision, condition: tmpl.condition };
    }
  }
  // Fallback: always false (shouldn't happen)
  return { ...vision, condition: () => false };
}

// ─── SCRIPT REWRITE ───
// Re-roll 1-2 keyword tags on script cards. Costs $3M. Once per film.
export function rewriteScript() {
  if (!state.production || !state.currentScript) return;
  if (state.production.scriptRewriteUsed) return;
  if (state.production.isWrapped) return;
  if (state.budget < 3) return;

  const allTags: CardTag[] = ['momentum', 'precision', 'chaos', 'heart', 'spectacle'];
  const deck = [...state.production.deck];

  // Find script cards with tags in the remaining deck
  const scriptCardsWithTags = deck.filter(c => c.sourceType === 'script' && c.tags && c.tags.length > 0);
  if (scriptCardsWithTags.length === 0) return;

  // Re-roll 1-2 random script cards' tags
  const rerollCount = Math.min(1 + (rng() < 0.5 ? 1 : 0), scriptCardsWithTags.length);
  const shuffled = [...scriptCardsWithTags].sort(() => rng() - 0.5);
  for (let i = 0; i < rerollCount; i++) {
    const card = shuffled[i];
    const newTags = card.tags!.map(() => allTags[Math.floor(rng() * allTags.length)]);
    card.tags = newTags;
  }

  setState({
    budget: state.budget - 3,
    production: {
      ...state.production,
      deck,
      scriptRewriteUsed: true,
    },
  });
}

export function startProduction() {
  if (!state.currentScript) return;

  // Elite passive: tagAlchemy — Auteur Collective replaces one script keyword tag with a synergy tag
  const castTalentsForAlchemy = state.castSlots.map(s => s.talent).filter(Boolean) as Talent[];
  if (castTalentsForAlchemy.some(t => t.elitePassiveEffect === 'tagAlchemy') && state.currentScript.keywordTags && state.currentScript.keywordTags.length > 0) {
    // Gather all tags from other cast members' cards (excluding Auteur Collective)
    const otherCastTags = new Set<CardTag>();
    for (const t of castTalentsForAlchemy) {
      if (t.elitePassiveEffect === 'tagAlchemy') continue;
      if (t.cards) {
        for (const c of t.cards) {
          if (c.tags) c.tags.forEach((tag: CardTag) => otherCastTags.add(tag));
        }
      }
    }
    // Find a tag from other cast that's NOT already in script keyword tags
    const scriptTags = state.currentScript.keywordTags;
    const synergyTag = [...otherCastTags].find(tag => !scriptTags.includes(tag));
    if (synergyTag) {
      // Replace the first keyword tag that doesn't match any cast card tag
      const idxToReplace = scriptTags.findIndex(tag => !otherCastTags.has(tag));
      if (idxToReplace >= 0) {
        const newTags = [...scriptTags];
        newTags[idxToReplace] = synergyTag;
        state.currentScript = { ...state.currentScript, keywordTags: newTags };
      }
    }
  }

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
      scriptRewriteUsed: false,
      directorVision: generateDirectorVision(state.castSlots),
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
  // player can block (discard) the incident at a cost of -1 quality (disruption).
  // Player keeps their action card either way. Present choice via pendingBlock state.
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

// Resolve block choice: discard incident for -1 quality (keep action card), or let incident play
export function resolveBlock(block: boolean) {
  if (!state.production?.pendingBlock) return;
  const prod = { ...state.production };
  const { incident, actionCard } = prod.pendingBlock!;
  
  if (block) {
    // Block the incident — only incident is discarded, player keeps action card
    // Costs -1 quality as "disruption cost" (down from old -2 + losing action card)
    prod.discarded = [...prod.discarded, incident];
    prod.qualityTotal -= 1; // disruption cost
    prod.pendingBlock = null;
    // Auto-keep the action card since player retains it
    let updatedProd = resolveCardPlay({ ...actionCard }, prod, state.castSlots);
    setState({ production: updatedProd });
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

// R106: $5M Reshoots — after wrap, re-roll all incident cards in played pile. Risky: could be better or worse.
export function performReshoots() {
  if (!state.production || !state.production.isWrapped || state.production.isDisaster) return;
  if (state.reshootsBudgetUsed) return;
  if (state.budget < 5) return;

  const prod = { ...state.production };
  const played = [...prod.played];
  
  // Find all incident cards and re-roll them
  for (let i = 0; i < played.length; i++) {
    if (played[i].cardType === 'incident') {
      // Re-roll: replace with a random card from the concept of "new incident or action"
      const roll = rng();
      if (roll < 0.45) {
        // 45% chance: becomes a decent action card (+2 to +4)
        const bonus = 2 + Math.floor(rng() * 3);
        played[i] = {
          ...played[i],
          cardType: 'action',
          name: '🎬 Reshoot Take',
          baseQuality: bonus,
          totalValue: bonus,
          synergyBonus: 0,
          synergyFired: false,
          synergyText: 'Reshoot — new footage replaced the problem.',
          riskTag: '🟢',
        };
      } else if (roll < 0.75) {
        // 30% chance: still an incident but milder (-1 to -2)
        const penalty = -(1 + Math.floor(rng() * 2));
        played[i] = {
          ...played[i],
          name: '🎬 Reshoot Incident',
          baseQuality: penalty,
          totalValue: penalty,
          synergyBonus: 0,
          synergyFired: false,
          synergyText: 'Reshoot — still had problems on set.',
        };
      } else {
        // 25% chance: worse incident (-5 to -7)
        const penalty = -(5 + Math.floor(rng() * 3));
        played[i] = {
          ...played[i],
          name: '💥 Reshoot Disaster',
          baseQuality: penalty,
          totalValue: penalty,
          synergyBonus: 0,
          synergyFired: false,
          synergyText: 'Reshoot backfired — new footage is even worse!',
        };
      }
    }
  }

  // Recalculate production totals
  let qualityTotal = 0;
  let incidentCount = 0;
  let cleanWrap = true;
  let budgetChange = 0;
  for (const card of played) {
    qualityTotal += card.totalValue || card.baseQuality;
    if (card.cardType === 'incident') {
      incidentCount++;
      cleanWrap = false;
    }
    budgetChange += card.budgetMod || 0;
  }

  const disasterThreshold = state.studioArchetype === 'chaos' ? 4 : 3;
  
  setState({
    budget: state.budget - 5,
    reshootsBudgetUsed: true,
    production: {
      ...prod,
      played,
      qualityTotal,
      incidentCount,
      redCount: incidentCount,
      cleanWrap,
      budgetChange,
      isDisaster: incidentCount >= disasterThreshold,
    },
  });
}

export function skipReshoots() {
  setState({ reshootsBudgetUsed: true });
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
  directorVisionBonus: number;
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
  let chemistryBonus = activeChemistry.reduce((sum, c) => sum + c.qualityBonus, 0);

  // Elite passive: doubleChemistry — Sebastian Montague doubles chemistry bonus
  const castTalents = s.castSlots.map(slot => slot.talent).filter(Boolean) as Talent[];
  if (castTalents.some(t => t.elitePassiveEffect === 'doubleChemistry')) {
    chemistryBonus *= 2;
  }

  // Elite passive: globalQualityBoost — Isabella Divine gives +2 quality to ALL films
  const allTalent = [...s.roster, ...castTalents];
  const globalQualityBoostCount = allTalent.filter(t => t.elitePassiveEffect === 'globalQualityBoost').length;
  const eliteGlobalBonus = globalQualityBoostCount * 2;

  // Archetype Focus bonus
  const archetypeFocus = calculateArchetypeFocus(prod.tagsPlayed || {});
  const archetypeFocusBonus = archetypeFocus?.bonus || 0;

  // Director's Vision bonus
  let directorVisionBonus = 0;
  if (prod.directorVision && prod.isWrapped) {
    const visionCtx: DirectorVisionContext = {
      castSlots: s.castSlots,
      tagsPlayed: prod.tagsPlayed || {},
      played: prod.played,
      incidentCount: prod.incidentCount,
    };
    directorVisionBonus = prod.directorVision.condition(visionCtx) ? 5 : -2;
  }

  // Challenge: Auteur Mode — +3 quality per consecutive film with same director
  let auteurBonus = 0;
  if (s.challengeId === 'auteur') {
    const director = s.castSlots.find(slot => slot.talent?.type === 'Director')?.talent;
    if (director) {
      // Count how many previous films this director has directed (based on season count, since they must direct all)
      auteurBonus = s.seasonHistory.length * 3;
    }
  }

  // Method Acting perk: +5 quality if lead skill >= 7
  const methodActingBonus = s.perks.some(p => p.effect === 'methodActing') && s.castSlots.some(sl => sl.slotType === 'Lead' && sl.talent && sl.talent.skill >= 6) ? 5 : 0;

  // Genre Pivot perk: +3 quality if genre differs from last film
  const lastGenre = s.seasonHistory.length > 0 ? s.seasonHistory[s.seasonHistory.length - 1].genre : null;
  const genrePivotBonus = s.perks.some(p => p.effect === 'genrePivot') && lastGenre && lastGenre !== script.genre ? 3 : 0;

  // Chaos Dividend perk: +3 per incident (max +9)
  const chaosDividendBonus = s.perks.some(p => p.effect === 'chaosDividend') ? Math.min(prod.incidentCount * 3, 9) : 0;

  // Talent Loyalty: +2 quality per loyal talent in cast
  const loyaltyBonus = s.castSlots.reduce((sum, slot) => sum + (slot.talent ? getLoyaltyQualityBonus(slot.talent.name) : 0), 0);

  // Talent Mood: quality bonuses from hot/hungry moods
  const moodBonus = s.castSlots.reduce((sum, slot) => sum + (slot.talent ? getMoodQualityBonus(slot.talent.name) : 0), 0);

  let rawQuality = scriptBase + talentSkill + productionBonus + cleanWrapBonus + scriptAbilityBonus + genreMasteryBonus + chemistryBonus + archetypeFocusBonus + directorVisionBonus + auteurBonus + methodActingBonus + genrePivotBonus + chaosDividendBonus + eliteGlobalBonus + loyaltyBonus + moodBonus;

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

  return { rawQuality, scriptBase, talentSkill, productionBonus, cleanWrapBonus, scriptAbilityBonus, genreMasteryBonus, chemistryBonus, archetypeFocusBonus, archetypeFocus, directorVisionBonus };
}

function getMarketMultiplier(market: MarketCondition, genre: string, quality: number): number {
  if (market.condition === 'quality>30' && quality <= 30) return 1.0;
  if (market.genreBonus && market.genreBonus !== genre) return 1.0;
  return market.multiplier;
}

function getTier(boxOffice: number, target: number): RewardTier {
  const ratio = boxOffice / target;
  // Critics' Darling modifier raises tier thresholds by 20%
  const cd = state.activeModifiers?.includes('critics_darling_mod') ? 1.2 : 1.0;
  if (ratio >= 1.5 * cd) return 'BLOCKBUSTER';
  if (ratio >= 1.25 * cd) return 'SMASH';
  if (ratio >= 1.0 * cd) return 'HIT';
  return 'FLOP';
}

// ─── R153: POST-PRODUCTION PHASE ───

export function goToPostProduction() {
  setState({
    phase: 'postProduction',
    postProdMarketing: null,
    postProdOption: null,
    postProdMarketingMultiplier: undefined,
    postProdTestScreeningTier: null,
  });
}

export function pickMarketing(tier: MarketingTier) {
  const costs: Record<MarketingTier, number> = { none: 0, standard: 2, premium: 4, viral: 1 };
  const multipliers: Record<MarketingTier, number> = { none: 1.0, standard: 1.2, premium: 1.5, viral: 1.0 };
  const cost = costs[tier];

  let mult = multipliers[tier];
  if (tier === 'viral') {
    mult = 0.8 + rng() * 1.2; // 0.8x to 2.0x
    mult = Math.round(mult * 100) / 100;
  }

  setState({
    budget: state.budget - cost,
    postProdMarketing: tier,
    postProdMarketingMultiplier: mult,
  });
}

export function pickPostProdOption(option: PostProdOption) {
  const prod = state.production;
  if (!prod) return;

  switch (option) {
    case 'directorsCut': {
      // +5 quality, +$1M cost
      setState({
        budget: state.budget - 1,
        postProdOption: option,
        production: { ...prod, qualityTotal: prod.qualityTotal + 5 },
      });
      break;
    }
    case 'testScreening': {
      // Preview tier, no bonus. Calculate what tier would be.
      const { rawQuality } = calculateQuality(state);
      const target = getSeasonTarget(state.season, state.gameMode, state.challengeId, state.dailyModifierId, state.dailyModifierId2);
      const mkt = state.postProdMarketingMultiplier || 1.0;
      const repBonus = [0, 0.5, 0.75, 1.0, 1.25, 1.5][state.reputation] || 1.0;
      const estimatedBO = rawQuality * mkt * repBonus;
      const ratio = estimatedBO / target;
      let previewTier = 'FLOP';
      if (ratio >= 1.5) previewTier = 'BLOCKBUSTER';
      else if (ratio >= 1.25) previewTier = 'SMASH';
      else if (ratio >= 1.0) previewTier = 'HIT';
      setState({
        postProdOption: option,
        postProdTestScreeningTier: previewTier,
      });
      break;
    }
    case 'reshoot': {
      // Reroll 2 lowest cards in played pile, +$3M
      if (state.budget < 3) return;
      const played = [...prod.played];
      // Find 2 lowest-value action cards
      const actionIndices = played
        .map((c, i) => ({ card: c, idx: i }))
        .filter(x => x.card.cardType === 'action')
        .sort((a, b) => (a.card.totalValue || a.card.baseQuality) - (b.card.totalValue || b.card.baseQuality));
      const rerollCount = Math.min(2, actionIndices.length);
      for (let i = 0; i < rerollCount; i++) {
        const idx = actionIndices[i].idx;
        const oldCard = played[idx];
        const newBase = oldCard.baseQuality + Math.floor(rng() * 5) - 1; // -1 to +3 shift
        played[idx] = { ...oldCard, baseQuality: newBase, totalValue: newBase + (oldCard.synergyBonus || 0), name: '🎬 Reshoot Take' };
      }
      // Recalculate quality
      let qualityTotal = 0;
      for (const c of played) qualityTotal += c.totalValue || c.baseQuality;

      setState({
        budget: state.budget - 3,
        postProdOption: option,
        production: { ...prod, played, qualityTotal },
      });
      break;
    }
    case 'rushRelease': {
      // Skip post-prod, -$1M refund but -10 quality
      setState({
        budget: state.budget + 1,
        postProdOption: option,
        production: { ...prod, qualityTotal: prod.qualityTotal - 10 },
      });
      break;
    }
  }
}

export function confirmPostProduction() {
  resolveRelease();
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
    sfx.chemistryPair();
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
  let filmFestivalSubmitBonus = false;

  // Difficulty: market multiplier bonus (Indie = +0.1)
  const diffConfigRelease = getDifficultyConfig(state.difficulty);
  multiplier += diffConfigRelease.marketMultiplierBonus;

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
    // R115 events
    if (se.effect === 'marketCrash') multiplier -= 0.2;
    if (se.effect === 'genreRenaissance') {
      // Random genre gets +0.6 — use season as seed for consistency
      const allGenres: Genre[] = ['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller'];
      const renaissanceGenre = allGenres[state.season % allGenres.length];
      if (script.genre === renaissanceGenre) multiplier += 0.6;
    }
    // R130 events
    if (se.effect === 'filmFestivalSubmit' && rawQuality > 30) {
      filmFestivalSubmitBonus = true;
      multiplier += 0.3;
    }
    if (se.effect === 'documentaryTrend' && script.genre === 'Drama') {
      multiplier *= 2;
    }
    if (se.effect === 'nostalgiaWave') {
      // Double genre mastery bonus (same-genre) — add it again
      const genreCount = state.genreMastery[script.genre] || 0;
      if (genreCount > 0) multiplier += Math.min(genreCount * 0.1, 0.3); // double the existing genre mastery bonus
    }
  }

  // R150: Apply competingFilm rival actions — reduce multiplier if same genre
  for (const action of (state.rivalActions || [])) {
    if (action.actionType === 'competingFilm' && action.multiplierPenalty) {
      if (!action.competingGenre || action.competingGenre === script.genre) {
        multiplier -= action.multiplierPenalty;
      }
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
  // Viral Marketing: ×1.2 if script cost < $15M
  if (state.perks.some(p => p.effect === 'viralMarketing') && script.cost < 15) multiplier *= 1.2;
  // Sequel Rights: same genre as last film gives +$10M BO (applied as quality boost ≈ +10 quality)
  const lastSeasonResult = state.seasonHistory.length > 0 ? state.seasonHistory[state.seasonHistory.length - 1] : null;
  if (state.perks.some(p => p.effect === 'sequelRights') && lastSeasonResult && lastSeasonResult.genre === script.genre) rawQuality += 10;

  const currentRep = state.reputation;
  const repBonus = [0, 0.5, 0.75, 1.0, 1.25, 1.5][currentRep] || 1.0;

  // R136: Franchise sequel multiplier bonus & fatigue
  const franchiseRootForMult = state.sequelOrigins[script.title];
  if (franchiseRootForMult && state.franchises[franchiseRootForMult]) {
    const f = state.franchises[franchiseRootForMult];
    // Inherit 50% of original's market multiplier as a bonus
    multiplier += f.lastMarketMultiplier * 0.5;
    // Franchise Fatigue: 4th sequel (5th+ film) gets -0.2 multiplier
    const filmNum = f.sequelNumber + 1; // this is the next film in the franchise
    if (filmNum >= 4) {
      multiplier -= 0.2 * (filmNum - 3);
    }
  }

  // Challenge: Budget Hell — box office ×1.5
  if (state.challengeId === 'budget_hell') multiplier *= 1.5;

  // Streaming Bidding War: flat $40M, no multiplier
  let boxOffice: number;
  if (se?.effect === 'streamingBiddingWar') {
    boxOffice = Math.max(40, Math.round(rawQuality * 1.0 * repBonus * 10) / 10); // floor $40M, no market multiplier
  } else if (se?.effect === 'streamingDealFlat') {
    boxOffice = 8; // R130: flat $8M, skip tier calc
  } else {
    boxOffice = Math.round(rawQuality * multiplier * repBonus * 10) / 10;
  }

  // R153: Apply marketing multiplier from post-production phase
  const marketingMult = state.postProdMarketingMultiplier || 1.0;
  boxOffice = Math.round(boxOffice * marketingMult * 10) / 10;

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
    case 'FLOP': {
      // R106: Completion Bond — FLOP → MISS (no strike, no rep loss)
      if (state.completionBond) {
        // Bond consumed, treated as a MISS (same as HIT tier minus bonus)
        repChange = 0;
        bonusMoney = 0;
        // Earn full BO but no bonus
        break;
      }
      repChange = (state.challengeId === 'critics_choice' || state.challengeId === 'critics_only') ? -2 : -1;
      const streamingSafety = state.industryEvent?.effect === 'streamingSafety';
      earnings = Math.round(boxOffice * (streamingSafety ? 0.75 : 0.6) * 10) / 10;
      break;
    }
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

  // R115: Awards Campaign — if quality > 35, gain +3 rep
  if (se?.effect === 'awardsCampaign' && rawQuality > 35) {
    repChange += 3;
  }

  // R130: Film Festival Submit — +2 rep if quality > 30
  if (filmFestivalSubmitBonus) repChange += 2;

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

  // ─── R136: FRANCHISE / SEQUEL SYSTEM ───
  let pendingSequelScript = state.pendingSequelScript;
  let franchises = { ...state.franchises };
  let sequelOrigins = { ...state.sequelOrigins };
  const filmTitle_ = generateFilmTitle(script.genre, prod.tagsPlayed);

  // Determine franchise root title for this film
  const franchiseRoot = sequelOrigins[script.title] || null;

  // Update franchise tracker if this film is part of a franchise
  if (franchiseRoot && franchises[franchiseRoot]) {
    const f = { ...franchises[franchiseRoot] };
    f.films = [...f.films, { title: script.title, season: state.season, quality: rawQuality, boxOffice, tier }];
    f.totalBoxOffice += boxOffice;
    f.sequelNumber = f.films.length;
    f.lastQuality = rawQuality;
    f.lastCost = script.cost;
    f.lastMarketMultiplier = multiplier;
    franchises[franchiseRoot] = f;
  }

  // Generate sequel if SMASH HIT or BLOCKBUSTER
  if (tier === 'SMASH' || tier === 'BLOCKBUSTER') {
    const rootTitle = franchiseRoot || script.title;

    // Create franchise entry if this is the first film
    if (!franchises[rootTitle]) {
      franchises[rootTitle] = {
        rootTitle,
        genre: script.genre as Genre,
        films: [{ title: script.title, season: state.season, quality: rawQuality, boxOffice, tier }],
        totalBoxOffice: boxOffice,
        sequelNumber: 1,
        lastQuality: rawQuality,
        lastCost: script.cost,
        lastMarketMultiplier: multiplier,
      };
    }

    const franchise = franchises[rootTitle];
    const sequelNum = franchise.sequelNumber + 1;
    const suffixes = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    const suffix = suffixes[sequelNum - 2] || `${sequelNum}`;
    const sequelTitle = `${rootTitle} ${suffix}`;

    // Sequel quality: original quality × 0.7 (diminishing returns)
    let sequelBaseScore = Math.round(franchise.lastQuality * 0.7);
    // Franchise Fatigue: after the 2nd sequel (3rd+ film), -5 base quality per sequel beyond 2nd
    if (sequelNum > 2) {
      sequelBaseScore -= (sequelNum - 2) * 5;
    }
    sequelBaseScore = Math.max(1, sequelBaseScore);

    // Sequel cost: original cost + $2M
    const sequelCost = franchise.lastCost + 2;

    // Legendary script: The Franchise — BLOCKBUSTER generates a free sequel
    const isFranchiseAbility = script.ability === 'franchise' && tier === 'BLOCKBUSTER';

    pendingSequelScript = {
      id: `sequel-${rootTitle}-${sequelNum}-${Date.now()}`,
      title: sequelTitle,
      genre: script.genre as Genre,
      baseScore: isFranchiseAbility ? sequelBaseScore + 5 : sequelBaseScore,
      slots: script.slots,
      cost: isFranchiseAbility ? 0 : sequelCost,
      cards: script.cards,
      ability: script.ability,
      abilityDesc: `Sequel to ${rootTitle}. Inherits ${Math.round(franchise.lastMarketMultiplier * 50)}% market bonus.`,
      legendary: isFranchiseAbility,
      keywordTags: script.keywordTags,
    };

    // Track sequel origin so we can link it back to the franchise
    sequelOrigins[sequelTitle] = rootTitle;
  }

  // Record film result for talent aging/mood system
  const castNamesForAging = state.castSlots.map(s => s.talent?.name).filter(Boolean) as string[];
  recordFilmResult(castNamesForAging, tier);

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

  // Generate rival films for this season (rivals chase hot genres, with rubber-banding)
  let rivalFilms = generateRivalSeason(state.season, target, state.hotGenres, state.coldGenres, state.totalEarnings + earnings, state.cumulativeRivalEarnings);
  // Difficulty: Mogul rivals are more aggressive (higher box office)
  if (diffConfigRelease.rivalAggressiveness > 1.0) {
    rivalFilms = rivalFilms.map(rf => ({ ...rf, boxOffice: Math.round(rf.boxOffice * diffConfigRelease.rivalAggressiveness * 10) / 10 }));
  } else if (diffConfigRelease.rivalAggressiveness < 1.0) {
    rivalFilms = rivalFilms.map(rf => ({ ...rf, boxOffice: Math.round(rf.boxOffice * diffConfigRelease.rivalAggressiveness * 10) / 10 }));
  }
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

  // Track film completion for career analytics
  careerTrackFilmComplete({ title: filmTitle, genre: script.genre, boxOffice, quality: rawQuality });

  // Record to permanent film archive
  const archiveNotes: string[] = [];
  if (state.extendedCutUsed) archiveNotes.push('Extended Cut');
  if (state.reshootsBudgetUsed) archiveNotes.push('Had reshoots');
  if (prod.directorVision?.met) archiveNotes.push("Director's Vision met");
  if (prod.cleanWrap) archiveNotes.push('Clean wrap');
  if (nominated) archiveNotes.push('Award nominated');
  if (state.completionBond && tier === 'FLOP') archiveNotes.push('Completion Bond used');
  addFilmToArchive({
    title: filmTitle,
    genre: script.genre,
    quality: rawQuality,
    tier,
    boxOffice,
    cast: state.castSlots.map(s => s.talent?.name).filter(Boolean) as string[],
    runNumber: getCurrentRunNumber(),
    runDate: new Date().toISOString().slice(0, 10),
    season: state.season,
    studioName: state.studioName || undefined,
    archetype: state.studioArchetype || undefined,
    notes: archiveNotes,
  });

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
    strikes: (tier === 'FLOP' && !state.completionBond) ? state.strikes + 1 : state.strikes,
    completionBond: (tier === 'FLOP' && state.completionBond) ? false : state.completionBond, // consume bond on FLOP
    extendedCutAvailable: tier !== 'FLOP', // HIT or better can do extended cut
    extendedCutUsed: false,
    reshootsBudgetUsed: false, // reset for next film
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
    pendingSequelScript,
    franchises,
    sequelOrigins,
  });
}

// R106: Extended Cut — spend $3M for a second BO run (30-50% of original), but skip next film slot
export function doExtendedCut() {
  if (!state.extendedCutAvailable || state.extendedCutUsed) return;
  if (state.budget < 3) return;
  if (state.lastTier === 'FLOP') return; // safety check

  const extendedMultiplier = 0.3 + rng() * 0.2; // 30-50%
  const extendedBO = Math.round(state.lastBoxOffice * extendedMultiplier * 10) / 10;

  setState({
    budget: state.budget - 3 + extendedBO,
    totalEarnings: state.totalEarnings + extendedBO,
    extendedCutUsed: true,
    extendedCutAvailable: false,
    // Skip a film slot: advance season counter by 1
    season: state.season + 1,
  });
}

export function declineExtendedCut() {
  setState({ extendedCutAvailable: false });
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
  // No Safety Net modifier: skip shop entirely
  if (state.activeModifiers?.includes('no_safety_net_mod')) {
    proceedToWorkshop();
    return;
  }
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
  // Apply talent aging to shop market
  let finalTalentMarket = talentMarket.map(t => applyAgingToTalent(t));
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
  if (isPerkLocked(perk as any)) return; // prestige-gated
  let actualCost = state.challengeId === 'shoestring' ? perk.cost + 1 : perk.cost;
  if (state.challengeId === 'budget_hell') actualCost += 2;
  if (state.budget < actualCost || state.perks.length >= 5) return;
  const updates: Partial<GameState> = {
    perks: [...state.perks, perk],
    budget: state.budget - actualCost,
    perkMarket: state.perkMarket.filter(p => p.id !== perk.id),
  };
  // Completion Bond sets a one-use flag
  if (perk.effect === 'completionBond') {
    updates.completionBond = true;
  }
  setState(updates);
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

// ─── CARD WORKSHOP (R162) ───

export function proceedToWorkshop() {
  // Build workshop deck from last production's played + remaining cards
  // On season 1 there's no deck yet, skip to nextSeason
  const prod = state.production;
  if (!prod || state.season < 1) {
    nextSeason();
    return;
  }
  // Collect all cards from last production (played + deck + discarded)
  const allCards = [...(prod.played || []), ...(prod.deck || []), ...(prod.discarded || [])];
  if (allCards.length === 0) {
    nextSeason();
    return;
  }
  // Carry over existing workshop deck merged with new production cards
  const existingIds = new Set(state.workshopDeck.map(c => c.id));
  const merged = [...state.workshopDeck];
  for (const card of allCards) {
    if (!existingIds.has(card.id)) {
      merged.push(card);
    }
  }
  setState({ phase: 'workshop' as GamePhase, workshopDeck: merged });
}

export function workshopEnhance(cardId: string) {
  const cost = 2;
  if (state.budget < cost) return;
  const deck = state.workshopDeck.map(c =>
    c.id === cardId ? { ...c, baseQuality: c.baseQuality + 2 } : c
  );
  setState({ budget: state.budget - cost, workshopDeck: deck });
}

export function workshopTransmute(cardId: string, newType: 'action' | 'challenge' | 'incident') {
  const cost = 3;
  if (state.budget < cost) return;
  const riskTagMap = { action: '🟢' as const, challenge: '🟡' as const, incident: '🔴' as const };
  const deck = state.workshopDeck.map(c =>
    c.id === cardId ? { ...c, cardType: newType, riskTag: riskTagMap[newType] } : c
  );
  setState({ budget: state.budget - cost, workshopDeck: deck });
}

export function workshopRemove(cardId: string) {
  const cost = 1;
  if (state.budget < cost) return;
  const deck = state.workshopDeck.filter(c => c.id !== cardId);
  setState({ budget: state.budget - cost, workshopDeck: deck });
}

export function workshopDuplicate(cardId: string) {
  const cost = 4;
  if (state.budget < cost) return;
  const card = state.workshopDeck.find(c => c.id === cardId);
  if (!card) return;
  const dup = { ...card, id: cardUid() };
  setState({ budget: state.budget - cost, workshopDeck: [...state.workshopDeck, dup] });
}

export function skipWorkshop() {
  nextSeason();
}

export function nextSeason() {
  // Talent aging: age market talent, tick peak counters, check hungry
  const marketNames = state.talentMarket.map(t => t.name);
  ageTalentOnMarket(marketNames);
  tickPeakCounters();
  checkHungryMood();

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
    case 'awardSeasonRivalry': {
      // Head-to-head: quality > 30 last film = you win, else rival wins
      if (state.lastQuality > 30) {
        reputation = Math.min(5, reputation + 2);
        budget += 8;
      } else {
        reputation = Math.max(0, reputation - 1);
      }
      break;
    }
    // biddingWar effect applied during next season in beginSeason
    // Other effects applied during next season in beginSeason/resolveRelease
    // R115 events
    case 'awardsCampaign': {
      budget -= 5;
      break;
    }
    // marketCrash, talentStrike, genreRenaissance, indieDarlingWave applied during beginSeason/pickScript/release
    // R130 events
    case 'studioTour': {
      budget += 2;
      break;
    }
    case 'scriptLeak': {
      reputation = Math.max(0, reputation - 1);
      break;
    }
    case 'filmFestivalSubmit': {
      // Applied during release resolution
      break;
    }
    case 'unionNegotiations': {
      // Pay $3M upfront; if can't afford, crew bonuses lost (handled in production)
      budget -= 3;
      break;
    }
    case 'streamingDealFlat': {
      // Applied during release — skip tier calc, flat $8M
      break;
    }
    case 'celebrityCameo': {
      // +3 quality applied during production; 30% scandal check applied here
      if (rng() < 0.3) {
        reputation = Math.max(0, reputation - 2);
      }
      break;
    }
    case 'taxBreak': {
      // Applied during beginSeason/pickScript — next script costs $2 less
      break;
    }
    case 'documentaryTrend': {
      // Applied during release — if Drama, double multiplier
      break;
    }
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

// R150: PR Campaign — spend $2M to reduce rival interference this season
export function buyPRCampaign() {
  if (state.budget < 2 || state.prCampaignActive) return;
  setState({ budget: state.budget - 2, prCampaignActive: true });
}

export function skipSeasonEvent() {
  setState({
    seasonEventChoices: null,
    activeSeasonEvent: null,
    phase: 'greenlight',
  });
  beginSeason();
}
