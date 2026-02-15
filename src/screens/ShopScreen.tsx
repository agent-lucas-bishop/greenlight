import { GameState } from '../types';
import { buyPerk, hireTalent, nextSeason } from '../gameStore';

export default function ShopScreen({ state }: { state: GameState }) {
  return (
    <div>
      <div className="phase-title">
        <h2>🏠 Off-Season</h2>
        <div className="subtitle">Budget: ${state.budget.toFixed(1)}M — Prepare for Season {state.season + 1}</div>
      </div>

      {state.industryEvent && (
        <div className="event-banner">📰 Industry Event: {state.industryEvent}</div>
      )}

      {/* Studio Perks */}
      <div className="shop-section">
        <h3>🎬 Studio Perks ({state.perks.length}/5)</h3>
        {state.perks.length >= 5 && <p style={{ color: '#666', fontSize: '0.85rem' }}>Max perks reached!</p>}
        <div className="card-grid card-grid-4">
          {state.perkMarket.map(perk => (
            <div
              key={perk.id}
              className="card"
              onClick={() => buyPerk(perk)}
              style={{ opacity: state.budget < perk.cost || state.perks.length >= 5 ? 0.4 : 1 }}
            >
              <div className="card-title">{perk.name}</div>
              <div className="card-stat gold">${perk.cost}M</div>
              <div className="card-body" style={{ marginTop: 8 }}>{perk.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Hire Talent */}
      <div className="shop-section">
        <h3>🎭 Hire Talent (Roster: {state.roster.length}/8)</h3>
        <div className="card-grid card-grid-4">
          {state.talentMarket.map(t => (
            <div
              key={t.id}
              className="card talent-card"
              onClick={() => hireTalent(t)}
              style={{ opacity: state.budget < t.cost || state.roster.length >= 8 ? 0.4 : 1 }}
            >
              <span className={`talent-type ${t.type}`}>{t.type}</span>
              <div className="card-title">{t.name}</div>
              <div>
                <span className="card-stat green">Skill {t.skill}</span>
                <span className="card-stat red">Heat {t.heat}</span>
                <span className="card-stat gold">${t.cost}M</span>
              </div>
              {t.genreBonus && <div className="card-stat blue">{t.genreBonus.genre} +{t.genreBonus.bonus}</div>}
              {t.trait && <div className="trait-badge">"{t.trait}"</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Current perks */}
      {state.perks.length > 0 && (
        <div className="shop-section">
          <h3>Your Perks</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {state.perks.map(p => (
              <span key={p.id} className="perk-badge" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
                {p.name} — {p.description}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="btn-group">
        <button className="btn btn-primary" onClick={nextSeason}>
          BEGIN SEASON {state.season + 1} →
        </button>
      </div>
    </div>
  );
}
