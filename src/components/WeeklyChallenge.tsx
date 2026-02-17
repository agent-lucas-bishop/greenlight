/**
 * R261: Weekly Challenge Component
 *
 * Entry screen showing this week's challenge with multi-day progress tracker,
 * objective checklist, and countdown to next week.
 */

import { useState, useEffect } from 'react';
import {
  getWeeklyChallenge,
  getWeeklyStreak,
  getWeeklyProgress,
  getWeeklyHistory,
  type WeeklyChallenge,
  type WeeklyProgressEntry,
} from '../weeklyChallenge';
import { getTimeUntilWeeklyReset } from '../dailyChallenge';
import { getWeeklyDateString } from '../seededRng';

// ─── Countdown Timer ───

function WeeklyCountdown() {
  const [time, setTime] = useState(getTimeUntilWeeklyReset());

  useEffect(() => {
    const interval = setInterval(() => setTime(getTimeUntilWeeklyReset()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      textAlign: 'center', padding: '6px 12px',
      background: 'rgba(155,89,182,0.08)', borderRadius: 8,
      fontSize: '0.7rem', color: '#9b59b6',
    }}>
      ⏳ Next weekly in <strong>{time.days}d {time.hours}h {time.minutes}m</strong>
    </div>
  );
}

// ─── Objective Checklist ───

function ObjectiveChecklist({ challenge, progress }: { challenge: WeeklyChallenge; progress: WeeklyProgressEntry | null }) {
  const completedIds = progress?.objectivesCompleted || [];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      padding: 12, borderRadius: 8,
      background: 'rgba(155,89,182,0.06)', border: '1px solid rgba(155,89,182,0.15)',
    }}>
      <div style={{ color: '#9b59b6', fontFamily: 'Bebas Neue', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
        OBJECTIVES ({completedIds.length}/{challenge.objectives.length})
      </div>
      {challenge.objectives.map(obj => {
        const done = completedIds.includes(obj.id);
        return (
          <div key={obj.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', borderRadius: 6,
            background: done ? 'rgba(46,204,113,0.08)' : 'transparent',
            opacity: done ? 0.7 : 1,
          }}>
            <span style={{ fontSize: '1rem' }}>{done ? '✅' : '⬜'}</span>
            <span style={{ fontSize: '0.75rem', color: done ? '#2ecc71' : '#ccc' }}>
              {obj.emoji} {obj.description}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Progress Days Tracker ───

function ProgressTracker({ progress }: { progress: WeeklyProgressEntry | null }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date().getDay();
  const todayIdx = today === 0 ? 6 : today - 1;

  return (
    <div style={{
      display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 12,
    }}>
      {days.map((day, i) => {
        const isPast = i < todayIdx;
        const isToday = i === todayIdx;
        const hasProgress = progress && isPast;

        return (
          <div key={day} style={{
            width: 36, textAlign: 'center', padding: '4px 2px',
            borderRadius: 6,
            background: isToday ? 'rgba(155,89,182,0.2)' : hasProgress ? 'rgba(46,204,113,0.1)' : 'rgba(255,255,255,0.03)',
            border: isToday ? '1px solid rgba(155,89,182,0.4)' : '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{ fontSize: '0.55rem', color: isToday ? '#9b59b6' : '#666' }}>{day}</div>
            <div style={{ fontSize: '0.7rem' }}>
              {progress && isPast ? '✓' : isToday ? '●' : '·'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── History Panel ───

function WeeklyHistoryPanel() {
  const history = getWeeklyHistory();
  if (history.length === 0) return null;

  const recent = history.slice(-8).reverse();
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ color: '#9b59b6', fontFamily: 'Bebas Neue', fontSize: '0.85rem', letterSpacing: '0.05em', marginBottom: 8 }}>
        WEEKLY HISTORY
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {recent.map((entry, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 10px', borderRadius: 6,
            background: 'rgba(255,255,255,0.03)', fontSize: '0.7rem',
          }}>
            <span style={{ color: '#888' }}>Week #{entry.weekNumber} ({entry.weekDate})</span>
            <span style={{ color: '#ccc' }}>
              {entry.objectivesCompleted.length} obj · {entry.score}pts
              {entry.allObjectivesComplete && <span style={{ color: '#f39c12', marginLeft: 4 }}>★</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───

export function WeeklyChallengeCard({ onStart }: { onStart?: () => void }) {
  const challenge = getWeeklyChallenge();
  const streak = getWeeklyStreak();
  const progress = getWeeklyProgress();
  const weeklyDate = getWeeklyDateString();
  const isDone = !!progress;

  return (
    <div style={{ padding: 12 }}>
      {/* Weekly Streak */}
      {streak.current > 0 && (
        <div style={{
          textAlign: 'center', marginBottom: 12, padding: '8px 12px',
          background: 'rgba(155,89,182,0.08)', border: '1px solid rgba(155,89,182,0.2)', borderRadius: 8,
        }}>
          <span style={{ color: '#9b59b6', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>
            📅 {streak.current}-Week Streak
          </span>
          <span style={{ color: '#888', fontSize: '0.65rem', marginLeft: 10 }}>Best: {streak.best}</span>
        </div>
      )}

      {/* Challenge Header */}
      <div style={{
        textAlign: 'center', marginBottom: 12,
        padding: '16px 12px', borderRadius: 10,
        background: 'linear-gradient(135deg, rgba(155,89,182,0.12), rgba(142,68,173,0.06))',
        border: '1px solid rgba(155,89,182,0.25)',
      }}>
        <div style={{ color: '#9b59b6', fontFamily: 'Bebas Neue', fontSize: '1.3rem', letterSpacing: '0.05em' }}>
          {challenge.title}
        </div>
        <div style={{ color: '#aaa', fontSize: '0.75rem', marginTop: 4 }}>
          Week of {weeklyDate}
        </div>
        <div style={{ color: '#ccc', fontSize: '0.8rem', marginTop: 8, lineHeight: 1.5 }}>
          {challenge.description}
        </div>
      </div>

      {/* Progress Tracker */}
      <ProgressTracker progress={progress} />

      {/* Multiplier Info */}
      <div style={{
        display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12,
        fontSize: '0.7rem',
      }}>
        <span style={{
          padding: '4px 10px', borderRadius: 6,
          background: 'rgba(155,89,182,0.1)', color: '#9b59b6',
        }}>
          Base: {challenge.baseMultiplier}× score
        </span>
        <span style={{
          padding: '4px 10px', borderRadius: 6,
          background: 'rgba(243,156,18,0.1)', color: '#f39c12',
        }}>
          All objectives: {challenge.bonusMultiplier}× score
        </span>
      </div>

      {/* Challenge details */}
      {challenge.genreSequence && (
        <div style={{
          display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12,
          flexWrap: 'wrap',
        }}>
          {challenge.genreSequence.map((genre, i) => (
            <span key={i} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem',
              background: 'rgba(52,152,219,0.1)', color: '#3498db',
              border: '1px solid rgba(52,152,219,0.2)',
            }}>
              {i > 0 && <span style={{ marginRight: 4 }}>→</span>}
              {genre}
            </span>
          ))}
        </div>
      )}

      {challenge.marathonSeasons && (
        <div style={{
          textAlign: 'center', marginBottom: 12, fontSize: '0.8rem',
          color: '#e74c3c',
        }}>
          🏃 {challenge.marathonSeasons} seasons required — Mogul difficulty
        </div>
      )}

      {challenge.restrictedPool && (
        <div style={{
          textAlign: 'center', marginBottom: 12, fontSize: '0.7rem',
          padding: '6px 12px', borderRadius: 6,
          background: 'rgba(231,76,60,0.08)', color: '#e74c3c',
          border: '1px solid rgba(231,76,60,0.15)',
        }}>
          🃏 Restricted Card Pool — B-tier and below only
        </div>
      )}

      {/* Objectives */}
      <ObjectiveChecklist challenge={challenge} progress={progress} />

      {/* Start / Completed */}
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        {isDone ? (
          <div style={{
            padding: '12px 16px', borderRadius: 8,
            background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.2)',
          }}>
            <div style={{ color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>
              ✓ COMPLETED — {progress!.score}pts ({progress!.finalMultiplier}×)
            </div>
            <div style={{ color: '#888', fontSize: '0.65rem', marginTop: 4 }}>
              {progress!.objectivesCompleted.length}/{challenge.objectives.length} objectives completed
            </div>
          </div>
        ) : (
          <button
            className="btn btn-primary"
            style={{ color: '#9b59b6', borderColor: '#9b59b6', background: 'rgba(155,89,182,0.08)' }}
            onClick={onStart}
          >
            🗓️ START WEEKLY CHALLENGE
          </button>
        )}
      </div>

      {/* Countdown */}
      <div style={{ marginTop: 12 }}>
        <WeeklyCountdown />
      </div>

      {/* History */}
      <WeeklyHistoryPanel />
    </div>
  );
}
