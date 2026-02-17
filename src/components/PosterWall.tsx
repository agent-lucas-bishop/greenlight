/**
 * R309: Poster Wall — gallery of all film posters across all runs.
 * Accessible from main menu. Shows a grid of procedurally generated posters.
 */

import { useState, useMemo } from 'react';
import { getLeaderboard } from '../leaderboard';
import { generatePosterSeed } from '../directorCommentary';
import FilmPoster from './FilmPoster';
import type { Genre, RewardTier } from '../types';

interface ArchivedFilm {
  title: string;
  genre: Genre;
  tier: RewardTier;
  quality: number;
  boxOffice: number;
  season: number;
  nominated: boolean;
  seed: number;
  runDate: string;
  studioName?: string;
  commentary?: string;
}

function getAllFilms(): ArchivedFilm[] {
  const lb = getLeaderboard();
  const films: ArchivedFilm[] = [];
  for (const entry of lb) {
    for (const f of entry.films) {
      films.push({
        title: f.title,
        genre: (f.genre || 'Drama') as Genre,
        tier: (f.tier || 'HIT') as RewardTier,
        quality: f.quality || 0,
        boxOffice: f.boxOffice || 0,
        season: f.season || 1,
        nominated: f.nominated || false,
        seed: generatePosterSeed(f.title, (f.genre || 'Drama') as Genre, f.season || 1),
        runDate: entry.date,
        studioName: entry.studioName,
      });
    }
  }
  return films;
}

type SortMode = 'recent' | 'boxOffice' | 'quality' | 'genre';
type FilterGenre = 'all' | Genre;
type FilterTier = 'all' | RewardTier;

