/**
 * R285: Achievement Showcase — Trophy room with category grid, progress bars,
 * rarity tiers, genre pie chart, and stats summary.
 *
 * Categories: Production, Financial, Critical, Collection, Special
 * Wired into StartScreen as 🏆 ACHIEVEMENTS tab alternative view.
 */

import { useState, useMemo, useEffect } from 'react';
import { ACHIEVEMENTS, getUnlockedAchievements, getAchievementDates } from '../achievements';
import type { AchievementDef, AchievementRarityLevel } from '../achievements';
import { getUnlocks } from '../unlocks';
import { getState } from '../gameStore';
import { sfx } from '../sound';

// ─── Showcase category mapping ───

export type ShowcaseCategory = 'production' | 'financial' | 'critical' | 'collection' | 'special';

interface ShowcaseCategoryDef {
  id: ShowcaseCategory;
  label: string;
  emoji: string;
  description: string;
}

const SHOWCASE_CATEGORIES: ShowcaseCategoryDef[] = [
  { id: 'production', label: 'Production', emoji: '🎬', description: 'Make films, complete runs, build your studio' },
  { id: 'financial', label: 'Financial', emoji: '💰', description: 'Earn box office, manage budgets, build empires' },
  { id: 'critical', label: 'Critical', emoji: '🏆', description: 'Win awards, earn acclaim, achieve perfection' },
  { id: 'collection', label: 'Collection', emoji: '🎭', description: 'Explore genres, discover synergies, collect cards' },
  { id: 'special', label: 'Special', emoji: '⭐', description: 'Hidden achievements and legendary feats' },
];

// Map existing achievement categories to showcase categories
function mapToShowcaseCategory(ach: AchievementDef): ShowcaseCategory {
  // Map based on achievement content/category
  if (ach.category === 'secret') return 'special';
  if (ach.category === 'fun') return 'special';

  // Keyword-based mapping for more accuracy
  const text = `${ach.name} ${ach.description} ${ach.hint}`.toLowerCase();
  if (text.includes('earn') || text.includes('budget') || text.includes('box office') || text.includes('$') || text.includes('money') || text.includes('broke') || text.includes('profit') || text.includes('million')) return 'financial';
  if (text.includes('award') || text.includes('blockbuster') || text.includes('perfect') || text.includes('flawless') || text.includes('critic') || text.includes('festival') || text.includes('nomination') || text.includes('five-star') || text.includes('rank')) return 'critical';
  if (text.includes('genre') || text.includes('collect') || text.includes('discover') || text.includes('card') || text.includes('synerg') || text.includes('talent') || text.includes('different')) return 'collection';
  if (text.includes('film') || text.includes('production') || text.includes('run') || text.includes('season') || text.includes('studio') || text.includes('make') || text.includes('complete')) return 'production';

  // Fallback by original category
  if (ach.category === 'milestone') return 'production';
  if (ach.category === 'skill') return 'critical';
  if (ach.category === 'discovery') return 'collection';
  return 'production';
}

const RARITY_CONFIG: Record<string, { color: string; glow: string; label: string; order: number }> = {
  common:    { color: '#aaa',    glow: 'rgba(170,170,170,0.2)', label: 'Common',    order: 0 },
  uncommon:  { color: '#2ecc71', glow: 'rgba(46,204,113,0.2)',  label: 'Uncommon',  order: 1 },
  rare:      { color: '#3498db', glow: 'rgba(52,152,219,0.2)',  label: 'Rare',      order: 2 },
  epic:      { color: '#9b59b6', glow: 'rgba(155,89,182,0.2)',  label: 'Epic',      order: 3 },
  legendary: { color: '#f39c12', glow: 'rgba(243,156,18,0.3)',  label: 'Legendary', order: 4 },
};

function getRarity(ach: AchievementDef): AchievementRarityLevel {
  return ach.rarity || (ach.secret ? 'epic' : 'common');
}

// ─── Component ───

interface AchievementShowcaseProps {
  onClose: () => void;
  inline?: boolean;
}

