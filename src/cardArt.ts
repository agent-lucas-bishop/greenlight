// R264: Deterministic Card Art Generator (Pure CSS)
// Generates unique visual backgrounds from card name + role + rarity as seed

import { mulberry32, hashString } from './seededRng';
import type { TalentType } from './types';
import type { CollectionCardRarity } from './cardCollection';

export interface CardArtStyle {
  background: string;
  backgroundSize?: string;
  backgroundBlendMode?: string;
  clipPath?: string;
  /** Extra overlay div CSS for decorative shapes */
  overlayBackground?: string;
  overlayClipPath?: string;
  overlayOpacity?: number;
  overlayMixBlendMode?: string;
}

// ─── Color Palettes by Role ───

const DIRECTOR_HUES = [210, 240, 260, 280, 320]; // cool blues, purples
const LEAD_HUES = [10, 25, 35, 45, 350]; // warm reds, oranges, golds
const SUPPORT_HUES = [170, 190, 200, 220, 160]; // cool teals, cyans
const CREW_HUES = [80, 100, 120, 140, 60]; // greens, olives, technical

function getRoleHues(role: TalentType): number[] {
  switch (role) {
    case 'Director': return DIRECTOR_HUES;
    case 'Lead': return LEAD_HUES;
    case 'Support': return SUPPORT_HUES;
    case 'Crew': return CREW_HUES;
    default: return LEAD_HUES;
  }
}

// Rarity controls saturation and vibrancy
function rarityParams(rarity: CollectionCardRarity): { sat: number; lit: number; layers: number; complexity: number } {
  switch (rarity) {
    case 'common': return { sat: 25, lit: 18, layers: 2, complexity: 1 };
    case 'rare': return { sat: 45, lit: 22, layers: 3, complexity: 2 };
    case 'epic': return { sat: 65, lit: 26, layers: 4, complexity: 3 };
    case 'legendary': return { sat: 80, lit: 30, layers: 5, complexity: 4 };
    default: return { sat: 25, lit: 18, layers: 2, complexity: 1 };
  }
}

function hsl(h: number, s: number, l: number, a = 1): string {
  return a < 1 ? `hsla(${h}, ${s}%, ${l}%, ${a})` : `hsl(${h}, ${s}%, ${l}%)`;
}

// ─── Pattern Generators by Role ───

function directorPatterns(rng: () => number, hue: number, sat: number, lit: number): string[] {
  // Geometric / angular patterns
  const patterns: string[] = [];
  const angle = Math.floor(rng() * 360);
  const angle2 = (angle + 60 + Math.floor(rng() * 60)) % 360;

  // Sharp linear gradients for angular look
  patterns.push(
    `linear-gradient(${angle}deg, ${hsl(hue, sat, lit)} 0%, ${hsl(hue, sat, lit + 8)} 25%, transparent 25.5%, transparent 50%, ${hsl(hue, sat, lit)} 50%, ${hsl(hue, sat, lit + 8)} 75%, transparent 75.5%)`
  );
  // Diamond/grid pattern
  patterns.push(
    `repeating-linear-gradient(${angle2}deg, transparent, transparent 12px, ${hsl(hue, sat + 10, lit + 5, 0.15)} 12px, ${hsl(hue, sat + 10, lit + 5, 0.15)} 14px)`
  );
  // Conic for geometric starburst
  if (rng() > 0.4) {
    const cx = 30 + Math.floor(rng() * 40);
    const cy = 30 + Math.floor(rng() * 40);
    patterns.push(
      `conic-gradient(from ${angle}deg at ${cx}% ${cy}%, ${hsl(hue, sat, lit + 10, 0.3)} 0deg, transparent 30deg, ${hsl(hue, sat, lit + 15, 0.2)} 60deg, transparent 90deg, ${hsl(hue, sat, lit + 10, 0.3)} 120deg, transparent 150deg, ${hsl(hue, sat, lit + 15, 0.2)} 180deg, transparent 210deg, ${hsl(hue, sat, lit + 10, 0.3)} 240deg, transparent 270deg, ${hsl(hue, sat, lit + 15, 0.2)} 300deg, transparent 330deg, ${hsl(hue, sat, lit + 10, 0.3)} 360deg)`
    );
  }
  return patterns;
}

