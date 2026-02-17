import { useState, useEffect } from 'react';
import { GameState, Talent } from '../types';
import { buyPerk, hireTalent, fireTalent, trainTalent, nextSeason, payDebt } from '../gameStore';
import { isPerkLocked } from '../data';
import { CardTypeBadge, CardPreview } from '../components/CardComponents';
import PhaseTip from '../components/PhaseTip';
import { sfx } from '../sound';

function TalentShopCard({ t, onClick, canBuy }: { t: Talent; onClick: () => void; canBuy: boolean }) {
  const [showCards, setShowCards] = useState(false);
  const typeColors: Record<string, string> = { Lead: '#e74c3c', Support: '#e67e22', Director: '#9b59b6', Crew: '#3498db' };

  const totalCards = t.cards.length + (t.heat >= 4 && t.heatCards ? t.heatCards.length : 0);
  const actionCount = t.cards.filter(c => c.cardType === 'action').length;
  const challengeCount = t.cards.filter(c => c.cardType === 'challenge').length;
  const incidentCount = t.cards.filter(c => c.cardType === 'incident').length + (t.heat >= 4 && t.heatCards ? t.heatCards.filter(c => c.cardType === 'incident').length : 0);

  return (
    <div
      className="card talent-card"
      onClick={canBuy ? onClick : undefined}
      onKeyDown={e => { if (canBuy && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
      tabIndex={canBuy ? 0 : -1}
      role="button"
      aria-label={`${t.name}, ${t.type}, Skill ${t.skill}, Heat ${t.heat}, Cost $${t.cost}M${canBuy ? '' : ', cannot afford'}`}
      style={{ opacity: canBuy ? 1 : 0.3, cursor: canBuy ? 'pointer' : 'not-allowed', filter: canBuy ? 'none' : 'grayscale(0.5)', borderStyle: canBuy ? 'solid' : 'dashed' }}
    >
      <span className="talent-type" style={{ background: typeColors[t.type] || '#666' }}>{t.type}</span>
      <div className="card-title">{t.name}</div>
      <div>
        <span className="card-stat green">Skill {t.skill}</span>
        <span className="card-stat red">Heat {t.heat}</span>
        <span className="card-stat gold">${t.cost}M</span>
      </div>
      {t.genreBonus && <div className="card-stat blue">{t.genreBonus.genre} +{t.genreBonus.bonus}</div>}
      {t.trait && <div className="trait-badge">"{t.trait}" — {t.traitDesc}</div>}
      {t.filmsLeft !== undefined && (
        <div style={{ fontSize: '0.7rem', color: t.filmsLeft <= 1 ? '#e74c3c' : '#f39c12', marginTop: 4 }}>
          📝 Contract: {t.filmsLeft} film{t.filmsLeft !== 1 ? 's' : ''} left
        </div>
      )}
      
      {/* Tag summary for this talent */}
      {(() => {
        const allCards = [...t.cards, ...(t.heat >= 4 && t.heatCards ? t.heatCards : [])];
        const tagCounts: Record<string, number> = {};
        for (const c of allCards) {
          if (c.tags) for (const tag of c.tags) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
        const entries = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
        const tConfig: Record<string, { emoji: string; color: string }> = {
          momentum: { emoji: '🔥', color: '#e67e22' },
          precision: { emoji: '🎯', color: '#3498db' },
          chaos: { emoji: '💀', color: '#9b59b6' },
          heart: { emoji: '💕', color: '#e91e63' },
          spectacle: { emoji: '✨', color: '#f1c40f' },
        };
        if (entries.length === 0) return null;
        return (
          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            {entries.map(([tag, count]) => {
              const tc = tConfig[tag] || { emoji: '•', color: '#888' };
              return <span key={tag} style={{ fontSize: '0.65rem', color: tc.color, fontWeight: 600 }}>{tc.emoji}×{count}</span>;
            })}
          </div>
        );
      })()}
      <div style={{ marginTop: 8 }}>
        <button
          className="btn-tiny"
          onClick={(e) => { e.stopPropagation(); setShowCards(!showCards); }}
          style={{ fontSize: '0.7rem' }}
        >
          {totalCards} cards ({actionCount}A/{challengeCount}C/{incidentCount}I) {showCards ? '▲' : '▼'}
        </button>
      </div>
      {showCards && (
        <div style={{ marginTop: 4 }}>
          {t.cards.map((c, i) => <CardPreview key={i} card={c} />)}
          {t.heat >= 4 && t.heatCards?.map((c, i) => <CardPreview key={`h${i}`} card={c} />)}
        </div>
      )}
    </div>
  );
}

export default function ShopScreen({ state }: { state: GameState }) {
  // Debt warning sound on mount if debt is dangerous
  useEffect(() => { if (state.debt >= 10) sfx.debtWarning(); }, []);

  return (
    <div className="fade-in">
      <PhaseTip phase="shop" />
      <div className="phase-title">
        <h2>🏠 The Lot Is Quiet</h2>
        <div className="subtitle">War chest: <strong style={{ color: 'var(--gold)' }}>${state.budget.toFixed(1)}M</strong> — Retool for Season {state.season + 1}</div>
      </div>

      {state.industryEvent && (
        <div className="event-banner animate-slide-down">📰 <strong>{state.industryEvent.name}</strong> — {state.industryEvent.description}</div>
      )}

      {/* Studio Perks */}
      <div className="shop-section">
        <h3>🎬 Studio Upgrades ({state.perks.length}/5)</h3>
        {state.perks.length >= 5 && (
          <div className="empty-state" style={{ padding: '16px 20px' }}>
            <div className="empty-state-icon">🏆</div>
            <div className="empty-state-title">Fully Upgraded</div>
            <div className="empty-state-desc">Your studio has all 5 perks. You're running a first-class operation!</div>
          </div>
        )}
        <div className="card-grid card-grid-4">
          {state.perkMarket.map(perk => {
            const locked = isPerkLocked(perk as any);
            const canBuy = !locked && state.budget >= perk.cost && state.perks.length < 5;
            return (
              <div
                key={perk.id}
                className="card"
                onClick={() => { if (canBuy) { sfx.purchase(); buyPerk(perk); } }}
                onKeyDown={e => { if (canBuy && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); sfx.purchase(); buyPerk(perk); } }}
                tabIndex={canBuy ? 0 : -1}
                role="button"
                aria-label={`${perk.name}, $${perk.cost}M: ${perk.description}${locked ? ', locked' : canBuy ? '' : ', cannot afford'}`}
                style={{ opacity: locked ? 0.25 : canBuy ? 1 : 0.35, cursor: locked ? 'not-allowed' : canBuy ? 'pointer' : 'not-allowed', position: 'relative', filter: !canBuy && !locked ? 'grayscale(0.4)' : locked ? 'grayscale(0.6)' : 'none', borderStyle: !canBuy || locked ? 'dashed' : 'solid' }}
              >
                <div className="card-title">{perk.name}</div>
                <div className="card-stat gold">${perk.cost}M</div>
                <div className="card-body" style={{ marginTop: 8 }}>{perk.description}</div>
                {locked && (perk as any).prestigeRequired && (
                  <div style={{ marginTop: 6, fontSize: '0.7rem', color: '#f39c12', fontWeight: 600 }}>
                    🔒 Unlocks at Prestige {(perk as any).prestigeRequired}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hire Talent */}
      <div className="shop-section">
        <h3>🎭 Talent Agency (Roster: {state.roster.length}/8)</h3>
        <div className="card-grid card-grid-4">
          {state.talentMarket.map(t => {
            const canHire = state.budget >= t.cost && state.roster.length < 8;
            return (
              <TalentShopCard
                key={t.id}
                t={t}
                onClick={() => { sfx.hire(); hireTalent(t); }}
                canBuy={canHire}
              />
            );
          })}
        </div>
      </div>

      {/* Current roster & perks */}
      <div className="shop-section">
        <h3>Your Studio</h3>
        
        {state.perks.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ color: '#999', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Active Perks</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {state.perks.map(p => (
                <span key={p.id} className="perk-badge" title={p.description} style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
                  {p.name}
                </span>
              ))}
              {state.completionBond && (
                <span className="perk-badge" title="Next FLOP → MISS (no strike). One-use." style={{ fontSize: '0.8rem', padding: '4px 12px', background: 'rgba(46,204,113,0.2)', border: '1px solid #2ecc71', color: '#2ecc71' }}>
                  🛡️ Completion Bond (active)
                </span>
              )}
            </div>
          </div>
        )}
        
        <h4 style={{ color: '#999', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Roster ({state.roster.length}/8) — Train for $5M</h4>
        {state.roster.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🎭</div>
            <div className="empty-state-title">No Talent on Roster</div>
            <div className="empty-state-desc">Hire some talent above to fill your roster. You'll need them for casting!</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {state.roster.map(t => {
            const hasIncident = t.cards.some(c => c.cardType === 'incident');
            const hasAction = t.cards.some(c => c.cardType === 'action');
            const canTrain = state.budget >= 5;
            return (
              <div key={t.id} className="roster-chip" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
                  <span className={`talent-type ${t.type}`} style={{ marginRight: 4, fontSize: '0.55rem' }}>{t.type}</span>
                  <span style={{ color: 'var(--gold)' }}>{t.name}</span>
                  <span style={{ color: '#666', marginLeft: 4 }}>S{t.skill}/H{t.heat}</span>
                  {t.trait && <span style={{ color: '#888', marginLeft: 4, fontSize: '0.7rem', fontStyle: 'italic' }}>"{t.trait}"</span>}
                  <button className="fire-btn" onClick={() => fireTalent(t.id)} title="Fire talent" aria-label={`Fire ${t.name}`}>✕</button>
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4, fontSize: '0.65rem' }}>
                  <span style={{ color: '#2ecc71' }}>{t.cards.filter(c => c.cardType === 'action').length}A</span>
                  <span style={{ color: '#f1c40f' }}>{t.cards.filter(c => c.cardType === 'challenge').length}C</span>
                  <span style={{ color: '#e74c3c' }}>{t.cards.filter(c => c.cardType === 'incident').length}I</span>
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  {hasIncident && canTrain && (
                    <button className="btn-tiny" onClick={() => trainTalent(t.id, 'removeIncident')}
                      style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(192,57,43,0.1)', border: '1px solid var(--red)', color: 'var(--red-bright)' }}>
                      🗑️ Remove Incident ($5M)
                    </button>
                  )}
                  {hasAction && canTrain && (
                    <button className="btn-tiny" onClick={() => trainTalent(t.id, 'upgradeAction')}
                      style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(39,174,96,0.1)', border: '1px solid var(--green)', color: 'var(--green-bright)' }}>
                      ⬆️ Upgrade Action ($5M)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Debt paydown section */}
      {state.debt > 0 && (
        <div style={{ background: 'rgba(231,76,60,0.08)', borderRadius: 8, padding: 12, marginTop: 16 }}>
          <h4 style={{ color: '#e74c3c', margin: '0 0 8px' }}>💳 Debt: ${state.debt.toFixed(1)}M</h4>
          <div style={{ fontSize: '0.75rem', color: '#e74c3c', marginBottom: 8 }}>
            20% interest compounds each season. ≥$10M = -1 rep. ≥$20M = -2 rep. Pay it down now!
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[5, 10, Math.ceil(state.debt)].filter((v, i, a) => v <= state.budget && v <= state.debt && a.indexOf(v) === i).map(amt => (
              <button key={amt} className="btn btn-danger btn-small" onClick={() => payDebt(amt)}>
                Pay ${amt}M
              </button>
            ))}
            {state.budget < 1 && <span style={{ fontSize: '0.7rem', color: '#888' }}>No budget to pay debt</span>}
          </div>
        </div>
      )}

      {/* Season readiness summary */}
      <div style={{
        marginTop: 32, padding: '12px 16px', background: 'rgba(212,168,67,0.06)',
        border: '1px solid rgba(212,168,67,0.15)', borderRadius: 10, textAlign: 'center',
        maxWidth: 500, margin: '32px auto 0',
      }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '0.9rem', color: 'var(--gold)', letterSpacing: '0.05em', marginBottom: 6 }}>
          HEADING INTO SEASON {state.season + 1}
        </div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: '0.78rem', color: '#999', flexWrap: 'wrap' }}>
          <span>💰 ${state.budget.toFixed(1)}M budget</span>
          <span>🎭 {state.roster.length} talent</span>
          <span>⭐ {state.perks.length} perks</span>
          <span>{'★'.repeat(state.reputation)}{'☆'.repeat(5 - state.reputation)} rep</span>
          {state.debt > 0 && <span style={{ color: '#e74c3c' }}>⚠️ ${state.debt.toFixed(1)}M debt</span>}
        </div>
      </div>

      <div className="btn-group" style={{ marginTop: 16 }}>
        <button className="btn btn-primary btn-glow" onClick={() => { sfx.seasonTransition(); nextSeason(); }}>
          LIGHTS, CAMERA — SEASON {state.season + 1} →
        </button>
      </div>
    </div>
  );
}
