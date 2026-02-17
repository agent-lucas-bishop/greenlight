import { useState, useEffect, useMemo, useCallback } from 'react';
import { GameState, SeasonResult, RewardTier } from '../types';
import { startGame } from '../gameStore';
import { recordRunEnd, getActiveLegacyPerks, getEndingForRank, recordEndingDiscovered, type EndingDef } from '../unlocks';
import { sfx } from '../sound';
import { addLeaderboardEntry, isNewHighScore, getEntryRank, getPlayerName, type LeaderboardEntry } from '../leaderboard';
import { getChallengeById } from '../challenges';
import { markFirstRunComplete } from '../onboarding';
import { trackRunEnd } from '../analytics';
import { careerTrackRunEnd } from '../careerAnalytics';
import { recordRunStats } from '../statistics';
import { EndScreenStatsSummary } from '../components/StatsDashboard';
import { calculateStandings, getSeasonLeaderboard } from '../aiDirectors';
import { RivalDashboard } from '../components/RivalDashboard';
import { awardRunXP, getPrestige, getPrestigeLevel, PRESTIGE_REWARDS, getPrestigeStudioColor, getPrestigeBadge, hasMilestone, type RunXPData } from '../prestige';
import { calculateStarPowerFromRun, awardStarPower, canPrestigeReset, performPrestigeReset, getPrestigeShop, getPrestigeStarsDisplay, type StarPowerEarning } from '../prestigeShop';
import { awardMetaXP, getMetaProgression, getMetaLevel, getMetaXPProgress, getNextMetaLevel, canPrestige, performPrestige, getPrestigeBadgeEmoji, type MetaRunXPInput, type MetaXPResult } from '../metaProgression';
import { recordGenreMasteryFilms } from '../genreMastery';
import { recordZeroFlopsRun, recordAllModifiersWin } from '../unlockableContent';
import { getStudioLegacy, type StudioLegacy } from '../studioLegacy';
import { recordPersonalBests, getDailyStats, getPersonalBests } from '../personalBests';
import { getWeeklyModifiers, getModifierById } from '../dailyModifiers';
import { getRunStats } from '../unlocks';
import { getDailyNumber, getWeeklyNumber } from '../seededRng';
import { getCombinedModifierMultiplier, CHALLENGE_MODIFIERS } from '../challengeModifiers';
import { getStudioIdentity, generateRunTitle } from '../studioIdentity';
import { updateDailyStreak, completeDailyAttempt, addDailyHistoryEntry } from '../dailyChallenge';
import { getDifficultyBadge } from '../difficulty';
import { addLegacyFilm, checkEndlessUnlock, checkAndAwardMilestones, addEndlessLeaderboardEntry, STUDIO_MILESTONES } from '../endgame';
import { buildDirectorProfile, recordDirectorRun, getDirectorCareer, type DirectorProfile } from '../directorProfile';
import { updateProfileAfterRun } from '../playerProfile';
import { checkTradingCardUnlocks, TRADING_CARDS, RARITY_CONFIG, getCollectionProgress } from '../tradingCards';
import TradingCardToast from '../components/TradingCardToast';
import ShareCard from '../components/ShareCard';
import StrategyTipsModal, { shouldShowStrategyTips } from '../components/StrategyTipsModal';
import { extractShareData, type RunShareData } from '../sharing';
import { checkCommunityChallenges, type RunSummary, type CommunityChallenge } from '../challenges';
import ReplayViewer from '../components/ReplayViewer';

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

// ─── Reputation Tiers ───

export function getRepTier(rep: number): { name: string; color: string; emoji: string } {
  if (rep >= 12) return { name: 'Legendary', emoji: '👑', color: '#ff6b6b' };
  if (rep >= 9) return { name: 'Acclaimed', emoji: '🌟', color: '#ffd93d' };
  if (rep >= 6) return { name: 'Established', emoji: '⭐', color: '#6bcb77' };
  if (rep >= 3) return { name: 'Rising', emoji: '📈', color: '#5dade2' };
  return { name: 'Unknown', emoji: '❓', color: '#999' };
}

// ─── Awards Ceremony ───

interface AwardResult {
  category: string;
  emoji: string;
  filmTitle: string;
  value: string;
}

function calculateAwards(history: SeasonResult[]): { awards: AwardResult[]; tripleCrown: boolean; bonusScore: number; bonusRep: number } | null {
  if (history.length < 3) return null;

  // Best Picture — highest quality
  const bestPicture = history.reduce((a, b) => a.quality > b.quality ? a : b);
  // Box Office Champion — highest grossing
  const boxOfficeChamp = history.reduce((a, b) => a.boxOffice > b.boxOffice ? a : b);
  // Audience Favorite — best ROI (tier value relative to budget proxy: boxOffice / quality gives a rough ROI)
  // Use tier ranking as a proxy: BLOCKBUSTER=4, SMASH=3, HIT=2, FLOP=1, divided by boxOffice to get "efficiency"
  const tierValue: Record<RewardTier, number> = { BLOCKBUSTER: 4, SMASH: 3, HIT: 2, FLOP: 1 };
  const audienceFav = history.reduce((a, b) => {
    const roiA = tierValue[a.tier] / Math.max(1, a.boxOffice) * a.boxOffice;
    const roiB = tierValue[b.tier] / Math.max(1, b.boxOffice) * b.boxOffice;
    // Best tier relative to budget — approximate as tier * (boxOffice / avgBoxOffice)
    const avgBO = history.reduce((s, h) => s + h.boxOffice, 0) / history.length;
    const scoreA = tierValue[a.tier] * (a.boxOffice / avgBO);
    const scoreB = tierValue[b.tier] * (b.boxOffice / avgBO);
    return scoreA > scoreB ? a : b;
  });

  const awards: AwardResult[] = [
    { category: 'Best Picture', emoji: '🏆', filmTitle: bestPicture.title, value: `Quality ${bestPicture.quality}` },
    { category: 'Box Office Champion', emoji: '💰', filmTitle: boxOfficeChamp.title, value: `$${boxOfficeChamp.boxOffice.toFixed(1)}M` },
    { category: 'Audience Favorite', emoji: '❤️', filmTitle: audienceFav.title, value: `${TIER_LABEL[audienceFav.tier]}` },
  ];

  // Check triple crown — one film wins all 3
  const tripleCrown = bestPicture.title === boxOfficeChamp.title && boxOfficeChamp.title === audienceFav.title;

  const bonusScore = tripleCrown ? 200 : awards.length * 50;
  const bonusRep = tripleCrown ? 3 : awards.length;

  return { awards, tripleCrown, bonusScore, bonusRep };
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
  const stats = getRunStats();
  const avgQuality = h.length > 0 ? Math.round(h.reduce((s, f) => s + f.quality, 0) / h.length) : 0;

  // Daily/Weekly specific header
  const isDaily = state.gameMode === 'daily';
  const isWeekly = state.gameMode === 'weekly';

  let header: string;
  if (isDaily) {
    const dayNum = getDailyNumber();
    header = `🎬 GREENLIGHT Daily #${dayNum}`;
  } else if (isWeekly) {
    const weekNum = getWeeklyNumber();
    header = `🎬 GREENLIGHT Weekly #${weekNum}`;
  } else {
    header = `🎬 GREENLIGHT ${isVictory ? '🏆' : '💀'}`;
  }

  const lines: string[] = [header, ''];

  // For daily/weekly, use the compact Wordle-style share format
  if (isDaily || isWeekly) {
    lines.push(`⭐ Score: ${score} | 🎥 ${h.length} Films | 💰 $${Math.round(totalBO)}M | 🏆 ${rank}-Rank`);
    lines.push(grid);
    if (state.activeModifiers && state.activeModifiers.length > 0) {
      const modNames = state.activeModifiers.map(id => CHALLENGE_MODIFIERS.find(m => m.id === id)).filter(Boolean).map(m => `${m!.emoji}${m!.name}`);
      lines.push(`Modifiers: ${modNames.join(' · ')}`);
    }
    if (isDaily && stats.dailyStreak.current > 1) {
      lines.push(`🔥 ${stats.dailyStreak.current}-day streak`);
    }
  } else {
    const sid = getStudioIdentity();
    lines.push(`${sid?.logo || ''} ${sid?.name || state.studioName || 'Studio'}`.trim());
    lines.push(grid);
    lines.push(seasonRecap);
    lines.push('');
    lines.push(`Score: ${score} (${rank}) · $${totalBO.toFixed(1)}M`);

    if (isVictory && ending.title !== 'STUDIO BANKRUPTCY') {
      lines.push(`${ending.emoji} ${ending.title}`);
    }
    if (studioLegacy) {
      lines.push(`${studioLegacy.emoji} ${studioLegacy.title}`);
    }
    if (challenge) {
      lines.push(`${challenge.emoji} ${challenge.name} Challenge`);
    }
    if (state.activeModifiers && state.activeModifiers.length > 0) {
      const modNames = state.activeModifiers.map(id => CHALLENGE_MODIFIERS.find(m => m.id === id)).filter(Boolean).map(m => `${m!.emoji}${m!.name}`);
      lines.push(`Modifiers: ${modNames.join(' · ')}`);
    }
    if (state.dailySeed) {
      lines.push(`📅 Daily ${state.dailySeed}${stats.dailyStreak.current > 1 ? ` · 🔥${stats.dailyStreak.current} streak` : ''}`);
    }
    if (prestigeTitle) {
      lines.push(`⭐ ${prestigeTitle}`);
    }
    if (hasMilestone('mogul_title')) {
      lines.push(`👑 MOGUL`);
    }
  }

  lines.push('');
  lines.push('greenlight-plum.vercel.app');

  return lines.filter(l => l !== undefined).join('\n');
}

