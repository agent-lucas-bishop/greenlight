// R272: HallOfFameTab — re-exports the new HallOfFame component
// This file exists because StartScreen lazy-loads it as `HallOfFameTab`
import { useState, useEffect, useRef } from 'react';
import { sfx } from '../sound';
import {
  getHallOfFameEntries,
  getPersonalBestsPerArchetype,
  getHofStats,
  getFavoriteGenre,
  getMostUsedArchetype,
  type HallOfFameEntry,
  type HofDifficultyKey,
} from '../hallOfFame';
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
} from '../endgame';
import { STUDIO_ARCHETYPES } from '../data';
import { DIFFICULTIES } from '../difficulty';

const DIFFICULTY_TABS: { key: HofDifficultyKey; label: string; emoji: string; color: string }[] = [
  { key: 'indie', label: 'Easy', emoji: '🟢', color: '#2ecc71' },
  { key: 'studio', label: 'Normal', emoji: '🟡', color: '#f1c40f' },
  { key: 'mogul', label: 'Hard', emoji: '🔴', color: '#e74c3c' },
  { key: 'nightmare', label: 'Nightmare', emoji: '💀', color: '#9b59b6' },
  { key: 'custom', label: 'Custom', emoji: '⚙️', color: '#3498db' },
  { key: 'allTime', label: 'All-Time', emoji: '👑', color: '#ffd700' },
];

const CROWN_EMOJIS = ['👑', '🥈', '🥉'];

const ARCHETYPE_EMOJIS: Record<string, string> = {
  prestige: '🏆',
  blockbuster: '💥',
  indie: '🌙',
  chaos: '🎲',
};

type SortMode = 'score' | 'earnings';

