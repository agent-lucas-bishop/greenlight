/**
 * R311: Slot-machine style number reveal for scores/box office.
 * Each digit rolls independently.
 */
import { useState, useEffect, useRef } from 'react';

interface SlotMachineNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  delay?: number; // ms before starting
  digitDelay?: number; // stagger per digit
  className?: string;
  onComplete?: () => void;
}

export default function SlotMachineNumber({
  value,
  prefix = '',
  suffix = '',
  delay = 0,
  digitDelay = 80,
  className = '',
  onComplete,
}: SlotMachineNumberProps) {
  const digits = Math.round(value).toString().split('');
  const [revealedCount, setRevealedCount] = useState(0);
  const [rolling, setRolling] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setRevealedCount(digits.length);
      setRolling(false);
      onComplete?.();
      return;
    }

    setRevealedCount(0);
    setRolling(true);

    const startTimer = setTimeout(() => {
      let count = 0;
      const interval = setInterval(() => {
        count++;
        setRevealedCount(count);
        if (count >= digits.length) {
          clearInterval(interval);
          setTimeout(() => {
            setRolling(false);
            onComplete?.();
          }, 200);
        }
      }, digitDelay);
      timerRef.current = interval as any;
    }, delay);

    return () => {
      clearTimeout(startTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [value]);

  return (
    <span className={`slot-machine-number ${className}`}>
      {prefix}
      {digits.map((digit, i) => (
        <span
          key={`${i}-${digit}`}
          className={`slot-digit ${i < revealedCount ? 'slot-digit-revealed' : 'slot-digit-rolling'}`}
        >
          {i < revealedCount ? digit : (
            <span className="slot-digit-spinner">{Math.floor(Math.random() * 10)}</span>
          )}
        </span>
      ))}
      {suffix}
    </span>
  );
}
