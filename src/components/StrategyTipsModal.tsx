import { useState, useEffect, useRef } from 'react';
import { sfx } from '../sound';

const STORAGE_KEY = 'greenlight_strategy_tips_shown';

const TIPS = [
  {
    emoji: '💰',
    title: 'Budget Management',
    text: 'Don\'t blow your budget on one star! Spread your money across solid mid-tier talent. A $3M actor with Skill 4 often outperforms a $6M actor with Skill 5 and high Heat.',
  },
  {
    emoji: '🎭',
    title: 'Genre Diversity',
    text: 'Don\'t chase one genre every season. Hot trends rotate — if you only make Action films and Action cools off, you\'re stuck. Keep 2-3 genres in your comfort zone.',
  },
  {
    emoji: '👥',
    title: 'Talent Planning',
    text: 'Talent ages and retires. Always have understudies ready. Training cheap talent is often better than hiring expensive replacements every season.',
  },
  {
    emoji: '🎯',
    title: 'Hit the Target',
    text: 'A modest HIT is better than gambling for a BLOCKBUSTER and getting a FLOP. Wrap production early if you have enough quality — don\'t risk incidents.',
  },
  {
    emoji: '🏪',
    title: 'Shop Smart',
    text: 'Studio perks compound over time. Early perks like "Script Doctor" or "Casting Network" pay for themselves across multiple seasons. Invest early.',
  },
  {
    emoji: '⚠️',
    title: 'Incident Management',
    text: 'High-Heat talent adds powerful cards BUT also Incident cards. 3 incidents = disaster (lose ALL quality). Balance risk vs reward when casting.',
  },
];

function hasBeenShown(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markShown() {
  localStorage.setItem(STORAGE_KEY, 'true');
}

interface Props {
  onClose: () => void;
}

export default function StrategyTipsModal({ onClose }: Props) {
  const [visible, setVisible] = useState(true);
  const didPlay = useRef(false);

  useEffect(() => {
    if (didPlay.current) return;
    didPlay.current = true;
    // Staggered page-turn sounds for each tip
    TIPS.forEach((_, i) => {
      setTimeout(() => { try { sfx.strategyTipReveal(); } catch {} }, 200 + i * 150);
    });
  }, []);

  const handleClose = () => {
    markShown();
    try { sfx.click(); } catch {}
    setVisible(false);
    setTimeout(onClose, 200);
  };

  if (!visible) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 960,
          animation: 'fadeIn 0.3s ease',
        }}
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tips & Strategy"
        className="animate-slide-down"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 970,
          background: 'linear-gradient(135deg, rgba(30,28,24,0.99), rgba(20,18,14,0.99))',
          border: '2px solid var(--gold)',
          borderRadius: 16,
          padding: '24px 28px',
          maxWidth: 520,
          width: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 80px)',
          overflowY: 'auto',
          boxShadow: '0 0 40px rgba(212,168,67,0.25), 0 16px 48px rgba(0,0,0,0.6)',
        }}
      >
        <h2 style={{ color: 'var(--gold)', margin: '0 0 4px 0', fontFamily: 'Bebas Neue', fontSize: '1.4rem', letterSpacing: '0.05em' }}>
          💡 Tips & Strategy
        </h2>
        <p style={{ color: '#999', fontSize: '0.8rem', marginBottom: 20 }}>
          Every great director learns from setbacks. Here are some tips to improve your next run:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {TIPS.map((tip) => (
            <div
              key={tip.title}
              style={{
                display: 'flex',
                gap: 12,
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ fontSize: '1.4rem', flexShrink: 0 }}>{tip.emoji}</div>
              <div>
                <div style={{ color: '#eee', fontWeight: 600, fontSize: '0.85rem', marginBottom: 2 }}>{tip.title}</div>
                <div style={{ color: '#aaa', fontSize: '0.78rem', lineHeight: 1.5 }}>{tip.text}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button className="btn btn-primary" onClick={handleClose} style={{ padding: '10px 28px' }}>
            Back to the Studio 🎬
          </button>
        </div>
      </div>
    </>
  );
}

/** Should we show strategy tips? Only after first loss and only once */
export function shouldShowStrategyTips(): boolean {
  return !hasBeenShown();
}
