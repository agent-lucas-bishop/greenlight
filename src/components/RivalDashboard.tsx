import { useState, useEffect, useRef } from 'react';
import { AIDirector, AI_DIRECTORS, DirectorFilm, DirectorStanding, BoxOfficeShowdown, LeaderboardEntry } from '../aiDirectors';
import { sfx } from '../sound';

// ─── R225: RIVAL DASHBOARD ───

interface RivalDashboardProps {
  standings: DirectorStanding[];
  leaderboard: LeaderboardEntry[];
  showdowns: BoxOfficeShowdown[];
  currentSeason: number;
  onClose?: () => void;
}

export function RivalDashboard({ standings, leaderboard, showdowns, currentSeason, onClose }: RivalDashboardProps) {
  const [tab, setTab] = useState<'leaderboard' | 'directors' | 'showdown'>('leaderboard');
  const [showdownIndex, setShowdownIndex] = useState(0);
  const [showdownRevealed, setShowdownRevealed] = useState(false);
  const [showdownPhase, setShowdownPhase] = useState<'intro' | 'versus' | 'result'>('intro');

  const soundedRef = useRef(false);

  // Auto-switch to showdown tab if there are collisions
  useEffect(() => {
    if (showdowns.length > 0) setTab('showdown');
  }, [showdowns.length]);

  // Play rival release sound on mount
  useEffect(() => {
    if (!soundedRef.current) {
      soundedRef.current = true;
      sfx.rivalFilmRelease();
    }
  }, []);

  return (
    <div style={{
      background: 'rgba(0,0,0,0.95)',
      border: '1px solid #444',
      borderRadius: 12,
      padding: 20,
      maxWidth: 700,
      margin: '0 auto',
    }}>
      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid #333', paddingBottom: 8 }}>
        <TabButton label="🏆 Leaderboard" active={tab === 'leaderboard'} onClick={() => setTab('leaderboard')} />
        <TabButton label="🎬 Directors" active={tab === 'directors'} onClick={() => setTab('directors')} />
        {showdowns.length > 0 && (
          <TabButton label={`⚔️ Showdown (${showdowns.length})`} active={tab === 'showdown'} onClick={() => setTab('showdown')} />
        )}
        {onClose && (
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18 }}>✕</button>
        )}
      </div>

      {/* Leaderboard Tab */}
      {tab === 'leaderboard' && (
        <div>
          <h3 style={{ color: '#f1c40f', margin: '0 0 12px', textAlign: 'center' }}>
            Season {currentSeason} Standings
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {leaderboard.map((entry, i) => (
              <div
                key={entry.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  background: entry.isPlayer ? 'rgba(46,204,113,0.15)' : i === 0 ? 'rgba(241,196,15,0.1)' : 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                  border: entry.isPlayer ? '1px solid rgba(46,204,113,0.4)' : '1px solid transparent',
                }}
              >
                <span style={{ width: 28, textAlign: 'center', fontWeight: 'bold', color: i === 0 ? '#f1c40f' : i === 1 ? '#bdc3c7' : i === 2 ? '#e67e22' : '#888' }}>
                  #{entry.rank}
                </span>
                <span ref={el => { if (el && !el.dataset.sounded && entry.isPlayer && (entry.movement === 'up' || entry.movement === 'down')) { el.dataset.sounded = '1'; sfx.leaderboardShift(entry.movement); } }}><MovementArrow movement={entry.movement} /></span>
                <span style={{ fontSize: 20 }}>{entry.portrait}</span>
                <span style={{ flex: 1, fontWeight: entry.isPlayer ? 'bold' : 'normal', color: entry.isPlayer ? '#2ecc71' : '#eee' }}>
                  {entry.name}
                  {entry.isPlayer && ' (You)'}
                </span>
                <span style={{ color: '#f1c40f', fontWeight: 'bold' }}>
                  ${entry.totalBO.toFixed(1)}M
                </span>
                <span style={{ color: '#888', fontSize: 12 }}>
                  {entry.filmCount} film{entry.filmCount !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Directors Tab */}
      {tab === 'directors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {standings.map(standing => {
            const dir = AI_DIRECTORS.find(d => d.id === standing.directorId);
            if (!dir) return null;
            const recentFilms = standing.films.slice(-3);
            return (
              <DirectorCard
                key={dir.id}
                director={dir}
                standing={standing}
                recentFilms={recentFilms}
              />
            );
          })}
        </div>
      )}

      {/* Showdown Tab */}
      {tab === 'showdown' && showdowns.length > 0 && (
        <ShowdownReveal
          showdown={showdowns[showdownIndex]}
          onNext={() => {
            if (showdownIndex < showdowns.length - 1) {
              setShowdownIndex(showdownIndex + 1);
              setShowdownRevealed(false);
              setShowdownPhase('intro');
            }
          }}
          hasNext={showdownIndex < showdowns.length - 1}
        />
      )}
    </div>
  );
}

