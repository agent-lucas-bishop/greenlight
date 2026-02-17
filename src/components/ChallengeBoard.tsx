/**
 * ChallengeBoard — Community Challenges & Weekly Goals (R215)
 * Shows daily (2-3) and weekly (1) challenges with progress, timers, streaks.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getDailyChallenges,
  getWeeklyChallenges,
  isCommunityChallCompleted,
  getChallengeStreakData,
  getChallengeXP,
  getUnlockedCardVariants,
  type CommunityChallenge,
} from '../challenges';

function timeUntilMidnight(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function timeUntilMonday(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const daysUntilMonday = day === 0 ? 1 : (8 - day);
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  const diff = nextMonday.getTime() - now.getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

function ChallengeCard({ challenge, completed }: { challenge: CommunityChallenge; completed: boolean }) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (completed) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(t);
    }
  }, [completed]);

  return (
    <div
      style={{
        background: completed
          ? 'linear-gradient(135deg, rgba(212,168,67,0.15), rgba(212,168,67,0.05))'
          : 'rgba(255,255,255,0.03)',
        border: completed ? '1px solid rgba(212,168,67,0.4)' : '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '14px 16px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Confetti burst */}
      {showConfetti && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', animation: 'fadeOut 2s ease forwards',
        }}>
          🎉✨🎊
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: '1.4rem' }}>{challenge.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, color: completed ? 'var(--gold)' : '#fff', fontSize: '0.95rem' }}>
              {challenge.title}
            </span>
            {completed && <span style={{ fontSize: '1.1rem' }}>✅</span>}
          </div>
          <div style={{ color: '#999', fontSize: '0.8rem', marginTop: 2 }}>
            {challenge.description}
          </div>
        </div>
        <div style={{
          textAlign: 'right', fontSize: '0.75rem',
          color: completed ? 'var(--gold)' : '#888',
          whiteSpace: 'nowrap',
        }}>
          {completed ? 'Claimed!' : `+${challenge.xpReward} XP`}
          {challenge.cardVariantReward && !completed && (
            <div style={{ fontSize: '0.7rem', color: '#c084fc', marginTop: 2 }}>🃏 Card Variant</div>
          )}
        </div>
      </div>

      {/* Progress bar (only show if not completed) */}
      {!completed && (
        <div style={{
          height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: 'linear-gradient(90deg, var(--gold), #f59e0b)',
            width: '0%', // No run-time progress without active run
            transition: 'width 0.5s ease',
          }} />
        </div>
      )}
    </div>
  );
}

export default function ChallengeBoard({ onClose }: { onClose: () => void }) {
  const [dailyTimer, setDailyTimer] = useState(timeUntilMidnight());
  const [weeklyTimer, setWeeklyTimer] = useState(timeUntilMonday());

  const dailyChallenges = getDailyChallenges();
  const weeklyChallenges = getWeeklyChallenges();
  const streak = getChallengeStreakData();
  const totalXP = getChallengeXP();
  const variants = getUnlockedCardVariants();

  // Refresh timers every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setDailyTimer(timeUntilMidnight());
      setWeeklyTimer(timeUntilMonday());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const dailyCompleted = dailyChallenges.filter(c => isCommunityChallCompleted(c.id)).length;
  const weeklyCompleted = weeklyChallenges.filter(c => isCommunityChallCompleted(c.id)).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: '85vh', overflow: 'auto' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        <h2 style={{ color: 'var(--gold)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🏅</span> Community Challenges
        </h2>
        <p style={{ color: '#888', fontSize: '0.8rem', margin: '0 0 16px 0' }}>
          Same challenges for every player — complete them to earn XP and unlock special card variants!
        </p>

        {/* Stats bar */}
        <div style={{
          display: 'flex', gap: 16, marginBottom: 20, padding: '10px 14px',
          background: 'rgba(255,255,255,0.03)', borderRadius: 10,
          fontSize: '0.8rem', color: '#ccc',
        }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--gold)' }}>
              {streak.current}🔥
            </div>
            <div style={{ color: '#888', fontSize: '0.7rem' }}>Streak</div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#60a5fa' }}>
              {totalXP}
            </div>
            <div style={{ color: '#888', fontSize: '0.7rem' }}>Total XP</div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#c084fc' }}>
              {variants.length}
            </div>
            <div style={{ color: '#888', fontSize: '0.7rem' }}>Card Variants</div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fbbf24' }}>
              {streak.best}
            </div>
            <div style={{ color: '#888', fontSize: '0.7rem' }}>Best Streak</div>
          </div>
        </div>

        {/* Daily Challenges */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>
              📅 Daily Challenges
              <span style={{ color: '#888', fontSize: '0.75rem', marginLeft: 8 }}>
                {dailyCompleted}/{dailyChallenges.length}
              </span>
            </h3>
            <span style={{ color: '#888', fontSize: '0.75rem' }}>⏰ {dailyTimer}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dailyChallenges.map(c => (
              <ChallengeCard key={c.id} challenge={c} completed={isCommunityChallCompleted(c.id)} />
            ))}
          </div>
        </div>

        {/* Weekly Challenges */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>
              📆 Weekly Challenge
              <span style={{ color: '#888', fontSize: '0.75rem', marginLeft: 8 }}>
                {weeklyCompleted}/{weeklyChallenges.length}
              </span>
            </h3>
            <span style={{ color: '#888', fontSize: '0.75rem' }}>⏰ {weeklyTimer}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {weeklyChallenges.map(c => (
              <ChallengeCard key={c.id} challenge={c} completed={isCommunityChallCompleted(c.id)} />
            ))}
          </div>
        </div>

        {/* Tip */}
        <div style={{
          marginTop: 20, padding: '10px 14px', borderRadius: 8,
          background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)',
          fontSize: '0.75rem', color: '#8bb8f0',
        }}>
          💡 Complete any challenge during a normal run — your progress is checked automatically when a run ends.
        </div>
      </div>
    </div>
  );
}
