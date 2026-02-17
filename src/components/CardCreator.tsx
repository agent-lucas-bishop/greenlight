import { useState } from 'react';
import {
  type CrewCard, type CrewRole, type CrewRarity, type BalanceRating,
  CREW_ROLES, RARITIES, ALL_GENRES, ABILITY_POOL, RARITY_COLORS, ROLE_EMOJI,
  createBlankCrewCard, validateCrewCard, addWorkshopCard, updateWorkshopCard,
  deleteWorkshopCard, toggleWorkshopCardEnabled, getWorkshopCards,
  calculatePowerUsed, getPowerBudget, getBalanceRating, getBalanceColor,
  exportCard, importCard,
} from '../cardCreator';
import type { Genre, CardAbility } from '../types';
import { sfx } from '../sound';

type View = 'wizard' | 'collection';
type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export default function CardCreator({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<View>('wizard');
  const [step, setStep] = useState<WizardStep>(1);
  const [card, setCard] = useState<CrewCard>(createBlankCrewCard());
  const [editing, setEditing] = useState<CrewCard | null>(null);
  const [msg, setMsg] = useState('');
  const [importStr, setImportStr] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [cards, setCards] = useState(getWorkshopCards);

  const refresh = () => setCards(getWorkshopCards());

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const balance = getBalanceRating(card);
  const powerUsed = calculatePowerUsed(card);
  const powerBudget = getPowerBudget(card.rarity);
  const balanceColor = getBalanceColor(balance);

  const startEdit = (c: CrewCard) => {
    setEditing(c);
    setCard({ ...c });
    setStep(1);
    setView('wizard');
  };

  const resetWizard = () => {
    setEditing(null);
    setCard(createBlankCrewCard());
    setStep(1);
  };

  const handleSave = () => {
    const errors = validateCrewCard(card);
    if (errors.length) { flash('⚠️ ' + errors.map(e => e.message).join(' · ')); return; }
    if (editing) {
      updateWorkshopCard(card);
      flash('✅ Card updated!');
    } else {
      addWorkshopCard(card);
      flash('✅ Card saved!');
    }
    sfx.cardCreate();
    resetWizard();
    refresh();
  };

  const handleImport = () => {
    const { card: imported, error } = importCard(importStr);
    if (error) { flash('❌ ' + error); return; }
    if (imported) {
      const all = getWorkshopCards();
      all.push(imported);
      localStorage.setItem('greenlight-custom-cards', JSON.stringify(all));
      sfx.cardImport();
      flash(`✅ Imported "${imported.name}"!`);
      setImportStr('');
      setShowImport(false);
      refresh();
    }
  };

  const handleShare = (c: CrewCard) => {
    const b64 = exportCard(c);
    navigator.clipboard.writeText(b64).then(() => flash('📋 Copied share code!')).catch(() => flash('⚠️ Copy failed'));
  };

  const stepLabels = ['Role', 'Name', 'Genres', 'Stats', 'Ability', 'Preview'];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: 'var(--gold)', margin: 0, fontSize: '1.3rem' }}>🃏 WORKSHOP</h2>
        <button onClick={onClose} style={closeBtnStyle}>✕ Close</button>
      </div>

      {msg && <div style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid var(--gold-dim)', borderRadius: 6, padding: '8px 14px', marginBottom: 12, fontSize: '0.8rem', color: 'var(--gold)' }}>{msg}</div>}

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <button onClick={() => setView('wizard')} style={tabStyle(view === 'wizard')}>✏️ Create</button>
        <button onClick={() => { setView('collection'); refresh(); }} style={tabStyle(view === 'collection')}>📚 Collection ({cards.length})</button>
      </div>

      {view === 'wizard' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
          {/* Left: Wizard */}
          <div>
            {/* Step indicators */}
            <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>
              {stepLabels.map((label, i) => {
                const s = (i + 1) as WizardStep;
                const active = step === s;
                const done = step > s;
                return (
                  <button key={s} onClick={() => setStep(s)} style={{
                    flex: 1, padding: '6px 0', borderRadius: 4, border: 'none', cursor: 'pointer',
                    background: active ? 'rgba(212,168,67,0.2)' : done ? 'rgba(102,204,102,0.1)' : 'rgba(40,40,40,0.8)',
                    color: active ? 'var(--gold)' : done ? '#6c6' : '#555', fontSize: '0.7rem', fontWeight: 600,
                  }}>
                    {done ? '✓' : s}. {label}
                  </button>
                );
              })}
            </div>

            {/* Step 1: Role */}
            {step === 1 && (
              <div>
                <h3 style={stepTitle}>Pick a Role</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                  {CREW_ROLES.map(role => (
                    <button key={role} onClick={() => setCard(p => ({ ...p, role }))} style={{
                      padding: '16px 12px', borderRadius: 8, border: `2px solid ${card.role === role ? 'var(--gold)' : '#333'}`,
                      background: card.role === role ? 'rgba(212,168,67,0.15)' : 'rgba(30,30,30,0.8)',
                      color: card.role === role ? 'var(--gold)' : '#999', cursor: 'pointer', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '1.5rem' }}>{ROLE_EMOJI[role]}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 4 }}>{role}</div>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <button onClick={() => setStep(2)} style={nextBtnStyle}>Next →</button>
                </div>
              </div>
            )}

            {/* Step 2: Name + Flavor Text */}
            {step === 2 && (
              <div>
                <h3 style={stepTitle}>Name & Flavor Text</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={labelStyle}>Card Name
                    <input value={card.name} onChange={e => setCard(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Sofia Montero" maxLength={30} style={inputStyle} />
                  </label>
                  <label style={labelStyle}>Rarity
                    <div style={{ display: 'flex', gap: 4 }}>
                      {RARITIES.map(r => (
                        <button key={r} onClick={() => setCard(p => ({ ...p, rarity: r }))} style={{
                          flex: 1, padding: '6px 0', borderRadius: 4, cursor: 'pointer',
                          background: card.rarity === r ? `${RARITY_COLORS[r]}22` : 'transparent',
                          border: `1px solid ${card.rarity === r ? RARITY_COLORS[r] : '#333'}`,
                          color: card.rarity === r ? RARITY_COLORS[r] : '#555', fontSize: '0.7rem', fontWeight: 600,
                          textTransform: 'capitalize',
                        }}>{r}</button>
                      ))}
                    </div>
                  </label>
                  <label style={labelStyle}>Flavor Text (optional)
                    <textarea value={card.flavorText} onChange={e => setCard(p => ({ ...p, flavorText: e.target.value }))} placeholder="A witty description..." maxLength={120} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                  <button onClick={() => setStep(1)} style={backBtnStyle}>← Back</button>
                  <button onClick={() => setStep(3)} style={nextBtnStyle}>Next →</button>
                </div>
              </div>
            )}

            {/* Step 3: Genre Affinities */}
            {step === 3 && (
              <div>
                <h3 style={stepTitle}>Genre Affinities (1-3)</h3>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ALL_GENRES.map(g => {
                    const selected = card.genreAffinities.includes(g);
                    return (
                      <button key={g} onClick={() => {
                        setCard(p => ({
                          ...p,
                          genreAffinities: selected
                            ? p.genreAffinities.filter(x => x !== g)
                            : p.genreAffinities.length < 3 ? [...p.genreAffinities, g] : p.genreAffinities,
                        }));
                      }} style={{
                        padding: '10px 18px', borderRadius: 6, cursor: 'pointer',
                        background: selected ? 'rgba(212,168,67,0.2)' : 'transparent',
                        border: `1px solid ${selected ? 'var(--gold)' : '#444'}`,
                        color: selected ? 'var(--gold)' : '#888', fontSize: '0.85rem', fontWeight: 600,
                      }}>{g}</button>
                    );
                  })}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#666', marginTop: 8 }}>
                  Selected: {card.genreAffinities.length}/3
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                  <button onClick={() => setStep(2)} style={backBtnStyle}>← Back</button>
                  <button onClick={() => setStep(4)} style={nextBtnStyle} disabled={!card.genreAffinities.length}>Next →</button>
                </div>
              </div>
            )}

            {/* Step 4: Stats */}
            {step === 4 && (
              <div>
                <h3 style={stepTitle}>Set Stats</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={statBox}>
                    <div style={statLabel}>Quality Bonus Range</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label style={labelStyle}>Min ({card.qualityBonusMin})
                        <input type="range" min={0} max={5} value={card.qualityBonusMin} onChange={e => setCard(p => ({ ...p, qualityBonusMin: +e.target.value }))} style={{ width: '100%' }} />
                      </label>
                      <label style={labelStyle}>Max ({card.qualityBonusMax})
                        <input type="range" min={0} max={8} value={card.qualityBonusMax} onChange={e => setCard(p => ({ ...p, qualityBonusMax: +e.target.value }))} style={{ width: '100%' }} />
                      </label>
                    </div>
                  </div>
                  <div style={statBox}>
                    <div style={statLabel}>Salary Range ($M)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label style={labelStyle}>Min (${card.salaryMin}M)
                        <input type="range" min={1} max={10} value={card.salaryMin} onChange={e => setCard(p => ({ ...p, salaryMin: +e.target.value }))} style={{ width: '100%' }} />
                      </label>
                      <label style={labelStyle}>Max (${card.salaryMax}M)
                        <input type="range" min={1} max={15} value={card.salaryMax} onChange={e => setCard(p => ({ ...p, salaryMax: +e.target.value }))} style={{ width: '100%' }} />
                      </label>
                    </div>
                  </div>
                  {/* Power budget meter */}
                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 12, border: `1px solid ${balanceColor}44` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.75rem', color: '#aaa' }}>Power Budget</span>
                      <span style={{ fontSize: '0.75rem', color: balanceColor, fontWeight: 600 }}>
                        {powerUsed.toFixed(1)} / {powerBudget} ({balance.toUpperCase()})
                      </span>
                    </div>
                    <div style={{ height: 8, background: '#222', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 4, transition: 'width 0.3s, background 0.3s',
                        width: `${Math.min(100, (powerUsed / powerBudget) * 100)}%`,
                        background: balanceColor,
                      }} />
                    </div>
                    {balance === 'overpowered' && (
                      <div style={{ fontSize: '0.65rem', color: '#d44', marginTop: 4 }}>
                        ⚠️ OP cards get -10% quality penalty in gameplay
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                  <button onClick={() => setStep(3)} style={backBtnStyle}>← Back</button>
                  <button onClick={() => setStep(5)} style={nextBtnStyle}>Next →</button>
                </div>
              </div>
            )}

            {/* Step 5: Ability */}
            {step === 5 && (
              <div>
                <h3 style={stepTitle}>Special Ability</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                  {ABILITY_POOL.map(a => (
                    <button key={a} onClick={() => setCard(p => ({ ...p, ability: a }))} style={{
                      padding: '12px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                      background: card.ability === a ? 'rgba(212,168,67,0.15)' : 'rgba(30,30,30,0.8)',
                      border: `1px solid ${card.ability === a ? 'var(--gold)' : '#333'}`,
                      color: card.ability === a ? 'var(--gold)' : '#888',
                    }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}>{a === 'none' ? '— None —' : a}</div>
                      <div style={{ fontSize: '0.6rem', color: '#666', marginTop: 2 }}>{abilityDesc(a)}</div>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                  <button onClick={() => setStep(4)} style={backBtnStyle}>← Back</button>
                  <button onClick={() => setStep(6)} style={nextBtnStyle}>Preview →</button>
                </div>
              </div>
            )}

            {/* Step 6: Preview & Save */}
            {step === 6 && (
              <div>
                <h3 style={stepTitle}>Review & Save</h3>
                {(() => {
                  const errors = validateCrewCard(card);
                  return errors.length > 0 ? (
                    <div style={{ background: 'rgba(204,68,68,0.1)', border: '1px solid #644', borderRadius: 6, padding: 10, marginBottom: 12 }}>
                      {errors.map((e, i) => <div key={i} style={{ fontSize: '0.75rem', color: '#d66' }}>• {e.message}</div>)}
                    </div>
                  ) : null;
                })()}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleSave} style={{ flex: 1, background: 'var(--gold-dim)', border: 'none', borderRadius: 6, padding: '12px 0', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
                    {editing ? '💾 Update Card' : '💾 Save Card'}
                  </button>
                  <button onClick={() => setStep(4)} style={backBtnStyle}>← Back</button>
                  {editing && <button onClick={resetWizard} style={backBtnStyle}>Cancel</button>}
                </div>
              </div>
            )}
          </div>

          {/* Right: Live Preview */}
          <div>
            <CrewCardPreview card={card} balance={balance} powerUsed={powerUsed} powerBudget={powerBudget} />
          </div>
        </div>
      )}

      {/* Collection View */}
      {view === 'collection' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ color: '#999', fontSize: '0.8rem' }}>
              {cards.length} cards · {cards.filter(c => c.enabled).length} enabled
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setShowImport(!showImport)} style={smallBtn}>📥 Import</button>
            </div>
          </div>

          {showImport && (
            <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
              <input value={importStr} onChange={e => setImportStr(e.target.value)} placeholder="Paste share code..." style={{ ...inputStyle, flex: 1 }} />
              <button onClick={handleImport} disabled={!importStr.trim()} style={{ ...nextBtnStyle, opacity: importStr.trim() ? 1 : 0.4 }}>Import</button>
            </div>
          )}

          {cards.length === 0 && <div style={{ textAlign: 'center', color: '#666', padding: 40 }}>No cards yet. Create one in the wizard!</div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {cards.map(c => {
              const bal = getBalanceRating(c);
              const bColor = getBalanceColor(bal);
              return (
                <div key={c.id} style={{
                  background: c.enabled ? 'rgba(212,168,67,0.05)' : 'rgba(30,30,30,0.8)',
                  border: `1px solid ${c.enabled ? RARITY_COLORS[c.rarity] : '#333'}`,
                  borderRadius: 8, padding: 12, opacity: c.enabled ? 1 : 0.6,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: RARITY_COLORS[c.rarity] }}>
                      {ROLE_EMOJI[c.role]} {c.name || 'Untitled'}
                    </div>
                    <span style={{ fontSize: '0.6rem', color: bColor, fontWeight: 600, textTransform: 'uppercase' }}>{bal}</span>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#888', marginBottom: 2 }}>
                    {c.role} · {c.rarity} · Q{c.qualityBonusMin}-{c.qualityBonusMax} · ${c.salaryMin}-{c.salaryMax}M
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#666', marginBottom: 2 }}>{c.genreAffinities.join(', ')}</div>
                  {c.ability !== 'none' && <div style={{ fontSize: '0.6rem', color: 'var(--gold)' }}>⚡ {c.ability}</div>}
                  {c.flavorText && <div style={{ fontSize: '0.6rem', color: '#555', fontStyle: 'italic', marginTop: 2 }}>{c.flavorText}</div>}
                  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    <button onClick={() => { toggleWorkshopCardEnabled(c.id); refresh(); }} style={{
                      flex: 1, background: c.enabled ? 'rgba(102,204,102,0.15)' : 'rgba(100,100,100,0.15)',
                      border: '1px solid #444', borderRadius: 4, padding: '4px 0', fontSize: '0.65rem',
                      color: c.enabled ? '#8d8' : '#888', cursor: 'pointer',
                    }}>{c.enabled ? '✓ Enabled' : 'Disabled'}</button>
                    <button onClick={() => handleShare(c)} style={tinyBtn}>📤</button>
                    <button onClick={() => startEdit(c)} style={tinyBtn}>✏️</button>
                    <button onClick={() => { if (confirm(`Delete "${c.name}"?`)) { deleteWorkshopCard(c.id); refresh(); } }} style={{ ...tinyBtn, color: '#c66' }}>🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Card Preview Component ───

function CrewCardPreview({ card, balance, powerUsed, powerBudget }: {
  card: CrewCard; balance: BalanceRating; powerUsed: number; powerBudget: number;
}) {
  const bColor = getBalanceColor(balance);
  const rarityColor = RARITY_COLORS[card.rarity];

  return (
    <div style={{ position: 'sticky', top: 16 }}>
      <div style={{
        background: `linear-gradient(135deg, #1a1a2e 0%, ${rarityColor}11 100%)`,
        borderRadius: 12, border: `2px solid ${rarityColor}66`, padding: 16, minHeight: 280,
      }}>
        {/* Rarity banner */}
        <div style={{ fontSize: '0.6rem', color: rarityColor, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 4 }}>
          {card.rarity}
        </div>
        {/* Role */}
        <div style={{ fontSize: '0.65rem', color: '#666', marginBottom: 4 }}>{ROLE_EMOJI[card.role]} {card.role}</div>
        {/* Name */}
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>
          {card.name || 'Untitled'}
        </div>
        {/* Genre affinities */}
        {card.genreAffinities.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
            {card.genreAffinities.map(g => (
              <span key={g} style={{ background: 'rgba(212,168,67,0.15)', border: '1px solid var(--gold-dim)', borderRadius: 3, padding: '1px 6px', fontSize: '0.6rem', color: 'var(--gold)' }}>{g}</span>
            ))}
          </div>
        )}
        {/* Flavor text */}
        <div style={{ fontSize: '0.7rem', color: '#888', fontStyle: 'italic', minHeight: 20, marginBottom: 10 }}>
          {card.flavorText || '...'}
        </div>
        {/* Stats */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
          <div style={{ fontSize: '0.7rem', color: '#6c6' }}>⭐ Quality: {card.qualityBonusMin}-{card.qualityBonusMax}</div>
          <div style={{ fontSize: '0.7rem', color: '#fc6' }}>💰 Salary: ${card.salaryMin}-{card.salaryMax}M</div>
          {card.ability !== 'none' && (
            <div style={{ fontSize: '0.7rem', color: '#8af', marginTop: 2 }}>⚡ {card.ability}</div>
          )}
        </div>
        {/* Balance meter */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
            <span style={{ color: '#666' }}>Power</span>
            <span style={{ color: bColor }}>{powerUsed.toFixed(1)}/{powerBudget}</span>
          </div>
          <div style={{ height: 6, background: '#222', borderRadius: 3, overflow: 'hidden', marginTop: 3 }}>
            <div style={{
              height: '100%', borderRadius: 3, transition: 'width 0.3s',
              width: `${Math.min(100, (powerUsed / powerBudget) * 100)}%`,
              background: bColor,
            }} />
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.7rem', color: bColor, fontWeight: 600, marginTop: 4, textTransform: 'uppercase' }}>
            {balance}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───

function abilityDesc(a: CardAbility | 'none'): string {
  switch (a) {
    case 'none': return 'No special ability';
    case 'combo': return 'Bonus when played after same type';
    case 'momentum': return 'Grows stronger each turn';
    case 'wildcard': return 'Random powerful effect';
    case 'insurance': return 'Reduces incident damage';
    case 'spotlight': return 'Double quality if last card';
  }
}

// ─── Styles ───

const inputStyle: React.CSSProperties = { background: '#1a1a1a', border: '1px solid #444', borderRadius: 4, padding: '6px 10px', color: '#ddd', fontSize: '0.8rem', width: '100%', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.7rem', color: '#888' };
const stepTitle: React.CSSProperties = { color: 'var(--gold)', fontSize: '1rem', marginBottom: 12, marginTop: 0 };
const closeBtnStyle: React.CSSProperties = { background: 'none', border: '1px solid #444', borderRadius: 4, padding: '4px 12px', color: '#888', cursor: 'pointer' };
const nextBtnStyle: React.CSSProperties = { background: 'var(--gold-dim)', border: 'none', borderRadius: 6, padding: '8px 20px', color: '#000', fontWeight: 700, cursor: 'pointer' };
const backBtnStyle: React.CSSProperties = { background: 'transparent', border: '1px solid #444', borderRadius: 6, padding: '8px 20px', color: '#888', cursor: 'pointer' };
const smallBtn: React.CSSProperties = { background: 'rgba(212,168,67,0.1)', border: '1px solid #444', borderRadius: 4, padding: '4px 10px', color: 'var(--gold)', fontSize: '0.75rem', cursor: 'pointer' };
const tinyBtn: React.CSSProperties = { background: 'rgba(212,168,67,0.1)', border: '1px solid #444', borderRadius: 4, padding: '4px 8px', fontSize: '0.65rem', color: 'var(--gold)', cursor: 'pointer' };
const tabStyle = (active: boolean): React.CSSProperties => ({
  background: active ? 'rgba(212,168,67,0.15)' : 'transparent',
  border: `1px solid ${active ? 'var(--gold-dim)' : '#333'}`,
  borderRadius: 6, padding: '8px 16px', color: active ? 'var(--gold)' : '#666', cursor: 'pointer', fontWeight: 600,
});
const statBox: React.CSSProperties = { background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 12, border: '1px solid #333' };
const statLabel: React.CSSProperties = { fontSize: '0.75rem', color: 'var(--gold)', marginBottom: 8, fontWeight: 600 };
