import { useState, useEffect } from 'react';
import { isMuted, toggleMute, sfx } from '../sound';
import { startGame, pickArchetype, resumeGame } from '../gameStore';
import { hasSaveGame, getSaveInfo } from '../savegame';
import { STUDIO_ARCHETYPES } from '../data';
import type { StudioArchetypeId, GameMode } from '../types';
import { getRunStats, getMilestoneProgress, getEndingsDiscovered, ENDINGS } from '../unlocks';
import { isFirstRun, markRunStarted, shouldShowUnlockToast, markUnlockToastShown, isSimplifiedRun } from '../onboarding';
import { getLeaderboard, hasDailyRun, getDailyBest, hasWeeklyRun, getWeeklyBest } from '../leaderboard';
import type { FilmDetail } from '../leaderboard';
import { getHallOfFame } from '../hallOfFame';
import { CHALLENGE_MODES } from '../challenges';
import AchievementGallery from '../components/AchievementGallery';
import { hasGoldBorder, getStudioPrefix } from '../achievements';
import { getDailyDateString, getWeeklyDateString } from '../seededRng';
import { getTodayModifier, getModifierForDate, getWeeklyModifiers } from '../dailyModifiers';

function HowToPlay({ onClose, isFirstTime }: { onClose: () => void; isFirstTime?: boolean }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 480;
  return (
    <div className={`modal-overlay ${isMobile ? 'bottom-sheet' : ''}`} onClick={onClose}>
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

// ─── Film Detail Card (shared between EndScreen and StartScreen) ───
function FilmDetailCard({ film, tierColors }: { film: FilmDetail; tierColors: Record<string, string> }) {
  const color = tierColors[film.tier] || '#999';
  const tierLabel: Record<string, string> = { BLOCKBUSTER: 'Blockbuster', SMASH: 'Smash', HIT: 'Hit', FLOP: 'Flop' };
  return (
    <div style={{
      background: 'rgba(212,168,67,0.04)', border: '1px solid rgba(212,168,67,0.15)',
      borderRadius: 8, padding: '14px 18px', marginTop: 4, marginBottom: 4,
    }}>
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: 3, color: '#666', marginBottom: 4 }}>
          {film.season ? `Season ${film.season} · ` : ''}{film.genre}
        </div>
        <div style={{ fontSize: '1.2rem', fontFamily: 'Bebas Neue', color, letterSpacing: 1 }}>
          "{film.title}"
        </div>
        <div style={{
          display: 'inline-block', marginTop: 4, padding: '2px 10px',
          background: `${color}20`, border: `1px solid ${color}40`,
          borderRadius: 4, color, fontFamily: 'Bebas Neue', fontSize: '0.8rem',
        }}>
          {tierLabel[film.tier] || film.tier} {film.nominated && '🏆'}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.7rem' }}>
        {film.quality != null && (
          <div style={{ textAlign: 'center', padding: 6, background: 'rgba(0,0,0,0.2)', borderRadius: 4 }}>
            <div style={{ color: '#888', fontSize: '0.55rem', textTransform: 'uppercase' }}>Quality</div>
            <div style={{ color: (film.quality >= 30 ? '#2ecc71' : film.quality >= 15 ? '#f1c40f' : '#e74c3c'), fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>{film.quality}</div>
          </div>
        )}
        {film.boxOffice != null && (
          <div style={{ textAlign: 'center', padding: 6, background: 'rgba(0,0,0,0.2)', borderRadius: 4 }}>
            <div style={{ color: '#888', fontSize: '0.55rem', textTransform: 'uppercase' }}>Box Office</div>
            <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>${film.boxOffice.toFixed(1)}M</div>
          </div>
        )}
      </div>
      {film.director && (
        <div style={{ marginTop: 8, textAlign: 'center', fontSize: '0.7rem' }}>
          <span style={{ color: '#888' }}>Directed by </span>
          <span style={{ color: '#ccc', fontWeight: 600 }}>{film.director}</span>
        </div>
      )}
      {film.cast && film.cast.length > 0 && (
        <div style={{ marginTop: 4, textAlign: 'center', fontSize: '0.65rem' }}>
          <span style={{ color: '#888' }}>Starring </span>
          <span style={{ color: '#aaa' }}>{film.cast.join(' · ')}</span>
        </div>
      )}
    </div>
  );
}

// ─── Hall of Fame Section ───
function HallOfFameSection() {
  const hof = getHallOfFame();
  const hasAny = Object.values(hof).some(v => v !== null);
  if (!hasAny) return null;

  const rankColors: Record<string, string> = { S: '#ff6b6b', A: '#ffd93d', B: '#6bcb77', C: '#5dade2', D: '#999' };
  const records: { emoji: string; label: string; value: string; sub: string }[] = [];

  if (hof.highestSingleFilmGross) {
    records.push({ emoji: '💰', label: 'Highest Film Gross', value: `$${hof.highestSingleFilmGross.value.toFixed(1)}M`, sub: `"${hof.highestSingleFilmGross.filmTitle}" (${hof.highestSingleFilmGross.genre})` });
  }
  if (hof.highestQualityFilm) {
    records.push({ emoji: '⭐', label: 'Highest Quality', value: `${hof.highestQualityFilm.value}`, sub: `"${hof.highestQualityFilm.filmTitle}" (${hof.highestQualityFilm.genre})` });
  }
  if (hof.longestWinStreak) {
    records.push({ emoji: '🔥', label: 'Longest Win Streak', value: `${hof.longestWinStreak.value}`, sub: 'consecutive non-flop films' });
  }
  if (hof.mostFilmsInOneRun) {
    records.push({ emoji: '🎬', label: 'Most Films (One Run)', value: `${hof.mostFilmsInOneRun.value}`, sub: hof.mostFilmsInOneRun.studioName });
  }
  if (hof.bestRankAchieved) {
    records.push({ emoji: '👑', label: 'Best Rank', value: hof.bestRankAchieved.rank, sub: `${hof.bestRankAchieved.score} pts · ${hof.bestRankAchieved.studioName}` });
  }
  if (hof.highestTotalGross) {
    records.push({ emoji: '🏦', label: 'Highest Run Gross', value: `$${hof.highestTotalGross.value.toFixed(1)}M`, sub: hof.highestTotalGross.studioName });
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 12, letterSpacing: 1 }}>🏅 STUDIO HALL OF FAME</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
        {records.map((r, i) => (
          <div key={i} style={{
            background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.15)',
            borderRadius: 8, padding: '10px 12px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.2rem' }}>{r.emoji}</div>
            <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>{r.value}</div>
            <div style={{ color: '#888', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{r.label}</div>
            <div style={{ color: '#666', fontSize: '0.6rem', marginTop: 2 }}>{r.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Run History Tab ───
function RunHistoryTab({ leaderboard }: { leaderboard: ReturnType<typeof getLeaderboard> }) {
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [expandedFilmIdx, setExpandedFilmIdx] = useState<number | null>(null);
  const tierColors: Record<string, string> = { BLOCKBUSTER: '#2ecc71', SMASH: '#f1c40f', HIT: '#e67e22', FLOP: '#e74c3c' };
  const rankColors: Record<string, string> = { S: '#ff6b6b', A: '#ffd93d', B: '#6bcb77', C: '#5dade2', D: '#999' };

  if (leaderboard.length === 0) {
    return <p style={{ color: '#666', fontSize: '0.9rem' }}>No runs completed yet. Finish a run to see your history!</p>;
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: 16 }}>
        {leaderboard.length} run{leaderboard.length !== 1 ? 's' : ''} completed. Tap to explore filmographies.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {leaderboard.slice(0, 15).map((entry) => {
          const isExpanded = expandedRun === entry.id;
          const archetypeEmoji = STUDIO_ARCHETYPES.find(a => a.id === entry.archetype)?.emoji || '🎬';
          return (
            <div key={entry.id}>
              <div
                onClick={() => { setExpandedRun(isExpanded ? null : entry.id); setExpandedFilmIdx(null); }}
                style={{
                  padding: '14px 16px', background: isExpanded ? 'rgba(212,168,67,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${entry.won ? 'rgba(46,204,113,0.2)' : 'rgba(231,76,60,0.2)'}`,
                  borderRadius: isExpanded ? '8px 8px 0 0' : 8,
                  cursor: 'pointer', transition: 'background 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: rankColors[entry.rank] || '#999', fontFamily: 'Bebas Neue', fontSize: '1.4rem' }}>{entry.rank}</span>
                    <div>
                      <div style={{ color: '#ccc', fontSize: '0.85rem', fontWeight: 600 }}>
                        {entry.studioName || `${archetypeEmoji} ${entry.archetype}`}
                      </div>
                      <div style={{ color: '#666', fontSize: '0.65rem' }}>
                        {entry.date} · {archetypeEmoji} {entry.archetype}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: entry.won ? '#2ecc71' : '#e74c3c', fontSize: '0.7rem', fontWeight: 600 }}>
                      {entry.won ? '🏆 WON' : '💀 LOST'}
                    </div>
                    <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{entry.score} pts</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: '0.7rem', color: '#888' }}>
                  <span>{entry.seasons} season{entry.seasons !== 1 ? 's' : ''}</span>
                  <span>${entry.earnings.toFixed(1)}M gross</span>
                  <span>{entry.films.length} film{entry.films.length !== 1 ? 's' : ''}</span>
                  {entry.mode !== 'normal' && (
                    <span style={{ color: '#f39c12' }}>
                      {entry.mode === 'newGamePlus' ? '⭐ NG+' : entry.mode === 'directorMode' ? '🔥 Dir' : entry.mode === 'daily' ? '📅 Daily' : entry.mode === 'weekly' ? '📆 Wkly' : entry.mode === 'seeded' ? '🌱 Seed' : '⚡ Ch'}
                    </span>
                  )}
                </div>
              </div>
              {isExpanded && (
                <div style={{
                  background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(212,168,67,0.15)',
                  borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '12px 16px',
                }}>
                  <div style={{ color: '#888', fontSize: '0.7rem', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Filmography — Tap a film for details
                  </div>
                  {entry.films.map((f, j) => (
                    <div key={j}>
                      <div
                        onClick={(e) => { e.stopPropagation(); setExpandedFilmIdx(expandedFilmIdx === j ? null : j); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                          borderBottom: expandedFilmIdx === j ? 'none' : '1px solid rgba(255,255,255,0.05)',
                          cursor: 'pointer', transition: 'background 0.15s',
                          background: expandedFilmIdx === j ? 'rgba(212,168,67,0.05)' : 'transparent',
                          borderRadius: expandedFilmIdx === j ? '6px 6px 0 0' : 0,
                        }}
                      >
                        {f.season != null && <span style={{ color: '#666', fontFamily: 'Bebas Neue', fontSize: '0.8rem', width: 24 }}>S{f.season}</span>}
                        <span style={{ color: tierColors[f.tier], fontSize: '0.9rem' }}>
                          {f.tier === 'BLOCKBUSTER' ? '🟩' : f.tier === 'SMASH' ? '🟨' : f.tier === 'HIT' ? '🟧' : '🟥'}
                        </span>
                        <span style={{ flex: 1, color: '#ddd', fontSize: '0.8rem', fontWeight: 600 }}>{f.title}</span>
                        <span style={{ color: '#888', fontSize: '0.65rem' }}>{f.genre}</span>
                        {f.boxOffice != null && (
                          <span style={{ color: tierColors[f.tier], fontFamily: 'Bebas Neue', fontSize: '0.85rem', minWidth: 50, textAlign: 'right' }}>
                            ${f.boxOffice.toFixed(1)}M
                          </span>
                        )}
                      </div>
                      {expandedFilmIdx === j && <FilmDetailCard film={f} tierColors={tierColors} />}
                    </div>
                  ))}
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
  const preFirstComplete = isSimplifiedRun(); // true until player completes first full run
  const [showHelp, setShowHelp] = useState(false);
  const [showArchetypes, setShowArchetypes] = useState(false);
  const [showUnlockToast, setShowUnlockToast] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode>('normal');
  const [selectedChallenge, setSelectedChallenge] = useState<string | undefined>(undefined);
  const [tab, setTab] = useState<'play' | 'challenges' | 'leaderboard' | 'career' | 'history' | 'achievements'>('play');
  const [muted, setMutedLocal] = useState(isMuted());
  const [customSeedInput, setCustomSeedInput] = useState('');
  const [showCustomSeed, setShowCustomSeed] = useState(false);
  const handleToggleMute = () => { const m = toggleMute(); setMutedLocal(m); if (!m) sfx.click(); };
  const stats = getRunStats();
  const leaderboard = getLeaderboard();
  const milestones = getMilestoneProgress();
  const dailyDate = getDailyDateString();
  const dailyDone = hasDailyRun(dailyDate);
  const dailyBest = getDailyBest(dailyDate);
  const weeklyDate = getWeeklyDateString();
  const weeklyDone = hasWeeklyRun(weeklyDate);
  const weeklyBest = getWeeklyBest(weeklyDate);
  const weeklyMods = getWeeklyModifiers();

  useEffect(() => {
    // No longer auto-open static modal on first run — interactive tutorial handles it
    if (shouldShowUnlockToast()) {
      markUnlockToastShown();
      setShowUnlockToast(true);
      const t = setTimeout(() => setShowUnlockToast(false), 5000);
      return () => clearTimeout(t);
    }
  }, [firstRun]);

  if (showArchetypes) {
    const todayMod = getTodayModifier();
    const modeLabel = selectedMode === 'newGamePlus' ? '⭐ NEW GAME+ — Targets ×1.4' :
      selectedMode === 'directorMode' ? '🔥 DIRECTOR MODE — Targets ×1.8' :
      selectedMode === 'daily' ? `📅 DAILY RUN — ${dailyDate} · ${todayMod.emoji} ${todayMod.name}` :
      selectedMode === 'weekly' ? `📆 WEEKLY CHALLENGE — ${weeklyDate} · ${weeklyMods[0].emoji} ${weeklyMods[0].name} + ${weeklyMods[1].emoji} ${weeklyMods[1].name}` :
      selectedMode === 'seeded' ? `🌱 CUSTOM SEED — ${customSeedInput}` :
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
              onClick={() => { startGame(selectedMode, selectedChallenge, customSeedInput || undefined); pickArchetype(a.id as StudioArchetypeId); }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(selectedMode, selectedChallenge, customSeedInput || undefined); pickArchetype(a.id as StudioArchetypeId); } }}
              tabIndex={0}
              role="button"
              aria-label={`${a.name}: ${a.description}`}
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
    <div className="start-screen" style={{
      position: 'relative',
      ...(hasGoldBorder() ? { border: '2px solid rgba(255,215,0,0.4)', borderRadius: 16, boxShadow: '0 0 30px rgba(255,215,0,0.1)' } : {}),
    }}>
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
      {getStudioPrefix() && (
        <div style={{ color: 'rgba(255,215,0,0.5)', fontFamily: 'Bebas Neue', fontSize: '0.8rem', letterSpacing: '0.2em', marginBottom: -4 }}>
          ✦ {getStudioPrefix()} Edition ✦
        </div>
      )}
      <div className="start-title animate-title">GREENLIGHT</div>
      <div className="start-subtitle">A Movie Studio Roguelite</div>

      {/* Tab navigation — advanced tabs hidden until first run complete */}
      {stats.runs > 0 && !preFirstComplete && (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 24, marginTop: 8, flexWrap: 'wrap' }}>
          {(['play', 'achievements', 'career', 'history', 'challenges', 'leaderboard'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? 'rgba(212,168,67,0.15)' : 'transparent',
              border: `1px solid ${tab === t ? 'var(--gold-dim)' : '#333'}`,
              borderRadius: 6, padding: '6px 12px', color: tab === t ? 'var(--gold)' : '#666',
              cursor: 'pointer', fontFamily: 'Bebas Neue', fontSize: '0.8rem', letterSpacing: '0.05em',
              transition: 'all 0.2s',
            }}>
              {t === 'play' ? '🎬 PLAY' : t === 'achievements' ? '🏅 TROPHIES' : t === 'career' ? '📊 CAREER' : t === 'history' ? '📜 RUNS' : t === 'challenges' ? '⚡ CHALLENGES' : '🏆 HALL OF FAME'}
            </button>
          ))}
        </div>
      )}

      {tab === 'play' && (
        <>
          <p style={{ color: '#888', maxWidth: 500, margin: '0 auto 32px', lineHeight: 1.6 }}>
            {firstRun
              ? 'Welcome to Hollywood. You\'ve just been handed the keys to a studio. Make movies, survive 5 seasons, and build your legacy.'
              : 'You\'re a freshly hired studio head. Make movies, build your reputation, survive the chaos of Hollywood.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            {hasSaveGame() && (() => {
              const info = getSaveInfo();
              return info ? (
                <button className="btn btn-primary btn-glow" onClick={() => { resumeGame(); }} style={{ position: 'relative' }}>
                  ▶ CONTINUE RUN
                  <div style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: 2, fontFamily: 'inherit' }}>
                    {info.studioName ? `${info.studioName} · ` : ''}Season {info.season} · {info.filmCount} film{info.filmCount !== 1 ? 's' : ''} · ${info.budget.toFixed(0)}M
                  </div>
                </button>
              ) : null;
            })()}
            <button className={`btn ${hasSaveGame() ? 'btn-small' : 'btn-primary btn-glow'}`} onClick={() => { markRunStarted(); setSelectedMode('normal'); setSelectedChallenge(undefined); setShowArchetypes(true); }}>
              NEW RUN
            </button>
            {/* Daily Run — hidden until first run complete */}
            {!preFirstComplete && (() => {
              const todayMod = getTodayModifier();
              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%', maxWidth: 400 }}>
                  <button className="btn btn-small" style={{ color: '#3498db', borderColor: '#3498db', opacity: dailyDone ? 0.5 : 1, width: '100%' }}
                    onClick={() => { if (!dailyDone) { markRunStarted(); setSelectedMode('daily'); setSelectedChallenge(undefined); setShowArchetypes(true); } }}>
                    📅 DAILY RUN <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>({dailyDate})</span>
                    {dailyDone && <span style={{ fontSize: '0.65rem', marginLeft: 6, color: '#2ecc71' }}>✓ {dailyBest?.score || 0}pts</span>}
                    {stats.dailyStreak.current > 0 && <span className="streak-bounce streak-pulse" style={{ fontSize: '0.65rem', marginLeft: 6, color: '#f39c12' }}>🔥{stats.dailyStreak.current}</span>}
                  </button>
                  {/* Daily Modifier */}
                  <div style={{
                    background: 'rgba(52,152,219,0.08)', border: '1px solid rgba(52,152,219,0.25)',
                    borderRadius: 8, padding: '8px 14px', width: '100%', textAlign: 'center',
                  }}>
                    <div style={{ color: '#3498db', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Today's Modifier</div>
                    <div style={{ fontSize: '1.4rem', marginBottom: 2 }}>{todayMod.emoji}</div>
                    <div style={{ color: '#ccc', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{todayMod.name}</div>
                    <div style={{ color: '#888', fontSize: '0.7rem' }}>{todayMod.description}</div>
                  </div>
                  {/* Weekly Calendar */}
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                    {(() => {
                      const today = new Date();
                      const dayOfWeek = today.getDay(); // 0=Sun
                      const days: { label: string; dateStr: string; isToday: boolean }[] = [];
                      for (let i = 0; i < 7; i++) {
                        const d = new Date(today);
                        d.setDate(today.getDate() - dayOfWeek + i);
                        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        days.push({ label: ['S','M','T','W','T','F','S'][i], dateStr: ds, isToday: ds === dailyDate });
                      }
                      return days.map(day => {
                        const done = hasDailyRun(day.dateStr);
                        const mod = getModifierForDate(day.dateStr);
                        return (
                          <div key={day.dateStr} title={`${day.dateStr}: ${mod.emoji} ${mod.name}`} style={{
                            width: 36, height: 44, borderRadius: 6,
                            background: day.isToday ? 'rgba(52,152,219,0.15)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${day.isToday ? '#3498db' : done ? 'rgba(46,204,113,0.3)' : '#222'}`,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: 1, cursor: 'default',
                          }}>
                            <span style={{ color: day.isToday ? '#3498db' : '#666', fontSize: '0.55rem', fontWeight: 600 }}>{day.label}</span>
                            <span style={{ fontSize: '0.75rem' }}>{done ? '✅' : mod.emoji}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              );
            })()}
            {/* Weekly Challenge — harder than daily, two modifiers */}
            {!preFirstComplete && (() => {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%', maxWidth: 400 }}>
                  <button className="btn btn-small" style={{ color: '#9b59b6', borderColor: '#9b59b6', opacity: weeklyDone ? 0.5 : 1, width: '100%' }}
                    onClick={() => { if (!weeklyDone) { markRunStarted(); setSelectedMode('weekly'); setSelectedChallenge(undefined); setShowArchetypes(true); } }}>
                    📆 WEEKLY CHALLENGE <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>(Week of {weeklyDate})</span>
                    {weeklyDone && <span style={{ fontSize: '0.65rem', marginLeft: 6, color: '#2ecc71' }}>✓ {weeklyBest?.score || 0}pts</span>}
                    {stats.weeklyStreak.current > 0 && <span className="streak-bounce streak-pulse" style={{ fontSize: '0.65rem', marginLeft: 6, color: '#9b59b6' }}>🔥{stats.weeklyStreak.current}w</span>}
                  </button>
                  <div style={{
                    background: 'rgba(155,89,182,0.08)', border: '1px solid rgba(155,89,182,0.25)',
                    borderRadius: 8, padding: '8px 14px', width: '100%', textAlign: 'center',
                  }}>
                    <div style={{ color: '#9b59b6', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>This Week's Modifiers (×2)</div>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                      {weeklyMods.map((mod, i) => (
                        <div key={i} style={{ flex: 1 }}>
                          <div style={{ fontSize: '1.2rem' }}>{mod.emoji}</div>
                          <div style={{ color: '#ccc', fontFamily: 'Bebas Neue', fontSize: '0.85rem' }}>{mod.name}</div>
                          <div style={{ color: '#888', fontSize: '0.6rem' }}>{mod.shortDesc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
            {/* Custom Seed */}
            {!preFirstComplete && (
              <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
                {!showCustomSeed ? (
                  <button className="btn btn-small" style={{ color: '#888', borderColor: '#555' }} onClick={() => setShowCustomSeed(true)}>
                    🌱 CUSTOM SEED
                  </button>
                ) : (
                  <div style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid #444',
                    borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 8, alignItems: 'center',
                  }}>
                    <input
                      type="text"
                      placeholder="Enter seed (e.g. BISHOP-42)"
                      value={customSeedInput}
                      onChange={e => setCustomSeedInput(e.target.value.toUpperCase())}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && customSeedInput.trim()) {
                          markRunStarted();
                          setSelectedMode('seeded');
                          setSelectedChallenge(undefined);
                          setShowArchetypes(true);
                        }
                      }}
                      style={{
                        flex: 1, background: 'transparent', border: '1px solid #555',
                        borderRadius: 4, padding: '6px 10px', color: '#ccc', fontFamily: 'monospace',
                        fontSize: '0.85rem', outline: 'none',
                      }}
                    />
                    <button
                      className="btn btn-small"
                      style={{ color: '#2ecc71', borderColor: '#2ecc71', padding: '4px 12px' }}
                      disabled={!customSeedInput.trim()}
                      onClick={() => {
                        if (customSeedInput.trim()) {
                          markRunStarted();
                          setSelectedMode('seeded');
                          setSelectedChallenge(undefined);
                          setShowArchetypes(true);
                        }
                      }}
                    >GO</button>
                    <button
                      className="btn btn-small"
                      style={{ color: '#888', borderColor: '#555', padding: '4px 8px' }}
                      onClick={() => { setShowCustomSeed(false); setCustomSeedInput(''); }}
                    >✕</button>
                  </div>
                )}
              </div>
            )}
            {!preFirstComplete && stats.ngPlusUnlocked && (
              <button className="btn btn-small" style={{ color: 'var(--gold)', borderColor: 'var(--gold-dim)' }} onClick={() => { markRunStarted(); setSelectedMode('newGamePlus'); setSelectedChallenge(undefined); setShowArchetypes(true); }}>
                ⭐ NEW GAME+ <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>(×1.4 targets)</span>
              </button>
            )}
            {!preFirstComplete && stats.directorUnlocked && (
              <button className="btn btn-small" style={{ color: '#e74c3c', borderColor: '#e74c3c' }} onClick={() => { markRunStarted(); setSelectedMode('directorMode'); setSelectedChallenge(undefined); setShowArchetypes(true); }}>
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
          {/* Hall of Fame */}
          <HallOfFameSection />
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

          {/* Endings Discovered */}
          {(() => {
            const found = getEndingsDiscovered();
            return found.length > 0 ? (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 8, letterSpacing: 1 }}>📖 ENDINGS DISCOVERED ({found.length}/{ENDINGS.length})</h3>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {ENDINGS.map(e => {
                    const discovered = found.includes(e.id);
                    return (
                      <div key={e.id} style={{
                        background: discovered ? `${e.color}15` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${discovered ? e.color + '44' : '#333'}`,
                        borderRadius: 8, padding: '6px 12px', textAlign: 'center', minWidth: 80,
                        opacity: discovered ? 1 : 0.4,
                      }}>
                        <div style={{ fontSize: '1.2rem' }}>{discovered ? e.emoji : '❓'}</div>
                        <div style={{ color: discovered ? e.color : '#555', fontSize: '0.6rem', fontFamily: 'Bebas Neue' }}>
                          {discovered ? e.title : '???'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null;
          })()}

          {/* Daily & Weekly Streaks */}
          {(stats.dailyStreak.best > 0 || stats.weeklyStreak.best > 0) && (
            <div style={{ marginBottom: 24, padding: 16, background: 'rgba(243,156,18,0.08)', border: '1px solid rgba(243,156,18,0.2)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ color: '#f39c12', fontFamily: 'Bebas Neue', fontSize: '1rem', marginBottom: 4 }}>🔥 CHALLENGE STREAKS</div>
              <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
                {stats.dailyStreak.best > 0 && (
                  <>
                    <div>
                      <div className="streak-bounce streak-pulse" style={{ color: '#f39c12', fontFamily: 'Bebas Neue', fontSize: '1.6rem' }}>📅 {stats.dailyStreak.current}</div>
                      <div style={{ color: '#888', fontSize: '0.65rem' }}>Daily Current</div>
                    </div>
                    <div>
                      <div style={{ color: '#e67e22', fontFamily: 'Bebas Neue', fontSize: '1.6rem' }}>⭐ {stats.dailyStreak.best}</div>
                      <div style={{ color: '#888', fontSize: '0.65rem' }}>Daily Best</div>
                    </div>
                  </>
                )}
                {stats.weeklyStreak.best > 0 && (
                  <>
                    <div>
                      <div className="streak-bounce streak-pulse" style={{ color: '#9b59b6', fontFamily: 'Bebas Neue', fontSize: '1.6rem' }}>📆 {stats.weeklyStreak.current}</div>
                      <div style={{ color: '#888', fontSize: '0.65rem' }}>Weekly Current</div>
                    </div>
                    <div>
                      <div style={{ color: '#8e44ad', fontFamily: 'Bebas Neue', fontSize: '1.6rem' }}>⭐ {stats.weeklyStreak.best}</div>
                      <div style={{ color: '#888', fontSize: '0.65rem' }}>Weekly Best</div>
                    </div>
                  </>
                )}
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

      {/* ─── ACHIEVEMENTS TAB ─── */}
      {tab === 'achievements' && <AchievementGallery />}

      {/* ─── RUN HISTORY TAB ─── */}
      {tab === 'history' && <RunHistoryTab leaderboard={leaderboard} />}

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
      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} isFirstTime={firstRun} />}
    </div>
  );
}
