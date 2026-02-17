// ─── Prestige Panel (R227) ───
// Accessible from StartScreen — shows prestige level, Star Power shop, cosmetics

import { useState } from 'react';
import {
  getPrestigeShop, PRESTIGE_UPGRADES, PRESTIGE_COSMETICS,
  canPurchaseUpgrade, purchaseUpgrade, equipCosmetic, unequipCosmetic,
  isCosmeticUnlocked, getPrestigeStarsDisplay,
  getActiveNGPPerks, getNextPrestigeReward,
  type PrestigeUpgrade, type PrestigeCosmetic,
} from '../prestigeShop';
import { sfx } from '../sound';

export default function PrestigePanel({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState(getPrestigeShop);
  const [tab, setTab] = useState<'upgrades' | 'cosmetics'>('upgrades');
  const [confirmPurchase, setConfirmPurchase] = useState<string | null>(null);

  const refresh = () => setState(getPrestigeShop());

  const handlePurchase = (upgradeId: string) => {
    const currentLevel = (state.upgrades[upgradeId] || 0) + 1;
    if (purchaseUpgrade(upgradeId)) {
      sfx.starPowerSpend();
      sfx.upgradeUnlock(Math.min(currentLevel, 5));
      refresh();
      setConfirmPurchase(null);
    }
  };

  const handleEquip = (cosmeticId: string) => {
    equipCosmetic(cosmeticId);
    sfx.cosmeticEquip();
    refresh();
  };

  const handleUnequip = (type: 'logoFrame' | 'cardBack' | 'uiTheme') => {
    unequipCosmetic(type);
    sfx.click();
    refresh();
  };

  const stars = getPrestigeStarsDisplay(state.prestigeLevel);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620, maxHeight: '85vh', overflow: 'auto' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: '2rem', marginBottom: 4 }}>{stars || '☆'}</div>
          <h2 style={{ color: 'var(--gold)', marginBottom: 4, fontFamily: 'Bebas Neue', fontSize: '1.6rem', letterSpacing: 2 }}>
            PRESTIGE {state.prestigeLevel > 0 ? state.prestigeLevel : ''}
          </h2>
          <div style={{ color: '#999', fontSize: '0.8rem' }}>
            {state.prestigeLevel === 0 ? 'Win on Mogul difficulty to begin your prestige journey' :
             state.prestigeLevel >= 10 ? '✨ Maximum Prestige Achieved ✨' :
             `Prestige Level ${state.prestigeLevel}/10`}
          </div>
        </div>

        {/* Star Power Balance */}
        <div style={{
          background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)',
          borderRadius: 12, padding: '12px 20px', textAlign: 'center', marginBottom: 20,
        }}>
          <div style={{ color: '#ffd700', fontFamily: 'Bebas Neue', fontSize: '1.8rem' }}>
            ⭐ {state.starPower} Star Power
          </div>
          <div style={{ color: '#888', fontSize: '0.7rem', marginTop: 4 }}>
            Total earned: {state.totalStarPowerEarned} | Prestige resets: {state.prestigeResetCount}
          </div>
          <div style={{ color: '#666', fontSize: '0.65rem', marginTop: 6 }}>
            Earn from: Mogul victories (15⭐), S-ranks (5⭐), A-ranks (2⭐), milestones, prestige resets
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
          {(['upgrades', 'cosmetics'] as const).map(t => (
            <button key={t} className="btn" onClick={() => { setTab(t); sfx.tabSwitch(); }} style={{
              background: tab === t ? 'rgba(212,168,67,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${tab === t ? 'var(--gold)' : '#444'}`,
              color: tab === t ? 'var(--gold)' : '#888',
              padding: '6px 20px', cursor: 'pointer', fontFamily: 'Bebas Neue',
              fontSize: '0.9rem', letterSpacing: 1, borderRadius: 6,
            }}>
              {t === 'upgrades' ? '🛒 Upgrades' : '🎨 Cosmetics'}
            </button>
          ))}
        </div>

        {/* Upgrades Tab */}
        {tab === 'upgrades' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PRESTIGE_UPGRADES.map(upgrade => {
              const currentLevel = state.upgrades[upgrade.id] || 0;
              const maxed = currentLevel >= upgrade.maxLevel;
              const cost = maxed ? 0 : upgrade.costPerLevel[currentLevel];
              const canBuy = canPurchaseUpgrade(upgrade.id);

              return (
                <div key={upgrade.id} style={{
                  background: maxed ? 'rgba(46,204,113,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${maxed ? 'rgba(46,204,113,0.3)' : '#333'}`,
                  borderRadius: 10, padding: '12px 16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '1.1rem', marginRight: 6 }}>{upgrade.emoji}</span>
                      <span style={{ color: '#eee', fontSize: '0.9rem', fontWeight: 600 }}>{upgrade.name}</span>
                      <span style={{ color: '#666', fontSize: '0.7rem', marginLeft: 8 }}>
                        Lv.{currentLevel}/{upgrade.maxLevel}
                      </span>
                    </div>
                    {!maxed && (
                      confirmPurchase === upgrade.id ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn" onClick={() => handlePurchase(upgrade.id)} style={{
                            background: 'rgba(46,204,113,0.2)', border: '1px solid #2ecc71',
                            color: '#2ecc71', padding: '4px 10px', cursor: 'pointer', fontSize: '0.7rem',
                          }}>✅ Buy</button>
                          <button className="btn" onClick={() => setConfirmPurchase(null)} style={{
                            background: 'rgba(255,255,255,0.05)', border: '1px solid #666',
                            color: '#999', padding: '4px 10px', cursor: 'pointer', fontSize: '0.7rem',
                          }}>✕</button>
                        </div>
                      ) : (
                        <button className="btn" onClick={() => setConfirmPurchase(upgrade.id)} disabled={!canBuy} style={{
                          background: canBuy ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${canBuy ? '#ffd700' : '#444'}`,
                          color: canBuy ? '#ffd700' : '#666',
                          padding: '4px 14px', cursor: canBuy ? 'pointer' : 'default',
                          fontSize: '0.75rem', fontFamily: 'Bebas Neue',
                        }}>
                          ⭐ {cost}
                        </button>
                      )
                    )}
                    {maxed && (
                      <span style={{ color: '#2ecc71', fontSize: '0.75rem', fontFamily: 'Bebas Neue' }}>MAX</span>
                    )}
                  </div>
                  <div style={{ color: '#888', fontSize: '0.7rem', marginTop: 4 }}>{upgrade.description}</div>
                  {currentLevel > 0 && (
                    <div style={{ color: '#2ecc71', fontSize: '0.65rem', marginTop: 2 }}>
                      Current: {upgrade.effectDescription(currentLevel)}
                    </div>
                  )}
                  {!maxed && (
                    <div style={{ color: '#999', fontSize: '0.65rem', marginTop: 2 }}>
                      Next: {upgrade.effectDescription(currentLevel + 1)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Cosmetics Tab */}
        {tab === 'cosmetics' && (
          <div>
            {(['logoFrame', 'cardBack', 'uiTheme'] as const).map(type => {
              const label = type === 'logoFrame' ? '🖼️ Logo Frames' : type === 'cardBack' ? '🃏 Card Backs' : '🎨 UI Themes';
              const items = PRESTIGE_COSMETICS.filter(c => c.type === type);
              const equipped = state.equippedCosmetics[type];

              return (
                <div key={type} style={{ marginBottom: 16 }}>
                  <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 8, fontFamily: 'Bebas Neue', letterSpacing: 1 }}>
                    {label}
                    {equipped && (
                      <button className="btn" onClick={() => handleUnequip(type)} style={{
                        marginLeft: 8, fontSize: '0.6rem', color: '#999', background: 'none',
                        border: '1px solid #555', padding: '2px 6px', cursor: 'pointer',
                      }}>Unequip</button>
                    )}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                    {items.map(cosmetic => {
                      const unlocked = isCosmeticUnlocked(cosmetic.id);
                      const isEquipped = equipped === cosmetic.id;

                      return (
                        <div key={cosmetic.id} onClick={() => unlocked && !isEquipped && handleEquip(cosmetic.id)} style={{
                          background: isEquipped ? 'rgba(212,168,67,0.12)' : unlocked ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.3)',
                          border: `1px solid ${isEquipped ? 'var(--gold)' : unlocked ? '#444' : '#222'}`,
                          borderRadius: 8, padding: '10px 8px', textAlign: 'center',
                          cursor: unlocked && !isEquipped ? 'pointer' : 'default',
                          opacity: unlocked ? 1 : 0.4,
                          transition: 'all 0.2s',
                        }}>
                          <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{cosmetic.emoji}</div>
                          <div style={{ color: unlocked ? '#eee' : '#666', fontSize: '0.75rem', fontWeight: 600 }}>{cosmetic.name}</div>
                          {isEquipped && <div style={{ color: 'var(--gold)', fontSize: '0.6rem', marginTop: 2 }}>EQUIPPED</div>}
                          {!unlocked && <div style={{ color: '#555', fontSize: '0.6rem', marginTop: 2 }}>🔒 {cosmetic.unlockCondition}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
