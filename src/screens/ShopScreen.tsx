import { useState } from 'react';
import { GameState, Talent, CardTemplate, CardTag } from '../types';
import { buyPerk, hireTalent, fireTalent, trainTalent, nextSeason } from '../gameStore';
import { CardTypeBadge, CardPreview } from '../components/CardComponents';
import PhaseTip from '../components/PhaseTip';

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
      style={{ opacity: canBuy ? 1 : 0.4, cursor: canBuy ? 'pointer' : 'not-allowed' }}
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
  return (
    <div className="fade-in">
      <PhaseTip phase="shop" />
      <div className="phase-title">
        <h2>🏠 Off-Season</h2>
        <div className="subtitle">Budget: <strong style={{ color: 'var(--gold)' }}>${state.budget.toFixed(1)}M</strong> — Prepare for Season {state.season + 1}</div>
      </div>

      {state.industryEvent && (
        <div className="event-banner animate-slide-down">📰 <strong>{state.industryEvent.name}</strong> — {state.industryEvent.description}</div>
      )}

      {/* Studio Perks */}
      <div className="shop-section">
        <h3>🎬 Studio Perks ({state.perks.length}/5)</h3>
        {state.perks.length >= 5 && <p style={{ color: '#666', fontSize: '0.85rem' }}>Max perks reached!</p>}
        <div className="card-grid card-grid-4">
          {state.perkMarket.map(perk => {
            const canBuy = state.budget >= perk.cost && state.perks.length < 5;
            return (
              <div
                key={perk.id}
                className="card"
                onClick={() => canBuy && buyPerk(perk)}
                style={{ opacity: canBuy ? 1 : 0.4, cursor: canBuy ? 'pointer' : 'not-allowed' }}
              >
                <div className="card-title">{perk.name}</div>
                <div className="card-stat gold">${perk.cost}M</div>
                <div className="card-body" style={{ marginTop: 8 }}>{perk.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hire Talent */}
      <div className="shop-section">
        <h3>🎭 Hire Talent (Roster: {state.roster.length}/8)</h3>
        <div className="card-grid card-grid-4">
          {state.talentMarket.map(t => {
            const canHire = state.budget >= t.cost && state.roster.length < 8;
            return (
              <TalentShopCard
                key={t.id}
                t={t}
                onClick={() => hireTalent(t)}
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
            </div>
          </div>
        )}
        
        <h4 style={{ color: '#999', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Roster ({state.roster.length}/8) — Train for $5M</h4>
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
                  <button className="fire-btn" onClick={() => fireTalent(t.id)} title="Fire talent">✕</button>
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4, fontSize: '0.65rem' }}>
                  <span style={{ color: '#2ecc71' }}>{t.cards.filter(c => c.cardType === 'action').length}A</span>
                  <span style={{ color: '#f1c40f' }}>{t.cards.filter(c => c.cardType === 'challenge').length}C</span>
                  <span style={{ color: '#e74c3c' }}>{t.cards.filter(c => c.cardType === 'incident').length}I</span>
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  {hasIncident && canTrain && (
                    <button className="btn-tiny" onClick={() => trainTalent(t.id, 'removeIncident')}
                      style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(231,76,60,0.15)', border: '1px solid #e74c3c', color: '#e74c3c' }}>
                      🗑️ Remove Incident ($5M)
                    </button>
                  )}
                  {hasAction && canTrain && (
                    <button className="btn-tiny" onClick={() => trainTalent(t.id, 'upgradeAction')}
                      style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(46,204,113,0.15)', border: '1px solid #2ecc71', color: '#2ecc71' }}>
                      ⬆️ Upgrade Action ($5M)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="btn-group" style={{ marginTop: 32 }}>
        <button className="btn btn-primary btn-glow" onClick={nextSeason}>
          BEGIN SEASON {state.season + 1} →
        </button>
      </div>
    </div>
  );
}
