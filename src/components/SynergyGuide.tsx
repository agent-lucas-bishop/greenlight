// R257: SynergyGuide — reference panel showing all possible synergies,
// which ones you've triggered historically, and hints for undiscovered ones.

import { useState, useEffect } from 'react';
import { getAllCombosForGuide, type ComboSynergy } from '../synergies';
import { getAllSynergiesForCodex, type CardSynergy } from '../cardSynergies';

const RARITY_COLORS: Record<string, string> = {
  common: '#8b9dc3',
  uncommon: '#4ade80',
  rare: '#a78bfa',
  legendary: '#fbbf24',
};

type TabId = 'combos' | 'cards';

interface SynergyGuideProps {
  onClose: () => void;
  inline?: boolean;
}

export default function SynergyGuide({ onClose, inline }: SynergyGuideProps) {
  const [tab, setTab] = useState<TabId>('combos');
  const [comboEntries, setComboEntries] = useState<Array<ComboSynergy & { discovered: boolean }>>([]);
  const [cardEntries, setCardEntries] = useState<Array<CardSynergy & { discovered: boolean }>>([]);
  const [filterRarity, setFilterRarity] = useState<string>('all');

  useEffect(() => {
    setComboEntries(getAllCombosForGuide());
    setCardEntries(getAllSynergiesForCodex());
  }, []);

  const entries = tab === 'combos' ? comboEntries : cardEntries;
  const filtered = filterRarity === 'all' ? entries : entries.filter(e => e.rarity === filterRarity);
  const discoveredCount = entries.filter(e => e.discovered).length;
  const totalCount = entries.length;

  const content = (
    <div className="synergy-guide-r257" style={{ color: '#eee' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: '1.3rem' }}>🔗 Synergy Guide</h2>
        <span style={{ color: '#aaa', fontSize: '0.85rem' }}>
          {discoveredCount}/{totalCount} Discovered
        </span>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => setTab('combos')}
          style={{
            padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === 'combos' ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.05)',
            color: tab === 'combos' ? '#fbbf24' : '#888', fontWeight: 600, fontSize: '0.85rem',
          }}
        >
          🌟 Strategic Combos ({comboEntries.filter(e => e.discovered).length}/{comboEntries.length})
        </button>
        <button
          onClick={() => setTab('cards')}
          style={{
            padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === 'cards' ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.05)',
            color: tab === 'cards' ? '#a78bfa' : '#888', fontWeight: 600, fontSize: '0.85rem',
          }}
        >
          🃏 Card Synergies ({cardEntries.filter(e => e.discovered).length}/{cardEntries.length})
        </button>
      </div>

      {/* Rarity filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {['all', 'common', 'uncommon', 'rare', 'legendary'].map(r => (
          <button
            key={r}
            onClick={() => setFilterRarity(r)}
            style={{
              padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: filterRarity === r ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)',
              color: r === 'all' ? '#ccc' : RARITY_COLORS[r] || '#ccc',
              fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase',
            }}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Entries grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
        {filtered.map(entry => (
          <div
            key={entry.id}
            style={{
              background: entry.discovered ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.3)',
              border: `1px solid ${entry.discovered ? RARITY_COLORS[entry.rarity] + '60' : '#333'}`,
              borderRadius: 10,
              padding: 12,
              transition: 'border-color 0.3s',
            }}
          >
            {entry.discovered ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700 }}>{entry.emoji} {entry.name}</span>
                  <span style={{ color: RARITY_COLORS[entry.rarity], fontSize: '0.65rem', textTransform: 'uppercase' }}>
                    {entry.rarity}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: 4 }}>{entry.description}</div>
                <div style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 600 }}>
                  {'effect' in entry ? (entry as CardSynergy & { discovered: boolean }).effect.label : (entry as ComboSynergy & { discovered: boolean }).effects.label}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ fontSize: '1.5em', marginBottom: 4 }}>🔒</div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>Undiscovered</div>
                <div style={{ fontSize: '0.7rem', color: RARITY_COLORS[entry.rarity], marginTop: 4 }}>
                  {entry.rarity.toUpperCase()}
                </div>
                {'hint' in entry && (
                  <div style={{ fontSize: '0.7rem', color: '#555', fontStyle: 'italic', marginTop: 4 }}>
                    {(entry as ComboSynergy & { discovered: boolean }).hint}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (inline) return content;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 750 }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        {content}
      </div>
    </div>
  );
}
