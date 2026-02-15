import { GameState } from '../types';
import { startGame } from '../gameStore';

export default function EndScreen({ state, type }: { state: GameState; type: 'gameover' | 'victory' }) {
  const isVictory = type === 'victory';
  const score = Math.round(state.totalEarnings * state.reputation * (1 + state.seasonHistory.filter(s => s.nominated).length * 0.2));
  
  const rank = score > 800 ? 'S' : score > 500 ? 'A' : score > 300 ? 'B' : score > 150 ? 'C' : 'D';

  return (
    <div className="end-screen">
      <h2 style={{ color: isVictory ? '#d4a843' : '#e74c3c' }}>
        {isVictory ? '🏆 LEGENDARY PRODUCER' : '💀 FIRED'}
      </h2>
      <p style={{ color: '#999', fontSize: '1.1rem', marginBottom: 8 }}>
        {isVictory
          ? 'You survived all 5 seasons. Hollywood will remember your name.'
          : state.reputation <= 0
            ? 'Your reputation hit rock bottom. Security escorted you out.'
            : 'Too many flops. The board has lost confidence.'}
      </p>

      <div style={{ fontSize: '4rem', fontFamily: 'Bebas Neue', color: '#d4a843', margin: '20px 0' }}>
        RANK: {rank}
      </div>

      <div className="end-stats">
        <div className="end-stat">
          <div className="label">Total Earnings</div>
          <div className="value">${state.totalEarnings.toFixed(1)}M</div>
        </div>
        <div className="end-stat">
          <div className="label">Films Made</div>
          <div className="value">{state.seasonHistory.length}</div>
        </div>
        <div className="end-stat">
          <div className="label">Nominations</div>
          <div className="value">{state.seasonHistory.filter(s => s.nominated).length}</div>
        </div>
        <div className="end-stat">
          <div className="label">Final Rep</div>
          <div className="value">{'★'.repeat(state.reputation)}{'☆'.repeat(5 - state.reputation)}</div>
        </div>
        <div className="end-stat">
          <div className="label">Score</div>
          <div className="value">{score}</div>
        </div>
      </div>

      {/* Filmography */}
      <div style={{ marginTop: 32 }}>
        <h3 style={{ color: '#d4a843', marginBottom: 12 }}>Filmography</h3>
        {state.seasonHistory.map((r, i) => (
          <div key={i} style={{ 
            display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center',
            padding: '8px 0', borderBottom: '1px solid #1e1e1e', fontSize: '0.9rem'
          }}>
            <span style={{ color: '#666' }}>S{r.season}</span>
            <span style={{ color: '#d4a843', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>{r.title}</span>
            <span className="card-stat blue">{r.genre}</span>
            <span style={{ color: r.hitTarget ? '#2ecc71' : '#e74c3c' }}>${r.boxOffice.toFixed(1)}M</span>
            {r.nominated && <span>🏆</span>}
          </div>
        ))}
      </div>

      <div className="btn-group" style={{ marginTop: 40 }}>
        <button className="btn btn-primary" onClick={startGame}>
          NEW RUN
        </button>
      </div>
    </div>
  );
}
