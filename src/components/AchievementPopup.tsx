// AchievementPopup.tsx — R269: Toast notification with queue system for mid-game achievement unlocks
import { useState, useEffect, useCallback, useRef } from 'react';
import type { AchievementDef } from '../achievements';
import { RARITY_DEFS, getAchievementRarity, ACHIEVEMENT_POINTS, type AchievementRarity } from '../achievements-gallery';
import { announce } from '../accessibility';

interface PopupItem {
  achievement: AchievementDef;
  id: number;
}

let popupId = 0;
const pendingQueue: PopupItem[] = [];
let flushCallback: (() => void) | null = null;

/** Call from anywhere to queue an achievement popup */
export function queueAchievementPopup(achievement: AchievementDef) {
  pendingQueue.push({ achievement, id: ++popupId });
  if (flushCallback) flushCallback();
}

/** Call to queue multiple at once (staggered by 500ms internally) */
export function queueAchievementPopups(achievements: AchievementDef[]) {
  for (const ach of achievements) {
    pendingQueue.push({ achievement: ach, id: ++popupId });
  }
  if (flushCallback) flushCallback();
}

export default function AchievementPopup() {
  const [activeItems, setActiveItems] = useState<(PopupItem & { exiting: boolean })[]>([]);
  const staggerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const processQueue = useCallback(() => {
    if (pendingQueue.length === 0) return;

    const showNext = () => {
      if (pendingQueue.length === 0) return;
      const item = pendingQueue.shift()!;
      setActiveItems(prev => [...prev, { ...item, exiting: false }]);

      // Announce for screen readers
      announce(`Achievement unlocked: ${item.achievement.name}. ${item.achievement.description}`);

      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        setActiveItems(prev => prev.map(p => p.id === item.id ? { ...p, exiting: true } : p));
        setTimeout(() => {
          setActiveItems(prev => prev.filter(p => p.id !== item.id));
        }, 400);
      }, 4000);

      // Stagger next by 500ms
      if (pendingQueue.length > 0) {
        staggerTimerRef.current = setTimeout(showNext, 500);
      }
    };

    showNext();
  }, []);

  useEffect(() => {
    flushCallback = processQueue;
    // Check if anything was queued before mount
    if (pendingQueue.length > 0) processQueue();
    return () => {
      flushCallback = null;
      if (staggerTimerRef.current) clearTimeout(staggerTimerRef.current);
    };
  }, [processQueue]);

  const dismiss = useCallback((id: number) => {
    setActiveItems(prev => prev.map(p => p.id === id ? { ...p, exiting: true } : p));
    setTimeout(() => {
      setActiveItems(prev => prev.filter(p => p.id !== id));
    }, 400);
  }, []);

  if (activeItems.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9998,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      {activeItems.map((item, index) => {
        const rarity = getAchievementRarity(item.achievement);
        const rarityDef = RARITY_DEFS[rarity];
        const points = ACHIEVEMENT_POINTS[rarity];

        return (
          <div
            key={item.id}
            role="alert"
            aria-live="assertive"
            className={`achievement-popup-sfx-${rarity}`}
            onClick={() => dismiss(item.id)}
            style={{
              pointerEvents: 'auto',
              background: 'linear-gradient(135deg, rgba(10,10,10,0.95), rgba(20,20,20,0.95))',
              border: `2px solid ${rarityDef.color}`,
              borderRadius: 12,
              padding: '14px 18px',
              backdropFilter: 'blur(12px)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12,
              minWidth: 280, maxWidth: 380,
              boxShadow: `0 4px 24px ${rarityDef.glowColor}, 0 0 0 1px rgba(0,0,0,0.3)`,
              transform: item.exiting ? 'translateX(120%)' : 'translateX(0)',
              opacity: item.exiting ? 0 : 1,
              animation: item.exiting ? undefined : 'achievementSlideIn 0.4s ease-out',
              transition: 'transform 0.4s ease-in, opacity 0.4s',
            }}
          >
            {/* Trophy icon */}
            <div style={{
              fontSize: '2rem', lineHeight: 1, flexShrink: 0,
              textShadow: `0 0 12px ${rarityDef.glowColor}`,
            }}>
              {item.achievement.emoji}
            </div>

            {/* Text content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                color: rarityDef.color, fontFamily: 'Bebas Neue',
                fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase',
              }}>
                🏅 Achievement Unlocked • +{points} pts
              </div>
              <div style={{
                color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {item.achievement.name}
              </div>
              <div style={{
                color: '#999', fontSize: '0.7rem', lineHeight: 1.3,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {item.achievement.description}
              </div>
              {item.achievement.starPowerReward && (
                <div style={{ color: '#ffd700', fontSize: '0.6rem', marginTop: 2 }}>
                  ⭐ {item.achievement.starPowerReward.label}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
