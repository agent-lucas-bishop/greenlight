// ─── Studio Profile Screen (R294) ───
// Accessible from main menu. Shows studio level, XP bar, lifetime stats,
// unlocked perks, and next unlock preview. Dark theme with gold accents.

import { useState } from 'react';
import {
  getStudioMeta,
  calculateStudioXP,
  getStudioLevel,
  getNextStudioLevel,
  getStudioXPProgress,
  getUnlockedStudioPerks,
  getNextStudioPerk,
  STUDIO_LEVELS,
  STUDIO_PERKS,
  type StudioLevelDef,
  type StudioPerkDef,
} from '../studioProfile';

interface Props {
  onClose: () => void;
}

export default function StudioProfileScreen({ onClose }: Props) {
  const [tab, setTab] = useState<'overview' | 'perks' | 'levels'>('overview');
  const state = getStudioMeta();
  const xp = calculateStudioXP(state.stats);
  const level = getStudioLevel(xp);
  const nextLevel = getNextStudioLevel(xp);
  const xpProgress = getStudioXPProgress(xp);
  const unlockedPerks = getUnlockedStudioPerks(level.level);
  const nextPerk = getNextStudioPerk(level.level);

  const tierColors: Record<string, string> = {
    Indie: '#2ecc71',
    Boutique: '#3498db',
    Major: '#f1c40f',
    Hollywood: '#e67e22',
    Empire: '#e74c3c',
    Legend: '#9b59b6',
    Apex: '#ffd700',
  };

  const tierColor = tierColors[level.tier] || 'var(--gold)';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '90vh', overflow: 'auto' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 4 }}>{level.emoji}</div>
          <h2 style={{
            color: tierColor,
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '1.8rem',
            letterSpacing: '0.1em',
            margin: 0,
          }}>
            {level.name}
          </h2>
          <div style={{ color: '#888', fontSize: '0.75rem', marginTop: 4 }}>
            Studio Level {level.level} · {level.tier} Tier
          </div>
        </div>

        {/* XP Bar */}
        <div style={{ maxWidth: 400, margin: '0 auto 24px' }}>
          {nextLevel ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#888', marginBottom: 4 }}>
                <span>{xp} XP</span>
                <span>{nextLevel.xpRequired} XP to Lv.{nextLevel.level}</span>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 6,
                height: 10,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{
                  background: `linear-gradient(90deg, ${tierColor}, ${tierColor}cc)`,
                  height: '100%',
                  width: `${xpProgress.progress * 100}%`,
                  borderRadius: 6,
                  transition: 'width 0.5s ease',
                  boxShadow: `0 0 8px ${tierColor}40`,
                }} />
              </div>
              <div style={{ textAlign: 'center', marginTop: 6, color: '#999', fontSize: '0.6rem' }}>
                {xpProgress.earned} / {xpProgress.needed} XP to next level
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: '#ffd700', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem' }}>
              ✨ MAX LEVEL ACHIEVED ✨
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          {(['overview', 'perks', 'levels'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? 'rgba(212,168,67,0.15)' : 'transparent',
                border: `1px solid ${tab === t ? 'var(--gold)' : '#333'}`,
                color: tab === t ? 'var(--gold)' : '#888',
                padding: '6px 16px',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '0.85rem',
                letterSpacing: '0.05em',
              }}
            >
              {t === 'overview' ? '📊 Stats' : t === 'perks' ? '🎁 Perks' : '📈 Levels'}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 12,
              marginBottom: 20,
            }}>
              <StatBox label="Films Produced" value={state.stats.totalFilmsProduced} emoji="🎬" />
              <StatBox label="Total Box Office" value={`$${state.stats.totalBoxOffice.toFixed(1)}M`} emoji="💰" />
              <StatBox label="Awards" value={state.stats.totalAwards} emoji="🏆" />
              <StatBox label="Runs Completed" value={state.stats.totalRunsCompleted} emoji="🎮" />
              <StatBox label="Victories" value={state.stats.totalVictories} emoji="👑" />
              <StatBox label="Blockbusters" value={state.stats.totalBlockbusters} emoji="🟩" />
              <StatBox label="Total Score" value={state.stats.totalScore.toLocaleString()} emoji="⭐" />
              <StatBox label="Studio XP" value={xp.toLocaleString()} emoji="✨" color={tierColor} />
            </div>

            {/* Next Perk Preview */}
            {nextPerk && (
              <div style={{
                background: 'rgba(212,168,67,0.06)',
                border: '1px solid rgba(212,168,67,0.2)',
                borderRadius: 10,
                padding: '14px 18px',
                textAlign: 'center',
              }}>
                <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  Next Unlock at Level {nextPerk.level}
                </div>
                <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{nextPerk.emoji}</div>
                <div style={{ color: 'var(--gold)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem' }}>
                  {nextPerk.name}
                </div>
                <div style={{ color: '#888', fontSize: '0.75rem', marginTop: 2 }}>
                  {nextPerk.description}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Perks Tab */}
        {tab === 'perks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {STUDIO_PERKS.map(perk => {
              const unlocked = perk.level <= level.level;
              return (
                <div key={perk.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: unlocked ? 'rgba(212,168,67,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${unlocked ? 'rgba(212,168,67,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 8,
                  opacity: unlocked ? 1 : 0.5,
                }}>
                  <div style={{ fontSize: '1.5rem', width: 36, textAlign: 'center' }}>
                    {unlocked ? perk.emoji : '🔒'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      color: unlocked ? 'var(--gold)' : '#666',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                    }}>
                      {perk.name}
                      <span style={{
                        marginLeft: 8,
                        fontSize: '0.6rem',
                        color: perk.type === 'gameplay' ? '#2ecc71' : '#9b59b6',
                        background: perk.type === 'gameplay' ? 'rgba(46,204,113,0.1)' : 'rgba(155,89,182,0.1)',
                        padding: '1px 6px',
                        borderRadius: 3,
                      }}>
                        {perk.type === 'gameplay' ? 'GAMEPLAY' : 'COSMETIC'}
                      </span>
                    </div>
                    <div style={{ color: '#888', fontSize: '0.7rem', marginTop: 2 }}>
                      {perk.description}
                    </div>
                  </div>
                  <div style={{
                    color: unlocked ? '#2ecc71' : '#555',
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '0.8rem',
                    whiteSpace: 'nowrap',
                  }}>
                    {unlocked ? '✓ UNLOCKED' : `Lv.${perk.level}`}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Levels Tab */}
        {tab === 'levels' && (
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            {STUDIO_LEVELS.filter((_, i) => i % 5 === 0 || i < 10 || STUDIO_LEVELS[i].level <= level.level + 3).map(lvl => {
              const reached = lvl.level <= level.level;
              const isCurrent = lvl.level === level.level;
              const perk = STUDIO_PERKS.find(p => p.level === lvl.level);
              return (
                <div key={lvl.level} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderLeft: isCurrent ? `3px solid ${tierColors[lvl.tier] || 'var(--gold)'}` : '3px solid transparent',
                  background: isCurrent ? 'rgba(212,168,67,0.06)' : 'transparent',
                  opacity: reached ? 1 : 0.4,
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}>
                  <span style={{ fontSize: '1rem', width: 28, textAlign: 'center' }}>{lvl.emoji}</span>
                  <span style={{
                    color: reached ? (tierColors[lvl.tier] || '#ccc') : '#555',
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '0.85rem',
                    width: 30,
                  }}>
                    {lvl.level}
                  </span>
                  <span style={{
                    flex: 1,
                    color: reached ? '#ccc' : '#555',
                    fontSize: '0.8rem',
                  }}>
                    {lvl.name}
                    {perk && (
                      <span style={{
                        marginLeft: 8,
                        color: reached ? 'var(--gold)' : '#444',
                        fontSize: '0.65rem',
                      }}>
                        {perk.emoji} {perk.name}
                      </span>
                    )}
                  </span>
                  <span style={{ color: '#555', fontSize: '0.6rem', fontFamily: "'Bebas Neue', sans-serif" }}>
                    {lvl.xpRequired} XP
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, emoji, color }: { label: string; value: string | number; emoji: string; color?: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 8,
      padding: '12px 10px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{emoji}</div>
      <div style={{
        color: color || 'var(--gold)',
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '1.1rem',
      }}>
        {value}
      </div>
      <div style={{ color: '#888', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
    </div>
  );
}
