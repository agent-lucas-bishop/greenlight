// Achievement Gallery — R209: Full-screen gallery with trophy shelf, categories, shimmer, rarity
import { useEffect, useState, useMemo } from 'react';
import { ACHIEVEMENTS, getUnlockedAchievements, getEarnedCosmetics, getAchievementDates } from '../achievements';
import type { AchievementDef } from '../achievements';
import {
  GALLERY_CATEGORIES, RARITY_DEFS, getGalleryCategory, getAchievementRarity,
  getGalleryAchievements, getCompletionStats, getTrophyShelfAchievements,
  type GalleryCategory, type GalleryAchievement,
} from '../achievements-gallery';
import { getUnlocks } from '../unlocks';
import { getState } from '../gameStore';
import { getLeaderboard } from '../leaderboard';
import { sfx } from '../sound';

// ─── Shimmer keyframes (injected once) ───
const SHIMMER_ID = 'ach-gallery-shimmer';
function ensureShimmerStyle() {
  if (document.getElementById(SHIMMER_ID)) return;
  const style = document.createElement('style');
  style.id = SHIMMER_ID;
  style.textContent = `
    @keyframes ach-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes ach-trophy-float {
      0%, 100% { transform: perspective(600px) rotateY(-8deg) translateY(0); }
      50% { transform: perspective(600px) rotateY(-8deg) translateY(-4px); }
    }
    @keyframes ach-trophy-glow {
      0%, 100% { box-shadow: 0 4px 20px rgba(255,215,0,0.15); }
      50% { box-shadow: 0 8px 30px rgba(255,215,0,0.35); }
    }
    .ach-card-unlocked {
      position: relative;
      overflow: hidden;
    }
    .ach-card-unlocked::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(
        110deg,
        transparent 30%,
        rgba(255,215,0,0.06) 45%,
        rgba(255,215,0,0.12) 50%,
        rgba(255,215,0,0.06) 55%,
        transparent 70%
      );
      background-size: 200% 100%;
      animation: ach-shimmer 3s ease-in-out infinite;
      pointer-events: none;
      border-radius: inherit;
    }
    .ach-trophy-item {
      animation: ach-trophy-float 4s ease-in-out infinite, ach-trophy-glow 4s ease-in-out infinite;
    }
    .ach-trophy-locked {
      filter: grayscale(1) brightness(0.25);
      opacity: 0.3;
    }
  `;
  document.head.appendChild(style);
}

function findRunForDate(dateStr: string): string | null {
  const leaderboard = getLeaderboard();
  for (const entry of leaderboard) {
    if (entry.date === dateStr) return entry.studioName || `${entry.archetype} run`;
  }
  return null;
}

