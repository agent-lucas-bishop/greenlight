// Achievement gallery — shows all achievements as locked/unlocked cards with progress bars
import { ACHIEVEMENTS, CATEGORY_LABELS, getUnlockedAchievements, getEarnedCosmetics, getAchievementDates } from '../achievements';
import type { AchievementCategory } from '../achievements';
import { getUnlocks } from '../unlocks';
import { getState } from '../gameStore';

export default function AchievementGallery({ onClose }: { onClose: () => void }) {
  const unlocked = getUnlockedAchievements();
  const cosmetics = getEarnedCosmetics();
  const dates = getAchievementDates();
  const categories: AchievementCategory[] = ['milestone', 'discovery', 'skill', 'fun', 'secret'];
  const state = getState();
  const unlockState = getUnlocks();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: '85vh', overflow: 'auto' }}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 style={{ color: 'var(--gold)', marginBottom: 8, textAlign: 'center' }}>🏆 Achievements</h2>
        
        <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 8, textAlign: 'center' }}>
          {unlocked.length}/{ACHIEVEMENTS.length} unlocked
        </p>

        {/* Overall progress bar */}
        <div style={{
          width: '100%', height: 8, background: '#222', borderRadius: 4,
          overflow: 'hidden', marginBottom: 24,
        }}>
          <div style={{
            width: `${(unlocked.length / ACHIEVEMENTS.length) * 100}%`,
            height: '100%', background: 'linear-gradient(90deg, #ffd700, #f39c12)',
            borderRadius: 4, transition: 'width 0.5s',
          }} />
        </div>

        {/* Cosmetic rewards summary */}
        {cosmetics.length > 0 && (
          <div style={{
            marginBottom: 20, padding: '10px 16px',
            background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)',
            borderRadius: 8,
          }}>
            <div style={{ color: '#ffd700', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              🎨 Cosmetic Rewards Earned
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {cosmetics.map(c => (
                <span key={c.id} style={{
                  background: c.type === 'cardBack' ? c.value + '30' : 'rgba(255,215,0,0.1)',
                  border: `1px solid ${c.type === 'cardBack' ? c.value : 'rgba(255,215,0,0.3)'}`,
                  borderRadius: 6, padding: '3px 10px', fontSize: '0.7rem',
                  color: c.type === 'cardBack' ? c.value : '#ffd700',
                }}>
                  {c.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {categories.map(cat => {
          const catAchs = ACHIEVEMENTS.filter(a => a.category === cat);
          const catInfo = CATEGORY_LABELS[cat];
          const catUnlocked = catAchs.filter(a => unlocked.includes(a.id)).length;
          // For secret category, only show unlocked ones + a "???" placeholder for remaining
          const visibleAchs = cat === 'secret'
            ? catAchs.filter(a => unlocked.includes(a.id) || !a.secret)
            : catAchs;
          const hiddenCount = cat === 'secret' ? catAchs.length - visibleAchs.length : 0;

          return (
            <div key={cat} style={{ marginBottom: 24 }}>
              <h3 style={{
                color: 'var(--gold)', fontSize: '0.9rem', marginBottom: 10,
                letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {catInfo.emoji} {catInfo.label.toUpperCase()}
                <span style={{ color: '#666', fontSize: '0.7rem', fontFamily: 'inherit' }}>
                  ({catUnlocked}/{catAchs.length})
                </span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {visibleAchs.map(ach => {
                  const isUnlocked = unlocked.includes(ach.id);
                  const date = dates[ach.id];
                  const prog = !isUnlocked && ach.progress ? ach.progress(state, unlockState) : null;
                  return (
                    <div key={ach.id} style={{
                      background: isUnlocked
                        ? 'linear-gradient(135deg, rgba(255,215,0,0.08), rgba(212,168,67,0.04))'
                        : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isUnlocked ? 'rgba(255,215,0,0.3)' : '#222'}`,
                      borderRadius: 10, padding: '14px 12px', textAlign: 'center',
                      opacity: isUnlocked ? 1 : 0.5,
                      transition: 'all 0.3s',
                    }}>
                      <div style={{
                        fontSize: '2rem', marginBottom: 6,
                        filter: isUnlocked ? 'none' : 'grayscale(1) brightness(0.4)',
                      }}>
                        {isUnlocked ? ach.emoji : '❓'}
                      </div>
                      <div style={{
                        color: isUnlocked ? '#ffd700' : '#555',
                        fontFamily: 'Bebas Neue', fontSize: '0.9rem',
                        letterSpacing: '0.05em',
                      }}>
                        {isUnlocked ? ach.name : (ach.secret ? '???' : ach.name)}
                      </div>
                      <div style={{
                        color: isUnlocked ? '#aaa' : '#444',
                        fontSize: '0.7rem', marginTop: 4, lineHeight: 1.4,
                      }}>
                        {isUnlocked ? ach.description : ach.hint}
                      </div>
                      {/* Unlock date */}
                      {isUnlocked && date && (
                        <div style={{ color: '#555', fontSize: '0.6rem', marginTop: 4 }}>
                          Unlocked {date}
                        </div>
                      )}
                      {/* Progress bar for incremental achievements */}
                      {prog && prog.target > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ width: '100%', height: 4, background: '#222', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{
                              width: `${(prog.current / prog.target) * 100}%`,
                              height: '100%', background: '#ffd700', borderRadius: 2, transition: 'width 0.3s',
                            }} />
                          </div>
                          <div style={{ color: '#555', fontSize: '0.6rem', marginTop: 2 }}>
                            {prog.current}/{prog.target}
                          </div>
                        </div>
                      )}
                      {isUnlocked && ach.cosmeticReward && (
                        <div style={{
                          marginTop: 6, padding: '2px 8px',
                          background: 'rgba(255,215,0,0.1)', borderRadius: 4,
                          color: '#ffd700', fontSize: '0.6rem',
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
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid #222',
                    borderRadius: 10, padding: '14px 12px', textAlign: 'center',
                    opacity: 0.3,
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: 6, filter: 'grayscale(1) brightness(0.4)' }}>🔮</div>
                    <div style={{ color: '#555', fontFamily: 'Bebas Neue', fontSize: '0.9rem' }}>???</div>
                    <div style={{ color: '#444', fontSize: '0.7rem', marginTop: 4 }}>A hidden achievement awaits...</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
