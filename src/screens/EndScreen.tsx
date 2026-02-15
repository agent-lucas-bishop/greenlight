import { useState, useEffect } from 'react';
import { GameState } from '../types';
import { startGame } from '../gameStore';

export default function EndScreen({ state, type }: { state: GameState; type: 'gameover' | 'victory' }) {
  const isVictory = type === 'victory';
  const score = Math.round(state.totalEarnings * state.reputation * (1 + state.seasonHistory.filter(s => s.nominated).length * 0.2));
  const rank = score > 800 ? 'S' : score > 500 ? 'A' : score > 300 ? 'B' : score > 150 ? 'C' : 'D';
  
  const [showStats, setShowStats] = useState(false);
  const [showFilmography, setShowFilmography] = useState(false);
  
  useEffect(() => {
    setTimeout(() => setShowStats(true), 800);
    setTimeout(() => setShowFilmography(true), 1500);
  }, []);

  const rankColors: Record<string, string> = { S: '#ff6b6b', A: '#ffd93d', B: '#6bcb77', C: '#5dade2', D: '#999' };

  return (
    <div className="end-screen fade-in">
      <h2 style={{ color: isVictory ? '#d4a843' : '#e74c3c' }} className="animate-title">
        {isVictory ? '🏆 LEGENDARY PRODUCER' : '💀 FIRED'}
      </h2>
      <p style={{ color: '#999', fontSize: '1.1rem', marginBottom: 8 }}>
        {isVictory
          ? 'You survived all 5 seasons. Hollywood will remember your name.'
          : state.reputation <= 0
            ? 'Your reputation hit rock bottom. Security escorted you out.'
            : 'Too many flops. The board has lost confidence.'}
      </p>

      <div className="rank-display" style={{ color: rankColors[rank] || '#d4a843' }}>
        RANK: {rank}
      </div>

      {showStats && (
        <div className="end-stats animate-slide-down">
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
      )}

      {/* Filmography */}
      {showFilmography && (
        <div style={{ marginTop: 32 }} className="animate-slide-down">
          <h3 style={{ color: '#d4a843', marginBottom: 12 }}>Filmography</h3>
          {state.seasonHistory.map((r, i) => (
            <div key={i} className="filmography-row">
              <span className="film-season">S{r.season}</span>
              <span className="film-title">{r.title}</span>
              <span className="card-stat blue">{r.genre}</span>
              <span style={{ color: r.hitTarget ? '#2ecc71' : '#e74c3c', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>
                ${r.boxOffice.toFixed(1)}M
              </span>
              {r.nominated && <span>🏆</span>}
              {r.hitTarget ? <span style={{ color: '#2ecc71' }}>✓</span> : <span style={{ color: '#e74c3c' }}>✗</span>}
            </div>
          ))}
        </div>
      )}

      {showFilmography && (
        <div className="btn-group" style={{ marginTop: 40 }}>
          <button className="btn btn-primary btn-glow" onClick={startGame}>
            NEW RUN
          </button>
        </div>
      )}
    </div>
  );
}
