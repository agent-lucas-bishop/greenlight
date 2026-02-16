import { useState } from 'react';
import { GameState, Talent, CardTemplate } from '../types';
import { assignTalent, unassignTalent, hireTalent, fireTalent, startProduction, isSlotBlocked } from '../gameStore';
import { getActiveChemistry, ALL_CHEMISTRY } from '../data';
import { CardTypeBadge, CardPreview } from '../components/CardComponents';
import PhaseTip from '../components/PhaseTip';
import { sfx } from '../sound';

function TalentCard({ t, onClick, compact, dimmed, highlight }: { t: Talent; onClick?: () => void; compact?: boolean; dimmed?: boolean; highlight?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const typeColors: Record<string, string> = { Lead: '#e74c3c', Support: '#e67e22', Director: '#9b59b6', Crew: '#3498db' };
  const typeEmoji: Record<string, string> = { Lead: '⭐', Support: '🤝', Director: '🎬', Crew: '🔧' };

  // Key tags: top 1-2 most common tags across this talent's cards
  const tagCounts: Record<string, number> = {};
  for (const c of t.cards) {
    if (c.tags) for (const tag of c.tags) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 2);
  const tagConfig: Record<string, { emoji: string; color: string }> = {
    momentum: { emoji: '🔥', color: '#e67e22' },
    precision: { emoji: '🎯', color: '#3498db' },
    chaos: { emoji: '💀', color: '#9b59b6' },
    heart: { emoji: '💕', color: '#e91e63' },
    spectacle: { emoji: '✨', color: '#f1c40f' },
  };

  const totalCards = t.cards.length + (t.heat >= 4 && t.heatCards ? t.heatCards.length : 0);
  const incidents = t.cards.filter(c => c.cardType === 'incident').length + (t.heat >= 4 && t.heatCards ? t.heatCards.filter(c => c.cardType === 'incident').length : 0);

  return (
    <div
      className={`card talent-card ${highlight ? 'selected' : ''}`}
      onClick={onClick}
      style={{
        padding: 10,
        minHeight: 'auto',
        opacity: dimmed ? 0.4 : 1,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span className="talent-type" style={{ background: typeColors[t.type] || '#666' }}>{typeEmoji[t.type]} {t.type}</span>
      <div className="card-title" style={{ fontSize: '1rem' }}>{t.name}</div>
      
      {/* Summary line: cost + key tags */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {t.cost > 0 && <span className="card-stat gold">${t.cost}M</span>}
        <span className="card-stat green">S{t.skill}</span>
        <span className="card-stat red">H{t.heat}</span>
        {topTags.map(([tag]) => {
          const tc = tagConfig[tag] || { emoji: '•', color: '#888' };
          return <span key={tag} style={{ fontSize: '0.75rem', color: tc.color }}>{tc.emoji} {tag}</span>;
        })}
        {incidents >= 2 && <span style={{ fontSize: '0.7rem', color: '#e74c3c' }}>⚠️{incidents}I</span>}
      </div>

      {t.filmsLeft !== undefined && (
        <div style={{ fontSize: '0.65rem', color: t.filmsLeft <= 1 ? '#e74c3c' : '#888', marginTop: 2 }}>
          📝 {t.filmsLeft} film{t.filmsLeft !== 1 ? 's' : ''} left
        </div>
      )}
      {t.baggage && (
        <div style={{ fontSize: '0.65rem', color: '#e67e22', marginTop: 2, fontWeight: 600 }}>
          {t.baggage.label}
        </div>
      )}

      {/* Expand/collapse for full details */}
      <button
        className="btn-tiny"
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        style={{ marginTop: 4, fontSize: '0.7rem', color: '#888' }}
      >
        {expanded ? '▲ Less' : `▼ ${totalCards} cards`}{t.trait ? ' · trait' : ''}
      </button>

      {expanded && (
        <div style={{ marginTop: 6 }}>
          {t.trait && <div className="trait-badge">"{t.trait}" — {t.traitDesc}</div>}
          {t.genreBonus && <div style={{ fontSize: '0.7rem', color: '#3498db', marginBottom: 4 }}>{t.genreBonus.genre} +{t.genreBonus.bonus}</div>}
          <div className="card-preview-list">
            {t.cards.map((c, i) => <CardPreview key={i} card={c} />)}
            {t.heat >= 4 && t.heatCards?.map((c, i) => <CardPreview key={`h${i}`} card={c} />)}
          </div>
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
    sfx.cardPick();
    assignTalent(activeSlot, t);
    const nextEmpty = state.castSlots.findIndex((s, i) => i > activeSlot && !s.talent);
    if (nextEmpty >= 0) setActiveSlot(nextEmpty);
  };

  return (
    <div className="fade-in">
      <PhaseTip phase="casting" />
      <div className="phase-title">
        <h2>🎭 Casting</h2>
        <div className="subtitle">
          "{state.currentScript?.title}" — {state.currentScript?.genre} — Base Score {state.currentScript?.baseScore}
          {state.currentScript?.abilityDesc && (
            <span style={{ color: 'var(--gold)', marginLeft: 8 }}>✨ {state.currentScript.abilityDesc}</span>
          )}
        </div>
      </div>

      {/* Compact deck stats */}
      <div className="casting-stats">
        <span>Skill: <strong style={{ color: 'var(--green-bright)' }}>{totalSkill}</strong></span>
        <span>Heat: <strong style={{ color: totalHeat > 5 ? 'var(--red-bright)' : 'var(--gold)' }}>{totalHeat}</strong></span>
        <span>Deck: <strong>{totalDeckCards}</strong> ({actionCards}A/{challengeCards}C/{incidentCards}I)</span>
        <span style={{ color: incidentCards >= 3 ? '#e74c3c' : actionCards > incidentCards * 2 ? '#2ecc71' : '#f39c12', fontSize: '0.8rem' }}>
          {incidentCards >= 3 ? '⚠️ High Risk' : actionCards > incidentCards * 2 ? '✨ Strong' : '⚡ Balanced'}
        </span>
      </div>

      {/* Chemistry indicators */}
      {(() => {
        const castNames = state.castSlots.map(s => s.talent?.name).filter(Boolean) as string[];
        const rosterNames = state.roster.map(t => t.name);
        const allNames = [...new Set([...castNames, ...rosterNames])];
        const active = getActiveChemistry(castNames);
        const potential = ALL_CHEMISTRY.filter(c => {
          const has1 = allNames.includes(c.talent1);
          const has2 = allNames.includes(c.talent2);
          const bothCast = castNames.includes(c.talent1) && castNames.includes(c.talent2);
          return (has1 || has2) && !bothCast;
        }).slice(0, 3);
        
        return (active.length > 0 || potential.length > 0) ? (
          <div style={{ background: 'rgba(233,30,99,0.08)', borderRadius: 8, padding: '6px 12px', marginBottom: 12, fontSize: '0.75rem' }}>
            {active.map((c, i) => (
              <div key={i} style={{ color: '#e91e63', fontWeight: 600 }}>💕 <strong>{c.name}</strong> ACTIVE — {c.description}</div>
            ))}
            {potential.map((c, i) => (
              <div key={`p${i}`} style={{ color: '#888' }}>💭 {c.talent1} + {c.talent2} = "{c.name}" (+{c.qualityBonus})</div>
            ))}
          </div>
        ) : null;
      })()}

      <div className="cast-area">
        <div>
          <h4 style={{ color: '#999', marginBottom: 8, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cast Slots</h4>
          <div className="cast-slots">
            {state.castSlots.map((slot, i) => {
              const blocked = !slot.talent && isSlotBlocked(slot.slotType, state.castSlots);
              return (
              <div
                key={i}
                className={`cast-slot ${slot.talent ? 'filled' : ''} ${i === activeSlot ? 'active' : ''} ${blocked ? 'blocked' : ''}`}
                onClick={() => {
                  if (blocked) return;
                  if (slot.talent) unassignTalent(i);
                  setActiveSlot(i);
                }}
                style={blocked ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
              >
                <div className="slot-label">{slot.slotType}{blocked ? ' 🔒' : ''}</div>
                {slot.talent ? (
                  <div className="slot-talent">
                    {slot.talent.name}
                    <span style={{ fontSize: '0.75rem', color: '#999' }}> S{slot.talent.skill}/H{slot.talent.heat}</span>
                    <span style={{ marginLeft: 4, fontSize: '0.6rem', color: '#666' }}>✕</span>
                  </div>
                ) : blocked ? (
                  <div style={{ color: '#e67e22', fontSize: '0.75rem' }}>📅 Blocked by schedule conflict</div>
                ) : (
                  <div style={{ color: '#444', fontSize: '0.8rem' }}>Empty — select talent →</div>
                )}
              </div>
            );})}
          </div>

          {/* Script cards — collapsed by default */}
          {state.currentScript && (
            <ScriptCardsCollapsible cards={state.currentScript.cards} />
          )}

          {/* Deck preview summary */}
          {filledCount >= 2 && (
            <div style={{
              marginTop: 16, padding: '10px 14px', background: 'rgba(212,168,67,0.06)',
              border: '1px solid rgba(212,168,67,0.15)', borderRadius: 8, fontSize: '0.78rem', color: '#999',
            }}>
              <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.85rem', marginBottom: 4, letterSpacing: '0.05em' }}>
                📦 PRODUCTION DECK PREVIEW
              </div>
              <span style={{ color: '#2ecc71' }}>{actionCards} Actions</span>
              {' · '}
              <span style={{ color: '#f1c40f' }}>{challengeCards} Challenges</span>
              {' · '}
              <span style={{ color: '#e74c3c' }}>{incidentCards} Incidents</span>
              {' · '}
              <span>{totalDeckCards} total</span>
              {incidentCards >= 3 && (
                <div style={{ color: '#e74c3c', fontSize: '0.7rem', marginTop: 4 }}>
                  ⚠️ High incident count — disaster risk is elevated!
                </div>
              )}
            </div>
          )}

          <div className="btn-group" style={{ flexDirection: 'column', marginTop: 16 }}>
            <button className="btn btn-primary" disabled={filledCount < 2} onClick={() => { sfx.seasonTransition(); startProduction(); }}>
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
            Talent Market (Budget: ${state.budget.toFixed(1)}M{state.debt > 0 ? ` · ⚠️ Debt: $${state.debt.toFixed(1)}M` : ''})
          </h4>
          {state.debt > 0 && (
            <div style={{ fontSize: '0.7rem', color: '#e74c3c', marginBottom: 8, padding: '4px 8px', background: 'rgba(231,76,60,0.1)', borderRadius: 4 }}>
              ⚠️ In debt! 20% interest per season. Debt ≥$15M = reputation penalty. You can still spend — but it hurts.
            </div>
          )}
          <div className="card-grid card-grid-2">
            {state.talentMarket.map(t => (
              <div key={t.id}>
                <TalentCard
                  t={t}
                  onClick={() => hireTalent(t)}
                  dimmed={state.roster.length >= 8}
                />
                {state.budget < t.cost && state.roster.length < 8 && (
                  <div style={{ fontSize: '0.65rem', color: '#e67e22', textAlign: 'center', marginTop: 2 }}>
                    ⚠️ Goes into debt (+${(t.cost - state.budget).toFixed(0)}M)
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScriptCardsCollapsible({ cards }: { cards: CardTemplate[] }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginTop: 12 }}>
      <button
        className="btn-tiny"
        onClick={() => setShow(!show)}
        style={{ fontSize: '0.75rem', color: '#999' }}
      >
        📜 Script Cards ({cards.length}) {show ? '▲' : '▼'}
      </button>
      {show && (
        <div className="card-preview-list" style={{ marginTop: 6 }}>
          {cards.map((c, i) => <CardPreview key={i} card={c} />)}
        </div>
      )}
    </div>
  );
}
