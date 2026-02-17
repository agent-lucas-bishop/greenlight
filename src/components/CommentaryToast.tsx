/**
 * R298: Director's Commentary toast — subtle bottom-right notification
 */
import { useState, useEffect } from 'react';
import type { CommentarySnippet } from '../commentary';

interface Props {
  snippet: CommentarySnippet;
  onDone: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  production: '🎬',
  trivia: '📽️',
  strategy: '💡',
  meta: '😏',
  milestone: '🌟',
};

export default function CommentaryToast({ snippet, onDone }: Props) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), 4500);
    const doneTimer = setTimeout(onDone, 5000);
    return () => { clearTimeout(exitTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={() => { setExiting(true); setTimeout(onDone, 300); }}
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 8000,
        maxWidth: 340,
        background: 'linear-gradient(135deg, rgba(40,40,50,0.95), rgba(30,30,40,0.92))',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        padding: '10px 16px',
        backdropFilter: 'blur(12px)',
        cursor: 'pointer',
        transition: 'transform 0.4s ease, opacity 0.4s ease',
        transform: exiting ? 'translateX(120%)' : 'translateX(0)',
        opacity: exiting ? 0 : 1,
        animation: 'commentarySlideIn 0.4s ease-out',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        pointerEvents: 'auto',
      }}
    >
      <span style={{ fontSize: '1.3rem', flexShrink: 0, marginTop: 1 }}>
        {CATEGORY_ICONS[snippet.category] || '🎬'}
      </span>
      <div>
        <div style={{
          color: 'rgba(255,255,255,0.4)',
          fontFamily: 'Bebas Neue, sans-serif',
          fontSize: '0.55rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: 3,
        }}>
          Director's Commentary
        </div>
        <div style={{
          color: 'rgba(255,255,255,0.85)',
          fontSize: '0.78rem',
          lineHeight: 1.4,
          fontStyle: 'italic',
        }}>
          {snippet.text}
        </div>
      </div>
    </div>
  );
}
