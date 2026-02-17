/**
 * R278: Seasonal Banner — shown on StartScreen during active events.
 */

import { useState, useEffect } from 'react';
import { getActiveEvent, getEventTimeRemaining } from '../seasonalEvents';
import type { SeasonalEvent } from '../seasonalEvents';

function TimeRemaining({ event }: { event: SeasonalEvent }) {
  const [remaining, setRemaining] = useState(getEventTimeRemaining(event));

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(getEventTimeRemaining(event));
    }, 60_000);
    return () => clearInterval(timer);
  }, [event]);

  const parts: string[] = [];
  if (remaining.days > 0) parts.push(`${remaining.days}d`);
  if (remaining.hours > 0) parts.push(`${remaining.hours}h`);
  parts.push(`${remaining.minutes}m`);

  return <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{parts.join(' ')} left</span>;
}

export default function SeasonalBanner() {
  const event = getActiveEvent();
  if (!event) return null;

  const { themeColors } = event;

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${themeColors.primary}22, ${themeColors.secondary}22)`,
        border: `1px solid ${themeColors.primary}44`,
        borderRadius: 12,
        padding: '12px 20px',
        marginBottom: 16,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated decorations */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          background: `radial-gradient(circle at 10% 50%, ${themeColors.primary}15 0%, transparent 50%), radial-gradient(circle at 90% 50%, ${themeColors.secondary}15 0%, transparent 50%)`,
        }}
      />
      <div style={{
        position: 'absolute',
        top: -20,
        right: -20,
        fontSize: '4rem',
        opacity: 0.1,
        transform: 'rotate(15deg)',
        pointerEvents: 'none',
      }}>
        {event.emoji}
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: themeColors.primary }}>
              {event.emoji} {event.name}
            </span>
            <span style={{
              marginLeft: 10,
              fontSize: '0.75rem',
              background: `${themeColors.primary}33`,
              color: themeColors.primary,
              padding: '2px 8px',
              borderRadius: 8,
              fontWeight: 600,
            }}>
              LIVE
            </span>
          </div>
          <div style={{ color: themeColors.secondary, fontSize: '0.8rem' }}>
            <TimeRemaining event={event} />
          </div>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: '#bbb', lineHeight: 1.4 }}>
          {event.description}
        </p>

        {/* Modifiers preview */}
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {event.modifiers.map(mod => (
            <span
              key={mod.id}
              style={{
                fontSize: '0.72rem',
                background: `${themeColors.primary}20`,
                color: themeColors.accent,
                padding: '2px 8px',
                borderRadius: 6,
                border: `1px solid ${themeColors.primary}30`,
              }}
            >
              {mod.description}
            </span>
          ))}
        </div>

        {/* Rewards preview */}
        {event.exclusiveRewards.length > 0 && (
          <div style={{ marginTop: 6, fontSize: '0.72rem', color: '#888' }}>
            🎁 Exclusive rewards: {event.exclusiveRewards.map(r => r.emoji).join(' ')}
          </div>
        )}
      </div>
    </div>
  );
}
