// R247: Card Detail Modal — detailed view of a collection card
import { useMemo } from 'react';
import type { CollectionCardDef, CollectionEntry } from '../cardCollection';
import { getRelatedCards, getCollection, getCardCatalog } from '../cardCollection';

const RARITY_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  common: { color: '#999', bg: 'rgba(150,150,150,0.08)', border: '#555' },
  rare: { color: '#3498db', bg: 'rgba(52,152,219,0.08)', border: '#2980b9' },
  epic: { color: '#9b59b6', bg: 'rgba(155,89,182,0.08)', border: '#8e44ad' },
  legendary: { color: '#f39c12', bg: 'rgba(243,156,18,0.08)', border: '#e67e22' },
};

const ROLE_EMOJI: Record<string, string> = {
  Lead: '🎭', Support: '🎭', Director: '🎬', Crew: '🔧',
};

interface Props {
  card: CollectionCardDef;
  entry: CollectionEntry | null;
  onClose: () => void;
  onSelectCard?: (cardId: string) => void;
}

export default function CardDetail({ card, entry, onClose, onSelectCard }: Props) {
  const rarity = RARITY_COLORS[card.rarity] || RARITY_COLORS.common;
  const related = useMemo(() => getRelatedCards(card.id), [card.id]);
  const collection = useMemo(() => getCollection(), []);
  const catalog = useMemo(() => getCardCatalog(), []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, padding: 0, overflow: 'hidden' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Card Header */}
        <div style={{
          background: rarity.bg,
          borderBottom: `2px solid ${rarity.border}`,
          padding: '28px 24px 20px',
          textAlign: 'center',
          position: 'relative',
        }}>
          {entry?.isFoil && <div className="foil-shimmer-overlay" />}
          <div style={{ fontSize: '3rem', marginBottom: 8 }}>
            {ROLE_EMOJI[card.role] || '🎬'}
          </div>
          <h2 style={{ color: rarity.color, margin: '0 0 4px', fontSize: '1.5rem', fontFamily: 'Bebas Neue', letterSpacing: '0.05em' }}>
            {card.name}
          </h2>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: rarity.color, fontSize: '0.7rem', background: rarity.bg, border: `1px solid ${rarity.border}`, borderRadius: 4, padding: '2px 8px', textTransform: 'uppercase', fontFamily: 'Bebas Neue', letterSpacing: '0.08em' }}>
              {card.rarity}
            </span>
            <span style={{ color: '#888', fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', borderRadius: 4, padding: '2px 8px' }}>
              {card.role}
            </span>
            {card.genreAffinity && (
              <span style={{ color: '#2ecc71', fontSize: '0.7rem', background: 'rgba(46,204,113,0.1)', borderRadius: 4, padding: '2px 8px' }}>
                {card.genreAffinity}
              </span>
            )}
            {entry?.isFoil && (
              <span className="foil-badge" style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4 }}>
                ✨ FOIL
              </span>
            )}
          </div>
        </div>

        {/* Stats & Info */}
        <div style={{ padding: '20px 24px' }}>
          {/* Skill */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.8rem' }}>{card.skill}</div>
              <div style={{ color: '#888', fontSize: '0.6rem', textTransform: 'uppercase' }}>Skill</div>
            </div>
            {entry && (
              <>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#3498db', fontFamily: 'Bebas Neue', fontSize: '1.8rem' }}>{entry.timesAcquired}</div>
                  <div style={{ color: '#888', fontSize: '0.6rem', textTransform: 'uppercase' }}>Times Acquired</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>
                    {new Date(entry.firstDiscovered).toLocaleDateString()}
                  </div>
                  <div style={{ color: '#888', fontSize: '0.6rem', textTransform: 'uppercase' }}>First Discovered</div>
                </div>
              </>
            )}
          </div>

          {/* Trait */}
          {card.trait && (
            <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid #222' }}>
              <div style={{ color: 'var(--gold)', fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>{card.trait}</div>
              {card.traitDesc && <div style={{ color: '#aaa', fontSize: '0.75rem', lineHeight: 1.5 }}>{card.traitDesc}</div>}
            </div>
          )}

          {/* Flavor Text */}
          <div style={{
            marginBottom: 16, padding: '12px 16px', fontStyle: 'italic', color: '#888',
            fontSize: '0.8rem', lineHeight: 1.6, borderLeft: `3px solid ${rarity.border}`,
            background: 'rgba(255,255,255,0.02)',
          }}>
            "{card.flavorText}"
          </div>

          {/* Acquisition History */}
          {entry && entry.acquisitionHistory.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#999', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Acquisition History (Last 5)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {entry.acquisitionHistory.slice(-5).reverse().map((h, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#888', padding: '3px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
                    <span>{new Date(h.date).toLocaleDateString()}</span>
                    <span>Season {h.runSeason}{h.wasFoil ? ' ✨' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Cards */}
          {related.length > 0 && (
            <div>
              <div style={{ color: '#999', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Related Cards
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {related.map(rc => {
                  const rcRarity = RARITY_COLORS[rc.rarity] || RARITY_COLORS.common;
                  const discovered = !!collection.entries[rc.id];
                  return (
                    <div
                      key={rc.id}
                      onClick={() => onSelectCard?.(rc.id)}
                      style={{
                        padding: '6px 10px', borderRadius: 6, cursor: onSelectCard ? 'pointer' : 'default',
                        background: discovered ? rcRarity.bg : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${discovered ? rcRarity.border : '#333'}`,
                        opacity: discovered ? 1 : 0.5,
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={e => { if (onSelectCard) (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; }}
                    >
                      <div style={{ color: discovered ? rcRarity.color : '#555', fontSize: '0.7rem', fontWeight: 600 }}>
                        {discovered ? rc.name : '???'}
                      </div>
                      <div style={{ color: '#888', fontSize: '0.55rem' }}>{rc.role}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
