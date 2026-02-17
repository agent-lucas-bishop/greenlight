// Challenge Modes — unique rule modifiers for replayability

export interface ChallengeMode {
  id: string;
  name: string;
  emoji: string;
  description: string;
  rules: string[]; // displayed to player
  scoreMultiplier: number; // applied to final score
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
];

export function getChallengeById(id: string): ChallengeMode | undefined {
  return CHALLENGE_MODES.find(c => c.id === id);
}
