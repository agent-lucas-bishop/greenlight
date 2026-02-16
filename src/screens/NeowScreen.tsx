import { useState } from 'react';
import { pickNeow } from '../gameStore';
import PhaseTip from '../components/PhaseTip';

const CHOICES = [
  { title: 'Fading Icon', desc: 'A volatile star: Skill 5, Heat 4. "Past Their Prime" — loses 1 Skill each season. A ticking time bomb of talent.', emoji: '⭐', color: '#d4a843' },
  { title: '$10M Extra Cash', desc: 'Play it safe. Extra budget means more hiring options early, but no star power to lean on.', emoji: '💰', color: '#2ecc71' },
  { title: 'Crisis Manager', desc: 'A studio perk: bad production card effects are halved. A safety net for the cautious producer.', emoji: '🛡️', color: '#5dade2' },
];

export default function NeowScreen() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);

  const handlePick = (i: number) => {
    setChosen(i);
    setTimeout(() => pickNeow(i), 600);
  };

  return (
    <div className="fade-in">
      <PhaseTip phase="neow" />
      <div className="phase-title">
        <h2>Welcome to Hollywood</h2>
        <div className="subtitle">Every studio head gets one break. Choose yours.</div>
      </div>
      <div className="neow-choices">
        {CHOICES.map((c, i) => (
          <div
            key={i}
            className={`card neow-card ${chosen === i ? 'chosen' : ''} ${chosen !== null && chosen !== i ? 'not-chosen' : ''}`}
            onClick={() => chosen === null && handlePick(i)}
            onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && chosen === null) { e.preventDefault(); handlePick(i); } }}
            tabIndex={chosen === null ? 0 : -1}
            role="button"
            aria-label={`${c.title}: ${c.desc}`}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{ 
              animationDelay: `${i * 0.15}s`,
              borderColor: hoveredIdx === i ? c.color : undefined,
              boxShadow: hoveredIdx === i ? `0 0 24px ${c.color}30, 0 8px 32px rgba(0,0,0,0.6)` : undefined,
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: 12, transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)', transform: hoveredIdx === i ? 'scale(1.25) rotate(-3deg)' : 'scale(1)' }}>{c.emoji}</div>
            <div className="card-title" style={{ color: c.color }}>{c.title}</div>
            <div className="card-body" style={{ fontSize: '0.85rem' }}>{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
