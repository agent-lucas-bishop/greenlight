import { useState } from 'react';
import { GameState } from '../types';
import { pickSeasonEvent, skipSeasonEvent, buyPRCampaign } from '../gameStore';
import { sfx } from '../sound';
import PhaseTip from '../components/PhaseTip';

export default function EventScreen({ state }: { state: GameState }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const events = state.seasonEventChoices || [];

  const handlePick = () => {
    if (!selectedId) return;
    const selected = events.find(e => e.id === selectedId);
    // Play event-specific sound if available, else fall back to positive/negative
    const eventSfxMap: Record<string, () => void> = {
      studioTour: sfx.eventStudioTour,
      scriptLeak: sfx.eventScriptLeak,
      filmFestivalSubmit: sfx.eventFilmFestival,
      filmFestivalAward: sfx.eventFilmFestival,
      unionNegotiations: sfx.eventUnionNegotiations,
      streamingDeal: sfx.eventStreamingDeal,
      streamingDealFlat: sfx.eventStreamingDeal,
      celebrityCameo: sfx.eventCelebrityCameo,
      taxBreak: sfx.eventTaxBreak,
      documentaryTrend: sfx.eventDocumentaryTrend,
    };
    if (selected && eventSfxMap[selected.effect]) {
      eventSfxMap[selected.effect]();
    } else {
      const negativeEffects = ['scandal', 'talentPoached', 'awardSnub', 'rivalPoaching'];
      if (selected && negativeEffects.includes(selected.effect)) {
        sfx.eventNegative();
      } else {
        sfx.eventPositive();
      }
    }
    setConfirmed(true);
    setTimeout(() => pickSeasonEvent(selectedId), 600);
  };

  const handleSkip = () => {
    sfx.click();
    skipSeasonEvent();
  };

  return (
    <div className="screen" style={{ textAlign: 'center' }}>
      <PhaseTip phase="event" />
      <h2 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', marginBottom: 4 }}>
        📰 Between Seasons
      </h2>
      <p style={{ color: '#aaa', fontSize: 'clamp(0.75rem, 2vw, 0.95rem)', marginBottom: 16 }}>
        Industry news breaks. Choose one event to shape your next season.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: events.length <= 3 ? 'repeat(auto-fit, minmax(220px, 1fr))' : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
        maxWidth: 900,
        margin: '0 auto 20px',
        padding: '0 8px',
      }}>
        {events.map(event => {
          const isSelected = selectedId === event.id;
          return (
            <div
              key={event.id}
              onClick={() => { if (!confirmed) { event.rarity === 'legendary' ? sfx.legendaryEvent() : sfx.click(); setSelectedId(event.id); } }}
              onKeyDown={e => { if (!confirmed && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setSelectedId(event.id); } }}
              tabIndex={confirmed ? -1 : 0}
              role="button"
              aria-label={`${event.name}: ${event.description}`}
              aria-pressed={isSelected}
              style={{
                background: isSelected ? 'rgba(46, 204, 113, 0.15)' : 'rgba(255,255,255,0.05)',
                border: isSelected ? '2px solid #2ecc71' : '2px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: '16px 12px',
                cursor: confirmed ? 'default' : 'pointer',
                transition: 'all 0.2s',
                transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                opacity: confirmed && !isSelected ? 0.3 : 1,
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: 6 }}>{event.emoji}</div>
              {event.rarity && event.rarity !== 'common' && (
                <div style={{
                  display: 'inline-block',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '2px 8px',
                  borderRadius: 8,
                  marginBottom: 4,
                  background: event.rarity === 'legendary' ? 'rgba(241, 196, 15, 0.25)' : 'rgba(155, 89, 182, 0.25)',
                  color: event.rarity === 'legendary' ? '#f1c40f' : '#9b59b6',
                  border: `1px solid ${event.rarity === 'legendary' ? 'rgba(241, 196, 15, 0.4)' : 'rgba(155, 89, 182, 0.4)'}`,
                }}>
                  {event.rarity === 'legendary' ? '⭐ Legendary' : '💎 Rare'}
                </div>
              )}
              <div style={{ fontWeight: 700, fontSize: 'clamp(0.85rem, 2vw, 1.05rem)', marginBottom: 4 }}>
                {event.name}
              </div>
              <div style={{ color: '#f1c40f', fontSize: 'clamp(0.7rem, 1.8vw, 0.85rem)', marginBottom: 8 }}>
                {event.description}
              </div>
              <div style={{ color: '#888', fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)', fontStyle: 'italic' }}>
                "{event.flavorText}"
              </div>
            </div>
          );
        })}
      </div>

      {/* R150: PR Campaign option */}
      {!confirmed && !state.prCampaignActive && state.budget >= 2 && (
        <div style={{
          background: 'rgba(52,152,219,0.08)',
          border: '1px solid rgba(52,152,219,0.3)',
          borderRadius: 10,
          padding: '12px 16px',
          maxWidth: 500,
          margin: '0 auto 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#3498db' }}>📢 PR Campaign</div>
            <div style={{ color: '#999', fontSize: '0.75rem' }}>
              Spend $2M to reduce rival interference this season (fewer rival actions, weaker effects).
            </div>
          </div>
          <button
            className="btn"
            onClick={() => { sfx.click(); buyPRCampaign(); }}
            style={{
              background: 'rgba(52,152,219,0.2)',
              border: '1px solid #3498db',
              color: '#3498db',
              padding: '6px 16px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Buy $2M
          </button>
        </div>
      )}
      {state.prCampaignActive && (
        <div style={{
          color: '#2ecc71', fontSize: '0.8rem', marginBottom: 12,
          background: 'rgba(46,204,113,0.1)', borderRadius: 8, padding: '6px 12px',
          display: 'inline-block',
        }}>
          ✅ PR Campaign active — rival interference reduced this season
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          className="btn"
          onClick={handlePick}
          disabled={!selectedId || confirmed}
          style={{
            background: selectedId ? '#2ecc71' : '#555',
            padding: '10px 28px',
            fontSize: 'clamp(0.85rem, 2vw, 1rem)',
            opacity: confirmed ? 0.5 : 1,
          }}
        >
          {confirmed ? '✓ Chosen!' : selectedId ? `Choose ${events.find(e => e.id === selectedId)?.emoji || ''}` : 'Select an event'}
        </button>
        {!confirmed && (
          <button
            className="btn"
            onClick={handleSkip}
            style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '10px 20px',
              fontSize: 'clamp(0.75rem, 2vw, 0.9rem)',
              color: '#aaa',
            }}
          >
            Skip (no event)
          </button>
        )}
      </div>
    </div>
  );
}
