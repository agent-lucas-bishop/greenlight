import { useState, useEffect } from 'react';
import { isTipDismissed, dismissTip, MECHANIC_TIPS } from '../onboarding';

/** Inline contextual tip shown once per mechanic, permanently dismissed on click. */
export default function MechanicTip({ id }: { id: string }) {
  const [visible, setVisible] = useState(false);
  const tip = MECHANIC_TIPS[id];

  useEffect(() => {
    if (tip && !isTipDismissed(`mechanic_${id}`)) {
      setVisible(true);
    }
  }, [id]);

  if (!visible || !tip) return null;

  const handle = () => {
    dismissTip(`mechanic_${id}`);
    setVisible(false);
  };

  return (
    <div
      className="mechanic-tip animate-slide-down"
      onClick={handle}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handle(); }}
      style={{
        background: 'rgba(212,168,67,0.08)',
        border: '1px solid rgba(212,168,67,0.25)',
        borderRadius: 8,
        padding: '8px 12px',
        margin: '8px 0',
        fontSize: '0.8rem',
        color: '#ccc',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span style={{ color: 'var(--gold)', fontSize: '0.75rem', flexShrink: 0 }}>💡</span>
      <span style={{ flex: 1 }}>{tip}</span>
      <span style={{ color: '#555', fontSize: '0.7rem', flexShrink: 0 }}>✕</span>
    </div>
  );
}
