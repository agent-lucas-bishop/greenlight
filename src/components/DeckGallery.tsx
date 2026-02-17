// R300: Deck Gallery — Card Collection screen accessible from main menu
import { useState, useMemo } from 'react';
import { getCardRegistry, type RegistryCard, type CardRarityGallery, type CardCategory } from '../cardRegistry';
import { getGalleryState, getDiscoveredCount, type CardDiscoveryEntry } from '../deckGalleryTracker';

// ─── Constants ───

const RARITY_COLORS: Record<CardRarityGallery, string> = {
  common: '#888',
  uncommon: '#4CAF50',
  rare: '#3498db',
  legendary: '#f39c12',
};

const RARITY_BG: Record<CardRarityGallery, string> = {
  common: 'rgba(136,136,136,0.1)',
  uncommon: 'rgba(76,175,80,0.1)',
  rare: 'rgba(52,152,219,0.1)',
  legendary: 'rgba(243,156,18,0.15)',
};

const CARD_TYPE_EMOJI: Record<string, string> = {
  action: '🟢',
  challenge: '🟡',
  incident: '🔴',
};

const CATEGORY_LABELS: Record<CardCategory, string> = {
  genre: '🎬 Genre',
  talent: '🎭 Talent',
  marketing: '🔧 Crew',
  production: '🎬 Director',
  wild: '🃏 Wild',
};

const RARITIES: CardRarityGallery[] = ['common', 'uncommon', 'rare', 'legendary'];
const CATEGORIES: CardCategory[] = ['genre', 'talent', 'marketing', 'production', 'wild'];

type DiscoveryFilter = 'all' | 'discovered' | 'undiscovered';

interface Props {
  onClose: () => void;
}

