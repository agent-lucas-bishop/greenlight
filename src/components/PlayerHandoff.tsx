/**
 * R276 — Player Handoff: Full-screen turn transition overlay
 */

import { useState } from 'react';
import type { MultiplayerSession, TurnSummary } from '../multiplayer';
import { getCurrentPlayer } from '../multiplayer';
import { STUDIO_ARCHETYPES } from '../data';

interface Props {
  session: MultiplayerSession;
  /** Previous turn summaries (market news from last turns) */
  lastTurnSummaries: TurnSummary[];
  /** Called when player clicks to start their turn */
  onReady: () => void;
}

export default function PlayerHandoff({ session, lastTurnSummaries, onReady }: Props) {
  const [revealed, setRevealed] = useState(false);
  const player = getCurrentPlayer(session);
  const archetype = STUDIO_ARCHETYPES.find(a => a.id === player.archetype);

  if (!revealed) {
    return (
      <div
        onClick={() => setRevealed(true)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setRevealed(true); }}
        tabIndex={0}
        role="button"
        aria-label={`Pass device to ${player.name}. Click to reveal.`}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎬</div>
        <div style={{
          color: 'var(--gold)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem',
          letterSpacing: '0.08em', marginBottom: 8,
        }}>
          PASS TO {player.name.toUpperCase()}
        </div>
        <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: 4 }}>
          {archetype?.emoji} {player.studioName}
        </div>
        <div style={{ color: '#666', fontSize: '0.75rem', marginBottom: 32 }}>
          Season {session.currentSeason} • Player {session.currentPlayerIndex + 1} of {session.settings.playerCount}
        </div>
        <div style={{
          color: '#555', fontSize: '0.8rem', animation: 'pulse 2s ease-in-out infinite',
        }}>
          TAP TO REVEAL
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, overflow: 'auto',
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{archetype?.emoji || '🎬'}</div>
      <div style={{
        color: 'var(--gold)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem',
        letterSpacing: '0.08em', marginBottom: 4,
      }}>
        {player.name}&apos;S TURN
      </div>
      <div style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: 16 }}>
        {player.studioName} • Season {session.currentSeason}
      </div>

      {/* Player status */}
      <div style={{
        display: 'flex', gap: 16, marginBottom: 20, justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#2ecc71', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem' }}>
            ${player.budget.toFixed(1)}M
          </div>
          <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase' }}>Budget</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#f39c12', fontSize: '0.9rem' }}>
            {'★'.repeat(player.reputation)}{'☆'.repeat(Math.max(0, 5 - player.reputation))}
          </div>
          <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase' }}>Rep</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--gold)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem' }}>
            {player.score}
          </div>
          <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase' }}>Score</div>
        </div>
      </div>

      {/* Market news from previous turns */}
      {lastTurnSummaries.length > 0 && (
        <div style={{
          maxWidth: 400, width: '100%', padding: '14px 18px',
          background: 'rgba(52,152,219,0.06)', border: '1px solid rgba(52,152,219,0.15)',
          borderRadius: 10, marginBottom: 24, textAlign: 'left',
        }}>
          <div style={{ color: '#3498db', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.8rem', letterSpacing: '0.05em', marginBottom: 8 }}>
            📰 MARKET NEWS
          </div>
          {lastTurnSummaries.map((summary, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ color: '#ccc', fontSize: '0.75rem' }}>
                {summary.studioName} released &ldquo;{summary.filmTitle}&rdquo; ({summary.genre})
                <span style={{
                  color: summary.tier === 'BLOCKBUSTER' ? '#2ecc71' : summary.tier === 'FLOP' ? '#e74c3c' : '#f39c12',
                  marginLeft: 6, fontWeight: 700,
                }}>
                  {summary.tier} — ${summary.boxOffice.toFixed(1)}M
                </span>
              </div>
              {summary.marketNews.map((news, j) => (
                <div key={j} style={{ color: '#888', fontSize: '0.65rem', marginTop: 2, paddingLeft: 8 }}>
                  {news}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <button
        className="btn btn-primary btn-glow"
        onClick={onReady}
        style={{ fontSize: '1.1rem', padding: '14px 36px' }}
      >
        🎬 START MY TURN
      </button>
    </div>
  );
}
