/**
 * R245 — Event Banner
 *
 * Animated banner showing active seasonal event with countdown.
 * Dismissable but persists as a small indicator.
 */
import { useState, useEffect, useMemo } from 'react';
import { getActiveEvent, getEventCountdown } from '../seasonalEvents';

export default function EventBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const activeEvent = useMemo(() => getActiveEvent(now), [now]);
  const countdown = useMemo(() => getEventCountdown(now), [now]);

  if (!countdown) return null;

  // Minimized indicator when dismissed
  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className="event-banner-minimized"
        aria-label={`${countdown.eventName} — click to expand`}
        style={{
          position: 'fixed',
          top: 8,
          left: 8,
          zIndex: 100,
          background: activeEvent
            ? `${activeEvent.themeColor}20`
            : 'rgba(255,255,255,0.05)',
          border: `1px solid ${activeEvent?.themeColor || '#444'}40`,
          borderRadius: 20,
          padding: '4px 12px',
          cursor: 'pointer',
          fontSize: '0.7rem',
          color: activeEvent?.themeColor || '#888',
          fontFamily: 'Bebas Neue, sans-serif',
          letterSpacing: '0.05em',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          animation: 'eventBannerPulse 3s ease-in-out infinite',
        }}
      >
        <span>{activeEvent?.emoji || '📅'}</span>
        <span>{countdown.daysRemaining}d</span>
      </button>
    );
  }

  // Full banner
  const isActive = countdown.active;

  return (
    <div
      className="event-banner"
      role="banner"
      aria-label={`Seasonal event: ${countdown.eventName}`}
      style={{
        background: isActive
          ? `linear-gradient(90deg, ${activeEvent!.themeColor}20 0%, ${activeEvent!.themeColor}08 50%, ${activeEvent!.themeColor}20 100%)`
          : 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        borderBottom: `1px solid ${isActive ? activeEvent!.themeColor : '#333'}40`,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        fontSize: '0.8rem',
        fontFamily: 'Bebas Neue, sans-serif',
        letterSpacing: '0.08em',
        color: isActive ? activeEvent!.themeColor : '#888',
        position: 'relative',
        zIndex: 50,
        animation: 'eventBannerSlideIn 0.5s ease-out',
      }}
    >
      {isActive && activeEvent ? (
        <>
          <span style={{ fontSize: '1.2rem', animation: 'eventEmojiFloat 2s ease-in-out infinite' }}>
            {activeEvent.emoji}
          </span>
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{activeEvent.name}</span>
          <span style={{ color: '#aaa', fontSize: '0.7rem' }}>
            {activeEvent.description}
          </span>
          <span style={{
            background: `${activeEvent.themeColor}15`,
            border: `1px solid ${activeEvent.themeColor}30`,
            borderRadius: 6,
            padding: '2px 8px',
            fontSize: '0.7rem',
            color: activeEvent.themeColor,
          }}>
            {countdown.daysRemaining}d remaining
          </span>
        </>
      ) : (
        <>
          <span style={{ fontSize: '1rem' }}>📅</span>
          <span>Next Event: {countdown.eventName}</span>
          <span style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid #333',
            borderRadius: 6,
            padding: '2px 8px',
            fontSize: '0.7rem',
          }}>
            in {countdown.daysRemaining} days
          </span>
        </>
      )}

      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss event banner"
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          color: '#555',
          cursor: 'pointer',
          fontSize: '0.85rem',
          padding: '2px 6px',
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}
