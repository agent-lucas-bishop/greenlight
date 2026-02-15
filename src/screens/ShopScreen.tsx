import { GameState } from '../types';
import { buyPerk, hireTalent, fireTalent, nextSeason } from '../gameStore';

export default function ShopScreen({ state }: { state: GameState }) {
  return (
    <div className="fade-in">
      <div className="phase-title">
        <h2>🏠 Off-Season</h2>
        <div className="subtitle">Budget: <strong style={{ color: 'var(--gold)' }}>${state.budget.toFixed(1)}M</strong> — Prepare for Season {state.season + 1}</div>
      </div>

      {state.industryEvent && (
        <div className="event-banner animate-slide-down">📰 Industry Event: {state.industryEvent}</div>
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
              <div
                key={t.id}
                className="card talent-card"
                onClick={() => canHire && hireTalent(t)}
                style={{ opacity: canHire ? 1 : 0.4, cursor: canHire ? 'pointer' : 'not-allowed' }}
              >
                <span className={`talent-type ${t.type}`}>{t.type}</span>
                <div className="card-title">{t.name}</div>
                <div>
                  <span className="card-stat green">Skill {t.skill}</span>
                  <span className="card-stat red">Heat {t.heat}</span>
                  <span className="card-stat gold">${t.cost}M</span>
                </div>
                {t.genreBonus && <div className="card-stat blue">{t.genreBonus.genre} +{t.genreBonus.bonus}</div>}
                {t.trait && <div className="trait-badge">"{t.trait}" — {t.traitDesc}</div>}
              </div>
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
