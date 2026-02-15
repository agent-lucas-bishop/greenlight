import { Script, Talent, CardTemplate, StudioPerk, MarketCondition, Genre, SynergyContext, TalentType } from './types';

let _id = 0;
const uid = () => `id_${_id++}`;

const GENRES: Genre[] = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];

// ─── HELPER: synergy builders ───

const noSynergy = null;

function hasCardType(type: string) {
  return (ctx: SynergyContext) => {
    const found = ctx.playedCards.some(c => c.sourceType === type);
    return found ? { bonus: 0, description: '' } : { bonus: 0 };
  };
}

// ─── LEAD ACTORS ───

const JAKE_STEELE: Omit<Talent, 'id'> = {
  name: 'Jake Steele',
  type: 'Lead',
  skill: 4,
  heat: 2,
  cost: 10,
  genreBonus: { genre: 'Action', bonus: 2 },
  trait: 'Action Hero',
  traitDesc: '+2 quality with Action scripts',
  cards: [
    {
      name: 'Steele Jaw Clench',
      baseQuality: 2,
      synergyText: '+1 if an Action Script card was already played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'script' && c.name.includes('Chase') || c.name.includes('Explosion') || c.name.includes('Fight') || c.name.includes('Stunt') || c.name.includes('Fury'));
        return has ? { bonus: 1, description: 'Action Script synergy!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'One-Liner',
      baseQuality: 2,
      synergyText: '+1 for each other Actor card played this round',
      synergyCondition: (ctx) => {
        const count = ctx.playedCards.filter(c => c.sourceType === 'actor').length;
        return count > 0 ? { bonus: count, description: `${count} Actor card${count > 1 ? 's' : ''} boost!` } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Training Montage',
      baseQuality: 3,
      synergyText: 'None',
      synergyCondition: noSynergy,
      riskTag: '🟢',
    },
    {
      name: 'Phoned It In',
      baseQuality: 0,
      synergyText: 'No effect — wasted draw',
      synergyCondition: noSynergy,
      riskTag: '🟡',
    },
    {
      name: 'Paparazzi Snap',
      baseQuality: -1,
      synergyText: 'Lose $1M',
      synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'Paparazzi cost $1M!' }),
      riskTag: '🔴',
    },
  ],
};

const VALENTINA_CORTEZ: Omit<Talent, 'id'> = {
  name: 'Valentina Cortez',
  type: 'Lead',
  skill: 5,
  heat: 4,
  cost: 18,
  trait: 'Diva',
  traitDesc: 'Incredible talent. Absolute chaos magnet.',
  cards: [
    {
      name: 'Iconic Performance',
      baseQuality: 4,
      synergyText: '+2 if Director card already played this round',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'director');
        return has ? { bonus: 2, description: 'Director elevated the performance!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Awards Clip',
      baseQuality: 3,
      synergyText: '+3 if this is the 4th+ card drawn',
      synergyCondition: (ctx) => ctx.drawNumber >= 4 ? { bonus: 3, description: 'Late-round payoff!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Onset Chemistry',
      baseQuality: 2,
      synergyText: '+3 if another Actor card already played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'actor');
        return has ? { bonus: 3, description: 'Chemistry with co-star!' } : { bonus: 0 };
      },
      riskTag: '🟡',
    },
    {
      name: 'Diva Meltdown',
      baseQuality: 0,
      synergyText: '-2 quality, pay $3M',
      synergyCondition: () => ({ bonus: -2, budgetMod: -3, description: 'Diva demands met at $3M!' }),
      riskTag: '🔴',
    },
    {
      name: 'Scandal! TMZ Exclusive',
      baseQuality: -2,
      synergyText: 'All future Actor cards this round get -1',
      synergyCondition: () => ({ bonus: 0, description: 'Scandal poisons the set!' }),
      riskTag: '🔴',
      special: 'poisonActors',
    },
  ],
  heatCards: [
    {
      name: 'Late Night Partying',
      baseQuality: -1,
      synergyText: 'Next Actor card gets -1',
      synergyCondition: () => ({ bonus: 0, description: 'Valentina was out late...' }),
      riskTag: '🔴',
      special: 'poisonNext',
    },
  ],
};

