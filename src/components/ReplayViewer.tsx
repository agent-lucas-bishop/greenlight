/**
 * R211: Replay Viewer Component
 * Step-by-step playback of recorded runs with timeline, comparison, and export.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { ReplayData, ReplayEvent, ReplayMoment } from '../replay';
import { loadReplays, deleteReplay, describeEvent, exportReplay, importReplay, addImportedReplay } from '../replay';

// ─── Styles ───

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    zIndex: 9000,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', system-ui, sans-serif",
    color: '#e0e0e0',
  },
  panel: {
    background: '#1a1a2e',
    borderRadius: 12,
    border: '1px solid #333',
    width: '90vw',
    maxWidth: 900,
    maxHeight: '85vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #333',
    background: '#16213e',
  },
  title: { fontSize: 18, fontWeight: 700, margin: 0 },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#999',
    fontSize: 20,
    cursor: 'pointer',
    padding: '4px 8px',
  },
  body: {
    flex: 1,
    overflow: 'auto',
    padding: 20,
  },
  btn: {
    background: '#2d3436',
    border: '1px solid #555',
    color: '#e0e0e0',
    padding: '6px 14px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
  },
  btnPrimary: {
    background: '#0984e3',
    border: '1px solid #0984e3',
    color: '#fff',
    padding: '6px 14px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
  },
  replayCard: {
    background: '#16213e',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '12px 16px',
    marginBottom: 8,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  eventRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 12px',
    borderRadius: 6,
    transition: 'background 0.15s',
  },
  eventIcon: { fontSize: 18, width: 28, textAlign: 'center' as const },
  eventTitle: { fontWeight: 600, fontSize: 13 },
  eventDetail: { fontSize: 12, color: '#999', marginTop: 2 },
  eventTime: { fontSize: 11, color: '#666', minWidth: 50, textAlign: 'right' as const },
  timeline: {
    width: '100%',
    height: 6,
    background: '#2d3436',
    borderRadius: 3,
    position: 'relative' as const,
    cursor: 'pointer',
    margin: '12px 0',
  },
  timelineFill: {
    height: '100%',
    borderRadius: 3,
    background: 'linear-gradient(90deg, #0984e3, #6c5ce7)',
    transition: 'width 0.15s',
  },
  moment: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: '#2d3436',
    border: '1px solid #555',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 12,
    cursor: 'pointer',
    margin: '0 4px 4px 0',
  },
  stateBar: {
    display: 'flex',
    gap: 16,
    padding: '8px 12px',
    background: '#0d1b2a',
    borderRadius: 6,
    fontSize: 12,
    marginBottom: 8,
  },
  nav: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    padding: '12px 0',
    borderTop: '1px solid #333',
    marginTop: 8,
  },
  compareCol: {
    flex: 1,
    minWidth: 0,
    overflow: 'auto',
    maxHeight: '60vh',
  },
};

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Replay List View ───

function ReplayList({ onSelect, onCompare, onImport }: {
  onSelect: (r: ReplayData) => void;
  onCompare: (a: ReplayData, b: ReplayData) => void;
  onImport: () => void;
}) {
  const [replays, setReplays] = useState(() => loadReplays());
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    if (e.shiftKey) {
      setSelected(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]
      );
    } else {
      const replay = replays.find(r => r.id === id);
      if (replay) onSelect(replay);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteReplay(id);
    setReplays(loadReplays());
    setSelected(prev => prev.filter(x => x !== id));
  };

  const handleExport = (replay: ReplayData, e: React.MouseEvent) => {
    e.stopPropagation();
    const json = exportReplay(replay);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `replay-${replay.studioName.replace(/\s+/g, '-')}-${new Date(replay.startTime).toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canCompare = selected.length === 2;
  const compareReplays = () => {
    if (!canCompare) return;
    const a = replays.find(r => r.id === selected[0]);
    const b = replays.find(r => r.id === selected[1]);
    if (a && b) onCompare(a, b);
  };

  if (replays.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
        <p style={{ fontSize: 16, marginBottom: 8 }}>No replays yet</p>
        <p style={{ fontSize: 13 }}>Complete a run to record your first replay!</p>
        <button style={{ ...styles.btn, marginTop: 16 }} onClick={onImport}>📥 Import Replay</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#999' }}>
          {replays.length} replay{replays.length !== 1 ? 's' : ''} • Shift+click to select for comparison
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={styles.btn} onClick={onImport}>📥 Import</button>
          {canCompare && (
            <button style={styles.btnPrimary} onClick={compareReplays}>⚔️ Compare Selected</button>
          )}
        </div>
      </div>
      {replays.slice().reverse().map(r => (
        <div
          key={r.id}
          style={{
            ...styles.replayCard,
            borderColor: selected.includes(r.id) ? '#0984e3' : '#333',
          }}
          onClick={(e) => toggleSelect(r.id, e)}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {r.won ? '🏆' : '💔'} {r.studioName}
            </div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
              {formatDate(r.startTime)} • {r.seasons} seasons • ${r.totalBO}M • Score {r.score} • {r.difficulty}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={styles.btn} onClick={(e) => handleExport(r, e)} title="Export JSON">📤</button>
            <button style={{ ...styles.btn, color: '#e74c3c' }} onClick={(e) => handleDelete(r.id, e)} title="Delete">🗑️</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Single Replay Playback ───

function ReplayPlayback({ replay, onBack }: { replay: ReplayData; onBack: () => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const eventListRef = useRef<HTMLDivElement>(null);
  const events = replay.events;
  const totalEvents = events.length;

  const currentEvent = events[currentIdx];
  const described = currentEvent ? describeEvent(currentEvent) : null;

  // State at current point (accumulated from state snapshots in events)
  const stateAtPoint = useMemo(() => {
    // Find the most recent event with state snapshot up to currentIdx
    for (let i = currentIdx; i >= 0; i--) {
      const e = events[i];
      if (e.d.state) return e.d.state as Record<string, unknown>;
    }
    return null;
  }, [currentIdx, events]);

  const goTo = useCallback((idx: number) => {
    setCurrentIdx(Math.max(0, Math.min(idx, totalEvents - 1)));
  }, [totalEvents]);

  const prev = () => goTo(currentIdx - 1);
  const next = () => goTo(currentIdx + 1);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // Scroll active event into view
  useEffect(() => {
    const el = eventListRef.current?.querySelector(`[data-idx="${currentIdx}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentIdx]);

  // Timeline click
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    goTo(Math.round(pct * (totalEvents - 1)));
  };

  // Season boundaries for timeline markers
  const seasonBoundaries = useMemo(() => {
    const boundaries: { idx: number; season: number }[] = [];
    let lastSeason = 0;
    events.forEach((e, i) => {
      if (e.s !== lastSeason) {
        boundaries.push({ idx: i, season: e.s });
        lastSeason = e.s;
      }
    });
    return boundaries;
  }, [events]);

  return (
    <div>
      {/* Header info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button style={styles.btn} onClick={onBack}>← Back</button>
        <div style={{ textAlign: 'right', fontSize: 13, color: '#999' }}>
          {replay.won ? '🏆' : '💔'} {replay.studioName} • {replay.seasons} seasons • ${replay.totalBO}M
        </div>
      </div>

      {/* Key Moments */}
      {replay.moments.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>Key Moments:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {replay.moments.map((m, i) => (
              <button
                key={i}
                style={styles.moment}
                onClick={() => goTo(m.eventIndex)}
                title={m.description}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timeline scrubber */}
      <div style={styles.timeline} onClick={handleTimelineClick}>
        <div style={{ ...styles.timelineFill, width: `${((currentIdx + 1) / totalEvents) * 100}%` }} />
        {/* Season markers */}
        {seasonBoundaries.map(({ idx, season }) => (
          <div
            key={season}
            style={{
              position: 'absolute',
              left: `${(idx / totalEvents) * 100}%`,
              top: -14,
              fontSize: 9,
              color: '#666',
              transform: 'translateX(-50%)',
            }}
          >
            S{season}
          </div>
        ))}
        {/* Moment markers */}
        {replay.moments.map((m, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${(m.eventIndex / totalEvents) * 100}%`,
              top: -2,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: m.type === 'blockbuster' ? '#2ecc71' : m.type === 'biggest_flop' ? '#e74c3c' : '#f1c40f',
              transform: 'translateX(-50%)',
              cursor: 'pointer',
              border: '2px solid #1a1a2e',
            }}
            title={m.label}
            onClick={(e) => { e.stopPropagation(); goTo(m.eventIndex); }}
          />
        ))}
      </div>

      {/* State bar */}
      {stateAtPoint && (
        <div style={styles.stateBar}>
          <span>💰 ${stateAtPoint.budget as number}M</span>
          <span>⭐ Rep {stateAtPoint.rep as number}</span>
          <span>❌ {stateAtPoint.strikes as number} strikes</span>
          <span>💵 ${stateAtPoint.earnings as number}M earned</span>
          <span>👥 {stateAtPoint.rosterSize as number} talent</span>
          {(stateAtPoint.debt as number) > 0 && <span style={{ color: '#e74c3c' }}>🏦 ${stateAtPoint.debt as number}M debt</span>}
        </div>
      )}

      {/* Current event detail */}
      {described && (
        <div style={{
          background: '#0d1b2a',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 8,
          border: '1px solid #0984e3',
        }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>{described.icon}</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{described.title}</div>
          <div style={{ fontSize: 13, color: '#bbb', marginTop: 4 }}>{described.detail}</div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
            Season {currentEvent.s} • {formatTime(currentEvent.ts)} into run • Event {currentIdx + 1}/{totalEvents}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={styles.nav}>
        <button style={styles.btn} onClick={() => goTo(0)} disabled={currentIdx === 0}>⏮</button>
        <button style={styles.btn} onClick={prev} disabled={currentIdx === 0}>◀ Prev</button>
        <span style={{ fontSize: 13, color: '#999', flex: 1, textAlign: 'center' }}>
          {currentIdx + 1} / {totalEvents}
        </span>
        <button style={styles.btn} onClick={next} disabled={currentIdx >= totalEvents - 1}>Next ▶</button>
        <button style={styles.btn} onClick={() => goTo(totalEvents - 1)} disabled={currentIdx >= totalEvents - 1}>⏭</button>
      </div>

      {/* Event list */}
      <div ref={eventListRef} style={{ maxHeight: 250, overflow: 'auto', marginTop: 8 }}>
        {events.map((e, i) => {
          const desc = describeEvent(e);
          const isActive = i === currentIdx;
          return (
            <div
              key={i}
              data-idx={i}
              style={{
                ...styles.eventRow,
                background: isActive ? '#0d1b2a' : 'transparent',
                cursor: 'pointer',
                borderLeft: isActive ? '3px solid #0984e3' : '3px solid transparent',
              }}
              onClick={() => goTo(i)}
            >
              <span style={styles.eventIcon}>{desc.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.eventTitle}>{desc.title}</div>
                <div style={styles.eventDetail}>{desc.detail}</div>
              </div>
              <span style={styles.eventTime}>{formatTime(e.ts)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Comparison View ───

function ReplayComparison({ replayA, replayB, onBack }: {
  replayA: ReplayData;
  replayB: ReplayData;
  onBack: () => void;
}) {
  const renderSummary = (r: ReplayData) => {
    const seasonResults = r.events.filter(e => e.t === 'season_result');
    const genres = [...new Set(seasonResults.map(e => e.d.genre as string))];
    const avgQuality = seasonResults.length > 0
      ? Math.round(seasonResults.reduce((s, e) => s + (e.d.quality as number), 0) / seasonResults.length)
      : 0;
    const perks = r.events.filter(e => e.t === 'perk_buy').map(e => e.d.name as string);
    const talentHires = r.events.filter(e => e.t === 'talent_hire').length;

    return (
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
          {r.won ? '🏆' : '💔'} {r.studioName}
        </div>
        <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
          {formatDate(r.startTime)} • {r.difficulty}
        </div>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <tbody>
            {[
              ['Score', r.score],
              ['Total BO', `$${r.totalBO}M`],
              ['Seasons', r.seasons],
              ['Events', r.events.length],
              ['Avg Quality', avgQuality],
              ['Genres', genres.join(', ')],
              ['Talent Hired', talentHires],
              ['Perks', perks.join(', ') || 'None'],
            ].map(([label, val]) => (
              <tr key={label as string} style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: '4px 8px', color: '#999' }}>{label}</td>
                <td style={{ padding: '4px 8px', fontWeight: 600 }}>{val}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Season-by-season results */}
        <div style={{ marginTop: 12, fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Season Results:</div>
          {seasonResults.map((e, i) => {
            const tierColors: Record<string, string> = { BLOCKBUSTER: '#2ecc71', SMASH: '#f1c40f', HIT: '#e67e22', FLOP: '#e74c3c' };
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #222' }}>
                <span>S{e.s}: "{e.d.title}"</span>
                <span style={{ color: tierColors[e.d.tier as string] || '#999' }}>
                  {e.d.tier} ${e.d.boxOffice}M
                </span>
              </div>
            );
          })}
        </div>

        {/* Key moments */}
        {r.moments.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Key Moments:</div>
            {r.moments.map((m, i) => (
              <div key={i} style={{ fontSize: 12, color: '#bbb', marginBottom: 4 }}>
                {m.label}: {m.description}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button style={styles.btn} onClick={onBack}>← Back</button>
        <span style={{ fontSize: 15, fontWeight: 700 }}>⚔️ Replay Comparison</span>
        <div />
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ ...styles.compareCol, borderRight: '1px solid #333', paddingRight: 16 }}>
          {renderSummary(replayA)}
        </div>
        <div style={styles.compareCol}>
          {renderSummary(replayB)}
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ───

type ViewMode = 'list' | 'playback' | 'compare';

export default function ReplayViewer({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<ViewMode>('list');
  const [selectedReplay, setSelectedReplay] = useState<ReplayData | null>(null);
  const [compareA, setCompareA] = useState<ReplayData | null>(null);
  const [compareB, setCompareB] = useState<ReplayData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (r: ReplayData) => {
    setSelectedReplay(r);
    setMode('playback');
  };

  const handleCompare = (a: ReplayData, b: ReplayData) => {
    setCompareA(a);
    setCompareB(b);
    setMode('compare');
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const replay = importReplay(reader.result as string);
      if (replay) {
        addImportedReplay(replay);
        // Force re-render
        setMode('list');
      } else {
        alert('Invalid replay file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <h2 style={styles.title}>🎬 Run Replays</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={styles.body}>
          {mode === 'list' && (
            <ReplayList
              onSelect={handleSelect}
              onCompare={handleCompare}
              onImport={handleImport}
            />
          )}
          {mode === 'playback' && selectedReplay && (
            <ReplayPlayback
              replay={selectedReplay}
              onBack={() => setMode('list')}
            />
          )}
          {mode === 'compare' && compareA && compareB && (
            <ReplayComparison
              replayA={compareA}
              replayB={compareB}
              onBack={() => setMode('list')}
            />
          )}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}
