/**
 * R307: Rivalry System
 * Players can mark up to 3 leaderboard entries as rivals.
 * Rivals are highlighted on the leaderboard and trigger notifications when surpassed.
 */

const RIVALS_KEY = 'greenlight_rivals_v1';
const MAX_RIVALS = 3;

export interface Rival {
  entryId: string;       // leaderboard entry ID
  playerName: string;
  studioName: string;
  score: number;
  markedAt: number;      // timestamp
}

export function getRivals(): Rival[] {
  try {
    const raw = localStorage.getItem(RIVALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRivals(rivals: Rival[]): void {
  localStorage.setItem(RIVALS_KEY, JSON.stringify(rivals));
}

export function addRival(rival: Omit<Rival, 'markedAt'>): boolean {
  const rivals = getRivals();
  if (rivals.length >= MAX_RIVALS) return false;
  if (rivals.some(r => r.entryId === rival.entryId)) return false;
  rivals.push({ ...rival, markedAt: Date.now() });
  saveRivals(rivals);
  return true;
}

export function removeRival(entryId: string): void {
  const rivals = getRivals().filter(r => r.entryId !== entryId);
  saveRivals(rivals);
}

export function isRival(entryId: string): boolean {
  return getRivals().some(r => r.entryId === entryId);
}

export function getRivalCount(): number {
  return getRivals().length;
}

/** Check if new score beats any rivals. Returns beaten rival names. */
export function checkRivalBeaten(newScore: number): Rival[] {
  return getRivals().filter(r => newScore > r.score);
}

/** Update rival scores from current leaderboard data */
export function syncRivalScores(entries: { id: string; score: number }[]): void {
  const rivals = getRivals();
  let changed = false;
  for (const rival of rivals) {
    const entry = entries.find(e => e.id === rival.entryId);
    if (entry && entry.score !== rival.score) {
      rival.score = entry.score;
      changed = true;
    }
  }
  if (changed) saveRivals(rivals);
}
