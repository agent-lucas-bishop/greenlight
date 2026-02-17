/**
 * R307: Enhanced Career Stats with Studio History
 * Full career page: aggregate stats, SVG genre charts, difficulty records,
 * streaks, studio timeline, career milestones, and award history.
 */

import { useState, useMemo } from 'react';
import { getLifetimeStats, getRecentRuns, getDifficultyWinRates, type LifetimeStats, type RunStats } from '../statistics';
import { getAwardsHistory, getAwardCountByType, getTotalAwardCount, type RunAwardsRecord } from '../filmAwards';

// ─── Career Milestones ───

interface Milestone {
  id: string;
  emoji: string;
  name: string;
  description: string;
  check: (stats: LifetimeStats) => boolean;
}

const MILESTONES: Milestone[] = [
  { id: 'bo_10m', emoji: '💵', name: 'First Million', description: '$10M total box office', check: s => s.totalBO >= 10 },
  { id: 'bo_100m', emoji: '💰', name: 'Hundred Million Club', description: '$100M total box office', check: s => s.totalBO >= 100 },
  { id: 'bo_500m', emoji: '🤑', name: 'Half Billion', description: '$500M total box office', check: s => s.totalBO >= 500 },
  { id: 'bo_1b', emoji: '🏦', name: 'Billion Dollar Studio', description: '$1B total box office', check: s => s.totalBO >= 1000 },
  { id: 'films_10', emoji: '🎥', name: 'Ten-Timer', description: '10 films produced', check: s => s.totalFilms >= 10 },
  { id: 'films_50', emoji: '🎬', name: 'Prolific Producer', description: '50 films produced', check: s => s.totalFilms >= 50 },
  { id: 'films_100', emoji: '📽️', name: 'Centurion', description: '100 films produced', check: s => s.totalFilms >= 100 },
  { id: 'runs_5', emoji: '🔁', name: 'Repeat Player', description: '5 runs completed', check: s => s.totalRuns >= 5 },
  { id: 'runs_25', emoji: '🔄', name: 'Veteran', description: '25 runs completed', check: s => s.totalRuns >= 25 },
  { id: 'runs_50', emoji: '🎖️', name: 'Studio Legend', description: '50 runs completed', check: s => s.totalRuns >= 50 },
  { id: 'streak_3', emoji: '🔥', name: 'Hot Streak', description: '3 wins in a row', check: s => s.longestWinStreak >= 3 },
  { id: 'streak_5', emoji: '🔥', name: 'On Fire', description: '5 wins in a row', check: s => s.longestWinStreak >= 5 },
  { id: 'streak_10', emoji: '🌋', name: 'Unstoppable', description: '10 wins in a row', check: s => s.longestWinStreak >= 10 },
  { id: 'genres_7', emoji: '🌈', name: 'Renaissance Studio', description: 'All 7 genres explored', check: s => Object.keys(s.genreFilmCounts).length >= 7 },
  { id: 'fresh_10', emoji: '🍅', name: 'Fresh Certified', description: '10+ high-quality films', check: s => {
    let count = 0;
    for (const r of s.runHistory) for (const f of r.films) if (f.criticScore && f.criticScore >= 75) count++;
    return count >= 10;
  }},
];

// ─── SVG Genre Chart ───

const GENRE_COLORS: Record<string, string> = {
  Action: '#e74c3c', Comedy: '#f39c12', Drama: '#3498db', Horror: '#9b59b6',
  'Sci-Fi': '#1abc9c', Romance: '#e91e63', Thriller: '#607d8b',
};

