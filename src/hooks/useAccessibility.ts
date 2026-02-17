/**
 * R202: React hooks for accessibility — focus trapping, arrow key navigation
 */
import { useEffect, useRef, useCallback } from 'react';
import { trapFocus, useCardGridKeys } from '../accessibility';

/** Focus trap hook for modals/overlays. Returns a ref to attach to the container. */
export function useFocusTrap(active: boolean = true) {
  const ref = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !ref.current) return;
    prevFocus.current = document.activeElement as HTMLElement;
    const cleanup = trapFocus(ref.current);
    return () => {
      cleanup();
      // Restore focus to previously focused element
      prevFocus.current?.focus?.();
    };
  }, [active]);

  return ref;
}

/** Arrow key navigation for card grids. Returns a ref and keydown handler. */
export function useArrowNav(onSelect?: (index: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const handler = useCardGridKeys(ref, onSelect);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener('keydown', handler);
    return () => el.removeEventListener('keydown', handler);
  }, [handler]);

  return ref;
}

/** Hook to announce to screen readers when a value changes */
export function useAnnounceChange(value: string | number, label: string) {
  const prevValue = useRef(value);
  
  useEffect(() => {
    if (prevValue.current !== value) {
      import('../accessibility').then(m => m.announce(`${label}: ${value}`));
      prevValue.current = value;
    }
  }, [value, label]);
}
