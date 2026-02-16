// Lightweight anonymous analytics — no PII, no cookies, no external services.
// Uses navigator.sendBeacon for fire-and-forget delivery.

const ENDPOINT = '/api/events';
const queue: Array<{ event: string; props?: Record<string, string | number | boolean>; ts: number }> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0);
  try {
    const blob = new Blob([JSON.stringify(batch)], { type: 'application/json' });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, blob);
    } else {
      fetch(ENDPOINT, { method: 'POST', body: blob, keepalive: true }).catch(() => {});
    }
  } catch {
    // Silently fail — analytics should never break the game
  }
}

export function track(event: string, props?: Record<string, string | number | boolean>) {
  queue.push({ event, props, ts: Date.now() });
  // Batch: flush after 2s or when 10 events queued
  if (queue.length >= 10) {
    flush();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush();
    }, 2000);
  }
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
}

// ─── Tracked Events ───
// game_start — { mode, archetype }
// game_complete — { mode, archetype, won, seasons, score, rank }
// daily_run — { date, score }
// tutorial_skip — {}
// tutorial_complete — {}
// season_end — { season, tier, genre, quality, boxOffice }
