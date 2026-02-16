import { useState } from 'react';
import { GameState } from '../types';
import { getSeasonTarget, STUDIO_ARCHETYPES } from '../data';
import { getChallengeById } from '../challenges';
import { isMuted, toggleMute, sfx } from '../sound';
import StatTooltip from './StatTooltip';

function QuickHelp({ onClose }: { onClose: () => void }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 480;
  return (
    <div className={`modal-overlay ${isMobile ? 'bottom-sheet' : ''}`} onClick={onClose} role="dialog" aria-modal="true" aria-label="Quick Reference">
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <button className="modal-close" onClick={onClose} aria-label="Close dialog">✕</button>
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
              <li>Director's Cut: peek at top 3 cards, rearrange</li>
            </ul>
          </div>
          <div className="htp-section">
            <h3>💡 Quick Tips</h3>
            <ul>
              <li>Match genre to market for $$$ multiplier</li>
              <li>💕 Chemistry pairs = free quality</li>
              <li>Focus on one tag type (60%+) for bonus quality</li>
              <li>Wrap early rather than risk disaster</li>
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
  const archetype = STUDIO_ARCHETYPES.find(a => a.id === state.studioArchetype);
  const handleToggleMute = () => { const m = toggleMute(); setMutedState(m); if (!m) sfx.click(); };
  return (
    <header className="header" role="banner" aria-label="Game status">
      <h1>🎬 {state.studioName ? state.studioName.toUpperCase() : archetype ? `${archetype.emoji} ${archetype.name.toUpperCase()}` : 'GREENLIGHT'}</h1>
      {(state.studioTagline || archetype) && (
        <div style={{ fontSize: '0.6rem', color: '#666', fontStyle: 'italic', marginTop: -4, marginBottom: 4, letterSpacing: '0.05em' }}>
          {archetype && <span>{archetype.emoji} {archetype.name}</span>}
          {state.studioTagline && archetype && <span> · </span>}
          {state.studioTagline && <span>{state.studioTagline}</span>}
        </div>
      )}
      <div className="header-stats">
        <div className="header-stat">
          <span className="label">Season</span>
          <span className="value">{state.season}/{state.maxSeasons}</span>
        </div>
        <div className="header-stat">
          <span className="label">Budget</span>
          <span className="value">${state.budget.toFixed(1)}M</span>
        </div>
        {state.debt > 0 && (
          <div className="header-stat">
            <span className="label">Debt</span>
            <span className="value" style={{ color: '#e74c3c' }}>-${state.debt.toFixed(1)}M</span>
          </div>
        )}
        <div className="header-stat">
          <span className="label">Reputation <StatTooltip tip="Stars multiply your box office earnings. Gain stars from big hits, lose them from flops and debt." /></span>
          <span className="value">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={`rep-star ${i < state.reputation ? 'filled' : 'empty'}`}>★</span>
            ))}
          </span>
        </div>
        <div className="header-stat">
          <span className="label">Target <StatTooltip tip="Earn at least this much at the box office to avoid a strike. Increases each season." /></span>
          <span className="value">${getSeasonTarget(state.season, state.gameMode, state.challengeId, state.dailyModifierId)}M</span>
        </div>
        <div className="header-stat">
          <span className="label">Strikes <StatTooltip tip="Miss the box office target and you get a strike. 3 strikes = game over!" /></span>
          <span className="value" style={{ color: state.strikes > 0 ? '#e74c3c' : undefined }}>
            {state.strikes}/{state.maxStrikes}
          </span>
        </div>
        {state.gameMode !== 'normal' && (
          <div className="header-stat">
            <span className="label">Mode</span>
            <span className="value" style={{ color: state.gameMode === 'directorMode' ? '#e74c3c' : state.gameMode === 'daily' ? '#3498db' : 'var(--gold)', fontSize: '0.9rem' }}>
              {state.gameMode === 'newGamePlus' ? '⭐ NG+' : state.gameMode === 'directorMode' ? '🔥 Director' : state.gameMode === 'daily' ? '📅 Daily' : state.gameMode === 'challenge' ? '⚡ Challenge' : ''}
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
        title={muted ? 'Unmute' : 'Mute'}
        aria-label={muted ? 'Unmute sound' : 'Mute sound'}
        style={{ right: 54 }}
      >
        {muted ? '🔇' : '🔊'}
      </button>
      {showHelp && <QuickHelp onClose={() => setShowHelp(false)} />}
    </header>
  );
}
