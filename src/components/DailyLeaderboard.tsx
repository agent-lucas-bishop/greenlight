/**
 * R254: Daily Leaderboard Component
 * Local leaderboard for daily challenge runs — personal bests per day stored in localStorage.
 */

import { useState, useEffect } from 'react';
import {
  getDailyLeaderboard,
  getWeeklyLeaderboard,
  getDailyHistory,
  getDailyStreak,
  getTimeUntilDailyReset,
  getDailyDateString,
  getDailyNumber,
  type DailyLeaderboardEntry,
  type DailyHistoryEntry,
} from '../dailyChallenge';
import { getWeeklyNumber } from '../seededRng';

export default function DailyLeaderboard({ onClose, inline }: { onClose?: () => void; inline?: boolean }) {
  const [tab, setTab] = useState<'today' | 'history' | 'streaks'>('today');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(iv);
  }, []);

  const todayEntries = getDailyLeaderboard();
  const history = getDailyHistory();
  const streak = getDailyStreak();
  const countdown = getTimeUntilDailyReset();

  const content = (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <h2 style={{ color: 'var(--gold)', textAlign: 'center', marginBottom: 4, fontFamily: 'Bebas Neue', fontSize: '1.4rem', letterSpacing: '0.08em' }}>
        🎯 DAILY LEADERBOARD
      </h2>
      <div style={{ textAlign: 'center', color: '#888', fontSize: '0.7rem', marginBottom: 16 }}>
        Daily #{getDailyNumber()} · {getDailyDateString()} · Resets in {countdown.hours}h {countdown.minutes}m
      </div>

      {/* Streak banner */}
      {streak.current > 0 && (
        <div style={{
          textAlign: 'center', marginBottom: 16, padding: '10px 16px',
          background: 'rgba(243,156,18,0.08)', border: '1px solid rgba(243,156,18,0.2)', borderRadius: 8,
        }}>
          <span style={{ color: '#f39c12', fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>
            🔥 {streak.current}-Day Streak
          </span>
          <span style={{ color: '#888', fontSize: '0.7rem', marginLeft: 12 }}>
            Best: {streak.best} days
          </span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
        {(['today', 'history', 'streaks'] as const).map(t => (
          <button key={t} className="btn btn-small" onClick={() => setTab(t)}
            style={{ opacity: tab === t ? 1 : 0.5, color: 'var(--gold)', borderColor: 'var(--gold-dim)', textTransform: 'uppercase', fontSize: '0.7rem' }}>
            {t === 'today' ? '🏆 Today' : t === 'history' ? '📜 History' : '🔥 Streaks'}
          </button>
        ))}
      </div>

      {tab === 'today' && <TodayLeaderboard entries={todayEntries} />}
      {tab === 'history' && <HistoryList history={history} />}
      {tab === 'streaks' && <StreakStats streak={streak} history={history} />}
    </div>
  );

  if (inline) return content;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
        {onClose && <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>}
        {content}
      </div>
    </div>
  );
}

function TodayLeaderboard({ entries }: { entries: DailyLeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: '#666' }}>
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎬</div>
        <div style={{ fontSize: '0.85rem' }}>No runs today yet</div>
        <div style={{ fontSize: '0.7rem', color: '#555', marginTop: 4 }}>Complete a daily challenge to see your score here!</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {entries.map((e, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            background: i < 3 ? 'rgba(212,168,67,0.06)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${i === 0 ? 'rgba(212,168,67,0.3)' : '#222'}`,
            borderRadius: 8,
          }}>
            <span style={{ fontSize: i < 3 ? '1.2rem' : '0.8rem', minWidth: 28, textAlign: 'center' }}>{medal}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: e.won ? '#2ecc71' : '#e74c3c', fontSize: '0.75rem' }}>
                  {e.won ? '🏆' : '💀'}
                </span>
                <span style={{ color: '#ccc', fontSize: '0.8rem' }}>{e.films} films</span>
                <span style={{ color: '#888', fontSize: '0.7rem' }}>${e.totalBO.toFixed(1)}M BO</span>
              </div>
              <div style={{ color: '#666', fontSize: '0.65rem', marginTop: 2 }}>
                Q: {Math.round(e.qualityAvg)} avg · {Math.floor(e.timeSeconds / 60)}:{String(e.timeSeconds % 60).padStart(2, '0')}
              </div>
            </div>
            <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>
              {e.score}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HistoryList({ history }: { history: DailyHistoryEntry[] }) {
  const recent = [...history].reverse().slice(0, 30);

  if (recent.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: '#666' }}>
        <div style={{ fontSize: '0.85rem' }}>No daily challenge history yet</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {recent.map((h, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 6,
          border: '1px solid #1a1a1a',
        }}>
          <div>
            <span style={{ color: '#888', fontSize: '0.7rem' }}>#{h.dayNumber} · {h.date}</span>
            <span style={{ color: '#666', fontSize: '0.65rem', marginLeft: 8 }}>{h.archetype}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: h.won ? '#2ecc71' : '#e74c3c', fontSize: '0.7rem' }}>
              {h.won ? '🏆' : '💀'}
            </span>
            <span style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.9rem' }}>
              {h.score}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function StreakStats({ streak, history }: { streak: { current: number; best: number; lastDate: string }; history: DailyHistoryEntry[] }) {
  const totalPlayed = history.length;
  const totalWins = history.filter(h => h.won).length;
  const avgScore = totalPlayed > 0 ? Math.round(history.reduce((s, h) => s + h.score, 0) / totalPlayed) : 0;
  const bestScore = totalPlayed > 0 ? Math.max(...history.map(h => h.score)) : 0;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Current Streak', value: `🔥 ${streak.current}`, color: '#f39c12' },
          { label: 'Best Streak', value: `⭐ ${streak.best}`, color: '#e67e22' },
          { label: 'Days Played', value: String(totalPlayed), color: '#3498db' },
          { label: 'Win Rate', value: totalPlayed > 0 ? `${Math.round(totalWins / totalPlayed * 100)}%` : '—', color: '#2ecc71' },
          { label: 'Avg Score', value: String(avgScore), color: 'var(--gold)' },
          { label: 'Best Score', value: String(bestScore), color: '#ff6b6b' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid #222', borderRadius: 8,
            padding: '12px 8px', textAlign: 'center',
          }}>
            <div style={{ color: s.color, fontFamily: 'Bebas Neue', fontSize: '1.3rem' }}>{s.value}</div>
            <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Streak calendar - last 14 days */}
      {history.length > 0 && (
        <div>
          <div style={{ color: '#999', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Last 14 Days
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            {Array.from({ length: 14 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (13 - i));
              const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              const entry = history.find(h => h.date === ds);
              return (
                <div key={i} title={`${ds}${entry ? `: ${entry.score}pts` : ''}`} style={{
                  width: 28, height: 28, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem',
                  background: entry ? (entry.won ? 'rgba(46,204,113,0.2)' : 'rgba(231,76,60,0.2)') : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${entry ? (entry.won ? 'rgba(46,204,113,0.4)' : 'rgba(231,76,60,0.4)') : '#222'}`,
                  color: entry ? (entry.won ? '#2ecc71' : '#e74c3c') : '#444',
                }}>
                  {entry ? (entry.won ? '✓' : '✗') : '·'}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