// ─── Trophy Shelf ───
function TrophyShelf() {
  const trophies = getTrophyShelfAchievements();
  if (trophies.length === 0) return null;

  return (
    <div style={{
      marginBottom: 28, padding: '20px 16px 16px',
      background: 'linear-gradient(180deg, rgba(255,215,0,0.04) 0%, rgba(139,69,19,0.06) 100%)',
      border: '1px solid rgba(255,215,0,0.12)',
      borderRadius: 14,
      position: 'relative',
    }}>
      {/* Shelf label */}
      <div style={{
        position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
        background: '#0d0d0d', padding: '2px 16px', borderRadius: 8,
        border: '1px solid rgba(255,215,0,0.2)',
      }}>
        <span style={{ color: '#ffd700', fontFamily: 'Bebas Neue', fontSize: '0.75rem', letterSpacing: '0.12em' }}>
          🏆 TROPHY SHELF
        </span>
      </div>

      {/* Shelf surface */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap',
        marginTop: 8,
      }}>
        {trophies.map(trophy => {
          const rarity = RARITY_DEFS[trophy.rarity];
          return (
            <div
              key={trophy.def.id}
              className={trophy.isUnlocked ? 'ach-trophy-item' : 'ach-trophy-locked'}
              style={{
                width: 80, textAlign: 'center',
                perspective: '600px',
                animationDelay: `${Math.random() * 2}s`,
              }}
            >
              {/* Trophy pedestal */}
              <div style={{
                background: trophy.isUnlocked
                  ? `linear-gradient(135deg, rgba(255,215,0,0.12), ${rarity.glowColor})`
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${trophy.isUnlocked ? rarity.color + '40' : '#1a1a1a'}`,
                borderRadius: 12,
                padding: '12px 8px 8px',
                transform: 'perspective(600px) rotateY(-8deg)',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.3s',
              }}>
                <div style={{
                  fontSize: '2rem', lineHeight: 1, marginBottom: 4,
                  textShadow: trophy.isUnlocked ? `0 0 12px ${rarity.glowColor}` : 'none',
                }}>
                  {trophy.isUnlocked ? trophy.def.emoji : '🔒'}
                </div>
                <div style={{
                  color: trophy.isUnlocked ? rarity.color : '#333',
                  fontFamily: 'Bebas Neue', fontSize: '0.6rem',
                  letterSpacing: '0.04em', lineHeight: 1.2,
                }}>
                  {trophy.isUnlocked ? trophy.def.name : '???'}
                </div>
              </div>

              {/* Shelf edge (3D effect) */}
              <div style={{
                height: 6,
                background: 'linear-gradient(180deg, rgba(139,69,19,0.3), rgba(80,40,10,0.4))',
                borderRadius: '0 0 4px 4px',
                transform: 'perspective(600px) rotateX(60deg)',
                transformOrigin: 'top center',
                marginTop: -1,
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Achievement Card ───
function AchievementCard({ achievement }: { achievement: GalleryAchievement }) {
  const { def: ach, isUnlocked, rarity: rarityId, unlockDate } = achievement;
  const rarity = RARITY_DEFS[rarityId];
  const state = getState();
  const unlockState = getUnlocks();
  const isSecret = ach.secret && !isUnlocked;
  const prog = !isUnlocked && ach.progress ? ach.progress(state, unlockState) : null;
  const runName = unlockDate ? findRunForDate(unlockDate) : null;

  return (
    <div
      className={isUnlocked ? 'ach-card-unlocked' : ''}
      style={{
        background: isUnlocked
          ? `linear-gradient(135deg, rgba(255,215,0,0.07), ${rarity.glowColor.replace('0.3', '0.03')})`
          : 'rgba(255,255,255,0.015)',
        border: `1px solid ${isUnlocked ? rarity.color + '40' : '#1a1a1a'}`,
        borderRadius: 12, padding: '16px 12px', textAlign: 'center',
        opacity: isUnlocked ? 1 : 0.45,
        transition: 'all 0.3s',
        position: 'relative',
      }}
    >
      {/* Rarity indicator */}
      {isUnlocked && (
        <div style={{
          position: 'absolute', top: 6, right: 8,
          fontSize: '0.5rem', color: rarity.color,
          fontFamily: 'Bebas Neue', letterSpacing: '0.06em',
          opacity: 0.8,
        }}>
          {rarity.label.toUpperCase()}
        </div>
      )}

      {/* Emoji */}
      <div style={{
        fontSize: '2.2rem', marginBottom: 8, lineHeight: 1,
        filter: isUnlocked ? 'none' : 'grayscale(1) brightness(0.3)',
        textShadow: isUnlocked ? `0 0 10px ${rarity.glowColor}` : 'none',
      }}>
        {isSecret ? '❓' : ach.emoji}
      </div>

      {/* Name */}
      <div style={{
        color: isUnlocked ? rarity.color : '#444',
        fontFamily: 'Bebas Neue', fontSize: '0.9rem',
        letterSpacing: '0.04em', lineHeight: 1.2,
      }}>
        {isSecret ? '???' : ach.name}
      </div>

      {/* Description / hint */}
      <div style={{
        color: isUnlocked ? '#999' : '#333',
        fontSize: '0.65rem', marginTop: 5, lineHeight: 1.4, minHeight: '2.8em',
      }}>
        {isUnlocked ? ach.description : (isSecret ? 'A hidden achievement awaits...' : ach.hint)}
      </div>

      {/* Unlock date */}
      {isUnlocked && unlockDate && (
        <div style={{ color: '#555', fontSize: '0.55rem', marginTop: 6, lineHeight: 1.4 }}>
          <div>🗓️ {unlockDate}</div>
          {runName && <div style={{ color: '#666' }}>📍 {runName}</div>}
        </div>
      )}

      {/* Progress bar */}
      {prog && prog.target > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ width: '100%', height: 5, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden', border: '1px solid #222' }}>
            <div style={{
              width: `${Math.min(100, (prog.current / prog.target) * 100)}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #b8860b, #ffd700)',
              borderRadius: 3,
              transition: 'width 0.3s',
            }} />
          </div>
          <div style={{ color: '#555', fontSize: '0.6rem', marginTop: 3, fontFamily: 'Bebas Neue' }}>
            {prog.current} / {prog.target}
          </div>
        </div>
      )}

      {/* Cosmetic reward */}
      {isUnlocked && ach.cosmeticReward && (
        <div style={{
          marginTop: 8, padding: '3px 10px',
          background: 'rgba(255,215,0,0.08)', borderRadius: 5,
          color: '#ffd700', fontSize: '0.55rem',
          border: '1px solid rgba(255,215,0,0.15)',
        }}>
          🎨 {ach.cosmeticReward.label}
        </div>
      )}

      {/* Star Power reward */}
      {(ach as any).starPowerReward && (
        <div style={{
          marginTop: isUnlocked && ach.cosmeticReward ? 4 : 8,
          padding: '2px 8px', borderRadius: 4,
          background: isUnlocked ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.02)',
          color: isUnlocked ? '#ffd700' : '#444',
          fontSize: '0.5rem',
          border: `1px solid ${isUnlocked ? 'rgba(255,215,0,0.2)' : '#1a1a1a'}`,
        }}>
          ⭐ {(ach as any).starPowerReward.label}
        </div>
      )}
    </div>
  );
}

