import StatTooltip from './StatTooltip';

/** Card keyword tag definitions for new players */
const KEYWORD_INFO: Record<string, { emoji: string; label: string; tip: string; color: string }> = {
  momentum: {
    emoji: '🔥',
    label: 'Momentum',
    tip: 'Rewards streaks — cards get stronger the more Momentum cards you play in a row. Great for aggressive, high-tempo productions.',
    color: '#e74c3c',
  },
  precision: {
    emoji: '🎯',
    label: 'Precision',
    tip: 'Rewards careful play — bonuses for clean wraps (no incidents) and consistent quality. Best for risk-averse strategies.',
    color: '#3498db',
  },
  chaos: {
    emoji: '💀',
    label: 'Chaos',
    tip: 'High risk, high reward — some Chaos cards get STRONGER when incidents happen. Dangerous but powerful if you can survive.',
    color: '#9b59b6',
  },
  heart: {
    emoji: '💕',
    label: 'Heart',
    tip: 'Synergy-focused — Heart cards reward chemistry pairs and ensemble casts. Build a tight-knit crew for maximum effect.',
    color: '#e91e63',
  },
  spectacle: {
    emoji: '✨',
    label: 'Spectacle',
    tip: 'Big finishes — Spectacle cards are strongest in late draws. Save your best for the climax of production.',
    color: '#f39c12',
  },
};

/** Inline keyword badge with tooltip explanation */
export function KeywordBadge({ tag }: { tag: string }) {
  const info = KEYWORD_INFO[tag];
  if (!info) return <span className="card-tag">{tag}</span>;

  return (
    <StatTooltip tip={info.tip} inline>
      <span
        className="card-tag"
        style={{
          color: info.color,
          borderColor: `${info.color}44`,
          background: `${info.color}15`,
          cursor: 'help',
        }}
      >
        {info.emoji} {info.label}
      </span>
    </StatTooltip>
  );
}

/** Standalone glossary of all keywords (for How to Play) */
export function KeywordGlossary() {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {Object.entries(KEYWORD_INFO).map(([key, info]) => (
        <StatTooltip key={key} tip={info.tip} inline>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: '0.78rem',
              fontWeight: 600,
              color: info.color,
              background: `${info.color}12`,
              border: `1px solid ${info.color}33`,
              cursor: 'help',
            }}
          >
            {info.emoji} {info.label}
          </span>
        </StatTooltip>
      ))}
    </div>
  );
}

/** Mechanic tooltips for header/UI elements */
export const MECHANIC_TIPS: Record<string, string> = {
  budget: 'Your money to hire talent and buy perks. Overspending creates debt that eats into future earnings.',
  reputation: 'Star rating (1-5). Multiplies all box office earnings. Drops when you miss targets. Hits 0 = game over.',
  strikes: 'Miss a box office target = 1 strike. 3 strikes and you\'re fired! (Some modes change the limit.)',
  target: 'The box office amount your film must earn this season. Increases each season.',
  encore: 'After wrapping production, you can risk ONE more card draw. Success = bonus quality. Fail = lose some quality.',
  archetypeFocus: 'When 50%+ of your played cards share a keyword tag, you get escalating quality bonuses. The higher the %, the bigger the bonus.',
  deckBuilding: 'Your production deck is built from your cast. Each talent adds their cards. High Heat talent add powerful cards AND dangerous Incidents.',
};

export default KeywordBadge;
