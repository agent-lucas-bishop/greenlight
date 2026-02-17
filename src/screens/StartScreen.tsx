import { useState, useEffect, lazy, Suspense } from 'react';
import { isMuted, toggleMute, sfx } from '../sound';
import { startGame, pickArchetype, resumeGame } from '../gameStore';
import { hasSave, loadGameState, clearSave } from '../saveGame';
import { STUDIO_ARCHETYPES } from '../data';
import type { StudioArchetypeId, GameMode } from '../types';
import { RivalPreview } from '../components/RivalDashboard';
import { getRunStats, getMilestoneProgress, LEGACY_PERKS } from '../unlocks';
import { isFirstRun, markRunStarted, shouldShowUnlockToast, markUnlockToastShown, isSimplifiedRun } from '../onboarding';
import { getLeaderboard, hasDailyRun, getDailyBest, hasPlayerName, getPlayerName, setPlayerName } from '../leaderboard';
import { CHALLENGE_MODES, isChallengeUnlocked } from '../challenges';
import { getDailyDateString, getWeeklyDateString, getDailyNumber, getWeeklyNumber } from '../seededRng';
import { getTodayModifier, getWeeklyModifiers } from '../dailyModifiers';
import { getPersonalBests, getDailyStats } from '../personalBests';
import { getDailyArchetype, getDailyArchetypeName, getDailyStreak } from '../dailyChallenge';
import { STUDIO_ARCHETYPES as ARCHETYPE_DATA } from '../data';
import { KeywordGlossary } from '../components/KeywordTooltip';
import KeyboardHints from '../components/KeyboardHints';
import { getUnlockedAchievements, ACHIEVEMENTS } from '../achievements';
import { CHALLENGE_MODIFIERS, getCombinedModifierMultiplier } from '../challengeModifiers';
import { hasWeeklyRun, getWeeklyBest } from '../leaderboard';
import { WeeklyChallengeCard } from '../components/WeeklyChallenge';
import { getStudioIdentity, hasStudioIdentity } from '../studioIdentity';
import { getCareerTitle, loadProfile } from '../playerProfile';
import { DIFFICULTIES, getDifficultyConfig, getScoreMultiplier, isNGPlusUnlocked, loadLegacyDeck } from '../difficulty';
import type { Difficulty, GameModifiers } from '../types';
import DifficultySelect from '../components/DifficultySelect';

// Lazy-load heavy modals (only opened on demand)
const StudioLot = lazy(() => import('../components/StudioLot'));
const StudioCard = lazy(() => import('../components/StudioCard'));
const AchievementGallery = lazy(() => import('../components/AchievementGallery'));
const SettingsModal = lazy(() => import('../components/SettingsModal'));
const Glossary = lazy(() => import('../components/Glossary'));
const StatsPanel = lazy(() => import('../components/StatsPanel'));
const FilmArchive = lazy(() => import('../components/FilmArchive'));
const CareerStatsDashboard = lazy(() => import('../components/CareerStatsDashboard'));
const CareerStats307 = lazy(() => import('../components/CareerStats307'));
const StatsDashboard = lazy(() => import('../components/StatsDashboard'));
const HallOfFameTab = lazy(() => import('../components/HallOfFameTab'));
const TradingCardGallery = lazy(() => import('../components/TradingCardGallery'));
const SynergyCodex = lazy(() => import('../components/SynergyDisplay').then(m => ({ default: m.SynergyCodex })));
const LeaderboardScreen = lazy(() => import('../components/LeaderboardScreen'));
const TrophyRoom = lazy(() => import('../components/TrophyRoom'));
const CampaignSelect = lazy(() => import('../components/CampaignSelect'));
const PlayerProfileModal = lazy(() => import('../components/PlayerProfile'));
const CardCreator = lazy(() => import('../components/CardCreator'));
const ModManagerPanel = lazy(() => import('../components/ModManager'));
const ModCreatorPanel = lazy(() => import('../components/ModCreator'));
const CraftingWorkshop = lazy(() => import('../components/CraftingWorkshop'));
const ChallengeBoard = lazy(() => import('../components/ChallengeBoard'));
const CollectionPanel = lazy(() => import('../components/CollectionPanel'));
const DeckGallery = lazy(() => import('../components/DeckGallery'));
const PrestigePanel = lazy(() => import('../components/PrestigePanel'));
const StudioProfileScreen = lazy(() => import('../components/StudioProfileScreen'));
import { getPrestige, getPrestigeLevel, getNextPrestigeLevel, getPrestigeXPProgress, getVeteranScaling, hasMilestone, getUnlockedMilestones } from '../prestige';
import { getStudioMeta, calculateStudioXP, getStudioLevel } from '../studioProfile';
import { getPrestigeShop, getPrestigeStarsDisplay, getActiveNGPPerks } from '../prestigeShop';
import { getMetaProgression, getMetaLevel, getMetaXPProgress, getNextMetaLevel, getPrestigeBadgeEmoji, META_LEVELS, isStudioLegend } from '../metaProgression';
import { getAllGenreStats, MASTERY_THRESHOLDS } from '../genreMastery';
import { getCareerMilestones, updateLegacyAfterRun } from '../studioLegacy';
import { getStudioCustomization, getSelectedNameplate, getSelectedBanner, saveStudioCustomization } from '../studioCustomization';
import SeasonalBanner from '../components/SeasonalBanner';
const EventRewardsPanel = lazy(() => import('../components/EventRewards'));
const LegacyPanel = lazy(() => import('../components/LegacyPanel'));
const StudioOffice = lazy(() => import('../components/StudioOffice'));
const CardBackPicker = lazy(() => import('../components/CardBackPicker'));
const StudioLogoEditor = lazy(() => import('../components/StudioLogoEditor'));
import { getAllUnlockableStatus } from '../unlockableContent';
import { isEndlessUnlocked } from '../endgame';
import { EndlessRecords, EndlessLauncherInfo } from '../components/EndlessPanel';
import { DailyChallengeCard } from '../components/DailyChallenge';
import { ChallengeEditor } from '../components/ChallengeEditor';
import { ChallengeImport } from '../components/ChallengeImport';
import { getChallengeFromUrl, clearChallengeFromUrl } from '../challengeEditor';
import type { CustomChallenge } from '../challengeEditor';
import { getCollectionProgress } from '../tradingCards';
import { getCollectionStats } from '../cardCollection';
import { getRegistryCount } from '../cardRegistry';
import { getDiscoveredCount } from '../deckGalleryTracker';
import { createMultiplayerSession, saveMultiplayerSession } from '../multiplayer';
import type { MultiplayerSettings } from '../multiplayer';
import type { StudioArchetypeId as MPArchetypeId } from '../types';

const DailyLeaderboard = lazy(() => import('../components/DailyLeaderboard'));
const SaveSlotsPanel = lazy(() => import('../components/SaveSlotsPanel'));
const MultiplayerLobby = lazy(() => import('../components/MultiplayerLobby'));
const AnalyticsDashboard = lazy(() => import('../components/AnalyticsDashboard'));
const PosterWall = lazy(() => import('../components/PosterWall'));
import MiniStats from '../components/MiniStats';
import { hasUnseenChanges } from '../components/ChangelogModal';

