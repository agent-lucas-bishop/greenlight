// R260: CraftingRecipe — shows recipe requirements and result preview with animations
import { useState } from 'react';
import type { FusionPair, CraftingMaterials } from '../cardCrafting';

interface Props {
  pair: FusionPair;
  materials: CraftingMaterials;
  onFuse: (card1Id: string, card2Id: string) => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#aaa',
  rare: '#4fc3f7',
  epic: '#ba68c8',
  legendary: '#ffd54f',
};

export default function CraftingRecipe({ pair, materials, onFuse }: Props) {
  const [animating, setAnimating] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const canAfford = materials.starDust >= pair.starDustCost && materials.awardTokens >= pair.awardTokenCost;

  const handleFuse = () => {
    if (!canAfford || animating) return;
    setAnimating(true);
    setTimeout(() => {
      setShowResult(true);
      setTimeout(() => {
        onFuse(pair.card1.id, pair.card2.id);
        setAnimating(false);
        setShowResult(false);
      }, 1500);
    }, 800);
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      border: `1px solid ${canAfford ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.1)'}`,
      transition: 'all 0.3s ease',
      transform: animating ? 'scale(1.02)' : 'scale(1)',
    }}>
      {/* Input cards */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          padding: '8px 14px',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 8,
          border: `1px solid ${RARITY_COLORS[pair.card1.rarity]}`,
          textAlign: 'center',
          opacity: animating ? 0.5 : 1,
          transition: 'all 0.5s ease',
          transform: animating ? 'translateX(20px) scale(0.9)' : 'none',
        }}>
          <div style={{ fontSize: 12, color: RARITY_COLORS[pair.card1.rarity], textTransform: 'uppercase' }}>{pair.card1.rarity}</div>
          <div style={{ fontWeight: 700 }}>{pair.card1.name}</div>
          <div style={{ fontSize: 11, color: '#999' }}>★{pair.card1.skill} {pair.card1.role}</div>
        </div>

        <div style={{
          fontSize: 24,
          color: animating ? '#ffd54f' : '#666',
          transition: 'all 0.3s ease',
          animation: animating ? 'spin 0.8s ease-in-out' : 'none',
        }}>⚡</div>

        <div style={{
          padding: '8px 14px',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 8,
          border: `1px solid ${RARITY_COLORS[pair.card2.rarity]}`,
          textAlign: 'center',
          opacity: animating ? 0.5 : 1,
          transition: 'all 0.5s ease',
          transform: animating ? 'translateX(-20px) scale(0.9)' : 'none',
        }}>
          <div style={{ fontSize: 12, color: RARITY_COLORS[pair.card2.rarity], textTransform: 'uppercase' }}>{pair.card2.rarity}</div>
          <div style={{ fontWeight: 700 }}>{pair.card2.name}</div>
          <div style={{ fontSize: 11, color: '#999' }}>★{pair.card2.skill} {pair.card2.role}</div>
        </div>
      </div>

      {/* Arrow / Result */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        {!showResult ? (
          <div style={{ color: '#666', fontSize: 18 }}>▼</div>
        ) : (
          <div style={{
            padding: '10px 18px',
            background: `linear-gradient(135deg, ${RARITY_COLORS[pair.resultPreview.rarity]}22, ${RARITY_COLORS[pair.resultPreview.rarity]}44)`,
            borderRadius: 10,
            border: `2px solid ${RARITY_COLORS[pair.resultPreview.rarity]}`,
            display: 'inline-block',
            animation: 'fadeInScale 0.5s ease-out',
          }}>
            <div style={{ fontSize: 12, color: RARITY_COLORS[pair.resultPreview.rarity], textTransform: 'uppercase', fontWeight: 700 }}>
              ✨ {pair.resultPreview.rarity}
            </div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{pair.resultPreview.name}</div>
            <div style={{ fontSize: 12, color: '#ccc' }}>★{pair.resultPreview.skill} {pair.resultPreview.role}</div>
            {pair.resultPreview.trait && (
              <div style={{ fontSize: 11, color: '#f0c040', marginTop: 4 }}>{pair.resultPreview.trait}</div>
            )}
          </div>
        )}
      </div>

      {/* Result preview (always shown) */}
      {!showResult && (
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{
            padding: '6px 12px',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 8,
            display: 'inline-block',
            border: `1px dashed ${RARITY_COLORS[pair.resultPreview.rarity]}55`,
          }}>
            <span style={{ fontSize: 11, color: '#888' }}>Result: </span>
            <span style={{ color: RARITY_COLORS[pair.resultPreview.rarity], fontWeight: 600, fontSize: 13 }}>
              {pair.resultPreview.name}
            </span>
            <span style={{ color: '#999', fontSize: 11 }}> ★{pair.resultPreview.skill}</span>
          </div>
        </div>
      )}

      {/* Cost + button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12 }}>
          <span style={{ color: materials.starDust >= pair.starDustCost ? '#81d4fa' : '#e57373' }}>
            ✨ {pair.starDustCost} Star Dust
          </span>
          {' + '}
          <span style={{ color: materials.awardTokens >= pair.awardTokenCost ? '#ffd54f' : '#e57373' }}>
            🏆 {pair.awardTokenCost} Award Tokens
          </span>
        </div>
        <button
          onClick={handleFuse}
          disabled={!canAfford || animating}
          style={{
            padding: '6px 16px',
            background: canAfford ? 'linear-gradient(135deg, #f39c12, #e67e22)' : '#555',
            color: canAfford ? '#000' : '#888',
            border: 'none',
            borderRadius: 6,
            fontWeight: 700,
            cursor: canAfford ? 'pointer' : 'not-allowed',
            fontSize: 13,
          }}
        >
          {animating ? '⚡ FUSING...' : '⚒️ FUSE'}
        </button>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
