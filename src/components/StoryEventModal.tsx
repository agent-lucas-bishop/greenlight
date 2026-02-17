/*
 * R212 — StoryEventModal: Cinematic narrative event display
 * Film-noir aesthetic with typewriter text and choice buttons.
 */

import { useState, useEffect, useRef } from 'react';
import type { StoryEvent, StoryEventChoice, StoryEventOutcome } from '../storyEvents';

interface Props {
  event: StoryEvent;
  onChoice: (outcome: StoryEventOutcome) => void;
}

// ── Typewriter Hook ────────────────────────────────────────────────

function useTypewriter(lines: string[], speed = 30) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const skipRef = useRef(false);

  useEffect(() => {
    const full = lines.join('\n');
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
      if (i >= full.length) {
        setDone(true);
        clearInterval(tick);
      }
    }, speed);
    return () => clearInterval(tick);
  }, [lines, speed]);

  const skip = () => { skipRef.current = true; };
  return { displayed, done, skip };
}

// ── Outcome Preview ────────────────────────────────────────────────

function OutcomePreview({ outcome }: { outcome: StoryEventOutcome }) {
  const parts: string[] = [];
  if (outcome.reputation > 0) parts.push(`+${outcome.reputation} ⭐`);
  if (outcome.reputation < 0) parts.push(`${outcome.reputation} ⭐`);
  if (outcome.budget > 0) parts.push(`+$${outcome.budget}M`);
  if (outcome.budget < 0) parts.push(`−$${Math.abs(outcome.budget)}M`);
  if (outcome.morale > 0) parts.push(`+${outcome.morale} morale`);
  if (outcome.morale < 0) parts.push(`${outcome.morale} morale`);
  return (
    <span style={{
      display: 'block',
      fontSize: '0.7rem',
      color: '#b8a060',
      marginTop: 4,
      fontFamily: '"Courier New", monospace',
      letterSpacing: 1,
    }}>
      {parts.join('  •  ')}
    </span>
  );
}

// ── Choice Button ──────────────────────────────────────────────────

function ChoiceButton({ choice, onClick }: { choice: StoryEventChoice; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
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
        fontSize: '0.85rem',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        letterSpacing: 0.5,
      }}
    >
      {choice.text}
      {hovered && <OutcomePreview outcome={choice.outcome} />}
    </button>
  );
}

// ── Modal ──────────────────────────────────────────────────────────

export default function StoryEventModal({ event, onChoice }: Props) {
  const { displayed, done, skip } = useTypewriter(event.dialog);

  return (
    <div
      onClick={() => { if (!done) skip(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.4s ease',
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: 520,
        background: 'linear-gradient(160deg, #1a1a1a 0%, #111 100%)',
        border: '1px solid rgba(184,160,96,0.3)',
        borderRadius: 8,
        padding: '32px 36px',
        boxShadow: '0 0 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        position: 'relative',
      }}>
        {/* Portrait + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(184,160,96,0.12)',
            border: '2px solid rgba(184,160,96,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.6rem',
            flexShrink: 0,
          }}>
            {event.portrait}
          </div>
          <div>
            <h2 style={{
              margin: 0,
              color: '#f0e6c8',
              fontFamily: '"Georgia", serif',
              fontSize: '1.2rem',
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}>
              {event.title}
            </h2>
            <div style={{
              width: 40,
              height: 2,
              background: '#b8a060',
              marginTop: 6,
            }} />
          </div>
        </div>

        {/* Typewriter Dialog */}
        <div style={{
          fontFamily: '"Courier New", monospace',
          fontSize: '0.9rem',
          lineHeight: 1.7,
          color: '#c8c0a8',
          minHeight: 80,
          whiteSpace: 'pre-wrap',
          marginBottom: 28,
          borderLeft: '2px solid rgba(184,160,96,0.3)',
          paddingLeft: 16,
        }}>
          {displayed}
          {!done && <span style={{ opacity: 0.6, animation: 'blink 1s step-end infinite' }}>▌</span>}
        </div>

        {/* Choices (only after typewriter finishes) */}
        {done && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            {event.choices.map((choice, i) => (
              <ChoiceButton
                key={i}
                choice={choice}
                onClick={() => onChoice(choice.outcome)}
              />
            ))}
          </div>
        )}

        {/* Skip hint */}
        {!done && (
          <div style={{
            textAlign: 'center',
            fontSize: '0.65rem',
            color: 'rgba(255,255,255,0.25)',
            marginTop: 8,
            fontFamily: '"Courier New", monospace',
          }}>
            click to skip
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
