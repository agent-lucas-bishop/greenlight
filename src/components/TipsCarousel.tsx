import { useState, useEffect, useCallback } from 'react';

export type TipCategory = 'beginner' | 'intermediate' | 'advanced';

export interface GameTip {
  text: string;
  category: TipCategory;
}

export const GAMEPLAY_TIPS: GameTip[] = [
  // Beginner
  { text: "Chemistry bonuses between cast members can massively boost your film's quality.", category: 'beginner' },
  { text: "3 strikes and you're fired! Each missed box office target is one strike.", category: 'beginner' },
  { text: "Wrapping early with decent quality beats risking a disaster.", category: 'beginner' },
  { text: "Match your film's genre to Hot 🔥 trends for a massive box office multiplier.", category: 'beginner' },
  { text: "High Heat talent add powerful cards AND dangerous Incident cards to your deck.", category: 'beginner' },
  { text: "Your reputation stars multiply ALL box office earnings. Protect them!", category: 'beginner' },
  { text: "At 2 incidents, seriously consider wrapping. One more and you lose everything.", category: 'beginner' },
  { text: "Your starting bonus shapes the entire run — cash gives flexibility, perks give staying power.", category: 'beginner' },
  // Intermediate
  { text: "Focus on one keyword tag (50%+ of played cards) for escalating quality bonuses.", category: 'intermediate' },
  { text: "Training away Incident cards from risky talent can be more valuable than buying a new perk.", category: 'intermediate' },
  { text: "Check the deck preview before production — if incidents outnumber actions, you're in danger.", category: 'intermediate' },
  { text: "Studio archetypes shape your whole strategy — Prestige studios get critic bonuses, Blockbuster studios earn more.", category: 'intermediate' },
  { text: "Season events add strategic variety — no two runs play the same.", category: 'intermediate' },
  { text: "Encore is high risk, high reward: success = bonus quality, failure = you lose some.", category: 'intermediate' },
  { text: "Heart cards reward chemistry pairs and ensemble casts — build a tight-knit crew.", category: 'intermediate' },
  { text: "Quality × market conditions × reputation = your box office take. Maximize all three.", category: 'intermediate' },
  // Advanced
  { text: "Spectacle cards are strongest in late draws — save your best for the climax.", category: 'advanced' },
  { text: "Chaos cards get STRONGER when incidents happen — dangerous but powerful if you survive.", category: 'advanced' },
  { text: "Precision rewards clean wraps with no incidents — best for risk-averse strategies.", category: 'advanced' },
  { text: "Momentum rewards streaks — cards get stronger the more Momentum cards you play in a row.", category: 'advanced' },
  { text: "Genre mastery unlocks permanent bonuses — specialize in a genre across multiple seasons.", category: 'advanced' },
  { text: "Festival nominations require high quality AND the right genre timing — plan your prestige film.", category: 'advanced' },
  { text: "Synergy combos between specific card types can trigger powerful bonus effects.", category: 'advanced' },
  { text: "In Endless mode, difficulty scales infinitely — optimize your deck or get overwhelmed.", category: 'advanced' },
];

const CYCLE_MS = 6000;

interface TipsCarouselProps {
  /** Optional filter by category */
  category?: TipCategory;
  /** Custom cycle interval in ms */
  interval?: number;
  /** Compact single-line style */
  compact?: boolean;
}

export default function TipsCarousel({ category, interval = CYCLE_MS, compact }: TipsCarouselProps) {
  const tips = category ? GAMEPLAY_TIPS.filter(t => t.category === category) : GAMEPLAY_TIPS;
  const [index, setIndex] = useState(() => Math.floor(Math.random() * tips.length));
  const [fading, setFading] = useState(false);

  const advance = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setIndex(prev => (prev + 1) % tips.length);
      setFading(false);
    }, 400);
  }, [tips.length]);

  useEffect(() => {
    const id = setInterval(advance, interval);
    return () => clearInterval(id);
  }, [advance, interval]);

  const tip = tips[index % tips.length];

  const categoryIcon = tip.category === 'beginner' ? '🌱' : tip.category === 'intermediate' ? '🎯' : '⚡';

  if (compact) {
    return (
      <div style={{
        color: '#888', fontSize: '0.75rem', fontStyle: 'italic',
        opacity: fading ? 0 : 1, transition: 'opacity 0.4s ease',
        textAlign: 'center', padding: '4px 8px',
      }}>
        💡 {tip.text}
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(212,168,67,0.15)',
      borderRadius: 10,
      padding: '12px 16px',
      textAlign: 'center',
      opacity: fading ? 0 : 1,
      transition: 'opacity 0.4s ease',
      maxWidth: 400,
      margin: '0 auto',
    }}>
      <div style={{ color: '#666', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontFamily: 'Bebas Neue' }}>
        {categoryIcon} Did you know?
      </div>
      <div style={{ color: '#aaa', fontSize: '0.8rem', lineHeight: 1.5 }}>
        {tip.text}
      </div>
    </div>
  );
}
