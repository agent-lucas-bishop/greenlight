import { useState } from 'react';
import { GameState, ProductionCard, CardRarity } from '../types';
import { workshopEnhance, workshopTransmute, workshopRemove, workshopDuplicate, skipWorkshop } from '../gameStore';
import { CardTypeBadge } from './CardComponents';
import { sfx } from '../sound';

const RARITY_STYLES: Record<CardRarity, { border: string; label: string; color: string }> = {
  common: { border: '1px solid rgba(255,255,255,0.15)', label: 'COMMON', color: '#aaa' },
  rare: { border: '2px solid #3498db', label: 'RARE', color: '#3498db' },
  epic: { border: '2px solid #9b59b6', label: 'EPIC', color: '#9b59b6' },
};

const TRANSMUTE_TARGETS = ['action', 'challenge', 'incident'] as const;

export default function CardWorkshop({ state }: { state: GameState }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const deck = state.workshopDeck;
  const selected = deck.find(c => c.id === selectedId) || null;

  return (
    <div className="screen" style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>🔧 Card Workshop</h2>
        <p style={{ color: '#aaa', fontSize: '0.85rem', margin: '0.5rem 0' }}>
          Upgrade your deck between seasons. Budget: <strong style={{ color: '#2ecc71' }}>${state.budget}M</strong>
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        {/* Deck list */}
        <div style={{ flex: '1 1 400px', maxHeight: '60vh', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.5rem' }}>Your Deck ({deck.length} cards)</h3>
          {deck.map(card => (
            <WorkshopCard
              key={card.id}
              card={card}
              isSelected={card.id === selectedId}
              onClick={() => setSelectedId(card.id === selectedId ? null : card.id)}
            />
          ))}
          {deck.length === 0 && <p style={{ color: '#666' }}>No cards in workshop deck.</p>}
        </div>

        {/* Upgrade panel */}
        <div style={{ flex: '0 0 280px' }}>
          {selected ? (
            <UpgradePanel card={selected} budget={state.budget} onDone={() => setSelectedId(null)} />
          ) : (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#666', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 8 }}>
              Click a card to see upgrade options
            </div>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button className="btn btn-primary btn-glow" onClick={() => { sfx.seasonTransition(); skipWorkshop(); }}>
          Continue to Next Season →
        </button>
      </div>
    </div>
  );
}

function WorkshopCard({ card, isSelected, onClick }: { card: ProductionCard; isSelected: boolean; onClick: () => void }) {
  const rarity = card.rarity || 'common';
  const rs = RARITY_STYLES[rarity];
  return (
    <div
      onClick={onClick}
      style={{
        border: isSelected ? '2px solid #f1c40f' : rs.border,
        borderRadius: 8,
        padding: '8px 12px',
        marginBottom: 6,
        cursor: 'pointer',
        background: isSelected ? 'rgba(241,196,15,0.08)' : 'rgba(255,255,255,0.02)',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <CardTypeBadge type={card.cardType} />
        <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{card.name}</span>
        <span style={{ color: card.baseQuality >= 0 ? '#2ecc71' : '#e74c3c', fontWeight: 700, fontSize: '0.8rem' }}>
          {card.baseQuality >= 0 ? '+' : ''}{card.baseQuality}
        </span>
        <span style={{ fontSize: '0.6rem', color: rs.color, fontWeight: 700, letterSpacing: '0.05em' }}>
          {rs.label}
        </span>
      </div>
      {card.synergyText && (
        <div style={{ fontSize: '0.65rem', color: '#9b59b6', marginTop: 2 }}>✨ {card.synergyText}</div>
      )}
      <div style={{ fontSize: '0.6rem', color: '#666', marginTop: 2 }}>from {card.source}</div>
    </div>
  );
}

function UpgradePanel({ card, budget, onDone }: { card: ProductionCard; budget: number; onDone: () => void }) {
  const actions = [
    { label: '⬆️ Enhance (+3 quality)', cost: 2, action: () => { sfx.workshopEnhance(); workshopEnhance(card.id); }, available: true },
    { label: '🔄 Transmute (change type)', cost: 3, action: null as (() => void) | null, available: true, isTransmute: true },
    { label: '🗑️ Remove (thin deck)', cost: 1, action: () => { sfx.workshopRemove(); workshopRemove(card.id); onDone(); }, available: true },
    { label: '📋 Duplicate (copy card)', cost: 4, action: () => { sfx.workshopDuplicate(); workshopDuplicate(card.id); }, available: true },
  ];

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '1rem' }}>
      <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.5rem' }}>Upgrade: {card.name}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {actions.map((a, i) => (
          a.isTransmute ? (
            <TransmuteButtons key={i} card={card} budget={budget} cost={a.cost} />
          ) : (
            <button
              key={i}
              className="btn"
              disabled={budget < a.cost}
              onClick={() => { sfx.purchase(); a.action!(); }}
              style={{ textAlign: 'left', fontSize: '0.8rem', opacity: budget < a.cost ? 0.4 : 1 }}
            >
              {a.label} <span style={{ color: '#e74c3c', float: 'right' }}>${a.cost}M</span>
            </button>
          )
        ))}
      </div>
    </div>
  );
}

function TransmuteButtons({ card, budget, cost }: { card: ProductionCard; budget: number; cost: number }) {
  const targets = TRANSMUTE_TARGETS.filter(t => t !== card.cardType);
  return (
    <div>
      <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: 4 }}>🔄 Transmute to... (${cost}M)</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {targets.map(t => (
          <button
            key={t}
            className="btn"
            disabled={budget < cost}
            onClick={() => { sfx.workshopTransmute(); workshopTransmute(card.id, t); }}
            style={{ fontSize: '0.7rem', flex: 1, opacity: budget < cost ? 0.4 : 1 }}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
