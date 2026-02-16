import { useState } from 'react';
import { GameState, Talent, CardTemplate } from '../types';
import { assignTalent, unassignTalent, hireTalent, fireTalent, startProduction } from '../gameStore';
import { getActiveChemistry, ALL_CHEMISTRY } from '../data';

function CardTypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    action: { label: 'ACTION', color: '#fff', bg: '#2ecc71' },
    challenge: { label: 'CHALLENGE', color: '#000', bg: '#f1c40f' },
    incident: { label: 'INCIDENT', color: '#fff', bg: '#e74c3c' },
  };
  const c = config[type] || config.action;
  return (
    <span style={{ background: c.bg, color: c.color, padding: '1px 6px', borderRadius: 3, fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.05em' }}>
      {c.label}
    </span>
  );
}

function CardPreview({ card }: { card: CardTemplate }) {
  return (
    <div className="card-preview" style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <CardTypeBadge type={card.cardType} />
        <span className="cp-name" style={{ fontWeight: 600 }}>{card.name}</span>
        <span className="cp-value">{card.baseQuality >= 0 ? '+' : ''}{card.baseQuality}</span>
      </div>
      {card.synergyText && (
        <div style={{ fontSize: '0.65rem', color: '#9b59b6', paddingLeft: 4 }}>✨ {card.synergyText}</div>
      )}
    </div>
  );
}

function TalentCard({ t, onClick, compact, dimmed, highlight }: { t: Talent; onClick?: () => void; compact?: boolean; dimmed?: boolean; highlight?: boolean }) {
  const [showCards, setShowCards] = useState(true);
  const typeColors: Record<string, string> = { Lead: '#e74c3c', Support: '#e67e22', Director: '#9b59b6', Crew: '#3498db' };
  const typeEmoji: Record<string, string> = { Lead: '⭐', Support: '🤝', Director: '🎬', Crew: '🔧' };

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
      <span className="talent-type" style={{ background: typeColors[t.type] || '#666' }}>{typeEmoji[t.type]} {t.type}</span>
      <div className="card-title" style={compact ? { fontSize: '1rem' } : {}}>{t.name}</div>
      <div>
        <span className="card-stat green">Skill {t.skill}</span>
        <span className="card-stat red">Heat {t.heat}</span>
        {t.genreBonus && <span className="card-stat blue">{t.genreBonus.genre} +{t.genreBonus.bonus}</span>}
        {t.cost > 0 && <span className="card-stat gold">${t.cost}M</span>}
      </div>
      {t.trait && <div className="trait-badge">"{t.trait}" — {t.traitDesc}</div>}
      {t.filmsLeft !== undefined && (
        <div style={{ fontSize: '0.7rem', color: t.filmsLeft <= 1 ? '#e74c3c' : '#f39c12', marginTop: 4 }}>
          📝 Contract: {t.filmsLeft} film{t.filmsLeft !== 1 ? 's' : ''} left
        </div>
      )}

      {/* Card count + preview toggle */}
      <div className="card-deck-info">
        <button
          className="btn-tiny"
          onClick={(e) => { e.stopPropagation(); setShowCards(!showCards); }}
        >
          {t.cards.length + (t.heat >= 4 && t.heatCards ? t.heatCards.length : 0)} cards
          {' '}({t.cards.filter(c => c.cardType === 'action').length}A/{t.cards.filter(c => c.cardType === 'challenge').length}C/{t.cards.filter(c => c.cardType === 'incident').length + (t.heat >= 4 && t.heatCards ? t.heatCards.filter(c => c.cardType === 'incident').length : 0)}I)
          {' '}{showCards ? '▲' : '▼'}
        </button>
      </div>
      {showCards && (
        <div className="card-preview-list">
          {t.cards.map((c, i) => <CardPreview key={i} card={c} />)}
          {t.heat >= 4 && t.heatCards?.map((c, i) => <CardPreview key={`h${i}`} card={c} />)}
        </div>
      )}
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

  // Count total cards in deck
  const totalDeckCards = state.castSlots.reduce((sum, s) => {
    if (!s.talent) return sum;
    let count = s.talent.cards.length;
    if (s.talent.heat >= 4 && s.talent.heatCards) count += s.talent.heatCards.length;
    return sum + count;
  }, 0) + (state.currentScript?.cards.length || 0);

  const actionCards = state.castSlots.reduce((sum, s) => {
    if (!s.talent) return sum;
    let count = s.talent.cards.filter(c => c.cardType === 'action').length;
    if (s.talent.heat >= 4 && s.talent.heatCards) count += s.talent.heatCards.filter(c => c.cardType === 'action').length;
    return sum + count;
  }, 0) + (state.currentScript?.cards.filter(c => c.cardType === 'action').length || 0);

  const challengeCards = state.castSlots.reduce((sum, s) => {
    if (!s.talent) return sum;
    let count = s.talent.cards.filter(c => c.cardType === 'challenge').length;
    if (s.talent.heat >= 4 && s.talent.heatCards) count += s.talent.heatCards.filter(c => c.cardType === 'challenge').length;
    return sum + count;
  }, 0) + (state.currentScript?.cards.filter(c => c.cardType === 'challenge').length || 0);

  const incidentCards = state.castSlots.reduce((sum, s) => {
    if (!s.talent) return sum;
    let count = s.talent.cards.filter(c => c.cardType === 'incident').length;
    if (s.talent.heat >= 4 && s.talent.heatCards) count += s.talent.heatCards.filter(c => c.cardType === 'incident').length;
    return sum + count;
  }, 0) + (state.currentScript?.cards.filter(c => c.cardType === 'incident').length || 0);

  const handleAssign = (t: Talent) => {
    assignTalent(activeSlot, t);
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

      <div className="casting-stats">
        <span>Skill: <strong style={{ color: 'var(--green-bright)' }}>{totalSkill}</strong></span>
        <span>Heat: <strong style={{ color: totalHeat > 5 ? 'var(--red-bright)' : 'var(--gold)' }}>{totalHeat}</strong></span>
        <span>Deck: <strong>{totalDeckCards}</strong> cards</span>
        <span>Draws: <strong>{Math.min(15, Math.max(6, Math.ceil(totalDeckCards * 0.55)))}</strong></span>
      </div>

      {/* Deck Preview */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', fontSize: '0.85rem' }}>
        <strong style={{ color: '#ccc' }}>📦 Deck Preview</strong>
        <span><strong style={{ color: '#2ecc71' }}>{actionCards}</strong> Action</span>
        <span><strong style={{ color: '#f1c40f' }}>{challengeCards}</strong> Challenge</span>
        <span><strong style={{ color: '#e74c3c' }}>{incidentCards}</strong> Incident</span>
        <span style={{ color: '#888' }}>|</span>
        <span style={{ color: incidentCards >= 3 ? '#e74c3c' : actionCards > incidentCards * 2 ? '#2ecc71' : '#f39c12' }}>
          {incidentCards >= 3 ? '⚠️ High Risk — 3 Incidents = Disaster!' : actionCards > incidentCards * 2 ? '✨ Strong Synergy Potential' : '⚡ Balanced'}
        </span>
      </div>

      {/* Chemistry indicators */}
      {(() => {
        const castNames = state.castSlots.map(s => s.talent?.name).filter(Boolean) as string[];
        const rosterNames = state.roster.map(t => t.name);
        const allNames = [...new Set([...castNames, ...rosterNames])];
        const active = getActiveChemistry(castNames);
        // Show potential chemistry from roster/market
        const potential = ALL_CHEMISTRY.filter(c => {
          const has1 = allNames.includes(c.talent1);
          const has2 = allNames.includes(c.talent2);
          const bothCast = castNames.includes(c.talent1) && castNames.includes(c.talent2);
          return (has1 || has2) && !bothCast;
        }).slice(0, 3);
        
        return (active.length > 0 || potential.length > 0) ? (
          <div style={{ background: 'rgba(233,30,99,0.08)', borderRadius: 8, padding: '8px 16px', marginBottom: 16, fontSize: '0.8rem' }}>
            {active.map((c, i) => (
              <div key={i} style={{ color: '#e91e63', fontWeight: 600 }}>💕 <strong>{c.name}</strong> ACTIVE — {c.description}</div>
            ))}
            {potential.map((c, i) => (
              <div key={`p${i}`} style={{ color: '#888' }}>💭 Potential: <strong>{c.talent1}</strong> + <strong>{c.talent2}</strong> = "{c.name}" (+{c.qualityBonus})</div>
            ))}
          </div>
        ) : null;
      })()}

      <div className="cast-area">
        <div>
          <h4 style={{ color: '#999', marginBottom: 8, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cast Slots</h4>
          <div className="cast-slots">
            {state.castSlots.map((slot, i) => (
              <div
                key={i}
                className={`cast-slot ${slot.talent ? 'filled' : ''} ${i === activeSlot ? 'active' : ''}`}
                onClick={() => {
                  if (slot.talent) unassignTalent(i);
                  setActiveSlot(i);
                }}
              >
                <div className="slot-label">{slot.slotType}</div>
                {slot.talent ? (
                  <div className="slot-talent">
                    {slot.talent.name}
                    <span style={{ fontSize: '0.75rem', color: '#999' }}> S{slot.talent.skill}/H{slot.talent.heat}</span>
                    <span style={{ fontSize: '0.65rem', color: '#666' }}> ({slot.talent.cards.length} cards)</span>
                    <span style={{ marginLeft: 4, fontSize: '0.6rem', color: '#666' }}>✕</span>
                  </div>
                ) : (
                  <div style={{ color: '#444', fontSize: '0.8rem' }}>Empty — select talent →</div>
                )}
              </div>
            ))}
          </div>

          {/* Script cards preview */}
          {state.currentScript && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ color: '#999', marginBottom: 8, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                📜 Script Cards ({state.currentScript.cards.length})
              </h4>
              <div className="card-preview-list">
                {state.currentScript.cards.map((c, i) => <CardPreview key={i} card={c} />)}
              </div>
            </div>
          )}

          <div className="btn-group" style={{ flexDirection: 'column', marginTop: 16 }}>
            <button className="btn btn-primary" disabled={filledCount < 2} onClick={startProduction}>
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
                {!assignedIds.has(t.id) && (
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
