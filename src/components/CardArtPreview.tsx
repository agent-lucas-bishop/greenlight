// R264: Card Art Preview Gallery — shows all generated card arts
import { useMemo, useState } from 'react';
import { getCardCatalog, getCollection, type CollectionCardDef, type CollectionCardRarity } from '../cardCollection';
import type { TalentType } from '../types';
import CardArtwork from './CardArtwork';

const ROLES: TalentType[] = ['Director', 'Lead', 'Support', 'Crew'];
const RARITIES: CollectionCardRarity[] = ['common', 'rare', 'epic', 'legendary'];

const RARITY_COLORS: Record<string, string> = {
  common: '#999',
  rare: '#3498db',
  epic: '#9b59b6',
  legendary: '#f39c12',
};

interface Props {
  onClose?: () => void;
}

export default function CardArtPreview({ onClose }: Props) {
  const [filterRole, setFilterRole] = useState<TalentType | 'all'>('all');
  const [filterRarity, setFilterRarity] = useState<CollectionCardRarity | 'all'>('all');

  const catalog = useMemo(() => getCardCatalog(), []);
  const collection = useMemo(() => getCollection(), []);

  const filtered = useMemo(() => {
    let cards = [...catalog];
    if (filterRole !== 'all') cards = cards.filter(c => c.role === filterRole);
    if (filterRarity !== 'all') cards = cards.filter(c => c.rarity === filterRarity);
    return cards;
  }, [catalog, filterRole, filterRarity]);

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: 'var(--gold, #f39c12)', fontFamily: 'Bebas Neue', margin: 0, fontSize: '1.5rem', letterSpacing: '0.08em' }}>
          🎨 Card Art Gallery
        </h2>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #555', color: '#aaa', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>✕</button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value as TalentType | 'all')}
          style={{ background: '#1a1a2e', color: '#ccc', border: '1px solid #444', borderRadius: 4, padding: '4px 8px', fontSize: '0.8rem' }}>
          <option value="all">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filterRarity} onChange={e => setFilterRarity(e.target.value as CollectionCardRarity | 'all')}
          style={{ background: '#1a1a2e', color: '#ccc', border: '1px solid #444', borderRadius: 4, padding: '4px 8px', fontSize: '0.8rem' }}>
          <option value="all">All Rarities</option>
          {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <span style={{ color: '#666', fontSize: '0.75rem', alignSelf: 'center' }}>
          {filtered.length} cards
        </span>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 12,
      }}>
        {filtered.map((card: CollectionCardDef) => {
          const entry = collection.entries[card.id];
          const discovered = !!entry;
          return (
            <CardArtwork
              key={card.id}
              name={card.name}
              role={card.role as TalentType}
              rarity={card.rarity}
              isFoil={entry?.isFoil}
              style={{
                borderRadius: 10,
                border: `1px solid ${discovered ? (RARITY_COLORS[card.rarity] || '#555') : '#333'}`,
                opacity: discovered ? 1 : 0.4,
                height: 180,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                cursor: 'default',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
            >
              <div style={{
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                padding: '8px 10px',
                borderRadius: '0 0 9px 9px',
              }}>
                <div style={{
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {discovered ? card.name : '???'}
                </div>
                <div style={{
                  display: 'flex',
                  gap: 4,
                  marginTop: 2,
                }}>
                  <span style={{ color: RARITY_COLORS[card.rarity], fontSize: '0.6rem', textTransform: 'uppercase' }}>
                    {card.rarity}
                  </span>
                  <span style={{ color: '#888', fontSize: '0.6rem' }}>
                    {card.role}
                  </span>
                  {entry?.isFoil && <span style={{ fontSize: '0.6rem' }}>✨</span>}
                </div>
              </div>
            </CardArtwork>
          );
        })}
      </div>
    </div>
  );
}
