import { useState, useEffect } from 'react';
import { GameState, RewardTier } from '../types';
import { RivalFilm, getSeasonIdentity, generateHeadline } from '../rivals';
import { sfx } from '../sound';

const TIER_COLORS: Record<RewardTier, string> = {
  FLOP: '#e74c3c',
  HIT: '#f39c12',
  SMASH: '#d4a843',
  BLOCKBUSTER: '#ffd700',
};

const TIER_EMOJI: Record<RewardTier, string> = {
  FLOP: '💀',
  HIT: '🎬',
  SMASH: '🔥',
  BLOCKBUSTER: '🏆',
};

interface Props {
  state: GameState;
  rivalFilms: RivalFilm[];
  cumulativeRivalEarnings: Record<string, number>;
  onContinue: () => void;
}

export default function SeasonRecapScreen({ state, rivalFilms, cumulativeRivalEarnings, onContinue }: Props) {
  const [phase, setPhase] = useState(0);
  const season = state.seasonHistory.length;
  const lastResult = state.seasonHistory[state.seasonHistory.length - 1];
  const identity = getSeasonIdentity(season);
  const nextIdentity = season < 5 ? getSeasonIdentity(season + 1) : null;

  const headline = generateHeadline(
    { title: lastResult.title, tier: lastResult.tier, boxOffice: lastResult.boxOffice },
    rivalFilms,
    season,
    state.totalEarnings,
    cumulativeRivalEarnings,
    state.strikes,
    state.reputation,
  );

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600);
    const t2 = setTimeout(() => setPhase(2), 1400);
    const t3 = setTimeout(() => setPhase(3), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // All films this season (player + rivals), sorted by box office
  const allFilms = [
    { name: '🎬 YOUR STUDIO', emoji: '🎬', title: lastResult.title, genre: lastResult.genre, boxOffice: lastResult.boxOffice, tier: lastResult.tier, isPlayer: true },
    ...rivalFilms.map(f => ({ name: `${f.studioEmoji} ${f.studioName}`, emoji: f.studioEmoji, title: f.title, genre: f.genre, boxOffice: f.boxOffice, tier: f.tier, isPlayer: false })),
  ].sort((a, b) => b.boxOffice - a.boxOffice);

  // Running totals
  const playerTotal = state.totalEarnings;

  return (
    <div className="season-recap fade-in" style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>
      {/* Season header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '0.9rem', color: '#666', letterSpacing: 2, textTransform: 'uppercase' }}>
          Season {season} Wrap-Up
        </div>
        <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#d4a843', margin: '4px 0' }}>
          {identity.name}
        </h2>
        <div style={{ color: '#888', fontSize: '0.85rem', fontStyle: 'italic' }}>{identity.subtitle}</div>
      </div>

      {/* Headline */}
      {phase >= 1 && (
        <div className="animate-slide-down" style={{
          background: 'rgba(212,168,67,0.08)',
          border: '1px solid rgba(212,168,67,0.3)',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 24,
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: '#d4a843', lineHeight: 1.3 }}>
            {headline}
          </div>
        </div>
      )}

      {/* Box office rankings */}
      {phase >= 2 && (
        <div className="animate-slide-down" style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#888', marginBottom: 12, letterSpacing: 1 }}>
            📊 BOX OFFICE RANKINGS
          </div>
          {allFilms.map((film, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              marginBottom: 6,
              borderRadius: 6,
              background: film.isPlayer ? 'rgba(212,168,67,0.12)' : 'rgba(255,255,255,0.03)',
              border: film.isPlayer ? '1px solid rgba(212,168,67,0.3)' : '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: i === 0 ? '#ffd700' : '#666', width: 24 }}>
                #{i + 1}
              </span>
              <span style={{ fontSize: '1.1rem' }}>{TIER_EMOJI[film.tier]}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: film.isPlayer ? '#d4a843' : '#ccc', fontSize: '0.9rem', fontWeight: film.isPlayer ? 'bold' : 'normal' }}>
                  {film.title}
                </div>
                <div style={{ color: '#666', fontSize: '0.75rem' }}>
                  {film.name} · {film.genre}
                </div>
              </div>
              <div style={{
                fontFamily: 'Bebas Neue',
                fontSize: '1.1rem',
                color: TIER_COLORS[film.tier],
              }}>
                ${film.boxOffice.toFixed(1)}M
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Running totals */}
      {phase >= 3 && (
        <div className="animate-slide-down" style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#888', marginBottom: 12, letterSpacing: 1 }}>
            💰 CAREER EARNINGS
          </div>
          {[
            { name: '🎬 YOUR STUDIO', total: playerTotal, isPlayer: true },
            ...Object.entries(cumulativeRivalEarnings).map(([name, total]) => ({ name, total, isPlayer: false })),
          ].sort((a, b) => b.total - a.total).map((entry, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              marginBottom: 4,
              borderRadius: 4,
              background: entry.isPlayer ? 'rgba(212,168,67,0.08)' : 'transparent',
            }}>
              <span style={{ color: entry.isPlayer ? '#d4a843' : '#aaa', fontSize: '0.85rem' }}>
                {i === 0 ? '👑 ' : ''}{entry.name}
              </span>
              <span style={{ fontFamily: 'Bebas Neue', color: entry.isPlayer ? '#d4a843' : '#888', fontSize: '1rem' }}>
                ${entry.total.toFixed(1)}M
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Next season preview */}
      {phase >= 3 && nextIdentity && (
        <div className="animate-slide-down" style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          padding: '14px 18px',
          marginBottom: 24,
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '0.8rem', color: '#666', letterSpacing: 2 }}>NEXT UP</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: '#d4a843', margin: '4px 0' }}>
            Season {season + 1}: {nextIdentity.name}
          </div>
          <div style={{ color: '#888', fontSize: '0.8rem' }}>{nextIdentity.description}</div>
        </div>
      )}

      {phase >= 3 && (
        <div style={{ textAlign: 'center' }}>
          <button className="btn btn-primary" onClick={onContinue}>
            {nextIdentity ? `BEGIN SEASON ${season + 1} →` : 'SEE FINAL RESULTS →'}
          </button>
        </div>
      )}
    </div>
  );
}
