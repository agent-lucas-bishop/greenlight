/**
 * R314: Studio Report Card — letter grades for different run categories.
 * Shown on the Game Over / Victory screen.
 */

import { useState } from 'react';
import type { SeasonResult, RewardTier } from '../types';

interface Props {
  history: SeasonResult[];
  totalEarnings: number;
  budget: number;
  startBudget: number;
  reputation: number;
  isVictory: boolean;
}

interface GradeResult {
  category: string;
  emoji: string;
  grade: string;
  color: string;
  detail: string;
}

const GRADE_COLORS: Record<string, string> = {
  'A+': '#ffd700', A: '#2ecc71', 'A-': '#2ecc71',
  'B+': '#6bcb77', B: '#6bcb77', 'B-': '#5dade2',
  'C+': '#5dade2', C: '#f1c40f', 'C-': '#f39c12',
  'D+': '#e67e22', D: '#e67e22', 'D-': '#e74c3c',
  F: '#e74c3c',
};

function letterGrade(score: number): { grade: string; color: string } {
  // score 0-100 → letter grade
  if (score >= 97) return { grade: 'A+', color: GRADE_COLORS['A+'] };
  if (score >= 90) return { grade: 'A', color: GRADE_COLORS['A'] };
  if (score >= 85) return { grade: 'A-', color: GRADE_COLORS['A-'] };
  if (score >= 80) return { grade: 'B+', color: GRADE_COLORS['B+'] };
  if (score >= 73) return { grade: 'B', color: GRADE_COLORS['B'] };
  if (score >= 68) return { grade: 'B-', color: GRADE_COLORS['B-'] };
  if (score >= 63) return { grade: 'C+', color: GRADE_COLORS['C+'] };
  if (score >= 55) return { grade: 'C', color: GRADE_COLORS['C'] };
  if (score >= 48) return { grade: 'C-', color: GRADE_COLORS['C-'] };
  if (score >= 40) return { grade: 'D+', color: GRADE_COLORS['D+'] };
  if (score >= 30) return { grade: 'D', color: GRADE_COLORS['D'] };
  if (score >= 20) return { grade: 'D-', color: GRADE_COLORS['D-'] };
  return { grade: 'F', color: GRADE_COLORS['F'] };
}

function calculateGrades(props: Props): GradeResult[] {
  const { history, totalEarnings, budget, startBudget, reputation, isVictory } = props;
  const results: GradeResult[] = [];

  // 1. Box Office Performance
  const avgBO = history.length > 0 ? totalEarnings / history.length : 0;
  const boScore = Math.min(100, avgBO * 3.5 + (isVictory ? 15 : 0));
  const bo = letterGrade(boScore);
  results.push({
    category: 'Box Office',
    emoji: '💰',
    grade: bo.grade,
    color: bo.color,
    detail: `$${totalEarnings.toFixed(1)}M total · $${avgBO.toFixed(1)}M avg/film`,
  });

  // 2. Critical Acclaim
  const avgQuality = history.length > 0 ? history.reduce((s, h) => s + h.quality, 0) / history.length : 0;
  const avgCritic = history.length > 0 ? history.reduce((s, h) => s + (h.criticScore ?? 50), 0) / history.length : 0;
  const criticScore = Math.min(100, avgQuality * 2.5 + avgCritic * 0.3);
  const cr = letterGrade(criticScore);
  results.push({
    category: 'Critical Acclaim',
    emoji: '🍅',
    grade: cr.grade,
    color: cr.color,
    detail: `Avg quality ${avgQuality.toFixed(0)} · Avg critic ${avgCritic.toFixed(0)}%`,
  });

  // 3. Consistency
  const tiers: Record<RewardTier, number> = { BLOCKBUSTER: 0, SMASH: 0, HIT: 0, FLOP: 0 };
  history.forEach(h => tiers[h.tier]++);
  const hitRate = history.length > 0 ? (tiers.BLOCKBUSTER + tiers.SMASH + tiers.HIT) / history.length : 0;
  const flopPenalty = history.length > 0 ? tiers.FLOP / history.length * 40 : 0;
  const consistScore = Math.min(100, hitRate * 85 + (isVictory ? 10 : 0) - flopPenalty);
  const co = letterGrade(Math.max(0, consistScore));
  results.push({
    category: 'Consistency',
    emoji: '📊',
    grade: co.grade,
    color: co.color,
    detail: `${tiers.BLOCKBUSTER}🟩 ${tiers.SMASH}🟨 ${tiers.HIT}🟧 ${tiers.FLOP}🟥`,
  });

  // 4. Budget Management
  const budgetEfficiency = startBudget > 0 ? (budget / startBudget) : 1;
  const budgetScore = Math.min(100, budgetEfficiency * 50 + (isVictory ? 25 : 0) + (budget > 0 ? 20 : 0));
  const bu = letterGrade(Math.max(0, budgetScore));
  results.push({
    category: 'Budget Mgmt',
    emoji: '🏦',
    grade: bu.grade,
    color: bu.color,
    detail: `Final: $${budget.toFixed(1)}M · Started: $${startBudget}M`,
  });

  return results;
}

