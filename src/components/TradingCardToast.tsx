// R187: Toast notification when a new trading card is earned
import { useState, useEffect } from 'react';
import { TRADING_CARDS, RARITY_CONFIG, type TradingCard } from '../tradingCards';
import { sfx } from '../sound';

interface Props {
  cardId: string;
  onDone: () => void;
}

export default function TradingCardToast({ cardId, onDone }: Props) {
  const [exiting, setExiting] = useState(false);
  const card = TRADING_CARDS.find(c => c.id === cardId);

  useEffect(() => {
    try { sfx.achievementUnlock(); } catch {}
    const t1 = setTimeout(() => setExiting(true), 3000);
    const t2 = setTimeout(onDone, 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  if (!card) return null;
  const rarity = RARITY_CONFIG[card.rarity];

  return (
    <div
      onClick={() => { setExiting(true); setTimeout(onDone, 300); }}
      style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: `translateX(-50%) translateY(${exiting ? '-120px' : '0'})`,
        zIndex: 9999,
        background: `linear-gradient(135deg, ${rarity.bgGlow}, rgba(0,0,0,0.85))`,
        border: `1px solid ${rarity.borderColor}`,
        borderRadius: 12,
        padding: '12px 24px',
        backdropFilter: 'blur(12px)',
        cursor: 'pointer',
        transition: 'transform 0.4s ease-in-out, opacity 0.4s',
        opacity: exiting ? 0 : 1,
        animation: 'achievementSlideIn 0.4s ease-out',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: `0 4px 20px ${rarity.borderColor}40`,
        minWidth: 260,
      }}
    >
      <span style={{ fontSize: '1.8rem' }}>🃏</span>
      <div>
        <div style={{
          color: rarity.color,
          fontFamily: 'Bebas Neue',
          fontSize: '0.7rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          ★ New Trading Card!
        </div>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
          {card.name}
        </div>
        <div style={{ color: rarity.color, fontSize: '0.7rem' }}>
          {rarity.label}
        </div>
      </div>
    </div>
  );
}
