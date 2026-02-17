// Achievement gallery — shows all achievements as locked/unlocked cards with progress bars
// Enhanced R158: full tab/modal with categories, run info, and polished styling
import { useEffect } from 'react';
import { ACHIEVEMENTS, CATEGORY_LABELS, getUnlockedAchievements, getEarnedCosmetics, getAchievementDates } from '../achievements';
import type { AchievementCategory } from '../achievements';
import { getUnlocks } from '../unlocks';
import { getState } from '../gameStore';
import { getLeaderboard } from '../leaderboard';

// Map internal categories to display groups for the gallery
type GalleryCategory = 'career' | 'singleRun' | 'challenge' | 'secret';

const GALLERY_CATEGORIES: { id: GalleryCategory; label: string; emoji: string; internal: AchievementCategory[] }[] = [
  { id: 'career', label: 'Career', emoji: '🏛️', internal: ['milestone', 'discovery'] },
  { id: 'singleRun', label: 'Single Run', emoji: '🎬', internal: ['fun'] },
  { id: 'challenge', label: 'Challenge', emoji: '💪', internal: ['skill'] },
  { id: 'secret', label: 'Secret', emoji: '🔮', internal: ['secret'] },
];

function getGalleryCategory(cat: AchievementCategory): GalleryCategory {
  for (const gc of GALLERY_CATEGORIES) {
    if (gc.internal.includes(cat)) return gc.id;
  }
  return 'career';
}

// Try to find which run unlocked an achievement based on date
function findRunForDate(dateStr: string): string | null {
  const leaderboard = getLeaderboard();
  for (const entry of leaderboard) {
    if (entry.date === dateStr) {
      return entry.studioName || `${entry.archetype} run`;
    }
  }
  return null;
}

