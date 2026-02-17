// R300: Deck Gallery Tracker — persistent card discovery & usage tracking
// Stores in localStorage under 'gl_card_collection'

const STORAGE_KEY = 'gl_card_collection';

export interface CardDiscoveryEntry {
  firstSeen: string;     // ISO date
  usageCount: number;
  lastUsed: string;      // ISO date
}

export interface DeckGalleryState {
  cards: Record<string, CardDiscoveryEntry>; // keyed by registry card id
  version: number;
}

// ─── Persistence ───

function load(): DeckGalleryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { cards: {}, version: 1 };
}

function save(state: DeckGalleryState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ─── Public API ───

/** Mark a card as discovered (first draw). Returns true if this is NEW. */
export function markCardDiscovered(cardId: string): boolean {
  const state = load();
  const now = new Date().toISOString();
  if (state.cards[cardId]) {
    return false; // already discovered
  }
  state.cards[cardId] = {
    firstSeen: now,
    usageCount: 0,
    lastUsed: now,
  };
  save(state);
  return true;
}

/** Increment usage count when card is played/picked */
export function incrementCardUsage(cardId: string): void {
  const state = load();
  const now = new Date().toISOString();
  if (!state.cards[cardId]) {
    state.cards[cardId] = { firstSeen: now, usageCount: 1, lastUsed: now };
  } else {
    state.cards[cardId].usageCount++;
    state.cards[cardId].lastUsed = now;
  }
  save(state);
}

/** Check if a card has been discovered */
export function isCardDiscovered(cardId: string): boolean {
  return !!load().cards[cardId];
}

/** Get discovery entry for a card */
export function getCardEntry(cardId: string): CardDiscoveryEntry | null {
  return load().cards[cardId] || null;
}

/** Get all discovered card IDs */
export function getDiscoveredCardIds(): Set<string> {
  return new Set(Object.keys(load().cards));
}

/** Get total discovered count */
export function getDiscoveredCount(): number {
  return Object.keys(load().cards).length;
}

/** Get full state (for gallery UI) */
export function getGalleryState(): DeckGalleryState {
  return load();
}

/** Batch discover multiple cards (for efficiency) */
export function batchDiscoverCards(cardIds: string[]): string[] {
  const state = load();
  const now = new Date().toISOString();
  const newCards: string[] = [];
  for (const id of cardIds) {
    if (!state.cards[id]) {
      state.cards[id] = { firstSeen: now, usageCount: 0, lastUsed: now };
      newCards.push(id);
    }
  }
  if (newCards.length > 0) save(state);
  return newCards;
}
