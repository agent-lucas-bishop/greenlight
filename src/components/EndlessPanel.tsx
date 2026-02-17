/**
 * R233: Endless Mode Panel
 * - Launcher with escalating difficulty explanation
 * - Personal records display
 * - Current run stats during gameplay
 */

import { useEffect, useRef } from 'react';
import { getEndlessPersonalBest, getEndlessEscalation, type EndlessPersonalBest } from '../endlessMode';
import { getEndlessLeaderboard } from '../endgame';
import { sfx } from '../sound';

// ─── Personal Records Display ───

export function EndlessRecords() {
  const pb: EndlessPersonalBest = getEndlessPersonalBest();
  const lb = getEndlessLeaderboard();

  if (pb.highestSeason === 0 && lb.length === 0) {
    return (
      <div style={{ padding: 12, opacity: 0.6, fontStyle: 'italic', fontSize: '0.85rem' }}>
        No endless runs yet. Start one to set records!
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '8px 0' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase' }}>Best Season</div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: '#e74c3c' }}>{pb.highestSeason}</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase' }}>Best Score</div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: '#f39c12' }}>{pb.bestCumulativeScore.toLocaleString()}</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase' }}>Best Streak</div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: '#2ecc71' }}>🔥 {pb.longestStreak}</div>
      </div>
    </div>
  );
}

// ─── Current Run Stats (shown during gameplay) ───

interface EndlessRunStatsProps {
  season: number;
  cumulativeScore: number;
  currentStreak: number;
  bestStreakThisRun: number;
  strikesUsed: number;
}

export function EndlessRunStats({ season, cumulativeScore, currentStreak, bestStreakThisRun, strikesUsed }: EndlessRunStatsProps) {
  const escalation = getEndlessEscalation(season);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Heartbeat pulse that speeds up with season
    const speed = Math.min(3, 1 + (season - 1) * 0.15);
    const intervalMs = Math.max(1500, 4000 / speed);
    tickRef.current = setInterval(() => sfx.endlessSurvivalTick(speed), intervalMs);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [season]);

  return (
    <div style={{
      display: 'flex', gap: 12, flexWrap: 'wrap', padding: '6px 10px',
      background: 'rgba(231, 76, 60, 0.1)', borderRadius: 6, fontSize: '0.75rem',
      border: '1px solid rgba(231, 76, 60, 0.3)',
    }}>
      <span title="Endless mode difficulty tier">🔥 {escalation.label}</span>
      <span title="Cumulative score">📊 {cumulativeScore.toLocaleString()}</span>
      <span title="Current hit streak">🎯 {currentStreak}</span>
      {bestStreakThisRun > 0 && <span title="Best streak this run" style={{ opacity: 0.7 }}>⭐ {bestStreakThisRun}</span>}
      <span title="Strikes used" style={{ color: strikesUsed >= 2 ? '#e74c3c' : undefined }}>💀 {strikesUsed}/3</span>
    </div>
  );
}

// ─── Launcher Info Panel ───

export function EndlessLauncherInfo() {
  return (
    <div style={{ fontSize: '0.8rem', lineHeight: 1.5, padding: '8px 0' }}>
      <div style={{ marginBottom: 8 }}>
        <strong>♾️ Endless Mode</strong> — How far can you go?
      </div>
      <ul style={{ margin: 0, paddingLeft: 20, opacity: 0.85 }}>
        <li>No season limit — play until you fall</li>
        <li>Difficulty escalates every 3 seasons</li>
        <li>Rivals get more aggressive, incidents more frequent</li>
        <li>3 strikes and you're out</li>
        <li>Score multiplier grows each season survived</li>
        <li>Starts at Studio difficulty, exceeds Mogul by season 12</li>
      </ul>
    </div>
  );
}

// ─── Escalation Preview ───

export function EscalationPreview({ season }: { season: number }) {
  const esc = getEndlessEscalation(season);
  if (esc.tier === 0) return null;

  return (
    <div style={{
      fontSize: '0.7rem', opacity: 0.7, padding: '4px 8px',
      background: 'rgba(231, 76, 60, 0.05)', borderRadius: 4, marginTop: 4,
    }}>
      Tier {esc.tier}: Rival aggression +{Math.round(esc.rivalAggressionBonus * 100)}%
      {' | '}Incident rate +{Math.round(esc.incidentRateBonus * 100)}%
      {' | '}Volatility ×{esc.marketVolatilityMult.toFixed(1)}
    </div>
  );
}
