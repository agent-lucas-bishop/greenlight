/**
 * R282: Compact stats widget for StartScreen play tab
 */

import { useMemo } from 'react';
import { getAnalytics } from '../analytics';
import { getLifetimeStats, backfillFromLeaderboard } from '../statistics';
import { getCareerAnalytics, formatPlayTime } from '../careerAnalytics';

function getDayName(day: number): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day] || '?';
}

export default function MiniStats({ onOpenDashboard }: { onOpenDashboard?: () => void }) {
  const data = useMemo(() => {
    backfillFromLeaderboard();
    const analytics = getAnalytics();
    const stats = getLifetimeStats();
    const career = getCareerAnalytics();

    const totalRuns = stats.totalRuns || analytics.runsCompleted || 0;
    if (totalRuns === 0) return null;

    const bestScore = analytics.scores.length > 0 ? Math.max(...analytics.scores) : 0;

    // Current win streak
    let currentStreak = stats.currentWinStreak || career.currentWinStreak || 0;

    // Favorite genre
    const genreEntries = Object.entries(stats.genreFilmCounts);
    const favGenre = genreEntries.length > 0
      ? genreEntries.sort((a, b) => b[1] - a[1])[0][0]
      : null;

    // Busiest day of week
    const dayOfWeekCounts = new Array(7).fill(0);
    for (const run of stats.runHistory) {
      if (run.date && run.date !== 'Unknown') {
        try { dayOfWeekCounts[new Date(run.date).getDay()]++; } catch { /* ignore */ }
      }
    }
    const busiestDay = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
    const hasBusiestDay = dayOfWeekCounts[busiestDay] > 1;

    // Win rate
    const winRate = totalRuns > 0 ? Math.round(((career.totalRunsWon || analytics.runsWon || 0) / totalRuns) * 100) : 0;

    return { totalRuns, bestScore, currentStreak, favGenre, busiestDay, hasBusiestDay, winRate };
  }, []);

  if (!data) return null;

  return (
    <div style={{
      background: 'rgba(212,168,67,0.04)',
      border: '1px solid rgba(212,168,67,0.15)',
      borderRadius: 10,
      padding: '10px 16px',
      maxWidth: 400,
      width: '100%',
      margin: '12px auto 0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
          📊 YOUR STATS
        </span>
        {onOpenDashboard && (
          <button
            onClick={onOpenDashboard}
            style={{
              background: 'none', border: 'none', color: 'var(--gold)',
              fontSize: '0.65rem', cursor: 'pointer', textDecoration: 'underline',
              padding: 0, fontFamily: 'inherit',
            }}
          >
            View full dashboard →
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center', flex: '1 1 50px' }}>
          <div style={{ color: '#ccc', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{data.totalRuns}</div>
          <div style={{ color: '#666', fontSize: '0.55rem' }}>Runs</div>
        </div>
        <div style={{ textAlign: 'center', flex: '1 1 50px' }}>
          <div style={{ color: '#f39c12', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{data.bestScore}</div>
          <div style={{ color: '#666', fontSize: '0.55rem' }}>Best</div>
        </div>
        <div style={{ textAlign: 'center', flex: '1 1 50px' }}>
          <div style={{ color: data.winRate >= 50 ? '#2ecc71' : '#e74c3c', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{data.winRate}%</div>
          <div style={{ color: '#666', fontSize: '0.55rem' }}>Win Rate</div>
        </div>
        {data.currentStreak > 0 && (
          <div style={{ textAlign: 'center', flex: '1 1 50px' }}>
            <div style={{ color: '#f39c12', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>🔥{data.currentStreak}</div>
            <div style={{ color: '#666', fontSize: '0.55rem' }}>Streak</div>
          </div>
        )}
        {data.favGenre && (
          <div style={{ textAlign: 'center', flex: '1 1 50px' }}>
            <div style={{ color: '#9b59b6', fontFamily: 'Bebas Neue', fontSize: '0.85rem' }}>{data.favGenre}</div>
            <div style={{ color: '#666', fontSize: '0.55rem' }}>Fav Genre</div>
          </div>
        )}
      </div>
      {data.hasBusiestDay && (
        <div style={{ color: '#555', fontSize: '0.6rem', marginTop: 6, textAlign: 'center', fontStyle: 'italic' }}>
          🎬 You play most on {getDayName(data.busiestDay)}s
        </div>
      )}
    </div>
  );
}
