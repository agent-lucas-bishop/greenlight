import { useState } from 'react';
import { GameState, MarketingTier, PostProdOption } from '../types';
import { pickMarketing, pickPostProdOption, confirmPostProduction } from '../gameStore';
import { sfx } from '../sound';

const MARKETING_OPTIONS: { id: MarketingTier; emoji: string; name: string; cost: number; desc: string }[] = [
  { id: 'none', emoji: '🚫', name: 'No Marketing', cost: 0, desc: '1.0× box office — save your money' },
  { id: 'standard', emoji: '📺', name: 'Standard Campaign', cost: 2, desc: '1.2× box office — TV spots & posters' },
  { id: 'premium', emoji: '🌟', name: 'Premium Blitz', cost: 4, desc: '1.5× box office — full media saturation' },
  { id: 'viral', emoji: '🎲', name: 'Viral Campaign', cost: 1, desc: '0.8×–2.0× box office — risky but cheap' },
];

const POSTPROD_OPTIONS: { id: PostProdOption; emoji: string; name: string; cost: string; desc: string }[] = [
  { id: 'directorsCut', emoji: '🎬', name: "Director's Cut", cost: '+$1M', desc: '+5 quality — extended scenes & polish' },
  { id: 'testScreening', emoji: '👥', name: 'Test Screening', cost: 'Free', desc: 'Preview your tier before release' },
  { id: 'reshoot', emoji: '🔄', name: 'Reshoot', cost: '+$3M', desc: 'Reroll 2 lowest cards in your hand' },
  { id: 'rushRelease', emoji: '⚡', name: 'Rush Release', cost: '−$1M', desc: 'Skip post-prod, −10 quality but get $1M back' },
];

