import { Script, Talent, CardTemplate, StudioPerk, MarketCondition, Genre, SynergyContext, TalentType, ChallengeBet } from './types';

let _id = 0;
const uid = () => `id_${_id++}`;

const GENRES: Genre[] = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];

const noSynergy = null;

// ─── CHALLENGE BET BUILDERS (future-based: bet on NEXT card drawn) ───

function betNextIsAction(): ChallengeBet {
  return {
    description: 'Bet the next card drawn is an Action card',
    successBonus: 4,
    failPenalty: -3,
    condition: (ctx) => {
      if (ctx.remainingDeck.length === 0) return false;
      return ctx.remainingDeck[0].cardType === 'action';
    },
    oddsHint: (ctx) => {
      const r = ctx.remainingDeck;
      const n = r.filter(c => c.cardType === 'action').length;
      const pct = r.length > 0 ? Math.round(n / r.length * 100) : 0;
      return `${n} of ${r.length} remaining cards are Action (${pct}%)`;
    },
  };
}

function betNextIsFromActor(): ChallengeBet {
  return {
    description: 'Bet the next card is from an Actor source',
    successBonus: 4,
    failPenalty: -3,
    condition: (ctx) => {
      if (ctx.remainingDeck.length === 0) return false;
      return ctx.remainingDeck[0].sourceType === 'actor';
    },
    oddsHint: (ctx) => {
      const r = ctx.remainingDeck;
      const n = r.filter(c => c.sourceType === 'actor').length;
      const pct = r.length > 0 ? Math.round(n / r.length * 100) : 0;
      return `${n} of ${r.length} remaining cards are from Actors (${pct}%)`;
    },
  };
}

function betNextIsHighValue(): ChallengeBet {
  return {
    description: 'Bet the next card has base quality ≥ 1',
    successBonus: 5,
    failPenalty: -3,
    condition: (ctx) => {
      if (ctx.remainingDeck.length === 0) return false;
      return ctx.remainingDeck[0].baseQuality >= 1;
    },
    oddsHint: (ctx) => {
      const r = ctx.remainingDeck;
      const n = r.filter(c => c.baseQuality >= 1).length;
      const pct = r.length > 0 ? Math.round(n / r.length * 100) : 0;
      return `${n} of ${r.length} remaining cards have quality ≥ 1 (${pct}%)`;
    },
  };
}

function betNextIsNotIncident(): ChallengeBet {
  return {
    description: 'Bet the next card is NOT an Incident',
    successBonus: 3,
    failPenalty: -4,
    condition: (ctx) => {
      if (ctx.remainingDeck.length === 0) return false;
      return ctx.remainingDeck[0].cardType !== 'incident';
    },
    oddsHint: (ctx) => {
      const r = ctx.remainingDeck;
      const n = r.filter(c => c.cardType !== 'incident').length;
      const pct = r.length > 0 ? Math.round(n / r.length * 100) : 0;
      return `${n} of ${r.length} remaining cards are NOT Incidents (${pct}%)`;
    },
  };
}

function betNextMatchesSource(sourceType: string): ChallengeBet {
  return {
    description: `Bet the next card is from a ${sourceType} source`,
    successBonus: 4,
    failPenalty: -2,
    condition: (ctx) => {
      if (ctx.remainingDeck.length === 0) return false;
      return ctx.remainingDeck[0].sourceType === sourceType;
    },
    oddsHint: (ctx) => {
      const r = ctx.remainingDeck;
      const n = r.filter(c => c.sourceType === sourceType).length;
      const pct = r.length > 0 ? Math.round(n / r.length * 100) : 0;
      return `${n} of ${r.length} remaining cards are ${sourceType} (${pct}%)`;
    },
  };
}

