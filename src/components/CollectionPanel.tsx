// R247: Collection Panel — full card collection browser
import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  getCardCatalog,
  getCollection,
  getCollectionStats,
  toggleFavorite,
  canTrade,
  tradeDuplicates,
  type CollectionCardDef,
  type CollectionCardRarity,
} from '../cardCollection';
import type { TalentType, Genre } from '../types';

const CardDetail = lazy(() => import('./CardDetail'));

const RARITY_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  common: { color: '#999', bg: 'rgba(150,150,150,0.08)', border: '#555' },
  rare: { color: '#3498db', bg: 'rgba(52,152,219,0.08)', border: '#2980b9' },
  epic: { color: '#9b59b6', bg: 'rgba(155,89,182,0.08)', border: '#8e44ad' },
  legendary: { color: '#f39c12', bg: 'rgba(243,156,18,0.08)', border: '#e67e22' },
};

const RARITY_ORDER: CollectionCardRarity[] = ['common', 'rare', 'epic', 'legendary'];
const ROLE_EMOJI: Record<string, string> = { Lead: '🎭', Support: '🎭', Director: '🎬', Crew: '🔧' };
const ROLES: TalentType[] = ['Lead', 'Support', 'Director', 'Crew'];
const GENRES: Genre[] = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];

type SortKey = 'name' | 'rarity' | 'timesAcquired' | 'firstDiscovered';
type DiscoveryFilter = 'all' | 'discovered' | 'undiscovered';

interface Props {
  onClose?: () => void;
  inline?: boolean;
}

