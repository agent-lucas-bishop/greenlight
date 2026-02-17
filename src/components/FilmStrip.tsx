/**
 * R314: Film Strip — animated horizontal scrolling strip of the player's films from the run.
 * Displays film posters in a classic film strip frame that auto-scrolls.
 */

import { useEffect, useRef, useState } from 'react';
import type { SeasonResult, RewardTier } from '../types';

interface Props {
  films: SeasonResult[];
}

const TIER_COLOR: Record<RewardTier, string> = {
  BLOCKBUSTER: '#2ecc71',
  SMASH: '#f1c40f',
  HIT: '#e67e22',
  FLOP: '#e74c3c',
};

const TIER_LABEL: Record<RewardTier, string> = {
  BLOCKBUSTER: 'BLOCKBUSTER',
  SMASH: 'SMASH HIT',
  HIT: 'MODEST HIT',
  FLOP: 'FLOP',
};

export default function FilmStrip({ films }: Props) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  // Auto-scroll animation
  useEffect(() => {
    const el = stripRef.current;
    if (!el || films.length <= 3) return;

    let animId: number;
    let pos = 0;
    const speed = 0.5; // px per frame

    const scroll = () => {
      if (!paused) {
        pos += speed;
        if (pos >= el.scrollWidth - el.clientWidth) pos = 0;
        el.scrollLeft = pos;
      }
      animId = requestAnimationFrame(scroll);
    };
    animId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animId);
  }, [films.length, paused]);

  if (films.length === 0) return null;

  return (
    <div style={{
      margin: '20px auto',
      maxWidth: 600,
      position: 'relative',
    }}>
      {/* Film strip perforations (top) */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', padding: '0 4px',
        height: 12, overflow: 'hidden',
      }}>
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: 2,
            background: 'rgba(212,168,67,0.3)',
          }} />
        ))}
      </div>

      {/* Strip body */}
      <div
        ref={stripRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        style={{
          display: 'flex',
          gap: 0,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          background: 'rgba(20,15,10,0.8)',
          border: '2px solid rgba(212,168,67,0.25)',
          borderRadius: 0,
          padding: '8px 4px',
        }}
      >
        {films.map((film, i) => (
          <div key={i} style={{
            flex: '0 0 140px',
            padding: '6px',
            textAlign: 'center',
            borderRight: i < films.length - 1 ? '1px solid rgba(212,168,67,0.15)' : 'none',
            transition: 'transform 0.2s',
          }}>
            {/* Film frame */}
            <div style={{
              background: `linear-gradient(135deg, ${TIER_COLOR[film.tier]}15, rgba(0,0,0,0.4))`,
              border: `2px solid ${TIER_COLOR[film.tier]}40`,
              borderRadius: 6,
              padding: '8px 6px',
              minHeight: 90,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div style={{
                color: TIER_COLOR[film.tier],
                fontSize: '0.55rem',
                fontFamily: 'Bebas Neue',
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}>
                {TIER_LABEL[film.tier]}
              </div>
              <div style={{
                color: '#eee',
                fontSize: '0.75rem',
                fontWeight: 600,
                lineHeight: 1.2,
                margin: '6px 0',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {film.title}
              </div>
              <div style={{ color: '#999', fontSize: '0.6rem' }}>
                {film.genre} · S{film.season}
              </div>
              <div style={{
                color: TIER_COLOR[film.tier],
                fontFamily: 'Bebas Neue',
                fontSize: '0.9rem',
                marginTop: 4,
              }}>
                ${film.boxOffice.toFixed(1)}M
              </div>
              {film.nominated && <div style={{ fontSize: '0.7rem' }}>🏆</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Film strip perforations (bottom) */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', padding: '0 4px',
        height: 12, overflow: 'hidden',
      }}>
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: 2,
            background: 'rgba(212,168,67,0.3)',
          }} />
        ))}
      </div>
    </div>
  );
}