const MARCUS_WEBB: Omit<Talent, 'id'> = {
  name: 'Marcus Webb',
  type: 'Lead',
  skill: 5,
  heat: 3,
  cost: 15,
  trait: 'Method Actor',
  traitDesc: 'Disappears into roles. Incredible when directed well.',
  cards: [
    {
      name: 'Transformative Performance',
      baseQuality: 4,
      synergyText: '+2 if a Director card was already played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'director');
        return has ? { bonus: 2, description: 'Director brought out his best!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Stayed In Character',
      baseQuality: 3,
      synergyText: '+1 per Script card played this round',
      synergyCondition: (ctx) => {
        const count = ctx.playedCards.filter(c => c.sourceType === 'script').length;
        return count > 0 ? { bonus: count, description: `${count} Script card${count > 1 ? 's' : ''} fuel the method!` } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Improvised Brilliance',
      baseQuality: 2,
      synergyText: '+2 if NO Crew cards played yet',
      synergyCondition: (ctx) => {
        const hasCrew = ctx.playedCards.some(c => c.sourceType === 'crew');
        return !hasCrew ? { bonus: 2, description: 'No crew interference — pure improv!' } : { bonus: 0 };
      },
      riskTag: '🟡',
    },
    {
      name: 'Refused Direction',
      baseQuality: 0,
      synergyText: 'Cancels the bonus of the last Director card',
      synergyCondition: () => ({ bonus: 0, description: 'Marcus refused direction!' }),
      riskTag: '🔴',
      special: 'cancelLastDirector',
    },
    {
      name: 'Onset Altercation',
      baseQuality: -1,
      synergyText: 'Next card drawn gets -2',
      synergyCondition: () => ({ bonus: 0, description: 'Fight on set!' }),
      riskTag: '🔴',
      special: 'poisonNext',
    },
  ],
};

const SOPHIE_CHEN: Omit<Talent, 'id'> = {
  name: 'Sophie Chen',
  type: 'Lead',
  skill: 3,
  heat: 1,
  cost: 6,
  trait: 'Rising Star',
  traitDesc: '+1 Skill after each successful film',
  cards: [
    {
      name: 'Quiet Intensity',
      baseQuality: 2,
      synergyText: '+2 if total cards played ≤ 3',
      synergyCondition: (ctx) => ctx.playedCards.length <= 2 ? { bonus: 2, description: 'Restraint rewarded!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Breakout Moment',
      baseQuality: 2,
      synergyText: '+1 per successful film she\'s been in (grows!)',
      synergyCondition: () => ({ bonus: 0 }), // handled dynamically based on season history
      riskTag: '🟢',
    },
    {
      name: 'Natural Talent',
      baseQuality: 2,
      synergyText: 'None',
      synergyCondition: noSynergy,
      riskTag: '🟢',
    },
    {
      name: 'Nervous Energy',
      baseQuality: 1,
      synergyText: '-1 if this is the 5th+ card drawn',
      synergyCondition: (ctx) => ctx.drawNumber >= 5 ? { bonus: -1, description: 'Pressure got to her!' } : { bonus: 0 },
      riskTag: '🟡',
    },
    {
      name: 'Overwhelmed',
      baseQuality: 0,
      synergyText: 'No effect — blank',
      synergyCondition: noSynergy,
      riskTag: '🟡',
    },
  ],
};

const ALL_LEADS: Omit<Talent, 'id'>[] = [JAKE_STEELE, VALENTINA_CORTEZ, MARCUS_WEBB, SOPHIE_CHEN];

// ─── SUPPORTING ACTORS ───

const DANNY_PARK: Omit<Talent, 'id'> = {
  name: 'Danny Park',
  type: 'Support',
  skill: 3,
  heat: 0,
  cost: 5,
  trait: 'Ensemble Player',
  traitDesc: 'Combos with everyone',
  cards: [
    {
      name: 'Scene Stealer',
      baseQuality: 1,
      synergyText: '+2 if a Lead Actor card was already played',
      synergyCondition: (ctx) => {
        // Check if any card from a Lead source was played
        const has = ctx.playedCards.some(c => c.sourceType === 'actor' && c.source !== 'Danny Park');
        return has ? { bonus: 2, description: 'Stole the scene from the lead!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Ensemble Energy',
      baseQuality: 1,
      synergyText: '+1 for EACH other card played this round',
      synergyCondition: (ctx) => {
        const count = ctx.playedCards.length;
        return count > 0 ? { bonus: count, description: `+${count} from ensemble energy!` } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Solid Take',
      baseQuality: 2,
      synergyText: 'None',
      synergyCondition: noSynergy,
      riskTag: '🟢',
    },
  ],
};

const ROXANNE_BLAZE: Omit<Talent, 'id'> = {
  name: 'Roxanne Blaze',
  type: 'Support',
  skill: 2,
  heat: 3,
  cost: 7,
  trait: 'Tabloid Queen',
  traitDesc: 'Weaponizes chaos',
  cards: [
    {
      name: 'Viral Moment',
      baseQuality: 1,
      synergyText: '+3 if any 🔴 card was already played this round',
      synergyCondition: (ctx) => ctx.redCount > 0 ? { bonus: 3, description: 'Turned scandal into content!' } : { bonus: 0 },
      riskTag: '🟡',
    },
    {
      name: 'Drama On Set',
      baseQuality: -1,
      synergyText: 'All Actor cards get +1 for rest of round',
      synergyCondition: () => ({ bonus: 0, description: 'Drama fuels the actors!' }),
      riskTag: '🔴',
      special: 'buffActors',
    },
    {
      name: 'Tabloid Distraction',
      baseQuality: -2,
      synergyText: 'Lose $2M',
      synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'Tabloids cost $2M!' }),
      riskTag: '🔴',
    },
  ],
};

const OLD_RELIABLE: Omit<Talent, 'id'> = {
  name: 'Old Reliable',
  type: 'Support',
  skill: 3,
  heat: 0,
  cost: 5,
  trait: 'Veteran',
  traitDesc: 'Pure support. Makes everyone better.',
  cards: [
    {
      name: 'Steady Presence',
      baseQuality: 2,
      synergyText: 'None',
      synergyCondition: noSynergy,
      riskTag: '🟢',
    },
    {
      name: 'Mentor Moment',
      baseQuality: 1,
      synergyText: '+2 if a low-Heat Actor card was played',
      synergyCondition: (ctx) => {
        // Check for any actor card from a low-heat source
        const has = ctx.playedCards.some(c => c.sourceType === 'actor');
        return has ? { bonus: 2, description: 'Mentored the young star!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Brings Out The Best',
      baseQuality: 0,
      synergyText: 'Next card drawn gets +2',
      synergyCondition: () => ({ bonus: 0, description: 'Buffing the next draw!' }),
      riskTag: '🟢',
      special: 'buffNext',
    },
  ],
};

const ALL_SUPPORTS: Omit<Talent, 'id'>[] = [DANNY_PARK, ROXANNE_BLAZE, OLD_RELIABLE];

// ─── DIRECTORS ───

const AVA_THORNTON: Omit<Talent, 'id'> = {
  name: 'Ava Thornton',
  type: 'Director',
  skill: 5,
  heat: 1,
  cost: 14,
  trait: 'Auteur',
  traitDesc: 'The multiplier. Late-game powerhouse.',
  cards: [
    {
      name: "Auteur's Vision",
      baseQuality: 1,
      synergyText: 'Multiply total quality by ×1.3',
      synergyCondition: (ctx) => {
        return { bonus: 0, multiply: 1.3, description: 'Auteur\'s Vision multiplied everything!' };
      },
      riskTag: '🟢',
    },
    {
      name: 'Meticulous Framing',
      baseQuality: 2,
      synergyText: '+2 if a Crew card was already played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'crew');
        return has ? { bonus: 2, description: 'Crew set up the perfect shot!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Artistic Disagreement',
      baseQuality: 0,
      synergyText: 'Reroll the next card (draw 2, pick better)',
      synergyCondition: () => ({ bonus: 0, description: 'Artistic differences...' }),
      riskTag: '🟡',
      special: 'rerollNext',
    },
    {
      name: 'Perfection Paralysis',
      baseQuality: -1,
      synergyText: 'You MUST draw at least 1 more card',
      synergyCondition: () => ({ bonus: 0, description: 'Ava demands another take!' }),
      riskTag: '🔴',
      special: 'forceExtraDraw',
    },
  ],
};

const RICK_BLASTER: Omit<Talent, 'id'> = {
  name: 'Rick Blaster',
  type: 'Director',
  skill: 3,
  heat: 0,
  cost: 6,
  trait: 'Commercial Hack',
  traitDesc: 'Safe. Boring. Granite floor.',
  cards: [
    {
      name: 'By The Numbers',
      baseQuality: 2,
      synergyText: 'None',
      synergyCondition: noSynergy,
      riskTag: '🟢',
    },
    {
      name: 'Focus Group Approved',
      baseQuality: 2,
      synergyText: '+1 if total quality is between 10-25',
      synergyCondition: (ctx) => (ctx.totalQuality >= 10 && ctx.totalQuality <= 25) ? { bonus: 1, description: 'Focus groups love it!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Studio-Friendly Cut',
      baseQuality: 1,
      synergyText: 'Remove 1 🔴 card from remaining deck',
      synergyCondition: () => ({ bonus: 0, description: 'Removed a danger card!' }),
      riskTag: '🟢',
      special: 'removeRed',
    },
    {
      name: 'Uninspired Coverage',
      baseQuality: 1,
      synergyText: 'None',
      synergyCondition: noSynergy,
      riskTag: '🟢',
    },
  ],
};

const KENJI_MURAKAMI: Omit<Talent, 'id'> = {
  name: 'Kenji Murakami',
  type: 'Director',
  skill: 4,
  heat: 2,
  cost: 11,
  trait: 'Genre Visionary',
  traitDesc: 'Rewards genre-focused builds.',
  cards: [
    {
      name: 'Genre Mastery',
      baseQuality: 1,
      synergyText: '+3 if 2+ Script cards already played',
      synergyCondition: (ctx) => {
        const count = ctx.playedCards.filter(c => c.sourceType === 'script').length;
        return count >= 2 ? { bonus: 3, description: 'Genre mastery achieved!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Visual Spectacle',
      baseQuality: 3,
      synergyText: '+1 per Crew card played this round',
      synergyCondition: (ctx) => {
        const count = ctx.playedCards.filter(c => c.sourceType === 'crew').length;
        return count > 0 ? { bonus: count, description: `${count} Crew card${count > 1 ? 's' : ''} enhance the visuals!` } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Experimental Choice',
      baseQuality: 0,
      synergyText: 'Look at next 3 cards, pick 1',
      synergyCondition: () => ({ bonus: 0, description: 'Experimenting...' }),
      riskTag: '🟡',
      special: 'peek3',
    },
    {
      name: 'Lost The Thread',
      baseQuality: -1,
      synergyText: 'If no Script cards played yet, -2 more',
      synergyCondition: (ctx) => {
        const hasScript = ctx.playedCards.some(c => c.sourceType === 'script');
        return !hasScript ? { bonus: -2, description: 'No script cards to guide him!' } : { bonus: 0 };
      },
      riskTag: '🔴',
    },
  ],
};

const ALL_DIRECTORS: Omit<Talent, 'id'>[] = [AVA_THORNTON, RICK_BLASTER, KENJI_MURAKAMI];

// ─── CREW ───

const STANDARD_GRIP_TEAM: Omit<Talent, 'id'> = {
  name: 'Standard Grip Team',
  type: 'Crew',
  skill: 2,
  heat: 0,
  cost: 3,
  cards: [
    {
      name: 'Clean Setup',
      baseQuality: 2,
      synergyText: 'None',
      synergyCondition: noSynergy,
      riskTag: '🟢',
    },
    {
      name: 'Smooth Operation',
      baseQuality: 1,
      synergyText: '+1 if another Crew card already played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'crew');
        return has ? { bonus: 1, description: 'Crew coordination!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Overtime',
      baseQuality: 1,
      synergyText: 'Lose $1M',
      synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'Overtime costs $1M' }),
      riskTag: '🟡',
    },
  ],
};

const MARIA_SANTOS: Omit<Talent, 'id'> = {
  name: 'Maria Santos',
  type: 'Crew',
  skill: 4,
  heat: 0,
  cost: 10,
  trait: 'Cinematographer',
  traitDesc: 'Award-winning. Pure value.',
  cards: [
    {
      name: 'Gorgeous Shot',
      baseQuality: 3,
      synergyText: '+1 if Director card already played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'director');
        return has ? { bonus: 1, description: 'Director guided the shot!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Golden Hour Magic',
      baseQuality: 2,
      synergyText: '+2 if this is draw 3, 4, or 5',
      synergyCondition: (ctx) => (ctx.drawNumber >= 3 && ctx.drawNumber <= 5) ? { bonus: 2, description: 'Golden hour timing!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Technical Precision',
      baseQuality: 2,
      synergyText: 'None',
      synergyCondition: noSynergy,
      riskTag: '🟢',
    },
  ],
};

const QUICK_FIX_PRODUCTIONS: Omit<Talent, 'id'> = {
  name: 'Quick Fix Productions',
  type: 'Crew',
  skill: 1,
  heat: 0,
  cost: 1,
  trait: 'Budget Crew',
  traitDesc: 'Cheap. Duct tape fixes.',
  cards: [
    {
      name: 'Gets The Job Done',
      baseQuality: 1,
      synergyText: 'None',
      synergyCondition: noSynergy,
      riskTag: '🟢',
    },
    {
      name: 'Duct Tape Fix',
      baseQuality: 1,
      synergyText: 'Cancel -1 quality from last 🔴 card',
      synergyCondition: (ctx) => {
        return ctx.redCount > 0 ? { bonus: 1, description: 'Duct tape saves the day!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Equipment Failure',
      baseQuality: -1,
      synergyText: 'None',
      synergyCondition: noSynergy,
      riskTag: '🔴',
    },
  ],
};

const ALL_CREW: Omit<Talent, 'id'>[] = [STANDARD_GRIP_TEAM, MARIA_SANTOS, QUICK_FIX_PRODUCTIONS];

// ─── SCRIPTS WITH CARD DECKS ───

const NIGHTMARE_ALLEY_CARDS: CardTemplate[] = [
  {
    name: 'Jump Scare',
    baseQuality: 2,
    synergyText: '+2 if NO cards played yet (opening shock)',
    synergyCondition: (ctx) => ctx.playedCards.length === 0 ? { bonus: 2, description: 'Opening shock!' } : { bonus: 0 },
    riskTag: '🟢',
  },
  {
    name: 'Building Dread',
    baseQuality: 1,
    synergyText: '+1 per card already played this round',
    synergyCondition: (ctx) => {
      const count = ctx.playedCards.length;
      return count > 0 ? { bonus: count, description: `Dread builds... +${count}!` } : { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'The Reveal',
    baseQuality: 3,
    synergyText: '+2 if this is the 4th+ card',
    synergyCondition: (ctx) => ctx.drawNumber >= 4 ? { bonus: 2, description: 'The big reveal!' } : { bonus: 0 },
    riskTag: '🟢',
  },
  {
    name: 'Creepy Atmosphere',
    baseQuality: 2,
    synergyText: '+1 if a Director card was already played',
    synergyCondition: (ctx) => {
      const has = ctx.playedCards.some(c => c.sourceType === 'director');
      return has ? { bonus: 1, description: 'Director set the mood!' } : { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'Gore Backlash',
    baseQuality: -1,
    synergyText: '-1 per Actor card played',
    synergyCondition: (ctx) => {
      const count = ctx.playedCards.filter(c => c.sourceType === 'actor').length;
      return count > 0 ? { bonus: -count, description: `Stars hated this! -${count}` } : { bonus: 0 };
    },
    riskTag: '🔴',
  },
  {
    name: 'Cursed Set',
    baseQuality: -2,
    synergyText: 'Bad luck on set',
    synergyCondition: () => ({ bonus: 0, description: 'The set is cursed!' }),
    riskTag: '🔴',
  },
];

const LAUGH_RIOT_CARDS: CardTemplate[] = [
  {
    name: 'Perfect Timing',
    baseQuality: 2,
    synergyText: '+2 if the previous card was also 🟢',
    synergyCondition: (ctx) => {
      if (ctx.previousCard && ctx.previousCard.riskTag === '🟢') {
        return { bonus: 2, description: 'Green streak combo!' };
      }
      return { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'Improv Gold',
    baseQuality: 2,
    synergyText: '+2 if an Actor card was played immediately before',
    synergyCondition: (ctx) => {
      if (ctx.previousCard && ctx.previousCard.sourceType === 'actor') {
        return { bonus: 2, description: 'Actor set up the improv!' };
      }
      return { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'Running Gag',
    baseQuality: 1,
    synergyText: '+1 for each Script card already played',
    synergyCondition: (ctx) => {
      const count = ctx.playedCards.filter(c => c.sourceType === 'script').length;
      return count > 0 ? { bonus: count, description: `The gag gets funnier! +${count}` } : { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'Physical Comedy',
    baseQuality: 2,
    synergyText: '+1 if a Crew card was played',
    synergyCondition: (ctx) => {
      const has = ctx.playedCards.some(c => c.sourceType === 'crew');
      return has ? { bonus: 1, description: 'Crew set up the stunt!' } : { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'Joke Falls Flat',
    baseQuality: 0,
    synergyText: 'If previous card was 🔴, this becomes -2',
    synergyCondition: (ctx) => {
      if (ctx.previousCard && ctx.previousCard.riskTag === '🔴') {
        return { bonus: -2, description: 'Bad vibe killed the joke!' };
      }
      return { bonus: 0 };
    },
    riskTag: '🟡',
  },
  {
    name: 'Offensive Bit',
    baseQuality: -1,
    synergyText: '-2 more if any 🔴 Actor card played this round',
    synergyCondition: (ctx) => {
      const hasRedActor = ctx.playedCards.some(c => c.sourceType === 'actor' && c.riskTag === '🔴');
      return hasRedActor ? { bonus: -2, description: 'Scandal made it worse!' } : { bonus: 0 };
    },
    riskTag: '🔴',
  },
];

const BROKEN_CROWN_CARDS: CardTemplate[] = [
  {
    name: 'Emotional Climax',
    baseQuality: 3,
    synergyText: '+2 if 2+ Actor cards played this round',
    synergyCondition: (ctx) => {
      const count = ctx.playedCards.filter(c => c.sourceType === 'actor').length;
      return count >= 2 ? { bonus: 2, description: 'Actors carried the scene!' } : { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'Subtle Writing',
    baseQuality: 2,
    synergyText: '+2 if Director card already played',
    synergyCondition: (ctx) => {
      const has = ctx.playedCards.some(c => c.sourceType === 'director');
      return has ? { bonus: 2, description: 'Director elevated the script!' } : { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'Character Study',
    baseQuality: 2,
    synergyText: '+1 per unique card type played',
    synergyCondition: (ctx) => {
      const types = new Set(ctx.playedCards.map(c => c.sourceType));
      return types.size > 0 ? { bonus: types.size, description: `${types.size} unique types = ensemble excellence!` } : { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'Awards Bait Monologue',
    baseQuality: 3,
    synergyText: '+3 if Lead Actor Skill is 4+',
    synergyCondition: (ctx) => ctx.leadSkill >= 4 ? { bonus: 3, description: 'Star delivered the monologue!' } : { bonus: 0 },
    riskTag: '🟢',
  },
  {
    name: 'Pacing Issues',
    baseQuality: 0,
    synergyText: 'If 3+ Script cards played, -2',
    synergyCondition: (ctx) => {
      const count = ctx.playedCards.filter(c => c.sourceType === 'script').length;
      return count >= 3 ? { bonus: -2, description: 'Too many script scenes — pacing drags!' } : { bonus: 0 };
    },
    riskTag: '🟡',
  },
  {
    name: 'Pretentious Drivel',
    baseQuality: -2,
    synergyText: 'If quality under 10, -2 more',
    synergyCondition: (ctx) => ctx.totalQuality < 10 ? { bonus: -2, description: 'Pretension without substance!' } : { bonus: 0 },
    riskTag: '🔴',
  },
];

const NEON_FURY_CARDS: CardTemplate[] = [
  {
    name: 'Chase Sequence',
    baseQuality: 3,
    synergyText: 'None — just solid',
    synergyCondition: noSynergy,
    riskTag: '🟢',
  },
  {
    name: 'Explosion!',
    baseQuality: 2,
    synergyText: '+2 if a Crew card was played',
    synergyCondition: (ctx) => {
      const has = ctx.playedCards.some(c => c.sourceType === 'crew');
      return has ? { bonus: 2, description: 'Practical effects!' } : { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'Fight Choreography',
    baseQuality: 2,
    synergyText: '+2 if an Actor with Skill 4+ was played',
    synergyCondition: (ctx) => ctx.leadSkill >= 4 ? { bonus: 2, description: 'Star nailed the choreography!' } : { bonus: 0 },
    riskTag: '🟢',
  },
  {
    name: 'Stunt Goes Wrong',
    baseQuality: 3,
    synergyText: 'Coin flip: heads +3, tails -2',
    synergyCondition: () => {
      const heads = Math.random() > 0.5;
      return heads
        ? { bonus: 3, description: '🪙 Heads! Stunt was AMAZING!' }
        : { bonus: -5, description: '🪙 Tails! Stunt went WRONG!' }; // -5 because baseQuality is +3, net = -2
    },
    riskTag: '🟡',
    special: 'coinFlip',
  },
  {
    name: 'CGI Overload',
    baseQuality: 1,
    synergyText: '-1 per Crew card played',
    synergyCondition: (ctx) => {
      const count = ctx.playedCards.filter(c => c.sourceType === 'crew').length;
      return count > 0 ? { bonus: -count, description: `CGI replaces craft... -${count}` } : { bonus: 0 };
    },
    riskTag: '🟡',
  },
  {
    name: 'Bloated Runtime',
    baseQuality: -1,
    synergyText: 'If 5+ cards drawn, -2 more',
    synergyCondition: (ctx) => ctx.drawNumber >= 5 ? { bonus: -2, description: 'Movie is too long!' } : { bonus: 0 },
    riskTag: '🔴',
  },
];

// ─── SCRIPT DEFINITIONS ───

export const ALL_SCRIPTS: Omit<Script, 'id'>[] = [
  {
    title: 'Nightmare Alley',
    genre: 'Horror',
    baseScore: 7,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 3,
    cards: NIGHTMARE_ALLEY_CARDS,
    ability: 'finalGirl',
    abilityDesc: 'Final Girl: If you wrap after exactly 5 draws, +5 bonus quality',
  },
  {
    title: 'Laugh Riot',
    genre: 'Comedy',
    baseScore: 5,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 1,
    cards: LAUGH_RIOT_CARDS,
    ability: 'crowdPleaser',
    abilityDesc: 'Crowd Pleaser: For every 3 consecutive 🟢 cards, +2 bonus',
  },
  {
    title: 'Broken Crown',
    genre: 'Drama',
    baseScore: 8,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 5,
    cards: BROKEN_CROWN_CARDS,
    ability: 'prestige',
    abilityDesc: 'Prestige: Quality above 35 counts double for nominations',
  },
  {
    title: 'Neon Fury',
    genre: 'Action',
    baseScore: 6,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 2,
    cards: NEON_FURY_CARDS,
    ability: 'blockbusterBonus',
    abilityDesc: 'Blockbuster: Box office market multiplier gets +0.3',
  },
];

// ─── GENERATION FUNCTIONS ───

export function generateScripts(count: number, _season: number): Script[] {
  const pool = [...ALL_SCRIPTS];
  const result: Script[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const s = pool.splice(idx, 1)[0];
    result.push({ ...s, id: uid() });
  }
  return result;
}

function makeTalent(template: Omit<Talent, 'id'>): Talent {
  return { ...template, id: uid() };
}

export function generateTalentMarket(count: number, _season: number): Talent[] {
  // Pick from named talent pools
  const allPools: { pool: Omit<Talent, 'id'>[]; weight: number }[] = [
    { pool: ALL_LEADS, weight: 2 },
    { pool: ALL_SUPPORTS, weight: 1.5 },
    { pool: ALL_DIRECTORS, weight: 1.5 },
    { pool: ALL_CREW, weight: 1 },
  ];

  const result: Talent[] = [];
  const usedNames = new Set<string>();

  // Ensure at least one of each core type
  const ensureTypes: Omit<Talent, 'id'>[][] = [ALL_LEADS, ALL_DIRECTORS, ALL_CREW];
  for (const pool of ensureTypes) {
    if (result.length >= count) break;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!usedNames.has(pick.name)) {
      usedNames.add(pick.name);
      result.push(makeTalent(pick));
    }
  }

  // Fill remaining
  while (result.length < count) {
    const allTalent = [...ALL_LEADS, ...ALL_SUPPORTS, ...ALL_DIRECTORS, ...ALL_CREW];
    const pick = allTalent[Math.floor(Math.random() * allTalent.length)];
    if (!usedNames.has(pick.name)) {
      usedNames.add(pick.name);
      result.push(makeTalent(pick));
    }
    // Safety: if all names used, break
    if (usedNames.size >= allTalent.length) break;
  }

  return result;
}

export function starterRoster(): Talent[] {
  return [
    makeTalent(SOPHIE_CHEN),
    makeTalent(RICK_BLASTER),
    makeTalent(STANDARD_GRIP_TEAM),
  ];
}

export function neowTalent(): Talent {
  return makeTalent({
    ...VALENTINA_CORTEZ,
    cost: 0,
    trait: 'Past Their Prime',
    traitDesc: '-1 Skill per season. Was incredible. Fading fast.',
  });
}

// ─── MARKET CONDITIONS ───

export const ALL_MARKETS: Omit<MarketCondition, 'id'>[] = [
  { name: 'Blockbuster Summer', description: 'Action & Sci-Fi ×1.5', genreBonus: 'Action', multiplier: 1.5 },
  { name: 'Awards Season', description: 'Drama ×2.0', genreBonus: 'Drama', multiplier: 2.0 },
  { name: 'Horror Renaissance', description: 'Horror ×1.8', genreBonus: 'Horror', multiplier: 1.8 },
  { name: 'Comedy Boom', description: 'Comedy ×1.5', genreBonus: 'Comedy', multiplier: 1.5 },
  { name: 'Date Night Wave', description: 'Romance ×1.6', genreBonus: 'Romance', multiplier: 1.6 },
  { name: 'Sci-Fi Craze', description: 'Sci-Fi ×1.7', genreBonus: 'Sci-Fi', multiplier: 1.7 },
  { name: 'Thriller Season', description: 'Thriller ×1.6', genreBonus: 'Thriller', multiplier: 1.6 },
  { name: 'Quiet Month', description: 'No genre bonus ×1.0', multiplier: 1.0 },
  { name: 'Streaming Wars', description: 'All films ×0.8', multiplier: 0.8 },
  { name: 'Oscar Bait Season', description: 'Quality > 30 gets ×1.8', multiplier: 1.8, condition: 'quality>30' },
];

export function generateMarketConditions(count: number): MarketCondition[] {
  const pool = [...ALL_MARKETS];
  const result: MarketCondition[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push({ ...pool.splice(idx, 1)[0], id: uid() });
  }
  return result;
}

// ─── STUDIO PERKS ───

export const ALL_PERKS: Omit<StudioPerk, 'id'>[] = [
  { name: 'Reshoots Budget', cost: 12, description: 'Redraw 1 production card per film', effect: 'reshoots' },
  { name: 'Casting Network', cost: 8, description: 'See 6 talent in market instead of 4', effect: 'moreTalent' },
  { name: 'Marketing Machine', cost: 10, description: 'Choose your market condition', effect: 'chooseMarket' },
  { name: 'Independent Spirit', cost: 6, description: 'If total Heat ≤ 4, +×0.5 mult', effect: 'indieSpirit' },
  { name: 'Genre Specialist', cost: 5, description: 'Pick a genre for permanent +×0.3', effect: 'genreSpec' },
  { name: 'Crisis Manager', cost: 8, description: '🔴 card quality penalties halved', effect: 'crisisManager' },
  { name: 'Buzz Machine', cost: 10, description: 'If quality > 35, +×0.5 mult', effect: 'buzz' },
  { name: 'Insurance Policy', cost: 15, description: 'Disasters reduce quality 25% instead of 50%', effect: 'insurance' },
  { name: 'Precision Filmmaking', cost: 8, description: 'Clean Wrap bonus increased to +8', effect: 'precisionFilm' },
  { name: 'Prestige Label', cost: 12, description: 'Award nominations give +×0.3 mult', effect: 'prestige' },
  { name: 'Talent Scout', cost: 7, description: 'Peek at talent before hiring', effect: 'talentScout' },
  { name: 'Development Slate', cost: 6, description: 'See 4 scripts instead of 3', effect: 'devSlate' },
];

export function generatePerkMarket(count: number, owned: string[]): StudioPerk[] {
  const pool = ALL_PERKS.filter(p => !owned.includes(p.name));
  const result: StudioPerk[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push({ ...pool.splice(idx, 1)[0], id: uid() });
  }
  return result;
}

export function getSeasonTarget(season: number): number {
  return [25, 40, 55, 70, 90][season - 1] || 90 + (season - 5) * 20;
}

export const INDUSTRY_EVENTS = [
  'Superhero Fatigue — Action films get -×0.3 next season',
  'Indie Boom — Films with total Heat ≤ 3 get +5 quality',
  'Tax Incentives — All hiring costs 20% less',
  'Sequel Mania — Base scores +2 next season',
  'Streaming Surge — Budget targets relaxed',
  'Award Season Hype — Drama gets extra love',
  'Horror Wave — Horror is trending',
  'Comedy Renaissance — Everyone needs a laugh',
];
