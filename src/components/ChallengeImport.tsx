/**
 * R256: Challenge Import — paste a code or URL to load and play a custom challenge
 */

import { useState } from 'react';
import { decodeChallenge, OBJECTIVE_POOL, WIN_CONDITION_OPTIONS } from '../challengeEditor';
import type { CustomChallenge } from '../challengeEditor';

interface Props {
  onPlay?: (challenge: CustomChallenge) => void;
  onClose?: () => void;
  /** Pre-loaded challenge (e.g. from URL hash) */
  initialChallenge?: CustomChallenge | null;
}

export function ChallengeImport({ onPlay, onClose, initialChallenge }: Props) {
  const [input, setInput] = useState('');
  const [challenge, setChallenge] = useState<CustomChallenge | null>(initialChallenge || null);
  const [error, setError] = useState('');

  const handleImport = () => {
    setError('');
    // Extract code from URL or raw code
    let code = input.trim();
    const urlMatch = code.match(/challenge=(glc_[A-Za-z0-9_-]+)/);
    if (urlMatch) code = urlMatch[1];
    const parsed = decodeChallenge(code);
    if (!parsed) {
      setError('Invalid challenge code. Check the code and try again.');
      return;
    }
    setChallenge(parsed);
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 16 }}>
      {onClose && (
        <button className="btn btn-small" onClick={onClose} style={{ marginBottom: 12, color: '#888' }}>← Back</button>
      )}
      <h2 style={{ fontFamily: 'Bebas Neue', color: '#3498db', fontSize: '1.3rem', margin: '0 0 16px' }}>
        📥 Import Challenge
      </h2>

      {!challenge && (
        <>
          <p style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: 12 }}>
            Paste a challenge code or shareable URL to load a custom challenge.
          </p>
          <textarea
            value={input} onChange={e => setInput(e.target.value)}
            placeholder="Paste challenge code (glc_...) or URL here..."
            style={{
              width: '100%', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.8rem',
              fontFamily: 'monospace', height: 80, resize: 'vertical', boxSizing: 'border-box',
            }}
          />
          {error && <div style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: 8 }}>⚠️ {error}</div>}
          <button className="btn" style={{ marginTop: 12, color: '#3498db', borderColor: '#3498db' }}
            disabled={!input.trim()} onClick={handleImport}>
            🔍 Load Challenge
          </button>
        </>
      )}

      {challenge && (
        <div>
          <div style={{
            background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 16,
            border: '1px solid rgba(52,152,219,0.3)',
          }}>
            <h3 style={{ margin: '0 0 8px', fontFamily: 'Bebas Neue', color: '#f39c12', fontSize: '1.3rem' }}>
              🔧 {challenge.name}
            </h3>
            {challenge.desc && <p style={{ color: '#aaa', fontSize: '0.8rem', margin: '0 0 8px' }}>{challenge.desc}</p>}
            {challenge.author && <p style={{ color: '#666', fontSize: '0.7rem', margin: '0 0 12px' }}>by {challenge.author}</p>}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {challenge.genre && <Tag color="#e74c3c">🎬 {challenge.genre} only</Tag>}
              {challenge.budget !== null && <Tag color="#2ecc71">💰 ${challenge.budget}M</Tag>}
              {challenge.turnLimit !== null && <Tag color="#3498db">⏱️ {challenge.turnLimit} seasons</Tag>}
              {challenge.modifiers.ironMan && <Tag color="#e74c3c">💀 Iron Man</Tag>}
              {challenge.modifiers.speedMode && <Tag color="#9b59b6">⚡ Speed</Tag>}
              {challenge.modifiers.noLegendary && <Tag color="#e67e22">🚫 No Legendary</Tag>}
              {challenge.modifiers.budgetAdjustment !== 0 && <Tag color="#2ecc71">💰 {challenge.modifiers.budgetAdjustment > 0 ? '+' : ''}{challenge.modifiers.budgetAdjustment}$M</Tag>}
              {challenge.modifiers.rivalAggressiveness !== 1 && <Tag color="#e74c3c">👊 Rivals {challenge.modifiers.rivalAggressiveness}×</Tag>}
              {challenge.modifiers.incidentFrequency !== 1 && <Tag color="#e67e22">⚠️ Incidents {challenge.modifiers.incidentFrequency}×</Tag>}
            </div>

            {challenge.startingCards.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: '#888', fontSize: '0.7rem' }}>Starting Cards: </span>
                {challenge.startingCards.map(c => <span key={c} style={{ color: '#2ecc71', fontSize: '0.75rem', marginRight: 6 }}>{c}</span>)}
              </div>
            )}

            {challenge.winCondition.type !== 'survive' && (
              <div style={{ color: '#f39c12', fontSize: '0.8rem', marginBottom: 6 }}>
                🏆 Win: {WIN_CONDITION_OPTIONS.find(o => o.type === challenge.winCondition.type)?.label} {'target' in challenge.winCondition ? (challenge.winCondition as any).target : ''}
              </div>
            )}

            {challenge.objectives.length > 0 && (
              <div>
                <span style={{ color: '#888', fontSize: '0.7rem' }}>Bonus Objectives:</span>
                {challenge.objectives.map((obj, i) => (
                  <div key={i} style={{ color: '#ddd', fontSize: '0.75rem', paddingLeft: 8 }}>
                    • {obj.type === 'pool' ? OBJECTIVE_POOL.find(o => o.id === obj.value)?.description : obj.value}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn" style={{ color: '#2ecc71', borderColor: '#2ecc71', fontSize: '1rem' }}
              onClick={() => onPlay?.(challenge)}>
              🎬 Play This Challenge
            </button>
            <button className="btn btn-small" style={{ color: '#888' }}
              onClick={() => { setChallenge(null); setInput(''); }}>
              Try Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem',
      background: `${color}15`, border: `1px solid ${color}40`, color,
    }}>{children}</span>
  );
}
