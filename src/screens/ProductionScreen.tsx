import { useState, useEffect } from 'react';
import { GameState } from '../types';
import { drawProductionCard, wrapProduction, resolveRelease, useReshoots, calculateQuality } from '../gameStore';

export default function ProductionScreen({ state }: { state: GameState }) {
  const prod = state.production;
  const [isDrawing, setIsDrawing] = useState(false);
  const [showCard, setShowCard] = useState(false);
  
  if (!prod) return null;

  const totalHeat = state.castSlots.reduce((s, c) => s + (c.talent?.heat || 0), 0);
  const deckSize = prod.deck.length;
  const badRate = deckSize > 0 ? Math.round((prod.deck.filter(c => c.type === 'bad').length / deckSize) * 100) : 0;
  const canDraw = !prod.isWrapped && prod.drawCount < 6 && deckSize > 0;
  
  // Estimated quality preview
  const script = state.currentScript;
  const talentSkill = state.castSlots.reduce((s, c) => s + (c.talent?.skill || 0), 0);
  const estQuality = (script?.baseScore || 0) + talentSkill + prod.qualityBonus;
  
  const handleDraw = () => {
    setIsDrawing(true);
    setShowCard(false);
    setTimeout(() => {
      drawProductionCard();
      setShowCard(true);
      setIsDrawing(false);
    }, 300);
  };

  return (
    <div className="production-area fade-in">
      <div className="phase-title">
        <h2>🎥 Production</h2>
        <div className="subtitle">
          "{state.currentScript?.title}" — Draw {prod.drawCount}/6 — {deckSize} cards remaining
        </div>
      </div>

      <div className="production-stats-bar">
        <div className="prod-stat">
          <span className="label">Cast Heat</span>
          <span className="value" style={{ color: totalHeat > 5 ? '#e74c3c' : '#d4a843' }}>{totalHeat}</span>
        </div>
        <div className="prod-stat">
          <span className="label">Danger</span>
          <span className="value" style={{ color: badRate > 30 ? '#e74c3c' : badRate > 20 ? '#f39c12' : '#27ae60' }}>{badRate}%</span>
        </div>
        <div className="prod-stat">
          <span className="label">Est. Quality</span>
          <span className="value" style={{ color: '#d4a843' }}>{estQuality}</span>
        </div>
      </div>

      {/* Bad card counter */}
      <div className="bad-counter">
        {[0, 1, 2].map(i => (
          <div key={i} className={`bad-pip ${i < prod.badCount ? 'filled' : ''} ${i < prod.badCount ? 'animate-shake' : ''}`}>
            {i < prod.badCount ? '💥' : '○'}
          </div>
        ))}
        <span className="bad-label">
          {prod.badCount >= 2 ? '⚠️ NEXT BAD CARD = DISASTER!' : prod.badCount >= 1 ? '⚠️ Careful...' : 'No bad cards yet'}
        </span>
      </div>

      {/* Quality display */}
      <div className={`quality-display ${prod.qualityBonus > 0 ? 'positive' : prod.qualityBonus < 0 ? 'negative' : ''}`}>
        Production: {prod.qualityBonus >= 0 ? '+' : ''}{prod.qualityBonus}
      </div>
      {prod.budgetChange !== 0 && (
        <div style={{ color: prod.budgetChange > 0 ? '#2ecc71' : '#e74c3c', fontSize: '0.9rem', marginBottom: 8 }}>
          Budget impact: {prod.budgetChange > 0 ? '+' : ''}${prod.budgetChange}M
        </div>
      )}

      {/* Drawing animation */}
      {isDrawing && (
        <div className="draw-animation">
          <div className="card-back spinning">🎬</div>
        </div>
      )}

      {/* Drawn cards */}
      <div className="production-deck">
        {prod.drawn.map((card, i) => (
          <div 
            key={card.id + i} 
            className={`prod-card ${card.type} ${i === prod.drawn.length - 1 && showCard ? 'card-reveal' : ''}`}
          >
            <strong>{card.name}</strong>
            <div style={{ marginTop: 4, fontSize: '0.75rem' }}>{card.effect}</div>
            {card.qualityMod !== 0 && (
              <div style={{ marginTop: 4, fontWeight: 'bold', fontSize: '0.85rem' }}>
                {card.qualityMod > 0 ? '+' : ''}{card.qualityMod}
              </div>
            )}
          </div>
        ))}
      </div>

      {prod.isDisaster && (
        <div className="disaster-banner animate-shake">
          <h3>💥 DISASTER!</h3>
          <p>3 bad cards drawn. Movie quality halved!</p>
        </div>
      )}

      {/* Actions */}
      <div className="btn-group">
        {canDraw && !isDrawing && (
          <button className="btn btn-primary btn-glow" onClick={handleDraw}>
            🎬 {prod.drawCount === 0 ? 'DRAW FIRST CARD' : 'PUSH YOUR LUCK!'}
          </button>
        )}
        {prod.drawCount > 0 && !prod.isWrapped && !isDrawing && (
          <button className="btn" onClick={wrapProduction}>
            ✂️ WRAP — Call "CUT!"
          </button>
        )}
        {state.hasReshoots && !state.reshootsUsed && prod.drawn.length > 0 && !prod.isWrapped && !isDrawing && (
          <button className="btn btn-danger btn-small" onClick={useReshoots}>
            🔄 RESHOOTS (redraw last card)
          </button>
        )}
        {prod.isWrapped && (
          <button className="btn btn-primary btn-glow" onClick={resolveRelease}>
            📊 SEE BOX OFFICE →
          </button>
        )}
      </div>
      
      {canDraw && prod.drawCount > 0 && !prod.isWrapped && (
        <div style={{ marginTop: 12, fontSize: '0.75rem', color: '#555' }}>
          {prod.drawCount >= 4 && `${6 - prod.drawCount} draw${6 - prod.drawCount === 1 ? '' : 's'} remaining. `}
          {prod.badCount === 2 && 'One more bad card ends production in disaster!'}
        </div>
      )}
    </div>
  );
}
