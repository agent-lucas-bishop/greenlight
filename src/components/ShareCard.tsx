/**
 * R196: Visual Share Card — Film-noir poster style with gold accents
 * Shows run highlights for social sharing with download/copy/tweet buttons.
 */

import { useState, useRef, useCallback } from 'react';
import type { RunShareData } from '../sharing';
import { generateTextSummary, generateTwitterText, getTwitterIntentUrl, copyToClipboard } from '../sharing';
import { sfx } from '../sound';

// ─── Tier colors ───

const TIER_COLOR: Record<string, string> = {
  BLOCKBUSTER: '#2ecc71',
  SMASH: '#f1c40f',
  HIT: '#e67e22',
  FLOP: '#e74c3c',
};

// ─── Download card as PNG ───

async function downloadCardAsPng(element: HTMLElement, filename: string) {
  const domtoimage = await import('dom-to-image-more');
  const scale = 2; // retina quality
  const blob = await domtoimage.toBlob(element, {
    width: element.offsetWidth * scale,
    height: element.offsetHeight * scale,
    style: {
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
    },
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ───

interface ShareCardProps {
  data: RunShareData;
  onClose: () => void;
}

export default function ShareCard({ data, onClose }: ShareCardProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(async () => {
    sfx.shareCopy();
    const text = generateTextSummary(data);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [data]);

  const handleTweet = useCallback(() => {
    sfx.shareSnap();
    const text = generateTwitterText(data);
    window.open(getTwitterIntentUrl(text), '_blank', 'noopener,noreferrer');
  }, [data]);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || downloading) return;
    sfx.shareSnap();
    setDownloading(true);
    try {
      const safeName = data.studioName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
      await downloadCardAsPng(cardRef.current, `greenlight_${safeName}_${data.score}.png`);
    } catch (e) {
      console.error('Download failed:', e);
    } finally {
      setDownloading(false);
    }
  }, [data, downloading]);

  return (
    <div className="share-card-overlay" onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, animation: 'fadeIn 0.3s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 420, width: '100%' }}>
        {/* ─── The Card (captured for screenshot) ─── */}
        <div ref={cardRef} style={{
          background: 'linear-gradient(165deg, #1a1a2e 0%, #0f0f1a 40%, #1a1020 100%)',
          borderRadius: 16,
          border: '2px solid rgba(212,168,67,0.5)',
          padding: '28px 24px',
          fontFamily: "'Bebas Neue', sans-serif",
          color: '#eee',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Film grain overlay */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
          }} />

          {/* Gold corner accents */}
          <div style={{ position: 'absolute', top: 8, left: 8, width: 24, height: 24, borderTop: '2px solid #d4a843', borderLeft: '2px solid #d4a843', opacity: 0.6 }} />
          <div style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderTop: '2px solid #d4a843', borderRight: '2px solid #d4a843', opacity: 0.6 }} />
          <div style={{ position: 'absolute', bottom: 8, left: 8, width: 24, height: 24, borderBottom: '2px solid #d4a843', borderLeft: '2px solid #d4a843', opacity: 0.6 }} />
          <div style={{ position: 'absolute', bottom: 8, right: 8, width: 24, height: 24, borderBottom: '2px solid #d4a843', borderRight: '2px solid #d4a843', opacity: 0.6 }} />

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 20, position: 'relative' }}>
            <div style={{
              fontSize: '0.7rem', letterSpacing: 4, color: '#d4a843', textTransform: 'uppercase',
              marginBottom: 6, opacity: 0.8,
            }}>
              {data.isVictory ? '★ A Film Legacy ★' : '★ The Final Cut ★'}
            </div>
            <div style={{
              fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', letterSpacing: 3,
              color: '#d4a843', lineHeight: 1.1,
              textShadow: '0 0 20px rgba(212,168,67,0.3)',
            }}>
              {data.studioName}
            </div>
            <div style={{
              fontSize: '0.8rem', color: '#bb86fc', letterSpacing: 2, marginTop: 6,
            }}>
              {data.directorStyle}
            </div>
            {data.difficulty && (
              <div style={{ fontSize: '0.65rem', color: '#888', letterSpacing: 1, marginTop: 4 }}>
                {data.difficulty.toUpperCase()} DIFFICULTY
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{
            height: 1, background: 'linear-gradient(90deg, transparent, #d4a843, transparent)',
            margin: '0 20px 16px', opacity: 0.4,
          }} />

          {/* Tier Grid */}
          <div style={{ textAlign: 'center', fontSize: '1.6rem', letterSpacing: 4, marginBottom: 16 }}>
            {data.tierGrid}
          </div>

          {/* Stats row */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
            textAlign: 'center', marginBottom: 16,
          }}>
            <div>
              <div style={{ fontSize: '1.8rem', color: '#d4a843' }}>{data.score}</div>
              <div style={{ fontSize: '0.55rem', color: '#888', letterSpacing: 2, textTransform: 'uppercase' }}>Score</div>
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', color: '#2ecc71' }}>${Math.round(data.totalBO)}M</div>
              <div style={{ fontSize: '0.55rem', color: '#888', letterSpacing: 2, textTransform: 'uppercase' }}>Box Office</div>
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', color: data.rank === 'S' ? '#ff6b6b' : data.rank === 'A' ? '#ffd93d' : '#5dade2' }}>
                {data.rank}
              </div>
              <div style={{ fontSize: '0.55rem', color: '#888', letterSpacing: 2, textTransform: 'uppercase' }}>Rank</div>
            </div>
          </div>

          {/* Top Films */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.6rem', color: '#d4a843', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' }}>
              Top Films
            </div>
            {data.topFilms.map((film, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                background: i === 0 ? 'rgba(212,168,67,0.08)' : 'transparent',
                borderRadius: 6, marginBottom: 2,
              }}>
                <span style={{ fontSize: '1rem' }}>{['🥇', '🥈', '🥉'][i]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.85rem', color: '#eee', letterSpacing: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    "{film.title}"
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#888', letterSpacing: 1 }}>{film.genre}</div>
                </div>
                <div style={{
                  fontSize: '0.9rem', color: TIER_COLOR[film.tier] || '#888',
                  fontFamily: 'Bebas Neue',
                }}>
                  ${film.boxOffice.toFixed(1)}M
                </div>
                {film.criticScore != null && (
                  <span style={{ fontSize: '0.65rem', color: film.criticScore >= 60 ? '#e74c3c' : '#7f8c2a' }}>
                    {film.criticScore >= 60 ? '🍅' : '🤢'}{film.criticScore}%
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Genre breakdown pie chart */}
          {data.genreBreakdown && data.genreBreakdown.length > 0 && (() => {
            const GENRE_COLORS: Record<string, string> = {
              Action: '#e74c3c', Comedy: '#f39c12', Drama: '#3498db',
              Horror: '#8e44ad', 'Sci-Fi': '#1abc9c', Romance: '#e91e63', Thriller: '#2c3e50',
            };
            let cumPct = 0;
            const stops = data.genreBreakdown.map(g => {
              const color = GENRE_COLORS[g.genre] || '#666';
              const start = cumPct;
              cumPct += g.pct;
              return `${color} ${start}% ${cumPct}%`;
            }).join(', ');

            return (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: `conic-gradient(${stops})`,
                  border: '2px solid rgba(212,168,67,0.2)',
                  flexShrink: 0,
                }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {data.genreBreakdown.map(g => (
                    <div key={g.genre} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.6rem' }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                        background: GENRE_COLORS[g.genre] || '#666',
                      }} />
                      <span style={{ color: '#bbb' }}>{g.genre}</span>
                      <span style={{ color: '#666' }}>{g.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Bottom stats */}
          <div style={{
            display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap',
            fontSize: '0.65rem', color: '#999',
          }}>
            <span>🎥 {data.filmCount} Films</span>
            <span>💰 {data.blockbusters} Blockbusters</span>
            <span>🏆 {data.nominations} Noms</span>
            <span>🎭 {data.favoriteGenre}</span>
          </div>

          {/* Divider */}
          <div style={{
            height: 1, background: 'linear-gradient(90deg, transparent, #d4a843, transparent)',
            margin: '16px 20px 12px', opacity: 0.3,
          }} />

          {/* Footer */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', color: '#d4a843', letterSpacing: 4 }}>GREENLIGHT</div>
            <div style={{ fontSize: '0.5rem', color: '#666', letterSpacing: 2, marginTop: 2 }}>
              greenlight-plum.vercel.app
            </div>
          </div>
        </div>

        {/* ─── Action buttons (outside card, not captured) ─── */}
        <div style={{
          display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center', flexWrap: 'wrap',
        }}>
          <button onClick={handleTweet} style={{
            background: 'rgba(29,161,242,0.15)', border: '1px solid rgba(29,161,242,0.4)',
            color: '#1da1f2', padding: '10px 20px', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'Bebas Neue', fontSize: '0.9rem', letterSpacing: 1,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            🐦 Share to X
          </button>

          <button onClick={handleCopy} style={{
            background: copied ? 'rgba(46,204,113,0.2)' : 'rgba(212,168,67,0.15)',
            border: `1px solid ${copied ? '#2ecc71' : 'rgba(212,168,67,0.4)'}`,
            color: copied ? '#2ecc71' : '#d4a843',
            padding: '10px 20px', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'Bebas Neue', fontSize: '0.9rem', letterSpacing: 1,
            transition: 'all 0.3s',
          }}>
            {copied ? '✅ Copied!' : '📋 Copy Summary'}
          </button>

          <button onClick={handleDownload} disabled={downloading} style={{
            background: 'rgba(155,89,182,0.15)', border: '1px solid rgba(155,89,182,0.4)',
            color: '#bb86fc', padding: '10px 20px', borderRadius: 8, cursor: downloading ? 'wait' : 'pointer',
            fontFamily: 'Bebas Neue', fontSize: '0.9rem', letterSpacing: 1,
            opacity: downloading ? 0.6 : 1,
          }}>
            {downloading ? '⏳ Saving...' : '📸 Download Card'}
          </button>
        </div>

        {/* Close hint */}
        <div style={{ textAlign: 'center', marginTop: 12, color: '#666', fontSize: '0.7rem' }}>
          Click outside to close
        </div>
      </div>
    </div>
  );
}