export default function HallOfFameTab() {
  const [activeTab, setActiveTab] = useState<HofDifficultyKey>('allTime');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showLegacy, setShowLegacy] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('score');
  const entrancePlayed = useRef(false);

  // New hall of fame data (per-difficulty)
  const hofEntries = getHallOfFameEntries(activeTab);
  const personalBests = getPersonalBestsPerArchetype();
  const hofStats = getHofStats();
  const favGenre = getFavoriteGenre();
  const mostArchetype = getMostUsedArchetype();

  // Legacy data (old system, still shown)
  const top10 = sortMode === 'score' ? getHallOfFameTop10() : getHallOfFameByEarnings();
  const totalEarnings = getTotalCareerEarnings();
  const totalFilms = getTotalCareerFilms();
  const legacyFilms = getLegacyFilms();
  const milestones = getMilestoneProgress();
  const activeTitles = getActiveTitles();
  const endlessLb = getEndlessLeaderboard();

  useEffect(() => {
    if (!entrancePlayed.current && (hofEntries.length > 0 || top10.length > 0)) {
      entrancePlayed.current = true;
      sfx.hallOfFameEntrance();
    }
  }, []);

  const winRate = hofStats.totalRuns > 0 ? Math.round((hofStats.totalWins / hofStats.totalRuns) * 100) : 0;
  const avgScore = hofStats.totalRuns > 0 ? Math.round(hofStats.totalScore / hofStats.totalRuns) : 0;
  const tierColors: Record<string, string> = { BLOCKBUSTER: '#2ecc71', SMASH: '#f1c40f', HIT: '#e67e22', FLOP: '#e74c3c' };
  const rankColors: Record<string, string> = { S: '#ff6b6b', A: '#ffd93d', B: '#6bcb77', C: '#5dade2', D: '#999' };

  const showEmpty = hofEntries.length === 0 && top10.length === 0;

  if (showEmpty) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🏛️</div>
        <div className="empty-state-title">Hall of Fame Awaits</div>
        <div className="empty-state-desc">Complete runs to enshrine your greatest achievements here.</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 660, margin: '0 auto' }}>
      {/* Career Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(212,168,67,0.15) 0%, rgba(212,168,67,0.04) 100%)',
        border: '2px solid rgba(212,168,67,0.4)', borderRadius: 16,
        padding: '20px 24px', textAlign: 'center', marginBottom: 24,
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 4 }}>👑</div>
        <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.8rem', letterSpacing: 3 }}>
          HALL OF FAME
        </div>
        <div style={{ color: '#888', fontSize: '0.75rem', marginTop: 4 }}>
          The greatest studio runs of all time
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

      {/* Overall Stats Dashboard */}
      {hofStats.totalRuns > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
          gap: 8, marginBottom: 24,
        }}>
          {[
            { label: 'Total Runs', value: hofStats.totalRuns.toString(), color: '#ccc' },
            { label: 'Win Rate', value: `${winRate}%`, color: winRate >= 50 ? '#2ecc71' : '#e74c3c' },
            { label: 'Avg Score', value: avgScore.toString(), color: 'var(--gold)' },
            { label: 'Time Played', value: `${Math.round(hofStats.totalTimePlayed)}m`, color: '#9b59b6' },
            { label: 'Fav Genre', value: favGenre || '—', color: '#3498db' },
            { label: 'Top Archetype', value: mostArchetype ? (ARCHETYPE_EMOJIS[mostArchetype] || '🎬') : '—', color: '#f39c12' },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid #222',
              borderRadius: 8, padding: '10px 6px', textAlign: 'center',
            }}>
              <div style={{ color: s.color, fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>{s.value}</div>
              <div style={{ color: '#999', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Personal Bests per Archetype */}
      {personalBests.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 10, letterSpacing: 1 }}>
            🏅 PERSONAL BESTS BY ARCHETYPE
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {STUDIO_ARCHETYPES.map(a => {
              const pb = personalBests.find(p => p.archetype === a.id);
              return (
                <div key={a.id} style={{
                  padding: '10px 12px', textAlign: 'center',
                  background: pb ? 'rgba(212,168,67,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${pb ? 'rgba(212,168,67,0.25)' : '#222'}`,
                  borderRadius: 8, opacity: pb ? 1 : 0.5,
                }}>
                  <div style={{ fontSize: '1.4rem' }}>{a.emoji}</div>
                  <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.85rem', marginTop: 2 }}>
                    {a.name.split(' ')[0]}
                  </div>
                  {pb ? (
                    <>
                      <div style={{ color: '#ffd700', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>{pb.bestScore} pts</div>
                      <div style={{ color: '#888', fontSize: '0.6rem' }}>{pb.totalRuns} run{pb.totalRuns !== 1 ? 's' : ''}</div>
                    </>
                  ) : (
                    <div style={{ color: '#555', fontSize: '0.7rem', marginTop: 4 }}>No runs yet</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Difficulty Tabs for HOF entries */}
      <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 12, letterSpacing: 1 }}>
        🏆 LEADERBOARD BY DIFFICULTY
      </h3>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {DIFFICULTY_TABS.map(tab => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setExpandedId(null); }} style={{
            background: activeTab === tab.key ? `${tab.color}20` : 'transparent',
            border: `1px solid ${activeTab === tab.key ? tab.color : '#333'}`,
            borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
            color: activeTab === tab.key ? tab.color : '#666',
            fontFamily: 'Bebas Neue', fontSize: '0.75rem', letterSpacing: '0.03em',
            transition: 'all 0.2s',
          }}>
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {hofEntries.length === 0 ? (
        <div style={{ color: '#666', fontSize: '0.8rem', textAlign: 'center', padding: 20, marginBottom: 24 }}>
          No entries for {activeTab === 'allTime' ? 'any difficulty' : `${DIFFICULTY_TABS.find(t => t.key === activeTab)?.label} difficulty`} yet. Keep playing!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
          {hofEntries.map((entry, i) => {
            const isExpanded = expandedId === entry.id;
            const isTop3 = i < 3;
            const diffConfig = DIFFICULTIES.find(d => d.id === entry.difficulty);
            const archData = STUDIO_ARCHETYPES.find(a => a.id === entry.archetype);

            return (
              <div key={entry.id} style={{
                padding: '12px 16px',
                background: isTop3
                  ? `linear-gradient(135deg, ${i === 0 ? 'rgba(255,215,0,0.08)' : i === 1 ? 'rgba(192,192,192,0.06)' : 'rgba(205,127,50,0.06)'}, rgba(0,0,0,0))`
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isTop3 ? (i === 0 ? 'rgba(255,215,0,0.35)' : i === 1 ? 'rgba(192,192,192,0.3)' : 'rgba(205,127,50,0.3)') : '#222'}`,
                borderRadius: 8, cursor: 'pointer', transition: 'border-color 0.2s',
              }} onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontFamily: 'Bebas Neue', fontSize: isTop3 ? '1.4rem' : '0.9rem',
                      color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#666',
                      minWidth: 28,
                    }}>
                      {isTop3 ? CROWN_EMOJIS[i] : `#${i + 1}`}
                    </span>
                    <span style={{ color: entry.won ? '#2ecc71' : '#e74c3c', fontSize: '0.7rem' }}>
                      {entry.won ? '🏆' : '💀'}
                    </span>
                    <span style={{ color: '#ccc', fontSize: '0.8rem', fontWeight: 600 }}>
                      {entry.studioName}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>
                      {entry.finalScore} pts
                    </span>
                    <span style={{ color: '#999', fontSize: '0.8rem', transform: isExpanded ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>▾</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                  <span style={{ fontSize: '0.6rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 3 }}>
                    ${entry.totalEarnings.toFixed(1)}M
                  </span>
                  <span style={{ fontSize: '0.6rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 3 }}>
                    {entry.filmsProduced} film{entry.filmsProduced !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 3 }}>
                    "{entry.bestFilm.title}"
                  </span>
                  <span style={{ fontSize: '0.6rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 3 }}>
                    {entry.date}
                  </span>
                </div>
                {isExpanded && (
                  <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#888', fontSize: '0.55rem', textTransform: 'uppercase' }}>Archetype</div>
                        <div style={{ fontSize: '1rem' }}>{archData?.emoji || '🎬'}</div>
                        <div style={{ color: '#ccc', fontSize: '0.7rem' }}>{archData?.name || entry.archetype}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#888', fontSize: '0.55rem', textTransform: 'uppercase' }}>Awards</div>
                        <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>{entry.awardsWon}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#888', fontSize: '0.55rem', textTransform: 'uppercase' }}>Seasons</div>
                        <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>{entry.seasonsSurvived}</div>
                      </div>
                    </div>
                    {diffConfig && (
                      <div style={{ textAlign: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.65rem', color: diffConfig.color, background: `${diffConfig.color}15`, padding: '2px 8px', borderRadius: 4 }}>
                          {diffConfig.emoji} {diffConfig.name} Difficulty
                        </span>
                      </div>
                    )}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#999', fontSize: '0.55rem', textTransform: 'uppercase', marginBottom: 2 }}>👑 Best Film</div>
                      <div style={{ color: '#2ecc71', fontSize: '0.8rem', fontWeight: 600 }}>"{entry.bestFilm.title}"</div>
                      <div style={{ color: '#888', fontSize: '0.65rem' }}>
                        {entry.bestFilm.genre} · ${entry.bestFilm.earnings.toFixed(1)}M
                      </div>
                    </div>
                    {entry.replayId && (
                      <div style={{ textAlign: 'center', marginTop: 8 }}>
                        <span style={{ fontSize: '0.65rem', color: '#3498db' }}>📼 Replay Available</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legacy sort + legacy films toggle */}
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

      {/* Top 10 All-Time Runs (old leaderboard) */}
      <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 12, letterSpacing: 1 }}>
        🏆 TOP 10 ALL-TIME RUNS {sortMode === 'earnings' ? '(By Earnings)' : '(By Score)'}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {top10.map((entry, i) => {
          const isExpanded = expandedId === `legacy_${entry.id}`;
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
            }} onClick={() => setExpandedId(isExpanded ? null : `legacy_${entry.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'Bebas Neue', fontSize: i < 3 ? '1.3rem' : '0.9rem', color: i < 3 ? 'var(--gold)' : '#666' }}>{medal}</span>
                  <span style={{ color: rankColors[entry.rank] || '#999', fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>{entry.rank}</span>
                  <span style={{ color: entry.won ? '#2ecc71' : '#e74c3c', fontSize: '0.7rem', fontWeight: 600 }}>
                    {entry.won ? '🏆' : '💀'}
                  </span>
                  {entry.studioName && <span style={{ color: '#aaa', fontSize: '0.75rem' }}>{entry.studioName}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>
                    {sortMode === 'earnings' ? `$${entry.earnings.toFixed(1)}M` : `${entry.score} pts`}
                  </span>
                  <span style={{ color: '#999', fontSize: '0.8rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : '' }}>▾</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                <span style={{ fontSize: '0.65rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 3 }}>{entry.date}</span>
                <span style={{ fontSize: '0.65rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 3 }}>
                  {entry.seasons} seasons · {entry.films.length} films
                </span>
                {diffConfig && (
                  <span style={{ fontSize: '0.65rem', color: diffConfig.color, background: `${diffConfig.color}15`, padding: '1px 6px', borderRadius: 3 }}>
                    {diffConfig.emoji} {diffConfig.name}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                {entry.films.map((f, j) => {
                  const tierEmoji: Record<string, string> = { BLOCKBUSTER: '🟩', SMASH: '🟨', HIT: '🟧', FLOP: '🟥' };
                  return <span key={j} title={`${f.title} (${f.genre}) - ${f.tier}`}>{tierEmoji[f.tier] || '⬜'}</span>;
                })}
              </div>
              {isExpanded && (
                <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }} onClick={e => e.stopPropagation()}>
                  {bestFilm && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase' }}>👑 Best Film</div>
                      <div style={{ color: '#2ecc71', fontSize: '0.8rem', fontWeight: 600 }}>"{bestFilm.title}"</div>
                      <div style={{ color: '#888', fontSize: '0.65rem' }}>{bestFilm.genre} · {bestFilm.tier}{bestFilm.boxOffice != null ? ` · $${bestFilm.boxOffice.toFixed(1)}M` : ''}</div>
                    </div>
                  )}
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

      {/* Endless Mode Records */}
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
