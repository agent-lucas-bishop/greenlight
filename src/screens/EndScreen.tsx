import { useState, useEffect, useMemo, useCallback } from 'react';
import { GameState, SeasonResult, RewardTier } from '../types';
import { startGame } from '../gameStore';
import { recordRunEnd, getActiveLegacyPerks, getEndingForRank, recordEndingDiscovered, getEndingsDiscovered, ENDINGS } from '../unlocks';
import { sfx } from '../sound';
import { addLeaderboardEntry } from '../leaderboard';
import { updateHallOfFame, getHallOfFame } from '../hallOfFame';
import { getRunStats, getMilestoneProgress } from '../unlocks';
import { getChallengeById } from '../challenges';
import { markFirstRunComplete } from '../onboarding';
import { getModifierById } from '../dailyModifiers';
import { getSeedLeaderboard } from '../leaderboard';
import { getWeeklyDateString } from '../seededRng';

// ─── Helpers ───

const TIER_EMOJI: Record<RewardTier, string> = {
  BLOCKBUSTER: '🟩',
  SMASH: '🟨',
  HIT: '🟧',
  FLOP: '🟥',
};

const TIER_LABEL: Record<RewardTier, string> = {
  BLOCKBUSTER: 'Blockbuster',
  SMASH: 'Smash',
  HIT: 'Hit',
  FLOP: 'Flop',
};

const TIER_COLOR: Record<RewardTier, string> = {
  BLOCKBUSTER: '#2ecc71',
  SMASH: '#f1c40f',
  HIT: '#e67e22',
  FLOP: '#e74c3c',
};

function tierEmoji(tier: RewardTier, isDisaster: boolean) {
  return isDisaster ? '💀' : TIER_EMOJI[tier];
}

// ─── Procedural Career Summary ───

function generateCareerSummary(state: GameState, isVictory: boolean, score: number, rank: string): string {
  const h = state.seasonHistory;
  const studioName = state.studioName || 'Your Studio';

  // Genre stats
  const genreCounts: Record<string, number> = {};
  h.forEach(s => { genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1; });
  const favoriteGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'various';
  const genreCount = Object.keys(genreCounts).length;

  // Best/worst
  const best = h.reduce((a, b) => a.boxOffice > b.boxOffice ? a : b, h[0]);
  const worst = h.reduce((a, b) => a.boxOffice < b.boxOffice ? a : b, h[0]);
  const blockbusters = h.filter(s => s.tier === 'BLOCKBUSTER').length;
  const flops = h.filter(s => s.tier === 'FLOP').length;
  const nominations = h.filter(s => s.nominated).length;

  // Build paragraphs
  const parts: string[] = [];

  // Opening
  if (isVictory && rank === 'S') {
    parts.push(`${studioName} didn't just survive Hollywood — it conquered it.`);
  } else if (isVictory) {
    parts.push(`Against all odds, ${studioName} carved out a name in the industry.`);
  } else if (flops >= 3) {
    parts.push(`${studioName}'s story is a cautionary tale of ambition outpacing talent.`);
  } else {
    parts.push(`${studioName} burned bright but brief, leaving behind an unfinished legacy.`);
  }

  // Genre identity
  if (genreCount === 1) {
    parts.push(`The studio was a pure ${favoriteGenre} house, never straying from its lane.`);
  } else if (genreCounts[favoriteGenre] >= 3) {
    parts.push(`Known primarily for ${favoriteGenre.toLowerCase()}, the studio built a reputation on the genre.`);
  } else if (genreCount >= 5) {
    parts.push(`A remarkably versatile studio, it dabbled in everything from ${Object.keys(genreCounts).slice(0, 3).join(' to ')}.`);
  }

  // Crown jewel
  if (best) {
    parts.push(`"${best.title}" ($${best.boxOffice.toFixed(1)}M) was the crown jewel — a ${TIER_LABEL[best.tier].toLowerCase()} that ${best.tier === 'BLOCKBUSTER' ? 'defined an era' : 'turned heads'}.`);
  }

  // Lowlight
  if (worst && worst !== best && (worst.tier === 'FLOP' || worst.boxOffice < 10)) {
    parts.push(`But "${worst.title}" ($${worst.boxOffice.toFixed(1)}M) is one the studio would rather forget.`);
  }

  // Box office power
  if (state.totalEarnings > 100) {
    parts.push(`With $${state.totalEarnings.toFixed(1)}M in total box office, ${studioName} was a genuine money-making machine.`);
  } else if (state.totalEarnings > 50) {
    parts.push(`$${state.totalEarnings.toFixed(1)}M in career earnings — respectable, if not legendary.`);
  }

  // Awards
  if (nominations >= 3) {
    parts.push(`A darling of the awards circuit with ${nominations} nominations.`);
  } else if (blockbusters >= 2) {
    parts.push(`${blockbusters} blockbusters cemented its commercial dominance.`);
  }

  // Closing
  if (isVictory) {
    parts.push(`The lights dim, but the legacy endures. ★`);
  } else {
    parts.push(`The marquee goes dark. Maybe next time.`);
  }

  return parts.join(' ');
}

