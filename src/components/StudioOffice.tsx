import { useState, useMemo } from 'react';
import {
  getCurrentDecorTier, getNextDecorTier, getDecorProgress,
  getAvailableItems, getRandomFlavorText, getOfficeTrophies,
  DECOR_TIERS, type DecorTier, type OfficeItem,
} from '../studioCustomization';
import { getLifetimeStats } from '../studioLegacy';

// ─── CSS-art colors per tier ───
const TIER_PALETTE: Record<DecorTier, { wall: string; floor: string; trim: string; window: string; sky: string }> = {
  garage: { wall: '#2a2a2a', floor: '#3d3225', trim: '#555', window: '#1a2030', sky: '#1a2030' },
  loft: { wall: '#302828', floor: '#4a3828', trim: '#665544', window: '#1a2540', sky: '#1a2540' },
  office: { wall: '#28282e', floor: '#3d3020', trim: '#887744', window: '#203050', sky: '#203050' },
  penthouse: { wall: '#1e1e28', floor: '#2e2418', trim: '#aa8844', window: '#1a2050', sky: '#0a1530' },
  mansion: { wall: '#1a1420', floor: '#2a1e14', trim: '#d4a843', window: '#101830', sky: '#080c1a' },
};

function OfficeScene({ tier, onClickItem }: { tier: DecorTier; onClickItem: (item: OfficeItem) => void }) {
  const p = TIER_PALETTE[tier];
  const items = useMemo(() => getAvailableItems(tier), [tier]);
  const trophies = useMemo(() => getOfficeTrophies(), []);

  return (
    <div style={{
      position: 'relative', width: '100%', maxWidth: 460, height: 220,
      background: p.wall, borderRadius: 12, overflow: 'hidden',
      border: `2px solid ${p.trim}`, margin: '0 auto',
    }}>
      {/* Floor */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
        background: p.floor, borderTop: `2px solid ${p.trim}40`,
      }} />

      {/* Window */}
      <div style={{
        position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
        width: 140, height: 80, background: p.window,
        border: `3px solid ${p.trim}`, borderRadius: 4,
        boxShadow: `inset 0 0 20px rgba(255,255,255,0.03)`,
      }}>
        {/* Stars / city lights in window */}
        {(tier === 'penthouse' || tier === 'mansion') && (
          <>
            <div style={{ position: 'absolute', top: 12, left: 20, width: 2, height: 2, background: '#fff', borderRadius: '50%', opacity: 0.8 }} />
            <div style={{ position: 'absolute', top: 25, left: 50, width: 2, height: 2, background: '#ffd700', borderRadius: '50%', opacity: 0.6 }} />
            <div style={{ position: 'absolute', top: 8, left: 80, width: 2, height: 2, background: '#fff', borderRadius: '50%', opacity: 0.7 }} />
            <div style={{ position: 'absolute', top: 35, left: 110, width: 2, height: 2, background: '#fff', borderRadius: '50%', opacity: 0.5 }} />
            <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, height: 20, background: 'linear-gradient(0deg, rgba(255,200,50,0.1) 0%, transparent 100%)' }} />
          </>
        )}
        {tier === 'office' && (
          <div style={{ position: 'absolute', bottom: 5, left: 10, right: 10, height: 25, display: 'flex', gap: 3, alignItems: 'flex-end' }}>
            {[15, 22, 12, 18, 25, 14, 20].map((h, i) => (
              <div key={i} style={{ flex: 1, height: h, background: `rgba(255,200,100,${0.1 + Math.random() * 0.1})`, borderRadius: '1px 1px 0 0' }} />
            ))}
          </div>
        )}
        {/* Window cross-bars */}
        <div style={{ position: 'absolute', top: 0, left: '50%', width: 2, height: '100%', background: `${p.trim}80` }} />
        <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: 2, background: `${p.trim}80` }} />
      </div>

      {/* Desk */}
      <div
        style={{
          position: 'absolute', bottom: 35, left: '50%', transform: 'translateX(-50%)',
          width: tier === 'garage' ? 100 : tier === 'loft' ? 120 : 140,
          height: tier === 'garage' ? 6 : 8,
          background: tier === 'garage' ? '#666' : tier === 'mansion' ? '#5c3a1e' : '#4a3020',
          borderRadius: tier === 'garage' ? 1 : 3,
          cursor: 'pointer', transition: 'filter 0.2s',
        }}
        onClick={() => { const desk = items.find(i => i.id === 'desk'); if (desk) onClickItem(desk); }}
        title="Click the desk"
      >
        {/* Desk legs */}
        <div style={{ position: 'absolute', bottom: -25, left: 4, width: 4, height: 25, background: tier === 'garage' ? '#555' : '#3a2010' }} />
        <div style={{ position: 'absolute', bottom: -25, right: 4, width: 4, height: 25, background: tier === 'garage' ? '#555' : '#3a2010' }} />
      </div>

      {/* Chair */}
      <div style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        width: 24, height: 30, display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{
          width: 20, height: 14,
          background: tier === 'garage' ? '#555' : tier === 'penthouse' || tier === 'mansion' ? '#333' : '#3a3a3a',
          borderRadius: '3px 3px 0 0',
          border: tier === 'mansion' ? '1px solid #d4a84340' : 'none',
        }} />
        <div style={{ width: 2, height: 8, background: '#444' }} />
        <div style={{ width: 14, height: 3, background: '#333', borderRadius: 2 }} />
      </div>

      {/* Clickable items positioned around the office */}
      {items.filter(i => i.id !== 'desk').map((item, idx) => {
        const positions: Record<string, { left: number; bottom: number }> = {
          phone: { left: 55, bottom: 48 },
          poster: { left: 15, bottom: 120 },
          plant: { left: 85, bottom: 62 },
          award: { left: 82, bottom: 120 },
          minibar: { left: 10, bottom: 62 },
          telescope: { left: 88, bottom: 145 },
          pool: { left: 50, bottom: 170 },
        };
        const pos = positions[item.id] || { left: 20 + idx * 15, bottom: 80 };
        return (
          <div
            key={item.id}
            onClick={() => onClickItem(item)}
            title={item.name}
            style={{
              position: 'absolute', left: `${pos.left}%`, bottom: pos.bottom,
              transform: 'translateX(-50%)',
              fontSize: item.id === 'pool' ? '1.2rem' : '0.9rem',
              cursor: 'pointer', transition: 'transform 0.2s',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
              zIndex: 5,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateX(-50%) scale(1.3)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateX(-50%) scale(1)'; }}
          >
            {item.emoji}
          </div>
        );
      })}

      {/* Trophy shelf */}
      {trophies.length > 0 && (
        <div style={{
          position: 'absolute', top: 110, right: 8, display: 'flex', gap: 2,
          background: `${p.trim}20`, padding: '2px 4px', borderRadius: 3,
          border: `1px solid ${p.trim}30`,
        }}>
          {trophies.slice(0, 5).map(t => (
            <span key={t.id} title={t.name} style={{ fontSize: '0.65rem', cursor: 'help' }}>{t.emoji}</span>
          ))}
        </div>
      )}

      {/* Tier label */}
      <div style={{
        position: 'absolute', top: 6, left: 8, fontSize: '0.55rem', color: `${p.trim}aa`,
        fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em',
      }}>
        {DECOR_TIERS.find(t => t.id === tier)?.emoji} {DECOR_TIERS.find(t => t.id === tier)?.name.toUpperCase()}
      </div>
    </div>
  );
}

