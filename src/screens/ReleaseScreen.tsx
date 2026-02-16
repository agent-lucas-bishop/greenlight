import { useState, useEffect } from 'react';
import { GameState, RewardTier } from '../types';
import { getSeasonTarget } from '../data';
import { proceedToRecap, calculateQuality } from '../gameStore';
import { sfx } from '../sound';

function CountUp({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(target * eased * 10) / 10);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return <>${current.toFixed(1)}M</>;
}

const TIER_CONFIG: Record<RewardTier, { emoji: string; label: string; subtitle: string; color: string; bg: string }> = {
  FLOP: { emoji: '💀', label: 'FLOP', subtitle: 'Straight to Streaming', color: '#e74c3c', bg: 'linear-gradient(135deg, #1a0000 0%, #3d0000 100%)' },
  HIT: { emoji: '🎬', label: 'HIT', subtitle: 'Solid Opening Weekend', color: '#f39c12', bg: 'linear-gradient(135deg, #1a1200 0%, #3d2a00 100%)' },
  SMASH: { emoji: '🔥', label: 'SMASH HIT', subtitle: 'Number One at the Box Office!', color: '#d4a843', bg: 'linear-gradient(135deg, #1a1500 0%, #4a3800 100%)' },
  BLOCKBUSTER: { emoji: '🏆', label: 'BLOCKBUSTER', subtitle: 'Cultural Phenomenon!', color: '#ffd700', bg: 'linear-gradient(135deg, #1a1800 0%, #5a4a00 100%)' },
};

