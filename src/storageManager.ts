/**
 * Storage Manager — audit, compress, migrate, and clean up localStorage usage.
 * R203: Performance Optimization Pass
 */

// All known greenlight localStorage keys
export const STORAGE_KEYS = [
  'greenlight-anim-speed',
  'greenlight-colorblind',
  'greenlight-high-contrast',
  'greenlight-muted',
  'greenlight-reduce-motion',
  'greenlight-sfx-volume',
  'greenlight-text-size',
  'greenlight-volume',
  'greenlight_analytics',
  'greenlight_leaderboard',
  'greenlight_meta_progression',
  'greenlight_prestige',
  'greenlight_studio_lot_count',
  'greenlight_unlocks',
  'greenlight_statistics',
  'greenlight_genre_mastery',
  'greenlight_achievements_dates',
  'greenlight_trading_cards',
  'greenlight_custom_cards',
  'greenlight_custom_card_settings',
  'greenlight_replays',
  'greenlight_cutscenes_seen',
  'greenlight_cutscenes_enabled',
  'greenlight_daily_attempt',
  'greenlight_daily_streak',
  'greenlight_daily_history',
  'greenlight_retired_talent',
  'greenlight_studio_identity',
  'greenlight_legacy_films',
  'greenlight_endless_unlocked',
  'greenlight_endless_leaderboard',
  'greenlight_milestones',
  'greenlight_film_archive',
  'greenlight_save',
  'greenlight_director_career',
  'greenlight_personal_bests',
  'greenlight_career_analytics',
  'greenlight_tutorial_active',
  'greenlight_narrative_shown',
  'greenlight_first_run_complete',
  'greenlight_story_moments',
] as const;

export interface StorageAudit {
  totalBytes: number;
  keys: { key: string; bytes: number; exists: boolean }[];
  orphanedKeys: string[];
}

/** Audit all greenlight localStorage usage */
export function auditStorage(): StorageAudit {
  const keys: StorageAudit['keys'] = [];
  let totalBytes = 0;

  for (const key of STORAGE_KEYS) {
    const val = localStorage.getItem(key);
    const bytes = val ? new Blob([val]).size : 0;
    keys.push({ key, bytes, exists: val !== null });
    totalBytes += bytes;
  }

  // Find orphaned greenlight keys not in our registry
  const orphanedKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('greenlight') && !(STORAGE_KEYS as readonly string[]).includes(k)) {
      const val = localStorage.getItem(k);
      const bytes = val ? new Blob([val]).size : 0;
      orphanedKeys.push(k);
      totalBytes += bytes;
    }
  }

  // Sort by size descending
  keys.sort((a, b) => b.bytes - a.bytes);

  return { totalBytes, keys, orphanedKeys };
}

/** Get human-readable storage summary */
export function getStorageSummary(): string {
  const audit = auditStorage();
  const lines: string[] = [];
  lines.push(`Total: ${(audit.totalBytes / 1024).toFixed(1)} KB`);
  for (const k of audit.keys) {
    if (k.exists) {
      lines.push(`  ${k.key}: ${(k.bytes / 1024).toFixed(1)} KB`);
    }
  }
  if (audit.orphanedKeys.length > 0) {
    lines.push(`Orphaned: ${audit.orphanedKeys.join(', ')}`);
  }
  return lines.join('\n');
}

/** Clear all greenlight data */
export function clearAllStorage() {
  for (const key of STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
  // Also clear orphaned
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('greenlight')) toRemove.push(k);
  }
  toRemove.forEach(k => localStorage.removeItem(k));
}

/** Clear specific non-essential data (keeps settings + save) */
export function clearNonEssentialStorage() {
  const keep = new Set([
    'greenlight-anim-speed', 'greenlight-colorblind', 'greenlight-high-contrast',
    'greenlight-muted', 'greenlight-reduce-motion', 'greenlight-sfx-volume',
    'greenlight-text-size', 'greenlight-volume', 'greenlight_save',
  ]);
  for (const key of STORAGE_KEYS) {
    if (!keep.has(key)) localStorage.removeItem(key);
  }
}

// ─── Schema Versioning ───

const SCHEMA_VERSION_KEY = 'greenlight_schema_version';
const CURRENT_SCHEMA_VERSION = 1;

interface Migration {
  version: number;
  migrate: () => void;
}

const MIGRATIONS: Migration[] = [
  // v1: initial schema — trim oversized leaderboard to 50 entries
  {
    version: 1,
    migrate: () => {
      try {
        const lb = JSON.parse(localStorage.getItem('greenlight_leaderboard') || '[]');
        if (Array.isArray(lb) && lb.length > 50) {
          localStorage.setItem('greenlight_leaderboard', JSON.stringify(lb.slice(0, 50)));
        }
        // Trim daily history to 30 entries
        const dh = JSON.parse(localStorage.getItem('greenlight_daily_history') || '[]');
        if (Array.isArray(dh) && dh.length > 30) {
          localStorage.setItem('greenlight_daily_history', JSON.stringify(dh.slice(0, 30)));
        }
      } catch {}
    },
  },
];

/** Run any pending storage migrations */
export function runMigrations() {
  const current = parseInt(localStorage.getItem(SCHEMA_VERSION_KEY) || '0', 10);
  for (const m of MIGRATIONS) {
    if (m.version > current) {
      try { m.migrate(); } catch {}
    }
  }
  if (current < CURRENT_SCHEMA_VERSION) {
    localStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
  }
}

// ─── Compression helpers for large data ───

/** Compress a JSON value using simple run-length encoding of repeated keys.
 *  For localStorage, we just trim excess data rather than actual compression
 *  since LZString would add a dependency. */
export function trimLargeData() {
  try {
    // Trim leaderboard to 50 entries
    const lb = JSON.parse(localStorage.getItem('greenlight_leaderboard') || '[]');
    if (Array.isArray(lb) && lb.length > 50) {
      localStorage.setItem('greenlight_leaderboard', JSON.stringify(lb.slice(0, 50)));
    }
    // Trim analytics if over 100KB
    const analytics = localStorage.getItem('greenlight_analytics');
    if (analytics && analytics.length > 100_000) {
      try {
        const data = JSON.parse(analytics);
        // Keep only last 100 runs
        if (data.runs && Array.isArray(data.runs) && data.runs.length > 100) {
          data.runs = data.runs.slice(-100);
          localStorage.setItem('greenlight_analytics', JSON.stringify(data));
        }
      } catch {}
    }
    // Trim film archive to 200 films
    const archive = localStorage.getItem('greenlight_film_archive');
    if (archive) {
      try {
        const films = JSON.parse(archive);
        if (Array.isArray(films) && films.length > 200) {
          localStorage.setItem('greenlight_film_archive', JSON.stringify(films.slice(-200)));
        }
      } catch {}
    }
  } catch {}
}
