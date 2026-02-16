import type { VercelRequest, VercelResponse } from '@vercel/node';

// Lightweight anonymous event logger — no PII, no cookies, no external services.
// Events are logged to Vercel function logs (viewable in dashboard).
// Future: persist to KV or JSON file if needed.

interface AnalyticsEvent {
  event: string;
  props?: Record<string, string | number | boolean>;
  ts: number;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const events: AnalyticsEvent[] = Array.isArray(body) ? body : [body];

    for (const evt of events) {
      // Log to Vercel function logs — structured for easy grep/filter
      console.log(JSON.stringify({
        _type: 'analytics',
        event: evt.event,
        props: evt.props || {},
        ts: evt.ts || Date.now(),
      }));
    }

    return res.status(200).json({ ok: true, count: events.length });
  } catch {
    return res.status(400).json({ error: 'Invalid payload' });
  }
}
