import { useMemo, useEffect, useRef } from 'react';
import { sfx } from '../sound';

/**
 * StudioLot — A visual studio lot that grows with career progress.
 * Shows as an isometric-style SVG illustration on the start screen.
 */

export interface StudioLotBuildings {
  office: boolean;       // Always true (starting)
  soundStage: boolean;   // After 1st film
  postProd: boolean;     // After a SMASH HIT
  backlot: boolean;      // After 5 total films (career)
  starTrailers: boolean; // After a BLOCKBUSTER
  fullCampus: boolean;   // After 10 films career
  goldGate: boolean;     // Mogul difficulty win
}

const STORAGE_KEY = 'greenlight_studio_lot';

export function getStudioLotBuildings(): StudioLotBuildings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { office: true, soundStage: false, postProd: false, backlot: false, starTrailers: false, fullCampus: false, goldGate: false, ...JSON.parse(raw) };
  } catch {}
  return { office: true, soundStage: false, postProd: false, backlot: false, starTrailers: false, fullCampus: false, goldGate: false };
}

export function updateStudioLotBuildings(): StudioLotBuildings {
  // Read from career data
  let unlocks: any = {};
  let leaderboard: any[] = [];
  try {
    const u = localStorage.getItem('greenlight_unlocks');
    if (u) unlocks = JSON.parse(u);
  } catch {}
  try {
    const l = localStorage.getItem('greenlight_leaderboard');
    if (l) leaderboard = JSON.parse(l);
  } catch {}

  const careerStats = unlocks.careerStats || {};
  const totalFilms = careerStats.totalFilms || 0;
  const totalBlockbusters = careerStats.totalBlockbusters || 0;

  // Check if any film was a SMASH HIT
  let hasSmash = false;
  let hasBlockbuster = totalBlockbusters > 0;
  let hasMogulWin = false;

  for (const entry of leaderboard) {
    if (entry.films) {
      for (const f of entry.films) {
        if (f.tier === 'SMASH') hasSmash = true;
        if (f.tier === 'BLOCKBUSTER') hasBlockbuster = true;
      }
    }
    if (entry.won && entry.difficulty === 'mogul') hasMogulWin = true;
  }

  const buildings: StudioLotBuildings = {
    office: true,
    soundStage: totalFilms >= 1,
    postProd: hasSmash || hasBlockbuster,
    backlot: totalFilms >= 5,
    starTrailers: hasBlockbuster,
    fullCampus: totalFilms >= 10,
    goldGate: hasMogulWin,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(buildings));
  return buildings;
}

// CSS keyframes injected once
const STYLES = `
@keyframes studioLot-flicker {
  0%, 90%, 100% { opacity: 1; }
  92% { opacity: 0.4; }
  94% { opacity: 1; }
  96% { opacity: 0.6; }
}
@keyframes studioLot-smoke {
  0% { transform: translateY(0) scale(1); opacity: 0.5; }
  100% { transform: translateY(-8px) scale(1.4); opacity: 0; }
}
@keyframes studioLot-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
@keyframes studioLot-gateShine {
  0% { stop-color: #ffd700; }
  50% { stop-color: #fff4b0; }
  100% { stop-color: #ffd700; }
}
`;

let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  const el = document.createElement('style');
  el.textContent = STYLES;
  document.head.appendChild(el);
  stylesInjected = true;
}

// Building count for label
function countBuildings(b: StudioLotBuildings): number {
  return [b.office, b.soundStage, b.postProd, b.backlot, b.starTrailers, b.fullCampus, b.goldGate].filter(Boolean).length;
}

