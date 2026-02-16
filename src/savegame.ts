/**
 * R38: Mid-Run Save/Resume System
 * 
 * Saves the full game state to localStorage after phase transitions.
 * Handles serialization of function-containing objects by rebuilding
 * function references from predefined data pools on restore.
 */

import type { GameState, Talent, Script, ProductionCard, CardTemplate } from './types';
import { ALL_LEADS, ALL_SUPPORTS, ALL_DIRECTORS, ALL_CREW, ALL_SCRIPTS } from './data';

const SAVE_KEY = 'greenlight_midrun_save';
const SAVE_VERSION = 1;

// ─── TALENT/SCRIPT LOOKUP MAPS ───

const ALL_TALENT_TEMPLATES: Omit<Talent, 'id'>[] = [
  ...ALL_LEADS, ...ALL_SUPPORTS, ...ALL_DIRECTORS, ...ALL_CREW,
];

function findTalentTemplate(name: string): Omit<Talent, 'id'> | undefined {
  return ALL_TALENT_TEMPLATES.find(t => t.name === name);
}

function findScriptTemplate(title: string): Omit<Script, 'id'> | undefined {
  return ALL_SCRIPTS.find(s => s.title === title);
}

// ─── REBUILD FUNCTIONS ───

function rebuildCardTemplate(card: CardTemplate, template: CardTemplate | undefined): CardTemplate {
  if (!template) return card;
  return {
    ...card,
    synergyCondition: template.synergyCondition,
    challengeBet: template.challengeBet ? {
      ...card.challengeBet!,
      condition: template.challengeBet.condition,
      oddsHint: template.challengeBet.oddsHint,
    } : card.challengeBet,
  };
}

function rebuildTalent(talent: Talent): Talent {
  const template = findTalentTemplate(talent.name);
  if (!template) return talent;
  
  // Rebuild card functions
  const cards = talent.cards.map((card, i) => {
    const templateCard = template.cards[i];
    return rebuildCardTemplate(card, templateCard);
  });
  
  // Rebuild heatCards if present
  let heatCards = talent.heatCards;
  if (heatCards && template.heatCards) {
    heatCards = heatCards.map((card, i) => {
      const templateCard = template.heatCards![i];
      return rebuildCardTemplate(card, templateCard);
    });
  }
  
  return { ...talent, cards, heatCards };
}

function rebuildScript(script: Script): Script {
  const template = findScriptTemplate(script.title);
  if (!template) return script;
  
  const cards = script.cards.map((card, i) => {
    const templateCard = template.cards[i];
    return rebuildCardTemplate(card, templateCard);
  });
  
  return { ...script, cards };
}

function rebuildProductionCard(card: ProductionCard): ProductionCard {
  // Try to find the source template
  // Cards come from talents or scripts
  const talentTemplate = findTalentTemplate(card.source);
  const scriptTemplate = findScriptTemplate(card.source);
  
  let templateCard: CardTemplate | undefined;
  if (talentTemplate) {
    templateCard = [...talentTemplate.cards, ...(talentTemplate.heatCards || [])].find(c => c.name === card.name);
  } else if (scriptTemplate) {
    templateCard = scriptTemplate.cards.find(c => c.name === card.name);
  }
  
  if (templateCard) {
    return {
      ...card,
      synergyCondition: templateCard.synergyCondition,
      challengeBet: templateCard.challengeBet ? {
        ...card.challengeBet!,
        condition: templateCard.challengeBet.condition,
        oddsHint: templateCard.challengeBet.oddsHint,
      } : card.challengeBet,
    };
  }
  
  return card;
}

