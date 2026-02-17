import { useState, useMemo } from 'react';
import { getFilmArchive, getEarnedMilestones, MILESTONE_THRESHOLDS, type ArchiveFilm } from '../filmArchive';

const TIER_COLORS: Record<string, string> = {
  BLOCKBUSTER: '#2ecc71',
  SMASH: '#f1c40f',
  HIT: '#e67e22',
  MISS: '#999',
  FLOP: '#e74c3c',
};

const TIER_EMOJI: Record<string, string> = {
  BLOCKBUSTER: '🟩',
  SMASH: '🟨',
  HIT: '🟧',
  MISS: '⬜',
  FLOP: '🟥',
};

const GENRE_COLORS: Record<string, string> = {
  Action: '#e74c3c',
  Comedy: '#f39c12',
  Drama: '#3498db',
  Horror: '#9b59b6',
  Romance: '#e91e63',
  'Sci-Fi': '#00bcd4',
  Thriller: '#607d8b',
};

const MILESTONE_BADGES: Record<number, { emoji: string; label: string }> = {
  10: { emoji: '🎬', label: 'Apprentice' },
  25: { emoji: '🌟', label: 'Rising Star' },
  50: { emoji: '🏆', label: 'Veteran' },
  100: { emoji: '👑', label: 'Mogul' },
  250: { emoji: '💎', label: 'Legend' },
};

type SortKey = 'date' | 'quality' | 'boxOffice' | 'tier';
type FilterTier = 'ALL' | 'FLOP' | 'MISS' | 'HIT' | 'BLOCKBUSTER' | 'SMASH';

const TIER_RANK: Record<string, number> = { FLOP: 0, MISS: 1, HIT: 2, SMASH: 3, BLOCKBUSTER: 4 };

export default function FilmArchive() {
  const archive = useMemo(() => getFilmArchive(), []);
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [filterGenre, setFilterGenre] = useState<string>('ALL');
  const [filterTier, setFilterTier] = useState<FilterTier>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalCount = archive.length;
  const milestones = getEarnedMilestones(totalCount);
  const nextMilestone = MILESTONE_THRESHOLDS.find(t => totalCount < t);
  const genres = useMemo(() => [...new Set(archive.map(f => f.genre))].sort(), [archive]);

  // Filter
  let filtered = archive;
  if (filterGenre !== 'ALL') filtered = filtered.filter(f => f.genre === filterGenre);
  if (filterTier !== 'ALL') filtered = filtered.filter(f => f.tier === filterTier);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case 'quality': return arr.sort((a, b) => b.quality - a.quality);
      case 'boxOffice': return arr.sort((a, b) => b.boxOffice - a.boxOffice);
      case 'tier': return arr.sort((a, b) => (TIER_RANK[b.tier] ?? 0) - (TIER_RANK[a.tier] ?? 0));
      case 'date':
      default: return arr.reverse(); // newest first
    }
  }, [filtered, sortBy]);

  if (totalCount === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🎞️</div>
        <div className="empty-state-title">No Films Yet</div>
        <div className="empty-state-desc">Complete a season to add your first film to the archive. Every masterpiece starts somewhere!</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 650, margin: '0 auto' }}>
      {/* Milestone banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>
          🎞️ {totalCount} Film{totalCount !== 1 ? 's' : ''} Produced
        </div>
        {milestones.map(m => (
          <span key={m} style={{
            background: 'rgba(212,168,67,0.12)', border: '1px solid var(--gold-dim)',
            borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', color: 'var(--gold)',
          }}>
            {MILESTONE_BADGES[m]?.emoji} {MILESTONE_BADGES[m]?.label}
          </span>
        ))}
        {nextMilestone && (
          <span style={{ fontSize: '0.65rem', color: '#666' }}>
            Next: {nextMilestone - totalCount} to {MILESTONE_BADGES[nextMilestone]?.emoji} {MILESTONE_BADGES[nextMilestone]?.label}
          </span>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} style={{ background: '#1a1a1a', color: '#ccc', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem' }}>
          <option value="date">Sort: Recent</option>
          <option value="quality">Sort: Quality</option>
          <option value="boxOffice">Sort: Box Office</option>
          <option value="tier">Sort: Tier</option>
        </select>
        <select value={filterGenre} onChange={e => setFilterGenre(e.target.value)} style={{ background: '#1a1a1a', color: '#ccc', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem' }}>
          <option value="ALL">All Genres</option>
          {genres.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={filterTier} onChange={e => setFilterTier(e.target.value as FilterTier)} style={{ background: '#1a1a1a', color: '#ccc', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem' }}>
          <option value="ALL">All Tiers</option>
          <option value="BLOCKBUSTER">🟩 Blockbuster</option>
          <option value="SMASH">🟨 Smash</option>
          <option value="HIT">🟧 Hit</option>
          <option value="FLOP">🟥 Flop</option>
        </select>
      </div>

      {sorted.length === 0 && (
        <div className="empty-state" style={{ padding: 20 }}>
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-desc">No films match these filters.</div>
        </div>
      )}

      {/* Film grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map(film => {
          const isExpanded = expandedId === film.id;
          return (
            <div key={film.id}
              onClick={() => setExpandedId(isExpanded ? null : film.id)}
              style={{
                padding: '12px 14px', background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${(TIER_COLORS[film.tier] || '#333') + '33'}`,
                borderRadius: 8, cursor: 'pointer', transition: 'border-color 0.2s',
              }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{TIER_EMOJI[film.tier] || '⬜'}</span>
                  <span style={{ color: '#ddd', fontSize: '0.9rem', fontWeight: 600 }}>"{film.title}"</span>
                </div>
                <span style={{ color: TIER_COLORS[film.tier], fontFamily: 'Bebas Neue', fontSize: '0.95rem' }}>
                  ${film.boxOffice.toFixed(1)}M
                </span>
              </div>

              {/* Badges row */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.65rem', padding: '1px 6px', borderRadius: 4,
                  color: GENRE_COLORS[film.genre] || '#888',
                  background: (GENRE_COLORS[film.genre] || '#888') + '15',
                }}>{film.genre}</span>
                <span style={{
                  fontSize: '0.65rem', padding: '1px 6px', borderRadius: 4,
                  color: 'var(--gold)', background: 'rgba(212,168,67,0.1)',
                }}>Q:{film.quality}</span>
                <span style={{
                  fontSize: '0.65rem', padding: '1px 6px', borderRadius: 4,
                  color: TIER_COLORS[film.tier], background: (TIER_COLORS[film.tier] || '#888') + '15',
                }}>{film.tier}</span>
                <span style={{ fontSize: '0.6rem', color: '#666' }}>
                  Run #{film.runNumber} · S{film.season} · {film.runDate}
                </span>
              </div>

              {/* Notes */}
              {film.notes.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                  {film.notes.map((n, i) => (
                    <span key={i} style={{ fontSize: '0.6rem', color: '#f39c12', background: 'rgba(243,156,18,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                      {n}
                    </span>
                  ))}
                </div>
              )}

              {/* Expanded */}
              {isExpanded && (
                <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }} onClick={e => e.stopPropagation()}>
                  {film.cast.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Cast</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {film.cast.map((name, i) => (
                          <span key={i} style={{ fontSize: '0.75rem', color: '#ccc', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>
                            🎭 {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {film.studioName && (
                    <div style={{ fontSize: '0.7rem', color: '#888' }}>
                      Studio: <span style={{ color: 'var(--gold)' }}>{film.studioName}</span>
                      {film.archetype && <span> · {film.archetype}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
