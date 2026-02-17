/**
 * R256: Challenge Editor — step-by-step wizard UI for creating custom challenges
 */

import { useState } from 'react';
import {
  CustomChallenge, ChallengeObjective,
  createDefaultChallenge, validateChallenge, encodeChallenge, buildShareableUrl,
  OBJECTIVE_POOL, STARTING_CARD_POOL, WIN_CONDITION_OPTIONS,
} from '../challengeEditor';
import type { Genre } from '../types';
import type { WinCondition } from '../challengeEditor';

const GENRES: Genre[] = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];
const STEPS = ['Name & Description', 'Rules & Modifiers', 'Starting Cards', 'Objectives', 'Preview & Share'];

export function ChallengeEditor({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState(0);
  const [challenge, setChallenge] = useState<CustomChallenge>(createDefaultChallenge());
  const [copied, setCopied] = useState(false);
  const [customObjText, setCustomObjText] = useState('');

  const update = (patch: Partial<CustomChallenge>) => setChallenge(prev => ({ ...prev, ...patch }));
  const errors = validateChallenge(challenge);
  const canFinish = step === 4 && errors.length === 0 && challenge.name.trim();

  // ─── Step 1: Name + Description ───
  const renderStep1 = () => (
    <div>
      <label style={{ display: 'block', marginBottom: 8, color: '#ccc', fontSize: '0.8rem' }}>Challenge Name *</label>
      <input
        type="text" maxLength={50} value={challenge.name}
        onChange={e => update({ name: e.target.value })}
        placeholder="e.g. Horror Marathon"
        style={inputStyle}
      />
      <label style={{ display: 'block', marginBottom: 8, marginTop: 16, color: '#ccc', fontSize: '0.8rem' }}>Description</label>
      <textarea
        maxLength={200} value={challenge.desc}
        onChange={e => update({ desc: e.target.value })}
        placeholder="Describe the challenge..."
        style={{ ...inputStyle, height: 80, resize: 'vertical' }}
      />
      <div style={{ color: '#666', fontSize: '0.7rem', marginTop: 4 }}>{challenge.desc.length}/200</div>
      <label style={{ display: 'block', marginBottom: 8, marginTop: 16, color: '#ccc', fontSize: '0.8rem' }}>Author (optional)</label>
      <input
        type="text" maxLength={30} value={challenge.author || ''}
        onChange={e => update({ author: e.target.value || undefined })}
        placeholder="Your name"
        style={inputStyle}
      />
    </div>
  );

  // ─── Step 2: Rules (genre/budget/modifiers) ───
  const renderStep2 = () => (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Genre Lock</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <button className="btn btn-small" style={challenge.genre === null ? activeBtn : dimBtn} onClick={() => update({ genre: null })}>Any</button>
          {GENRES.map(g => (
            <button key={g} className="btn btn-small" style={challenge.genre === g ? activeBtn : dimBtn} onClick={() => update({ genre: g })}>{g}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Budget Override ($M)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={challenge.budget !== null} onChange={e => update({ budget: e.target.checked ? 15 : null })} />
          {challenge.budget !== null && (
            <input type="range" min={1} max={50} value={challenge.budget} onChange={e => update({ budget: Number(e.target.value) })} style={{ flex: 1 }} />
          )}
          {challenge.budget !== null && <span style={{ color: '#2ecc71', fontFamily: 'Bebas Neue' }}>${challenge.budget}M</span>}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Turn Limit (seasons)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={challenge.turnLimit !== null} onChange={e => update({ turnLimit: e.target.checked ? 5 : null })} />
          {challenge.turnLimit !== null && (
            <input type="range" min={1} max={12} value={challenge.turnLimit} onChange={e => update({ turnLimit: Number(e.target.value) })} style={{ flex: 1 }} />
          )}
          {challenge.turnLimit !== null && <span style={{ color: '#3498db', fontFamily: 'Bebas Neue' }}>{challenge.turnLimit} seasons</span>}
        </div>
      </div>

      <label style={labelStyle}>Difficulty Modifiers</label>
      <div style={{ display: 'grid', gap: 8 }}>
        <ModSlider label="💰 Budget Adj" value={challenge.modifiers.budgetAdjustment} min={-10} max={10} step={1} suffix="$M"
          onChange={v => update({ modifiers: { ...challenge.modifiers, budgetAdjustment: v } })} />
        <ModSlider label="👊 Rival Aggr." value={challenge.modifiers.rivalAggressiveness} min={0.5} max={2} step={0.1} suffix="×"
          onChange={v => update({ modifiers: { ...challenge.modifiers, rivalAggressiveness: v } })} />
        <ModSlider label="⚠️ Incidents" value={challenge.modifiers.incidentFrequency} min={0} max={2} step={0.1} suffix="×"
          onChange={v => update({ modifiers: { ...challenge.modifiers, incidentFrequency: v } })} />
        <ModSlider label="📈 Market Vol." value={challenge.modifiers.marketVolatility} min={0.5} max={2} step={0.1} suffix="×"
          onChange={v => update({ modifiers: { ...challenge.modifiers, marketVolatility: v } })} />
        <ModSlider label="🃏 Card Draw" value={challenge.modifiers.cardDrawAdjustment} min={-2} max={2} step={1} suffix=""
          onChange={v => update({ modifiers: { ...challenge.modifiers, cardDrawAdjustment: v } })} />
        <ModToggle label="🚫 No Legendary" checked={challenge.modifiers.noLegendary}
          onChange={v => update({ modifiers: { ...challenge.modifiers, noLegendary: v } })} />
        <ModToggle label="⚡ Speed Mode" checked={challenge.modifiers.speedMode}
          onChange={v => update({ modifiers: { ...challenge.modifiers, speedMode: v } })} />
        <ModToggle label="💀 Iron Man" checked={challenge.modifiers.ironMan}
          onChange={v => update({ modifiers: { ...challenge.modifiers, ironMan: v } })} />
      </div>
    </div>
  );

  // ─── Step 3: Starting Cards ───
  const renderStep3 = () => (
    <div>
      <label style={labelStyle}>Pick Starting Cards (max 5)</label>
      <p style={{ color: '#888', fontSize: '0.75rem', margin: '0 0 12px' }}>These cards will be available at the start of the run.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {STARTING_CARD_POOL.map(card => {
          const selected = challenge.startingCards.includes(card);
          return (
            <button
              key={card}
              className="btn btn-small"
              style={selected ? { ...activeBtn, background: 'rgba(46,204,113,0.15)' } : dimBtn}
              onClick={() => {
                if (selected) update({ startingCards: challenge.startingCards.filter(c => c !== card) });
                else if (challenge.startingCards.length < 5) update({ startingCards: [...challenge.startingCards, card] });
              }}
            >
              {selected ? '✅ ' : ''}{card}
            </button>
          );
        })}
      </div>
      <div style={{ color: '#888', fontSize: '0.7rem', marginTop: 8 }}>{challenge.startingCards.length}/5 selected</div>
    </div>
  );

  // ─── Step 4: Objectives & Win Condition ───
  const renderStep4 = () => (
    <div>
      <label style={labelStyle}>Win Condition</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {WIN_CONDITION_OPTIONS.map(opt => {
          const active = challenge.winCondition.type === opt.type;
          return (
            <button key={opt.type} className="btn btn-small" style={active ? activeBtn : dimBtn}
              onClick={() => {
                const wc: WinCondition = opt.hasTarget
                  ? { type: opt.type, target: opt.defaultTarget } as WinCondition
                  : { type: 'survive' };
                update({ winCondition: wc });
              }}
            >
              {opt.emoji} {opt.label}
            </button>
          );
        })}
      </div>
      {challenge.winCondition.type !== 'survive' && 'target' in challenge.winCondition && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Target Value</label>
          <input type="number" value={(challenge.winCondition as any).target} min={1} max={999}
            onChange={e => update({ winCondition: { ...challenge.winCondition, target: Number(e.target.value) } as WinCondition })}
            style={{ ...inputStyle, width: 100 }}
          />
        </div>
      )}

      <label style={labelStyle}>Bonus Objectives (max 3)</label>
      <div style={{ marginBottom: 8 }}>
        {challenge.objectives.map((obj, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
            <span style={{ flex: 1, fontSize: '0.8rem', color: '#ddd' }}>
              {obj.type === 'pool' ? (OBJECTIVE_POOL.find(o => o.id === obj.value)?.emoji || '🎯') + ' ' : '✏️ '}
              {obj.type === 'pool' ? OBJECTIVE_POOL.find(o => o.id === obj.value)?.description : obj.value}
            </span>
            <button className="btn btn-small" style={{ color: '#e74c3c', borderColor: '#e74c3c', padding: '2px 8px' }}
              onClick={() => update({ objectives: challenge.objectives.filter((_, j) => j !== i) })}>✕</button>
          </div>
        ))}
      </div>
      {challenge.objectives.length < 3 && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {OBJECTIVE_POOL.filter(o => !challenge.objectives.some(obj => obj.type === 'pool' && obj.value === o.id)).map(o => (
              <button key={o.id} className="btn btn-small" style={dimBtn}
                onClick={() => update({ objectives: [...challenge.objectives, { type: 'pool', value: o.id }] })}
              >{o.emoji} {o.description.slice(0, 30)}...</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="text" value={customObjText} onChange={e => setCustomObjText(e.target.value)}
              placeholder="Or write a custom objective..." maxLength={80} style={{ ...inputStyle, flex: 1 }} />
            <button className="btn btn-small" style={{ color: '#2ecc71', borderColor: '#2ecc71' }}
              disabled={!customObjText.trim()}
              onClick={() => { update({ objectives: [...challenge.objectives, { type: 'custom', value: customObjText.trim() }] }); setCustomObjText(''); }}
            >Add</button>
          </div>
        </>
      )}
    </div>
  );

  // ─── Step 5: Preview & Share ───
  const renderStep5 = () => {
    const code = encodeChallenge({ ...challenge, created: Date.now() });
    const url = buildShareableUrl({ ...challenge, created: Date.now() });
    return (
      <div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ margin: '0 0 8px', fontFamily: 'Bebas Neue', color: '#f39c12', fontSize: '1.3rem' }}>
            🔧 {challenge.name || 'Untitled'}
          </h3>
          {challenge.desc && <p style={{ color: '#aaa', fontSize: '0.8rem', margin: '0 0 12px' }}>{challenge.desc}</p>}
          {challenge.author && <p style={{ color: '#666', fontSize: '0.7rem', margin: '0 0 8px' }}>by {challenge.author}</p>}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {challenge.genre && <Tag color="#e74c3c">🎬 {challenge.genre} only</Tag>}
            {challenge.budget !== null && <Tag color="#2ecc71">💰 ${challenge.budget}M budget</Tag>}
            {challenge.turnLimit !== null && <Tag color="#3498db">⏱️ {challenge.turnLimit} seasons</Tag>}
            {challenge.modifiers.ironMan && <Tag color="#e74c3c">💀 Iron Man</Tag>}
            {challenge.modifiers.speedMode && <Tag color="#9b59b6">⚡ Speed Mode</Tag>}
            {challenge.modifiers.noLegendary && <Tag color="#e67e22">🚫 No Legendary</Tag>}
          </div>

          {challenge.startingCards.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: '#888', fontSize: '0.7rem' }}>Starting Cards: </span>
              {challenge.startingCards.map(c => <span key={c} style={{ color: '#2ecc71', fontSize: '0.75rem', marginRight: 6 }}>{c}</span>)}
            </div>
          )}

          {challenge.winCondition.type !== 'survive' && (
            <div style={{ color: '#f39c12', fontSize: '0.8rem', marginBottom: 6 }}>
              🏆 Win: {WIN_CONDITION_OPTIONS.find(o => o.type === challenge.winCondition.type)?.label} {'target' in challenge.winCondition ? challenge.winCondition.target : ''}
            </div>
          )}

          {challenge.objectives.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: '#888', fontSize: '0.7rem' }}>Bonus Objectives:</span>
              {challenge.objectives.map((obj, i) => (
                <div key={i} style={{ color: '#ddd', fontSize: '0.75rem', paddingLeft: 8 }}>
                  • {obj.type === 'pool' ? OBJECTIVE_POOL.find(o => o.id === obj.value)?.description : obj.value}
                </div>
              ))}
            </div>
          )}
        </div>

        {errors.length > 0 && (
          <div style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: 10 }}>
            {errors.map((e, i) => <div key={i}>⚠️ {e}</div>)}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Challenge Code</label>
          <textarea readOnly value={code} style={{ ...inputStyle, height: 60, fontSize: '0.7rem', fontFamily: 'monospace', wordBreak: 'break-all' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn" style={{ color: '#3498db', borderColor: '#3498db' }}
              onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
              {copied ? '✅ Copied!' : '📋 Copy Code'}
            </button>
            <button className="btn" style={{ color: '#9b59b6', borderColor: '#9b59b6' }}
              onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
              🔗 Copy Link
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 16 }}>
      {onClose && (
        <button className="btn btn-small" onClick={onClose} style={{ marginBottom: 12, color: '#888' }}>← Back</button>
      )}
      <h2 style={{ fontFamily: 'Bebas Neue', color: '#f39c12', fontSize: '1.5rem', margin: '0 0 16px' }}>
        🔧 Challenge Creator
      </h2>

      {/* Step indicators */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {STEPS.map((s, i) => (
          <button key={i} onClick={() => setStep(i)}
            style={{
              flex: 1, padding: '6px 4px', fontSize: '0.65rem', border: 'none', cursor: 'pointer',
              background: i === step ? 'rgba(243,156,18,0.2)' : 'rgba(255,255,255,0.03)',
              color: i === step ? '#f39c12' : i < step ? '#2ecc71' : '#666',
              borderRadius: 4, fontFamily: 'Bebas Neue',
            }}
          >
            {i < step ? '✓ ' : ''}{i + 1}. {s}
          </button>
        ))}
      </div>

      {/* Step content */}
      {step === 0 && renderStep1()}
      {step === 1 && renderStep2()}
      {step === 2 && renderStep3()}
      {step === 3 && renderStep4()}
      {step === 4 && renderStep5()}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <button className="btn" disabled={step === 0} onClick={() => setStep(step - 1)}
          style={{ opacity: step === 0 ? 0.3 : 1 }}>← Previous</button>
        {step < 4 ? (
          <button className="btn" onClick={() => setStep(step + 1)}
            style={{ color: '#f39c12', borderColor: '#f39c12' }}>Next →</button>
        ) : (
          <span style={{ color: canFinish ? '#2ecc71' : '#666', fontSize: '0.8rem', alignSelf: 'center' }}>
            {canFinish ? '✅ Ready to share!' : '⚠️ Fix errors above'}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Helper Components ───

function ModSlider({ label, value, min, max, step, suffix, onChange }: {
  label: string; value: number; min: number; max: number; step: number; suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: '#ccc', fontSize: '0.75rem', width: 100 }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} style={{ flex: 1 }} />
      <span style={{ color: '#f39c12', fontFamily: 'Bebas Neue', width: 50, textAlign: 'right' }}>
        {value}{suffix}
      </span>
    </div>
  );
}

function ModToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span style={{ color: checked ? '#e74c3c' : '#888', fontSize: '0.8rem' }}>{label}</span>
    </label>
  );
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem',
      background: `${color}15`, border: `1px solid ${color}40`, color,
    }}>{children}</span>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 8, color: '#ccc', fontSize: '0.8rem', fontWeight: 'bold' };
const activeBtn: React.CSSProperties = { color: '#f39c12', borderColor: '#f39c12', background: 'rgba(243,156,18,0.1)' };
const dimBtn: React.CSSProperties = { color: '#888', borderColor: 'rgba(255,255,255,0.1)' };