const ChangelogModal = lazy(() => import('../components/ChangelogModal'));
const EventCalendar = lazy(() => import('../components/EventCalendar'));

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
  const [filterMode, setFilterMode] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterResult, setFilterResult] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const rankColors: Record<string, string> = { S: '#ff6b6b', A: '#ffd93d', B: '#6bcb77', C: '#5dade2', D: '#999', F: '#e74c3c' };
  const tierColors: Record<string, string> = { BLOCKBUSTER: '#2ecc71', SMASH: '#f1c40f', HIT: '#e67e22', FLOP: '#e74c3c' };

  if (leaderboard.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🎬</div>
        <div className="empty-state-title">No Runs Yet</div>
        <div className="empty-state-desc">Complete your first run to see your history here. Every studio starts somewhere!</div>
      </div>
    );
  }

  // Filter
  let filtered = leaderboard;
  if (filterMode !== 'all') filtered = filtered.filter(e => e.mode === filterMode);
  if (filterDifficulty !== 'all') filtered = filtered.filter(e => (e as any).difficulty === filterDifficulty);
  if (filterResult === 'won') filtered = filtered.filter(e => e.won);
  else if (filterResult === 'lost') filtered = filtered.filter(e => !e.won);

  // Sort
  if (sortBy === 'score') filtered = [...filtered].sort((a, b) => b.score - a.score);
  else if (sortBy === 'earnings') filtered = [...filtered].sort((a, b) => b.earnings - a.earnings);
  else if (sortBy === 'date') filtered = [...filtered]; // already chronological from leaderboard

  const modes = [...new Set(leaderboard.map(e => e.mode))];

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <select value={filterMode} onChange={e => setFilterMode(e.target.value)} style={{ background: '#1a1a1a', color: '#ccc', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem' }}>
          <option value="all">All Modes</option>
          {modes.map(m => <option key={m} value={m}>{m === 'normal' ? 'Standard' : m === 'newGamePlus' ? 'NG+' : m === 'directorMode' ? 'Director' : m === 'daily' ? 'Daily' : m === 'challenge' ? 'Challenge' : m}</option>)}
        </select>
        <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)} style={{ background: '#1a1a1a', color: '#ccc', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem' }}>
          <option value="all">All Difficulties</option>
          <option value="indie">🟢 Indie</option>
          <option value="studio">🟡 Studio</option>
          <option value="auteur">🎬 Auteur</option>
          <option value="mogul">🔴 Mogul</option>
          <option value="nightmare">💀 Nightmare</option>
          <option value="custom">⚙️ Custom</option>
        </select>
        <select value={filterResult} onChange={e => setFilterResult(e.target.value)} style={{ background: '#1a1a1a', color: '#ccc', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem' }}>
          <option value="all">Win & Loss</option>
          <option value="won">Wins Only</option>
          <option value="lost">Losses Only</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: '#1a1a1a', color: '#ccc', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem' }}>
          <option value="date">Sort: Recent</option>
          <option value="score">Sort: Score</option>
          <option value="earnings">Sort: Earnings</option>
        </select>
      </div>
      {filtered.length === 0 && (
        <div className="empty-state" style={{ padding: '20px' }}>
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-desc">No runs match these filters. Try adjusting your criteria.</div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((entry) => {
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
                  <span style={{ color: '#999', fontSize: '0.7rem' }}>{entry.date}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>{entry.score} pts</div>
                  <span style={{ color: '#999', fontSize: '0.8rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : '' }}>▾</span>
                </div>
              </div>

              {/* Studio name + tags */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                {entry.studioName && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--gold)', background: 'rgba(212,168,67,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                    {entry.studioName}
                  </span>
                )}
                {(entry as any).runTitle && (
                  <span style={{ fontSize: '0.7rem', color: '#999', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4, fontStyle: 'italic' }}>
                    "{(entry as any).runTitle}"
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
                {(entry as any).difficulty && (entry as any).difficulty !== 'studio' && (() => {
                  const d = DIFFICULTIES.find(dd => dd.id === (entry as any).difficulty);
                  return d ? (
                    <span style={{ fontSize: '0.7rem', color: d.color, background: `${d.color}15`, padding: '2px 8px', borderRadius: 4 }}>
                      {d.emoji} {d.name}
                    </span>
                  ) : null;
                })()}
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
                        <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>👑 Best</div>
                        <div style={{ color: '#2ecc71', fontSize: '0.8rem', fontWeight: 600 }}>"{bestFilm.title}"</div>
                        <div style={{ color: '#888', fontSize: '0.65rem' }}>{bestFilm.genre} · {bestFilm.tier}{bestFilm.boxOffice != null ? ` · $${bestFilm.boxOffice.toFixed(1)}M` : ''}</div>
                      </div>
                    )}
                    {worstFilm && worstFilm !== bestFilm && (
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>💀 Worst</div>
                        <div style={{ color: '#e74c3c', fontSize: '0.8rem', fontWeight: 600 }}>"{worstFilm.title}"</div>
                        <div style={{ color: '#888', fontSize: '0.65rem' }}>{worstFilm.genre} · {worstFilm.tier}{worstFilm.boxOffice != null ? ` · $${worstFilm.boxOffice.toFixed(1)}M` : ''}</div>
                      </div>
                    )}
                  </div>

                  {/* Full filmography */}
                  <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Full Filmography</div>
                  {entry.films.map((f, j) => (
                    <div key={j} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
                      borderBottom: j < entry.films.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                    }}>
                      <span style={{ color: '#999', fontFamily: 'Bebas Neue', fontSize: '0.8rem', width: 24 }}>S{f.season || j + 1}</span>
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
                      <div style={{ color: '#999', fontSize: '0.55rem' }}>SEASONS</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{'★'.repeat(entry.reputation)}{'☆'.repeat(Math.max(0, 5 - entry.reputation))}</div>
                      <div style={{ color: '#999', fontSize: '0.55rem' }}>REPUTATION</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>${entry.earnings.toFixed(1)}M</div>
                      <div style={{ color: '#999', fontSize: '0.55rem' }}>TOTAL BO</div>
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

function SkeletonLoader() {
  return (
    <div className="skeleton-loader">
      <div className="skeleton-block skeleton-title" />
      <div className="skeleton-block skeleton-line" />
      <div className="skeleton-block skeleton-line" />
      <div className="skeleton-block skeleton-line" />
      <div className="skeleton-block skeleton-card" />
      <div className="skeleton-block skeleton-card" />
    </div>
  );
}

function MottoEditor() {
  const [editing, setEditing] = useState(false);
  const customization = getStudioCustomization();
  const [mottoInput, setMottoInput] = useState(customization.motto);
  const save = () => { saveStudioCustomization({ motto: mottoInput.trim() }); setEditing(false); };
  return (
    <div style={{ marginTop: 24, textAlign: 'center' }}>
      <h3 style={{ color: 'var(--gold)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.08em', marginBottom: 12 }}>
        ✍️ STUDIO MOTTO
      </h3>
      {editing ? (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
          <input type="text" value={mottoInput} onChange={e => setMottoInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); }} maxLength={60} autoFocus
            style={{ background: '#1a1a1a', border: '1px solid var(--gold-dim)', borderRadius: 6, padding: '6px 12px', color: '#eee', fontSize: '0.8rem', width: 260, textAlign: 'center' }} />
          <button className="btn btn-small" onClick={save}>✓</button>
        </div>
      ) : (
        <div onClick={() => setEditing(true)} style={{ cursor: 'pointer', color: '#888', fontSize: '0.8rem', fontStyle: 'italic' }}>
          &ldquo;{customization.motto}&rdquo; <span style={{ fontSize: '0.6rem', color: '#555' }}>✏️ click to edit</span>
        </div>
      )}
    </div>
  );
}

export default function StartScreen() {
  const firstRun = isFirstRun();
  const simplified = isSimplifiedRun(); // true until first run complete
  const [showHelp, setShowHelp] = useState(false);
  const [showChallengeBoard, setShowChallengeBoard] = useState(false);
  const [showPlayerProfile, setShowPlayerProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const [showArchetypes, setShowArchetypes] = useState(false);
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [showPrestigePanel, setShowPrestigePanel] = useState(false);
  const [showStudioProfile, setShowStudioProfile] = useState(false);
  const [showSaveSlots, setShowSaveSlots] = useState(false);
  const [showMultiplayerLobby, setShowMultiplayerLobby] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('studio');
  const [selectedGameModifiers, setSelectedGameModifiers] = useState<GameModifiers | undefined>(undefined);
  const [showUnlockToast, setShowUnlockToast] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode>('normal');
  const [selectedChallenge, setSelectedChallenge] = useState<string | undefined>(undefined);
  const [showTrophyRoom, setShowTrophyRoom] = useState(false);
  const [tab, setTab] = useState<'play' | 'daily' | 'campaigns' | 'challenges' | 'leaderboard' | 'career' | 'history' | 'stats' | 'archive' | 'achievements' | 'dashboard' | 'hallOfFame' | 'cards' | 'collection' | 'deckGallery' | 'create' | 'synergies' | 'events' | 'craft' | 'legacy' | 'trophies' | 'studio' | 'mods' | 'analytics' | 'posters'>('play');
  const [dailySubTab, setDailySubTab] = useState<'challenge' | 'weekly' | 'create' | 'import'>('challenge');
  const [modsSubView, setModsSubView] = useState<'manage' | 'create'>('manage');
  const [urlChallenge, setUrlChallenge] = useState<CustomChallenge | null>(() => getChallengeFromUrl());
  const [showCampaignSelect, setShowCampaignSelect] = useState(false);
  const [activeModifiers, setActiveModifiers] = useState<string[]>([]);
  const [muted, setMutedLocal] = useState(isMuted());
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [pendingNewRun, setPendingNewRun] = useState(false);
  const [nameInput, setNameInput] = useState(getPlayerName() || '');
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
  const modifierMult = getCombinedModifierMultiplier(activeModifiers);

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

  if (showDifficulty) {
    return (
      <DifficultySelect
        onSelect={(diff, mods) => {
          setSelectedDifficulty(diff);
          setSelectedGameModifiers(mods);
          setShowDifficulty(false);
          setShowArchetypes(true);
        }}
      />
    );
  }

  if (showArchetypes) {
    const modeLabel = selectedMode === 'newGamePlus' ? '⭐ NEW GAME+ — Targets ×1.4' :
      selectedMode === 'directorMode' ? '🔥 DIRECTOR MODE — Targets ×1.8' :
      selectedMode === 'daily' ? '📅 DAILY RUN — ' + dailyDate :
      selectedMode === 'weekly' ? `🗓️ WEEKLY CHALLENGE — Week of ${weeklyDate}` :
      selectedChallenge ? `${CHALLENGE_MODES.find(c => c.id === selectedChallenge)?.emoji} ${CHALLENGE_MODES.find(c => c.id === selectedChallenge)?.name}` : '';
    const diffConfig = getDifficultyConfig(selectedDifficulty);
    return (
      <div className="fade-in" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h2 style={{ color: 'var(--gold)', marginBottom: 8 }}>Choose Your Studio</h2>
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ padding: '8px 16px', background: `${diffConfig.color}10`, border: `1px solid ${diffConfig.color}40`, borderRadius: 8, display: 'inline-block' }}>
            <span style={{ color: diffConfig.color, fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{diffConfig.emoji} {diffConfig.name} ({diffConfig.label})</span>
          </div>
          {modeLabel && (
            <div style={{ padding: '8px 16px', background: 'rgba(212,168,67,0.1)', border: '1px solid var(--gold-dim)', borderRadius: 8, display: 'inline-block' }}>
              <span style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{modeLabel}</span>
            </div>
          )}
        </div>
        <p style={{ color: '#888', marginBottom: 24, fontSize: '0.9rem' }}>Your studio identity shapes your strategy for the entire run.</p>
        <div style={{ marginBottom: 24 }}><RivalPreview /></div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 800, margin: '0 auto' }}>
          {STUDIO_ARCHETYPES.map(a => {
            const isRecommended = a.id === 'blockbuster';
            return (
            <div
              key={a.id}
              className="card"
              onClick={() => { if (selectedMode === 'daily') sfx.dailyStart(); else if (selectedMode === 'weekly') sfx.weeklyStart(); else sfx.click(); startGame(selectedMode, selectedChallenge, activeModifiers, selectedDifficulty, selectedGameModifiers); pickArchetype(a.id as StudioArchetypeId); }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (selectedMode === 'daily') sfx.dailyStart(); else if (selectedMode === 'weekly') sfx.weeklyStart(); else sfx.click(); startGame(selectedMode, selectedChallenge, activeModifiers, selectedDifficulty, selectedGameModifiers); pickArchetype(a.id as StudioArchetypeId); } }}
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
    <div className="start-screen" style={{ position: 'relative', ...(hasMilestone('studio_lot') ? { border: '2px solid #ffd700', boxShadow: '0 0 20px rgba(255,215,0,0.15)' } : {}) }}>
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8, zIndex: 10 }}>
        {stats.runs > 0 && (
          <button
            onClick={() => setShowPlayerProfile(true)}
            title="Player Profile"
            aria-label="Player Profile"
            className="start-icon-btn"
          >
            👤
          </button>
        )}
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
          onClick={() => setShowChangelog(true)}
          title="What's New"
          aria-label="What's New"
          className="start-icon-btn"
          style={{ position: 'relative' }}
        >
          📋
          {hasUnseenChanges() && (
            <span style={{
              position: 'absolute', top: -2, right: -2, width: 8, height: 8,
              background: '#22c55e', borderRadius: '50%', border: '2px solid #1a1a2e',
            }} />
          )}
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
      <SeasonalBanner />
      <div className="start-title animate-title">GREENLIGHT</div>
      <div className="start-subtitle">A Movie Studio Roguelite</div>
      {(() => {
        const identity = getStudioIdentity();
        const playerCareer = stats.runs > 0 ? getCareerTitle(loadProfile()) : null;
        return (
          <>
            {identity && (
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span style={{ fontSize: '1.2rem' }}>{identity.logo}</span>
                <span style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.08em' }}>
                  {identity.name}
                </span>
              </div>
            )}
            {identity && (() => {
              const customization = getStudioCustomization();
              return customization.motto ? (
                <div style={{ marginTop: 2, textAlign: 'center', color: '#888', fontSize: '0.65rem', fontStyle: 'italic' }}>
                  "{customization.motto}"
                </div>
              ) : null;
            })()}
            {playerCareer && (
              <div style={{ marginTop: 2, textAlign: 'center', color: '#888', fontSize: '0.7rem', fontFamily: 'Bebas Neue', letterSpacing: '0.05em' }}>
                {playerCareer.emoji} {playerCareer.title}
              </div>
            )}
          </>
        );
      })()}

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
                <span style={{ color: '#999', fontSize: '0.6rem' }}>Lv.{level.level}</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* R227: Prestige Stars + Shop Button */}
      {stats.runs > 0 && (() => {
        const pShop = getPrestigeShop();
        const pStars = getPrestigeStarsDisplay(pShop.prestigeLevel);
        return (
          <div style={{ textAlign: 'center', marginTop: 6 }}>
            {pStars && <span style={{ fontSize: '0.85rem', marginRight: 6 }}>{pStars}</span>}
            <button className="btn" onClick={() => { sfx.prestigeStarDisplay(); setShowPrestigePanel(true); }} style={{
              background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)',
              color: '#ffd700', padding: '3px 12px', cursor: 'pointer', fontSize: '0.7rem',
              fontFamily: 'Bebas Neue', letterSpacing: 1, borderRadius: 6,
            }}>
              ⭐ Prestige Shop{pShop.starPower > 0 ? ` (${pShop.starPower})` : ''}
            </button>
            <button className="btn" onClick={() => setShowStudioProfile(true)} style={{
              background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.3)',
              color: 'var(--gold)', padding: '3px 12px', cursor: 'pointer', fontSize: '0.7rem',
              fontFamily: 'Bebas Neue', letterSpacing: 1, borderRadius: 6, marginLeft: 6,
            }}>
              🏢 Studio Profile
            </button>
          </div>
        );
      })()}

      {/* R259: Active New Game+ Perks Badge */}
      {(() => {
        const ngpPerks = getActiveNGPPerks();
        if (ngpPerks.length === 0) return null;
        return (
          <div style={{
            textAlign: 'center', marginTop: 6, display: 'flex', flexWrap: 'wrap',
            gap: 4, justifyContent: 'center', maxWidth: 360, margin: '6px auto 0',
          }}>
            {ngpPerks.map(p => (
              <span key={p.id} title={p.description} style={{
                fontSize: '0.6rem', color: '#aaa', background: 'rgba(46,204,113,0.08)',
                padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(46,204,113,0.15)',
              }}>
                {p.emoji} {p.effectLabel}
              </span>
            ))}
          </div>
        );
      })()}

      {/* R171: Meta-Progression Level & XP Bar */}
      {stats.runs > 0 && (() => {
        const meta = getMetaProgression();
        const level = getMetaLevel(meta.xp);
        const xpProg = getMetaXPProgress(meta.xp);
        const nextLvl = getNextMetaLevel(meta.xp);
        const badge = getPrestigeBadgeEmoji(meta.prestigeCount);
        return (
          <div style={{
            marginTop: 12, background: 'rgba(155,89,182,0.06)', border: '1px solid rgba(155,89,182,0.2)',
            borderRadius: 10, padding: '10px 16px', maxWidth: 320, margin: '12px auto 0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span style={{ fontSize: '1rem' }}>{level.emoji}</span>
              <span style={{ color: '#bb86fc', fontFamily: 'Bebas Neue', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                {level.title}
              </span>
              <span style={{ color: '#888', fontSize: '0.65rem' }}>Lv.{level.level}</span>
              {badge && <span style={{ fontSize: '0.9rem' }}>{badge}</span>}
              {isStudioLegend() && <span style={{ color: '#ffd700', fontSize: '0.65rem', fontFamily: 'Bebas Neue' }}>★ LEGEND</span>}
            </div>
            {nextLvl ? (
              <div style={{ marginTop: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: '#888', marginBottom: 2 }}>
                  <span>{xpProg.earned} XP</span>
                  <span>{xpProg.needed} XP to Lv.{nextLvl.level}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 3, height: 6, overflow: 'hidden' }}>
                  <div style={{
                    background: 'linear-gradient(90deg, #9b59b6, #bb86fc)',
                    height: '100%', width: `${xpProg.progress * 100}%`, borderRadius: 3,
                  }} />
                </div>
                {nextLvl.unlock && (
                  <div style={{ textAlign: 'center', marginTop: 4, color: '#9b59b6', fontSize: '0.55rem', fontStyle: 'italic' }}>
                    Next: {nextLvl.unlock}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', marginTop: 4, color: '#ffd700', fontSize: '0.65rem', fontFamily: 'Bebas Neue' }}>
                ✨ MAX LEVEL ✨
              </div>
            )}
            {meta.prestigeCount > 0 && (
              <div style={{ textAlign: 'center', marginTop: 4, fontSize: '0.6rem', color: '#ffd700' }}>
                {Array.from({ length: meta.prestigeCount }, (_, i) => getPrestigeBadgeEmoji(i + 1)).join(' ')} Prestige {meta.prestigeCount}
              </div>
            )}
          </div>
        );
      })()}

      {/* Mogul Title (P10) */}
      {hasMilestone('mogul_title') && (
        <div style={{ marginTop: 4, textAlign: 'center' }}>
          <span style={{ color: '#ffd700', fontFamily: 'Bebas Neue', fontSize: '0.85rem', letterSpacing: '0.1em', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 6, padding: '2px 12px' }}>
            👑 MOGUL
          </span>
        </div>
      )}

      {/* Studio Difficulty Indicator */}
      {stats.runs > 0 && (() => {
        const scaling = getVeteranScaling();
        if (scaling.prestigeLevel < 1) return null;
        return (
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.7rem' }}>
            <span style={{ color: '#999' }}>Difficulty:</span>
            <span style={{ color: scaling.scalingPercent > 0 ? '#e74c3c' : scaling.prestigeLevel >= 3 ? '#f39c12' : '#666', fontFamily: 'Bebas Neue', letterSpacing: '0.05em' }}>
              {scaling.difficultyLabel}
            </span>
            {scaling.scalingPercent > 0 && (
              <span style={{ color: '#e74c3c', fontSize: '0.6rem' }}>
                (+{scaling.scalingPercent}% targets)
              </span>
            )}
            {scaling.activePerksCount > 0 && (
              <span style={{ color: '#999', fontSize: '0.6rem' }}>
                • {scaling.activePerksCount} perk{scaling.activePerksCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        );
      })()}

      {/* Studio Card + Studio Lot Visual */}
      {stats.runs > 0 && (
        <div style={{ margin: '16px auto 8px', maxWidth: 460 }}>
          <Suspense fallback={null}>
            <StudioCard compact />
          </Suspense>
          <div style={{ marginTop: 8 }}>
            <Suspense fallback={null}>
              <StudioLot compact />
            </Suspense>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      {stats.runs > 0 && (() => {
        const tabDefs: { id: typeof tab; emoji: string; label: string; shortLabel?: string }[] = [
          { id: 'play', emoji: '🎬', label: 'PLAY' },
          { id: 'daily' as const, emoji: '🎯', label: 'DAILY' },
          { id: 'campaigns' as const, emoji: '📖', label: 'CAMPAIGNS' },
          { id: 'stats', emoji: '📊', label: 'STATS' },
          { id: 'dashboard', emoji: '📈', label: 'DASHBOARD', shortLabel: 'DASH' },
          { id: 'analytics' as const, emoji: '📊', label: 'ANALYTICS' },
          { id: 'achievements', emoji: '🏆', label: 'ACHIEVEMENTS', shortLabel: 'ACHV' },
          { id: 'trophies' as const, emoji: '🏆', label: 'TROPHIES' },
          { id: 'cards', emoji: '🃏', label: `CARDS (${getCollectionProgress().collected}/${getCollectionProgress().total})`, shortLabel: 'CARDS' },
          { id: 'collection' as const, emoji: '📚', label: `COLLECTION (${getCollectionStats().discovered}/${getCollectionStats().total})`, shortLabel: 'COLLECT' },
          { id: 'deckGallery' as const, emoji: '🃏', label: `CARD GALLERY (${getDiscoveredCount()}/${getRegistryCount()})`, shortLabel: 'GALLERY' },
          { id: 'create', emoji: '🃏', label: 'WORKSHOP' },
          { id: 'craft' as const, emoji: '⚒️', label: 'CRAFT' },
          { id: 'synergies', emoji: '🔗', label: 'SYNERGIES' },
          { id: 'events' as const, emoji: '📅', label: 'EVENTS' },
          { id: 'legacy' as const, emoji: '🏛️', label: 'LEGACY' },
          { id: 'studio' as const, emoji: '🏢', label: 'STUDIO' },
          { id: 'mods' as const, emoji: '🔧', label: 'MODS' },
          { id: 'career', emoji: '📋', label: 'CAREER' },
          { id: 'history', emoji: '📜', label: 'RUNS' },
          { id: 'archive', emoji: '🎞️', label: 'ARCHIVE' },
          { id: 'posters' as const, emoji: '🖼️', label: 'POSTERS' },
          { id: 'hallOfFame', emoji: '🏛️', label: 'HALL OF FAME', shortLabel: 'HOF' },
          ...(!simplified ? [
            { id: 'challenges' as const, emoji: '⚡', label: 'CHALLENGES', shortLabel: 'CHAL' },
            { id: 'leaderboard' as const, emoji: '🏆', label: 'LEADERBOARD', shortLabel: 'LB' },
          ] : []),
        ];
        return (
          <div className="start-tab-bar">
            {tabDefs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`start-tab-btn${tab === t.id ? ' active' : ''}`}
              >
                {t.emoji} <span className="tab-label-full">{t.label}</span>
              </button>
            ))}
          </div>
        );
      })()}

      {tab === 'play' && (
        <>
          <p style={{ color: '#888', maxWidth: 500, margin: '0 auto 32px', lineHeight: 1.6 }}>
            You're a freshly hired studio head. Make movies, build your reputation, survive the chaos of Hollywood.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            {hasSave() && (() => {
              const saved = loadGameState();
              return saved ? (
                <button className="btn btn-success btn-glow" onClick={() => { resumeGame(saved); }}>
                  ▶ CONTINUE RUN <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>(Season {saved.season}, {saved.phase})</span>
                </button>
              ) : null;
            })()}
            <button className={`btn ${hasSave() ? 'btn-small' : 'btn-primary btn-glow'}`} onClick={() => {
              if (!hasPlayerName()) {
                setPendingNewRun(true);
                setShowNamePrompt(true);
              } else {
                clearSave(); markRunStarted(); setSelectedMode('normal'); setSelectedChallenge(undefined); setShowDifficulty(true);
              }
            }}>
              NEW RUN
            </button>
            {/* Daily Run — fixed setup: Studio difficulty, random archetype from seed, 3 seasons */}
            <button className="btn btn-small" style={{ color: 'var(--blue)', borderColor: 'var(--blue)', opacity: dailyDone ? 0.5 : 1 }}
              onClick={() => { if (!dailyDone) { sfx.dailyStart(); setTimeout(() => sfx.dailyChallengeFanfare(), 300); const arch = getDailyArchetype(); startGame('daily', undefined, undefined, 'studio'); pickArchetype(arch); } }}>
              📅 DAILY RUN <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>({dailyDate})</span>
              {dailyDone && <span style={{ fontSize: '0.65rem', marginLeft: 6, color: '#2ecc71' }}>✓ {dailyBest?.score || 0}pts</span>}
              {stats.dailyStreak.current > 0 && <span style={{ fontSize: '0.65rem', marginLeft: 6, color: '#f39c12' }}>🔥{stats.dailyStreak.current}</span>}
              {!dailyDone && <span style={{ fontSize: '0.6rem', marginLeft: 6, opacity: 0.6 }}>{getDailyArchetypeName()}</span>}
            </button>
            {/* Weekly Challenge */}
            {stats.runs > 0 && (
              <button className="btn btn-small" style={{ color: '#9b59b6', borderColor: '#9b59b6', opacity: weeklyDone ? 0.5 : 1 }}
                onClick={() => { if (!weeklyDone) { setSelectedMode('weekly'); setSelectedChallenge(undefined); setShowDifficulty(true); } }}>
                🗓️ WEEKLY CHALLENGE <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>(Week of {weeklyDate})</span>
                {weeklyDone && <span style={{ fontSize: '0.65rem', marginLeft: 6, color: '#2ecc71' }}>✓ {weeklyBest?.score || 0}pts</span>}
              </button>
            )}
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
                      <span style={{ color: '#999' }}>— {todayMod.shortDesc}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{weeklyMod1.emoji}</span>
                      <span style={{ color: '#ccc', fontWeight: 600 }}>{weeklyMod1.name}</span>
                      <span style={{ color: '#999' }}>— {weeklyMod1.shortDesc}</span>
                    </div>
                  </div>
                  <div style={{ color: '#444', fontSize: '0.6rem', marginTop: 6 }}>
                    Weekly modifier rotates every Monday · Week of {getWeeklyDateString()}
                  </div>
                </div>
              );
            })()}
            {/* Challenge Modifiers */}
            {stats.runs > 0 && (
              <div style={{
                background: 'rgba(243,156,18,0.06)', border: '1px solid rgba(243,156,18,0.15)',
                borderRadius: 10, padding: '12px 16px', maxWidth: 400, width: '100%',
                textAlign: 'left', fontSize: '0.75rem',
              }}>
                <div style={{ color: '#f39c12', fontFamily: 'Bebas Neue', fontSize: '0.8rem', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>⚙️ CHALLENGE MODIFIERS</span>
                  {modifierMult > 1.0 && <span style={{ color: '#2ecc71', fontSize: '0.7rem' }}>Score ×{modifierMult.toFixed(2)}</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {CHALLENGE_MODIFIERS.map(mod => {
                    const active = activeModifiers.includes(mod.id);
                    return (
                      <div key={mod.id}
                        className="challenge-modifier-row"
                        onClick={() => {
                          sfx.modifierToggle();
                          setActiveModifiers(prev =>
                            prev.includes(mod.id) ? prev.filter(id => id !== mod.id) : [...prev, mod.id]
                          );
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                          background: active ? 'rgba(243,156,18,0.12)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${active ? 'rgba(243,156,18,0.4)' : '#333'}`,
                          borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s',
                          minHeight: 48,
                        }}>
                        <span style={{ fontSize: '1rem', width: 24, textAlign: 'center' }}>
                          {active ? '✅' : '⬜'}
                        </span>
                        <span style={{ fontSize: '0.9rem' }}>{mod.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: active ? '#f39c12' : '#ccc', fontWeight: 600, fontSize: '0.8rem' }}>
                            {mod.name} <span style={{ color: '#2ecc71', fontWeight: 400, fontSize: '0.7rem' }}>×{mod.scoreMultiplier}</span>
                          </div>
                          <div style={{ color: '#999', fontSize: '0.65rem' }}>{mod.shortDesc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {isNGPlusUnlocked() && (() => {
              const legacy = loadLegacyDeck();
              return (
              <button className="btn btn-small" style={{
                color: '#ffd700', borderColor: 'rgba(255,215,0,0.5)',
                background: 'rgba(255,215,0,0.08)',
                boxShadow: '0 0 12px rgba(255,215,0,0.1)',
              }} onClick={() => { setSelectedMode('newGamePlus'); setSelectedChallenge(undefined); setShowDifficulty(true); }}>
                ⭐ NEW GAME+ <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>(×1.4 targets)</span>
                {legacy && <span style={{ fontSize: '0.6rem', marginLeft: 6, color: '#ffd700' }}>📦 {legacy.cards.length} legacy cards</span>}
              </button>
              );
            })()}
            {stats.directorUnlocked && (
              <button className="btn btn-danger btn-small" onClick={() => { setSelectedMode('directorMode'); setSelectedChallenge(undefined); setShowDifficulty(true); }}>
                🔥 DIRECTOR MODE <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>(×1.8 targets)</span>
              </button>
            )}
            {isEndlessUnlocked() && (
              <div>
                <button className="btn btn-small" style={{ color: '#e74c3c', borderColor: '#e74c3c' }} onClick={() => { sfx.endlessModeStartDrone(); clearSave(); markRunStarted(); setSelectedMode('endless' as any); setSelectedChallenge(undefined); setSelectedDifficulty('mogul'); setShowArchetypes(true); }}>
                  ♾️ ENDLESS MODE <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>(No season limit)</span>
                </button>
                <EndlessRecords />
              </div>
            )}
            <button className="btn btn-small" onClick={() => setShowSaveSlots(true)} style={{ color: '#3498db', borderColor: 'rgba(52,152,219,0.3)' }}>
              💾 SAVES
            </button>
            <button className="btn btn-small" onClick={() => setShowMultiplayerLobby(true)} style={{ color: '#9b59b6', borderColor: 'rgba(155,89,182,0.3)' }}>
              👥 MULTIPLAYER
            </button>
            <button className="btn btn-small" onClick={() => setShowHelp(true)}>HOW TO PLAY</button>
          </div>
          <div style={{ marginTop: 40, display: 'flex', gap: 24, color: '#999', fontSize: '0.75rem' }}>
            <span>🎬 5 Seasons</span><span>🎭 Push Your Luck</span><span>⭐ Build Your Studio</span><span>🏆 Chase the Oscar</span>
          </div>
          {stats.runs > 0 && (
            <>
              <MiniStats onOpenDashboard={() => setTab('analytics')} />
              <div style={{ marginTop: 8, display: 'flex', gap: 16, color: '#444', fontSize: '0.7rem' }}>
                <span>Runs: {stats.runs}</span><span>Wins: {stats.wins}</span><span>Win Rate: {stats.winRate}</span><span>Best Score: {stats.bestScore}</span>
              </div>
            </>
          )}
          {stats.legacyPerks.length > 0 && !simplified && (
            <div style={{ marginTop: 16, maxWidth: 500, margin: '16px auto 0' }}>
              <div style={{ color: '#999', fontSize: '0.7rem', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Active Legacy Perks</div>
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

      {tab === 'daily' && (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {([
              { id: 'challenge' as const, label: '🎯 DAILY', color: '#3498db' },
              { id: 'weekly' as const, label: '📅 WEEKLY', color: '#9b59b6' },
              { id: 'create' as const, label: '🔧 CREATE', color: '#f39c12' },
              { id: 'import' as const, label: '📥 IMPORT', color: '#8e44ad' },
            ] as const).map(st => (
              <button key={st.id} className="btn btn-small"
                style={{ color: dailySubTab === st.id ? st.color : '#666', borderColor: dailySubTab === st.id ? st.color : 'rgba(255,255,255,0.1)', background: dailySubTab === st.id ? `${st.color}15` : 'transparent' }}
                onClick={() => setDailySubTab(st.id)}>{st.label}</button>
            ))}
          </div>

          {/* URL challenge prompt */}
          {urlChallenge && dailySubTab === 'challenge' && (
            <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: 'rgba(243,156,18,0.08)', border: '1px solid rgba(243,156,18,0.3)' }}>
              <div style={{ color: '#f39c12', fontWeight: 'bold', marginBottom: 6 }}>🔧 Custom Challenge Detected!</div>
              <div style={{ color: '#ddd', fontSize: '0.85rem', marginBottom: 8 }}>"{urlChallenge.name}" {urlChallenge.author ? `by ${urlChallenge.author}` : ''}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-small" style={{ color: '#2ecc71', borderColor: '#2ecc71' }}
                  onClick={() => { setDailySubTab('import'); clearChallengeFromUrl(); }}>
                  🎬 View & Play
                </button>
                <button className="btn btn-small" style={{ color: '#888' }}
                  onClick={() => { setUrlChallenge(null); clearChallengeFromUrl(); }}>Dismiss</button>
              </div>
            </div>
          )}

          {dailySubTab === 'challenge' && (
            <>
              <DailyChallengeCard onStart={(type) => {
                if (type === 'daily') {
                  sfx.dailyStart();
                  setTimeout(() => sfx.dailyChallengeFanfare(), 300);
                  const arch = getDailyArchetype();
                  startGame('daily', undefined, undefined, 'studio');
                  pickArchetype(arch);
                } else {
                  setSelectedMode('weekly');
                  setSelectedChallenge(undefined);
                  setShowDifficulty(true);
                }
              }} />
              <div style={{ marginTop: 24 }}>
                <Suspense fallback={<SkeletonLoader />}>
                  <DailyLeaderboard inline />
                </Suspense>
              </div>
            </>
          )}

          {dailySubTab === 'weekly' && (
            <WeeklyChallengeCard onStart={() => {
              setSelectedMode('weekly');
              setSelectedChallenge(undefined);
              setShowDifficulty(true);
            }} />
          )}

          {dailySubTab === 'create' && (
            <ChallengeEditor onClose={() => setDailySubTab('challenge')} />
          )}

          {dailySubTab === 'import' && (
            <ChallengeImport
              initialChallenge={urlChallenge}
              onClose={() => { setDailySubTab('challenge'); setUrlChallenge(null); }}
              onPlay={(ch) => {
                // Start a custom challenge game with the modifiers applied
                sfx.click();
                const gm = ch.modifiers;
                if (ch.genre) gm.genreRestriction = ch.genre;
                startGame('normal', undefined, undefined, 'studio', gm);
              }}
            />
          )}
        </div>
      )}

      {tab === 'challenges' && (() => {
        const unlockStats = { totalWins: stats.wins, challengesCompleted: stats.careerStats.challengesCompleted || [] };
        // Community challenges button at top
        const communitySection = (
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <button
              className="btn"
              onClick={() => setShowChallengeBoard(true)}
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000', fontWeight: 700, padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              🏅 Community Challenges
            </button>
          </div>
        );
        const challengeBests: Record<string, { score: number; won: boolean }> = {};
        for (const entry of leaderboard) {
          if (entry.challenge && (!challengeBests[entry.challenge] || entry.score > challengeBests[entry.challenge].score)) {
            challengeBests[entry.challenge] = { score: entry.score, won: entry.won };
          }
        }
        return (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            {communitySection}
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
                    onClick={() => { if (!unlocked) return; setSelectedMode('challenge'); setSelectedChallenge(c.id); markRunStarted(); setShowDifficulty(true); }}
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
                            <div style={{ color: '#999', fontSize: '0.7rem', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
        <Suspense fallback={<SkeletonLoader />}>
          <LeaderboardScreen />
        </Suspense>
      )}

      {/* ─── STATS & ANALYTICS TAB ─── */}
      {tab === 'stats' && (
        <Suspense fallback={<SkeletonLoader />}>
          <StatsPanel />
        </Suspense>
      )}

      {/* ─── FILM ARCHIVE TAB ─── */}
      {tab === 'archive' && (
        <Suspense fallback={<SkeletonLoader />}>
          <FilmArchive />
        </Suspense>
      )}

      {/* ─── POSTER WALL TAB (R309) ─── */}
      {tab === 'posters' && (
        <Suspense fallback={<SkeletonLoader />}>
          <PosterWall inline />
        </Suspense>
      )}

      {/* ─── ACHIEVEMENTS TAB ─── */}
      {tab === 'achievements' && (
        <Suspense fallback={<SkeletonLoader />}>
          <AchievementGallery onClose={() => setTab('play')} inline />
        </Suspense>
      )}

      {/* ─── CAREER STATS DASHBOARD TAB ─── */}
      {tab === 'dashboard' && (
        <Suspense fallback={<SkeletonLoader />}>
          <StatsDashboard />
        </Suspense>
      )}

      {/* ─── ANALYTICS DASHBOARD TAB (R282) ─── */}
      {tab === 'analytics' && (
        <Suspense fallback={<SkeletonLoader />}>
          <AnalyticsDashboard />
        </Suspense>
      )}

      {/* ─── LEGACY TAB ─── */}
      {tab === 'legacy' && (
        <Suspense fallback={<SkeletonLoader />}>
          <LegacyPanel inline />
          <div style={{ marginTop: 24, maxWidth: 500, margin: '24px auto 0' }}>
            <StudioLogoEditor />
          </div>
        </Suspense>
      )}

      {/* ─── CAREER STATS TAB ─── */}
      {tab === 'career' && (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="career-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total Films', value: stats.careerStats.totalFilms.toString(), color: '#ccc' },
              { label: 'Lifetime BO', value: `$${(stats.careerStats.totalBoxOffice || 0).toFixed(0)}M`, color: 'var(--gold)' },
              { label: 'Blockbusters', value: stats.careerStats.totalBlockbusters.toString(), color: '#2ecc71' },
              { label: 'Win Rate', value: stats.winRate, color: '#3498db' },
              { label: 'Best Score', value: stats.bestScore.toString(), color: '#f39c12' },
              { label: 'Perfect Runs', value: stats.careerStats.perfectRuns.toString(), color: '#e74c3c' },
              { label: 'Time Played', value: `~${Math.max(1, Math.round(stats.careerStats.totalFilms * 3 + stats.runs * 2))}m`, color: '#9b59b6' },
              { label: 'Fav Genre', value: (() => { const g = stats.careerStats.genreFilms; const entries = Object.entries(g); return entries.length > 0 ? entries.sort((a, b) => b[1] - a[1])[0][0] : '—'; })(), color: '#e67e22' },
              { label: 'Luckiest Film', value: (() => { const lb = leaderboard; let best = { title: '—', bo: 0 }; for (const e of lb) for (const f of e.films) if ((f.boxOffice || 0) > best.bo) best = { title: f.title, bo: f.boxOffice || 0 }; return best.bo > 0 ? `$${best.bo.toFixed(0)}M` : '—'; })(), color: '#1abc9c' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #222', borderRadius: 8, padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ color: s.color, fontFamily: 'Bebas Neue', fontSize: '1.3rem' }}>{s.value}</div>
                <div style={{ color: '#999', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
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
              <div style={{ color: '#999', fontSize: '0.65rem', marginTop: 6 }}>
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
                            <span style={{ color: '#999', fontSize: '0.6rem' }}>{g.tier.label}</span>
                            {(g.tier.tier === 'gold' || g.tier.tier === 'platinum') && (
                              <span style={{ color: '#2ecc71', fontSize: '0.55rem', background: 'rgba(46,204,113,0.1)', padding: '1px 5px', borderRadius: 3 }}>+1 Quality</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 8, color: '#999', fontSize: '0.6rem', marginTop: 2 }}>
                            <span>{g.filmsProduced} films</span>
                            <span>${g.totalBoxOffice.toFixed(0)}M BO</span>
                            <span>Avg Q: {g.avgQuality}</span>
                          </div>
                          {g.bestFilm && (
                            <div style={{ color: '#999', fontSize: '0.55rem', marginTop: 1 }}>
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
                      <div style={{ color: '#999', fontSize: '0.7rem' }}>×{count}</div>
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
                    <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase' }}>Best Score</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #222', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>${o.bestEarnings.toFixed(1)}M</div>
                    <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase' }}>Best Earnings</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #222', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>${o.highestSingleFilmBO.toFixed(1)}M</div>
                    <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase' }}>Best Single Film</div>
                    {o.highestSingleFilmTitle && <div style={{ color: '#999', fontSize: '0.55rem' }}>"{o.highestSingleFilmTitle}"</div>}
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #222', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ color: '#3498db', fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>{o.fastestWin ?? '—'}</div>
                    <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase' }}>Fastest Win (Films)</div>
                  </div>
                </div>
                {/* Challenge mode bests */}
                {Object.keys(pb.modes).length > 1 && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ color: '#999', fontSize: '0.7rem', cursor: 'pointer' }}>Per-mode records ({Object.keys(pb.modes).length} modes)</summary>
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
                    <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Last {history.length} Dailies</div>
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
                      <span style={{ color: '#999', fontSize: '0.55rem' }}>{history[0]?.date}</span>
                      <span style={{ color: '#999', fontSize: '0.55rem' }}>{history[history.length - 1]?.date}</span>
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
                        <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{m.label}</div>
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
                    <div style={{ color: '#999', fontSize: '0.7rem' }}>{m.description}</div>
                    <div style={{ color: '#999', fontSize: '0.65rem' }}>{m.progressText}</div>
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

          {/* R307: Enhanced Career Stats */}
          <Suspense fallback={<div style={{ textAlign: 'center', color: '#666', padding: 20 }}>Loading...</div>}>
            <CareerStats307 />
          </Suspense>

          {/* Unlockable Content */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 8, letterSpacing: 1 }}>🔓 UNLOCKABLE CONTENT</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {getAllUnlockableStatus().map(item => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  background: item.unlocked ? 'rgba(46,204,113,0.05)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${item.unlocked ? 'rgba(46,204,113,0.3)' : '#222'}`,
                  borderRadius: 6,
                }}>
                  <span style={{ fontSize: '1.2rem', filter: item.unlocked ? 'none' : 'grayscale(1) brightness(0.3)' }}>
                    {item.unlocked ? item.emoji : '🔒'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: item.unlocked ? '#2ecc71' : '#666', fontWeight: 700, fontSize: '0.8rem' }}>
                      {item.unlocked ? item.name : '???'}
                      <span style={{ marginLeft: 6, color: '#999', fontWeight: 400, fontSize: '0.65rem' }}>
                        {item.type === 'script' ? '📜 Script' : '🎭 Talent'}
                      </span>
                    </div>
                    <div style={{ color: item.unlocked ? '#999' : '#555', fontSize: '0.65rem', marginTop: 2 }}>
                      {item.unlocked ? '✅ Unlocked — available in random pools' : item.conditionText}
                    </div>
                  </div>
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
            <div className="empty-state">
              <div className="empty-state-icon">📜</div>
              <div className="empty-state-title">No History Yet</div>
              <div className="empty-state-desc">Your filmography will appear here after your first completed run.</div>
            </div>
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
                        <span style={{ color: '#999', fontSize: '0.7rem' }}>{entry.date}</span>
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
                      <div style={{ color: '#999', fontSize: '0.6rem', marginTop: 4 }}>
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

      {/* ─── HALL OF FAME TAB ─── */}
      {tab === 'hallOfFame' && (
        <Suspense fallback={<SkeletonLoader />}>
          <HallOfFameTab />
        </Suspense>
      )}

      {/* ─── TRADING CARDS TAB ─── */}
      {tab === 'cards' && (
        <Suspense fallback={<SkeletonLoader />}>
          <TradingCardGallery onClose={() => setTab('play')} inline />
        </Suspense>
      )}

      {/* ─── DECK GALLERY TAB ─── */}
      {tab === 'deckGallery' && (
        <Suspense fallback={<SkeletonLoader />}>
          <DeckGallery onClose={() => setTab('play')} />
        </Suspense>
      )}

      {/* ─── COLLECTION TAB ─── */}
      {tab === 'collection' && (
        <Suspense fallback={<SkeletonLoader />}>
          <CollectionPanel onClose={() => setTab('play')} inline />
        </Suspense>
      )}

      {/* ─── CUSTOM CARD CREATOR TAB ─── */}
      {tab === 'create' && (
        <Suspense fallback={<SkeletonLoader />}>
          <CardCreator onClose={() => setTab('play')} />
        </Suspense>
      )}

      {tab === 'craft' && (
        <Suspense fallback={<SkeletonLoader />}>
          <CraftingWorkshop onClose={() => setTab('play')} inline />
        </Suspense>
      )}

      {tab === 'campaigns' && (
        <Suspense fallback={<SkeletonLoader />}>
          <CampaignSelect onBack={() => setTab('play')} />
        </Suspense>
      )}

      {tab === 'synergies' && (
        <Suspense fallback={<SkeletonLoader />}>
          <SynergyCodex onClose={() => setTab('play')} inline />
        </Suspense>
      )}

      {tab === 'events' && (
        <>
          <Suspense fallback={<SkeletonLoader />}>
            <EventCalendar onClose={() => setTab('play')} />
          </Suspense>
          <Suspense fallback={<SkeletonLoader />}>
            <EventRewardsPanel />
          </Suspense>
        </>
      )}

      {/* ─── STUDIO TAB ─── */}
      {tab === 'studio' && (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <Suspense fallback={<SkeletonLoader />}>
            <StudioOffice />
          </Suspense>
          <div style={{ marginTop: 24 }}>
            <Suspense fallback={<SkeletonLoader />}>
              <CardBackPicker />
            </Suspense>
          </div>
          {/* Motto editor */}
          <MottoEditor />
        </div>
      )}

      {/* ─── MODS TAB ─── */}
      {tab === 'mods' && (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <Suspense fallback={<SkeletonLoader />}>
            {modsSubView === 'create' ? (
              <ModCreatorPanel onClose={() => setModsSubView('manage')} />
            ) : (
              <ModManagerPanel onCreateMod={() => setModsSubView('create')} />
            )}
          </Suspense>
        </div>
      )}

      {tab === 'trophies' && (
        <Suspense fallback={<SkeletonLoader />}>
          <TrophyRoom onClose={() => setTab('play')} />
        </Suspense>
      )}

      {showTrophyRoom && (
        <Suspense fallback={null}>
          <TrophyRoom onClose={() => setShowTrophyRoom(false)} />
        </Suspense>
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
      {showAchievements && <Suspense fallback={null}><AchievementGallery onClose={() => setShowAchievements(false)} /></Suspense>}
      {showGlossary && <Suspense fallback={null}><Glossary onClose={() => setShowGlossary(false)} /></Suspense>}
      {showSettings && <Suspense fallback={null}><SettingsModal onClose={() => setShowSettings(false)} /></Suspense>}
      {showChangelog && <Suspense fallback={null}><ChangelogModal onClose={() => setShowChangelog(false)} /></Suspense>}
      {showPrestigePanel && <Suspense fallback={null}><PrestigePanel onClose={() => setShowPrestigePanel(false)} /></Suspense>}
      {showStudioProfile && <Suspense fallback={null}><StudioProfileScreen onClose={() => setShowStudioProfile(false)} /></Suspense>}
      {showKeyboardHints && <KeyboardHints onClose={() => setShowKeyboardHints(false)} />}
      {showChallengeBoard && (
        <Suspense fallback={null}>
          <ChallengeBoard onClose={() => setShowChallengeBoard(false)} />
        </Suspense>
      )}
      {showSaveSlots && (
        <Suspense fallback={null}>
          <SaveSlotsPanel onClose={() => setShowSaveSlots(false)} canSave={false} />
        </Suspense>
      )}
      {showPlayerProfile && (
        <Suspense fallback={null}>
          <PlayerProfileModal onClose={() => setShowPlayerProfile(false)} />
        </Suspense>
      )}

      {showMultiplayerLobby && (
        <div className="modal-overlay" onClick={() => setShowMultiplayerLobby(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 750, maxHeight: '90vh', overflow: 'auto' }}>
            <button className="modal-close" onClick={() => setShowMultiplayerLobby(false)} aria-label="Close">✕</button>
            <Suspense fallback={null}>
              <MultiplayerLobby
                onBack={() => setShowMultiplayerLobby(false)}
                onStart={(settings: MultiplayerSettings, players: { name: string; studioName: string; archetype: MPArchetypeId }[]) => {
                  const session = createMultiplayerSession(settings, players);
                  saveMultiplayerSession(session);
                  setShowMultiplayerLobby(false);
                  // Store session id so App can pick it up
                  localStorage.setItem('greenlight_mp_active', session.id);
                  window.location.reload();
                }}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Player Name Prompt */}
      {showNamePrompt && (
        <div className="modal-overlay" onClick={() => { setShowNamePrompt(false); setPendingNewRun(false); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎬</div>
            <h2 style={{ color: 'var(--gold)', marginBottom: 8 }}>What's Your Name, Director?</h2>
            <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 20 }}>
              This will appear on the leaderboard. You can change it anytime in Settings.
            </p>
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && nameInput.trim()) {
                  setPlayerName(nameInput.trim());
                  setShowNamePrompt(false);
                  if (pendingNewRun) {
                    setPendingNewRun(false);
                    clearSave(); markRunStarted(); setSelectedMode('normal'); setSelectedChallenge(undefined); setShowDifficulty(true);
                  }
                }
              }}
              placeholder="Enter your name..."
              maxLength={24}
              autoFocus
              style={{
                width: '100%', padding: '12px 16px', background: '#1a1a1a', border: '1px solid var(--gold-dim)',
                borderRadius: 8, color: '#eee', fontSize: '1rem', textAlign: 'center', marginBottom: 16,
                fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => {
                const name = nameInput.trim() || 'Anonymous';
                setPlayerName(name);
                setShowNamePrompt(false);
                if (pendingNewRun) {
                  setPendingNewRun(false);
                  clearSave(); markRunStarted(); setSelectedMode('normal'); setSelectedChallenge(undefined); setShowDifficulty(true);
                }
              }}>
                {nameInput.trim() ? `I'm ${nameInput.trim()} 🎬` : 'Skip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
