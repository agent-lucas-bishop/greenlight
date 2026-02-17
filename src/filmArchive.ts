// Film Archive — permanent collection of every film ever produced across all runs

export interface ArchiveFilm {
  id: string;
  title: string;
  genre: string;
  quality: number;
  tier: string; // FLOP | HIT | SMASH | BLOCKBUSTER
  boxOffice: number;
  cast: string[];
  runNumber: number;
  runDate: string; // ISO date
  season: number;
  studioName?: string;
  archetype?: string;
  notes: string[]; // e.g. "Extended Cut", "Director's Vision met", "Had reshoots"
}

const ARCHIVE_KEY = 'greenlight_film_archive';

export function getFilmArchive(): ArchiveFilm[] {
  try {
    const saved = localStorage.getItem(ARCHIVE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function saveArchive(archive: ArchiveFilm[]): void {
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
  } catch {}
}

export function addFilmToArchive(film: Omit<ArchiveFilm, 'id'>): void {
  const archive = getFilmArchive();
  const id = `film_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  archive.push({ ...film, id });
  saveArchive(archive);
}

export function getArchiveCount(): number {
  return getFilmArchive().length;
}

export const MILESTONE_THRESHOLDS = [10, 25, 50, 100, 250] as const;

export function getEarnedMilestones(count: number): number[] {
  return MILESTONE_THRESHOLDS.filter(t => count >= t);
}

/** Get the current run number based on leaderboard history */
export function getCurrentRunNumber(): number {
  try {
    const lb = localStorage.getItem('greenlight_leaderboard');
    if (lb) return JSON.parse(lb).length + 1;
  } catch {}
  return 1;
}
