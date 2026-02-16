import { useState, useEffect } from 'react';

const NARRATIVE_LINES = [
  { text: 'Hollywood, California.', delay: 0 },
  { text: 'You\'ve just been handed the keys to a failing studio.', delay: 1200 },
  { text: 'The previous head left behind debt, bad press, and a roster of has-beens.', delay: 3000 },
  { text: 'The board gives you 5 seasons to prove yourself — or you\'re out.', delay: 5000 },
  { text: 'Make movies. Build your reputation. Survive the chaos.', delay: 7000 },
];

export default function StudioFoundingNarrative({ studioName, onComplete }: { studioName: string; onComplete: () => void }) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    NARRATIVE_LINES.forEach((line, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), line.delay));
    });
    // Auto-advance after all lines shown
    timers.push(setTimeout(() => setFading(true), 9000));
    timers.push(setTimeout(onComplete, 9800));
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'linear-gradient(180deg, #0a0908, #141210)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 32, transition: 'opacity 0.8s ease',
        opacity: fading ? 0 : 1,
      }}
      onClick={() => { setFading(true); setTimeout(onComplete, 400); }}
    >
      <div style={{ maxWidth: 500, textAlign: 'center' }}>
        {NARRATIVE_LINES.slice(0, visibleLines).map((line, i) => (
          <p
            key={i}
            className="animate-fade-in"
            style={{
              color: i === 0 ? 'var(--gold)' : i === NARRATIVE_LINES.length - 1 ? '#d4a843' : '#aaa',
              fontSize: i === 0 ? '1.4rem' : '1rem',
              fontFamily: i === 0 ? 'Bebas Neue' : 'inherit',
              letterSpacing: i === 0 ? '0.15em' : undefined,
              lineHeight: 1.7,
              marginBottom: 16,
            }}
          >
            {line.text}
          </p>
        ))}
        {visibleLines >= NARRATIVE_LINES.length && (
          <div className="animate-fade-in" style={{ marginTop: 24 }}>
            <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.8rem', letterSpacing: '0.1em' }}>
              {studioName}
            </div>
            <div style={{ color: '#666', fontSize: '0.8rem', marginTop: 8 }}>tap anywhere to continue</div>
          </div>
        )}
      </div>
    </div>
  );
}
