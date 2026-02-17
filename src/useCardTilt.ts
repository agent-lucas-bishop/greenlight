/**
 * R250: React hook for 3D card tilt effect on mousemove.
 * Uses CSS perspective transforms. Respects reduced motion.
 */
import { useEffect, useRef, useCallback } from 'react';
import { getSettings } from './settings';

export function useCardTilt<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    if (getSettings().visual.reduceMotion) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotX = (0.5 - y) * 14;
    const rotY = (x - 0.5) * 14;
    el.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px) scale(1.02)`;
    el.style.setProperty('--tilt-shine-x', `${x * 100}%`);
    el.style.setProperty('--tilt-shine-y', `${y * 100}%`);
  }, []);

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = '';
    el.style.removeProperty('--tilt-shine-x');
    el.style.removeProperty('--tilt-shine-y');
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseleave', onMouseLeave);
    return () => {
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [onMouseMove, onMouseLeave]);

  return ref;
}
