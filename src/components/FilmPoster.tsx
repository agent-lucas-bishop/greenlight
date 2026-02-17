/**
 * R309: Procedural Film Poster Generator
 * Generates unique SVG movie posters based on film data.
 */

import type { Genre, RewardTier } from '../types';

interface FilmPosterProps {
  title: string;
  genre: Genre;
  tier: RewardTier;
  quality: number;
  boxOffice: number;
  season: number;
  nominated?: boolean;
  seed?: number;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

// ── Genre Configurations ──

const GENRE_CONFIG: Record<Genre, {
  colors: [string, string, string]; // primary, secondary, accent
  icon: string; // SVG path data for genre icon
  iconViewBox: string;
}> = {
  'Horror': {
    colors: ['#1a0a0a', '#8b0000', '#ff4444'],
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
    iconViewBox: '0 0 24 24',
  },
  'Action': {
    colors: ['#0a0a1a', '#ff6600', '#ffd700'],
    icon: 'M12 2L2 12l3 3 7-7 7 7 3-3L12 2zM5 19h14v2H5z',
    iconViewBox: '0 0 24 24',
  },
  'Comedy': {
    colors: ['#1a1a0a', '#ffa500', '#ffff44'],
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-4-6c.78 2.34 2.72 4 5 4s4.22-1.66 5-4H8zm1-4c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm6 0c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1z',
    iconViewBox: '0 0 24 24',
  },
  'Drama': {
    colors: ['#0a0a14', '#4a6fa5', '#c0c0c0'],
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM8 9.5C8 8.67 8.67 8 9.5 8s1.5.67 1.5 1.5S10.33 11 9.5 11 8 10.33 8 9.5zm8 5.5H8c0-2.21 1.79-4 4-4s4 1.79 4 4zm-2.5-5.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5z',
    iconViewBox: '0 0 24 24',
  },
  'Sci-Fi': {
    colors: ['#050520', '#0066ff', '#00ffff'],
    icon: 'M12 2L1 12h3v9h6v-6h4v6h6v-9h3L12 2zm0 2.84L19 12h-1.5v7H15v-6H9v6H6.5v-7H5l7-7.16z',
    iconViewBox: '0 0 24 24',
  },
  'Romance': {
    colors: ['#1a0a14', '#cc3366', '#ff88aa'],
    icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    iconViewBox: '0 0 24 24',
  },
  'Thriller': {
    colors: ['#0a0a0a', '#444444', '#aaaaaa'],
    icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z',
    iconViewBox: '0 0 24 24',
  },
};

const TIER_BORDER: Record<RewardTier, { color: string; width: number; style: string }> = {
  'BLOCKBUSTER': { color: '#ffd700', width: 4, style: 'double' },
  'SMASH': { color: '#ff8c00', width: 3, style: 'solid' },
  'HIT': { color: '#666666', width: 2, style: 'solid' },
  'FLOP': { color: '#444444', width: 1, style: 'dashed' },
};

// ── Seeded random for layout variations ──

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function starPath(cx: number, cy: number, r: number): string {
  const points: string[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i * 72 - 90) * Math.PI / 180;
    const innerAngle = ((i * 72) + 36 - 90) * Math.PI / 180;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    points.push(`${cx + r * 0.4 * Math.cos(innerAngle)},${cy + r * 0.4 * Math.sin(innerAngle)}`);
  }
  return `M${points.join('L')}Z`;
}

// ── Quality to stars ──

function qualityToStars(quality: number): number {
  if (quality >= 35) return 5;
  if (quality >= 25) return 4;
  if (quality >= 15) return 3;
  if (quality >= 8) return 2;
  if (quality > 0) return 1;
  return 0;
}

// ── Component ──

