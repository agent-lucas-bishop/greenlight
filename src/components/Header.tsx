import { useState, useRef, useEffect } from 'react';
import { GameState } from '../types';
import { getSeasonTarget, STUDIO_ARCHETYPES } from '../data';
import { getStudioIdentity } from '../studioIdentity';
import { getDifficultyBadge } from '../difficulty';
// Reputation tier helper (duplicated from EndScreen to avoid circular import)
function getRepTier(rep: number): { name: string; color: string } {
  if (rep >= 12) return { name: 'Legendary', color: '#ff6b6b' };
  if (rep >= 9) return { name: 'Acclaimed', color: '#ffd93d' };
  if (rep >= 6) return { name: 'Established', color: '#6bcb77' };
  if (rep >= 3) return { name: 'Rising', color: '#5dade2' };
  return { name: 'Unknown', color: '#999' };
}
import { getChallengeById } from '../challenges';
import { isMuted, toggleMute, sfx, getVolume, setVolume } from '../sound';
import StatTooltip from './StatTooltip';

function QuickHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540, maxHeight: '85vh', overflow: 'auto' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h2 style={{ color: 'var(--gold)', marginBottom: 16 }}>Quick Reference</h2>
        <div className="how-to-play">
          <div className="htp-section">
            <h3>🎯 Goal</h3>
            <p>Survive 5 seasons. Hit box office targets. Don't get 3 strikes.</p>
          </div>
          <div className="htp-section">
            <h3>🃏 Production</h3>
            <ul>
              <li>Draw 2 cards → keep 1 (Action cards are your choice)</li>
              <li>Incidents & Challenges auto-play</li>
              <li><strong style={{ color: '#e74c3c' }}>3 Incidents = DISASTER</strong> (lose all quality!)</li>
              <li>Wrap anytime to lock in quality</li>
              <li>Director's Cut: peek at top 3, rearrange</li>
              <li>Director's Vision: meet the condition for +5 quality (fail = −2)</li>
            </ul>
          </div>
          <div className="htp-section">
            <h3>🔧 Mid-Production Options</h3>
            <ul>
              <li>Script Rewrite ($3M): swap a deck card mid-shoot</li>
              <li>Reshoots (perk): redraw 1 card per film</li>
              <li>Encore: after wrap, risk one more draw for bonus quality</li>
              <li>$5M Reshoots: after wrap, re-roll all incidents (risky!)</li>
            </ul>
          </div>
          <div className="htp-section">
            <h3>📊 After Release</h3>
            <ul>
              <li>Extended Cut ($3M): re-release for 30-50% extra box office (uses next film slot)</li>
              <li>Completion Bond (perk): upgrades next FLOP to MISS (one-use insurance)</li>
              <li>Rival Studios: 3 AI competitors — their films affect the season narrative</li>
            </ul>
          </div>
          <div className="htp-section">
            <h3>⭐ Progression</h3>
            <ul>
              <li>Prestige XP: earned across runs, unlocks cosmetics and legacy bonuses</li>
              <li>Genre Mastery: repeated genres earn mastery tiers (Bronze→Platinum) with quality bonuses</li>
              <li>Elite Talent: powerful but high-Heat — manage the incident risk</li>
              <li>Legendary Scripts: rare, unique abilities, higher base scores</li>
            </ul>
          </div>
          <div className="htp-section">
            <h3>💡 Quick Tips</h3>
            <ul>
              <li>Match genre to 🔥 Hot trends + 📈 market for huge multipliers</li>
              <li>💕 Chemistry pairs = free quality</li>
              <li>Focus on one tag type (60%+) for archetype focus bonus</li>
              <li>At 2 incidents, seriously consider wrapping</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Header({ state }: { state: GameState }) {
  const [showHelp, setShowHelp] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const [volume, setVolumeState] = useState(getVolume());
  const [showVolume, setShowVolume] = useState(false);
  const [budgetFlash, setBudgetFlash] = useState('');
  const [strikeFlash, setStrikeFlash] = useState(false);
  const prevBudget = useRef(state.budget);
  const prevStrikes = useRef(state.strikes);
  const archetype = STUDIO_ARCHETYPES.find(a => a.id === state.studioArchetype);
  const identity = getStudioIdentity();

  useEffect(() => {
    if (state.budget !== prevBudget.current) {
      setBudgetFlash(state.budget > prevBudget.current ? 'budget-flash-green' : 'budget-flash-red');
      const t = setTimeout(() => setBudgetFlash(''), 600);
      prevBudget.current = state.budget;
      return () => clearTimeout(t);
    }
  }, [state.budget]);

  useEffect(() => {
    if (state.strikes > prevStrikes.current) {
      setStrikeFlash(true);
      const t = setTimeout(() => setStrikeFlash(false), 800);
      prevStrikes.current = state.strikes;
      return () => clearTimeout(t);
    }
    prevStrikes.current = state.strikes;
  }, [state.strikes]);
  const handleToggleMute = () => { const m = toggleMute(); setMutedState(m); if (!m) sfx.click(); };
  const handleVolume = (v: number) => { setVolume(v); setVolumeState(v); };
  return (
    <div className="header">
      <h1>{identity?.logo || '🎬'} {identity?.name?.toUpperCase() || (state.studioName ? state.studioName.toUpperCase() : archetype ? `${archetype.emoji} ${archetype.name.toUpperCase()}` : 'GREENLIGHT')}</h1>
      {(state.studioTagline || archetype) && (
        <div style={{ fontSize: '0.6rem', color: '#666', fontStyle: 'italic', marginTop: -4, marginBottom: 4, letterSpacing: '0.05em' }}>
          {archetype && <span>{archetype.emoji} {archetype.name}</span>}
          {state.studioTagline && archetype && <span> · </span>}
          {state.studioTagline && <span>{state.studioTagline}</span>}
          {state.difficulty && state.difficulty !== 'studio' && (() => {
            const badge = getDifficultyBadge(state.difficulty);
            return <span style={{ marginLeft: 8, color: badge.color, fontStyle: 'normal', fontWeight: 700, fontSize: '0.6rem', background: `${badge.color}15`, padding: '1px 6px', borderRadius: 4, border: `1px solid ${badge.color}30` }}>{badge.emoji} {badge.name}</span>;
          })()}
        </div>
      )}
      <div className="header-stats">
        <div className="header-stat">
          <span className="label">Season</span>
          <span className="value">{state.season}/{state.maxSeasons}</span>
        </div>
        <div className="header-stat">
          <StatTooltip tip="Your money to hire talent and buy perks. Overspending creates debt." inline>
            <span className="label">Budget</span>
          </StatTooltip>
          <span className={`value ${budgetFlash}`} aria-label={`Budget: $${state.budget.toFixed(1)}M`}>${state.budget.toFixed(1)}M</span>
        </div>
        {state.debt > 0 && (
          <div className="header-stat">
            <span className="label">Debt</span>
            <span className="value" style={{ color: '#e74c3c' }}>-${state.debt.toFixed(1)}M</span>
          </div>
        )}
        <div className="header-stat">
          <StatTooltip tip="Star rating (1-5). Multiplies box office earnings. Drops when you miss targets. 0 = game over!" inline>
            <span className="label">Reputation</span>
          </StatTooltip>
          <span className="value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={`rep-star ${i < state.reputation ? 'filled rep-star-fill' : 'empty'}`}>★</span>
              ))}
            </span>
            <span style={{ fontSize: '0.6rem', color: getRepTier(state.reputation).color, fontFamily: 'Bebas Neue', letterSpacing: '0.05em' }}>
              {getRepTier(state.reputation).name}
            </span>
          </span>
        </div>
        <div className="header-stat">
          <StatTooltip tip="The box office amount your film must earn this season. Increases each season." inline>
            <span className="label">Target</span>
          </StatTooltip>
          <span className="value">${getSeasonTarget(state.season, state.gameMode, state.challengeId, state.dailyModifierId, state.dailyModifierId2)}M</span>
        </div>
        <div className="header-stat">
          <StatTooltip tip="Miss a box office target = 1 strike. 3 strikes and you're fired!" inline>
            <span className="label">Strikes</span>
          </StatTooltip>
          <span className={`value ${strikeFlash ? 'strike-new' : ''}`} style={{ color: state.strikes > 0 ? '#e74c3c' : undefined }} aria-live="polite">
            {state.strikes}/{state.maxStrikes}
          </span>
        </div>
        {state.gameMode !== 'normal' && (
          <div className="header-stat">
            <span className="label">Mode</span>
            <span className="value" style={{ color: state.gameMode === 'directorMode' ? '#e74c3c' : state.gameMode === 'daily' ? '#3498db' : state.gameMode === 'weekly' ? '#9b59b6' : 'var(--gold)', fontSize: '0.9rem' }}>
              {state.gameMode === 'newGamePlus' ? '⭐ NG+' : state.gameMode === 'directorMode' ? '🔥 Director' : state.gameMode === 'daily' ? '📅 Daily' : state.gameMode === 'weekly' ? '🗓️ Weekly' : state.gameMode === 'challenge' ? '⚡ Challenge' : ''}
            </span>
          </div>
        )}
        {state.challengeId && (() => { const ch = getChallengeById(state.challengeId!); return ch ? (
          <div className="header-stat">
            <span className="label">Challenge</span>
            <span className="value" style={{ color: '#e67e22', fontSize: '0.85rem' }}>{ch.emoji} {ch.name}</span>
          </div>
        ) : null; })()}
      </div>
      {state.perks.length > 0 && (
        <div className="perks-bar">
          {state.perks.map(p => <span key={p.id} className="perk-badge" title={p.description}>{p.name}</span>)}
        </div>
      )}
      <button 
        className="header-help-btn" 
        onClick={() => setShowHelp(true)}
        title="How to Play"
        aria-label="How to Play"
      >
        ?
      </button>
      <button
        className="header-help-btn"
        onClick={handleToggleMute}
        onContextMenu={e => { e.preventDefault(); setShowVolume(!showVolume); }}
        title={muted ? 'Unmute (right-click for volume)' : 'Mute (right-click for volume)'}
        aria-label={muted ? 'Unmute sound' : 'Mute sound'}
        style={{ right: 50 }}
      >
        {muted ? '🔇' : volume > 0.5 ? '🔊' : volume > 0 ? '🔉' : '🔈'}
      </button>
      {showVolume && (
        <div style={{
          position: 'absolute', right: 40, top: 36, background: '#1a1a2e', border: '1px solid var(--gold-dim)',
          borderRadius: 8, padding: '8px 12px', zIndex: 100, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: '0.7rem', color: '#888' }}>🔈</span>
          <input type="range" min="0" max="100" value={Math.round(volume * 100)}
            onChange={e => handleVolume(parseInt(e.target.value) / 100)}
            aria-label="Volume"
            style={{ width: 80, accentColor: 'var(--gold)' }} />
          <span style={{ fontSize: '0.7rem', color: '#888' }}>🔊</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--gold)', width: 28 }}>{Math.round(volume * 100)}%</span>
        </div>
      )}
      {showHelp && <QuickHelp onClose={() => setShowHelp(false)} />}
    </div>
  );
}
