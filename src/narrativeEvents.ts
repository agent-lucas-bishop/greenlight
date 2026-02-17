/*
 * ══════════════════════════════════════════════════════════════════════
 * R263 — Narrative Events System
 * ══════════════════════════════════════════════════════════════════════
 * Rich narrative events that fire between productions, organized by
 * category: Industry, Personal, Creative, Financial.
 * Supports chaining (Part 1 → Part 2), rarity tiers, and multiple
 * choice outcomes with stat/reputation/budget effects.
 * ══════════════════════════════════════════════════════════════════════
 */

import type { GameState } from './types';

// ── Types ──────────────────────────────────────────────────────────

export type NarrativeCategory = 'industry' | 'personal' | 'creative' | 'financial';
export type NarrativeRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface NarrativeOutcome {
  reputation: number;
  budget: number;
  morale: number;
  label: string;
  /** Optional: unlock a card template id as reward */
  cardReward?: string;
}

export interface NarrativeChoice {
  text: string;
  outcome: NarrativeOutcome;
  /** If set, choosing this unlocks the chain event with this id */
  chainsTo?: string;
}

export interface NarrativeEvent {
  id: string;
  category: NarrativeCategory;
  rarity: NarrativeRarity;
  title: string;
  portrait: string;
  gradient: string;          // CSS gradient for illustration area
  flavorText: string;        // italic preamble
  dialog: string[];
  choices: NarrativeChoice[];
  /** Trigger predicate — event eligible when this returns true */
  trigger: (state: GameState, firedIds: Set<string>, chainUnlocked: Set<string>) => boolean;
  /** If this is a chain sequel, the id of the prerequisite choice's chainsTo */
  chainFrom?: string;
}

// ── Helpers ────────────────────────────────────────────────────────

function season(s: GameState): number { return s.season; }
function rep(s: GameState): number { return s.reputation; }
function budget(s: GameState): number { return s.budget; }
function films(s: GameState): number { return s.seasonHistory.length; }
function notFired(id: string, fired: Set<string>): boolean { return !fired.has(id); }
function chainReady(id: string, unlocked: Set<string>): boolean { return unlocked.has(id); }

// ── Event Pool ─────────────────────────────────────────────────────

