import { useState, useEffect, useRef } from 'react';
import { GameState } from '../types';
import { pickScript } from '../gameStore';
import { getSeasonTarget } from '../data';
import { getSeasonIdentity } from '../rivals';
import PhaseTip from '../components/PhaseTip';
import MechanicTip from '../components/MechanicTip';
import { isSimplifiedRun } from '../onboarding';
import { sfx } from '../sound';
import { useSwipe } from '../hooks/useSwipe';
import StatTooltip from '../components/StatTooltip';

export default function GreenlightScreen({ state }: { state: GameState }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [mobileIdx, setMobileIdx] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const target = getSeasonTarget(state.season, state.gameMode, state.challengeId, state.dailyModifierId, state.dailyModifierId2);
  const simplified = isSimplifiedRun();
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640;
  const swipeHandlers = useSwipe(
    () => setMobileIdx(i => Math.min(i + 1, state.scriptChoices.length - 1)),
    () => setMobileIdx(i => Math.max(i - 1, 0))
  );

  // Legendary reveal sound
  const legendaryPlayed = useRef(false);
  useEffect(() => {
    if (!legendaryPlayed.current && state.scriptChoices.some((s: any) => s.legendary)) {
      legendaryPlayed.current = true;
      setTimeout(() => sfx.legendaryReveal(), 400);
    }
  }, [state.scriptChoices]);

  const handlePick = (script: typeof state.scriptChoices[0]) => {
    if (picked) return;
    // Two-tap on mobile: first tap expands, second confirms
    if (isMobile && expandedId !== script.id) {
      setExpandedId(script.id);
      return;
    }
    sfx.greenlightStamp();
    setPicked(script.id);
    setTimeout(() => pickScript(script), 800);
  };

  return (
    <div className="fade-in">
      <PhaseTip phase="greenlight" />
      <div className="phase-title">
        <h2>🎬 Greenlight</h2>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#d4a843', letterSpacing: 1, marginBottom: 2 }}>
          {getSeasonIdentity(state.season).name}
        </div>
        <div className="subtitle">Season {state.season} — Target: <strong style={{ color: 'var(--gold)' }}>${target}M</strong> — {getSeasonIdentity(state.season).description}</div>
      </div>

      {state.industryEvent && (
        <div className="event-banner animate-slide-down">📰 <strong>{state.industryEvent.name}</strong> — {state.industryEvent.description}</div>
      )}

      {/* Genre Trends */}
      <div style={{ textAlign: 'center', marginBottom: 12, fontSize: '0.85rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 16px' }}>
        {state.hotGenres.length > 0 && (
          <StatTooltip tip="Hot genres get +25% box office multiplier this season. Audiences are hungry for these!" inline>
            <span style={{ color: '#2ecc71', cursor: 'help' }}>
              🔥 Hot: <strong>{state.hotGenres.join(', ')}</strong> <span style={{ color: '#888', fontSize: '0.75rem' }}>(+25%)</span>
            </span>
          </StatTooltip>
        )}
        {state.coldGenres.length > 0 && (
          <StatTooltip tip="Cold genres get −20% box office this season. The market's moved on — risky pick unless quality is high." inline>
            <span style={{ color: '#e74c3c', cursor: 'help' }}>
              ❄️ Cold: <strong>{state.coldGenres.join(', ')}</strong> <span style={{ color: '#888', fontSize: '0.75rem' }}>(-20%)</span>
            </span>
          </StatTooltip>
        )}
      </div>

      <div style={{ textAlign: 'center', marginBottom: 20, fontSize: '0.85rem', color: '#999', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 4, alignItems: 'center' }}>
        <span>Possible markets:</span>
        {state.marketConditions.map(m => (
          <span key={m.id} className="card-stat gold">
            {m.name} ({m.description})
          </span>
        ))}
      </div>

      {isMobile && !picked && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          {state.scriptChoices.map((_, i) => (
            <button key={i} onClick={() => setMobileIdx(i)} aria-label={`Script ${i + 1}`}
              style={{ width: 10, height: 10, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: i === mobileIdx ? 'var(--gold)' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s' }} />
          ))}
          <span style={{ fontSize: '0.7rem', color: '#999', marginLeft: 4 }}>← swipe →</span>
        </div>
      )}
      {state.scriptChoices.some((s: any) => s.legendary) && <MechanicTip id="legendaryScript" />}
      <div className="card-grid card-grid-3" {...swipeHandlers}>
        {state.scriptChoices.map((script, i) => {
          const canAfford = state.budget >= script.cost;
          const isPicked = picked === script.id;
          const isOther = picked && !isPicked;
          
          // Check if any market condition matches this genre
          const hasMarketMatch = state.marketConditions.some(m => m.genreBonus === script.genre);
          
          const genreClass = 'genre-' + script.genre.toLowerCase().replace('-', '');
          const isLegendary = !!(script as any).legendary;
          return (
            <div
              key={script.id}
              className={`card tap-target card-stagger ${genreClass} ${isPicked ? 'chosen' : ''} ${isOther ? 'not-chosen' : ''} ${isMobile && !picked && i !== mobileIdx ? 'mobile-hidden' : ''} ${isMobile && expandedId === script.id && !picked ? 'mobile-expanded' : ''} ${isLegendary ? 'legendary-script' : ''}`}
              onClick={() => handlePick(script)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePick(script); } }}
              tabIndex={picked ? -1 : 0}
              role="button"
              aria-label={`${script.title}, ${script.genre} film, base score ${script.baseScore}, cost $${script.cost}M`}
              style={{ 
                animationDelay: `${i * 0.1}s`,
              }}
            >
              <div className="card-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {isLegendary && <span className="legendary-badge">⭐ LEGENDARY</span>}
                <span className={`genre-label ${script.genre.toLowerCase().replace('-', '')}`}>{script.genre}</span>
                {state.hotGenres.includes(script.genre as any) && <span style={{ color: '#2ecc71', fontSize: '0.65rem' }}>🔥 HOT</span>}
                {state.coldGenres.includes(script.genre as any) && <span style={{ color: '#e74c3c', fontSize: '0.65rem' }}>❄️ COLD</span>}
                {hasMarketMatch && <span style={{ color: 'var(--green-bright)', fontSize: '0.65rem' }}>📈 Match</span>}
              </div>
              <div className="card-title">{script.title}</div>
              <div style={{ marginBottom: 8 }}>
                <span className="card-stat gold">Base {script.baseScore}</span>
                {script.cost > 0 && <span className="card-stat red">-${script.cost}M</span>}
                <span className="card-stat blue">{script.slots.length} slots</span>
                {(state.genreMastery[script.genre] || 0) > 0 && (
                  <span className="card-stat green">🎓 Mastery +{(state.genreMastery[script.genre] || 0) * 2}</span>
                )}
              </div>
              <div className="card-body">
                Slots: {script.slots.join(', ')}
                <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#999' }}>
                  📦 {script.cards?.length || 0} script cards added to production deck
                </div>
                {script.abilityDesc && (
                  <div style={{ marginTop: 6, color: '#d4a843', fontStyle: 'italic', fontSize: '0.8rem' }}>
                    ✨ {script.abilityDesc}
                  </div>
                )}
              </div>
              {!canAfford && !simplified && (
                <div style={{ marginTop: 8, color: '#e67e22', fontSize: '0.75rem' }}>
                  ⚠️ Goes into debt (+${(script.cost - state.budget).toFixed(0)}M) — 20% interest/season
                </div>
              )}
              {isPicked && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
                  <div className="stamp-badge">GREENLIT</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