// ─── Share Text ───

function generateShareText(state: GameState, score: number, rank: string, isVictory: boolean): string {
  const h = state.seasonHistory;
  const grid = h.map(s => {
    const isDisaster = s.quality <= 0;
    return tierEmoji(s.tier, isDisaster);
  }).join('');

  const lines = [
    `🎬 GREENLIGHT ${isVictory ? '🏆' : '💀'}`,
    `${state.studioName || 'Studio'} · ${h.length} seasons`,
    grid,
    `Score: ${score} (${rank}) · $${state.totalEarnings.toFixed(1)}M`,
    `greenlight-plum.vercel.app`,
  ];
  return lines.join('\n');
}

// ─── Particles ───

function VictoryParticles() {
  const particles = useMemo(() => {
    const emojis = ['🌟', '⭐', '🏆', '🎬', '✨', '🎭', '🎥', '💫'];
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      emoji: emojis[i % emojis.length],
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 4,
      size: 0.8 + Math.random() * 1.2,
    }));
  }, []);

  return (
    <div className="victory-particles">
      {particles.map(p => (
        <div key={p.id} className="particle" style={{
          left: `${p.left}%`,
          animationDelay: `${p.delay}s`,
          animationDuration: `${p.duration}s`,
          fontSize: `${p.size}rem`,
        }}>{p.emoji}</div>
      ))}
    </div>
  );
}

// ─── Achievements ───

function getAchievements(state: GameState): { icon: string; name: string; desc: string }[] {
  const a: { icon: string; name: string; desc: string }[] = [];
  const history = state.seasonHistory;

  if (history.length >= 5 && history.every(h => h.hitTarget)) a.push({ icon: '🏆', name: 'Perfect Run', desc: 'Hit every target' });
  if (history.some(h => h.tier === 'BLOCKBUSTER')) a.push({ icon: '💎', name: 'Blockbuster Baby', desc: 'Made a Blockbuster' });
  if (history.filter(h => h.nominated).length >= 3) a.push({ icon: '🎭', name: 'Awards Darling', desc: '3+ nominations' });
  if (state.totalEarnings > 500) a.push({ icon: '💰', name: 'Money Machine', desc: '$500M+ total earnings' });
  if (history.some(h => h.quality >= 40)) a.push({ icon: '⭐', name: 'Masterpiece', desc: 'Quality 40+ on a film' });
  if (state.gameMode === 'newGamePlus' && history.length >= 5 && history.every(h => h.hitTarget)) a.push({ icon: '🌟', name: 'NG+ Perfect', desc: 'Perfect run on New Game+' });
  if (state.gameMode === 'directorMode' && history.length >= 5 && history.every(h => h.hitTarget)) a.push({ icon: '💎', name: "Director's Vision", desc: 'Perfect run on Director Mode' });

  const genres = new Set(history.map(h => h.genre));
  if (genres.size >= 4) a.push({ icon: '🌈', name: 'Renaissance Studio', desc: 'Made 4+ different genres' });

  const genreCounts: Record<string, number> = {};
  history.forEach(h => { genreCounts[h.genre] = (genreCounts[h.genre] || 0) + 1; });
  if (Object.values(genreCounts).some(c => c >= 3)) a.push({ icon: '🎯', name: 'Genre Specialist', desc: 'Made 3+ films in one genre' });

  if (history.length >= 2 && history.slice(-2).every(h => h.tier === 'FLOP')) a.push({ icon: '💀', name: 'Death Spiral', desc: '2 flops in a row' });
  if (state.reputation >= 5) a.push({ icon: '👑', name: 'A-List Studio', desc: 'Reached max reputation' });

  return a;
}

