/**
 * R210 — Seasonal Event Banner
 *
 * Subtle top banner showing current real-world seasonal events.
 * Dismissible with a close button.
 */
import { useState, useMemo } from 'react';
import { getActiveSeasonalEvents, type SeasonalEvent } from '../seasonalEvents';

export default function SeasonalBanner() {
  const [dismissed, setDismissed] = useState(false);

  const activeEvents = useMemo(() => getActiveSeasonalEvents(), []);

  if (activeEvents.length === 0 || dismissed) return null;

  // Use the first event's color as the primary theme; blend if multiple
  const primaryEvent = activeEvents[0];

  return (
    <div
      role="banner"
      aria-label="Seasonal event"
      style={{
        background: `linear-gradient(90deg, ${primaryEvent.themeColor}18 0%, ${primaryEvent.themeColor}08 100%)`,
        borderBottom: `1px solid ${primaryEvent.themeColor}40`,
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        fontSize: '0.75rem',
        fontFamily: 'Bebas Neue, sans-serif',
        letterSpacing: '0.08em',
        color: primaryEvent.themeColor,
        position: 'relative',
        zIndex: 50,
      }}
    >
      {activeEvents.map((event: SeasonalEvent) => (
        <span key={event.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '1rem' }}>{event.emoji}</span>
          <span>{event.name}</span>
          <span style={{ color: '#888', fontSize: '0.65rem', fontFamily: 'inherit' }}>
            {event.affectedGenres.join(', ')} — {event.description}
          </span>
        </span>
      ))}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss seasonal banner"
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          color: '#666',
          cursor: 'pointer',
          fontSize: '0.9rem',
          padding: '2px 6px',
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}
