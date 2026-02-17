import { useState } from 'react';
import type { Difficulty, GameModifiers, Genre } from '../types';
import {
  DIFFICULTIES,
  MODIFIER_DEFS,
  DEFAULT_MODIFIERS,
  calculateCustomScoreMultiplier,
  ALL_GENRES,
  isAuteurUnlocked,
  isNGPlusUnlocked,
  loadLegacyDeck,
} from '../difficulty';
import { sfx } from '../sound';

interface Props {
  onSelect: (difficulty: Difficulty, modifiers?: GameModifiers) => void;
  onBack?: () => void;
}

export default function DifficultySelect({ onSelect, onBack }: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const [modifiers, setModifiers] = useState<GameModifiers>({ ...DEFAULT_MODIFIERS });

  const customMult = calculateCustomScoreMultiplier(modifiers);

  const auteurUnlocked = isAuteurUnlocked();

  const handlePresetClick = (d: (typeof DIFFICULTIES)[number]) => {
    // Lock check: Auteur requires completing one run
    if (d.id === 'auteur' && !auteurUnlocked) return;
    try {
      if (d.id === 'indie') sfx.difficultyIndie();
      else if (d.id === 'mogul' || d.id === 'nightmare' || d.id === 'auteur') sfx.difficultyMogul();
      else sfx.difficultyStudio();
    } catch {}
    onSelect(d.id);
  };

  const handleCustomConfirm = () => {
    try { sfx.difficultyStudio(); } catch {}
    onSelect('custom', modifiers);
  };

  const updateMod = <K extends keyof GameModifiers>(key: K, value: GameModifiers[K]) => {
    setModifiers(prev => ({ ...prev, [key]: value }));
  };

  if (showCustom) {
    return (
      <div className="fade-in" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h2 style={{ color: '#9b59b6', marginBottom: 8 }}>⚙️ Custom Difficulty</h2>
        <p style={{ color: '#888', marginBottom: 4, fontSize: '0.85rem' }}>
          Tweak individual modifiers to create your perfect challenge.
        </p>
        <div style={{
          display: 'inline-block', padding: '6px 16px', borderRadius: 8, marginBottom: 20,
          background: customMult >= 1.5 ? 'rgba(231,76,60,0.15)' : customMult >= 1.0 ? 'rgba(212,168,67,0.15)' : 'rgba(46,204,113,0.15)',
          border: `1px solid ${customMult >= 1.5 ? '#e74c3c' : customMult >= 1.0 ? 'var(--gold)' : '#2ecc71'}40`,
        }}>
          <span style={{ color: customMult >= 1.5 ? '#e74c3c' : customMult >= 1.0 ? 'var(--gold)' : '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>
            Score Multiplier: ×{customMult.toFixed(2)}
          </span>
        </div>

        <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MODIFIER_DEFS.map(def => {
            const value = modifiers[def.id];
            const impact = def.scoreImpact(value as any);
            const impactColor = impact > 1.05 ? '#e74c3c' : impact < 0.95 ? '#2ecc71' : '#888';

            return (
              <div key={def.id} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid #333',
                borderRadius: 8, padding: '12px 16px', textAlign: 'left',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div>
                    <span style={{ fontSize: '1rem', marginRight: 6 }}>{def.emoji}</span>
                    <span style={{ color: '#ccc', fontWeight: 600, fontSize: '0.85rem' }}>{def.name}</span>
                  </div>
                  <span style={{ color: impactColor, fontSize: '0.7rem', fontFamily: 'Bebas Neue' }}>
                    ×{impact.toFixed(2)}
                  </span>
                </div>
                <div style={{ color: '#888', fontSize: '0.7rem', marginBottom: 8 }}>{def.description}</div>

                {def.type === 'slider' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: '#666', fontSize: '0.75rem', minWidth: 36 }}>{def.min}</span>
                    <input
                      type="range"
                      min={def.min}
                      max={def.max}
                      step={def.step}
                      value={value as number}
                      onChange={e => updateMod(def.id, parseFloat(e.target.value) as any)}
                      style={{ flex: 1, accentColor: '#9b59b6' }}
                    />
                    <span style={{ color: '#ccc', fontSize: '0.85rem', fontWeight: 700, minWidth: 42, textAlign: 'right' }}>
                      {def.id === 'budgetAdjustment'
                        ? `${(value as number) >= 0 ? '+' : ''}$${value}M`
                        : def.id === 'cardDrawAdjustment'
                          ? `${(value as number) >= 0 ? '+' : ''}${value}`
                          : `${(value as number).toFixed(1)}×`}
                    </span>
                  </div>
                )}

                {def.type === 'toggle' && (
                  <div
                    onClick={() => updateMod(def.id, !value as any)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      cursor: 'pointer', padding: '4px 12px', borderRadius: 6,
                      background: value ? 'rgba(155,89,182,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${value ? '#9b59b6' : '#444'}`,
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ fontSize: '0.9rem' }}>{value ? '✅' : '⬜'}</span>
                    <span style={{ color: value ? '#9b59b6' : '#888', fontSize: '0.8rem', fontWeight: 600 }}>
                      {value ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                )}

                {def.type === 'genre' && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => updateMod('genreRestriction', null as any)}
                      style={{
                        padding: '4px 10px', borderRadius: 4, border: `1px solid ${!value ? '#9b59b6' : '#444'}`,
                        background: !value ? 'rgba(155,89,182,0.2)' : 'rgba(255,255,255,0.05)',
                        color: !value ? '#9b59b6' : '#888', fontSize: '0.75rem', cursor: 'pointer',
                      }}
                    >
                      Any
                    </button>
                    {ALL_GENRES.map(g => (
                      <button
                        key={g}
                        onClick={() => updateMod('genreRestriction', g as any)}
                        style={{
                          padding: '4px 10px', borderRadius: 4,
                          border: `1px solid ${value === g ? '#9b59b6' : '#444'}`,
                          background: value === g ? 'rgba(155,89,182,0.2)' : 'rgba(255,255,255,0.05)',
                          color: value === g ? '#9b59b6' : '#888', fontSize: '0.75rem', cursor: 'pointer',
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
          <button className="btn" onClick={() => setShowCustom(false)} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid #666',
            color: '#999', padding: '10px 24px', cursor: 'pointer',
          }}>
            ← Back
          </button>
          <button className="btn btn-primary" onClick={handleCustomConfirm} style={{
            background: 'rgba(155,89,182,0.2)', border: '1px solid #9b59b6',
            color: '#bb86fc', padding: '10px 24px', cursor: 'pointer',
            fontFamily: 'Bebas Neue', letterSpacing: 1,
          }}>
            Start with ×{customMult.toFixed(2)} multiplier 🎬
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ textAlign: 'center', padding: '40px 20px' }}>
      <h2 style={{ color: 'var(--gold)', marginBottom: 8 }}>Choose Difficulty</h2>
      <p style={{ color: '#888', marginBottom: 16, fontSize: '0.9rem' }}>How tough do you want Hollywood to be?</p>

      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 900, margin: '0 auto' }}>
        {DIFFICULTIES.map(d => {
          const isLocked = d.id === 'auteur' && !auteurUnlocked;
          return (
          <div
            key={d.id}
            className="card"
            onClick={() => handlePresetClick(d)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePresetClick(d); } }}
            tabIndex={isLocked ? -1 : 0}
            role="button"
            aria-label={isLocked ? `${d.name} (Locked — complete one run to unlock)` : `${d.name} (${d.label}): ${d.description}`}
            style={{
              cursor: isLocked ? 'not-allowed' : 'pointer', padding: 20, flex: '1 1 180px', maxWidth: 210, textAlign: 'center',
              transition: 'transform 0.2s, border-color 0.2s',
              borderColor: d.id === 'studio' ? 'rgba(212,168,67,0.3)' : undefined,
              opacity: isLocked ? 0.45 : 1,
              filter: isLocked ? 'grayscale(0.5)' : undefined,
            }}
            onMouseEnter={e => {
              if (isLocked) return;
              try { sfx.difficultyCompareHover(); } catch {}
              (e.currentTarget as HTMLElement).style.borderColor = d.color;
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = d.id === 'studio' ? 'rgba(212,168,67,0.3)' : '';
              (e.currentTarget as HTMLElement).style.transform = '';
            }}
          >
            {isLocked && (
              <div style={{ fontSize: '0.65rem', color: '#e74c3c', background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 4, padding: '2px 8px', marginBottom: 8, display: 'inline-block' }}>
                🔒 COMPLETE 1 RUN TO UNLOCK
              </div>
            )}
            {d.id === 'studio' && (
              <div style={{ fontSize: '0.65rem', color: 'var(--gold)', background: 'rgba(212,168,67,0.15)', border: '1px solid rgba(212,168,67,0.3)', borderRadius: 4, padding: '2px 8px', marginBottom: 8, display: 'inline-block' }}>
                DEFAULT
              </div>
            )}
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{isLocked ? '🔒' : d.emoji}</div>
            <div style={{ color: d.color, fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>{d.name}</div>
            <div style={{ color: '#999', fontSize: '0.7rem', fontFamily: 'Bebas Neue', letterSpacing: '0.05em', marginBottom: 8 }}>{d.label.toUpperCase()}</div>
            <div style={{ color: '#aaa', fontSize: '0.8rem', lineHeight: 1.5, marginBottom: 12 }}>{d.description}</div>

            {/* Score multiplier badge */}
            <div style={{
              display: 'inline-block', padding: '3px 10px', borderRadius: 4, marginBottom: 8,
              background: d.scoreMultiplier >= 1.5 ? 'rgba(231,76,60,0.15)' : d.scoreMultiplier >= 1.0 ? 'rgba(212,168,67,0.15)' : 'rgba(46,204,113,0.15)',
              border: `1px solid ${d.scoreMultiplier >= 1.5 ? '#e74c3c' : d.scoreMultiplier >= 1.0 ? 'var(--gold)' : '#2ecc71'}30`,
            }}>
              <span style={{ fontSize: '0.7rem', color: d.scoreMultiplier >= 1.5 ? '#e74c3c' : d.scoreMultiplier >= 1.0 ? 'var(--gold)' : '#2ecc71', fontFamily: 'Bebas Neue' }}>
                Score ×{d.scoreMultiplier.toFixed(1)}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.7rem', color: '#888', textAlign: 'left' }}>
              <span>💰 ${d.startBudget}M budget</span>
              <span>{'⭐'.repeat(d.startReputation)} reputation</span>
              <span>📅 {d.maxSeasons} seasons · {d.maxStrikes} strikes</span>
              {d.incidentFrequencyMod !== 1.0 && (
                <span style={{ color: d.incidentFrequencyMod < 1 ? '#2ecc71' : '#e74c3c' }}>
                  ⚠️ {d.incidentFrequencyMod < 1 ? `${Math.round((1 - d.incidentFrequencyMod) * 100)}% fewer` : `${Math.round((d.incidentFrequencyMod - 1) * 100)}% more`} incidents
                </span>
              )}
              {d.rivalAggressiveness !== 1.0 && (
                <span style={{ color: d.rivalAggressiveness < 1 ? '#2ecc71' : '#e74c3c' }}>
                  🏢 {d.rivalAggressiveness < 1 ? 'Passive' : 'Aggressive'} rivals
                </span>
              )}
              {d.noShopDiscounts && <span style={{ color: '#e74c3c' }}>🚫 No shop discounts</span>}
              {d.qualityThresholdMod !== 1.0 && (
                <span style={{ color: d.qualityThresholdMod > 1 ? '#e74c3c' : '#2ecc71' }}>
                  🎭 {d.qualityThresholdMod > 1 ? 'Harsher' : 'Forgiving'} critics
                </span>
              )}
              {d.cardDrawBonus !== 0 && (
                <span style={{ color: d.cardDrawBonus > 0 ? '#2ecc71' : '#e74c3c' }}>
                  🃏 {d.cardDrawBonus > 0 ? `+${d.cardDrawBonus}` : d.cardDrawBonus} card draw
                </span>
              )}
              {d.rerollLimit !== undefined && (
                <span style={{ color: '#e74c3c' }}>
                  🎲 Max {d.rerollLimit} reroll{d.rerollLimit !== 1 ? 's' : ''}
                </span>
              )}
              {d.boxOfficeMarginMod > 1 && (
                <span style={{ color: '#e74c3c' }}>
                  📊 Tighter BO margins
                </span>
              )}
            </div>
          </div>
          );
        })}

        {/* Custom Mode Card */}
        <div
          className="card"
          onClick={() => { try { sfx.modifierToggle(); } catch {} setShowCustom(true); }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowCustom(true); } }}
          tabIndex={0}
          role="button"
          aria-label="Custom difficulty: Pick your own modifiers"
          style={{
            cursor: 'pointer', padding: 20, flex: '1 1 180px', maxWidth: 210, textAlign: 'center',
            transition: 'transform 0.2s, border-color 0.2s',
            borderColor: 'rgba(155,89,182,0.3)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = '#9b59b6';
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(155,89,182,0.3)';
            (e.currentTarget as HTMLElement).style.transform = '';
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>⚙️</div>
          <div style={{ color: '#9b59b6', fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>Custom</div>
          <div style={{ color: '#999', fontSize: '0.7rem', fontFamily: 'Bebas Neue', letterSpacing: '0.05em', marginBottom: 8 }}>YOUR RULES</div>
          <div style={{ color: '#aaa', fontSize: '0.8rem', lineHeight: 1.5, marginBottom: 12 }}>Pick individual modifiers. Harder settings = higher score multiplier.</div>
          <div style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: 4,
            background: 'rgba(155,89,182,0.15)', border: '1px solid rgba(155,89,182,0.3)',
          }}>
            <span style={{ fontSize: '0.7rem', color: '#9b59b6', fontFamily: 'Bebas Neue' }}>
              Score ×???
            </span>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div style={{ marginTop: 28, maxWidth: 800, margin: '28px auto 0' }}>
        <div style={{ color: '#777', fontSize: '0.7rem', fontFamily: 'Bebas Neue', letterSpacing: '0.08em', marginBottom: 8, textAlign: 'center' }}>
          DETAILED COMPARISON
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', color: '#ccc' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(212,168,67,0.3)' }}>
                <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--gold)', fontWeight: 600 }}></th>
                {DIFFICULTIES.map(d => (
                  <th key={d.id} style={{ textAlign: 'center', padding: '8px 10px', color: d.color, fontWeight: 700 }}>
                    {d.emoji} {d.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Starting Budget', fmt: (d: (typeof DIFFICULTIES)[number]) => `$${d.startBudget}M` },
                { label: 'Starting Reputation', fmt: (d: (typeof DIFFICULTIES)[number]) => '⭐'.repeat(d.startReputation) },
                { label: 'Seasons / Strikes', fmt: (d: (typeof DIFFICULTIES)[number]) => `${d.maxSeasons} / ${d.maxStrikes}` },
                { label: 'Incident Rate', fmt: (d: (typeof DIFFICULTIES)[number]) => d.incidentFrequencyMod === 1 ? 'Normal' : d.incidentFrequencyMod < 1 ? `${Math.round((1 - d.incidentFrequencyMod) * 100)}% less` : `+${Math.round((d.incidentFrequencyMod - 1) * 100)}%` },
                { label: 'Rival Aggression', fmt: (d: (typeof DIFFICULTIES)[number]) => d.rivalAggressiveness < 1 ? 'Passive' : d.rivalAggressiveness > 1 ? `${d.rivalAggressiveness}×` : 'Normal' },
                { label: 'Score Multiplier', fmt: (d: (typeof DIFFICULTIES)[number]) => `×${d.scoreMultiplier.toFixed(1)}` },
              ].map(row => (
                <tr key={row.label} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '6px 10px', color: '#999', fontWeight: 500 }}>{row.label}</td>
                  {DIFFICULTIES.map(d => (
                    <td key={d.id} style={{ textAlign: 'center', padding: '6px 10px' }}>
                      {row.fmt(d)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {onBack && (
        <div style={{ marginTop: 24 }}>
          <button className="btn" onClick={onBack} style={{ color: '#888', borderColor: '#555' }}>← Back</button>
        </div>
      )}
    </div>
  );
}
