// Client-side leaderboard API wrapper with retry + offline fallback

const API_BASE = '/api/leaderboard';
const LOCAL_CACHE_KEY = 'greenlight_global_lb_cache';
const PENDING_SUBMISSIONS_KEY = 'greenlight_pending_submissions';

// ─── Anti-cheat signature (must match server) ───

const SALT = 'greenlight-plum-2026';

export function computeSignature(score: number, timestamp: number): string {
  const raw = `${score}:${timestamp}:${SALT}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

// ─── Types ───

export interface GlobalScore {
  id: string;
  playerName: string;
  studioName: string;
  score: number;
  difficulty: string;
  topFilm: string;
  seasons: number;
  timestamp: number;
}

interface CachedLeaderboard {
  difficulty: string;
  scores: GlobalScore[];
  fetchedAt: number;
}

// ─── Retry fetch helper ───

async function fetchWithRetry(url: string, options?: RequestInit, retries = 3): Promise<Response> {
  let lastError: Error | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || res.status < 500) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err as Error;
    }
    if (i < retries - 1) {
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastError || new Error('Fetch failed');
}

// ─── Fetch global leaderboard ───

export async function fetchGlobalLeaderboard(difficulty: string): Promise<GlobalScore[]> {
  try {
    const res = await fetchWithRetry(`${API_BASE}?difficulty=${encodeURIComponent(difficulty)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const scores: GlobalScore[] = data.scores || [];

    // Cache locally
    try {
      const cache: CachedLeaderboard = { difficulty, scores, fetchedAt: Date.now() };
      localStorage.setItem(`${LOCAL_CACHE_KEY}_${difficulty}`, JSON.stringify(cache));
    } catch {}

    return scores;
  } catch {
    // Offline fallback: return cached data
    return getCachedLeaderboard(difficulty);
  }
}

export function getCachedLeaderboard(difficulty: string): GlobalScore[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_CACHE_KEY}_${difficulty}`);
    if (!raw) return [];
    const cache: CachedLeaderboard = JSON.parse(raw);
    return cache.scores || [];
  } catch {
    return [];
  }
}

export function getCacheAge(difficulty: string): number | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_CACHE_KEY}_${difficulty}`);
    if (!raw) return null;
    const cache: CachedLeaderboard = JSON.parse(raw);
    return Date.now() - cache.fetchedAt;
  } catch {
    return null;
  }
}

// ─── Submit score ───

export interface SubmitResult {
  ok: boolean;
  position: number | null;
  error?: string;
  offline?: boolean;
}

export async function submitScore(params: {
  playerName: string;
  studioName: string;
  score: number;
  difficulty: string;
  topFilm: string;
  seasons: number;
}): Promise<SubmitResult> {
  const timestamp = Date.now();
  const signature = computeSignature(params.score, timestamp);
  const payload = { ...params, timestamp, signature };

  try {
    const res = await fetchWithRetry(`${API_BASE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, position: null, error: data.error || `HTTP ${res.status}` };
    }

    const data = await res.json();
    // Flush any pending submissions
    flushPendingSubmissions();
    return { ok: true, position: data.position };
  } catch {
    // Save for later retry
    savePendingSubmission(payload);
    return { ok: false, position: null, offline: true, error: 'Saved offline — will submit when online' };
  }
}

// ─── Offline queue ───

interface PendingSubmission {
  playerName: string;
  studioName: string;
  score: number;
  difficulty: string;
  topFilm: string;
  seasons: number;
  timestamp: number;
  signature: string;
}

function savePendingSubmission(payload: PendingSubmission): void {
  try {
    const raw = localStorage.getItem(PENDING_SUBMISSIONS_KEY);
    const pending: PendingSubmission[] = raw ? JSON.parse(raw) : [];
    pending.push(payload);
    // Keep max 20 pending
    localStorage.setItem(PENDING_SUBMISSIONS_KEY, JSON.stringify(pending.slice(-20)));
  } catch {}
}

export async function flushPendingSubmissions(): Promise<number> {
  let flushed = 0;
  try {
    const raw = localStorage.getItem(PENDING_SUBMISSIONS_KEY);
    if (!raw) return 0;
    const pending: PendingSubmission[] = JSON.parse(raw);
    if (pending.length === 0) return 0;

    const remaining: PendingSubmission[] = [];
    for (const p of pending) {
      try {
        // Re-sign with fresh timestamp since old ones will be expired
        const timestamp = Date.now();
        const signature = computeSignature(p.score, timestamp);
        const res = await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...p, timestamp, signature }),
        });
        if (res.ok) { flushed++; } else { remaining.push(p); }
      } catch {
        remaining.push(p);
      }
    }
    localStorage.setItem(PENDING_SUBMISSIONS_KEY, JSON.stringify(remaining));
  } catch {}
  return flushed;
}

// Auto-flush when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { flushPendingSubmissions(); });
}