export default function PostProductionScreen({ state }: { state: GameState }) {
  const [phase, setPhase] = useState<'marketing' | 'postprod' | 'confirm'>('marketing');
  const [selectedMarketing, setSelectedMarketing] = useState<MarketingTier | null>(null);
  const [selectedPostProd, setSelectedPostProd] = useState<PostProdOption | null>(null);

  const handlePickMarketing = (tier: MarketingTier) => {
    if (MARKETING_OPTIONS.find(m => m.id === tier)!.cost > state.budget) return;
    sfx.click();
    setSelectedMarketing(tier);
    pickMarketing(tier);
    setPhase('postprod');
  };

  const handlePickPostProd = (option: PostProdOption) => {
    if (option === 'reshoot' && state.budget < 3) return;
    if (option === 'directorsCut' && state.budget < 1) return;
    sfx.click();
    setSelectedPostProd(option);
    pickPostProdOption(option);
    setPhase('confirm');
  };

  const handleConfirm = () => {
    sfx.click();
    confirmPostProduction();
  };

  const cardStyle = (selected: boolean, disabled?: boolean): React.CSSProperties => ({
    background: selected ? 'rgba(52, 152, 219, 0.25)' : disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
    border: `2px solid ${selected ? '#3498db' : disabled ? '#333' : '#555'}`,
    borderRadius: 12,
    padding: '16px 14px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'all 0.2s',
    textAlign: 'left' as const,
  });

  return (
    <div className="screen" style={{ textAlign: 'center' }}>
      <h2 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', marginBottom: 4 }}>
        🎬 Post-Production
      </h2>
      <p style={{ color: '#aaa', fontSize: 'clamp(0.75rem, 2vw, 0.95rem)', marginBottom: 20 }}>
        Your film is in the can. Time to polish and promote.
      </p>

      {/* Step 1: Marketing */}
      {phase === 'marketing' && (
        <div>
          <h3 style={{ fontSize: 'clamp(1rem, 2.5vw, 1.3rem)', marginBottom: 12, color: '#f1c40f' }}>
            💰 Marketing Budget
          </h3>
          <p style={{ color: '#888', fontSize: 'clamp(0.7rem, 1.8vw, 0.85rem)', marginBottom: 16 }}>
            How much will you spend to promote this film? Budget: ${state.budget}M
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            maxWidth: 900,
            margin: '0 auto',
          }}>
            {MARKETING_OPTIONS.map(opt => {
              const disabled = opt.cost > state.budget;
              return (
                <div
                  key={opt.id}
                  onClick={() => !disabled && handlePickMarketing(opt.id)}
                  style={cardStyle(false, disabled)}
                >
                  <div style={{ fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', marginBottom: 6 }}>{opt.emoji}</div>
                  <div style={{ fontWeight: 700, fontSize: 'clamp(0.85rem, 2vw, 1rem)', marginBottom: 4 }}>
                    {opt.name}
                  </div>
                  <div style={{ color: opt.cost > 0 ? '#e74c3c' : '#2ecc71', fontSize: 'clamp(0.75rem, 1.8vw, 0.9rem)', marginBottom: 6 }}>
                    {opt.cost > 0 ? `−$${opt.cost}M` : 'Free'}
                  </div>
                  <div style={{ color: '#aaa', fontSize: 'clamp(0.65rem, 1.5vw, 0.8rem)' }}>
                    {opt.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Post-Production Option */}
      {phase === 'postprod' && (
        <div>
          {/* Show marketing choice */}
          <div style={{ marginBottom: 16, padding: '8px 16px', background: 'rgba(52,152,219,0.15)', borderRadius: 8, display: 'inline-block' }}>
            <span style={{ color: '#3498db', fontSize: 'clamp(0.75rem, 1.8vw, 0.9rem)' }}>
              Marketing: {MARKETING_OPTIONS.find(m => m.id === state.postProdMarketing)?.emoji}{' '}
              {MARKETING_OPTIONS.find(m => m.id === state.postProdMarketing)?.name}
              {state.postProdMarketing === 'viral' && state.postProdMarketingMultiplier != null && (
                <span style={{ color: state.postProdMarketingMultiplier >= 1.0 ? '#2ecc71' : '#e74c3c', marginLeft: 8 }}>
                  → {state.postProdMarketingMultiplier.toFixed(2)}×
                </span>
              )}
            </span>
          </div>

          <h3 style={{ fontSize: 'clamp(1rem, 2.5vw, 1.3rem)', marginBottom: 12, color: '#9b59b6' }}>
            🎞️ Post-Production
          </h3>
          <p style={{ color: '#888', fontSize: 'clamp(0.7rem, 1.8vw, 0.85rem)', marginBottom: 16 }}>
            Choose one option. Budget: ${state.budget}M
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            maxWidth: 900,
            margin: '0 auto',
          }}>
            {POSTPROD_OPTIONS.map(opt => {
              const disabled = (opt.id === 'reshoot' && state.budget < 3) || (opt.id === 'directorsCut' && state.budget < 1);
              return (
                <div
                  key={opt.id}
                  onClick={() => !disabled && handlePickPostProd(opt.id)}
                  style={cardStyle(false, disabled)}
                >
                  <div style={{ fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', marginBottom: 6 }}>{opt.emoji}</div>
                  <div style={{ fontWeight: 700, fontSize: 'clamp(0.85rem, 2vw, 1rem)', marginBottom: 4 }}>
                    {opt.name}
                  </div>
                  <div style={{ color: opt.id === 'rushRelease' ? '#2ecc71' : opt.cost === 'Free' ? '#2ecc71' : '#e74c3c', fontSize: 'clamp(0.75rem, 1.8vw, 0.9rem)', marginBottom: 6 }}>
                    {opt.cost}
                  </div>
                  <div style={{ color: '#aaa', fontSize: 'clamp(0.65rem, 1.5vw, 0.8rem)' }}>
                    {opt.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: Confirm & Release */}
      {phase === 'confirm' && (
        <div>
          {/* Summary */}
          <div style={{
            maxWidth: 500,
            margin: '0 auto 24px',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: '20px 24px',
            textAlign: 'left',
          }}>
            <div style={{ marginBottom: 12 }}>
              <span style={{ color: '#888', fontSize: 'clamp(0.7rem, 1.8vw, 0.85rem)' }}>Marketing: </span>
              <span style={{ color: '#3498db', fontWeight: 700 }}>
                {MARKETING_OPTIONS.find(m => m.id === state.postProdMarketing)?.emoji}{' '}
                {MARKETING_OPTIONS.find(m => m.id === state.postProdMarketing)?.name}
                {state.postProdMarketing === 'viral' && state.postProdMarketingMultiplier != null && (
                  <span style={{ color: state.postProdMarketingMultiplier >= 1.0 ? '#2ecc71' : '#e74c3c', marginLeft: 6 }}>
                    ({state.postProdMarketingMultiplier.toFixed(2)}×)
                  </span>
                )}
              </span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <span style={{ color: '#888', fontSize: 'clamp(0.7rem, 1.8vw, 0.85rem)' }}>Post-Production: </span>
              <span style={{ color: '#9b59b6', fontWeight: 700 }}>
                {POSTPROD_OPTIONS.find(p => p.id === selectedPostProd)?.emoji}{' '}
                {POSTPROD_OPTIONS.find(p => p.id === selectedPostProd)?.name}
              </span>
            </div>
            {state.postProdTestScreeningTier && (
              <div style={{
                marginTop: 12,
                padding: '10px 14px',
                background: 'rgba(155, 89, 182, 0.15)',
                borderRadius: 8,
                border: '1px solid #9b59b6',
              }}>
                <span style={{ color: '#ddd', fontSize: 'clamp(0.8rem, 2vw, 0.95rem)' }}>
                  👥 Test screening suggests: <strong style={{
                    color: state.postProdTestScreeningTier === 'BLOCKBUSTER' ? '#f1c40f'
                      : state.postProdTestScreeningTier === 'SMASH' ? '#2ecc71'
                      : state.postProdTestScreeningTier === 'HIT' ? '#3498db'
                      : '#e74c3c',
                  }}>{state.postProdTestScreeningTier}</strong>
                </span>
              </div>
            )}
          </div>

          <button
            onClick={handleConfirm}
            style={{
              padding: '14px 40px',
              fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #3498db, #9b59b6)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
            }}
          >
            📊 See Box Office →
          </button>
        </div>
      )}
    </div>
  );
}
