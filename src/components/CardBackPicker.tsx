import { useState, useMemo } from 'react';
import {
  CARD_BACK_DESIGNS, getUnlockedCardBacks, getStudioCustomization,
  saveStudioCustomization, type CardBackDesign, type CardBackId,
} from '../studioCustomization';
import { getLifetimeStats } from '../studioLegacy';
import { getUnlockedAchievements } from '../achievements';

function CardBackPreview({ design, size, selected, locked, onClick }: {
  design: CardBackDesign;
  size: 'small' | 'large';
  selected?: boolean;
  locked?: boolean;
  onClick?: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const w = size === 'large' ? 120 : 70;
  const h = size === 'large' ? 168 : 98;

  return (
    <div
      onClick={() => {
        if (size === 'large') { setFlipped(f => !f); return; }
        if (!locked && onClick) onClick();
      }}
      style={{
        width: w, height: h, perspective: 400, cursor: locked ? 'default' : 'pointer',
        opacity: locked ? 0.4 : 1, transition: 'opacity 0.2s',
      }}
    >
      <div style={{
        width: '100%', height: '100%', position: 'relative',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.6s',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}>
        {/* Back */}
        <div style={{
          position: 'absolute', width: '100%', height: '100%',
          backfaceVisibility: 'hidden',
          background: design.background,
          border: `2px solid ${selected ? '#ffd700' : design.borderColor}`,
          borderRadius: size === 'large' ? 10 : 6,
          boxShadow: selected ? '0 0 12px rgba(255,215,0,0.3)' : 'none',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Pattern overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: design.pattern,
            backgroundSize: design.id === 'starField' ? '100% 100%' : undefined,
          }} />
          {/* Center emoji */}
          <span style={{
            fontSize: size === 'large' ? '2rem' : '1.2rem',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
            zIndex: 1,
          }}>
            {locked ? '🔒' : design.emoji}
          </span>
        </div>

        {/* Front (only for large preview) */}
        {size === 'large' && (
          <div style={{
            position: 'absolute', width: '100%', height: '100%',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
            border: '2px solid #d4a843',
            borderRadius: 10,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span style={{ fontSize: '1.5rem' }}>🎬</span>
            <div style={{ color: '#d4a843', fontSize: '0.6rem', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.1em' }}>
              PRODUCTION CARD
            </div>
            <div style={{ color: '#888', fontSize: '0.5rem' }}>Click to flip</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CardBackPicker({ inline }: { inline?: boolean }) {
  const stats = useMemo(() => getLifetimeStats(), []);
  const achCount = useMemo(() => getUnlockedAchievements().length, []);
  const [selected, setSelected] = useState<CardBackId>(getStudioCustomization().selectedCardBack);

  const unlockedIds = useMemo(() => {
    return new Set(CARD_BACK_DESIGNS.filter(d => d.isUnlocked(stats, achCount)).map(d => d.id));
  }, [stats, achCount]);

  const selectedDesign = CARD_BACK_DESIGNS.find(d => d.id === selected) ?? CARD_BACK_DESIGNS[0];

  const handleSelect = (id: CardBackId) => {
    if (!unlockedIds.has(id)) return;
    setSelected(id);
    saveStudioCustomization({ selectedCardBack: id });
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      {!inline && (
        <h3 style={{ color: 'var(--gold)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.08em', marginBottom: 12, textAlign: 'center' }}>
          🃏 CARD BACK DESIGNS
        </h3>
      )}

      {/* Preview card */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <CardBackPreview design={selectedDesign} size="large" selected />
          <div style={{ marginTop: 8, color: 'var(--gold)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.85rem' }}>
            {selectedDesign.emoji} {selectedDesign.name}
          </div>
          <div style={{ color: '#888', fontSize: '0.65rem' }}>{selectedDesign.description}</div>
          <div style={{ color: '#666', fontSize: '0.55rem', marginTop: 2 }}>Click to flip preview</div>
        </div>
      </div>

      {/* Grid of all designs */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
        justifyItems: 'center',
      }}>
        {CARD_BACK_DESIGNS.map(design => {
          const locked = !unlockedIds.has(design.id);
          const isSelected = design.id === selected;
          return (
            <div key={design.id} style={{ textAlign: 'center' }}>
              <CardBackPreview
                design={design}
                size="small"
                selected={isSelected}
                locked={locked}
                onClick={() => handleSelect(design.id)}
              />
              <div style={{
                marginTop: 4, fontSize: '0.55rem',
                color: isSelected ? 'var(--gold)' : locked ? '#555' : '#888',
                fontFamily: "'Bebas Neue', sans-serif",
              }}>
                {design.name}
              </div>
              {locked && (
                <div style={{ fontSize: '0.45rem', color: '#555', marginTop: 1 }}>
                  🔒 {design.unlockCondition}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', marginTop: 12, color: '#666', fontSize: '0.6rem' }}>
        {unlockedIds.size}/{CARD_BACK_DESIGNS.length} designs unlocked
      </div>
    </div>
  );
}
