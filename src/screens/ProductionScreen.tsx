import { useState, useEffect, useRef } from 'react';
import { GameState, ProductionCard } from '../types';
import { drawProductionCards, pickCard, resolveChallengeBet, resolveBlock, wrapProduction, resolveRelease, useReshoots, calculateQuality, getMaxDraws, activateDirectorsCut, confirmDirectorsCut, cancelDirectorsCut } from '../gameStore';
import { getSeasonTarget, getActiveChemistry } from '../data';

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
  const [showDiscard, setShowDiscard] = useState(false);
  const [dcOrder, setDcOrder] = useState<number[]>([0, 1, 2]);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!prod) return null;

  const deckSize = prod.deck.length;
  const maxDraws = getMaxDraws(prod);
  const canDraw = !prod.isWrapped && prod.drawCount < maxDraws && deckSize > 0 && !prod.currentDraw && !prod.pendingChallenge && !prod.pendingBlock;
  const canWrap = prod.drawCount > 0 && !prod.isWrapped && !isDrawing && !prod.currentDraw && !prod.pendingChallenge && !prod.pendingBlock && !(prod.forceExtraDraw && prod.drawCount < maxDraws);
  const mustDraw = prod.forceExtraDraw && prod.drawCount < maxDraws && !prod.isDisaster;
  const drawsLeft = maxDraws - prod.drawCount;

  const { rawQuality, scriptBase, talentSkill, productionBonus, cleanWrapBonus, scriptAbilityBonus, genreMasteryBonus, chemistryBonus } = calculateQuality(state);

  // Chemistry display
  const castNames = state.castSlots.map(s => s.talent?.name).filter(Boolean) as string[];
  const activeChemistry = getActiveChemistry(castNames);

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

      {/* Movie quality meter — shows progress toward target */}
      {(() => {
        const target = getSeasonTarget(state.season);
        const neededQuality = Math.ceil(target / 1.2); // rough estimate
        const progress = Math.min(rawQuality / neededQuality, 1.5);
        const progressColor = progress >= 1.25 ? '#2ecc71' : progress >= 1.0 ? '#f1c40f' : progress >= 0.7 ? '#e67e22' : '#e74c3c';
        const meterLabel = progress >= 1.25 ? '🔥 SMASH!' : progress >= 1.0 ? '✅ On Target' : progress >= 0.7 ? '⚠️ Needs More' : '🚨 Danger Zone';
        return (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
              <span style={{ color: '#888' }}>Quality: <strong style={{ color: '#d4a843' }}>{rawQuality}</strong> / ~{neededQuality} needed</span>
              <span style={{ color: progressColor, fontWeight: 600 }}>{meterLabel}</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
              <div style={{ 
                width: `${Math.min(progress * 100, 100)}%`, 
                height: '100%', 
                background: progressColor, 
                borderRadius: 6, 
                transition: 'width 0.5s ease, background 0.5s ease' 
              }} />
            </div>
          </div>
        );
      })()}

      {/* Stats bar — compact layout */}
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
          <span className="label">Draws</span>
          <span className="value">{prod.drawCount}/{maxDraws}</span>
        </div>
        <div className="prod-stat">
          <span className="label">Discard</span>
          <span className="value" style={{ color: '#888' }}>{prod.discarded.length}</span>
        </div>
      </div>

      {/* Deck forecast — shows what's left */}
      {deckSize > 0 && !prod.isWrapped && (
        <div style={{ 
          background: 'rgba(255,255,255,0.03)', 
          borderRadius: 8, 
          padding: '8px 16px', 
          marginBottom: 12, 
          display: 'flex', 
          gap: 12, 
          alignItems: 'center', 
          justifyContent: 'center',
          flexWrap: 'wrap',
          fontSize: '0.8rem' 
        }}>
          <span style={{ color: '#888' }}>📊 Remaining:</span>
          <span style={{ color: '#2ecc71' }}>
            {actionInDeck} Action ({deckSize > 0 ? Math.round(actionInDeck/deckSize*100) : 0}%)
          </span>
          <span style={{ color: '#f1c40f' }}>
            {challengeInDeck} Challenge ({deckSize > 0 ? Math.round(challengeInDeck/deckSize*100) : 0}%)
          </span>
          <span style={{ color: '#e74c3c' }}>
            {incidentInDeck} Incident ({deckSize > 0 ? Math.round(incidentInDeck/deckSize*100) : 0}%)
          </span>
          {incidentInDeck >= 2 && prod.incidentCount >= 1 && (
            <span style={{ color: '#e74c3c', fontWeight: 600 }}>⚠️ Disaster risk!</span>
          )}
        </div>
      )}

      {/* Incident counter */}
      <div className="bad-counter">
        {[0, 1, 2].map(i => (
          <div key={i} className={`bad-pip ${i < prod.incidentCount ? 'filled' : ''} ${i < prod.incidentCount ? 'animate-shake' : ''}`}>
            {i < prod.incidentCount ? '💥' : '○'}
          </div>
        ))}
        <span className="bad-label">
          {prod.incidentCount >= 2 ? '⚠️ NEXT INCIDENT = DISASTER! (Lose ALL quality!)' : prod.incidentCount >= 1 ? '⚠️ Careful — one more and you\'re on the edge...' : prod.cleanWrap && prod.drawCount > 0 ? `✨ Clean Wrap active (+${state.studioArchetype === 'prestige' ? 8 : 5} bonus quality!)` : 'No Incidents yet'}
        </span>
      </div>

      {/* Quality breakdown */}
      <div className="quality-breakdown">
        <span className="qb-item">📜 Script: {scriptBase}</span>
        <span className="qb-item">🎭 Talent: +{talentSkill}</span>
        <span className="qb-item" style={{ color: productionBonus >= 0 ? '#2ecc71' : '#e74c3c' }}>🎬 Production: {productionBonus >= 0 ? '+' : ''}{productionBonus}</span>
        {cleanWrapBonus > 0 && <span className="qb-item" style={{ color: '#d4a843' }}>✨ Clean Wrap: +{cleanWrapBonus}</span>}
        {scriptAbilityBonus > 0 && <span className="qb-item" style={{ color: '#9b59b6' }}>⭐ Ability: +{scriptAbilityBonus}</span>}
        {genreMasteryBonus > 0 && <span className="qb-item" style={{ color: '#2ecc71' }}>🎓 Genre Mastery: +{genreMasteryBonus}</span>}
        {chemistryBonus > 0 && <span className="qb-item" style={{ color: '#e91e63' }}>💕 Chemistry: +{chemistryBonus}</span>}
        <span className="qb-item" style={{ color: rawQuality >= getSeasonTarget(state.season) / 1.5 ? '#2ecc71' : rawQuality >= getSeasonTarget(state.season) / 2.5 ? '#f1c40f' : '#e74c3c' }}>
          🎯 Need ~{Math.ceil(getSeasonTarget(state.season) / 1.2)} quality
        </span>
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
            {prod.currentDraw.choosable.map((card, i) => {
              // Preview what synergy would fire for each choice
              const wouldFire = card.synergyCondition ? (() => {
                const ctx = {
                  playedCards: prod.played,
                  totalQuality: prod.qualityTotal,
                  drawNumber: prod.drawCount,
                  leadSkill: state.castSlots.find(s => s.slotType === 'Lead')?.talent?.skill || 0,
                  redCount: prod.incidentCount,
                  incidentCount: prod.incidentCount,
                  previousCard: prod.played.length > 0 ? prod.played[prod.played.length - 1] : null,
                  greenStreak: 0,
                  remainingDeck: prod.deck,
                  actionCardsPlayed: prod.played.filter(c => c.cardType === 'action').length,
                  challengeCardsPlayed: prod.played.filter(c => c.cardType === 'challenge').length,
                };
                const result = card.synergyCondition!(ctx);
                return result.bonus !== 0 ? `Will fire: +${result.bonus}` : null;
              })() : null;
              
              return (
                <div key={card.id} style={{ flex: '1 1 200px', maxWidth: 280 }}>
                  <ProductionCardDisplay
                    card={card}
                    isNew={true}
                    selectable={true}
                    onClick={() => pickCard(i as 0 | 1)}
                  />
                  {wouldFire && (
                    <div style={{ color: '#2ecc71', fontSize: '0.75rem', fontWeight: 600, marginTop: 4 }}>
                      ✨ {wouldFire}
                    </div>
                  )}
                </div>
              );
            })}
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

      {/* Block Choice UI */}
      {prod.pendingBlock && (
        <div style={{ background: 'rgba(231,76,60,0.1)', border: '2px solid #e74c3c', borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center' }}>
          <h3 style={{ color: '#e74c3c', marginBottom: 8, fontSize: '1rem' }}>🛡️ INCIDENT INCOMING!</h3>
          <p style={{ color: '#ccc', marginBottom: 12, fontSize: '0.9rem' }}>
            <strong style={{ color: '#e74c3c' }}>{prod.pendingBlock.incident.name}</strong> ({prod.pendingBlock.incident.baseQuality}) was drawn alongside <strong style={{ color: '#2ecc71' }}>{prod.pendingBlock.actionCard.name}</strong>.
          </p>
          <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: 12 }}>
            Sacrifice your Action card to block the Incident? Both cards are discarded.
          </p>
          <div className="btn-group" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => resolveBlock(false)} style={{ background: 'rgba(46,204,113,0.2)', borderColor: '#2ecc71', color: '#2ecc71' }}>
              🎬 KEEP BOTH (Incident fires, keep Action)
            </button>
            <button className="btn" onClick={() => resolveBlock(true)} style={{ background: 'rgba(231,76,60,0.2)', borderColor: '#e74c3c', color: '#e74c3c' }}>
              🛡️ BLOCK (Sacrifice Action, discard Incident)
            </button>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 180px', maxWidth: 250 }}>
              <ProductionCardDisplay card={prod.pendingBlock.incident} isNew={true} />
            </div>
            <div style={{ flex: '1 1 180px', maxWidth: 250 }}>
              <ProductionCardDisplay card={prod.pendingBlock.actionCard} isNew={true} />
            </div>
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

      {/* Discard pile */}
      {prod.discarded.length > 0 && (
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <button className="btn-tiny" onClick={() => setShowDiscard(!showDiscard)}>
            🗑️ Discarded ({prod.discarded.length}) {showDiscard ? '▲' : '▼'}
          </button>
          {showDiscard && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8, opacity: 0.6 }}>
              {prod.discarded.map(card => (
                <div key={card.id} style={{
                  background: 'var(--dark2)',
                  border: '1px solid var(--dark3)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                }}>
                  <span style={{ color: '#888' }}>{card.name}</span>
                  <span style={{ marginLeft: 4, color: card.baseQuality >= 0 ? '#2ecc71' : '#e74c3c' }}>
                    {card.baseQuality >= 0 ? '+' : ''}{card.baseQuality}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Disaster banner */}
      {prod.isDisaster && (
        <div className="disaster-banner animate-shake">
          <h3>💥 DISASTER!</h3>
          <p>3 Incidents! ALL production quality lost!</p>
        </div>
      )}

      {/* Chemistry banner */}
      {activeChemistry.length > 0 && prod.drawCount === 0 && (
        <div style={{ background: 'rgba(233,30,99,0.1)', border: '1px solid #e91e63', borderRadius: 8, padding: '8px 16px', marginBottom: 12, textAlign: 'center' }}>
          {activeChemistry.map((c, i) => (
            <div key={i} style={{ color: '#e91e63', fontSize: '0.85rem' }}>
              💕 <strong>{c.name}</strong>: {c.description}
            </div>
          ))}
        </div>
      )}

      {/* Director's Cut UI */}
      {prod.directorsCutActive && prod.directorsCutCards.length > 0 && (
        <div style={{ background: 'rgba(155,89,182,0.15)', border: '2px solid #9b59b6', borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center' }}>
          <h3 style={{ color: '#9b59b6', marginBottom: 8, fontSize: '1rem' }}>🎬 DIRECTOR'S CUT</h3>
          <p style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: 12 }}>Rearrange the top {prod.directorsCutCards.length} cards. Tap cards to swap positions.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            {dcOrder.slice(0, prod.directorsCutCards.length).map((cardIdx, pos) => {
              const card = prod.directorsCutCards[cardIdx];
              return (
                <div key={pos} onClick={() => {
                  // Rotate: move clicked card to front, shift others
                  const newOrder = [...dcOrder];
                  const clicked = newOrder.splice(pos, 1)[0];
                  newOrder.unshift(clicked);
                  setDcOrder(newOrder);
                }} style={{ cursor: 'pointer', opacity: 1, minWidth: 120 }}>
                  <div style={{ color: '#9b59b6', fontSize: '0.65rem', fontWeight: 600, marginBottom: 2 }}>#{pos + 1}</div>
                  <ProductionCardDisplay card={card} isNew={false} selectable />
                </div>
              );
            })}
          </div>
          <div className="btn-group" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => {
              confirmDirectorsCut(dcOrder.slice(0, prod.directorsCutCards.length));
            }}>✅ CONFIRM ORDER</button>
            <button className="btn" onClick={() => cancelDirectorsCut()}>❌ CANCEL</button>
          </div>
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
        {!prod.directorsCutUsed && !prod.directorsCutActive && !prod.isWrapped && !isDrawing && !prod.currentDraw && !prod.pendingChallenge && prod.deck.length >= 2 && prod.drawCount > 0 && (
          <button className="btn btn-small" onClick={() => { setDcOrder([0, 1, 2]); activateDirectorsCut(); }} style={{ background: 'rgba(155,89,182,0.2)', borderColor: '#9b59b6', color: '#9b59b6' }}>
            🎬 DIRECTOR'S CUT
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
