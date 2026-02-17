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

export default function HallOfFame() {
  const [activeTab, setActiveTab] = useState<HofDifficultyKey>('allTime');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const entrancePlayed = useRef(false);

  const entries = getHallOfFameEntries(activeTab);
  const personalBests = getPersonalBestsPerArchetype();
  const stats = getHofStats();
  const favGenre = getFavoriteGenre();
  const mostArchetype = getMostUsedArchetype();

  useEffect(() => {
    if (!entrancePlayed.current && entries.length > 0) {
      entrancePlayed.current = true;
      sfx.hallOfFameEntrance();
    }
  }, []);

  const winRate = stats.totalRuns > 0 ? Math.round((stats.totalWins / stats.totalRuns) * 100) : 0;
  const avgScore = stats.totalRuns > 0 ? Math.round(stats.totalScore / stats.totalRuns) : 0;

  return (
    <div style={{ maxWidth: 660, margin: '0 auto' }}>
      {/* Header */}
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
      </div>

      {/* Overall Stats Dashboard */}
      {stats.totalRuns > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
          gap: 8, marginBottom: 24,
        }}>
          {[
            { label: 'Total Runs', value: stats.totalRuns.toString(), color: '#ccc' },
            { label: 'Win Rate', value: `${winRate}%`, color: winRate >= 50 ? '#2ecc71' : '#e74c3c' },
            { label: 'Avg Score', value: avgScore.toString(), color: 'var(--gold)' },
            { label: 'Time Played', value: `${Math.round(stats.totalTimePlayed)}m`, color: '#9b59b6' },
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

      {/* Difficulty Tabs */}
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

      {/* Leaderboard */}
      {entries.length === 0 ? (
        <div className="empty-state" style={{ padding: 24 }}>
          <div className="empty-state-icon">🏛️</div>
          <div className="empty-state-title">No Entries Yet</div>
          <div className="empty-state-desc">
            Complete runs on {activeTab === 'allTime' ? 'any difficulty' : `${DIFFICULTY_TABS.find(t => t.key === activeTab)?.label} difficulty`} to earn your place.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {entries.map((entry, i) => {
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
                {/* Main row */}
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

                {/* Subtitle tags */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                  <span style={{ fontSize: '0.6rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 3 }}>
                    ${entry.totalEarnings.toFixed(1)}M
                  </span>
                  <span style={{ fontSize: '0.6rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 3 }}>
                    {entry.filmsProduced} film{entry.filmsProduced !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 3 }}>
                    {entry.bestFilm.title}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 3 }}>
                    {entry.date}
                  </span>
                </div>

                {/* Expanded details */}
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
                        <span style={{ fontSize: '0.65rem', color: '#3498db', cursor: 'pointer' }}>
                          📼 Replay Available
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
