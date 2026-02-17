import { useState, useEffect, useRef, useCallback } from 'react';
import { markTipShown } from '../contextualTips';
import type { ContextualTip } from '../contextualTips';
import { sfx } from '../sound';

interface Props {
  tip: ContextualTip;
  onDismiss: () => void;
}

/**
 * Positioned tooltip that points to a relevant UI element.
 * Shows an arrow toward the target element and a "Got it" dismiss button.
 * Tracks dismissal in localStorage via markTipShown.
 */
export default function ContextualTooltip({ tip, onDismiss }: Props) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (tip.targetSelector) {
      const el = document.querySelector(tip.targetSelector);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    }
  }, [tip.targetSelector]);

  useEffect(() => {
    // Delay appearance slightly for smoother UX
    const t = setTimeout(() => {
      updatePosition();
      setVisible(true);
      try { sfx.tooltipAppear(); } catch {}
    }, 300);

    // Update position on scroll/resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [updatePosition]);

  const handleDismiss = () => {
    markTipShown(tip.id);
    try { sfx.tooltipDismiss(); } catch {}
    setVisible(false);
    setTimeout(onDismiss, 200);
  };

  if (!visible) return null;

  // Calculate tooltip position
  const style: React.CSSProperties = {
    position: 'fixed',
    zIndex: 950,
    background: 'linear-gradient(135deg, rgba(30,28,24,0.98), rgba(20,18,14,0.98))',
    border: '1px solid var(--gold)',
    borderRadius: 12,
    padding: '14px 18px',
    maxWidth: 340,
    width: 'max-content',
    boxShadow: '0 0 30px rgba(212,168,67,0.2), 0 8px 32px rgba(0,0,0,0.5)',
    animation: 'fadeIn 0.3s ease',
  };

  // Arrow styles
  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
  };

  if (targetRect) {
    const gap = 12;
    const centerX = targetRect.left + targetRect.width / 2;
    const centerY = targetRect.top + targetRect.height / 2;

    switch (tip.position) {
      case 'top':
        style.bottom = window.innerHeight - targetRect.top + gap;
        style.left = Math.max(16, Math.min(centerX - 170, window.innerWidth - 356));
        arrowStyle.bottom = -8;
        arrowStyle.left = Math.min(Math.max(centerX - (style.left as number), 20), 320);
        arrowStyle.borderLeft = '8px solid transparent';
        arrowStyle.borderRight = '8px solid transparent';
        arrowStyle.borderTop = '8px solid var(--gold)';
        break;
      case 'bottom':
        style.top = targetRect.bottom + gap;
        style.left = Math.max(16, Math.min(centerX - 170, window.innerWidth - 356));
        arrowStyle.top = -8;
        arrowStyle.left = Math.min(Math.max(centerX - (style.left as number), 20), 320);
        arrowStyle.borderLeft = '8px solid transparent';
        arrowStyle.borderRight = '8px solid transparent';
        arrowStyle.borderBottom = '8px solid var(--gold)';
        break;
      case 'left':
        style.right = window.innerWidth - targetRect.left + gap;
        style.top = Math.max(16, centerY - 50);
        arrowStyle.right = -8;
        arrowStyle.top = 20;
        arrowStyle.borderTop = '8px solid transparent';
        arrowStyle.borderBottom = '8px solid transparent';
        arrowStyle.borderLeft = '8px solid var(--gold)';
        break;
      case 'right':
        style.left = targetRect.right + gap;
        style.top = Math.max(16, centerY - 50);
        arrowStyle.left = -8;
        arrowStyle.top = 20;
        arrowStyle.borderTop = '8px solid transparent';
        arrowStyle.borderBottom = '8px solid transparent';
        arrowStyle.borderRight = '8px solid var(--gold)';
        break;
    }
  } else {
    // No target — center on screen
    style.top = '50%';
    style.left = '50%';
    style.transform = 'translate(-50%, -50%)';
  }

  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      aria-label={`Tip: ${tip.title}`}
      style={style}
    >
      {/* Arrow */}
      {targetRect && <div style={arrowStyle} />}

      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--gold)', marginBottom: 6, fontFamily: 'Bebas Neue', letterSpacing: '0.04em' }}>
        {tip.title}
      </div>
      <div style={{ color: '#ccc', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: 12 }}>
        {tip.text}
      </div>
      <div style={{ textAlign: 'right' }}>
        <button
          className="btn btn-primary"
          onClick={handleDismiss}
          style={{ fontSize: '0.78rem', padding: '6px 16px' }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
