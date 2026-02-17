// R300: Card Registry — catalogs every production card in the game
// References existing card data from data.ts; does not duplicate definitions.

import { ALL_LEADS, ALL_SUPPORTS, ALL_DIRECTORS, ALL_CREW, ALL_SCRIPTS, LEGENDARY_SCRIPTS } from './data';
import type { CardTemplate, Talent, Script, Genre, CardType, CardTag } from './types';

// ─── Registry Types ───

export type CardRarityGallery = 'common' | 'uncommon' | 'rare' | 'legendary';
export type CardCategory = 'genre' | 'talent' | 'marketing' | 'production' | 'wild';

export interface RegistryCard {
  id: string;           // stable unique ID: "source::cardName"
  name: string;
  description: string;  // synergyText
  rarity: CardRarityGallery;
  category: CardCategory;
  cardType: CardType;    // action / challenge / incident
  sourceName: string;    // talent or script name
  sourceType: 'lead' | 'support' | 'director' | 'crew' | 'script';
  genre?: Genre;
  tags?: CardTag[];
  baseQuality: number;
  unlockCondition?: string;
}

// ─── Helpers ───

function cardTypeToRarity(ct: CardType, baseQuality: number, isLegendary?: boolean): CardRarityGallery {
  if (isLegendary) return 'legendary';
  if (ct === 'challenge') return 'rare';
  if (ct === 'incident') return 'uncommon';
  if (baseQuality >= 2) return 'rare';
  return 'common';
}

function sourceTypeToCategory(sourceType: string): CardCategory {
  switch (sourceType) {
    case 'lead':
    case 'support': return 'talent';
    case 'director': return 'production';
    case 'crew': return 'marketing';
    case 'script': return 'genre';
    default: return 'wild';
  }
}

function makeId(sourceName: string, cardName: string): string {
  return `${sourceName}::${cardName}`;
}

function extractTalentCards(
  talents: Omit<Talent, 'id'>[],
  sourceType: 'lead' | 'support' | 'director' | 'crew',
): RegistryCard[] {
  const cards: RegistryCard[] = [];
  for (const talent of talents) {
    const allCards = [...(talent.cards || []), ...(talent.heatCards || [])];
    for (const card of allCards) {
      cards.push({
        id: makeId(talent.name, card.name),
        name: card.name,
        description: card.synergyText || '',
        rarity: cardTypeToRarity(card.cardType, card.baseQuality),
        category: sourceTypeToCategory(sourceType),
        cardType: card.cardType,
        sourceName: talent.name,
        sourceType,
        genre: talent.genreBonus?.genre,
        tags: card.tags,
        baseQuality: card.baseQuality,
      });
    }
  }
  return cards;
}

function extractScriptCards(scripts: Omit<Script, 'id'>[], isLegendary = false): RegistryCard[] {
  const cards: RegistryCard[] = [];
  for (const script of scripts) {
    for (const card of script.cards || []) {
      cards.push({
        id: makeId(script.title, card.name),
        name: card.name,
        description: card.synergyText || '',
        rarity: cardTypeToRarity(card.cardType, card.baseQuality, isLegendary),
        category: 'genre',
        cardType: card.cardType,
        sourceName: script.title,
        sourceType: 'script',
        genre: script.genre,
        tags: card.tags,
        baseQuality: card.baseQuality,
        unlockCondition: isLegendary ? 'Reach Season 5+' : undefined,
      });
    }
  }
  return cards;
}

// ─── Registry Singleton ───

let _registry: RegistryCard[] | null = null;
let _registryMap: Map<string, RegistryCard> | null = null;

export function getCardRegistry(): RegistryCard[] {
  if (!_registry) {
    _registry = [
      ...extractTalentCards(ALL_LEADS, 'lead'),
      ...extractTalentCards(ALL_SUPPORTS, 'support'),
      ...extractTalentCards(ALL_DIRECTORS, 'director'),
      ...extractTalentCards(ALL_CREW, 'crew'),
      ...extractScriptCards(ALL_SCRIPTS),
      ...extractScriptCards(LEGENDARY_SCRIPTS, true),
    ];
    // Deduplicate by id
    const seen = new Set<string>();
    _registry = _registry.filter(c => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }
  return _registry;
}

export function getCardRegistryMap(): Map<string, RegistryCard> {
  if (!_registryMap) {
    _registryMap = new Map(getCardRegistry().map(c => [c.id, c]));
  }
  return _registryMap;
}

export function lookupRegistryCard(sourceName: string, cardName: string): RegistryCard | undefined {
  return getCardRegistryMap().get(makeId(sourceName, cardName));
}

/** Get total card count */
export function getRegistryCount(): number {
  return getCardRegistry().length;
}
