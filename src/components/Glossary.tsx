import { useState } from 'react';

const SECTIONS = [
  {
    title: '🎬 Game Flow',
    entries: [
      { term: 'Seasons', desc: 'The game spans 5 seasons. Each season you make one film through 4 phases: Greenlight → Casting → Production → Release. Between seasons you can shop for upgrades.' },
      { term: 'Greenlight', desc: 'Pick a script for your film. Each script has a genre, base score, and cast slots. Matching the genre to Hot trends and market conditions gives bonus earnings.' },
      { term: 'Casting', desc: 'Fill your talent slots. Each actor/director adds their cards to your production deck. High Skill = great cards. High Heat = powerful cards AND risky Incident cards.' },
      { term: 'Production', desc: 'The core gameplay phase. Draw 2 cards, keep 1. Incidents auto-play — if you accumulate 3, it\'s a DISASTER and you lose all quality. You can wrap early to play it safe.' },
      { term: 'Release', desc: 'Your quality × market conditions × reputation = box office. Hit the target to avoid a strike. After release, you head to the shop for upgrades.' },
      { term: 'Off-Season Shop', desc: 'Buy studio perks for permanent bonuses, hire new talent, or train existing talent to improve their cards.' },
    ],
  },
  {
    title: '🏷️ Keywords',
    entries: [
      { term: '🔥 Momentum', desc: 'Rewards streaks — cards get stronger the more Momentum cards you play in a row. Great for aggressive, high-tempo productions.' },
      { term: '🎯 Precision', desc: 'Rewards careful play — bonuses for clean wraps (no incidents) and consistent quality. Best for risk-averse strategies.' },
      { term: '💀 Chaos', desc: 'High risk, high reward — some Chaos cards get STRONGER when incidents happen. Dangerous but powerful if you can survive.' },
      { term: '💕 Heart', desc: 'Synergy-focused — Heart cards reward chemistry pairs and ensemble casts. Build a tight-knit crew for maximum effect.' },
      { term: '✨ Spectacle', desc: 'Big finishes — Spectacle cards are strongest in late draws. Save your best for the climax of production.' },
    ],
  },
  {
    title: '🃏 Card Types',
    entries: [
      { term: 'Action Cards', desc: 'Good cards (green). You choose which to keep from your draw. They add quality to your film.' },
      { term: 'Challenge Cards', desc: 'Gamble cards (yellow). Accept or decline a bet — succeed for bonus quality, fail for a penalty.' },
      { term: 'Incident Cards', desc: 'Bad cards (red). They auto-play when drawn. Accumulate 3 incidents and it\'s a DISASTER — you lose ALL quality.' },
    ],
  },
  {
    title: '⭐ Core Mechanics',
    entries: [
      { term: 'Reputation', desc: 'Star rating (1–5). Multiplies all box office earnings. Drops when you miss targets. If it hits 0, game over.' },
      { term: 'Strikes', desc: 'Miss a box office target = 1 strike. 3 strikes and you\'re fired! Some challenge modes change the limit.' },
      { term: 'Chemistry', desc: 'Certain talent pairs have natural chemistry. Cast them together for bonus quality. Look for the 💕 icon during casting.' },
      { term: 'Budget', desc: 'Your money to hire talent and buy perks. Overspending creates debt that reduces future earnings.' },
      { term: 'Box Office Target', desc: 'The earnings goal your film must hit each season. Increases as you progress. Missing it earns a strike.' },
    ],
  },
  {
    title: '🏛️ Studio & Progression',
    entries: [
      { term: 'Studio Archetype', desc: 'Chosen at the start of each run. Shapes your strategy — e.g. Prestige studios get critic bonuses, Blockbuster studios earn more $$$.' },
      { term: 'Prestige (XP)', desc: 'Cross-run progression. Earn XP from completed runs to level up your studio legacy. Higher prestige unlocks veteran perks and increases difficulty.' },
      { term: 'Genre Mastery', desc: 'Track record with each genre across all runs. Produce enough films in a genre to earn mastery tiers (Bronze → Silver → Gold → Platinum) with quality bonuses.' },
      { term: 'Legacy Perks', desc: 'Permanent bonuses earned from milestone achievements. They carry over between runs and give small advantages.' },
      { term: 'New Game+', desc: 'Unlocked after winning. Replay with 1.4× targets for a greater challenge and higher scores.' },
      { term: 'Director Mode', desc: 'The ultimate challenge. 1.8× targets. For experienced players only.' },
    ],
  },
  {
    title: '🎭 Advanced',
    entries: [
      { term: 'Encore', desc: 'After wrapping production, risk ONE more card draw. Success = bonus quality. Failure = lose some quality. High risk, high reward.' },
      { term: 'Director\'s Cut', desc: 'Once per production, peek at the top 3 cards in your deck and rearrange them. Helps you plan your draws.' },
      { term: 'Director\'s Vision', desc: 'A conditional goal set each production (e.g. "play 3+ Momentum cards"). Fulfilling it grants +5 quality; failing costs −2.' },
      { term: 'Script Rewrite', desc: 'Spend $3M mid-production to swap one card in your deck for a new random card. Useful for ditching a known bad draw.' },
      { term: 'Reshoots (Perk)', desc: 'The Reshoots Budget perk lets you redraw 1 production card per film during production — a safety net for bad draws.' },
      { term: 'Reshoots ($5M)', desc: 'After wrapping, spend $5M to re-roll all incident cards. 45% become good footage, 30% mild issues, 25% worse. Risky but can save a bad shoot.' },
      { term: 'Extended Cut', desc: 'After a HIT or better, spend $3M to release a Director\'s Extended Cut for 30-50% of original box office. Uses your next film slot.' },
      { term: 'Completion Bond', desc: 'Insurance perk: if your next film FLOPs, it\'s upgraded to a MISS (no strike). One-use — consumed when triggered.' },
      { term: 'Archetype Focus', desc: 'When 50%+ of your played cards share a keyword tag, you get escalating quality bonuses. The higher the percentage, the bigger the bonus.' },
      { term: 'Season Events', desc: 'Between seasons, industry news shakes things up. Pick one event to shape your next season — they add strategic variety to every run.' },
      { term: 'Daily Runs', desc: 'A daily seeded challenge with special modifiers. Everyone gets the same seed — compete for the best score. Builds a daily streak.' },
    ],
  },
  {
    title: '🏟️ Competition',
    entries: [
      { term: 'Rival Studios', desc: 'Three AI-controlled rival studios compete alongside you each season. Their films affect market conditions and season narrative.' },
      { term: 'Rivalry Leaderboard', desc: 'Cumulative box office rankings across all seasons. Finishing ahead of rivals earns bonus prestige XP.' },
      { term: 'Legendary Scripts', desc: 'Rare scripts with unique abilities and higher base scores. They cost more and appear randomly — a powerful but risky pick.' },
      { term: 'Elite Talent', desc: 'Top-tier talent with unique powerful cards but very high Heat. Worth it if you can handle the extra incident risk.' },
    ],
  },
  {
    title: '🎭 Genres',
    entries: [
      { term: 'Action', desc: 'High-energy films. Often paired with Spectacle and Momentum keywords.' },
      { term: 'Comedy', desc: 'Crowd-pleasers. Good baseline earnings with Heart and Chaos cards.' },
      { term: 'Drama', desc: 'Award magnets. Pairs well with Precision and Heart keywords.' },
      { term: 'Horror', desc: 'Low budget, high upside. Chaos and Momentum cards thrive here.' },
      { term: 'Sci-Fi', desc: 'Expensive but rewarding. Spectacle-heavy with big finishes.' },
      { term: 'Romance', desc: 'Chemistry-dependent. Heart cards and talent pairs are essential.' },
      { term: 'Thriller', desc: 'Balanced risk/reward. Precision and Chaos both work well.' },
    ],
  },
];