export default function ReleaseScreen({ state }: { state: GameState }) {
  const target = getSeasonTarget(state.season, state.gameMode, state.challengeId);
  const tier = state.lastTier || 'FLOP';
  const config = TIER_CONFIG[tier];
  const lastResult = state.seasonHistory[state.seasonHistory.length - 1];
  const [phase, setPhase] = useState(0); // 0: counting, 1: tier reveal, 2: details

  const [screenFlash, setScreenFlash] = useState('');
  
  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase(1);
      // Flash + sound based on tier
      if (tier === 'BLOCKBUSTER') { setScreenFlash('screen-flash-gold'); sfx.blockbuster(); }
      else if (tier === 'FLOP') { setScreenFlash('screen-flash-red'); sfx.flop(); }
      else if (tier === 'SMASH') { sfx.hit(); }
      else { sfx.hit(); }
      setTimeout(() => setScreenFlash(''), 800);
    }, 1600);
    const t2 = setTimeout(() => setPhase(2), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const { rawQuality, scriptBase, talentSkill, productionBonus, cleanWrapBonus, scriptAbilityBonus, genreMasteryBonus, chemistryBonus, archetypeFocusBonus } = calculateQuality(state);

  // Tier rewards
  const bonusMoney = tier === 'BLOCKBUSTER' ? 22 : tier === 'SMASH' ? 12 : tier === 'HIT' ? 5 : 0;

  return (
    <div className={`box-office fade-in ${screenFlash}`}>
      <div className="phase-title">
        <h2>🎞️ Release Day</h2>
        <div className="subtitle">"{state.currentScript?.title}" hits theaters!</div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <span className="card-stat blue">Market: {state.activeMarket?.name}</span>
        <span className="card-stat gold">Quality: {state.lastQuality}</span>
      </div>

      {/* Box office number */}
      <div className="box-office-number score-reveal" style={{ color: config.color }}>
        <CountUp target={state.lastBoxOffice} />
      </div>

      <div className={`box-office-target ${phase >= 1 ? 'revealed' : 'hidden'}`}>
        Target: ${target}M
      </div>

      {/* TIER BANNER */}
      {phase >= 1 && (
        <div
          className={`tier-banner tier-${tier.toLowerCase()} animate-slide-down`}
          style={{ background: config.bg, borderColor: config.color }}
        >
          <div className="tier-emoji">{config.emoji}</div>
          <div className="tier-label" style={{ color: config.color }}>{config.label}</div>
          <div className="tier-subtitle">{config.subtitle}</div>
        </div>
      )}

      {/* Tier rewards */}
      {phase >= 2 && (
        <div className="tier-rewards animate-slide-down">
          {tier === 'FLOP' && (
            <>
              <div className="reward-item negative">📉 -1 Reputation (Rep {state.reputation})</div>
              <div className="reward-item negative">💰 Earned only 60% of box office</div>
              <div className="reward-item negative">⚠️ Strike {state.strikes}/3</div>
            </>
          )}
          {tier === 'HIT' && (
            <>
              <div className="reward-item">💰 Earned ${state.lastBoxOffice.toFixed(1)}M</div>
              <div className="reward-item positive">🎁 +$5M bonus!</div>
            </>
          )}
          {tier === 'SMASH' && (
            <>
              <div className="reward-item positive">📈 +1 Reputation! (Rep {state.reputation})</div>
              <div className="reward-item positive">🎁 +$12M bonus!</div>
            </>
          )}
          {tier === 'BLOCKBUSTER' && (
            <>
              <div className="reward-item positive">📈 +1 Reputation! (Rep {state.reputation})</div>
              <div className="reward-item positive">🎁 +$22M bonus!</div>
            </>
          )}
          <div className="reward-item" style={{ color: '#888' }}>📋 Season stipend: +$5M</div>
        </div>
      )}

      {/* Quality breakdown */}
      {phase >= 2 && (
        <div className="quality-summary animate-slide-down">
          <div className="qs-title">Quality Breakdown</div>
          <div className="qs-row"><span>Script Base</span><span>{scriptBase}</span></div>
          <div className="qs-row"><span>Talent Skill</span><span>+{talentSkill}</span></div>
          <div className="qs-row"><span>Production</span><span>{productionBonus >= 0 ? '+' : ''}{productionBonus}</span></div>
          {cleanWrapBonus > 0 && <div className="qs-row positive"><span>✨ Clean Wrap</span><span>+{cleanWrapBonus}</span></div>}
          {scriptAbilityBonus > 0 && <div className="qs-row positive"><span>⭐ Script Ability</span><span>+{scriptAbilityBonus}</span></div>}
          {genreMasteryBonus > 0 && <div className="qs-row positive"><span>🎓 Genre Mastery</span><span>+{genreMasteryBonus}</span></div>}
          {chemistryBonus > 0 && <div className="qs-row positive"><span>💕 Chemistry</span><span>+{chemistryBonus}</span></div>}
          {archetypeFocusBonus > 0 && <div className="qs-row positive"><span>⚡ Archetype Focus</span><span>+{archetypeFocusBonus}</span></div>}
          <div className="qs-row total"><span>Total</span><span>{rawQuality}</span></div>
        </div>
      )}

      {lastResult?.nominated && phase >= 2 && (
        <div className="nomination-banner animate-slide-down" style={{ marginTop: 16 }}>
          🏆 NOMINATED FOR BEST PICTURE!
        </div>
      )}

      {/* Cast credits */}
      {phase >= 2 && (
        <div className="cast-summary animate-slide-down" style={{ marginTop: 24 }}>
          {state.castSlots.map((slot, i) => slot.talent && (
            <div key={i} className="cast-credit">
              <span style={{ color: '#999' }}>{slot.slotType}: </span>
              <span style={{ color: '#d4a843' }}>{slot.talent.name}</span>
              <span style={{ color: '#666' }}> (S{slot.talent.skill}/H{slot.talent.heat})</span>
            </div>
          ))}
        </div>
      )}

      {/* Season history */}
      <div className="history" style={{ marginTop: 32 }}>
        {Array.from({ length: 5 }, (_, i) => {
          const r = state.seasonHistory[i];
          return (
            <div key={i} className={`history-pip ${i + 1 === state.season ? 'current' : ''} ${r ? (r.hitTarget ? 'hit' : 'miss') : ''}`}>
              {r ? (r.hitTarget ? '✓' : '✗') : (i + 1)}
            </div>
          );
        })}
      </div>

      {phase >= 2 && (
        <div className="btn-group">
          <button className="btn btn-primary" onClick={proceedToRecap}>
            SEASON WRAP-UP →
          </button>
        </div>
      )}
    </div>
  );
}