// ─── SUB-COMPONENTS ───

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'rgba(241,196,15,0.2)' : 'transparent',
        border: active ? '1px solid rgba(241,196,15,0.4)' : '1px solid transparent',
        borderRadius: 6,
        color: active ? '#f1c40f' : '#888',
        padding: '6px 14px',
        cursor: 'pointer',
        fontWeight: active ? 'bold' : 'normal',
        fontSize: 13,
      }}
    >
      {label}
    </button>
  );
}

function MovementArrow({ movement }: { movement: 'up' | 'down' | 'same' | 'new' }) {
  if (movement === 'up') return <span style={{ color: '#2ecc71', fontSize: 14, width: 18 }}>▲</span>;
  if (movement === 'down') return <span style={{ color: '#e74c3c', fontSize: 14, width: 18 }}>▼</span>;
  if (movement === 'new') return <span style={{ color: '#3498db', fontSize: 14, width: 18 }}>★</span>;
  return <span style={{ color: '#555', fontSize: 14, width: 18 }}>─</span>;
}

function DirectorCard({ director, standing, recentFilms }: { director: AIDirector; standing: DirectorStanding; recentFilms: DirectorFilm[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 10,
        padding: 14,
        border: '1px solid #333',
        cursor: 'pointer',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }}>{director.portrait}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', color: '#eee' }}>{director.name}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{director.description}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#f1c40f', fontWeight: 'bold' }}>${standing.totalBoxOffice.toFixed(1)}M</div>
          <div style={{ fontSize: 11, color: '#888' }}>Rank #{standing.currentRank}</div>
        </div>
      </div>

      {/* Head-to-head */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12 }}>
        <span style={{ color: '#888' }}>
          vs You: <span style={{ color: '#2ecc71' }}>{standing.lossesVsPlayer}W</span> - <span style={{ color: '#e74c3c' }}>{standing.winsVsPlayer}L</span>
        </span>
        <span style={{ color: '#888' }}>Films: {standing.films.length}</span>
        <span style={{ color: '#888' }}>Genres: {director.preferredGenres.join(', ')}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 10, borderTop: '1px solid #333', paddingTop: 8 }}>
          <div style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic', marginBottom: 6 }}>
            "{director.catchphrase}"
          </div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
            Strategy: {director.strategyStyle} · Budget: {director.budgetStyle} · Talent: {director.talentPreference}
          </div>
          {recentFilms.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Recent Films:</div>
              {recentFilms.map((f, i) => (
                <div key={i} style={{ fontSize: 12, color: '#aaa', display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span>{f.title} ({f.genre})</span>
                  <span style={{ color: tierColor(f.tier) }}>${f.boxOffice.toFixed(1)}M {f.tier}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ShowdownReveal({ showdown, onNext, hasNext }: { showdown: BoxOfficeShowdown; onNext: () => void; hasNext: boolean }) {
  const [phase, setPhase] = useState<'intro' | 'versus' | 'result'>('intro');

  useEffect(() => {
    setPhase('intro');
    sfx.boxOfficeShowdown();
    const t1 = setTimeout(() => setPhase('versus'), 800);
    const t2 = setTimeout(() => setPhase('result'), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [showdown]);

  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      {phase === 'intro' && (
        <div className="animate-pulse" style={{ fontSize: 24, color: '#e74c3c', fontWeight: 'bold' }}>
          ⚔️ BOX OFFICE SHOWDOWN ⚔️
        </div>
      )}

      {phase !== 'intro' && (
        <>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 12 }}>
            Same genre collision: <span style={{ color: '#f1c40f' }}>{showdown.playerGenre}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 20 }}>
            {/* Player side */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36 }}>🎬</div>
              <div style={{ fontWeight: 'bold', color: '#2ecc71', marginTop: 4 }}>You</div>
              <div style={{ fontSize: 13, color: '#aaa' }}>{showdown.playerFilmTitle}</div>
              {phase === 'result' && (
                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#f1c40f', marginTop: 8 }}>
                  ${showdown.playerBO.toFixed(1)}M
                </div>
              )}
            </div>

            {/* VS */}
            <div style={{ fontSize: 20, color: '#e74c3c', fontWeight: 'bold' }}>VS</div>

            {/* Rival side */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36 }}>{showdown.rivalDirector.portrait}</div>
              <div style={{ fontWeight: 'bold', color: '#e74c3c', marginTop: 4 }}>{showdown.rivalDirector.name}</div>
              <div style={{ fontSize: 13, color: '#aaa' }}>{showdown.rivalFilm.title}</div>
              {phase === 'result' && (
                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#f1c40f', marginTop: 8 }}>
                  ${showdown.rivalFilm.boxOffice.toFixed(1)}M
                </div>
              )}
            </div>
          </div>

          {phase === 'result' && (
            <div>
              <div style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: showdown.playerWon ? '#2ecc71' : '#e74c3c',
                marginBottom: 8,
              }}>
                {showdown.playerWon ? '🎉 YOU WIN!' : '💀 YOU LOSE!'}
              </div>
              <div style={{ color: '#888', fontSize: 13 }}>
                {showdown.playerWon
                  ? `You beat ${showdown.rivalDirector.name} by $${showdown.margin.toFixed(1)}M!`
                  : `${showdown.rivalDirector.name} beat you by $${showdown.margin.toFixed(1)}M!`
                }
              </div>
              {hasNext && (
                <button
                  onClick={onNext}
                  style={{
                    marginTop: 16,
                    padding: '8px 20px',
                    background: 'rgba(241,196,15,0.2)',
                    border: '1px solid rgba(241,196,15,0.4)',
                    borderRadius: 6,
                    color: '#f1c40f',
                    cursor: 'pointer',
                  }}
                >
                  Next Showdown →
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function tierColor(tier: string): string {
  switch (tier) {
    case 'BLOCKBUSTER': return '#f1c40f';
    case 'SMASH': return '#2ecc71';
    case 'HIT': return '#3498db';
    case 'FLOP': return '#e74c3c';
    default: return '#888';
  }
}

// ─── RIVAL PREVIEW (for StartScreen) ───

export function RivalPreview() {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.6)',
      borderRadius: 10,
      padding: 14,
      border: '1px solid #333',
      maxWidth: 500,
      margin: '0 auto',
    }}>
      <h4 style={{ color: '#f1c40f', margin: '0 0 10px', textAlign: 'center' }}>
        ⚔️ Your Rivals
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {AI_DIRECTORS.map(dir => (
          <div key={dir.id} style={{ textAlign: 'center', padding: 6 }}>
            <div style={{ fontSize: 24 }}>{dir.portrait}</div>
            <div style={{ fontSize: 11, color: '#ccc', fontWeight: 'bold' }}>{dir.name.split(' ')[0]}</div>
            <div style={{ fontSize: 10, color: '#888' }}>{dir.preferredGenres[0]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
