import { useState, useEffect, useMemo } from 'react';
import { GameState } from '../types';
import { startGame } from '../gameStore';
import { recordRunEnd, getActiveLegacyPerks, getNewlyUnlockedPerks } from '../unlocks';
import { sfx } from '../sound';
import { addLeaderboardEntry, getLeaderboard } from '../leaderboard';
import { getChallengeById, CHALLENGE_MODES } from '../challenges';

function VictoryParticles() {
  const particles = useMemo(() => {
    const emojis = ['🌟', '⭐', '🏆', '🎬', '✨', '🎭', '🎥', '💫'];
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      emoji: emojis[i % emojis.length],
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 4,
      size: 0.8 + Math.random() * 1.2,
    }));
  }, []);
  
  return (
    <div className="victory-particles">
      {particles.map(p => (
        <div key={p.id} className="particle" style={{
          left: `${p.left}%`,
          animationDelay: `${p.delay}s`,
          animationDuration: `${p.duration}s`,
          fontSize: `${p.size}rem`,
        }}>{p.emoji}</div>
      ))}
    </div>
  );
}

function getAchievements(state: GameState): { icon: string; name: string; desc: string }[] {
  const a: { icon: string; name: string; desc: string }[] = [];
  const history = state.seasonHistory;
  
  if (history.length >= 5 && history.every(h => h.hitTarget)) a.push({ icon: '🏆', name: 'Perfect Run', desc: 'Hit every target' });
  if (history.some(h => h.tier === 'BLOCKBUSTER')) a.push({ icon: '💎', name: 'Blockbuster Baby', desc: 'Made a Blockbuster' });
  if (history.filter(h => h.nominated).length >= 3) a.push({ icon: '🎭', name: 'Awards Darling', desc: '3+ nominations' });
  if (state.totalEarnings > 500) a.push({ icon: '💰', name: 'Money Machine', desc: '$500M+ total earnings' });
  if (history.some(h => h.quality >= 40)) a.push({ icon: '⭐', name: 'Masterpiece', desc: 'Quality 40+ on a film' });
  if (state.gameMode === 'newGamePlus' && history.length >= 5 && history.every(h => h.hitTarget)) a.push({ icon: '🌟', name: 'NG+ Perfect', desc: 'Perfect run on New Game+' });
  if (state.gameMode === 'directorMode' && history.length >= 5 && history.every(h => h.hitTarget)) a.push({ icon: '💎', name: 'Director\'s Vision', desc: 'Perfect run on Director Mode' });
  
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
  const challenge = state.challengeId ? getChallengeById(state.challengeId) : undefined;
  const challengeMultiplier = challenge?.scoreMultiplier || 1.0;
  const baseScore = Math.round(state.totalEarnings * state.reputation * (1 + state.seasonHistory.filter(s => s.nominated).length * 0.2));
  const score = Math.round(baseScore * challengeMultiplier);
  const rank = score > 800 ? 'S' : score > 500 ? 'A' : score > 300 ? 'B' : score > 150 ? 'C' : 'D';
  const achievements = getAchievements(state);
  
  const [showStats, setShowStats] = useState(false);
  const [showFilmography, setShowFilmography] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [newPerks, setNewPerks] = useState<{ id: string; name: string; emoji: string; description: string }[]>([]);
  
  useEffect(() => {
    if (isVictory) sfx.victory(); else sfx.flop();
    setTimeout(() => setShowStats(true), 800);
    setTimeout(() => setShowFilmography(true), 1500);
    if (!recorded) {
      const beforePerks = getActiveLegacyPerks().map(p => p.id);
      // Figure out dominant tag from last production
      const lastProd = state.production;
      let dominantTag: string | undefined;
      if (lastProd?.tagsPlayed) {
        const entries = Object.entries(lastProd.tagsPlayed);
        if (entries.length > 0) {
          const total = entries.reduce((s, [, c]) => s + c, 0);
          const [topTag, topCount] = entries.reduce((best, curr) => curr[1] > best[1] ? curr : best);
          if (topCount / total >= 0.5) dominantTag = topTag;
        }
      }
      const seasonData = state.seasonHistory.map(s => ({ genre: s.genre, tier: s.tier, quality: s.quality, hitTarget: s.hitTarget }));
      recordRunEnd(isVictory, score, achievements.map(a => a.name), state.gameMode, seasonData, dominantTag);
      const afterPerks = getActiveLegacyPerks();
      const newlyUnlocked = afterPerks.filter(p => !beforePerks.includes(p.id));
      if (newlyUnlocked.length > 0) setNewPerks(newlyUnlocked);
      // Record to leaderboard
      addLeaderboardEntry({
        date: new Date().toISOString().slice(0, 10),
        score,
        rank,
        seasons: state.seasonHistory.length,
        earnings: state.totalEarnings,
        reputation: state.reputation,
        mode: state.gameMode,
        challenge: state.challengeId,
        archetype: state.studioArchetype || 'unknown',
        films: state.seasonHistory.map(s => ({ title: s.title, genre: s.genre, tier: s.tier })),
        won: isVictory,
        dailySeed: state.dailySeed,
      });
      setRecorded(true);
    }
  }, []);

  const rankColors: Record<string, string> = { S: '#ff6b6b', A: '#ffd93d', B: '#6bcb77', C: '#5dade2', D: '#999' };

  return (
    <div className="end-screen fade-in">
      {isVictory && <VictoryParticles />}
      <h2 style={{ color: isVictory ? '#d4a843' : '#e74c3c' }} className={isVictory ? 'end-title-victory' : 'end-title-gameover'}>
        {isVictory ? '🏆 LEGENDARY PRODUCER' : '💀 FIRED'}
      </h2>
      {state.gameMode !== 'normal' && (
        <div style={{ marginBottom: 8, fontSize: '0.85rem', color: state.gameMode === 'directorMode' ? '#e74c3c' : 'var(--gold)' }}>
          {state.gameMode === 'newGamePlus' ? '⭐ New Game+' : state.gameMode === 'directorMode' ? '🔥 Director Mode' : state.gameMode === 'daily' ? '📅 Daily Run' : ''}
        </div>
      )}
      {challenge && (
        <div style={{ marginBottom: 8, fontSize: '0.85rem', color: '#e67e22' }}>
          {challenge.emoji} {challenge.name} Challenge (×{challenge.scoreMultiplier} score)
        </div>
      )}
      <p style={{ color: '#999', fontSize: '1.1rem', marginBottom: 8 }}>
        {isVictory
          ? 'You survived all 5 seasons. Hollywood will remember your name.'
          : state.reputation <= 0
            ? 'Your reputation hit rock bottom. Security escorted you out.'
            : 'Too many flops. The board has lost confidence.'}
      </p>

      <div className="rank-display score-reveal" style={{ color: rankColors[rank] || '#d4a843' }}>
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

      {/* Newly unlocked Legacy Perks */}
      {showFilmography && newPerks.length > 0 && (
        <div style={{ marginTop: 24 }} className="animate-slide-down">
          <h3 style={{ color: '#2ecc71', marginBottom: 12 }}>🔓 NEW LEGACY PERKS UNLOCKED!</h3>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {newPerks.map((p, i) => (
              <div key={i} style={{
                background: 'rgba(46,204,113,0.15)',
                border: '2px solid #2ecc71',
                borderRadius: 8,
                padding: '12px 16px',
                textAlign: 'center',
                minWidth: 140,
                animation: 'comboAppear 0.5s ease',
              }}>
                <div style={{ fontSize: '1.8rem' }}>{p.emoji}</div>
                <div style={{ color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{p.name}</div>
                <div style={{ color: '#aaa', fontSize: '0.7rem' }}>{p.description}</div>
              </div>
            ))}
          </div>
          <p style={{ color: '#888', fontSize: '0.75rem', marginTop: 8 }}>Legacy perks apply to all future runs!</p>
        </div>
      )}

      {showFilmography && (
        <div className="btn-group" style={{ marginTop: 40 }}>
          <button className="btn btn-primary btn-glow" onClick={() => startGame()}>
            NEW RUN
          </button>
        </div>
      )}
    </div>
  );
}