export default function Glossary({ onClose }: { onClose: () => void }) {
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? SECTIONS.map(s => ({
        ...s,
        entries: s.entries.filter(
          e =>
            e.term.toLowerCase().includes(search.toLowerCase()) ||
            e.desc.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(s => s.entries.length > 0)
    : SECTIONS;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 640, maxHeight: '85vh', overflow: 'auto' }}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h2 style={{ color: 'var(--gold)', marginBottom: 4, fontSize: '1.4rem' }}>📖 Encyclopedia</h2>
        <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: 16 }}>
          Everything you need to know about running a movie studio.
        </p>

        {/* Search */}
        <input
          type="text"
          placeholder="Search mechanics..."
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
            marginBottom: 16,
            outline: 'none',
            boxSizing: 'border-box',
          }}
          autoFocus
        />

        {filtered.length === 0 && (
          <p style={{ color: '#666', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>
            No results for "{search}"
          </p>
        )}

        {filtered.map((section, si) => {
          const isExpanded = search.trim() ? true : expandedSection === si;
          return (
            <div key={section.title} style={{ marginBottom: 8 }}>
              <button
                onClick={() => !search.trim() && setExpandedSection(isExpanded ? null : si)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: isExpanded ? 'rgba(212,168,67,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isExpanded ? 'var(--gold-dim)' : '#222'}`,
                  borderRadius: 8,
                  padding: '12px 16px',
                  color: isExpanded ? 'var(--gold)' : '#aaa',
                  fontFamily: 'Bebas Neue',
                  fontSize: '1rem',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {section.title}
                <span style={{ fontSize: '0.8rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : '' }}>▾</span>
              </button>
              {isExpanded && (
                <div style={{ padding: '8px 0' }}>
                  {section.entries.map(entry => (
                    <div
                      key={entry.term}
                      style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      <div style={{ color: '#ddd', fontSize: '0.88rem', fontWeight: 700, marginBottom: 4 }}>
                        {entry.term}
                      </div>
                      <div style={{ color: '#999', fontSize: '0.8rem', lineHeight: 1.6 }}>
                        {entry.desc}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
