import { GameState } from '../types';
import { drawProductionCard, wrapProduction, resolveRelease, useReshoots } from '../gameStore';

export default function ProductionScreen({ state }: { state: GameState }) {
  const prod = state.production;
  if (!prod) return null;

  const totalHeat = state.castSlots.reduce((s, c) => s + (c.talent?.heat || 0), 0);
  const deckSize = prod.deck.length;
  const badRate = deckSize > 0 ? Math.round((prod.deck.filter(c => c.type === 'bad').length / deckSize) * 100) : 0;
  const canDraw = !prod.isWrapped && prod.drawCount < 6 && deckSize > 0;

  return (
    <div className="production-area">
      <div className="phase-title">
        <h2>🎥 Production</h2>
        <div className="subtitle">
          "{state.currentScript?.title}" — Draw {prod.drawCount}/6 — {deckSize} cards remaining
        </div>
      </div>

      <div style={{ marginBottom: 16, fontSize: '0.85rem', color: '#999' }}>
        Total Cast Heat: <strong style={{ color: '#e74c3c' }}>{totalHeat}</strong>
        {' · '}Danger Rate: <strong style={{ color: badRate > 30 ? '#e74c3c' : '#27ae60' }}>{badRate}%</strong>
      </div>

      {/* Bad card counter */}
      <div className="bad-counter">
        {[0, 1, 2].map(i => (
          <div key={i} className={`bad-pip ${i < prod.badCount ? 'filled' : ''}`}>
            {i < prod.badCount ? '💥' : ''}
          </div>
        ))}
        <span style={{ color: '#666', fontSize: '0.8rem', marginLeft: 8 }}>
          {prod.badCount}/3 — {prod.badCount >= 2 ? '⚠️ DANGER!' : prod.badCount >= 1 ? 'Careful...' : 'Safe so far'}
        </span>
      </div>

      {/* Quality display */}
      <div className="quality-display">
        Quality: +{prod.qualityBonus}
      </div>
      {prod.budgetChange !== 0 && (
        <div style={{ color: prod.budgetChange > 0 ? '#2ecc71' : '#e74c3c', fontSize: '0.9rem' }}>
          Budget: {prod.budgetChange > 0 ? '+' : ''}{prod.budgetChange}M
        </div>
      )}

      {/* Drawn cards */}
      <div className="production-deck">
        {prod.drawn.map((card, i) => (
          <div key={card.id + i} className={`prod-card ${card.type}`}>
            <strong>{card.name}</strong>
            <div style={{ marginTop: 4, fontSize: '0.75rem' }}>{card.effect}</div>
          </div>
        ))}
      </div>

      {prod.isDisaster && (
        <div style={{ background: 'rgba(192,57,43,0.2)', border: '2px solid #c0392b', borderRadius: 8, padding: 20, margin: '20px 0' }}>
          <h3 style={{ color: '#e74c3c', fontSize: '2rem' }}>💥 DISASTER!</h3>
          <p style={{ color: '#e74c3c' }}>3 bad cards drawn. Movie quality halved!</p>
        </div>
      )}

      {/* Actions */}
      <div className="btn-group">
        {canDraw && (
          <button className="btn btn-primary" onClick={drawProductionCard}>
            🎬 DRAW ({prod.drawCount === 0 ? 'First draw' : 'Push your luck!'})
          </button>
        )}
        {prod.drawCount > 0 && !prod.isWrapped && (
          <button className="btn" onClick={wrapProduction}>
            ✂️ WRAP — Call "CUT!"
          </button>
        )}
        {state.hasReshoots && !state.reshootsUsed && prod.drawn.length > 0 && !prod.isWrapped && (
          <button className="btn btn-danger btn-small" onClick={useReshoots}>
            🔄 RESHOOTS (redraw last card)
          </button>
        )}
        {prod.isWrapped && (
          <button className="btn btn-primary" onClick={resolveRelease}>
            📊 SEE BOX OFFICE →
          </button>
        )}
      </div>
    </div>
  );
}
