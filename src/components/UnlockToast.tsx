// Unlock toast — notification when new content is unlocked
import { useState, useEffect } from 'react';
import { sfx } from '../sound';
import type { UnlockableDef } from '../unlockableContent';

interface UnlockToastProps {
  unlock: UnlockableDef;
  onDone: () => void;
}

export default function UnlockToast({ unlock, onDone }: UnlockToastProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    sfx.contentUnlock();
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
        background: 'linear-gradient(135deg, rgba(46,204,113,0.2), rgba(39,174,96,0.15))',
        border: '1px solid rgba(46,204,113,0.5)',
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
        boxShadow: '0 4px 20px rgba(46,204,113,0.25)',
        minWidth: 260,
      }}
    >
      <span style={{ fontSize: '1.8rem' }}>{unlock.emoji}</span>
      <div>
        <div style={{
          color: '#2ecc71',
          fontFamily: 'Bebas Neue',
          fontSize: '0.7rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          🔓 New Content Unlocked
        </div>
        <div style={{
          color: '#fff',
          fontWeight: 700,
          fontSize: '1rem',
        }}>
          {unlock.name}
        </div>
        <div style={{ color: '#bbb', fontSize: '0.75rem' }}>
          {unlock.type === 'script' ? '📜 New script added to pool' : '🎭 New talent added to pool'}
        </div>
      </div>
    </div>
  );
}
