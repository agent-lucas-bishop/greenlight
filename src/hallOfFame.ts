// Hall of Fame — persistent best-ever stats across all runs

export interface HallOfFameStats {
  highestSingleFilmGross: { value: number; filmTitle: string; genre: string; runDate: string } | null;
  longestWinStreak: { value: number; runDate: string } | null;
  mostFilmsInOneRun: { value: number; studioName: string; runDate: string } | null;
  highestQualityFilm: { value: number; filmTitle: string; genre: string; runDate: string } | null;
  bestRankAchieved: { rank: string; score: number; studioName: string; runDate: string } | null;
  longestRunSeasons: { value: number; studioName: string; runDate: string } | null;
  highestTotalGross: { value: number; studioName: string; runDate: string } | null;
}

const HOF_KEY = 'greenlight_hall_of_fame';

export function getHallOfFame(): HallOfFameStats {
  try {
    const saved = localStorage.getItem(HOF_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    highestSingleFilmGross: null,
    longestWinStreak: null,
    mostFilmsInOneRun: null,
    highestQualityFilm: null,
    bestRankAchieved: null,
    longestRunSeasons: null,
    highestTotalGross: null,
  };
}

function saveHallOfFame(stats: HallOfFameStats) {
  try {
    localStorage.setItem(HOF_KEY, JSON.stringify(stats));
  } catch {}
}

const RANK_ORDER: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1, F: 0 };

export interface RunEndData {
  studioName: string;
  date: string;
  rank: string;
  score: number;
  seasons: number;
  totalGross: number;
  films: { title: string; genre: string; quality: number; boxOffice: number; tier: string }[];
}

export function updateHallOfFame(data: RunEndData): string[] {
  const hof = getHallOfFame();
  const newRecords: string[] = [];

  // Highest single film gross
  for (const f of data.films) {
    if (!hof.highestSingleFilmGross || f.boxOffice > hof.highestSingleFilmGross.value) {
      hof.highestSingleFilmGross = { value: f.boxOffice, filmTitle: f.title, genre: f.genre, runDate: data.date };
      newRecords.push('Highest Single-Film Gross');
    }
  }

  // Highest quality film
  for (const f of data.films) {
    if (!hof.highestQualityFilm || f.quality > hof.highestQualityFilm.value) {
      hof.highestQualityFilm = { value: f.quality, filmTitle: f.title, genre: f.genre, runDate: data.date };
      newRecords.push('Highest Quality Film');
    }
  }

  // Longest win streak (consecutive hits in one run)
  let streak = 0, maxStreak = 0;
  for (const f of data.films) {
    if (f.tier !== 'FLOP') { streak++; maxStreak = Math.max(maxStreak, streak); }
    else streak = 0;
  }
  if (maxStreak > 0 && (!hof.longestWinStreak || maxStreak > hof.longestWinStreak.value)) {
    hof.longestWinStreak = { value: maxStreak, runDate: data.date };
    newRecords.push('Longest Win Streak');
  }

  // Most films in one run
  if (!hof.mostFilmsInOneRun || data.films.length > hof.mostFilmsInOneRun.value) {
    hof.mostFilmsInOneRun = { value: data.films.length, studioName: data.studioName, runDate: data.date };
    newRecords.push('Most Films in One Run');
  }

  // Best rank achieved
  if (!hof.bestRankAchieved || (RANK_ORDER[data.rank] || 0) > (RANK_ORDER[hof.bestRankAchieved.rank] || 0) ||
      ((RANK_ORDER[data.rank] || 0) === (RANK_ORDER[hof.bestRankAchieved.rank] || 0) && data.score > hof.bestRankAchieved.score)) {
    hof.bestRankAchieved = { rank: data.rank, score: data.score, studioName: data.studioName, runDate: data.date };
    newRecords.push('Best Overall Rank');
  }

  // Longest run (seasons)
  if (!hof.longestRunSeasons || data.seasons > hof.longestRunSeasons.value) {
    hof.longestRunSeasons = { value: data.seasons, studioName: data.studioName, runDate: data.date };
    newRecords.push('Longest Run');
  }

  // Highest total gross
  if (!hof.highestTotalGross || data.totalGross > hof.highestTotalGross.value) {
    hof.highestTotalGross = { value: data.totalGross, studioName: data.studioName, runDate: data.date };
    newRecords.push('Highest Total Gross');
  }

  saveHallOfFame(hof);
  return newRecords;
}
