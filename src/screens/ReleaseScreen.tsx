import { useState, useEffect } from 'react';
import { GameState } from '../types';
import { getSeasonTarget } from '../data';
import { proceedToShop } from '../gameStore';

function CountUp({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0);
  
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(target * eased * 10) / 10);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  
  return <>${current.toFixed(1)}M</>;
}

export default function ReleaseScreen({ state }: { state: GameState }) {
  const target = getSeasonTarget(state.season);
  const hit = state.lastBoxOffice >= target;
  const lastResult = state.seasonHistory[state.seasonHistory.length - 1];
  const [showResult, setShowResult] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  useEffect(() => {
    // Staggered reveals
    const t1 = setTimeout(() => setShowResult(true), 1600);
    const t2 = setTimeout(() => setShowDetails(true), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Show the reputation that was used for scoring (before update)
  // The state.reputation is already updated, so we need to reverse-engineer
  const repUsed = hit ? state.reputation - 1 : state.reputation + 1;
  const repBonus = [0, 0.5, 0.75, 1.0, 1.25, 1.5][Math.max(0, Math.min(5, repUsed))] || 1.0;

  return (
    <div className="box-office fade-in">
      <div className="phase-title">
        <h2>🎞️ Release Day</h2>
        <div className="subtitle">"{state.currentScript?.title}" hits theaters!</div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <span className="card-stat blue">Market: {state.activeMarket?.name}</span>
        <span className="card-stat gold">Quality: {state.lastQuality}</span>
        <span className="card-stat gold">Rep: ×{repBonus}</span>
      </div>

      <div className={`box-office-number ${showResult ? (hit ? 'hit' : 'miss') : ''}`}>
        <CountUp target={state.lastBoxOffice} />
      </div>
      
      <div className={`box-office-target ${showResult ? 'revealed' : 'hidden'}`}>
        Target: ${target}M — {hit ? '✅ HIT!' : '❌ MISS'}
      </div>

      {showResult && !hit && (
        <div className="strike-banner animate-shake" style={{ marginTop: 12 }}>
          STRIKE {state.strikes}/3
        </div>
      )}

      {lastResult?.nominated && showDetails && (
        <div className="nomination-banner animate-slide-down" style={{ marginTop: 16 }}>
          🏆 NOMINATED FOR BEST PICTURE!
        </div>
      )}

      {showDetails && (
        <div className="cast-summary animate-slide-down" style={{ marginTop: 24 }}>
          {state.castSlots.map((slot, i) => slot.talent && (
            <div key={i} className="cast-credit">
              <span style={{ color: '#999' }}>{slot.slotType}: </span>
              <span style={{ color: '#d4a843' }}>{slot.talent.name}</span>
              <span style={{ color: '#666' }}> (S{slot.talent.skill}/H{slot.talent.heat})</span>
            </div>
          ))}
        </div>
      )}

      {/* Season history */}
      <div className="history" style={{ marginTop: 32 }}>
        {Array.from({ length: 5 }, (_, i) => {
          const r = state.seasonHistory[i];
          return (
            <div key={i} className={`history-pip ${i + 1 === state.season ? 'current' : ''} ${r ? (r.hitTarget ? 'hit' : 'miss') : ''}`}>
              {r ? (r.hitTarget ? '✓' : '✗') : (i + 1)}
            </div>
          );
        })}
      </div>

      {showDetails && (
        <div className="btn-group">
          <button className="btn btn-primary" onClick={proceedToShop}>
            {state.season >= 5 || state.strikes >= 3 || state.reputation <= 0
              ? 'SEE FINAL RESULTS →'
              : 'OFF-SEASON →'}
          </button>
        </div>
      )}
    </div>
  );
}