// ─── Main Component ───

export default function EndScreen({ state, type }: { state: GameState; type: 'gameover' | 'victory' }) {
  const isVictory = type === 'victory';
  const challenge = state.challengeId ? getChallengeById(state.challengeId) : undefined;
  const challengeMultiplier = challenge?.scoreMultiplier || 1.0;
  const baseScore = Math.round(state.totalEarnings * state.reputation * (1 + state.seasonHistory.filter(s => s.nominated).length * 0.2));
  const score = Math.round(baseScore * challengeMultiplier);
  const rank = score > 800 ? 'S' : score > 500 ? 'A' : score > 300 ? 'B' : score > 150 ? 'C' : 'D';
  const achievements = getAchievements(state);
  const history = state.seasonHistory;

  const [phase, setPhase] = useState(0); // 0=title, 1=summary, 2=stats, 3=filmography, 4=achievements, 5=share
  const [copied, setCopied] = useState(false);
  const [dailyCopied, setDailyCopied] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [newPerks, setNewPerks] = useState<{ id: string; name: string; emoji: string; description: string }[]>([]);
  const [newHofRecords, setNewHofRecords] = useState<string[]>([]);
  const [expandedFilm, setExpandedFilm] = useState<number | null>(null);
  const ending = getEndingForRank(rank, isVictory);
  const endingsFound = getEndingsDiscovered();

  // Career stats
  const totalBO = state.totalEarnings;
  const bestFilm = history.length > 0 ? history.reduce((a, b) => a.boxOffice > b.boxOffice ? a : b) : null;
  const worstFilm = history.length > 0 ? history.reduce((a, b) => a.boxOffice < b.boxOffice ? a : b) : null;
  const genreCounts: Record<string, number> = {};
  history.forEach(s => { genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1; });
  const favGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  const nominations = history.filter(s => s.nominated).length;
  const blockbusters = history.filter(s => s.tier === 'BLOCKBUSTER').length;

  const careerSummary = useMemo(() => generateCareerSummary(state, isVictory, score, rank), []);
  const shareText = useMemo(() => generateShareText(state, score, rank, isVictory), []);

  useEffect(() => {
    if (isVictory) sfx.victory(); else sfx.gameOver();
    // Stagger reveals
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 3000),
      setTimeout(() => setPhase(5), 3600),
    ];
    if (!recorded) {
      const beforePerks = getActiveLegacyPerks().map(p => p.id);
      const lastProd = state.production;
      let dominantTag: string | undefined;
      if (lastProd?.tagsPlayed) {
        const entries = Object.entries(lastProd.tagsPlayed);
        if (entries.length > 0) {
          const total = entries.reduce((s, [, c]) => s + c, 0);
          const [topTag, topCount] = entries.reduce((best, curr) => curr[1] > best[1] ? curr : best);
          if (topCount / total >= 0.5) dominantTag = topTag;
        }
      }
      const seasonData = history.map(s => ({ genre: s.genre, tier: s.tier, quality: s.quality, hitTarget: s.hitTarget }));
      recordRunEnd(isVictory, score, achievements.map(a => a.name), state.gameMode, seasonData, dominantTag, {
        totalEarnings: state.totalEarnings,
        rank,
        archetype: state.studioArchetype || undefined,
        challengeId: state.challengeId,
        dailySeed: state.dailySeed,
        weeklySeed: state.gameMode === 'weekly' ? getWeeklyDateString() : undefined,
      });
      const afterPerks = getActiveLegacyPerks();
      const newlyUnlocked = afterPerks.filter(p => !beforePerks.includes(p.id));
      if (newlyUnlocked.length > 0) setNewPerks(newlyUnlocked);
      // Build rich film data with cast/director info
      const richFilms = history.map(s => {
        const castNames = state.castSlots
          .filter(slot => slot.talent && slot.talent.type !== 'Director')
          .map(slot => slot.talent!.name);
        const director = state.castSlots
          .find(slot => slot.talent?.type === 'Director')?.talent?.name;
        return {
          title: s.title,
          genre: s.genre,
          tier: s.tier,
          quality: s.quality,
          boxOffice: s.boxOffice,
          season: s.season,
          cast: castNames,
          director,
          nominated: s.nominated,
        };
      });
      addLeaderboardEntry({
        date: new Date().toISOString().slice(0, 10),
        score,
        rank,
        seasons: history.length,
        earnings: state.totalEarnings,
        reputation: state.reputation,
        mode: state.gameMode,
        challenge: state.challengeId,
        archetype: state.studioArchetype || 'unknown',
        films: richFilms,
        won: isVictory,
        dailySeed: state.dailySeed,
        studioName: state.studioName || undefined,
      });
      // Update Hall of Fame
      const hofRecords = updateHallOfFame({
        studioName: state.studioName || 'Unknown Studio',
        date: new Date().toISOString().slice(0, 10),
        rank,
        score,
        seasons: history.length,
        totalGross: state.totalEarnings,
        films: history.map(s => ({ title: s.title, genre: s.genre, quality: s.quality, boxOffice: s.boxOffice, tier: s.tier })),
      });
      if (hofRecords.length > 0) setNewHofRecords(hofRecords);
      recordEndingDiscovered(ending.id);
      markFirstRunComplete();
      setRecorded(true);
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareText]);

  const dailyModifier = state.dailyModifierId ? getModifierById(state.dailyModifierId) : null;
  const dailyShareText = useMemo(() => {
    if (!state.dailySeed || !dailyModifier) return '';
    const h = state.seasonHistory;
    const grid = h.map(s => tierEmoji(s.tier, s.quality <= 0)).join('');
    return [
      `🎬 GREENLIGHT Daily ${state.dailySeed}`,
      `${dailyModifier.emoji} ${dailyModifier.name}`,
      grid,
      `Score: ${score} (${rank}) · $${state.totalEarnings.toFixed(1)}M`,
      `greenlight-plum.vercel.app`,
    ].join('\n');
  }, [state.dailySeed, dailyModifier, score, rank]);

  const handleDailyCopy = useCallback(() => {
    navigator.clipboard.writeText(dailyShareText).then(() => {
      setDailyCopied(true);
      setTimeout(() => setDailyCopied(false), 2000);
    });
  }, [dailyShareText]);

  const rankColors: Record<string, string> = { S: '#ff6b6b', A: '#ffd93d', B: '#6bcb77', C: '#5dade2', D: '#999' };

  return (
    <div className="end-screen fade-in" style={{ paddingBottom: 60 }}>
      {isVictory && <VictoryParticles />}

      {/* ─── ENDING TITLE ─── */}
      <div style={{ marginBottom: 8 }}>
        {state.studioName && (
          <div style={{ fontSize: 'clamp(0.8rem, 2vw, 1rem)', color: '#888', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
            {state.studioName}
          </div>
        )}
        <div style={{ fontSize: '2.5rem', marginBottom: 4 }}>{ending.emoji}</div>
        <h2 style={{ color: ending.color, margin: 0, letterSpacing: 2 }} className={isVictory ? 'end-title-victory' : 'end-title-gameover'}>
          {ending.title}
        </h2>
        <div style={{ color: ending.color, opacity: 0.7, fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', fontStyle: 'italic', marginTop: 4 }}>
          {ending.subtitle}
        </div>
      </div>

      {state.gameMode !== 'normal' && (
        <div style={{ marginBottom: 4, fontSize: '0.85rem', color: state.gameMode === 'directorMode' ? '#e74c3c' : 'var(--gold)' }}>
          {state.gameMode === 'newGamePlus' ? '⭐ New Game+' : state.gameMode === 'directorMode' ? '🔥 Director Mode' : state.gameMode === 'daily' ? '📅 Daily Run' : state.gameMode === 'weekly' ? '📆 Weekly Challenge' : state.gameMode === 'seeded' ? `🌱 Seed: ${state.customSeed}` : ''}
        </div>
      )}
      {challenge && (
        <div style={{ marginBottom: 4, fontSize: '0.85rem', color: '#e67e22' }}>
          {challenge.emoji} {challenge.name} Challenge (×{challenge.scoreMultiplier} score)
        </div>
      )}
      {dailyModifier && (
        <div style={{ marginBottom: 4, fontSize: '0.85rem', color: '#3498db' }}>
          {dailyModifier.emoji} {dailyModifier.name} — {dailyModifier.shortDesc}
        </div>
      )}

      {/* ─── RANK ─── */}
      <div className="rank-display score-reveal" style={{ color: rankColors[rank] || '#d4a843', margin: '12px 0' }}>
        RANK: {rank}
      </div>

      {/* ─── ENDING FLAVOR TEXT ─── */}
      {phase >= 1 && (
        <div className="animate-slide-down" style={{
          background: `${ending.color}08`,
          border: `1px solid ${ending.color}33`,
          borderRadius: 12,
          padding: '16px 20px',
          margin: '16px auto',
          maxWidth: 520,
          fontStyle: 'italic',
          color: '#ccc',
          fontSize: 'clamp(0.8rem, 2.2vw, 0.95rem)',
          lineHeight: 1.6,
        }}>
          {ending.flavorText}
        </div>
      )}

      {/* ─── CAREER SUMMARY ─── */}
      {phase >= 1 && (
        <div className="animate-slide-down" style={{
          background: 'rgba(212,168,67,0.06)',
          border: '1px solid rgba(212,168,67,0.2)',
          borderRadius: 12,
          padding: '16px 20px',
          margin: '8px auto',
          maxWidth: 520,
          color: '#999',
          fontSize: 'clamp(0.75rem, 2vw, 0.85rem)',
          lineHeight: 1.5,
        }}>
          {careerSummary}
        </div>
      )}

      {/* ─── CAREER STATS ─── */}
      {phase >= 2 && (
        <div className="end-stats animate-slide-down">
          <div className="end-stat">
            <div className="label">Total Box Office</div>
            <div className="value">${totalBO.toFixed(1)}M</div>
          </div>
          <div className="end-stat">
            <div className="label">Films Made</div>
            <div className="value">{history.length}</div>
          </div>
          <div className="end-stat">
            <div className="label">Score</div>
            <div className="value">{score}</div>
          </div>
          <div className="end-stat">
            <div className="label">Final Rep</div>
            <div className="value">{'★'.repeat(state.reputation)}{'☆'.repeat(5 - state.reputation)}</div>
          </div>
          <div className="end-stat">
            <div className="label">Blockbusters</div>
            <div className="value" style={{ color: '#2ecc71' }}>{blockbusters}</div>
          </div>
          <div className="end-stat">
            <div className="label">Nominations</div>
            <div className="value">{nominations}</div>
          </div>
          <div className="end-stat">
            <div className="label">Favorite Genre</div>
            <div className="value" style={{ fontSize: '0.9rem' }}>{favGenre}</div>
          </div>
          {bestFilm && (
            <div className="end-stat" style={{ gridColumn: 'span 2' }}>
              <div className="label">Best Film</div>
              <div className="value" style={{ fontSize: '0.85rem' }}>"{bestFilm.title}" (${bestFilm.boxOffice.toFixed(1)}M)</div>
            </div>
          )}
        </div>
      )}

      {/* ─── FILMOGRAPHY ─── */}
      {phase >= 3 && (
        <div style={{ marginTop: 28 }} className="animate-slide-down">
          <h3 style={{ color: '#d4a843', marginBottom: 12, letterSpacing: 1 }}>📜 FILMOGRAPHY</h3>
          <p style={{ color: '#666', fontSize: '0.7rem', marginBottom: 8 }}>Tap a film for details</p>
          <div style={{ maxWidth: 540, margin: '0 auto' }}>
            {history.map((r, i) => {
              const isExpanded = expandedFilm === i;
              const castNames = state.castSlots
                .filter(slot => slot.talent && slot.talent.type !== 'Director')
                .map(slot => slot.talent!.name);
              const director = state.castSlots
                .find(slot => slot.talent?.type === 'Director')?.talent?.name;
              return (
                <div key={i}>
                  <div className="filmography-row" onClick={() => setExpandedFilm(isExpanded ? null : i)} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderBottom: isExpanded ? 'none' : '1px solid rgba(255,255,255,0.06)',
                    flexWrap: 'wrap',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    background: isExpanded ? 'rgba(212,168,67,0.06)' : 'transparent',
                    borderRadius: isExpanded ? '8px 8px 0 0' : 0,
                  }}>
                    <span style={{ color: '#666', fontFamily: 'Bebas Neue', fontSize: '0.9rem', width: 28 }}>S{r.season}</span>
                    <span style={{ color: TIER_COLOR[r.tier], fontSize: '1.1rem' }}>{tierEmoji(r.tier, r.quality <= 0)}</span>
                    <span style={{ flex: 1, minWidth: 100, color: '#eee', fontWeight: 600, fontSize: 'clamp(0.8rem, 2vw, 0.95rem)' }}>{r.title}</span>
                    <span className="card-stat blue" style={{ fontSize: '0.75rem' }}>{r.genre}</span>
                    <span style={{
                      color: TIER_COLOR[r.tier],
                      fontFamily: 'Bebas Neue',
                      fontSize: '1rem',
                      minWidth: 55,
                      textAlign: 'right',
                    }}>
                      ${r.boxOffice.toFixed(1)}M
                    </span>
                    <span style={{ width: 18, textAlign: 'center' }}>
                      {r.nominated ? '🏆' : r.hitTarget ? <span style={{ color: '#2ecc71' }}>✓</span> : <span style={{ color: '#e74c3c' }}>✗</span>}
                    </span>
                  </div>
                  {isExpanded && (
                    <div style={{
                      background: 'rgba(212,168,67,0.04)',
                      border: '1px solid rgba(212,168,67,0.15)',
                      borderTop: 'none',
                      borderRadius: '0 0 8px 8px',
                      padding: '16px 20px',
                      marginBottom: 8,
                    }}>
                      {/* Movie poster / playbill style */}
                      <div style={{ textAlign: 'center', marginBottom: 12 }}>
                        <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 3, color: '#666', marginBottom: 4 }}>
                          Season {r.season} · {r.genre}
                        </div>
                        <div style={{ fontSize: '1.3rem', fontFamily: 'Bebas Neue', color: TIER_COLOR[r.tier], letterSpacing: 1 }}>
                          "{r.title}"
                        </div>
                        <div style={{
                          display: 'inline-block', marginTop: 6, padding: '2px 12px',
                          background: `${TIER_COLOR[r.tier]}20`, border: `1px solid ${TIER_COLOR[r.tier]}40`,
                          borderRadius: 4, color: TIER_COLOR[r.tier], fontFamily: 'Bebas Neue', fontSize: '0.85rem',
                        }}>
                          {TIER_LABEL[r.tier]} {r.nominated && '🏆 Nominated'}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.75rem' }}>
                        <div style={{ textAlign: 'center', padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 6 }}>
                          <div style={{ color: '#888', fontSize: '0.6rem', textTransform: 'uppercase' }}>Quality</div>
                          <div style={{ color: r.quality >= 30 ? '#2ecc71' : r.quality >= 15 ? '#f1c40f' : '#e74c3c', fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>{r.quality}</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 6 }}>
                          <div style={{ color: '#888', fontSize: '0.6rem', textTransform: 'uppercase' }}>Box Office</div>
                          <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>${r.boxOffice.toFixed(1)}M</div>
                        </div>
                      </div>
                      {director && (
                        <div style={{ marginTop: 10, textAlign: 'center', fontSize: '0.75rem' }}>
                          <span style={{ color: '#888' }}>Directed by </span>
                          <span style={{ color: '#ccc', fontWeight: 600 }}>{director}</span>
                        </div>
                      )}
                      {castNames.length > 0 && (
                        <div style={{ marginTop: 6, textAlign: 'center', fontSize: '0.7rem' }}>
                          <span style={{ color: '#888' }}>Starring </span>
                          <span style={{ color: '#aaa' }}>{castNames.join(' · ')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── ACHIEVEMENTS ─── */}
      {phase >= 4 && achievements.length > 0 && (
        <div style={{ marginTop: 24 }} className="animate-slide-down">
          <h3 style={{ color: '#d4a843', marginBottom: 12, letterSpacing: 1 }}>🏅 ACHIEVEMENTS</h3>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {achievements.map((a, i) => (
              <div key={i} style={{
                background: 'rgba(212,168,67,0.1)',
                border: '1px solid var(--gold-dim)',
                borderRadius: 8,
                padding: '8px 14px',
                textAlign: 'center',
                minWidth: 110,
              }}>
                <div style={{ fontSize: '1.4rem' }}>{a.icon}</div>
                <div style={{ color: '#d4a843', fontFamily: 'Bebas Neue', fontSize: '0.85rem' }}>{a.name}</div>
                <div style={{ color: '#888', fontSize: '0.65rem' }}>{a.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── LEGACY PERKS ─── */}
      {phase >= 4 && newPerks.length > 0 && (
        <div style={{ marginTop: 24 }} className="animate-slide-down">
          <h3 style={{ color: '#2ecc71', marginBottom: 12 }}>🔓 NEW LEGACY PERKS UNLOCKED!</h3>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {newPerks.map((p, i) => (
              <div key={i} style={{
                background: 'rgba(46,204,113,0.15)',
                border: '2px solid #2ecc71',
                borderRadius: 8,
                padding: '12px 16px',
                textAlign: 'center',
                minWidth: 130,
                animation: 'comboAppear 0.5s ease',
              }}>
                <div style={{ fontSize: '1.6rem' }}>{p.emoji}</div>
                <div style={{ color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '0.95rem' }}>{p.name}</div>
                <div style={{ color: '#aaa', fontSize: '0.7rem' }}>{p.description}</div>
              </div>
            ))}
          </div>
          <p style={{ color: '#888', fontSize: '0.75rem', marginTop: 8 }}>Legacy perks apply to all future runs!</p>
        </div>
      )}

      {/* ─── SEED LEADERBOARD ─── */}
      {phase >= 4 && state.dailySeed && (() => {
        const seedRuns = getSeedLeaderboard(state.dailySeed);
        if (seedRuns.length <= 1) return null;
        return (
          <div className="animate-slide-down" style={{ marginTop: 24 }}>
            <h3 style={{ color: '#3498db', marginBottom: 12, letterSpacing: 1 }}>🌱 SEED LEADERBOARD</h3>
            <p style={{ color: '#666', fontSize: '0.7rem', marginBottom: 8 }}>Your attempts on this seed</p>
            <div style={{ maxWidth: 400, margin: '0 auto' }}>
              {seedRuns.slice(0, 8).map((entry, i) => (
                <div key={entry.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                  background: entry.score === score ? 'rgba(52,152,219,0.1)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${entry.score === score ? '#3498db' : '#222'}`,
                  borderRadius: 6, marginBottom: 4,
                }}>
                  <span style={{ color: i < 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][i] : '#555', fontFamily: 'Bebas Neue', fontSize: '1rem', width: 24 }}>#{i + 1}</span>
                  <span style={{ flex: 1, color: '#ccc', fontSize: '0.8rem' }}>{entry.studioName || entry.archetype}</span>
                  <span style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.95rem' }}>{entry.score}pts</span>
                  <span style={{ color: entry.won ? '#2ecc71' : '#e74c3c', fontSize: '0.7rem' }}>{entry.won ? '✓' : '✗'}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ─── SHARE BLOCK ─── */}
      {phase >= 5 && (
        <div className="animate-slide-down" style={{ marginTop: 28 }}>
          <h3 style={{ color: '#d4a843', marginBottom: 10, letterSpacing: 1 }}>📋 SHARE YOUR RUN</h3>
          <div style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(212,168,67,0.3)',
            borderRadius: 10,
            padding: '14px 18px',
            maxWidth: 340,
            margin: '0 auto',
            fontFamily: 'monospace',
            fontSize: 'clamp(0.75rem, 2vw, 0.9rem)',
            lineHeight: 1.7,
            whiteSpace: 'pre-line',
            color: '#ddd',
            textAlign: 'left',
          }}>
            {shareText}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 10 }}>
            <button
              className="btn"
              onClick={handleCopy}
              style={{
                background: copied ? 'rgba(46,204,113,0.2)' : 'rgba(212,168,67,0.15)',
                border: `1px solid ${copied ? '#2ecc71' : 'var(--gold-dim)'}`,
                color: copied ? '#2ecc71' : '#d4a843',
                padding: '8px 24px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
            >
              {copied ? '✅ Copied!' : '📋 Copy to Clipboard'}
            </button>
            {state.dailySeed && dailyModifier && (
              <button
                className="btn"
                onClick={handleDailyCopy}
                style={{
                  background: dailyCopied ? 'rgba(46,204,113,0.2)' : 'rgba(52,152,219,0.15)',
                  border: `1px solid ${dailyCopied ? '#2ecc71' : '#3498db'}`,
                  color: dailyCopied ? '#2ecc71' : '#3498db',
                  padding: '8px 24px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
              >
                {dailyCopied ? '✅ Copied!' : `📅 Copy Daily Score`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── ENDINGS TRACKER ─── */}
      {phase >= 5 && (
        <div className="animate-slide-down" style={{ marginTop: 24 }}>
          <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: 8, letterSpacing: 1 }}>
            📖 ENDINGS DISCOVERED: {endingsFound.length}/{ENDINGS.length}
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {ENDINGS.map(e => {
              const found = endingsFound.includes(e.id);
              return (
                <div key={e.id} style={{
                  width: 36, height: 36,
                  borderRadius: 8,
                  background: found ? `${e.color}20` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${found ? e.color + '66' : '#333'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem',
                  opacity: found ? 1 : 0.3,
                }} title={found ? e.title : '???'}>
                  {found ? e.emoji : '❓'}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── NEW HALL OF FAME RECORDS ─── */}
      {phase >= 5 && newHofRecords.length > 0 && (
        <div className="animate-slide-down" style={{ marginTop: 24, textAlign: 'center' }}>
          <h3 style={{ color: '#ffd700', marginBottom: 8 }}>🏅 NEW RECORDS SET!</h3>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {newHofRecords.map((r, i) => (
              <span key={i} style={{
                background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.3)',
                borderRadius: 6, padding: '4px 12px', fontSize: '0.8rem', color: '#ffd700',
              }}>🏆 {r}</span>
            ))}
          </div>
        </div>
      )}

      {/* ─── ONE MORE RUN HOOK ─── */}
      {phase >= 5 && (() => {
        const runStats = getRunStats();
        const hof = getHallOfFame();
        const milestones = getMilestoneProgress();
        const nextMilestone = milestones.find(m => !m.unlocked);
        const hooks: string[] = [];

        if (hof.longestRunSeasons && hof.longestRunSeasons.value > history.length) {
          hooks.push(`Your best run lasted ${hof.longestRunSeasons.value} seasons. Can you beat it?`);
        } else if (history.length >= 5) {
          hooks.push(`You survived all 5 seasons! Can you get an S-rank next time?`);
        }

        if (hof.highestTotalGross && hof.highestTotalGross.value > state.totalEarnings) {
          hooks.push(`Your record gross is $${hof.highestTotalGross.value.toFixed(1)}M — just $${(hof.highestTotalGross.value - state.totalEarnings).toFixed(1)}M ahead.`);
        }

        if (nextMilestone) {
          hooks.push(`${nextMilestone.emoji} ${nextMilestone.progressText} toward "${nextMilestone.name}"`);
        }

        if (runStats.runs > 1 && rank !== 'S') {
          hooks.push(`${runStats.runs} runs completed. The S-rank awaits.`);
        }

        const hook = hooks.length > 0 ? hooks[Math.floor(Math.random() * hooks.length)] : null;
        return hook ? (
          <div className="animate-slide-down" style={{
            marginTop: 20, padding: '14px 20px', maxWidth: 480, margin: '20px auto 0',
            background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.25)',
            borderRadius: 10, textAlign: 'center',
          }}>
            <div style={{ color: 'var(--gold)', fontSize: '0.85rem', fontStyle: 'italic' }}>
              💡 {hook}
            </div>
          </div>
        ) : null;
      })()}

      {/* ─── PLAY AGAIN ─── */}
      {phase >= 5 && (
        <div className="btn-group animate-slide-down" style={{ marginTop: 36 }}>
          <button className="btn btn-primary btn-glow" onClick={() => startGame()}>
            🎬 NEW RUN
          </button>
        </div>
      )}
    </div>
  );
}