export default function CollectionPanel({ onClose, inline }: Props) {
  const [filterRole, setFilterRole] = useState<TalentType | 'all'>('all');
  const [filterRarity, setFilterRarity] = useState<CollectionCardRarity | 'all'>('all');
  const [filterGenre, setFilterGenre] = useState<Genre | 'all'>('all');
  const [filterDiscovery, setFilterDiscovery] = useState<DiscoveryFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('rarity');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [tradeResult, setTradeResult] = useState<{ rarity: CollectionCardRarity; result: string | null; animating: boolean } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const catalog = useMemo(() => getCardCatalog(), []);
  const collection = useMemo(() => getCollection(), [refreshKey]);
  const stats = useMemo(() => getCollectionStats(), [refreshKey]);

  const filtered = useMemo(() => {
    let cards = [...catalog];

    if (filterRole !== 'all') cards = cards.filter(c => c.role === filterRole);
    if (filterRarity !== 'all') cards = cards.filter(c => c.rarity === filterRarity);
    if (filterGenre !== 'all') cards = cards.filter(c => c.genreAffinity === filterGenre);
    if (filterDiscovery === 'discovered') cards = cards.filter(c => !!collection.entries[c.id]);
    if (filterDiscovery === 'undiscovered') cards = cards.filter(c => !collection.entries[c.id]);

    cards.sort((a, b) => {
      const entryA = collection.entries[a.id];
      const entryB = collection.entries[b.id];
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'rarity': return RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
        case 'timesAcquired': return (entryB?.timesAcquired || 0) - (entryA?.timesAcquired || 0);
        case 'firstDiscovered': {
          if (!entryA && !entryB) return 0;
          if (!entryA) return 1;
          if (!entryB) return -1;
          return new Date(entryB.firstDiscovered).getTime() - new Date(entryA.firstDiscovered).getTime();
        }
        default: return 0;
      }
    });

    return cards;
  }, [catalog, collection, filterRole, filterRarity, filterGenre, filterDiscovery, sortBy]);

  const handleTrade = useCallback((rarity: CollectionCardRarity) => {
    if (!canTrade(rarity)) return;
    setTradeResult({ rarity, result: null, animating: true });
    setTimeout(() => {
      const result = tradeDuplicates(rarity);
      setTradeResult({ rarity, result, animating: false });
      setRefreshKey(k => k + 1);
      setTimeout(() => setTradeResult(null), 3000);
    }, 1200);
  }, []);

  const handleFavorite = useCallback((cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(cardId);
    setRefreshKey(k => k + 1);
  }, []);

  const selectedCard = selectedCardId ? catalog.find(c => c.id === selectedCardId) : null;
  const selectedEntry = selectedCardId ? collection.entries[selectedCardId] ?? null : null;

  const content = (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Progress Bar */}
      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.2rem', letterSpacing: '0.05em', marginBottom: 8 }}>
          🃏 Card Collection — {stats.discovered}/{stats.total} ({stats.percentage}%)
        </div>
        <div style={{ width: '100%', maxWidth: 400, margin: '0 auto', height: 8, background: '#222', borderRadius: 4, overflow: 'hidden' }}>
          <div
            className="collection-progress-bar"
            style={{
              width: `${stats.percentage}%`,
              height: '100%',
              background: stats.percentage >= 100
                ? 'linear-gradient(90deg, #ffd700, #f39c12, #ffd700)'
                : 'linear-gradient(90deg, #3498db, #2ecc71)',
              borderRadius: 4,
              transition: 'width 0.5s ease',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, fontSize: '0.7rem', color: '#888' }}>
          <span>✨ {stats.foilCount} Foils</span>
          <span>❤️ {stats.favoriteCount} Favorites</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value as any)} style={selectStyle}>
          <option value="all">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_EMOJI[r]} {r}</option>)}
        </select>
        <select value={filterRarity} onChange={e => setFilterRarity(e.target.value as any)} style={selectStyle}>
          <option value="all">All Rarities</option>
          {RARITY_ORDER.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
        <select value={filterGenre} onChange={e => setFilterGenre(e.target.value as any)} style={selectStyle}>
          <option value="all">All Genres</option>
          {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={filterDiscovery} onChange={e => setFilterDiscovery(e.target.value as any)} style={selectStyle}>
          <option value="all">All Cards</option>
          <option value="discovered">Discovered</option>
          <option value="undiscovered">Undiscovered</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} style={selectStyle}>
          <option value="rarity">Sort: Rarity</option>
          <option value="name">Sort: Name</option>
          <option value="timesAcquired">Sort: Times Acquired</option>
          <option value="firstDiscovered">Sort: Date Discovered</option>
        </select>
      </div>

      {/* Trade Duplicates */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        {(['common', 'rare', 'epic'] as CollectionCardRarity[]).map(rarity => {
          const tradeable = canTrade(rarity);
          const rc = RARITY_COLORS[rarity];
          const isAnimating = tradeResult?.animating && tradeResult.rarity === rarity;
          const justTraded = tradeResult && !tradeResult.animating && tradeResult.rarity === rarity;
          return (
            <button
              key={rarity}
              onClick={() => handleTrade(rarity)}
              disabled={!tradeable || !!tradeResult?.animating}
              className={isAnimating ? 'trade-btn-animating' : ''}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: '0.7rem', cursor: tradeable ? 'pointer' : 'default',
                background: tradeable ? rc.bg : 'rgba(255,255,255,0.02)',
                border: `1px solid ${tradeable ? rc.border : '#333'}`,
                color: tradeable ? rc.color : '#555',
                opacity: tradeable ? 1 : 0.4,
                transition: 'all 0.3s',
              }}
            >
              {isAnimating ? '🔄 Trading...' : justTraded
                ? (tradeResult.result ? `✅ Got: ${tradeResult.result}` : '❌ Failed')
                : `Trade 3× ${rarity} → 1× ${rarity === 'common' ? 'rare' : rarity === 'rare' ? 'epic' : 'legendary'}`}
            </button>
          );
        })}
      </div>

      {/* Card Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 10,
      }}>
        {filtered.map(card => {
          const entry = collection.entries[card.id];
          const discovered = !!entry;
          const rc = RARITY_COLORS[card.rarity];

          return (
            <div
              key={card.id}
              onClick={() => discovered && setSelectedCardId(card.id)}
              style={{
                padding: '12px 10px',
                borderRadius: 8,
                cursor: discovered ? 'pointer' : 'default',
                background: discovered ? rc.bg : 'rgba(0,0,0,0.3)',
                border: `1px solid ${discovered ? rc.border : '#222'}`,
                textAlign: 'center',
                transition: 'transform 0.2s, box-shadow 0.2s',
                position: 'relative',
                filter: discovered ? 'none' : 'grayscale(1) brightness(0.3)',
                minHeight: 120,
              }}
              onMouseEnter={e => { if (discovered) { (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 12px ${rc.border}40`; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
            >
              {entry?.isFoil && <div className="foil-shimmer-card" />}
              {/* Favorite */}
              {discovered && (
                <button
                  onClick={e => handleFavorite(card.id, e)}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: 2, lineHeight: 1 }}
                  aria-label={entry?.isFavorite ? 'Unpin' : 'Pin as favorite'}
                >
                  {entry?.isFavorite ? '❤️' : '🤍'}
                </button>
              )}
              <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>
                {discovered ? (ROLE_EMOJI[card.role] || '🎬') : '❓'}
              </div>
              <div style={{
                color: discovered ? rc.color : '#444',
                fontSize: '0.75rem', fontWeight: 700, marginBottom: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {discovered ? card.name : '???'}
              </div>
              <div style={{ color: '#888', fontSize: '0.6rem' }}>
                {card.role} · {card.rarity}
              </div>
              {discovered && entry && (
                <div style={{ color: '#888', fontSize: '0.55rem', marginTop: 4 }}>
                  ×{entry.timesAcquired}
                  {entry.isFoil && ' ✨'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔍</div>
          <div>No cards match these filters.</div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedCard && (
        <Suspense fallback={null}>
          <CardDetail
            card={selectedCard}
            entry={selectedEntry}
            onClose={() => setSelectedCardId(null)}
            onSelectCard={(id) => setSelectedCardId(id)}
          />
        </Suspense>
      )}
    </div>
  );

  if (inline) return content;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 900, maxHeight: '90vh', overflow: 'auto' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        {content}
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: '#1a1a1a', color: '#ccc', border: '1px solid #333',
  borderRadius: 6, padding: '6px 10px', fontSize: '0.7rem',
};
