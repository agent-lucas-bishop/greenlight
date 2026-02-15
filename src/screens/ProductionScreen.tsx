import { useState, useEffect, useRef } from 'react';
import { GameState, ProductionCard } from '../types';
import { drawProductionCard, wrapProduction, resolveRelease, useReshoots, calculateQuality, getMaxDraws } from '../gameStore';

function RiskBadge({ tag }: { tag: string }) {
  return <span className={`risk-badge risk-${tag === '🟢' ? 'green' : tag === '🟡' ? 'yellow' : 'red'}`}>{tag}</span>;
}

function SourceBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    actor: '#e74c3c',
    director: '#9b59b6',
    crew: '#3498db',
    script: '#2ecc71',
  };
  const labels: Record<string, string> = {
    actor: '🎭 Actor',
    director: '🎬 Director',
    crew: '🔧 Crew',
    script: '📜 Script',
  };
  return (
    <span className="source-badge" style={{ background: colors[type] || '#666', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600 }}>
      {labels[type] || type}
    </span>
  );
}

function ProductionCardDisplay({ card, isNew, index }: { card: ProductionCard; isNew: boolean; index: number }) {
  const [showSynergy, setShowSynergy] = useState(false);

  useEffect(() => {
    if (isNew && card.synergyFired) {
      const t = setTimeout(() => setShowSynergy(true), 600);
      return () => clearTimeout(t);
    } else if (isNew) {
      setShowSynergy(false);
    }
  }, [isNew, card.synergyFired]);

  const isRed = card.riskTag === '🔴';
  const isGood = (card.totalValue || 0) > 0;
  const isBad = (card.totalValue || 0) < 0;

  return (
    <div className={`prod-card-new ${isNew ? 'card-enter' : ''} ${isRed ? 'red-card' : ''}`}>
      <div className="prod-card-header">
        <SourceBadge type={card.sourceType} />
        <RiskBadge tag={card.riskTag} />
      </div>
      <div className="prod-card-name">{card.name}</div>
      <div className="prod-card-source">{card.source}</div>
      <div className={`prod-card-value ${isGood ? 'positive' : isBad ? 'negative' : ''}`}>
        {card.baseQuality >= 0 ? '+' : ''}{card.baseQuality}
        {card.synergyFired && showSynergy && (
          <span className="synergy-pop">
            {(card.synergyBonus || 0) >= 0 ? ' +' : ' '}{card.synergyBonus}
          </span>
        )}
        {card.synergyFired && showSynergy && (
          <span className="total-pop"> = {(card.totalValue || 0) >= 0 ? '+' : ''}{card.totalValue}</span>
        )}
      </div>
      <div className="prod-card-synergy">
        {card.synergyText}
        {card.synergyFired && showSynergy && (
          <span className="synergy-fired"> ✨ FIRED!</span>
        )}
      </div>
      {card.budgetMod && card.budgetMod !== 0 && (
        <div className="prod-card-budget" style={{ color: card.budgetMod > 0 ? '#2ecc71' : '#e74c3c' }}>
          {card.budgetMod > 0 ? '+' : ''}${card.budgetMod}M
        </div>
      )}
    </div>
  );
}

