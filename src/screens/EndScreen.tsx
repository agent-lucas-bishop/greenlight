import { useState, useEffect } from 'react';
import { GameState } from '../types';
import { startGame } from '../gameStore';
import { recordRunEnd } from '../unlocks';

function getAchievements(state: GameState): { icon: string; name: string; desc: string }[] {
  const a: { icon: string; name: string; desc: string }[] = [];
  const history = state.seasonHistory;
  
  if (history.length >= 5 && history.every(h => h.hitTarget)) a.push({ icon: '🏆', name: 'Perfect Run', desc: 'Hit every target' });
  if (history.some(h => h.tier === 'BLOCKBUSTER')) a.push({ icon: '💎', name: 'Blockbuster Baby', desc: 'Made a Blockbuster' });
  if (history.filter(h => h.nominated).length >= 3) a.push({ icon: '🎭', name: 'Awards Darling', desc: '3+ nominations' });
  if (state.totalEarnings > 500) a.push({ icon: '💰', name: 'Money Machine', desc: '$500M+ total earnings' });
  if (history.some(h => h.quality >= 40)) a.push({ icon: '⭐', name: 'Masterpiece', desc: 'Quality 40+ on a film' });
  
  const genres = new Set(history.map(h => h.genre));
  if (genres.size >= 4) a.push({ icon: '🌈', name: 'Renaissance Studio', desc: 'Made 4+ different genres' });
  
  const genreCounts: Record<string, number> = {};
  history.forEach(h => { genreCounts[h.genre] = (genreCounts[h.genre] || 0) + 1; });
  if (Object.values(genreCounts).some(c => c >= 3)) a.push({ icon: '🎯', name: 'Genre Specialist', desc: 'Made 3+ films in one genre' });
  
  if (history.length >= 2 && history.slice(-2).every(h => h.tier === 'FLOP')) a.push({ icon: '💀', name: 'Death Spiral', desc: '2 flops in a row' });
  if (state.reputation >= 5) a.push({ icon: '👑', name: 'A-List Studio', desc: 'Reached max reputation' });
  
  return a;
}

export default function EndScreen({ state, type }: { state: GameState; type: 'gameover' | 'victory' }) {
  const isVictory = type === 'victory';
  const score = Math.round(state.totalEarnings * state.reputation * (1 + state.seasonHistory.filter(s => s.nominated).length * 0.2));
  const rank = score > 800 ? 'S' : score > 500 ? 'A' : score > 300 ? 'B' : score > 150 ? 'C' : 'D';
  const achievements = getAchievements(state);
  
  const [showStats, setShowStats] = useState(false);
  const [showFilmography, setShowFilmography] = useState(false);
  const [recorded, setRecorded] = useState(false);
  
  useEffect(() => {
    setTimeout(() => setShowStats(true), 800);
    setTimeout(() => setShowFilmography(true), 1500);
    if (!recorded) {
      recordRunEnd(isVictory, score, achievements.map(a => a.name));
      setRecorded(true);
    }
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

      {/* Achievements */}
      {showFilmography && achievements.length > 0 && (
        <div style={{ marginTop: 24 }} className="animate-slide-down">
          <h3 style={{ color: '#d4a843', marginBottom: 12 }}>Achievements</h3>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {achievements.map((a, i) => (
              <div key={i} style={{
                background: 'rgba(212,168,67,0.1)',
                border: '1px solid var(--gold-dim)',
                borderRadius: 8,
                padding: '10px 16px',
                textAlign: 'center',
                minWidth: 120,
              }}>
                <div style={{ fontSize: '1.5rem' }}>{a.icon}</div>
                <div style={{ color: '#d4a843', fontFamily: 'Bebas Neue', fontSize: '0.9rem' }}>{a.name}</div>
                <div style={{ color: '#888', fontSize: '0.7rem' }}>{a.desc}</div>
              </div>
            ))}
          </div>
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
