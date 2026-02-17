// ═══════════════════════════════════════════════════════════════
// R272: Hall of Fame Card — Compact card shown on EndScreen
// Shows if the run qualified for the Hall of Fame.
// ═══════════════════════════════════════════════════════════════

import type { SubmitResult } from '../hallOfFame';

interface Props {
  result: SubmitResult | null;
}

export default function HallOfFameCard({ result }: Props) {
  if (!result || !result.qualified) return null;

  const rankLabel = result.rank ? `#${result.rank}` : '';
  const diffLabel = result.difficulty === 'indie' ? 'Easy'
    : result.difficulty === 'studio' ? 'Normal'
    : result.difficulty === 'mogul' ? 'Hard'
    : result.difficulty === 'nightmare' ? 'Nightmare'
    : 'Custom';

  return (
    <div style={{
      background: result.isNewRecord
        ? 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,107,107,0.1) 100%)'
        : 'linear-gradient(135deg, rgba(212,168,67,0.12) 0%, rgba(212,168,67,0.04) 100%)',
      border: `2px solid ${result.isNewRecord ? 'rgba(255,215,0,0.6)' : 'rgba(212,168,67,0.4)'}`,
      borderRadius: 12,
      padding: '14px 20px',
      textAlign: 'center',
      animation: 'comboAppear 0.6s ease',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {result.isNewRecord && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.3), transparent)',
          height: 2,
        }} />
      )}

      <div style={{ fontSize: '1.3rem', marginBottom: 2 }}>👑</div>

      {result.isNewRecord && (
        <div style={{
          color: '#ffd700', fontFamily: 'Bebas Neue', fontSize: '1rem',
          letterSpacing: 2, marginBottom: 4,
          textShadow: '0 0 10px rgba(255,215,0,0.3)',
        }}>
          ✨ NEW RECORD! ✨
        </div>
      )}

      <div style={{
        color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.9rem',
        letterSpacing: 1,
      }}>
        HALL OF FAME — {rankLabel} {diffLabel}
      </div>

      <div style={{ color: '#888', fontSize: '0.7rem', marginTop: 4 }}>
        Your run has been enshrined in the {diffLabel} leaderboard!
      </div>
    </div>
  );
}
