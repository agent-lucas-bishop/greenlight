import { useState } from 'react';
import { startGame } from '../gameStore';

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
              <li><strong>Greenlight</strong> — Pick a script. Each has a genre, base quality score, and talent slots to fill.</li>
              <li><strong>Casting</strong> — Fill your cast slots from your roster or hire new talent. Talent has <span className="card-stat green" style={{ display: 'inline' }}>Skill</span> (quality boost) and <span className="card-stat red" style={{ display: 'inline' }}>Heat</span> (fame = volatility).</li>
              <li><strong>Production</strong> — <em>This is the core.</em> Draw cards one at a time. Good cards add quality. Bad cards hurt. <strong>3 bad cards = DISASTER</strong> (quality halved). Choose when to "wrap" — stop drawing and lock in your film.</li>
              <li><strong>Release</strong> — Your film's quality × a random market condition = box office. Hit the target or take a strike.</li>
              <li><strong>Off-Season</strong> — Buy studio perks and hire new talent for next season.</li>
            </ol>
          </div>
          
          <div className="htp-section">
            <h3>🔥 The Heat Dilemma</h3>
            <p>High-Heat talent adds more cards to the production deck — both good AND bad. A Heat-4 star might deliver a masterpiece or tank your movie. That's the push-your-luck tension.</p>
          </div>
          
          <div className="htp-section">
            <h3>💀 How You Lose</h3>
            <p><strong>3 strikes</strong> (missed targets) = fired. Or if your <strong>reputation hits 0</strong>. Hits boost rep, misses drop it. Higher rep = bigger box office multiplier.</p>
          </div>
          
          <div className="htp-section">
            <h3>💡 Tips</h3>
            <ul>
              <li>Don't always push for max draws — wrapping early with decent quality beats a disaster</li>
              <li>Match your script's genre to the visible market conditions</li>
              <li>Studio perks define your strategy — build around them</li>
              <li>Watch for talent traits — they can be powerful or dangerous</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StartScreen() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="start-screen">
      <div className="start-title animate-title">GREENLIGHT</div>
      <div className="start-subtitle">A Movie Studio Roguelite</div>
      <p style={{ color: '#888', maxWidth: 500, margin: '0 auto 32px', lineHeight: 1.6 }}>
        You're a freshly hired studio head. Make movies, build your reputation, survive the chaos of Hollywood.
        Push your luck in production, agonize over casting, and watch box office numbers explode.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <button className="btn btn-primary btn-glow" onClick={startGame}>
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
