// Career Analytics — persistent stats across ALL runs
// Stored separately from game save so stats survive save wipes
// Key: greenlight_career_analytics

const CAREER_KEY = 'greenlight_career_analytics';

export interface CareerAnalyticsData {
  // Core counters
  totalFilmsProduced: number;
  totalBoxOfficeEarned: number;
  totalRunsCompleted: number;
  totalRunsWon: number;
  totalTalentHired: number;

  // Records
  bestSingleFilmBO: number;
  bestSingleFilmTitle: string;
  bestSingleRunBO: number;
  bestSingleRunDate: string;
  highestPrestigeReached: number;
  longestWinStreak: number;
  currentWinStreak: number;
  highestQualityFilm: number;
  highestQualityTitle: string;

  // Talent tracking
  talentHireCounts: Record<string, number>; // talent name -> hire count

  // Genre tracking (film counts for mastery milestones)
  genreFilmCounts: Record<string, number>; // genre -> total films

  // Genre profitability
  genreBoxOffice: Record<string, number>; // genre -> total BO

  // Session/time tracking
  totalPlayTimeMs: number;
  sessionStartTime: number | null;

  // Run-level tracking for averages
  allRunBOs: number[]; // box office per run (for averages)
  allRunScores: number[]; // scores per run
  allRunFilmCounts: number[]; // films per run

  // Archetype tracking
  archetypeWins: Record<string, number>;
  archetypeRuns: Record<string, number>;
}

function defaultData(): CareerAnalyticsData {
  return {
    totalFilmsProduced: 0,
    totalBoxOfficeEarned: 0,
    totalRunsCompleted: 0,
    totalRunsWon: 0,
    totalTalentHired: 0,
    bestSingleFilmBO: 0,
    bestSingleFilmTitle: '',
    bestSingleRunBO: 0,
    bestSingleRunDate: '',
    highestPrestigeReached: 0,
    longestWinStreak: 0,
    currentWinStreak: 0,
    highestQualityFilm: 0,
    highestQualityTitle: '',
    talentHireCounts: {},
    genreFilmCounts: {},
    genreBoxOffice: {},
    totalPlayTimeMs: 0,
    sessionStartTime: null,
    allRunBOs: [],
    allRunScores: [],
    allRunFilmCounts: [],
    archetypeWins: {},
    archetypeRuns: {},
  };
}

function load(): CareerAnalyticsData {
  try {
    const raw = localStorage.getItem(CAREER_KEY);
    if (raw) return { ...defaultData(), ...JSON.parse(raw) };
  } catch {}
  return defaultData();
}

function save(data: CareerAnalyticsData) {
  try { localStorage.setItem(CAREER_KEY, JSON.stringify(data)); } catch {}
}

export function getCareerAnalytics(): CareerAnalyticsData {
  return load();
}

// Call when a run starts
export function careerSessionStart() {
  const d = load();
  d.sessionStartTime = Date.now();
  save(d);
}

// Call when talent is hired during a run
export function careerTrackTalentHire(talentName: string) {
  const d = load();
  d.totalTalentHired++;
  d.talentHireCounts[talentName] = (d.talentHireCounts[talentName] || 0) + 1;
  save(d);
}

// Call when a film is completed (at release screen)
export function careerTrackFilmComplete(film: {
  title: string;
  genre: string;
  boxOffice: number;
  quality: number;
}) {
  const d = load();
  d.totalFilmsProduced++;
  d.totalBoxOfficeEarned += film.boxOffice;
  d.genreFilmCounts[film.genre] = (d.genreFilmCounts[film.genre] || 0) + 1;
  d.genreBoxOffice[film.genre] = (d.genreBoxOffice[film.genre] || 0) + film.boxOffice;
  if (film.boxOffice > d.bestSingleFilmBO) {
    d.bestSingleFilmBO = film.boxOffice;
    d.bestSingleFilmTitle = film.title;
  }
  if (film.quality > d.highestQualityFilm) {
    d.highestQualityFilm = film.quality;
    d.highestQualityTitle = film.title;
  }
  save(d);
}

// Call when a run ends
export function careerTrackRunEnd(run: {
  totalBO: number;
  score: number;
  filmCount: number;
  won: boolean;
  archetype: string;
  prestigeLevel: number;
}) {
  const d = load();
  d.totalRunsCompleted++;
  if (run.won) {
    d.totalRunsWon++;
    d.currentWinStreak++;
    if (d.currentWinStreak > d.longestWinStreak) {
      d.longestWinStreak = d.currentWinStreak;
    }
  } else {
    d.currentWinStreak = 0;
  }
  if (run.totalBO > d.bestSingleRunBO) {
    d.bestSingleRunBO = run.totalBO;
    d.bestSingleRunDate = new Date().toISOString().slice(0, 10);
  }
  if (run.prestigeLevel > d.highestPrestigeReached) {
    d.highestPrestigeReached = run.prestigeLevel;
  }
  // Session time
  if (d.sessionStartTime) {
    d.totalPlayTimeMs += Date.now() - d.sessionStartTime;
    d.sessionStartTime = null;
  }
  // Run-level arrays (cap at 100 entries)
  d.allRunBOs.push(run.totalBO);
  d.allRunScores.push(run.score);
  d.allRunFilmCounts.push(run.filmCount);
  if (d.allRunBOs.length > 100) d.allRunBOs = d.allRunBOs.slice(-100);
  if (d.allRunScores.length > 100) d.allRunScores = d.allRunScores.slice(-100);
  if (d.allRunFilmCounts.length > 100) d.allRunFilmCounts = d.allRunFilmCounts.slice(-100);
  // Archetype
  d.archetypeRuns[run.archetype] = (d.archetypeRuns[run.archetype] || 0) + 1;
  if (run.won) d.archetypeWins[run.archetype] = (d.archetypeWins[run.archetype] || 0) + 1;
  save(d);
}

