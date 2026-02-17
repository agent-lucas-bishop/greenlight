/*
 * ══════════════════════════════════════════════════════════════════════
 * R263 — NarrativeEvent: Full-screen cinematic story card
 * ══════════════════════════════════════════════════════════════════════
 * Cinematic presentation with CSS gradient illustration area,
 * typewriter text, choice buttons with hover outcome hints,
 * and resolution screen.
 * ══════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { NarrativeEvent, NarrativeChoice, NarrativeOutcome, NarrativeCategory } from '../narrativeEvents';
import { sfx } from '../sound';

// ── Category Styling ───────────────────────────────────────────────

const CATEGORY_COLORS: Record<NarrativeCategory, string> = {
  industry: '#4a90d9',
  personal: '#d94a7a',
  creative: '#d9a04a',
  financial: '#4ad97a',
};

const CATEGORY_LABELS: Record<NarrativeCategory, string> = {
  industry: '🏭 INDUSTRY',
  personal: '👤 PERSONAL',
  creative: '🎨 CREATIVE',
  financial: '💵 FINANCIAL',
};

const RARITY_GLOW: Record<string, string> = {
  common: 'rgba(255,255,255,0.1)',
  uncommon: 'rgba(74,144,217,0.2)',
  rare: 'rgba(217,160,74,0.3)',
  legendary: 'rgba(217,74,122,0.4)',
};

// ── Typewriter Hook ────────────────────────────────────────────────

function useTypewriter(lines: string[], speed = 28) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const skipRef = useRef(false);

  useEffect(() => {
    const full = lines.join('\n\n');
    let i = 0;
    setDisplayed('');
    setDone(false);
    skipRef.current = false;

    const tick = setInterval(() => {
      if (skipRef.current) {
        setDisplayed(full);
        setDone(true);
        clearInterval(tick);
        return;
      }
      i++;
      setDisplayed(full.slice(0, i));
      if (full[i - 1] && full[i - 1] !== ' ' && full[i - 1] !== '\n') {
        try { sfx.storyTypewriterTick(); } catch {}
      }
      if (i >= full.length) {
        setDone(true);
        clearInterval(tick);
      }
    }, speed);
    return () => clearInterval(tick);
  }, [lines, speed]);

  const skip = useCallback(() => { skipRef.current = true; }, []);
  return { displayed, done, skip };
}

// ── Outcome Preview ────────────────────────────────────────────────

function OutcomePreview({ outcome }: { outcome: NarrativeOutcome }) {
  const parts: string[] = [];
  if (outcome.reputation > 0) parts.push(`+${outcome.reputation} ⭐`);
  if (outcome.reputation < 0) parts.push(`${outcome.reputation} ⭐`);
  if (outcome.budget > 0) parts.push(`+$${outcome.budget}M`);
  if (outcome.budget < 0) parts.push(`−$${Math.abs(outcome.budget)}M`);
  if (outcome.morale > 0) parts.push(`+${outcome.morale} morale`);
  if (outcome.morale < 0) parts.push(`${outcome.morale} morale`);
  if (outcome.cardReward) parts.push('🃏 Card reward');
  return (
    <span style={{
      display: 'block',
      fontSize: '0.65rem',
      color: '#b8a060',
      marginTop: 6,
      fontFamily: '"Courier New", monospace',
      letterSpacing: 1,
      opacity: 0.9,
    }}>
      {parts.join('  •  ')}
    </span>
  );
}

// ── Resolution Screen ──────────────────────────────────────────────

function ResolutionScreen({ choice, onContinue }: { choice: NarrativeChoice; onContinue: () => void }) {
  const o = choice.outcome;
  const changes: { label: string; value: string; color: string }[] = [];
  if (o.reputation !== 0) changes.push({ label: 'Reputation', value: `${o.reputation > 0 ? '+' : ''}${o.reputation}`, color: o.reputation > 0 ? '#4ad97a' : '#d94a4a' });
  if (o.budget !== 0) changes.push({ label: 'Budget', value: `${o.budget > 0 ? '+' : '−'}$${Math.abs(o.budget)}M`, color: o.budget > 0 ? '#4ad97a' : '#d94a4a' });
  if (o.morale !== 0) changes.push({ label: 'Morale', value: `${o.morale > 0 ? '+' : ''}${o.morale}`, color: o.morale > 0 ? '#4ad97a' : '#d94a4a' });
  if (o.cardReward) changes.push({ label: 'Reward', value: '🃏 New Card', color: '#d9a04a' });

  return (
    <div style={{
      animation: 'narrativeFadeIn 0.5s ease',
      textAlign: 'center',
      padding: '32px 0',
    }}>
      <div style={{
        fontSize: '0.7rem',
        color: 'rgba(255,255,255,0.4)',
        fontFamily: '"Courier New", monospace',
        letterSpacing: 3,
        textTransform: 'uppercase',
        marginBottom: 16,
      }}>
        Resolution
      </div>

      <div style={{
        fontSize: '0.85rem',
        color: '#c8c0a8',
        fontFamily: '"Georgia", serif',
        fontStyle: 'italic',
        marginBottom: 24,
        padding: '0 20px',
      }}>
        "{choice.text}"
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
        {changes.map((c, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            padding: '12px 20px',
            minWidth: 80,
          }}>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontFamily: '"Courier New", monospace', letterSpacing: 1, marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: '1.1rem', color: c.color, fontWeight: 700, fontFamily: '"Courier New", monospace' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {choice.chainsTo && (
        <div style={{
          fontSize: '0.7rem',
          color: '#d9a04a',
          fontFamily: '"Courier New", monospace',
          marginBottom: 16,
          animation: 'narrativePulse 2s ease infinite',
        }}>
          ⛓️ This story will continue…
        </div>
      )}

      <button
        onClick={onContinue}
        style={{
          padding: '12px 32px',
          background: 'rgba(184,160,96,0.15)',
          border: '1px solid rgba(184,160,96,0.4)',
          borderRadius: 4,
          color: '#f0e6c8',
          fontFamily: '"Courier New", monospace',
          fontSize: '0.85rem',
          cursor: 'pointer',
          letterSpacing: 1,
        }}
      >
        Continue →
      </button>
    </div>
  );
}

// ── Choice Button ──────────────────────────────────────────────────

function NarrativeChoiceButton({ choice, onClick }: { choice: NarrativeChoice; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => { setHovered(true); try { sfx.storyChoiceHover(); } catch {} }}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        width: '100%',
        padding: '14px 20px',
        marginBottom: 10,
        background: hovered ? 'rgba(184,160,96,0.15)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hovered ? '#b8a060' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 4,
        color: hovered ? '#f0e6c8' : '#c8c0a8',
        fontFamily: '"Courier New", monospace',
        fontSize: '0.82rem',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        letterSpacing: 0.5,
        lineHeight: 1.5,
      }}
    >
      {choice.text}
      {hovered && <OutcomePreview outcome={choice.outcome} />}
      {hovered && choice.chainsTo && (
        <span style={{ display: 'block', fontSize: '0.6rem', color: '#d9a04a', marginTop: 4 }}>
          ⛓️ Story continues…
        </span>
      )}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────

interface Props {
  event: NarrativeEvent;
  onResolve: (outcome: NarrativeOutcome, chainsTo?: string) => void;
}

export default function NarrativeEventCard({ event, onResolve }: Props) {
  const { displayed, done, skip } = useTypewriter(event.dialog);
  const [resolution, setResolution] = useState<NarrativeChoice | null>(null);
  const catColor = CATEGORY_COLORS[event.category];
  const glow = RARITY_GLOW[event.rarity] || RARITY_GLOW.common;

  useEffect(() => {
    try { sfx.storyEventSting(); } catch {}
  }, []);

  const handleChoice = (choice: NarrativeChoice) => {
    try { sfx.storyChoiceSelect(); } catch {}
    const net = (choice.outcome.reputation || 0) + (choice.outcome.budget || 0) + (choice.outcome.morale || 0);
    setTimeout(() => {
      try { net >= 0 ? sfx.storyOutcomePositive() : sfx.storyOutcomeNegative(); } catch {}
    }, 300);
    setResolution(choice);
  };

  const handleContinue = () => {
    if (!resolution) return;
    onResolve(resolution.outcome, resolution.chainsTo);
  };

  return (
    <div
      onClick={() => { if (!done && !resolution) skip(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(6px)',
        animation: 'narrativeFadeIn 0.5s ease',
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: 560,
        background: 'linear-gradient(160deg, #1a1a1a 0%, #111 100%)',
        border: `1px solid ${catColor}33`,
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: `0 0 80px ${glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}>
        {/* Illustration Area — gradient with portrait */}
        <div style={{
          background: event.gradient,
          padding: '36px 36px 28px',
          position: 'relative',
          borderBottom: `1px solid ${catColor}22`,
        }}>
          {/* Category Badge */}
          <div style={{
            position: 'absolute',
            top: 12,
            right: 16,
            fontSize: '0.55rem',
            fontFamily: '"Courier New", monospace',
            color: catColor,
            letterSpacing: 2,
            textTransform: 'uppercase',
            background: `${catColor}15`,
            padding: '3px 8px',
            borderRadius: 3,
            border: `1px solid ${catColor}33`,
          }}>
            {CATEGORY_LABELS[event.category]}
          </div>

          {/* Rarity Badge */}
          {event.rarity !== 'common' && (
            <div style={{
              position: 'absolute',
              top: 12,
              left: 16,
              fontSize: '0.5rem',
              fontFamily: '"Courier New", monospace',
              color: event.rarity === 'legendary' ? '#ff6b9d' : event.rarity === 'rare' ? '#d9a04a' : '#7ab8d9',
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}>
              {event.rarity === 'legendary' ? '★★★' : event.rarity === 'rare' ? '★★' : '★'} {event.rarity}
            </div>
          )}

          {/* Portrait + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${catColor}22 0%, transparent 70%)`,
              border: `2px solid ${catColor}55`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              flexShrink: 0,
              boxShadow: `0 0 20px ${catColor}22`,
            }}>
              {event.portrait}
            </div>
            <div>
              <h2 style={{
                margin: 0,
                color: '#f0e6c8',
                fontFamily: '"Georgia", serif',
                fontSize: '1.25rem',
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              }}>
                {event.title}
              </h2>
              <div style={{ width: 40, height: 2, background: catColor, marginTop: 8, opacity: 0.6 }} />
            </div>
          </div>

          {/* Flavor Text */}
          <div style={{
            marginTop: 16,
            fontFamily: '"Georgia", serif',
            fontSize: '0.8rem',
            fontStyle: 'italic',
            color: 'rgba(240,230,200,0.6)',
            letterSpacing: 0.5,
          }}>
            {event.flavorText}
          </div>

          {/* Chain indicator */}
          {event.chainFrom && (
            <div style={{
              marginTop: 10,
              fontSize: '0.6rem',
              color: '#d9a04a',
              fontFamily: '"Courier New", monospace',
              letterSpacing: 1,
            }}>
              ⛓️ CONTINUATION
            </div>
          )}
        </div>

        {/* Content Area */}
        <div style={{ padding: '24px 36px 32px' }}>
          {!resolution ? (
            <>
              {/* Typewriter Dialog */}
              <div style={{
                fontFamily: '"Courier New", monospace',
                fontSize: '0.85rem',
                lineHeight: 1.8,
                color: '#c8c0a8',
                minHeight: 80,
                whiteSpace: 'pre-wrap',
                marginBottom: 24,
                borderLeft: `2px solid ${catColor}44`,
                paddingLeft: 16,
              }}>
                {displayed}
                {!done && <span style={{ opacity: 0.6, animation: 'narrativeBlink 1s step-end infinite' }}>▌</span>}
              </div>

              {/* Choices */}
              {done && (
                <div style={{ animation: 'narrativeFadeIn 0.4s ease' }}>
                  {event.choices.map((choice, i) => (
                    <NarrativeChoiceButton
                      key={i}
                      choice={choice}
                      onClick={() => handleChoice(choice)}
                    />
                  ))}
                </div>
              )}

              {/* Skip hint */}
              {!done && (
                <div style={{
                  textAlign: 'center',
                  fontSize: '0.6rem',
                  color: 'rgba(255,255,255,0.2)',
                  fontFamily: '"Courier New", monospace',
                }}>
                  click to skip
                </div>
              )}
            </>
          ) : (
            <ResolutionScreen choice={resolution} onContinue={handleContinue} />
          )}
        </div>
      </div>

      <style>{`
        @keyframes narrativeFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes narrativeBlink { 50% { opacity: 0; } }
        @keyframes narrativePulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}
