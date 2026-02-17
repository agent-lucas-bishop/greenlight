import { useState, useMemo, lazy, Suspense } from 'react';
import { getFilmArchive, getEarnedMilestones, MILESTONE_THRESHOLDS, type ArchiveFilm } from '../filmArchive';
import { loadReplays, deleteReplay, exportReplayBase64, importReplayBase64, addImportedReplay, computeReplayStats, extractSeasonSummaries, type ReplayData } from '../replaySystem';
const ReplayTimeline = lazy(() => import('./ReplayTimeline'));

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

function ReplayRuns() {
  const [replays, setReplays] = useState(() => loadReplays());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    deleteReplay(id);
    setReplays(loadReplays());
    if (expandedId === id) setExpandedId(null);
    if (compareId === id) setCompareId(null);
  };

  const handleExport = (replay: ReplayData) => {
    const encoded = exportReplayBase64(replay);
    navigator.clipboard.writeText(encoded).then(() => {
      setCopiedId(replay.id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => { /* fallback: show in textarea */ });
  };

  const handleImport = () => {
    setImportError('');
    const data = importReplayBase64(importText.trim());
    if (!data) { setImportError('Invalid replay data'); return; }
    addImportedReplay(data);
    setReplays(loadReplays());
    setImportText('');
  };

  if (replays.length === 0) {
    return (
      <div>
        <div className="empty-state">
          <div className="empty-state-icon">📼</div>
          <div className="empty-state-title">No Replays Recorded</div>
          <div className="empty-state-desc">Replays are automatically saved when you complete a run. Last 10 are kept.</div>
        </div>
        {/* Import section */}
        <div style={{ marginTop: 16, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid #222' }}>
          <div style={{ color: '#888', fontSize: '0.7rem', marginBottom: 6 }}>📥 Import Replay</div>
          <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Paste base64 replay string..." rows={3}
            style={{ width: '100%', background: '#1a1a1a', color: '#ccc', border: '1px solid #333', borderRadius: 6, padding: 8, fontSize: '0.75rem', resize: 'vertical', fontFamily: 'monospace' }} />
          {importError && <div style={{ color: '#e74c3c', fontSize: '0.7rem', marginTop: 4 }}>{importError}</div>}
          <button className="btn btn-small" onClick={handleImport} disabled={!importText.trim()} style={{ marginTop: 6, opacity: importText.trim() ? 1 : 0.4 }}>Import</button>
        </div>
      </div>
    );
  }

  const expanded = replays.find(r => r.id === expandedId);
  const compared = replays.find(r => r.id === compareId);

  return (
    <div>
      {/* Compare mode banner */}
      {compareId && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(52,152,219,0.1)', border: '1px solid rgba(52,152,219,0.3)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#3498db', fontSize: '0.75rem' }}>📊 Comparing with: {compared?.studioName || 'Unknown'}</span>
          <button className="btn btn-small" style={{ fontSize: '0.6rem', padding: '2px 8px' }} onClick={() => setCompareId(null)}>✕ Cancel</button>
        </div>
      )}

      {/* Run list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {replays.slice().reverse().map(replay => {
          const isExpanded = expandedId === replay.id;
          const stats = computeReplayStats(replay);
          const duration = replay.endTime > 0 ? Math.round((replay.endTime - replay.startTime) / 60000) : 0;
          const date = new Date(replay.startTime).toLocaleDateString();

          return (
            <div key={replay.id} style={{
              padding: '14px 16px', background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${replay.won ? 'rgba(46,204,113,0.2)' : 'rgba(231,76,60,0.2)'}`,
              borderRadius: 8,
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setExpandedId(isExpanded ? null : replay.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: replay.won ? '#2ecc71' : '#e74c3c', fontSize: '0.8rem', fontWeight: 700 }}>
                    {replay.won ? '🏆' : '💀'}
                  </span>
                  <span style={{ color: 'var(--gold)', fontSize: '0.9rem', fontWeight: 600 }}>{replay.studioName}</span>
                  <span style={{ color: '#666', fontSize: '0.65rem' }}>{date}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{replay.score} pts</span>
                  <span style={{ color: '#999', fontSize: '0.75rem', transform: isExpanded ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>▾</span>
                </div>
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                <span style={{ fontSize: '0.6rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4 }}>
                  {replay.difficulty}
                </span>
                <span style={{ fontSize: '0.6rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4 }}>
                  {replay.gameMode}
                </span>
                <span style={{ fontSize: '0.6rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4 }}>
                  {replay.seasons} seasons
                </span>
                <span style={{ fontSize: '0.6rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4 }}>
                  ${replay.totalBO.toFixed(1)}M
                </span>
                {duration > 0 && (
                  <span style={{ fontSize: '0.6rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4 }}>
                    {duration}m
                  </span>
                )}
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                  {/* Stats summary */}
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                    {stats.bestFilm && (
                      <div style={{ flex: 1, minWidth: 130 }}>
                        <div style={{ color: '#999', fontSize: '0.55rem', textTransform: 'uppercase' }}>👑 Best Film</div>
                        <div style={{ color: '#2ecc71', fontSize: '0.8rem', fontWeight: 600 }}>"{stats.bestFilm.title}"</div>
                        <div style={{ color: '#888', fontSize: '0.6rem' }}>{stats.bestFilm.genre} · ${stats.bestFilm.boxOffice.toFixed(1)}M</div>
                      </div>
                    )}
                    {stats.worstFlop && (
                      <div style={{ flex: 1, minWidth: 130 }}>
                        <div style={{ color: '#999', fontSize: '0.55rem', textTransform: 'uppercase' }}>💀 Worst Flop</div>
                        <div style={{ color: '#e74c3c', fontSize: '0.8rem', fontWeight: 600 }}>"{stats.worstFlop.title}"</div>
                        <div style={{ color: '#888', fontSize: '0.6rem' }}>{stats.worstFlop.genre} · ${stats.worstFlop.boxOffice.toFixed(1)}M</div>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>${stats.totalEarnings.toFixed(1)}M</div>
                        <div style={{ color: '#999', fontSize: '0.5rem' }}>TOTAL BO</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{stats.averageQuality}</div>
                        <div style={{ color: '#999', fontSize: '0.5rem' }}>AVG QUALITY</div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <Suspense fallback={<div style={{ color: '#666', fontSize: '0.75rem', padding: 12 }}>Loading timeline...</div>}>
                    <ReplayTimeline replay={replay} />
                  </Suspense>

                  {/* Season details */}
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ color: '#999', fontSize: '0.7rem', cursor: 'pointer' }}>Season-by-season details</summary>
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {extractSeasonSummaries(replay).map(s => (
                        <div key={s.season} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: `1px solid ${(TIER_COLORS[s.tier] || '#333') + '22'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#999', fontFamily: 'Bebas Neue', fontSize: '0.75rem' }}>S{s.season}</span>
                            <span style={{ color: '#ddd', fontSize: '0.8rem', fontWeight: 600 }}>"{s.filmTitle}"</span>
                            <span style={{ color: TIER_COLORS[s.tier], fontSize: '0.7rem' }}>{TIER_EMOJI[s.tier]} ${s.boxOffice.toFixed(1)}M</span>
                          </div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.55rem', color: GENRE_COLORS[s.genre] || '#888', background: (GENRE_COLORS[s.genre] || '#888') + '15', padding: '1px 5px', borderRadius: 3 }}>{s.genre}</span>
                            <span style={{ fontSize: '0.55rem', color: '#aaa', background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: 3 }}>Q:{s.quality}</span>
                            <span style={{ fontSize: '0.55rem', color: '#aaa', background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: 3 }}>{s.cardsPlayed.length} cards</span>
                            {s.marketing && <span style={{ fontSize: '0.55rem', color: '#3498db', background: 'rgba(52,152,219,0.1)', padding: '1px 5px', borderRadius: 3 }}>📢 {s.marketing}</span>}
                            {s.festivalAward && <span style={{ fontSize: '0.55rem', color: '#ffd700', background: 'rgba(255,215,0,0.1)', padding: '1px 5px', borderRadius: 3 }}>🏆 {s.festivalAward}</span>}
                            {s.encoreResult && <span style={{ fontSize: '0.55rem', color: s.encoreResult === 'Success' ? '#2ecc71' : '#e74c3c', background: s.encoreResult === 'Success' ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)', padding: '1px 5px', borderRadius: 3 }}>🌟 Encore: {s.encoreResult}</span>}
                          </div>
                          {s.events.length > 0 && (
                            <div style={{ marginTop: 3 }}>
                              {s.events.map((evt, j) => <span key={j} style={{ fontSize: '0.5rem', color: '#f39c12', marginRight: 4 }}>📰 {evt}</span>)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>

                  {/* Key Moments */}
                  {replay.moments.length > 0 && (
                    <details style={{ marginTop: 8 }}>
                      <summary style={{ color: '#999', fontSize: '0.7rem', cursor: 'pointer' }}>Key Moments ({replay.moments.length})</summary>
                      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {replay.moments.map((m, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ccc' }}>{m.label}</span>
                            <span style={{ fontSize: '0.65rem', color: '#888' }}>{m.description}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <button className="btn btn-small" style={{ fontSize: '0.6rem', color: '#3498db', borderColor: 'rgba(52,152,219,0.3)' }} onClick={() => handleExport(replay)}>
                      {copiedId === replay.id ? '✅ Copied!' : '📤 Share'}
                    </button>
                    {!compareId ? (
                      <button className="btn btn-small" style={{ fontSize: '0.6rem', color: '#9b59b6', borderColor: 'rgba(155,89,182,0.3)' }} onClick={() => setCompareId(replay.id)}>
                        📊 Compare
                      </button>
                    ) : compareId !== replay.id ? (
                      <CompareView a={compared!} b={replay} />
                    ) : null}
                    <button className="btn btn-small" style={{ fontSize: '0.6rem', color: '#e74c3c', borderColor: 'rgba(231,76,60,0.3)' }} onClick={() => handleDelete(replay.id)}>
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Import section */}
      <div style={{ marginTop: 16, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid #222' }}>
        <div style={{ color: '#888', fontSize: '0.7rem', marginBottom: 6 }}>📥 Import Replay</div>
        <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Paste base64 replay string..." rows={2}
          style={{ width: '100%', background: '#1a1a1a', color: '#ccc', border: '1px solid #333', borderRadius: 6, padding: 8, fontSize: '0.7rem', resize: 'vertical', fontFamily: 'monospace' }} />
        {importError && <div style={{ color: '#e74c3c', fontSize: '0.7rem', marginTop: 4 }}>{importError}</div>}
        <button className="btn btn-small" onClick={handleImport} disabled={!importText.trim()} style={{ marginTop: 6, opacity: importText.trim() ? 1 : 0.4 }}>Import</button>
      </div>
    </div>
  );
}

function CompareView({ a, b }: { a: ReplayData; b: ReplayData }) {
  const statsA = computeReplayStats(a);
  const statsB = computeReplayStats(b);
  const rows: { label: string; valA: string; valB: string; better: 'a' | 'b' | 'tie' }[] = [
    { label: 'Score', valA: `${a.score}`, valB: `${b.score}`, better: a.score > b.score ? 'a' : a.score < b.score ? 'b' : 'tie' },
    { label: 'Total BO', valA: `$${statsA.totalEarnings.toFixed(1)}M`, valB: `$${statsB.totalEarnings.toFixed(1)}M`, better: statsA.totalEarnings > statsB.totalEarnings ? 'a' : statsA.totalEarnings < statsB.totalEarnings ? 'b' : 'tie' },
    { label: 'Avg Quality', valA: `${statsA.averageQuality}`, valB: `${statsB.averageQuality}`, better: statsA.averageQuality > statsB.averageQuality ? 'a' : statsA.averageQuality < statsB.averageQuality ? 'b' : 'tie' },
    { label: 'Blockbusters', valA: `${statsA.blockbusterCount}`, valB: `${statsB.blockbusterCount}`, better: statsA.blockbusterCount > statsB.blockbusterCount ? 'a' : statsA.blockbusterCount < statsB.blockbusterCount ? 'b' : 'tie' },
    { label: 'Flops', valA: `${statsA.flopCount}`, valB: `${statsB.flopCount}`, better: statsA.flopCount < statsB.flopCount ? 'a' : statsA.flopCount > statsB.flopCount ? 'b' : 'tie' },
  ];

  return (
    <div style={{ marginTop: 8, padding: 10, background: 'rgba(52,152,219,0.06)', border: '1px solid rgba(52,152,219,0.15)', borderRadius: 8, width: '100%' }}>
      <div style={{ color: '#3498db', fontSize: '0.7rem', fontWeight: 700, marginBottom: 8 }}>📊 Side-by-Side</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '4px 12px', fontSize: '0.7rem' }}>
        <div style={{ color: 'var(--gold)', fontWeight: 600, textAlign: 'right' }}>{a.studioName}</div>
        <div style={{ color: '#666' }}>vs</div>
        <div style={{ color: 'var(--gold)', fontWeight: 600 }}>{b.studioName}</div>
        {rows.map(r => (
          <div key={r.label} style={{ display: 'contents' }}>
            <div style={{ textAlign: 'right', color: r.better === 'a' ? '#2ecc71' : '#999' }}>{r.valA}</div>
            <div style={{ color: '#555', textAlign: 'center' }}>{r.label}</div>
            <div style={{ color: r.better === 'b' ? '#2ecc71' : '#999' }}>{r.valB}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FilmArchive() {
  const [subTab, setSubTab] = useState<'films' | 'runs'>('films');
  return (
    <div style={{ maxWidth: 650, margin: '0 auto' }}>
      {/* Sub-tab toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
        <button className="btn btn-small" onClick={() => setSubTab('films')} style={{
          color: subTab === 'films' ? 'var(--gold)' : '#666',
          borderColor: subTab === 'films' ? 'var(--gold-dim)' : 'rgba(255,255,255,0.1)',
          background: subTab === 'films' ? 'rgba(212,168,67,0.1)' : 'transparent',
        }}>🎞️ Films</button>
        <button className="btn btn-small" onClick={() => setSubTab('runs')} style={{
          color: subTab === 'runs' ? '#3498db' : '#666',
          borderColor: subTab === 'runs' ? 'rgba(52,152,219,0.4)' : 'rgba(255,255,255,0.1)',
          background: subTab === 'runs' ? 'rgba(52,152,219,0.1)' : 'transparent',
        }}>📼 Replays</button>
      </div>

      {subTab === 'runs' ? <ReplayRuns /> : <FilmList />}
    </div>
  );
}

function FilmList() {
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