export default function PosterWall({ onClose, inline }: { onClose?: () => void; inline?: boolean }) {
  const [sort, setSort] = useState<SortMode>('recent');
  const [filterGenre, setFilterGenre] = useState<FilterGenre>('all');
  const [filterTier, setFilterTier] = useState<FilterTier>('all');
  const [selectedFilm, setSelectedFilm] = useState<ArchivedFilm | null>(null);

  const allFilms = useMemo(getAllFilms, []);

  const filtered = useMemo(() => {
    let result = [...allFilms];
    if (filterGenre !== 'all') result = result.filter(f => f.genre === filterGenre);
    if (filterTier !== 'all') result = result.filter(f => f.tier === filterTier);

    switch (sort) {
      case 'boxOffice': result.sort((a, b) => b.boxOffice - a.boxOffice); break;
      case 'quality': result.sort((a, b) => b.quality - a.quality); break;
      case 'genre': result.sort((a, b) => a.genre.localeCompare(b.genre)); break;
      default: break; // 'recent' — already in order
    }
    return result;
  }, [allFilms, sort, filterGenre, filterTier]);

  const genres: Genre[] = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];
  const tiers: RewardTier[] = ['BLOCKBUSTER', 'SMASH', 'HIT', 'FLOP'];
  const tierColors: Record<RewardTier, string> = { BLOCKBUSTER: '#2ecc71', SMASH: '#f1c40f', HIT: '#e67e22', FLOP: '#e74c3c' };

  const content = (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ color: '#888', fontSize: '0.75rem' }}>🎬 {allFilms.length} films</span>
        <span style={{ color: '#2ecc71', fontSize: '0.75rem' }}>💎 {allFilms.filter(f => f.tier === 'BLOCKBUSTER').length} blockbusters</span>
        <span style={{ color: '#ffd700', fontSize: '0.75rem' }}>🏆 {allFilms.filter(f => f.nominated).length} nominated</span>
        <span style={{ color: '#888', fontSize: '0.75rem' }}>💰 ${allFilms.reduce((s, f) => s + f.boxOffice, 0).toFixed(0)}M total</span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <select value={sort} onChange={e => setSort(e.target.value as SortMode)}
          style={{ background: '#1a1a1a', color: '#ccc', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem' }}>
          <option value="recent">Recent</option>
          <option value="boxOffice">Box Office</option>
          <option value="quality">Quality</option>
          <option value="genre">Genre</option>
        </select>
        <select value={filterGenre} onChange={e => setFilterGenre(e.target.value as FilterGenre)}
          style={{ background: '#1a1a1a', color: '#ccc', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem' }}>
          <option value="all">All Genres</option>
          {genres.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={filterTier} onChange={e => setFilterTier(e.target.value as FilterTier)}
          style={{ background: '#1a1a1a', color: '#ccc', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem' }}>
          <option value="all">All Tiers</option>
          {tiers.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Poster grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#666', padding: 40 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎬</div>
          <div style={{ fontSize: '1rem', color: '#888', fontFamily: 'Bebas Neue', letterSpacing: 1 }}>NO FILMS YET</div>
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: 4 }}>Complete a run to see your posters here!</div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: 16,
          justifyItems: 'center',
        }}>
          {filtered.map((film, i) => (
            <div key={`${film.title}-${film.season}-${i}`} style={{ textAlign: 'center' }}>
              <FilmPoster
                title={film.title}
                genre={film.genre}
                tier={film.tier}
                quality={film.quality}
                boxOffice={film.boxOffice}
                season={film.season}
                nominated={film.nominated}
                seed={film.seed}
                size="small"
                onClick={() => setSelectedFilm(film)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Film detail modal */}
      {selectedFilm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setSelectedFilm(null)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%)',
              border: '1px solid rgba(212,168,67,0.3)',
              borderRadius: 16,
              padding: 24,
              maxWidth: 420,
              width: '90%',
              textAlign: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <FilmPoster
                title={selectedFilm.title}
                genre={selectedFilm.genre}
                tier={selectedFilm.tier}
                quality={selectedFilm.quality}
                boxOffice={selectedFilm.boxOffice}
                season={selectedFilm.season}
                nominated={selectedFilm.nominated}
                seed={selectedFilm.seed}
                size="large"
              />
            </div>

            <h3 style={{ color: '#eee', margin: '0 0 4px', fontSize: '1.3rem', fontFamily: 'Bebas Neue', letterSpacing: 2 }}>
              {selectedFilm.title}
            </h3>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>
                {selectedFilm.genre}
              </span>
              <span style={{ fontSize: '0.75rem', color: tierColors[selectedFilm.tier], background: `${tierColors[selectedFilm.tier]}15`, padding: '2px 8px', borderRadius: 4 }}>
                {selectedFilm.tier}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>
                Season {selectedFilm.season}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--gold)', background: 'rgba(212,168,67,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                ${selectedFilm.boxOffice.toFixed(1)}M
              </span>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#d4a843', fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>Q{selectedFilm.quality}</div>
                <div style={{ color: '#999', fontSize: '0.6rem' }}>Quality</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: tierColors[selectedFilm.tier], fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>${selectedFilm.boxOffice.toFixed(1)}M</div>
                <div style={{ color: '#999', fontSize: '0.6rem' }}>Box Office</div>
              </div>
              {selectedFilm.nominated && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem' }}>🏆</div>
                  <div style={{ color: '#999', fontSize: '0.6rem' }}>Nominated</div>
                </div>
              )}
            </div>

            {selectedFilm.studioName && (
              <div style={{ color: '#888', fontSize: '0.7rem', marginBottom: 4 }}>
                Produced by <span style={{ color: 'var(--gold)' }}>{selectedFilm.studioName}</span>
              </div>
            )}
            {selectedFilm.runDate && (
              <div style={{ color: '#666', fontSize: '0.65rem' }}>
                {selectedFilm.runDate}
              </div>
            )}

            <button
              className="btn btn-small"
              onClick={() => setSelectedFilm(null)}
              style={{ marginTop: 16 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (inline) return content;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 950, maxHeight: '90vh', overflow: 'auto' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h2 style={{ color: 'var(--gold)', marginBottom: 4, textAlign: 'center' }}>🎬 POSTER WALL</h2>
        <p style={{ color: '#888', textAlign: 'center', fontSize: '0.8rem', marginBottom: 16 }}>
          Every film you've ever produced, immortalized.
        </p>
        {content}
      </div>
    </div>
  );
}
