import { useState, useEffect, useRef } from 'react';
import { GameState, ProductionCard } from '../types';
import { drawProductionCards, pickCard, resolveChallengeBet, resolveBlock, wrapProduction, resolveRelease, useReshoots, calculateQuality, calculateArchetypeFocus, getMaxDraws, activateDirectorsCut, confirmDirectorsCut, attemptEncore, declineEncore, getState } from '../gameStore';
import { getSeasonTarget, getActiveChemistry } from '../data';
import { sfx } from '../sound';
import { getCardBackColor } from '../achievements';
import { CardTypeBadge } from '../components/CardComponents';
import PhaseTip from '../components/PhaseTip';
import StatTooltip from '../components/StatTooltip';

// Auto-advance component: shows a button with a filling progress bar, auto-clicks after delay
function AutoAdvance({ onAdvance, delayMs, label }: { onAdvance: () => void; delayMs: number; label: string }) {
  const [progress, setProgress] = useState(0);
  const called = useRef(false);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(elapsed / delayMs, 1);
      setProgress(p);
      if (p >= 1 && !called.current) {
        called.current = true;
        onAdvance();
      } else if (p < 1) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }, [onAdvance, delayMs]);
  return (
    <button className="btn btn-primary btn-glow" onClick={() => { if (!called.current) { called.current = true; onAdvance(); } }}
      style={{ position: 'relative', overflow: 'hidden' }}>
      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress * 100}%`, background: 'rgba(255,255,255,0.15)', transition: 'width 0.1s linear' }} />
      <span style={{ position: 'relative' }}>{label}</span>
    </button>
  );
}

// Narrative flavor text based on production state
function getProductionNarrative(drawCount: number, incidentCount: number, qualityTotal: number, cleanWrap: boolean, isDisaster: boolean, lastCard?: ProductionCard | null): string {
  if (isDisaster) return '';
  if (drawCount === 0) return '"Quiet on set... and... ACTION!" 🎬';
  if (lastCard?.cardType === 'incident' && incidentCount === 2) return '⚠️ The studio execs are getting nervous...';
  if (lastCard?.cardType === 'incident' && incidentCount === 1) return 'A setback on set, but the show must go on...';
  if (lastCard?.synergyFired && (lastCard?.synergyBonus || 0) >= 4) return '✨ Magic is happening on set!';
  if (lastCard?.synergyFired) return 'The pieces are coming together...';
  if (cleanWrap && drawCount >= 4 && qualityTotal > 10) return '🌟 Clean wrap — the crew is in the zone!';
  if (drawCount === 1) return 'Cameras are rolling...';
  if (drawCount === 2) return 'The production is finding its rhythm...';
  if (qualityTotal > 20) return '🔥 This could be something special...';
  if (qualityTotal > 10) return 'Looking good so far...';
  if (qualityTotal < 0) return 'It\'s rough out there. Keep pushing...';
  return '';
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

function ProductionCardDisplay({ card, isNew, onClick, selectable, className }: { card: ProductionCard; isNew: boolean; onClick?: () => void; selectable?: boolean; className?: string }) {
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
      className={`prod-card-new ${isNew ? 'card-enter' : ''} ${isIncident ? 'red-card' : ''} ${selectable ? 'selectable-card' : ''} ${card.synergyFired && showSynergy ? 'synergy-active' : ''} ${className || ''}`}
      onClick={onClick}
      onKeyDown={e => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
      onMouseEnter={selectable ? () => sfx.cardHover() : undefined}
      tabIndex={selectable ? 0 : undefined}
      role={selectable ? 'button' : undefined}
      aria-label={`${card.name}, ${card.cardType}, quality ${card.baseQuality >= 0 ? '+' : ''}${card.baseQuality}${card.synergyText ? ', ' + card.synergyText : ''}`}
      style={selectable ? { cursor: 'pointer', border: '2px solid var(--gold)', boxShadow: '0 0 12px rgba(212,168,67,0.4)' } : {}}
    >
      <div className="prod-card-header">
        <SourceBadge type={card.sourceType} />
        <CardTypeBadge type={card.cardType} />
      </div>
      <div className="prod-card-name">{card.name}</div>
      <div className="prod-card-source">{card.source}</div>
      {card.tags && card.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 2 }}>
          {[...new Set(card.tags)].map((tag, i) => {
            const tagConfig: Record<string, { emoji: string; color: string }> = {
              momentum: { emoji: '🔥', color: '#e67e22' },
              precision: { emoji: '🎯', color: '#3498db' },
              chaos: { emoji: '💀', color: '#9b59b6' },
              heart: { emoji: '💕', color: '#e91e63' },
              spectacle: { emoji: '✨', color: '#f1c40f' },
            };
            const tc = tagConfig[tag] || { emoji: '•', color: '#888' };
            const count = card.tags!.filter(t => t === tag).length;
            return (
              <span key={i} style={{ fontSize: '0.55rem', color: tc.color, fontWeight: 600 }}>
                {tc.emoji}{tag.toUpperCase()}{count > 1 ? ` ×${count}` : ''}
              </span>
            );
          })}
        </div>
      )}
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
  const [combo, setCombo] = useState(0);
  const [comboVisible, setComboVisible] = useState(false);
  const [qualityPunch, setQualityPunch] = useState(false);
  const [disasterShake, setDisasterShake] = useState(false);
  const [pickedCardId, setPickedCardId] = useState<string | null>(null);
  const [rejectedCardId, setRejectedCardId] = useState<string | null>(null);
  const prevPlayedCount = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!prod) return null;

  const deckSize = prod.deck.length;
  const maxDraws = getMaxDraws(prod);
  const canDraw = !prod.isWrapped && prod.drawCount < maxDraws && deckSize > 0 && !prod.currentDraw && !prod.pendingChallenge && !prod.pendingBlock;
  const canWrap = prod.drawCount > 0 && !prod.isWrapped && !isDrawing && !prod.currentDraw && !prod.pendingChallenge && !prod.pendingBlock && !(prod.forceExtraDraw && prod.drawCount < maxDraws);
  const mustDraw = prod.forceExtraDraw && prod.drawCount < maxDraws && !prod.isDisaster;
  const { rawQuality, scriptBase, talentSkill, productionBonus, cleanWrapBonus, scriptAbilityBonus, genreMasteryBonus, chemistryBonus, archetypeFocusBonus } = calculateQuality(state);

  // Chemistry display
  const castNames = state.castSlots.map(s => s.talent?.name).filter(Boolean) as string[];
  const activeChemistry = getActiveChemistry(castNames);

  // Deck composition hidden from player to make Encore a real gamble

  const handleDraw = () => {
    sfx.cardFlip();
    setIsDrawing(true);
    setPickedCardId(null);
    setRejectedCardId(null);
    setTimeout(() => {
      drawProductionCards();
      setIsDrawing(false);
      setTimeout(() => scrollRef.current?.scrollTo({ left: scrollRef.current.scrollWidth, behavior: 'smooth' }), 50);
    }, 550);
  };
  
  const handlePick = (idx: 0 | 1) => {
    if (!prod?.currentDraw) return;
    const chosen = prod.currentDraw.choosable[idx];
    const rejected = prod.currentDraw.choosable[idx === 0 ? 1 : 0];
    setPickedCardId(chosen.id);
    setRejectedCardId(rejected?.id || null);
    sfx.cardPick();
    if (rejected) setTimeout(() => sfx.cardDiscard(), 150);
    // Delay actual pick to let animation play
    setTimeout(() => {
      pickCard(idx);
      setPickedCardId(null);
      setRejectedCardId(null);
    }, 350);
  };
  
  const handleWrap = () => {
    sfx.wrap();
    wrapProduction();
    // Play clean wrap chime after state updates (check next tick)
    setTimeout(() => {
      const s = getState();
      if (s.production?.cleanWrap && !s.production?.isDisaster) sfx.wrap();
    }, 300);
  };
  
  const handleBlock = (block: boolean) => {
    if (block) sfx.block(); else sfx.cardFlip();
    resolveBlock(block);
  };
  
  const handleBet = (accept: boolean) => {
    if (accept) sfx.challenge(); else sfx.click();
    resolveChallengeBet(accept);
  };

  // Track combo and trigger sounds when new cards are played
  useEffect(() => {
    if (!prod) return;
    const count = prod.played.length;
    if (count > prevPlayedCount.current && count > 0) {
      const newCard = prod.played[count - 1];
      setLastDrawn(newCard.id);
      
      // Sound effects based on card type
      if (newCard.cardType === 'incident') {
        sfx.incident();
        setCombo(0);
        setComboVisible(false);
      } else if (newCard.synergyFired) {
        setCombo(prev => {
          const newCombo = prev + 1;
          sfx.combo(newCombo);
          return newCombo;
        });
        setComboVisible(true);
        // Hide combo after 2s of no activity
        setTimeout(() => setComboVisible(false), 2500);
      } else {
        sfx.cardFlip();
        setCombo(0);
      }
      
      // Quality punch animation
      setQualityPunch(true);
      setTimeout(() => setQualityPunch(false), 300);
      
      // Disaster sound + shake
      if (prod.isDisaster) {
        setTimeout(() => sfx.disaster(), 200);
        setDisasterShake(true);
        setTimeout(() => setDisasterShake(false), 700);
      }
    }
    prevPlayedCount.current = count;
  }, [prod?.played.length]);

  return (
    <div className={`production-area fade-in ${disasterShake ? 'disaster-shake' : ''}`}>
      <PhaseTip phase="production" />
      <div className="phase-title">
        <h2>🎥 Production</h2>
        <div className="subtitle">
          "{state.currentScript?.title}" — {state.currentScript?.genre}
        </div>
      </div>

      {/* Movie quality meter — shows progress toward target */}
      {(() => {
        const target = getSeasonTarget(state.season, state.gameMode, state.challengeId, state.dailyModifierId, state.dailyModifierId2);
        // Estimate needed quality based on available market multipliers and rep
        const repBonus = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5][state.reputation] || 1.0;
        const bestMarketMult = Math.max(...state.marketConditions.map(m => m.multiplier), 1.0);
        const estimatedMult = Math.max(bestMarketMult * repBonus, 0.5);
        const neededQuality = Math.ceil(target / estimatedMult);
        const progress = Math.min(rawQuality / neededQuality, 1.5);
        const progressColor = progress >= 1.25 ? '#2ecc71' : progress >= 1.0 ? '#f1c40f' : progress >= 0.7 ? '#e67e22' : '#e74c3c';
        const meterLabel = progress >= 1.25 ? '🔥 SMASH!' : progress >= 1.0 ? '✅ On Target' : progress >= 0.7 ? '⚠️ Needs More' : '🚨 Danger Zone';
        return (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
              <span style={{ color: '#888' }}>Quality: <strong className={qualityPunch ? 'quality-punch' : ''} style={{ color: '#d4a843', display: 'inline-block' }}>{rawQuality}</strong> / ~{neededQuality} needed</span>
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
          <span className="label">Draws</span>
          <span className="value">{prod.drawCount}/{maxDraws}</span>
        </div>
        <div className="prod-stat">
          <span className="label">Incidents</span>
          <span className="value" style={{ color: prod.incidentCount >= 2 ? '#e74c3c' : '#888' }}>{prod.incidentCount}/{state.studioArchetype === 'chaos' ? 4 : 3}</span>
        </div>
      </div>

      {/* Tag tracker */}
      {prod.tagsPlayed && Object.keys(prod.tagsPlayed).length > 0 && (
        <div style={{ 
          display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 8, 
          background: 'rgba(255,255,255,0.02)', borderRadius: 6, padding: '4px 12px',
          fontSize: '0.75rem', flexWrap: 'wrap'
        }}>
          {Object.entries(prod.tagsPlayed).sort((a, b) => b[1] - a[1]).map(([tag, count]) => {
            const tc: Record<string, { emoji: string; color: string }> = {
              momentum: { emoji: '🔥', color: '#e67e22' },
              precision: { emoji: '🎯', color: '#3498db' },
              chaos: { emoji: '💀', color: '#9b59b6' },
              heart: { emoji: '💕', color: '#e91e63' },
              spectacle: { emoji: '✨', color: '#f1c40f' },
            };
            const cfg = tc[tag] || { emoji: '•', color: '#888' };
            return (
              <span key={tag} className={count >= 3 ? 'tag-milestone' : ''} style={{ color: cfg.color, fontWeight: count >= 3 ? 700 : 400 }}>
                {cfg.emoji} {tag}: {count}{count >= 3 ? ' ⚡' : count >= 2 ? ' ↗' : ''}
              </span>
            );
          })}
        </div>
      )}

      {/* Archetype Focus indicator */}
      {(() => {
        const focus = calculateArchetypeFocus(prod.tagsPlayed || {});
        if (!focus) return null;
        const focusColors: Record<string, string> = {
          momentum: '#e67e22', precision: '#3498db', chaos: '#9b59b6',
          heart: '#e91e63', spectacle: '#f1c40f',
        };
        const color = focusColors[focus.tag] || '#d4a843';
        return (
          <div style={{
            background: `${color}15`,
            border: `2px solid ${color}`,
            borderRadius: 8,
            padding: '6px 16px',
            marginBottom: 8,
            textAlign: 'center',
            animation: 'comboAppear 0.3s ease',
          }}>
            <span style={{ color, fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.05em' }}>
              {focus.label} ({focus.percentage}%) — +{focus.bonus} Quality
            </span>
            <span style={{ color: '#888', fontSize: '0.7rem', marginLeft: 8 }}>
              Specialization rewarded!
            </span>
          </div>
        );
      })()}

      {/* Combo counter */}
      {comboVisible && combo >= 2 && (
        <div className={`combo-counter combo-${Math.min(combo, 5)}`} key={combo}>
          <span className="combo-number">{combo}×</span>
          <span className="combo-label">
            {combo >= 5 ? 'LEGENDARY!' : combo >= 4 ? 'ON FIRE!' : combo >= 3 ? 'COMBO!' : 'NICE!'}
          </span>
        </div>
      )}

      {/* Deck remaining count (simplified — no composition breakdown) */}
      {deckSize > 0 && !prod.isWrapped && (
        <div style={{ 
          background: 'rgba(255,255,255,0.03)', 
          borderRadius: 8, 
          padding: '6px 16px', 
          marginBottom: 12, 
          textAlign: 'center',
          fontSize: '0.8rem',
          color: '#888',
        }}>
          📦 {deckSize} cards remaining in deck <StatTooltip tip="When the deck runs out, production wraps automatically. Plan your draws!" />
          {prod.incidentCount >= 2 && (
            <span style={{ color: '#e74c3c', fontWeight: 600, marginLeft: 8 }}>⚠️ Disaster risk!</span>
          )}
        </div>
      )}

      {/* Incident counter */}
      {(() => {
        const disasterThreshold = state.studioArchetype === 'chaos' ? 4 : 3;
        const nearDisaster = prod.incidentCount >= disasterThreshold - 1;
        return (
          <div className="bad-counter">
            {Array.from({ length: disasterThreshold }, (_, i) => (
              <div key={i} className={`bad-pip ${i < prod.incidentCount ? 'filled' : ''} ${i < prod.incidentCount ? 'animate-shake' : ''}`}>
                {i < prod.incidentCount ? '💥' : '○'}
              </div>
            ))}
            <span className="bad-label">
              {nearDisaster && prod.incidentCount < disasterThreshold ? '⚠️ NEXT INCIDENT = DISASTER! (Lose ALL quality!)' : prod.incidentCount >= 1 && !nearDisaster ? '⚠️ Careful — incidents are piling up...' : prod.cleanWrap && prod.drawCount > 0 ? <span className="clean-wrap-badge">✨ Clean Wrap active (+{state.studioArchetype === 'prestige' ? 7 : 5} bonus quality!) <StatTooltip tip="Finish production with zero incidents to keep the Clean Wrap bonus. Any incident breaks it." /></span> : 'No Incidents yet'}
            </span>
          </div>
        );
      })()}

      {/* Quality breakdown */}
      <div className="quality-breakdown">
        <span className="qb-item">📜 Script: {scriptBase}</span>
        <span className="qb-item">🎭 Talent: +{talentSkill}</span>
        <span className="qb-item" style={{ color: productionBonus >= 0 ? '#2ecc71' : '#e74c3c' }}>🎬 Production: {productionBonus >= 0 ? '+' : ''}{productionBonus}</span>
        {cleanWrapBonus > 0 && <span className="qb-item" style={{ color: '#d4a843' }}>✨ Clean Wrap: +{cleanWrapBonus}</span>}
        {scriptAbilityBonus > 0 && <span className="qb-item" style={{ color: '#9b59b6' }}>⭐ Ability: +{scriptAbilityBonus}</span>}
        {genreMasteryBonus > 0 && <span className="qb-item" style={{ color: '#2ecc71' }}>🎓 Genre Mastery: +{genreMasteryBonus}</span>}
        {chemistryBonus > 0 && <span className="qb-item" style={{ color: '#e91e63' }}>💕 Chemistry: +{chemistryBonus}</span>}
        {archetypeFocusBonus > 0 && <span className="qb-item" style={{ color: '#d4a843' }}>⚡ Focus: +{archetypeFocusBonus}</span>}
      </div>

      {prod.budgetChange !== 0 && (
        <div style={{ color: prod.budgetChange > 0 ? '#2ecc71' : '#e74c3c', fontSize: '0.85rem', marginBottom: 8 }}>
          💰 Budget impact: {prod.budgetChange > 0 ? '+' : ''}${prod.budgetChange}M
        </div>
      )}

      {/* Production narrative */}
      <div className="prod-narrative" key={prod.drawCount}>
        {getProductionNarrative(prod.drawCount, prod.incidentCount, prod.qualityTotal, prod.cleanWrap, prod.isDisaster, prod.played.length > 0 ? prod.played[prod.played.length - 1] : null)}
      </div>

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
          </div>
        </div>
      )}

      {mustDraw && !prod.isDisaster && (
        <div style={{ color: '#e74c3c', fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>
          ⚠️ "Perfection Paralysis" — You MUST draw at least one more card!
        </div>
      )}

      {/* Disaster banner */}
      {prod.isDisaster && (
        <div className="disaster-banner">
          <h3 style={{ fontSize: '2.5rem', marginBottom: 8 }}>💥 DISASTER! 💥</h3>
          <p style={{ fontSize: '1rem' }}>3 Incidents! ALL production quality lost!</p>
          <p style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: 8, opacity: 0.8 }}>The studio insurance department is on the phone...</p>
        </div>
      )}

      {/* Drawing animation */}
      {isDrawing && (
        <div className="draw-animation">
          <div className="card-back" style={getCardBackColor() ? { filter: `drop-shadow(0 0 15px ${getCardBackColor()})` } : {}}>🎬</div>
          <div className="card-back" style={getCardBackColor() ? { filter: `drop-shadow(0 0 15px ${getCardBackColor()})` } : {}}>🎬</div>
        </div>
      )}

      {/* Draw-2-Pick-1 Choice UI */}
      {prod.currentDraw && prod.currentDraw.choosable.length >= 2 && !prod.pendingChallenge && (
        <div className="choice-area" style={{ textAlign: 'center' }}>
          <h3 style={{ color: 'var(--gold)', marginBottom: 16, fontSize: '1.4rem', fontFamily: 'Bebas Neue', letterSpacing: '0.12em', position: 'relative', zIndex: 2 }}>🎬 CHOOSE YOUR CARD</h3>
          <div className="choice-vs">VS</div>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
            {prod.currentDraw.choosable.map((card, i) => {
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
                  tagsPlayed: prod.tagsPlayed || {},
                  discardedCount: prod.discarded.length,
                  consecutiveSources: 0,
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
                    className={card.id === pickedCardId ? 'card-slam' : card.id === rejectedCardId ? 'card-shatter' : ''}
                    onClick={() => handlePick(i as 0 | 1)}
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
                { playedCards: prod.played, totalQuality: prod.qualityTotal, drawNumber: prod.drawCount, leadSkill: 0, redCount: prod.incidentCount, incidentCount: prod.incidentCount, previousCard: null, greenStreak: 0, remainingDeck: prod.deck, actionCardsPlayed: 0, challengeCardsPlayed: 0, tagsPlayed: prod.tagsPlayed || {}, discardedCount: prod.discarded.length, consecutiveSources: 0 }
              )}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 8 }}>
            <span style={{ color: '#2ecc71', fontWeight: 600 }}>Win: +{prod.pendingChallenge.bet.successBonus}</span>
            <span style={{ color: '#888' }}>|</span>
            <span style={{ color: '#e74c3c', fontWeight: 600 }}>Lose: {prod.pendingChallenge.bet.failPenalty}</span>
          </div>
          <div className="btn-group" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => handleBet(true)}>
              🎲 TAKE THE BET
            </button>
            <button className="btn" onClick={() => handleBet(false)}>
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
            Sacrifice your Action card to block the Incident? Both cards are discarded. <strong style={{ color: '#e74c3c' }}>Costs 3 quality.</strong>
          </p>
          <div className="btn-group" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => handleBlock(false)} style={{ background: 'rgba(46,204,113,0.2)', borderColor: '#2ecc71', color: '#2ecc71' }}>
              🎬 KEEP BOTH (Incident fires, keep Action)
            </button>
            <button className="btn" onClick={() => handleBlock(true)} style={{ background: 'rgba(231,76,60,0.2)', borderColor: '#e74c3c', color: '#e74c3c' }}>
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

      {/* Actions — at top, before played cards */}
      <div className="btn-group sticky-action-bar">
        {canDraw && !isDrawing && (
          <button className={`btn btn-primary btn-glow ${prod.incidentCount >= 2 ? 'btn-draw-dramatic' : ''}`} onClick={handleDraw}
            style={prod.drawCount === 0 ? { fontSize: '1.3rem', padding: '14px 36px' } : undefined}>
            🎬 {prod.drawCount === 0 ? 'ACTION! — DRAW FIRST CARDS' : `DRAW 2 (${prod.drawCount}/${maxDraws} draws)`}
          </button>
        )}
        {canWrap && !mustDraw && (
          <button className="btn" onClick={handleWrap}>
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
        {/* Encore: Push Your Luck after wrapping */}
        {prod.isWrapped && !prod.isDisaster && prod.encoreState?.available && !prod.encoreState.used && (
          <div style={{
            background: 'rgba(212,168,67,0.1)',
            border: '2px solid var(--gold)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            textAlign: 'center',
          }}>
            <h3 style={{ color: 'var(--gold)', marginBottom: 8, fontSize: '1rem' }}>🎬 ENCORE?</h3>
            <p style={{ color: '#ccc', fontSize: '0.85rem', marginBottom: 4 }}>
              Draw one more card for a <strong style={{ color: '#2ecc71' }}>+3 bonus</strong> on top of its value.
            </p>
            <p style={{ color: '#e74c3c', fontSize: '0.75rem', marginBottom: 12 }}>
              ⚠️ But if it's an Incident: <strong>-3 extra penalty</strong> and lose Clean Wrap!
            </p>
            <p style={{ color: '#888', fontSize: '0.7rem', marginBottom: 12 }}>
              🎲 {prod.deck.length} cards remain. Do you feel lucky?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => { sfx.challenge(); attemptEncore(); }}>
                🎲 ENCORE! (Risk it)
              </button>
              <button className="btn" onClick={() => { sfx.click(); declineEncore(); }}>
                ✂️ No thanks, wrap it up
              </button>
            </div>
          </div>
        )}
        {prod.isWrapped && prod.encoreState?.used && prod.encoreState.result && (
          <div style={{
            background: prod.encoreState.result === 'success' ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)',
            border: `2px solid ${prod.encoreState.result === 'success' ? '#2ecc71' : '#e74c3c'}`,
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            textAlign: 'center',
          }}>
            <span style={{ fontSize: '1.2rem' }}>
              {prod.encoreState.result === 'success' ? '🎉 ENCORE SUCCESS!' : '💥 ENCORE BACKFIRED!'}
            </span>
            {prod.encoreState.card && (
              <span style={{ color: '#888', fontSize: '0.8rem', marginLeft: 8 }}>
                {prod.encoreState.card.name}: {(prod.encoreState.card.totalValue || 0) >= 0 ? '+' : ''}{prod.encoreState.card.totalValue}
              </span>
            )}
          </div>
        )}
        {prod.isWrapped && (!prod.encoreState?.available || prod.encoreState.used) && (
          <AutoAdvance onAdvance={resolveRelease} delayMs={2500} label="📊 SEE BOX OFFICE →" />
        )}
      </div>

      {/* Played cards — horizontal carousel */}
      {prod.played.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: 6, textAlign: 'center' }}>
            🎞️ Production Timeline ({prod.played.length} card{prod.played.length !== 1 ? 's' : ''})
          </div>
          <div className="production-carousel" ref={scrollRef}>
            {prod.played.map((card) => (
              <div className="carousel-card" key={card.id}>
                <ProductionCardDisplay
                  card={card}
                  isNew={card.id === lastDrawn}
                />
              </div>
            ))}
          </div>
        </div>
      )}

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
    </div>
  );
}
