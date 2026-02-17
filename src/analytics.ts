// Lightweight localStorage analytics for dev insights
// Toggle Dev Stats panel: Ctrl+Shift+D

const ANALYTICS_KEY = 'greenlight_analytics';

export interface AnalyticsData {
  runsStarted: number;
  runsCompleted: number;
  runsWon: number;
  totalScore: number;
  talentPicks: Record<string, number>;    // talent name → pick count
  challengeUses: Record<string, number>;  // challenge id → use count
  archetypePicks: Record<string, number>; // archetype id → pick count
  runDurations: number[];                 // ms per completed run
  scores: number[];
  genrePicks: Record<string, number>;
  sessionStart: number | null;            // timestamp of current run start
  // R282: Enhanced analytics
  sessionsLog: { start: number; end: number }[];  // session start/end times
  decisionsPerRun: number[];              // decisions made per run
  cardsDrawnPerRun: number[];             // cards drawn per run
  cardsPlayedPerRun: number[];            // cards played per run
  earningsPerSeason: number[][];          // earnings per season per run
  qualityPerRun: number[][];              // quality per season per run
}

function defaultData(): AnalyticsData {
  return {
    runsStarted: 0,
    runsCompleted: 0,
    runsWon: 0,
    totalScore: 0,
    talentPicks: {},
    challengeUses: {},
    archetypePicks: {},
    runDurations: [],
    scores: [],
    genrePicks: {},
    sessionStart: null,
    sessionsLog: [],
    decisionsPerRun: [],
    cardsDrawnPerRun: [],
    cardsPlayedPerRun: [],
    earningsPerSeason: [],
    qualityPerRun: [],
  };
}

function load(): AnalyticsData {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    if (raw) return { ...defaultData(), ...JSON.parse(raw) };
  } catch {}
  return defaultData();
}

function save(data: AnalyticsData) {
  try { localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data)); } catch {}
}

// Generic track function for arbitrary events
export function track(event: string, _data?: Record<string, unknown>) {
  // Lightweight — just log to console in dev, no persistence needed for ad-hoc events
  if (typeof console !== 'undefined') console.debug('[analytics]', event, _data || '');
}

export function trackRunStart(mode: string, challengeId?: string, archetypeId?: string) {
  const d = load();
  d.runsStarted++;
  d.sessionStart = Date.now();
  if (challengeId) d.challengeUses[challengeId] = (d.challengeUses[challengeId] || 0) + 1;
  if (archetypeId) d.archetypePicks[archetypeId] = (d.archetypePicks[archetypeId] || 0) + 1;
  save(d);
}

export function trackTalentPick(talentName: string) {
  const d = load();
  d.talentPicks[talentName] = (d.talentPicks[talentName] || 0) + 1;
  save(d);
}

export function trackGenrePick(genre: string) {
  const d = load();
  d.genrePicks[genre] = (d.genrePicks[genre] || 0) + 1;
  save(d);
}

export function trackRunEnd(score: number, won: boolean, extra?: {
  decisions?: number;
  cardsDrawn?: number;
  cardsPlayed?: number;
  earningsPerSeason?: number[];
  qualityPerSeason?: number[];
}) {
  const d = load();
  d.runsCompleted++;
  if (won) d.runsWon++;
  d.totalScore += score;
  d.scores.push(score);
  if (d.sessionStart) {
    const end = Date.now();
    d.runDurations.push(end - d.sessionStart);
    // R282: Log session times
    if (!d.sessionsLog) d.sessionsLog = [];
    d.sessionsLog.push({ start: d.sessionStart, end });
    if (d.sessionsLog.length > 100) d.sessionsLog = d.sessionsLog.slice(-100);
    d.sessionStart = null;
  }
  // R282: Enhanced per-run tracking
  if (extra) {
    if (!d.decisionsPerRun) d.decisionsPerRun = [];
    if (!d.cardsDrawnPerRun) d.cardsDrawnPerRun = [];
    if (!d.cardsPlayedPerRun) d.cardsPlayedPerRun = [];
    if (!d.earningsPerSeason) d.earningsPerSeason = [];
    if (!d.qualityPerRun) d.qualityPerRun = [];
    if (extra.decisions != null) d.decisionsPerRun.push(extra.decisions);
    if (extra.cardsDrawn != null) d.cardsDrawnPerRun.push(extra.cardsDrawn);
    if (extra.cardsPlayed != null) d.cardsPlayedPerRun.push(extra.cardsPlayed);
    if (extra.earningsPerSeason) d.earningsPerSeason.push(extra.earningsPerSeason);
    if (extra.qualityPerSeason) d.qualityPerRun.push(extra.qualityPerSeason);
    // Cap arrays at 100
    if (d.decisionsPerRun.length > 100) d.decisionsPerRun = d.decisionsPerRun.slice(-100);
    if (d.cardsDrawnPerRun.length > 100) d.cardsDrawnPerRun = d.cardsDrawnPerRun.slice(-100);
    if (d.cardsPlayedPerRun.length > 100) d.cardsPlayedPerRun = d.cardsPlayedPerRun.slice(-100);
    if (d.earningsPerSeason.length > 100) d.earningsPerSeason = d.earningsPerSeason.slice(-100);
    if (d.qualityPerRun.length > 100) d.qualityPerRun = d.qualityPerRun.slice(-100);
  }
  save(d);
}

export function getAnalytics(): AnalyticsData {
  return load();
}

// Derived stats for the dev panel
export function getDevStats() {
  const d = load();
  const avgScore = d.scores.length > 0 ? Math.round(d.totalScore / d.scores.length) : 0;
  const avgDuration = d.runDurations.length > 0
    ? Math.round(d.runDurations.reduce((a, b) => a + b, 0) / d.runDurations.length / 1000)
    : 0;

  const topTalent = Object.entries(d.talentPicks).sort((a, b) => b[1] - a[1])[0];
  const topChallenge = Object.entries(d.challengeUses).sort((a, b) => b[1] - a[1])[0];
  const topArchetype = Object.entries(d.archetypePicks).sort((a, b) => b[1] - a[1])[0];
  const topGenre = Object.entries(d.genrePicks).sort((a, b) => b[1] - a[1])[0];

  return {
    runsStarted: d.runsStarted,
    runsCompleted: d.runsCompleted,
    runsWon: d.runsWon,
    winRate: d.runsCompleted > 0 ? `${Math.round((d.runsWon / d.runsCompleted) * 100)}%` : '—',
    avgScore,
    avgDurationMin: avgDuration > 0 ? `${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s` : '—',
    topTalent: topTalent ? `${topTalent[0]} (×${topTalent[1]})` : '—',
    topChallenge: topChallenge ? `${topChallenge[0]} (×${topChallenge[1]})` : '—',
    topArchetype: topArchetype ? `${topArchetype[0]} (×${topArchetype[1]})` : '—',
    topGenre: topGenre ? `${topGenre[0]} (×${topGenre[1]})` : '—',
    totalRuns: d.runsStarted,
    completionRate: d.runsStarted > 0 ? `${Math.round((d.runsCompleted / d.runsStarted) * 100)}%` : '—',
  };
}
