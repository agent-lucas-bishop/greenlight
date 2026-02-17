/**
 * R193: Rich Statistics & Analytics Dashboard
 */

import { useState, useEffect, useRef } from 'react';
import {
  getLifetimeStats, getRecentRuns, getDifficultyWinRates, getTrend,
  backfillFromLeaderboard, type RunStats, type LifetimeStats,
} from '../statistics';
import { getActiveSeasonalEvents, type SeasonalEvent } from '../seasonalEvents';
import { sfx } from '../sound';

type SubTab = 'overview' | 'records' | 'genres' | 'difficulty' | 'history' | 'seasonal';

const TREND_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  up: { icon: '📈', color: '#2ecc71', label: 'Improving' },
  down: { icon: '📉', color: '#e74c3c', label: 'Declining' },
  flat: { icon: '➡️', color: '#888', label: 'Steady' },
};

const DIFF_COLORS: Record<string, string> = {
  indie: '#2ecc71',
  studio: '#f39c12',
  mogul: '#e74c3c',
};

const DIFF_EMOJI: Record<string, string> = {
  indie: '🌱',
  studio: '🎬',
  mogul: '👑',
};

export default function StatsDashboard() {
  const [subTab, setSubTab] = useState<SubTab>('overview');
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  useEffect(() => { backfillFromLeaderboard(); }, []);

  const stats = getLifetimeStats();

  if (stats.totalRuns === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-title">No Analytics Yet</div>
        <div className="empty-state-desc">Complete your first run to see detailed analytics!</div>
      </div>
    );
  }

  const tabs: { key: SubTab; label: string }[] = [
    { key: 'overview', label: '📊 Overview' },
    { key: 'records', label: '🏆 Records' },
    { key: 'genres', label: '🎭 Genres' },
    { key: 'difficulty', label: '⚡ Difficulty' },
    { key: 'history', label: '📜 History' },
    { key: 'seasonal', label: '📅 Seasonal' },
  ];

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setSubTab(t.key); sfx.statReveal(); }} style={{
            background: subTab === t.key ? 'rgba(212,168,67,0.15)' : 'transparent',
            border: `1px solid ${subTab === t.key ? 'var(--gold-dim)' : '#333'}`,
            borderRadius: 6, padding: '8px 12px', color: subTab === t.key ? 'var(--gold)' : '#666',
            cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'Bebas Neue', letterSpacing: '0.05em',
            transition: 'all 0.2s', minHeight: 40,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'overview' && <OverviewSection stats={stats} />}
      {subTab === 'records' && <RecordsSection stats={stats} />}
      {subTab === 'genres' && <GenreSection stats={stats} />}
      {subTab === 'difficulty' && <DifficultySection />}
      {subTab === 'history' && <HistorySection expandedRun={expandedRun} setExpandedRun={setExpandedRun} />}
      {subTab === 'seasonal' && <SeasonalSection />}
    </div>
  );
}

// ─── Overview ───