function GenreChart({ genreCounts }: { genreCounts: Record<string, number> }) {
  const entries = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  const total = entries.reduce((s, [, c]) => s + c, 0);
  const maxCount = entries[0][1];

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.95rem', letterSpacing: 1, marginBottom: 12 }}>
        🎭 GENRE BREAKDOWN
      </h3>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Bar chart */}
        <svg width="280" height={entries.length * 32 + 8} viewBox={`0 0 280 ${entries.length * 32 + 8}`} style={{ flex: '0 0 280px' }}>
          {entries.map(([genre, count], i) => {
            const barWidth = (count / maxCount) * 180;
            const color = GENRE_COLORS[genre] || '#888';
            const pct = Math.round((count / total) * 100);
            return (
              <g key={genre} transform={`translate(0, ${i * 32 + 4})`}>
                <text x="0" y="16" fill="#aaa" fontSize="11" fontFamily="Bebas Neue">{genre}</text>
                <rect x="65" y="4" width={barWidth} height="18" rx="3" fill={color} opacity="0.7">
                  <animate attributeName="width" from="0" to={barWidth} dur="0.6s" fill="freeze" begin={`${i * 0.1}s`} />
                </rect>
                <text x={65 + barWidth + 6} y="17" fill="#888" fontSize="10">{count} ({pct}%)</text>
              </g>
            );
          })}
        </svg>

        {/* Mini pie chart */}
        <svg width="100" height="100" viewBox="-50 -50 100 100" style={{ flex: '0 0 100px' }}>
          {(() => {
            let cumAngle = -Math.PI / 2;
            return entries.map(([genre, count]) => {
              const angle = (count / total) * Math.PI * 2;
              const x1 = Math.cos(cumAngle) * 40;
              const y1 = Math.sin(cumAngle) * 40;
              cumAngle += angle;
              const x2 = Math.cos(cumAngle) * 40;
              const y2 = Math.sin(cumAngle) * 40;
              const large = angle > Math.PI ? 1 : 0;
              const color = GENRE_COLORS[genre] || '#888';
              return (
                <path key={genre}
                  d={`M0,0 L${x1},${y1} A40,40 0 ${large},1 ${x2},${y2} Z`}
                  fill={color} opacity="0.75" stroke="#1a1a2e" strokeWidth="1"
                />
              );
            });
          })()}
          <circle cx="0" cy="0" r="16" fill="#1a1a2e" />
          <text x="0" y="5" textAnchor="middle" fill="var(--gold)" fontSize="10" fontFamily="Bebas Neue">{total}</text>
        </svg>
      </div>
    </div>
  );
}

// ─── Difficulty Win/Loss Record ───