export const NARRATIVE_EVENTS: NarrativeEvent[] = [

  // ════════════════════════════════════════════════════════════════
  // INDUSTRY EVENTS
  // ════════════════════════════════════════════════════════════════

  {
    id: 'streaming_wars_1',
    category: 'industry',
    rarity: 'common',
    title: 'The Streaming Wars',
    portrait: '📺',
    gradient: 'linear-gradient(135deg, #1a0a2e 0%, #16213e 50%, #0f3460 100%)',
    flavorText: 'The landscape is shifting beneath your feet.',
    dialog: [
      'Three streaming giants announce exclusive content deals on the same day.',
      'Theater chains are panicking. Your distribution strategy needs rethinking.',
      'Do you ride the wave or hold the line?',
    ],
    choices: [
      { text: 'Sign an exclusive streaming deal — guaranteed revenue', outcome: { reputation: -1, budget: 12, morale: 0, label: '−1 ⭐, +$12M' } },
      { text: 'Double down on theatrical — cinemas need champions', outcome: { reputation: 1, budget: -3, morale: 2, label: '+1 ⭐, −$3M, +2 morale' } },
      { text: 'Hybrid release — play both sides', outcome: { reputation: 0, budget: 5, morale: 1, label: '+$5M, +1 morale' } },
    ],
    trigger: (s, f) => notFired('streaming_wars_1', f) && season(s) >= 2 && films(s) >= 2,
  },

  {
    id: 'theater_crisis',
    category: 'industry',
    rarity: 'uncommon',
    title: 'Theater Chain Collapse',
    portrait: '🏚️',
    gradient: 'linear-gradient(135deg, #2d1b00 0%, #4a2c0a 50%, #1a1a1a 100%)',
    flavorText: 'The biggest theater chain just filed for bankruptcy.',
    dialog: [
      'MegaPlex Entertainment, owner of 3,000 screens, declares Chapter 11.',
      'Box office projections for everyone just cratered.',
      'But their prime real estate is suddenly available…',
    ],
    choices: [
      { text: 'Buy distressed theater locations — vertical integration', outcome: { reputation: 0, budget: -8, morale: 0, label: '−$8M now, future BO bonus' }, chainsTo: 'theater_empire' },
      { text: 'Pivot to streaming-first releases', outcome: { reputation: -1, budget: 6, morale: 1, label: '−1 ⭐, +$6M, +1 morale' } },
    ],
    trigger: (s, f) => notFired('theater_crisis', f) && season(s) >= 3 && budget(s) >= 10,
  },

  {
    id: 'theater_empire',
    category: 'industry',
    rarity: 'rare',
    title: 'Theater Empire Rising',
    portrait: '🏛️',
    gradient: 'linear-gradient(135deg, #1a0a00 0%, #8b6914 50%, #4a2c0a 100%)',
    flavorText: 'Your theater acquisition is paying off.',
    dialog: [
      'Your renovated theaters are drawing crowds with premium experiences.',
      'Other studios want screen time. You have leverage.',
      'Time to decide what kind of exhibitor you want to be.',
    ],
    choices: [
      { text: 'Open screens to all studios — goodwill matters', outcome: { reputation: 2, budget: 5, morale: 2, label: '+2 ⭐, +$5M, +2 morale' } },
      { text: 'Prioritize your own films — maximize advantage', outcome: { reputation: -1, budget: 10, morale: 0, label: '−1 ⭐, +$10M' } },
    ],
    chainFrom: 'theater_empire',
    trigger: (s, f, c) => notFired('theater_empire', f) && chainReady('theater_empire', c) && season(s) >= 5,
  },

  {
    id: 'foreign_market_boom',
    category: 'industry',
    rarity: 'common',
    title: 'Foreign Market Boom',
    portrait: '🌏',
    gradient: 'linear-gradient(135deg, #0a1628 0%, #1a3a5c 50%, #2a5a8c 100%)',
    flavorText: 'International audiences are hungry for content.',
    dialog: [
      'Asian and European markets are exploding with demand.',
      'Your films could reach millions of new viewers.',
      'But localization and cultural sensitivity cost money and attention.',
    ],
    choices: [
      { text: 'Invest in localization — build a global brand', outcome: { reputation: 1, budget: -4, morale: 1, label: '+1 ⭐, −$4M, +1 morale' } },
      { text: 'License cheaply — quick cash, limited control', outcome: { reputation: 0, budget: 7, morale: 0, label: '+$7M' } },
      { text: 'Co-produce with international studios', outcome: { reputation: 1, budget: 2, morale: 2, label: '+1 ⭐, +$2M, +2 morale' } },
    ],
    trigger: (s, f) => notFired('foreign_market_boom', f) && season(s) >= 2 && rep(s) >= 2,
  },

  {
    id: 'ai_filmmaking',
    category: 'industry',
    rarity: 'uncommon',
    title: 'The AI Question',
    portrait: '🤖',
    gradient: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 50%, #2a1a4a 100%)',
    flavorText: 'Technology is outpacing the conversation.',
    dialog: [
      'AI-generated scripts and digital actors are making headlines.',
      'The unions are mobilizing. The public is divided.',
      'Your stance will define your studio\'s identity.',
    ],
    choices: [
      { text: 'Embrace AI tools — efficiency is survival', outcome: { reputation: -1, budget: 8, morale: -2, label: '−1 ⭐, +$8M, −2 morale' } },
      { text: 'Pledge human-only productions — take a stand', outcome: { reputation: 2, budget: -3, morale: 3, label: '+2 ⭐, −$3M, +3 morale' } },
    ],
    trigger: (s, f) => notFired('ai_filmmaking', f) && season(s) >= 4 && films(s) >= 3,
  },

  {
    id: 'industry_consolidation',
    category: 'industry',
    rarity: 'rare',
    title: 'Industry Consolidation',
    portrait: '🏢',
    gradient: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #3a3a3a 100%)',
    flavorText: 'The big are getting bigger.',
    dialog: [
      'Two mega-studios announce a merger. The independent scene trembles.',
      'Your studio is now David among Goliaths.',
      'They\'re offering to acquire you. The price is generous.',
    ],
    choices: [
      { text: 'Sell — take the money and retire rich', outcome: { reputation: -2, budget: 20, morale: -3, label: '−2 ⭐, +$20M, −3 morale' } },
      { text: 'Stay independent — rally the underdogs', outcome: { reputation: 2, budget: 0, morale: 4, label: '+2 ⭐, +4 morale' } },
    ],
    trigger: (s, f) => notFired('industry_consolidation', f) && season(s) >= 5 && films(s) >= 5,
  },

  {
    id: 'awards_season_shake',
    category: 'industry',
    rarity: 'common',
    title: 'Awards Season Shakeup',
    portrait: '🏆',
    gradient: 'linear-gradient(135deg, #2a1a00 0%, #6b4c11 50%, #2a1a00 100%)',
    flavorText: 'The Academy is changing the rules.',
    dialog: [
      'New diversity requirements and genre eligibility rules shake up awards season.',
      'Studios are scrambling to adjust their slates.',
    ],
    choices: [
      { text: 'Adapt proactively — diverse stories matter', outcome: { reputation: 1, budget: 0, morale: 2, label: '+1 ⭐, +2 morale' } },
      { text: 'Ignore the politics — make what sells', outcome: { reputation: 0, budget: 4, morale: 0, label: '+$4M' } },
    ],
    trigger: (s, f) => notFired('awards_season_shake', f) && season(s) >= 3,
  },

  // ════════════════════════════════════════════════════════════════
  // PERSONAL EVENTS
  // ════════════════════════════════════════════════════════════════

  {
    id: 'rival_sabotage_1',
    category: 'personal',
    rarity: 'uncommon',
    title: 'Sabotage',
    portrait: '🗡️',
    gradient: 'linear-gradient(135deg, #1a0000 0%, #3a0a0a 50%, #1a0000 100%)',
    flavorText: 'Not everyone plays fair in this town.',
    dialog: [
      'Leaked emails surface — your rival planted a mole in your development team.',
      'Three of your best scripts were stolen and fast-tracked at their studio.',
      'The mole is identified. What do you do?',
    ],
    choices: [
      { text: 'Go public — expose the betrayal to the press', outcome: { reputation: 1, budget: -2, morale: 1, label: '+1 ⭐, −$2M, +1 morale' }, chainsTo: 'rival_sabotage_2' },
      { text: 'Handle it quietly — fire the mole, move on', outcome: { reputation: 0, budget: 0, morale: -1, label: '−1 morale' } },
      { text: 'Feed them bad intel — turn the tables', outcome: { reputation: -1, budget: 3, morale: 3, label: '−1 ⭐, +$3M, +3 morale' } },
    ],
    trigger: (s, f) => notFired('rival_sabotage_1', f) && season(s) >= 3 && s.nemesisStudio !== null,
  },

  {
    id: 'rival_sabotage_2',
    category: 'personal',
    rarity: 'rare',
    title: 'The Reckoning',
    portrait: '⚖️',
    gradient: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #2a1a3e 100%)',
    flavorText: 'Your exposure of the scandal made waves.',
    dialog: [
      'The press coverage was explosive. Your rival\'s stock is tanking.',
      'Their board is in disarray. They\'re offering a settlement.',
      'But some in the industry think you went too far.',
    ],
    choices: [
      { text: 'Accept the settlement — $15M and move on', outcome: { reputation: 0, budget: 15, morale: 0, label: '+$15M' } },
      { text: 'Press the advantage — acquire their talent', outcome: { reputation: -1, budget: -5, morale: 4, label: '−1 ⭐, −$5M, +4 morale' } },
    ],
    chainFrom: 'rival_sabotage_2',
    trigger: (s, f, c) => notFired('rival_sabotage_2', f) && chainReady('rival_sabotage_2', c) && season(s) >= 5,
  },

  {
    id: 'mentor_offer',
    category: 'personal',
    rarity: 'uncommon',
    title: 'The Mentor',
    portrait: '🎓',
    gradient: 'linear-gradient(135deg, #0a1a0a 0%, #1a3a1a 50%, #0a2a0a 100%)',
    flavorText: 'A legend reaches out.',
    dialog: [
      'A legendary producer — three-time Oscar winner — offers to mentor you.',
      '"I see something in your work," they say. "Raw talent, but unfocused."',
      'Their guidance could transform your studio. But they demand total creative control on one project.',
    ],
    choices: [
      { text: 'Accept — give them one project to prove the concept', outcome: { reputation: 1, budget: -3, morale: 4, label: '+1 ⭐, −$3M, +4 morale' }, chainsTo: 'mentor_legacy' },
      { text: 'Decline — your vision, your way', outcome: { reputation: 0, budget: 0, morale: 2, label: '+2 morale' } },
    ],
    trigger: (s, f) => notFired('mentor_offer', f) && season(s) >= 2 && rep(s) >= 2 && films(s) >= 2,
  },

  {
    id: 'mentor_legacy',
    category: 'personal',
    rarity: 'rare',
    title: 'The Mentor\'s Legacy',
    portrait: '🌟',
    gradient: 'linear-gradient(135deg, #0a1a0a 0%, #2a5a2a 50%, #1a3a1a 100%)',
    flavorText: 'The collaboration exceeded all expectations.',
    dialog: [
      'Your mentor\'s project was a masterpiece. Critics are raving.',
      'But now they want to retire and hand you their entire Rolodex.',
      '"Take it all," they say. "Carry the torch."',
    ],
    choices: [
      { text: 'Accept the mantle — become the next generation', outcome: { reputation: 2, budget: 5, morale: 3, label: '+2 ⭐, +$5M, +3 morale' } },
      { text: 'Honor them but forge your own path', outcome: { reputation: 1, budget: 0, morale: 5, label: '+1 ⭐, +5 morale' } },
    ],
    chainFrom: 'mentor_legacy',
    trigger: (s, f, c) => notFired('mentor_legacy', f) && chainReady('mentor_legacy', c) && season(s) >= 4,
  },

  {
    id: 'scandal_tabloid',
    category: 'personal',
    rarity: 'common',
    title: 'Tabloid Frenzy',
    portrait: '📰',
    gradient: 'linear-gradient(135deg, #2a0a0a 0%, #4a1a1a 50%, #2a0a0a 100%)',
    flavorText: 'The tabloids have your scent.',
    dialog: [
      'A gossip outlet publishes fabricated stories about your personal life.',
      'Advertisers are nervous. Your PR team is in crisis mode.',
      'The story is false, but denial only feeds the beast.',
    ],
    choices: [
      { text: 'Sue for defamation — expensive but principled', outcome: { reputation: 1, budget: -5, morale: 1, label: '+1 ⭐, −$5M, +1 morale' } },
      { text: 'Ignore it — let it blow over', outcome: { reputation: -1, budget: 0, morale: -1, label: '−1 ⭐, −1 morale' } },
      { text: 'Leak a bigger story to bury it', outcome: { reputation: 0, budget: -2, morale: 2, label: '−$2M, +2 morale' } },
    ],
    trigger: (s, f) => notFired('scandal_tabloid', f) && season(s) >= 2 && rep(s) >= 3,
  },

  {
    id: 'old_friend',
    category: 'personal',
    rarity: 'common',
    title: 'Old Friend\'s Call',
    portrait: '📞',
    gradient: 'linear-gradient(135deg, #1a1a0a 0%, #2a2a1a 50%, #1a1a0a 100%)',
    flavorText: 'Some debts can\'t be measured in dollars.',
    dialog: [
      'An old film school friend calls. They\'re broke, talented, and desperate.',
      '"I just need one chance," they say. "One film to prove myself."',
      'Their script is brilliant but uncommercial.',
    ],
    choices: [
      { text: 'Give them a shot — talent deserves opportunity', outcome: { reputation: 1, budget: -4, morale: 3, label: '+1 ⭐, −$4M, +3 morale' } },
      { text: 'Pass — you can\'t risk it right now', outcome: { reputation: 0, budget: 0, morale: -2, label: '−2 morale' } },
    ],
    trigger: (s, f) => notFired('old_friend', f) && season(s) >= 2,
  },

  {
    id: 'paparazzi_incident',
    category: 'personal',
    rarity: 'common',
    title: 'Paparazzi Incident',
    portrait: '📸',
    gradient: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a2a 50%, #1a0a2a 100%)',
    flavorText: 'Fame has a price.',
    dialog: [
      'Paparazzi ambush your lead actor at a restaurant. The footage goes viral.',
      'Your actor wants to quit the project in protest.',
      'The publicity is enormous — but at what cost?',
    ],
    choices: [
      { text: 'Support your actor — issue a statement condemning the press', outcome: { reputation: 1, budget: 0, morale: 2, label: '+1 ⭐, +2 morale' } },
      { text: 'Use the publicity — "all press is good press"', outcome: { reputation: -1, budget: 4, morale: -1, label: '−1 ⭐, +$4M, −1 morale' } },
    ],
    trigger: (s, f) => notFired('paparazzi_incident', f) && films(s) >= 3,
  },

  {
    id: 'burnout',
    category: 'personal',
    rarity: 'uncommon',
    title: 'Burnout',
    portrait: '😰',
    gradient: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #0a0a0a 100%)',
    flavorText: 'The machine demands everything.',
    dialog: [
      'You haven\'t slept properly in weeks. The work is consuming you.',
      'Your doctor says stop. Your accountant says keep going.',
      'Something has to give.',
    ],
    choices: [
      { text: 'Take a break — health first', outcome: { reputation: 0, budget: -3, morale: 5, label: '−$3M, +5 morale' } },
      { text: 'Push through — the season won\'t wait', outcome: { reputation: 0, budget: 3, morale: -3, label: '+$3M, −3 morale' } },
    ],
    trigger: (s, f) => notFired('burnout', f) && season(s) >= 4 && films(s) >= 4,
  },

  // ════════════════════════════════════════════════════════════════
  // CREATIVE EVENTS
  // ════════════════════════════════════════════════════════════════

  {
    id: 'writers_block_cure',
    category: 'creative',
    rarity: 'common',
    title: 'The Breakthrough',
    portrait: '✍️',
    gradient: 'linear-gradient(135deg, #0a0a1a 0%, #1a2a4a 50%, #0a1a3a 100%)',
    flavorText: 'Inspiration strikes like lightning.',
    dialog: [
      'Your head writer disappears for three weeks. No calls, no emails.',
      'They return with a script that makes you weep.',
      '"I had to go to the desert," they say. "To find the story."',
    ],
    choices: [
      { text: 'Fast-track the script — strike while the iron is hot', outcome: { reputation: 0, budget: -3, morale: 5, label: '−$3M, +5 morale' } },
      { text: 'Develop it slowly — great art takes time', outcome: { reputation: 1, budget: 0, morale: 3, label: '+1 ⭐, +3 morale' } },
    ],
    trigger: (s, f) => notFired('writers_block_cure', f) && season(s) >= 2,
  },

  {
    id: 'viral_marketing',
    category: 'creative',
    rarity: 'uncommon',
    title: 'Viral Sensation',
    portrait: '📱',
    gradient: 'linear-gradient(135deg, #0a1a0a 0%, #0a3a1a 50%, #1a4a2a 100%)',
    flavorText: 'The internet works in mysterious ways.',
    dialog: [
      'A behind-the-scenes clip from your latest production goes mega-viral.',
      '50 million views in 48 hours. The memes are everywhere.',
      'Your marketing team didn\'t plan this. Do you lean in?',
    ],
    choices: [
      { text: 'Lean in hard — release more clips, ride the wave', outcome: { reputation: 0, budget: 8, morale: 1, label: '+$8M, +1 morale' } },
      { text: 'Stay mysterious — scarcity creates demand', outcome: { reputation: 1, budget: 3, morale: 2, label: '+1 ⭐, +$3M, +2 morale' } },
    ],
    trigger: (s, f) => notFired('viral_marketing', f) && films(s) >= 2 && rep(s) >= 2,
  },

  {
    id: 'critic_feud_1',
    category: 'creative',
    rarity: 'uncommon',
    title: 'The Critic',
    portrait: '🎭',
    gradient: 'linear-gradient(135deg, #1a0a1a 0%, #2a0a2a 50%, #3a1a3a 100%)',
    flavorText: 'Words can wound deeper than any blade.',
    dialog: [
      'The most influential critic in the business publishes a devastating essay about your studio.',
      '"Soulless corporate product masquerading as art," they write.',
      'The piece is trending. Your team is furious.',
    ],
    choices: [
      { text: 'Respond publicly — defend your vision with passion', outcome: { reputation: 0, budget: -2, morale: 3, label: '−$2M, +3 morale' }, chainsTo: 'critic_feud_2' },
      { text: 'Ignore them — let the work speak for itself', outcome: { reputation: 0, budget: 0, morale: 1, label: '+1 morale' } },
      { text: 'Invite them to set — kill them with kindness', outcome: { reputation: 1, budget: -1, morale: 2, label: '+1 ⭐, −$1M, +2 morale' } },
    ],
    trigger: (s, f) => notFired('critic_feud_1', f) && season(s) >= 3 && films(s) >= 3,
  },

  {
    id: 'critic_feud_2',
    category: 'creative',
    rarity: 'rare',
    title: 'The Critic\'s Concession',
    portrait: '🤝',
    gradient: 'linear-gradient(135deg, #1a1a0a 0%, #3a3a1a 50%, #2a2a0a 100%)',
    flavorText: 'Respect is earned, not given.',
    dialog: [
      'Your passionate defense went viral. The critic was impressed by your conviction.',
      'They publish a follow-up: "I was wrong. This studio has heart."',
      'They want to do a sit-down interview. Exclusive.',
    ],
    choices: [
      { text: 'Do the interview — cement the narrative shift', outcome: { reputation: 2, budget: 3, morale: 3, label: '+2 ⭐, +$3M, +3 morale' } },
      { text: 'Decline gracefully — the work already spoke', outcome: { reputation: 1, budget: 0, morale: 4, label: '+1 ⭐, +4 morale' } },
    ],
    chainFrom: 'critic_feud_2',
    trigger: (s, f, c) => notFired('critic_feud_2', f) && chainReady('critic_feud_2', c) && season(s) >= 5,
  },

  {
    id: 'auteur_vision',
    category: 'creative',
    rarity: 'common',
    title: 'Auteur\'s Demand',
    portrait: '🎥',
    gradient: 'linear-gradient(135deg, #1a0a00 0%, #3a2a1a 50%, #2a1a0a 100%)',
    flavorText: 'Genius doesn\'t negotiate.',
    dialog: [
      'Your most talented director demands final cut on their next film.',
      '"No studio notes, no test screenings, no compromises."',
      'Their last film won three awards. But their ego is legendary.',
    ],
    choices: [
      { text: 'Grant final cut — trust the artist', outcome: { reputation: 1, budget: -2, morale: 4, label: '+1 ⭐, −$2M, +4 morale' } },
      { text: 'Refuse — this is a business, not a gallery', outcome: { reputation: 0, budget: 3, morale: -1, label: '+$3M, −1 morale' } },
    ],
    trigger: (s, f) => notFired('auteur_vision', f) && films(s) >= 3 && rep(s) >= 3,
  },

  {
    id: 'genre_revolution',
    category: 'creative',
    rarity: 'uncommon',
    title: 'Genre Revolution',
    portrait: '🔄',
    gradient: 'linear-gradient(135deg, #1a0a2e 0%, #2a1a4e 50%, #1a0a2e 100%)',
    flavorText: 'The old rules don\'t apply anymore.',
    dialog: [
      'A micro-budget film from an unknown studio redefines an entire genre.',
      'Audiences are rejecting formulaic content. They want something new.',
      'Your development team has a wild pitch that could ride this wave.',
    ],
    choices: [
      { text: 'Greenlight the wild pitch — be bold', outcome: { reputation: 1, budget: -5, morale: 4, label: '+1 ⭐, −$5M, +4 morale' } },
      { text: 'Study the trend first — data before instinct', outcome: { reputation: 0, budget: 0, morale: 1, label: '+1 morale' } },
    ],
    trigger: (s, f) => notFired('genre_revolution', f) && season(s) >= 3,
  },

  {
    id: 'documentary_opportunity',
    category: 'creative',
    rarity: 'common',
    title: 'The Untold Story',
    portrait: '🎞️',
    gradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2a 50%, #0a0a1a 100%)',
    flavorText: 'Some stories demand to be told.',
    dialog: [
      'A whistleblower approaches you with explosive material for a documentary.',
      'The story could change lives — but powerful people want it buried.',
      'Legal is nervous. Your conscience is louder.',
    ],
    choices: [
      { text: 'Make the documentary — truth matters more than comfort', outcome: { reputation: 2, budget: -6, morale: 4, label: '+2 ⭐, −$6M, +4 morale' } },
      { text: 'Pass — not worth the legal risk', outcome: { reputation: 0, budget: 2, morale: -2, label: '+$2M, −2 morale' } },
    ],
    trigger: (s, f) => notFired('documentary_opportunity', f) && season(s) >= 3 && rep(s) >= 2,
  },

  {
    id: 'soundtrack_hit',
    category: 'creative',
    rarity: 'common',
    title: 'Unexpected Hit',
    portrait: '🎵',
    gradient: 'linear-gradient(135deg, #1a0a2e 0%, #2a1a3e 50%, #3a2a4e 100%)',
    flavorText: 'Music moves in mysterious ways.',
    dialog: [
      'The soundtrack from your last film is climbing the charts.',
      'A pop star wants to sample it. Streaming royalties are pouring in.',
      'Your composer is thrilled — and demanding a raise.',
    ],
    choices: [
      { text: 'Give the raise — happy artists make better art', outcome: { reputation: 0, budget: -2, morale: 3, label: '−$2M, +3 morale' } },
      { text: 'Monetize aggressively — license everything', outcome: { reputation: 0, budget: 6, morale: 0, label: '+$6M' } },
    ],
    trigger: (s, f) => notFired('soundtrack_hit', f) && films(s) >= 2,
  },

  // ════════════════════════════════════════════════════════════════
  // FINANCIAL EVENTS
  // ════════════════════════════════════════════════════════════════

  {
    id: 'investor_strings_1',
    category: 'financial',
    rarity: 'uncommon',
    title: 'The Investor',
    portrait: '💰',
    gradient: 'linear-gradient(135deg, #0a1a0a 0%, #1a3a0a 50%, #0a2a0a 100%)',
    flavorText: 'Money always comes with strings.',
    dialog: [
      'A tech billionaire wants to invest $20M in your studio.',
      'The catch: they want a seat on the board and veto power over "risky" projects.',
      '"I only back winners," they say with a shark\'s smile.',
    ],
    choices: [
      { text: 'Take the money — you can manage one board seat', outcome: { reputation: -1, budget: 20, morale: -2, label: '−1 ⭐, +$20M, −2 morale' }, chainsTo: 'investor_strings_2' },
      { text: 'Decline — creative freedom is non-negotiable', outcome: { reputation: 1, budget: 0, morale: 3, label: '+1 ⭐, +3 morale' } },
    ],
    trigger: (s, f) => notFired('investor_strings_1', f) && season(s) >= 3 && budget(s) < 15,
  },

  {
    id: 'investor_strings_2',
    category: 'financial',
    rarity: 'rare',
    title: 'The Investor\'s Ultimatum',
    portrait: '⚠️',
    gradient: 'linear-gradient(135deg, #2a0a0a 0%, #4a0a0a 50%, #2a0a0a 100%)',
    flavorText: 'The strings are tightening.',
    dialog: [
      'Your investor is vetoing your passion project. "Too arthouse," they say.',
      '"Make something commercial or I pull the funding."',
      'The board is split. This is a power struggle now.',
    ],
    choices: [
      { text: 'Buy them out — pay back the investment to regain control', outcome: { reputation: 1, budget: -15, morale: 5, label: '+1 ⭐, −$15M, +5 morale' } },
      { text: 'Comply — make the commercial film, bide your time', outcome: { reputation: -1, budget: 8, morale: -3, label: '−1 ⭐, +$8M, −3 morale' } },
    ],
    chainFrom: 'investor_strings_2',
    trigger: (s, f, c) => notFired('investor_strings_2', f) && chainReady('investor_strings_2', c) && season(s) >= 5,
  },

  {
    id: 'tax_audit',
    category: 'financial',
    rarity: 'uncommon',
    title: 'The Audit',
    portrait: '🔍',
    gradient: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%)',
    flavorText: 'The taxman cometh.',
    dialog: [
      'The IRS is auditing your studio. Seven years of records under the microscope.',
      'Your accountant found some "creative" deductions from before your time.',
      'It\'s not fraud, but it\'s not great either.',
    ],
    choices: [
      { text: 'Cooperate fully — pay the back taxes and penalties', outcome: { reputation: 1, budget: -8, morale: 1, label: '+1 ⭐, −$8M, +1 morale' } },
      { text: 'Fight it in court — your lawyers say it\'s defensible', outcome: { reputation: 0, budget: -3, morale: -1, label: '−$3M, −1 morale' } },
    ],
    trigger: (s, f) => notFired('tax_audit', f) && season(s) >= 4 && budget(s) >= 10,
  },

  {
    id: 'sponsorship_deal',
    category: 'financial',
    rarity: 'common',
    title: 'Brand Deal',
    portrait: '🤑',
    gradient: 'linear-gradient(135deg, #1a2a0a 0%, #2a4a1a 50%, #1a3a0a 100%)',
    flavorText: 'Everyone wants a piece of the magic.',
    dialog: [
      'A luxury car brand wants prominent product placement in your next film.',
      'The money is significant: $8M guaranteed.',
      'But your director calls it "selling your soul."',
    ],
    choices: [
      { text: 'Take the deal — it\'s just business', outcome: { reputation: -1, budget: 8, morale: -1, label: '−1 ⭐, +$8M, −1 morale' } },
      { text: 'Refuse — artistic integrity over cash', outcome: { reputation: 1, budget: 0, morale: 2, label: '+1 ⭐, +2 morale' } },
      { text: 'Negotiate — subtle placement, higher fee', outcome: { reputation: 0, budget: 5, morale: 1, label: '+$5M, +1 morale' } },
    ],
    trigger: (s, f) => notFired('sponsorship_deal', f) && films(s) >= 2,
  },

  {
    id: 'crypto_scheme',
    category: 'financial',
    rarity: 'uncommon',
    title: 'The NFT Pitch',
    portrait: '🪙',
    gradient: 'linear-gradient(135deg, #0a0a2e 0%, #1a0a4e 50%, #0a0a2e 100%)',
    flavorText: 'Web3 meets Hollywood.',
    dialog: [
      'A tech startup wants to tokenize your film catalog as NFTs.',
      '"Fans can own a piece of cinema history!" they pitch enthusiastically.',
      'Your legal team has concerns. Your finance team sees dollar signs.',
    ],
    choices: [
      { text: 'Pass — this smells like a bubble', outcome: { reputation: 1, budget: 0, morale: 1, label: '+1 ⭐, +1 morale' } },
      { text: 'Do a limited run — test the waters', outcome: { reputation: 0, budget: 5, morale: 0, label: '+$5M' } },
    ],
    trigger: (s, f) => notFired('crypto_scheme', f) && season(s) >= 3,
  },

  {
    id: 'insurance_windfall',
    category: 'financial',
    rarity: 'common',
    title: 'Insurance Windfall',
    portrait: '📋',
    gradient: 'linear-gradient(135deg, #0a1a1a 0%, #1a2a2a 50%, #0a1a1a 100%)',
    flavorText: 'Sometimes the fine print works in your favor.',
    dialog: [
      'A natural disaster damaged your backlot, but insurance covers everything.',
      'The payout is more than the damage. You have a surplus.',
      'Your CFO suggests investing it. Your creative team wants new soundstages.',
    ],
    choices: [
      { text: 'Build new soundstages — invest in capacity', outcome: { reputation: 0, budget: -2, morale: 3, label: '−$2M, +3 morale' } },
      { text: 'Bank the surplus — rainy day fund', outcome: { reputation: 0, budget: 6, morale: 0, label: '+$6M' } },
    ],
    trigger: (s, f) => notFired('insurance_windfall', f) && season(s) >= 2,
  },

  {
    id: 'union_dispute',
    category: 'financial',
    rarity: 'uncommon',
    title: 'Union Standoff',
    portrait: '✊',
    gradient: 'linear-gradient(135deg, #2a1a0a 0%, #4a2a0a 50%, #2a1a0a 100%)',
    flavorText: 'Labor and capital collide.',
    dialog: [
      'The crew union is threatening a strike. They want better pay and conditions.',
      'Your production schedule is at risk. Delays mean millions lost.',
      'But they have a point — the hours have been brutal.',
    ],
    choices: [
      { text: 'Meet their demands — fair pay, better hours', outcome: { reputation: 2, budget: -6, morale: 4, label: '+2 ⭐, −$6M, +4 morale' } },
      { text: 'Negotiate a compromise — split the difference', outcome: { reputation: 0, budget: -3, morale: 1, label: '−$3M, +1 morale' } },
      { text: 'Hire replacements — the show must go on', outcome: { reputation: -2, budget: 2, morale: -3, label: '−2 ⭐, +$2M, −3 morale' } },
    ],
    trigger: (s, f) => notFired('union_dispute', f) && season(s) >= 3 && films(s) >= 3,
  },

  {
    id: 'foreign_investor',
    category: 'financial',
    rarity: 'rare',
    title: 'The Overseas Offer',
    portrait: '🌐',
    gradient: 'linear-gradient(135deg, #0a1a2a 0%, #1a3a5a 50%, #0a2a4a 100%)',
    flavorText: 'Global capital seeks Hollywood glamour.',
    dialog: [
      'A sovereign wealth fund offers to become your studio\'s primary financier.',
      'Unlimited budget for five films. But they pick the subjects.',
      '"Cultural exchange," they call it. Your team calls it propaganda.',
    ],
    choices: [
      { text: 'Accept with conditions — you approve all scripts', outcome: { reputation: 0, budget: 15, morale: 0, label: '+$15M' } },
      { text: 'Decline — your editorial independence isn\'t for sale', outcome: { reputation: 2, budget: 0, morale: 3, label: '+2 ⭐, +3 morale' } },
    ],
    trigger: (s, f) => notFired('foreign_investor', f) && season(s) >= 5 && rep(s) >= 3,
  },

  {
    id: 'merch_empire',
    category: 'financial',
    rarity: 'common',
    title: 'Merchandise Mania',
    portrait: '🧸',
    gradient: 'linear-gradient(135deg, #2a1a2a 0%, #3a2a3a 50%, #2a1a2a 100%)',
    flavorText: 'The real money is in the toys.',
    dialog: [
      'A toy company wants to license your characters for a merchandise line.',
      'Action figures, lunchboxes, the works.',
      'Your characters weren\'t designed for this, but the revenue could be huge.',
    ],
    choices: [
      { text: 'License away — let the merch machine roll', outcome: { reputation: -1, budget: 10, morale: 0, label: '−1 ⭐, +$10M' } },
      { text: 'Curate carefully — quality merch only', outcome: { reputation: 0, budget: 4, morale: 2, label: '+$4M, +2 morale' } },
    ],
    trigger: (s, f) => notFired('merch_empire', f) && films(s) >= 3 && rep(s) >= 2,
  },

  {
    id: 'budget_crisis',
    category: 'financial',
    rarity: 'common',
    title: 'Cash Crunch',
    portrait: '💸',
    gradient: 'linear-gradient(135deg, #1a0a0a 0%, #2a1a1a 50%, #1a0a0a 100%)',
    flavorText: 'The numbers don\'t lie.',
    dialog: [
      'Your CFO delivers grim news: you\'re burning through cash faster than expected.',
      'Without action, you\'ll be insolvent in two seasons.',
      'Hard choices ahead.',
    ],
    choices: [
      { text: 'Cut staff — painful but necessary', outcome: { reputation: -1, budget: 8, morale: -3, label: '−1 ⭐, +$8M, −3 morale' } },
      { text: 'Sell a film\'s rights — quick cash injection', outcome: { reputation: 0, budget: 6, morale: -1, label: '+$6M, −1 morale' } },
      { text: 'Double down — make a hit to save the studio', outcome: { reputation: 0, budget: 0, morale: 4, label: '+4 morale' } },
    ],
    trigger: (s, f) => notFired('budget_crisis', f) && budget(s) < 8 && season(s) >= 3,
  },
];

