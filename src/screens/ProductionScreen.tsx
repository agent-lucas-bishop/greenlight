import { useState, useEffect, useRef } from 'react';
import { GameState, ProductionCard } from '../types';
import { drawProductionCards, pickCard, resolveChallengeBet, wrapProduction, resolveRelease, useReshoots, calculateQuality, getMaxDraws } from '../gameStore';

function CardTypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    action: { label: 'ACTION', color: '#fff', bg: '#2ecc71' },
    challenge: { label: 'CHALLENGE', color: '#000', bg: '#f1c40f' },
    incident: { label: 'INCIDENT', color: '#fff', bg: '#e74c3c' },
  };
  const c = config[type] || config.action;
  return (
    <span style={{ background: c.bg, color: c.color, padding: '2px 8px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.05em' }}>
      {c.label}
    </span>
  );
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

function ProductionCardDisplay({ card, isNew, onClick, selectable }: { card: ProductionCard; isNew: boolean; onClick?: () => void; selectable?: boolean }) {
  const [showSynergy, setShowSynergy] = useState(false);

  useEffect(() => {
    if (isNew && card.synergyFired) {
      const t = setTimeout(() => setShowSynergy(true), 600);
      return () => clearTimeout(t);
    } else if (isNew) {
      setShowSynergy(false);
    }
  }, [isNew, card.synergyFired]);

  const isIncident = card.cardType === 'incident';
  const isGood = (card.totalValue || 0) > 0;
  const isBad = (card.totalValue || 0) < 0;

  return (
    <div
      className={`prod-card-new ${isNew ? 'card-enter' : ''} ${isIncident ? 'red-card' : ''} ${selectable ? 'selectable-card' : ''}`}
      onClick={onClick}
      style={selectable ? { cursor: 'pointer', border: '2px solid var(--gold)', boxShadow: '0 0 12px rgba(212,168,67,0.4)' } : {}}
    >
      <div className="prod-card-header">
        <SourceBadge type={card.sourceType} />
        <CardTypeBadge type={card.cardType} />
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
  const canDraw = !prod.isWrapped && prod.drawCount < maxDraws && deckSize > 0 && !prod.currentDraw && !prod.pendingChallenge;
  const canWrap = prod.drawCount > 0 && !prod.isWrapped && !isDrawing && !prod.currentDraw && !prod.pendingChallenge && !(prod.forceExtraDraw && prod.drawCount < maxDraws);
  const mustDraw = prod.forceExtraDraw && prod.drawCount < maxDraws && !prod.isDisaster;
  const drawsLeft = maxDraws - prod.drawCount;

  const { rawQuality, scriptBase, talentSkill, productionBonus, cleanWrapBonus, scriptAbilityBonus } = calculateQuality(state);

  const incidentInDeck = prod.deck.filter(c => c.cardType === 'incident').length;
  const actionInDeck = prod.deck.filter(c => c.cardType === 'action').length;
  const challengeInDeck = prod.deck.filter(c => c.cardType === 'challenge').length;

  const handleDraw = () => {
    setIsDrawing(true);
    setTimeout(() => {
      drawProductionCards();
      setIsDrawing(false);
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

      {/* Stats bar — compact 3-item layout */}
      <div className="production-stats-bar">
        <div className="prod-stat">
          <span className="label">Deck</span>
          <span className="value">
            <span style={{ color: '#2ecc71' }}>{actionInDeck}</span>
            {' / '}
            <span style={{ color: '#f1c40f' }}>{challengeInDeck}</span>
            {' / '}
            <span style={{ color: '#e74c3c' }}>{incidentInDeck}</span>
          </span>
        </div>
        <div className="prod-stat">
          <span className="label">Discard</span>
          <span className="value" style={{ color: '#888' }}>{prod.discarded.length}</span>
        </div>
        <div className="prod-stat">
          <span className="label">Quality</span>
          <span className="value" style={{ color: '#d4a843' }}>{rawQuality}</span>
        </div>
      </div>

      {/* Incident counter */}
      <div className="bad-counter">
        {[0, 1, 2].map(i => (
          <div key={i} className={`bad-pip ${i < prod.incidentCount ? 'filled' : ''} ${i < prod.incidentCount ? 'animate-shake' : ''}`}>
            {i < prod.incidentCount ? '💥' : '○'}
          </div>
        ))}
        <span className="bad-label">
          {prod.incidentCount >= 2 ? '⚠️ NEXT INCIDENT = DISASTER! (Lose ALL quality!)' : prod.incidentCount >= 1 ? '⚠️ Careful...' : prod.cleanWrap && prod.drawCount > 0 ? '✨ Clean Wrap active (+5 bonus)' : 'No Incidents yet'}
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

      {/* Draw-2-Pick-1 Choice UI */}
      {prod.currentDraw && prod.currentDraw.choosable.length >= 2 && !prod.pendingChallenge && (
        <div style={{ background: 'rgba(212,168,67,0.1)', border: '2px solid var(--gold)', borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center' }}>
          <h3 style={{ color: 'var(--gold)', marginBottom: 12, fontSize: '1rem' }}>🎬 CHOOSE ONE CARD</h3>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {prod.currentDraw.choosable.map((card, i) => (
              <div key={card.id} style={{ flex: '1 1 200px', maxWidth: 280 }}>
                <ProductionCardDisplay
                  card={card}
                  isNew={true}
                  selectable={true}
                  onClick={() => pickCard(i as 0 | 1)}
                />
              </div>
            ))}
          </div>
          <p style={{ color: '#888', fontSize: '0.75rem', marginTop: 8 }}>Tap a card to keep it. The other is discarded.</p>
        </div>
      )}

      {/* Challenge Bet Prompt */}
      {prod.pendingChallenge && prod.challengeBetActive && (
        <div style={{ background: 'rgba(241,196,15,0.15)', border: '2px solid #f1c40f', borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center' }}>
          <h3 style={{ color: '#f1c40f', marginBottom: 8, fontSize: '1rem' }}>⚡ CHALLENGE BET</h3>
          <p style={{ color: '#ccc', marginBottom: 8, fontSize: '0.9rem' }}>
            {prod.pendingChallenge.bet.description}
          </p>
          {prod.pendingChallenge.bet.oddsHint && (
            <p style={{ color: '#888', fontSize: '0.75rem', marginBottom: 12, fontStyle: 'italic' }}>
              💡 {prod.pendingChallenge.bet.oddsHint(
                { playedCards: prod.played, totalQuality: prod.qualityTotal, drawNumber: prod.drawCount, leadSkill: 0, redCount: prod.incidentCount, incidentCount: prod.incidentCount, previousCard: null, greenStreak: 0, remainingDeck: prod.deck, actionCardsPlayed: 0, challengeCardsPlayed: 0 }
              )}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 8 }}>
            <span style={{ color: '#2ecc71', fontWeight: 600 }}>Win: +{prod.pendingChallenge.bet.successBonus}</span>
            <span style={{ color: '#888' }}>|</span>
            <span style={{ color: '#e74c3c', fontWeight: 600 }}>Lose: {prod.pendingChallenge.bet.failPenalty}</span>
          </div>
          <div className="btn-group" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => resolveChallengeBet(true)}>
              🎲 TAKE THE BET
            </button>
            <button className="btn" onClick={() => resolveChallengeBet(false)}>
              🚫 DECLINE (keep base value)
            </button>
          </div>
        </div>
      )}

      {/* Played cards */}
      <div className="production-deck" ref={scrollRef}>
        {prod.played.map((card) => (
          <ProductionCardDisplay
            key={card.id}
            card={card}
            isNew={card.id === lastDrawn}
          />
        ))}
      </div>

      {/* Disaster banner */}
      {prod.isDisaster && (
        <div className="disaster-banner animate-shake">
          <h3>💥 DISASTER!</h3>
          <p>3 Incidents! ALL production quality lost!</p>
        </div>
      )}

      {mustDraw && !prod.isDisaster && (
        <div style={{ color: '#e74c3c', fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>
          ⚠️ "Perfection Paralysis" — You MUST draw at least one more card!
        </div>
      )}

      {/* Actions */}
      <div className="btn-group">
        {canDraw && !isDrawing && (
          <button className="btn btn-primary btn-glow" onClick={handleDraw}>
            🎬 {prod.drawCount === 0 ? 'DRAW FIRST CARDS' : `DRAW 2 (${prod.drawCount}/${maxDraws} draws)`}
          </button>
        )}
        {canWrap && !mustDraw && (
          <button className="btn" onClick={wrapProduction}>
            ✂️ WRAP — Call "CUT!"
          </button>
        )}
        {state.hasReshoots && !state.reshootsUsed && prod.played.length > 0 && !prod.isWrapped && !isDrawing && !prod.currentDraw && !prod.pendingChallenge && (
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
