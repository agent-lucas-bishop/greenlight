/**
 * R202: Accessibility utilities — screen reader announcements, focus management, keyboard navigation
 */

// ──── Screen Reader Live Region Announcer ────────────────────
let announcer: HTMLElement | null = null;

function getAnnouncer(): HTMLElement {
  if (announcer && document.body.contains(announcer)) return announcer;
  announcer = document.createElement('div');
  announcer.id = 'sr-announcer';
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  Object.assign(announcer.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    whiteSpace: 'nowrap',
    border: '0',
  });
  document.body.appendChild(announcer);
  return announcer;
}

/** Announce a message to screen readers via aria-live region */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const el = getAnnouncer();
  el.setAttribute('aria-live', priority);
  // Clear then set to trigger re-announcement
  el.textContent = '';
  requestAnimationFrame(() => {
    el.textContent = message;
  });
  // R208: Subtle audio confirmation for screen reader announcements
  import('./sound').then(m => m.sfx.a11yAnnounce()).catch(() => {});
}

/** Announce phase changes */
export function announcePhase(phase: string) {
  const names: Record<string, string> = {
    start: 'Start Screen',
    neow: 'Studio Setup',
    greenlight: 'Greenlight Phase — Choose a script',
    casting: 'Casting Phase — Hire talent',
    production: 'Production Phase — Draw cards and build your film',
    postProduction: 'Post-Production Phase',
    release: 'Release Phase — See your results',
    shop: 'Shop Phase — Buy upgrades',
    workshop: 'Card Workshop',
    festival: 'Film Festival',
    event: 'Event Phase',
    gameOver: 'Game Over',
    victory: 'Victory!',
  };
  announce(names[phase] || `Phase: ${phase}`, 'assertive');
}

/** Announce score/quality updates */
export function announceScore(label: string, value: number | string) {
  announce(`${label}: ${value}`);
}

// ──── Focus Trap for Modals ──────────────────────────────────

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function trapFocus(container: HTMLElement): () => void {
  const focusable = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null);
  
  const handler = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const els = focusable();
    if (els.length === 0) return;
    const first = els[0];
    const last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  
  container.addEventListener('keydown', handler);
  // Focus first focusable element
  const els = focusable();
  if (els.length > 0) els[0].focus();
  
  return () => container.removeEventListener('keydown', handler);
}

// ──── Arrow Key Navigation for Card Grids ────────────────────

export function useCardGridKeys(
  containerRef: React.RefObject<HTMLElement | null>,
  onSelect?: (index: number) => void,
) {
  const handler = (e: KeyboardEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const cards = Array.from(container.querySelectorAll<HTMLElement>('[role="button"], [tabindex="0"]'));
    if (cards.length === 0) return;
    const idx = cards.indexOf(document.activeElement as HTMLElement);
    if (idx === -1) return;
    
    let nextIdx = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIdx = (idx + 1) % cards.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIdx = (idx - 1 + cards.length) % cards.length;
    } else if ((e.key === 'Enter' || e.key === ' ') && onSelect) {
      e.preventDefault();
      onSelect(idx);
      return;
    } else {
      return;
    }
    cards[nextIdx].focus();
    // R208: Subtle tone on focus change
    import('./sound').then(m => m.sfx.a11yFocusChange()).catch(() => {});
  };
  
  return handler;
}
