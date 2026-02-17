/**
 * R276 — Multiplayer Lobby: Pre-game setup for hot-seat multiplayer
 */

import { useState } from 'react';
import { STUDIO_ARCHETYPES } from '../data';
import type { StudioArchetypeId } from '../types';
import type { VictoryCondition, MultiplayerSettings } from '../multiplayer';
import { getVictoryConditionLabel } from '../multiplayer';

interface PlayerConfig {
  name: string;
  studioName: string;
  archetype: StudioArchetypeId;
}

interface Props {
  onStart: (settings: MultiplayerSettings, players: PlayerConfig[]) => void;
  onBack: () => void;
}

const DEFAULT_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
const DEFAULT_STUDIOS = ['Crimson Studios', 'Azure Pictures', 'Emerald Films', 'Golden Gate Studios'];

export default function MultiplayerLobby({ onStart, onBack }: Props) {
  const [playerCount, setPlayerCount] = useState(2);
  const [seasonCount, setSeasonCount] = useState<5 | 8 | 12>(5);
  const [victoryCondition, setVictoryCondition] = useState<VictoryCondition>('most_earnings');
  const [scoreThreshold, setScoreThreshold] = useState(500);
  const [players, setPlayers] = useState<PlayerConfig[]>(
    Array.from({ length: 4 }, (_, i) => ({
      name: DEFAULT_NAMES[i],
      studioName: DEFAULT_STUDIOS[i],
      archetype: (['prestige', 'blockbuster', 'indie', 'chaos'] as StudioArchetypeId[])[i],
    })),
  );

  const updatePlayer = (index: number, updates: Partial<PlayerConfig>) => {
    setPlayers(prev => prev.map((p, i) => (i === index ? { ...p, ...updates } : p)));
  };

  const handleStart = () => {
    const activePlayers = players.slice(0, playerCount);
    // Validate names
    for (const p of activePlayers) {
      if (!p.name.trim() || !p.studioName.trim()) return;
    }
    onStart(
      { playerCount, seasonCount, victoryCondition, scoreThreshold },
      activePlayers,
    );
  };

  const canStart = players.slice(0, playerCount).every(p => p.name.trim() && p.studioName.trim());

  return (
    <div className="fade-in" style={{ textAlign: 'center', padding: '40px 20px', maxWidth: 700, margin: '0 auto' }}>
      <h2 style={{ color: 'var(--gold)', marginBottom: 4, fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.08em' }}>
        👥 MULTIPLAYER LOBBY
      </h2>
      <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 24 }}>
        Local hot-seat — pass the device between turns
      </p>

      {/* Player Count */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: '#aaa', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
          Players
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {[2, 3, 4].map(n => (
            <button
              key={n}
              className="btn btn-small"
              style={{
                color: playerCount === n ? 'var(--gold)' : '#666',
                borderColor: playerCount === n ? 'var(--gold)' : '#333',
                background: playerCount === n ? 'rgba(212,168,67,0.1)' : 'transparent',
                minWidth: 60,
              }}
              onClick={() => setPlayerCount(n)}
            >
              {n} Players
            </button>
          ))}
        </div>
      </div>

      {/* Player Configs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {Array.from({ length: playerCount }, (_, i) => {
          const p = players[i];
          const archetype = STUDIO_ARCHETYPES.find(a => a.id === p.archetype);
          return (
            <div
              key={i}
              style={{
                padding: '16px 20px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid #333',
                borderRadius: 10,
                textAlign: 'left',
              }}
            >
              <div style={{ color: 'var(--gold)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', marginBottom: 10, letterSpacing: '0.05em' }}>
                🎬 PLAYER {i + 1}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                <div style={{ flex: '1 1 140px' }}>
                  <label style={{ color: '#888', fontSize: '0.65rem', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Name</label>
                  <input
                    type="text"
                    value={p.name}
                    onChange={e => updatePlayer(i, { name: e.target.value })}
                    maxLength={20}
                    style={{
                      width: '100%', padding: '8px 12px', background: '#1a1a1a', border: '1px solid #333',
                      borderRadius: 6, color: '#eee', fontSize: '0.85rem',
                    }}
                  />
                </div>
                <div style={{ flex: '1 1 160px' }}>
                  <label style={{ color: '#888', fontSize: '0.65rem', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Studio Name</label>
                  <input
                    type="text"
                    value={p.studioName}
                    onChange={e => updatePlayer(i, { studioName: e.target.value })}
                    maxLength={24}
                    style={{
                      width: '100%', padding: '8px 12px', background: '#1a1a1a', border: '1px solid #333',
                      borderRadius: 6, color: '#eee', fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>
              {/* Archetype picker */}
              <label style={{ color: '#888', fontSize: '0.65rem', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Archetype</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {STUDIO_ARCHETYPES.map(a => (
                  <button
                    key={a.id}
                    className="btn btn-small"
                    title={a.description}
                    style={{
                      color: p.archetype === a.id ? 'var(--gold)' : '#888',
                      borderColor: p.archetype === a.id ? 'var(--gold)' : '#333',
                      background: p.archetype === a.id ? 'rgba(212,168,67,0.1)' : 'transparent',
                      fontSize: '0.75rem',
                      padding: '4px 10px',
                    }}
                    onClick={() => updatePlayer(i, { archetype: a.id as StudioArchetypeId })}
                  >
                    {a.emoji} {a.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Game Settings */}
      <div style={{
        padding: '16px 20px', background: 'rgba(52,152,219,0.06)', border: '1px solid rgba(52,152,219,0.15)',
        borderRadius: 10, marginBottom: 24, textAlign: 'left',
      }}>
        <div style={{ color: '#3498db', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.9rem', marginBottom: 12, letterSpacing: '0.05em' }}>
          ⚙️ GAME SETTINGS
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
          <div>
            <label style={{ color: '#888', fontSize: '0.65rem', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Seasons</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {([5, 8, 12] as const).map(n => (
                <button
                  key={n}
                  className="btn btn-small"
                  style={{
                    color: seasonCount === n ? '#3498db' : '#666',
                    borderColor: seasonCount === n ? '#3498db' : '#333',
                    background: seasonCount === n ? 'rgba(52,152,219,0.1)' : 'transparent',
                    minWidth: 40,
                    fontSize: '0.75rem',
                  }}
                  onClick={() => setSeasonCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ color: '#888', fontSize: '0.65rem', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Victory Condition</label>
            <select
              value={victoryCondition}
              onChange={e => setVictoryCondition(e.target.value as VictoryCondition)}
              style={{
                background: '#1a1a1a', color: '#ccc', border: '1px solid #333', borderRadius: 6,
                padding: '6px 10px', fontSize: '0.75rem', width: '100%',
              }}
            >
              <option value="most_earnings">💰 Most Total Earnings</option>
              <option value="score_threshold">🎯 First to Score Threshold</option>
              <option value="highest_reputation">⭐ Highest Reputation</option>
            </select>
          </div>
        </div>

        {victoryCondition === 'score_threshold' && (
          <div style={{ marginBottom: 8 }}>
            <label style={{ color: '#888', fontSize: '0.65rem', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Score Threshold</label>
            <input
              type="number"
              value={scoreThreshold}
              onChange={e => setScoreThreshold(Math.max(100, Math.min(2000, Number(e.target.value) || 500)))}
              min={100}
              max={2000}
              step={50}
              style={{
                background: '#1a1a1a', color: '#ccc', border: '1px solid #333', borderRadius: 6,
                padding: '6px 10px', fontSize: '0.75rem', width: 100,
              }}
            />
          </div>
        )}

        <div style={{ color: '#666', fontSize: '0.7rem', marginTop: 8 }}>
          Win: {getVictoryConditionLabel(victoryCondition)} • {seasonCount} seasons • {playerCount} players
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button className="btn btn-small" onClick={onBack} style={{ color: '#888' }}>
          ← BACK
        </button>
        <button
          className="btn btn-primary btn-glow"
          onClick={handleStart}
          disabled={!canStart}
          style={{ opacity: canStart ? 1 : 0.4, fontSize: '1rem', padding: '12px 32px' }}
        >
          🎬 START GAME
        </button>
      </div>
    </div>
  );
}