// Derived stats
export function getCareerAverages() {
  const d = load();
  const avgBO = d.allRunBOs.length > 0 ? d.allRunBOs.reduce((a, b) => a + b, 0) / d.allRunBOs.length : 0;
  const avgScore = d.allRunScores.length > 0 ? d.allRunScores.reduce((a, b) => a + b, 0) / d.allRunScores.length : 0;
  const avgFilms = d.allRunFilmCounts.length > 0 ? d.allRunFilmCounts.reduce((a, b) => a + b, 0) / d.allRunFilmCounts.length : 0;
  return { avgBO, avgScore, avgFilms };
}

export function getFavoriteTalent(): { name: string; count: number } | null {
  const d = load();
  const entries = Object.entries(d.talentHireCounts);
  if (entries.length === 0) return null;
  const [name, count] = entries.sort((a, b) => b[1] - a[1])[0];
  return { name, count };
}

export function getFavoriteGenre(): { genre: string; count: number } | null {
  const d = load();
  const entries = Object.entries(d.genreFilmCounts);
  if (entries.length === 0) return null;
  const [genre, count] = entries.sort((a, b) => b[1] - a[1])[0];
  return { genre, count };
}

export function getMostProfitableGenre(): { genre: string; avgBO: number } | null {
  const d = load();
  const entries = Object.entries(d.genreBoxOffice);
  if (entries.length === 0) return null;
  const withAvg = entries.map(([genre, totalBO]) => ({
    genre,
    avgBO: (d.genreFilmCounts[genre] || 1) > 0 ? totalBO / (d.genreFilmCounts[genre] || 1) : 0,
  }));
  return withAvg.sort((a, b) => b.avgBO - a.avgBO)[0];
}

export function formatPlayTime(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${Math.max(1, totalMin)}m`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return `${hours}h ${mins}m`;
}

// Genre film count milestones
export const GENRE_FILM_MILESTONES = [
  { count: 5, label: 'Genre Fan', emoji: '🎬' },
  { count: 10, label: 'Genre Specialist', emoji: '⭐' },
  { count: 25, label: 'Genre Master', emoji: '👑' },
  { count: 50, label: 'Genre Legend', emoji: '🏆' },
  { count: 100, label: 'Genre Immortal', emoji: '💎' },
];

export function getGenreFilmMilestone(count: number): typeof GENRE_FILM_MILESTONES[0] | null {
  let best: typeof GENRE_FILM_MILESTONES[0] | null = null;
  for (const m of GENRE_FILM_MILESTONES) {
    if (count >= m.count) best = m;
  }
  return best;
}

export function getNextGenreFilmMilestone(count: number): typeof GENRE_FILM_MILESTONES[0] | null {
  return GENRE_FILM_MILESTONES.find(m => m.count > count) || null;
}

// Backfill from existing data (call once to migrate existing stats)
export function backfillFromExistingData() {
  const d = load();
  if (d.totalRunsCompleted > 0) return; // already has data

  // Try to backfill from leaderboard
  try {
    const lb = JSON.parse(localStorage.getItem('greenlight_leaderboard') || '[]');
    if (lb.length === 0) return;

    let winStreak = 0;
    let maxWinStreak = 0;
    for (const entry of lb) {
      d.totalRunsCompleted++;
      if (entry.won) {
        d.totalRunsWon++;
        winStreak++;
        if (winStreak > maxWinStreak) maxWinStreak = winStreak;
      } else {
        winStreak = 0;
      }
      d.allRunBOs.push(entry.earnings || 0);
      d.allRunScores.push(entry.score || 0);
      d.allRunFilmCounts.push(entry.seasons || 0);
      if ((entry.earnings || 0) > d.bestSingleRunBO) {
        d.bestSingleRunBO = entry.earnings;
        d.bestSingleRunDate = entry.date || '';
      }
      if (entry.archetype) {
        d.archetypeRuns[entry.archetype] = (d.archetypeRuns[entry.archetype] || 0) + 1;
        if (entry.won) d.archetypeWins[entry.archetype] = (d.archetypeWins[entry.archetype] || 0) + 1;
      }
      for (const film of (entry.films || [])) {
        d.totalFilmsProduced++;
        const bo = film.boxOffice || 0;
        d.totalBoxOfficeEarned += bo;
        d.genreFilmCounts[film.genre] = (d.genreFilmCounts[film.genre] || 0) + 1;
        d.genreBoxOffice[film.genre] = (d.genreBoxOffice[film.genre] || 0) + bo;
        if (bo > d.bestSingleFilmBO) {
          d.bestSingleFilmBO = bo;
          d.bestSingleFilmTitle = film.title || '';
        }
      }
    }
    d.longestWinStreak = maxWinStreak;
    d.currentWinStreak = winStreak;

    // Backfill from analytics talent picks
    try {
      const analytics = JSON.parse(localStorage.getItem('greenlight_analytics') || '{}');
      if (analytics.talentPicks) {
        d.talentHireCounts = { ...analytics.talentPicks };
        d.totalTalentHired = Object.values(analytics.talentPicks as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
      }
      if (analytics.runDurations) {
        d.totalPlayTimeMs = (analytics.runDurations as number[]).reduce((a: number, b: number) => a + b, 0);
      }
    } catch {}

    // Backfill prestige
    try {
      const prestige = JSON.parse(localStorage.getItem('greenlight_prestige') || '{}');
      if (prestige.xp) {
        // Approximate level from XP (levels need 100 XP each roughly)
        d.highestPrestigeReached = Math.floor((prestige.xp || 0) / 100);
      }
    } catch {}

    save(d);
  } catch {}
}
