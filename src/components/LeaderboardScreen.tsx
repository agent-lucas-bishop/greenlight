import { useState, useMemo, useEffect, useRef, memo, useCallback } from 'react';
import { getLeaderboard, getLeaderboardByDifficulty, getPersonalBestByDifficulty, generateRunCard, type LeaderboardEntry } from '../leaderboard';
import { fetchGlobalLeaderboard, getCacheAge, type GlobalScore } from '../leaderboardApi';
import { sfx } from '../sound';
import { DIFFICULTIES } from '../difficulty';

type SortKey = 'score' | 'earnings' | 'films' | 'date';
type SortDir = 'asc' | 'desc';
type TabMode = 'global' | 'local';

const TIER_EMOJI: Record<string, string> = { BLOCKBUSTER: '🟩', SMASH: '🟨', HIT: '🟧', FLOP: '🟥' };
const RANK_COLORS: Record<string, string> = { S: '#ff6b6b', A: '#ffd93d', B: '#6bcb77', C: '#5dade2', D: '#999', F: '#e74c3c' };
const MEDAL = ['🥇', '🥈', '🥉'];

interface Props {
  currentRunId?: string;
}

// ─── Memoized local leaderboard row ───
const LeaderboardRow = memo(function LeaderboardRow({ entry, index, isCurrent, copiedId, onShare }: {
  entry: LeaderboardEntry; index: number; isCurrent: boolean; copiedId: string | null; onShare: (e: LeaderboardEntry) => void;
}) {
  return (
    <div style={{
      display: 'flex', gap: 4, padding: '8px 12px', alignItems: 'center',
      background: isCurrent ? 'rgba(212,168,67,0.12)' : index % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
      border: isCurrent ? '1px solid var(--gold-dim)' : '1px solid transparent',
      borderRadius: isCurrent ? 6 : 0, transition: 'background 0.2s', contain: 'content',
    }}>
      <span style={{ width: 30, fontFamily: 'Bebas Neue', fontSize: '0.9rem', color: index < 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][index] : '#555' }}>
        {index < 3 ? MEDAL[index] : `#${index + 1}`}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: RANK_COLORS[entry.rank] || '#999', fontFamily: 'Bebas Neue', fontSize: '0.9rem' }}>{entry.rank}</span>
          <span style={{
            color: isCurrent ? 'var(--gold)' : '#ccc', fontSize: '0.8rem', fontWeight: isCurrent ? 700 : 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {entry.playerName || entry.studioName || 'Anonymous'}
          </span>
          <span style={{ color: entry.won ? '#2ecc71' : '#e74c3c', fontSize: '0.6rem' }}>{entry.won ? '✓' : '✗'}</span>
        </div>
        <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
          {entry.films.map((f, j) => <span key={j} style={{ fontSize: '0.6rem' }}>{TIER_EMOJI[f.tier] || '⬜'}</span>)}
        </div>
      </div>
      <span style={{ width: 70, textAlign: 'right', color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{entry.score}</span>
      <span style={{ width: 60, textAlign: 'right', color: '#aaa', fontSize: '0.75rem' }}>${entry.earnings.toFixed(0)}M</span>
      <span style={{ width: 40, textAlign: 'right', color: '#888', fontSize: '0.75rem' }}>{entry.films.length}</span>
      <span style={{ width: 70, textAlign: 'right', color: '#666', fontSize: '0.65rem' }}>{entry.date}</span>
      <button onClick={(e) => { e.stopPropagation(); onShare(entry); }}
        title="Copy run card to clipboard"
        style={{
          width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer',
          background: copiedId === entry.id ? 'rgba(46,204,113,0.2)' : 'rgba(255,255,255,0.05)',
          color: copiedId === entry.id ? '#2ecc71' : '#888', fontSize: '0.8rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        {copiedId === entry.id ? '✓' : '📋'}
      </button>
    </div>
  );
});

// ─── Global leaderboard row ───
const GlobalRow = memo(function GlobalRow({ entry, index }: { entry: GlobalScore; index: number }) {
  return (
    <div style={{
      display: 'flex', gap: 4, padding: '8px 12px', alignItems: 'center',
      background: index % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
      contain: 'content',
    }}>
      <span style={{ width: 30, fontFamily: 'Bebas Neue', fontSize: '0.9rem', color: index < 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][index] : '#555' }}>
        {index < 3 ? MEDAL[index] : `#${index + 1}`}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            color: '#ccc', fontSize: '0.8rem',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {entry.playerName || 'Anonymous'}
          </span>
          {entry.studioName && (
            <span style={{ color: '#666', fontSize: '0.65rem' }}>({entry.studioName})</span>
          )}
        </div>
        {entry.topFilm && (
          <div style={{ color: '#888', fontSize: '0.6rem', marginTop: 1 }}>👑 {entry.topFilm}</div>
        )}
      </div>
      <span style={{ width: 70, textAlign: 'right', color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{entry.score}</span>
      <span style={{ width: 50, textAlign: 'right', color: '#888', fontSize: '0.7rem' }}>{entry.seasons}s</span>
    </div>
  );
});

export default function LeaderboardScreen({ currentRunId }: Props) {
  const [tab, setTab] = useState<TabMode>('global');
  const [difficulty, setDifficulty] = useState<string>('studio');
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Global leaderboard state
  const [globalScores, setGlobalScores] = useState<GlobalScore[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(0);

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  const allEntries = getLeaderboard();

  // ─── Fetch global scores ───
  const loadGlobal = useCallback(async (diff: string) => {
    setGlobalLoading(true);
    setGlobalError(null);
    try {
      const scores = await fetchGlobalLeaderboard(diff);
      setGlobalScores(scores);
      setLastRefresh(Date.now());
    } catch {
      setGlobalError('Failed to load global scores');
    } finally {
      setGlobalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'global') {
      loadGlobal(difficulty);
    }
  }, [tab, difficulty, loadGlobal]);

  // ─── Pull to refresh touch handlers ───
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, 80));
    }
  }, [isPulling]);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 60 && tab === 'global') {
      loadGlobal(difficulty);
    }
    setPullDistance(0);
    setIsPulling(false);
  }, [pullDistance, tab, difficulty, loadGlobal]);

  // Local board
  const board = useMemo(() => {
    const filtered = getLeaderboardByDifficulty(difficulty);
    const sorted = [...filtered].sort((a, b) => {
      let va: number, vb: number;
      switch (sortKey) {
        case 'score': va = a.score; vb = b.score; break;
        case 'earnings': va = a.earnings; vb = b.earnings; break;
        case 'films': va = a.films.length; vb = b.films.length; break;
        case 'date': va = new Date(a.date).getTime(); vb = new Date(b.date).getTime(); break;
        default: va = a.score; vb = b.score;
      }
      return sortDir === 'desc' ? vb - va : va - vb;
    });
    return sorted;
  }, [difficulty, sortKey, sortDir]);

  const personalBests = useMemo(() => {
    return DIFFICULTIES.map(d => ({ ...d, best: getPersonalBestByDifficulty(d.id) }));
  }, [allEntries.length]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const handleShare = useCallback((entry: LeaderboardEntry) => {
    const text = generateRunCard(entry);
    navigator.clipboard.writeText(text).then(() => {
      sfx.shareSnap();
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const sortArrow = (key: SortKey) => sortKey === key ? (sortDir === 'desc' ? ' ▾' : ' ▴') : '';

  const revealedRef = useRef(false);
  useEffect(() => {
    if (revealedRef.current || allEntries.length === 0) return;
    revealedRef.current = true;
    sfx.leaderboardReveal();
    if (currentRunId) {
      const topEntry = board[0];
      if (topEntry && topEntry.id === currentRunId) {
        setTimeout(() => sfx.newHighScore(), 700);
      }
    }
  }, [allEntries.length]);

  // Cache age display
  const cacheAgeText = useMemo(() => {
    const age = getCacheAge(difficulty);
    if (age === null) return null;
    const mins = Math.floor(age / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  }, [lastRefresh, difficulty]);

  if (allEntries.length === 0 && tab === 'local') {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '4rem', marginBottom: 16 }}>🏆</div>
        <h3 style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.5rem', letterSpacing: 2, marginBottom: 8 }}>LEADERBOARD</h3>
        <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
          Complete your first run to see your scores here.
        </p>
        <div style={{ marginTop: 16 }}>
          <button onClick={() => setTab('global')} style={{
            background: 'rgba(212,168,67,0.15)', border: '1px solid var(--gold-dim)', borderRadius: 6,
            padding: '8px 20px', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'Bebas Neue', fontSize: '0.9rem',
          }}>🌍 View Global Leaderboard</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ maxWidth: 640, margin: '0 auto' }}
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>

      {/* Pull to refresh indicator */}
      {pullDistance > 0 && (
        <div style={{
          textAlign: 'center', padding: `${pullDistance * 0.3}px 0`, color: pullDistance > 60 ? 'var(--gold)' : '#666',
          fontSize: '0.75rem', transition: pullDistance === 0 ? 'all 0.2s' : 'none',
        }}>
          {pullDistance > 60 ? '↻ Release to refresh' : '↓ Pull to refresh'}
        </div>
      )}

      {/* Global / Local Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, justifyContent: 'center' }}>
        {(['global', 'local'] as TabMode[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? 'rgba(212,168,67,0.12)' : 'transparent',
            border: `1px solid ${tab === t ? 'var(--gold-dim)' : '#333'}`,
            borderRadius: t === 'global' ? '6px 0 0 6px' : '0 6px 6px 0',
            padding: '8px 24px', cursor: 'pointer',
            color: tab === t ? 'var(--gold)' : '#666',
            fontFamily: 'Bebas Neue', fontSize: '0.9rem', letterSpacing: '0.05em',
          }}>
            {t === 'global' ? '🌍 Global' : '💾 Local'}
          </button>
        ))}
      </div>

      {/* Personal Bests (local tab only) */}
      {tab === 'local' && (
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.9rem', letterSpacing: 1, marginBottom: 10 }}>👑 PERSONAL BESTS</h4>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {personalBests.map(pb => (
              <div key={pb.id} style={{
                flex: '1 1 140px', padding: '10px 14px', borderRadius: 8,
                background: pb.best ? `${pb.color}08` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${pb.best ? `${pb.color}30` : '#222'}`, textAlign: 'center',
              }}>
                <div style={{ fontSize: '0.7rem', color: pb.color, fontFamily: 'Bebas Neue', letterSpacing: 1, marginBottom: 4 }}>
                  {pb.emoji} {pb.name}
                </div>
                {pb.best ? (
                  <>
                    <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.4rem' }}>{pb.best.score}</div>
                    <div style={{ color: '#888', fontSize: '0.6rem' }}>
                      {pb.best.rank}-Rank · ${pb.best.earnings.toFixed(0)}M · {pb.best.films.length} films
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#555', fontSize: '0.75rem' }}>—</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Difficulty Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, justifyContent: 'center' }}>
        {DIFFICULTIES.map(d => {
          const count = tab === 'local' ? getLeaderboardByDifficulty(d.id).length : (difficulty === d.id ? globalScores.length : 0);
          return (
            <button key={d.id} onClick={() => { setDifficulty(d.id); setSortKey('score'); setSortDir('desc'); }}
              style={{
                background: difficulty === d.id ? `${d.color}15` : 'transparent',
                border: `1px solid ${difficulty === d.id ? `${d.color}50` : '#333'}`,
                borderRadius: 6, padding: '8px 16px', cursor: 'pointer',
                color: difficulty === d.id ? d.color : '#666',
                fontFamily: 'Bebas Neue', fontSize: '0.85rem', letterSpacing: '0.05em', transition: 'all 0.2s',
              }}>
              {d.emoji} {d.name} {count > 0 && <span style={{ opacity: 0.5 }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* ─── GLOBAL TAB ─── */}
      {tab === 'global' && (
        <>
          {/* Refresh bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 12px', marginBottom: 8 }}>
            <span style={{ color: '#555', fontSize: '0.65rem' }}>
              {cacheAgeText ? `Updated ${cacheAgeText}` : ''}
            </span>
            <button onClick={() => loadGlobal(difficulty)} disabled={globalLoading}
              style={{
                background: 'none', border: '1px solid #333', borderRadius: 4,
                padding: '4px 10px', color: '#888', fontSize: '0.7rem', cursor: 'pointer',
              }}>
              {globalLoading ? '⟳ Loading…' : '↻ Refresh'}
            </button>
          </div>

          {globalError && (
            <div style={{ textAlign: 'center', color: '#e74c3c', fontSize: '0.75rem', padding: '8px', marginBottom: 8 }}>
              {globalError}
            </div>
          )}

          {globalLoading && globalScores.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⟳</div>
              <div style={{ fontSize: '0.85rem' }}>Loading global scores…</div>
            </div>
          ) : globalScores.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: '#666' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🌍</div>
              <div style={{ fontSize: '0.85rem' }}>No global scores yet for this difficulty.</div>
              <div style={{ fontSize: '0.75rem', marginTop: 4, color: '#555' }}>Be the first to claim the top spot!</div>
            </div>
          ) : (
            <>
              {/* Column Headers */}
              <div style={{ display: 'flex', gap: 4, padding: '6px 12px', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #222' }}>
                <span style={{ width: 30 }}>#</span>
                <span style={{ flex: 1 }}>Player</span>
                <span style={{ width: 70, textAlign: 'right' }}>Score</span>
                <span style={{ width: 50, textAlign: 'right' }}>Seasons</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {globalScores.map((entry, i) => (
                  <GlobalRow key={entry.id} entry={entry} index={i} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ─── LOCAL TAB ─── */}
      {tab === 'local' && (
        <>
          {board.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: '#666' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎬</div>
              <div style={{ fontSize: '0.85rem' }}>No runs on {DIFFICULTIES.find(d => d.id === difficulty)?.name || difficulty} difficulty yet.</div>
              <div style={{ fontSize: '0.75rem', marginTop: 4, color: '#555' }}>Start a run to claim your spot!</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 4, padding: '6px 12px', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #222' }}>
                <span style={{ width: 30 }}>#</span>
                <span style={{ flex: 1 }}>Player</span>
                <span style={{ width: 70, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('score')}>Score{sortArrow('score')}</span>
                <span style={{ width: 60, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('earnings')}>BO{sortArrow('earnings')}</span>
                <span style={{ width: 40, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('films')}>Films{sortArrow('films')}</span>
                <span style={{ width: 70, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('date')}>Date{sortArrow('date')}</span>
                <span style={{ width: 32 }}></span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {board.map((entry, i) => (
                  <LeaderboardRow key={entry.id} entry={entry} index={i} isCurrent={currentRunId === entry.id} copiedId={copiedId} onShare={handleShare} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
