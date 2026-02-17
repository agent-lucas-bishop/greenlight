// R217: Synergy Display — shows discovered synergies during production
import { useState, useEffect } from 'react';
import type { DetectedSynergy } from '../cardSynergies';

const RARITY_COLORS: Record<string, string> = {
  common: '#8b9dc3',
  uncommon: '#4ade80',
  rare: '#a78bfa',
  legendary: '#fbbf24',
};

const RARITY_GLOW: Record<string, string> = {
  common: 'rgba(139,157,195,0.3)',
  uncommon: 'rgba(74,222,128,0.4)',
  rare: 'rgba(167,139,250,0.5)',
  legendary: 'rgba(251,191,36,0.6)',
};

const CATEGORY_LABELS: Record<string, string> = {
  genre: 'GENRE COMBO',
  talent: 'TALENT COMBO',
  budget: 'BUDGET COMBO',
  ability: 'CARD COMBO',
};

function SynergyCard({ detected, index }: { detected: DetectedSynergy; index: number }) {
  const [revealed, setRevealed] = useState(false);
  const s = detected.synergy;
  const color = RARITY_COLORS[s.rarity];
  const glow = RARITY_GLOW[s.rarity];

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 300 + index * 400);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div
      className={`synergy-card-r217 ${revealed ? 'synergy-revealed' : 'synergy-hidden'}`}
      style={{
        borderColor: color,
        boxShadow: revealed ? `0 0 16px ${glow}, inset 0 0 8px ${glow}` : 'none',
        animationDelay: `${index * 0.4}s`,
      }}
    >
      <div className="synergy-card-header" style={{ color }}>
        <span className="synergy-emoji">{s.emoji}</span>
        <span className="synergy-name">{s.name}</span>
        <span className="synergy-rarity" style={{ background: color, color: '#000' }}>
          {s.rarity.toUpperCase()}
        </span>
      </div>
      <div className="synergy-category">{CATEGORY_LABELS[s.category]}</div>
      <div className="synergy-effect-label">{s.effect.label}</div>
      <div className="synergy-involved">
        {detected.involvedCards.slice(0, 3).join(' • ')}
      </div>
      <div className="synergy-flavor">"{s.flavorText}"</div>
    </div>
  );
}

interface SynergyDisplayProps {
  synergies: DetectedSynergy[];
  onDismiss?: () => void;
}

export default function SynergyDisplay({ synergies, onDismiss }: SynergyDisplayProps) {
  const [visible, setVisible] = useState(true);

  if (!visible || synergies.length === 0) return null;

  return (
    <div className="synergy-display-overlay" onClick={() => { setVisible(false); onDismiss?.(); }}>
      <div className="synergy-display-container" onClick={e => e.stopPropagation()}>
        <div className="synergy-display-title">
          <span className="synergy-title-glow">✨ SYNERGIES DETECTED ✨</span>
        </div>
        <div className="synergy-cards-list">
          {synergies.map((s, i) => (
            <SynergyCard key={s.synergy.id} detected={s} index={i} />
          ))}
        </div>
        {/* Connection lines visual */}
        <svg className="synergy-connection-lines" width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}>
          {synergies.length > 1 && synergies.map((_, i) => {
            if (i === 0) return null;
            const y1 = 80 + (i - 1) * 120 + 50;
            const y2 = 80 + i * 120 + 50;
            return (
              <line
                key={i}
                x1="50%" y1={y1} x2="50%" y2={y2}
                stroke="rgba(251,191,36,0.3)"
                strokeWidth="2"
                strokeDasharray="6 4"
                className="synergy-line-pulse"
              />
            );
          })}
        </svg>
        <button
          className="synergy-dismiss-btn"
          onClick={() => { setVisible(false); onDismiss?.(); }}
        >
          Continue Production →
        </button>
      </div>
    </div>
  );
}

// ─── SYNERGY CODEX (for StartScreen) ───

interface SynergyCodexProps {
  onClose: () => void;
  inline?: boolean;
}

export function SynergyCodex({ onClose, inline }: SynergyCodexProps) {
  // Dynamic import to avoid circular deps
  const [entries, setEntries] = useState<Array<{ id: string; name: string; emoji: string; rarity: string; category: string; description: string; flavorText: string; effect: { label: string }; discovered: boolean }>>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    import('../cardSynergies').then(mod => {
      setEntries(mod.getAllSynergiesForCodex());
    });
  }, []);

  const discoveredCount = entries.filter(e => e.discovered).length;
  const filtered = filter === 'all' ? entries : entries.filter(e => e.category === filter);

  const content = (
    <div className="synergy-codex">
      <div className="synergy-codex-header">
        <h2>🔗 Synergy Codex</h2>
        <span className="synergy-codex-progress">
          {discoveredCount}/{entries.length} Discovered
        </span>
      </div>
      <div className="synergy-codex-filters">
        {['all', 'genre', 'talent', 'budget', 'ability'].map(f => (
          <button
            key={f}
            className={`synergy-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? '📋 All' : f === 'genre' ? '🎭 Genre' : f === 'talent' ? '⭐ Talent' : f === 'budget' ? '💰 Budget' : '🃏 Card'}
          </button>
        ))}
      </div>
      <div className="synergy-codex-grid">
        {filtered.map(entry => (
          <div
            key={entry.id}
            className={`synergy-codex-entry ${entry.discovered ? 'discovered' : 'locked'}`}
            style={{
              borderColor: entry.discovered ? RARITY_COLORS[entry.rarity] : '#333',
            }}
          >
            {entry.discovered ? (
              <>
                <div className="codex-entry-top">
                  <span>{entry.emoji} {entry.name}</span>
                  <span className="codex-rarity" style={{ color: RARITY_COLORS[entry.rarity] }}>
                    {entry.rarity.toUpperCase()}
                  </span>
                </div>
                <div className="codex-entry-cat">{CATEGORY_LABELS[entry.category]}</div>
                <div className="codex-entry-desc">{entry.description}</div>
                <div className="codex-entry-effect">{entry.effect.label}</div>
                <div className="codex-entry-flavor">"{entry.flavorText}"</div>
              </>
            ) : (
              <div className="codex-entry-locked">
                <span className="codex-lock-icon">🔒</span>
                <span className="codex-lock-text">Undiscovered Synergy</span>
                <span className="codex-lock-hint" style={{ color: RARITY_COLORS[entry.rarity] }}>
                  {entry.rarity.toUpperCase()} • {CATEGORY_LABELS[entry.category]}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (inline) return content;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 750 }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        {content}
      </div>
    </div>
  );
}
