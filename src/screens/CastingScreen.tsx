import { useState } from 'react';
import { GameState, Talent } from '../types';
import { assignTalent, unassignTalent, hireTalent, fireTalent, startProduction } from '../gameStore';

function TalentCard({ t, onClick, compact, dimmed, highlight }: { t: Talent; onClick?: () => void; compact?: boolean; dimmed?: boolean; highlight?: boolean }) {
  return (
    <div 
      className={`card talent-card ${highlight ? 'selected' : ''}`} 
      onClick={onClick} 
      style={{ 
        padding: compact ? 10 : 16, 
        minHeight: compact ? 'auto' : 120,
        opacity: dimmed ? 0.4 : 1,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span className={`talent-type ${t.type}`}>{t.type}</span>
      <div className="card-title" style={compact ? { fontSize: '1rem' } : {}}>{t.name}</div>
      <div>
        <span className="card-stat green">Skill {t.skill}</span>
        <span className="card-stat red">Heat {t.heat}</span>
        {t.genreBonus && <span className="card-stat blue">{t.genreBonus.genre} +{t.genreBonus.bonus}</span>}
        {t.cost > 0 && <span className="card-stat gold">${t.cost}M</span>}
      </div>
      {t.trait && <div className="trait-badge">"{t.trait}" — {t.traitDesc}</div>}
    </div>
  );
}

export default function CastingScreen({ state }: { state: GameState }) {
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const allTalent = state.roster;
  const filledCount = state.castSlots.filter(s => s.talent).length;
  const assignedIds = new Set(state.castSlots.map(s => s.talent?.id).filter(Boolean));
  const totalHeat = state.castSlots.reduce((s, c) => s + (c.talent?.heat || 0), 0);
  const totalSkill = state.castSlots.reduce((s, c) => s + (c.talent?.skill || 0), 0);

  const handleAssign = (t: Talent) => {
    assignTalent(activeSlot, t);
    // Auto-advance to next empty slot
    const nextEmpty = state.castSlots.findIndex((s, i) => i > activeSlot && !s.talent);
    if (nextEmpty >= 0) setActiveSlot(nextEmpty);
  };

  return (
    <div className="fade-in">
      <div className="phase-title">
        <h2>🎭 Casting</h2>
        <div className="subtitle">
          "{state.currentScript?.title}" — {state.currentScript?.genre} — Base Score {state.currentScript?.baseScore}
          {state.currentScript?.abilityDesc && (
            <span style={{ color: 'var(--gold)', marginLeft: 8 }}>✨ {state.currentScript.abilityDesc}</span>
          )}
        </div>
      </div>

      {/* Quick stats bar */}
      <div className="casting-stats">
        <span>Total Skill: <strong style={{ color: 'var(--green-bright)' }}>{totalSkill}</strong></span>
        <span>Total Heat: <strong style={{ color: totalHeat > 5 ? 'var(--red-bright)' : 'var(--gold)' }}>{totalHeat}</strong></span>
        <span>Est. Quality: <strong style={{ color: 'var(--gold)' }}>~{(state.currentScript?.baseScore || 0) + totalSkill}</strong> <span style={{ color: '#666', fontSize: '0.75rem' }}>+ production</span></span>
      </div>

      <div className="cast-area">
        <div>
          <h4 style={{ color: '#999', marginBottom: 8, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cast Slots</h4>
          <div className="cast-slots">
            {state.castSlots.map((slot, i) => (
              <div
                key={i}
                className={`cast-slot ${slot.talent ? 'filled' : ''} ${i === activeSlot ? 'active' : ''}`}
                onClick={() => {
                  if (slot.talent) {
                    unassignTalent(i);
                  }
                  setActiveSlot(i);
                }}
              >
                <div className="slot-label">{slot.slotType}</div>
                {slot.talent ? (
                  <div className="slot-talent">
                    {slot.talent.name} 
                    <span style={{ fontSize: '0.75rem', color: '#999' }}> S{slot.talent.skill}/H{slot.talent.heat}</span>
                    <span style={{ marginLeft: 4, fontSize: '0.6rem', color: '#666' }}>✕ click to remove</span>
                  </div>
                ) : (
                  <div style={{ color: '#444', fontSize: '0.8rem' }}>Empty — select talent →</div>
                )}
              </div>
            ))}
          </div>
          <div className="btn-group" style={{ flexDirection: 'column', marginTop: 16 }}>
            <button
              className="btn btn-primary"
              disabled={filledCount < 2}
              onClick={startProduction}
            >
              BEGIN PRODUCTION →
            </button>
            {filledCount < state.castSlots.length && (
              <span style={{ fontSize: '0.75rem', color: '#666' }}>
                {filledCount}/{state.castSlots.length} slots filled (min 2 required)
              </span>
            )}
          </div>
        </div>

        <div>
          <h4 style={{ color: '#999', marginBottom: 8, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Your Roster ({allTalent.length}/8)
          </h4>
          <div className="card-grid card-grid-2" style={{ marginBottom: 24 }}>
            {allTalent.map(t => (
              <div key={t.id}>
                <TalentCard 
                  t={t} 
                  onClick={() => assignedIds.has(t.id) ? undefined : handleAssign(t)} 
                  compact 
                  dimmed={assignedIds.has(t.id)}
                />
                {!assignedIds.has(t.id) && state.phase === 'casting' && (
                  <button 
                    className="btn btn-danger btn-small" 
                    style={{ width: '100%', marginTop: 4, fontSize: '0.7rem', padding: '3px 8px' }}
                    onClick={(e) => { e.stopPropagation(); fireTalent(t.id); }}
                  >
                    FIRE
                  </button>
                )}
              </div>
            ))}
          </div>

          <h4 style={{ color: '#999', marginBottom: 8, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Talent Market (Budget: ${state.budget.toFixed(1)}M)
          </h4>
          <div className="card-grid card-grid-2">
            {state.talentMarket.map(t => (
              <div key={t.id}>
                <TalentCard 
                  t={t} 
                  onClick={() => hireTalent(t)}
                  dimmed={state.budget < t.cost || state.roster.length >= 8}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