export default function FilmPoster({ title, genre, tier, quality, boxOffice, season, nominated, seed = 0, size = 'medium', onClick }: FilmPosterProps) {
  const config = GENRE_CONFIG[genre] || GENRE_CONFIG['Drama'];
  const border = TIER_BORDER[tier];
  const rng = seededRng(seed || (title.length * 7 + season * 31));
  const stars = qualityToStars(quality);

  // Dimensions based on size
  const dims = size === 'small' ? { w: 120, h: 170 } : size === 'large' ? { w: 240, h: 340 } : { w: 180, h: 255 };

  // Layout variations from seed
  const titleY = 0.55 + rng() * 0.1; // 55-65% down
  const iconScale = 0.6 + rng() * 0.4; // 60-100% scale
  const iconRotation = (rng() - 0.5) * 20; // -10 to +10 degrees
  const gradientAngle = Math.floor(rng() * 360);
  const accentOpacity = 0.15 + rng() * 0.25;

  // Decorative elements based on seed
  const numLines = Math.floor(rng() * 4) + 1;
  const linePositions = Array.from({ length: numLines }, () => ({
    y: 0.1 + rng() * 0.3,
    opacity: 0.05 + rng() * 0.15,
  }));

  // Box office prominence affects glow
  const boGlow = Math.min(1, boxOffice / 50);

  const svgW = dims.w;
  const svgH = dims.h;
  const fontSize = size === 'small' ? 10 : size === 'large' ? 18 : 13;
  const subFontSize = size === 'small' ? 6 : size === 'large' ? 11 : 8;

  // Wrap title into lines
  const maxCharsPerLine = size === 'small' ? 14 : size === 'large' ? 22 : 18;
  const words = title.split(' ');
  const titleLines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxCharsPerLine) {
      if (currentLine) titleLines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = (currentLine + ' ' + word).trim();
    }
  }
  if (currentLine) titleLines.push(currentLine);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-block',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        borderRadius: 6,
        overflow: 'hidden',
        border: `${border.width}px ${border.style} ${border.color}`,
        boxShadow: tier === 'BLOCKBUSTER'
          ? `0 0 ${12 + boGlow * 8}px rgba(255,215,0,${0.3 + boGlow * 0.2})`
          : `0 2px 8px rgba(0,0,0,0.5)`,
      }}
      className="film-poster"
    >
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id={`bg-${seed}`} x1="0%" y1="0%" x2="100%" y2="100%"
            gradientTransform={`rotate(${gradientAngle}, 0.5, 0.5)`}>
            <stop offset="0%" stopColor={config.colors[0]} />
            <stop offset="60%" stopColor={config.colors[1]} stopOpacity={0.3} />
            <stop offset="100%" stopColor={config.colors[0]} />
          </linearGradient>
          <radialGradient id={`glow-${seed}`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={config.colors[2]} stopOpacity={accentOpacity} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id={`shadow-${seed}`}>
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="black" floodOpacity="0.7" />
          </filter>
        </defs>

        {/* Background */}
        <rect width={svgW} height={svgH} fill={`url(#bg-${seed})`} />
        <rect width={svgW} height={svgH} fill={`url(#glow-${seed})`} />

        {/* Decorative lines */}
        {linePositions.map((line, i) => (
          <line
            key={i}
            x1={0}
            y1={line.y * svgH}
            x2={svgW}
            y2={line.y * svgH}
            stroke={config.colors[2]}
            strokeOpacity={line.opacity}
            strokeWidth={1}
          />
        ))}

        {/* Genre icon (centered, upper portion) */}
        <g transform={`translate(${svgW / 2}, ${svgH * 0.28}) scale(${iconScale * (size === 'small' ? 0.8 : size === 'large' ? 1.8 : 1.2)}) rotate(${iconRotation})`}>
          <g transform="translate(-12, -12)" opacity={0.25}>
            <path d={config.icon} fill={config.colors[2]} />
          </g>
        </g>

        {/* Film title */}
        {titleLines.map((line, i) => (
          <text
            key={i}
            x={svgW / 2}
            y={svgH * titleY + i * (fontSize + 3)}
            textAnchor="middle"
            fill="white"
            fontSize={fontSize}
            fontFamily="'Bebas Neue', Impact, sans-serif"
            letterSpacing={1.5}
            filter={`url(#shadow-${seed})`}
          >
            {line.toUpperCase()}
          </text>
        ))}

        {/* Genre label */}
        <text
          x={svgW / 2}
          y={svgH * titleY + titleLines.length * (fontSize + 3) + 4}
          textAnchor="middle"
          fill={config.colors[2]}
          fontSize={subFontSize}
          fontFamily="'Bebas Neue', Impact, sans-serif"
          letterSpacing={2}
          opacity={0.8}
        >
          {genre.toUpperCase()}
        </text>

        {/* Star rating */}
        {stars > 0 && (
          <g transform={`translate(${svgW / 2 - stars * (size === 'small' ? 5 : 7)}, ${svgH * 0.82})`}>
            {Array.from({ length: stars }, (_, i) => {
              const starSize = size === 'small' ? 4 : size === 'large' ? 8 : 6;
              const spacing = size === 'small' ? 10 : 14;
              return (
                <path
                  key={i}
                  d={starPath(i * spacing + starSize, 0, starSize)}
                  fill="#ffd700"
                  opacity={0.9}
                />
              );
            })}
          </g>
        )}

        {/* Box office */}
        <text
          x={svgW / 2}
          y={svgH * 0.92}
          textAnchor="middle"
          fill="white"
          fontSize={subFontSize}
          fontFamily="'Bebas Neue', Impact, sans-serif"
          letterSpacing={1}
          opacity={0.6}
        >
          ${boxOffice.toFixed(1)}M
        </text>

        {/* Nomination laurel */}
        {nominated && (
          <g transform={`translate(${svgW - (size === 'small' ? 16 : 24)}, 6)`}>
            <circle
              cx={size === 'small' ? 8 : 12}
              cy={size === 'small' ? 8 : 12}
              r={size === 'small' ? 7 : 10}
              fill="rgba(255,215,0,0.2)"
              stroke="#ffd700"
              strokeWidth={1}
            />
            <text
              x={size === 'small' ? 8 : 12}
              y={size === 'small' ? 11 : 16}
              textAnchor="middle"
              fontSize={size === 'small' ? 8 : 12}
            >
              🏆
            </text>
          </g>
        )}

        {/* Season badge */}
        <text
          x={8}
          y={size === 'small' ? 12 : 16}
          fill={config.colors[2]}
          fontSize={subFontSize}
          fontFamily="'Bebas Neue', Impact, sans-serif"
          letterSpacing={1}
          opacity={0.5}
        >
          S{season}
        </text>

        {/* Tier indicator stripe at bottom */}
        <rect
          x={0}
          y={svgH - 3}
          width={svgW}
          height={3}
          fill={border.color}
          opacity={0.7}
        />
      </svg>
    </div>
  );
}

export { GENRE_CONFIG, qualityToStars };