// ─── Count Up ───

function CountUpInt({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCurrent(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return <>{current}</>;
}

function GoldenBurst({ elaborate }: { elaborate?: boolean }) {
  const particles = Array.from({ length: elaborate ? 16 : 10 }, (_, i) => {
    const angle = (i / (elaborate ? 16 : 10)) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const dist = 40 + Math.random() * (elaborate ? 80 : 50);
    return { tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist, delay: Math.random() * 0.2 };
  });
  return (
    <div className={`golden-burst ${elaborate ? 'prestige-burst' : ''}`} style={{ position: 'relative', display: 'inline-block' }}>
      {particles.map((p, i) => (
        <span key={i} className="golden-particle" style={{ '--tx': `${p.tx}px`, '--ty': `${p.ty}px`, animationDelay: `${p.delay}s` } as React.CSSProperties} />
      ))}
    </div>
  );
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

  // R136: Franchise King — build a 3-film franchise in a single run
  if (state.franchises && Object.values(state.franchises).some(f => f.films.length >= 3)) {
    a.push({ icon: '🎬', name: 'Franchise King', desc: 'Built a 3-film franchise' });
  }

  // R150: Top Studio — finish #1 overall in rival leaderboard
  if (state.cumulativeRivalEarnings && Object.keys(state.cumulativeRivalEarnings).length > 0) {
    const rivalMax = Math.max(...Object.values(state.cumulativeRivalEarnings));
    if (state.totalEarnings >= rivalMax) {
      a.push({ icon: '🏢', name: 'Top Studio', desc: 'Finished #1 in the industry' });
    }
  }

  return a;
}

// ─── Collapsible Section ───

function CollapsibleSection({ title, emoji, children, defaultOpen = true, className = '' }: {
  title: string; emoji: string; children: React.ReactNode; defaultOpen?: boolean; className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`end-section ${className}`}>
      <div className="end-section-header" onClick={() => setOpen(!open)}>
        <h3 style={{ color: '#d4a843', letterSpacing: 1 }}>{emoji} {title}</h3>
        <span className={`end-section-toggle ${open ? 'open' : ''}`}>▾</span>
      </div>
      <div className={`end-section-body ${open ? 'expanded' : 'collapsed'}`}>
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ───

export default function EndScreen({ state, type }: { state: GameState; type: 'gameover' | 'victory' }) {
  const isVictory = type === 'victory';
  const challenge = state.challengeId ? getChallengeById(state.challengeId) : undefined;
  const challengeMultiplier = challenge?.scoreMultiplier || 1.0;
  const modifierMultiplier = state.activeModifiers ? getCombinedModifierMultiplier(state.activeModifiers) : 1.0;
  const weeklyMultiplier = state.gameMode === 'weekly' ? 1.5 : 1.0;
  const awardsPreCalc = calculateAwards(state.seasonHistory);
  const awardsBonus = awardsPreCalc ? awardsPreCalc.bonusScore : 0;
  const baseScore = Math.round(state.totalEarnings * state.reputation * (1 + state.seasonHistory.filter(s => s.nominated).length * 0.2));
  const score = Math.round(baseScore * challengeMultiplier * modifierMultiplier * weeklyMultiplier) + awardsBonus;
  const rank = score > 800 ? 'S' : score > 500 ? 'A' : score > 300 ? 'B' : score > 150 ? 'C' : 'D';
  const achievements = getAchievements(state);
  const history = state.seasonHistory;
  const legacy = getLegacyRating(state.totalEarnings, state.reputation, isVictory);
  const ending = getEndingForRank(rank, isVictory);

  const [phase, setPhase] = useState(0);
  const [endTab, setEndTab] = useState<'overview' | 'details' | 'progression'>('overview');
  const [copied, setCopied] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [newPerks, setNewPerks] = useState<{ id: string; name: string; emoji: string; description: string }[]>([]);
  const [prestigeResult, setPrestigeResult] = useState<ReturnType<typeof awardRunXP> | null>(null);
  const [metaResult, setMetaResult] = useState<MetaXPResult | null>(null);
  const [showPrestigeConfirm, setShowPrestigeConfirm] = useState(false);
  const [starPowerEarnings, setStarPowerEarnings] = useState<StarPowerEarning[]>([]);
  const [showPrestigeResetConfirm, setShowPrestigeResetConfirm] = useState(false);
  const [prestigeResetDone, setPrestigeResetDone] = useState(false);
  const [newCardIds, setNewCardIds] = useState<string[]>([]);
  const [highScoreRank, setHighScoreRank] = useState<number | null>(null);
  const [leaderboardEntry, setLeaderboardEntry] = useState<LeaderboardEntry | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const [completedCommunity, setCompletedCommunity] = useState<CommunityChallenge[]>([]);
  const [showReplayViewer, setShowReplayViewer] = useState(false);
  const [showStrategyTips, setShowStrategyTips] = useState(!isVictory && shouldShowStrategyTips());
  const studioIdentity = getStudioIdentity();
  const runTitle = useMemo(() => generateRunTitle(
    history,
    state.totalEarnings,
    state.reputation,
    studioIdentity?.name || state.studioName || 'Your Studio',
  ), []);
  const studioLegacy = useMemo(() => isVictory ? getStudioLegacy(state) : null, []);
  const directorProfile = useMemo(() => buildDirectorProfile(history), []);
  const awardsResult = useMemo(() => calculateAwards(state.seasonHistory), []);
  const shareData = useMemo<RunShareData>(() => extractShareData(state, score, rank, legacy.rating, isVictory, directorProfile.styleTitle), []);

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
    if (state.gameMode === 'daily') {
      sfx.dailyChallengeComplete();
    } else if (isVictory) sfx.victory(); else sfx.flop();
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 3000),
      setTimeout(() => setPhase(5), 3600),
      setTimeout(() => setPhase(6), 4200),
      setTimeout(() => setPhase(7), 4800),
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
      // ─── Community Challenges (R215) ───
      {
        const talentHiredInSeason = history.map(() => 0); // approximate — not tracked per-season yet
        const runSummary: RunSummary = {
          won: isVictory,
          difficulty: state.difficulty || 'studio',
          genres: history.map(s => s.genre) as import('../types').Genre[],
          totalEarnings: state.totalEarnings,
          maxSingleFilmBO: Math.max(0, ...history.map(s => s.boxOffice)),
          filmsProduced: history.length,
          talentHiredInSeason,
          maxTalentHiredInOneSeason: Math.max(0, ...talentHiredInSeason),
          sRankCount: history.filter(s => s.tier === 'BLOCKBUSTER' && s.quality >= 90).length,
          hitCount: history.filter(s => s.tier === 'HIT' || s.tier === 'BLOCKBUSTER').length,
          blockbusterCount: history.filter(s => s.tier === 'BLOCKBUSTER').length,
          flopCount: history.filter(s => s.tier === 'FLOP').length,
          reputation: state.reputation,
          score,
          uniqueGenres: new Set(history.map(s => s.genre)).size,
          streakFilmsNoFlop: history.reduce((max, s, i) => {
            if (s.tier === 'FLOP') return max;
            const streak = i === 0 || history[i-1].tier === 'FLOP' ? 1 : max + 1;
            return Math.max(max, streak);
          }, 0),
          seasonsCompleted: history.length,
          rank,
        };
        const newlyDone = checkCommunityChallenges(runSummary);
        if (newlyDone.length > 0) setCompletedCommunity(newlyDone);
      }
      // Track special unlock conditions
      if (isVictory) {
        const hasFlops = history.some(s => s.tier === 'FLOP');
        if (!hasFlops && history.length > 0) recordZeroFlopsRun();
        // Check if all 4 challenge modifiers were active
        if (state.activeModifiers && state.activeModifiers.length >= CHALLENGE_MODIFIERS.length) {
          recordAllModifiersWin();
        }
      }
      const afterPerks = getActiveLegacyPerks();
      const newlyUnlocked = afterPerks.filter(p => !beforePerks.includes(p.id));
      if (newlyUnlocked.length > 0) setNewPerks(newlyUnlocked);
      const isHighScore = isNewHighScore(score, state.difficulty || 'studio');
      const lbEntry = addLeaderboardEntry({
        date: new Date().toISOString().slice(0, 10),
        score,
        rank,
        seasons: history.length,
        earnings: state.totalEarnings,
        reputation: state.reputation,
        mode: state.gameMode,
        challenge: state.challengeId,
        archetype: state.studioArchetype || 'unknown',
        difficulty: state.difficulty || 'studio',
        films: history.map(s => ({ title: s.title, genre: s.genre, tier: s.tier, quality: s.quality, boxOffice: s.boxOffice, season: s.season, nominated: s.nominated, criticScore: s.criticScore, criticStars: s.criticStars })),
        won: isVictory,
        dailySeed: state.dailySeed || state.weeklySeed ? `weekly:${state.weeklySeed}` : undefined,
        studioName: studioIdentity?.name || state.studioName || undefined,
        runTitle: runTitle || undefined,
        prestigeLevel: currentPrestigeLevel.level,
        prestigeTitle: currentPrestigeLevel.title,
        legacyRating: legacy.rating,
        playerName: getPlayerName() || undefined,
        directorStyle: directorProfile.styleTitle,
      });
      setLeaderboardEntry(lbEntry);
      if (isHighScore) {
        const entryRank = getEntryRank(lbEntry);
        setHighScoreRank(entryRank);
        setTimeout(() => sfx.victory(), 800);
      }
      // Daily challenge: update streak and history
      if (state.gameMode === 'daily') {
        updateDailyStreak();
        // R170: Streak milestone sound every 7 days
        try {
          const u = JSON.parse(localStorage.getItem('greenlight_unlocks') || '{}');
          if (u.dailyStreak?.current && u.dailyStreak.current % 7 === 0) {
            setTimeout(() => sfx.streakMilestone(), 1200);
          }
        } catch {}
        completeDailyAttempt(score);
        addDailyHistoryEntry({
          date: new Date().toISOString().slice(0, 10),
          score,
          rank,
          films: history.length,
          earnings: state.totalEarnings,
          won: isVictory,
          archetype: state.studioArchetype || 'unknown',
        });
      }
      // Save weekly best score to localStorage
      if (state.gameMode === 'weekly' && state.weeklySeed) {
        const weeklyKey = `greenlight_weekly_best_${state.weeklySeed}`;
        try {
          const prev = parseInt(localStorage.getItem(weeklyKey) || '0', 10);
          if (score > prev) localStorage.setItem(weeklyKey, String(score));
        } catch {}
      }
      // Record genre mastery cross-run stats
      const masteryChanges = recordGenreMasteryFilms(history.map(s => ({
        genre: s.genre,
        title: s.title,
        boxOffice: s.boxOffice,
        quality: s.quality,
      })));
      if (masteryChanges.length > 0) {
        setTimeout(() => sfx.masteryMilestone(), 800);
      }
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
      if (pResult.leveledUp) setTimeout(() => sfx.prestigeUp(), 3600);
      // R171: Meta-progression XP
      const metaInput: MetaRunXPInput = {
        score,
        filmCount: history.length,
        achievementCount: achievements.length,
        isVictory,
      };
      const mResult = awardMetaXP(metaInput);
      setMetaResult(mResult);
      // R227: Star Power earnings
      const spEarnings = calculateStarPowerFromRun({
        isVictory,
        difficulty: state.difficulty || 'studio',
        legacyRating: legacy.rating,
        filmCount: history.length,
        totalBoxOffice: state.totalEarnings,
        achievementCount: achievements.length,
      });
      if (spEarnings.length > 0) {
        awardStarPower(spEarnings);
        setStarPowerEarnings(spEarnings);
      }
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
      // R177: Legacy Films — add best film from this run
      if (history.length > 0) {
        const bestFilmForLegacy = history.reduce((a, b) => a.boxOffice > b.boxOffice ? a : b);
        addLegacyFilm({
          title: bestFilmForLegacy.title,
          genre: bestFilmForLegacy.genre,
          tier: bestFilmForLegacy.tier,
          quality: bestFilmForLegacy.quality,
          boxOffice: bestFilmForLegacy.boxOffice,
          studioName: studioIdentity?.name || state.studioName || 'Unknown Studio',
          runDate: new Date().toISOString().slice(0, 10),
          criticScore: bestFilmForLegacy.criticScore,
          criticStars: bestFilmForLegacy.criticStars,
          season: bestFilmForLegacy.season,
        });
      }
      // R177: Check Endless Mode unlock (win on Mogul)
      checkEndlessUnlock(isVictory, state.difficulty || 'studio');
      // R177: Studio Milestones
      const freshScores = history.filter(s => (s.criticScore ?? 0) >= 60).length;
      checkAndAwardMilestones(freshScores);
      // R177: Endless Mode leaderboard
      if (state.gameMode === 'endless') {
        addEndlessLeaderboardEntry({
          date: new Date().toISOString().slice(0, 10),
          studioName: studioIdentity?.name || state.studioName || 'Unknown Studio',
          seasons: history.length,
          totalEarnings: state.totalEarnings,
          films: history.length,
          archetype: state.studioArchetype || 'unknown',
          finalBudget: state.budget,
        });
      }
      // R186: Record director profile for career tracking
      recordDirectorRun(directorProfile);
      // R187: Check trading card unlocks
      const cardState = { ...state, _endScore: score, _tripleCrown: awardsResult?.tripleCrown };
      const newCards = checkTradingCardUnlocks(cardState);
      if (newCards.length > 0) setNewCardIds(newCards);
      markFirstRunComplete();
      trackRunEnd(score, isVictory);
      careerTrackRunEnd({
        totalBO: state.totalEarnings,
        score,
        filmCount: history.length,
        won: isVictory,
        archetype: state.studioArchetype || 'unknown',
        prestigeLevel: currentPrestigeLevel.level,
      });
      // R193: Record detailed statistics
      recordRunStats({
        seasonHistory: history,
        totalEarnings: state.totalEarnings,
        won: isVictory,
        difficulty: state.difficulty,
        score,
        studioName: state.studioName,
        budget: state.budget,
        startBudget: 15, // default start budget
      });
      // R223: Update player profile
      updateProfileAfterRun({
        won: isVictory,
        score,
        rank,
        earnings: state.totalEarnings,
        budgetSpent: Math.max(0, 15 - state.budget + state.totalEarnings), // approximate budget spent
        difficulty: state.difficulty || 'studio',
        archetype: state.studioArchetype || 'unknown',
        films: history.map(s => ({ title: s.title, genre: s.genre, tier: s.tier, quality: s.quality, boxOffice: s.boxOffice })),
      });
      setRecorded(true);
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleCopy = useCallback(() => {
    sfx.shareSnap();
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareText]);

  const rankColors: Record<string, string> = { S: '#ff6b6b', A: '#ffd93d', B: '#6bcb77', C: '#5dade2', D: '#999' };

  return (
    <div className={`end-screen fade-in ${!isVictory ? 'end-screen-defeat' : ''}`} style={{ paddingBottom: 60 }}>
      {isVictory && <><VictoryParticles /><div className="victory-starburst" aria-hidden="true" /></>}
      {showStrategyTips && <StrategyTipsModal onClose={() => setShowStrategyTips(false)} />}

      {/* ─── TITLE ─── */}
      <div style={{ marginBottom: 8 }}>
        {(studioIdentity || state.studioName) && (
          <div style={{ fontSize: 'clamp(0.8rem, 2vw, 1rem)', color: getPrestigeStudioColor() || '#888', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
            {studioIdentity?.logo ? `${studioIdentity.logo} ` : getPrestigeBadge() ? `${getPrestigeBadge()} ` : ''}{studioIdentity?.name || state.studioName}
          </div>
        )}
        {runTitle && (
          <div style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.85rem)', color: '#999', fontStyle: 'italic', letterSpacing: 1, marginBottom: 4 }}>
            "{runTitle}"
          </div>
        )}
        <h2 style={{ color: isVictory ? '#d4a843' : '#e74c3c', margin: 0 }} className={isVictory ? 'end-title-victory' : 'end-title-gameover'}>
          {isVictory ? `${ending.emoji} ${ending.title}` : `${ending.emoji} THE STUDIO CLOSES ITS DOORS`}
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
      {state.difficulty && (() => {
        const badge = getDifficultyBadge(state.difficulty);
        return (
          <div style={{ marginBottom: 8, display: 'inline-block', padding: '4px 12px', background: `${badge.color}15`, border: `1px solid ${badge.color}30`, borderRadius: 6 }}>
            <span style={{ color: badge.color, fontFamily: 'Bebas Neue', fontSize: '0.85rem', letterSpacing: '0.05em' }}>{badge.emoji} {badge.name} Difficulty</span>
          </div>
        );
      })()}

      {/* ─── NEW HIGH SCORE ─── */}
      {highScoreRank !== null && highScoreRank <= 10 && (
        <div className="animate-slide-down" style={{
          background: 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,107,107,0.1) 100%)',
          border: '2px solid rgba(255,215,0,0.6)',
          borderRadius: 16,
          padding: '16px 24px',
          margin: '16px auto',
          maxWidth: 400,
          textAlign: 'center',
          animation: 'comboAppear 0.6s ease',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: 4 }}>🎉</div>
          <div style={{
            color: '#ffd700',
            fontFamily: 'Bebas Neue',
            fontSize: 'clamp(1.4rem, 3.5vw, 2rem)',
            letterSpacing: 3,
          }}>
            NEW HIGH SCORE!
          </div>
          <div style={{ color: '#ccc', fontSize: '0.9rem', marginTop: 4 }}>
            Rank <span style={{ color: '#ffd700', fontWeight: 700 }}>#{highScoreRank}</span> on the {state.difficulty || 'studio'} leaderboard
          </div>
          <GoldenBurst elaborate />
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

      {/* ─── AWARDS CEREMONY ─── */}
      {phase >= 2 && awardsResult && (
        <div className="animate-slide-down" style={{
          background: 'linear-gradient(135deg, rgba(212,168,67,0.15) 0%, rgba(212,168,67,0.04) 100%)',
          border: '2px solid rgba(212,168,67,0.5)',
          borderRadius: 16,
          padding: '24px 28px',
          margin: '20px auto',
          maxWidth: 540,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: 4 }}>🏆</div>
          <div style={{
            color: '#d4a843',
            fontFamily: 'Bebas Neue',
            fontSize: 'clamp(1.3rem, 3vw, 1.8rem)',
            letterSpacing: 3,
            marginBottom: 16,
          }}>
            AWARDS CEREMONY
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            {awardsResult.awards.map((award, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                background: 'rgba(0,0,0,0.3)', borderRadius: 10,
                border: '1px solid rgba(212,168,67,0.2)',
              }}>
                <span style={{ fontSize: '1.5rem' }}>{award.emoji}</span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ color: '#d4a843', fontFamily: 'Bebas Neue', fontSize: '0.9rem', letterSpacing: 1 }}>
                    {award.category}
                  </div>
                  <div style={{ color: '#eee', fontSize: '0.85rem', fontWeight: 600 }}>
                    "{award.filmTitle}"
                  </div>
                  <div style={{ color: '#888', fontSize: '0.7rem' }}>{award.value}</div>
                </div>
                <span style={{ color: '#2ecc71', fontSize: '0.75rem', fontFamily: 'Bebas Neue' }}>+50 · +1★</span>
              </div>
            ))}
          </div>
          {awardsResult.tripleCrown && (
            <div style={{
              background: 'rgba(255,107,107,0.15)', border: '2px solid #ff6b6b',
              borderRadius: 10, padding: '12px 16px', marginBottom: 12,
              animation: 'comboAppear 0.5s ease',
            }}>
              <div style={{ fontSize: '1.8rem' }}>👑</div>
              <div style={{ color: '#ff6b6b', fontFamily: 'Bebas Neue', fontSize: '1.2rem', letterSpacing: 2 }}>
                TRIPLE CROWN
              </div>
              <div style={{ color: '#ccc', fontSize: '0.8rem' }}>
                One film swept all three awards!
              </div>
              <div style={{ color: '#ff6b6b', fontSize: '0.75rem', fontFamily: 'Bebas Neue', marginTop: 4 }}>
                +200 Score · +3★ Reputation
              </div>
            </div>
          )}
          {!awardsResult.tripleCrown && (
            <div style={{ color: '#888', fontSize: '0.75rem' }}>
              Total: +{awardsResult.bonusScore} Score · +{awardsResult.bonusRep}★ Reputation
            </div>
          )}
        </div>
      )}

      {/* ─── CAREER STATS ─── */}
      {phase >= 3 && (
        <div className="end-stats end-stats-grid animate-slide-down" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 16 }}>
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
            <div className="value"><CountUpInt target={score} duration={1500} /></div>
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
          {state.festivalHistory.length > 0 && (
            <div className="end-stat">
              <div className="label">🎬 Festival Awards</div>
              <div className="value" style={{ color: '#f1c40f' }}>
                {state.festivalHistory.filter(r => r.award).length}/{state.festivalHistory.length}
              </div>
            </div>
          )}
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

      {/* ─── END SCREEN TABS ─── */}
      {phase >= 4 && (
        <div className="start-tab-bar" style={{ marginTop: 24 }}>
          {([
            { id: 'overview' as const, label: '📜 Overview' },
            { id: 'details' as const, label: '📊 Details' },
            { id: 'progression' as const, label: '⭐ Progression' },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => setEndTab(t.id)}
              className={`start-tab-btn${endTab === t.id ? ' active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ─── DIRECTOR'S CHAIR (R186) ─── */}
      {phase >= 4 && history.length > 0 && endTab === 'overview' && (
        <div className="animate-slide-down" style={{
          background: 'linear-gradient(135deg, rgba(155,89,182,0.12) 0%, rgba(212,168,67,0.08) 100%)',
          border: '2px solid rgba(155,89,182,0.4)',
          borderRadius: 16,
          padding: '20px 24px',
          margin: '20px auto',
          maxWidth: 520,
          textAlign: 'center',
        }}>
          <div ref={el => { if (el && !el.dataset.sounded) { el.dataset.sounded = '1'; try { sfx.directorStyleReveal(); if (directorProfile.directorRating >= 75) setTimeout(() => sfx.auteurRatingUp(), 400); } catch {} } }} style={{ fontSize: '2rem', marginBottom: 4 }}>{directorProfile.styleEmoji}</div>
          <div style={{
            color: '#bb86fc',
            fontFamily: 'Bebas Neue',
            fontSize: 'clamp(1.3rem, 3vw, 1.8rem)',
            letterSpacing: 2,
            marginBottom: 4,
          }}>
            {directorProfile.styleTitle}
          </div>
          <div style={{ color: '#999', fontSize: '0.75rem', marginBottom: 12, fontStyle: 'italic' }}>
            {directorProfile.signature}
          </div>

          {/* Director Rating */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#888', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Director Rating</div>
              <div style={{
                color: directorProfile.directorRating >= 75 ? '#2ecc71' : directorProfile.directorRating >= 50 ? '#f1c40f' : '#e74c3c',
                fontFamily: 'Bebas Neue', fontSize: '2rem',
              }}>
                {directorProfile.directorRating}%
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#888', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Style Points</div>
              <div style={{ color: '#bb86fc', fontFamily: 'Bebas Neue', fontSize: '2rem' }}>
                {directorProfile.stylePoints}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#888', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Versatility</div>
              <div style={{ color: '#3498db', fontFamily: 'Bebas Neue', fontSize: '2rem' }}>
                {directorProfile.versatilityPoints}
              </div>
            </div>
          </div>

          {/* Genre Breakdown */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {Object.entries(
              directorProfile.filmography.reduce((acc, f) => {
                acc[f.genre] = (acc[f.genre] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).sort((a, b) => b[1] - a[1]).map(([genre, count]) => (
              <span key={genre} style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(187,134,252,0.3)',
                borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', color: '#ccc',
              }}>
                {genre} ×{count}
              </span>
            ))}
          </div>

          {/* Streak indicator */}
          {directorProfile.genreStreak >= 2 && (
            <div style={{ marginTop: 10, fontSize: '0.7rem', color: '#bb86fc' }}>
              🔥 {directorProfile.genreStreak}-film {directorProfile.lastGenre} streak
            </div>
          )}

          {/* Career bests */}
          {(() => {
            const career = getDirectorCareer();
            if (career.totalFilms <= 0) return null;
            return (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, fontSize: '0.7rem', color: '#888' }}>
                Career: Best Rating {career.bestRating}% · Most Common Style: {career.mostCommonStyle} · {career.totalFilms} total films
              </div>
            );
          })()}
        </div>
      )}

      {/* ─── FILMOGRAPHY ─── */}
      {phase >= 4 && endTab === 'overview' && (
        <div style={{ marginTop: 28 }} className="animate-slide-down">
          <h3 style={{ color: '#d4a843', marginBottom: 12, letterSpacing: 1 }}>📜 FILMOGRAPHY</h3>
          <div style={{ maxWidth: 540, margin: '0 auto' }}>
            {history.map((r, i) => (
              <div key={i} className="filmography-row" style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap',
              }}>
                <span style={{ color: '#999', fontFamily: 'Bebas Neue', fontSize: '0.9rem', width: 28 }}>S{r.season}</span>
                <span style={{ color: TIER_COLOR[r.tier], fontSize: '1.1rem' }}>{tierEmoji(r.tier, r.quality <= 0)}</span>
                <span style={{ flex: 1, minWidth: 100, color: '#eee', fontWeight: 600, fontSize: 'clamp(0.8rem, 2vw, 0.95rem)' }}>{r.title}</span>
                <span className="card-stat blue" style={{ fontSize: '0.75rem' }}>{r.genre}</span>
                <span style={{ color: TIER_COLOR[r.tier], fontFamily: 'Bebas Neue', fontSize: '1rem', minWidth: 55, textAlign: 'right' }}>
                  ${r.boxOffice.toFixed(1)}M
                </span>
                {r.criticScore != null && (
                  <span style={{ fontSize: '0.7rem', color: r.criticScore >= 60 ? '#e74c3c' : '#7f8c2a', minWidth: 36, textAlign: 'right' }}>
                    {r.criticScore >= 60 ? '🍅' : '🤢'}{r.criticScore}%
                  </span>
                )}
                {r.festivalAwards && r.festivalAwards.length > 0 && (
                  <span style={{ fontSize: '0.75rem' }} title={r.festivalAwards.map(a => `${a.festivalId}: ${a.award}`).join(', ')}>
                    {r.festivalAwards.map((a, j) => (
                      <span key={j}>{a.award === 'grandPrize' ? '🏆' : a.award === 'winner' ? '🏅' : a.award === 'nomination' ? '🌿' : ''}</span>
                    ))}
                  </span>
                )}
                <span style={{ width: 18, textAlign: 'center' }}>
                  {r.nominated ? '🏆' : r.hitTarget ? <span style={{ color: '#2ecc71' }}>✓</span> : <span style={{ color: '#e74c3c' }}>✗</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── RIVAL LEADERBOARD (R180) ─── */}
      {phase >= 4 && rivalStandings.length > 0 && endTab === 'overview' && (
        <div style={{ marginTop: 24 }} className="animate-slide-down" ref={el => { if (el && !el.dataset.sounded) { el.dataset.sounded = '1'; sfx.rivalLeaderboardReveal(); } }}>
          <h3 style={{ color: '#d4a843', marginBottom: 12, letterSpacing: 1 }}>🏢 INDUSTRY LEADERBOARD</h3>
          {state.nemesisStudio && (
            <div ref={el => { if (el && !el.dataset.sounded) { el.dataset.sounded = '1'; sfx.nemesisTheme(); } }} style={{ textAlign: 'center', marginBottom: 8, fontSize: '0.75rem', color: '#e74c3c', fontStyle: 'italic' }}>
              ⚔️ Nemesis: {state.nemesisStudio}
            </div>
          )}
          <div className="rival-standings" style={{ maxWidth: 500, margin: '0 auto' }}>
            {/* Header row */}
            <div style={{ display: 'flex', gap: 6, padding: '4px 12px', marginBottom: 4, fontSize: '0.6rem', color: '#666' }}>
              <span style={{ width: 22 }}>#</span>
              <span style={{ width: 24 }}></span>
              <span style={{ flex: 1 }}>Studio</span>
              {history.map((_, si) => (
                <span key={si} style={{ width: 42, textAlign: 'right', flexShrink: 0 }}>S{si + 1}</span>
              ))}
              <span style={{ width: 60, textAlign: 'right', flexShrink: 0 }}>Total</span>
            </div>
            {(() => {
              // Build leaderboard entries
              const entries = [
                {
                  name: state.studioName || 'Your Studio',
                  emoji: '⭐',
                  isPlayer: true,
                  isNemesis: false,
                  seasonEarnings: history.map(h => h.boxOffice),
                  total: totalBO,
                  strategyLabel: undefined as string | undefined,
                  reputation: state.reputation,
                },
                ...rivalStandings.map(r => ({
                  name: r.name,
                  emoji: r.emoji,
                  isPlayer: false,
                  isNemesis: state.nemesisStudio === r.name,
                  seasonEarnings: state.rivalStats?.[r.name]?.seasonEarnings || [],
                  total: r.earnings,
                  strategyLabel: state.rivalStats?.[r.name] ? undefined : undefined,
                  reputation: state.rivalStats?.[r.name]?.reputation || 3,
                })),
              ].sort((a, b) => b.total - a.total);

              return entries.map((entry, i) => (
                <div key={entry.name} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', marginBottom: 2, borderRadius: 6,
                  background: entry.isPlayer ? 'rgba(212,168,67,0.1)' : entry.isNemesis ? 'rgba(231,76,60,0.08)' : 'transparent',
                  border: entry.isPlayer ? '1px solid var(--gold-dim)' : entry.isNemesis ? '1px solid rgba(231,76,60,0.2)' : '1px solid transparent',
                }}>
                  <span style={{ fontFamily: 'Bebas Neue', fontSize: '0.9rem', color: i === 0 ? '#ffd700' : '#666', width: 22 }}>#{i + 1}</span>
                  <span style={{ fontSize: '0.9rem', width: 24 }}>{entry.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      color: entry.isPlayer ? '#d4a843' : entry.isNemesis ? '#e74c3c' : '#ccc',
                      fontSize: '0.8rem', fontWeight: entry.isPlayer ? 700 : 400,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                    }}>
                      {entry.name}{entry.isNemesis ? ' ⚔️' : ''}
                    </span>
                  </div>
                  {entry.seasonEarnings.map((se, si) => (
                    <span key={si} style={{
                      width: 42, textAlign: 'right', fontSize: '0.7rem', flexShrink: 0,
                      color: entry.isPlayer ? '#d4a843' : '#888',
                    }}>
                      ${se.toFixed(0)}M
                    </span>
                  ))}
                  <span style={{
                    width: 60, textAlign: 'right', fontFamily: 'Bebas Neue', fontSize: '0.95rem', flexShrink: 0,
                    color: i === 0 ? '#ffd700' : entry.isPlayer ? '#d4a843' : entry.isNemesis ? '#e74c3c' : '#aaa',
                  }}>
                    ${entry.total.toFixed(1)}M
                  </span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* ─── AI DIRECTOR FINAL STANDINGS (R225) ─── */}
      {phase >= 4 && (state.aiDirectorFilms || []).length > 0 && endTab === 'overview' && (() => {
        const standings = calculateStandings(state.aiDirectorFilms, state.seasonHistory.map(h => h.boxOffice), state.aiDirectorPrevRanks || {});
        const lb = getSeasonLeaderboard(standings, state.studioName || 'Your Studio', state.totalEarnings, state.seasonHistory.length, 0);
        return (
          <div style={{ marginTop: 24 }} className="animate-slide-down">
            <h3 style={{ color: '#d4a843', marginBottom: 12, letterSpacing: 1 }}>🎬 DIRECTOR BATTLE — FINAL STANDINGS</h3>
            <RivalDashboard standings={standings} leaderboard={lb} showdowns={[]} currentSeason={state.season} />
          </div>
        );
      })()}

      {/* ─── FRANCHISES ─── */}
      {phase >= 4 && state.franchises && Object.keys(state.franchises).length > 0 && endTab === 'overview' && (
        <div style={{ marginTop: 24 }} className="animate-slide-down">
          <h3 style={{ color: '#e67e22', marginBottom: 12, letterSpacing: 1 }}>🎬 FRANCHISES</h3>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {Object.values(state.franchises).filter(f => f.films.length >= 2).map((f, i) => (
              <div key={i} style={{
                background: 'rgba(230,126,34,0.1)', border: '1px solid rgba(230,126,34,0.3)',
                borderRadius: 8, padding: '10px 16px', textAlign: 'center', minWidth: 140,
              }}>
                <div style={{ color: '#e67e22', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>
                  {f.rootTitle} ({f.films.length} films)
                </div>
                <div style={{ color: '#888', fontSize: '0.75rem', marginTop: 4 }}>
                  Total BO: ${f.totalBoxOffice.toFixed(1)}M
                </div>
                <div style={{ color: '#666', fontSize: '0.65rem', marginTop: 2 }}>
                  {f.films.map(ff => ff.title).join(' → ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── ACHIEVEMENTS ─── */}
      {phase >= 5 && achievements.length > 0 && endTab === 'overview' && (
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
      {phase >= 5 && endTab === 'progression' && newPerks.length > 0 && (
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

      {/* ─── COMMUNITY CHALLENGES (R215) ─── */}
      {phase >= 5 && endTab === 'progression' && completedCommunity.length > 0 && (
        <div style={{ marginTop: 24 }} className="animate-slide-down">
          <h3 style={{ color: '#f59e0b', marginBottom: 12 }}>🏅 COMMUNITY CHALLENGES COMPLETED!</h3>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {completedCommunity.map((c, i) => (
              <div key={i} style={{
                background: 'rgba(245,158,11,0.12)', border: '2px solid #f59e0b',
                borderRadius: 8, padding: '12px 16px', textAlign: 'center', minWidth: 130,
                animation: 'comboAppear 0.5s ease',
              }}>
                <div style={{ fontSize: '1.6rem' }}>{c.emoji}</div>
                <div style={{ color: '#f59e0b', fontFamily: 'Bebas Neue', fontSize: '0.95rem' }}>{c.title}</div>
                <div style={{ color: '#aaa', fontSize: '0.7rem' }}>{c.description}</div>
                <div style={{ color: '#60a5fa', fontSize: '0.7rem', marginTop: 4 }}>+{c.xpReward} XP</div>
                {c.cardVariantReward && <div style={{ color: '#c084fc', fontSize: '0.65rem', marginTop: 2 }}>🃏 Card variant unlocked!</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── PRESTIGE XP ─── */}
      {phase >= 6 && endTab === 'progression' && prestigeResult && (
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
              <span style={{ color: '#999', fontSize: '0.75rem' }}>Lv.{prestigeResult.newLevel.level}</span>
            </div>
            {prestigeResult.leveledUp && (
              <div style={{
                background: 'rgba(46,204,113,0.15)', border: '1px solid #2ecc71',
                borderRadius: 8, padding: '8px 12px', marginBottom: 12, textAlign: 'center',
                color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '1rem',
                animation: 'comboAppear 0.5s ease',
                position: 'relative', overflow: 'visible',
              }}>
                🎉 LEVEL UP! {prestigeResult.oldLevel.title} → {prestigeResult.newLevel.title}
                <GoldenBurst elaborate />
              </div>
            )}
            {prestigeResult.leveledUp && PRESTIGE_REWARDS[prestigeResult.newLevel.level] && (() => {
              const reward = PRESTIGE_REWARDS[prestigeResult.newLevel.level];
              return (
                <div style={{
                  background: 'rgba(212,168,67,0.12)', border: '1px solid var(--gold-dim)',
                  borderRadius: 8, padding: '8px 12px', marginBottom: 12, textAlign: 'center',
                  animation: 'comboAppear 0.5s ease',
                }}>
                  <div style={{ color: '#888', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Cosmetic Unlocked</div>
                  <div style={{ color: 'var(--gold)', fontSize: '0.85rem', marginTop: 4 }}>{reward.label}</div>
                </div>
              );
            })()}
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

      {/* ─── META-PROGRESSION (R171) ─── */}
      {phase >= 6 && endTab === 'progression' && metaResult && (() => {
        const meta = getMetaProgression();
        const xpProg = getMetaXPProgress(meta.xp);
        const nextLvl = getNextMetaLevel(meta.xp);
        const prestigeBadge = getPrestigeBadgeEmoji(meta.prestigeCount);
        return (
          <div className="animate-slide-down" style={{ marginTop: 24 }}>
            <h3 style={{ color: '#9b59b6', marginBottom: 12, letterSpacing: 1 }}>🎬 STUDIO PROGRESSION</h3>
            <div style={{
              background: 'rgba(155,89,182,0.08)', border: '1px solid rgba(155,89,182,0.3)',
              borderRadius: 12, padding: '16px 20px', maxWidth: 420, margin: '0 auto',
            }}>
              {/* Level display */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: '1.5rem' }}>{metaResult.newLevel.emoji}</span>
                <span style={{ color: '#9b59b6', fontFamily: 'Bebas Neue', fontSize: '1.3rem' }}>
                  {metaResult.newLevel.title}
                </span>
                <span style={{ color: '#999', fontSize: '0.75rem' }}>Lv.{metaResult.newLevel.level}/20</span>
                {prestigeBadge && <span style={{ fontSize: '1.2rem' }}>{prestigeBadge}</span>}
              </div>

              {/* Level up notification */}
              {metaResult.leveledUp && (
                <div style={{
                  background: 'rgba(46,204,113,0.15)', border: '1px solid #2ecc71',
                  borderRadius: 8, padding: '8px 12px', marginBottom: 12, textAlign: 'center',
                  color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '1rem',
                  animation: 'comboAppear 0.5s ease',
                }}>
                  🎉 LEVEL UP! Lv.{metaResult.oldLevel.level} → Lv.{metaResult.newLevel.level}
                  <GoldenBurst />
                </div>
              )}

              {/* New unlocks */}
              {metaResult.unlocksGained.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {metaResult.unlocksGained.map((u, i) => (
                    <div key={i} style={{
                      background: 'rgba(155,89,182,0.15)', border: '1px solid rgba(155,89,182,0.4)',
                      borderRadius: 6, padding: '6px 10px', marginBottom: 4, textAlign: 'center',
                      color: '#bb86fc', fontSize: '0.8rem',
                    }}>
                      🔓 {u}
                    </div>
                  ))}
                </div>
              )}

              {/* XP gained */}
              <div style={{ color: '#9b59b6', fontFamily: 'Bebas Neue', fontSize: '1.1rem', textAlign: 'center', marginBottom: 8 }}>
                +{metaResult.xpGained} Studio XP
              </div>

              {/* XP breakdown */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginBottom: 12 }}>
                {metaResult.breakdown.map((b, i) => (
                  <span key={i} style={{
                    fontSize: '0.65rem', color: '#888', background: 'rgba(255,255,255,0.05)',
                    padding: '2px 8px', borderRadius: 4,
                  }}>
                    {b.label}: +{b.xp}
                  </span>
                ))}
              </div>

              {/* XP progress bar */}
              {nextLvl && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#888', marginBottom: 4 }}>
                    <span>Lv.{metaResult.newLevel.level}</span>
                    <span>{xpProg.earned}/{xpProg.needed} XP</span>
                    <span>Lv.{nextLvl.level}</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                    <div style={{
                      background: 'linear-gradient(90deg, #9b59b6, #bb86fc)',
                      height: '100%', width: `${xpProg.progress * 100}%`,
                      borderRadius: 4, transition: 'width 1s ease',
                    }} />
                  </div>
                </div>
              )}
              {!nextLvl && (
                <div style={{ textAlign: 'center', color: '#ffd700', fontSize: '0.8rem', fontFamily: 'Bebas Neue' }}>
                  ✨ MAX LEVEL — STUDIO LEGEND ✨
                </div>
              )}

              {/* Prestige button */}
              {canPrestige() && !showPrestigeConfirm && (
                <button className="btn" onClick={() => setShowPrestigeConfirm(true)} style={{
                  marginTop: 8, background: 'rgba(255,215,0,0.15)', border: '1px solid #ffd700',
                  color: '#ffd700', padding: '8px 20px', fontSize: '0.85rem', cursor: 'pointer',
                  fontFamily: 'Bebas Neue', letterSpacing: 1, width: '100%',
                }}>
                  👑 PRESTIGE (Reset to Lv.1 for permanent badge + bonus)
                </button>
              )}
              {showPrestigeConfirm && (
                <div style={{
                  background: 'rgba(255,215,0,0.1)', border: '2px solid #ffd700',
                  borderRadius: 8, padding: '12px', marginTop: 8, textAlign: 'center',
                }}>
                  <div style={{ color: '#ffd700', fontSize: '0.85rem', marginBottom: 8 }}>
                    Reset to Level 1? You'll keep a permanent badge and +5% XP bonus.
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button className="btn" onClick={() => {
                      const result = performPrestige();
                      if (result.success) {
                        setMetaResult(prev => prev ? { ...prev, newLevel: getMetaLevel(0) } : prev);
                        setShowPrestigeConfirm(false);
                      }
                    }} style={{
                      background: 'rgba(255,215,0,0.2)', border: '1px solid #ffd700',
                      color: '#ffd700', padding: '6px 16px', cursor: 'pointer',
                    }}>
                      ✅ Prestige!
                    </button>
                    <button className="btn" onClick={() => setShowPrestigeConfirm(false)} style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid #666',
                      color: '#999', padding: '6px 16px', cursor: 'pointer',
                    }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Prestige count display */}
              {meta.prestigeCount > 0 && (
                <div style={{ textAlign: 'center', marginTop: 8, color: '#ffd700', fontSize: '0.75rem' }}>
                  {Array.from({ length: meta.prestigeCount }, (_, i) => getPrestigeBadgeEmoji(i + 1)).join(' ')} Prestige {meta.prestigeCount}/{5}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ─── DAILY/WEEKLY SCORE BREAKDOWN ─── */}
      {phase >= 3 && endTab === 'details' && (state.gameMode === 'daily' || state.gameMode === 'weekly') && (() => {
        const h = state.seasonHistory;
        const avgQuality = h.length > 0 ? Math.round(h.reduce((s, f) => s + f.quality, 0) / h.length) : 0;
        const dayNum = state.gameMode === 'daily' ? getDailyNumber() : getWeeklyNumber();
        const label = state.gameMode === 'daily' ? `Daily #${dayNum}` : `Weekly #${dayNum}`;
        const activeModNames = (state.activeModifiers || []).map(id => CHALLENGE_MODIFIERS.find(m => m.id === id)).filter(Boolean);
        const totalModMult = state.activeModifiers ? getCombinedModifierMultiplier(state.activeModifiers) : 1.0;
        const weeklyMult = state.gameMode === 'weekly' ? 1.5 : 1.0;
        const compactShare = `🎬 GREENLIGHT ${label}\n⭐ Score: ${score} | 🎥 ${h.length} Films | 💰 $${Math.round(state.totalEarnings)}M | 🏆 ${rank}-Rank\n${h.map(s => tierEmoji(s.tier, s.quality <= 0)).join('')}\ngreenlight-plum.vercel.app`;

        return (
          <div className="animate-slide-down" style={{
            background: state.gameMode === 'weekly' ? 'rgba(155,89,182,0.08)' : 'rgba(52,152,219,0.08)',
            border: `2px solid ${state.gameMode === 'weekly' ? 'rgba(155,89,182,0.3)' : 'rgba(52,152,219,0.3)'}`,
            borderRadius: 16, padding: '20px 24px', margin: '20px auto', maxWidth: 480, textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>📅</div>
            <div style={{ color: state.gameMode === 'weekly' ? '#9b59b6' : '#3498db', fontFamily: 'Bebas Neue', fontSize: '1.4rem', letterSpacing: 2 }}>
              {label}
            </div>

            {/* Score breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, margin: '16px 0', textAlign: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 8px' }}>
                <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.6rem' }}>{score}</div>
                <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase' }}>Score</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 8px' }}>
                <div style={{ color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '1.6rem' }}>{h.length}</div>
                <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase' }}>Films</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 8px' }}>
                <div style={{ color: '#f39c12', fontFamily: 'Bebas Neue', fontSize: '1.6rem' }}>${Math.round(state.totalEarnings)}M</div>
                <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase' }}>Box Office</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 8px' }}>
                <div style={{ color: '#3498db', fontFamily: 'Bebas Neue', fontSize: '1.6rem' }}>{avgQuality}</div>
                <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase' }}>Avg Quality</div>
              </div>
            </div>

            {/* Tier grid */}
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 12, fontSize: '1.4rem' }}>
              {h.map((s, i) => <span key={i}>{tierEmoji(s.tier, s.quality <= 0)}</span>)}
            </div>

            {/* Multiplier breakdown */}
            {(totalModMult > 1.0 || weeklyMult > 1.0 || challengeMultiplier > 1.0) && (
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                {challengeMultiplier > 1.0 && (
                  <span style={{ fontSize: '0.7rem', color: '#e67e22', background: 'rgba(230,126,34,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                    Challenge ×{challengeMultiplier}
                  </span>
                )}
                {weeklyMult > 1.0 && (
                  <span style={{ fontSize: '0.7rem', color: '#9b59b6', background: 'rgba(155,89,182,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                    Weekly ×{weeklyMult}
                  </span>
                )}
                {activeModNames.map(m => (
                  <span key={m!.id} style={{ fontSize: '0.7rem', color: '#f39c12', background: 'rgba(243,156,18,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                    {m!.emoji} {m!.name} ×{m!.scoreMultiplier}
                  </span>
                ))}
              </div>
            )}

            {/* Share button */}
            <button className="btn" onClick={() => {
              sfx.shareSnap();
              navigator.clipboard.writeText(compactShare).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }} style={{
              background: copied ? 'rgba(46,204,113,0.2)' : state.gameMode === 'weekly' ? 'rgba(155,89,182,0.15)' : 'rgba(52,152,219,0.15)',
              border: `1px solid ${copied ? '#2ecc71' : state.gameMode === 'weekly' ? '#9b59b6' : '#3498db'}`,
              color: copied ? '#2ecc71' : state.gameMode === 'weekly' ? '#9b59b6' : '#3498db',
              padding: '10px 28px', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.3s',
              fontFamily: 'Bebas Neue', letterSpacing: 1,
            }}>
              {copied ? '✅ Copied!' : `📋 Share ${state.gameMode === 'weekly' ? 'Weekly' : 'Daily'} Score`}
            </button>
          </div>
        );
      })()}

      {/* ─── DAILY RECAP ─── */}
      {phase >= 6 && endTab === 'details' && state.gameMode === 'daily' && (() => {
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
                  <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today</div>
                  <div style={{ color: aboveAvg ? '#2ecc71' : '#e74c3c', fontFamily: 'Bebas Neue', fontSize: '1.4rem' }}>{score}</div>
                </div>
                <div>
                  <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Avg</div>
                  <div style={{ color: '#3498db', fontFamily: 'Bebas Neue', fontSize: '1.4rem' }}>{dailyStats.avgScore}</div>
                </div>
                <div>
                  <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Best Daily</div>
                  <div style={{ color: '#f39c12', fontFamily: 'Bebas Neue', fontSize: '1.4rem' }}>{dailyStats.bestScore}</div>
                </div>
                <div>
                  <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Streak</div>
                  <div style={{ color: '#f39c12', fontFamily: 'Bebas Neue', fontSize: '1.4rem' }}>🔥 {unlocks.dailyStreak.current}</div>
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 6, justifyContent: 'center', color: '#999', fontSize: '0.65rem' }}>
                <span>{dailyStats.totalDailyRuns} dailies played</span>
                <span>·</span>
                <span>{dailyStats.winRate}% win rate</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── PERSONAL BESTS ─── */}
      {phase >= 6 && endTab === 'details' && (() => {
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
      {phase >= 4 && (endTab === 'overview' || endTab === 'details') && !isVictory && history.length > 0 && (() => {
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

      {/* ─── WORLD EVENTS HISTORY ─── */}
      {phase >= 6 && endTab === 'details' && (state.worldEventHistory.length > 0 || state.activeWorldEvents.length > 0) && (
        <div className="animate-slide-down" style={{ marginTop: 20 }}>
          <h3 style={{ color: '#a855f7', marginBottom: 10, letterSpacing: 1 }}>📰 WORLD EVENTS</h3>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 520, margin: '0 auto',
          }}>
            {[...state.worldEventHistory, ...state.activeWorldEvents].map((e, i) => (
              <div key={`${e.id}-${i}`} style={{
                background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)',
                borderRadius: 8, padding: '8px 12px', fontSize: '0.75rem', maxWidth: 240,
              }}>
                <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>
                  {e.emoji} {e.name}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                  S{e.startSeason}–S{e.endSeason} · {e.category}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── CAREER NARRATIVE ─── */}
      {phase >= 6 && endTab === 'details' && (
        <div className="animate-slide-down" style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: '16px 20px', margin: '20px auto', maxWidth: 520,
          color: '#999', fontSize: 'clamp(0.75rem, 2vw, 0.85rem)', lineHeight: 1.6, fontStyle: 'italic',
        }}>
          {careerSummary}
        </div>
      )}

      {/* ─── SHARE BLOCK ─── */}
      {phase >= 7 && (
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
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <button className="btn" onClick={handleCopy} style={{
              background: copied ? 'rgba(46,204,113,0.2)' : 'rgba(212,168,67,0.15)',
              border: `1px solid ${copied ? '#2ecc71' : 'var(--gold-dim)'}`,
              color: copied ? '#2ecc71' : '#d4a843',
              padding: '8px 24px', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.3s',
            }}>
              {copied ? '✅ Copied!' : '📋 Copy to Clipboard'}
            </button>
            <button className="btn" onClick={() => { sfx.shareSnap(); setShowShareCard(true); }} style={{
              background: 'linear-gradient(135deg, rgba(212,168,67,0.2), rgba(155,89,182,0.15))',
              border: '2px solid rgba(212,168,67,0.5)',
              color: '#d4a843',
              padding: '8px 24px', fontSize: '0.85rem', cursor: 'pointer',
              fontFamily: 'Bebas Neue', letterSpacing: 1,
              animation: 'comboAppear 0.5s ease',
            }}>
              📸 Share Card
            </button>
          </div>
        </div>
      )}

      {/* ─── SHARE CARD MODAL ─── */}
      {showShareCard && <ShareCard data={shareData} onClose={() => setShowShareCard(false)} />}

      {/* ─── TRADING CARDS ─── */}
      {phase >= 7 && endTab === 'progression' && newCardIds.length > 0 && (
        <div className="animate-slide-down" style={{ marginTop: 24 }}>
          <h3 style={{ color: 'var(--gold)', marginBottom: 12, letterSpacing: 1 }}>🃏 NEW TRADING CARDS</h3>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {newCardIds.map(id => {
              const card = TRADING_CARDS.find(c => c.id === id);
              if (!card) return null;
              const rarity = RARITY_CONFIG[card.rarity];
              return (
                <div key={id} className={card.rarity === 'legendary' ? 'trading-card-holo' : ''} style={{
                  width: 130, padding: '12px 10px', textAlign: 'center',
                  background: `linear-gradient(135deg, ${rarity.bgGlow}, rgba(0,0,0,0.6))`,
                  border: `2px solid ${rarity.borderColor}`,
                  borderRadius: 10, animation: 'comboAppear 0.5s ease',
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>🃏</div>
                  <div style={{ color: rarity.color, fontFamily: 'Bebas Neue', fontSize: '0.85rem', letterSpacing: 1 }}>
                    {card.name}
                  </div>
                  <div style={{ color: rarity.color, fontSize: '0.6rem', textTransform: 'uppercase', opacity: 0.7 }}>
                    {rarity.label}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ color: '#888', fontSize: '0.7rem', marginTop: 8 }}>
            {(() => { const p = getCollectionProgress(); return `Collection: ${p.collected}/${p.total}`; })()}
          </div>
        </div>
      )}

      {/* ─── LIFETIME STATS SUMMARY ─── */}
      {phase >= 7 && endTab === 'progression' && <EndScreenStatsSummary />}

      {/* ─── PLAY AGAIN ─── */}
      {phase >= 7 && (
        <div className="btn-group animate-slide-down" style={{ marginTop: 36 }}>
          <button className="btn btn-primary btn-glow" onClick={() => startGame()}>
            🎬 BACK TO THE DIRECTOR'S CHAIR
          </button>
          <button className="btn" style={{ marginLeft: 12 }} onClick={() => setShowReplayViewer(true)}>
            🎬 View Replays
          </button>
        </div>
      )}

      {/* R211: Replay Viewer */}
      {showReplayViewer && <ReplayViewer onClose={() => setShowReplayViewer(false)} />}

      {/* R187: Trading card toast queue */}
      {newCardIds.length > 0 && phase >= 5 && (
        <TradingCardToast
          cardId={newCardIds[0]}
          onDone={() => setNewCardIds(prev => prev.slice(1))}
        />
      )}
    </div>
  );
}
