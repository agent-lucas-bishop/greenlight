/**
 * R270: ReplayTimeline — Horizontal scrollable timeline for a single run.
 * Shows season markers with genre-colored film posters, earnings bars,
 * quality stars, and highlighted peak moments.
 */

import { useMemo } from 'react';
import type { ReplayData, ReplayMoment } from '../replaySystem';
import { extractSeasonSummaries, type SeasonSummary } from '../replaySystem';

const GENRE_COLORS: Record<string, string> = {
  Action: '#e74c3c',
  Comedy: '#f39c12',
  Drama: '#3498db',
  Horror: '#9b59b6',
  Romance: '#e91e63',
  'Sci-Fi': '#00bcd4',
  Thriller: '#607d8b',
};

const TIER_COLORS: Record<string, string> = {
  BLOCKBUSTER: '#2ecc71',
  SMASH: '#f1c40f',
  HIT: '#e67e22',
  FLOP: '#e74c3c',
};

const TIER_EMOJI: Record<string, string> = {
  BLOCKBUSTER: '🟩',
  SMASH: '🟨',
  HIT: '🟧',
  FLOP: '🟥',
};

function QualityStars({ quality }: { quality: number }) {
  // Map quality to 1-5 stars
  const stars = Math.min(5, Math.max(1, Math.round(quality / 15)));
  return (
    <span style={{ color: '#ffd700', fontSize: '0.6rem', letterSpacing: 1 }}>
      {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
    </span>
  );
}

function EarningsBar({ boxOffice, maxBO }: { boxOffice: number; maxBO: number }) {
  const pct = maxBO > 0 ? Math.max(5, (boxOffice / maxBO) * 100) : 5;
  return (
    <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
      <div style={{
        width: `${pct}%`, height: '100%', borderRadius: 3,
        background: `linear-gradient(90deg, #2ecc71, ${pct > 60 ? '#ffd700' : '#2ecc71'})`,
        transition: 'width 0.3s',
      }} />
    </div>
  );
}

function getMomentsForSeason(moments: ReplayMoment[], seasonEvents: { season: number; eventIndex: number }[], season: number): ReplayMoment[] {
  return moments.filter(m => {
    const match = seasonEvents.find(se => se.eventIndex === m.eventIndex);
    return match && match.season === season;
  });
}

interface Props {
  replay: ReplayData;
}

export default function ReplayTimeline({ replay }: Props) {
  const summaries = useMemo(() => extractSeasonSummaries(replay), [replay]);
  const maxBO = useMemo(() => Math.max(...summaries.map(s => s.boxOffice), 1), [summaries]);

  // Map event indices to seasons for moment matching
  const seasonEventMap = useMemo(() => {
    return replay.events.map((e, i) => ({ season: e.s, eventIndex: i }));
  }, [replay]);

  if (summaries.length === 0) {
    return <div style={{ color: '#666', fontSize: '0.8rem', textAlign: 'center', padding: 20 }}>No season data recorded.</div>;
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Scrollable timeline */}
      <div style={{
        display: 'flex', gap: 16, overflowX: 'auto', padding: '16px 8px 12px',
        scrollbarWidth: 'thin', scrollbarColor: '#444 transparent',
      }}>
        {summaries.map((season, i) => {
          const genreColor = GENRE_COLORS[season.genre] || '#888';
          const tierColor = TIER_COLORS[season.tier] || '#888';
          const moments = getMomentsForSeason(replay.moments, seasonEventMap, season.season);
          const isBlockbuster = season.tier === 'BLOCKBUSTER';
          const isFlop = season.tier === 'FLOP';

          return (
            <div key={season.season} style={{
              minWidth: 160, maxWidth: 180, flex: '0 0 auto',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              {/* Connection line */}
              {i > 0 && (
                <div style={{
                  position: 'absolute', top: 56, left: 0, right: 0, height: 2,
                  background: 'rgba(255,255,255,0.06)', zIndex: 0,
                }} />
              )}

              {/* Season marker */}
              <div style={{
                color: '#999', fontFamily: 'Bebas Neue', fontSize: '0.7rem',
                letterSpacing: '0.1em', marginBottom: 6,
              }}>
                SEASON {season.season}
              </div>

              {/* Film poster placeholder */}
              <div style={{
                width: 120, height: 72, borderRadius: 8,
                background: `linear-gradient(135deg, ${genreColor}30, ${genreColor}10)`,
                border: `2px solid ${isBlockbuster ? '#ffd700' : isFlop ? '#e74c3c44' : genreColor + '44'}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
                boxShadow: isBlockbuster ? '0 0 12px rgba(255,215,0,0.2)' : 'none',
              }}>
                {/* Genre initial */}
                <span style={{ fontSize: '1.4rem', opacity: 0.3 }}>
                  {season.genre === 'Action' ? '💥' : season.genre === 'Comedy' ? '😂' : season.genre === 'Drama' ? '🎭' : season.genre === 'Horror' ? '👻' : season.genre === 'Romance' ? '💕' : season.genre === 'Sci-Fi' ? '🚀' : '🔪'}
                </span>
                <span style={{
                  color: '#ddd', fontSize: '0.7rem', fontWeight: 600,
                  textAlign: 'center', padding: '0 4px', lineHeight: 1.2,
                  maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {season.filmTitle}
                </span>

                {/* Blockbuster glow overlay */}
                {isBlockbuster && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: 6,
                    background: 'linear-gradient(135deg, rgba(255,215,0,0.1), transparent)',
                    pointerEvents: 'none',
                  }} />
                )}
              </div>

              {/* Tier + Genre badges */}
              <div style={{ display: 'flex', gap: 4, marginTop: 6, alignItems: 'center' }}>
                <span style={{
                  fontSize: '0.6rem', padding: '1px 6px', borderRadius: 3,
                  color: tierColor, background: tierColor + '18',
                  fontWeight: 700,
                }}>
                  {TIER_EMOJI[season.tier]} {season.tier}
                </span>
                <span style={{
                  fontSize: '0.55rem', padding: '1px 5px', borderRadius: 3,
                  color: genreColor, background: genreColor + '15',
                }}>
                  {season.genre}
                </span>
              </div>

              {/* Quality stars */}
              <div style={{ marginTop: 4 }}>
                <QualityStars quality={season.quality} />
              </div>

              {/* Earnings bar */}
              <div style={{ width: '100%', padding: '0 8px' }}>
                <EarningsBar boxOffice={season.boxOffice} maxBO={maxBO} />
                <div style={{ textAlign: 'center', color: tierColor, fontFamily: 'Bebas Neue', fontSize: '0.75rem', marginTop: 2 }}>
                  ${season.boxOffice.toFixed(1)}M
                </div>
              </div>

              {/* Cards summary */}
              <div style={{ color: '#666', fontSize: '0.55rem', marginTop: 4 }}>
                {season.cardsPlayed.length} cards · Q:{season.quality}
              </div>

              {/* Moment markers */}
              {moments.length > 0 && (
                <div style={{ display: 'flex', gap: 2, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {moments.map((m, j) => (
                    <span key={j} title={m.description} style={{
                      fontSize: '0.6rem', padding: '1px 5px', borderRadius: 4,
                      background: m.type === 'blockbuster' ? 'rgba(255,215,0,0.15)' :
                        m.type === 'biggest_flop' ? 'rgba(231,76,60,0.15)' :
                        m.type === 'comeback' ? 'rgba(46,204,113,0.15)' :
                        'rgba(255,255,255,0.06)',
                      color: m.type === 'blockbuster' ? '#ffd700' :
                        m.type === 'biggest_flop' ? '#e74c3c' :
                        m.type === 'comeback' ? '#2ecc71' : '#999',
                      cursor: 'help',
                    }}>
                      {m.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Events */}
              {season.events.length > 0 && (
                <div style={{ display: 'flex', gap: 2, marginTop: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {season.events.map((evt, j) => (
                    <span key={j} style={{
                      fontSize: '0.5rem', color: '#f39c12', background: 'rgba(243,156,18,0.1)',
                      padding: '1px 4px', borderRadius: 3,
                    }}>
                      📰 {evt}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
