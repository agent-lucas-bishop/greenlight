/**
 * R253: Contextual tutorial tooltip — appears near game elements with brief explanations.
 * Auto-dismisses after 5 seconds or on click. Respects tutorial_hints setting.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { getSettings } from '../settings';
import { isTutorialActive, markStepSeen } from '../tutorial';

export interface TooltipHint {
  id: string;
  text: string;
  targetSelector: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const SHOWN_KEY = 'greenlight-tutorial-tooltips';
const AUTO_DISMISS_MS = 5000;

function getShownTooltips(): string[] {
  try {
    const raw = localStorage.getItem(SHOWN_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function markTooltipShown(id: string) {
  const shown = getShownTooltips();
  if (!shown.includes(id)) {
    shown.push(id);
    localStorage.setItem(SHOWN_KEY, JSON.stringify(shown));
  }
}

export function resetTooltips() {
  localStorage.removeItem(SHOWN_KEY);
}

export function shouldShowTooltip(id: string): boolean {
  if (!getSettings().gameplay.tutorialHints) return false;
  return !getShownTooltips().includes(id);
}

interface Props {
  hint: TooltipHint;
  onDismiss?: () => void;
}

export default function TutorialTooltip({ hint, onDismiss }: Props) {
  const [visible, setVisible] = useState(true);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const dismiss = useCallback(() => {
    setVisible(false);
    markTooltipShown(hint.id);
    try { markStepSeen(hint.id); } catch {}
    onDismiss?.();
  }, [hint.id, onDismiss]);

  // Position near target element
  useEffect(() => {
    const el = document.querySelector(hint.targetSelector);
    if (!el) { setPos({ top: 100, left: window.innerWidth / 2 }); return; }
    const rect = el.getBoundingClientRect();
    const position = hint.position || 'top';
    let top: number, left: number;
    switch (position) {
      case 'bottom': top = rect.bottom + 8; left = rect.left + rect.width / 2; break;
      case 'left': top = rect.top + rect.height / 2; left = rect.left - 8; break;
      case 'right': top = rect.top + rect.height / 2; left = rect.right + 8; break;
      default: top = rect.top - 8; left = rect.left + rect.width / 2; break;
    }
    setPos({ top, left });
  }, [hint.targetSelector, hint.position]);

  // Auto-dismiss after 5s
  useEffect(() => {
    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timerRef.current);
  }, [dismiss]);

  if (!visible || !pos) return null;

  const isVertical = !hint.position || hint.position === 'top' || hint.position === 'bottom';

  return (
    <div
      onClick={dismiss}
      role="tooltip"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        transform: isVertical ? 'translateX(-50%)' : hint.position === 'left' ? 'translate(-100%, -50%)' : 'translateY(-50%)',
        zIndex: 800,
        background: 'rgba(30,28,24,0.95)',
        border: '1px solid var(--gold-dim, #8a7035)',
        borderRadius: 10,
        padding: '10px 14px',
        maxWidth: 280,
        color: '#ccc',
        fontSize: '0.8rem',
        lineHeight: 1.5,
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        animation: 'tooltipFadeIn 0.3s ease',
        pointerEvents: 'auto',
      }}
    >
      {hint.text}
      <div style={{ color: '#555', fontSize: '0.65rem', marginTop: 4 }}>Click to dismiss</div>
      <style>{`
        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: ${isVertical ? 'translateX(-50%) translateY(4px)' : 'translateY(-50%) translateX(4px)'}; }
          to { opacity: 1; transform: ${isVertical ? 'translateX(-50%)' : hint.position === 'left' ? 'translate(-100%, -50%)' : 'translateY(-50%)'}; }
        }
      `}</style>
    </div>
  );
}

/**
 * Hook: show a contextual tooltip for a game action.
 * Returns [shouldShow, dismiss] — render TutorialTooltip when shouldShow is true.
 */
export function useTutorialTooltip(id: string): [boolean, () => void] {
  const [show, setShow] = useState(() => shouldShowTooltip(id));
  const dismiss = useCallback(() => {
    markTooltipShown(id);
    setShow(false);
  }, [id]);
  return [show, dismiss];
}
