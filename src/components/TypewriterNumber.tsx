/**
 * R311: Typewriter-style digit-by-digit number reveal for box office.
 */
import { useState, useEffect, useRef } from 'react';

interface TypewriterNumberProps {
  value: string; // pre-formatted string like "$142.5M"
  charDelay?: number;
  delay?: number;
  className?: string;
  onComplete?: () => void;
}

export default function TypewriterNumber({
  value,
  charDelay = 60,
  delay = 0,
  className = '',
  onComplete,
}: TypewriterNumberProps) {
  const [visibleChars, setVisibleChars] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setVisibleChars(value.length);
      onComplete?.();
      return;
    }

    setVisibleChars(0);
    const startTimer = setTimeout(() => {
      let count = 0;
      timerRef.current = setInterval(() => {
        count++;
        setVisibleChars(count);
        if (count >= value.length) {
          clearInterval(timerRef.current!);
          onComplete?.();
        }
      }, charDelay);
    }, delay);

    return () => {
      clearTimeout(startTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [value]);

  return (
    <span className={`typewriter-number ${className}`}>
      <span className="typewriter-visible">{value.slice(0, visibleChars)}</span>
      <span className="typewriter-cursor" aria-hidden="true">▌</span>
    </span>
  );
}
