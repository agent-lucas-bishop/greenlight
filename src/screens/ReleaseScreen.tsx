import { useState, useEffect } from 'react';
import { GameState, RewardTier } from '../types';
import { getSeasonTarget } from '../data';
import { proceedFromRecap, calculateQuality, doExtendedCut, declineExtendedCut } from '../gameStore';
import { RivalFilm, getSeasonIdentity, getSeasonNarrative, getRivalryLeaderboard, generateRivalCommentary, calculateRubberBand } from '../rivals';
import { generateCriticQuote, generateDetailedHeadline, generateStudioHeadline } from '../narrative';
import { formatSoundtrackRating } from '../soundtrack';
import { sfx } from '../sound';
import MechanicTip from '../components/MechanicTip';
import PostFilmSummary from '../components/PostFilmSummary';
import type { AudienceReaction } from '../audienceReactions';

function CountUp({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic with a dramatic slow-down at the end
      const eased = 1 - Math.pow(1 - progress, 4);
      setCurrent(Math.round(target * eased * 10) / 10);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setDone(true);
      }
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return <span className={done ? 'box-office-final' : 'box-office-counting'}>${current.toFixed(1)}M</span>;
}

function GoldenBurst({ elaborate }: { elaborate?: boolean }) {
  const particles = Array.from({ length: elaborate ? 16 : 10 }, (_, i) => {
    const angle = (i / (elaborate ? 16 : 10)) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const dist = 40 + Math.random() * (elaborate ? 80 : 50);
    return {
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
      delay: Math.random() * 0.2,
    };
  });
  return (
    <div className={`golden-burst ${elaborate ? 'prestige-burst' : ''}`}>
      {particles.map((p, i) => (
        <span key={i} className="golden-particle" style={{
          '--tx': `${p.tx}px`,
          '--ty': `${p.ty}px`,
          animationDelay: `${p.delay}s`,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}

function StreakOverlay({ streak }: { streak: number }) {
  if (streak < 2) return null;
  const fires = '🔥'.repeat(Math.min(streak, 5));
  return (
    <div className="streak-overlay">
      {fires} {streak}x Streak!
    </div>
  );
}

function ConfettiBurst({ color }: { color: 'gold' | 'red' }) {
  const colors = color === 'gold' 
    ? ['#d4a843', '#f0c75e', '#ffd700', '#e8b84b', '#fff3c4']
    : ['#e74c3c', '#c0392b', '#ff6b6b', '#d35400', '#e67e22'];
  return (
    <div className="confetti-burst">
      {Array.from({ length: 40 }, (_, i) => (
        <span key={i} className="confetti-piece" style={{
          left: `${Math.random() * 100}%`,
          background: colors[Math.floor(Math.random() * colors.length)],
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          width: `${6 + Math.random() * 8}px`,
          height: `${6 + Math.random() * 8}px`,
          animationDuration: `${1.5 + Math.random() * 2}s`,
          animationDelay: `${Math.random() * 0.8}s`,
        }} />
      ))}
    </div>
  );
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
  const target = getSeasonTarget(state.season, state.gameMode, state.challengeId, state.dailyModifierId, state.dailyModifierId2);
  const tier = state.lastTier || 'FLOP';
  const config = TIER_CONFIG[tier];
  const lastResult = state.seasonHistory[state.seasonHistory.length - 1];
  // Phases: 0=counting, 1=tier reveal, 2=rewards, 3=rival rankings + headline
  const [phase, setPhase] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [screenFlash, setScreenFlash] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [showShake, setShowShake] = useState(false);
  const [showGoldenBurst, setShowGoldenBurst] = useState(false);
  const [tierRevealed, setTierRevealed] = useState(false);

  // Calculate streak: consecutive non-flop films ending with this one
  const streak = (() => {
    const hist = state.seasonHistory;
    let count = 0;
    for (let i = hist.length - 1; i >= 0; i--) {
      if (hist[i].tier !== 'FLOP') count++;
      else break;
    }
    return count;
  })();

  const season = state.seasonHistory.length;
  const identity = getSeasonIdentity(season);

  const filmTitle = state.lastFilmTitle || state.currentScript?.title || 'Untitled';
  const leadTalent = state.castSlots.find(s => s.slotType === 'Lead' && s.talent)?.talent;

  // Generate critic quote
  const criticQuote = lastResult ? generateCriticQuote(
    lastResult.tier,
    lastResult.genre,
    filmTitle,
    leadTalent?.name,
  ) : '';

  // Generate headline
  const headline = lastResult ? generateDetailedHeadline(
    { title: filmTitle, tier: lastResult.tier, boxOffice: lastResult.boxOffice, genre: lastResult.genre },
    rivalFilms,
    season,
    state.totalEarnings,
    state.cumulativeRivalEarnings,
    state.strikes,
    state.reputation,
    state.castSlots,
    state.studioName,
  ) : '';

  // Generate studio headline (newspaper-style)
  const studioHeadline = lastResult ? generateStudioHeadline(
    lastResult.tier,
    filmTitle,
    lastResult.genre,
    state.studioName,
  ) : '';

  // All films sorted by box office
  const allFilms = lastResult ? [
    { name: `🎬 ${state.studioName || 'YOUR STUDIO'}`, emoji: '🎬', title: filmTitle, genre: lastResult.genre, boxOffice: lastResult.boxOffice, tier: lastResult.tier, isPlayer: true },
    ...rivalFilms.map(f => ({ name: `${f.studioEmoji} ${f.studioName}`, emoji: f.studioEmoji, title: f.title, genre: f.genre, boxOffice: f.boxOffice, tier: f.tier, isPlayer: false })),
  ].sort((a, b) => b.boxOffice - a.boxOffice) : [];

  useEffect(() => {
    // Rising tone during box office count-up
    sfx.boxOfficeReveal();
    const t1 = setTimeout(() => {
      setPhase(1);
      // Brief suspense before tier visual reveal
      setTimeout(() => {
        setTierRevealed(true);
        if (streak >= 2) setTimeout(() => sfx.streakBonus(), 200);
        if (tier === 'BLOCKBUSTER') { setScreenFlash('screen-flash-gold'); sfx.blockbuster(); setShowConfetti(true); setShowGoldenBurst(true); }
        else if (tier === 'SMASH') { setScreenFlash(''); sfx.smash(); setShowConfetti(true); setShowGoldenBurst(true); }
        else if (tier === 'FLOP') { setScreenFlash('screen-flash-red'); sfx.flop(); setTimeout(() => sfx.strikeAdded(), 400); setShowShake(true); setTimeout(() => setShowShake(false), 250); }
        else { sfx.hit(); }
        setTimeout(() => setScreenFlash(''), 800);
      }, 500);
    }, 1600);
    const t2 = setTimeout(() => { setPhase(2); if (tier === 'FLOP' && state.completionBond) sfx.completionBond(); }, 3300);
    const t3 = setTimeout(() => { setPhase(3); sfx.marketForecast(); }, 4100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const { rawQuality, scriptBase, talentSkill, productionBonus, cleanWrapBonus, scriptAbilityBonus, genreMasteryBonus, chemistryBonus, archetypeFocusBonus } = calculateQuality(state);
  const soundtrackBonus = state.postProdSoundtrack?.qualityBonus || 0;

  return (
    <div className={`box-office fade-in ${screenFlash} ${showShake ? 'screen-shake' : ''}`}>
      {showConfetti && <ConfettiBurst color={tier === 'BLOCKBUSTER' ? 'gold' : 'gold'} />}
      {phase >= 1 && streak >= 2 && <StreakOverlay streak={streak} />}
      {showGoldenBurst && phase >= 1 && <GoldenBurst />}
      <div className="phase-title">
        <h2>🎞️ Release Day</h2>
        <div className="subtitle" style={{ fontSize: '1.1rem', color: '#d4a843' }}>"{filmTitle}"</div>
        <div style={{ fontSize: '0.75rem', color: '#999', marginTop: 2 }}>a {state.currentScript?.genre} film by {state.studioName || 'Your Studio'}</div>
      </div>

      {/* Core results: film name, quality, box office, tier */}
      <div style={{ marginBottom: 16 }}>
        <span className="card-stat gold">Quality: {state.lastQuality}</span>
      </div>

      <div className="box-office-number score-reveal" style={{ color: config.color }} aria-live="polite" aria-label={`Box office: $${state.lastBoxOffice}M`}>
        <CountUp target={state.lastBoxOffice} />
      </div>

      <div className={`box-office-target ${phase >= 1 ? 'revealed' : 'hidden'}`}>
        Target: ${target}M
        {phase >= 1 && (
          <span style={{ marginLeft: 8, color: state.lastBoxOffice >= target ? '#2ecc71' : '#e74c3c', fontWeight: 600 }}>
            {state.lastBoxOffice >= target ? '✓ HIT' : '✗ MISSED'}
          </span>
        )}
      </div>

      {/* TIER BANNER */}
      {phase >= 1 && tierRevealed && (
        <div
          className={`tier-banner tier-${tier.toLowerCase()} tier-reveal-suspense ${tier === 'FLOP' ? 'tier-flop-styled' : tier === 'HIT' ? 'tier-hit-styled' : tier === 'SMASH' ? 'tier-smash-styled' : tier === 'BLOCKBUSTER' ? 'tier-blockbuster-styled' : ''}`}
          style={{ background: config.bg, borderColor: config.color }}
          aria-live="assertive"
          role="status"
        >
          {tier === 'BLOCKBUSTER' && (
            <div className="tier-blockbuster-sparkles" aria-hidden="true">
              {Array.from({ length: 10 }, (_, i) => <span key={i} className="sparkle" />)}
            </div>
          )}
          <div className="tier-emoji" aria-hidden="true">{config.emoji}</div>
          <div className="tier-label" style={{ color: config.color }}>{config.label}</div>
          <div className="tier-subtitle">{config.subtitle}</div>
        </div>
      )}

      {/* Critic quote */}
      {phase >= 1 && criticQuote && (
        <div className="animate-slide-down" ref={el => { if (el && !el.dataset.sounded) { el.dataset.sounded = '1'; sfx.criticRevealSwoosh(); setTimeout(() => { if (lastResult && lastResult.tier !== 'FLOP') { sfx.freshTomatoSplat(); if (lastResult.tier === 'BLOCKBUSTER') setTimeout(() => sfx.criticConsensusFanfare(), 300); } else sfx.rottenSquish(); }, 300); } }} style={{
          marginTop: 12,
          padding: '10px 16px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.06)',
          fontStyle: 'italic',
          fontSize: '0.8rem',
          color: '#aaa',
          lineHeight: 1.5,
          maxWidth: 400,
          margin: '12px auto 0',
        }}>
          {criticQuote}
        </div>
      )}

      {/* R179: Soundtrack card */}
      {phase >= 1 && state.postProdSoundtrack && (
        <div className="animate-slide-down" ref={el => { if (el && !el.dataset.sounded) { el.dataset.sounded = '1'; sfx.soundtrackQualityReveal(state.postProdSoundtrack!.qualityRating || 3); } }} style={{
          marginTop: 12,
          padding: '10px 16px',
          background: 'rgba(230, 126, 34, 0.08)',
          borderRadius: 8,
          border: '1px solid rgba(230, 126, 34, 0.25)',
          maxWidth: 400,
          margin: '12px auto 0',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 4 }}>🎵 SOUNDTRACK</div>
          <div style={{ color: '#e67e22', fontWeight: 700, fontSize: '0.9rem' }}>
            {state.postProdSoundtrack.composerName}
          </div>
          <div style={{ color: '#aaa', fontSize: '0.75rem', fontStyle: 'italic', marginBottom: 4 }}>
            {state.postProdSoundtrack.style}
          </div>
          <div style={{ fontSize: '0.85rem', letterSpacing: 2 }}>
            {formatSoundtrackRating(state.postProdSoundtrack.qualityRating)}
          </div>
          {state.postProdSoundtrack.qualityBonus > 0 && (
            <div style={{ color: '#2ecc71', fontSize: '0.75rem', marginTop: 2 }}>
              +{state.postProdSoundtrack.qualityBonus} quality from soundtrack
            </div>
          )}
        </div>
      )}

      {/* R185: Audience Reactions — tweet cards */}
      {phase >= 2 && state.lastAudienceReaction && (() => {
        const ar: AudienceReaction = state.lastAudienceReaction;
        return (
          <div className="animate-slide-down" ref={el => { if (el && !el.dataset.sounded) { el.dataset.sounded = '1'; if (ar.audienceScore >= 70) sfx.audienceCheer(); else if (ar.audienceScore < 40) sfx.audienceBoo(); if (ar.buzz.level === 'extreme' || ar.buzz.level === 'high') setTimeout(() => sfx.buzzBuilding(), 300); if (ar.viralEvent) setTimeout(() => sfx.viralMoment(), 600); } }} style={{ marginTop: 16, maxWidth: 420, margin: '16px auto 0' }}>
            {/* Buzz & Audience Score header */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{
                background: 'rgba(52,152,219,0.1)', border: '1px solid rgba(52,152,219,0.3)',
                borderRadius: 8, padding: '8px 14px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '0.65rem', color: '#888', letterSpacing: 1 }}>AUDIENCE SCORE</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: ar.audienceScore >= 70 ? '#2ecc71' : ar.audienceScore >= 40 ? '#f39c12' : '#e74c3c' }}>
                  {ar.audienceScore}%
                </div>
              </div>
              <div style={{
                background: ar.buzz.level === 'extreme' ? 'rgba(231,76,60,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${ar.buzz.level === 'extreme' ? 'rgba(231,76,60,0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 8, padding: '8px 14px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '0.65rem', color: '#888', letterSpacing: 1 }}>PRE-RELEASE BUZZ</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: ar.buzz.level === 'extreme' ? '#e74c3c' : ar.buzz.level === 'high' ? '#f39c12' : '#aaa' }}>
                  {ar.buzz.label}
                </div>
                {ar.buzz.multiplier > 1.0 && (
                  <div style={{ fontSize: '0.7rem', color: '#2ecc71' }}>×{ar.buzz.multiplier.toFixed(2)} opening weekend</div>
                )}
              </div>
            </div>

            {/* Viral event banner */}
            {ar.viralEvent && (
              <div style={{
                background: ar.viralEvent.type === 'meme_boost' ? 'rgba(46,204,113,0.12)' : 'rgba(231,76,60,0.12)',
                border: `2px solid ${ar.viralEvent.type === 'meme_boost' ? '#2ecc71' : '#e74c3c'}`,
                borderRadius: 10, padding: '10px 14px', marginBottom: 12, textAlign: 'center',
              }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: ar.viralEvent.type === 'meme_boost' ? '#2ecc71' : '#e74c3c' }}>
                  {ar.viralEvent.label}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#ccc' }}>{ar.viralEvent.description}</div>
                <div style={{ fontSize: '0.75rem', color: ar.viralEvent.boxOfficeModifier > 0 ? '#2ecc71' : '#e74c3c', marginTop: 4 }}>
                  {ar.viralEvent.boxOfficeModifier > 0 ? '+' : ''}{ar.viralEvent.boxOfficeModifier}M box office
                </div>
              </div>
            )}

            {/* Tweet cards */}
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '0.8rem', color: '#888', marginBottom: 6, letterSpacing: 1 }}>
              📱 SOCIAL MEDIA REACTIONS
            </div>
            {ar.tweets.map((tweet, i) => (
              <div key={i} className="animate-slide-down" style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${tweet.sentiment === 'positive' ? 'rgba(46,204,113,0.2)' : tweet.sentiment === 'negative' ? 'rgba(231,76,60,0.2)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 10, padding: '10px 12px', marginBottom: 6,
                animationDelay: `${i * 0.15}s`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: '1.3rem' }}>{tweet.avatar}</span>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ddd' }}>{tweet.displayName}</div>
                    <div style={{ fontSize: '0.7rem', color: '#666' }}>{tweet.handle}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#bbb', lineHeight: 1.45, marginBottom: 6 }}>
                  {tweet.text}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: '0.7rem', color: '#555' }}>
                  <span>🔁 {tweet.retweets}</span>
                  <span>❤️ {tweet.likes}</span>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

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
        <div className="nomination-banner animate-slide-down" style={{ marginTop: 12 }}
          ref={el => { if (el && !el.dataset.sounded) { el.dataset.sounded = '1'; sfx.nomination(); } }}>
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
                {soundtrackBonus > 0 && <div className="qs-row positive"><span>🎵 Soundtrack</span><span>+{soundtrackBonus}</span></div>}
                <div className="qs-row total"><span>Total</span><span>{rawQuality}</span></div>
              </div>

              {/* Market info */}
              <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#999' }}>
                Market: {state.activeMarket?.name}
              </div>

              {/* Cast credits */}
              <div className="cast-summary" style={{ marginTop: 12 }}>
                {state.castSlots.map((slot, i) => slot.talent && (
                  <div key={i} className="cast-credit">
                    <span style={{ color: '#999' }}>{slot.slotType}: </span>
                    <span style={{ color: '#d4a843' }}>{slot.talent.name}</span>
                    <span style={{ color: '#999' }}> (S{slot.talent.skill}/H{slot.talent.heat})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Post-Film Production Summary */}
      {phase >= 2 && <PostFilmSummary state={state} />}

      {/* Rival rankings — merged from SeasonRecapScreen */}
      {phase >= 3 && rivalFilms.length > 0 && (
        <div className="animate-slide-down" style={{ marginTop: 24 }}>
          <MechanicTip id="rivals" />
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
            {studioHeadline && (
              <div style={{ fontSize: '0.8rem', color: '#999', marginTop: 6, fontStyle: 'italic' }}>
                📰 {studioHeadline}
              </div>
            )}
          </div>

          {/* Season narrative */}
          {lastResult && (
            <div style={{
              fontSize: '0.85rem',
              color: '#ccc',
              marginBottom: 12,
              textAlign: 'center',
            }}>
              {getSeasonNarrative(lastResult.boxOffice, lastResult.tier, rivalFilms)}
            </div>
          )}

          {/* Box office rankings */}
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '0.9rem', color: '#888', marginBottom: 8, letterSpacing: 1 }}>
            📊 WEEKEND BOX OFFICE
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
                <div style={{ color: '#999', fontSize: '0.7rem' }}>
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

      {/* Cumulative Leaderboard */}
      {phase >= 3 && state.seasonHistory.length > 0 && (
        <div className="animate-slide-down" style={{ marginTop: 20 }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '0.9rem', color: '#888', marginBottom: 4, letterSpacing: 1 }}>
            🏆 STUDIO STANDINGS
          </div>
          {(() => {
            const rivalTotals = Object.values(state.cumulativeRivalEarnings);
            const rivalAvg = rivalTotals.length > 0 ? rivalTotals.reduce((a, b) => a + b, 0) / rivalTotals.length : 0;
            const rb = calculateRubberBand(state.totalEarnings, rivalAvg);
            return rb.label !== 'neutral' ? (
              <div style={{ fontSize: '0.7rem', color: rb.label === 'competitive' ? '#e74c3c' : rb.label === 'yourLead' ? '#d4a843' : '#2ecc71', marginBottom: 8, textAlign: 'center', fontStyle: 'italic' }}>
                {rb.flavorText}
              </div>
            ) : null;
          })()}
          {getRivalryLeaderboard(state).map((entry, i) => (
            <div key={entry.name} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', marginBottom: 3, borderRadius: 6,
              background: entry.isPlayer ? 'rgba(212,168,67,0.12)' : 'rgba(255,255,255,0.03)',
              border: entry.isPlayer ? '1px solid rgba(212,168,67,0.3)' : '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: i === 0 ? '#ffd700' : '#666', width: 22 }}>#{i + 1}</span>
              <span style={{ fontSize: '1rem' }}>{entry.emoji}</span>
              <div style={{ flex: 1 }}>
                <div>
                  <span style={{ color: entry.isPlayer ? '#d4a843' : '#ccc', fontSize: '0.85rem', fontWeight: entry.isPlayer ? 'bold' : 'normal' }}>
                    {entry.name}
                  </span>
                  {entry.personality && (
                    <span style={{ color: '#999', fontSize: '0.65rem', marginLeft: 6 }}>
                      {entry.personality === 'aggressive' ? '🔥' : entry.personality === 'steady' ? '📊' : '🎪'}
                    </span>
                  )}
                </div>
                {entry.strategyLabel && (
                  <div style={{ fontSize: '0.6rem', color: '#999', marginTop: 1 }}>{entry.strategyLabel}</div>
                )}
                {entry.latestFilm && (
                  <div style={{ fontSize: '0.65rem', color: '#999', marginTop: 1 }}>
                    Latest: <em>{entry.latestFilm.title}</em> ({entry.latestFilm.genre}) — {TIER_EMOJI[entry.latestFilm.tier]} ${entry.latestFilm.boxOffice.toFixed(1)}M
                  </div>
                )}
              </div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: i === 0 ? '#ffd700' : '#aaa' }}>
                ${entry.totalEarnings.toFixed(1)}M
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rival Commentary */}
      {phase >= 3 && state.seasonHistory.length > 0 && (
        <div className="animate-slide-down" style={{ marginTop: 16 }}>
          {generateRivalCommentary(state).map((c, i) => (
            <div key={i} style={{
              padding: '8px 12px', marginBottom: 6, borderRadius: 8,
              background: c.isNemesis ? 'rgba(231,76,60,0.08)' : 'rgba(255,255,255,0.03)',
              border: c.isNemesis ? '1px solid rgba(231,76,60,0.2)' : '1px solid rgba(255,255,255,0.06)',
              fontSize: '0.78rem', color: '#bbb', fontStyle: 'italic',
            }}>
              <span style={{ fontStyle: 'normal', fontWeight: 600, color: c.isNemesis ? '#e74c3c' : c.personality === 'aggressive' ? '#e74c3c' : c.personality === 'steady' ? '#3498db' : '#2ecc71' }}>
                {c.studioEmoji} {c.studioName}{c.isNemesis ? ' ⚔️' : ''}:
              </span>{' '}
              "{c.comment}"
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

      {/* R106: Completion Bond notification */}
      {phase >= 2 && tier === 'FLOP' && state.completionBond && (
        <div className="animate-slide-down" style={{
          background: 'rgba(46,204,113,0.1)',
          border: '2px solid #2ecc71',
          borderRadius: 12,
          padding: 12,
          marginTop: 12,
          textAlign: 'center',
        }}>
          <span style={{ fontSize: '1.1rem' }}>🛡️ COMPLETION BOND ACTIVATED!</span>
          <div style={{ color: '#2ecc71', fontSize: '0.85rem', marginTop: 4 }}>
            Your insurance upgraded this FLOP to a MISS — no strike added! Bond consumed.
          </div>
        </div>
      )}

      {/* R106: Extended Cut option — HIT or better */}
      {phase >= 3 && state.extendedCutAvailable && !state.extendedCutUsed && tier !== 'FLOP' && state.season < state.maxSeasons && state.budget >= 3 && (
        <div className="animate-slide-down" style={{
          background: 'rgba(155,89,182,0.1)',
          border: '2px solid #9b59b6',
          borderRadius: 12,
          padding: 16,
          marginTop: 16,
          textAlign: 'center',
        }}>
          <h3 style={{ color: '#9b59b6', marginBottom: 8, fontSize: '1rem' }}>🎬 EXTENDED CUT ($3M)</h3>
          <MechanicTip id="extendedCut" />
          <p style={{ color: '#ccc', fontSize: '0.85rem', marginBottom: 4 }}>
            Release a Director's Extended Cut for <strong style={{ color: '#d4a843' }}>30-50%</strong> of the original ${state.lastBoxOffice.toFixed(1)}M box office.
          </p>
          <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: 4 }}>
            Estimated: <strong style={{ color: '#2ecc71' }}>${(state.lastBoxOffice * 0.3).toFixed(1)}M – ${(state.lastBoxOffice * 0.5).toFixed(1)}M</strong>
          </p>
          <p style={{ color: '#e74c3c', fontSize: '0.75rem', marginBottom: 12 }}>
            ⚠️ This uses your next film slot — you'll skip Season {state.season + 1}'s production.
            {state.season + 1 >= state.maxSeasons && <strong> That's your FINAL season!</strong>}
          </p>
          <div className="post-prod-actions" style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => { sfx.extendedCut(); doExtendedCut(); }}>
              🎬 EXTENDED CUT ($3M)
            </button>
            <button className="btn" onClick={() => { sfx.click(); declineExtendedCut(); }}>
              Skip — make a new film
            </button>
          </div>
        </div>
      )}

      {/* Extended Cut result */}
      {state.extendedCutUsed && (
        <div className="animate-slide-down" style={{
          background: 'rgba(46,204,113,0.1)',
          border: '2px solid #2ecc71',
          borderRadius: 12,
          padding: 12,
          marginTop: 12,
          textAlign: 'center',
        }}>
          <span style={{ fontSize: '1.1rem' }}>🎬 Extended Cut Released!</span>
          <div style={{ color: '#2ecc71', fontSize: '0.85rem', marginTop: 4 }}>
            Season {state.season} film slot used for the extended run.
          </div>
        </div>
      )}

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
