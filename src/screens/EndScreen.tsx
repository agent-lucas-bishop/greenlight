import { useState, useEffect, useMemo, useCallback } from 'react';
import { GameState, SeasonResult, RewardTier } from '../types';
import { startGame } from '../gameStore';
import { recordRunEnd, getActiveLegacyPerks, getEndingForRank, recordEndingDiscovered, type EndingDef } from '../unlocks';
import { sfx } from '../sound';
import { addLeaderboardEntry } from '../leaderboard';
import { getChallengeById } from '../challenges';
import { markFirstRunComplete } from '../onboarding';
import { trackRunEnd } from '../analytics';
import { awardRunXP, getPrestige, getPrestigeLevel, type RunXPData } from '../prestige';
import { recordGenreMasteryFilms } from '../genreMastery';
import { getStudioLegacy, type StudioLegacy } from '../studioLegacy';
import { recordPersonalBests, getDailyStats, getPersonalBests } from '../personalBests';
import { getWeeklyModifiers, getModifierById } from '../dailyModifiers';
import { getRunStats } from '../unlocks';

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

// ─── Legacy Rating ───

function getLegacyRating(totalEarnings: number, reputation: number, isVictory: boolean): { rating: string; color: string } {
  if (!isVictory) return { rating: 'F', color: '#e74c3c' };
  const composite = totalEarnings * 0.7 + reputation * 30;
  if (composite > 200) return { rating: 'S', color: '#ff6b6b' };
  if (composite > 140) return { rating: 'A', color: '#ffd93d' };
  if (composite > 90) return { rating: 'B', color: '#6bcb77' };
  if (composite > 50) return { rating: 'C', color: '#5dade2' };
  if (composite > 25) return { rating: 'D', color: '#999' };
  return { rating: 'F', color: '#e74c3c' };
}

// ─── Procedural Career Summary ───

function generateCareerSummary(state: GameState, isVictory: boolean, score: number, rank: string): string {
  const h = state.seasonHistory;
  const studioName = state.studioName || 'Your Studio';

  const genreCounts: Record<string, number> = {};
  h.forEach(s => { genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1; });
  const favoriteGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'various';
  const genreCount = Object.keys(genreCounts).length;

  const best = h.reduce((a, b) => a.boxOffice > b.boxOffice ? a : b, h[0]);
  const worst = h.reduce((a, b) => a.boxOffice < b.boxOffice ? a : b, h[0]);
  const blockbusters = h.filter(s => s.tier === 'BLOCKBUSTER').length;
  const flops = h.filter(s => s.tier === 'FLOP').length;
  const nominations = h.filter(s => s.nominated).length;

  const parts: string[] = [];

  if (isVictory && rank === 'S') {
    parts.push(`${studioName} didn't just survive Hollywood — it conquered it.`);
  } else if (isVictory) {
    parts.push(`Against all odds, ${studioName} carved out a name in the industry.`);
  } else if (flops >= 3) {
    parts.push(`${studioName}'s story is a cautionary tale of ambition outpacing talent.`);
  } else {
    parts.push(`${studioName} burned bright but brief, leaving behind an unfinished legacy.`);
  }

  if (genreCount === 1) {
    parts.push(`The studio was a pure ${favoriteGenre} house, never straying from its lane.`);
  } else if (genreCounts[favoriteGenre] >= 3) {
    parts.push(`Known primarily for ${favoriteGenre.toLowerCase()}, the studio built a reputation on the genre.`);
  } else if (genreCount >= 5) {
    parts.push(`A remarkably versatile studio, it dabbled in everything from ${Object.keys(genreCounts).slice(0, 3).join(' to ')}.`);
  }

  if (best) {
    parts.push(`"${best.title}" ($${best.boxOffice.toFixed(1)}M) was the crown jewel — a ${TIER_LABEL[best.tier].toLowerCase()} that ${best.tier === 'BLOCKBUSTER' ? 'defined an era' : 'turned heads'}.`);
  }

  if (worst && worst !== best && (worst.tier === 'FLOP' || worst.boxOffice < 10)) {
    parts.push(`But "${worst.title}" ($${worst.boxOffice.toFixed(1)}M) is one the studio would rather forget.`);
  }

  if (state.totalEarnings > 100) {
    parts.push(`With $${state.totalEarnings.toFixed(1)}M in total box office, ${studioName} was a genuine money-making machine.`);
  } else if (state.totalEarnings > 50) {
    parts.push(`$${state.totalEarnings.toFixed(1)}M in career earnings — respectable, if not legendary.`);
  }

  if (nominations >= 3) {
    parts.push(`A darling of the awards circuit with ${nominations} nominations.`);
  } else if (blockbusters >= 2) {
    parts.push(`${blockbusters} blockbusters cemented its commercial dominance.`);
  }

  if (isVictory) {
    parts.push(`The lights dim, but the legacy endures. ★`);
  } else {
    parts.push(`The marquee goes dark. Maybe next time.`);
  }

  return parts.join(' ');
}