// Overall GPA
function overallGrade(grades: GradeResult[]): { grade: string; color: string } {
  const gradeToNum: Record<string, number> = {
    'A+': 97, A: 93, 'A-': 90, 'B+': 87, B: 83, 'B-': 80,
    'C+': 77, C: 73, 'C-': 70, 'D+': 67, D: 63, 'D-': 60, F: 40,
  };
  const avg = grades.reduce((s, g) => s + (gradeToNum[g.grade] || 50), 0) / grades.length;
  return letterGrade(avg);
}

export default function StudioReportCard(props: Props) {
  const [revealed, setRevealed] = useState(false);
  const grades = calculateGrades(props);
  const overall = overallGrade(grades);

  // Auto-reveal after mount
  if (!revealed) setTimeout(() => setRevealed(true), 300);

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(212,168,67,0.08) 0%, rgba(0,0,0,0.3) 100%)',
      border: '2px solid rgba(212,168,67,0.3)',
      borderRadius: 16,
      padding: '20px 24px',
      maxWidth: 480,
      margin: '20px auto',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>📋</div>
        <div style={{
          color: '#d4a843',
          fontFamily: 'Bebas Neue',
          fontSize: 'clamp(1.2rem, 3vw, 1.6rem)',
          letterSpacing: 3,
        }}>
          STUDIO REPORT CARD
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {grades.map((g, i) => (
          <div key={g.category} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px',
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 10,
            border: `1px solid ${g.color}25`,
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translateX(0)' : 'translateX(-20px)',
            transition: `all 0.4s ease ${i * 0.15}s`,
          }}>
            <span style={{ fontSize: '1.2rem', width: 28 }}>{g.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#ccc', fontFamily: 'Bebas Neue', fontSize: '0.85rem', letterSpacing: 1 }}>
                {g.category}
              </div>
              <div style={{ color: '#888', fontSize: '0.65rem' }}>{g.detail}</div>
            </div>
            <div style={{
              color: g.color,
              fontFamily: 'Bebas Neue',
              fontSize: '1.8rem',
              minWidth: 44,
              textAlign: 'center',
              textShadow: `0 0 12px ${g.color}40`,
            }}>
              {g.grade}
            </div>
          </div>
        ))}
      </div>

      {/* Overall */}
      <div style={{
        marginTop: 16,
        padding: '12px 16px',
        background: `${overall.color}12`,
        border: `2px solid ${overall.color}40`,
        borderRadius: 10,
        textAlign: 'center',
        opacity: revealed ? 1 : 0,
        transition: 'all 0.5s ease 0.7s',
      }}>
        <div style={{ color: '#888', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          Overall Studio Grade
        </div>
        <div style={{
          color: overall.color,
          fontFamily: 'Bebas Neue',
          fontSize: '2.5rem',
          textShadow: `0 0 20px ${overall.color}50`,
        }}>
          {overall.grade}
        </div>
      </div>
    </div>
  );
}
