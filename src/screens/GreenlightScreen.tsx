import { useState } from 'react';
import { GameState } from '../types';
import { pickScript } from '../gameStore';
import { getSeasonTarget } from '../data';

export default function GreenlightScreen({ state }: { state: GameState }) {
  const [picked, setPicked] = useState<string | null>(null);
  const target = getSeasonTarget(state.season);

  const handlePick = (script: typeof state.scriptChoices[0]) => {
    if (state.budget < script.cost || picked) return;
    setPicked(script.id);
    setTimeout(() => pickScript(script), 500);
  };

  return (
    <div className="fade-in">
      <div className="phase-title">
        <h2>🎬 Greenlight</h2>
        <div className="subtitle">Season {state.season} — Target: <strong style={{ color: 'var(--gold)' }}>${target}M</strong> — Choose your next production</div>
      </div>

      {state.industryEvent && (
        <div className="event-banner animate-slide-down">📰 <strong>{state.industryEvent.name}</strong> — {state.industryEvent.description}</div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 20, fontSize: '0.85rem', color: '#999' }}>
        <span style={{ marginRight: 8 }}>Possible markets:</span>
        {state.marketConditions.map(m => (
          <span key={m.id} className="card-stat gold" style={{ marginLeft: 4 }}>
            {m.name} ({m.description})
          </span>
        ))}
      </div>

      <div className="card-grid card-grid-3">
        {state.scriptChoices.map((script, i) => {
          const canAfford = state.budget >= script.cost;
          const isPicked = picked === script.id;
          const isOther = picked && !isPicked;
          
          // Check if any market condition matches this genre
          const hasMarketMatch = state.marketConditions.some(m => m.genreBonus === script.genre);
          
          return (
            <div
              key={script.id}
              className={`card ${isPicked ? 'chosen' : ''} ${isOther ? 'not-chosen' : ''}`}
              onClick={() => handlePick(script)}
              style={{ 
                opacity: !canAfford ? 0.4 : 1,
                animationDelay: `${i * 0.1}s`,
              }}
            >
              <div className="card-subtitle">
                {script.genre}
                {hasMarketMatch && <span style={{ marginLeft: 6, color: 'var(--green-bright)' }}>📈 Market match!</span>}
              </div>
              <div className="card-title">{script.title}</div>
              <div style={{ marginBottom: 8 }}>
                <span className="card-stat gold">Base {script.baseScore}</span>
                {script.cost > 0 && <span className="card-stat red">-${script.cost}M</span>}
                <span className="card-stat blue">{script.slots.length} slots</span>
                {(state.genreMastery[script.genre] || 0) > 0 && (
                  <span className="card-stat green">🎓 Mastery +{(state.genreMastery[script.genre] || 0) * 2}</span>
                )}
              </div>
              <div className="card-body">
                Slots: {script.slots.join(', ')}
                {script.abilityDesc && (
                  <div style={{ marginTop: 8, color: '#d4a843', fontStyle: 'italic', fontSize: '0.8rem' }}>
                    ✨ {script.abilityDesc}
                  </div>
                )}
              </div>
              {!canAfford && (
                <div style={{ marginTop: 8, color: 'var(--red-bright)', fontSize: '0.75rem' }}>
                  Can't afford (need ${script.cost}M)
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
