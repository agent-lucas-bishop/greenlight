/**
 * R311: Animated budget/number counter that rolls up/down.
 */
import { useState, useEffect, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
}

export default function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  duration = 600,
  decimals = 0,
  className = '',
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(value);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const prevRef = useRef(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;

    if (from === to) return;

    // Check reduced motion
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(to);
      return;
    }

    setDirection(to > from ? 'up' : 'down');
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setTimeout(() => setDirection(null), 300);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toString();

  return (
    <span className={`animated-counter ${direction ? `counter-${direction}` : ''} ${className}`}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
