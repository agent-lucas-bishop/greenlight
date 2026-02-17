/**
 * R278: Event Rewards — track event objectives, show progress, display earned rewards.
 */

import { getActiveEvent, getEventProgress, getUnlockedRewards, getEventHistory, SEASONAL_EVENTS } from '../seasonalEvents';
import type { SeasonalEvent, EventHistoryEntry } from '../seasonalEvents';

function ProgressBar({ current, target, color }: { current: number; target: number; color: string }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  return (
    <div style={{ background: '#1a1a2e', borderRadius: 6, height: 14, overflow: 'hidden', position: 'relative' }}>
      <div style={{
        width: `${pct}%`,
        height: '100%',
        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
        borderRadius: 6,
        transition: 'width 0.5s ease',
      }} />
      <span style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: '0.65rem',
        lineHeight: '14px',
        color: '#fff',
        fontWeight: 600,
      }}>
        {current}/{target}
      </span>
    </div>
  );
}

function ActiveEventSection({ event }: { event: SeasonalEvent }) {
  const progress = getEventProgress(event.id);
  const unlockedRewards = getUnlockedRewards();
  const { themeColors } = event;

  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ color: themeColors.primary, marginBottom: 12 }}>
        {event.emoji} {event.name} — Objectives
      </h3>

      {event.objectives.map(obj => {
        const current = progress.objectives[obj.id] || 0;
        const complete = current >= obj.target;
        const reward = event.exclusiveRewards.find(r => r.objectiveId === obj.id);
        const rewardUnlocked = reward ? unlockedRewards.includes(reward.id) : false;

        return (
          <div key={obj.id} style={{
            background: complete ? `${themeColors.primary}15` : '#111118',
            border: `1px solid ${complete ? themeColors.primary + '44' : '#333'}`,
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: '0.85rem', color: complete ? themeColors.primary : '#ccc' }}>
                {complete ? '✅' : '⬜'} {obj.description}
              </span>
              {reward && (
                <span style={{
                  fontSize: '0.75rem',
                  color: rewardUnlocked ? themeColors.primary : '#666',
                  fontWeight: 600,
                }}>
                  {reward.emoji} {reward.name} {rewardUnlocked ? '✓' : '🔒'}
                </span>
              )}
            </div>
            <ProgressBar current={Math.min(current, obj.target)} target={obj.target} color={themeColors.primary} />
          </div>
        );
      })}
    </div>
  );
}

function RewardGallery() {
  const unlocked = getUnlockedRewards();
  const allRewards = SEASONAL_EVENTS.flatMap(e => e.exclusiveRewards);

  if (allRewards.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ color: 'var(--gold)', marginBottom: 12 }}>🎁 Reward Collection</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {allRewards.map(reward => {
          const isUnlocked = unlocked.includes(reward.id);
          return (
            <div key={reward.id} style={{
              background: isUnlocked ? '#1a1a2e' : '#0a0a12',
              border: `1px solid ${isUnlocked ? '#ffd700' : '#222'}`,
              borderRadius: 8,
              padding: '8px 12px',
              minWidth: 120,
              opacity: isUnlocked ? 1 : 0.5,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{isUnlocked ? reward.emoji : '🔒'}</div>
              <div style={{ fontSize: '0.75rem', color: isUnlocked ? '#ddd' : '#555', fontWeight: 600 }}>{reward.name}</div>
              <div style={{ fontSize: '0.65rem', color: '#777', marginTop: 2 }}>{reward.type}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#666', marginTop: 8 }}>
        {unlocked.length}/{allRewards.length} unlocked
      </div>
    </div>
  );
}

function EventHistory() {
  const history = getEventHistory();

  if (history.length === 0) {
    return (
      <div style={{ color: '#555', fontSize: '0.85rem', fontStyle: 'italic' }}>
        No event history yet. Participate in a seasonal event to build your legacy!
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ color: 'var(--gold)', marginBottom: 12 }}>📜 Event History</h3>
      {history.map((entry: EventHistoryEntry, i: number) => (
        <div key={i} style={{
          background: '#111118',
          border: '1px solid #222',
          borderRadius: 8,
          padding: '8px 12px',
          marginBottom: 6,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.85rem', color: '#ccc' }}>
            {entry.emoji} {entry.eventName} ({entry.year})
          </span>
          <span style={{ fontSize: '0.75rem', color: '#888' }}>
            {entry.objectivesCompleted.length} objectives • {entry.rewardsEarned.length} rewards
          </span>
        </div>
      ))}
    </div>
  );
}

export default function EventRewards() {
  const activeEvent = getActiveEvent();

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: 'var(--gold)', marginBottom: 16 }}>🎉 Seasonal Events</h2>

      {activeEvent ? (
        <ActiveEventSection event={activeEvent} />
      ) : (
        <div style={{
          background: '#111118',
          border: '1px solid #222',
          borderRadius: 8,
          padding: 16,
          textAlign: 'center',
          marginBottom: 20,
          color: '#666',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📅</div>
          <div style={{ fontSize: '0.9rem' }}>No event active right now</div>
          <div style={{ fontSize: '0.75rem', marginTop: 4 }}>Check back during seasonal windows for exclusive content!</div>
        </div>
      )}

      <RewardGallery />
      <EventHistory />
    </div>
  );
}
