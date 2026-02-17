/**
 * R311: Cinematic Screen Transitions
 * Film-reel wipe, projector flicker fade-to-black, and quick dissolve.
 * Pure CSS animations, no libraries.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export type TransitionType = 'filmReel' | 'projectorFlicker' | 'dissolve' | 'none';

interface TransitionConfig {
  type: TransitionType;
  duration: number; // ms
}

// Map phase transitions to appropriate effects
const DRAMATIC_PHASES = new Set(['release', 'festival', 'gameOver', 'victory']);
const MINOR_PHASES = new Set(['production', 'postProduction', 'casting']);

export function getTransitionType(from: string, to: string): TransitionConfig {
  // Start → Game: film reel
  if (from === 'start' && to !== 'start') {
    return { type: 'filmReel', duration: 450 };
  }
  // Game → End: projector flicker
  if ((to === 'gameOver' || to === 'victory') && from !== 'start') {
    return { type: 'projectorFlicker', duration: 500 };
  }
  // End → Start: film reel (reverse feel)
  if ((from === 'gameOver' || from === 'victory') && to === 'start') {
    return { type: 'filmReel', duration: 450 };
  }
  // Release / festival reveals: projector flicker
  if (DRAMATIC_PHASES.has(to) && !DRAMATIC_PHASES.has(from)) {
    return { type: 'projectorFlicker', duration: 400 };
  }
  // Minor transitions: quick dissolve
  if (MINOR_PHASES.has(to) || MINOR_PHASES.has(from)) {
    return { type: 'dissolve', duration: 300 };
  }
  // Default
  return { type: 'dissolve', duration: 300 };
}

interface ScreenTransitionProps {
  phase: string;
  children: React.ReactNode;
}

export default function ScreenTransition({ phase, children }: ScreenTransitionProps) {
  const [activeTransition, setActiveTransition] = useState<TransitionType | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevPhaseRef = useRef(phase);

  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (prev === phase) return;

    // Check reduced motion
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      document.body.classList.contains('force-reduce-motion');
    
    if (reduced) {
      prevPhaseRef.current = phase;
      return;
    }

    const config = getTransitionType(prev, phase);
    if (config.type === 'none') {
      prevPhaseRef.current = phase;
      return;
    }

    setActiveTransition(config.type);
    setIsTransitioning(true);

    const timer = setTimeout(() => {
      setIsTransitioning(false);
      setActiveTransition(null);
    }, config.duration);

    prevPhaseRef.current = phase;
    return () => clearTimeout(timer);
  }, [phase]);

  return (
    <>
      {children}
      {activeTransition === 'filmReel' && (
        <div className={`tr-film-reel ${isTransitioning ? 'tr-active' : 'tr-exit'}`} aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="tr-film-bar" style={{ animationDelay: `${i * 35}ms` }} />
          ))}
        </div>
      )}
      {activeTransition === 'projectorFlicker' && (
        <div className={`tr-projector ${isTransitioning ? 'tr-active' : 'tr-exit'}`} aria-hidden="true">
          <div className="tr-projector-black" />
        </div>
      )}
      {activeTransition === 'dissolve' && (
        <div className={`tr-dissolve ${isTransitioning ? 'tr-active' : 'tr-exit'}`} aria-hidden="true" />
      )}
    </>
  );
}
