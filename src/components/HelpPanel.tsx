import { useState } from 'react';

/** In-game help / glossary panel with searchable terms grouped by category */

interface HelpEntry {
  term: string;
  desc: string;
  tips?: string;
}

interface HelpCategory {
  id: string;
  title: string;
  emoji: string;
  entries: HelpEntry[];
}

const HELP_DATA: HelpCategory[] = [
  {
    id: 'basics',
    title: 'Basics',
    emoji: '🎬',
    entries: [
      { term: 'Seasons', desc: 'The game spans 5 seasons. Each season you make one film.', tips: 'Targets increase each season — plan ahead.' },
      { term: 'Phases', desc: 'Each season: Greenlight → Casting → Production → Release → Shop.', tips: 'Production is the core — master the card game.' },
      { term: 'Winning', desc: 'Survive all 5 seasons without 3 strikes or 0 reputation.', tips: 'Consistent HIT-level films beat gambling on blockbusters.' },
      { term: 'Strikes', desc: 'Miss a box office target = 1 strike. 3 strikes = fired.', tips: 'At 2 strikes, play it safe — wrap early if needed.' },
      { term: 'Budget', desc: 'Your money for hiring talent and buying perks.', tips: 'Avoid debt — it reduces future earnings by 10% of the debt amount.' },
      { term: 'Reputation', desc: 'Star rating (1–5) that multiplies box office earnings.', tips: 'A 5-star reputation doubles your earnings vs 3 stars.' },
    ],
  },
  {
    id: 'cards',
    title: 'Cards',
    emoji: '🃏',
    entries: [
      { term: 'Action Cards', desc: 'Good cards (green). You choose which to keep from your draw.', tips: 'Look for cards with synergy tags matching your focus.' },
      { term: 'Challenge Cards', desc: 'Gamble cards (yellow). Accept or decline a bet.', tips: 'Take bets when the odds are in your favor (check the hint).' },
      { term: 'Incident Cards', desc: 'Bad cards (red). Auto-play when drawn.', tips: '3 incidents = DISASTER. At 2, consider wrapping early.' },
      { term: 'Director\'s Cut', desc: 'Peek at top 3 cards and rearrange them. Once per film.', tips: 'Use it when you have 2 incidents to avoid the third.' },
      { term: 'Encore', desc: 'After wrapping, risk one more draw for bonus quality.', tips: 'Only encore if you have 0-1 incidents and need the boost.' },
      { term: 'Keywords', desc: 'Cards have tags (Momentum, Precision, Chaos, Heart, Spectacle).', tips: 'Focus 50%+ of played cards on one tag for archetype bonuses.' },
    ],
  },
  {
    id: 'genres',
    title: 'Genres',
    emoji: '🎭',
    entries: [
      { term: 'Genre Matching', desc: 'Hot genres earn bonus box office. Cold genres earn less.', tips: 'Check market conditions before picking your script.' },
      { term: 'Action', desc: 'High-energy spectacles. Pairs with Spectacle and Momentum.', tips: 'Big budgets pay off here — go for blockbuster quality.' },
      { term: 'Comedy', desc: 'Crowd-pleasers with Heart and Chaos cards.', tips: 'Comedies are forgiving — good for recovering from bad seasons.' },
      { term: 'Drama', desc: 'Award magnets. Pairs with Precision and Heart.', tips: 'Low incident risk makes dramas safe and reliable.' },
      { term: 'Horror', desc: 'Low budget, high upside. Chaos and Momentum thrive.', tips: 'Cheap to cast, so save budget for perks.' },
      { term: 'Sci-Fi', desc: 'Expensive but rewarding. Spectacle-heavy with big finishes.', tips: 'Needs star talent to shine — don\'t cheap out on casting.' },
      { term: 'Romance', desc: 'Chemistry-dependent. Heart cards and talent pairs essential.', tips: 'Cast chemistry pairs for free bonus quality.' },
      { term: 'Thriller', desc: 'Balanced risk/reward. Precision and Chaos both work.', tips: 'Versatile pick when you\'re not sure what the market wants.' },
    ],
  },
  {
    id: 'economy',
    title: 'Economy',
    emoji: '💰',
    entries: [
      { term: 'Box Office', desc: 'Quality × market multiplier × reputation = your earnings.', tips: 'Even average quality with a hot genre can hit targets.' },
      { term: 'Box Office Target', desc: 'The minimum earnings to avoid a strike. Grows each season.', tips: 'Season 1 targets are forgiving — use it to experiment.' },
      { term: 'Market Conditions', desc: 'Each genre has a market multiplier that changes each season.', tips: 'A 1.5× multiplier is huge — prioritize hot genres.' },
      { term: 'Debt', desc: 'Overspending creates debt that reduces future earnings.', tips: 'Pay off debt ASAP — it compounds over seasons.' },
      { term: 'Talent Costs', desc: 'Better talent costs more. Elite talent is expensive but powerful.', tips: 'A cheap cast with good chemistry can outperform expensive loners.' },
      { term: 'Perks', desc: 'Permanent studio upgrades bought between seasons.', tips: 'Reshoots and Completion Bond are top-tier first buys.' },
    ],
  },
  {
    id: 'prestige',
    title: 'Prestige',
    emoji: '⭐',
    entries: [
      { term: 'Prestige XP', desc: 'Cross-run progression earned from completed runs.', tips: 'Even losing runs earn some XP — every game counts.' },
      { term: 'Prestige Level', desc: 'Your cumulative experience. Higher levels unlock veteran perks.', tips: 'Higher prestige also increases difficulty slightly.' },
      { term: 'Genre Mastery', desc: 'Track record per genre. Earn tiers: Bronze → Platinum.', tips: 'Mastery bonuses stack — specialize for big quality boosts.' },
      { term: 'New Game+', desc: 'Post-victory mode with 1.4× targets.', tips: 'NG+ scores are weighted higher on leaderboards.' },
      { term: 'Director Mode', desc: 'The hardest mode. 1.8× targets for experts only.', tips: 'Master normal first. Director Mode punishes mistakes severely.' },
      { term: 'Legacy Perks', desc: 'Permanent bonuses from milestone achievements.', tips: 'Check your milestones — some are close to unlocking.' },
    ],
  },
  {
    id: 'campaigns',
    title: 'Campaigns',
    emoji: '📖',
    entries: [
      { term: 'Campaign Mode', desc: 'Story-driven runs with unique rules and narrative beats.', tips: 'Campaigns teach advanced strategies through guided play.' },
      { term: 'Daily Challenge', desc: 'A daily seeded run with special modifiers.', tips: 'Everyone gets the same seed — compare scores globally.' },
      { term: 'Weekly Challenge', desc: 'A week-long seeded challenge with unique twists.', tips: 'You can attempt the weekly multiple times for a better score.' },
      { term: 'Challenge Modes', desc: 'Special rulesets that remix the base game.', tips: 'Challenge modifiers can stack for bonus score multipliers.' },
      { term: 'Rival Studios', desc: 'AI competitors that affect market conditions.', tips: 'Watch rival genres — if they flood a genre, the market dips.' },
      { term: 'Season Events', desc: 'Between-season news that alters gameplay.', tips: 'Some events are traps — read carefully before choosing.' },
    ],
  },
];