function rebuildState(state: GameState): GameState {
  const rebuilt = { ...state };
  
  // Rebuild roster talents
  rebuilt.roster = rebuilt.roster.map(rebuildTalent);
  
  // Rebuild talent market
  rebuilt.talentMarket = rebuilt.talentMarket.map(rebuildTalent);
  
  // Rebuild script choices
  rebuilt.scriptChoices = rebuilt.scriptChoices.map(rebuildScript);
  
  // Rebuild current script
  if (rebuilt.currentScript) {
    rebuilt.currentScript = rebuildScript(rebuilt.currentScript);
  }
  
  // Rebuild cast slots
  rebuilt.castSlots = rebuilt.castSlots.map(slot => ({
    ...slot,
    talent: slot.talent ? rebuildTalent(slot.talent) : null,
  }));
  
  // Rebuild production cards
  if (rebuilt.production) {
    rebuilt.production = {
      ...rebuilt.production,
      deck: rebuilt.production.deck.map(rebuildProductionCard),
      played: rebuilt.production.played.map(rebuildProductionCard),
      discarded: rebuilt.production.discarded.map(rebuildProductionCard),
      directorsCutCards: rebuilt.production.directorsCutCards.map(rebuildProductionCard),
    };
    
    if (rebuilt.production.currentDraw) {
      rebuilt.production.currentDraw = {
        ...rebuilt.production.currentDraw,
        card1: rebuildProductionCard(rebuilt.production.currentDraw.card1),
        card2: rebuildProductionCard(rebuilt.production.currentDraw.card2),
        resolved: rebuilt.production.currentDraw.resolved.map(rebuildProductionCard),
        choosable: rebuilt.production.currentDraw.choosable.map(rebuildProductionCard),
      };
    }
    
    if (rebuilt.production.pendingChallenge) {
      rebuilt.production.pendingChallenge = {
        ...rebuilt.production.pendingChallenge,
        card: rebuildProductionCard(rebuilt.production.pendingChallenge.card),
        bet: rebuilt.production.pendingChallenge.bet ? {
          ...rebuilt.production.pendingChallenge.bet,
          condition: (() => {
            const templateCard = findCardTemplate(rebuilt.production!.pendingChallenge!.card);
            return templateCard?.challengeBet?.condition || (() => false);
          })(),
          oddsHint: (() => {
            const templateCard = findCardTemplate(rebuilt.production!.pendingChallenge!.card);
            return templateCard?.challengeBet?.oddsHint;
          })(),
        } : rebuilt.production.pendingChallenge.bet,
      };
    }
    
    if (rebuilt.production.pendingBlock) {
      rebuilt.production.pendingBlock = {
        ...rebuilt.production.pendingBlock,
        incident: rebuildProductionCard(rebuilt.production.pendingBlock.incident),
        actionCard: rebuildProductionCard(rebuilt.production.pendingBlock.actionCard),
      };
    }
  }
  
  return rebuilt;
}

function findCardTemplate(card: ProductionCard): CardTemplate | undefined {
  const talentTemplate = findTalentTemplate(card.source);
  const scriptTemplate = findScriptTemplate(card.source);
  if (talentTemplate) {
    return [...talentTemplate.cards, ...(talentTemplate.heatCards || [])].find(c => c.name === card.name);
  }
  if (scriptTemplate) {
    return scriptTemplate.cards.find(c => c.name === card.name);
  }
  return undefined;
}

// ─── SAFE SAVE PHASES ───
// We save at all phases, but if restored mid-production with pending UI state,
// we snap to a clean boundary.

function snapToCleanPhase(state: GameState): GameState {
  if (state.phase === 'production' && state.production) {
    const prod = state.production;
    // If there's a pending draw choice, challenge bet, or block — the player was mid-decision.
    // Snap back to production start (re-deal deck won't work without functions, so snap to casting).
    if (prod.currentDraw || prod.pendingChallenge || prod.pendingBlock || prod.directorsCutActive) {
      // Clear the pending state — player resumes at the draw they were at
      // Since we've rebuilt functions, this should actually work. But to be safe:
      return {
        ...state,
        production: {
          ...prod,
          currentDraw: null,
          pendingChallenge: null,
          challengeBetActive: false,
          pendingBlock: null,
          directorsCutActive: false,
          directorsCutCards: [],
        },
      };
    }
  }
  return state;
}

// ─── PUBLIC API ───

export function saveGame(state: GameState): void {
  // Don't save at start screen or end states
  if (state.phase === 'start') return;
  
  try {
    const payload = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      state,
    };
    
    const json = JSON.stringify(payload, (_key, value) => {
      // Strip functions — they'll be rebuilt on restore
      if (typeof value === 'function') return undefined;
      return value;
    });
    
    localStorage.setItem(SAVE_KEY, json);
  } catch (e) {
    console.warn('Failed to save game:', e);
  }
}

export function hasSaveGame(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed.version === SAVE_VERSION && parsed.state?.phase && parsed.state.phase !== 'start';
  } catch {
    return false;
  }
}

export interface SaveInfo {
  season: number;
  filmCount: number;
  budget: number;
  phase: string;
  studioName: string;
  timestamp: number;
}

export function getSaveInfo(): SaveInfo | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== SAVE_VERSION) return null;
    const s = parsed.state;
    return {
      season: s.season || 1,
      filmCount: s.seasonHistory?.length || 0,
      budget: s.budget || 0,
      phase: s.phase || 'unknown',
      studioName: s.studioName || '',
      timestamp: parsed.timestamp || 0,
    };
  } catch {
    return null;
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    
    // Version check — discard incompatible saves
    if (parsed.version !== SAVE_VERSION) {
      clearSave();
      return null;
    }
    
    const state = parsed.state as GameState;
    
    // Basic validation
    if (!state.phase || typeof state.season !== 'number' || typeof state.budget !== 'number') {
      clearSave();
      return null;
    }
    
    // Rebuild function references
    const rebuilt = rebuildState(state);
    
    // Snap to clean phase boundary if needed
    const clean = snapToCleanPhase(rebuilt);
    
    return clean;
  } catch (e) {
    console.warn('Failed to load save, discarding:', e);
    clearSave();
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
