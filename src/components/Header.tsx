import { GameState } from '../types';
import { getSeasonTarget, STUDIO_ARCHETYPES } from '../data';

export default function Header({ state }: { state: GameState }) {
  return (
    <div className="header">
      <h1>🎬 GREENLIGHT</h1>
      <div className="header-stats">
        <div className="header-stat">
          <span className="label">Season</span>
          <span className="value">{state.season}/5</span>
        </div>
        <div className="header-stat">
          <span className="label">Budget</span>
          <span className="value">${state.budget.toFixed(1)}M</span>
        </div>
        <div className="header-stat">
          <span className="label">Reputation</span>
          <span className="value">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={`rep-star ${i < state.reputation ? 'filled' : 'empty'}`}>★</span>
            ))}
          </span>
        </div>
        <div className="header-stat">
          <span className="label">Target</span>
          <span className="value">${getSeasonTarget(state.season)}M</span>
        </div>
        <div className="header-stat">
          <span className="label">Strikes</span>
          <span className="value" style={{ color: state.strikes > 0 ? '#e74c3c' : undefined }}>
            {state.strikes}/3
          </span>
        </div>
      </div>
      {state.perks.length > 0 && (
        <div className="perks-bar">
          {state.perks.map(p => <span key={p.id} className="perk-badge" title={p.description}>{p.name}</span>)}
        </div>
      )}
    </div>
  );
}
