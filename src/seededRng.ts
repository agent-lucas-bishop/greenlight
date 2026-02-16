// Mulberry32 seeded PRNG — deterministic random from a seed
export function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Get a daily seed based on current date (YYYY-MM-DD)
export function getDailySeed(): number {
  const d = new Date();
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return hashString(dateStr);
}

export function getDailyDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

// Get weekly seed based on current week's Monday (YYYY-MM-DD)
export function getWeeklySeed(): number {
  return hashString(getWeeklyDateString());
}

export function getWeeklyDateString(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d);
  monday.setDate(diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

// Hash a custom seed string to a numeric seed
export function hashCustomSeed(seed: string): number {
  return hashString(`custom:${seed}`);
}

// Global RNG state — when a seed is active, Math.random is replaced
let _seededRng: (() => number) | null = null;

export function activateSeed(seed: number) {
  _seededRng = mulberry32(seed);
}

export function deactivateSeed() {
  _seededRng = null;
}

// Drop-in replacement: use seeded RNG if active, else Math.random
export function rng(): number {
  return _seededRng ? _seededRng() : Math.random();
}
