import { useState } from 'react';
import {
  type CustomCard, type CustomCardType, type CustomCardEffect,
  createBlankScript, createBlankTalent, createBlankEvent,
  addCustomCard, updateCustomCard, validateCard,
  getBalanceRating, getBalanceLabel, getBalanceScore,
  getSettings, saveSettings,
} from '../customCards';
import type { Genre, CardTag, SlotType, TalentType } from '../types';
import CustomCardLibrary from './CustomCardLibrary';
import { sfx } from '../sound';

const GENRES: Genre[] = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];
const TAGS: CardTag[] = ['momentum', 'precision', 'chaos', 'heart', 'spectacle'];
const SLOT_TYPES: SlotType[] = ['Lead', 'Support', 'Director', 'Crew', 'Wild'];
const TALENT_TYPES: TalentType[] = ['Lead', 'Support', 'Director', 'Crew'];

export default function CardCreator({ onClose }: { onClose: () => void }) {
  const [cardType, setCardType] = useState<CustomCardType>('script');
  const [editing, setEditing] = useState<CustomCard | null>(null);
  const [card, setCard] = useState<CustomCard>(createBlankScript());
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState('');
  const [view, setView] = useState<'create' | 'library'>('create');
  const [settings, setSettingsState] = useState(getSettings);

  const switchType = (t: CustomCardType) => {
    setCardType(t);
    setEditing(null);
    setCard(t === 'script' ? createBlankScript() : t === 'talent' ? createBlankTalent() : createBlankEvent());
    setErrors([]);
  };

  const editCard = (c: CustomCard) => {
    setEditing(c);
    setCardType(c.type);
    setCard({ ...c });
    setView('create');
    setErrors([]);
  };

  const updateEffect = (key: keyof CustomCardEffect, val: number) => {
    setCard(prev => ({ ...prev, cardEffect: { ...prev.cardEffect, [key]: val } }));
  };

  const handleSave = () => {
    const valErrors = validateCard(card);
    if (valErrors.length) { setErrors(valErrors.map(e => e.message)); return; }
    setErrors([]);
    if (editing) { updateCustomCard(card); setSaved('Updated!'); sfx.cardCreate(); }
    else { addCustomCard(card); setSaved('Saved!'); sfx.cardCreate(); setCard(cardType === 'script' ? createBlankScript() : cardType === 'talent' ? createBlankTalent() : createBlankEvent()); }
    setEditing(null);
    setTimeout(() => setSaved(''), 2000);
  };

  const toggleSetting = (key: 'enabled') => {
    const s = { ...settings, [key]: !settings[key] };
    setSettingsState(s); saveSettings(s);
  };
  const toggleMode = () => {
    const s = { ...settings, mode: settings.mode === 'mixed' ? 'custom-only' as const : 'mixed' as const };
    setSettingsState(s); saveSettings(s);
  };

  const balance = getBalanceLabel(getBalanceRating(card));
  const score = getBalanceScore(card);
  const e = card.cardEffect;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: 'var(--gold)', margin: 0, fontSize: '1.2rem' }}>🎨 Custom Card Creator</h2>
        {onClose && <button onClick={onClose} style={{ background: 'none', border: '1px solid #444', borderRadius: 4, padding: '4px 12px', color: '#888', cursor: 'pointer' }}>✕ Close</button>}
      </div>

      {/* Settings row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#aaa', cursor: 'pointer' }}>
          <input type="checkbox" checked={settings.enabled} onChange={() => toggleSetting('enabled')} /> Enable Custom Cards in Gameplay
        </label>
        {settings.enabled && (
          <button onClick={toggleMode} style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid #444', borderRadius: 4, padding: '3px 10px', fontSize: '0.7rem', color: 'var(--gold)', cursor: 'pointer' }}>
            Mode: {settings.mode === 'mixed' ? '🔀 Mixed' : '🎯 Custom Only'}
          </button>
        )}
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <button onClick={() => setView('create')} style={{ background: view === 'create' ? 'rgba(212,168,67,0.15)' : 'transparent', border: `1px solid ${view === 'create' ? 'var(--gold-dim)' : '#333'}`, borderRadius: 6, padding: '8px 16px', color: view === 'create' ? 'var(--gold)' : '#666', cursor: 'pointer', fontWeight: 600 }}>✏️ Create</button>
        <button onClick={() => setView('library')} style={{ background: view === 'library' ? 'rgba(212,168,67,0.15)' : 'transparent', border: `1px solid ${view === 'library' ? 'var(--gold-dim)' : '#333'}`, borderRadius: 6, padding: '8px 16px', color: view === 'library' ? 'var(--gold)' : '#666', cursor: 'pointer', fontWeight: 600 }}>📚 Library</button>
      </div>

      {view === 'library' && <CustomCardLibrary onEdit={editCard} />}

      {view === 'create' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16 }}>
          {/* Form */}
          <div>
            {/* Type selector */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {(['script', 'talent', 'event'] as const).map(t => (
                <button key={t} onClick={() => switchType(t)} style={{ flex: 1, background: cardType === t ? 'rgba(212,168,67,0.15)' : 'transparent', border: `1px solid ${cardType === t ? 'var(--gold-dim)' : '#333'}`, borderRadius: 6, padding: '8px 0', color: cardType === t ? 'var(--gold)' : '#666', cursor: 'pointer', fontWeight: 600 }}>
                  {t === 'script' ? '📝 Script' : t === 'talent' ? '🎭 Talent' : '⚡ Event'}
                </button>
              ))}
            </div>

            {/* Common fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={card.name} onChange={e => setCard(p => ({ ...p, name: e.target.value }))} placeholder="Card name..." maxLength={40} style={inputStyle} />
              <textarea value={card.description} onChange={e => setCard(p => ({ ...p, description: e.target.value }))} placeholder="Description / flavor text..." maxLength={200} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />

              {/* Type-specific fields */}
              {card.type === 'script' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label style={labelStyle}>Genre
                    <select value={card.genre} onChange={e => setCard(p => ({ ...p, genre: e.target.value as Genre }))} style={inputStyle}>
                      {GENRES.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </label>
                  <label style={labelStyle}>Cost ($M)
                    <input type="number" min={1} max={15} value={card.cost} onChange={e => setCard(p => ({ ...p, cost: +e.target.value }))} style={inputStyle} />
                  </label>
                  <label style={labelStyle}>Base Score
                    <input type="number" min={0} max={10} value={card.baseScore} onChange={e => setCard(p => ({ ...p, baseScore: +e.target.value }))} style={inputStyle} />
                  </label>
                  <label style={labelStyle}>Slots
                    <select multiple value={card.slots} onChange={e => setCard(p => ({ ...p, slots: Array.from(e.target.selectedOptions, o => o.value as SlotType) }))} style={{ ...inputStyle, height: 70 }}>
                      {SLOT_TYPES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </label>
                </div>
              )}

              {card.type === 'talent' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <label style={labelStyle}>Role
                    <select value={card.talentType} onChange={e => setCard(p => ({ ...p, talentType: e.target.value as TalentType }))} style={inputStyle}>
                      {TALENT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </label>
                  <label style={labelStyle}>Skill
                    <input type="number" min={1} max={5} value={card.skill} onChange={e => setCard(p => ({ ...p, skill: +e.target.value }))} style={inputStyle} />
                  </label>
                  <label style={labelStyle}>Cost ($M)
                    <input type="number" min={1} max={12} value={card.cost} onChange={e => setCard(p => ({ ...p, cost: +e.target.value }))} style={inputStyle} />
                  </label>
                </div>
              )}

              {/* Effects */}
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 12, border: '1px solid #333' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--gold)', marginBottom: 8, fontWeight: 600 }}>Card Effects</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label style={labelStyle}>Quality Bonus (-3 to +5)
                    <input type="number" min={-3} max={5} step={1} value={e.qualityBonus} onChange={ev => updateEffect('qualityBonus', +ev.target.value)} style={inputStyle} />
                  </label>
                  <label style={labelStyle}>BO Multiplier (0.5x - 2.0x)
                    <input type="number" min={0.5} max={2.0} step={0.1} value={e.boxOfficeMultiplier} onChange={ev => updateEffect('boxOfficeMultiplier', +ev.target.value)} style={inputStyle} />
                  </label>
                  <label style={labelStyle}>Budget Mod ($M)
                    <input type="number" min={-5} max={5} value={e.budgetMod} onChange={ev => updateEffect('budgetMod', +ev.target.value)} style={inputStyle} />
                  </label>
                  <label style={labelStyle}>Extra Slots (0-2)
                    <input type="number" min={0} max={2} value={e.extraSlots} onChange={ev => updateEffect('extraSlots', +ev.target.value)} style={inputStyle} />
                  </label>
                </div>
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', color: '#888', alignSelf: 'center' }}>Tags:</span>
                {TAGS.map(tag => (
                  <button key={tag} onClick={() => setCard(p => ({ ...p, tags: p.tags.includes(tag) ? p.tags.filter(t => t !== tag) : [...p.tags, tag] }))} style={{ background: card.tags.includes(tag) ? 'rgba(212,168,67,0.2)' : 'transparent', border: `1px solid ${card.tags.includes(tag) ? 'var(--gold-dim)' : '#444'}`, borderRadius: 4, padding: '2px 8px', fontSize: '0.7rem', color: card.tags.includes(tag) ? 'var(--gold)' : '#666', cursor: 'pointer' }}>{tag}</button>
                ))}
              </div>

              {errors.length > 0 && <div style={{ color: '#e66', fontSize: '0.75rem' }}>{errors.join(' · ')}</div>}
              {saved && <div style={{ color: '#6c6', fontSize: '0.8rem', fontWeight: 600 }}>{saved}</div>}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSave} style={{ flex: 1, background: 'var(--gold-dim)', border: 'none', borderRadius: 6, padding: '10px 0', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                  {editing ? '💾 Update Card' : '💾 Save Card'}
                </button>
                {editing && <button onClick={() => { setEditing(null); switchType(cardType); }} style={{ background: 'transparent', border: '1px solid #444', borderRadius: 6, padding: '10px 16px', color: '#888', cursor: 'pointer' }}>Cancel</button>}
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, border: '1px solid #333', padding: 16, position: 'sticky', top: 16 }}>
              <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Preview</div>
              <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: 8, padding: 14, border: '1px solid rgba(212,168,67,0.3)', minHeight: 200 }}>
                <div style={{ fontSize: '0.65rem', color: '#666', marginBottom: 4 }}>{card.type === 'script' ? '📝 SCRIPT' : card.type === 'talent' ? '🎭 TALENT' : '⚡ EVENT'}</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>{card.name || 'Untitled'}</div>
                {card.type === 'script' && <div style={{ fontSize: '0.7rem', color: '#8af', marginBottom: 2 }}>{card.genre} · {card.slots.length} slots</div>}
                {card.type === 'talent' && <div style={{ fontSize: '0.7rem', color: '#8af', marginBottom: 2 }}>{card.talentType} · Skill {card.skill}</div>}
                <div style={{ fontSize: '0.75rem', color: '#aaa', margin: '8px 0', fontStyle: 'italic', minHeight: 30 }}>{card.description || '...'}</div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, marginTop: 8 }}>
                  {card.type !== 'event' && <div style={{ fontSize: '0.7rem', color: '#ff9' }}>💰 ${card.cost}M</div>}
                  {e.qualityBonus !== 0 && <div style={{ fontSize: '0.7rem', color: e.qualityBonus > 0 ? '#6c6' : '#c66' }}>Quality {e.qualityBonus > 0 ? '+' : ''}{e.qualityBonus}</div>}
                  {e.boxOfficeMultiplier !== 1 && <div style={{ fontSize: '0.7rem', color: '#fc6' }}>BO ×{e.boxOfficeMultiplier.toFixed(1)}</div>}
                  {e.budgetMod !== 0 && <div style={{ fontSize: '0.7rem', color: e.budgetMod < 0 ? '#6c6' : '#c66' }}>Budget {e.budgetMod > 0 ? '+' : ''}{e.budgetMod}M</div>}
                  {card.tags.length > 0 && <div style={{ fontSize: '0.65rem', color: '#888', marginTop: 4 }}>{card.tags.join(' · ')}</div>}
                </div>
              </div>

              {/* Balance indicator */}
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem' }}>{balance.emoji}</div>
                <div style={{ fontSize: '0.75rem', color: balance.color, fontWeight: 600 }}>{balance.label}</div>
                <div style={{ fontSize: '0.6rem', color: '#555', marginTop: 2 }}>Score: {score.toFixed(1)}</div>
                <div style={{ height: 4, background: '#222', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, (score + 5) * 8))}%`, background: balance.color, borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = { background: '#1a1a1a', border: '1px solid #444', borderRadius: 4, padding: '6px 10px', color: '#ddd', fontSize: '0.8rem', width: '100%', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.7rem', color: '#888' };