export default function AchievementShowcase({ onClose, inline }: AchievementShowcaseProps) {
  const [filter, setFilter] = useState<ShowcaseCategory | 'all'>('all');
  const [selectedAch, setSelectedAch] = useState<string | null>(null);

  useEffect(() => {
    if (inline) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, inline]);

  const unlockedIds = useMemo(() => new Set(getUnlockedAchievements()), []);
  const dates = useMemo(() => getAchievementDates(), []);
  const state = getState();
  const unlockState = getUnlocks();

  const categorized = useMemo(() => {
    const map: Record<ShowcaseCategory, { def: AchievementDef; unlocked: boolean; rarity: AchievementRarityLevel }[]> = {
      production: [], financial: [], critical: [], collection: [], special: [],
    };
    for (const ach of ACHIEVEMENTS) {
      const cat = mapToShowcaseCategory(ach);
      map[cat].push({ def: ach, unlocked: unlockedIds.has(ach.id), rarity: getRarity(ach) });
    }
    return map;
  }, [unlockedIds]);

  const totalCount = ACHIEVEMENTS.length;
  const unlockedCount = unlockedIds.size;
  const pct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  // Rarest unlocked achievement
  const rarestUnlocked = useMemo(() => {
    let best: AchievementDef | null = null;
    let bestOrder = -1;
    for (const ach of ACHIEVEMENTS) {
      if (!unlockedIds.has(ach.id)) continue;
      const r = getRarity(ach);
      const order = RARITY_CONFIG[r]?.order ?? 0;
      if (order > bestOrder) { bestOrder = order; best = ach; }
    }
    return best;
  }, [unlockedIds]);

  const getItems = (cat: ShowcaseCategory) => categorized[cat];

  const allFiltered = filter === 'all'
    ? SHOWCASE_CATEGORIES.flatMap(c => categorized[c.id])
    : categorized[filter];

  const content = (
    <div style={inline ? { maxWidth: 720, margin: '0 auto' } : { maxWidth: 780, maxHeight: '90vh', overflow: 'auto' }}>

      {/* Stats Summary */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h2 style={{ color: '#ffd700', margin: '0 0 8px', fontSize: '1.6rem', fontFamily: 'Bebas Neue', letterSpacing: '0.1em' }}>
          🏆 ACHIEVEMENT SHOWCASE
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', color: '#ffd700', fontFamily: 'Bebas Neue' }}>{unlockedCount}/{totalCount}</div>
            <div style={{ fontSize: '0.6rem', color: '#888', letterSpacing: 2, textTransform: 'uppercase' }}>Unlocked</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', color: '#bb86fc', fontFamily: 'Bebas Neue' }}>{pct}%</div>
            <div style={{ fontSize: '0.6rem', color: '#888', letterSpacing: 2, textTransform: 'uppercase' }}>Complete</div>
          </div>
          {rarestUnlocked && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem' }}>{rarestUnlocked.emoji}</div>
              <div style={{ fontSize: '0.6rem', color: RARITY_CONFIG[getRarity(rarestUnlocked)]?.color || '#888', letterSpacing: 1 }}>
                Rarest: {rarestUnlocked.name}
              </div>
            </div>
          )}
        </div>

        {/* Overall progress bar */}
        <div style={{
          width: '100%', height: 10, background: '#1a1a1a', borderRadius: 5,
          overflow: 'hidden', border: '1px solid #333',
        }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: 'linear-gradient(90deg, #b8860b, #ffd700, #f5d442)',
            borderRadius: 5, transition: 'width 0.6s ease',
            boxShadow: unlockedCount > 0 ? '0 0 8px rgba(255,215,0,0.4)' : 'none',
          }} />
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
        <TabButton
          active={filter === 'all'}
          label={`ALL (${unlockedCount}/${totalCount})`}
          onClick={() => { setFilter('all'); sfx.uiClick(); }}
        />
        {SHOWCASE_CATEGORIES.map(cat => {
          const items = categorized[cat.id];
          const catUnlocked = items.filter(a => a.unlocked).length;
          return (
            <TabButton
              key={cat.id}
              active={filter === cat.id}
              label={`${cat.emoji} ${cat.label.toUpperCase()} (${catUnlocked}/${items.length})`}
              onClick={() => { setFilter(cat.id); sfx.uiClick(); }}
            />
          );
        })}
      </div>

      {/* Achievement grid by category */}
      {(filter === 'all' ? SHOWCASE_CATEGORIES : SHOWCASE_CATEGORIES.filter(c => c.id === filter)).map(cat => {
        const items = categorized[cat.id];
        const catUnlocked = items.filter(a => a.unlocked).length;
        const catComplete = catUnlocked === items.length && items.length > 0;

        return (
          <div key={cat.id} style={{ marginBottom: 28 }}>
            {/* Category header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
              borderBottom: '1px solid rgba(212,168,67,0.12)', paddingBottom: 8,
            }}>
              <span style={{ fontSize: '1.2rem' }}>{cat.emoji}</span>
              <h3 style={{
                color: '#ffd700', fontSize: '1rem', margin: 0,
                fontFamily: 'Bebas Neue', letterSpacing: '0.08em',
              }}>
                {cat.label.toUpperCase()}
              </h3>
              <span style={{
                color: catComplete ? '#2ecc71' : '#555',
                fontSize: '0.75rem', fontFamily: 'Bebas Neue',
              }}>
                {catUnlocked}/{items.length}
                {catComplete && ' ✓'}
              </span>
              <div style={{ flex: 1, maxWidth: 100, height: 4, background: '#222', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  width: `${items.length > 0 ? (catUnlocked / items.length) * 100 : 0}%`,
                  height: '100%',
                  background: catComplete ? '#2ecc71' : '#ffd700',
                  borderRadius: 2,
                }} />
              </div>
            </div>
            <div style={{ color: '#555', fontSize: '0.6rem', marginBottom: 10 }}>{cat.description}</div>

            {/* Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))',
              gap: 10,
            }}>
              {items.map(({ def: ach, unlocked, rarity }) => {
                const rarityDef = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
                const isSecret = ach.secret && !unlocked;
                const prog = !unlocked && ach.progress ? ach.progress(state, unlockState) : null;
                const isSelected = selectedAch === ach.id;

                return (
                  <div
                    key={ach.id}
                    onClick={() => setSelectedAch(isSelected ? null : ach.id)}
                    style={{
                      background: unlocked
                        ? `linear-gradient(135deg, rgba(255,215,0,0.06), ${rarityDef.glow})`
                        : 'rgba(255,255,255,0.015)',
                      border: `1px solid ${unlocked ? rarityDef.color + '40' : '#1a1a1a'}`,
                      borderRadius: 12,
                      padding: '14px 12px',
                      textAlign: 'center',
                      opacity: unlocked ? 1 : 0.4,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                      position: 'relative',
                    }}
                  >
                    {/* Rarity badge */}
                    {unlocked && (
                      <div style={{
                        position: 'absolute', top: 5, right: 7,
                        fontSize: '0.45rem', color: rarityDef.color,
                        fontFamily: 'Bebas Neue', letterSpacing: '0.05em', opacity: 0.8,
                        textTransform: 'uppercase',
                      }}>
                        {rarityDef.label}
                      </div>
                    )}

                    {/* Emoji */}
                    <div style={{
                      fontSize: '2rem', marginBottom: 6, lineHeight: 1,
                      filter: unlocked ? 'none' : 'grayscale(1) brightness(0.3)',
                      textShadow: unlocked ? `0 0 10px ${rarityDef.glow}` : 'none',
                    }}>
                      {isSecret ? '❓' : ach.emoji}
                    </div>

                    {/* Name */}
                    <div style={{
                      color: unlocked ? rarityDef.color : '#444',
                      fontFamily: 'Bebas Neue', fontSize: '0.85rem',
                      letterSpacing: '0.04em', lineHeight: 1.2,
                    }}>
                      {isSecret ? '???' : ach.name}
                    </div>

                    {/* Description */}
                    <div style={{
                      color: unlocked ? '#999' : '#333',
                      fontSize: '0.6rem', marginTop: 4, lineHeight: 1.4, minHeight: '2.6em',
                    }}>
                      {unlocked ? ach.description : (isSecret ? 'Hidden achievement' : ach.hint)}
                    </div>

                    {/* Unlock date */}
                    {unlocked && dates[ach.id] && (
                      <div style={{ color: '#555', fontSize: '0.5rem', marginTop: 4 }}>
                        🗓️ {dates[ach.id]}
                      </div>
                    )}

                    {/* Progress bar */}
                    {prog && prog.target > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{
                          width: '100%', height: 5, background: '#1a1a1a',
                          borderRadius: 3, overflow: 'hidden', border: '1px solid #222',
                        }}>
                          <div style={{
                            width: `${Math.min(100, (prog.current / prog.target) * 100)}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #b8860b, #ffd700)',
                            borderRadius: 3,
                          }} />
                        </div>
                        <div style={{ color: '#555', fontSize: '0.55rem', marginTop: 2, fontFamily: 'Bebas Neue' }}>
                          {prog.current} / {prog.target}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (inline) return content;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 780, maxHeight: '90vh', overflow: 'auto' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        {content}
      </div>
    </div>
  );
}

// ─── Tab Button ───
function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px', borderRadius: 8, fontSize: '0.7rem', fontFamily: 'Bebas Neue',
        letterSpacing: '0.04em', cursor: 'pointer', transition: 'all 0.2s',
        background: active ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? 'rgba(255,215,0,0.3)' : '#222'}`,
        color: active ? '#ffd700' : '#666',
      }}
    >
      {label}
    </button>
  );
}