// ─── Share Text ───

function generateSeasonRecapEmoji(s: SeasonResult): string {
  const isDisaster = s.quality <= 0;
  if (isDisaster) return '💀';
  if (s.nominated) return '🏆';
  if (s.tier === 'BLOCKBUSTER') return '💰';
  if (s.tier === 'SMASH') return '💰';
  if (s.tier === 'HIT') return '🎬';
  return '💀';
}

function generateShareText(state: GameState, score: number, rank: string, isVictory: boolean, legacyRating: string, ending: EndingDef, challenge?: ReturnType<typeof getChallengeById>, prestigeTitle?: string, studioLegacy?: StudioLegacy | null): string {
  const h = state.seasonHistory;

  // Tier grid (Wordle-style colored squares)
  const grid = h.map(s => {
    const isDisaster = s.quality <= 0;
    return tierEmoji(s.tier, isDisaster);
  }).join('');

  // Season recap line: film-by-film emoji story
  const seasonRecap = h.map(generateSeasonRecapEmoji).join('');

  const totalBO = state.totalEarnings;
  const dailyDate = state.dailySeed;
  const stats = getRunStats();

  const lines = [
    `🎬 GREENLIGHT ${isVictory ? '🏆' : '💀'}`,
    '',
    `${state.studioName || 'Studio'}`,
    grid,
    seasonRecap,
    '',
    `Score: ${score} (${rank}) · $${totalBO.toFixed(1)}M`,
  ];

  // Add ending title if earned (victory only)
  if (isVictory && ending.title !== 'STUDIO BANKRUPTCY') {
    lines.push(`${ending.emoji} ${ending.title}`);
  }

  // Studio legacy title
  if (studioLegacy) {
    lines.push(`${studioLegacy.emoji} ${studioLegacy.title}`);
  }

  // Challenge mode
  if (challenge) {
    lines.push(`${challenge.emoji} ${challenge.name} Challenge`);
  }

  // Daily info
  if (dailyDate) {
    lines.push(`📅 Daily ${dailyDate}${stats.dailyStreak.current > 1 ? ` · 🔥${stats.dailyStreak.current} streak` : ''}`);
  }

  if (prestigeTitle) {
    lines.push(`⭐ ${prestigeTitle}`);
  }

  lines.push('');
  lines.push('greenlight-plum.vercel.app');

  return lines.filter(l => l !== undefined).join('\n');
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
  const legacy = getLegacyRating(state.totalEarnings, state.reputation, isVictory);
  const ending = getEndingForRank(rank, isVictory);

  const [phase, setPhase] = useState(0);
  const [copied, setCopied] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [newPerks, setNewPerks] = useState<{ id: string; name: string; emoji: string; description: string }[]>([]);
  const [prestigeResult, setPrestigeResult] = useState<ReturnType<typeof awardRunXP> | null>(null);
  const studioLegacy = useMemo(() => isVictory ? getStudioLegacy(state) : null, []);

  const totalBO = state.totalEarnings;
  const bestFilm = history.length > 0 ? history.reduce((a, b) => a.boxOffice > b.boxOffice ? a : b) : null;
  const worstFilm = history.length > 0 ? history.reduce((a, b) => a.boxOffice < b.boxOffice ? a : b) : null;
  const genreCounts: Record<string, number> = {};
  history.forEach(s => { genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1; });
  const favGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  const nominations = history.filter(s => s.nominated).length;
  const blockbusters = history.filter(s => s.tier === 'BLOCKBUSTER').length;

  // Rival standings
  const rivalStandings = useMemo(() => {
    const standings: { name: string; emoji: string; earnings: number }[] = [];
    const seen = new Set<string>();
    for (const rd of state.rivalHistory) {
      for (const f of rd.films) {
        if (!seen.has(f.studioName)) {
          seen.add(f.studioName);
          standings.push({ name: f.studioName, emoji: f.studioEmoji, earnings: 0 });
        }
      }
    }
    for (const s of standings) {
      s.earnings = state.cumulativeRivalEarnings[s.name] || 0;
    }
    standings.sort((a, b) => b.earnings - a.earnings);
    return standings;
  }, [state.rivalHistory, state.cumulativeRivalEarnings]);

  const careerSummary = useMemo(() => generateCareerSummary(state, isVictory, score, rank), []);
  const currentPrestige = getPrestige();
  const currentPrestigeLevel = getPrestigeLevel(currentPrestige.xp);
  const shareText = useMemo(() => {
    return generateShareText(state, score, rank, isVictory, legacy.rating, ending, challenge, currentPrestigeLevel.title, studioLegacy);
  }, []);

  useEffect(() => {
    if (isVictory) sfx.victory(); else sfx.flop();
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 3000),
      setTimeout(() => setPhase(5), 3600),
      setTimeout(() => setPhase(6), 4200),
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
        filmCount: history.length,
      });
      recordEndingDiscovered(ending.id);
      const afterPerks = getActiveLegacyPerks();
      const newlyUnlocked = afterPerks.filter(p => !beforePerks.includes(p.id));
      if (newlyUnlocked.length > 0) setNewPerks(newlyUnlocked);
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
        films: history.map(s => ({ title: s.title, genre: s.genre, tier: s.tier, quality: s.quality, boxOffice: s.boxOffice, season: s.season, nominated: s.nominated })),
        won: isVictory,
        dailySeed: state.dailySeed,
        studioName: state.studioName || undefined,
        prestigeLevel: currentPrestigeLevel.level,
        prestigeTitle: currentPrestigeLevel.title,
        legacyRating: legacy.rating,
      });
      // Record genre mastery cross-run stats
      recordGenreMasteryFilms(history.map(s => ({
        genre: s.genre,
        title: s.title,
        boxOffice: s.boxOffice,
        quality: s.quality,
      })));
      // Award prestige XP
      const xpData: RunXPData = {
        totalBoxOffice: state.totalEarnings,
        achievementsUnlocked: achievements.length,
        challengeCompleted: !!state.challengeId && isVictory,
        challengeId: state.challengeId,
        legacyRating: legacy.rating,
        isVictory,
        filmCount: history.length,
      };
      const pResult = awardRunXP(xpData);
      setPrestigeResult(pResult);
      // Record personal bests
      const modifierNames: string[] = [];
      if (state.dailyModifierId) { const m = getModifierById(state.dailyModifierId); if (m) modifierNames.push(m.name); }
      if (state.dailyModifierId2) { const m = getModifierById(state.dailyModifierId2); if (m) modifierNames.push(m.name); }
      recordPersonalBests({
        score, earnings: state.totalEarnings,
        films: history.map(s => ({ title: s.title, boxOffice: s.boxOffice })),
        won: isVictory, mode: state.gameMode,
        challengeId: state.challengeId,
        dailySeed: state.dailySeed,
        modifierNames, rank,
      });
      markFirstRunComplete();
      trackRunEnd(score, isVictory);
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

  const rankColors: Record<string, string> = { S: '#ff6b6b', A: '#ffd93d', B: '#6bcb77', C: '#5dade2', D: '#999' };

  return (
    <div className={`end-screen fade-in ${!isVictory ? 'end-screen-defeat' : ''}`} style={{ paddingBottom: 60 }}>
      {isVictory && <><VictoryParticles /><div className="victory-starburst" aria-hidden="true" /></>}

      {/* ─── TITLE ─── */}
      <div style={{ marginBottom: 8 }}>
        {state.studioName && (
          <div style={{ fontSize: 'clamp(0.8rem, 2vw, 1rem)', color: '#888', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
            {state.studioName}
          </div>
        )}
        <h2 style={{ color: isVictory ? '#d4a843' : '#e74c3c', margin: 0 }} className={isVictory ? 'end-title-victory' : 'end-title-gameover'}>
          {ending.emoji} {ending.title}
        </h2>
        <div style={{ color: ending.color, fontSize: '0.85rem', fontStyle: 'italic', marginTop: 4 }}>
          {ending.subtitle}
        </div>
      </div>

      {state.gameMode !== 'normal' && (
        <div style={{ marginBottom: 4, fontSize: '0.85rem', color: state.gameMode === 'directorMode' ? '#e74c3c' : 'var(--gold)' }}>
          {state.gameMode === 'newGamePlus' ? '⭐ New Game+' : state.gameMode === 'directorMode' ? '🔥 Director Mode' : state.gameMode === 'daily' ? '📅 Daily Run' : ''}
        </div>
      )}
      {challenge && (
        <div style={{ marginBottom: 4, fontSize: '0.85rem', color: '#e67e22' }}>
          {challenge.emoji} {challenge.name} Challenge (×{challenge.scoreMultiplier} score)
        </div>
      )}

      {/* ─── LEGACY RATING + RANK ─── */}
      <div style={{ display: 'flex', gap: 32, justifyContent: 'center', alignItems: 'center', margin: '16px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#888', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Score Rank</div>
          <div className="rank-display score-reveal" style={{ color: rankColors[rank] || '#d4a843', fontSize: '2.5rem', fontFamily: 'Bebas Neue' }}>
            {rank}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#888', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Studio Legacy</div>
          <div className="score-reveal" style={{ color: legacy.color, fontSize: '2.5rem', fontFamily: 'Bebas Neue' }}>
            {legacy.rating}
          </div>
        </div>
      </div>

      {/* ─── ENDING FLAVOR TEXT ─── */}
      {phase >= 1 && (
        <div className="animate-slide-down" style={{
          background: 'rgba(212,168,67,0.06)',
          border: '1px solid rgba(212,168,67,0.2)',
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

      {/* ─── STUDIO LEGACY ─── */}
      {phase >= 1 && studioLegacy && (
        <div className="animate-slide-down" style={{
          background: 'linear-gradient(135deg, rgba(212,168,67,0.12) 0%, rgba(212,168,67,0.04) 100%)',
          border: '2px solid rgba(212,168,67,0.4)',
          borderRadius: 16,
          padding: '20px 24px',
          margin: '20px auto',
          maxWidth: 520,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{studioLegacy.emoji}</div>
          <div style={{
            color: '#d4a843',
            fontFamily: 'Bebas Neue',
            fontSize: 'clamp(1.2rem, 3vw, 1.6rem)',
            letterSpacing: 2,
            marginBottom: 8,
          }}>
            {studioLegacy.title}
          </div>
          <div style={{
            color: '#bbb',
            fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
            lineHeight: 1.7,
            fontStyle: 'italic',
          }}>
            {studioLegacy.narrative}
          </div>
        </div>
      )}

      {/* ─── CAREER STATS ─── */}
      {phase >= 2 && (
        <div className="end-stats animate-slide-down" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 16 }}>
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
              <div className="label">👑 Best Film</div>
              <div className="value" style={{ fontSize: '0.85rem', color: '#2ecc71' }}>"{bestFilm.title}" (${bestFilm.boxOffice.toFixed(1)}M)</div>
            </div>
          )}
          {worstFilm && worstFilm !== bestFilm && (
            <div className="end-stat" style={{ gridColumn: 'span 2' }}>
              <div className="label">💀 Worst Film</div>
              <div className="value" style={{ fontSize: '0.85rem', color: '#e74c3c' }}>"{worstFilm.title}" (${worstFilm.boxOffice.toFixed(1)}M)</div>
            </div>
          )}
        </div>
      )}

      {/* ─── FILMOGRAPHY ─── */}
      {phase >= 3 && (
        <div style={{ marginTop: 28 }} className="animate-slide-down">
          <h3 style={{ color: '#d4a843', marginBottom: 12, letterSpacing: 1 }}>📜 FILMOGRAPHY</h3>
          <div style={{ maxWidth: 540, margin: '0 auto' }}>
            {history.map((r, i) => (
              <div key={i} className="filmography-row" style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap',
              }}>
                <span style={{ color: '#666', fontFamily: 'Bebas Neue', fontSize: '0.9rem', width: 28 }}>S{r.season}</span>
                <span style={{ color: TIER_COLOR[r.tier], fontSize: '1.1rem' }}>{tierEmoji(r.tier, r.quality <= 0)}</span>
                <span style={{ flex: 1, minWidth: 100, color: '#eee', fontWeight: 600, fontSize: 'clamp(0.8rem, 2vw, 0.95rem)' }}>{r.title}</span>
                <span className="card-stat blue" style={{ fontSize: '0.75rem' }}>{r.genre}</span>
                <span style={{ color: TIER_COLOR[r.tier], fontFamily: 'Bebas Neue', fontSize: '1rem', minWidth: 55, textAlign: 'right' }}>
                  ${r.boxOffice.toFixed(1)}M
                </span>
                <span style={{ width: 18, textAlign: 'center' }}>
                  {r.nominated ? '🏆' : r.hitTarget ? <span style={{ color: '#2ecc71' }}>✓</span> : <span style={{ color: '#e74c3c' }}>✗</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── RIVAL STANDINGS ─── */}
      {phase >= 3 && rivalStandings.length > 0 && (
        <div style={{ marginTop: 24 }} className="animate-slide-down">
          <h3 style={{ color: '#d4a843', marginBottom: 12, letterSpacing: 1 }}>🏢 RIVAL STANDINGS</h3>
          <div style={{ maxWidth: 400, margin: '0 auto' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              background: 'rgba(212,168,67,0.1)', border: '1px solid var(--gold-dim)', borderRadius: 6, marginBottom: 4,
            }}>
              <span style={{ fontSize: '1rem' }}>⭐</span>
              <span style={{ flex: 1, color: '#d4a843', fontWeight: 700, fontSize: '0.85rem' }}>{state.studioName || 'Your Studio'}</span>
              <span style={{ color: '#d4a843', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>${totalBO.toFixed(1)}M</span>
            </div>
            {rivalStandings.map((r, i) => {
              const isAhead = r.earnings > totalBO;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <span style={{ fontSize: '1rem' }}>{r.emoji}</span>
                  <span style={{ flex: 1, color: isAhead ? '#e74c3c' : '#888', fontSize: '0.8rem' }}>{r.name}</span>
                  <span style={{ color: isAhead ? '#e74c3c' : '#666', fontFamily: 'Bebas Neue', fontSize: '0.9rem' }}>${r.earnings.toFixed(1)}M</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── ACHIEVEMENTS ─── */}
      {phase >= 4 && achievements.length > 0 && (
        <div style={{ marginTop: 24 }} className="animate-slide-down">
          <h3 style={{ color: '#d4a843', marginBottom: 12, letterSpacing: 1 }}>🏅 ACHIEVEMENTS ({achievements.length})</h3>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {achievements.map((a, i) => (
              <div key={i} style={{
                background: 'rgba(212,168,67,0.1)', border: '1px solid var(--gold-dim)',
                borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 110,
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
                background: 'rgba(46,204,113,0.15)', border: '2px solid #2ecc71',
                borderRadius: 8, padding: '12px 16px', textAlign: 'center', minWidth: 130,
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

      {/* ─── PRESTIGE XP ─── */}
      {phase >= 5 && prestigeResult && (
        <div className="animate-slide-down" style={{ marginTop: 24 }}>
          <h3 style={{ color: 'var(--gold)', marginBottom: 12, letterSpacing: 1 }}>⭐ STUDIO PRESTIGE</h3>
          <div style={{
            background: 'rgba(212,168,67,0.08)', border: '1px solid var(--gold-dim)',
            borderRadius: 12, padding: '16px 20px', maxWidth: 400, margin: '0 auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: '1.5rem' }}>{prestigeResult.newLevel.emoji}</span>
              <span style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.3rem' }}>
                {prestigeResult.newLevel.title}
              </span>
              <span style={{ color: '#666', fontSize: '0.75rem' }}>Lv.{prestigeResult.newLevel.level}</span>
            </div>
            {prestigeResult.leveledUp && (
              <div style={{
                background: 'rgba(46,204,113,0.15)', border: '1px solid #2ecc71',
                borderRadius: 8, padding: '8px 12px', marginBottom: 12, textAlign: 'center',
                color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '1rem',
                animation: 'comboAppear 0.5s ease',
              }}>
                🎉 LEVEL UP! {prestigeResult.oldLevel.title} → {prestigeResult.newLevel.title}
              </div>
            )}
            <div style={{ color: '#d4a843', fontFamily: 'Bebas Neue', fontSize: '1.1rem', textAlign: 'center', marginBottom: 8 }}>
              +{prestigeResult.xpGained} XP
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
              {prestigeResult.breakdown.map((b, i) => (
                <span key={i} style={{
                  fontSize: '0.65rem', color: '#888', background: 'rgba(255,255,255,0.05)',
                  padding: '2px 8px', borderRadius: 4,
                }}>
                  {b.label}: +{b.xp}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── DAILY RECAP ─── */}
      {phase >= 5 && state.gameMode === 'daily' && (() => {
        const dailyStats = getDailyStats();
        if (dailyStats.totalDailyRuns <= 1) return null; // Need history to compare
        const isNewBest = score > dailyStats.bestScore;
        const aboveAvg = score > dailyStats.avgScore;
        const unlocks = getRunStats();
        return (
          <div className="animate-slide-down" style={{ marginTop: 24 }}>
            <h3 style={{ color: '#3498db', marginBottom: 12, letterSpacing: 1 }}>📅 DAILY RECAP</h3>
            <div style={{
              background: 'rgba(52,152,219,0.08)', border: '1px solid rgba(52,152,219,0.2)',
              borderRadius: 12, padding: '16px 20px', maxWidth: 440, margin: '0 auto',
            }}>
              {isNewBest && (
                <div style={{
                  background: 'rgba(46,204,113,0.15)', border: '1px solid #2ecc71',
                  borderRadius: 8, padding: '8px 12px', marginBottom: 12, textAlign: 'center',
                  color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '1rem',
                  animation: 'comboAppear 0.5s ease',
                }}>
                  🎉 NEW DAILY PERSONAL BEST!
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, textAlign: 'center' }}>
                <div>
                  <div style={{ color: '#666', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today</div>
                  <div style={{ color: aboveAvg ? '#2ecc71' : '#e74c3c', fontFamily: 'Bebas Neue', fontSize: '1.4rem' }}>{score}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Avg</div>
                  <div style={{ color: '#3498db', fontFamily: 'Bebas Neue', fontSize: '1.4rem' }}>{dailyStats.avgScore}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Best Daily</div>
                  <div style={{ color: '#f39c12', fontFamily: 'Bebas Neue', fontSize: '1.4rem' }}>{dailyStats.bestScore}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Streak</div>
                  <div style={{ color: '#f39c12', fontFamily: 'Bebas Neue', fontSize: '1.4rem' }}>🔥 {unlocks.dailyStreak.current}</div>
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 6, justifyContent: 'center', color: '#555', fontSize: '0.65rem' }}>
                <span>{dailyStats.totalDailyRuns} dailies played</span>
                <span>·</span>
                <span>{dailyStats.winRate}% win rate</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── PERSONAL BESTS ─── */}
      {phase >= 5 && (() => {
        const pb = getPersonalBests();
        const modeKey = state.challengeId || state.gameMode;
        const modeBests = pb.modes[modeKey];
        if (!modeBests || modeBests.totalRuns <= 1) return null;
        const isNewBestScore = score >= modeBests.bestScore;
        const bestFilmBO = history.length > 0 ? Math.max(...history.map(s => s.boxOffice)) : 0;
        const isNewFilmRecord = bestFilmBO >= modeBests.highestSingleFilmBO;
        if (!isNewBestScore && !isNewFilmRecord) return null;
        return (
          <div className="animate-slide-down" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {isNewBestScore && (
                <span style={{
                  background: 'rgba(46,204,113,0.15)', border: '1px solid #2ecc71',
                  borderRadius: 6, padding: '4px 12px', fontSize: '0.75rem', color: '#2ecc71',
                }}>🏅 New Best Score for {challenge?.name || (state.gameMode === 'daily' ? 'Daily' : state.gameMode === 'normal' ? 'Standard' : state.gameMode)}</span>
              )}
              {isNewFilmRecord && (
                <span style={{
                  background: 'rgba(243,156,18,0.15)', border: '1px solid #f39c12',
                  borderRadius: 6, padding: '4px 12px', fontSize: '0.75rem', color: '#f39c12',
                }}>💎 New Single-Film BO Record: ${bestFilmBO.toFixed(1)}M</span>
              )}
            </div>
          </div>
        );
      })()}

      {/* ─── WHAT HAPPENED? (Loss breakdown for new players) ─── */}
      {phase >= 3 && !isVictory && history.length > 0 && (() => {
        const reasons: { icon: string; text: string }[] = [];
        const flops = history.filter(s => s.tier === 'FLOP');
        const disasters = history.filter(s => s.quality <= 0);
        const missedTargets = history.filter(s => !s.hitTarget);
        
        if (disasters.length > 0) {
          reasons.push({ icon: '💀', text: `${disasters.length} film${disasters.length > 1 ? 's' : ''} hit DISASTER (3 incidents = lose all quality). Try wrapping early when you have 2 incidents.` });
        }
        if (flops.length > disasters.length) {
          const nonDisasterFlops = flops.length - disasters.length;
          reasons.push({ icon: '📉', text: `${nonDisasterFlops} film${nonDisasterFlops > 1 ? 's' : ''} flopped from low quality. Cast higher-Skill talent and look for chemistry pairs (💕) for bonus quality.` });
        }
        if (missedTargets.length >= 3) {
          reasons.push({ icon: '🎯', text: `Missed ${missedTargets.length} box office targets (3 strikes = fired). Matching genre to 🔥 Hot trends gives big multiplier boosts.` });
        }
        if (state.reputation <= 0) {
          reasons.push({ icon: '⭐', text: 'Reputation hit zero. Flops and disasters hurt your rep — protect it by wrapping early rather than risking a total loss.' });
        }
        const highHeatCast = history.some(s => s.quality <= 0); // rough proxy
        if (disasters.length > 0) {
          reasons.push({ icon: '🎭', text: 'High-Heat talent add powerful cards BUT also Incidents. Balance risk: mix safe low-Heat crew with your divas.' });
        }
        if (reasons.length === 0) {
          reasons.push({ icon: '💡', text: 'Close one! Try matching genres to market trends, building chemistry pairs, and wrapping production before incidents pile up.' });
        }

        return (
          <div className="animate-slide-down" style={{
            background: 'rgba(231,76,60,0.06)', border: '1px solid rgba(231,76,60,0.2)',
            borderRadius: 12, padding: '16px 20px', margin: '20px auto', maxWidth: 520,
          }}>
            <h3 style={{ color: '#e74c3c', margin: '0 0 12px', fontSize: '1rem', letterSpacing: 1 }}>❓ WHAT WENT WRONG?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reasons.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{r.icon}</span>
                  <span style={{ color: '#bbb', fontSize: '0.8rem', lineHeight: 1.5 }}>{r.text}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(46,204,113,0.08)', borderRadius: 6, fontSize: '0.75rem', color: '#2ecc71' }}>
              💡 <strong>Tip:</strong> Your first run is always the hardest — you'll unlock permanent bonuses that help in future runs!
            </div>
          </div>
        );
      })()}

      {/* ─── CAREER NARRATIVE ─── */}
      {phase >= 5 && (
        <div className="animate-slide-down" style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: '16px 20px', margin: '20px auto', maxWidth: 520,
          color: '#999', fontSize: 'clamp(0.75rem, 2vw, 0.85rem)', lineHeight: 1.6, fontStyle: 'italic',
        }}>
          {careerSummary}
        </div>
      )}

      {/* ─── SHARE BLOCK ─── */}
      {phase >= 6 && (
        <div className="animate-slide-down" style={{ marginTop: 28 }}>
          <h3 style={{ color: '#d4a843', marginBottom: 10, letterSpacing: 1 }}>📋 SHARE YOUR RUN</h3>
          <div style={{
            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(212,168,67,0.3)',
            borderRadius: 10, padding: '14px 18px', maxWidth: 340, margin: '0 auto',
            fontFamily: 'monospace', fontSize: 'clamp(0.75rem, 2vw, 0.9rem)',
            lineHeight: 1.7, whiteSpace: 'pre-line', color: '#ddd', textAlign: 'left',
          }}>
            {shareText}
          </div>
          <button className="btn" onClick={handleCopy} style={{
            marginTop: 10,
            background: copied ? 'rgba(46,204,113,0.2)' : 'rgba(212,168,67,0.15)',
            border: `1px solid ${copied ? '#2ecc71' : 'var(--gold-dim)'}`,
            color: copied ? '#2ecc71' : '#d4a843',
            padding: '8px 24px', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.3s',
          }}>
            {copied ? '✅ Copied!' : '📋 Copy to Clipboard'}
          </button>
        </div>
      )}

      {/* ─── PLAY AGAIN ─── */}
      {phase >= 6 && (
        <div className="btn-group animate-slide-down" style={{ marginTop: 36 }}>
          <button className="btn btn-primary btn-glow" onClick={() => startGame()}>
            🎬 NEW RUN
          </button>
        </div>
      )}
    </div>
  );
}