// ── Runtime ────────────────────────────────────────────────────────

/** Max narrative events per season */
export const MAX_NARRATIVE_PER_SEASON = 2;

/**
 * Check eligible narrative events and return up to `max` events.
 * Respects triggers, rarity weighting, and previously fired events.
 */
export function checkNarrativeEvents(
  state: GameState,
  firedIds: Set<string>,
  chainUnlocked: Set<string>,
  max: number = 1,
): NarrativeEvent[] {
  const eligible = NARRATIVE_EVENTS.filter(e => e.trigger(state, firedIds, chainUnlocked));
  if (eligible.length === 0) return [];

  // Weight by rarity — rarer events are less likely to be picked
  const weights: Record<NarrativeRarity, number> = {
    common: 4,
    uncommon: 2.5,
    rare: 1.5,
    legendary: 0.8,
  };

  // Chain events get priority
  const chains = eligible.filter(e => e.chainFrom);
  const nonChains = eligible.filter(e => !e.chainFrom);

  const picked: NarrativeEvent[] = [];

  // Always include chain events first (up to max)
  for (const c of chains) {
    if (picked.length >= max) break;
    picked.push(c);
  }

  // Fill remaining with weighted random from non-chains
  if (picked.length < max && nonChains.length > 0) {
    const totalWeight = nonChains.reduce((sum, e) => sum + weights[e.rarity], 0);
    const remaining = max - picked.length;
    // Simple weighted pick without replacement
    const pool = [...nonChains];
    for (let i = 0; i < remaining && pool.length > 0; i++) {
      const tw = pool.reduce((sum, e) => sum + weights[e.rarity], 0);
      let roll = Math.random() * tw;
      let pick = pool[0];
      for (const e of pool) {
        roll -= weights[e.rarity];
        if (roll <= 0) { pick = e; break; }
      }
      picked.push(pick);
      pool.splice(pool.indexOf(pick), 1);
    }
  }

  return picked;
}