export default function HelpPanel({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>('basics');

  const lowerSearch = search.toLowerCase().trim();

  const filtered = lowerSearch
    ? HELP_DATA.map(cat => ({
        ...cat,
        entries: cat.entries.filter(
          e =>
            e.term.toLowerCase().includes(lowerSearch) ||
            e.desc.toLowerCase().includes(lowerSearch) ||
            (e.tips && e.tips.toLowerCase().includes(lowerSearch))
        ),
      })).filter(cat => cat.entries.length > 0)
    : activeCategory
    ? HELP_DATA.filter(cat => cat.id === activeCategory)
    : HELP_DATA;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h2 style={{ color: 'var(--gold)', marginBottom: 4, fontSize: '1.3rem', flexShrink: 0 }}>❓ Help & Glossary</h2>
        <p style={{ color: '#888', fontSize: '0.75rem', marginBottom: 12, flexShrink: 0 }}>
          Search game terms or browse by category.
        </p>

        {/* Search */}
        <input
          type="text"
          placeholder="Search terms, mechanics, tips..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid #333',
            borderRadius: 8,
            color: '#ccc',
            fontSize: '0.85rem',
            marginBottom: 12,
            outline: 'none',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
          autoFocus
        />

        {/* Category tabs */}
        {!lowerSearch && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12, flexShrink: 0 }}>
            {HELP_DATA.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                style={{
                  padding: '5px 10px',
                  fontSize: '0.7rem',
                  background: activeCategory === cat.id ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${activeCategory === cat.id ? 'var(--gold-dim)' : '#333'}`,
                  borderRadius: 6,
                  color: activeCategory === cat.id ? 'var(--gold)' : '#888',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {cat.emoji} {cat.title}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {filtered.length === 0 && (
            <p style={{ color: '#666', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>
              No results for "{search}"
            </p>
          )}

          {filtered.map(cat => (
            <div key={cat.id} style={{ marginBottom: 16 }}>
              {(lowerSearch || !activeCategory) && (
                <div style={{
                  color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.9rem',
                  letterSpacing: '0.05em', marginBottom: 8, padding: '4px 0',
                  borderBottom: '1px solid rgba(212,168,67,0.15)',
                }}>
                  {cat.emoji} {cat.title}
                </div>
              )}
              {cat.entries.map(entry => (
                <div
                  key={entry.term}
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <div style={{ color: '#ddd', fontSize: '0.88rem', fontWeight: 700, marginBottom: 3 }}>
                    {entry.term}
                  </div>
                  <div style={{ color: '#999', fontSize: '0.8rem', lineHeight: 1.5 }}>
                    {entry.desc}
                  </div>
                  {entry.tips && (
                    <div style={{
                      color: '#d4a843', fontSize: '0.72rem', marginTop: 4,
                      fontStyle: 'italic', lineHeight: 1.4,
                    }}>
                      💡 {entry.tips}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 12, flexShrink: 0 }}>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
