import { useState } from 'react';
import { GameState, Talent } from '../types';
import { assignTalent, hireTalent, startProduction } from '../gameStore';

function TalentCard({ t, onClick, compact }: { t: Talent; onClick?: () => void; compact?: boolean }) {
  return (
    <div className={`card talent-card ${compact ? '' : ''}`} onClick={onClick} style={compact ? { padding: 10, minHeight: 'auto' } : {}}>
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

  const handleAssign = (t: Talent) => {
    assignTalent(activeSlot, t);
    if (activeSlot < state.castSlots.length - 1) setActiveSlot(activeSlot + 1);
  };

  return (
    <div>
      <div className="phase-title">
        <h2>🎭 Casting</h2>
        <div className="subtitle">
          "{state.currentScript?.title}" — {state.currentScript?.genre} — Base Score {state.currentScript?.baseScore}
        </div>
      </div>

      <div className="cast-area">
        <div>
          <h4 style={{ color: '#999', marginBottom: 8, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cast Slots</h4>
          <div className="cast-slots">
            {state.castSlots.map((slot, i) => (
              <div
                key={i}
                className={`cast-slot ${slot.talent ? 'filled' : ''} ${i === activeSlot ? 'active' : ''}`}
                onClick={() => setActiveSlot(i)}
              >
                <div className="slot-label">{slot.slotType}</div>
                {slot.talent ? (
                  <div className="slot-talent">{slot.talent.name} (S{slot.talent.skill}/H{slot.talent.heat})</div>
                ) : (
                  <div style={{ color: '#444', fontSize: '0.8rem' }}>Empty — click to fill</div>
                )}
              </div>
            ))}
          </div>
          <div className="btn-group" style={{ flexDirection: 'column' }}>
            <button
              className="btn btn-primary"
              disabled={filledCount < 2}
              onClick={startProduction}
            >
              BEGIN PRODUCTION →
            </button>
            {filledCount < state.castSlots.length && (
              <span style={{ fontSize: '0.75rem', color: '#666' }}>
                {filledCount}/{state.castSlots.length} slots filled (min 2)
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
              <div key={t.id} style={{ opacity: assignedIds.has(t.id) ? 0.5 : 1 }}>
                <TalentCard t={t} onClick={() => handleAssign(t)} compact />
              </div>
            ))}
          </div>

          <h4 style={{ color: '#999', marginBottom: 8, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Talent Market (Budget: ${state.budget.toFixed(1)}M)
          </h4>
          <div className="card-grid card-grid-2">
            {state.talentMarket.map(t => (
              <div key={t.id}>
                <TalentCard t={t} onClick={() => hireTalent(t)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
