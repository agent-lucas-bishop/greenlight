// TrophyRoom.tsx — R269: Full-screen trophy showcase with 3D shelf display
import { useState, useMemo, useEffect } from 'react';
import { ACHIEVEMENTS, getUnlockedAchievements, getAchievementDates } from '../achievements';
import type { AchievementDef } from '../achievements';
import { getUnlocks } from '../unlocks';
import { getState } from '../gameStore';
import {
  GALLERY_CATEGORIES, RARITY_DEFS, getGalleryAchievements, getCompletionStats,
  getAchievementScore, getNearestToUnlock, ACHIEVEMENT_POINTS,
  RARITY_TO_MATERIAL, MATERIAL_COLORS,
  type GalleryCategory, type GalleryAchievement, type AchievementRarity,
} from '../achievements-gallery';
import { sfx } from '../sound';

type SortMode = 'date' | 'rarity' | 'name';
type FilterRarity = AchievementRarity | 'all';

const RARITY_ORDER: Record<AchievementRarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

// ─── Inject trophy room styles once ───
const STYLE_ID = 'trophy-room-styles';
function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes trophy-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    @keyframes trophy-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes diamond-sparkle {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 1; }
    }
    .trophy-item { transition: transform 0.3s, box-shadow 0.3s; cursor: pointer; }
    .trophy-item:hover { transform: scale(1.08) translateY(-4px) !important; z-index: 10; }
    .trophy-item-unlocked { animation: trophy-float 4s ease-in-out infinite; }
    .trophy-item-locked { filter: brightness(0.15) grayscale(1); opacity: 0.35; cursor: default; }
    .trophy-item-locked:hover { transform: scale(1.02) !important; }
    .trophy-tooltip {
      position: absolute; bottom: calc(100% + 12px); left: 50%; transform: translateX(-50%);
      background: rgba(10,10,10,0.95); border: 1px solid rgba(255,215,0,0.3); border-radius: 10px;
      padding: 14px 16px; min-width: 220px; max-width: 280px; z-index: 100;
      pointer-events: none; backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    }
    .trophy-tooltip::after {
      content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
      border: 6px solid transparent; border-top-color: rgba(255,215,0,0.3);
    }
    .trophy-shelf-row {
      background: linear-gradient(180deg, rgba(139,69,19,0.08) 0%, rgba(80,40,10,0.15) 100%);
      border-bottom: 3px solid rgba(139,69,19,0.25);
      border-radius: 8px 8px 0 0;
      padding: 20px 12px 16px;
      position: relative;
    }
    .trophy-shelf-row::after {
      content: ''; position: absolute; bottom: -8px; left: 5%; right: 5%;
      height: 8px; background: linear-gradient(180deg, rgba(139,69,19,0.2), transparent);
      border-radius: 0 0 8px 8px;
    }
  `;
  document.head.appendChild(style);
}

function TrophyItem({ achievement, index }: { achievement: GalleryAchievement; index: number }) {
  const [hovered, setHovered] = useState(false);
  const { def, isUnlocked, rarity, unlockDate } = achievement;
  const material = RARITY_TO_MATERIAL[rarity];
  const colors = MATERIAL_COLORS[material];
  const rarityDef = RARITY_DEFS[rarity];
  const isSecret = def.secret && !isUnlocked;
  const points = ACHIEVEMENT_POINTS[rarity];

  // Progress for locked items
  const prog = useMemo(() => {
    if (isUnlocked || !def.progress) return null;
    try {
      const state = getState();
      const unlockState = getUnlocks();
      return def.progress(state, unlockState);
    } catch { return null; }
  }, [isUnlocked, def]);

  return (
    <div
      className={`trophy-item ${isUnlocked ? 'trophy-item-unlocked' : 'trophy-item-locked'}`}
      style={{
        width: 110, textAlign: 'center', position: 'relative',
        animationDelay: `${index * 0.15}s`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Trophy pedestal */}
      <div style={{
        background: isUnlocked
          ? `linear-gradient(135deg, ${colors.primary}18, ${colors.secondary}12)`
          : 'rgba(255,255,255,0.01)',
        border: `2px solid ${isUnlocked ? colors.primary + '50' : '#1a1a1a'}`,
        borderRadius: 14, padding: '16px 8px 12px',
        boxShadow: isUnlocked ? `0 4px 20px ${colors.glow}` : 'none',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Material shimmer overlay for unlocked */}
        {isUnlocked && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: `linear-gradient(110deg, transparent 30%, ${colors.primary}15 45%, ${colors.primary}25 50%, ${colors.primary}15 55%, transparent 70%)`,
            backgroundSize: '200% 100%',
            animation: 'trophy-shimmer 3s ease-in-out infinite',
            pointerEvents: 'none', borderRadius: 'inherit',
          }} />
        )}

        {/* Diamond sparkle effect */}
        {isUnlocked && material === 'diamond' && (
          <div style={{
            position: 'absolute', top: 4, right: 4, fontSize: '0.5rem',
            animation: 'diamond-sparkle 1.5s ease-in-out infinite',
          }}>✨</div>
        )}

        {/* Trophy emoji */}
        <div style={{
          fontSize: '2.4rem', lineHeight: 1, marginBottom: 6,
          textShadow: isUnlocked ? `0 0 16px ${colors.glow}` : 'none',
        }}>
          {isSecret ? '❓' : (isUnlocked ? def.emoji : '🔒')}
        </div>

        {/* Name */}
        <div style={{
          color: isUnlocked ? colors.primary : '#333',
          fontFamily: 'Bebas Neue', fontSize: '0.7rem',
          letterSpacing: '0.04em', lineHeight: 1.2,
          minHeight: '2.4em',
        }}>
          {isSecret ? '???' : def.name}
        </div>

        {/* Material label */}
        {isUnlocked && (
          <div style={{
            color: colors.primary, fontSize: '0.5rem', fontFamily: 'Bebas Neue',
            letterSpacing: '0.1em', marginTop: 4, opacity: 0.7,
          }}>
            {material.toUpperCase()}
          </div>
        )}

        {/* Points badge */}
        <div style={{
          fontSize: '0.5rem', color: isUnlocked ? colors.primary : '#333',
          marginTop: 2, fontFamily: 'Bebas Neue',
        }}>
          {points} PTS
        </div>

        {/* Progress bar for locked with progress */}
        {!isUnlocked && prog && prog.target > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ width: '100%', height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, (prog.current / prog.target) * 100)}%`,
                height: '100%', background: `linear-gradient(90deg, ${colors.secondary}, ${colors.primary})`,
                borderRadius: 2, transition: 'width 0.3s',
              }} />
            </div>
            <div style={{ color: '#555', fontSize: '0.5rem', marginTop: 2 }}>
              {prog.current}/{prog.target}
            </div>
          </div>
        )}
      </div>

      {/* Shelf edge 3D */}
      <div style={{
        height: 5,
        background: 'linear-gradient(180deg, rgba(139,69,19,0.25), rgba(80,40,10,0.3))',
        borderRadius: '0 0 4px 4px',
        marginTop: -1,
      }} />

      {/* Hover tooltip */}
      {hovered && (
        <div className="trophy-tooltip">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: '1.4rem' }}>{isSecret ? '❓' : def.emoji}</span>
            <div>
              <div style={{ color: isUnlocked ? colors.primary : '#888', fontWeight: 700, fontSize: '0.9rem' }}>
                {isSecret ? '???' : def.name}
              </div>
              <div style={{ color: rarityDef.color, fontSize: '0.6rem', fontFamily: 'Bebas Neue', letterSpacing: '0.08em' }}>
                {rarityDef.label.toUpperCase()} • {material.toUpperCase()} • {points} PTS
              </div>
            </div>
          </div>
          <div style={{ color: '#aaa', fontSize: '0.75rem', lineHeight: 1.4, marginBottom: 6 }}>
            {isUnlocked ? def.description : (isSecret ? 'A hidden achievement awaits...' : def.hint)}
          </div>
          {isUnlocked && unlockDate && (
            <div style={{ color: '#666', fontSize: '0.6rem' }}>🗓️ Unlocked: {unlockDate}</div>
          )}
          {!isUnlocked && prog && prog.target > 0 && (
            <div style={{ color: '#666', fontSize: '0.6rem' }}>
              Progress: {prog.current}/{prog.target} ({Math.round((prog.current / prog.target) * 100)}%)
            </div>
          )}
          {def.starPowerReward && (
            <div style={{ color: '#ffd700', fontSize: '0.6rem', marginTop: 4 }}>
              ⭐ {def.starPowerReward.label}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TrophyRoom({ onClose }: { onClose: () => void }) {
  const [categoryFilter, setCategoryFilter] = useState<GalleryCategory | 'all'>('all');
  const [rarityFilter, setRarityFilter] = useState<FilterRarity>('all');
  const [sortMode, setSortMode] = useState<SortMode>('rarity');

  useEffect(() => { ensureStyles(); sfx.galleryOpenWhoosh(); }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const allAchievements = useMemo(() => getGalleryAchievements(), []);
  const completionStats = useMemo(() => getCompletionStats(), []);
  const scoreStats = useMemo(() => getAchievementScore(), []);
  const [nearUnlock, setNearUnlock] = useState<import('../achievements-gallery').GalleryAchievement[]>([]);
  useEffect(() => { getNearestToUnlock().then(setNearUnlock); }, []);

  // Filter
  const filtered = useMemo(() => {
    let items = allAchievements;
    if (categoryFilter !== 'all') items = items.filter(a => a.galleryCategory === categoryFilter);
    if (rarityFilter !== 'all') items = items.filter(a => a.rarity === rarityFilter);
    return items;
  }, [allAchievements, categoryFilter, rarityFilter]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortMode) {
      case 'date':
        return arr.sort((a, b) => {
          if (a.isUnlocked && !b.isUnlocked) return -1;
          if (!a.isUnlocked && b.isUnlocked) return 1;
          if (a.unlockDate && b.unlockDate) return b.unlockDate.localeCompare(a.unlockDate);
          return 0;
        });
      case 'rarity':
        return arr.sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]);
      case 'name':
        return arr.sort((a, b) => a.def.name.localeCompare(b.def.name));
      default:
        return arr;
    }
  }, [filtered, sortMode]);

  // Group by category for shelf display
  const grouped = useMemo(() => {
    if (categoryFilter !== 'all') {
      return [{ cat: GALLERY_CATEGORIES.find(c => c.id === categoryFilter)!, items: sorted }];
    }
    return GALLERY_CATEGORIES.map(cat => ({
      cat,
      items: sorted.filter(a => a.galleryCategory === cat.id),
    })).filter(g => g.items.length > 0);
  }, [sorted, categoryFilter]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{
        maxWidth: 900, maxHeight: '95vh', overflow: 'auto', padding: '24px 20px',
      }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h2 style={{
            color: 'var(--gold)', margin: '0 0 6px', fontSize: '2rem',
            fontFamily: 'Bebas Neue', letterSpacing: '0.12em',
          }}>
            🏆 TROPHY ROOM
          </h2>

          {/* Achievement Score */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,215,0,0.05))',
            border: '1px solid rgba(255,215,0,0.25)', borderRadius: 12,
            padding: '10px 24px', marginBottom: 12,
          }}>
            <div>
              <div style={{ color: '#ffd700', fontFamily: 'Bebas Neue', fontSize: '2rem', lineHeight: 1 }}>
                {scoreStats.earned}
              </div>
              <div style={{ color: '#888', fontSize: '0.6rem', fontFamily: 'Bebas Neue', letterSpacing: '0.08em' }}>
                ACHIEVEMENT SCORE
              </div>
            </div>
            <div style={{ width: 1, height: 36, background: 'rgba(255,215,0,0.15)' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: '#ccc', fontSize: '0.85rem', fontFamily: 'Bebas Neue' }}>
                {completionStats.unlockedCount} / {completionStats.total}
              </div>
              <div style={{ color: '#666', fontSize: '0.6rem' }}>
                {completionStats.pct}% Complete
              </div>
            </div>
          </div>

          {/* Overall progress bar */}
          <div style={{
            width: '100%', maxWidth: 500, margin: '0 auto', height: 10,
            background: '#1a1a1a', borderRadius: 5, overflow: 'hidden', border: '1px solid #333',
          }}>
            <div style={{
              width: `${completionStats.pct}%`, height: '100%',
              background: 'linear-gradient(90deg, #b8860b, #ffd700, #f5d442)',
              borderRadius: 5, transition: 'width 0.6s ease',
              boxShadow: completionStats.unlockedCount > 0 ? '0 0 8px rgba(255,215,0,0.4)' : 'none',
            }} />
          </div>

          {/* Category completion mini-bars */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            {GALLERY_CATEGORIES.map(cat => {
              const cs = completionStats.byCategory[cat.id];
              const pct = cs.total > 0 ? Math.round((cs.unlocked / cs.total) * 100) : 0;
              const catScore = scoreStats.byCategory[cat.id];
              return (
                <div key={cat.id} style={{ textAlign: 'center', minWidth: 80 }}>
                  <div style={{ color: '#888', fontSize: '0.6rem', fontFamily: 'Bebas Neue' }}>
                    {cat.emoji} {cat.label.toUpperCase()}
                  </div>
                  <div style={{ width: 80, height: 4, background: '#222', borderRadius: 2, overflow: 'hidden', margin: '3px auto' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--gold)', borderRadius: 2 }} />
                  </div>
                  <div style={{ color: '#555', fontSize: '0.5rem' }}>
                    {cs.unlocked}/{cs.total} • {catScore.earned} pts
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Nearest to unlock suggestions */}
        {nearUnlock.length > 0 && (
          <div style={{
            marginBottom: 20, padding: '12px 16px',
            background: 'rgba(46,204,113,0.05)', border: '1px solid rgba(46,204,113,0.15)',
            borderRadius: 10,
          }}>
            <div style={{ color: '#2ecc71', fontSize: '0.65rem', fontFamily: 'Bebas Neue', letterSpacing: '0.1em', marginBottom: 8 }}>
              🎯 NEAREST TO UNLOCK
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {nearUnlock.slice(0, 5).map(a => {
                const prog = a.def.progress ? (() => {
                  try { return a.def.progress!(getState(), getUnlocks()); } catch { return null; }
                })() : null;
                return (
                  <span key={a.def.id} style={{
                    background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.2)',
                    borderRadius: 6, padding: '4px 10px', fontSize: '0.7rem', color: '#aaa',
                  }}>
                    {a.def.emoji} {a.def.name}
                    {prog && <span style={{ color: '#2ecc71', marginLeft: 4 }}>({prog.current}/{prog.target})</span>}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters & Sort */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value as GalleryCategory | 'all'); sfx.categoryFilterClick(); }}
            style={{
              background: '#1a1a1a', color: '#ccc', border: '1px solid #333',
              borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem',
            }}
          >
            <option value="all">All Categories</option>
            {GALLERY_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
            ))}
          </select>

          {/* Rarity filter */}
          <select
            value={rarityFilter}
            onChange={e => { setRarityFilter(e.target.value as FilterRarity); sfx.categoryFilterClick(); }}
            style={{
              background: '#1a1a1a', color: '#ccc', border: '1px solid #333',
              borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem',
            }}
          >
            <option value="all">All Rarities</option>
            {(Object.keys(RARITY_DEFS) as AchievementRarity[]).map(r => (
              <option key={r} value={r}>{RARITY_DEFS[r].label}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortMode}
            onChange={e => setSortMode(e.target.value as SortMode)}
            style={{
              background: '#1a1a1a', color: '#ccc', border: '1px solid #333',
              borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem',
            }}
          >
            <option value="rarity">Sort: Rarity</option>
            <option value="date">Sort: Unlock Date</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>

        {/* Trophy shelves by category */}
        {grouped.map(({ cat, items }) => {
          const catStats = completionStats.byCategory[cat.id];
          return (
            <div key={cat.id} style={{ marginBottom: 28 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
              }}>
                <span style={{ fontSize: '1.2rem' }}>{cat.emoji}</span>
                <h3 style={{
                  color: 'var(--gold)', fontSize: '1rem', margin: 0,
                  fontFamily: 'Bebas Neue', letterSpacing: '0.08em',
                }}>
                  {cat.label.toUpperCase()}
                </h3>
                <span style={{ color: '#555', fontSize: '0.7rem', fontFamily: 'Bebas Neue' }}>
                  {catStats.unlocked}/{catStats.total}
                </span>
              </div>

              <div className="trophy-shelf-row">
                <div style={{
                  display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center',
                }}>
                  {items.map((ach, i) => (
                    <TrophyItem key={ach.def.id} achievement={ach} index={i} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {sorted.length === 0 && (
          <div style={{ textAlign: 'center', color: '#555', padding: 40 }}>
            No achievements match the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}
