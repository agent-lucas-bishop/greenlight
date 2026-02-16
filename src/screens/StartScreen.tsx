import { useState } from 'react';
import { startGame, pickArchetype } from '../gameStore';
import { STUDIO_ARCHETYPES } from '../data';
import type { StudioArchetypeId } from '../types';

function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 style={{ color: 'var(--gold)', marginBottom: 16 }}>How to Play</h2>
        
        <div className="how-to-play">
          <div className="htp-section">
            <h3>🎬 The Goal</h3>
            <p>Survive <strong>5 seasons</strong> as a Hollywood studio head. Each season, make one movie and hit the box office target. Miss too many times and you're fired.</p>
          </div>
          
          <div className="htp-section">
            <h3>📝 Each Season</h3>
            <ol>
              <li><strong>Greenlight</strong> — Pick a script. Each has a genre, base quality score, and talent slots.</li>
              <li><strong>Casting</strong> — Fill slots from your roster or hire new talent. Talent has <span className="card-stat green" style={{ display: 'inline' }}>Skill</span> (quality boost) and <span className="card-stat red" style={{ display: 'inline' }}>Heat</span> (fame = volatility). Look for 💕 Chemistry between specific talent pairs!</li>
              <li><strong>Production</strong> — <em>This is the core.</em> Each draw reveals 2 cards. Incidents & Challenges auto-play; you pick 1 of any remaining Action cards. <strong>3 Incidents = DISASTER</strong> (ALL quality lost!). Choose when to "wrap."</li>
              <li><strong>Release</strong> — Quality × market condition × reputation = box office. Hit the target or take a strike.</li>
              <li><strong>Off-Season</strong> — Buy studio perks and hire new talent.</li>
            </ol>
          </div>
          
          <div className="htp-section">
            <h3>🃏 Card Types</h3>
            <ul>
              <li><strong style={{ color: '#2ecc71' }}>Action</strong> — Good cards with synergy bonuses. You choose which to keep.</li>
              <li><strong style={{ color: '#f1c40f' }}>Challenge</strong> — Gambling cards. Accept or decline a bet on the next card.</li>
              <li><strong style={{ color: '#e74c3c' }}>Incident</strong> — Bad cards that auto-play. 3 = Disaster!</li>
            </ul>
          </div>

          <div className="htp-section">
            <h3>🎬 Casting = Deckbuilding</h3>
            <p>Each talent brings their own cards into the production deck. A high-Skill actor adds great Action cards. A high-Heat diva adds powerful cards AND dangerous Incidents. Your cast literally shapes what cards you'll draw!</p>
          </div>

          <div className="htp-section">
            <h3>💕 Chemistry</h3>
            <p>Certain talent pairs have special chemistry — cast them together for bonus quality. Look for the 💕 indicator during casting!</p>
          </div>

          <div className="htp-section">
            <h3>🎬 Director's Cut</h3>
            <p>Once per production, use Director's Cut to peek at the top 3 cards and rearrange them. Use it to set up synergy combos or avoid disasters!</p>
          </div>
          
          <div className="htp-section">
            <h3>💀 How You Lose</h3>
            <p><strong>3 strikes</strong> (missed targets) = fired. Or if your <strong>reputation hits 0</strong>.</p>
          </div>
          
          <div className="htp-section">
            <h3>💡 Tips</h3>
            <ul>
              <li>Wrapping early with decent quality beats risking a disaster</li>
              <li>Match genre to visible market conditions for big multipliers</li>
              <li>Build chemistry pairs — they're worth several quality points</li>
              <li>Use Director's Cut to line up synergy combos</li>
              <li>Genre mastery grows: each film in the same genre gives +2 next time</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StartScreen() {
  const [showHelp, setShowHelp] = useState(false);
  const [showArchetypes, setShowArchetypes] = useState(false);

  if (showArchetypes) {
    return (
      <div className="fade-in" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h2 style={{ color: 'var(--gold)', marginBottom: 8 }}>Choose Your Studio</h2>
        <p style={{ color: '#888', marginBottom: 24, fontSize: '0.9rem' }}>Your studio identity shapes your strategy for the entire run.</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 800, margin: '0 auto' }}>
          {STUDIO_ARCHETYPES.map(a => (
            <div
              key={a.id}
              className="card"
              onClick={() => { startGame(); pickArchetype(a.id as StudioArchetypeId); }}
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
    <div className="start-screen">
      <div className="start-title animate-title">GREENLIGHT</div>
      <div className="start-subtitle">A Movie Studio Roguelite</div>
      <p style={{ color: '#888', maxWidth: 500, margin: '0 auto 32px', lineHeight: 1.6 }}>
        You're a freshly hired studio head. Make movies, build your reputation, survive the chaos of Hollywood.
        Push your luck in production, agonize over casting, and watch box office numbers explode.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <button className="btn btn-primary btn-glow" onClick={() => setShowArchetypes(true)}>
          NEW RUN
        </button>
        <button className="btn btn-small" onClick={() => setShowHelp(true)}>
          HOW TO PLAY
        </button>
      </div>
      <div style={{ marginTop: 40, display: 'flex', gap: 24, color: '#555', fontSize: '0.75rem' }}>
        <span>🎬 5 Seasons</span>
        <span>🎭 Push Your Luck</span>
        <span>⭐ Build Your Studio</span>
        <span>🏆 Chase the Oscar</span>
      </div>
      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}
    </div>
  );
}
