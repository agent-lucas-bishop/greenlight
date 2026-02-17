// R187: Trading Card Gallery — Steam-style collectible card viewer
import { useState, useMemo } from 'react';
import {
  TRADING_CARDS,
  getCollectedCards,
  getCollectionProgress,
  RARITY_CONFIG,
  type TradingCard,
  type CardRarity,
  type CollectedCard,
} from '../tradingCards';

interface Props {
  onClose?: () => void;
  inline?: boolean;
}

const RARITY_ORDER: CardRarity[] = ['common', 'uncommon', 'rare', 'legendary'];

export default function TradingCardGallery({ onClose, inline }: Props) {
  const [selectedCard, setSelectedCard] = useState<TradingCard | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [filterRarity, setFilterRarity] = useState<CardRarity | 'all'>('all');
  const [sortBy, setSortBy] = useState<'rarity' | 'unlockDate'>('rarity');

  const collected = useMemo(() => getCollectedCards(), []);
  const collectedMap = useMemo(() => {
    const m: Record<string, CollectedCard> = {};
    for (const c of collected) m[c.cardId] = c;
    return m;
  }, [collected]);
  const progress = useMemo(() => getCollectionProgress(), []);

  const filteredCards = useMemo(() => {
    let cards = [...TRADING_CARDS];
    if (filterRarity !== 'all') cards = cards.filter(c => c.rarity === filterRarity);
    if (sortBy === 'unlockDate') {
      cards.sort((a, b) => {
        const aDate = collectedMap[a.id]?.unlockedAt || 'z';
        const bDate = collectedMap[b.id]?.unlockedAt || 'z';
        return aDate.localeCompare(bDate);
      });
    } else {
      cards.sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));
    }
    return cards;
  }, [filterRarity, sortBy, collectedMap]);

  const handleCardClick = (card: TradingCard) => {
    if (!collectedMap[card.id]) return;
    setSelectedCard(card);
    setFlipped(false);
  };

  const content = (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {!inline && onClose && (
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>🃏</div>
        <h2 style={{ color: 'var(--gold)', margin: '0 0 4px', fontFamily: 'Bebas Neue', letterSpacing: 2 }}>
          TRADING CARDS
        </h2>
        <div style={{ color: '#888', fontSize: '0.85rem' }}>
          {progress.collected}/{progress.total} Collected
        </div>
        {/* Progress bar */}
        <div style={{
          width: 200, height: 6, background: '#222', borderRadius: 3,
          margin: '8px auto 0', overflow: 'hidden',
        }}>
          <div style={{
            width: `${(progress.collected / progress.total) * 100}%`,
            height: '100%', background: 'var(--gold)', borderRadius: 3,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={filterRarity}
          onChange={e => setFilterRarity(e.target.value as any)}
          style={{
            background: '#1a1a1a', color: '#ccc', border: '1px solid #333',
            borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem',
          }}
        >
          <option value="all">All Rarities</option>
          {RARITY_ORDER.map(r => (
            <option key={r} value={r}>{RARITY_CONFIG[r].label}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          style={{
            background: '#1a1a1a', color: '#ccc', border: '1px solid #333',
            borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem',
          }}
        >
          <option value="rarity">Sort: Rarity</option>
          <option value="unlockDate">Sort: Unlock Date</option>
        </select>
      </div>

      {/* Rarity legend */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16, fontSize: '0.7rem' }}>
        {RARITY_ORDER.map(r => {
          const count = TRADING_CARDS.filter(c => c.rarity === r).length;
          const owned = TRADING_CARDS.filter(c => c.rarity === r && collectedMap[c.id]).length;
          return (
            <span key={r} style={{ color: RARITY_CONFIG[r].color }}>
              {RARITY_CONFIG[r].label}: {owned}/{count}
            </span>
          );
        })}
      </div>

      {/* Card Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 12,
      }}>
        {filteredCards.map(card => {
          const owned = !!collectedMap[card.id];
          const rarity = RARITY_CONFIG[card.rarity];
          const isLegendary = card.rarity === 'legendary';

          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(card)}
              role={owned ? 'button' : undefined}
              tabIndex={owned ? 0 : undefined}
              onKeyDown={e => { if (owned && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleCardClick(card); } }}
              className={isLegendary && owned ? 'trading-card-holo' : ''}
              style={{
                position: 'relative',
                aspectRatio: '2.5/3.5',
                borderRadius: 10,
                border: `2px solid ${owned ? rarity.borderColor : '#333'}`,
                background: owned
                  ? `linear-gradient(135deg, ${rarity.bgGlow}, rgba(0,0,0,0.6))`
                  : 'rgba(0,0,0,0.4)',
                cursor: owned ? 'pointer' : 'default',
                overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 10,
              }}
              onMouseEnter={e => { if (owned) { (e.currentTarget).style.transform = 'scale(1.05)'; (e.currentTarget).style.boxShadow = `0 4px 20px ${rarity.borderColor}40`; } }}
              onMouseLeave={e => { (e.currentTarget).style.transform = ''; (e.currentTarget).style.boxShadow = ''; }}
            >
              {!owned ? (
                // Locked silhouette
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', height: '100%', opacity: 0.3,
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🔒</div>
                  <div style={{ color: '#666', fontSize: '0.65rem', textAlign: 'center' }}>
                    {card.unlockCondition}
                  </div>
                </div>
              ) : (
                <>
                  {/* Rarity strip */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: rarity.color,
                  }} />

                  {/* Card art area */}
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2rem', marginBottom: 4,
                    background: 'rgba(0,0,0,0.3)', borderRadius: 6, margin: '4px 0',
                  }}>
                    <span style={{ fontSize: '1.5rem', textAlign: 'center', padding: 4, color: '#aaa', lineHeight: 1.3 }}>
                      🎬
                    </span>
                  </div>

                  {/* Card name */}
                  <div style={{
                    color: rarity.color,
                    fontFamily: 'Bebas Neue',
                    fontSize: 'clamp(0.7rem, 1.8vw, 0.85rem)',
                    letterSpacing: '0.05em',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}>
                    {card.name}
                  </div>

                  {/* Rarity label */}
                  <div style={{
                    color: rarity.color,
                    fontSize: '0.55rem',
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    opacity: 0.7,
                  }}>
                    {rarity.label}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Expanded Card Modal */}
      {selectedCard && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setSelectedCard(null)}
        >
          <div
            onClick={e => { e.stopPropagation(); setFlipped(!flipped); }}
            className={selectedCard.rarity === 'legendary' ? 'trading-card-holo' : ''}
            style={{
              width: 280, minHeight: 400,
              borderRadius: 16,
              border: `3px solid ${RARITY_CONFIG[selectedCard.rarity].borderColor}`,
              background: `linear-gradient(135deg, ${RARITY_CONFIG[selectedCard.rarity].bgGlow}, rgba(10,10,10,0.95))`,
              padding: 24,
              cursor: 'pointer',
              transition: 'transform 0.4s',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              transformStyle: 'preserve-3d',
              position: 'relative',
              boxShadow: `0 8px 40px ${RARITY_CONFIG[selectedCard.rarity].borderColor}60`,
            }}
          >
            {!flipped ? (
              // Front
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
                {/* Rarity strip */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                  background: RARITY_CONFIG[selectedCard.rarity].color, borderRadius: '16px 16px 0 0',
                }} />

                {/* Art area */}
                <div style={{
                  flex: 1, background: 'rgba(0,0,0,0.4)', borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 16, minHeight: 140,
                }}>
                  <div style={{
                    color: '#777', fontSize: '0.8rem', textAlign: 'center',
                    lineHeight: 1.6, fontStyle: 'italic',
                  }}>
                    {selectedCard.artworkDesc}
                  </div>
                </div>

                {/* Name */}
                <div style={{
                  color: RARITY_CONFIG[selectedCard.rarity].color,
                  fontFamily: 'Bebas Neue',
                  fontSize: '1.4rem',
                  letterSpacing: 2,
                  textAlign: 'center',
                }}>
                  {selectedCard.name}
                </div>

                {/* Flavor text */}
                <div style={{
                  color: '#999', fontSize: '0.8rem', textAlign: 'center',
                  fontStyle: 'italic', lineHeight: 1.5,
                }}>
                  {selectedCard.flavorText}
                </div>

                {/* Rarity + unlock info */}
                <div style={{
                  borderTop: `1px solid ${RARITY_CONFIG[selectedCard.rarity].borderColor}40`,
                  paddingTop: 10,
                  textAlign: 'center',
                }}>
                  <div style={{
                    color: RARITY_CONFIG[selectedCard.rarity].color,
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontFamily: 'Bebas Neue',
                  }}>
                    ★ {RARITY_CONFIG[selectedCard.rarity].label} ★
                  </div>
                  {collectedMap[selectedCard.id] && (
                    <div style={{ color: '#555', fontSize: '0.6rem', marginTop: 4 }}>
                      Collected {new Date(collectedMap[selectedCard.id].unlockedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div style={{ color: '#444', fontSize: '0.6rem', textAlign: 'center' }}>
                  Click to flip
                </div>
              </div>
            ) : (
              // Back
              <div style={{
                transform: 'rotateY(180deg)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                height: '100%', gap: 16,
              }}>
                <div style={{ fontSize: '3rem' }}>🎬</div>
                <div style={{
                  color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.2rem',
                  letterSpacing: 3,
                }}>
                  GREENLIGHT
                </div>
                <div style={{
                  width: 60, height: 2,
                  background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
                }} />
                <div style={{ color: '#666', fontSize: '0.75rem', textAlign: 'center' }}>
                  {selectedCard.unlockCondition}
                </div>
                <div style={{ color: '#444', fontSize: '0.6rem' }}>Click to flip back</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (inline) return content;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 750 }}>
        {content}
      </div>
    </div>
  );
}
