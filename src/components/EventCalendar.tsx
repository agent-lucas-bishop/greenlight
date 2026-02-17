/**
 * R245 — Event Calendar
 *
 * Visual yearly timeline of all seasonal events.
 * Current date marker, click for details popup.
 */
import { useState, useMemo } from 'react';
import { SEASONAL_EVENTS, type SeasonalEvent, getActiveEvent } from '../seasonalEvents';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getEventMonthSpan(event: SeasonalEvent): { start: number; end: number } {
  return {
    start: event.dateRange.startMonth - 1,
    end: event.dateRange.endMonth - 1,
  };
}

export default function EventCalendar({ onClose }: { onClose?: () => void }) {
  const [selectedEvent, setSelectedEvent] = useState<SeasonalEvent | null>(null);
  const now = useMemo(() => new Date(), []);
  const currentMonth = now.getMonth();
  const activeEvent = useMemo(() => getActiveEvent(now), [now]);

  // Color rows for each event
  const eventRows = SEASONAL_EVENTS.map(event => {
    const span = getEventMonthSpan(event);
    return { event, start: span.start, end: span.end };
  });

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.2rem', letterSpacing: '0.08em', margin: 0 }}>
          📅 Seasonal Events Calendar
        </h3>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        )}
      </div>

      {/* Active event highlight */}
      {activeEvent && (
        <div style={{
          background: `${activeEvent.themeColor}15`,
          border: `1px solid ${activeEvent.themeColor}40`,
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontSize: '1.4rem' }}>{activeEvent.emoji}</span>
          <div>
            <div style={{ color: activeEvent.themeColor, fontWeight: 700, fontSize: '0.9rem' }}>
              {activeEvent.name} — Active Now!
            </div>
            <div style={{ color: '#999', fontSize: '0.75rem' }}>{activeEvent.description}</div>
          </div>
        </div>
      )}

      {/* Month header row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: 2,
        marginBottom: 4,
      }}>
        {MONTH_NAMES.map((name, i) => (
          <div key={name} style={{
            textAlign: 'center',
            fontSize: '0.6rem',
            fontFamily: 'Bebas Neue',
            letterSpacing: '0.05em',
            color: i === currentMonth ? 'var(--gold)' : '#666',
            fontWeight: i === currentMonth ? 700 : 400,
            padding: '4px 0',
            borderBottom: i === currentMonth ? '2px solid var(--gold)' : '1px solid #222',
          }}>
            {name}
          </div>
        ))}
      </div>

      {/* Event rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {eventRows.map(({ event, start, end }) => (
          <div
            key={event.id}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: 2,
              cursor: 'pointer',
              transition: 'transform 0.15s',
            }}
            onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.01)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; }}
          >
            {Array.from({ length: 12 }, (_, i) => {
              const inRange = i >= start && i <= end;
              const isStart = i === start;
              const isEnd = i === end;
              return (
                <div key={i} style={{
                  height: 28,
                  background: inRange ? `${event.themeColor}30` : 'rgba(255,255,255,0.02)',
                  border: inRange ? `1px solid ${event.themeColor}50` : '1px solid transparent',
                  borderRadius: isStart && isEnd ? 6 : isStart ? '6px 0 0 6px' : isEnd ? '0 6px 6px 0' : 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.6rem',
                  color: event.themeColor,
                  fontFamily: 'Bebas Neue',
                }}>
                  {isStart && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 2, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      <span>{event.emoji}</span>
                      <span style={{ fontSize: '0.55rem' }}>{event.name}</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Current date marker */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: 2,
        marginTop: 4,
      }}>
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} style={{ textAlign: 'center', height: 12 }}>
            {i === currentMonth && (
              <div style={{
                width: 0,
                height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderBottom: '6px solid var(--gold)',
                margin: '0 auto',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Detail popup */}
      {selectedEvent && (
        <div style={{
          marginTop: 16,
          background: `${selectedEvent.themeColor}10`,
          border: `1px solid ${selectedEvent.themeColor}30`,
          borderRadius: 10,
          padding: 16,
          animation: 'fadeIn 0.2s ease-out',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: '1.8rem' }}>{selectedEvent.emoji}</span>
            <div>
              <div style={{ color: selectedEvent.themeColor, fontWeight: 700, fontSize: '1.1rem', fontFamily: 'Bebas Neue', letterSpacing: '0.05em' }}>
                {selectedEvent.name}
              </div>
              <div style={{ color: '#888', fontSize: '0.75rem' }}>
                {MONTH_NAMES[selectedEvent.dateRange.startMonth - 1]} {selectedEvent.dateRange.startDay} — {MONTH_NAMES[selectedEvent.dateRange.endMonth - 1]} {selectedEvent.dateRange.endDay}
              </div>
            </div>
          </div>

          <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: 12 }}>{selectedEvent.description}</p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem' }}>
              <span style={{ color: '#888' }}>Revenue: </span>
              <span style={{ color: selectedEvent.modifiers.revenueMultiplier > 1 ? '#2ecc71' : '#ccc' }}>
                ×{selectedEvent.modifiers.revenueMultiplier}
              </span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem' }}>
              <span style={{ color: '#888' }}>Quality: </span>
              <span style={{ color: selectedEvent.modifiers.qualityMultiplier > 1 ? '#2ecc71' : '#ccc' }}>
                ×{selectedEvent.modifiers.qualityMultiplier}
              </span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem' }}>
              <span style={{ color: '#888' }}>Budget: </span>
              <span style={{ color: selectedEvent.modifiers.budgetMultiplier < 1 ? '#2ecc71' : '#ccc' }}>
                ×{selectedEvent.modifiers.budgetMultiplier}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <span style={{ color: '#888', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Affected Genres: </span>
            <span style={{ color: selectedEvent.themeColor, fontSize: '0.8rem' }}>
              {selectedEvent.affectedGenres.join(', ')}
            </span>
          </div>

          {selectedEvent.specialCards.length > 0 && (
            <div>
              <div style={{ color: '#888', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Special Cards ({selectedEvent.specialCards.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {selectedEvent.specialCards.map((card, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '6px 10px',
                  }}>
                    <span style={{ color: card.cardType === 'action' ? '#2ecc71' : '#f1c40f', fontWeight: 700, fontSize: '0.7rem' }}>
                      {card.cardType.toUpperCase()}
                    </span>
                    <span style={{ color: '#ccc', fontSize: '0.8rem', fontWeight: 600 }}>{card.name}</span>
                    <span style={{ color: '#888', fontSize: '0.7rem', flex: 1 }}>+{card.baseQuality}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
