/**
 * R233: Daily Challenge Panel
 * - Today's challenge with constraints, timer, goal
 * - Completion screen with score breakdown
 * - Local top 10 leaderboard
 * - Countdown to next reset
 */

import { useState, useEffect } from 'react';
import { sfx } from '../sound';
import {
  getDailyChallengeConstraints,
  getWeeklyChallengeConstraints,
  getDailyLeaderboard,
  getWeeklyLeaderboard,
  getTimeUntilDailyReset,
  getTimeUntilWeeklyReset,
  getDailyDateString,
  getDailyNumber,
  type DailyLeaderboardEntry,
  type DailyChallengeConstraints,
} from '../dailyChallenge';
import { getWeeklyNumber } from '../seededRng';

// ─── Challenge Card (pre-game) ───

export function DailyChallengeCard({ onStart }: { onStart?: (type: 'daily' | 'weekly') => void }) {
  const daily = getDailyChallengeConstraints();
  const weekly = getWeeklyChallengeConstraints();
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily');
  const challenge = tab === 'daily' ? daily : weekly;

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          className="btn btn-small"
          style={{ opacity: tab === 'daily' ? 1 : 0.5, color: '#3498db', borderColor: '#3498db' }}
          onClick={() => setTab('daily')}
        >
          📅 Daily #{getDailyNumber()}
        </button>
        <button
          className="btn btn-small"
          style={{ opacity: tab === 'weekly' ? 1 : 0.5, color: '#9b59b6', borderColor: '#9b59b6' }}
          onClick={() => setTab('weekly')}
        >
          📆 Weekly #{getWeeklyNumber()}
        </button>
      </div>

      <ChallengeConstraintsDisplay constraints={challenge} type={tab} />

      <ResetCountdown type={tab} />

      {onStart && (
        <button
          className="btn"
          style={{ marginTop: 12, color: tab === 'daily' ? '#3498db' : '#9b59b6', borderColor: tab === 'daily' ? '#3498db' : '#9b59b6' }}
          onClick={() => { tab === 'weekly' ? sfx.weeklyChallengeFanfare() : sfx.dailyChallengeStart(); onStart(tab); }}
        >
          {tab === 'daily' ? '📅 Start Daily Challenge' : '📆 Start Weekly Challenge'}
        </button>
      )}

      <LeaderboardDisplay type={tab} />
    </div>
  );
}

// ─── Constraints Display ───

function ChallengeConstraintsDisplay({ constraints, type }: { constraints: DailyChallengeConstraints; type: 'daily' | 'weekly' }) {
  return (
    <div style={{
      padding: 12, borderRadius: 8,
      background: type === 'daily' ? 'rgba(52, 152, 219, 0.08)' : 'rgba(155, 89, 182, 0.08)',
      border: `1px solid ${type === 'daily' ? 'rgba(52, 152, 219, 0.2)' : 'rgba(155, 89, 182, 0.2)'}`,
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: '0.9rem' }}>
        {type === 'daily' ? '📅' : '📆'} {type === 'daily' ? 'Today\'s Challenge' : 'This Week\'s Challenge'}
      </div>
      <div style={{ fontSize: '0.8rem', marginBottom: 6 }}>
        <strong>Constraints:</strong> {constraints.constraintLabel}
      </div>
      <div style={{ fontSize: '0.8rem', marginBottom: 6 }}>
        <strong>Goal:</strong> {constraints.goalLabel}
      </div>
      <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
        Difficulty: {constraints.difficulty} | Scoring: Time + BO + Quality
      </div>
    </div>
  );
}

// ─── Completion Screen ───

interface CompletionProps {
  timeSeconds: number;
  totalBO: number;
  qualityAvg: number;
  score: number;
  won: boolean;
  type: 'daily' | 'weekly';
}

export function DailyChallengeCompletion({ timeSeconds, totalBO, qualityAvg, score, won, type }: CompletionProps) {
  const timeMin = Math.floor(timeSeconds / 60);
  const timeSec = timeSeconds % 60;
  const timeBonus = Math.max(0, Math.round(100 - (timeSeconds / 6)));
  const boScore = Math.round(totalBO * 0.5);
  const qualityScore = Math.round(qualityAvg * 2);

  return (
    <div style={{ padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: '1.2rem', fontFamily: 'Bebas Neue', marginBottom: 12 }}>
        {won ? '🏆 Challenge Complete!' : '💀 Challenge Failed'}
      </div>

      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <ScoreBlock label="Time" value={`${timeMin}:${String(timeSec).padStart(2, '0')}`} sub={`+${timeBonus}pts`} />
        <ScoreBlock label="Box Office" value={`$${totalBO}M`} sub={`+${boScore}pts`} />
        <ScoreBlock label="Quality Avg" value={String(Math.round(qualityAvg))} sub={`+${qualityScore}pts`} />
      </div>

      <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: won ? '#2ecc71' : '#e74c3c' }}>
        {score} pts
      </div>

      <LeaderboardDisplay type={type} />
    </div>
  );
}

function ScoreBlock({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 80 }}>
      <div style={{ fontSize: '0.65rem', opacity: 0.6, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem' }}>{value}</div>
      <div style={{ fontSize: '0.7rem', color: '#2ecc71' }}>{sub}</div>
    </div>
  );
}

// ─── Leaderboard Display ───

function LeaderboardDisplay({ type }: { type: 'daily' | 'weekly' }) {
  const entries: DailyLeaderboardEntry[] = type === 'daily' ? getDailyLeaderboard() : getWeeklyLeaderboard();

  if (entries.length === 0) {
    return (
      <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: 12, fontStyle: 'italic' }}>
        No scores yet for this {type === 'daily' ? 'day' : 'week'}. Be the first!
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: 6 }}>
        🏆 Top 10 — {type === 'daily' ? 'Today' : 'This Week'}
      </div>
      <div style={{ fontSize: '0.75rem' }}>
        {entries.slice(0, 10).map((e, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', padding: '3px 0',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            opacity: i < 3 ? 1 : 0.7,
          }}>
            <span>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
              {' '}{e.won ? '✅' : '❌'}
              {' '}{e.films} films
            </span>
            <span style={{ fontFamily: 'Bebas Neue', color: e.won ? '#2ecc71' : '#e74c3c' }}>
              {e.score} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Reset Countdown ───

function ResetCountdown({ type }: { type: 'daily' | 'weekly' }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  if (type === 'daily') {
    const t = getTimeUntilDailyReset();
    return (
      <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: 8 }}>
        ⏰ Next daily in {t.hours}h {t.minutes}m
      </div>
    );
  }

  const t = getTimeUntilWeeklyReset();
  return (
    <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: 8 }}>
      ⏰ Next weekly in {t.days}d {t.hours}h
    </div>
  );
}
