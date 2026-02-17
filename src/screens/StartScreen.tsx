import { useState, useEffect } from 'react';
import { isMuted, toggleMute, sfx } from '../sound';
import { startGame, pickArchetype, resumeGame } from '../gameStore';
import { hasSave, loadGameState, clearSave } from '../saveGame';
import { STUDIO_ARCHETYPES } from '../data';
import type { StudioArchetypeId, GameMode } from '../types';
import { getRunStats, getMilestoneProgress, LEGACY_PERKS } from '../unlocks';
import { isFirstRun, markRunStarted, shouldShowUnlockToast, markUnlockToastShown, isSimplifiedRun } from '../onboarding';
import { getLeaderboard, hasDailyRun, getDailyBest } from '../leaderboard';
import { CHALLENGE_MODES, isChallengeUnlocked } from '../challenges';
import { getDailyDateString, getWeeklyDateString } from '../seededRng';
import { getTodayModifier, getWeeklyModifiers } from '../dailyModifiers';
import { getPersonalBests, getDailyStats } from '../personalBests';
import { STUDIO_ARCHETYPES as ARCHETYPE_DATA } from '../data';
import { KeywordGlossary } from '../components/KeywordTooltip';
import AchievementGallery from '../components/AchievementGallery';
import SettingsModal from '../components/SettingsModal';
import KeyboardHints from '../components/KeyboardHints';
import Glossary from '../components/Glossary';
import { getUnlockedAchievements, ACHIEVEMENTS } from '../achievements';
import { getPrestige, getPrestigeLevel, getNextPrestigeLevel, getPrestigeXPProgress, getVeteranScaling } from '../prestige';
import { getAllGenreStats, MASTERY_THRESHOLDS } from '../genreMastery';
import { getCareerMilestones } from '../studioLegacy';

