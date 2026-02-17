// ─── MOD CREATOR WIZARD ───
// R275: Step-by-step mod creation with preview & export

import { useState } from 'react';
import {
  createEmptyMod, createEmptyCard, createEmptyEvent, createEmptyModifier,
  encodeMod, saveAllMods, getAllMods, getModContentSummary,
  type GameMod, type ModTalentCard, type ModNarrativeEvent, type ModDifficultyModifier, type ModEventChoice,
} from '../modSystem';
import type { Genre, TalentType, CardRarity, CardTag } from '../types';
import { sfx } from '../sound';

const GENRES: Genre[] = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];
const ROLES: TalentType[] = ['Lead', 'Support', 'Director', 'Crew'];
const RARITIES: CardRarity[] = ['common', 'rare', 'epic'];
const TAGS: CardTag[] = ['momentum', 'precision', 'chaos', 'heart', 'spectacle'];

const inputStyle: React.CSSProperties = { background: '#222', border: '1px solid #444', borderRadius: 4, padding: '4px 8px', color: '#eee', fontSize: '0.8rem', width: '100%', boxSizing: 'border-box' };
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };
const btnStyle: React.CSSProperties = { background: '#333', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', color: '#aaa', fontSize: '0.75rem' };
const primaryBtn: React.CSSProperties = { ...btnStyle, background: 'var(--gold-dim)', color: '#000' };
const dangerBtn: React.CSSProperties = { ...btnStyle, background: 'rgba(204,68,68,0.2)', color: '#c66' };

/* ── Card Editor ─────────────────────────── */

function CardEditor({ card, onChange, onRemove }: { card: ModTalentCard; onChange: (c: ModTalentCard) => void; onRemove: () => void }) {
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: 10, marginBottom: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <input value={card.name} onChange={e => onChange({ ...card, name: e.target.value })} placeholder="Card name" maxLength={50} style={inputStyle} />
        <select value={card.role} onChange={e => onChange({ ...card, role: e.target.value as TalentType })} style={selectStyle}>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={card.rarity} onChange={e => onChange({ ...card, rarity: e.target.value as CardRarity })} style={selectStyle}>
          {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#888', fontSize: '0.7rem' }}>★</span>
          <input type="number" min={1} max={5} value={card.starRating} onChange={e => onChange({ ...card, starRating: Math.min(5, Math.max(1, +e.target.value || 1)) })} style={{ ...inputStyle, width: 50 }} />
        </div>
        <input value={card.trait} onChange={e => onChange({ ...card, trait: e.target.value })} placeholder="Trait (optional)" maxLength={60} style={inputStyle} />
        <select value={card.genreAffinity || ''} onChange={e => onChange({ ...card, genreAffinity: e.target.value as Genre || null })} style={selectStyle}>
          <option value="">No genre affinity</option>
          {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ color: '#888', fontSize: '0.65rem' }}>Tags:</span>
        {TAGS.map(t => (
          <button key={t} onClick={() => {
            const tags = card.tags.includes(t) ? card.tags.filter(x => x !== t) : [...card.tags, t];
            onChange({ ...card, tags });
          }}
            style={{ ...btnStyle, padding: '1px 6px', fontSize: '0.6rem', background: card.tags.includes(t) ? 'rgba(212,168,67,0.3)' : '#333', color: card.tags.includes(t) ? 'var(--gold)' : '#888' }}>
            {t}
          </button>
        ))}
        <button onClick={onRemove} style={{ ...dangerBtn, marginLeft: 'auto', padding: '1px 8px', fontSize: '0.6rem' }}>✕ Remove</button>
      </div>
    </div>
  );
}

/* ── Event Editor ─────────────────────────── */

