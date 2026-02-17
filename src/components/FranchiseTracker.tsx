/**
 * R220: Franchise Tracker Component
 * Visual franchise tree with connecting lines, BO comparison, and "Make Sequel" button.
 */

import { useState } from 'react';
import type { GameState, FranchiseEntry } from '../types';
import { canMakeSequel, MAX_FRANCHISE_FILMS } from '../franchises';
import { sfx } from '../sound';

interface FranchiseTrackerProps {
  state: GameState;
  showSequelButton?: boolean; // true during greenlight phase
  onMakeSequel?: (franchise: FranchiseEntry) => void;
}

const TIER_COLORS: Record<string, string> = {
  BLOCKBUSTER: '#f1c40f',
  SMASH: '#2ecc71',
  HIT: '#3498db',
  FLOP: '#e74c3c',
};

const TIER_EMOJI: Record<string, string> = {
  BLOCKBUSTER: '🏆',
  SMASH: '🔥',
  HIT: '✅',
  FLOP: '💀',
};

export default function FranchiseTracker({ state, showSequelButton, onMakeSequel }: FranchiseTrackerProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const franchises = Object.values(state.franchises);

  if (franchises.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0', color: '#666', fontSize: '0.85rem' }}>
        🎬 No franchises yet — earn HIT or higher to unlock sequel options!
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {franchises.map(franchise => {
        const isExpanded = expanded === franchise.rootTitle;
        const eligible = canMakeSequel(franchise);
        const atMax = franchise.sequelNumber >= MAX_FRANCHISE_FILMS;

        return (
          <div
            key={franchise.rootTitle}
            className="card"
            style={{
              padding: '12px 16px',
              cursor: 'pointer',
              borderLeft: `3px solid ${eligible ? '#2ecc71' : '#444'}`,
            }}
            onClick={() => { setExpanded(isExpanded ? null : franchise.rootTitle); if (!isExpanded) sfx.franchiseTreeExpand(); else sfx.cardFlip?.(); }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: 'var(--gold)', letterSpacing: 1 }}>
                  🎬 {franchise.rootTitle}
                </span>
                <span className={`genre-label ${franchise.genre.toLowerCase().replace('-', '')}`} style={{ marginLeft: 8, fontSize: '0.65rem' }}>
                  {franchise.genre}
                </span>
                <span style={{ color: '#888', fontSize: '0.75rem', marginLeft: 8 }}>
                  {franchise.films.length}/{MAX_FRANCHISE_FILMS} films
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#2ecc71', fontWeight: 'bold' }}>
                💰 ${franchise.totalBoxOffice.toFixed(1)}M total
              </div>
            </div>

            {/* Film chain - always visible as compact dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 8, overflowX: 'auto' }}>
              {franchise.films.map((film, i) => (
                <div key={film.title} style={{ display: 'flex', alignItems: 'center' }}>
                  {/* Connecting line */}
                  {i > 0 && (
                    <div style={{
                      width: 24,
                      height: 2,
                      background: `linear-gradient(to right, ${TIER_COLORS[franchise.films[i - 1].tier]}, ${TIER_COLORS[film.tier]})`,
                      flexShrink: 0,
                    }} />
                  )}
                  {/* Film node */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minWidth: isExpanded ? 90 : 36,
                      transition: 'min-width 0.2s',
                    }}
                    title={`${film.title} — $${film.boxOffice.toFixed(1)}M (${film.tier})`}
                  >
                    <div style={{
                      width: isExpanded ? 32 : 20,
                      height: isExpanded ? 32 : 20,
                      borderRadius: '50%',
                      background: TIER_COLORS[film.tier],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: isExpanded ? '0.8rem' : '0.55rem',
                      fontWeight: 'bold',
                      color: '#1a1a2e',
                      transition: 'all 0.2s',
                      boxShadow: `0 0 8px ${TIER_COLORS[film.tier]}40`,
                    }}>
                      {isExpanded ? TIER_EMOJI[film.tier] : (i + 1)}
                    </div>
                    {isExpanded && (
                      <div style={{ textAlign: 'center', marginTop: 4 }}>
                        <div style={{ fontSize: '0.7rem', color: '#ccc', lineHeight: 1.2 }}>
                          {film.title.length > 16 ? film.title.slice(0, 14) + '…' : film.title}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: TIER_COLORS[film.tier] }}>
                          ${film.boxOffice.toFixed(1)}M
                        </div>
                        <div style={{ fontSize: '0.6rem', color: '#888' }}>
                          S{film.season} · Q{film.quality}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Future sequel placeholder */}
              {eligible && !atMax && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: 24, height: 2, background: '#444', borderStyle: 'dashed', flexShrink: 0 }} />
                  <div style={{
                    width: isExpanded ? 32 : 20,
                    height: isExpanded ? 32 : 20,
                    borderRadius: '50%',
                    border: '2px dashed #555',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    color: '#555',
                  }}>
                    ?
                  </div>
                </div>
              )}
            </div>

            {/* BO comparison bar when expanded */}
            {isExpanded && franchise.films.length >= 2 && (
              <div style={{ marginTop: 12 }} ref={el => { if (el && !el.dataset.sounded) { el.dataset.sounded = '1'; sfx.franchiseShowdownReveal(); } }}>
                <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: 4 }}>Box Office Comparison</div>
                {(() => {
                  const maxBO = Math.max(...franchise.films.map(f => f.boxOffice));
                  return franchise.films.map((film, i) => (
                    <div key={film.title} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: '0.65rem', color: '#aaa', width: 20, textAlign: 'right' }}>#{i + 1}</span>
                      <div style={{ flex: 1, height: 12, background: '#222', borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{
                          width: `${(film.boxOffice / maxBO) * 100}%`,
                          height: '100%',
                          background: `linear-gradient(to right, ${TIER_COLORS[film.tier]}88, ${TIER_COLORS[film.tier]})`,
                          borderRadius: 6,
                          transition: 'width 0.5s',
                        }} />
                      </div>
                      <span style={{ fontSize: '0.65rem', color: TIER_COLORS[film.tier], minWidth: 55, textAlign: 'right' }}>
                        ${film.boxOffice.toFixed(1)}M
                      </span>
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* Make Sequel button */}
            {showSequelButton && eligible && onMakeSequel && (
              <button
                className="btn btn-gold"
                onClick={(e) => {
                  e.stopPropagation();
                  sfx.franchiseSequelUnlock();
                  onMakeSequel(franchise);
                }}
                style={{ marginTop: 10, width: '100%', fontSize: '0.85rem' }}
              >
                🎬 Make Sequel — {franchise.rootTitle} {franchise.sequelNumber + 1 === 2 ? '2' : `#${franchise.sequelNumber + 1}`}
              </button>
            )}

            {atMax && (
              <div style={{ marginTop: 8, fontSize: '0.7rem', color: '#888', textAlign: 'center' }}>
                ✅ Franchise complete — {MAX_FRANCHISE_FILMS} films made
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Compact franchise stats for the Statistics dashboard */
export function FranchiseStatsSection({ state }: { state: GameState }) {
  const franchises = Object.values(state.franchises);
  if (franchises.length === 0) return null;

  const totalSequels = franchises.reduce((sum, f) => sum + Math.max(0, f.films.length - 1), 0);
  const totalFranchiseBO = franchises.reduce((sum, f) => sum + f.totalBoxOffice, 0);
  const longest = franchises.reduce((a, b) => a.films.length > b.films.length ? a : b);
  const highest = franchises.reduce((a, b) => a.totalBoxOffice > b.totalBoxOffice ? a : b);

  return (
    <div style={{ marginTop: 16 }}>
      <h4 style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: 1, marginBottom: 8 }}>
        🎬 Franchise Empire
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
        <div className="stat-card">
          <div className="stat-label">Franchises</div>
          <div className="stat-value">{franchises.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Sequels</div>
          <div className="stat-value">{totalSequels}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Franchise Revenue</div>
          <div className="stat-value" style={{ color: '#2ecc71' }}>${totalFranchiseBO.toFixed(0)}M</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Longest Franchise</div>
          <div className="stat-value" style={{ fontSize: '0.85rem' }}>{longest.rootTitle} ({longest.films.length})</div>
        </div>
        {franchises.length >= 2 && (
          <div className="stat-card">
            <div className="stat-label">Top Grossing</div>
            <div className="stat-value" style={{ fontSize: '0.85rem' }}>{highest.rootTitle} (${highest.totalBoxOffice.toFixed(0)}M)</div>
          </div>
        )}
      </div>
    </div>
  );
}
