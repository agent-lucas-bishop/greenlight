/**
 * R307: Awards Ceremony Screen
 * Shown at end of run after results. Gold trophy animations, CSS only.
 */

import { useState, useEffect } from 'react';
import type { FilmAward } from '../filmAwards';

interface Props {
  awards: FilmAward[];
  studioName: string;
  onContinue: () => void;
}

const REVEAL_DELAY = 600; // ms between each award reveal

export default function AwardsCeremony({ awards, studioName, onContinue }: Props) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (revealedCount >= awards.length) return;
    const timer = setTimeout(() => setRevealedCount(c => c + 1), REVEAL_DELAY);
    return () => clearTimeout(timer);
  }, [revealedCount, awards.length]);

  const handleSkip = () => {
    setRevealedCount(awards.length);
    setShowAll(true);
  };

  return (
    <div style={{
      maxWidth: 560, margin: '0 auto', padding: '24px 16px', textAlign: 'center',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div className="awards-trophy-bounce" style={{
          fontSize: '3rem', marginBottom: 8,
          animation: 'awardsTrophyBounce 1s ease-out',
        }}>🏆</div>
        <h2 style={{
          color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.8rem',
          letterSpacing: 3, margin: 0,
          animation: 'awardsHeaderGlow 2s ease-in-out infinite alternate',
        }}>
          AWARDS CEREMONY
        </h2>
        <div style={{ color: '#888', fontSize: '0.75rem', marginTop: 4 }}>
          {studioName} Studios Presents
        </div>
      </div>

      {/* Awards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {awards.map((award, i) => {
          const visible = i < revealedCount || showAll;
          return (
            <div key={award.id} style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
              transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
              background: 'rgba(212,168,67,0.06)',
              border: '1px solid rgba(212,168,67,0.25)',
              borderRadius: 12,
              padding: '16px 20px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Gold shimmer overlay */}
              {visible && (
                <div style={{
                  position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(212,168,67,0.1), transparent)',
                  animation: 'awardsShimmer 1.5s ease-out forwards',
                  animationDelay: `${i * 0.1}s`,
                  pointerEvents: 'none',
                }} />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  fontSize: '2rem', width: 50, height: 50,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,215,0,0.1)', borderRadius: '50%',
                  border: '2px solid rgba(255,215,0,0.3)',
                  animation: visible ? 'awardIconPulse 0.6s ease-out' : 'none',
                }}>
                  {award.emoji}
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{
                    color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.1rem',
                    letterSpacing: 1,
                  }}>
                    {award.name}
                  </div>
                  <div style={{ color: '#ccc', fontSize: '0.8rem' }}>
                    "{award.filmTitle}"
                  </div>
                  <div style={{ color: '#888', fontSize: '0.7rem', marginTop: 2 }}>
                    {award.value}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        {revealedCount < awards.length && !showAll && (
          <button onClick={handleSkip} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid #333',
            borderRadius: 8, padding: '10px 24px', color: '#888',
            cursor: 'pointer', fontFamily: 'Bebas Neue', fontSize: '0.85rem',
          }}>
            Skip ▸▸
          </button>
        )}
        {(revealedCount >= awards.length || showAll) && (
          <button onClick={onContinue} style={{
            background: 'rgba(212,168,67,0.15)', border: '1px solid var(--gold-dim)',
            borderRadius: 8, padding: '12px 32px', color: 'var(--gold)',
            cursor: 'pointer', fontFamily: 'Bebas Neue', fontSize: '1rem',
            letterSpacing: 1,
          }}>
            Continue →
          </button>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes awardsTrophyBounce {
          0% { transform: scale(0) rotate(-15deg); opacity: 0; }
          50% { transform: scale(1.2) rotate(5deg); }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        @keyframes awardsHeaderGlow {
          from { text-shadow: 0 0 10px rgba(212,168,67,0.3); }
          to { text-shadow: 0 0 20px rgba(212,168,67,0.6), 0 0 40px rgba(212,168,67,0.2); }
        }
        @keyframes awardsShimmer {
          0% { left: -100%; }
          100% { left: 200%; }
        }
        @keyframes awardIconPulse {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