function betSacrificeForDouble(): ChallengeBet {
  return {
    description: 'Sacrifice next card to DOUBLE your last played card\'s quality. If next is Incident, take its penalty too!',
    successBonus: 0, // handled specially in resolution
    failPenalty: 0,   // handled specially in resolution
    condition: (ctx) => {
      if (ctx.remainingDeck.length === 0) return false;
      return ctx.remainingDeck[0].cardType !== 'incident';
    },
    oddsHint: (ctx) => {
      const r = ctx.remainingDeck;
      const incidents = r.filter(c => c.cardType === 'incident').length;
      const safe = r.length - incidents;
      const pct = r.length > 0 ? Math.round(safe / r.length * 100) : 0;
      return `${safe} of ${r.length} cards are safe (${pct}%). ${incidents} Incidents lurking!`;
    },
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
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if an Action Script card was already played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'script' && (c.name.includes('Chase') || c.name.includes('Explosion') || c.name.includes('Fight') || c.name.includes('Stunt') || c.name.includes('Fury')));
        return has ? { bonus: 2, description: 'Action Script synergy!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'One-Liner',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 for each other Actor card played this round',
      synergyCondition: (ctx) => {
        const count = ctx.playedCards.filter(c => c.sourceType === 'actor').length;
        return count > 0 ? { bonus: Math.min(count * 2, 4), description: `${count} Actor card${count > 1 ? 's' : ''} boost!` } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Training Montage',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+1 if a Crew card was played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'crew');
        return has ? { bonus: 1, description: 'Crew backed the training!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Risky Stunt',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is Action. Win +4, Lose -3',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsAction(),
    },
    {
      name: 'Paparazzi Snap',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Tabloid chaos. Lose $1M.',
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
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+4 if Director card already played this round',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'director');
        return has ? { bonus: 4, description: 'Director elevated the performance!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Awards Clip',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+3 if this is the 4th+ card drawn',
      synergyCondition: (ctx) => ctx.drawNumber >= 4 ? { bonus: 3, description: 'Late-round payoff!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Method Acting',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is from an Actor. Win +4, Lose -3',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsFromActor(),
    },
    {
      name: 'Diva Meltdown',
      cardType: 'incident',
      baseQuality: -5,
      synergyText: 'Diva demands met at $3M!',
      synergyCondition: () => ({ bonus: 0, budgetMod: -3, description: 'Diva demands met at $3M!' }),
      riskTag: '🔴',
    },
    {
      name: 'Scandal! TMZ Exclusive',
      cardType: 'incident',
      baseQuality: -6,
      synergyText: 'Scandal poisons the set!',
      synergyCondition: () => ({ bonus: 0, description: 'Scandal poisons the set!' }),
      riskTag: '🔴',
      special: 'poisonActors',
    },
  ],
  heatCards: [
    {
      name: 'Late Night Partying',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Valentina was out late...',
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
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+3 if a Director card was already played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'director');
        return has ? { bonus: 3, description: 'Director brought out his best!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Stayed In Character',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+1 per Script card played this round (max +3)',
      synergyCondition: (ctx) => {
        const count = ctx.playedCards.filter(c => c.sourceType === 'script').length;
        return count > 0 ? { bonus: Math.min(count, 3), description: `${count} Script card${count > 1 ? 's' : ''} fuel the method!` } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Creative Differences',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card has high value. Win +5, Lose -3',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsHighValue(),
    },
    {
      name: 'Refused Direction',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Marcus refused direction!',
      synergyCondition: () => ({ bonus: 0, description: 'Marcus refused direction!' }),
      riskTag: '🔴',
      special: 'cancelLastDirector',
    },
    {
      name: 'Onset Altercation',
      cardType: 'incident',
      baseQuality: -5,
      synergyText: 'Fight on set!',
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
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if total cards played ≤ 3',
      synergyCondition: (ctx) => ctx.playedCards.length <= 2 ? { bonus: 2, description: 'Restraint rewarded!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Breakout Moment',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+1 per successful film she\'s been in (grows!)',
      synergyCondition: () => ({ bonus: 0 }),
      riskTag: '🟢',
    },
    {
      name: 'Natural Talent',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+1 if another Actor card played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'actor');
        return has ? { bonus: 1, description: 'Chemistry!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Nervous Energy',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is NOT an Incident. Win +3, Lose -4',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsNotIncident(),
    },
    {
      name: 'Overwhelmed',
      cardType: 'incident',
      baseQuality: -3,
      synergyText: 'Pressure got to her',
      synergyCondition: noSynergy,
      riskTag: '🔴',
    },
  ],
};

const LENA_FROST: Omit<Talent, 'id'> = {
  name: 'Lena Frost',
  type: 'Lead',
  skill: 4,
  heat: 1,
  cost: 12,
  genreBonus: { genre: 'Drama', bonus: 2 },
  trait: 'Ice Queen',
  traitDesc: 'Consistent dramatic performances. Low risk, moderate reward.',
  cards: [
    {
      name: 'Cold Precision',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if a Director card was already played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'director');
        return has ? { bonus: 2, description: 'Director channeled the ice!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Withering Glare',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+1 per Actor card played (max +3)',
      synergyCondition: (ctx) => {
        const count = Math.min(ctx.playedCards.filter(c => c.sourceType === 'actor').length, 3);
        return count > 0 ? { bonus: count, description: `${count} actors wilted under her glare!` } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Dramatic Pause',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if this is draw 3+',
      synergyCondition: (ctx) => ctx.drawNumber >= 3 ? { bonus: 2, description: 'Perfectly timed!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Frozen Standoff',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is NOT an Incident. Win +3, Lose -4',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsNotIncident(),
    },
    {
      name: 'Icy Detachment',
      cardType: 'incident',
      baseQuality: -3,
      synergyText: 'Too cold — lost the audience',
      synergyCondition: noSynergy,
      riskTag: '🔴',
    },
  ],
};

const DARIUS_KNOX: Omit<Talent, 'id'> = {
  name: 'Darius Knox',
  type: 'Lead',
  skill: 3,
  heat: 1,
  cost: 8,
  trait: 'Character Actor',
  traitDesc: 'Versatile with many synergies but mediocre base values.',
  cards: [
    {
      name: 'Chameleon Performance',
      cardType: 'action',
      baseQuality: 0,
      synergyText: '+1 per unique source type played (max +4)',
      synergyCondition: (ctx) => {
        const types = new Set(ctx.playedCards.map(c => c.sourceType));
        return types.size > 0 ? { bonus: Math.min(types.size, 4), description: `${types.size} source types = versatility!` } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Accent Work',
      cardType: 'action',
      baseQuality: 0,
      synergyText: '+2 if Script card played, +1 if Director card played',
      synergyCondition: (ctx) => {
        let bonus = 0;
        let desc = '';
        if (ctx.playedCards.some(c => c.sourceType === 'script')) { bonus += 2; desc += 'Script '; }
        if (ctx.playedCards.some(c => c.sourceType === 'director')) { bonus += 1; desc += 'Director '; }
        return bonus > 0 ? { bonus, description: `${desc}synergy!` } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Understated Moment',
      cardType: 'action',
      baseQuality: 0,
      synergyText: '+3 if another Actor card already played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'actor');
        return has ? { bonus: 3, description: 'Chemistry with co-star!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Role Confusion',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is from an Actor. Win +4, Lose -3',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsFromActor(),
    },
    {
      name: 'Overacting',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Went too big for the scene',
      synergyCondition: noSynergy,
      riskTag: '🔴',
    },
  ],
};

const ALL_LEADS: Omit<Talent, 'id'>[] = [JAKE_STEELE, VALENTINA_CORTEZ, MARCUS_WEBB, SOPHIE_CHEN, LENA_FROST, DARIUS_KNOX];

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
      cardType: 'action',
      baseQuality: 0,
      synergyText: '+3 if a Lead Actor card was already played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'actor' && c.source !== 'Danny Park');
        return has ? { bonus: 3, description: 'Stole the scene from the lead!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Ensemble Energy',
      cardType: 'action',
      baseQuality: 0,
      synergyText: '+1 for EACH other card played (max +4)',
      synergyCondition: (ctx) => {
        const count = Math.min(ctx.playedCards.length, 4);
        return count > 0 ? { bonus: count, description: `+${count} from ensemble energy!` } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Budget Overrun',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card matches script source. Win +4, Lose -2',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextMatchesSource('script'),
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
      cardType: 'action',
      baseQuality: 0,
      synergyText: '+4 if any Incident was already played this round',
      synergyCondition: (ctx) => ctx.incidentCount > 0 ? { bonus: 4, description: 'Turned scandal into content!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Drama On Set',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'All Actor cards get +1 for rest of round',
      synergyCondition: () => ({ bonus: 0, description: 'Drama fuels the actors!' }),
      riskTag: '🔴',
      special: 'buffActors',
    },
    {
      name: 'Tabloid Distraction',
      cardType: 'incident',
      baseQuality: -5,
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
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+1 if a Director card played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'director');
        return has ? { bonus: 1, description: 'Steady under direction!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Mentor Moment',
      cardType: 'action',
      baseQuality: 0,
      synergyText: '+3 if a low-Heat Actor card was played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'actor');
        return has ? { bonus: 3, description: 'Mentored the young star!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Brings Out The Best',
      cardType: 'action',
      baseQuality: 0,
      synergyText: 'Next card drawn gets +2',
      synergyCondition: () => ({ bonus: 0, description: 'Buffing the next draw!' }),
      riskTag: '🟢',
      special: 'buffNext',
    },
  ],
};

const MIA_TANAKA: Omit<Talent, 'id'> = {
  name: 'Mia Tanaka',
  type: 'Support',
  skill: 3,
  heat: 1,
  cost: 6,
  trait: 'Scene-Stealer',
  traitDesc: 'Boosts based on Lead Actor cards played.',
  cards: [
    {
      name: 'Spotlight Grab',
      cardType: 'action',
      baseQuality: 0,
      synergyText: '+3 if a Lead Actor card was played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'actor' && c.source !== 'Mia Tanaka');
        return has ? { bonus: 3, description: 'Stole the spotlight!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Perfect Reaction Shot',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if previous card was from an Actor',
      synergyCondition: (ctx) => {
        if (ctx.previousCard && ctx.previousCard.sourceType === 'actor') {
          return { bonus: 2, description: 'Perfect reaction!' };
        }
        return { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Upstaged!',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is Action type. Win +4, Lose -3',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsAction(),
    },
    {
      name: 'Overshadowed Lead',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Lead actor feels threatened',
      synergyCondition: noSynergy,
      riskTag: '🔴',
    },
  ],
};

const HECTOR_MORALES: Omit<Talent, 'id'> = {
  name: 'Hector "Clutch" Morales',
  type: 'Support',
  skill: 2,
  heat: 0,
  cost: 5,
  trait: 'The Fixer',
  traitDesc: 'Reduces Incident damage and recovers from bad draws.',
  cards: [
    {
      name: 'Damage Control',
      cardType: 'action',
      baseQuality: 0,
      synergyText: '+3 if any Incident played this round',
      synergyCondition: (ctx) => ctx.incidentCount > 0 ? { bonus: 3, description: 'Clutch cleaned up the mess!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Steady Hand',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+1 if Crew card played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'crew');
        return has ? { bonus: 1, description: 'Crew coordination!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Crisis Averted',
      cardType: 'action',
      baseQuality: 0,
      synergyText: 'Remove 1 Incident from remaining deck',
      synergyCondition: () => ({ bonus: 0, description: 'Defused a crisis!' }),
      riskTag: '🟢',
      special: 'removeRed',
    },
    {
      name: 'Too Late',
      cardType: 'incident',
      baseQuality: -3,
      synergyText: 'Even the fixer couldn\'t save this one',
      synergyCondition: noSynergy,
      riskTag: '🔴',
    },
  ],
};

const ALL_SUPPORTS: Omit<Talent, 'id'>[] = [DANNY_PARK, ROXANNE_BLAZE, OLD_RELIABLE, MIA_TANAKA, HECTOR_MORALES];

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
      cardType: 'action',
      baseQuality: 0,
      synergyText: 'Multiply total quality by ×1.3',
      synergyCondition: () => {
        return { bonus: 0, multiply: 1.3, description: 'Auteur\'s Vision multiplied everything!' };
      },
      riskTag: '🟢',
    },
    {
      name: 'Meticulous Framing',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if a Crew card was already played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'crew');
        return has ? { bonus: 2, description: 'Crew set up the perfect shot!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Artistic Disagreement',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is from an Actor. Win +4, Lose -3',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsFromActor(),
    },
    {
      name: 'Perfection Paralysis',
      cardType: 'incident',
      baseQuality: -3,
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
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+1 if a Crew card played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'crew');
        return has ? { bonus: 1, description: 'By the book!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Focus Group Approved',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if total quality is between 5-20',
      synergyCondition: (ctx) => (ctx.totalQuality >= 5 && ctx.totalQuality <= 20) ? { bonus: 2, description: 'Focus groups love it!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Studio-Friendly Cut',
      cardType: 'action',
      baseQuality: 0,
      synergyText: 'Remove 1 Incident from remaining deck',
      synergyCondition: () => ({ bonus: 0, description: 'Removed a danger card!' }),
      riskTag: '🟢',
      special: 'removeRed',
    },
    {
      name: 'Uninspired Coverage',
      cardType: 'action',
      baseQuality: 0,
      synergyText: '+1 if 3+ cards played',
      synergyCondition: (ctx) => ctx.playedCards.length >= 3 ? { bonus: 1, description: 'Adequate.' } : { bonus: 0 },
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
      cardType: 'action',
      baseQuality: 0,
      synergyText: '+4 if 2+ Script cards already played',
      synergyCondition: (ctx) => {
        const count = ctx.playedCards.filter(c => c.sourceType === 'script').length;
        return count >= 2 ? { bonus: 4, description: 'Genre mastery achieved!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Visual Spectacle',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 per Crew card played (max +4)',
      synergyCondition: (ctx) => {
        const count = Math.min(ctx.playedCards.filter(c => c.sourceType === 'crew').length, 2);
        return count > 0 ? { bonus: count * 2, description: `${count} Crew card${count > 1 ? 's' : ''} enhance the visuals!` } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Experimental Choice',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card matches crew source. Win +4, Lose -2',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextMatchesSource('crew'),
    },
    {
      name: 'Lost The Thread',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'If no Script cards played yet, -2 more',
      synergyCondition: (ctx) => {
        const hasScript = ctx.playedCards.some(c => c.sourceType === 'script');
        return !hasScript ? { bonus: -2, description: 'No script cards to guide him!' } : { bonus: 0 };
      },
      riskTag: '🔴',
    },
  ],
};

const ZOE_PARK: Omit<Talent, 'id'> = {
  name: 'Zoe Park',
  type: 'Director',
  skill: 4,
  heat: 0,
  cost: 8,
  trait: 'Indie Darling',
  traitDesc: 'Low budget bonuses, high quality ceiling if deck is clean.',
  cards: [
    {
      name: 'Intimate Framing',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+3 if zero Incidents so far',
      synergyCondition: (ctx) => ctx.incidentCount === 0 ? { bonus: 3, description: 'Clean production shines!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Natural Light',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if a Crew card was played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'crew');
        return has ? { bonus: 2, description: 'Crew nailed the naturalism!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Festival Darling',
      cardType: 'action',
      baseQuality: 0,
      synergyText: '+4 if total cards played ≤ 4 and no Incidents',
      synergyCondition: (ctx) => (ctx.playedCards.length <= 3 && ctx.incidentCount === 0) ? { bonus: 4, description: 'Lean and beautiful!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Budget Crunch',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is NOT an Incident. Win +3, Lose -4',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsNotIncident(),
    },
    {
      name: 'Lost Distribution',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'No one will screen the film',
      synergyCondition: noSynergy,
      riskTag: '🔴',
    },
  ],
};

const FRANK_DELUCA: Omit<Talent, 'id'> = {
  name: 'Frank DeLuca',
  type: 'Director',
  skill: 5,
  heat: 2,
  cost: 14,
  trait: 'Old School Blockbuster',
  traitDesc: 'Big swings — cards are either great or terrible.',
  cards: [
    {
      name: 'Spectacular Set Piece',
      cardType: 'action',
      baseQuality: 2,
      synergyText: '+3 if a Crew card was played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'crew');
        return has ? { bonus: 3, description: 'Crew delivered the spectacle!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Star Vehicle',
      cardType: 'action',
      baseQuality: 0,
      synergyText: '+4 if Lead Actor Skill 4+, else -1',
      synergyCondition: (ctx) => ctx.leadSkill >= 4 ? { bonus: 4, description: 'Star power!' } : { bonus: -1, description: 'Needed a bigger star...' },
      riskTag: '🟢',
    },
    {
      name: 'Over Budget',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Sacrifice next card to double last card. High risk!',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betSacrificeForDouble(),
    },
    {
      name: 'Ego Trip',
      cardType: 'incident',
      baseQuality: -5,
      synergyText: 'Frank demands more money. Lose $2M.',
      synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'Frank\'s ego costs $2M!' }),
      riskTag: '🔴',
    },
    {
      name: 'Bloated Vision',
      cardType: 'incident',
      baseQuality: -6,
      synergyText: 'The film is a mess',
      synergyCondition: () => ({ bonus: 0, description: 'Frank lost control of the vision!' }),
      riskTag: '🔴',
    },
  ],
};

const ALL_DIRECTORS: Omit<Talent, 'id'>[] = [AVA_THORNTON, RICK_BLASTER, KENJI_MURAKAMI, ZOE_PARK, FRANK_DELUCA];

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
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+1 if Director card played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'director');
        return has ? { bonus: 1, description: 'Director coordinated!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Smooth Operation',
      cardType: 'action',
      baseQuality: 0,
      synergyText: '+2 if another Crew card already played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'crew');
        return has ? { bonus: 2, description: 'Crew coordination!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Overtime',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Sacrifice next card to double last card. High risk!',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betSacrificeForDouble(),
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
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if Director card already played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'director');
        return has ? { bonus: 2, description: 'Director guided the shot!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Golden Hour Magic',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if this is draw 3, 4, or 5',
      synergyCondition: (ctx) => (ctx.drawNumber >= 3 && ctx.drawNumber <= 5) ? { bonus: 2, description: 'Golden hour timing!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Technical Precision',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+1 if 2+ Action cards played',
      synergyCondition: (ctx) => {
        const count = ctx.playedCards.filter(c => c.cardType === 'action').length;
        return count >= 2 ? { bonus: 1, description: 'Precision in action!' } : { bonus: 0 };
      },
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
      cardType: 'action',
      baseQuality: 0,
      synergyText: '+1 if an Actor card played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'actor');
        return has ? { bonus: 1, description: 'Good enough!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Duct Tape Fix',
      cardType: 'action',
      baseQuality: 0,
      synergyText: '+2 if any Incident was played this round',
      synergyCondition: (ctx) => {
        return ctx.incidentCount > 0 ? { bonus: 2, description: 'Duct tape saves the day!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Equipment Failure',
      cardType: 'incident',
      baseQuality: -3,
      synergyText: 'Cheap gear breaks down',
      synergyCondition: noSynergy,
      riskTag: '🔴',
    },
  ],
};

const APEX_STUDIOS_VFX: Omit<Talent, 'id'> = {
  name: 'Apex Studios VFX',
  type: 'Crew',
  skill: 4,
  heat: 0,
  cost: 12,
  trait: 'Premium VFX',
  traitDesc: 'Expensive but reliable +1 base with strong synergies.',
  cards: [
    {
      name: 'Seamless CG',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if Director card played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'director');
        return has ? { bonus: 2, description: 'Director guided the VFX!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Digital World',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if another Crew card played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'crew' && c.source !== 'Apex Studios VFX');
        return has ? { bonus: 2, description: 'Crew teams combined!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Award-Winning Effects',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if 3+ cards played this round',
      synergyCondition: (ctx) => ctx.playedCards.length >= 3 ? { bonus: 2, description: 'Effects shine in context!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Render Farm Crash',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card has high value. Win +5, Lose -3',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsHighValue(),
    },
    {
      name: 'Uncanny Valley',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'The CG looks fake',
      synergyCondition: noSynergy,
      riskTag: '🔴',
    },
  ],
};

const THE_NOMADS: Omit<Talent, 'id'> = {
  name: 'The Nomads',
  type: 'Crew',
  skill: 2,
  heat: 0,
  cost: 2,
  trait: 'Guerrilla Crew',
  traitDesc: 'Cheap and volatile but occasionally amazing.',
  cards: [
    {
      name: 'Found Location Magic',
      cardType: 'action',
      baseQuality: 0,
      synergyText: '+4 if this is draw 1 or 2 (early hustle)',
      synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 4, description: 'Early hustle pays off!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Run And Gun',
      cardType: 'action',
      baseQuality: 0,
      synergyText: '+2 if an Actor card played',
      synergyCondition: (ctx) => {
        const has = ctx.playedCards.some(c => c.sourceType === 'actor');
        return has ? { bonus: 2, description: 'Captured raw energy!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Happy Accident',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is Action type. Win +4, Lose -3',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsAction(),
    },
    {
      name: 'Permit Violation',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Shut down by authorities. Lose $1M.',
      synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'No permits = problems!' }),
      riskTag: '🔴',
    },
    {
      name: 'Gear Stolen',
      cardType: 'incident',
      baseQuality: -5,
      synergyText: 'Equipment vanished overnight',
      synergyCondition: noSynergy,
      riskTag: '🔴',
    },
  ],
};

const ALL_CREW: Omit<Talent, 'id'>[] = [STANDARD_GRIP_TEAM, MARIA_SANTOS, QUICK_FIX_PRODUCTIONS, APEX_STUDIOS_VFX, THE_NOMADS];

// ─── SCRIPTS WITH CARD DECKS ───

const NIGHTMARE_ALLEY_CARDS: CardTemplate[] = [
  {
    name: 'Jump Scare',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+3 if NO cards played yet (opening shock)',
    synergyCondition: (ctx) => ctx.playedCards.length === 0 ? { bonus: 3, description: 'Opening shock!' } : { bonus: 0 },
    riskTag: '🟢',
  },
  {
    name: 'Building Dread',
    cardType: 'action',
    baseQuality: 0,
    synergyText: '+1 per card already played (max +4)',
    synergyCondition: (ctx) => {
      const count = Math.min(ctx.playedCards.length, 4);
      return count > 0 ? { bonus: count, description: `Dread builds... +${count}!` } : { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'The Reveal',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+3 if this is the 4th+ card',
    synergyCondition: (ctx) => ctx.drawNumber >= 4 ? { bonus: 3, description: 'The big reveal!' } : { bonus: 0 },
    riskTag: '🟢',
  },
  {
    name: 'Creepy Atmosphere',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+2 if a Director card was already played',
    synergyCondition: (ctx) => {
      const has = ctx.playedCards.some(c => c.sourceType === 'director');
      return has ? { bonus: 2, description: 'Director set the mood!' } : { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'Gore Backlash',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: '-1 per Actor card played',
    synergyCondition: (ctx) => {
      const count = ctx.playedCards.filter(c => c.sourceType === 'actor').length;
      return count > 0 ? { bonus: -count, description: `Stars hated this! -${count}` } : { bonus: 0 };
    },
    riskTag: '🔴',
  },
  {
    name: 'Cursed Set',
    cardType: 'incident',
    baseQuality: -6,
    synergyText: 'Bad luck on set',
    synergyCondition: () => ({ bonus: 0, description: 'The set is cursed!' }),
    riskTag: '🔴',
  },
];

const LAUGH_RIOT_CARDS: CardTemplate[] = [
  {
    name: 'Perfect Timing',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+2 if the previous card was also Action',
    synergyCondition: (ctx) => {
      if (ctx.previousCard && ctx.previousCard.cardType === 'action') {
        return { bonus: 2, description: 'Action streak combo!' };
      }
      return { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'Improv Gold',
    cardType: 'action',
    baseQuality: 1,
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
    cardType: 'action',
    baseQuality: 0,
    synergyText: '+1 for each Script card already played (max +3)',
    synergyCondition: (ctx) => {
      const count = Math.min(ctx.playedCards.filter(c => c.sourceType === 'script').length, 3);
      return count > 0 ? { bonus: count, description: `The gag gets funnier! +${count}` } : { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'Physical Comedy',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+1 if a Crew card was played',
    synergyCondition: (ctx) => {
      const has = ctx.playedCards.some(c => c.sourceType === 'crew');
      return has ? { bonus: 1, description: 'Crew set up the stunt!' } : { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'Joke Falls Flat',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card is NOT an Incident. Win +3, Lose -4',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: betNextIsNotIncident(),
  },
  {
    name: 'Offensive Bit',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: '-2 more if any Incident Actor card played this round',
    synergyCondition: (ctx) => {
      const hasRedActor = ctx.playedCards.some(c => c.sourceType === 'actor' && c.cardType === 'incident');
      return hasRedActor ? { bonus: -2, description: 'Scandal made it worse!' } : { bonus: 0 };
    },
    riskTag: '🔴',
  },
];

const BROKEN_CROWN_CARDS: CardTemplate[] = [
  {
    name: 'Emotional Climax',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+3 if 2+ Actor cards played this round',
    synergyCondition: (ctx) => {
      const count = ctx.playedCards.filter(c => c.sourceType === 'actor').length;
      return count >= 2 ? { bonus: 3, description: 'Actors carried the scene!' } : { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'Subtle Writing',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+2 if Director card already played',
    synergyCondition: (ctx) => {
      const has = ctx.playedCards.some(c => c.sourceType === 'director');
      return has ? { bonus: 2, description: 'Director elevated the script!' } : { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'Character Study',
    cardType: 'action',
    baseQuality: 0,
    synergyText: '+1 per unique card type played (max +4)',
    synergyCondition: (ctx) => {
      const types = new Set(ctx.playedCards.map(c => c.sourceType));
      return types.size > 0 ? { bonus: Math.min(types.size, 4), description: `${types.size} unique types = ensemble excellence!` } : { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'Awards Bait Monologue',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+3 if Lead Actor Skill is 4+',
    synergyCondition: (ctx) => ctx.leadSkill >= 4 ? { bonus: 3, description: 'Star delivered the monologue!' } : { bonus: 0 },
    riskTag: '🟢',
  },
  {
    name: 'Pacing Issues',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card has high value. Win +5, Lose -3',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: betNextIsHighValue(),
  },
  {
    name: 'Pretentious Drivel',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'If quality under 10, -3 more',
    synergyCondition: (ctx) => ctx.totalQuality < 10 ? { bonus: -3, description: 'Pretension without substance!' } : { bonus: 0 },
    riskTag: '🔴',
  },
];

const NEON_FURY_CARDS: CardTemplate[] = [
  {
    name: 'Chase Sequence',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+2 if an Actor card played',
    synergyCondition: (ctx) => {
      const has = ctx.playedCards.some(c => c.sourceType === 'actor');
      return has ? { bonus: 2, description: 'Star in the driver\'s seat!' } : { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'Explosion!',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+2 if a Crew card was played',
    synergyCondition: (ctx) => {
      const has = ctx.playedCards.some(c => c.sourceType === 'crew');
      return has ? { bonus: 2, description: 'Practical effects!' } : { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'Fight Choreography',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+2 if Lead Actor Skill 4+',
    synergyCondition: (ctx) => ctx.leadSkill >= 4 ? { bonus: 2, description: 'Star nailed the choreography!' } : { bonus: 0 },
    riskTag: '🟢',
  },
  {
    name: 'Stunt Goes Wrong',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card is Action. Win +4, Lose -3',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: betNextIsAction(),
  },
  {
    name: 'CGI Overload',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Sacrifice next card to double last card. High risk!',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: betSacrificeForDouble(),
  },
  {
    name: 'Bloated Runtime',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'If 5+ cards drawn, -3 more',
    synergyCondition: (ctx) => ctx.drawNumber >= 5 ? { bonus: -3, description: 'Movie is too long!' } : { bonus: 0 },
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
    abilityDesc: 'Crowd Pleaser: For every 3 consecutive Action cards, +2 bonus',
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

export function generateTalentMarket(count: number, _season: number, currentRoster: Talent[] = []): Talent[] {
  const result: Talent[] = [];
  const rosterNames = new Set(currentRoster.map(t => t.name));
  const usedNames = new Set<string>();

  const filterPool = (pool: Omit<Talent, 'id'>[]) => pool.filter(t => !rosterNames.has(t.name));

  const ensureTypes: Omit<Talent, 'id'>[][] = [filterPool(ALL_LEADS), filterPool(ALL_DIRECTORS), filterPool(ALL_CREW)];
  for (const pool of ensureTypes) {
    if (result.length >= count || pool.length === 0) continue;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!usedNames.has(pick.name)) {
      usedNames.add(pick.name);
      result.push(makeTalent(pick));
    }
  }

  const allTalent = [...ALL_LEADS, ...ALL_SUPPORTS, ...ALL_DIRECTORS, ...ALL_CREW].filter(t => !rosterNames.has(t.name));
  while (result.length < count) {
    const available = allTalent.filter(t => !usedNames.has(t.name));
    if (available.length === 0) break;
    const pick = available[Math.floor(Math.random() * available.length)];
    usedNames.add(pick.name);
    result.push(makeTalent(pick));
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
  { name: 'Crisis Manager', cost: 8, description: 'Incident card quality penalties halved', effect: 'crisisManager' },
  { name: 'Buzz Machine', cost: 10, description: 'If quality > 35, +×0.5 mult', effect: 'buzz' },
  { name: 'Insurance Policy', cost: 15, description: 'Disasters reduce quality 25% instead of losing all', effect: 'insurance' },
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
