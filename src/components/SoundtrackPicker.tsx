import { useState } from 'react';
import type { GameState, Genre } from '../types';
import { MUSICAL_THEMES, getThemeGenreBonus, isThemeMastered, getThemeUsageCount, MASTERY_BONUS_PERCENT, type MusicalThemeId } from '../soundtrack';
import { selectSoundtrackTheme, clearSoundtrackTheme } from '../gameStore';

interface Props {
  state: GameState;
  genre: Genre | string;
  onConfirm?: () => void;
}

export default function SoundtrackPicker({ state, genre, onConfirm }: Props) {
  const [hoveredId, setHoveredId] = useState<MusicalThemeId | null>(null);
  const selectedId = state.selectedThemeId;
  const history = state.soundtrackHistory || [];

  const handleSelect = (id: MusicalThemeId) => {
    if (selectedId === id) {
      clearSoundtrackTheme();
    } else {
      selectSoundtrackTheme(id);
    }
  };

  const handleConfirm = () => {
    onConfirm?.();
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2 style={{ textAlign: 'center', margin: '0 0 0.25rem 0', fontSize: '1.3rem' }}>
        🎵 Choose Your Soundtrack
      </h2>
      <p style={{ textAlign: 'center', opacity: 0.7, margin: '0 0 1rem 0', fontSize: '0.85rem' }}>
        Pick a musical theme for your <strong>{genre}</strong> film. Matching genres earn quality bonuses!
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '0.75rem',
        maxWidth: '720px',
        margin: '0 auto',
      }}>
        {MUSICAL_THEMES.map(theme => {
          const bonus = getThemeGenreBonus(theme.id, genre);
          const mastered = isThemeMastered(theme.id, history);
          const usageCount = getThemeUsageCount(theme.id, history);
          const totalBonus = bonus + (mastered ? MASTERY_BONUS_PERCENT : 0);
          const isSelected = selectedId === theme.id;
          const isHovered = hoveredId === theme.id;

          return (
            <div
              key={theme.id}
              onClick={() => handleSelect(theme.id)}
              onMouseEnter={() => setHoveredId(theme.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                position: 'relative',
                background: isSelected
                  ? `linear-gradient(135deg, ${theme.color}33, ${theme.color}66)`
                  : isHovered
                    ? `linear-gradient(135deg, ${theme.color}11, ${theme.color}22)`
                    : 'rgba(255,255,255,0.05)',
                border: isSelected ? `2px solid ${theme.color}` : '2px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: isSelected ? 'scale(1.03)' : isHovered ? 'scale(1.01)' : 'scale(1)',
              }}
            >
              {/* Vinyl record visual */}
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: `radial-gradient(circle at 30% 30%, ${theme.color}, #111)`,
                margin: '0 auto 0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                boxShadow: isSelected ? `0 0 15px ${theme.color}88` : 'none',
                transition: 'box-shadow 0.2s ease',
              }}>
                {theme.emoji}
              </div>

              {/* Mastery badge */}
              {mastered && (
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  background: 'linear-gradient(135deg, #f1c40f, #e67e22)',
                  borderRadius: '8px',
                  padding: '1px 6px',
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  color: '#000',
                }}>
                  ⭐ MASTERED
                </div>
              )}

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  {theme.name}
                </div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.4rem', lineHeight: 1.3 }}>
                  {theme.description}
                </div>

                {/* Genre affinity indicators */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', justifyContent: 'center' }}>
                  {theme.genreAffinities.map(a => (
                    <span
                      key={a.genre}
                      style={{
                        fontSize: '0.6rem',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: a.genre === genre ? '#27ae6044' : 'rgba(255,255,255,0.08)',
                        color: a.genre === genre ? '#2ecc71' : 'rgba(255,255,255,0.5)',
                        fontWeight: a.genre === genre ? 'bold' : 'normal',
                      }}
                    >
                      {a.genre} +{a.bonus}%
                    </span>
                  ))}
                </div>

                {/* Usage / mastery progress */}
                {usageCount > 0 && !mastered && (
                  <div style={{ fontSize: '0.6rem', opacity: 0.5, marginTop: '0.3rem' }}>
                    Used {usageCount}/3 — {3 - usageCount} more to master
                  </div>
                )}

                {/* Bonus display */}
                {totalBonus > 0 && (
                  <div style={{
                    marginTop: '0.3rem',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    color: '#2ecc71',
                  }}>
                    +{totalBonus}% quality
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm / skip */}
      <div style={{ textAlign: 'center', marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
        <button
          onClick={handleConfirm}
          style={{
            padding: '0.5rem 1.5rem',
            borderRadius: '8px',
            border: 'none',
            background: selectedId ? '#27ae60' : 'rgba(255,255,255,0.15)',
            color: '#fff',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          {selectedId ? '🎵 Confirm Theme' : 'Skip (No Theme)'}
        </button>
      </div>
    </div>
  );
}
