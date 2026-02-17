import type { GameState } from '../types';
import { getThemeById, isThemeMastered, getThemeUsageCount, MUSICAL_THEMES, type SoundtrackHistoryEntry } from '../soundtrack';

interface Props {
  state: GameState;
}

export default function SoundtrackHistory({ state }: Props) {
  const history: SoundtrackHistoryEntry[] = state.soundtrackHistory || [];

  if (history.length === 0) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', opacity: 0.5 }}>
        <p>🎵 No soundtrack history yet. Pick themes during pre-production!</p>
      </div>
    );
  }

  // Compute mastery stats
  const themeStats = MUSICAL_THEMES.map(theme => {
    const count = getThemeUsageCount(theme.id, history);
    const mastered = isThemeMastered(theme.id, history);
    const entries = history.filter(e => e.themeId === theme.id);
    const avgBonus = entries.length > 0
      ? Math.round(entries.reduce((s, e) => s + e.qualityBonusPercent, 0) / entries.length)
      : 0;
    return { theme, count, mastered, avgBonus };
  }).filter(s => s.count > 0);

  return (
    <div style={{ padding: '1rem' }}>
      <h3 style={{ textAlign: 'center', margin: '0 0 0.75rem 0' }}>
        🎵 Soundtrack Timeline
      </h3>

      {/* Mastery overview */}
      {themeStats.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          justifyContent: 'center',
          marginBottom: '1rem',
        }}>
          {themeStats.map(({ theme, count, mastered, avgBonus }) => (
            <div
              key={theme.id}
              style={{
                background: mastered
                  ? `linear-gradient(135deg, ${theme.color}44, ${theme.color}22)`
                  : 'rgba(255,255,255,0.05)',
                border: mastered ? `1px solid ${theme.color}88` : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '0.4rem 0.6rem',
                fontSize: '0.75rem',
                textAlign: 'center',
                minWidth: '80px',
              }}
            >
              <div>{theme.emoji} {theme.name}</div>
              <div style={{ opacity: 0.6, fontSize: '0.65rem' }}>
                Used {count}× {mastered && '⭐'} {avgBonus > 0 && `avg +${avgBonus}%`}
              </div>
              {!mastered && count > 0 && (
                <div style={{
                  marginTop: '2px',
                  height: '3px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${(count / 3) * 100}%`,
                    height: '100%',
                    background: theme.color,
                    borderRadius: '2px',
                  }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        maxHeight: '300px',
        overflowY: 'auto',
      }}>
        {[...history].reverse().map((entry, i) => {
          const theme = getThemeById(entry.themeId);
          if (!theme) return null;

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.6rem',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '6px',
                borderLeft: `3px solid ${theme.color}`,
                fontSize: '0.8rem',
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{theme.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>
                  {entry.filmTitle}
                  <span style={{ opacity: 0.5, fontWeight: 'normal', marginLeft: '0.3rem' }}>
                    S{entry.season} · {entry.genre}
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                  {theme.name}
                  {entry.mastered && ' ⭐ Mastered'}
                </div>
              </div>
              <div style={{
                fontWeight: 'bold',
                color: entry.qualityBonusPercent > 0 ? '#2ecc71' : 'rgba(255,255,255,0.3)',
                fontSize: '0.8rem',
              }}>
                {entry.qualityBonusPercent > 0 ? `+${entry.qualityBonusPercent}%` : '—'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