function leadPatterns(rng: () => number, hue: number, sat: number, lit: number): string[] {
  // Warm, flowing gradients
  const patterns: string[] = [];
  const hue2 = (hue + 20 + Math.floor(rng() * 30)) % 360;

  // Flowing radial gradients
  const cx1 = Math.floor(rng() * 80) + 10;
  const cy1 = Math.floor(rng() * 80) + 10;
  patterns.push(
    `radial-gradient(ellipse at ${cx1}% ${cy1}%, ${hsl(hue, sat + 15, lit + 15, 0.6)} 0%, ${hsl(hue2, sat, lit, 0.2)} 50%, transparent 70%)`
  );
  // Second flowing blob
  const cx2 = Math.floor(rng() * 80) + 10;
  const cy2 = Math.floor(rng() * 80) + 10;
  patterns.push(
    `radial-gradient(ellipse at ${cx2}% ${cy2}%, ${hsl(hue2, sat + 10, lit + 20, 0.5)} 0%, transparent 60%)`
  );
  // Wave pattern
  if (rng() > 0.3) {
    const waveAngle = Math.floor(rng() * 180);
    patterns.push(
      `repeating-linear-gradient(${waveAngle}deg, transparent, transparent 8px, ${hsl(hue, sat, lit + 10, 0.1)} 8px, ${hsl(hue, sat, lit + 10, 0.1)} 10px)`
    );
  }
  return patterns;
}

function supportPatterns(rng: () => number, hue: number, sat: number, lit: number): string[] {
  // Cool, subtle textures — dots and fine patterns
  const patterns: string[] = [];

  // Dot pattern
  const dotSize = 2 + Math.floor(rng() * 3);
  const dotSpacing = 12 + Math.floor(rng() * 16);
  patterns.push(
    `radial-gradient(circle ${dotSize}px at ${dotSpacing / 2}px ${dotSpacing / 2}px, ${hsl(hue, sat, lit + 15, 0.25)} 100%, transparent 100%)`
  );
  // Soft radial background
  patterns.push(
    `radial-gradient(ellipse at 50% 50%, ${hsl(hue, sat - 5, lit + 5, 0.4)} 0%, ${hsl(hue, sat - 10, lit - 5)} 100%)`
  );
  // Fine stripes
  if (rng() > 0.4) {
    const angle = Math.floor(rng() * 180);
    patterns.push(
      `repeating-linear-gradient(${angle}deg, transparent, transparent 4px, ${hsl(hue, sat, lit + 8, 0.08)} 4px, ${hsl(hue, sat, lit + 8, 0.08)} 5px)`
    );
  }
  return patterns;
}

function crewPatterns(rng: () => number, hue: number, sat: number, lit: number): string[] {
  // Technical / grid patterns
  const patterns: string[] = [];
  const gridSize = 16 + Math.floor(rng() * 24);

  // Grid
  patterns.push(
    `repeating-linear-gradient(0deg, transparent, transparent ${gridSize - 1}px, ${hsl(hue, sat, lit + 12, 0.15)} ${gridSize - 1}px, ${hsl(hue, sat, lit + 12, 0.15)} ${gridSize}px)`
  );
  patterns.push(
    `repeating-linear-gradient(90deg, transparent, transparent ${gridSize - 1}px, ${hsl(hue, sat, lit + 12, 0.15)} ${gridSize - 1}px, ${hsl(hue, sat, lit + 12, 0.15)} ${gridSize}px)`
  );
  // Technical circuit-like accent
  if (rng() > 0.3) {
    const cx = Math.floor(rng() * 60) + 20;
    const cy = Math.floor(rng() * 60) + 20;
    patterns.push(
      `radial-gradient(circle at ${cx}% ${cy}%, ${hsl(hue, sat + 20, lit + 20, 0.3)} 0%, transparent 40%)`
    );
  }
  return patterns;
}

