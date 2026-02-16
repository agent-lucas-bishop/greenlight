// Achievement gallery — shows all achievements as locked/unlocked cards
import { ACHIEVEMENTS, CATEGORY_LABELS, getUnlockedAchievements, getEarnedCosmetics } from '../achievements';
import type { AchievementCategory } from '../achievements';

export default function AchievementGallery() {
  const unlocked = getUnlockedAchievements();
  const cosmetics = getEarnedCosmetics();
  const categories: AchievementCategory[] = ['milestone', 'skill', 'discovery', 'fun'];

  return (
    <div style={{ maxWidth: 650, margin: '0 auto' }}>
      <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 8 }}>
        {unlocked.length}/{ACHIEVEMENTS.length} achievements unlocked
      </p>

      {/* Progress bar */}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
              {catAchs.map(ach => {
                const isUnlocked = unlocked.includes(ach.id);
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
                      {isUnlocked ? ach.name : '???'}
                    </div>
                    <div style={{
                      color: isUnlocked ? '#aaa' : '#444',
                      fontSize: '0.7rem', marginTop: 4, lineHeight: 1.4,
                    }}>
                      {isUnlocked ? ach.description : ach.hint}
                    </div>
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