export default function AchievementGallery({ onClose, inline }: { onClose: () => void; inline?: boolean }) {
  // Escape key to close
  useEffect(() => {
    if (inline) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, inline]);

  const unlocked = getUnlockedAchievements();
  const cosmetics = getEarnedCosmetics();
  const dates = getAchievementDates();
  const state = getState();
  const unlockState = getUnlocks();
  const totalCount = ACHIEVEMENTS.length;
  const unlockedCount = unlocked.length;
  const pct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const content = (
      <div className={inline ? '' : 'modal'} onClick={inline ? undefined : e => e.stopPropagation()} style={inline ? { maxWidth: 620, margin: '0 auto' } : { maxWidth: 720, maxHeight: '88vh', overflow: 'auto' }}>
        {!inline && <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>}

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <h2 style={{ color: 'var(--gold)', margin: '0 0 6px', fontSize: '1.6rem', fontFamily: 'Bebas Neue', letterSpacing: '0.1em' }}>
            🏆 ACHIEVEMENT GALLERY
          </h2>
          <div style={{ color: '#ccc', fontSize: '1rem', fontFamily: 'Bebas Neue', letterSpacing: '0.05em' }}>
            <span style={{ color: 'var(--gold)' }}>{unlockedCount}</span>
            <span style={{ color: '#666' }}> / {totalCount} Unlocked</span>
            <span style={{ color: '#555', fontSize: '0.75rem', marginLeft: 8 }}>({pct}%)</span>
          </div>
        </div>

        {/* Overall progress bar */}
        <div style={{
          width: '100%', height: 10, background: '#1a1a1a', borderRadius: 5,
          overflow: 'hidden', marginBottom: 20, border: '1px solid #333',
        }}>
          <div style={{
            width: `${(unlockedCount / totalCount) * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #b8860b, #ffd700, #f5d442)',
            borderRadius: 5,
            transition: 'width 0.6s ease',
            boxShadow: unlockedCount > 0 ? '0 0 8px rgba(255,215,0,0.4)' : 'none',
          }} />
        </div>

        {/* Cosmetic rewards summary */}
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

        {/* Categories */}
        {GALLERY_CATEGORIES.map(gc => {
          const catAchs = ACHIEVEMENTS.filter(a => getGalleryCategory(a.category) === gc.id);
          const catUnlocked = catAchs.filter(a => unlocked.includes(a.id)).length;
          const isSecret = gc.id === 'secret';
          const visibleAchs = isSecret
            ? catAchs.filter(a => unlocked.includes(a.id) || !a.secret)
            : catAchs;
          const hiddenCount = isSecret ? catAchs.length - visibleAchs.length : 0;

          return (
            <div key={gc.id} style={{ marginBottom: 28 }}>
              {/* Category header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
                borderBottom: '1px solid rgba(212,168,67,0.12)', paddingBottom: 8,
              }}>
                <span style={{ fontSize: '1.2rem' }}>{gc.emoji}</span>
                <h3 style={{
                  color: 'var(--gold)', fontSize: '1rem', margin: 0,
                  fontFamily: 'Bebas Neue', letterSpacing: '0.08em',
                }}>
                  {gc.label.toUpperCase()}
                </h3>
                <span style={{
                  color: catUnlocked === catAchs.length ? '#2ecc71' : '#555',
                  fontSize: '0.75rem', fontFamily: 'Bebas Neue',
                }}>
                  {catUnlocked}/{catAchs.length}
                </span>
                {/* Category mini progress */}
                <div style={{ flex: 1, maxWidth: 100, height: 4, background: '#222', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${catAchs.length > 0 ? (catUnlocked / catAchs.length) * 100 : 0}%`,
                    height: '100%',
                    background: catUnlocked === catAchs.length ? '#2ecc71' : 'var(--gold)',
                    borderRadius: 2,
                    transition: 'width 0.4s',
                  }} />
                </div>
              </div>

              {/* Achievement cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(155px, 100%), 1fr))', gap: 10 }}>
                {visibleAchs.map(ach => {
                  const isUnlocked = unlocked.includes(ach.id);
                  const date = dates[ach.id];
                  const runName = date ? findRunForDate(date) : null;
                  const prog = !isUnlocked && ach.progress ? ach.progress(state, unlockState) : null;

                  return (
                    <div key={ach.id} style={{
                      background: isUnlocked
                        ? 'linear-gradient(135deg, rgba(255,215,0,0.07), rgba(212,168,67,0.03))'
                        : 'rgba(255,255,255,0.015)',
                      border: `1px solid ${isUnlocked ? 'rgba(255,215,0,0.25)' : '#1a1a1a'}`,
                      borderRadius: 12, padding: '16px 12px', textAlign: 'center',
                      opacity: isUnlocked ? 1 : 0.45,
                      transition: 'all 0.3s, opacity 0.3s',
                      position: 'relative',
                    }}>
                      {/* Earned glow */}
                      {isUnlocked && (
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                          borderRadius: 12,
                          boxShadow: 'inset 0 0 20px rgba(255,215,0,0.05)',
                          pointerEvents: 'none',
                        }} />
                      )}

                      {/* Emoji / silhouette */}
                      <div style={{
                        fontSize: '2.2rem', marginBottom: 8, lineHeight: 1,
                        filter: isUnlocked ? 'none' : 'grayscale(1) brightness(0.3)',
                        transition: 'filter 0.3s',
                      }}>
                        {isUnlocked ? ach.emoji : (ach.secret ? '❓' : ach.emoji)}
                      </div>

                      {/* Name */}
                      <div style={{
                        color: isUnlocked ? '#ffd700' : '#444',
                        fontFamily: 'Bebas Neue', fontSize: '0.9rem',
                        letterSpacing: '0.04em', lineHeight: 1.2,
                      }}>
                        {isUnlocked ? ach.name : (ach.secret ? '???' : ach.name)}
                      </div>

                      {/* Description / hint */}
                      <div style={{
                        color: isUnlocked ? '#999' : '#333',
                        fontSize: '0.65rem', marginTop: 5, lineHeight: 1.4,
                        minHeight: '2.8em',
                      }}>
                        {isUnlocked ? ach.description : ach.hint}
                      </div>

                      {/* Unlock date + run */}
                      {isUnlocked && date && (
                        <div style={{ color: '#555', fontSize: '0.55rem', marginTop: 6, lineHeight: 1.4 }}>
                          <div>🗓️ {date}</div>
                          {runName && <div style={{ color: '#666' }}>📍 {runName}</div>}
                        </div>
                      )}

                      {/* Progress bar for incremental achievements */}
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

                      {/* Cosmetic reward badge */}
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
                    </div>
                  );
                })}

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
