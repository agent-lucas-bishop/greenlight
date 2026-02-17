import { useState, useMemo, useEffect, useRef } from 'react';
import { getLeaderboard, getLeaderboardByDifficulty, getPersonalBestByDifficulty, generateRunCard, type LeaderboardEntry } from '../leaderboard';
import { sfx } from '../sound';
import { DIFFICULTIES } from '../difficulty';

type SortKey = 'score' | 'earnings' | 'films' | 'date';
type SortDir = 'asc' | 'desc';

const TIER_EMOJI: Record<string, string> = { BLOCKBUSTER: '🟩', SMASH: '🟨', HIT: '🟧', FLOP: '🟥' };
const RANK_COLORS: Record<string, string> = { S: '#ff6b6b', A: '#ffd93d', B: '#6bcb77', C: '#5dade2', D: '#999', F: '#e74c3c' };
const MEDAL = ['🥇', '🥈', '🥉'];

interface Props {
  currentRunId?: string; // highlight current run if on board
}

export default function LeaderboardScreen({ currentRunId }: Props) {
  const [difficulty, setDifficulty] = useState<string>('studio');
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const allEntries = getLeaderboard();
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

  // Personal bests per difficulty
  const personalBests = useMemo(() => {
    return DIFFICULTIES.map(d => ({
      ...d,
      best: getPersonalBestByDifficulty(d.id),
    }));
  }, [allEntries.length]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const handleShare = (entry: LeaderboardEntry) => {
    const text = generateRunCard(entry);
    navigator.clipboard.writeText(text).then(() => {
      sfx.shareSnap();
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const sortArrow = (key: SortKey) => sortKey === key ? (sortDir === 'desc' ? ' ▾' : ' ▴') : '';

  // Play leaderboard reveal on mount; newHighScore if current run is #1
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

  if (allEntries.length === 0) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '4rem', marginBottom: 16 }}>🏆</div>
        <h3 style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.5rem', letterSpacing: 2, marginBottom: 8 }}>
          LEADERBOARD
        </h3>
        <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
          Complete your first run to see your scores here. Every legendary studio starts with a single film.
        </p>
        <div style={{ marginTop: 24, color: '#555', fontSize: '0.75rem' }}>
          🎬 Make movies → 📊 Earn scores → 🏆 Climb the board
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Personal Bests */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.9rem', letterSpacing: 1, marginBottom: 10 }}>
          👑 PERSONAL BESTS
        </h4>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {personalBests.map(pb => (
            <div key={pb.id} style={{
              flex: '1 1 140px', padding: '10px 14px', borderRadius: 8,
              background: pb.best ? `${pb.color}08` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${pb.best ? `${pb.color}30` : '#222'}`,
              textAlign: 'center',
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

      {/* Difficulty Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, justifyContent: 'center' }}>
        {DIFFICULTIES.map(d => {
          const count = getLeaderboardByDifficulty(d.id).length;
          return (
            <button key={d.id} onClick={() => { setDifficulty(d.id); setSortKey('score'); setSortDir('desc'); }}
              style={{
                background: difficulty === d.id ? `${d.color}15` : 'transparent',
                border: `1px solid ${difficulty === d.id ? `${d.color}50` : '#333'}`,
                borderRadius: 6, padding: '8px 16px', cursor: 'pointer',
                color: difficulty === d.id ? d.color : '#666',
                fontFamily: 'Bebas Neue', fontSize: '0.85rem', letterSpacing: '0.05em',
                transition: 'all 0.2s',
              }}>
              {d.emoji} {d.name} {count > 0 && <span style={{ opacity: 0.5 }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {board.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 20px', color: '#666' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎬</div>
          <div style={{ fontSize: '0.85rem' }}>No runs on {DIFFICULTIES.find(d => d.id === difficulty)?.name || difficulty} difficulty yet.</div>
          <div style={{ fontSize: '0.75rem', marginTop: 4, color: '#555' }}>Start a run to claim your spot!</div>
        </div>
      ) : (
        <>
          {/* Column Headers */}
          <div style={{ display: 'flex', gap: 4, padding: '6px 12px', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #222' }}>
            <span style={{ width: 30 }}>#</span>
            <span style={{ flex: 1 }}>Player</span>
            <span style={{ width: 70, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('score')}>Score{sortArrow('score')}</span>
            <span style={{ width: 60, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('earnings')}>BO{sortArrow('earnings')}</span>
            <span style={{ width: 40, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('films')}>Films{sortArrow('films')}</span>
            <span style={{ width: 70, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('date')}>Date{sortArrow('date')}</span>
            <span style={{ width: 32 }}></span>
          </div>

          {/* Entries */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {board.map((entry, i) => {
              const isCurrent = currentRunId === entry.id;
              const bestFilm = entry.films.length > 0
                ? entry.films.reduce((a, b) => (b.boxOffice || 0) > (a.boxOffice || 0) ? b : a)
                : null;
              return (
                <div key={entry.id} style={{
                  display: 'flex', gap: 4, padding: '8px 12px', alignItems: 'center',
                  background: isCurrent ? 'rgba(212,168,67,0.12)' : i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                  border: isCurrent ? '1px solid var(--gold-dim)' : '1px solid transparent',
                  borderRadius: isCurrent ? 6 : 0,
                  transition: 'background 0.2s',
                }}>
                  <span style={{ width: 30, fontFamily: 'Bebas Neue', fontSize: '0.9rem', color: i < 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][i] : '#555' }}>
                    {i < 3 ? MEDAL[i] : `#${i + 1}`}
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
                  <button onClick={(e) => { e.stopPropagation(); handleShare(entry); }}
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
            })}
          </div>
        </>
      )}
    </div>
  );
}
