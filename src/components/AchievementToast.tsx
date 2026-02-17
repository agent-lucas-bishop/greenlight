// Achievement toast — gold notification that slides in from the top
import { useState, useEffect } from 'react';
import type { AchievementDef } from '../achievements';
import { sfx } from '../sound';
import { announce } from '../accessibility';

interface AchievementToastProps {
  achievement: AchievementDef;
  onDone: () => void;
}

export default function AchievementToast({ achievement, onDone }: AchievementToastProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    sfx.achievementUnlock();
    announce(`Achievement unlocked: ${achievement.name}. ${achievement.description}`);
    const exitTimer = setTimeout(() => setExiting(true), 2500);
    const doneTimer = setTimeout(onDone, 3000);
    return () => { clearTimeout(exitTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      onClick={() => { setExiting(true); setTimeout(onDone, 300); }}
      style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: `translateX(-50%) translateY(${exiting ? '-120px' : '0'})`,
        zIndex: 9999,
        background: 'linear-gradient(135deg, rgba(212,168,67,0.2), rgba(255,215,0,0.15))',
        border: '1px solid rgba(255,215,0,0.5)',
        borderRadius: 12,
        padding: '12px 24px',
        backdropFilter: 'blur(12px)',
        cursor: 'pointer',
        transition: 'transform 0.4s ease-in-out, opacity 0.4s',
        opacity: exiting ? 0 : 1,
        animation: 'achievementSlideIn 0.4s ease-out',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 4px 20px rgba(255,215,0,0.2)',
        minWidth: 240,
        overflow: 'visible',
      }}
    >
      {(achievement.secret || achievement.cosmeticReward) && (
        <div className="achievement-confetti">
          {Array.from({ length: 12 }, (_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const dist = 30 + Math.random() * 40;
            return (
              <span key={i} className="achievement-confetti-piece" style={{
                left: '50%', top: '50%',
                background: ['#ffd700', '#ff6b6b', '#2ecc71', '#3498db', '#e91e63'][i % 5],
                '--tx': `${Math.cos(angle) * dist}px`,
                '--ty': `${Math.sin(angle) * dist}px`,
                animationDelay: `${i * 0.05}s`,
              } as React.CSSProperties} />
            );
          })}
        </div>
      )}
      <span style={{ fontSize: '1.8rem' }}>{achievement.emoji}</span>
      <div>
        <div style={{
          color: '#ffd700',
          fontFamily: 'Bebas Neue',
          fontSize: '0.7rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          🏅 Achievement Unlocked
        </div>
        <div style={{
          color: '#fff',
          fontWeight: 700,
          fontSize: '1rem',
        }}>
          {achievement.name}
        </div>
        <div style={{ color: '#bbb', fontSize: '0.75rem' }}>
          {achievement.description}
        </div>
        {achievement.cosmeticReward && (
          <div style={{ color: '#ffd700', fontSize: '0.65rem', marginTop: 2 }}>
            🎨 Unlocked: {achievement.cosmeticReward.label}
          </div>
        )}
      </div>
    </div>
  );
}
