/**
 * R282: Comprehensive Analytics Dashboard with pure CSS/SVG charts
 */

import { useState, useMemo } from 'react';
import {
  getLifetimeStats, getRecentRuns, getDifficultyWinRates, getTrend,
  backfillFromLeaderboard, type RunStats,
} from '../statistics';
import {
  getCareerAnalytics, getCareerAverages, getFavoriteTalent, formatPlayTime,
} from '../careerAnalytics';
import { getAnalytics } from '../analytics';
import { getLeaderboard } from '../leaderboard';

type DashTab = 'overview' | 'genres' | 'cards' | 'trends' | 'sessions';

// ─── Helpers ───

function formatBO(n: number): string {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}B` : `$${n.toFixed(1)}M`;
}

function getDayName(day: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day] || '?';
}

function getHourLabel(hour: number): string {
  if (hour === 0) return '12a';
  if (hour < 12) return `${hour}a`;
  if (hour === 12) return '12p';
  return `${hour - 12}p`;
}

// ─── SVG Line Chart ───

function SVGLineChart({ data, width = 400, height = 120, color = '#d4a843', label = '' }: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  label?: string;
}) {
  if (data.length < 2) return <div style={{ color: '#666', fontSize: '0.75rem', textAlign: 'center', padding: 20 }}>Not enough data yet</div>;

  const padding = { top: 10, right: 10, bottom: 20, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal || 1;

  const points = data.map((v, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((v - minVal) / range) * chartH,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = padding.top + chartH * (1 - pct);
        return <line key={pct} x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />;
      })}
      {/* Area fill */}
      <path d={areaD} fill={`url(#grad-${label})`} />
      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} opacity="0.8" />
      ))}
      {/* Min/Max labels */}
      <text x={padding.left} y={padding.top - 2} fill="#888" fontSize="8" textAnchor="start">{Math.round(maxVal)}</text>
      <text x={padding.left} y={padding.top + chartH + 12} fill="#888" fontSize="8" textAnchor="start">{Math.round(minVal)}</text>
      {/* X-axis labels */}
      {data.length <= 20 && points.filter((_, i) => i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)).map((p, idx) => {
        const origIdx = idx === 0 ? 0 : idx === 1 ? Math.floor(data.length / 2) : data.length - 1;
        return <text key={idx} x={p.x} y={height - 2} fill="#666" fontSize="7" textAnchor="middle">#{origIdx + 1}</text>;
      })}
    </svg>
  );
}

// ─── CSS Bar Chart ───

