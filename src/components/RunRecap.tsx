/**
 * R244: Run Recap — Animated end-of-run summary screen.
 * Shows total films, total revenue, best/worst film, film timeline, final score.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { RunShareData } from '../sharing';
import type { SeasonResult, RewardTier } from '../types';
import ShareModal from './ShareModal';
import { sfx } from '../sound';

const TIER_COLOR: Record<RewardTier, string> = {
  BLOCKBUSTER: '#2ecc71',
  SMASH: '#f1c40f',
  HIT: '#e67e22',
  FLOP: '#e74c3c',
};

const TIER_LABEL: Record<RewardTier, string> = {
  BLOCKBUSTER: 'Blockbuster',
  SMASH: 'Smash',
  HIT: 'Hit',
  FLOP: 'Flop',
};

// ─── Animated counter ───

function CountUp({ target, duration = 1200, prefix = '', suffix = '' }: {
  target: number; duration?: number; prefix?: string; suffix?: string;
}) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(target * eased * 10) / 10);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return <>{prefix}{target >= 100 ? Math.round(current) : current.toFixed(1)}{suffix}</>;
}

// ─── Quality bar ───

function QualityBar({ quality, maxQuality, delay }: { quality: number; maxQuality: number; delay: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setWidth(Math.max(5, (quality / maxQuality) * 100)), delay);
    return () => clearTimeout(timer);
  }, [quality, maxQuality, delay]);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 10, flex: 1, overflow: 'hidden',
    }}>
      <div style={{
        height: '100%', borderRadius: 4,
        width: `${width}%`,
        background: quality >= 60 ? '#2ecc71' : quality >= 35 ? '#f1c40f' : '#e74c3c',
        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
      }} />
    </div>
  );
}

// ─── Props ───

interface RunRecapProps {
  films: SeasonResult[];
  shareData: RunShareData;
  totalRevenue: number;
  score: number;
  rank: string;
  legacyRating: string;
  isVictory: boolean;
  onClose: () => void;
}

export default function RunRecap({
  films, shareData, totalRevenue, score, rank, legacyRating, isVictory, onClose,
}: RunRecapProps) {
  const [phase, setPhase] = useState(0);
  const [showShare, setShowShare] = useState(false);

  const bestFilm = useMemo(() => films.length > 0 ? films.reduce((a, b) => a.boxOffice > b.boxOffice ? a : b) : null, [films]);
  const worstFilm = useMemo(() => films.length > 0 ? films.reduce((a, b) => a.boxOffice < b.boxOffice ? a : b) : null, [films]);
  const maxQuality = useMemo(() => Math.max(1, ...films.map(f => f.quality)), [films]);
  const blockbusters = films.filter(f => f.tier === 'BLOCKBUSTER').length;
  const flops = films.filter(f => f.tier === 'FLOP').length;
  const avgQuality = films.length > 0 ? Math.round(films.reduce((s, f) => s + f.quality, 0) / films.length) : 0;

  // Score breakdown
  const breakdown = useMemo(() => {
    const items: { label: string; value: string; color: string }[] = [];
    items.push({ label: 'Box Office', value: `$${totalRevenue.toFixed(1)}M`, color: '#2ecc71' });
    items.push({ label: 'Films Made', value: String(films.length), color: '#3498db' });
    items.push({ label: 'Blockbusters', value: String(blockbusters), color: '#2ecc71' });
    items.push({ label: 'Avg Quality', value: String(avgQuality), color: '#f1c40f' });
    items.push({ label: 'Final Score', value: String(score), color: '#d4a843' });
    items.push({ label: 'Rank', value: rank, color: rank === 'S' ? '#ff6b6b' : rank === 'A' ? '#ffd93d' : '#5dade2' });
    return items;
  }, [totalRevenue, films.length, blockbusters, avgQuality, score, rank]);

  useEffect(() => {
    (sfx as any).recap?.();
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 3200),
      setTimeout(() => setPhase(5), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, animation: 'fadeIn 0.5s ease',
    }}>
      <div style={{
        maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto',
        padding: '28px 24px',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            color: '#d4a843', fontFamily: 'Bebas Neue',
            fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', letterSpacing: 4,
            animation: 'comboAppear 0.6s ease',
          }}>
            {isVictory ? '🏆 RUN COMPLETE' : '💀 GAME OVER'}
          </div>
          <div style={{ color: '#888', fontSize: '0.8rem', marginTop: 4 }}>
            {shareData.studioName} — {shareData.directorStyle}
          </div>
        </div>

        {/* Big stats */}
        {phase >= 1 && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12,
            marginBottom: 24, animation: 'comboAppear 0.5s ease',
          }}>
            <div style={{
              background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.2)',
              borderRadius: 12, padding: '16px 12px', textAlign: 'center',
            }}>
              <div style={{ color: '#d4a843', fontFamily: 'Bebas Neue', fontSize: '2rem' }}>
                <CountUp target={films.length} duration={800} />
              </div>
              <div style={{ color: '#888', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1 }}>Films Made</div>
            </div>
            <div style={{
              background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.2)',
              borderRadius: 12, padding: '16px 12px', textAlign: 'center',
            }}>
              <div style={{ color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '2rem' }}>
                <CountUp target={totalRevenue} duration={1200} prefix="$" suffix="M" />
              </div>
              <div style={{ color: '#888', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1 }}>Total Revenue</div>
            </div>
          </div>
        )}

        {/* Best & Worst */}
        {phase >= 2 && bestFilm && worstFilm && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
            marginBottom: 24, animation: 'comboAppear 0.5s ease',
          }}>
            <div style={{
              background: 'rgba(46,204,113,0.06)', border: '1px solid rgba(46,204,113,0.2)',
              borderRadius: 10, padding: '12px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>👑</div>
              <div style={{ color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '0.85rem', letterSpacing: 1 }}>BEST FILM</div>
              <div style={{ color: '#eee', fontSize: '0.8rem', fontWeight: 600, marginTop: 4 }}>
                "{bestFilm.title}"
              </div>
              <div style={{ color: '#2ecc71', fontSize: '0.75rem' }}>${bestFilm.boxOffice.toFixed(1)}M · Q{bestFilm.quality}</div>
            </div>
            <div style={{
              background: 'rgba(231,76,60,0.06)', border: '1px solid rgba(231,76,60,0.2)',
              borderRadius: 10, padding: '12px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>💀</div>
              <div style={{ color: '#e74c3c', fontFamily: 'Bebas Neue', fontSize: '0.85rem', letterSpacing: 1 }}>WORST FILM</div>
              <div style={{ color: '#eee', fontSize: '0.8rem', fontWeight: 600, marginTop: 4 }}>
                "{worstFilm.title}"
              </div>
              <div style={{ color: '#e74c3c', fontSize: '0.75rem' }}>${worstFilm.boxOffice.toFixed(1)}M · Q{worstFilm.quality}</div>
            </div>
          </div>
        )}

        {/* Film-by-film timeline */}
        {phase >= 3 && (
          <div style={{ marginBottom: 24, animation: 'comboAppear 0.5s ease' }}>
            <div style={{
              color: '#d4a843', fontFamily: 'Bebas Neue', fontSize: '0.85rem',
              letterSpacing: 2, marginBottom: 10, textAlign: 'center',
            }}>
              FILM TIMELINE
            </div>
            {films.map((film, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', marginBottom: 3,
                borderRadius: 6,
                background: film === bestFilm ? 'rgba(46,204,113,0.06)' : 'transparent',
              }}>
                <span style={{
                  color: '#666', fontFamily: 'Bebas Neue', fontSize: '0.75rem',
                  width: 24, textAlign: 'right', flexShrink: 0,
                }}>
                  S{film.season}
                </span>
                <span style={{ fontSize: '0.9rem', width: 20, textAlign: 'center', flexShrink: 0 }}>
                  {film.quality <= 0 ? '💀' : film.tier === 'BLOCKBUSTER' ? '🟩' : film.tier === 'SMASH' ? '🟨' : film.tier === 'HIT' ? '🟧' : '🟥'}
                </span>
                <div style={{
                  flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: '#ccc', fontSize: '0.78rem',
                }}>
                  {film.title}
                </div>
                <QualityBar quality={Math.max(0, film.quality)} maxQuality={maxQuality} delay={300 + i * 150} />
                <span style={{
                  color: TIER_COLOR[film.tier], fontFamily: 'Bebas Neue', fontSize: '0.8rem',
                  width: 50, textAlign: 'right', flexShrink: 0,
                }}>
                  ${film.boxOffice.toFixed(1)}M
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Final score breakdown */}
        {phase >= 4 && (
          <div style={{
            background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.2)',
            borderRadius: 12, padding: '16px 20px', marginBottom: 24,
            animation: 'comboAppear 0.5s ease',
          }}>
            <div style={{
              color: '#d4a843', fontFamily: 'Bebas Neue', fontSize: '0.85rem',
              letterSpacing: 2, marginBottom: 12, textAlign: 'center',
            }}>
              SCORE BREAKDOWN
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {breakdown.map((item, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ color: item.color, fontFamily: 'Bebas Neue', fontSize: '1.3rem' }}>
                    {item.value}
                  </div>
                  <div style={{ color: '#888', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Share button */}
        {phase >= 5 && (
          <div style={{ textAlign: 'center', animation: 'comboAppear 0.5s ease' }}>
            <button onClick={() => { sfx.shareSnap(); setShowShare(true); }} style={{
              background: 'linear-gradient(135deg, rgba(212,168,67,0.25), rgba(155,89,182,0.15))',
              border: '2px solid rgba(212,168,67,0.5)',
              color: '#d4a843', padding: '14px 32px', borderRadius: 12, cursor: 'pointer',
              fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: 3,
              animation: 'comboAppear 0.5s ease',
            }}>
              📸 SHARE RUN SUMMARY
            </button>
            <div style={{ marginTop: 12 }}>
              <button onClick={onClose} style={{
                background: 'none', border: 'none', color: '#666',
                cursor: 'pointer', fontSize: '0.8rem', padding: '8px 16px',
              }}>
                Continue →
              </button>
            </div>
          </div>
        )}
      </div>

      {showShare && (
        <ShareModal data={shareData} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}
