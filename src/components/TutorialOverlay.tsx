import { useState, useEffect, useCallback } from 'react';
import { getTutorialStepForPhase, completeTutorialStep, dismissTutorial } from '../tutorial';
import { track } from '../analytics';
import type { GamePhase } from '../types';

export default function TutorialOverlay({ phase }: { phase: GamePhase }) {
  const [step, setStep] = useState(getTutorialStepForPhase(phase));
  const [visible, setVisible] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  const updateSpotlight = useCallback((selector?: string) => {
    if (!selector) { setSpotlightRect(null); return; }
    const el = document.querySelector(selector);
    if (el) {
      setSpotlightRect(el.getBoundingClientRect());
    } else {
      setSpotlightRect(null);
    }
  }, []);

  useEffect(() => {
    const s = getTutorialStepForPhase(phase);
    if (s) {
      const t = setTimeout(() => {
        setStep(s);
        setVisible(true);
        updateSpotlight(s.targetSelector);
      }, 400);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [phase, updateSpotlight]);

  if (!visible || !step) return null;

  const handleDismiss = () => {
    completeTutorialStep(step.id);
    track('tutorial_step', { step: step.id });
    setVisible(false);
  };

  const handleSkipAll = () => {
    dismissTutorial();
    track('tutorial_skip');
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

  return (
    <>
      {/* Backdrop with optional spotlight cutout */}
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 900,
          animation: 'fadeIn 0.3s ease',
          clipPath,
          transition: 'clip-path 0.4s ease',
        }}
        onClick={handleDismiss}
      />
      {/* Spotlight glow ring */}
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
          animation: 'fadeIn 0.4s ease',
        }} />
      )}
      {/* Tutorial card */}
      <div
        className="animate-slide-down"
        style={{
          position: 'fixed',
          top: step.position === 'top' ? 80 : step.position === 'center' ? '50%' : undefined,
          bottom: step.position === 'bottom' ? 80 : undefined,
          left: '50%',
          transform: step.position === 'center' ? 'translate(-50%, -50%)' : 'translateX(-50%)',
          zIndex: 1000,
          background: 'linear-gradient(135deg, rgba(30,28,24,0.98), rgba(20,18,14,0.98))',
          border: '2px solid var(--gold)',
          borderRadius: 16,
          padding: '20px 24px',
          maxWidth: 420,
          width: 'calc(100vw - 32px)',
          boxShadow: '0 0 40px rgba(212,168,67,0.25), 0 16px 48px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)', marginBottom: 8, fontFamily: 'Bebas Neue', letterSpacing: '0.05em' }}>
          {step.title}
        </div>
        <div style={{ color: '#ccc', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 16 }}>
          {step.text}
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
            {step.dismissLabel || 'Got it!'}
          </button>
        </div>
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 12 }}>
          {['neow', 'greenlight', 'casting', 'production', 'release', 'event', 'shop'].map((p) => (
            <div key={p} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: p === phase ? 'var(--gold)' : 'rgba(212,168,67,0.2)',
            }} />
          ))}
        </div>
      </div>
    </>
  );
}
