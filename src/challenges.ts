// Challenge Modes — unique rule modifiers for replayability

export interface ChallengeMode {
  id: string;
  name: string;
  emoji: string;
  description: string;
  rules: string[]; // displayed to player
  scoreMultiplier: number; // applied to final score
  unlockRequirement?: string; // shown when locked
  unlockCheck?: (stats: { totalWins: number; challengesCompleted: string[] }) => boolean;
}

export const CHALLENGE_MODES: ChallengeMode[] = [
  {
    id: 'one_take',
    name: 'One Take',
    emoji: '🎥',
    description: 'No wrapping early. You must draw every card.',
    rules: [
      'Cannot wrap production early — must draw all cards',
      'Encore is disabled',
      'Director\'s Cut still available',
    ],
    scoreMultiplier: 1.5,
  },
  {
    id: 'shoestring',
    name: 'Shoestring Budget',
    emoji: '💸',
    description: 'Start with only $8M. Every dollar counts.',
    rules: [
      'Starting budget reduced to $8M (from $15M)',
      'Season stipend reduced to $3M',
      'Shop perk prices +$1',
    ],
    scoreMultiplier: 1.8,
  },
  {
    id: 'critics_choice',
    name: 'Critics\' Choice',
    emoji: '📝',
    description: 'Quality targets are 50% higher. Only excellence survives.',
    rules: [
      'All box office targets ×1.5',
      'FLOP penalty: lose 2 reputation instead of 1',
      'But BLOCKBUSTER gives +$10M extra bonus',
    ],
    scoreMultiplier: 1.6,
  },
  {
    id: 'typecast',
    name: 'Typecast',
    emoji: '🎭',
    description: 'Must make the same genre every season.',
    rules: [
      'Your first script\'s genre locks in for all 5 seasons',
      'Only scripts matching your locked genre appear',
      'Genre mastery accumulates faster (+3 per film instead of +2)',
    ],
    scoreMultiplier: 1.4,
  },
  {
    id: 'speed_run',
    name: 'Speed Run',
    emoji: '⚡',
    description: 'Only 3 seasons to prove yourself.',
    rules: [
      'Game ends after 3 seasons instead of 5',
      'Targets are seasons 2/3/4 difficulty',
      '2 strikes = fired (instead of 3)',
    ],
    scoreMultiplier: 2.0,
  },
  {
    id: 'chaos_reigns',
    name: 'Chaos Reigns',
    emoji: '🌪️',
    description: 'Every talent gets +2 Heat. Incidents everywhere.',
    rules: [
      'All talent Heat increased by 2',
      'More incident cards in every deck',
      'But incidents give +1 quality each',
    ],
    scoreMultiplier: 1.7,
  },
  // ─── NEW CHALLENGE MODES (R68) ───
  {
    id: 'auteur',
    name: 'Auteur Mode',
    emoji: '🎬',
    description: 'One director for the entire run. Their vision, your studio.',
    rules: [
      'Only 1 Director allowed on your roster for the entire run',
      'That director must direct every film',
      'Each consecutive film with same director: +3 quality bonus',
      'Firing your director costs $10M and 1 reputation',
    ],
    scoreMultiplier: 1.6,
    unlockRequirement: 'Win 1 run',
    unlockCheck: (stats) => stats.totalWins >= 1,
  },
  {
    id: 'budget_hell',
    name: 'Budget Hell',
    emoji: '🔥',
    description: 'Start broke. Everything costs more. But the box office rewards...',
    rules: [
      'Starting budget: $5M (instead of $15M)',
      'All talent hiring costs +$2',
      'All perk costs +$2',
      'Box office multiplier ×1.5 on all films',
    ],
    scoreMultiplier: 2.0,
    unlockRequirement: 'Win 2 runs',
    unlockCheck: (stats) => stats.totalWins >= 2,
  },
  {
    id: 'critics_only',
    name: 'Critics Only',
    emoji: '⭐',
    description: 'Reputation is everything. Reach 5 stars to win.',
    rules: [
      'Win condition: reach 5-star reputation (not just survive)',
      'Box office doesn\'t count toward winning — only reputation',
      'Reputation gains +1 from every HIT or better',
      'Reputation loss doubled on FLOPs (-2 instead of -1)',
      'You still need money to make films!',
    ],
    scoreMultiplier: 1.8,
    unlockRequirement: 'Complete any challenge',
    unlockCheck: (stats) => stats.challengesCompleted.length >= 1,
  },
  {
    id: 'marathon',
    name: 'Marathon',
    emoji: '🏃',
    description: '8 seasons. The ultimate endurance test.',
    rules: [
      '8 seasons instead of 5',
      'Box office targets scale up: Season 6 = $74M, S7 = $86M, S8 = $98M',
      '4 strikes allowed (instead of 3)',
      'Score multiplier applies to a longer run',
    ],
    scoreMultiplier: 1.5,
    unlockRequirement: 'Win 3 runs',
    unlockCheck: (stats) => stats.totalWins >= 3,
  },
];

export function getChallengeById(id: string): ChallengeMode | undefined {
  return CHALLENGE_MODES.find(c => c.id === id);
}

export function isChallengeUnlocked(challenge: ChallengeMode, stats: { totalWins: number; challengesCompleted: string[] }): boolean {
  if (!challenge.unlockCheck) return true; // original challenges always unlocked
  return challenge.unlockCheck(stats);
}
