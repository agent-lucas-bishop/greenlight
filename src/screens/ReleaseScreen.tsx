import { GameState } from '../types';
import { getSeasonTarget } from '../data';
import { proceedToShop } from '../gameStore';

export default function ReleaseScreen({ state }: { state: GameState }) {
  const target = getSeasonTarget(state.season);
  const hit = state.lastBoxOffice >= target;
  const lastResult = state.seasonHistory[state.seasonHistory.length - 1];

  return (
    <div className="box-office">
      <div className="phase-title">
        <h2>🎞️ Release Day</h2>
        <div className="subtitle">"{state.currentScript?.title}" hits theaters!</div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <span className="card-stat blue">Market: {state.activeMarket?.name}</span>
        <span className="card-stat gold">Quality: {state.lastQuality}</span>
        <span className="card-stat gold">Rep: ×{[0, 0.5, 0.75, 1.0, 1.25, 1.5][state.reputation]}</span>
      </div>

      <div className={`box-office-number ${hit ? 'hit' : 'miss'}`}>
        ${state.lastBoxOffice.toFixed(1)}M
      </div>
      <div className="box-office-target">
        Target: ${target}M — {hit ? '✅ HIT!' : '❌ MISS'}
      </div>

      {lastResult?.nominated && (
        <div style={{ marginTop: 16, color: '#d4a843', fontSize: '1.2rem' }}>
          🏆 NOMINATED FOR BEST PICTURE!
        </div>
      )}

      <div style={{ marginTop: 24, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        {state.castSlots.map((slot, i) => slot.talent && (
          <div key={i} style={{ background: '#1e1e1e', padding: '8px 12px', borderRadius: 6, fontSize: '0.8rem' }}>
            <span style={{ color: '#999' }}>{slot.slotType}: </span>
            <span style={{ color: '#d4a843' }}>{slot.talent.name}</span>
            <span style={{ color: '#666' }}> (S{slot.talent.skill}/H{slot.talent.heat})</span>
          </div>
        ))}
      </div>

      {/* Season history */}
      <div className="history" style={{ marginTop: 32 }}>
        {Array.from({ length: 5 }, (_, i) => {
          const r = state.seasonHistory[i];
          return (
            <div key={i} className={`history-pip ${i + 1 === state.season ? 'current' : ''} ${r ? (r.hitTarget ? 'hit' : 'miss') : ''}`}>
              {i + 1}
            </div>
          );
        })}
      </div>

      <div className="btn-group">
        <button className="btn btn-primary" onClick={proceedToShop}>
          {state.season >= 5 || state.strikes >= 3 || state.reputation <= 0
            ? 'SEE FINAL RESULTS'
            : 'OFF-SEASON →'}
        </button>
      </div>
    </div>
  );
}
