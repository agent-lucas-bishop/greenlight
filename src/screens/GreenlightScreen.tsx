import { useState } from 'react';
import { GameState } from '../types';
import { pickScript } from '../gameStore';
import { getSeasonTarget } from '../data';
import { getSeasonIdentity } from '../rivals';
import PhaseTip from '../components/PhaseTip';
import { isSimplifiedRun } from '../onboarding';
import { sfx } from '../sound';

export default function GreenlightScreen({ state }: { state: GameState }) {
  const [picked, setPicked] = useState<string | null>(null);
  const target = getSeasonTarget(state.season, state.gameMode, state.challengeId);
  const simplified = isSimplifiedRun();

  const handlePick = (script: typeof state.scriptChoices[0]) => {
    if (picked) return;
    sfx.scriptSelect();
    setPicked(script.id);
    setTimeout(() => pickScript(script), 500);
  };

  return (
    <div className="fade-in">
      <PhaseTip phase="greenlight" />
      <div className="phase-title">
        <h2>🎬 Greenlight</h2>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#d4a843', letterSpacing: 1, marginBottom: 2 }}>
          {getSeasonIdentity(state.season).name}
        </div>
        <div className="subtitle">Season {state.season} — Target: <strong style={{ color: 'var(--gold)' }}>${target}M</strong> — {getSeasonIdentity(state.season).description}</div>
      </div>

      {state.industryEvent && (
        <div className="event-banner animate-slide-down">📰 <strong>{state.industryEvent.name}</strong> — {state.industryEvent.description}</div>
      )}

      {/* Genre Trends */}
      <div style={{ textAlign: 'center', marginBottom: 12, fontSize: '0.85rem' }}>
        {state.hotGenres.length > 0 && (
          <span style={{ color: '#2ecc71', marginRight: 16 }}>
            🔥 Hot: <strong>{state.hotGenres.join(', ')}</strong> <span style={{ color: '#888', fontSize: '0.75rem' }}>(+40% box office)</span>
          </span>
        )}
        {state.coldGenres.length > 0 && (
          <span style={{ color: '#e74c3c' }}>
            ❄️ Cold: <strong>{state.coldGenres.join(', ')}</strong> <span style={{ color: '#888', fontSize: '0.75rem' }}>(-30% box office)</span>
          </span>
        )}
      </div>

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
                animationDelay: `${i * 0.1}s`,
              }}
            >
              <div className="card-subtitle">
                {script.genre}
                {state.hotGenres.includes(script.genre as any) && <span style={{ marginLeft: 6, color: '#2ecc71' }}>🔥 HOT</span>}
                {state.coldGenres.includes(script.genre as any) && <span style={{ marginLeft: 6, color: '#e74c3c' }}>❄️ COLD</span>}
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
              {!canAfford && !simplified && (
                <div style={{ marginTop: 8, color: '#e67e22', fontSize: '0.75rem' }}>
                  ⚠️ Goes into debt (+${(script.cost - state.budget).toFixed(0)}M) — 20% interest/season
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
