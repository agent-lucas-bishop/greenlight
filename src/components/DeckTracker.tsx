import { useState } from 'react';
import { ProductionState, ProductionCard } from '../types';

interface DeckTrackerProps {
  prod: ProductionState;
  lastCardValue?: number;
  studioArchetype: string | null;
}

const TAG_CONFIG: Record<string, { emoji: string; color: string }> = {
  momentum: { emoji: '🔥', color: '#e67e22' },
  precision: { emoji: '🎯', color: '#3498db' },
  chaos: { emoji: '💀', color: '#9b59b6' },
  heart: { emoji: '💕', color: '#e91e63' },
  spectacle: { emoji: '✨', color: '#f1c40f' },
};

function PillBar({ items, total }: { items: { label: string; count: number; color: string }[]; total: number }) {
  if (total === 0) return null;
  return (
    <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
      {items.filter(i => i.count > 0).map((item, idx) => (
        <div key={idx} style={{
          width: `${(item.count / total) * 100}%`,
          background: item.color,
          transition: 'width 0.3s ease',
        }} />
      ))}
    </div>
  );
}

export default function DeckTracker({ prod, lastCardValue, studioArchetype }: DeckTrackerProps) {
  const [expanded, setExpanded] = useState(false);

  if (prod.isWrapped) return null;

  const deck = prod.deck;
  const deckSize = deck.length;
  if (deckSize === 0) return null;

  // Deck composition
  const actionCards = deck.filter(c => c.cardType === 'action').length;
  const incidentCards = deck.filter(c => c.cardType === 'incident').length;
  const challengeCards = deck.filter(c => c.cardType === 'challenge').length;

  // Tag distribution in remaining deck
  const deckTags: Record<string, number> = {};
  for (const card of deck) {
    if (card.tags) {
      for (const tag of card.tags) {
        deckTags[tag] = (deckTags[tag] || 0) + 1;
      }
    }
  }

  // Running analytics
  const qualityDelta = lastCardValue !== undefined ? lastCardValue : null;
  const disasterThreshold = studioArchetype === 'chaos' ? 4 : 3;
  const incidentsRemaining = incidentCards;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8,
      marginBottom: 12,
      overflow: 'hidden',
    }}>
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          background: 'none',
          border: 'none',
          color: '#999',
          fontSize: '0.75rem',
          cursor: 'pointer',
        }}
      >
        <span>📊 Deck Tracker — {deckSize} cards remaining</span>
        <span style={{ fontSize: '0.65rem' }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Analytics line (always visible when cards have been drawn) */}
      {prod.drawCount > 0 && (
        <div style={{
          display: 'flex',
          gap: 12,
          padding: '0 12px 6px',
          fontSize: '0.7rem',
          color: '#888',
          flexWrap: 'wrap',
        }}>
          <span>
            Quality: <strong style={{ color: '#d4a843' }}>{prod.qualityTotal}</strong>
            {qualityDelta !== null && qualityDelta !== 0 && (
              <span style={{ color: qualityDelta > 0 ? '#2ecc71' : '#e74c3c', marginLeft: 4 }}>
                ({qualityDelta > 0 ? '+' : ''}{qualityDelta})
              </span>
            )}
          </span>
          <span style={{ color: incidentsRemaining > 0 ? '#e74c3c' : '#2ecc71' }}>
            ⚠️ {incidentsRemaining} incident{incidentsRemaining !== 1 ? 's' : ''} remain
          </span>
          {prod.incidentCount >= disasterThreshold - 1 && incidentsRemaining > 0 && (
            <span style={{ color: '#e74c3c', fontWeight: 600 }}>🚨 1 more = DISASTER</span>
          )}
        </div>
      )}

      {/* Expanded panel */}
      {expanded && (
        <div style={{ padding: '4px 12px 10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Card type breakdown */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: '0.65rem', color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Card Types
            </div>
            <PillBar
              total={deckSize}
              items={[
                { label: 'Action', count: actionCards, color: '#2ecc71' },
                { label: 'Challenge', count: challengeCards, color: '#f1c40f' },
                { label: 'Incident', count: incidentCards, color: '#e74c3c' },
              ]}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: '0.65rem' }}>
              <span style={{ color: '#2ecc71' }}>🟢 {actionCards} Action</span>
              <span style={{ color: '#f1c40f' }}>🟡 {challengeCards} Challenge</span>
              <span style={{ color: '#e74c3c' }}>🔴 {incidentCards} Incident</span>
            </div>
          </div>

          {/* Tag distribution in deck */}
          {Object.keys(deckTags).length > 0 && (
            <div>
              <div style={{ fontSize: '0.65rem', color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Tags in Deck
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(deckTags).sort((a, b) => b[1] - a[1]).map(([tag, count]) => {
                  const cfg = TAG_CONFIG[tag] || { emoji: '•', color: '#888' };
                  return (
                    <span key={tag} style={{ fontSize: '0.65rem', color: cfg.color }}>
                      {cfg.emoji} {tag}: {count}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Film tag totals so far */}
          {Object.keys(prod.tagsPlayed).length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: '0.65rem', color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Film Tags (Played)
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(prod.tagsPlayed).sort((a, b) => b[1] - a[1]).map(([tag, count]) => {
                  const cfg = TAG_CONFIG[tag] || { emoji: '•', color: '#888' };
                  return (
                    <span key={tag} style={{ fontSize: '0.65rem', color: cfg.color, fontWeight: 600 }}>
                      {cfg.emoji} {tag}: {count}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
