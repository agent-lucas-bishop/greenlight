/**
 * R250: Visual Effects & Juice System
 * Pure CSS animations + lightweight JS helpers for visual polish.
 * All effects respect prefers-reduced-motion and the force-reduce-motion setting.
 */

import { getSettings } from './settings';

// ──── Motion Check ───────────────────────────────────────────

function isMotionReduced(): boolean {
  if (getSettings().visual.reduceMotion) return true;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  return false;
}

// ──── Confetti Burst (run completion) ────────────────────────

/**
 * Spawn a CSS confetti burst overlay. Auto-removes after duration.
 * @param color 'gold' | 'rainbow' | 'red'
 * @param count number of particles (default 50)
 */
export function spawnConfetti(color: 'gold' | 'rainbow' | 'red' = 'gold', count = 50): void {
  if (isMotionReduced()) return;
  const container = document.createElement('div');
  container.className = 'vfx-confetti-burst';
  container.setAttribute('aria-hidden', 'true');

  const palettes: Record<string, string[]> = {
    gold: ['#ffd700', '#f0c75e', '#d4a843', '#e8b84b', '#fff3c4'],
    rainbow: ['#e74c3c', '#f39c12', '#2ecc71', '#3498db', '#9b59b6', '#e91e63', '#ffd700'],
    red: ['#e74c3c', '#c0392b', '#ff6b6b', '#d35400', '#e67e22'],
  };
  const pal = palettes[color] || palettes.gold;

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('span');
    piece.className = 'vfx-confetti-piece';
    const x = Math.random() * 100;
    const drift = (Math.random() - 0.5) * 200;
    const dur = 1.5 + Math.random() * 2;
    const delay = Math.random() * 0.5;
    const size = 4 + Math.random() * 8;
    const rot = Math.random() * 720;
    piece.style.cssText = `
      left: ${x}%;
      width: ${size}px;
      height: ${size * (0.4 + Math.random() * 0.6)}px;
      background: ${pal[Math.floor(Math.random() * pal.length)]};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      --vfx-drift: ${drift}px;
      --vfx-rot: ${rot}deg;
      animation-duration: ${dur}s;
      animation-delay: ${delay}s;
    `;
    container.appendChild(piece);
  }

  document.body.appendChild(container);
  setTimeout(() => container.remove(), 4000);
}

// ──── Sparkle Effect (legendary card) ────────────────────────

/**
 * Add sparkle particles around an element temporarily.
 */
export function spawnSparkles(element: HTMLElement, count = 12, durationMs = 1500): void {
  if (isMotionReduced()) return;
  const rect = element.getBoundingClientRect();
  const container = document.createElement('div');
  container.className = 'vfx-sparkle-container';
  container.setAttribute('aria-hidden', 'true');
  container.style.cssText = `
    position: fixed;
    left: ${rect.left}px;
    top: ${rect.top}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    pointer-events: none;
    z-index: 100;
  `;

  for (let i = 0; i < count; i++) {
    const spark = document.createElement('span');
    spark.className = 'vfx-sparkle';
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const size = 6 + Math.random() * 10;
    const delay = Math.random() * 0.6;
    spark.style.cssText = `
      left: ${x}%;
      top: ${y}%;
      width: ${size}px;
      height: ${size}px;
      animation-delay: ${delay}s;
    `;
    spark.textContent = '✦';
    container.appendChild(spark);
  }

  document.body.appendChild(container);
  setTimeout(() => container.remove(), durationMs + 600);
}

// ──── Screen Shake ───────────────────────────────────────────

/**
 * Apply screen shake to body. Intensity: 'light' | 'medium' | 'heavy'
 */
export function screenShake(intensity: 'light' | 'medium' | 'heavy' = 'medium'): void {
  if (isMotionReduced()) return;
  const main = document.getElementById('main-content');
  if (!main) return;
  const cls = `vfx-shake-${intensity}`;
  main.classList.remove(cls);
  // Force reflow
  void main.offsetWidth;
  main.classList.add(cls);
  const dur = intensity === 'heavy' ? 600 : intensity === 'medium' ? 400 : 250;
  setTimeout(() => main.classList.remove(cls), dur);
}

// ──── Vignette Overlay (tense moments) ──────────────────────

let vignetteEl: HTMLDivElement | null = null;

export function showTenseVignette(level: 'mild' | 'intense' = 'mild'): void {
  if (isMotionReduced()) return;
  if (!vignetteEl) {
    vignetteEl = document.createElement('div');
    vignetteEl.className = 'vfx-tense-vignette';
    vignetteEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(vignetteEl);
  }
  vignetteEl.classList.remove('vfx-vignette-mild', 'vfx-vignette-intense');
  vignetteEl.classList.add(`vfx-vignette-${level}`, 'vfx-vignette-active');
}

export function hideTenseVignette(): void {
  if (vignetteEl) {
    vignetteEl.classList.remove('vfx-vignette-active');
  }
}

// ──── 3D Card Tilt (mousemove-driven) ────────────────────────

/**
 * Attach 3D tilt effect to a card element. Returns cleanup function.
 */
export function attachCardTilt(el: HTMLElement): () => void {
  if (isMotionReduced()) return () => {};

  const handleMove = (e: MouseEvent) => {
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotX = (0.5 - y) * 12;  // ±6 degrees
    const rotY = (x - 0.5) * 12;
    const shine = x * 100;
    el.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px) scale(1.02)`;
    el.style.setProperty('--tilt-shine', `${shine}%`);
  };

  const handleLeave = () => {
    el.style.transform = '';
    el.style.removeProperty('--tilt-shine');
  };

  el.addEventListener('mousemove', handleMove);
  el.addEventListener('mouseleave', handleLeave);

  return () => {
    el.removeEventListener('mousemove', handleMove);
    el.removeEventListener('mouseleave', handleLeave);
    handleLeave();
  };
}

// ──── Animated Number Counter ────────────────────────────────

/**
 * Animate a number from `from` to `to`, calling onUpdate each frame.
 * Returns a cancel function.
 */
export function animateNumber(
  from: number,
  to: number,
  durationMs: number,
  onUpdate: (value: number) => void,
  onComplete?: () => void,
): () => void {
  if (isMotionReduced()) {
    onUpdate(to);
    onComplete?.();
    return () => {};
  }

  let cancelled = false;
  const start = performance.now();

  function tick(now: number) {
    if (cancelled) return;
    const elapsed = now - start;
    const progress = Math.min(elapsed / durationMs, 1);
    // Ease-out quartic
    const eased = 1 - Math.pow(1 - progress, 4);
    const current = from + (to - from) * eased;
    onUpdate(current);
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      onComplete?.();
    }
  }

  requestAnimationFrame(tick);
  return () => { cancelled = true; };
}

// ──── Card Play Animation Helper ─────────────────────────────

/**
 * Add card-play animation class to an element. Returns cleanup.
 */
export function playCardAnimation(el: HTMLElement): void {
  if (isMotionReduced()) return;
  el.classList.add('vfx-card-play');
  setTimeout(() => el.classList.remove('vfx-card-play'), 600);
}