function OverviewSection({ stats }: { stats: LifetimeStats }) {
  const trend = getTrend(5);
  const avgBO = stats.totalRuns > 0 ? stats.totalBO / stats.totalRuns : 0;
  const avgFilms = stats.totalRuns > 0 ? stats.totalFilms / stats.totalRuns : 0;
  const winCount = stats.runHistory.filter(r => r.won).length;
  const winRate = stats.totalRuns > 0 ? Math.round((winCount / stats.totalRuns) * 100) : 0;
  const avgQuality = stats.totalFilms > 0
    ? Math.round(stats.runHistory.reduce((s, r) => s + r.avgQuality * r.filmsMade, 0) / stats.totalFilms)
    : 0;

  const cards: { label: string; value: string; color: string; sub?: string }[] = [
    { label: 'Total Runs', value: stats.totalRuns.toString(), color: '#ccc' },
    { label: 'Total Films', value: stats.totalFilms.toString(), color: '#3498db' },
    { label: 'Lifetime BO', value: `$${stats.totalBO.toFixed(0)}M`, color: 'var(--gold)' },
    { label: 'Avg BO/Run', value: `$${avgBO.toFixed(1)}M`, color: '#e67e22' },
    { label: 'Win Rate', value: `${winRate}%`, color: winRate >= 50 ? '#2ecc71' : '#e74c3c', sub: `${winCount}W / ${stats.totalRuns - winCount}L` },
    { label: 'Avg Quality', value: avgQuality.toString(), color: '#f39c12' },
    { label: 'Avg Films/Run', value: avgFilms.toFixed(1), color: '#9b59b6' },
    { label: 'Win Streak', value: stats.longestWinStreak.toString(), color: '#e74c3c',
      sub: stats.currentWinStreak > 0 ? `Current: ${stats.currentWinStreak}` : undefined },
  ];

  return (
    <div>
      {/* Overview cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
        {cards.map((c, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid #222', borderRadius: 8,
            padding: '12px 6px', textAlign: 'center',
          }}>
            <div style={{ color: c.color, fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>{c.value}</div>
            <div style={{ color: '#888', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.label}</div>
            {c.sub && <div style={{ color: '#555', fontSize: '0.5rem', marginTop: 2 }}>{c.sub}</div>}
          </div>
        ))}
      </div>

      {/* Trend indicators */}
      {stats.runHistory.length >= 6 && (
        <div style={{
          display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 20, padding: '12px 16px',
          background: 'rgba(212,168,67,0.04)', border: '1px solid rgba(212,168,67,0.1)', borderRadius: 8,
        }}>
          <div style={{ color: '#888', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', alignSelf: 'center' }}>
            TRENDS (Last 5)
          </div>
          {([
            { label: 'Box Office', key: 'bo' as const },
            { label: 'Quality', key: 'quality' as const },
            { label: 'Win Rate', key: 'winRate' as const },
          ]).map(t => {
            const d = TREND_ICONS[trend[t.key]];
            return (
              <div key={t.key} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1rem' }}>{d.icon}</div>
                <div style={{ color: d.color, fontSize: '0.6rem', fontWeight: 600 }}>{d.label}</div>
                <div style={{ color: '#666', fontSize: '0.5rem' }}>{t.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Win/Loss bar */}
      {stats.totalRuns > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: '#2ecc71', fontSize: '0.65rem' }}>🏆 {winCount} Wins</span>
            <span style={{ color: '#e74c3c', fontSize: '0.65rem' }}>💀 {stats.totalRuns - winCount} Losses</span>
          </div>
          <div style={{ width: '100%', height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${winRate}%`, height: '100%', background: '#2ecc71' }} />
            <div style={{ flex: 1, height: '100%', background: '#e74c3c' }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Records ───

function RecordsSection({ stats }: { stats: LifetimeStats }) {
  const { records } = stats;

  const recordCards: { label: string; emoji: string; value: string; sub: string; color: string }[] = [];

  if (records.biggestBO) {
    recordCards.push({
      label: 'Biggest Box Office', emoji: '💰', color: 'var(--gold)',
      value: `$${records.biggestBO.value.toFixed(1)}M`,
      sub: `"${records.biggestBO.filmTitle}" · ${records.biggestBO.runDate}`,
    });
  }
  if (records.worstFlop) {
    recordCards.push({
      label: 'Worst Flop', emoji: '💀', color: '#e74c3c',
      value: `$${records.worstFlop.value.toFixed(1)}M`,
      sub: `"${records.worstFlop.filmTitle}" · ${records.worstFlop.runDate}`,
    });
  }
  if (records.highestQuality) {
    recordCards.push({
      label: 'Highest Quality', emoji: '⭐', color: '#f39c12',
      value: records.highestQuality.value.toString(),
      sub: `"${records.highestQuality.filmTitle}" · ${records.highestQuality.runDate}`,
    });
  }
  if (records.highestCriticScore) {
    recordCards.push({
      label: 'Best Critic Score', emoji: '🍅', color: '#e74c3c',
      value: `${records.highestCriticScore.value}%`,
      sub: `"${records.highestCriticScore.filmTitle}" · ${records.highestCriticScore.runDate}`,
    });
  }
  if (records.mostFilmsInRun) {
    recordCards.push({
      label: 'Most Films in One Run', emoji: '🎬', color: '#3498db',
      value: records.mostFilmsInRun.value.toString(),
      sub: records.mostFilmsInRun.runDate,
    });
  }
  if (records.highestRunBO) {
    recordCards.push({
      label: 'Best Single Run BO', emoji: '🏆', color: '#2ecc71',
      value: `$${records.highestRunBO.value.toFixed(1)}M`,
      sub: records.highestRunBO.runDate,
    });
  }

  if (recordCards.length === 0) {
    return <div style={{ color: '#666', textAlign: 'center', padding: 40 }}>No records yet. Keep playing!</div>;
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {recordCards.map((r, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid #222', borderRadius: 10,
            padding: '16px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: '1.2rem' }}>{r.emoji}</span>
              <span style={{ color: '#888', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r.label}</span>
            </div>
            <div style={{ color: r.color, fontFamily: 'Bebas Neue', fontSize: '1.5rem' }}>{r.value}</div>
            <div style={{ color: '#555', fontSize: '0.6rem', marginTop: 2 }}>{r.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Genre Breakdown ───

function GenreSection({ stats }: { stats: LifetimeStats }) {
  const entries = Object.entries(stats.genreFilmCounts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <div style={{ color: '#666', textAlign: 'center', padding: 40 }}>No genre data yet.</div>;

  const maxCount = Math.max(...entries.map(e => e[1]));
  const maxBO = Math.max(...Object.values(stats.genreBOTotals));

  const genreColors: Record<string, string> = {
    Action: '#e74c3c', Comedy: '#f39c12', Drama: '#3498db', Horror: '#8e44ad',
    'Sci-Fi': '#1abc9c', Romance: '#e91e63', Thriller: '#95a5a6',
  };

  return (
    <div>
      {/* Films by genre - horizontal bars */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ color: 'var(--gold)', fontSize: '0.8rem', marginBottom: 12, letterSpacing: 1 }}>
          🎬 FILMS BY GENRE
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map(([genre, count]) => {
            const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const color = genreColors[genre] || '#888';
            const avgBO = stats.genreBOTotals[genre] ? (stats.genreBOTotals[genre] / count).toFixed(1) : '0';
            return (
              <div key={genre}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: '#ccc', fontSize: '0.75rem', fontWeight: 600 }}>{genre}</span>
                  <span style={{ color: '#888', fontSize: '0.65rem' }}>
                    {count} film{count !== 1 ? 's' : ''} · Avg ${avgBO}M
                  </span>
                </div>
                <div style={{ width: '100%', height: 14, background: '#1a1a1a', borderRadius: 7, overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: `linear-gradient(90deg, ${color}88, ${color})`,
                    borderRadius: 7, transition: 'width 0.5s ease',
                    minWidth: pct > 0 ? 20 : 0,
                  }} />
                  <span style={{
                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                    color: '#fff', fontSize: '0.55rem', fontFamily: 'Bebas Neue', textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                  }}>
                    {count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total BO by genre */}
      <div>
        <h3 style={{ color: 'var(--gold)', fontSize: '0.8rem', marginBottom: 12, letterSpacing: 1 }}>
          💰 BOX OFFICE BY GENRE
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(stats.genreBOTotals).sort((a, b) => b[1] - a[1]).map(([genre, bo]) => {
            const pct = maxBO > 0 ? (bo / maxBO) * 100 : 0;
            const color = genreColors[genre] || '#888';
            return (
              <div key={genre}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: '#ccc', fontSize: '0.75rem', fontWeight: 600 }}>{genre}</span>
                  <span style={{ color: '#888', fontSize: '0.65rem' }}>${bo.toFixed(0)}M total</span>
                </div>
                <div style={{ width: '100%', height: 14, background: '#1a1a1a', borderRadius: 7, overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: `linear-gradient(90deg, ${color}88, ${color})`,
                    borderRadius: 7, transition: 'width 0.5s ease',
                    minWidth: pct > 0 ? 20 : 0,
                  }} />
                  <span style={{
                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                    color: '#fff', fontSize: '0.55rem', fontFamily: 'Bebas Neue', textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                  }}>
                    ${bo.toFixed(0)}M
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Difficulty Comparison ───

function DifficultySection() {
  const diffStats = getDifficultyWinRates();
  const diffs = ['indie', 'studio', 'mogul'];

  if (Object.keys(diffStats).length === 0) {
    return <div style={{ color: '#666', textAlign: 'center', padding: 40 }}>No difficulty data yet.</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {diffs.map(diff => {
          const ds = diffStats[diff];
          if (!ds) {
            return (
              <div key={diff} style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid #222', borderRadius: 10,
                padding: '16px', textAlign: 'center', opacity: 0.4,
              }}>
                <span style={{ fontSize: '1.2rem' }}>{DIFF_EMOJI[diff]}</span>
                <span style={{ color: '#888', fontSize: '0.8rem', marginLeft: 8, textTransform: 'capitalize' }}>{diff}</span>
                <span style={{ color: '#555', fontSize: '0.7rem', marginLeft: 8 }}>No runs yet</span>
              </div>
            );
          }
          const color = DIFF_COLORS[diff] || '#888';
          return (
            <div key={diff} style={{
              background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}33`, borderRadius: 10,
              padding: '16px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: '1.3rem' }}>{DIFF_EMOJI[diff]}</span>
                <span style={{ color, fontFamily: 'Bebas Neue', fontSize: '1.2rem', textTransform: 'uppercase' }}>{diff}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color, fontFamily: 'Bebas Neue', fontSize: '1.3rem' }}>{ds.runs}</div>
                  <div style={{ color: '#888', fontSize: '0.55rem' }}>RUNS</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color, fontFamily: 'Bebas Neue', fontSize: '1.3rem' }}>{ds.wins}</div>
                  <div style={{ color: '#888', fontSize: '0.55rem' }}>WINS</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color, fontFamily: 'Bebas Neue', fontSize: '1.3rem' }}>{ds.winRate}%</div>
                  <div style={{ color: '#888', fontSize: '0.55rem' }}>WIN RATE</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color, fontFamily: 'Bebas Neue', fontSize: '1.3rem' }}>${ds.avgBO.toFixed(1)}M</div>
                  <div style={{ color: '#888', fontSize: '0.55rem' }}>AVG BO</div>
                </div>
              </div>
              {/* Win rate bar */}
              <div style={{ marginTop: 10, width: '100%', height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${ds.winRate}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Run History ───

function HistorySection({ expandedRun, setExpandedRun }: { expandedRun: string | null; setExpandedRun: (id: string | null) => void }) {
  const runs = getRecentRuns(20);
  const tierColors: Record<string, string> = { BLOCKBUSTER: '#2ecc71', SMASH: '#f1c40f', HIT: '#e67e22', FLOP: '#e74c3c' };
  const tierEmoji: Record<string, string> = { BLOCKBUSTER: '🟩', SMASH: '🟨', HIT: '🟧', FLOP: '🟥' };

  if (runs.length === 0) return <div style={{ color: '#666', textAlign: 'center', padding: 40 }}>No run history yet.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {runs.map(run => {
        const isExpanded = expandedRun === run.id;
        return (
          <div key={run.id} style={{
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid ${run.won ? 'rgba(46,204,113,0.2)' : 'rgba(231,76,60,0.2)'}`,
            borderRadius: 8, padding: '12px 14px', cursor: 'pointer', transition: 'border-color 0.2s',
          }} onClick={() => setExpandedRun(isExpanded ? null : run.id)}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: run.won ? '#2ecc71' : '#e74c3c', fontSize: '0.8rem' }}>{run.won ? '🏆' : '💀'}</span>
                <span style={{ color: '#888', fontSize: '0.65rem' }}>{run.date}</span>
                {run.studioName && <span style={{ color: '#555', fontSize: '0.6rem' }}>· {run.studioName}</span>}
                <span style={{ color: DIFF_COLORS[run.difficulty] || '#888', fontSize: '0.6rem', textTransform: 'capitalize' }}>
                  {DIFF_EMOJI[run.difficulty]} {run.difficulty}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.9rem' }}>${run.totalBO.toFixed(1)}M</span>
                <span style={{ color: '#555', fontSize: '0.7rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : '' }}>▾</span>
              </div>
            </div>

            {/* Film tier strip */}
            <div style={{ display: 'flex', gap: 2 }}>
              {run.films.map((f, j) => (
                <span key={j} title={`${f.title} (${f.genre}) - ${f.tier}`}>{tierEmoji[f.tier] || '⬜'}</span>
              ))}
            </div>

            {/* Expanded details */}
            {isExpanded && (
              <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }} onClick={e => e.stopPropagation()}>
                {/* Summary stats */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.9rem' }}>{run.filmsMade}</div>
                    <div style={{ color: '#888', fontSize: '0.5rem' }}>FILMS</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#f39c12', fontFamily: 'Bebas Neue', fontSize: '0.9rem' }}>Q{run.avgQuality}</div>
                    <div style={{ color: '#888', fontSize: '0.5rem' }}>AVG QUALITY</div>
                  </div>
                  {run.avgCriticScore > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#e74c3c', fontFamily: 'Bebas Neue', fontSize: '0.9rem' }}>{run.avgCriticScore}%</div>
                      <div style={{ color: '#888', fontSize: '0.5rem' }}>AVG CRITIC</div>
                    </div>
                  )}
                  {run.avgAudienceScore > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#3498db', fontFamily: 'Bebas Neue', fontSize: '0.9rem' }}>{run.avgAudienceScore}%</div>
                      <div style={{ color: '#888', fontSize: '0.5rem' }}>AVG AUDIENCE</div>
                    </div>
                  )}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#9b59b6', fontFamily: 'Bebas Neue', fontSize: '0.9rem' }}>{run.genresUsed.join(', ')}</div>
                    <div style={{ color: '#888', fontSize: '0.5rem' }}>GENRES</div>
                  </div>
                </div>

                {/* Film-by-film */}
                {run.films.map((f, j) => (
                  <div key={j} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
                    borderBottom: j < run.films.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                  }}>
                    <span style={{ color: tierColors[f.tier], fontSize: '0.8rem' }}>{tierEmoji[f.tier]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#ccc', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</div>
                      <div style={{ color: '#666', fontSize: '0.55rem' }}>{f.genre} · Q:{f.quality} · {f.tier}</div>
                    </div>
                    <span style={{ color: tierColors[f.tier], fontFamily: 'Bebas Neue', fontSize: '0.8rem' }}>${f.bo.toFixed(1)}M</span>
                  </div>
                ))}

                {/* Best/Worst */}
                {run.bestFilm && run.worstFilm && run.filmsMade > 1 && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <div style={{ flex: 1, background: 'rgba(46,204,113,0.06)', border: '1px solid rgba(46,204,113,0.15)', borderRadius: 6, padding: '6px 8px' }}>
                      <div style={{ color: '#2ecc71', fontSize: '0.55rem', textTransform: 'uppercase' }}>Best</div>
                      <div style={{ color: '#ccc', fontSize: '0.7rem' }}>"{run.bestFilm.title}" ${run.bestFilm.bo.toFixed(1)}M</div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(231,76,60,0.06)', border: '1px solid rgba(231,76,60,0.15)', borderRadius: 6, padding: '6px 8px' }}>
                      <div style={{ color: '#e74c3c', fontSize: '0.55rem', textTransform: 'uppercase' }}>Worst</div>
                      <div style={{ color: '#ccc', fontSize: '0.7rem' }}>"{run.worstFilm.title}" ${run.worstFilm.bo.toFixed(1)}M</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Compact stat summary for EndScreen */
export function EndScreenStatsSummary() {
  const stats = getLifetimeStats();
  if (stats.totalRuns < 2) return null; // not useful until 2+ runs

  const trend = getTrend(5);
  const winCount = stats.runHistory.filter(r => r.won).length;
  const winRate = stats.totalRuns > 0 ? Math.round((winCount / stats.totalRuns) * 100) : 0;

  return (
    <div style={{
      background: 'rgba(212,168,67,0.04)', border: '1px solid rgba(212,168,67,0.1)',
      borderRadius: 8, padding: '10px 14px', marginTop: 12,
    }}>
      <div style={{ color: '#888', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        📊 Lifetime Stats
      </div>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.85rem' }}>{stats.totalRuns}</div>
          <div style={{ color: '#666', fontSize: '0.5rem' }}>RUNS</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#3498db', fontFamily: 'Bebas Neue', fontSize: '0.85rem' }}>{stats.totalFilms}</div>
          <div style={{ color: '#666', fontSize: '0.5rem' }}>FILMS</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.85rem' }}>${stats.totalBO.toFixed(0)}M</div>
          <div style={{ color: '#666', fontSize: '0.5rem' }}>LIFETIME BO</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: winRate >= 50 ? '#2ecc71' : '#e74c3c', fontFamily: 'Bebas Neue', fontSize: '0.85rem' }}>{winRate}%</div>
          <div style={{ color: '#666', fontSize: '0.5rem' }}>WIN RATE</div>
        </div>
        {stats.currentWinStreak > 1 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#f39c12', fontFamily: 'Bebas Neue', fontSize: '0.85rem' }}>🔥{stats.currentWinStreak}</div>
            <div style={{ color: '#666', fontSize: '0.5rem' }}>STREAK</div>
          </div>
        )}
        {stats.runHistory.length >= 6 && trend.bo !== 'flat' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem' }}>{TREND_ICONS[trend.bo].icon}</div>
            <div style={{ color: TREND_ICONS[trend.bo].color, fontSize: '0.5rem' }}>{TREND_ICONS[trend.bo].label}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Seasonal Events ───

function SeasonalSection() {
  const activeEvents = getActiveSeasonalEvents();
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const currentMonth = new Date().getMonth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: '0.8rem', fontFamily: 'Bebas Neue', letterSpacing: '0.08em', color: '#aaa' }}>
          📅 Current Month: {MONTH_NAMES[currentMonth]}
        </div>
        {activeEvents.length > 0 ? (
          <div style={{ color: activeEvents[0].themeColor, fontSize: '0.75rem', marginTop: 4 }}>
            {activeEvents.length} active event{activeEvents.length > 1 ? 's' : ''} right now!
          </div>
        ) : (
          <div style={{ color: '#666', fontSize: '0.7rem', marginTop: 4 }}>No seasonal events active this month.</div>
        )}
      </div>

      {/* Active events highlighted */}
      {activeEvents.map((event: SeasonalEvent) => (
        <div key={event.id} style={{
          background: `${event.themeColor}15`,
          border: `1px solid ${event.themeColor}50`,
          borderRadius: 8, padding: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: '1.2rem' }}>{event.emoji}</span>
            <span style={{ fontFamily: 'Bebas Neue', fontSize: '0.85rem', color: event.themeColor, letterSpacing: '0.06em' }}>
              {event.name}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: '#888', background: '#222', borderRadius: 4, padding: '2px 6px' }}>
              ACTIVE NOW
            </span>
          </div>
          <div style={{ fontSize: '0.65rem', color: '#999', marginBottom: 6 }}>{event.description}</div>
          <div style={{ display: 'flex', gap: 12, fontSize: '0.6rem', color: '#aaa', flexWrap: 'wrap' }}>
            <span>Genres: <strong style={{ color: event.themeColor }}>{event.affectedGenres.join(', ')}</strong></span>
            {event.boMultiplier !== 1.0 && <span>BO: <strong style={{ color: '#2ecc71' }}>×{event.boMultiplier.toFixed(2)}</strong></span>}
            {event.qualityBonus > 0 && <span>Quality: <strong style={{ color: '#3b82f6' }}>+{event.qualityBonus}</strong></span>}
            {event.criticBonus > 0 && <span>Critic: <strong style={{ color: '#d4a843' }}>+{event.criticBonus}</strong></span>}
          </div>
        </div>
      ))}

      {/* Full calendar */}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: '0.7rem', fontFamily: 'Bebas Neue', color: '#888', letterSpacing: '0.08em', marginBottom: 8 }}>
          Year-Round Calendar
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {MONTH_NAMES.map((name, i) => {
            const events = getActiveSeasonalEvents(i);
            const isNow = i === currentMonth;
            return (
              <div key={i} style={{
                background: isNow ? 'rgba(212,168,67,0.1)' : '#1a1a1a',
                border: `1px solid ${isNow ? 'var(--gold-dim)' : '#333'}`,
                borderRadius: 6, padding: '6px 8px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '0.6rem', color: isNow ? 'var(--gold)' : '#888', fontFamily: 'Bebas Neue' }}>{name}</div>
                {events.length > 0 ? (
                  <div style={{ marginTop: 2 }}>
                    {events.map(e => (
                      <div key={e.id} style={{ fontSize: '0.85rem' }} title={e.name}>{e.emoji}</div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.55rem', color: '#444', marginTop: 2 }}>—</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
