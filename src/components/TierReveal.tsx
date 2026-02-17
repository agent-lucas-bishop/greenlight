/**
 * R311: Quality tier reveal with dramatic pause + glow burst.
 */
import { useState, useEffect } from 'react';

interface TierRevealProps {
  tier: string;
  delay?: number;
  onRevealed?: () => void;
  className?: string;
}

const TIER_COLORS: Record<string, string> = {
  BLOCKBUSTER: '#ffd700',
  HIT: '#2ecc71',
  MIXED: '#f39c12',
  FLOP: '#e74c3c',
};

export default function TierReveal({ tier, delay = 800, onRevealed, className = '' }: TierRevealProps) {
  const [phase, setPhase] = useState<'hidden' | 'suspense' | 'revealed'>('hidden');

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setPhase('revealed');
      onRevealed?.();
      return;
    }

    setPhase('suspense');
    const t = setTimeout(() => {
      setPhase('revealed');
      onRevealed?.();
    }, delay);
    return () => clearTimeout(t);
  }, [tier]);

  const color = TIER_COLORS[tier] || '#d4a843';

  return (
    <span
      className={`tier-reveal tier-reveal-${phase} ${className}`}
      style={{ '--tier-color': color } as React.CSSProperties}
    >
      {phase === 'suspense' && <span className="tier-suspense-dots">...</span>}
      {phase === 'revealed' && (
        <>
          <span className="tier-text">{tier}</span>
          <span className="tier-glow-burst" aria-hidden="true" />
        </>
      )}
    </span>
  );
}