// ─── Main Gallery ───
export default function AchievementGallery({ onClose, inline }: { onClose: () => void; inline?: boolean }) {
  const [filter, setFilter] = useState<GalleryCategory | 'all'>('all');

  useEffect(() => { ensureShimmerStyle(); sfx.galleryOpenWhoosh(); }, []);

  useEffect(() => {
    if (inline) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, inline]);

  const allAchievements = useMemo(() => getGalleryAchievements(), []);
  const stats = useMemo(() => getCompletionStats(), []);
  const cosmetics = getEarnedCosmetics();

  const filtered = filter === 'all'
    ? allAchievements
    : allAchievements.filter(a => a.galleryCategory === filter);

  // Group by category for display
  const grouped = useMemo(() => {
    const groups: { cat: typeof GALLERY_CATEGORIES[number]; items: GalleryAchievement[] }[] = [];
    const cats = filter === 'all' ? GALLERY_CATEGORIES : GALLERY_CATEGORIES.filter(c => c.id === filter);
    for (const cat of cats) {
      const items = allAchievements.filter(a => a.galleryCategory === cat.id);
      // For secret, hide locked secret achievements
      const visible = cat.id === 'secret'
        ? items.filter(a => a.isUnlocked || !a.def.secret)
        : items;
      const hidden = items.length - visible.length;
      groups.push({ cat, items: visible });
    }
    return groups;
  }, [filter, allAchievements]);

  const content = (
    <div
      className={inline ? '' : 'modal'}
      onClick={inline ? undefined : e => e.stopPropagation()}
      style={inline ? { maxWidth: 680, margin: '0 auto' } : { maxWidth: 760, maxHeight: '90vh', overflow: 'auto' }}
    >
      {!inline && <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h2 style={{ color: 'var(--gold)', margin: '0 0 6px', fontSize: '1.6rem', fontFamily: 'Bebas Neue', letterSpacing: '0.1em' }}>
          🏆 ACHIEVEMENT GALLERY
        </h2>
        <div style={{ color: '#ccc', fontSize: '1rem', fontFamily: 'Bebas Neue', letterSpacing: '0.05em' }}>
          <span style={{ color: 'var(--gold)' }}>{stats.unlockedCount}</span>
          <span style={{ color: '#666' }}> / {stats.total} Unlocked</span>
          <span style={{ color: '#555', fontSize: '0.75rem', marginLeft: 8 }}>({stats.pct}%)</span>
        </div>
      </div>

      {/* Overall progress bar */}
      <div style={{
        width: '100%', height: 10, background: '#1a1a1a', borderRadius: 5,
        overflow: 'hidden', marginBottom: 20, border: '1px solid #333',
      }}>
        <div style={{
          width: `${stats.pct}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #b8860b, #ffd700, #f5d442)',
          borderRadius: 5,
          transition: 'width 0.6s ease',
          boxShadow: stats.unlockedCount > 0 ? '0 0 8px rgba(255,215,0,0.4)' : 'none',
        }} />
      </div>

      {/* Trophy Shelf */}
      <TrophyShelf />

      {/* Cosmetic rewards */}
      {cosmetics.length > 0 && (
        <div style={{
          marginBottom: 20, padding: '12px 16px',
          background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.15)',
          borderRadius: 10,
        }}>
          <div style={{ color: '#ffd700', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8, fontFamily: 'Bebas Neue' }}>
            🎨 Cosmetic Rewards Earned
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {cosmetics.map(c => (
              <span key={c.id} style={{
                background: c.type === 'cardBack' ? c.value + '20' : 'rgba(255,215,0,0.08)',
                border: `1px solid ${c.type === 'cardBack' ? c.value + '60' : 'rgba(255,215,0,0.25)'}`,
                borderRadius: 6, padding: '4px 12px', fontSize: '0.7rem',
                color: c.type === 'cardBack' ? c.value : '#ffd700',
              }}>
                {c.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Category filter tabs */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 20, justifyContent: 'center', flexWrap: 'wrap',
      }}>
        <button
          onClick={() => { setFilter('all'); sfx.categoryFilterClick(); }}
          style={{
            padding: '6px 14px', borderRadius: 8, fontSize: '0.75rem', fontFamily: 'Bebas Neue',
            letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.2s',
            background: filter === 'all' ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${filter === 'all' ? 'rgba(255,215,0,0.3)' : '#222'}`,
            color: filter === 'all' ? '#ffd700' : '#666',
          }}
        >
          ALL ({stats.unlockedCount}/{stats.total})
        </button>
        {GALLERY_CATEGORIES.map(gc => {
          const catStats = stats.byCategory[gc.id];
          const isActive = filter === gc.id;
          return (
            <button
              key={gc.id}
              onClick={() => { setFilter(gc.id); sfx.categoryFilterClick(); }}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: '0.75rem', fontFamily: 'Bebas Neue',
                letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.2s',
                background: isActive ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isActive ? 'rgba(255,215,0,0.3)' : '#222'}`,
                color: isActive ? '#ffd700' : '#666',
              }}
            >
              {gc.emoji} {gc.label.toUpperCase()} ({catStats.unlocked}/{catStats.total})
            </button>
          );
        })}
      </div>

      {/* Category sections */}
      {grouped.map(({ cat, items }) => {
        const catStats = stats.byCategory[cat.id];
        const isComplete = catStats.unlocked === catStats.total;
        const hiddenCount = allAchievements.filter(a => a.galleryCategory === cat.id).length - items.length;

        return (
          <div key={cat.id} style={{ marginBottom: 28 }}>
            {/* Category header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
              borderBottom: '1px solid rgba(212,168,67,0.12)', paddingBottom: 8,
            }}>
              <span style={{ fontSize: '1.2rem' }}>{cat.emoji}</span>
              <h3 style={{
                color: 'var(--gold)', fontSize: '1rem', margin: 0,
                fontFamily: 'Bebas Neue', letterSpacing: '0.08em',
              }}>
                {cat.label.toUpperCase()}
              </h3>
              <span style={{
                color: isComplete ? '#2ecc71' : '#555',
                fontSize: '0.75rem', fontFamily: 'Bebas Neue',
              }}>
                {catStats.unlocked}/{catStats.total}
              </span>
              {/* Mini progress bar */}
              <div style={{ flex: 1, maxWidth: 100, height: 4, background: '#222', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  width: `${catStats.total > 0 ? (catStats.unlocked / catStats.total) * 100 : 0}%`,
                  height: '100%',
                  background: isComplete ? '#2ecc71' : 'var(--gold)',
                  borderRadius: 2,
                  transition: 'width 0.4s',
                }} />
              </div>
            </div>

            <div style={{ color: '#555', fontSize: '0.65rem', marginBottom: 10, marginTop: -4 }}>
              {cat.description}
            </div>

            {/* Achievement grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(155px, 100%), 1fr))', gap: 10 }}>
              {items.map(ach => (
                <AchievementCard key={ach.def.id} achievement={ach} />
              ))}

              {/* Hidden secret placeholders */}
              {hiddenCount > 0 && Array.from({ length: hiddenCount }).map((_, i) => (
                <div key={`hidden-${i}`} style={{
                  background: 'rgba(255,255,255,0.015)',
                  border: '1px solid #1a1a1a',
                  borderRadius: 12, padding: '16px 12px', textAlign: 'center',
                  opacity: 0.25,
                }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: 8, filter: 'grayscale(1) brightness(0.3)' }}>🔮</div>
                  <div style={{ color: '#444', fontFamily: 'Bebas Neue', fontSize: '0.9rem' }}>???</div>
                  <div style={{ color: '#333', fontSize: '0.65rem', marginTop: 5 }}>A hidden achievement awaits...</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (inline) return content;

  return (
    <div className="modal-overlay" onClick={onClose}>
      {content}
    </div>
  );
}
