/**
 * R197 — World Event Banner (Breaking News Ticker)
 */
import { useState, useEffect, useRef } from 'react';
import type { ActiveWorldEvent } from '../worldEvents';
import { sfx } from '../sound';

interface Props {
  events: ActiveWorldEvent[];
  currentSeason: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  market: '#3b82f6',
  industry: '#f59e0b',
  cultural: '#a855f7',
  disaster: '#ef4444',
};

const SENTIMENT_BG: Record<string, string> = {
  positive: 'rgba(34, 197, 94, 0.08)',
  negative: 'rgba(239, 68, 68, 0.08)',
  mixed: 'rgba(245, 158, 11, 0.08)',
};

export default function WorldEventBanner({ events, currentSeason }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const prevEventIds = useRef<string[]>([]);

  // Play breakingNews when new events appear
  useEffect(() => {
    const currentIds = events.map(e => e.id);
    const newEvents = currentIds.filter(id => !prevEventIds.current.includes(id));
    if (newEvents.length > 0 && prevEventIds.current.length > 0) {
      sfx.breakingNews();
    } else if (prevEventIds.current.length > 0) {
      // Events removed = ended
      const ended = prevEventIds.current.filter(id => !currentIds.includes(id));
      if (ended.length > 0) sfx.eventEnd();
    }
    prevEventIds.current = currentIds;
  }, [events.map(e => e.id).join(',')]);

  // Play breakingNews on first render with events
  const initialRef = useRef(true);
  useEffect(() => {
    if (initialRef.current && events.length > 0) {
      initialRef.current = false;
      sfx.breakingNews();
    }
  }, [events.length]);

  if (events.length === 0) return null;

  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        style={{
          position: 'fixed',
          top: 8,
          right: 8,
          zIndex: 1000,
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 8,
          padding: '6px 10px',
          color: '#94a3b8',
          cursor: 'pointer',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
        title="Show world events"
      >
        📰 {events.length}
      </button>
    );
  }

  return (
    <div style={{
      position: 'relative',
      zIndex: 100,
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderBottom: '2px solid #334155',
      padding: '0',
      overflow: 'hidden',
    }}>
      {/* Breaking News Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 12px',
        background: 'rgba(239, 68, 68, 0.15)',
        borderBottom: '1px solid #334155',
      }}>
        <span style={{
          background: '#ef4444',
          color: 'white',
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: 3,
          letterSpacing: 1,
          textTransform: 'uppercase',
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          BREAKING
        </span>
        <div style={{
          flex: 1,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}>
          <span style={{
            display: 'inline-block',
            animation: events.length > 1 ? 'ticker 15s linear infinite' : 'none',
            color: '#e2e8f0',
            fontSize: 12,
            fontWeight: 600,
          }}>
            {events.map((e, i) => (
              <span key={e.id}>
                {e.emoji} {e.headline}
                {i < events.length - 1 ? '  ◆  ' : ''}
              </span>
            ))}
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: 16,
            padding: '0 4px',
            lineHeight: 1,
          }}
          title="Dismiss"
        >
          ✕
        </button>
      </div>

      {/* Event Cards */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '8px 12px',
        overflowX: 'auto',
      }}>
        {events.map(event => {
          const remaining = event.endSeason - currentSeason + 1;
          const isExpanded = expanded === event.id;
          const catColor = CATEGORY_COLORS[event.category] || '#64748b';
          
          return (
            <div
              key={event.id}
              onClick={() => {
                setExpanded(isExpanded ? null : event.id);
                if (!isExpanded) {
                  if (event.sentiment === 'positive') sfx.eventPositive();
                  else if (event.sentiment === 'negative') sfx.eventNegative();
                }
              }}
              style={{
                flex: '0 0 auto',
                minWidth: 200,
                maxWidth: 320,
                background: SENTIMENT_BG[event.sentiment] || 'rgba(30, 41, 59, 0.5)',
                border: `1px solid ${catColor}33`,
                borderRadius: 8,
                padding: '8px 12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                marginBottom: isExpanded ? 6 : 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18 }}>{event.emoji}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                      {event.name}
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 2 }}>
                      <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: catColor,
                        letterSpacing: 0.5,
                      }}>
                        {event.category}
                      </span>
                      <span style={{ fontSize: 9, color: '#64748b' }}>•</span>
                      <span style={{
                        fontSize: 9,
                        color: remaining <= 1 ? '#ef4444' : '#94a3b8',
                        fontWeight: remaining <= 1 ? 700 : 400,
                      }}>
                        {remaining <= 1 ? 'FINAL SEASON' : `${remaining} seasons left`}
                      </span>
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 10, color: '#64748b' }}>
                  {isExpanded ? '▲' : '▼'}
                </span>
              </div>
              
              {isExpanded && (
                <div style={{
                  fontSize: 12,
                  color: '#94a3b8',
                  lineHeight: 1.4,
                  borderTop: '1px solid #334155',
                  paddingTop: 6,
                }}>
                  {event.description}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