export default function StudioOffice({ compact }: { compact?: boolean }) {
  const [flavorText, setFlavorText] = useState<string | null>(null);
  const [flavorItem, setFlavorItem] = useState<string>('');

  const stats = useMemo(() => getLifetimeStats(), []);
  const tier = useMemo(() => getCurrentDecorTier(stats), [stats]);
  const nextTier = useMemo(() => getNextDecorTier(stats), [stats]);
  const progress = useMemo(() => getDecorProgress(stats), [stats]);

  const handleClickItem = (item: OfficeItem) => {
    setFlavorItem(item.name);
    setFlavorText(getRandomFlavorText(item));
    setTimeout(() => setFlavorText(null), 3000);
  };

  if (compact) {
    return (
      <div style={{ textAlign: 'center' }}>
        <OfficeScene tier={tier.id} onClickItem={handleClickItem} />
        {flavorText && (
          <div className="animate-slide-down" style={{
            marginTop: 8, color: '#999', fontSize: '0.7rem', fontStyle: 'italic',
            transition: 'opacity 0.3s',
          }}>
            <span style={{ color: '#888' }}>{flavorItem}:</span> "{flavorText}"
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <h3 style={{ color: 'var(--gold)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.08em', marginBottom: 12, textAlign: 'center' }}>
        🏢 STUDIO HEADQUARTERS
      </h3>

      <OfficeScene tier={tier.id} onClickItem={handleClickItem} />

      {/* Flavor text popup */}
      {flavorText && (
        <div className="animate-slide-down" style={{
          textAlign: 'center', marginTop: 8, padding: '8px 16px',
          background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.2)',
          borderRadius: 8, color: '#ccc', fontSize: '0.75rem', fontStyle: 'italic',
        }}>
          <span style={{ color: 'var(--gold)' }}>{flavorItem}:</span> "{flavorText}"
        </div>
      )}

      {/* Current tier info */}
      <div style={{
        marginTop: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.02)',
        border: '1px solid #222', borderRadius: 8, textAlign: 'center',
      }}>
        <div style={{ color: 'var(--gold)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.9rem' }}>
          {tier.emoji} {tier.name}
        </div>
        <div style={{ color: '#888', fontSize: '0.7rem', marginTop: 4 }}>{tier.description}</div>
        <div style={{ color: '#666', fontSize: '0.65rem', marginTop: 4 }}>
          🪟 View: {tier.windowView} · 🪑 {tier.chairStyle} · 🖥️ {tier.deskStyle}
        </div>
      </div>

      {/* Upgrade progress */}
      {nextTier && (
        <div style={{
          marginTop: 12, padding: '10px 16px', background: 'rgba(212,168,67,0.05)',
          border: '1px solid rgba(212,168,67,0.15)', borderRadius: 8,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: '#888', fontSize: '0.7rem' }}>Next: {nextTier.emoji} {nextTier.name}</span>
            <span style={{ color: 'var(--gold)', fontSize: '0.65rem', fontFamily: "'Bebas Neue', sans-serif" }}>
              ${stats.totalRevenue.toFixed(0)}M / ${nextTier.earningsThreshold}M
            </span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 3, height: 6, overflow: 'hidden' }}>
            <div style={{
              width: `${progress * 100}%`, height: '100%',
              background: 'linear-gradient(90deg, #d4a843, #ffd700)',
              borderRadius: 3, transition: 'width 0.3s',
            }} />
          </div>
          <div style={{ color: '#666', fontSize: '0.6rem', marginTop: 4, textAlign: 'center' }}>
            {nextTier.description}
          </div>
        </div>
      )}

      {/* Tier roadmap */}
      <div style={{ marginTop: 16, display: 'flex', gap: 4, justifyContent: 'center' }}>
        {DECOR_TIERS.map((t, i) => {
          const unlocked = stats.totalRevenue >= t.earningsThreshold;
          const isCurrent = t.id === tier.id;
          return (
            <div key={t.id} title={`${t.name} — $${t.earningsThreshold}M`} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              opacity: unlocked ? 1 : 0.4,
            }}>
              <span style={{
                fontSize: '1.1rem',
                filter: isCurrent ? 'drop-shadow(0 0 4px rgba(212,168,67,0.5))' : 'none',
              }}>{t.emoji}</span>
              <span style={{
                fontSize: '0.5rem', color: isCurrent ? 'var(--gold)' : unlocked ? '#888' : '#555',
                fontFamily: "'Bebas Neue', sans-serif",
              }}>{t.name.split(' ')[1] || t.name}</span>
              {i < DECOR_TIERS.length - 1 && (
                <span style={{ color: '#333', fontSize: '0.5rem', position: 'absolute', right: -6 }}>→</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
