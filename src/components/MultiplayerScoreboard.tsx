/**
 * R276 — Multiplayer Scoreboard: Between-turn and end-of-game standings
 */

import type { MultiplayerSession, PlayerRanking, AwardResult } from '../multiplayer';
import { getStandings, getVictoryConditionLabel } from '../multiplayer';

interface Props {
  session: MultiplayerSession;
  /** If set, show final standings with winner */
  isFinal?: boolean;
  /** Called when "Next Player's Turn" is clicked (not shown in final mode) */
  onNextTurn?: () => void;
  /** Called to return to main menu from final screen */
  onMainMenu?: () => void;
}

const RANK_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32', '#888'];
const RANK_EMOJI = ['🥇', '🥈', '🥉', '4️⃣'];

export default function MultiplayerScoreboard({ session, isFinal, onNextTurn, onMainMenu }: Props) {
  const standings = getStandings(session);
  const winner = isFinal ? session.players.find(p => p.id === session.winnerId) : null;
  const latestAward = session.awardHistory[session.awardHistory.length - 1] ?? null;

  return (
    <div className="fade-in" style={{ textAlign: 'center', padding: '40px 20px', maxWidth: 700, margin: '0 auto' }}>
      {/* Header */}
      {isFinal ? (
        <>
          <div style={{ fontSize: '3rem', marginBottom: 8 }}>🏆</div>
          <h2 style={{ color: 'var(--gold)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', marginBottom: 4 }}>
            GAME OVER
          </h2>
          {winner && (
            <div style={{ color: '#2ecc71', fontSize: '1.2rem', fontFamily: "'Bebas Neue', sans-serif", marginBottom: 4 }}>
              🎬 {winner.studioName} WINS!
            </div>
          )}
          {winner && (
            <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: 20 }}>
              Congratulations, {winner.name}! Victory by {getVictoryConditionLabel(session.settings.victoryCondition)}
            </div>
          )}
        </>
      ) : (
        <>
          <h2 style={{ color: 'var(--gold)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '0.08em', marginBottom: 4 }}>
            📊 STANDINGS — SEASON {session.currentSeason - 1}
          </h2>
          <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: 20 }}>
            {getVictoryConditionLabel(session.settings.victoryCondition)} • Season {session.currentSeason - 1} of {session.settings.seasonCount}
          </div>
        </>
      )}

      {/* Award result */}
      {latestAward && (
        <div style={{
          padding: '12px 20px', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)',
          borderRadius: 10, marginBottom: 20, maxWidth: 400, margin: '0 auto 20px',
        }}>
          <div style={{ color: 'var(--gold)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.85rem', letterSpacing: '0.05em', marginBottom: 6 }}>
            🏆 SEASON AWARDS
          </div>
          <div style={{ color: '#eee', fontSize: '0.9rem', fontWeight: 700 }}>
            Best Picture: &ldquo;{latestAward.filmTitle}&rdquo;
          </div>
          <div style={{ color: '#aaa', fontSize: '0.75rem' }}>
            by {latestAward.winnerName}
          </div>
          {latestAward.nominees.length > 1 && (
            <div style={{ marginTop: 6, color: '#888', fontSize: '0.65rem' }}>
              Nominees: {latestAward.nominees.map(n => `"${n.filmTitle}"`).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Standings table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {standings.map((s, i) => (
          <div
            key={s.playerId}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
              background: s.eliminated ? 'rgba(231,76,60,0.05)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${s.eliminated ? 'rgba(231,76,60,0.2)' : i === 0 && isFinal ? 'rgba(255,215,0,0.4)' : '#222'}`,
              borderRadius: 8, opacity: s.eliminated ? 0.6 : 1,
            }}
          >
            {/* Rank */}
            <div style={{ fontSize: '1.2rem', width: 32, textAlign: 'center' }}>
              {s.eliminated ? '💀' : RANK_EMOJI[i] || `#${s.rank}`}
            </div>

            {/* Player info */}
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ color: s.eliminated ? '#888' : RANK_COLORS[i] || '#ccc', fontWeight: 700, fontSize: '0.95rem' }}>
                {s.studioName}
              </div>
              <div style={{ color: '#888', fontSize: '0.7rem' }}>
                {s.playerName} • {s.filmCount} film{s.filmCount !== 1 ? 's' : ''}
                {s.eliminated && ' • ELIMINATED'}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--gold)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem' }}>
                  {s.score}
                </div>
                <div style={{ color: '#999', fontSize: '0.55rem', textTransform: 'uppercase' }}>Score</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#2ecc71', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem' }}>
                  ${s.totalEarnings.toFixed(1)}M
                </div>
                <div style={{ color: '#999', fontSize: '0.55rem', textTransform: 'uppercase' }}>Earnings</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#f39c12', fontSize: '0.85rem' }}>
                  {'★'.repeat(s.reputation)}{'☆'.repeat(Math.max(0, 5 - s.reputation))}
                </div>
                <div style={{ color: '#999', fontSize: '0.55rem', textTransform: 'uppercase' }}>Rep</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Best films */}
      {isFinal && (
        <div style={{
          padding: '16px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid #222',
          borderRadius: 10, marginBottom: 24, textAlign: 'left',
        }}>
          <div style={{ color: 'var(--gold)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.85rem', letterSpacing: '0.05em', marginBottom: 10 }}>
            👑 BEST FILMS
          </div>
          {session.players
            .filter(p => p.bestFilmTitle)
            .sort((a, b) => b.bestFilmBO - a.bestFilmBO)
            .map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: '#ccc', fontSize: '0.8rem' }}>
                  &ldquo;{p.bestFilmTitle}&rdquo; <span style={{ color: '#888' }}>— {p.studioName}</span>
                </span>
                <span style={{ color: '#2ecc71', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.85rem' }}>
                  ${p.bestFilmBO.toFixed(1)}M
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        {isFinal && onMainMenu && (
          <button className="btn btn-primary" onClick={onMainMenu} style={{ fontSize: '1rem', padding: '12px 24px' }}>
            🏠 MAIN MENU
          </button>
        )}
        {!isFinal && onNextTurn && (
          <button className="btn btn-primary btn-glow" onClick={onNextTurn} style={{ fontSize: '1rem', padding: '12px 24px' }}>
            ▶ NEXT PLAYER&apos;S TURN
          </button>
        )}
      </div>
    </div>
  );
}