function ChoiceEditor({ choice, onChange, onRemove }: { choice: ModEventChoice; onChange: (c: ModEventChoice) => void; onRemove: () => void }) {
  return (
    <div style={{ background: '#222', borderRadius: 4, padding: 8, marginBottom: 4 }}>
      <input value={choice.label} onChange={e => onChange({ ...choice, label: e.target.value })} placeholder="Choice label" maxLength={80} style={{ ...inputStyle, marginBottom: 4 }} />
      <input value={choice.outcome.description} onChange={e => onChange({ ...choice, outcome: { ...choice.outcome, description: e.target.value } })} placeholder="Outcome description" maxLength={200} style={{ ...inputStyle, marginBottom: 4 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
        <div><span style={{ color: '#888', fontSize: '0.6rem' }}>Budget</span><input type="number" min={-10} max={10} value={choice.outcome.budgetMod} onChange={e => onChange({ ...choice, outcome: { ...choice.outcome, budgetMod: Math.min(10, Math.max(-10, +e.target.value || 0)) } })} style={inputStyle} /></div>
        <div><span style={{ color: '#888', fontSize: '0.6rem' }}>Quality</span><input type="number" min={-5} max={5} value={choice.outcome.qualityMod} onChange={e => onChange({ ...choice, outcome: { ...choice.outcome, qualityMod: Math.min(5, Math.max(-5, +e.target.value || 0)) } })} style={inputStyle} /></div>
        <div><span style={{ color: '#888', fontSize: '0.6rem' }}>Rep</span><input type="number" min={-3} max={3} value={choice.outcome.reputationMod} onChange={e => onChange({ ...choice, outcome: { ...choice.outcome, reputationMod: Math.min(3, Math.max(-3, +e.target.value || 0)) } })} style={inputStyle} /></div>
      </div>
      <button onClick={onRemove} style={{ ...dangerBtn, padding: '1px 6px', fontSize: '0.6rem', marginTop: 4 }}>✕ Remove Choice</button>
    </div>
  );
}

function EventEditor({ event, onChange, onRemove }: { event: ModNarrativeEvent; onChange: (e: ModNarrativeEvent) => void; onRemove: () => void }) {
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: 10, marginBottom: 8 }}>
      <input value={event.title} onChange={e => onChange({ ...event, title: e.target.value })} placeholder="Event title" maxLength={80} style={{ ...inputStyle, marginBottom: 4 }} />
      <textarea value={event.description} onChange={e => onChange({ ...event, description: e.target.value })} placeholder="Event description" maxLength={500} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
      <div style={{ marginTop: 6 }}>
        <span style={{ color: '#aaa', fontSize: '0.7rem', fontWeight: 600 }}>Choices:</span>
        {event.choices.map((ch, i) => (
          <ChoiceEditor key={i} choice={ch} onChange={c => { const cs = [...event.choices]; cs[i] = c; onChange({ ...event, choices: cs }); }}
            onRemove={() => { if (event.choices.length > 1) onChange({ ...event, choices: event.choices.filter((_, j) => j !== i) }); }} />
        ))}
        <button onClick={() => onChange({ ...event, choices: [...event.choices, { label: '', outcome: { description: '', budgetMod: 0, qualityMod: 0, reputationMod: 0 } }] })} style={{ ...btnStyle, fontSize: '0.65rem', marginTop: 4 }}>+ Add Choice</button>
      </div>
      <button onClick={onRemove} style={{ ...dangerBtn, padding: '2px 8px', fontSize: '0.65rem', marginTop: 6 }}>✕ Remove Event</button>
    </div>
  );
}

/* ── Modifier Editor ─────────────────────── */

function ModifierEditor({ modifier, onChange, onRemove }: { modifier: ModDifficultyModifier; onChange: (m: ModDifficultyModifier) => void; onRemove: () => void }) {
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: 10, marginBottom: 8 }}>
      <input value={modifier.name} onChange={e => onChange({ ...modifier, name: e.target.value })} placeholder="Modifier name" maxLength={50} style={{ ...inputStyle, marginBottom: 4 }} />
      <input value={modifier.description} onChange={e => onChange({ ...modifier, description: e.target.value })} placeholder="Description" maxLength={200} style={{ ...inputStyle, marginBottom: 4 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <div><span style={{ color: '#888', fontSize: '0.6rem' }}>Budget ±$M</span><input type="number" min={-10} max={10} value={modifier.budgetAdjustment} onChange={e => onChange({ ...modifier, budgetAdjustment: Math.min(10, Math.max(-10, +e.target.value || 0)) })} style={inputStyle} /></div>
        <div><span style={{ color: '#888', fontSize: '0.6rem' }}>Quality ×</span><input type="number" min={0.5} max={2} step={0.1} value={modifier.qualityMultiplier} onChange={e => onChange({ ...modifier, qualityMultiplier: Math.min(2, Math.max(0.5, +e.target.value || 1)) })} style={inputStyle} /></div>
        <div><span style={{ color: '#888', fontSize: '0.6rem' }}>Incidents ×</span><input type="number" min={0.5} max={2} step={0.1} value={modifier.incidentFrequency} onChange={e => onChange({ ...modifier, incidentFrequency: Math.min(2, Math.max(0.5, +e.target.value || 1)) })} style={inputStyle} /></div>
      </div>
      <button onClick={onRemove} style={{ ...dangerBtn, padding: '2px 8px', fontSize: '0.65rem', marginTop: 6 }}>✕ Remove</button>
    </div>
  );
}

