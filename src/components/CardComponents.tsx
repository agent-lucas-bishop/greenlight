import { CardTemplate, CardTag } from '../types';

const TAG_CONFIG: Record<string, { emoji: string; color: string }> = {
  momentum: { emoji: '🔥', color: '#e67e22' },
  precision: { emoji: '🎯', color: '#3498db' },
  chaos: { emoji: '💀', color: '#9b59b6' },
  heart: { emoji: '💕', color: '#e91e63' },
  spectacle: { emoji: '✨', color: '#f1c40f' },
};

export function CardTypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    action: { label: 'ACTION', color: '#fff', bg: '#2ecc71' },
    challenge: { label: 'CHALLENGE', color: '#000', bg: '#f1c40f' },
    incident: { label: 'INCIDENT', color: '#fff', bg: '#e74c3c' },
  };
  const c = config[type] || config.action;
  return (
    <span style={{ background: c.bg, color: c.color, padding: '2px 8px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.05em' }}>
      {c.label}
    </span>
  );
}

export function CardPreview({ card }: { card: CardTemplate }) {
  return (
    <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 2, background: 'rgba(255,255,255,0.02)', borderRadius: 4, marginBottom: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', flexWrap: 'wrap' }}>
        <CardTypeBadge type={card.cardType} />
        <span style={{ fontWeight: 600, color: '#ccc' }}>{card.name}</span>
        <span style={{ color: card.baseQuality >= 0 ? '#2ecc71' : '#e74c3c', fontWeight: 600 }}>{card.baseQuality >= 0 ? '+' : ''}{card.baseQuality}</span>
        {card.tags && [...new Set(card.tags)].map((tag, i) => {
          const tc = TAG_CONFIG[tag] || { emoji: '•', color: '#888' };
          return <span key={i} style={{ fontSize: '0.55rem', color: tc.color }}>{tc.emoji}</span>;
        })}
      </div>
      {card.synergyText && (
        <div style={{ fontSize: '0.6rem', color: '#9b59b6', paddingLeft: 4 }}>✨ {card.synergyText}</div>
      )}
    </div>
  );
}

export { TAG_CONFIG };
