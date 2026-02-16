import { useState, useRef, useEffect } from 'react';

/**
 * Lightweight hoverable/tappable tooltip for stats, icons, and mechanics.
 * Shows a "?" indicator or wraps children; reveals explanation on hover/tap.
 */
export default function StatTooltip({ 
  children, 
  tip, 
  icon = '?',
  inline = false 
}: { 
  children?: React.ReactNode; 
  tip: string; 
  icon?: string;
  inline?: boolean;
}) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Close on outside click (mobile)
  useEffect(() => {
    if (!show) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [show]);

  const handleEnter = () => { clearTimeout(timeout.current); setShow(true); };
  const handleLeave = () => { timeout.current = setTimeout(() => setShow(false), 200); };
  const handleTap = (e: React.MouseEvent) => { e.stopPropagation(); setShow(s => !s); };

  return (
    <span
      ref={ref as React.Ref<HTMLSpanElement>}
      className={`stat-tooltip-wrap ${inline ? 'stat-tooltip-inline' : ''}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={handleTap}
      style={{ position: 'relative', cursor: 'help' }}
    >
      {children}
      {!children && <span className="stat-tooltip-icon">{icon}</span>}
      {show && (
        <span className="stat-tooltip-bubble">
          {tip}
        </span>
      )}
    </span>
  );
}
