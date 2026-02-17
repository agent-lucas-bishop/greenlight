// Personal Bests — track and display records per challenge mode and overall

const PB_KEY = 'greenlight_personal_bests';

export interface PersonalBests {
  overall: PersonalBestRecord;
  daily: PersonalBestRecord;
  modes: Record<string, PersonalBestRecord>; // keyed by challengeId or mode
  dailyHistory: DailyHistoryEntry[];
}

export interface PersonalBestRecord {
  bestScore: number;
  bestScoreDate: string;
  bestEarnings: number;
  bestEarningsDate: string;
  mostFilms: number;
  mostFilmsDate: string;
  highestSingleFilmBO: number;
  highestSingleFilmTitle: string;
  highestSingleFilmDate: string;
  fastestWin: number | null; // seasons to win (null = never won)
  fastestWinDate: string;
  totalRuns: number;
}

export interface DailyHistoryEntry {
  date: string; // YYYY-MM-DD
  score: number;
  earnings: number;
  films: number;
  won: boolean;
  rank: string;
  modifiers: string[]; // modifier names active that day
}

function defaultRecord(): PersonalBestRecord {
  return {
    bestScore: 0, bestScoreDate: '',
    bestEarnings: 0, bestEarningsDate: '',
    mostFilms: 0, mostFilmsDate: '',
    highestSingleFilmBO: 0, highestSingleFilmTitle: '', highestSingleFilmDate: '',
    fastestWin: null, fastestWinDate: '',
    totalRuns: 0,
  };
}

export function getPersonalBests(): PersonalBests {
  try {
    const saved = localStorage.getItem(PB_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        overall: { ...defaultRecord(), ...(parsed.overall || {}) },
        daily: { ...defaultRecord(), ...(parsed.daily || {}) },
        modes: parsed.modes || {},
        dailyHistory: parsed.dailyHistory || [],
      };
    }
  } catch {}
  return { overall: defaultRecord(), daily: defaultRecord(), modes: {}, dailyHistory: [] };
}

function savePersonalBests(pb: PersonalBests) {
  try {
    // Keep only last 60 daily history entries
    if (pb.dailyHistory.length > 60) {
      pb.dailyHistory = pb.dailyHistory.slice(-60);
    }
    localStorage.setItem(PB_KEY, JSON.stringify(pb));
  } catch {}
}

function updateRecord(record: PersonalBestRecord, data: {
  score: number;
  earnings: number;
  films: number;
  won: boolean;
  highestFilmBO: number;
  highestFilmTitle: string;
  date: string;
}): PersonalBestRecord {
  const r = { ...record };
  r.totalRuns++;
  if (data.score > r.bestScore) { r.bestScore = data.score; r.bestScoreDate = data.date; }
  if (data.earnings > r.bestEarnings) { r.bestEarnings = data.earnings; r.bestEarningsDate = data.date; }
  if (data.films > r.mostFilms) { r.mostFilms = data.films; r.mostFilmsDate = data.date; }
  if (data.highestFilmBO > r.highestSingleFilmBO) {
    r.highestSingleFilmBO = data.highestFilmBO;
    r.highestSingleFilmTitle = data.highestFilmTitle;
    r.highestSingleFilmDate = data.date;
  }
  if (data.won && (r.fastestWin === null || data.films < r.fastestWin)) {
    r.fastestWin = data.films;
    r.fastestWinDate = data.date;
  }
  return r;
}

export function recordPersonalBests(data: {
  score: number;
  earnings: number;
  films: { title: string; boxOffice: number }[];
  won: boolean;
  mode: string;
  challengeId?: string;
  dailySeed?: string;
  modifierNames?: string[];
  rank: string;
}) {
  const pb = getPersonalBests();
  const date = new Date().toISOString().slice(0, 10);
  const bestFilm = data.films.reduce((a, b) => b.boxOffice > a.boxOffice ? b : a, data.films[0] || { title: '', boxOffice: 0 });
  const common = {
    score: data.score,
    earnings: data.earnings,
    films: data.films.length,
    won: data.won,
    highestFilmBO: bestFilm.boxOffice,
    highestFilmTitle: bestFilm.title,
    date,
  };

  pb.overall = updateRecord(pb.overall, common);

  // Mode-specific
  const modeKey = data.challengeId || data.mode;
  if (!pb.modes[modeKey]) pb.modes[modeKey] = defaultRecord();
  pb.modes[modeKey] = updateRecord(pb.modes[modeKey], common);

  // Daily-specific
  if (data.dailySeed) {
    pb.daily = updateRecord(pb.daily, common);
    pb.dailyHistory.push({
      date: data.dailySeed,
      score: data.score,
      earnings: data.earnings,
      films: data.films.length,
      won: data.won,
      rank: data.rank,
      modifiers: data.modifierNames || [],
    });
  }

  savePersonalBests(pb);
}

export function getDailyStats(): {
  avgScore: number;
  bestScore: number;
  totalDailyRuns: number;
  winRate: number;
  recentHistory: DailyHistoryEntry[];
} {
  const pb = getPersonalBests();
  const history = pb.dailyHistory;
  if (history.length === 0) {
    return { avgScore: 0, bestScore: 0, totalDailyRuns: 0, winRate: 0, recentHistory: [] };
  }
  const totalScore = history.reduce((s, h) => s + h.score, 0);
  const wins = history.filter(h => h.won).length;
  return {
    avgScore: Math.round(totalScore / history.length),
    bestScore: pb.daily.bestScore,
    totalDailyRuns: history.length,
    winRate: Math.round((wins / history.length) * 100),
    recentHistory: history.slice(-10),
  };
}
