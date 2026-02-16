import { useState } from 'react';
import { GameState, Talent, CardTemplate } from '../types';
import { buyPerk, hireTalent, fireTalent, nextSeason } from '../gameStore';

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
    <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 2, background: 'rgba(255,255,255,0.02)', borderRadius: 4, marginBottom: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}>
        <CardTypeBadge type={card.cardType} />
        <span style={{ fontWeight: 600, color: '#ccc' }}>{card.name}</span>
        <span style={{ color: card.baseQuality >= 0 ? '#2ecc71' : '#e74c3c', fontWeight: 600 }}>{card.baseQuality >= 0 ? '+' : ''}{card.baseQuality}</span>
      </div>
      {card.synergyText && (
        <div style={{ fontSize: '0.6rem', color: '#9b59b6', paddingLeft: 4 }}>✨ {card.synergyText}</div>
      )}
    </div>
  );
}

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
        
        <h4 style={{ color: '#999', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Roster ({state.roster.length}/8)</h4>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {state.roster.map(t => (
            <div key={t.id} className="roster-chip">
              <span className={`talent-type ${t.type}`} style={{ marginRight: 4, fontSize: '0.55rem' }}>{t.type}</span>
              <span style={{ color: 'var(--gold)' }}>{t.name}</span>
              <span style={{ color: '#666', marginLeft: 4 }}>S{t.skill}/H{t.heat}</span>
              {t.trait && <span style={{ color: '#888', marginLeft: 4, fontSize: '0.7rem', fontStyle: 'italic' }}>"{t.trait}"</span>}
              <button 
                className="fire-btn"
                onClick={() => fireTalent(t.id)}
                title="Fire talent"
              >✕</button>
            </div>
          ))}
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
