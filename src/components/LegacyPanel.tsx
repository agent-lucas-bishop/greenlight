import { useState } from 'react';
import {
  getLifetimeStats, LEGACY_MILESTONES, getMilestoneTier, getMilestoneProgress,
  getNextTierThreshold, getUnlockedRewards, getGenresMastered,
  type MilestoneTier, type LegacyMilestoneDef, type LifetimeStats,
} from '../studioLegacy';

const TIER_COLORS: Record<MilestoneTier, string> = {
  locked: '#444',
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
};

const TIER_EMOJI: Record<MilestoneTier, string> = {
  locked: '🔒',
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
};

function BarChart({ data, maxVal }: { data: { label: string; value: number; color?: string }[]; maxVal?: number }) {
  const max = maxVal || Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#999', fontSize: '0.65rem', width: 60, textAlign: 'right', flexShrink: 0 }}>{d.label}</span>
          <div style={{ flex: 1, height: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              width: `${Math.max(2, (d.value / max) * 100)}%`,
              height: '100%',
              background: d.color || 'var(--gold)',
              borderRadius: 3,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <span style={{ color: '#888', fontSize: '0.6rem', width: 40, flexShrink: 0 }}>{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function MilestoneCard({ milestone, stats }: { milestone: LegacyMilestoneDef; stats: LifetimeStats }) {
  const tier = getMilestoneTier(milestone, stats);
  const progress = getMilestoneProgress(milestone, stats);
  const nextThreshold = getNextTierThreshold(milestone, stats);
  const currentVal = milestone.getValue(stats);
  const color = TIER_COLORS[tier];

  return (
    <div style={{
      padding: '14px 16px',
      background: tier !== 'locked' ? `${color}08` : 'rgba(255,255,255,0.02)',
      border: `1px solid ${tier !== 'locked' ? `${color}40` : '#222'}`,
      borderRadius: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: '1.4rem' }}>{milestone.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: color, fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.05em' }}>
              {milestone.name}
            </span>
            <span style={{ fontSize: '0.8rem' }}>{TIER_EMOJI[tier]}</span>
          </div>
          <div style={{ color: '#888', fontSize: '0.7rem' }}>{milestone.description}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color, fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>
            {currentVal.toLocaleString()} {milestone.unit}
          </div>
          {tier === 'gold' && <div style={{ color: '#ffd700', fontSize: '0.6rem' }}>MAX</div>}
        </div>
      </div>

      {/* Progress bar */}
      {tier !== 'gold' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: '#666', marginBottom: 2 }}>
            <span>{tier === 'locked' ? 'Bronze' : tier === 'bronze' ? 'Silver' : 'Gold'}</span>
            <span>{nextThreshold?.toLocaleString()} {milestone.unit}</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              width: `${Math.max(2, Math.min(100, progress * 100))}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${color}, ${color}cc)`,
              borderRadius: 3,
              transition: 'width 0.5s',
            }} />
          </div>
        </div>
      )}

      {/* Tier badges */}
      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
        {(['bronze', 'silver', 'gold'] as const).map(t => {
          const unlocked = (['bronze', 'silver', 'gold'].indexOf(tier) >= ['bronze', 'silver', 'gold'].indexOf(t));
          const threshold = t === 'bronze' ? milestone.bronzeThreshold : t === 'silver' ? milestone.silverThreshold : milestone.goldThreshold;
          return (
            <div key={t} style={{
              padding: '2px 8px', borderRadius: 4, fontSize: '0.55rem',
              background: unlocked ? `${TIER_COLORS[t]}15` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${unlocked ? `${TIER_COLORS[t]}40` : '#333'}`,
              color: unlocked ? TIER_COLORS[t] : '#555',
            }}>
              {TIER_EMOJI[t]} {threshold.toLocaleString()}
            </div>
          );
        })}
      </div>

      {/* Reward */}
      {tier !== 'locked' && (
        <div style={{ marginTop: 6, fontSize: '0.6rem', color: '#999' }}>
          🎁 Reward: {milestone.rewardLabel}
        </div>
      )}
    </div>
  );
}

export default function LegacyPanel({ onClose, inline }: { onClose?: () => void; inline?: boolean }) {
  const [subTab, setSubTab] = useState<'milestones' | 'stats' | 'rewards'>('milestones');
  const stats = getLifetimeStats();
  const rewards = getUnlockedRewards();
  const genresMastered = getGenresMastered();

  const genreColors: Record<string, string> = {
    Action: '#e74c3c', Comedy: '#f1c40f', Drama: '#9b59b6', Horror: '#2c3e50',
    'Sci-Fi': '#3498db', Romance: '#e91e63', Thriller: '#e67e22',
  };

  const content = (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {!inline && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ color: 'var(--gold)', margin: 0 }}>🏛️ Studio Legacy</h2>
          {onClose && <button className="modal-close" onClick={onClose}>✕</button>}
        </div>
      )}

      {/* Sub tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, justifyContent: 'center' }}>
        {([
          { id: 'milestones' as const, label: '🏅 Milestones', color: '#ffd700' },
          { id: 'stats' as const, label: '📊 Stats', color: '#3498db' },
          { id: 'rewards' as const, label: '🎁 Rewards', color: '#2ecc71' },
        ]).map(t => (
          <button key={t.id} className="btn btn-small" onClick={() => setSubTab(t.id)} style={{
            color: subTab === t.id ? t.color : '#666',
            borderColor: subTab === t.id ? t.color : 'rgba(255,255,255,0.1)',
            background: subTab === t.id ? `${t.color}15` : 'transparent',
          }}>{t.label}</button>
        ))}
      </div>

      {subTab === 'milestones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {LEGACY_MILESTONES.map(m => <MilestoneCard key={m.id} milestone={m} stats={stats} />)}
        </div>
      )}

      {subTab === 'stats' && (
        <div>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
            {[
              { label: 'Films', value: stats.totalFilmsProduced.toString(), color: '#ccc' },
              { label: 'Revenue', value: `$${stats.totalRevenue.toFixed(0)}M`, color: 'var(--gold)' },
              { label: 'Awards', value: stats.totalAwards.toString(), color: '#ffd700' },
              { label: 'Wins', value: stats.totalWins.toString(), color: '#2ecc71' },
              { label: 'Blockbusters', value: stats.totalBlockbusters.toString(), color: '#e74c3c' },
              { label: 'Win Streak', value: stats.longestWinStreak.toString(), color: '#f39c12' },
            ].map((s, i) => (
              <div key={i} style={{
                textAlign: 'center', padding: '12px 8px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid #222', borderRadius: 8,
              }}>
                <div style={{ color: s.color, fontFamily: 'Bebas Neue', fontSize: '1.4rem' }}>{s.value}</div>
                <div style={{ color: '#888', fontSize: '0.6rem', textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Genre distribution chart */}
          <h3 style={{ color: 'var(--gold)', fontSize: '0.85rem', marginBottom: 10, letterSpacing: 1 }}>🎭 GENRE DISTRIBUTION</h3>
          <BarChart
            data={Object.entries(stats.genreFilmCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([genre, count]) => ({ label: genre, value: count, color: genreColors[genre] || '#888' }))}
          />

          {/* Genres mastered */}
          {genresMastered.length > 0 && (
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(46,204,113,0.06)', border: '1px solid rgba(46,204,113,0.2)', borderRadius: 8 }}>
              <div style={{ color: '#2ecc71', fontSize: '0.75rem', fontFamily: 'Bebas Neue', marginBottom: 6 }}>🎯 MASTERED GENRES ({genresMastered.length}/7)</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {genresMastered.map(g => (
                  <span key={g} style={{ padding: '3px 10px', background: `${genreColors[g] || '#888'}20`, border: `1px solid ${genreColors[g] || '#888'}40`, borderRadius: 6, fontSize: '0.75rem', color: genreColors[g] || '#888' }}>
                    {g} ✓
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Best film */}
          {stats.highestSingleFilmTitle && (
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.2)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ color: '#888', fontSize: '0.6rem', textTransform: 'uppercase', marginBottom: 4 }}>🌟 All-Time Highest Grossing</div>
              <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>"{stats.highestSingleFilmTitle}"</div>
              <div style={{ color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>${stats.highestSingleFilmRevenue.toFixed(1)}M</div>
            </div>
          )}
        </div>
      )}

      {subTab === 'rewards' && (
        <div>
          {rewards.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎁</div>
              <div className="empty-state-title">No Rewards Yet</div>
              <div className="empty-state-desc">Unlock legacy milestones to earn cosmetic rewards!</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {rewards.map(r => (
                <div key={r.id} style={{
                  padding: '12px 14px',
                  background: `${TIER_COLORS[r.tier]}08`,
                  border: `1px solid ${TIER_COLORS[r.tier]}30`,
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: '0.8rem', color: TIER_COLORS[r.tier], fontWeight: 600, marginBottom: 4 }}>
                    {r.label}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#888', textTransform: 'uppercase' }}>
                    {r.type === 'logo' ? '🎨 Studio Logo' : r.type === 'background' ? '🖼️ Background' : r.type === 'cardBack' ? '🃏 Card Back' : '🎨 Theme'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (inline) return content;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 750 }}>
        {content}
      </div>
    </div>
  );
}
