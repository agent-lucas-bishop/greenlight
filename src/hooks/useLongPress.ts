import { useRef, useCallback } from 'react';

interface LongPressHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
}

export function useLongPress(
  onLongPress: () => void,
  onTap?: () => void,
  delay = 500
): LongPressHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);
  const movedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback((_e: React.TouchEvent) => {
    firedRef.current = false;
    movedRef.current = false;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const onTouchEnd = useCallback((_e: React.TouchEvent) => {
    clear();
    if (!firedRef.current && !movedRef.current && onTap) {
      onTap();
    }
  }, [clear, onTap]);

  const onTouchMove = useCallback((_e: React.TouchEvent) => {
    movedRef.current = true;
    clear();
  }, [clear]);

  return { onTouchStart, onTouchEnd, onTouchMove };
}