function CSSBarChart({ items, maxValue }: {
  items: { label: string; value: number; color: string; secondary?: number; secondaryColor?: string }[];
  maxValue?: number;
}) {
  const max = maxValue ?? Math.max(...items.map(i => i.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: '#ccc', fontSize: '0.75rem' }}>{item.label}</span>
            <span style={{ color: item.color, fontSize: '0.75rem', fontFamily: 'Bebas Neue' }}>{typeof item.value === 'number' ? (item.value >= 100 ? Math.round(item.value) : item.value.toFixed(1)) : item.value}</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 3, height: 8, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              width: `${Math.min(100, (item.value / max) * 100)}%`,
              height: '100%', background: item.color, borderRadius: 3,
              transition: 'width 0.5s ease',
            }} />
            {item.secondary != null && (
              <div style={{
                position: 'absolute', top: 0, left: 0,
                width: `${Math.min(100, (item.secondary / max) * 100)}%`,
                height: '100%', background: item.secondaryColor || '#fff',
                borderRadius: 3, opacity: 0.3,
              }} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Calendar Heatmap ───

function CalendarHeatmap({ dates }: { dates: Record<string, number> }) {
  // Build last 90 days
  const today = new Date();
  const cells: { date: string; count: number; dayOfWeek: number }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, count: dates[key] || 0, dayOfWeek: d.getDay() });
  }
  const maxCount = Math.max(...cells.map(c => c.count), 1);

  const getColor = (count: number) => {
    if (count === 0) return 'rgba(255,255,255,0.04)';
    const intensity = count / maxCount;
    if (intensity > 0.75) return '#d4a843';
    if (intensity > 0.5) return 'rgba(212,168,67,0.7)';
    if (intensity > 0.25) return 'rgba(212,168,67,0.4)';
    return 'rgba(212,168,67,0.2)';
  };

  // Arrange into weeks (columns)
  const weeks: typeof cells[] = [];
  let currentWeek: typeof cells = [];
  for (const cell of cells) {
    if (cell.dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(cell);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {/* Day labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginRight: 4, paddingTop: 0 }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} style={{ width: 10, height: 10, fontSize: '0.5rem', color: '#666', lineHeight: '10px', textAlign: 'right' }}>
              {i % 2 === 1 ? d : ''}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Pad start of first week */}
            {wi === 0 && Array.from({ length: week[0]?.dayOfWeek || 0 }).map((_, pi) => (
              <div key={`pad-${pi}`} style={{ width: 10, height: 10 }} />
            ))}
            {week.map((cell, ci) => (
              <div
                key={ci}
                title={`${cell.date}: ${cell.count} run${cell.count !== 1 ? 's' : ''}`}
                style={{
                  width: 10, height: 10, borderRadius: 2,
                  background: getColor(cell.count),
                  cursor: 'default',
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', marginTop: 6, alignItems: 'center' }}>
        <span style={{ color: '#666', fontSize: '0.55rem' }}>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map(pct => (
          <div key={pct} style={{ width: 10, height: 10, borderRadius: 2, background: getColor(pct * maxCount) }} />
        ))}
        <span style={{ color: '#666', fontSize: '0.55rem' }}>More</span>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───

export default function AnalyticsDashboard() {
  const [tab, setTab] = useState<DashTab>('overview');

  const stats = useMemo(() => {
    backfillFromLeaderboard();
    return getLifetimeStats();
  }, []);
  const career = useMemo(() => getCareerAnalytics(), []);
  const analytics = useMemo(() => getAnalytics(), []);
  const averages = useMemo(() => getCareerAverages(), []);
  const recentRuns = useMemo(() => getRecentRuns(20), []);
  const leaderboard = useMemo(() => getLeaderboard(), []);
  const diffWinRates = useMemo(() => getDifficultyWinRates(), []);
  const trend = useMemo(() => getTrend(5), []);
  const favTalent = useMemo(() => getFavoriteTalent(), []);

  // Derived data
  const totalPlaytime = career.totalPlayTimeMs || (analytics.runDurations?.reduce((a: number, b: number) => a + b, 0) ?? 0);
  const totalRuns = stats.totalRuns || career.totalRunsCompleted || analytics.runsCompleted;
  const winRate = totalRuns > 0 ? Math.round(((career.totalRunsWon || analytics.runsWon) / totalRuns) * 100) : 0;
  const bestScore = analytics.scores.length > 0 ? Math.max(...analytics.scores) : 0;
  const avgScore = analytics.scores.length > 0 ? Math.round(analytics.scores.reduce((a, b) => a + b, 0) / analytics.scores.length) : 0;

  // Session date analysis
  const sessionDates = useMemo(() => {
    const dateMap: Record<string, number> = {};
    const dayOfWeekCounts: number[] = new Array(7).fill(0);
    const hourCounts: number[] = new Array(24).fill(0);
    for (const run of stats.runHistory) {
      if (run.date && run.date !== 'Unknown') {
        dateMap[run.date] = (dateMap[run.date] || 0) + 1;
        try {
          const d = new Date(run.date);
          dayOfWeekCounts[d.getDay()]++;
        } catch { /* ignore */ }
      }
    }
    // Also check analytics sessionStart timestamps for hour distribution
    // Approximate from run durations - use leaderboard dates
    for (const entry of leaderboard) {
      if (entry.date) {
        try {
          const d = new Date(entry.date);
          dayOfWeekCounts[d.getDay()]++;
        } catch { /* ignore */ }
      }
    }
    const busiestDay = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
    return { dateMap, dayOfWeekCounts, hourCounts, busiestDay };
  }, [stats.runHistory, leaderboard]);

  // Genre data
  const genreData = useMemo(() => {
    const genres = Object.keys(stats.genreFilmCounts);
    return genres.map(genre => {
      const count = stats.genreFilmCounts[genre] || 0;
      const totalBO = stats.genreBOTotals[genre] || 0;
      const avgBO = count > 0 ? totalBO / count : 0;
      // Calculate win rate per genre from run history
      let genreWins = 0;
      let genreTotal = 0;
      for (const run of stats.runHistory) {
        if (run.genresUsed.includes(genre)) {
          genreTotal++;
          if (run.won) genreWins++;
        }
      }
      const avgQuality = (() => {
        let totalQ = 0;
        let qCount = 0;
        for (const run of stats.runHistory) {
          for (const f of run.films) {
            if (f.genre === genre) { totalQ += f.quality; qCount++; }
          }
        }
        return qCount > 0 ? Math.round(totalQ / qCount) : 0;
      })();
      return { genre, count, totalBO, avgBO, winRate: genreTotal > 0 ? Math.round((genreWins / genreTotal) * 100) : 0, avgQuality };
    }).sort((a, b) => b.totalBO - a.totalBO);
  }, [stats]);

  // Card stats from leaderboard film data
  const cardStats = useMemo(() => {
    // Rarity distribution of tiers
    const tierCounts: Record<string, number> = {};
    for (const run of stats.runHistory) {
      for (const f of run.films) {
        tierCounts[f.tier] = (tierCounts[f.tier] || 0) + 1;
      }
    }
    return { tierCounts };
  }, [stats]);

  // Trend data
  const scoreProgression = useMemo(() => {
    return recentRuns.slice().reverse().map(r => r.score);
  }, [recentRuns]);

  const earningsTrend = useMemo(() => {
    return recentRuns.slice().reverse().map(r => r.totalBO);
  }, [recentRuns]);

  const qualityTrend = useMemo(() => {
    return recentRuns.slice().reverse().map(r => r.avgQuality);
  }, [recentRuns]);

  if (totalRuns === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-title">No Analytics Yet</div>
        <div className="empty-state-desc">Complete your first run to see the analytics dashboard!</div>
      </div>
    );
  }

  const GENRE_COLORS: Record<string, string> = {
    Action: '#e74c3c',
    Comedy: '#f1c40f',
    Drama: '#9b59b6',
    Horror: '#1abc9c',
    'Sci-Fi': '#3498db',
    Romance: '#e91e63',
    Thriller: '#e67e22',
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h2 style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', letterSpacing: 2, textAlign: 'center', marginBottom: 16 }}>
        📊 ANALYTICS DASHBOARD
      </h2>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
        {([
          { id: 'overview' as const, label: '📋 Overview' },
          { id: 'genres' as const, label: '🎭 Genres' },
          { id: 'cards' as const, label: '🃏 Films' },
          { id: 'trends' as const, label: '📈 Trends' },
          { id: 'sessions' as const, label: '📅 Sessions' },
        ]).map(t => (
          <button key={t.id} className={`btn btn-small${tab === t.id ? '' : ''}`}
            onClick={() => setTab(t.id)}
            style={{
              color: tab === t.id ? 'var(--gold)' : '#666',
              borderColor: tab === t.id ? 'var(--gold)' : 'rgba(255,255,255,0.1)',
              background: tab === t.id ? 'rgba(212,168,67,0.1)' : 'transparent',
              fontSize: '0.75rem',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── OVERVIEW TAB ─── */}
      {tab === 'overview' && (
        <div className="animate-slide-down">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Total Runs', value: totalRuns.toString(), color: '#ccc' },
              { label: 'Win Rate', value: `${winRate}%`, color: winRate >= 50 ? '#2ecc71' : '#e74c3c' },
              { label: 'Playtime', value: formatPlayTime(totalPlaytime), color: '#9b59b6' },
              { label: 'Avg Score', value: avgScore.toString(), color: '#3498db' },
              { label: 'Best Score', value: bestScore.toString(), color: '#f39c12' },
              { label: 'Avg Duration', value: analytics.runDurations.length > 0 ? `${Math.round(analytics.runDurations.reduce((a, b) => a + b, 0) / analytics.runDurations.length / 60000)}m` : '—', color: '#e67e22' },
              { label: 'Total Films', value: stats.totalFilms.toString(), color: '#2ecc71' },
              { label: 'Lifetime BO', value: formatBO(stats.totalBO), color: 'var(--gold)' },
              { label: 'Win Streak', value: `🔥 ${stats.longestWinStreak}`, color: '#f39c12' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #222', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ color: s.color, fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>{s.value}</div>
                <div style={{ color: '#888', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Trend indicators */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
            {([
              { label: 'Box Office', trend: trend.bo },
              { label: 'Quality', trend: trend.quality },
              { label: 'Win Rate', trend: trend.winRate },
            ]).map(t => {
              const icon = t.trend === 'up' ? '📈' : t.trend === 'down' ? '📉' : '➡️';
              const color = t.trend === 'up' ? '#2ecc71' : t.trend === 'down' ? '#e74c3c' : '#888';
              return (
                <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
                  <span>{icon}</span>
                  <span style={{ color }}>{t.label}: {t.trend === 'up' ? 'Improving' : t.trend === 'down' ? 'Declining' : 'Steady'}</span>
                </div>
              );
            })}
          </div>

          {/* Difficulty win rates */}
          {Object.keys(diffWinRates).length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ color: 'var(--gold)', fontSize: '0.85rem', marginBottom: 8, letterSpacing: 1 }}>🎮 BY DIFFICULTY</h3>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {Object.entries(diffWinRates).map(([diff, data]) => {
                  const colors: Record<string, string> = { indie: '#2ecc71', studio: '#f39c12', mogul: '#e74c3c', nightmare: '#9b59b6', custom: '#3498db' };
                  return (
                    <div key={diff} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors[diff] || '#333'}30`, borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 80 }}>
                      <div style={{ color: colors[diff] || '#ccc', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{data.winRate}%</div>
                      <div style={{ color: '#888', fontSize: '0.6rem' }}>{diff} ({data.runs})</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Favorite talent */}
          {favTalent && (
            <div style={{ textAlign: 'center', color: '#888', fontSize: '0.75rem', marginBottom: 16 }}>
              🎭 Most hired talent: <span style={{ color: 'var(--gold)' }}>{favTalent.name}</span> (×{favTalent.count})
            </div>
          )}
        </div>
      )}

      {/* ─── GENRES TAB ─── */}
      {tab === 'genres' && (
        <div className="animate-slide-down">
          <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 12, letterSpacing: 1 }}>💰 EARNINGS PER GENRE</h3>
          <CSSBarChart
            items={genreData.map(g => ({
              label: `${g.genre} (${g.count} films)`,
              value: g.totalBO,
              color: GENRE_COLORS[g.genre] || '#888',
            }))}
          />

          <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 12, marginTop: 24, letterSpacing: 1 }}>⭐ AVG QUALITY PER GENRE</h3>
          <CSSBarChart
            items={genreData.map(g => ({
              label: g.genre,
              value: g.avgQuality,
              color: GENRE_COLORS[g.genre] || '#888',
            }))}
            maxValue={Math.max(...genreData.map(g => g.avgQuality), 50)}
          />

          <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 12, marginTop: 24, letterSpacing: 1 }}>📊 GENRE WIN RATES</h3>
          <CSSBarChart
            items={genreData.filter(g => g.winRate > 0 || g.count >= 2).map(g => ({
              label: `${g.genre} (${g.winRate}%)`,
              value: g.winRate,
              color: g.winRate >= 60 ? '#2ecc71' : g.winRate >= 40 ? '#f39c12' : '#e74c3c',
            }))}
            maxValue={100}
          />

          <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 12, marginTop: 24, letterSpacing: 1 }}>💵 AVG BO PER GENRE</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {genreData.sort((a, b) => b.avgBO - a.avgBO).map(g => (
              <div key={g.genre} style={{
                background: `${GENRE_COLORS[g.genre] || '#888'}15`,
                border: `1px solid ${GENRE_COLORS[g.genre] || '#888'}40`,
                borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 90,
              }}>
                <div style={{ color: GENRE_COLORS[g.genre] || '#ccc', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>
                  {formatBO(g.avgBO)}
                </div>
                <div style={{ color: '#888', fontSize: '0.6rem' }}>{g.genre}</div>
              </div>
            ))}
          </div>

          {/* Best/Worst genre */}
          {genreData.length >= 2 && (
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 20 }}>
              <div style={{ textAlign: 'center', padding: '8px 16px', background: 'rgba(46,204,113,0.08)', borderRadius: 8, border: '1px solid rgba(46,204,113,0.2)' }}>
                <div style={{ color: '#2ecc71', fontSize: '0.6rem', textTransform: 'uppercase' }}>Best Genre</div>
                <div style={{ color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{genreData[0].genre}</div>
                <div style={{ color: '#888', fontSize: '0.65rem' }}>{formatBO(genreData[0].totalBO)} total</div>
              </div>
              <div style={{ textAlign: 'center', padding: '8px 16px', background: 'rgba(231,76,60,0.08)', borderRadius: 8, border: '1px solid rgba(231,76,60,0.2)' }}>
                <div style={{ color: '#e74c3c', fontSize: '0.6rem', textTransform: 'uppercase' }}>Worst Genre</div>
                <div style={{ color: '#e74c3c', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{genreData[genreData.length - 1].genre}</div>
                <div style={{ color: '#888', fontSize: '0.65rem' }}>{formatBO(genreData[genreData.length - 1].totalBO)} total</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── FILMS/CARDS TAB ─── */}
      {tab === 'cards' && (
        <div className="animate-slide-down">
          {/* Tier distribution */}
          <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 12, letterSpacing: 1 }}>🎬 FILM TIER DISTRIBUTION</h3>
          {(() => {
            const tiers = [
              { key: 'BLOCKBUSTER', label: 'Blockbuster', color: '#2ecc71', emoji: '🟩' },
              { key: 'SMASH', label: 'Smash', color: '#f1c40f', emoji: '🟨' },
              { key: 'HIT', label: 'Hit', color: '#e67e22', emoji: '🟧' },
              { key: 'FLOP', label: 'Flop', color: '#e74c3c', emoji: '🟥' },
            ];
            const total = Object.values(cardStats.tierCounts).reduce((a, b) => a + b, 0) || 1;
            return (
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
                {tiers.map(t => {
                  const count = cardStats.tierCounts[t.key] || 0;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={t.key} style={{ flex: '1 1 100px', maxWidth: 130, textAlign: 'center', padding: '10px 8px', background: `${t.color}10`, border: `1px solid ${t.color}30`, borderRadius: 8 }}>
                      <div style={{ fontSize: '1.2rem' }}>{t.emoji}</div>
                      <div style={{ color: t.color, fontFamily: 'Bebas Neue', fontSize: '1.3rem' }}>{count}</div>
                      <div style={{ color: '#888', fontSize: '0.6rem' }}>{t.label} ({pct}%)</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Tier ratio bar */}
          {(() => {
            const tierOrder = ['BLOCKBUSTER', 'SMASH', 'HIT', 'FLOP'];
            const tierColors: Record<string, string> = { BLOCKBUSTER: '#2ecc71', SMASH: '#f1c40f', HIT: '#e67e22', FLOP: '#e74c3c' };
            const total = Object.values(cardStats.tierCounts).reduce((a, b) => a + b, 0) || 1;
            return (
              <div style={{ display: 'flex', height: 16, borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
                {tierOrder.map(tier => {
                  const count = cardStats.tierCounts[tier] || 0;
                  const pct = (count / total) * 100;
                  return pct > 0 ? (
                    <div key={tier} style={{ width: `${pct}%`, background: tierColors[tier], transition: 'width 0.5s' }} title={`${tier}: ${count} (${Math.round(pct)}%)`} />
                  ) : null;
                })}
              </div>
            );
          })()}

          {/* Best/worst films from records */}
          {stats.records.biggestBO && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 8, letterSpacing: 1 }}>🏆 ALL-TIME RECORDS</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {stats.records.biggestBO && (
                  <div style={{ background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.2)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ color: '#999', fontSize: '0.55rem', textTransform: 'uppercase' }}>💰 Highest BO</div>
                    <div style={{ color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{formatBO(stats.records.biggestBO.value)}</div>
                    <div style={{ color: '#888', fontSize: '0.6rem' }}>"{stats.records.biggestBO.filmTitle}"</div>
                  </div>
                )}
                {stats.records.highestQuality && (
                  <div style={{ background: 'rgba(155,89,182,0.08)', border: '1px solid rgba(155,89,182,0.2)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ color: '#999', fontSize: '0.55rem', textTransform: 'uppercase' }}>⭐ Highest Quality</div>
                    <div style={{ color: '#9b59b6', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{stats.records.highestQuality.value}</div>
                    <div style={{ color: '#888', fontSize: '0.6rem' }}>"{stats.records.highestQuality.filmTitle}"</div>
                  </div>
                )}
                {stats.records.worstFlop && (
                  <div style={{ background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ color: '#999', fontSize: '0.55rem', textTransform: 'uppercase' }}>💀 Worst Flop</div>
                    <div style={{ color: '#e74c3c', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{formatBO(stats.records.worstFlop.value)}</div>
                    <div style={{ color: '#888', fontSize: '0.6rem' }}>"{stats.records.worstFlop.filmTitle}"</div>
                  </div>
                )}
                {stats.records.highestRunBO && (
                  <div style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.2)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ color: '#999', fontSize: '0.55rem', textTransform: 'uppercase' }}>🏢 Best Run BO</div>
                    <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{formatBO(stats.records.highestRunBO.value)}</div>
                    <div style={{ color: '#888', fontSize: '0.6rem' }}>{stats.records.highestRunBO.runDate}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Most-produced genres ranked as "most used cards" proxy */}
          <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 8, letterSpacing: 1 }}>🎬 MOST PRODUCED GENRES</h3>
          <CSSBarChart
            items={genreData.slice(0, 7).map((g, i) => ({
              label: `#${i + 1} ${g.genre}`,
              value: g.count,
              color: GENRE_COLORS[g.genre] || '#888',
            }))}
          />
        </div>
      )}

      {/* ─── TRENDS TAB ─── */}
      {tab === 'trends' && (
        <div className="animate-slide-down">
          <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 8, letterSpacing: 1 }}>📈 SCORE PROGRESSION (Last {scoreProgression.length} Runs)</h3>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #222', borderRadius: 10, padding: '12px 8px', marginBottom: 20 }}>
            <SVGLineChart data={scoreProgression} color="#d4a843" label="score" />
          </div>

          <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 8, letterSpacing: 1 }}>💰 EARNINGS TREND</h3>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #222', borderRadius: 10, padding: '12px 8px', marginBottom: 20 }}>
            <SVGLineChart data={earningsTrend} color="#2ecc71" label="earnings" />
          </div>

          <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 8, letterSpacing: 1 }}>⭐ QUALITY TREND</h3>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #222', borderRadius: 10, padding: '12px 8px', marginBottom: 20 }}>
            <SVGLineChart data={qualityTrend} color="#9b59b6" label="quality" />
          </div>

          {/* Improvement summary */}
          {scoreProgression.length >= 4 && (() => {
            const half = Math.floor(scoreProgression.length / 2);
            const firstHalf = scoreProgression.slice(0, half);
            const secondHalf = scoreProgression.slice(half);
            const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
            const change = secondAvg - firstAvg;
            const pct = firstAvg > 0 ? Math.round((change / firstAvg) * 100) : 0;
            return (
              <div style={{ textAlign: 'center', padding: '10px 16px', background: `rgba(${change >= 0 ? '46,204,113' : '231,76,60'},0.08)`, borderRadius: 8, border: `1px solid rgba(${change >= 0 ? '46,204,113' : '231,76,60'},0.2)` }}>
                <span style={{ color: change >= 0 ? '#2ecc71' : '#e74c3c', fontSize: '0.85rem' }}>
                  {change >= 0 ? '📈' : '📉'} Score {change >= 0 ? 'improved' : 'declined'} by {Math.abs(pct)}% over last {scoreProgression.length} runs
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {/* ─── SESSIONS TAB ─── */}
      {tab === 'sessions' && (
        <div className="animate-slide-down">
          <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 12, letterSpacing: 1 }}>📅 PLAY HISTORY (Last 90 Days)</h3>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #222', borderRadius: 10, padding: '16px', marginBottom: 20 }}>
            <CalendarHeatmap dates={sessionDates.dateMap} />
          </div>

          {/* Busiest day */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', padding: '10px 16px', background: 'rgba(212,168,67,0.08)', borderRadius: 8, border: '1px solid rgba(212,168,67,0.2)' }}>
              <div style={{ color: '#888', fontSize: '0.6rem', textTransform: 'uppercase' }}>Busiest Day</div>
              <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>
                {getDayName(sessionDates.busiestDay)}
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 16px', background: 'rgba(155,89,182,0.08)', borderRadius: 8, border: '1px solid rgba(155,89,182,0.2)' }}>
              <div style={{ color: '#888', fontSize: '0.6rem', textTransform: 'uppercase' }}>Total Playtime</div>
              <div style={{ color: '#9b59b6', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>
                {formatPlayTime(totalPlaytime)}
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 16px', background: 'rgba(52,152,219,0.08)', borderRadius: 8, border: '1px solid rgba(52,152,219,0.2)' }}>
              <div style={{ color: '#888', fontSize: '0.6rem', textTransform: 'uppercase' }}>Avg Run Duration</div>
              <div style={{ color: '#3498db', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>
                {analytics.runDurations.length > 0 ? `${Math.round(analytics.runDurations.reduce((a, b) => a + b, 0) / analytics.runDurations.length / 60000)}m` : '—'}
              </div>
            </div>
          </div>

          {/* Day-of-week breakdown */}
          <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 8, letterSpacing: 1 }}>📊 RUNS BY DAY OF WEEK</h3>
          <CSSBarChart
            items={sessionDates.dayOfWeekCounts.map((count, i) => ({
              label: getDayName(i),
              value: count,
              color: i === sessionDates.busiestDay ? 'var(--gold)' : '#666',
            }))}
          />

          {/* Recent activity */}
          {recentRuns.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 8, letterSpacing: 1 }}>🕐 RECENT RUNS</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {recentRuns.slice(0, 10).map((run, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, fontSize: '0.75rem' }}>
                    <span style={{ color: '#888' }}>{run.date}</span>
                    <span style={{ color: run.won ? '#2ecc71' : '#e74c3c' }}>{run.won ? '🏆' : '💀'} {run.score}pts</span>
                    <span style={{ color: '#888' }}>{run.filmsMade} films · {formatBO(run.totalBO)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Compact EndScreen Stats Summary (re-export for compat) ───
export function EndScreenStatsSummary() {
  const stats = getLifetimeStats();
  if (stats.totalRuns <= 1) return null;
  return (
    <div style={{ marginTop: 20, textAlign: 'center' }}>
      <div style={{ color: '#888', fontSize: '0.7rem', marginBottom: 6 }}>
        Lifetime: {stats.totalRuns} runs · {stats.totalFilms} films · {formatBO(stats.totalBO)} earned
      </div>
    </div>
  );
}