export default function StudioLot({ compact }: { compact?: boolean }) {
  injectStyles();
  const buildings = useMemo(() => updateStudioLotBuildings(), []);
  const total = countBuildings(buildings);

  // R170: Play building unlock sound when new buildings detected
  const hasPlayed = useRef(false);
  useEffect(() => {
    if (hasPlayed.current) return;
    try {
      const prev = parseInt(localStorage.getItem('greenlight_studio_lot_count') || '0', 10);
      if (total > prev && prev > 0) {
        hasPlayed.current = true;
        setTimeout(() => sfx.buildingUnlock(), 400);
      }
      localStorage.setItem('greenlight_studio_lot_count', String(total));
    } catch {}
  }, [total]);
  const w = compact ? 320 : 440;
  const h = compact ? 180 : 240;

  return (
    <div style={{ margin: '0 auto', textAlign: 'center' }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        style={{ maxWidth: '100%', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}
        role="img"
        aria-label={`Studio lot with ${total} building${total !== 1 ? 's' : ''}`}
      >
        <defs>
          <linearGradient id="sl-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1a2e" />
            <stop offset="100%" stopColor="#0f0f1a" />
          </linearGradient>
          <linearGradient id="sl-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffd700">
              <animate attributeName="stop-color" values="#ffd700;#fff4b0;#ffd700" dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#b8860b" />
          </linearGradient>
          <linearGradient id="sl-building" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a2a3e" />
            <stop offset="100%" stopColor="#1e1e30" />
          </linearGradient>
        </defs>

        {/* Ground */}
        <rect x="10" y={h - 40} width={w - 20} height="30" rx="4" fill="url(#sl-ground)" stroke="#333" strokeWidth="0.5" />

        {/* Road */}
        <rect x="20" y={h - 28} width={w - 40} height="4" rx="2" fill="#222" />
        <line x1="40" y1={h - 26} x2="55" y2={h - 26} stroke="#555" strokeWidth="0.8" strokeDasharray="4 4" />
        <line x1="75" y1={h - 26} x2="90" y2={h - 26} stroke="#555" strokeWidth="0.8" strokeDasharray="4 4" />
        <line x1="110" y1={h - 26} x2="125" y2={h - 26} stroke="#555" strokeWidth="0.8" strokeDasharray="4 4" />

        {/* === OFFICE (always) === */}
        <g transform={`translate(30, ${h - 75})`}>
          <rect x="0" y="0" width="40" height="35" rx="2" fill="url(#sl-building)" stroke="#444" strokeWidth="0.5" />
          <rect x="4" y="4" width="8" height="6" rx="1" fill="#1a3a5a" style={{ animation: 'studioLot-flicker 4s infinite' }} />
          <rect x="16" y="4" width="8" height="6" rx="1" fill="#1a3a5a" opacity="0.7" />
          <rect x="28" y="4" width="8" height="6" rx="1" fill="#1a3a5a" style={{ animation: 'studioLot-flicker 5s infinite 1s' }} />
          <rect x="4" y="14" width="8" height="6" rx="1" fill="#1a3a5a" opacity="0.5" />
          <rect x="16" y="14" width="8" height="6" rx="1" fill="#1a3a5a" style={{ animation: 'studioLot-flicker 6s infinite 2s' }} />
          <rect x="15" y="24" width="10" height="11" rx="1" fill="#333" />
          <text x="20" y="33" textAnchor="middle" fill="#666" fontSize="4" fontFamily="sans-serif">🏢</text>
        </g>
        <text x="50" y={h - 38} textAnchor="middle" fill="#555" fontSize="5" fontFamily="Bebas Neue, sans-serif">OFFICE</text>

        {/* === SOUND STAGE === */}
        {buildings.soundStage && (
          <g transform={`translate(85, ${h - 85})`}>
            <rect x="0" y="0" width="55" height="45" rx="3" fill="url(#sl-building)" stroke="#444" strokeWidth="0.5" />
            {/* Arched roof */}
            <path d="M0,0 Q27.5,-12 55,0" fill="#222" stroke="#444" strokeWidth="0.5" />
            {/* Big door */}
            <rect x="18" y="20" width="20" height="25" rx="2" fill="#111" stroke="#555" strokeWidth="0.5" />
            {/* Red light */}
            <circle cx="48" cy="8" r="2.5" fill="#e74c3c" style={{ animation: 'studioLot-pulse 2s infinite' }} />
            <text x="27" y="15" textAnchor="middle" fill="#444" fontSize="5">STAGE A</text>
          </g>
        )}
        {buildings.soundStage && (
          <text x="112" y={h - 38} textAnchor="middle" fill="#555" fontSize="5" fontFamily="Bebas Neue, sans-serif">SOUND STAGE</text>
        )}

        {/* === POST-PRODUCTION SUITE === */}
        {buildings.postProd && (
          <g transform={`translate(155, ${h - 70})`}>
            <rect x="0" y="0" width="38" height="30" rx="2" fill="url(#sl-building)" stroke="#444" strokeWidth="0.5" />
            {/* Satellite dish */}
            <circle cx="30" cy="-4" r="5" fill="none" stroke="#666" strokeWidth="0.8" />
            <line x1="30" y1="-4" x2="30" y2="0" stroke="#666" strokeWidth="0.8" />
            {/* Screen glow */}
            <rect x="5" y="5" width="12" height="8" rx="1" fill="#0a2a4a" />
            <rect x="6" y="6" width="10" height="6" rx="0.5" fill="#1a4a6a" style={{ animation: 'studioLot-pulse 3s infinite' }} />
            <rect x="21" y="5" width="12" height="8" rx="1" fill="#0a2a4a" />
            <rect x="22" y="6" width="10" height="6" rx="0.5" fill="#1a4a6a" style={{ animation: 'studioLot-pulse 3s infinite 1.5s' }} />
            <rect x="13" y="18" width="12" height="12" rx="1" fill="#333" />
          </g>
        )}
        {buildings.postProd && (
          <text x="174" y={h - 38} textAnchor="middle" fill="#555" fontSize="5" fontFamily="Bebas Neue, sans-serif">POST-PROD</text>
        )}

        {/* === BACKLOT === */}
        {buildings.backlot && (
          <g transform={`translate(210, ${h - 75})`}>
            {/* Western facade */}
            <rect x="0" y="5" width="20" height="30" rx="1" fill="#2a2218" stroke="#444" strokeWidth="0.5" />
            <path d="M0,5 L10,-2 L20,5" fill="#332a1a" stroke="#444" strokeWidth="0.5" />
            <rect x="6" y="20" width="8" height="15" rx="1" fill="#1a1a10" />
            {/* City facade */}
            <rect x="25" y="0" width="18" height="35" rx="1" fill="#2a2a3e" stroke="#444" strokeWidth="0.5" />
            <rect x="28" y="3" width="5" height="4" rx="0.5" fill="#1a3a5a" style={{ animation: 'studioLot-flicker 4s infinite 0.5s' }} />
            <rect x="35" y="3" width="5" height="4" rx="0.5" fill="#1a3a5a" opacity="0.6" />
            <rect x="28" y="10" width="5" height="4" rx="0.5" fill="#1a3a5a" opacity="0.4" />
            <rect x="35" y="10" width="5" height="4" rx="0.5" fill="#1a3a5a" style={{ animation: 'studioLot-flicker 5s infinite 2s' }} />
            <rect x="28" y="17" width="5" height="4" rx="0.5" fill="#1a3a5a" style={{ animation: 'studioLot-flicker 3s infinite 1s' }} />
          </g>
        )}
        {buildings.backlot && (
          <text x="232" y={h - 38} textAnchor="middle" fill="#555" fontSize="5" fontFamily="Bebas Neue, sans-serif">BACKLOT</text>
        )}

        {/* === STAR TRAILERS === */}
        {buildings.starTrailers && (
          <g transform={`translate(270, ${h - 60})`}>
            {[0, 22, 44].map((ox, i) => (
              <g key={i} transform={`translate(${ox}, 0)`}>
                <rect x="0" y="2" width="18" height="12" rx="2" fill="#2a2a3e" stroke="#555" strokeWidth="0.5" />
                <rect x="3" y="5" width="5" height="4" rx="0.5" fill="#1a3a5a" style={{ animation: `studioLot-flicker ${4 + i}s infinite ${i}s` }} />
                <circle cx="4" cy="14" r="2" fill="#222" stroke="#444" strokeWidth="0.4" />
                <circle cx="14" cy="14" r="2" fill="#222" stroke="#444" strokeWidth="0.4" />
                {/* Star on door */}
                <text x="13" y="10" textAnchor="middle" fill="#d4a843" fontSize="4">★</text>
              </g>
            ))}
          </g>
        )}
        {buildings.starTrailers && (
          <text x="315" y={h - 38} textAnchor="middle" fill="#555" fontSize="5" fontFamily="Bebas Neue, sans-serif">STAR TRAILERS</text>
        )}

        {/* === FULL CAMPUS: Water Tower + Logo === */}
        {buildings.fullCampus && (
          <g transform={`translate(370, ${h - 110})`}>
            {/* Water tower legs */}
            <line x1="15" y1="30" x2="10" y2="70" stroke="#444" strokeWidth="1.5" />
            <line x1="35" y1="30" x2="40" y2="70" stroke="#444" strokeWidth="1.5" />
            <line x1="25" y1="30" x2="25" y2="70" stroke="#444" strokeWidth="1.5" />
            {/* Cross braces */}
            <line x1="13" y1="45" x2="37" y2="55" stroke="#333" strokeWidth="0.5" />
            <line x1="37" y1="45" x2="13" y2="55" stroke="#333" strokeWidth="0.5" />
            {/* Tank */}
            <ellipse cx="25" cy="30" rx="18" ry="6" fill="#2a2a3e" stroke="#555" strokeWidth="0.5" />
            <rect x="7" y="10" width="36" height="20" rx="3" fill="#2a2a3e" stroke="#555" strokeWidth="0.5" />
            <ellipse cx="25" cy="10" rx="18" ry="6" fill="#333" stroke="#555" strokeWidth="0.5" />
            {/* Logo on tank */}
            <text x="25" y="24" textAnchor="middle" fill="var(--gold, #d4a843)" fontSize="7" fontFamily="Bebas Neue, sans-serif" fontWeight="bold">GL</text>
          </g>
        )}

        {/* === GOLD GATE === */}
        {buildings.goldGate && (
          <g transform={`translate(${w / 2 - 30}, ${h - 50})`}>
            {/* Gate pillars */}
            <rect x="0" y="-20" width="6" height="30" rx="1" fill="url(#sl-gold)" />
            <rect x="54" y="-20" width="6" height="30" rx="1" fill="url(#sl-gold)" />
            {/* Arch */}
            <path d="M3,-20 Q30,-38 57,-20" fill="none" stroke="url(#sl-gold)" strokeWidth="2.5" />
            {/* Gate bars */}
            {[12, 20, 28, 36, 44].map(x => (
              <line key={x} x1={x} y1={-16} x2={x} y2={10} stroke="url(#sl-gold)" strokeWidth="1" opacity="0.7" />
            ))}
            {/* GREENLIGHT text on arch */}
            <text x="30" y="-24" textAnchor="middle" fill="#ffd700" fontSize="5" fontFamily="Bebas Neue, sans-serif" fontWeight="bold" letterSpacing="1">
              GREENLIGHT
            </text>
            {/* Shimmer */}
            <circle cx="30" cy="-30" r="2" fill="#ffd700" opacity="0.4" style={{ animation: 'studioLot-pulse 2s infinite' }} />
          </g>
        )}

        {/* Stars / ambient sky */}
        {[
          [20, 15], [60, 8], [120, 20], [180, 5], [250, 18], [310, 10], [380, 15], [410, 8],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={0.5 + (i % 3) * 0.3} fill="#555" opacity={0.3 + (i % 4) * 0.1} style={{ animation: `studioLot-pulse ${3 + i}s infinite ${i * 0.7}s` }} />
        ))}

        {/* Smoke from post-prod chimney */}
        {buildings.postProd && (
          <g>
            {[0, 1, 2].map(i => (
              <circle
                key={i}
                cx={170}
                cy={h - 72}
                r={2 + i}
                fill="#444"
                opacity="0"
                style={{ animation: `studioLot-smoke ${2 + i * 0.5}s infinite ${i * 0.7}s` }}
              />
            ))}
          </g>
        )}
      </svg>

      {/* Progress indicator */}
      <div style={{ marginTop: 6, display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'center' }}>
        {[
          { key: 'office', label: 'Office', unlocked: buildings.office },
          { key: 'soundStage', label: 'Stage', unlocked: buildings.soundStage },
          { key: 'postProd', label: 'Post', unlocked: buildings.postProd },
          { key: 'backlot', label: 'Backlot', unlocked: buildings.backlot },
          { key: 'starTrailers', label: 'Stars', unlocked: buildings.starTrailers },
          { key: 'fullCampus', label: 'Campus', unlocked: buildings.fullCampus },
          { key: 'goldGate', label: 'Gate', unlocked: buildings.goldGate },
        ].map(b => (
          <div
            key={b.key}
            title={b.unlocked ? `${b.label} — Unlocked` : `${b.label} — Locked`}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: b.unlocked ? 'var(--gold, #d4a843)' : '#333',
              border: `1px solid ${b.unlocked ? 'var(--gold, #d4a843)' : '#444'}`,
              transition: 'all 0.3s',
            }}
          />
        ))}
        <span style={{ color: '#555', fontSize: '0.6rem', marginLeft: 4 }}>
          {total}/7
        </span>
      </div>
    </div>
  );
}