export default function DeckGallery({ onClose }: Props) {
  const [filterRarity, setFilterRarity] = useState<CardRarityGallery | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<CardCategory | 'all'>('all');
  const [filterDiscovery, setFilterDiscovery] = useState<DiscoveryFilter>('all');
  const [selectedCard, setSelectedCard] = useState<RegistryCard | null>(null);

  const registry = useMemo(() => getCardRegistry(), []);
  const galleryState = useMemo(() => getGalleryState(), []);
  const discoveredCount = useMemo(() => getDiscoveredCount(), []);
  const totalCount = registry.length;
  const progressPct = totalCount > 0 ? Math.round((discoveredCount / totalCount) * 100) : 0;

  const filtered = useMemo(() => {
    let cards = [...registry];
    if (filterRarity !== 'all') cards = cards.filter(c => c.rarity === filterRarity);
    if (filterCategory !== 'all') cards = cards.filter(c => c.category === filterCategory);
    if (filterDiscovery === 'discovered') cards = cards.filter(c => !!galleryState.cards[c.id]);
    if (filterDiscovery === 'undiscovered') cards = cards.filter(c => !galleryState.cards[c.id]);
    // Sort: discovered first, then by rarity (legendary first), then name
    const rarityOrder: Record<string, number> = { legendary: 0, rare: 1, uncommon: 2, common: 3 };
    cards.sort((a, b) => {
      const aDisc = galleryState.cards[a.id] ? 0 : 1;
      const bDisc = galleryState.cards[b.id] ? 0 : 1;
      if (aDisc !== bDisc) return aDisc - bDisc;
      const aR = rarityOrder[a.rarity] ?? 9;
      const bR = rarityOrder[b.rarity] ?? 9;
      if (aR !== bR) return aR - bR;
      return a.name.localeCompare(b.name);
    });
    return cards;
  }, [registry, galleryState, filterRarity, filterCategory, filterDiscovery]);

  const entry = selectedCard ? galleryState.cards[selectedCard.id] : null;

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button onClick={onClose} style={styles.backBtn}>← Back</button>
          <h2 style={styles.title}>🃏 Card Collection</h2>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progressPct}%` }} />
          </div>
          <span style={styles.progressText}>
            {discoveredCount}/{totalCount} cards discovered ({progressPct}%)
          </span>
        </div>

        {/* Filters */}
        <div style={styles.filters}>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value as any)}
            style={styles.select}
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <select
            value={filterRarity}
            onChange={e => setFilterRarity(e.target.value as any)}
            style={styles.select}
          >
            <option value="all">All Rarities</option>
            {RARITIES.map(r => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
          <select
            value={filterDiscovery}
            onChange={e => setFilterDiscovery(e.target.value as any)}
            style={styles.select}
          >
            <option value="all">All Cards</option>
            <option value="discovered">Discovered</option>
            <option value="undiscovered">Undiscovered</option>
          </select>
        </div>

        {/* Card Grid */}
        <div style={styles.grid}>
          {filtered.map(card => {
            const discovered = !!galleryState.cards[card.id];
            return (
              <div
                key={card.id}
                style={{
                  ...styles.card,
                  borderColor: discovered ? RARITY_COLORS[card.rarity] : '#333',
                  background: discovered ? RARITY_BG[card.rarity] : 'rgba(20,20,20,0.9)',
                  cursor: 'pointer',
                  opacity: discovered ? 1 : 0.6,
                }}
                onClick={() => setSelectedCard(card)}
              >
                {discovered ? (
                  <>
                    <div style={{ ...styles.cardType, color: RARITY_COLORS[card.rarity] }}>
                      {CARD_TYPE_EMOJI[card.cardType]} {card.rarity.toUpperCase()}
                    </div>
                    <div style={styles.cardName}>{card.name}</div>
                    <div style={styles.cardSource}>{card.sourceName}</div>
                    <div style={styles.cardQuality}>
                      Base: {card.baseQuality > 0 ? '+' : ''}{card.baseQuality}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={styles.silhouette}>🂠</div>
                    <div style={styles.unknownText}>???</div>
                    <div style={styles.cardSource}>{card.sourceName}</div>
                  </>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={styles.empty}>No cards match your filters.</div>
          )}
        </div>

        {/* Detail Modal */}
        {selectedCard && (
          <CardDetailModal
            card={selectedCard}
            entry={entry}
            discovered={!!galleryState.cards[selectedCard.id]}
            onClose={() => setSelectedCard(null)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Detail Modal ───

function CardDetailModal({ card, entry, discovered, onClose }: {
  card: RegistryCard;
  entry: CardDiscoveryEntry | null;
  discovered: boolean;
  onClose: () => void;
}) {
  return (
    <div style={styles.detailOverlay} onClick={onClose}>
      <div style={styles.detailCard} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={styles.detailClose}>✕</button>
        {discovered ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>{CARD_TYPE_EMOJI[card.cardType]}</span>
              <h3 style={{ margin: 0, color: RARITY_COLORS[card.rarity], fontSize: 18 }}>{card.name}</h3>
            </div>
            <div style={styles.detailRow}>
              <span style={{ color: '#888' }}>Rarity:</span>
              <span style={{ color: RARITY_COLORS[card.rarity], fontWeight: 600 }}>
                {card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1)}
              </span>
            </div>
            <div style={styles.detailRow}>
              <span style={{ color: '#888' }}>Category:</span>
              <span>{CATEGORY_LABELS[card.category]}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={{ color: '#888' }}>Source:</span>
              <span>{card.sourceName}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={{ color: '#888' }}>Type:</span>
              <span>{card.cardType.charAt(0).toUpperCase() + card.cardType.slice(1)}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={{ color: '#888' }}>Base Quality:</span>
              <span>{card.baseQuality > 0 ? '+' : ''}{card.baseQuality}</span>
            </div>
            {card.tags && card.tags.length > 0 && (
              <div style={styles.detailRow}>
                <span style={{ color: '#888' }}>Tags:</span>
                <span>{card.tags.join(', ')}</span>
              </div>
            )}
            {card.genre && (
              <div style={styles.detailRow}>
                <span style={{ color: '#888' }}>Genre:</span>
                <span>{card.genre}</span>
              </div>
            )}
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, fontSize: 13, color: '#ccc', lineHeight: 1.5 }}>
              {card.description}
            </div>
            {entry && (
              <div style={{ marginTop: 16, padding: '8px 12px', background: 'rgba(243,156,18,0.08)', borderRadius: 8, border: '1px solid rgba(243,156,18,0.2)' }}>
                <div style={{ color: '#f39c12', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>📊 Usage Stats</div>
                <div style={styles.detailRow}>
                  <span style={{ color: '#888' }}>Times Used:</span>
                  <span>{entry.usageCount}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={{ color: '#888' }}>First Seen:</span>
                  <span>{new Date(entry.firstSeen).toLocaleDateString()}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={{ color: '#888' }}>Last Used:</span>
                  <span>{new Date(entry.lastUsed).toLocaleDateString()}</span>
                </div>
              </div>
            )}
            {card.unlockCondition && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#f39c12' }}>
                🔓 {card.unlockCondition}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🂠</div>
            <h3 style={{ color: '#555', margin: '0 0 8px' }}>Undiscovered Card</h3>
            <p style={{ color: '#666', fontSize: 13 }}>
              From: {card.sourceName}
            </p>
            <p style={{ color: '#555', fontSize: 12 }}>
              Draw this card during a run to discover it!
            </p>
            {card.unlockCondition && (
              <p style={{ color: '#f39c12', fontSize: 12, marginTop: 8 }}>
                🔓 {card.unlockCondition}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ───

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: '#0d0d0d',
    zIndex: 1000,
    overflowY: 'auto',
  },
  container: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '16px 12px 40px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  backBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid #333',
    color: '#ccc',
    padding: '6px 14px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
  },
  title: {
    margin: 0,
    color: '#f39c12',
    fontSize: 22,
    fontWeight: 700,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #f39c12, #e67e22)',
    borderRadius: 4,
    transition: 'width 0.5s ease',
  },
  progressText: {
    fontSize: 13,
    color: '#999',
  },
  filters: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap' as const,
    marginBottom: 16,
  },
  select: {
    background: '#1a1a1a',
    color: '#ccc',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 13,
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: 10,
  },
  card: {
    border: '1px solid #333',
    borderRadius: 10,
    padding: '12px 10px',
    minHeight: 110,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  cardType: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardName: {
    color: '#eee',
    fontWeight: 600,
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 1.2,
  },
  cardSource: {
    color: '#777',
    fontSize: 11,
    marginBottom: 4,
  },
  cardQuality: {
    color: '#aaa',
    fontSize: 11,
  },
  silhouette: {
    fontSize: 36,
    marginBottom: 4,
    filter: 'brightness(0.3)',
  },
  unknownText: {
    color: '#444',
    fontWeight: 700,
    fontSize: 16,
    letterSpacing: 2,
  },
  empty: {
    gridColumn: '1 / -1',
    textAlign: 'center' as const,
    color: '#555',
    padding: 40,
    fontSize: 14,
  },
  detailOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.8)',
    zIndex: 1100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  detailCard: {
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: 14,
    padding: '20px 24px',
    maxWidth: 400,
    width: '100%',
    position: 'relative' as const,
    color: '#ddd',
    maxHeight: '80vh',
    overflowY: 'auto' as const,
  },
  detailClose: {
    position: 'absolute' as const,
    top: 10,
    right: 14,
    background: 'none',
    border: 'none',
    color: '#666',
    fontSize: 18,
    cursor: 'pointer',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    marginBottom: 4,
    color: '#ccc',
  },
};
