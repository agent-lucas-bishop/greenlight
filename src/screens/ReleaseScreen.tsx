import { useState, useEffect } from 'react';
import { GameState, RewardTier } from '../types';
import { getSeasonTarget } from '../data';
import { proceedFromRecap, calculateQuality } from '../gameStore';
import { RivalFilm, getSeasonIdentity, generateHeadline } from '../rivals';
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

const TIER_COLORS: Record<RewardTier, string> = {
  FLOP: '#e74c3c', HIT: '#f39c12', SMASH: '#d4a843', BLOCKBUSTER: '#ffd700',
};

const TIER_EMOJI: Record<RewardTier, string> = {
  FLOP: '💀', HIT: '🎬', SMASH: '🔥', BLOCKBUSTER: '🏆',
};

interface Props {
  state: GameState;
  rivalFilms: RivalFilm[];
}

export default function ReleaseScreen({ state, rivalFilms }: Props) {
  const target = getSeasonTarget(state.season, state.gameMode, state.challengeId);
  const tier = state.lastTier || 'FLOP';
  const config = TIER_CONFIG[tier];
  const lastResult = state.seasonHistory[state.seasonHistory.length - 1];
  // Phases: 0=counting, 1=tier reveal, 2=rewards, 3=rival rankings + headline
  const [phase, setPhase] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [screenFlash, setScreenFlash] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  const season = state.seasonHistory.length;
  const identity = getSeasonIdentity(season);

  // Generate headline
  const headline = lastResult ? generateHeadline(
    { title: lastResult.title, tier: lastResult.tier, boxOffice: lastResult.boxOffice },
    rivalFilms,
    season,
    state.totalEarnings,
    state.cumulativeRivalEarnings,
    state.strikes,
    state.reputation,
  ) : '';

  // All films sorted by box office
  const allFilms = lastResult ? [
    { name: '🎬 YOUR STUDIO', emoji: '🎬', title: lastResult.title, genre: lastResult.genre, boxOffice: lastResult.boxOffice, tier: lastResult.tier, isPlayer: true },
    ...rivalFilms.map(f => ({ name: `${f.studioEmoji} ${f.studioName}`, emoji: f.studioEmoji, title: f.title, genre: f.genre, boxOffice: f.boxOffice, tier: f.tier, isPlayer: false })),
  ].sort((a, b) => b.boxOffice - a.boxOffice) : [];

  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase(1);
      if (tier === 'BLOCKBUSTER') { setScreenFlash('screen-flash-gold'); sfx.blockbuster(); setShowConfetti(true); }
      else if (tier === 'FLOP') { setScreenFlash('screen-flash-red'); sfx.flop(); }
      else { sfx.hit(); }
      setTimeout(() => setScreenFlash(''), 800);
    }, 1600);
    const t2 = setTimeout(() => setPhase(2), 2800);
    const t3 = setTimeout(() => setPhase(3), 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const { rawQuality, scriptBase, talentSkill, productionBonus, cleanWrapBonus, scriptAbilityBonus, genreMasteryBonus, chemistryBonus, archetypeFocusBonus } = calculateQuality(state);

  return (
    <div className={`box-office fade-in ${screenFlash}`}>
      {showConfetti && (
        <div className="victory-particles">
          {Array.from({ length: 30 }, (_, i) => (
            <span key={i} className="particle" style={{
              left: `${Math.random() * 100}%`,
              animationDuration: `${2 + Math.random() * 2}s`,
              animationDelay: `${Math.random() * 1.5}s`,
              fontSize: `${0.8 + Math.random() * 1.2}rem`,
            }}>
              {['🌟', '✨', '🏆', '⭐', '🎬', '🎉'][Math.floor(Math.random() * 6)]}
            </span>
          ))}
        </div>
      )}
      <div className="phase-title">
        <h2>🎞️ Release Day</h2>
        <div className="subtitle">"{state.currentScript?.title}" hits theaters!</div>
      </div>

      {/* Core results: film name, quality, box office, tier */}
      <div style={{ marginBottom: 16 }}>
        <span className="card-stat gold">Quality: {state.lastQuality}</span>
      </div>

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

      {/* Tier rewards - simplified */}
      {phase >= 2 && (
        <div className="tier-rewards animate-slide-down">
          {tier === 'FLOP' && (
            <>
              <div className="reward-item negative">📉 -{state.challengeId === 'critics_choice' ? 2 : 1} Reputation · ⚠️ Strike {state.strikes}/{state.maxStrikes}</div>
              <div className="reward-item negative">💰 Earned {state.industryEvent?.effect === 'streamingSafety' ? '75%' : '60%'} — ${(state.lastBoxOffice * (state.industryEvent?.effect === 'streamingSafety' ? 0.75 : 0.6)).toFixed(1)}M</div>
            </>
          )}
          {tier === 'HIT' && <div className="reward-item positive">💰 +$5M bonus</div>}
          {tier === 'SMASH' && <div className="reward-item positive">📈 +1 Rep · 🎁 +$12M bonus</div>}
          {tier === 'BLOCKBUSTER' && <div className="reward-item positive">📈 +1 Rep · 🎁 +$22M bonus</div>}
        </div>
      )}

      {lastResult?.nominated && phase >= 2 && (
        <div className="nomination-banner animate-slide-down" style={{ marginTop: 12 }}>
          🏆 NOMINATED FOR BEST PICTURE!
        </div>
      )}

      {/* Expandable Details section */}
      {phase >= 2 && (
        <div className="animate-slide-down" style={{ marginTop: 16 }}>
          <button
            className="btn-tiny"
            onClick={() => setShowDetails(!showDetails)}
            style={{ color: '#888', fontSize: '0.8rem', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {showDetails ? '▲ Hide Details' : '▼ Show Details'}
          </button>

          {showDetails && (
            <div style={{ marginTop: 12 }}>
              {/* Quality breakdown */}
              <div className="quality-summary">
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

              {/* Market info */}
              <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#666' }}>
                Market: {state.activeMarket?.name}
              </div>

              {/* Cast credits */}
              <div className="cast-summary" style={{ marginTop: 12 }}>
                {state.castSlots.map((slot, i) => slot.talent && (
                  <div key={i} className="cast-credit">
                    <span style={{ color: '#999' }}>{slot.slotType}: </span>
                    <span style={{ color: '#d4a843' }}>{slot.talent.name}</span>
                    <span style={{ color: '#666' }}> (S{slot.talent.skill}/H{slot.talent.heat})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rival rankings — merged from SeasonRecapScreen */}
      {phase >= 3 && rivalFilms.length > 0 && (
        <div className="animate-slide-down" style={{ marginTop: 24 }}>
          {/* Headline */}
          <div style={{
            background: 'rgba(212,168,67,0.08)',
            border: '1px solid rgba(212,168,67,0.3)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#d4a843', lineHeight: 1.3 }}>
              {headline}
            </div>
          </div>

          {/* Box office rankings */}
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '0.9rem', color: '#888', marginBottom: 8, letterSpacing: 1 }}>
            📊 BOX OFFICE RANKINGS
          </div>
          {allFilms.map((film, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              marginBottom: 4,
              borderRadius: 6,
              background: film.isPlayer ? 'rgba(212,168,67,0.12)' : 'rgba(255,255,255,0.03)',
              border: film.isPlayer ? '1px solid rgba(212,168,67,0.3)' : '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: i === 0 ? '#ffd700' : '#666', width: 22 }}>
                #{i + 1}
              </span>
              <span style={{ fontSize: '1rem' }}>{TIER_EMOJI[film.tier]}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: film.isPlayer ? '#d4a843' : '#ccc', fontSize: '0.85rem', fontWeight: film.isPlayer ? 'bold' : 'normal' }}>
                  {film.title}
                </div>
                <div style={{ color: '#666', fontSize: '0.7rem' }}>
                  {film.name} · {film.genre}
                </div>
              </div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: TIER_COLORS[film.tier] }}>
                ${film.boxOffice.toFixed(1)}M
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Season history pips */}
      <div className="history" style={{ marginTop: 24 }}>
        {Array.from({ length: state.maxSeasons }, (_, i) => {
          const r = state.seasonHistory[i];
          return (
            <div key={i} className={`history-pip ${i + 1 === state.season ? 'current' : ''} ${r ? (r.hitTarget ? 'hit' : 'miss') : ''}`}>
              {r ? (r.hitTarget ? '✓' : '✗') : (i + 1)}
            </div>
          );
        })}
      </div>

      {phase >= 3 && (
        <div className="btn-group" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={proceedFromRecap}>
            {state.season >= state.maxSeasons ? 'SEE FINAL RESULTS →' : 'OFF-SEASON →'}
          </button>
        </div>
      )}
    </div>
  );
}