// ─── Clip Paths for geometric shapes (Directors and Epic+) ───

const CLIP_PATHS = [
  'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', // hexagon
  'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)', // star
  'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)', // hexagon alt
  'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', // diamond
];

// ─── Main Generator ───

export function generateCardArt(name: string, role: TalentType, rarity: CollectionCardRarity): CardArtStyle {
  const seed = hashString(`cardart:${name}:${role}:${rarity}`);
  const rng = mulberry32(seed);

  const hues = getRoleHues(role);
  const primaryHue = hues[Math.floor(rng() * hues.length)];
  const { sat, lit, layers, complexity } = rarityParams(rarity);

  // Generate role-specific patterns
  let patterns: string[];
  switch (role) {
    case 'Director': patterns = directorPatterns(rng, primaryHue, sat, lit); break;
    case 'Lead': patterns = leadPatterns(rng, primaryHue, sat, lit); break;
    case 'Support': patterns = supportPatterns(rng, primaryHue, sat, lit); break;
    case 'Crew': patterns = crewPatterns(rng, primaryHue, sat, lit); break;
    default: patterns = leadPatterns(rng, primaryHue, sat, lit);
  }

  // Base gradient always present
  const baseGrad = `linear-gradient(${Math.floor(rng() * 360)}deg, ${hsl(primaryHue, sat, lit - 5)} 0%, ${hsl(primaryHue, sat - 10, lit + 5)} 100%)`;

  // Trim to allowed layer count
  const usedPatterns = patterns.slice(0, layers);
  const allLayers = [...usedPatterns, baseGrad];

  const style: CardArtStyle = {
    background: allLayers.join(', '),
  };

  // Background sizes for dot patterns (Support role)
  if (role === 'Support') {
    const dotSpacing = 12 + Math.floor(mulberry32(seed + 1)() * 16);
    style.backgroundSize = [`${dotSpacing}px ${dotSpacing}px`, ...Array(allLayers.length - 1).fill('100% 100%')].join(', ');
  }

  // Blend mode for complex cards
  if (complexity >= 2) {
    style.backgroundBlendMode = allLayers.map((_, i) => i === allLayers.length - 1 ? 'normal' : (rng() > 0.5 ? 'overlay' : 'soft-light')).join(', ');
  }

  // Overlay shape for Directors and epic+ cards
  if ((role === 'Director' || complexity >= 3) && rng() > 0.3) {
    const overlayHue = (primaryHue + 30 + Math.floor(rng() * 60)) % 360;
    style.overlayBackground = `radial-gradient(circle at 50% 50%, ${hsl(overlayHue, sat + 10, lit + 25, 0.2)} 0%, transparent 60%)`;
    if (role === 'Director') {
      style.overlayClipPath = CLIP_PATHS[Math.floor(rng() * CLIP_PATHS.length)];
    }
    style.overlayOpacity = 0.4 + rng() * 0.3;
    style.overlayMixBlendMode = 'screen';
  }

  return style;
}

// ─── Foil Shimmer CSS (animated) ───

export const FOIL_SHIMMER_CSS = `
@keyframes foilShimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.foil-shimmer-overlay {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(
    105deg,
    transparent 20%,
    rgba(255, 255, 255, 0.08) 30%,
    rgba(255, 255, 255, 0.25) 38%,
    rgba(255, 200, 100, 0.15) 42%,
    rgba(255, 255, 255, 0.08) 50%,
    transparent 60%
  );
  background-size: 200% 100%;
  animation: foilShimmer 3s ease-in-out infinite;
  mix-blend-mode: overlay;
  z-index: 2;
}
`;
