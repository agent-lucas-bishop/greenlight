// R257: SynergyIndicator — compact indicator showing active synergies during production
// Pulses when a new synergy activates. Shows animated icons and bonus descriptions.

import { useState, useEffect, useRef } from 'react';
import type { ActiveCombo } from '../synergies';
import type { DetectedSynergy } from '../cardSynergies';

const RARITY_COLORS: Record<string, string> = {
  common: '#8b9dc3',
  uncommon: '#4ade80',
  rare: '#a78bfa',
  legendary: '#fbbf24',
};

interface SynergyIndicatorProps {
  cardSynergies: DetectedSynergy[];
  comboSynergies: ActiveCombo[];
  totalQualityBonus: number;
  totalBoxOfficeMultiplier: number;
}

export default function SynergyIndicator({
  cardSynergies,
  comboSynergies,
  totalQualityBonus,
  totalBoxOfficeMultiplier,
}: SynergyIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const prevCount = useRef(0);

  const totalCount = cardSynergies.length + comboSynergies.length;

  // Pulse when count increases
  useEffect(() => {
    if (totalCount > prevCount.current) {
      setPulseKey(k => k + 1);
    }
    prevCount.current = totalCount;
  }, [totalCount]);

  if (totalCount === 0) return null;

  return (
    <div className="synergy-indicator-r257" style={{ position: 'relative' }}>
      {/* Compact badge */}
      <button
        key={pulseKey}
        onClick={() => setExpanded(!expanded)}
        className="synergy-indicator-badge"
        style={{
          background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(167,139,250,0.15))',
          border: '1px solid rgba(251,191,36,0.4)',
          borderRadius: 12,
          padding: '6px 14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'synergy-pulse 0.6s ease-out',
          color: '#fff',
          fontSize: '0.85rem',
          fontWeight: 600,
        }}
        title="Click to expand synergy details"
      >
        <span style={{ fontSize: '1.1em' }}>🔗</span>
        <span>{totalCount} Synerg{totalCount === 1 ? 'y' : 'ies'}</span>
        {totalQualityBonus > 0 && (
          <span style={{ color: '#4ade80', fontSize: '0.8em' }}>+{totalQualityBonus}Q</span>
        )}
        {totalBoxOfficeMultiplier > 1 && (
          <span style={{ color: '#fbbf24', fontSize: '0.8em' }}>×{totalBoxOfficeMultiplier.toFixed(2)}</span>
        )}
        <span style={{ fontSize: '0.7em', opacity: 0.6 }}>{expanded ? '▼' : '▶'}</span>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            minWidth: 280,
            maxWidth: 360,
            background: 'rgba(15,15,25,0.95)',
            border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: 10,
            padding: 12,
            marginTop: 4,
            zIndex: 100,
            maxHeight: 300,
            overflowY: 'auto',
          }}
        >
          {/* Card-level synergies */}
          {cardSynergies.map(s => (
            <div key={s.synergy.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, fontSize: '0.8rem' }}>
              <span style={{ fontSize: '1.1em' }}>{s.synergy.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: RARITY_COLORS[s.synergy.rarity] }}>{s.synergy.name}</div>
                <div style={{ color: '#4ade80', fontSize: '0.75rem' }}>{s.synergy.effect.label}</div>
              </div>
              <span style={{ color: RARITY_COLORS[s.synergy.rarity], fontSize: '0.65rem', textTransform: 'uppercase' }}>
                {s.synergy.rarity}
              </span>
            </div>
          ))}

          {/* Combo synergies */}
          {comboSynergies.map(c => (
            <div key={c.combo.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, fontSize: '0.8rem' }}>
              <span style={{ fontSize: '1.1em' }}>{c.combo.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: RARITY_COLORS[c.combo.rarity] }}>{c.combo.name}</div>
                <div style={{ color: '#4ade80', fontSize: '0.75rem' }}>{c.combo.effects.label}</div>
              </div>
              <span style={{ color: RARITY_COLORS[c.combo.rarity], fontSize: '0.65rem', textTransform: 'uppercase' }}>
                {c.combo.rarity}
              </span>
            </div>
          ))}

          {/* Totals */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 8, paddingTop: 8, fontSize: '0.75rem', color: '#aaa' }}>
            Combined: {totalQualityBonus > 0 ? `+${totalQualityBonus} Quality` : ''}
            {totalBoxOfficeMultiplier > 1 ? ` · ×${totalBoxOfficeMultiplier.toFixed(2)} BO` : ''}
          </div>
        </div>
      )}

      <style>{`
        @keyframes synergy-pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(251,191,36,0.5); }
          50% { transform: scale(1.05); box-shadow: 0 0 12px 4px rgba(251,191,36,0.3); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(251,191,36,0); }
        }
      `}</style>
    </div>
  );
}
