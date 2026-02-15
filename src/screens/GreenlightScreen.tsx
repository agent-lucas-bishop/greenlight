import { GameState } from '../types';
import { pickScript } from '../gameStore';

export default function GreenlightScreen({ state }: { state: GameState }) {
  return (
    <div>
      <div className="phase-title">
        <h2>🎬 Greenlight</h2>
        <div className="subtitle">Season {state.season} — Choose your next production</div>
      </div>

      {state.industryEvent && (
        <div className="event-banner">📰 {state.industryEvent}</div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 16, fontSize: '0.85rem', color: '#999' }}>
        Market conditions this season:
        {state.marketConditions.map(m => (
          <span key={m.id} className="card-stat gold" style={{ marginLeft: 8 }}>{m.name}</span>
        ))}
      </div>

      <div className="card-grid card-grid-3">
        {state.scriptChoices.map(script => (
          <div
            key={script.id}
            className="card"
            onClick={() => pickScript(script)}
            style={{ opacity: state.budget < script.cost ? 0.4 : 1 }}
          >
            <div className="card-subtitle">{script.genre}</div>
            <div className="card-title">{script.title}</div>
            <div style={{ marginBottom: 8 }}>
              <span className="card-stat gold">Base {script.baseScore}</span>
              {script.cost > 0 && <span className="card-stat red">-${script.cost}M</span>}
              <span className="card-stat blue">{script.slots.length} slots</span>
            </div>
            <div className="card-body">
              Slots: {script.slots.join(', ')}
              {script.abilityDesc && (
                <div style={{ marginTop: 6, color: '#d4a843', fontStyle: 'italic', fontSize: '0.8rem' }}>
                  ✨ {script.abilityDesc}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
