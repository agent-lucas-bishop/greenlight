// R260: CraftingWorkshop — Workshop UI with Forge/Reroll/Enhance tabs
import { useState, useMemo, useCallback } from 'react';
import {
  loadMaterials,
  getCompatibleFusionPairs,
  executeFusion,
  getRerollOptions,
  executeReroll,
  getEnhanceOptions,
  executeEnhance,
  isCardEnhanced,
  getCraftingStats,
  type CraftingMaterials,
} from '../cardCrafting';
import CraftingRecipe from './CraftingRecipe';

interface Props {
  onClose?: () => void;
  inline?: boolean;
}

type CraftTab = 'forge' | 'reroll' | 'enhance';

const RARITY_COLORS: Record<string, string> = {
  common: '#aaa',
  rare: '#4fc3f7',
  epic: '#ba68c8',
  legendary: '#ffd54f',
};

export default function CraftingWorkshop({ onClose, inline }: Props) {
  const [tab, setTab] = useState<CraftTab>('forge');
  const [materials, setMaterials] = useState<CraftingMaterials>(() => loadMaterials());
  const [refreshKey, setRefreshKey] = useState(0);
  const [rerollResult, setRerollResult] = useState<{ cardId: string; newTrait: string } | null>(null);
  const [enhanceResult, setEnhanceResult] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setMaterials(loadMaterials());
    setRefreshKey(k => k + 1);
  }, []);

  const stats = useMemo(() => getCraftingStats(), [refreshKey]);
  const fusionPairs = useMemo(() => getCompatibleFusionPairs(), [refreshKey]);
  const rerollOptions = useMemo(() => getRerollOptions(), [refreshKey]);
  const enhanceOptions = useMemo(() => getEnhanceOptions(), [refreshKey]);

  const handleFuse = (card1Id: string, card2Id: string) => {
    const result = executeFusion(card1Id, card2Id);
    if (result) refresh();
  };

  const handleReroll = (cardId: string) => {
    const newTrait = executeReroll(cardId);
    if (newTrait) {
      setRerollResult({ cardId, newTrait });
      setTimeout(() => setRerollResult(null), 3000);
      refresh();
    }
  };

  const handleEnhance = (cardId: string) => {
    if (executeEnhance(cardId)) {
      setEnhanceResult(cardId);
      setTimeout(() => setEnhanceResult(null), 3000);
      refresh();
    }
  };

  const content = (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {!inline && onClose && (
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
      )}

      {/* Header */}
      <h2 style={{ textAlign: 'center', marginBottom: 4 }}>⚒️ Crafting Workshop</h2>

      {/* Materials bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 24,
        padding: '8px 16px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 8,
        marginBottom: 16,
        fontSize: 14,
      }}>
        <span>✨ <strong style={{ color: '#81d4fa' }}>{materials.starDust}</strong> Star Dust</span>
        <span>🏆 <strong style={{ color: '#ffd54f' }}>{materials.awardTokens}</strong> Award Tokens</span>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {([
          { id: 'forge' as CraftTab, emoji: '🔥', label: 'Forge', count: fusionPairs.length },
          { id: 'reroll' as CraftTab, emoji: '🎲', label: 'Reroll', count: rerollOptions.filter(o => o.possibleTraits.length > 0).length },
          { id: 'enhance' as CraftTab, emoji: '⭐', label: 'Enhance', count: enhanceOptions.filter(o => !o.alreadyEnhanced).length },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: '8px 4px',
              background: tab === t.id ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
              border: tab === t.id ? '1px solid rgba(255,215,0,0.4)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: tab === t.id ? '#fff' : '#999',
              fontWeight: tab === t.id ? 700 : 400,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {t.emoji} {t.label} <span style={{ fontSize: 11, color: '#888' }}>({t.count})</span>
          </button>
        ))}
      </div>

      {/* ─── FORGE TAB ─── */}
      {tab === 'forge' && (
        <div>
          <p style={{ fontSize: 12, color: '#888', textAlign: 'center', marginBottom: 12 }}>
            Combine two cards of the same role to forge a higher-tier card with merged traits.
          </p>
          {fusionPairs.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', padding: 32 }}>
              No compatible pairs found. Collect more cards of the same role!
            </div>
          ) : (
            fusionPairs.slice(0, 20).map((pair, i) => (
              <CraftingRecipe key={`${pair.card1.id}-${pair.card2.id}-${i}`} pair={pair} materials={materials} onFuse={handleFuse} />
            ))
          )}
        </div>
      )}

      {/* ─── REROLL TAB ─── */}
      {tab === 'reroll' && (
        <div>
          <p style={{ fontSize: 12, color: '#888', textAlign: 'center', marginBottom: 12 }}>
            Spend Star Dust to reroll a card's secondary trait. The new trait is randomly selected.
          </p>
          {rerollOptions.filter(o => o.possibleTraits.length > 0).length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', padding: 32 }}>No cards available for reroll.</div>
          ) : (
            rerollOptions.filter(o => o.possibleTraits.length > 0).map(opt => {
              const canAfford = materials.starDust >= opt.starDustCost;
              const justRerolled = rerollResult?.cardId === opt.cardId;
              return (
                <div key={opt.cardId} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: justRerolled ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.05)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 8,
                  border: `1px solid ${RARITY_COLORS[opt.card.rarity]}33`,
                  transition: 'all 0.3s ease',
                }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      <span style={{ color: RARITY_COLORS[opt.card.rarity] }}>{opt.card.name}</span>
                      <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>★{opt.card.skill} {opt.card.role}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                      Trait: <span style={{ color: '#f0c040' }}>{opt.currentTrait || 'None'}</span>
                      {justRerolled && (
                        <span style={{ color: '#4caf50', marginLeft: 8, animation: 'fadeInScale 0.3s ease-out' }}>
                          → {rerollResult.newTrait} ✓
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: canAfford ? '#81d4fa' : '#e57373', marginBottom: 4 }}>
                      ✨ {opt.starDustCost}
                    </div>
                    <button
                      onClick={() => handleReroll(opt.cardId)}
                      disabled={!canAfford}
                      style={{
                        padding: '4px 12px',
                        background: canAfford ? '#7c4dff' : '#555',
                        color: canAfford ? '#fff' : '#888',
                        border: 'none',
                        borderRadius: 5,
                        fontWeight: 600,
                        cursor: canAfford ? 'pointer' : 'not-allowed',
                        fontSize: 12,
                      }}
                    >
                      🎲 REROLL
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── ENHANCE TAB ─── */}
      {tab === 'enhance' && (
        <div>
          <p style={{ fontSize: 12, color: '#888', textAlign: 'center', marginBottom: 12 }}>
            Boost a card's star rating by +0.5. Each card can only be enhanced once.
          </p>
          {enhanceOptions.filter(o => !o.alreadyEnhanced).length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', padding: 32 }}>
              No eligible cards. All owned cards are already enhanced!
            </div>
          ) : (
            enhanceOptions.map(opt => {
              const canAfford = materials.starDust >= opt.starDustCost && materials.awardTokens >= opt.awardTokenCost;
              const justEnhanced = enhanceResult === opt.cardId;
              return (
                <div key={opt.cardId} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: opt.alreadyEnhanced ? 'rgba(255,215,0,0.08)' : justEnhanced ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.05)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 8,
                  border: `1px solid ${opt.alreadyEnhanced ? 'rgba(255,215,0,0.2)' : RARITY_COLORS[opt.card.rarity] + '33'}`,
                  opacity: opt.alreadyEnhanced ? 0.6 : 1,
                }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      <span style={{ color: RARITY_COLORS[opt.card.rarity] }}>{opt.card.name}</span>
                      {opt.alreadyEnhanced && <span style={{ color: '#ffd54f', marginLeft: 6, fontSize: 11 }}>✨ ENHANCED</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                      {opt.card.role} · ★{opt.currentSkill}
                      {!opt.alreadyEnhanced && <span style={{ color: '#4caf50' }}> → ★{opt.newSkill}</span>}
                    </div>
                  </div>
                  {!opt.alreadyEnhanced && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, marginBottom: 4 }}>
                        <span style={{ color: canAfford ? '#81d4fa' : '#e57373' }}>✨{opt.starDustCost}</span>
                        {' + '}
                        <span style={{ color: canAfford ? '#ffd54f' : '#e57373' }}>🏆{opt.awardTokenCost}</span>
                      </div>
                      <button
                        onClick={() => handleEnhance(opt.cardId)}
                        disabled={!canAfford}
                        style={{
                          padding: '4px 12px',
                          background: canAfford ? 'linear-gradient(135deg, #ffd54f, #ffab00)' : '#555',
                          color: canAfford ? '#000' : '#888',
                          border: 'none',
                          borderRadius: 5,
                          fontWeight: 600,
                          cursor: canAfford ? 'pointer' : 'not-allowed',
                          fontSize: 12,
                        }}
                      >
                        ⭐ ENHANCE
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Crafting stats footer */}
      <div style={{
        marginTop: 20,
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 8,
        fontSize: 11,
        color: '#666',
        textAlign: 'center',
      }}>
        Crafting History: {stats.totalFusions} fusions · {stats.totalRerolls} rerolls · {stats.totalEnhancements} enhancements
      </div>

      <style>{`
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );

  if (inline) return content;
  return <div className="modal-overlay"><div className="modal-content">{content}</div></div>;
}
