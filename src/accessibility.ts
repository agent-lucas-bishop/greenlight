/**
 * R279: Accessibility utilities — screen reader announcements, focus management,
 * keyboard navigation, high contrast, color blind modes, reduced motion, large text
 */

// ──── A11y Settings Types & Persistence ──────────────────────

export type ColorBlindMode = 'off' | 'protanopia' | 'deuteranopia' | 'tritanopia';
export type FontScale = 'small' | 'medium' | 'large' | 'xl';
export type CardPlaySpeed = 'fast' | 'normal' | 'slow';

export interface A11ySettings {
  highContrast: boolean;
  largeText: boolean;
  fontScale: FontScale;
  colorBlindMode: ColorBlindMode;
  reducedMotion: boolean;
  screenReaderMode: boolean;
  focusIndicators: boolean;
  screenShake: boolean;
  animations: boolean;
  cardPlaySpeed: CardPlaySpeed;
}

const A11Y_STORAGE_KEY = 'greenlight-a11y';

const A11Y_DEFAULTS: A11ySettings = {
  highContrast: false,
  largeText: false,
  fontScale: 'medium',
  colorBlindMode: 'off',
  reducedMotion: false,
  screenReaderMode: false,
  focusIndicators: true,
  screenShake: true,
  animations: true,
  cardPlaySpeed: 'normal',
};

let _a11ySettings: A11ySettings | null = null;
let _a11yListeners: Array<(s: A11ySettings) => void> = [];

function detectReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function getA11ySettings(): A11ySettings {
  if (_a11ySettings) return _a11ySettings;
  try {
    const raw = localStorage.getItem(A11Y_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      _a11ySettings = { ...A11Y_DEFAULTS, ...parsed };
    } else {
      // First load: detect system preferences
      _a11ySettings = {
        ...A11Y_DEFAULTS,
        reducedMotion: detectReducedMotion(),
      };
    }
  } catch {
    _a11ySettings = { ...A11Y_DEFAULTS };
  }
  return _a11ySettings!;
}

export function setA11ySettings(patch: Partial<A11ySettings>): A11ySettings {
  const current = getA11ySettings();
  _a11ySettings = { ...current, ...patch };
  try {
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(_a11ySettings));
  } catch { /* quota */ }
  applyA11yToDOM(_a11ySettings);
  _a11yListeners.forEach(fn => fn(_a11ySettings!));
  return _a11ySettings;
}

export function subscribeA11y(fn: (s: A11ySettings) => void): () => void {
  _a11yListeners.push(fn);
  return () => { _a11yListeners = _a11yListeners.filter(l => l !== fn); };
}

// ──── Apply A11y Settings to DOM ─────────────────────────────

const COLORBLIND_FILTERS: Record<string, string> = {
  protanopia: 'url(#protanopia-filter)',
  deuteranopia: 'url(#deuteranopia-filter)',
  tritanopia: 'url(#tritanopia-filter)',
};

export function applyA11yToDOM(s: A11ySettings): void {
  const root = document.documentElement;

  // High contrast
  root.classList.toggle('high-contrast', s.highContrast);

  // Large text / font scale
  root.classList.toggle('a11y-large-text', s.largeText);
  root.dataset.textSize = s.fontScale;
  if (s.fontScale === 'xl') {
    root.style.setProperty('--font-scale', '1.35');
  } else if (s.fontScale === 'large' || s.largeText) {
    root.style.setProperty('--font-scale', '1.25');
  } else if (s.fontScale === 'small') {
    root.style.setProperty('--font-scale', '0.85');
  } else {
    root.style.setProperty('--font-scale', '1');
  }

  // Color blind mode
  root.classList.remove('colorblind-mode', 'colorblind-protanopia', 'colorblind-deuteranopia', 'colorblind-tritanopia');
  if (s.colorBlindMode !== 'off') {
    root.classList.add('colorblind-mode', `colorblind-${s.colorBlindMode}`);
    root.style.setProperty('--colorblind-filter', COLORBLIND_FILTERS[s.colorBlindMode] || 'none');
  } else {
    root.style.removeProperty('--colorblind-filter');
  }
  // Inject SVG filters if not present
  ensureColorBlindSVGFilters();

  // Reduced motion
  root.classList.toggle('force-reduce-motion', s.reducedMotion || !s.animations);

  // Screen reader mode — adds extra context
  root.classList.toggle('sr-mode', s.screenReaderMode);

  // Focus indicators
  root.classList.toggle('a11y-focus-indicators', s.focusIndicators);

  // Screen shake
  root.classList.toggle('no-screen-shake', !s.screenShake);

  // Card play speed
  const speedMap: Record<CardPlaySpeed, string> = { fast: '0.5', normal: '1', slow: '1.8' };
  root.style.setProperty('--card-play-speed', speedMap[s.cardPlaySpeed] || '1');
}

