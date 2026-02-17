import { useState } from 'react';
import { GameState } from '../types';
import { getActiveChemistry } from '../data';

interface PostFilmSummaryProps {
  state: GameState;
}

const TAG_CONFIG: Record<string, { emoji: string; color: string }> = {
  momentum: { emoji: '🔥', color: '#e67e22' },
  precision: { emoji: '🎯', color: '#3498db' },
  chaos: { emoji: '💀', color: '#9b59b6' },
  heart: { emoji: '💕', color: '#e91e63' },
  spectacle: { emoji: '✨', color: '#f1c40f' },
};

export default function PostFilmSummary({ state }: PostFilmSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const prod = state.production;
  if (!prod || !prod.isWrapped) return null;

  const totalDrawn = prod.played.length;
  const incidentsTaken = prod.played.filter(c => c.cardType === 'incident').length;
  const incidentsBlocked = prod.discarded.filter(c => c.cardType === 'incident').length;
  const totalDiscarded = prod.discarded.length;

  // Most common tag
  const tagEntries = Object.entries(prod.tagsPlayed).sort((a, b) => b[1] - a[1]);
  const topTag = tagEntries.length > 0 ? tagEntries[0] : null;

  // Chemistry
  const castNames = state.castSlots.map(s => s.talent?.name).filter(Boolean) as string[];
  const activeChemistry = getActiveChemistry(castNames);

  // Synergies fired
  const synergiesFired = prod.played.filter(c => c.synergyFired).length;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8,
      marginTop: 12,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'none',
          border: 'none',
          color: '#999',
          fontSize: '0.8rem',
          cursor: 'pointer',
        }}
      >
        <span>📈 Production Stats</span>
        <span style={{ fontSize: '0.65rem' }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={{ padding: '4px 12px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: '0.75rem' }}>
            <div>
              <span style={{ color: '#666' }}>Cards Drawn</span>
              <div style={{ color: '#ccc', fontWeight: 600 }}>{totalDrawn}</div>
            </div>
            <div>
              <span style={{ color: '#666' }}>Discarded</span>
              <div style={{ color: '#ccc', fontWeight: 600 }}>{totalDiscarded}</div>
            </div>
            <div>
              <span style={{ color: '#666' }}>Incidents Taken</span>
              <div style={{ color: incidentsTaken > 0 ? '#e74c3c' : '#2ecc71', fontWeight: 600 }}>{incidentsTaken}</div>
            </div>
            <div>
              <span style={{ color: '#666' }}>Incidents Blocked</span>
              <div style={{ color: incidentsBlocked > 0 ? '#2ecc71' : '#888', fontWeight: 600 }}>{incidentsBlocked}</div>
            </div>
            <div>
              <span style={{ color: '#666' }}>Synergies Fired</span>
              <div style={{ color: synergiesFired > 0 ? '#d4a843' : '#888', fontWeight: 600 }}>{synergiesFired}</div>
            </div>
            {topTag && (
              <div>
                <span style={{ color: '#666' }}>Top Tag</span>
                <div style={{ color: TAG_CONFIG[topTag[0]]?.color || '#ccc', fontWeight: 600 }}>
                  {TAG_CONFIG[topTag[0]]?.emoji || '•'} {topTag[0]} ×{topTag[1]}
                </div>
              </div>
            )}
          </div>

          {activeChemistry.length > 0 && (
            <div style={{ marginTop: 8, fontSize: '0.7rem' }}>
              <span style={{ color: '#666' }}>Chemistry Bonuses</span>
              {activeChemistry.map((c, i) => (
                <div key={i} style={{ color: '#e91e63', marginTop: 2 }}>
                  💕 {c.name}: +{c.qualityBonus}
                </div>
              ))}
            </div>
          )}

          {prod.cleanWrap && !prod.isDisaster && (
            <div style={{ marginTop: 6, fontSize: '0.7rem', color: '#d4a843' }}>
              ✨ Clean Wrap achieved!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
