import type { VercelRequest, VercelResponse } from '@vercel/node';
import { list, put, head } from '@vercel/blob';

// ─── Types ───

interface LeaderboardScore {
  id: string;
  playerName: string;
  studioName: string;
  score: number;
  difficulty: string;
  topFilm: string;
  seasons: number;
  timestamp: number;
  rank?: string;
  earnings?: number;
  filmsCount?: number;
}

interface SubmitPayload {
  playerName: string;
  studioName: string;
  score: number;
  difficulty: string;
  topFilm: string;
  seasons: number;
  timestamp: number;
  signature: string;
}

// ─── Anti-cheat: basic hash verification ───

const SALT = 'greenlight-plum-2026';

function computeSignature(score: number, timestamp: number): string {
  const raw = `${score}:${timestamp}:${SALT}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function verifySignature(score: number, timestamp: number, signature: string): boolean {
  return computeSignature(score, timestamp) === signature;
}

// ─── Blob storage helpers ───

const BLOB_PREFIX = 'leaderboard';

function blobKey(difficulty: string): string {
  return `${BLOB_PREFIX}/${difficulty}.json`;
}

async function getScores(difficulty: string): Promise<LeaderboardScore[]> {
  try {
    const key = blobKey(difficulty);
    // List blobs to find our file
    const { blobs } = await list({ prefix: key });
    if (blobs.length === 0) return [];
    const res = await fetch(blobs[0].url);
    if (!res.ok) return [];
    return await res.json() as LeaderboardScore[];
  } catch {
    return [];
  }
}

async function saveScores(difficulty: string, scores: LeaderboardScore[]): Promise<void> {
  const key = blobKey(difficulty);
  // Delete existing blobs for this key
  const { blobs } = await list({ prefix: key });
  // Put new blob (overwrites by path)
  await put(key, JSON.stringify(scores), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  });
  // Clean up old blobs if any duplicates
  for (const blob of blobs) {
    if (blob.pathname !== key) {
      try { await fetch(blob.url, { method: 'DELETE' }); } catch {}
    }
  }
}

// ─── Handler ───

const VALID_DIFFICULTIES = ['indie', 'studio', 'mogul'];
const MAX_ENTRIES = 50;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const difficulty = (req.query.difficulty as string) || 'studio';
      if (!VALID_DIFFICULTIES.includes(difficulty)) {
        return res.status(400).json({ error: 'Invalid difficulty' });
      }
      const scores = await getScores(difficulty);
      return res.status(200).json({ scores: scores.slice(0, MAX_ENTRIES) });
    }

    if (req.method === 'POST') {
      const body: SubmitPayload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      // Validate required fields
      if (!body.playerName || typeof body.score !== 'number' || !body.difficulty || !body.signature || !body.timestamp) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (!VALID_DIFFICULTIES.includes(body.difficulty)) {
        return res.status(400).json({ error: 'Invalid difficulty' });
      }

      // Anti-cheat: verify signature
      if (!verifySignature(body.score, body.timestamp, body.signature)) {
        return res.status(403).json({ error: 'Invalid signature' });
      }

      // Reject timestamps more than 5 minutes old
      if (Math.abs(Date.now() - body.timestamp) > 5 * 60 * 1000) {
        return res.status(403).json({ error: 'Expired submission' });
      }

      // Sanitize inputs
      const entry: LeaderboardScore = {
        id: `g_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        playerName: String(body.playerName).slice(0, 24),
        studioName: String(body.studioName || '').slice(0, 32),
        score: Math.max(0, Math.min(999999, Math.round(body.score))),
        difficulty: body.difficulty,
        topFilm: String(body.topFilm || '').slice(0, 64),
        seasons: Math.max(1, Math.min(50, body.seasons || 1)),
        timestamp: body.timestamp,
      };

      const scores = await getScores(body.difficulty);
      scores.push(entry);
      scores.sort((a, b) => b.score - a.score);
      const trimmed = scores.slice(0, MAX_ENTRIES);
      await saveScores(body.difficulty, trimmed);

      const position = trimmed.findIndex(s => s.id === entry.id);
      return res.status(201).json({
        ok: true,
        position: position >= 0 ? position + 1 : null,
        entry,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