export default function ProductionScreen({ state }: { state: GameState }) {
  const prod = state.production;
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastDrawn, setLastDrawn] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!prod) return null;

  const deckSize = prod.deck.length;
  const maxDraws = getMaxDraws(prod);
  const canDraw = !prod.isWrapped && prod.drawCount < maxDraws && deckSize > 0;
  const canWrap = prod.drawCount > 0 && !prod.isWrapped && !isDrawing && !(prod.forceExtraDraw && prod.drawCount < maxDraws);
  const mustDraw = prod.forceExtraDraw && prod.drawCount < maxDraws && !prod.isDisaster;
  const drawsLeft = maxDraws - prod.drawCount;

  const { rawQuality, scriptBase, talentSkill, productionBonus, cleanWrapBonus, scriptAbilityBonus } = calculateQuality(state);

  // Count risk tags in remaining deck
  const redInDeck = prod.deck.filter(c => c.riskTag === '🔴').length;
  const greenInDeck = prod.deck.filter(c => c.riskTag === '🟢').length;

  const handleDraw = () => {
    setIsDrawing(true);
    setTimeout(() => {
      drawProductionCard();
      setIsDrawing(false);
      // Scroll to bottom
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50);
    }, 400);
  };

  useEffect(() => {
    if (prod.played.length > 0) {
      setLastDrawn(prod.played[prod.played.length - 1].id);
    }
  }, [prod.played.length]);

  return (
    <div className="production-area fade-in">
      <div className="phase-title">
        <h2>🎥 Production</h2>
        <div className="subtitle">
          "{state.currentScript?.title}" — {state.currentScript?.genre}
        </div>
      </div>

      {/* Stats bar */}
      <div className="production-stats-bar">
        <div className="prod-stat">
          <span className="label">Deck Left</span>
          <span className="value">{deckSize}</span>
        </div>
        <div className="prod-stat">
          <span className="label">Draw</span>
          <span className="value">{prod.drawCount}/{maxDraws}</span>
        </div>
        <div className="prod-stat">
          <span className="label">Draws Left</span>
          <span className="value" style={{ color: drawsLeft <= 1 ? '#e74c3c' : drawsLeft <= 3 ? '#f39c12' : '#2ecc71' }}>{drawsLeft}</span>
        </div>
        <div className="prod-stat">
          <span className="label">🟢 Left</span>
          <span className="value" style={{ color: '#2ecc71' }}>{greenInDeck}</span>
        </div>
        <div className="prod-stat">
          <span className="label">🔴 Left</span>
          <span className="value" style={{ color: '#e74c3c' }}>{redInDeck}</span>
        </div>
        <div className="prod-stat">
          <span className="label">Quality</span>
          <span className="value" style={{ color: '#d4a843' }}>{rawQuality}</span>
        </div>
      </div>

      {/* 🔴 counter */}
      <div className="bad-counter">
        {[0, 1, 2].map(i => (
          <div key={i} className={`bad-pip ${i < prod.redCount ? 'filled' : ''} ${i < prod.redCount ? 'animate-shake' : ''}`}>
            {i < prod.redCount ? '🔴' : '○'}
          </div>
        ))}
        <span className="bad-label">
          {prod.redCount >= 2 ? '⚠️ NEXT 🔴 = DISASTER!' : prod.redCount >= 1 ? '⚠️ Careful...' : prod.cleanWrap && prod.drawCount > 0 ? '✨ Clean Wrap active (+5 bonus)' : 'No 🔴 cards yet'}
        </span>
      </div>

      {/* Quality breakdown */}
      <div className="quality-breakdown">
        <span className="qb-item">📜 Script: {scriptBase}</span>
        <span className="qb-item">🎭 Talent: +{talentSkill}</span>
        <span className="qb-item" style={{ color: productionBonus >= 0 ? '#2ecc71' : '#e74c3c' }}>🎬 Production: {productionBonus >= 0 ? '+' : ''}{productionBonus}</span>
        {cleanWrapBonus > 0 && <span className="qb-item" style={{ color: '#d4a843' }}>✨ Clean Wrap: +{cleanWrapBonus}</span>}
        {scriptAbilityBonus > 0 && <span className="qb-item" style={{ color: '#9b59b6' }}>⭐ Ability: +{scriptAbilityBonus}</span>}
      </div>

      {/* Budget impact */}
      {prod.budgetChange !== 0 && (
        <div style={{ color: prod.budgetChange > 0 ? '#2ecc71' : '#e74c3c', fontSize: '0.85rem', marginBottom: 8 }}>
          💰 Budget impact: {prod.budgetChange > 0 ? '+' : ''}${prod.budgetChange}M
        </div>
      )}

      {/* Drawing animation */}
      {isDrawing && (
        <div className="draw-animation">
          <div className="card-back spinning">🎬</div>
        </div>
      )}

      {/* Played cards */}
      <div className="production-deck" ref={scrollRef}>
        {prod.played.map((card, i) => (
          <ProductionCardDisplay
            key={card.id}
            card={card}
            isNew={card.id === lastDrawn}
            index={i}
          />
        ))}
      </div>

      {/* Disaster banner */}
      {prod.isDisaster && (
        <div className="disaster-banner animate-shake">
          <h3>💥 DISASTER!</h3>
          <p>3 🔴 cards drawn. Movie quality halved!</p>
        </div>
      )}

      {/* Force draw warning */}
      {mustDraw && !prod.isDisaster && (
        <div style={{ color: '#e74c3c', fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>
          ⚠️ "Perfection Paralysis" — You MUST draw at least one more card!
        </div>
      )}

      {/* Actions */}
      <div className="btn-group">
        {canDraw && !isDrawing && (
          <button className="btn btn-primary btn-glow" onClick={handleDraw}>
            🎬 {prod.drawCount === 0 ? 'DRAW FIRST CARD' : 'DRAW CARD'}
          </button>
        )}
        {canWrap && !mustDraw && (
          <button className="btn" onClick={wrapProduction}>
            ✂️ WRAP — Call "CUT!"
          </button>
        )}
        {state.hasReshoots && !state.reshootsUsed && prod.played.length > 0 && !prod.isWrapped && !isDrawing && (
          <button className="btn btn-danger btn-small" onClick={useReshoots}>
            🔄 RESHOOTS
          </button>
        )}
        {prod.isWrapped && (
          <button className="btn btn-primary btn-glow" onClick={resolveRelease}>
            📊 SEE BOX OFFICE →
          </button>
        )}
      </div>
    </div>
  );
}
