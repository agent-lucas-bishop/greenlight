import { useState, useEffect, useRef } from 'react';
import { sfx } from '../sound';
import {
  getHallOfFameTop10,
  getHallOfFameByEarnings,
  getTotalCareerEarnings,
  getTotalCareerFilms,
  getLegacyFilms,
  generateFilmPoster,
  getMilestoneProgress,
  getActiveTitles,
  isEndlessUnlocked,
  getEndlessLeaderboard,
  STUDIO_MILESTONES,
} from '../endgame';
import { DIFFICULTIES } from '../difficulty';

type SortMode = 'score' | 'earnings';

export default function HallOfFameTab() {
  const [sortMode, setSortMode] = useState<SortMode>('score');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showLegacy, setShowLegacy] = useState(false);

  const top10 = sortMode === 'score' ? getHallOfFameTop10() : getHallOfFameByEarnings();
  const totalEarnings = getTotalCareerEarnings();
  const totalFilms = getTotalCareerFilms();
  const legacyFilms = getLegacyFilms();
  const milestones = getMilestoneProgress();
  const activeTitles = getActiveTitles();
  const endlessLb = getEndlessLeaderboard();

  // R182: Play entrance theme on first mount
  const entrancePlayed = useRef(false);
  useEffect(() => {
    if (!entrancePlayed.current && top10.length > 0) {
      entrancePlayed.current = true;
      sfx.hallOfFameEntrance();
    }
  }, []);

  const rankColors: Record<string, string> = { S: '#ff6b6b', A: '#ffd93d', B: '#6bcb77', C: '#5dade2', D: '#999' };
  const tierColors: Record<string, string> = { BLOCKBUSTER: '#2ecc71', SMASH: '#f1c40f', HIT: '#e67e22', FLOP: '#e74c3c' };

  if (top10.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🏛️</div>
        <div className="empty-state-title">Hall of Fame Awaits</div>
        <div className="empty-state-desc">Complete runs to enshrine your greatest achievements here.</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Career Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(212,168,67,0.15) 0%, rgba(212,168,67,0.04) 100%)',
        border: '2px solid rgba(212,168,67,0.4)', borderRadius: 16,
        padding: '20px 24px', textAlign: 'center', marginBottom: 24,
      }}>
        <div style={{ fontSize: '2rem', marginBottom: 4 }}>🏛️</div>
        <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.6rem', letterSpacing: 3 }}>
          HALL OF FAME
        </div>
        {activeTitles.length > 0 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            {activeTitles.map((t, i) => (
              <span key={i} style={{
                background: 'rgba(212,168,67,0.15)', border: '1px solid rgba(212,168,67,0.3)',
                borderRadius: 6, padding: '3px 10px', fontSize: '0.75rem', color: 'var(--gold)',
              }}>{t}</span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.4rem' }}>${totalEarnings.toFixed(0)}M</div>
            <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase' }}>Career Earnings</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.4rem' }}>{totalFilms}</div>
            <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase' }}>Total Films</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.4rem' }}>{legacyFilms.length}</div>
            <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase' }}>Legacy Films</div>
          </div>
        </div>
      </div>

      {/* Studio Milestones */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 12, letterSpacing: 1 }}>🏅 STUDIO MILESTONES</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {milestones.map(({ milestone: m, unlocked, progress }) => (
            <div key={m.id} style={{
              padding: '12px', background: unlocked ? 'rgba(212,168,67,0.1)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${unlocked ? 'rgba(212,168,67,0.4)' : '#333'}`,
              borderRadius: 8, textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.5rem' }}>{unlocked ? m.emoji : '🔒'}</div>
              <div style={{ color: unlocked ? 'var(--gold)' : '#666', fontFamily: 'Bebas Neue', fontSize: '0.9rem', marginTop: 4 }}>
                {m.title}
              </div>
              <div style={{ color: '#999', fontSize: '0.65rem', marginTop: 2 }}>{m.description}</div>
              {!unlocked && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ width: '100%', height: 4, background: '#222', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${progress * 100}%`, height: '100%', background: 'var(--gold)', borderRadius: 2 }} />
                  </div>
                  <div style={{ color: '#888', fontSize: '0.55rem', marginTop: 2 }}>{Math.round(progress * 100)}%</div>
                </div>
              )}
              {unlocked && <div style={{ color: '#2ecc71', fontSize: '0.65rem', marginTop: 4 }}>✅ Unlocked</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Sort toggle */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
        <button onClick={() => setSortMode('score')} style={{
          background: sortMode === 'score' ? 'rgba(212,168,67,0.15)' : 'transparent',
          border: `1px solid ${sortMode === 'score' ? 'var(--gold-dim)' : '#333'}`,
          borderRadius: 6, padding: '6px 14px', color: sortMode === 'score' ? 'var(--gold)' : '#666',
          cursor: 'pointer', fontFamily: 'Bebas Neue', fontSize: '0.8rem',
        }}>By Score</button>
        <button onClick={() => setSortMode('earnings')} style={{
          background: sortMode === 'earnings' ? 'rgba(212,168,67,0.15)' : 'transparent',
          border: `1px solid ${sortMode === 'earnings' ? 'var(--gold-dim)' : '#333'}`,
          borderRadius: 6, padding: '6px 14px', color: sortMode === 'earnings' ? 'var(--gold)' : '#666',
          cursor: 'pointer', fontFamily: 'Bebas Neue', fontSize: '0.8rem',
        }}>By Earnings</button>
        <button onClick={() => { if (!showLegacy) sfx.legacyFilmArchive(); setShowLegacy(!showLegacy); }} style={{
          background: showLegacy ? 'rgba(155,89,182,0.15)' : 'transparent',
          border: `1px solid ${showLegacy ? 'rgba(155,89,182,0.4)' : '#333'}`,
          borderRadius: 6, padding: '6px 14px', color: showLegacy ? '#bb86fc' : '#666',
          cursor: 'pointer', fontFamily: 'Bebas Neue', fontSize: '0.8rem',
        }}>🎞️ Legacy Films</button>
      </div>

      {/* Legacy Films Collection */}
      {showLegacy && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: '#bb86fc', fontSize: '0.9rem', marginBottom: 12, letterSpacing: 1 }}>🎞️ LEGACY COLLECTION ({legacyFilms.length}/{20})</h3>
          {legacyFilms.length === 0 ? (
            <div style={{ color: '#666', fontSize: '0.8rem', textAlign: 'center', padding: 20 }}>
              Complete runs to add your best films to the Legacy Collection.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {legacyFilms.map((f, i) => (
                <div key={i} style={{
                  background: 'rgba(155,89,182,0.06)', border: `1px solid ${tierColors[f.tier] || '#333'}30`,
                  borderRadius: 8, padding: '12px', textAlign: 'center',
                }}>
                  {/* Text-based poster */}
                  <pre style={{
                    fontFamily: 'monospace', fontSize: '0.5rem', lineHeight: 1.3,
                    color: tierColors[f.tier] || '#888', margin: '0 0 8px',
                    textAlign: 'left', display: 'inline-block',
                  }}>
                    {generateFilmPoster(f).join('\n')}
                  </pre>
                  <div style={{ color: '#ccc', fontSize: '0.75rem', fontWeight: 600 }}>"{f.title}"</div>
                  <div style={{ color: '#888', fontSize: '0.65rem' }}>{f.studioName} · {f.runDate}</div>
                  {f.criticScore != null && (
                    <div style={{ color: f.criticScore >= 60 ? '#e74c3c' : '#7f8c2a', fontSize: '0.6rem', marginTop: 2 }}>
                      {f.criticScore >= 60 ? '🍅' : '🤢'} {f.criticScore}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Top 10 Runs */}
      <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 12, letterSpacing: 1 }}>
        🏆 TOP 10 ALL-TIME RUNS {sortMode === 'earnings' ? '(By Earnings)' : '(By Score)'}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {top10.map((entry, i) => {
          const isExpanded = expandedId === entry.id;
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
          const diffConfig = DIFFICULTIES.find(d => d.id === (entry as any).difficulty);
          const bestFilm = entry.films.length > 0
            ? entry.films.reduce((best, f) => (f.boxOffice || 0) > (best.boxOffice || 0) ? f : best, entry.films[0])
            : null;

          return (
            <div key={entry.id} style={{
              padding: '12px 16px', background: i < 3 ? 'rgba(212,168,67,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${i < 3 ? 'rgba(212,168,67,0.25)' : '#222'}`,
              borderRadius: 8, cursor: 'pointer', transition: 'border-color 0.2s',
            }} onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'Bebas Neue', fontSize: i < 3 ? '1.3rem' : '0.9rem', color: i < 3 ? 'var(--gold)' : '#666' }}>{medal}</span>
                  <span style={{ color: rankColors[entry.rank] || '#999', fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>{entry.rank}</span>
                  <span style={{ color: entry.won ? '#2ecc71' : '#e74c3c', fontSize: '0.7rem', fontWeight: 600 }}>
                    {entry.won ? '🏆' : '💀'}
                  </span>
                  {entry.studioName && (
                    <span style={{ color: '#aaa', fontSize: '0.75rem' }}>{entry.studioName}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>
                    {sortMode === 'earnings' ? `$${entry.earnings.toFixed(1)}M` : `${entry.score} pts`}
                  </span>
                  <span style={{ color: '#999', fontSize: '0.8rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : '' }}>▾</span>
                </div>
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                <span style={{ fontSize: '0.65rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 3 }}>
                  {entry.date}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 3 }}>
                  {entry.seasons} seasons · {entry.films.length} films
                </span>
                {diffConfig && (
                  <span style={{ fontSize: '0.65rem', color: diffConfig.color, background: `${diffConfig.color}15`, padding: '1px 6px', borderRadius: 3 }}>
                    {diffConfig.emoji} {diffConfig.name}
                  </span>
                )}
                {sortMode === 'score' && (
                  <span style={{ fontSize: '0.65rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 3 }}>
                    ${entry.earnings.toFixed(1)}M
                  </span>
                )}
              </div>

              {/* Film tier strip */}
              <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                {entry.films.map((f, j) => {
                  const tierEmoji: Record<string, string> = { BLOCKBUSTER: '🟩', SMASH: '🟨', HIT: '🟧', FLOP: '🟥' };
                  return <span key={j} title={`${f.title} (${f.genre}) - ${f.tier}`}>{tierEmoji[f.tier] || '⬜'}</span>;
                })}
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }} onClick={e => e.stopPropagation()}>
                  {bestFilm && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase' }}>👑 Best Film</div>
                      <div style={{ color: '#2ecc71', fontSize: '0.8rem', fontWeight: 600 }}>"{bestFilm.title}"</div>
                      <div style={{ color: '#888', fontSize: '0.65rem' }}>{bestFilm.genre} · {bestFilm.tier}{bestFilm.boxOffice != null ? ` · $${bestFilm.boxOffice.toFixed(1)}M` : ''}</div>
                    </div>
                  )}
                  {/* Text poster of best film */}
                  {bestFilm && (
                    <pre style={{
                      fontFamily: 'monospace', fontSize: '0.5rem', lineHeight: 1.3,
                      color: tierColors[bestFilm.tier] || '#888', margin: '8px auto',
                      textAlign: 'left', display: 'inline-block',
                    }}>
                      {generateFilmPoster({
                        title: bestFilm.title,
                        genre: bestFilm.genre,
                        tier: bestFilm.tier,
                        boxOffice: bestFilm.boxOffice || 0,
                      }).join('\n')}
                    </pre>
                  )}
                  {/* Full filmography */}
                  <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase', marginBottom: 4, marginTop: 8 }}>Filmography</div>
                  {entry.films.map((f, j) => (
                    <div key={j} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0',
                      borderBottom: j < entry.films.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                      fontSize: '0.75rem',
                    }}>
                      <span style={{ color: tierColors[f.tier], fontSize: '0.8rem' }}>
                        {({ BLOCKBUSTER: '🟩', SMASH: '🟨', HIT: '🟧', FLOP: '🟥' } as Record<string, string>)[f.tier] || '⬜'}
                      </span>
                      <span style={{ flex: 1, color: '#ccc' }}>{f.title}</span>
                      <span style={{ color: '#888', fontSize: '0.65rem' }}>{f.genre}</span>
                      {f.boxOffice != null && (
                        <span style={{ color: tierColors[f.tier], fontFamily: 'Bebas Neue', fontSize: '0.8rem' }}>
                          ${f.boxOffice.toFixed(1)}M
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Endless Mode Leaderboard */}
      {isEndlessUnlocked() && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ color: '#e74c3c', fontSize: '0.9rem', marginBottom: 12, letterSpacing: 1 }}>♾️ ENDLESS MODE RECORDS</h3>
          {endlessLb.length === 0 ? (
            <div style={{ color: '#666', fontSize: '0.8rem', textAlign: 'center', padding: 16 }}>
              No endless runs yet. Start one from the Play tab!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {endlessLb.map((e, i) => (
                <div key={e.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  background: 'rgba(231,76,60,0.06)', border: '1px solid rgba(231,76,60,0.2)', borderRadius: 8,
                }}>
                  <span style={{ color: i < 3 ? '#e74c3c' : '#666', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>#{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#ccc', fontSize: '0.8rem', fontWeight: 600 }}>{e.studioName}</div>
                    <div style={{ color: '#888', fontSize: '0.65rem' }}>{e.date} · {e.archetype}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#e74c3c', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{e.seasons} seasons</div>
                    <div style={{ color: '#888', fontSize: '0.6rem' }}>{e.films} films · ${e.totalEarnings.toFixed(1)}M</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