let _svgInjected = false;
function ensureColorBlindSVGFilters(): void {
  if (_svgInjected || typeof document === 'undefined') return;
  _svgInjected = true;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('style', 'position:absolute;width:0;height:0;');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <defs>
      <filter id="protanopia-filter">
        <feColorMatrix type="matrix" values="
          0.567, 0.433, 0,     0, 0
          0.558, 0.442, 0,     0, 0
          0,     0.242, 0.758, 0, 0
          0,     0,     0,     1, 0"/>
      </filter>
      <filter id="deuteranopia-filter">
        <feColorMatrix type="matrix" values="
          0.625, 0.375, 0,   0, 0
          0.7,   0.3,   0,   0, 0
          0,     0.3,   0.7, 0, 0
          0,     0,     0,   1, 0"/>
      </filter>
      <filter id="tritanopia-filter">
        <feColorMatrix type="matrix" values="
          0.95, 0.05,  0,     0, 0
          0,    0.433, 0.567, 0, 0
          0,    0.475, 0.525, 0, 0
          0,    0,     0,     1, 0"/>
      </filter>
    </defs>`;
  document.body.appendChild(svg);
}

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
  el.textContent = '';
  requestAnimationFrame(() => {
    el.textContent = message;
  });
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
    import('./sound').then(m => m.sfx.a11yFocusChange()).catch(() => {});
  };

  return handler;
}

// ──── Keyboard Navigation Map ────────────────────────────────

export interface KeyboardShortcut {
  key: string;
  description: string;
  screen?: string;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Global
  { key: 'Escape', description: 'Close modal / Go back', screen: 'Global' },
  { key: 'Enter', description: 'Confirm / Activate', screen: 'Global' },
  { key: 'Tab', description: 'Navigate to next element', screen: 'Global' },
  { key: 'Shift+Tab', description: 'Navigate to previous element', screen: 'Global' },
  { key: 'Space', description: 'Activate / Select', screen: 'Global' },
  { key: '?', description: 'Open keyboard shortcuts help', screen: 'Global' },
  { key: 'M', description: 'Toggle mute', screen: 'Global' },
  { key: 'S', description: 'Open settings', screen: 'Global' },
  // Game screens
  { key: '1-9', description: 'Select card by position', screen: 'Production' },
  { key: '← →', description: 'Navigate between cards', screen: 'Card Selection' },
  { key: '↑ ↓', description: 'Scroll through options', screen: 'Menus' },
  { key: 'E', description: 'End turn', screen: 'Production' },
  { key: 'D', description: 'Draw card', screen: 'Production' },
];

// ──── Global Keyboard Listener Setup ─────────────────────────

let _globalKeyboardCleanup: (() => void) | null = null;

export function setupGlobalKeyboardListeners(callbacks: {
  onOpenSettings?: () => void;
  onOpenKeyboardHelp?: () => void;
  onToggleMute?: () => void;
}): () => void {
  if (_globalKeyboardCleanup) _globalKeyboardCleanup();

  const handler = (e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      callbacks.onOpenKeyboardHelp?.();
    } else if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      // Only on start screen or when no modal is open
      callbacks.onOpenSettings?.();
    } else if (e.key === 'm' && !e.ctrlKey && !e.metaKey) {
      callbacks.onToggleMute?.();
    }
  };

  document.addEventListener('keydown', handler);
  _globalKeyboardCleanup = () => document.removeEventListener('keydown', handler);
  return _globalKeyboardCleanup;
}

// ──── Initialize on import ───────────────────────────────────

applyA11yToDOM(getA11ySettings());

// Listen for system reduced-motion changes
if (typeof window !== 'undefined' && window.matchMedia) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  try {
    mq.addEventListener('change', (e) => {
      const current = getA11ySettings();
      // Only auto-update if user hasn't manually set it
      if (!localStorage.getItem(A11Y_STORAGE_KEY)) {
        setA11ySettings({ reducedMotion: e.matches });
      }
      void current;
    });
  } catch { /* old browsers */ }
}
