import { useState, useEffect } from 'react';
import { isMuted, toggleMute, sfx } from '../sound';
import { startGame, pickArchetype } from '../gameStore';
import { STUDIO_ARCHETYPES } from '../data';
import type { StudioArchetypeId, GameMode } from '../types';
import { getRunStats, getMilestoneProgress, LEGACY_PERKS } from '../unlocks';
import { isFirstRun, markRunStarted, shouldShowUnlockToast, markUnlockToastShown } from '../onboarding';
import { getLeaderboard, hasDailyRun, getDailyBest } from '../leaderboard';
import { CHALLENGE_MODES } from '../challenges';
import { getDailyDateString } from '../seededRng';
import { STUDIO_ARCHETYPES as ARCHETYPE_DATA } from '../data';

function HowToPlay({ onClose, isFirstTime }: { onClose: () => void; isFirstTime?: boolean }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
        <button className="modal-close" onClick={onClose}>✕</button>
        
        {isFirstTime && (
          <div style={{ textAlign: 'center', marginBottom: 20, padding: '16px 0', borderBottom: '1px solid rgba(212,168,67,0.2)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎬🍿</div>
            <h2 style={{ color: 'var(--gold)', marginBottom: 4, fontSize: '1.5rem' }}>Welcome, Studio Head!</h2>
            <p style={{ color: '#999', fontSize: '0.85rem', margin: 0 }}>Here's everything you need to run a movie studio. Takes 60 seconds to read.</p>
          </div>
        )}
        {!isFirstTime && <h2 style={{ color: 'var(--gold)', marginBottom: 16 }}>How to Play</h2>}
        
        <div className="how-to-play">
          {/* Quick summary box for first-timers */}
          <div className="htp-tldr">
            <strong>TL;DR:</strong> Pick scripts → Cast talent → Play cards to build quality → Hit box office targets → Survive 5 seasons. Think poker meets deckbuilding meets Hollywood.
          </div>

          <div className="htp-section">
            <h3>🎬 The Goal</h3>
            <p>Survive <strong>5 seasons</strong> as a Hollywood studio head. Each season, make one movie and hit the box office target. Miss too many times and you're fired.</p>
          </div>
          
          <div className="htp-section">
            <h3>📝 Each Season (5 Steps)</h3>
            <div className="htp-flow">
              <div className="htp-flow-step">
                <span className="htp-flow-num">1</span>
                <div>
                  <strong>Greenlight</strong>
                  <div className="htp-flow-desc">Pick a script. Match genre to market for bonus $$$.</div>
                </div>
              </div>
              <div className="htp-flow-step">
                <span className="htp-flow-num">2</span>
                <div>
                  <strong>Casting</strong>
                  <div className="htp-flow-desc">Fill talent slots. Each actor adds cards to your deck. High Heat = powerful but risky.</div>
                </div>
              </div>
              <div className="htp-flow-step">
                <span className="htp-flow-num">3</span>
                <div>
                  <strong>Production</strong> <span style={{ color: '#e74c3c', fontSize: '0.75rem' }}>★ THE CORE</span>
                  <div className="htp-flow-desc">Draw 2 cards, keep 1. Incidents auto-play. 3 Incidents = DISASTER! Choose when to wrap.</div>
                </div>
              </div>
              <div className="htp-flow-step">
                <span className="htp-flow-num">4</span>
                <div>
                  <strong>Release</strong>
                  <div className="htp-flow-desc">Quality × market = box office. Hit the target or get a strike.</div>
                </div>
              </div>
              <div className="htp-flow-step">
                <span className="htp-flow-num">5</span>
                <div>
                  <strong>Off-Season</strong>
                  <div className="htp-flow-desc">Buy perks & hire talent for next season.</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="htp-section">
            <h3>🃏 Card Types</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div className="htp-card-type" style={{ borderColor: '#2ecc71' }}>
                <span style={{ color: '#2ecc71', fontWeight: 700 }}>ACTION</span>
                <div>Good cards. You choose which to keep.</div>
              </div>
              <div className="htp-card-type" style={{ borderColor: '#f1c40f' }}>
                <span style={{ color: '#f1c40f', fontWeight: 700 }}>CHALLENGE</span>
                <div>Gamble: accept or decline a bet.</div>
              </div>
              <div className="htp-card-type" style={{ borderColor: '#e74c3c' }}>
                <span style={{ color: '#e74c3c', fontWeight: 700 }}>INCIDENT</span>
                <div>Bad cards. Auto-play. 3 = Disaster!</div>
              </div>
            </div>
          </div>

          <div className="htp-section">
            <h3>🎭 Casting = Deckbuilding</h3>
            <p>Each talent brings their own cards into the production deck. A high-Skill actor adds great Action cards. A high-Heat diva adds powerful cards AND dangerous Incidents. Your cast literally shapes what cards you'll draw!</p>
          </div>

          <div className="htp-section">
            <h3>🔑 Key Mechanics</h3>
            <ul>
              <li><strong>💕 Chemistry</strong> — Certain talent pairs give bonus quality when cast together</li>
              <li><strong>🎬 Director's Cut</strong> — Once per production, peek at top 3 cards and rearrange them</li>
              <li><strong>🔥🎯💀💕✨ Tags</strong> — Cards have keyword tags. Focus on one type (50%+) for big bonuses</li>
              <li><strong>🎵 Encore</strong> — After wrapping, risk one more draw for bonus quality</li>
            </ul>
          </div>
          
          <div className="htp-section">
            <h3>💀 How You Lose</h3>
            <p><strong>3 strikes</strong> (missed targets) = fired. Or if your <strong>reputation hits 0</strong>.</p>
          </div>
          
          <div className="htp-section">
            <h3>💡 Pro Tips</h3>
            <ul>
              <li>Wrapping early with decent quality beats risking a disaster</li>
              <li>Match genre to visible market conditions for big multipliers</li>
              <li>Build chemistry pairs — they're worth several quality points</li>
              <li>Focus on one tag archetype (Chaos, Precision, etc.) for escalating bonuses</li>
            </ul>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button className="btn btn-primary" onClick={onClose}>
            {isFirstTime ? "LET'S MAKE MOVIES! 🎬" : 'Got it!'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StartScreen() {
  const firstRun = isFirstRun();
  const [showHelp, setShowHelp] = useState(false);
  const [showArchetypes, setShowArchetypes] = useState(false);
  const [showUnlockToast, setShowUnlockToast] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode>('normal');
  const [selectedChallenge, setSelectedChallenge] = useState<string | undefined>(undefined);
  const [tab, setTab] = useState<'play' | 'challenges' | 'leaderboard' | 'career' | 'history'>('play');
  const [muted, setMutedLocal] = useState(isMuted());
  const handleToggleMute = () => { const m = toggleMute(); setMutedLocal(m); if (!m) sfx.click(); };
  const stats = getRunStats();
  const leaderboard = getLeaderboard();
  const milestones = getMilestoneProgress();
  const dailyDate = getDailyDateString();
  const dailyDone = hasDailyRun(dailyDate);
  const dailyBest = getDailyBest(dailyDate);

  useEffect(() => {
    if (firstRun) {
      const t = setTimeout(() => setShowHelp(true), 600);
      return () => clearTimeout(t);
    }
    if (shouldShowUnlockToast()) {
      markUnlockToastShown();
      setShowUnlockToast(true);
      const t = setTimeout(() => setShowUnlockToast(false), 5000);
      return () => clearTimeout(t);
    }
  }, [firstRun]);

  if (showArchetypes) {
    const modeLabel = selectedMode === 'newGamePlus' ? '⭐ NEW GAME+ — Targets ×1.4' :
      selectedMode === 'directorMode' ? '🔥 DIRECTOR MODE — Targets ×1.8' :
      selectedMode === 'daily' ? '📅 DAILY RUN — ' + dailyDate :
      selectedChallenge ? `${CHALLENGE_MODES.find(c => c.id === selectedChallenge)?.emoji} ${CHALLENGE_MODES.find(c => c.id === selectedChallenge)?.name}` : '';
    return (
      <div className="fade-in" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h2 style={{ color: 'var(--gold)', marginBottom: 8 }}>Choose Your Studio</h2>
        {modeLabel && (
          <div style={{ marginBottom: 16, padding: '8px 16px', background: 'rgba(212,168,67,0.1)', border: '1px solid var(--gold-dim)', borderRadius: 8, display: 'inline-block' }}>
            <span style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{modeLabel}</span>
          </div>
        )}
        <p style={{ color: '#888', marginBottom: 24, fontSize: '0.9rem' }}>Your studio identity shapes your strategy for the entire run.</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 800, margin: '0 auto' }}>
          {STUDIO_ARCHETYPES.map(a => (
            <div
              key={a.id}
              className="card"
              onClick={() => { startGame(selectedMode, selectedChallenge); pickArchetype(a.id as StudioArchetypeId); }}
              style={{ cursor: 'pointer', padding: 20, flex: '1 1 180px', maxWidth: 220, textAlign: 'center', transition: 'transform 0.2s, border-color 0.2s' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--gold)'; (e.target as HTMLElement).style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = ''; (e.target as HTMLElement).style.transform = ''; }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{a.emoji}</div>
              <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>{a.name}</div>
              <div style={{ color: '#aaa', fontSize: '0.8rem', lineHeight: 1.5 }}>{a.description}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="start-screen" style={{ position: 'relative' }}>
      <button
        onClick={handleToggleMute}
        title={muted ? 'Unmute' : 'Mute'}
        style={{
          position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%',
          border: '1px solid rgba(212,168,67,0.3)', background: 'rgba(212,168,67,0.08)',
          color: 'var(--gold)', fontSize: '1rem', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 10,
        }}
      >
        {muted ? '🔇' : '🔊'}
      </button>
      <div className="start-title animate-title">GREENLIGHT</div>
      <div className="start-subtitle">A Movie Studio Roguelite</div>

      {/* Tab navigation */}
      {stats.runs > 0 && (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 24, marginTop: 8, flexWrap: 'wrap' }}>
          {(['play', 'career', 'history', 'challenges', 'leaderboard'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? 'rgba(212,168,67,0.15)' : 'transparent',
              border: `1px solid ${tab === t ? 'var(--gold-dim)' : '#333'}`,
              borderRadius: 6, padding: '6px 12px', color: tab === t ? 'var(--gold)' : '#666',
              cursor: 'pointer', fontFamily: 'Bebas Neue', fontSize: '0.8rem', letterSpacing: '0.05em',
              transition: 'all 0.2s',
            }}>
              {t === 'play' ? '🎬 PLAY' : t === 'career' ? '📊 CAREER' : t === 'history' ? '📜 RUNS' : t === 'challenges' ? '⚡ CHALLENGES' : '🏆 HALL OF FAME'}
            </button>
          ))}
        </div>
      )}

      {tab === 'play' && (
        <>
          <p style={{ color: '#888', maxWidth: 500, margin: '0 auto 32px', lineHeight: 1.6 }}>
            You're a freshly hired studio head. Make movies, build your reputation, survive the chaos of Hollywood.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <button className="btn btn-primary btn-glow" onClick={() => { markRunStarted(); setSelectedMode('normal'); setSelectedChallenge(undefined); setShowArchetypes(true); }}>
              NEW RUN
            </button>
            {/* Daily Run */}
            <button className="btn btn-small" style={{ color: '#3498db', borderColor: '#3498db', opacity: dailyDone ? 0.5 : 1 }}
              onClick={() => { if (!dailyDone) { setSelectedMode('daily'); setSelectedChallenge(undefined); setShowArchetypes(true); } }}>
              📅 DAILY RUN <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>({dailyDate})</span>
              {dailyDone && <span style={{ fontSize: '0.65rem', marginLeft: 6, color: '#2ecc71' }}>✓ {dailyBest?.score || 0}pts</span>}
              {stats.dailyStreak.current > 0 && <span style={{ fontSize: '0.65rem', marginLeft: 6, color: '#f39c12' }}>🔥{stats.dailyStreak.current}</span>}
            </button>
            {stats.ngPlusUnlocked && (
              <button className="btn btn-small" style={{ color: 'var(--gold)', borderColor: 'var(--gold-dim)' }} onClick={() => { setSelectedMode('newGamePlus'); setSelectedChallenge(undefined); setShowArchetypes(true); }}>
                ⭐ NEW GAME+ <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>(×1.4 targets)</span>
              </button>
            )}
            {stats.directorUnlocked && (
              <button className="btn btn-small" style={{ color: '#e74c3c', borderColor: '#e74c3c' }} onClick={() => { setSelectedMode('directorMode'); setSelectedChallenge(undefined); setShowArchetypes(true); }}>
                🔥 DIRECTOR MODE <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>(×1.8 targets)</span>
              </button>
            )}
            <button className="btn btn-small" onClick={() => setShowHelp(true)}>HOW TO PLAY</button>
          </div>
          <div style={{ marginTop: 40, display: 'flex', gap: 24, color: '#555', fontSize: '0.75rem' }}>
            <span>🎬 5 Seasons</span><span>🎭 Push Your Luck</span><span>⭐ Build Your Studio</span><span>🏆 Chase the Oscar</span>
          </div>
          {stats.runs > 0 && (
            <div style={{ marginTop: 16, display: 'flex', gap: 16, color: '#444', fontSize: '0.7rem' }}>
              <span>Runs: {stats.runs}</span><span>Wins: {stats.wins}</span><span>Win Rate: {stats.winRate}</span><span>Best Score: {stats.bestScore}</span>
            </div>
          )}
          {stats.legacyPerks.length > 0 && (
            <div style={{ marginTop: 16, maxWidth: 500, margin: '16px auto 0' }}>
              <div style={{ color: '#555', fontSize: '0.7rem', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Active Legacy Perks</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {stats.legacyPerks.map(p => (
                  <span key={p.id} title={p.description} style={{
                    background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.3)',
                    borderRadius: 6, padding: '3px 10px', fontSize: '0.7rem', color: '#2ecc71', cursor: 'help',
                  }}>{p.emoji} {p.name}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'challenges' && (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 20 }}>
            Unique rule modifiers that change how you play. Each challenge has a score multiplier.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {CHALLENGE_MODES.map(c => (
              <div key={c.id} className="card" style={{ padding: 16, cursor: 'pointer', transition: 'border-color 0.2s, transform 0.2s' }}
                onClick={() => { setSelectedMode('challenge'); setSelectedChallenge(c.id); markRunStarted(); setShowArchetypes(true); }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e67e22'; (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.transform = ''; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.8rem' }}>{c.emoji}</span>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ color: '#e67e22', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>
                      {c.name} <span style={{ color: '#2ecc71', fontSize: '0.8rem' }}>×{c.scoreMultiplier} score</span>
                    </div>
                    <div style={{ color: '#aaa', fontSize: '0.8rem' }}>{c.description}</div>
                    <div style={{ color: '#666', fontSize: '0.7rem', marginTop: 4 }}>
                      {c.rules.map((r, i) => <span key={i}>• {r}{i < c.rules.length - 1 ? ' ' : ''}</span>)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'leaderboard' && (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {leaderboard.length === 0 ? (
            <p style={{ color: '#666', fontSize: '0.9rem' }}>No runs recorded yet. Complete a run to see your scores here!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '30px 50px 1fr 60px 50px 60px', gap: 8, padding: '8px 12px', color: '#555', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span>#</span><span>Rank</span><span>Details</span><span>Score</span><span>Mode</span><span>Result</span>
              </div>
              {leaderboard.slice(0, 15).map((entry, i) => (
                <div key={entry.id} style={{
                  display: 'grid', gridTemplateColumns: '30px 50px 1fr 60px 50px 60px', gap: 8,
                  padding: '8px 12px', background: i === 0 ? 'rgba(212,168,67,0.08)' : 'rgba(255,255,255,0.02)',
                  borderRadius: 6, alignItems: 'center', border: `1px solid ${i === 0 ? 'var(--gold-dim)' : '#222'}`,
                }}>
                  <span style={{ color: i < 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][i] : '#555', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{i + 1}</span>
                  <span style={{ color: { S: '#ff6b6b', A: '#ffd93d', B: '#6bcb77', C: '#5dade2', D: '#999' }[entry.rank] || '#999', fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>{entry.rank}</span>
                  <div>
                    <div style={{ color: '#ccc', fontSize: '0.75rem' }}>
                      {entry.films.map(f => f.title).join(' → ')}
                    </div>
                    <div style={{ color: '#666', fontSize: '0.65rem' }}>
                      {entry.date} · {entry.archetype}
                      {entry.challenge && ` · ${CHALLENGE_MODES.find(c => c.id === entry.challenge)?.emoji || ''} ${CHALLENGE_MODES.find(c => c.id === entry.challenge)?.name || entry.challenge}`}
                      {entry.dailySeed && ' · 📅 Daily'}
                    </div>
                  </div>
                  <span style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{entry.score}</span>
                  <span style={{ color: '#666', fontSize: '0.65rem' }}>
                    {entry.mode === 'newGamePlus' ? 'NG+' : entry.mode === 'directorMode' ? 'Dir' : entry.mode === 'daily' ? 'Daily' : entry.mode === 'challenge' ? 'Ch' : 'Std'}
                  </span>
                  <span style={{ color: entry.won ? '#2ecc71' : '#e74c3c', fontSize: '0.75rem' }}>{entry.won ? '✓ Won' : '✗ Lost'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── CAREER STATS TAB ─── */}
      {tab === 'career' && (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total Films', value: stats.careerStats.totalFilms.toString(), color: '#ccc' },
              { label: 'Lifetime BO', value: `$${(stats.careerStats.totalBoxOffice || 0).toFixed(0)}M`, color: 'var(--gold)' },
              { label: 'Blockbusters', value: stats.careerStats.totalBlockbusters.toString(), color: '#2ecc71' },
              { label: 'Win Rate', value: stats.winRate, color: '#3498db' },
              { label: 'Best Score', value: stats.bestScore.toString(), color: '#f39c12' },
              { label: 'Perfect Runs', value: stats.careerStats.perfectRuns.toString(), color: '#e74c3c' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #222', borderRadius: 8, padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ color: s.color, fontFamily: 'Bebas Neue', fontSize: '1.3rem' }}>{s.value}</div>
                <div style={{ color: '#666', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Genre breakdown */}
          {Object.keys(stats.careerStats.genreFilms).length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 8, letterSpacing: 1 }}>🎭 GENRES EXPLORED</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {Object.entries(stats.careerStats.genreFilms).sort((a, b) => b[1] - a[1]).map(([genre, count]) => (
                  <span key={genre} style={{
                    background: 'rgba(52,152,219,0.1)', border: '1px solid rgba(52,152,219,0.3)',
                    borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', color: '#3498db',
                  }}>{genre} ×{count}</span>
                ))}
              </div>
              <div style={{ color: '#555', fontSize: '0.65rem', marginTop: 6 }}>
                {Object.keys(stats.careerStats.genreFilms).length}/7 genres discovered
              </div>
            </div>
          )}

          {/* Rank distribution */}
          {Object.keys(stats.careerStats.ranksAchieved || {}).length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 8, letterSpacing: 1 }}>🏅 RANK DISTRIBUTION</h3>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                {['S', 'A', 'B', 'C', 'D'].map(r => {
                  const count = (stats.careerStats.ranksAchieved || {})[r] || 0;
                  const colors: Record<string, string> = { S: '#ff6b6b', A: '#ffd93d', B: '#6bcb77', C: '#5dade2', D: '#999' };
                  return (
                    <div key={r} style={{ textAlign: 'center' }}>
                      <div style={{ color: colors[r], fontFamily: 'Bebas Neue', fontSize: '1.4rem' }}>{r}</div>
                      <div style={{ color: '#666', fontSize: '0.7rem' }}>×{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Daily Streak */}
          {stats.dailyStreak.best > 0 && (
            <div style={{ marginBottom: 24, padding: 16, background: 'rgba(243,156,18,0.08)', border: '1px solid rgba(243,156,18,0.2)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ color: '#f39c12', fontFamily: 'Bebas Neue', fontSize: '1rem', marginBottom: 4 }}>📅 DAILY STREAK</div>
              <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
                <div>
                  <div style={{ color: '#f39c12', fontFamily: 'Bebas Neue', fontSize: '1.6rem' }}>🔥 {stats.dailyStreak.current}</div>
                  <div style={{ color: '#888', fontSize: '0.65rem' }}>Current</div>
                </div>
                <div>
                  <div style={{ color: '#e67e22', fontFamily: 'Bebas Neue', fontSize: '1.6rem' }}>⭐ {stats.dailyStreak.best}</div>
                  <div style={{ color: '#888', fontSize: '0.65rem' }}>Best</div>
                </div>
              </div>
            </div>
          )}

          {/* Milestones */}
          <div>
            <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 12, letterSpacing: 1 }}>🔓 MILESTONES</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {milestones.map(m => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  background: m.unlocked ? 'rgba(46,204,113,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${m.unlocked ? 'rgba(46,204,113,0.3)' : '#222'}`,
                  borderRadius: 8, opacity: m.unlocked ? 1 : 0.7,
                }}>
                  <span style={{ fontSize: '1.3rem' }}>{m.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: m.unlocked ? '#2ecc71' : '#aaa', fontSize: '0.85rem', fontWeight: 600 }}>
                      {m.name} {m.unlocked && '✓'}
                    </div>
                    <div style={{ color: '#666', fontSize: '0.7rem' }}>{m.description}</div>
                    <div style={{ color: '#555', fontSize: '0.65rem' }}>{m.progressText}</div>
                  </div>
                  {!m.unlocked && (
                    <div style={{ width: 60, height: 6, background: '#222', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${m.progress * 100}%`, height: '100%', background: 'var(--gold)', borderRadius: 3, transition: 'width 0.3s' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── RUN HISTORY TAB ─── */}
      {tab === 'history' && (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {leaderboard.length === 0 ? (
            <p style={{ color: '#666', fontSize: '0.9rem' }}>No runs completed yet. Finish a run to see your history!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {leaderboard.slice(0, 10).map((entry, i) => {
                const rankColors: Record<string, string> = { S: '#ff6b6b', A: '#ffd93d', B: '#6bcb77', C: '#5dade2', D: '#999' };
                const tierColors: Record<string, string> = { BLOCKBUSTER: '#2ecc71', SMASH: '#f1c40f', HIT: '#e67e22', FLOP: '#e74c3c' };
                const bestFilm = entry.films.reduce((best, f) => {
                  const tierRank = ['BLOCKBUSTER', 'SMASH', 'HIT', 'FLOP'];
                  return tierRank.indexOf(f.tier) < tierRank.indexOf(best.tier) ? f : best;
                }, entry.films[0]);
                const archetypeEmoji = ARCHETYPE_DATA.find(a => a.id === entry.archetype)?.emoji || '🎬';
                return (
                  <div key={entry.id} style={{
                    padding: '14px 16px', background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${entry.won ? 'rgba(46,204,113,0.2)' : 'rgba(231,76,60,0.2)'}`,
                    borderRadius: 8,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: rankColors[entry.rank] || '#999', fontFamily: 'Bebas Neue', fontSize: '1.4rem' }}>{entry.rank}</span>
                        <span style={{ color: entry.won ? '#2ecc71' : '#e74c3c', fontSize: '0.75rem', fontWeight: 600 }}>
                          {entry.won ? '🏆 WON' : '💀 LOST'}
                        </span>
                        <span style={{ color: '#555', fontSize: '0.7rem' }}>{entry.date}</span>
                      </div>
                      <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>{entry.score} pts</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.7rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>
                        {archetypeEmoji} {entry.archetype}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>
                        ${entry.earnings.toFixed(1)}M BO
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>
                        {'★'.repeat(entry.reputation)}{'☆'.repeat(5 - entry.reputation)} rep
                      </span>
                      {entry.mode !== 'normal' && (
                        <span style={{ fontSize: '0.7rem', color: '#f39c12', background: 'rgba(243,156,18,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                          {entry.mode === 'newGamePlus' ? '⭐ NG+' : entry.mode === 'directorMode' ? '🔥 Dir' : entry.mode === 'daily' ? '📅 Daily' : entry.mode === 'challenge' ? '⚡ Ch' : ''}
                        </span>
                      )}
                      {entry.challenge && (
                        <span style={{ fontSize: '0.7rem', color: '#e67e22', background: 'rgba(230,126,34,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                          {CHALLENGE_MODES.find(c => c.id === entry.challenge)?.emoji} {CHALLENGE_MODES.find(c => c.id === entry.challenge)?.name}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {entry.films.map((f, j) => (
                        <span key={j} style={{
                          fontSize: '0.65rem', padding: '2px 6px', borderRadius: 3,
                          background: `${tierColors[f.tier]}15`, color: tierColors[f.tier],
                          border: `1px solid ${tierColors[f.tier]}30`,
                        }}>
                          {f.title} ({f.genre})
                        </span>
                      ))}
                    </div>
                    {bestFilm && (
                      <div style={{ color: '#555', fontSize: '0.6rem', marginTop: 4 }}>
                        Best: "{bestFilm.title}" ({bestFilm.tier})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showUnlockToast && (
        <div className="animate-slide-down" style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
          background: 'rgba(46,204,113,0.15)', border: '1px solid #2ecc71', borderRadius: 10,
          padding: '12px 24px', color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '1rem',
          letterSpacing: '0.05em', cursor: 'pointer', backdropFilter: 'blur(8px)',
        }} onClick={() => setShowUnlockToast(false)}>
          🔓 New Systems Unlocked! Genre trends & debt are now active.
        </div>
      )}
      {showHelp && <HowToPlay onClose={() => { setShowHelp(false); if (firstRun) markRunStarted(); }} isFirstTime={firstRun} />}
    </div>
  );
}