/* ── Main Wizard ─────────────────────────── */

export default function ModCreator({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [mod, setMod] = useState<GameMod>(() => createEmptyMod('', '', ''));
  const [exported, setExported] = useState(false);
  const [exportCode, setExportCode] = useState('');

  const updateContent = (patch: Partial<GameMod['content']>) => {
    setMod(prev => ({ ...prev, content: { ...prev.content, ...patch }, updatedAt: Date.now() }));
  };

  const canExport = mod.name.trim() && mod.author.trim();
  const totalItems = mod.content.cards.length + mod.content.events.length + mod.content.modifiers.length;

  const handleExport = () => {
    if (!canExport) return;
    const code = encodeMod(mod);
    setExportCode(code);
    // Also save to local registry
    const mods = getAllMods();
    const idx = mods.findIndex(m => m.id === mod.id);
    if (idx >= 0) mods[idx] = mod; else mods.push(mod);
    saveAllMods(mods);
    navigator.clipboard.writeText(code).then(() => {
      sfx.modExportChime();
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    });
  };

  const stepTitles = ['Info', 'Cards', 'Events', 'Modifiers', 'Export'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ color: '#ccc', fontSize: '0.85rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          ✨ Create Mod
        </h3>
        <button onClick={onClose} style={btnStyle}>← Back</button>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {stepTitles.map((title, i) => (
          <button key={i} onClick={() => setStep(i + 1)}
            style={{ flex: 1, background: step === i + 1 ? 'rgba(212,168,67,0.2)' : '#1a1a1a', border: `1px solid ${step === i + 1 ? 'var(--gold-dim)' : '#333'}`, borderRadius: 4, padding: '4px 0', cursor: 'pointer', color: step === i + 1 ? 'var(--gold)' : '#666', fontSize: '0.7rem', fontWeight: step === i + 1 ? 600 : 400 }}>
            {i + 1}. {title}
          </button>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <label style={{ color: '#888', fontSize: '0.7rem' }}>Mod Name *</label>
            <input value={mod.name} onChange={e => setMod({ ...mod, name: e.target.value })} placeholder="My Awesome Mod" maxLength={60} style={inputStyle} />
          </div>
          <div>
            <label style={{ color: '#888', fontSize: '0.7rem' }}>Author *</label>
            <input value={mod.author} onChange={e => setMod({ ...mod, author: e.target.value })} placeholder="Your name" maxLength={40} style={inputStyle} />
          </div>
          <div>
            <label style={{ color: '#888', fontSize: '0.7rem' }}>Description</label>
            <textarea value={mod.description} onChange={e => setMod({ ...mod, description: e.target.value })} placeholder="What does this mod add?" maxLength={300} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <button onClick={() => setStep(2)} disabled={!mod.name.trim() || !mod.author.trim()} style={mod.name.trim() && mod.author.trim() ? primaryBtn : btnStyle}>Next →</button>
        </div>
      )}

      {/* Step 2: Cards */}
      {step === 2 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: '#aaa', fontSize: '0.75rem', fontWeight: 600 }}>Talent Cards ({mod.content.cards.length})</span>
            <button onClick={() => updateContent({ cards: [...mod.content.cards, createEmptyCard()] })} style={btnStyle}>+ Add Card</button>
          </div>
          {mod.content.cards.length === 0 && (
            <div style={{ color: '#666', fontSize: '0.75rem', textAlign: 'center', padding: 16 }}>No cards yet. Add some!</div>
          )}
          {mod.content.cards.map((card, i) => (
            <CardEditor key={card.id} card={card}
              onChange={c => { const cards = [...mod.content.cards]; cards[i] = c; updateContent({ cards }); }}
              onRemove={() => updateContent({ cards: mod.content.cards.filter((_, j) => j !== i) })} />
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => setStep(1)} style={btnStyle}>← Back</button>
            <button onClick={() => setStep(3)} style={primaryBtn}>Next →</button>
          </div>
        </div>
      )}

      {/* Step 3: Events */}
      {step === 3 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: '#aaa', fontSize: '0.75rem', fontWeight: 600 }}>Narrative Events ({mod.content.events.length})</span>
            <button onClick={() => updateContent({ events: [...mod.content.events, createEmptyEvent()] })} style={btnStyle}>+ Add Event</button>
          </div>
          {mod.content.events.length === 0 && (
            <div style={{ color: '#666', fontSize: '0.75rem', textAlign: 'center', padding: 16 }}>No events yet.</div>
          )}
          {mod.content.events.map((ev, i) => (
            <EventEditor key={ev.id} event={ev}
              onChange={e => { const events = [...mod.content.events]; events[i] = e; updateContent({ events }); }}
              onRemove={() => updateContent({ events: mod.content.events.filter((_, j) => j !== i) })} />
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => setStep(2)} style={btnStyle}>← Back</button>
            <button onClick={() => setStep(4)} style={primaryBtn}>Next →</button>
          </div>
        </div>
      )}

      {/* Step 4: Modifiers */}
      {step === 4 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: '#aaa', fontSize: '0.75rem', fontWeight: 600 }}>Difficulty Modifiers ({mod.content.modifiers.length})</span>
            <button onClick={() => updateContent({ modifiers: [...mod.content.modifiers, createEmptyModifier()] })} style={btnStyle}>+ Add Modifier</button>
          </div>
          {mod.content.modifiers.length === 0 && (
            <div style={{ color: '#666', fontSize: '0.75rem', textAlign: 'center', padding: 16 }}>No modifiers yet.</div>
          )}
          {mod.content.modifiers.map((m, i) => (
            <ModifierEditor key={m.id} modifier={m}
              onChange={updated => { const mods = [...mod.content.modifiers]; mods[i] = updated; updateContent({ modifiers: mods }); }}
              onRemove={() => updateContent({ modifiers: mod.content.modifiers.filter((_, j) => j !== i) })} />
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => setStep(3)} style={btnStyle}>← Back</button>
            <button onClick={() => setStep(5)} style={primaryBtn}>Preview & Export →</button>
          </div>
        </div>
      )}

      {/* Step 5: Preview & Export */}
      {step === 5 && (
        <div>
          <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <h4 style={{ color: 'var(--gold)', margin: '0 0 8px', fontSize: '0.9rem' }}>{mod.name || 'Untitled'}</h4>
            <div style={{ fontSize: '0.75rem', color: '#888' }}>by {mod.author || '?'} • v{mod.version}</div>
            {mod.description && <p style={{ color: '#aaa', fontSize: '0.75rem', margin: '8px 0 0' }}>{mod.description}</p>}
            <div style={{ marginTop: 12, fontSize: '0.75rem', color: '#aaa' }}>
              <strong>Contents:</strong> {getModContentSummary(mod) || 'Nothing yet'}
            </div>
            {mod.content.cards.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <span style={{ color: '#888', fontSize: '0.7rem' }}>Cards: </span>
                {mod.content.cards.map((c, i) => (
                  <span key={i} style={{ display: 'inline-block', background: c.rarity === 'epic' ? 'rgba(155,89,182,0.2)' : c.rarity === 'rare' ? 'rgba(52,152,219,0.2)' : '#222', border: `1px solid ${c.rarity === 'epic' ? '#9b59b6' : c.rarity === 'rare' ? '#3498db' : '#444'}`, borderRadius: 4, padding: '1px 6px', margin: '2px', fontSize: '0.65rem', color: '#ccc' }}>
                    {'★'.repeat(c.starRating)} {c.name} <span style={{ color: '#888' }}>({c.role})</span>
                  </span>
                ))}
              </div>
            )}
            {mod.content.events.length > 0 && (
              <div style={{ marginTop: 6, fontSize: '0.7rem', color: '#888' }}>
                Events: {mod.content.events.map(e => e.title || 'Untitled').join(', ')}
              </div>
            )}
            {mod.content.modifiers.length > 0 && (
              <div style={{ marginTop: 6, fontSize: '0.7rem', color: '#888' }}>
                Modifiers: {mod.content.modifiers.map(m => m.name || 'Unnamed').join(', ')}
              </div>
            )}
          </div>

          {!canExport && (
            <div style={{ color: '#e74c3c', fontSize: '0.75rem', marginBottom: 8 }}>⚠️ Name and author are required to export.</div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setStep(4)} style={btnStyle}>← Back</button>
            <button onClick={handleExport} disabled={!canExport}
              style={canExport ? primaryBtn : btnStyle}>
              {exported ? '✓ Copied to clipboard!' : `📋 Export as glm_ code (${totalItems} items)`}
            </button>
          </div>

          {exportCode && (
            <div style={{ marginTop: 8 }}>
              <textarea readOnly value={exportCode} rows={4}
                style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.6rem', resize: 'vertical' }}
                onClick={e => (e.target as HTMLTextAreaElement).select()} />
              <div style={{ color: '#6c6', fontSize: '0.65rem', marginTop: 2 }}>Mod saved locally and code copied to clipboard. Share with others!</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