function DifficultyRecord({ diffStats }: { diffStats: Record<string, { runs: number; wins: number; winRate: number; avgBO: number }> }) {
  const entries = Object.entries(diffStats);
  if (entries.length === 0) return null;

  const diffColors: Record<string, string> = {
    indie: '#2ecc71', studio: '#3498db', mogul: '#e67e22', nightmare: '#e74c3c', auteur: '#9b59b6',
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.95rem', letterSpacing: 1, marginBottom: 12 }}>
        📊 DIFFICULTY RECORD
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
        {entries.map(([diff, ds]) => (
          <div key={diff} style={{
            background: `${diffColors[diff] || '#555'}08`, border: `1px solid ${diffColors[diff] || '#555'}30`,
            borderRadius: 8, padding: '10px 12px', textAlign: 'center',
          }}>
            <div style={{ color: diffColors[diff] || '#888', fontFamily: 'Bebas Neue', fontSize: '0.85rem', letterSpacing: 1, textTransform: 'capitalize' }}>
              {diff}
            </div>
            <div style={{ color: '#ccc', fontFamily: 'Bebas Neue', fontSize: '1.3rem' }}>
              {ds.wins}W / {ds.runs - ds.wins}L
            </div>
            <div style={{ color: '#888', fontSize: '0.65rem' }}>
              {ds.winRate}% WR · ${Math.round(ds.avgBO)}M avg
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Studio Timeline ───

function StudioTimeline({ runs }: { runs: RunStats[] }) {
  const [showAll, setShowAll] = useState(false);
  if (runs.length === 0) return null;

  const displayed = showAll ? runs : runs.slice(0, 10);

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.95rem', letterSpacing: 1, marginBottom: 12 }}>
        📜 STUDIO TIMELINE
      </h3>
      <div style={{ position: 'relative', paddingLeft: 20 }}>
        {/* Timeline line */}
        <div style={{
          position: 'absolute', left: 6, top: 8, bottom: 8, width: 2,
          background: 'linear-gradient(to bottom, var(--gold-dim), #333)',
        }} />
        {displayed.map((run, i) => (
          <div key={run.id} style={{
            position: 'relative', marginBottom: 12, paddingLeft: 16,
          }}>
            {/* Dot */}
            <div style={{
              position: 'absolute', left: -14, top: 8, width: 10, height: 10,
              borderRadius: '50%', border: '2px solid',
              borderColor: run.won ? '#2ecc71' : '#e74c3c',
              background: run.won ? 'rgba(46,204,113,0.3)' : 'rgba(231,76,60,0.3)',
            }} />
            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid #222',
              borderRadius: 8, padding: '10px 14px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: run.won ? '#2ecc71' : '#e74c3c', fontFamily: 'Bebas Neue', fontSize: '0.9rem' }}>
                  {run.won ? '🏆' : '💀'} {run.studioName || 'Unnamed Studio'}
                </span>
                <span style={{ color: '#666', fontSize: '0.65rem' }}>{run.date}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 4, color: '#888', fontSize: '0.7rem' }}>
                <span>{run.filmsMade} films</span>
                <span>${run.totalBO.toFixed(0)}M</span>
                <span>Score: {run.score}</span>
                <span style={{ textTransform: 'capitalize' }}>{run.difficulty}</span>
              </div>
              {run.bestFilm && (
                <div style={{ color: '#666', fontSize: '0.65rem', marginTop: 2 }}>
                  👑 "{run.bestFilm.title}" (${run.bestFilm.bo.toFixed(1)}M)
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {!showAll && runs.length > 10 && (
        <button onClick={() => setShowAll(true)} style={{
          background: 'rgba(212,168,67,0.1)', border: '1px solid var(--gold-dim)',
          borderRadius: 6, padding: '6px 16px', color: 'var(--gold)',
          cursor: 'pointer', fontSize: '0.75rem', width: '100%',
        }}>
          Show all {runs.length} runs
        </button>
      )}
    </div>
  );
}

// ─── Career Milestones ───

function MilestonesSection({ stats }: { stats: LifetimeStats }) {
  const earned = MILESTONES.filter(m => m.check(stats));
  const unearned = MILESTONES.filter(m => !m.check(stats));

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.95rem', letterSpacing: 1, marginBottom: 12 }}>
        🏅 CAREER MILESTONES ({earned.length}/{MILESTONES.length})
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
        {earned.map(m => (
          <div key={m.id} style={{
            background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.3)',
            borderRadius: 8, padding: '8px 10px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.3rem' }}>{m.emoji}</div>
            <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.8rem' }}>{m.name}</div>
            <div style={{ color: '#888', fontSize: '0.6rem' }}>{m.description}</div>
          </div>
        ))}
        {unearned.slice(0, 3).map(m => (
          <div key={m.id} style={{
            background: 'rgba(255,255,255,0.02)', border: '1px dashed #333',
            borderRadius: 8, padding: '8px 10px', textAlign: 'center', opacity: 0.4,
          }}>
            <div style={{ fontSize: '1.3rem' }}>❓</div>
            <div style={{ color: '#666', fontFamily: 'Bebas Neue', fontSize: '0.8rem' }}>???</div>
            <div style={{ color: '#555', fontSize: '0.6rem' }}>{m.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Award History ───

function AwardHistorySection() {
  const [expanded, setExpanded] = useState(false);
  const history = getAwardsHistory();
  const totalAwards = getTotalAwardCount();
  const awardCounts = getAwardCountByType();

  if (history.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.95rem', letterSpacing: 1, marginBottom: 12 }}>
        🏆 AWARD CABINET ({totalAwards} total)
      </h3>
      {/* Award type counts */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {Object.entries(awardCounts).sort((a, b) => b[1] - a[1]).map(([id, count]) => {
          const emojis: Record<string, string> = {
            box_office_champion: '💰', critical_darling: '🎭', genre_master: '🎬',
            budget_wizard: '🧙', comeback_kid: '🔥', crowd_pleaser: '👏', critics_choice: '🍅',
          };
          const names: Record<string, string> = {
            box_office_champion: 'BO Champ', critical_darling: 'Critic Darling', genre_master: 'Genre Master',
            budget_wizard: 'Budget Wizard', comeback_kid: 'Comeback', crowd_pleaser: 'Crowd Pleaser', critics_choice: "Critics'",
          };
          return (
            <span key={id} style={{
              background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)',
              borderRadius: 6, padding: '3px 8px', fontSize: '0.7rem', color: 'var(--gold)',
            }}>
              {emojis[id] || '🏆'} {names[id] || id} ×{count}
            </span>
          );
        })}
      </div>
      {/* Expandable run-by-run */}
      <button onClick={() => setExpanded(!expanded)} style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid #333',
        borderRadius: 6, padding: '6px 14px', color: '#888', cursor: 'pointer',
        fontSize: '0.7rem', width: '100%',
      }}>
        {expanded ? '▴ Hide history' : `▾ Show award history (${history.length} runs)`}
      </button>
      {expanded && (
        <div style={{ marginTop: 8, maxHeight: 300, overflowY: 'auto' }}>
          {[...history].reverse().map((record, i) => (
            <div key={i} style={{
              padding: '8px 12px', borderBottom: '1px solid #1a1a2e',
              background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#ccc', fontSize: '0.75rem' }}>{record.studioName}</span>
                <span style={{ color: '#666', fontSize: '0.65rem' }}>{record.date}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {record.awards.map((a, j) => (
                  <span key={j} style={{ fontSize: '0.65rem', color: '#aaa' }}>
                    {a.emoji} {a.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───

export default function CareerStats307() {
  const stats = useMemo(() => getLifetimeStats(), []);
  const recentRuns = useMemo(() => getRecentRuns(50), []);
  const diffStats = useMemo(() => getDifficultyWinRates(), []);

  if (stats.totalRuns === 0) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>📋</div>
        <h3 style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.3rem' }}>CAREER STATS</h3>
        <p style={{ color: '#888', fontSize: '0.85rem' }}>Complete your first run to start tracking your career.</p>
      </div>
    );
  }

  const avgRating = stats.totalFilms > 0
    ? Math.round(stats.runHistory.reduce((s, r) => s + r.avgQuality, 0) / stats.runHistory.length)
    : 0;

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '0 12px' }}>
      {/* Header Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24,
      }}>
        {[
          { label: 'Total Films', value: stats.totalFilms.toString(), emoji: '🎬', color: '#ccc' },
          { label: 'Total Box Office', value: `$${stats.totalBO.toFixed(0)}M`, emoji: '💰', color: 'var(--gold)' },
          { label: 'Avg Quality', value: avgRating.toString(), emoji: '⭐', color: '#f39c12' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.15)',
            borderRadius: 10, padding: '14px 8px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.8rem' }}>{s.emoji}</div>
            <div style={{ color: s.color, fontFamily: 'Bebas Neue', fontSize: '1.5rem' }}>{s.value}</div>
            <div style={{ color: '#888', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Records */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 24,
      }}>
        {stats.records.biggestBO && (
          <div style={{ background: 'rgba(46,204,113,0.06)', border: '1px solid rgba(46,204,113,0.2)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '0.8rem' }}>🏆 Best Single Film</div>
            <div style={{ color: '#ccc', fontSize: '0.8rem' }}>"{stats.records.biggestBO.filmTitle}"</div>
            <div style={{ color: '#888', fontSize: '0.65rem' }}>${stats.records.biggestBO.value.toFixed(1)}M</div>
          </div>
        )}
        {stats.records.worstFlop && (
          <div style={{ background: 'rgba(231,76,60,0.06)', border: '1px solid rgba(231,76,60,0.2)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ color: '#e74c3c', fontFamily: 'Bebas Neue', fontSize: '0.8rem' }}>💀 Worst Flop</div>
            <div style={{ color: '#ccc', fontSize: '0.8rem' }}>"{stats.records.worstFlop.filmTitle}"</div>
            <div style={{ color: '#888', fontSize: '0.65rem' }}>${stats.records.worstFlop.value.toFixed(1)}M</div>
          </div>
        )}
      </div>

      {/* Streaks */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 24, justifyContent: 'center',
      }}>
        <div style={{ background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 8, padding: '10px 20px', textAlign: 'center' }}>
          <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.3rem' }}>🔥 {stats.longestWinStreak}</div>
          <div style={{ color: '#888', fontSize: '0.6rem' }}>Longest Streak</div>
        </div>
        <div style={{ background: 'rgba(46,204,113,0.06)', border: '1px solid rgba(46,204,113,0.2)', borderRadius: 8, padding: '10px 20px', textAlign: 'center' }}>
          <div style={{ color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '1.3rem' }}>⚡ {stats.currentWinStreak}</div>
          <div style={{ color: '#888', fontSize: '0.6rem' }}>Current Streak</div>
        </div>
        <div style={{ background: 'rgba(52,152,219,0.06)', border: '1px solid rgba(52,152,219,0.2)', borderRadius: 8, padding: '10px 20px', textAlign: 'center' }}>
          <div style={{ color: '#3498db', fontFamily: 'Bebas Neue', fontSize: '1.3rem' }}>📊 {stats.totalRuns > 0 ? Math.round((stats.runHistory.filter(r => r.won).length / stats.totalRuns) * 100) : 0}%</div>
          <div style={{ color: '#888', fontSize: '0.6rem' }}>Win Rate</div>
        </div>
      </div>

      <GenreChart genreCounts={stats.genreFilmCounts} />
      <DifficultyRecord diffStats={diffStats} />
      <MilestonesSection stats={stats} />
      <AwardHistorySection />
      <StudioTimeline runs={recentRuns} />
    </div>
  );
}