function HowToPlay({ onClose, isFirstTime }: { onClose: () => void; isFirstTime?: boolean }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        
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
            <h3>🏷️ Card Keywords</h3>
            <p style={{ marginBottom: 8 }}>Cards have keyword tags. Focus on one type (50%+ of your played cards) for escalating quality bonuses. <em>Hover/tap for details:</em></p>
            <KeywordGlossary />
          </div>

          <div className="htp-section">
            <h3>🔑 Key Mechanics</h3>
            <ul>
              <li><strong>💕 Chemistry</strong> — Certain talent pairs give bonus quality when cast together</li>
              <li><strong>🎬 Director's Cut</strong> — Once per production, peek at top 3 cards and rearrange them</li>
              <li><strong>🎵 Encore</strong> — After wrapping, risk one more card draw. Success = bonus quality. Failure = lose some. High risk, high reward!</li>
              <li><strong>🏛️ Studio Archetype</strong> — Choose at the start of each run. Shapes your strategy with unique bonuses (e.g. Prestige studios get critic bonuses, Blockbuster studios earn more $$$)</li>
            </ul>
          </div>

          <div className="htp-section">
            <h3>📰 Season Events</h3>
            <p>Between seasons, industry news breaks! You'll choose from random events that can boost your budget, change multipliers, or shake up your strategy. No two runs play the same.</p>
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

function getLegacyRating(earnings: number, reputation: number, won: boolean): { rating: string; color: string } {
  if (!won) return { rating: 'F', color: '#e74c3c' };
  const composite = earnings * 0.7 + reputation * 30;
  if (composite > 200) return { rating: 'S', color: '#ff6b6b' };
  if (composite > 140) return { rating: 'A', color: '#ffd93d' };
  if (composite > 90) return { rating: 'B', color: '#6bcb77' };
  if (composite > 50) return { rating: 'C', color: '#5dade2' };
  if (composite > 25) return { rating: 'D', color: '#999' };
  return { rating: 'F', color: '#e74c3c' };
}

function RunHistoryTab({ leaderboard }: { leaderboard: ReturnType<typeof getLeaderboard> }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const rankColors: Record<string, string> = { S: '#ff6b6b', A: '#ffd93d', B: '#6bcb77', C: '#5dade2', D: '#999', F: '#e74c3c' };
  const tierColors: Record<string, string> = { BLOCKBUSTER: '#2ecc71', SMASH: '#f1c40f', HIT: '#e67e22', FLOP: '#e74c3c' };

  if (leaderboard.length === 0) {
    return <p style={{ color: '#666', fontSize: '0.9rem', maxWidth: 600, margin: '0 auto' }}>No runs completed yet. Finish a run to see your history!</p>;
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {leaderboard.map((entry) => {
          const legacy = getLegacyRating(entry.earnings, entry.reputation, entry.won);
          const archetypeEmoji = ARCHETYPE_DATA.find(a => a.id === entry.archetype)?.emoji || '🎬';
          const isExpanded = expandedId === entry.id;
          const bestFilm = entry.films.length > 0
            ? entry.films.reduce((best, f) => {
                const tierRank = ['BLOCKBUSTER', 'SMASH', 'HIT', 'FLOP'];
                return tierRank.indexOf(f.tier) < tierRank.indexOf(best.tier) ? f : best;
              }, entry.films[0])
            : null;
          const worstFilm = entry.films.length > 0
            ? entry.films.reduce((worst, f) => {
                const tierRank = ['BLOCKBUSTER', 'SMASH', 'HIT', 'FLOP'];
                return tierRank.indexOf(f.tier) > tierRank.indexOf(worst.tier) ? f : worst;
              }, entry.films[0])
            : null;

          return (
            <div key={entry.id} style={{
              padding: '14px 16px', background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${entry.won ? 'rgba(46,204,113,0.2)' : 'rgba(231,76,60,0.2)'}`,
              borderRadius: 8, cursor: 'pointer', transition: 'border-color 0.2s',
            }} onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: rankColors[entry.rank] || '#999', fontFamily: 'Bebas Neue', fontSize: '1.4rem' }}>{entry.rank}</span>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${legacy.color}`, color: legacy.color, fontFamily: 'Bebas Neue', fontSize: '0.8rem',
                  }}>{legacy.rating}</div>
                  <span style={{ color: entry.won ? '#2ecc71' : '#e74c3c', fontSize: '0.75rem', fontWeight: 600 }}>
                    {entry.won ? '🏆 WON' : '💀 LOST'}
                  </span>
                  <span style={{ color: '#555', fontSize: '0.7rem' }}>{entry.date}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>{entry.score} pts</div>
                  <span style={{ color: '#555', fontSize: '0.8rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : '' }}>▾</span>
                </div>
              </div>

              {/* Studio name + tags */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                {entry.studioName && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--gold)', background: 'rgba(212,168,67,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                    {entry.studioName}
                  </span>
                )}
                <span style={{ fontSize: '0.7rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>
                  {archetypeEmoji} {entry.archetype}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>
                  ${entry.earnings.toFixed(1)}M
                </span>
                <span style={{ fontSize: '0.7rem', color: legacy.color, background: `${legacy.color}15`, padding: '2px 8px', borderRadius: 4 }}>
                  Legacy {legacy.rating}
                </span>
                {entry.mode !== 'normal' && (
                  <span style={{ fontSize: '0.7rem', color: '#f39c12', background: 'rgba(243,156,18,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                    {entry.mode === 'newGamePlus' ? '⭐ NG+' : entry.mode === 'directorMode' ? '🔥 Dir' : entry.mode === 'daily' ? '📅 Daily' : entry.mode === 'challenge' ? '⚡ Ch' : ''}
                  </span>
                )}
              </div>

              {/* Film tier emoji strip */}
              <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
                {entry.films.map((f, j) => {
                  const tierEmoji: Record<string, string> = { BLOCKBUSTER: '🟩', SMASH: '🟨', HIT: '🟧', FLOP: '🟥' };
                  return <span key={j} title={`${f.title} (${f.genre}) - ${f.tier}`}>{tierEmoji[f.tier] || '⬜'}</span>;
                })}
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }} onClick={e => e.stopPropagation()}>
                  {/* Best/Worst */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                    {bestFilm && (
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <div style={{ color: '#666', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>👑 Best</div>
                        <div style={{ color: '#2ecc71', fontSize: '0.8rem', fontWeight: 600 }}>"{bestFilm.title}"</div>
                        <div style={{ color: '#888', fontSize: '0.65rem' }}>{bestFilm.genre} · {bestFilm.tier}{bestFilm.boxOffice != null ? ` · $${bestFilm.boxOffice.toFixed(1)}M` : ''}</div>
                      </div>
                    )}
                    {worstFilm && worstFilm !== bestFilm && (
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <div style={{ color: '#666', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>💀 Worst</div>
                        <div style={{ color: '#e74c3c', fontSize: '0.8rem', fontWeight: 600 }}>"{worstFilm.title}"</div>
                        <div style={{ color: '#888', fontSize: '0.65rem' }}>{worstFilm.genre} · {worstFilm.tier}{worstFilm.boxOffice != null ? ` · $${worstFilm.boxOffice.toFixed(1)}M` : ''}</div>
                      </div>
                    )}
                  </div>

                  {/* Full filmography */}
                  <div style={{ color: '#666', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Full Filmography</div>
                  {entry.films.map((f, j) => (
                    <div key={j} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
                      borderBottom: j < entry.films.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                    }}>
                      <span style={{ color: '#555', fontFamily: 'Bebas Neue', fontSize: '0.8rem', width: 24 }}>S{f.season || j + 1}</span>
                      <span style={{ color: tierColors[f.tier], fontSize: '0.9rem' }}>
                        {({ BLOCKBUSTER: '🟩', SMASH: '🟨', HIT: '🟧', FLOP: '🟥' } as Record<string, string>)[f.tier] || '⬜'}
                      </span>
                      <span style={{ flex: 1, color: '#ccc', fontSize: '0.8rem' }}>{f.title}</span>
                      <span style={{ color: '#888', fontSize: '0.65rem' }}>{f.genre}</span>
                      {f.boxOffice != null && (
                        <span style={{ color: tierColors[f.tier], fontFamily: 'Bebas Neue', fontSize: '0.85rem', minWidth: 50, textAlign: 'right' }}>
                          ${f.boxOffice.toFixed(1)}M
                        </span>
                      )}
                      {f.nominated && <span>🏆</span>}
                    </div>
                  ))}

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{entry.seasons}</div>
                      <div style={{ color: '#666', fontSize: '0.55rem' }}>SEASONS</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{'★'.repeat(entry.reputation)}{'☆'.repeat(Math.max(0, 5 - entry.reputation))}</div>
                      <div style={{ color: '#666', fontSize: '0.55rem' }}>REPUTATION</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>${entry.earnings.toFixed(1)}M</div>
                      <div style={{ color: '#666', fontSize: '0.55rem' }}>TOTAL BO</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StartScreen() {
  const firstRun = isFirstRun();
  const simplified = isSimplifiedRun(); // true until first run complete
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
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

  // "?" keyboard shortcut for keyboard hints
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !showHelp && !showSettings && !showAchievements) {
        setShowKeyboardHints(h => !h);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showHelp, showSettings, showAchievements]);

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
          {STUDIO_ARCHETYPES.map(a => {
            const isRecommended = a.id === 'blockbuster';
            return (
            <div
              key={a.id}
              className="card"
              onClick={() => { startGame(selectedMode, selectedChallenge); pickArchetype(a.id as StudioArchetypeId); }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(selectedMode, selectedChallenge); pickArchetype(a.id as StudioArchetypeId); } }}
              tabIndex={0}
              role="button"
              aria-label={`${a.name}: ${a.description}${isRecommended ? ' (Recommended for beginners)' : ''}`}
              style={{ cursor: 'pointer', padding: 20, flex: '1 1 180px', maxWidth: 220, textAlign: 'center', transition: 'transform 0.2s, border-color 0.2s', borderColor: isRecommended && simplified ? 'rgba(46,204,113,0.4)' : undefined }}
              onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--gold)'; (e.target as HTMLElement).style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = isRecommended && simplified ? 'rgba(46,204,113,0.4)' : ''; (e.target as HTMLElement).style.transform = ''; }}
            >
              {isRecommended && simplified && (
                <div style={{ fontSize: '0.65rem', color: '#2ecc71', background: 'rgba(46,204,113,0.15)', border: '1px solid rgba(46,204,113,0.3)', borderRadius: 4, padding: '2px 8px', marginBottom: 8, display: 'inline-block' }}>
                  ⭐ RECOMMENDED
                </div>
              )}
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{a.emoji}</div>
              <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>{a.name}</div>
              <div style={{ color: '#aaa', fontSize: '0.8rem', lineHeight: 1.5 }}>{a.description}</div>
            </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="start-screen" style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8, zIndex: 10 }}>
        <button
          onClick={() => setShowKeyboardHints(true)}
          title="Keyboard shortcuts (?)"
          aria-label="Keyboard shortcuts"
          className="start-icon-btn"
        >
          ?
        </button>
        <button
          onClick={() => setShowGlossary(true)}
          title="Encyclopedia"
          aria-label="Encyclopedia"
          className="start-icon-btn"
        >
          📖
        </button>
        <button
          onClick={() => setShowSettings(true)}
          title="Settings"
          aria-label="Settings"
          className="start-icon-btn"
        >
          ⚙️
        </button>
        {!simplified && (
          <button
            onClick={() => setShowAchievements(true)}
            title={`Achievements (${getUnlockedAchievements().length}/${ACHIEVEMENTS.length})`}
            aria-label={`Achievements: ${getUnlockedAchievements().length} of ${ACHIEVEMENTS.length} unlocked`}
            className="start-icon-btn"
          >
            🏆
          </button>
        )}
        <button
          onClick={handleToggleMute}
          title={muted ? 'Unmute' : 'Mute'}
          aria-label={muted ? 'Sound muted, click to unmute' : 'Sound on, click to mute'}
          className="start-icon-btn"
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
      <div className="start-title animate-title">GREENLIGHT</div>
      <div className="start-subtitle">A Movie Studio Roguelite</div>

      {/* Prestige Level */}
      {stats.runs > 0 && (() => {
        const prestige = getPrestige();
        const level = getPrestigeLevel(prestige.xp);
        const xpProgress = getPrestigeXPProgress(prestige.xp);
        const next = getNextPrestigeLevel(prestige.xp);
        return (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.1rem' }}>{level.emoji}</span>
            <span style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
              {level.title}
            </span>
            {next && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 60, height: 4, background: '#222', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${xpProgress.progress * 100}%`, height: '100%', background: 'var(--gold)', borderRadius: 2 }} />
                </div>
                <span style={{ color: '#555', fontSize: '0.6rem' }}>Lv.{level.level}</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Studio Difficulty Indicator */}
      {stats.runs > 0 && (() => {
        const scaling = getVeteranScaling();
        if (scaling.prestigeLevel < 1) return null;
        return (
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.7rem' }}>
            <span style={{ color: '#666' }}>Difficulty:</span>
            <span style={{ color: scaling.scalingPercent > 0 ? '#e74c3c' : scaling.prestigeLevel >= 3 ? '#f39c12' : '#666', fontFamily: 'Bebas Neue', letterSpacing: '0.05em' }}>
              {scaling.difficultyLabel}
            </span>
            {scaling.scalingPercent > 0 && (
              <span style={{ color: '#e74c3c', fontSize: '0.6rem' }}>
                (+{scaling.scalingPercent}% targets)
              </span>
            )}
            {scaling.activePerksCount > 0 && (
              <span style={{ color: '#555', fontSize: '0.6rem' }}>
                • {scaling.activePerksCount} perk{scaling.activePerksCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        );
      })()}

      {/* Tab navigation */}
      {stats.runs > 0 && (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 24, marginTop: 8, flexWrap: 'wrap' }}>
          {(['play', 'career', 'history', ...(!simplified ? ['challenges', 'leaderboard'] as const : [])] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? 'rgba(212,168,67,0.15)' : 'transparent',
              border: `1px solid ${tab === t ? 'var(--gold-dim)' : '#333'}`,
              borderRadius: 6, padding: '8px 14px', color: tab === t ? 'var(--gold)' : '#666',
              cursor: 'pointer', fontFamily: 'Bebas Neue', fontSize: '0.85rem', letterSpacing: '0.05em',
              transition: 'all 0.2s', minHeight: 44,
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
            {hasSave() && (() => {
              const saved = loadGameState();
              return saved ? (
                <button className="btn btn-primary btn-glow" onClick={() => { resumeGame(saved); }} style={{ background: 'rgba(46,204,113,0.15)', borderColor: '#2ecc71' }}>
                  ▶ CONTINUE RUN <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>(Season {saved.season}, {saved.phase})</span>
                </button>
              ) : null;
            })()}
            <button className={`btn ${hasSave() ? 'btn-small' : 'btn-primary btn-glow'}`} onClick={() => { clearSave(); markRunStarted(); setSelectedMode('normal'); setSelectedChallenge(undefined); setShowArchetypes(true); }}>
              NEW RUN
            </button>
            {/* Daily Run */}
            <button className="btn btn-small" style={{ color: '#3498db', borderColor: '#3498db', opacity: dailyDone ? 0.5 : 1 }}
              onClick={() => { if (!dailyDone) { setSelectedMode('daily'); setSelectedChallenge(undefined); setShowArchetypes(true); } }}>
              📅 DAILY RUN <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>({dailyDate})</span>
              {dailyDone && <span style={{ fontSize: '0.65rem', marginLeft: 6, color: '#2ecc71' }}>✓ {dailyBest?.score || 0}pts</span>}
              {stats.dailyStreak.current > 0 && <span style={{ fontSize: '0.65rem', marginLeft: 6, color: '#f39c12' }}>🔥{stats.dailyStreak.current}</span>}
            </button>
            {/* Weekly Modifier Preview */}
            {stats.runs > 0 && !dailyDone && (() => {
              const todayMod = getTodayModifier();
              const [weeklyMod1, weeklyMod2] = getWeeklyModifiers();
              return (
                <div style={{
                  background: 'rgba(52,152,219,0.08)', border: '1px solid rgba(52,152,219,0.15)',
                  borderRadius: 10, padding: '12px 16px', maxWidth: 360, width: '100%',
                  textAlign: 'left', fontSize: '0.75rem',
                }}>
                  <div style={{ color: '#3498db', fontFamily: 'Bebas Neue', fontSize: '0.8rem', letterSpacing: '0.05em', marginBottom: 8 }}>
                    📅 TODAY'S DAILY MODIFIERS
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{todayMod.emoji}</span>
                      <span style={{ color: '#ccc', fontWeight: 600 }}>{todayMod.name}</span>
                      <span style={{ color: '#666' }}>— {todayMod.shortDesc}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{weeklyMod1.emoji}</span>
                      <span style={{ color: '#ccc', fontWeight: 600 }}>{weeklyMod1.name}</span>
                      <span style={{ color: '#666' }}>— {weeklyMod1.shortDesc}</span>
                    </div>
                  </div>
                  <div style={{ color: '#444', fontSize: '0.6rem', marginTop: 6 }}>
                    Weekly modifier rotates every Monday · Week of {getWeeklyDateString()}
                  </div>
                </div>
              );
            })()}
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
          {stats.legacyPerks.length > 0 && !simplified && (
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

      {tab === 'challenges' && (() => {
        const unlockStats = { totalWins: stats.wins, challengesCompleted: stats.careerStats.challengesCompleted || [] };
        const challengeBests: Record<string, { score: number; won: boolean }> = {};
        for (const entry of leaderboard) {
          if (entry.challenge && (!challengeBests[entry.challenge] || entry.score > challengeBests[entry.challenge].score)) {
            challengeBests[entry.challenge] = { score: entry.score, won: entry.won };
          }
        }
        return (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 8 }}>
              Unique rule modifiers that change how you play. Each challenge has a score multiplier.
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', color: '#2ecc71' }}>✓ {unlockStats.challengesCompleted.length} completed</span>
              <span style={{ fontSize: '0.7rem', color: '#888' }}>•</span>
              <span style={{ fontSize: '0.7rem', color: '#888' }}>{CHALLENGE_MODES.filter(c => isChallengeUnlocked(c, unlockStats)).length}/{CHALLENGE_MODES.length} unlocked</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {CHALLENGE_MODES.map(c => {
                const unlocked = isChallengeUnlocked(c, unlockStats);
                const completed = unlockStats.challengesCompleted.includes(c.id);
                const best = challengeBests[c.id];
                return (
                  <div key={c.id} className="card" style={{
                    padding: 16, cursor: unlocked ? 'pointer' : 'default',
                    transition: 'border-color 0.2s, transform 0.2s',
                    opacity: unlocked ? 1 : 0.5,
                    borderColor: completed ? 'rgba(46,204,113,0.3)' : undefined,
                  }}
                    onClick={() => { if (!unlocked) return; setSelectedMode('challenge'); setSelectedChallenge(c.id); markRunStarted(); setShowArchetypes(true); }}
                    onMouseEnter={e => { if (unlocked) { (e.currentTarget as HTMLElement).style.borderColor = completed ? '#2ecc71' : '#e67e22'; (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'; } }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = completed ? 'rgba(46,204,113,0.3)' : ''; (e.currentTarget as HTMLElement).style.transform = ''; }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ fontSize: '1.8rem', position: 'relative' }}>
                        {unlocked ? c.emoji : '🔒'}
                        {completed && <span style={{ position: 'absolute', bottom: -4, right: -4, fontSize: '0.7rem' }}>✅</span>}
                      </div>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ color: unlocked ? '#e67e22' : '#666', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>
                            {unlocked ? c.name : c.name}
                          </span>
                          <span style={{ color: '#2ecc71', fontSize: '0.75rem', background: 'rgba(46,204,113,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                            ×{c.scoreMultiplier} score
                          </span>
                          {best && (
                            <span style={{ fontSize: '0.7rem', color: best.won ? '#2ecc71' : '#e74c3c', background: best.won ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                              {best.won ? '🏆' : '💀'} Best: {best.score}pts
                            </span>
                          )}
                        </div>
                        {unlocked ? (
                          <>
                            <div style={{ color: '#aaa', fontSize: '0.8rem', marginTop: 2 }}>{c.description}</div>
                            <div style={{ color: '#666', fontSize: '0.7rem', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {c.rules.map((r, i) => <span key={i} style={{ display: 'block' }}>• {r}</span>)}
                            </div>
                          </>
                        ) : (
                          <div style={{ color: '#888', fontSize: '0.8rem', marginTop: 4 }}>
                            🔒 {c.unlockRequirement || 'Unknown requirement'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {tab === 'leaderboard' && (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {leaderboard.length === 0 ? (
            <p style={{ color: '#666', fontSize: '0.9rem' }}>No runs recorded yet. Complete a run to see your scores here!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="leaderboard-header" style={{ display: 'none' }} />
              {leaderboard.slice(0, 15).map((entry, i) => (
                <div key={entry.id} style={{
                  padding: '10px 12px', background: i === 0 ? 'rgba(212,168,67,0.08)' : 'rgba(255,255,255,0.02)',
                  borderRadius: 8, border: `1px solid ${i === 0 ? 'var(--gold-dim)' : '#222'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: i < 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][i] : '#555', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>#{i + 1}</span>
                      <span style={{ color: { S: '#ff6b6b', A: '#ffd93d', B: '#6bcb77', C: '#5dade2', D: '#999' }[entry.rank] || '#999', fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>{entry.rank}</span>
                      <span style={{ color: entry.won ? '#2ecc71' : '#e74c3c', fontSize: '0.75rem', fontWeight: 600 }}>{entry.won ? '✓ Won' : '✗ Lost'}</span>
                    </div>
                    <span style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>{entry.score} pts</span>
                  </div>
                  <div style={{ color: '#ccc', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.films.map(f => f.title).join(' → ')}
                  </div>
                  <div style={{ color: '#666', fontSize: '0.65rem', display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                    <span>{entry.date}</span>
                    <span>· {entry.archetype}</span>
                    <span>· {entry.mode === 'newGamePlus' ? 'NG+' : entry.mode === 'directorMode' ? 'Dir' : entry.mode === 'daily' ? 'Daily' : entry.mode === 'challenge' ? 'Ch' : 'Std'}</span>
                    {entry.challenge && <span>· {CHALLENGE_MODES.find(c => c.id === entry.challenge)?.emoji || ''} {CHALLENGE_MODES.find(c => c.id === entry.challenge)?.name || entry.challenge}</span>}
                    {entry.dailySeed && <span>· 📅 Daily</span>}
                  </div>
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

          {/* Genre Mastery (cross-run) */}
          {(() => {
            const genreStats = getAllGenreStats();
            if (genreStats.length === 0) return null;
            const tierColors: Record<string, string> = { platinum: '#b9f2ff', gold: '#ffd700', silver: '#c0c0c0', bronze: '#cd7f32', none: '#555' };
            return (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 8, letterSpacing: 1 }}>🎬 GENRE MASTERY</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {genreStats.map(g => {
                    const nextTier = MASTERY_THRESHOLDS.find(t => t.minBoxOffice > g.totalBoxOffice);
                    const progressToNext = nextTier
                      ? Math.min(1, (g.totalBoxOffice - g.tier.minBoxOffice) / (nextTier.minBoxOffice - g.tier.minBoxOffice))
                      : 1;
                    return (
                      <div key={g.genre} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                        background: 'rgba(255,255,255,0.02)', border: '1px solid #222', borderRadius: 6,
                      }}>
                        <span style={{ fontSize: '1rem' }}>{g.tier.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: tierColors[g.tier.tier], fontWeight: 700, fontSize: '0.8rem' }}>{g.genre}</span>
                            <span style={{ color: '#666', fontSize: '0.6rem' }}>{g.tier.label}</span>
                            {(g.tier.tier === 'gold' || g.tier.tier === 'platinum') && (
                              <span style={{ color: '#2ecc71', fontSize: '0.55rem', background: 'rgba(46,204,113,0.1)', padding: '1px 5px', borderRadius: 3 }}>+1 Quality</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 8, color: '#666', fontSize: '0.6rem', marginTop: 2 }}>
                            <span>{g.filmsProduced} films</span>
                            <span>${g.totalBoxOffice.toFixed(0)}M BO</span>
                            <span>Avg Q: {g.avgQuality}</span>
                          </div>
                          {g.bestFilm && (
                            <div style={{ color: '#555', fontSize: '0.55rem', marginTop: 1 }}>
                              👑 "{g.bestFilm.title}" ${g.bestFilm.boxOffice.toFixed(1)}M
                            </div>
                          )}
                          {nextTier && (
                            <div style={{ width: '100%', height: 3, background: '#222', borderRadius: 2, marginTop: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${progressToNext * 100}%`, height: '100%', background: tierColors[g.tier.tier] || '#555', borderRadius: 2 }} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

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

          {/* Personal Bests */}
          {(() => {
            const pb = getPersonalBests();
            if (pb.overall.totalRuns < 1) return null;
            const o = pb.overall;
            const dailyBests = pb.daily;
            return (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 8, letterSpacing: 1 }}>🏅 PERSONAL BESTS</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #222', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ color: '#f39c12', fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>{o.bestScore}</div>
                    <div style={{ color: '#666', fontSize: '0.6rem', textTransform: 'uppercase' }}>Best Score</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #222', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>${o.bestEarnings.toFixed(1)}M</div>
                    <div style={{ color: '#666', fontSize: '0.6rem', textTransform: 'uppercase' }}>Best Earnings</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #222', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>${o.highestSingleFilmBO.toFixed(1)}M</div>
                    <div style={{ color: '#666', fontSize: '0.6rem', textTransform: 'uppercase' }}>Best Single Film</div>
                    {o.highestSingleFilmTitle && <div style={{ color: '#555', fontSize: '0.55rem' }}>"{o.highestSingleFilmTitle}"</div>}
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #222', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ color: '#3498db', fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>{o.fastestWin ?? '—'}</div>
                    <div style={{ color: '#666', fontSize: '0.6rem', textTransform: 'uppercase' }}>Fastest Win (Films)</div>
                  </div>
                </div>
                {/* Challenge mode bests */}
                {Object.keys(pb.modes).length > 1 && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ color: '#666', fontSize: '0.7rem', cursor: 'pointer' }}>Per-mode records ({Object.keys(pb.modes).length} modes)</summary>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                      {Object.entries(pb.modes).map(([key, rec]) => (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 4, fontSize: '0.7rem' }}>
                          <span style={{ color: '#888' }}>{key}</span>
                          <span style={{ color: 'var(--gold)' }}>{rec.bestScore} pts · ${rec.bestEarnings.toFixed(1)}M</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            );
          })()}

          {/* Daily Streak + Sparkline */}
          {stats.dailyStreak.best > 0 && (() => {
            const dailyStats = getDailyStats();
            const history = dailyStats.recentHistory;
            const maxScore = history.length > 0 ? Math.max(...history.map(h => h.score), 1) : 1;
            return (
              <div style={{ marginBottom: 24, padding: 16, background: 'rgba(243,156,18,0.08)', border: '1px solid rgba(243,156,18,0.2)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ color: '#f39c12', fontFamily: 'Bebas Neue', fontSize: '1rem', marginBottom: 4 }}>📅 DAILY STREAK</div>
                <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: history.length >= 3 ? 12 : 0 }}>
                  <div>
                    <div style={{ color: '#f39c12', fontFamily: 'Bebas Neue', fontSize: '1.6rem' }}>🔥 {stats.dailyStreak.current}</div>
                    <div style={{ color: '#888', fontSize: '0.65rem' }}>Current</div>
                  </div>
                  <div>
                    <div style={{ color: '#e67e22', fontFamily: 'Bebas Neue', fontSize: '1.6rem' }}>⭐ {stats.dailyStreak.best}</div>
                    <div style={{ color: '#888', fontSize: '0.65rem' }}>Best</div>
                  </div>
                  <div>
                    <div style={{ color: '#3498db', fontFamily: 'Bebas Neue', fontSize: '1.6rem' }}>{dailyStats.avgScore}</div>
                    <div style={{ color: '#888', fontSize: '0.65rem' }}>Avg Score</div>
                  </div>
                </div>
                {/* Sparkline chart — last 30 daily scores */}
                {history.length >= 3 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ color: '#666', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Last {history.length} Dailies</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, justifyContent: 'center', height: 40 }}>
                      {history.map((h, i) => {
                        const pct = Math.max(8, (h.score / maxScore) * 100);
                        const color = h.won ? '#2ecc71' : '#e74c3c';
                        return (
                          <div key={i} title={`${h.date}: ${h.score}pts ${h.won ? '🏆' : '💀'}`} style={{
                            width: Math.max(6, Math.min(16, 240 / history.length)),
                            height: `${pct}%`,
                            background: color,
                            borderRadius: 2,
                            opacity: 0.8,
                            transition: 'height 0.3s',
                          }} />
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ color: '#555', fontSize: '0.55rem' }}>{history[0]?.date}</span>
                      <span style={{ color: '#555', fontSize: '0.55rem' }}>{history[history.length - 1]?.date}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Lifetime Stats */}
          {stats.careerStats.totalFilms > 0 && (() => {
            const lifetimeStats = getCareerMilestones();
            return (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 12, letterSpacing: 1 }}>🏛️ LIFETIME RECORDS</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {lifetimeStats.map(m => (
                    <div key={m.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.15)',
                      borderRadius: 8,
                    }}>
                      <span style={{ fontSize: '1.2rem' }}>{m.emoji}</span>
                      <div>
                        <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>{m.value}</div>
                        <div style={{ color: '#666', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{m.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

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
      {showAchievements && <AchievementGallery onClose={() => setShowAchievements(false)} />}
      {showGlossary && <Glossary onClose={() => setShowGlossary(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showKeyboardHints && <KeyboardHints onClose={() => setShowKeyboardHints(false)} />}
    </div>
  );
}
