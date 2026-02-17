import { useState, useEffect, useCallback, useRef } from 'react';
import { getTutorialStepForPhase, completeTutorialStep, dismissTutorial, getTutorialProgress } from '../tutorial';
import { track } from '../analytics';
import { sfx } from '../sound';
import type { GamePhase } from '../types';
import { announce, trapFocus } from '../accessibility';

export default function TutorialOverlay({ phase }: { phase: GamePhase }) {
  const [step, setStep] = useState(getTutorialStepForPhase(phase));
  const [visible, setVisible] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [animating, setAnimating] = useState(false);

  const updateSpotlight = useCallback((selector?: string) => {
    if (!selector) { setSpotlightRect(null); return; }
    // Try multiple selectors (comma-separated)
    const selectors = selector.split(',').map(s => s.trim());
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        setSpotlightRect(el.getBoundingClientRect());
        return;
      }
    }
    setSpotlightRect(null);
  }, []);

  useEffect(() => {
    const s = getTutorialStepForPhase(phase);
    if (s) {
      setAnimating(true);
      const t = setTimeout(() => {
        setStep(s);
        setVisible(true);
        setAnimating(false);
        updateSpotlight(s.targetSelector);
        try { sfx.tutorialPing(); } catch {}
      }, 400);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [phase, updateSpotlight]);

  // Re-calculate spotlight on scroll/resize
  useEffect(() => {
    if (!visible || !step?.targetSelector) return;
    const handler = () => updateSpotlight(step.targetSelector);
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [visible, step, updateSpotlight]);

  const tutorialRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (visible && step && tutorialRef.current) {
      announce(`Tutorial: ${step.title}. ${step.text}`);
      return trapFocus(tutorialRef.current);
    }
  }, [visible, step]);

  if (!visible || !step) return null;

  const progress = getTutorialProgress(step.id);

  const handleDismiss = () => {
    completeTutorialStep(step.id);
    track('tutorial_step', { step: step.id });
    try { sfx.tutorialComplete(); } catch {}
    setAnimating(true);
    setTimeout(() => {
      setVisible(false);
      setAnimating(false);
      // Check for next step in same phase
      const next = getTutorialStepForPhase(phase);
      if (next) {
        setTimeout(() => {
          setStep(next);
          setVisible(true);
          updateSpotlight(next.targetSelector);
          try { sfx.tutorialPing(); } catch {}
        }, 300);
      }
    }, 200);
  };

  const handleSkipAll = () => {
    dismissTutorial();
    track('tutorial_skip');
    try { sfx.click(); } catch {}
    setVisible(false);
  };

  // Build spotlight clip-path if we have a target rect
  const clipPath = spotlightRect
    ? `polygon(
        0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
        ${spotlightRect.left - 8}px ${spotlightRect.top - 8}px,
        ${spotlightRect.right + 8}px ${spotlightRect.top - 8}px,
        ${spotlightRect.right + 8}px ${spotlightRect.bottom + 8}px,
        ${spotlightRect.left - 8}px ${spotlightRect.bottom + 8}px,
        ${spotlightRect.left - 8}px ${spotlightRect.top - 8}px
      )`
    : undefined;

  // Position tooltip near spotlight target when possible
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1000,
    background: 'linear-gradient(135deg, rgba(30,28,24,0.98), rgba(20,18,14,0.98))',
    border: '2px solid var(--gold)',
    borderRadius: 16,
    padding: '20px 24px',
    maxWidth: 420,
    width: 'calc(100vw - 32px)',
    boxShadow: '0 0 40px rgba(212,168,67,0.25), 0 16px 48px rgba(0,0,0,0.6)',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: animating ? 0 : 1,
    transform: 'translateX(-50%)',
    left: '50%',
  };

  if (step.position === 'center') {
    tooltipStyle.top = '50%';
    tooltipStyle.transform = 'translate(-50%, -50%)';
  } else if (step.position === 'bottom') {
    tooltipStyle.bottom = 80;
  } else {
    // top (default) — position below spotlight if available
    tooltipStyle.top = spotlightRect ? Math.min(spotlightRect.bottom + 16, window.innerHeight - 220) : 80;
  }

  return (
    <>
      {/* Backdrop with optional spotlight cutout */}
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 900,
          animation: 'fadeIn 0.3s ease',
          clipPath,
          transition: 'clip-path 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onClick={handleDismiss}
      />
      {/* Spotlight pulsing highlight ring */}
      {spotlightRect && (
        <div style={{
          position: 'fixed',
          left: spotlightRect.left - 10,
          top: spotlightRect.top - 10,
          width: spotlightRect.width + 20,
          height: spotlightRect.height + 20,
          border: '2px solid rgba(212,168,67,0.5)',
          borderRadius: 12,
          boxShadow: '0 0 20px rgba(212,168,67,0.3)',
          zIndex: 901,
          pointerEvents: 'none',
          animation: 'tutorialPulse 2s ease-in-out infinite',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      )}
      {/* Tutorial card */}
      <div
        ref={tutorialRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Tutorial: ${step.title}`}
        onKeyDown={e => { if (e.key === 'Escape') handleSkipAll(); }}
        style={tooltipStyle}
      >
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)', marginBottom: 8, fontFamily: 'Bebas Neue', letterSpacing: '0.05em' }}>
          {step.title}
        </div>
        <div style={{ color: '#ccc', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 16 }}>
          {step.text}
        </div>
        {/* Step counter */}
        <div style={{ color: '#666', fontSize: '0.7rem', textAlign: 'center', marginBottom: 12, fontFamily: 'Bebas Neue', letterSpacing: '0.08em' }}>
          {progress.current}/{progress.total}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={handleSkipAll}
            style={{
              background: 'none', border: 'none', color: '#555', fontSize: '0.75rem',
              cursor: 'pointer', padding: '4px 8px',
            }}
          >
            Skip tutorial
          </button>
          <button className="btn btn-primary" onClick={handleDismiss} style={{ fontSize: '0.85rem', padding: '8px 20px' }}>
            {step.dismissLabel || 'Next →'}
          </button>
        </div>
        {/* Step progress dots */}
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          {Array.from({ length: progress.total }, (_, i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i < progress.current ? 'var(--gold)' : 'rgba(212,168,67,0.2)',
              transition: 'background 0.3s ease',
            }} />
          ))}
        </div>
      </div>
      {/* Inject pulse animation */}
      <style>{`
        @keyframes tutorialPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(212,168,67,0.3); }
          50% { box-shadow: 0 0 35px rgba(212,168,67,0.6), 0 0 60px rgba(212,168,67,0.15); }
        }
      `}</style>
    </>
  );
}
