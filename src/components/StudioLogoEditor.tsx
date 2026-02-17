import { useState } from 'react';
import {
  LOGO_SHAPES, LOGO_COLORS, ACCENT_STYLES,
  getStudioLogoConfig, saveStudioLogoConfig,
  type LogoShape, type AccentStyle, type StudioLogoConfig,
} from '../studioLegacy';

const SHAPE_LABELS: Record<LogoShape, string> = {
  shield: '🛡️ Shield',
  circle: '⭕ Circle',
  diamond: '💎 Diamond',
  star: '⭐ Star',
  hexagon: '⬡ Hexagon',
  filmReel: '🎞️ Film Reel',
  camera: '📷 Camera',
  clapperboard: '🎬 Clapperboard',
  spotlight: '🔦 Spotlight',
  megaphone: '📣 Megaphone',
  ticket: '🎫 Ticket',
  projector: '📽️ Projector',
};

function LogoSVG({ config, size = 80 }: { config: StudioLogoConfig; size?: number }) {
  const { shape, color, accent } = config;
  const half = size / 2;

  const getFilter = () => {
    if (accent === 'glow') return `drop-shadow(0 0 ${size * 0.08}px ${color})`;
    return 'none';
  };

  const getFill = () => {
    if (accent === 'outline') return 'none';
    if (accent === 'gradient') return `url(#grad_${shape})`;
    return color;
  };

  const getStroke = () => {
    if (accent === 'outline') return color;
    return 'none';
  };

  const getStrokeWidth = () => accent === 'outline' ? 2.5 : 0;

  const shapePath = () => {
    switch (shape) {
      case 'shield':
        return <path d={`M${half} ${size * 0.08} L${size * 0.88} ${size * 0.3} L${size * 0.88} ${size * 0.58} Q${size * 0.88} ${size * 0.85} ${half} ${size * 0.95} Q${size * 0.12} ${size * 0.85} ${size * 0.12} ${size * 0.58} L${size * 0.12} ${size * 0.3} Z`} />;
      case 'circle':
        return <circle cx={half} cy={half} r={half * 0.85} />;
      case 'diamond':
        return <polygon points={`${half},${size * 0.05} ${size * 0.95},${half} ${half},${size * 0.95} ${size * 0.05},${half}`} />;
      case 'star': {
        const pts: string[] = [];
        for (let i = 0; i < 5; i++) {
          const outerAngle = (Math.PI / 2) + (2 * Math.PI * i / 5);
          const innerAngle = outerAngle + Math.PI / 5;
          pts.push(`${half + half * 0.85 * Math.cos(-outerAngle)},${half - half * 0.85 * Math.sin(-outerAngle)}`);
          pts.push(`${half + half * 0.4 * Math.cos(-innerAngle)},${half - half * 0.4 * Math.sin(-innerAngle)}`);
        }
        return <polygon points={pts.join(' ')} />;
      }
      case 'hexagon': {
        const pts: string[] = [];
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          pts.push(`${half + half * 0.85 * Math.cos(angle)},${half + half * 0.85 * Math.sin(angle)}`);
        }
        return <polygon points={pts.join(' ')} />;
      }
      case 'filmReel':
        return (
          <g>
            <circle cx={half} cy={half} r={half * 0.85} />
            <circle cx={half} cy={half} r={half * 0.25} fill="#0a0a0a" />
            {[0, 60, 120, 180, 240, 300].map(deg => (
              <circle key={deg}
                cx={half + half * 0.55 * Math.cos(deg * Math.PI / 180)}
                cy={half + half * 0.55 * Math.sin(deg * Math.PI / 180)}
                r={half * 0.12} fill="#0a0a0a" />
            ))}
          </g>
        );
      case 'camera':
        return (
          <g>
            <rect x={size * 0.1} y={size * 0.3} width={size * 0.6} height={size * 0.5} rx={size * 0.04} />
            <polygon points={`${size * 0.7},${size * 0.38} ${size * 0.92},${size * 0.25} ${size * 0.92},${size * 0.75} ${size * 0.7},${size * 0.62}`} />
            <circle cx={size * 0.4} cy={size * 0.55} r={size * 0.12} fill="#0a0a0a" />
            <rect x={size * 0.2} y={size * 0.2} width={size * 0.15} height={size * 0.1} rx={size * 0.02} />
          </g>
        );
      case 'clapperboard':
        return (
          <g>
            <rect x={size * 0.12} y={size * 0.35} width={size * 0.76} height={size * 0.55} rx={size * 0.03} />
            <polygon points={`${size * 0.12},${size * 0.35} ${size * 0.88},${size * 0.35} ${size * 0.88},${size * 0.18} ${size * 0.12},${size * 0.18}`} />
            {[0.25, 0.42, 0.59, 0.76].map((x, i) => (
              <line key={i} x1={size * x} y1={size * 0.18} x2={size * (x - 0.08)} y2={size * 0.35} stroke="#0a0a0a" strokeWidth={size * 0.025} />
            ))}
          </g>
        );
      case 'spotlight':
        return (
          <g>
            <ellipse cx={half} cy={size * 0.2} rx={size * 0.15} ry={size * 0.12} />
            <polygon points={`${size * 0.3},${size * 0.28} ${size * 0.1},${size * 0.9} ${size * 0.9},${size * 0.9} ${size * 0.7},${size * 0.28}`} />
            <line x1={half} y1={size * 0.05} x2={half} y2={size * 0.1} stroke={getFill()} strokeWidth={size * 0.03} />
          </g>
        );
      case 'megaphone':
        return (
          <g>
            <polygon points={`${size * 0.15},${size * 0.4} ${size * 0.85},${size * 0.15} ${size * 0.85},${size * 0.75} ${size * 0.15},${size * 0.6}`} />
            <rect x={size * 0.08} y={size * 0.38} width={size * 0.1} height={size * 0.24} rx={size * 0.03} />
            <rect x={size * 0.18} y={size * 0.6} width={size * 0.06} height={size * 0.25} rx={size * 0.02} />
          </g>
        );
      case 'ticket':
        return (
          <g>
            <rect x={size * 0.08} y={size * 0.25} width={size * 0.84} height={size * 0.5} rx={size * 0.04} />
            <circle cx={size * 0.65} cy={size * 0.25} r={size * 0.06} fill="#0a0a0a" />
            <circle cx={size * 0.65} cy={size * 0.75} r={size * 0.06} fill="#0a0a0a" />
            <line x1={size * 0.65} y1={size * 0.31} x2={size * 0.65} y2={size * 0.69} stroke="#0a0a0a" strokeWidth={size * 0.015} strokeDasharray={`${size * 0.04} ${size * 0.03}`} />
          </g>
        );
      case 'projector':
        return (
          <g>
            <rect x={size * 0.2} y={size * 0.4} width={size * 0.6} height={size * 0.4} rx={size * 0.04} />
            <circle cx={size * 0.35} cy={size * 0.28} r={size * 0.15} />
            <circle cx={size * 0.35} cy={size * 0.28} r={size * 0.06} fill="#0a0a0a" />
            <circle cx={size * 0.62} cy={size * 0.32} r={size * 0.1} />
            <circle cx={size * 0.62} cy={size * 0.32} r={size * 0.04} fill="#0a0a0a" />
            <rect x={size * 0.78} y={size * 0.48} width={size * 0.15} height={size * 0.08} rx={size * 0.02} />
          </g>
        );
    }
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ filter: getFilter() }}>
      <defs>
        <linearGradient id={`grad_${shape}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={1} />
          <stop offset="100%" stopColor={color} stopOpacity={0.4} />
        </linearGradient>
      </defs>
      <g fill={getFill()} stroke={getStroke()} strokeWidth={getStrokeWidth()}>
        {shapePath()}
      </g>
    </svg>
  );
}

export { LogoSVG };

export default function StudioLogoEditor({ onClose }: { onClose?: () => void }) {
  const [config, setConfig] = useState<StudioLogoConfig>(getStudioLogoConfig);

  const update = (partial: Partial<StudioLogoConfig>) => {
    const newConfig = { ...config, ...partial };
    setConfig(newConfig);
    saveStudioLogoConfig(newConfig);
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: 'var(--gold)', margin: 0 }}>🎨 Studio Logo Editor</h3>
        {onClose && <button className="modal-close" onClick={onClose}>✕</button>}
      </div>

      {/* Preview */}
      <div style={{
        textAlign: 'center', padding: 24, marginBottom: 20,
        background: 'rgba(0,0,0,0.3)', border: '1px solid #333', borderRadius: 12,
      }}>
        <LogoSVG config={config} size={120} />
      </div>

      {/* Shape picker */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: '#999', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Shape</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {LOGO_SHAPES.map(s => (
            <button key={s} onClick={() => update({ shape: s })} className="btn btn-small" style={{
              color: config.shape === s ? 'var(--gold)' : '#888',
              borderColor: config.shape === s ? 'var(--gold)' : '#333',
              background: config.shape === s ? 'rgba(212,168,67,0.1)' : 'transparent',
              fontSize: '0.75rem',
            }}>
              {SHAPE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: '#999', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Color</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {LOGO_COLORS.map(c => (
            <button key={c} onClick={() => update({ color: c })} style={{
              width: 36, height: 36, borderRadius: '50%', border: config.color === c ? '3px solid white' : '2px solid #444',
              background: c, cursor: 'pointer', transition: 'transform 0.15s',
              transform: config.color === c ? 'scale(1.15)' : 'scale(1)',
            }} />
          ))}
        </div>
      </div>

      {/* Accent style */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: '#999', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Style</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ACCENT_STYLES.map(a => (
            <button key={a} onClick={() => update({ accent: a })} className="btn btn-small" style={{
              color: config.accent === a ? 'var(--gold)' : '#888',
              borderColor: config.accent === a ? 'var(--gold)' : '#333',
              background: config.accent === a ? 'rgba(212,168,67,0.1)' : 'transparent',
              textTransform: 'capitalize', fontSize: '0.75rem',
            }}>
              {a}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
