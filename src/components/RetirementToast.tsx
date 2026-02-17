import { useState, useEffect } from 'react';
import { getRetirementRepBonus } from '../talentHistory';

interface RetirementToastProps {
  talentName: string;
  onDone: () => void;
}

export default function RetirementToast({ talentName, onDone }: RetirementToastProps) {
  const [exiting, setExiting] = useState(false);
  const repBonus = getRetirementRepBonus();

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), 3500);
    const doneTimer = setTimeout(onDone, 4000);
    return () => { clearTimeout(exitTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <div
      onClick={() => { setExiting(true); setTimeout(onDone, 300); }}
      style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: `translateX(-50%) translateY(${exiting ? '-120px' : '0'})`,
        zIndex: 9999,
        background: 'linear-gradient(135deg, rgba(155,89,182,0.25), rgba(142,68,173,0.15))',
        border: '1px solid rgba(155,89,182,0.6)',
        borderRadius: 12,
        padding: '14px 24px',
        backdropFilter: 'blur(12px)',
        cursor: 'pointer',
        transition: 'transform 0.4s ease-in-out, opacity 0.4s',
        opacity: exiting ? 0 : 1,
        animation: 'achievementSlideIn 0.4s ease-out',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 4px 20px rgba(155,89,182,0.3)',
        minWidth: 260,
      }}
    >
      <span style={{ fontSize: '2rem' }}>🎬</span>
      <div>
        <div style={{
          color: '#bb86fc',
          fontFamily: 'Bebas Neue',
          fontSize: '0.7rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          🏆 Talent Retired
        </div>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
          {talentName} has retired!
        </div>
        <div style={{ color: '#bbb', fontSize: '0.75rem' }}>
          A legendary career. +1 permanent rep bonus ({repBonus}/3 max).
        </div>
      </div>
    </div>
  );
}
