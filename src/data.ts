import { Script, Talent, CardTemplate, StudioPerk, MarketCondition, Genre, ChallengeBet, Chemistry, StudioArchetype, CardTag, TalentBaggage } from './types';
import { rng } from './seededRng';

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
  traitDesc: '+2 quality with Action scripts. MOMENTUM specialist — cards get stronger in streaks.',
  cards: [
    {
      name: 'Steele Jaw Clench',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🔥 MOMENTUM: +1 per Momentum tag played (max +4)',
      synergyCondition: (ctx) => {
        const count = Math.min(ctx.tagsPlayed['momentum'] || 0, 4);
        return count > 0 ? { bonus: count, description: `${count} Momentum cards = unstoppable!` } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['momentum'] as CardTag[],
    },
    {
      name: 'One-Liner',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🔥 MOMENTUM: +1 per Action card in a row (max +4). Build the streak!',
      synergyCondition: (ctx) => {
        return ctx.greenStreak > 0 ? { bonus: Math.min(ctx.greenStreak, 4), description: `${ctx.greenStreak} card streak!` } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['momentum'] as CardTag[],
    },
    {
      name: 'Training Montage',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+3 if exactly 1 Incident (fueled by setback). Also: +2 if 3+ 🔥Momentum tags.',
      synergyCondition: (ctx) => {
        let bonus = 0;
        let desc = '';
        if (ctx.incidentCount === 1) { bonus += 3; desc += 'Setback fuels the comeback! '; }
        if ((ctx.tagsPlayed['momentum'] || 0) >= 3) { bonus += 2; desc += 'Momentum payoff! '; }
        return bonus > 0 ? { bonus, description: desc } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['momentum', 'spectacle'] as CardTag[],
    },
    {
      name: 'Risky Stunt',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is Action. Win +4, Lose -3',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsAction(),
      tags: ['momentum'] as CardTag[],
    },
    {
      name: 'Paparazzi Snap',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Tabloid chaos. Lose $1M. Breaks your Momentum streak.',
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
  filmsLeft: 3,
  trait: 'Diva',
  traitDesc: 'Incredible talent. Absolute chaos magnet. 💸 Demands $3M per film on top of hiring cost.',
  baggage: { type: 'salary_demand', label: '💸 Salary Demand', description: 'Demands $3M per film beyond hiring cost', extraCost: 3 },
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
      baseQuality: -5,
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
  traitDesc: 'Disappears into roles. Incredible when directed well. 📅 Schedule conflicts block one Wild slot.',
  baggage: { type: 'schedule_conflict', label: '📅 Schedule Conflict', description: 'Blocks one Wild slot — limited availability', slotBlocked: 'Wild' },
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
  traitDesc: '+1 Skill after each successful film. 🎯 PRECISION specialist — rewards clean, disciplined productions.',
  cards: [
    {
      name: 'Quiet Intensity',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🎯 PRECISION: +2 if total cards played ≤ 3. +2 more per Precision tag played.',
      synergyCondition: (ctx) => {
        let bonus = 0; let desc = '';
        if (ctx.playedCards.length <= 2) { bonus += 2; desc += 'Restraint rewarded! '; }
        const precTags = Math.min(ctx.tagsPlayed['precision'] || 0, 3);
        if (precTags > 0) { bonus += precTags; desc += `${precTags} Precision tags! `; }
        return bonus > 0 ? { bonus, description: desc } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Breakout Moment',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🎯 PRECISION: +2 per Incident avoided (max +6). The clean run builds to a climax!',
      synergyCondition: (ctx) => {
        const avoided = Math.max(0, ctx.drawNumber - 1 - ctx.incidentCount);
        const bonus = Math.min(avoided * 2, 6);
        return bonus > 0 ? { bonus, description: `Clean run = ${avoided} draws without incident!` } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Natural Talent',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if discarded pile has 2+ cards (you made the right choices)',
      synergyCondition: (ctx) => {
        return ctx.discardedCount >= 2 ? { bonus: 2, description: 'Good choices paid off!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
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
      synergyText: 'Pressure got to her. -2 more if 0 Precision tags (no discipline).',
      synergyCondition: (ctx) => (ctx.tagsPlayed['precision'] || 0) === 0 ? { bonus: -2, description: 'No precision to fall back on!' } : { bonus: 0 },
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
  traitDesc: 'The bridge. Cards carry ALL tags — activates any keyword synergy. Versatile but moderate base.',
  cards: [
    {
      name: 'Chameleon Performance',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+1 per UNIQUE tag type played (max +5). Knox bridges all archetypes.',
      synergyCondition: (ctx) => {
        const uniqueTags = Object.keys(ctx.tagsPlayed).length;
        return uniqueTags > 0 ? { bonus: Math.min(uniqueTags, 5), description: `${uniqueTags} tag types = true chameleon!` } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['momentum', 'precision', 'chaos', 'spectacle', 'heart'] as CardTag[],
    },
    {
      name: 'Accent Work',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if Script card played, +1 if Director card played',
      synergyCondition: (ctx) => {
        let bonus = 0; let desc = '';
        if (ctx.playedCards.some(c => c.sourceType === 'script')) { bonus += 2; desc += 'Script '; }
        if (ctx.playedCards.some(c => c.sourceType === 'director')) { bonus += 1; desc += 'Director '; }
        return bonus > 0 ? { bonus, description: `${desc}synergy!` } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision', 'heart'] as CardTag[],
    },
    {
      name: 'Scene Chameleon',
      cardType: 'action',
      baseQuality: 1,
      synergyText: 'Copy the bonus of the last played card. Knox becomes whatever you need.',
      synergyCondition: (ctx) => {
        const prev = ctx.previousCard;
        if (prev && prev.totalValue && prev.totalValue > 0) {
          return { bonus: prev.totalValue, description: `Copied ${prev.name}'s +${prev.totalValue}!` };
        }
        return { bonus: 0, description: 'Nothing to copy' };
      },
      riskTag: '🟢',
      tags: ['momentum', 'spectacle'] as CardTag[],
    },
    {
      name: 'Understated Moment',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+1 per unique source type played (max +4). Quiet excellence.',
      synergyCondition: (ctx) => {
        const types = new Set(ctx.playedCards.map(c => c.sourceType));
        return types.size > 0 ? { bonus: Math.min(types.size, 4), description: `${types.size} source types!` } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Overacting',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Went too big. But adds all tag types (fuels future synergies).',
      synergyCondition: noSynergy,
      riskTag: '🔴',
      tags: ['chaos', 'spectacle'] as CardTag[],
    },
  ],
};

const MEI_LING: Omit<Talent, 'id'> = {
  name: 'Mei Ling',
  type: 'Lead',
  skill: 4,
  heat: 2,
  cost: 12,
  genreBonus: { genre: 'Action', bonus: 2 },
  trait: 'Action Legend',
  traitDesc: '🔥 MOMENTUM specialist. Action streak queen — the longer the combo, the stronger she gets.',
  cards: [
    {
      name: 'Wire Work Mastery',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🔥 MOMENTUM: +3 if Crew card played. +1 per Momentum tag (max +3).',
      synergyCondition: (ctx) => {
        let bonus = 0; let desc = '';
        if (ctx.playedCards.some(c => c.sourceType === 'crew')) { bonus += 3; desc += 'Crew wires! '; }
        const momBonus = Math.min(ctx.tagsPlayed['momentum'] || 0, 3);
        if (momBonus > 0) { bonus += momBonus; desc += `${momBonus} Momentum! `; }
        return bonus > 0 ? { bonus, description: desc } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['momentum'] as CardTag[],
    },
    {
      name: 'One-Take Fight Scene',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🔥 MOMENTUM: +2 if previous card was Action. +2 more if Action streak ≥ 3.',
      synergyCondition: (ctx) => {
        let bonus = 0; let desc = '';
        if (ctx.previousCard?.cardType === 'action') { bonus += 2; desc += 'Action combo! '; }
        if (ctx.greenStreak >= 3) { bonus += 2; desc += 'STREAK BONUS! '; }
        return bonus > 0 ? { bonus, description: desc } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['momentum', 'spectacle'] as CardTag[],
    },
    {
      name: 'Rooftop Chase',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🔥 +1 per Action card played (max +4). Momentum cards count double.',
      synergyCondition: (ctx) => {
        const actionCount = ctx.actionCardsPlayed;
        const momBonus = Math.min(ctx.tagsPlayed['momentum'] || 0, 2);
        const total = Math.min(actionCount + momBonus, 4);
        return total > 0 ? { bonus: total, description: `${actionCount} actions + momentum!` } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['momentum'] as CardTag[],
    },
    {
      name: 'Double Feature Dare',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is Action. Win +4, Lose -3',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsAction(),
      tags: ['momentum'] as CardTag[],
    },
    {
      name: 'Stunt Injury',
      cardType: 'incident',
      baseQuality: -5,
      synergyText: 'Hospital visit. Lose $1M. Breaks your Momentum streak.',
      synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'Mei Ling hurt on set!' }),
      riskTag: '🔴',
    },
  ],
};

const OLIVER_CROSS: Omit<Talent, 'id'> = {
  name: 'Oliver Cross',
  type: 'Lead',
  skill: 5,
  heat: 3,
  cost: 16,
  filmsLeft: 2,
  trait: 'Method Extremist',
  traitDesc: 'British method actor. 💀 CHAOS specialist — turns disasters into art. ⚠️ Dangerous method acting adds incident to deck.',
  baggage: { type: 'method_dangerous', label: '⚠️ Dangerous Method', description: 'Adds 1 extra Incident card to production deck', incidentChance: 1.0 },
  cards: [
    {
      name: 'Oscar-Worthy Take',
      cardType: 'action',
      baseQuality: 2,
      synergyText: '💀 CHAOS: +1 per Chaos tag played (max +4). Chaos fuels the art.',
      synergyCondition: (ctx) => {
        const chaosBonus = Math.min((ctx.tagsPlayed['chaos'] || 0), 4);
        return chaosBonus > 0 ? { bonus: chaosBonus, description: `${ctx.tagsPlayed['chaos'] || 0} chaos tags = brilliance!` } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['chaos'] as CardTag[],
    },
    {
      name: 'Total Immersion',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💀 CHAOS: +3 if 4+ Chaos tags played. Deep commitment to the dark side.',
      synergyCondition: (ctx) => (ctx.tagsPlayed['chaos'] || 0) >= 4 ? { bonus: 3, description: 'Total chaos immersion!' } : { bonus: 0 },
      riskTag: '🟢',
      tags: ['chaos'] as CardTag[],
    },
    {
      name: 'Dangerous Method',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Sacrifice next card to double last card. High risk!',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betSacrificeForDouble(),
      tags: ['chaos'] as CardTag[],
    },
    {
      name: 'Broke Character',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: '💀 Complete breakdown. Adds Chaos tags but poisons the next card.',
      synergyCondition: () => ({ bonus: 0, description: 'Method acting went too far!' }),
      riskTag: '🔴',
      special: 'poisonNext',
      tags: ['chaos', 'chaos'] as CardTag[],
    },
    {
      name: 'Hospitalized',
      cardType: 'incident',
      baseQuality: -5,
      synergyText: 'Method acting went too far. Lose $2M. But adds Chaos tag.',
      synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'Medical bills!' }),
      riskTag: '🔴',
      tags: ['chaos'] as CardTag[],
    },
  ],
};

const CAMILLE_DURAND: Omit<Talent, 'id'> = {
  name: 'Camille Durand',
  type: 'Lead',
  skill: 4,
  heat: 1,
  cost: 11,
  genreBonus: { genre: 'Drama', bonus: 2 },
  trait: 'Art House Muse',
  traitDesc: 'French art house star. Cards synergize with Director cards heavily.',
  cards: [
    {
      name: 'Luminous Close-Up',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+3 if a Director card was already played',
      synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'director') ? { bonus: 3, description: 'Director captured her light!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Whispered Monologue',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if total cards played ≤ 3 (intimate)',
      synergyCondition: (ctx) => ctx.playedCards.length <= 2 ? { bonus: 2, description: 'Intimate restraint!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Director\'s Collaboration',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 per Director card played (max +4)',
      synergyCondition: (ctx) => {
        const count = Math.min(ctx.playedCards.filter(c => c.sourceType === 'director').length, 2);
        return count > 0 ? { bonus: count * 2, description: `${count} Director synergies!` } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Artistic Dispute',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is from an Actor. Win +4, Lose -3',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsFromActor(),
    },
    {
      name: 'Walked Off Set',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Creative differences. Lose $1M.',
      synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'Camille left the set!' }),
      riskTag: '🔴',
    },
  ],
};

const RAFAEL_SANTOS: Omit<Talent, 'id'> = {
  name: 'Rafael Santos',
  type: 'Lead',
  skill: 3,
  heat: 2,
  cost: 9,
  genreBonus: { genre: 'Romance', bonus: 3 },
  trait: 'Telenovela Crossover',
  traitDesc: '💕 HEART specialist. Romance king — Heart tags create emotional resonance that builds throughout production.',
  cards: [
    {
      name: 'Smoldering Gaze',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💕 HEART: +2 if Actor card played. +1 per Heart tag (max +3). Chemistry builds.',
      synergyCondition: (ctx) => {
        let bonus = 0; let desc = '';
        if (ctx.playedCards.some(c => c.sourceType === 'actor')) { bonus += 2; desc += 'Chemistry! '; }
        const heartBonus = Math.min(ctx.tagsPlayed['heart'] || 0, 3);
        if (heartBonus > 0) { bonus += heartBonus; desc += `${heartBonus} Heart! `; }
        return bonus > 0 ? { bonus, description: desc } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Passionate Declaration',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is NOT an Incident. Win +3, Lose -4',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsNotIncident(),
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Love Triangle Twist',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is from an Actor. Win +5, Lose -3. Heart tags make it +6!',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: {
        ...betNextIsFromActor(),
        successBonus: 5,
      },
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Rain Kiss',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💕 HEART: +2 if Crew card played. +3 if 4+ Heart tags (emotional crescendo!).',
      synergyCondition: (ctx) => {
        let bonus = 0; let desc = '';
        if (ctx.playedCards.some(c => c.sourceType === 'crew')) { bonus += 2; desc += 'Perfect setup! '; }
        if ((ctx.tagsPlayed['heart'] || 0) >= 4) { bonus += 3; desc += 'EMOTIONAL CRESCENDO! '; }
        return bonus > 0 ? { bonus, description: desc } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Telenovela Overacting',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Too dramatic. But adds Heart tag (the audience feels something).',
      synergyCondition: noSynergy,
      riskTag: '🔴',
      tags: ['heart'] as CardTag[],
    },
  ],
};

// ─── NEW LEADS (Round 7) ───

const YUKI_TANAKA: Omit<Talent, 'id'> = {
  name: 'Yuki Tanaka',
  type: 'Lead',
  skill: 4,
  heat: 2,
  cost: 13,
  genreBonus: { genre: 'Thriller', bonus: 2 },
  trait: 'The Mimic',
  traitDesc: '🔄 ADAPTATION specialist. Cards copy and transform based on what came before. Never plays the same way twice.',
  cards: [
    {
      name: 'Mirror Performance',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🔄 Becomes the strongest card type in play. +2 per matching source type already played.',
      synergyCondition: (ctx) => {
        const counts: Record<string, number> = {};
        ctx.playedCards.forEach(c => { counts[c.sourceType] = (counts[c.sourceType] || 0) + 1; });
        const best = Math.max(0, ...Object.values(counts));
        return best > 0 ? { bonus: Math.min(best * 2, 6), description: `Mirrored ${best} cards!` } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Emotional Echo',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💕 Gains the TAGS of the previous card played. +3 if previous had 2+ tags.',
      synergyCondition: (ctx) => {
        const prev = ctx.previousCard;
        if (prev?.tags && prev.tags.length >= 2) return { bonus: 3, description: 'Absorbed their essence!' };
        if (prev?.tags && prev.tags.length >= 1) return { bonus: 1, description: 'Echoed one tag.' };
        return { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Reverse Psychology',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💀 +3 if quality is currently negative. Resilience under pressure.',
      synergyCondition: (ctx) => {
        return ctx.totalQuality < 0 ? { bonus: 3, description: 'Turned it around!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['chaos'] as CardTag[],
    },
    {
      name: 'Identity Crisis',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is from a Director. Win +4, Lose -2',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextMatchesSource('director'),
    },
    {
      name: 'Lost Herself',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Too many mirrors. -2 more if 5+ cards played (identity collapse).',
      synergyCondition: (ctx) => ctx.playedCards.length >= 5 ? { bonus: -2, description: 'Identity collapse!' } : { bonus: 0 },
      riskTag: '🔴',
    },
  ],
};

const EZRA_BLACKWOOD: Omit<Talent, 'id'> = {
  name: 'Ezra Blackwood',
  type: 'Lead',
  skill: 5,
  heat: 3,
  cost: 16,
  filmsLeft: 2,
  genreBonus: { genre: 'Horror', bonus: 2 },
  trait: 'The Gambler',
  traitDesc: '🎲 All-in or nothing. Challenge cards become dramatically more powerful. 👥 Entourage drains $2M per film.',
  baggage: { type: 'entourage', label: '👥 Entourage', description: 'Personal entourage costs $2M per film in extras', budgetDrain: 2 },
  cards: [
    {
      name: 'All Or Nothing',
      cardType: 'action',
      baseQuality: 0,
      synergyText: '🎲 +1 per card drawn this production. Scales infinitely — the deeper you go, the bigger the payoff.',
      synergyCondition: (ctx) => {
        const bonus = ctx.drawNumber;
        return { bonus, description: `Draw ${ctx.drawNumber} = +${bonus}!` };
      },
      riskTag: '🟢',
      tags: ['chaos', 'momentum'] as CardTag[],
    },
    {
      name: 'Double Down',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🎲 +5 if a Challenge card was played this production. Gamblers love gamblers.',
      synergyCondition: (ctx) => {
        return ctx.challengeCardsPlayed > 0 ? { bonus: 5, description: 'Gambler\'s high!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['chaos'] as CardTag[],
    },
    {
      name: 'High Stakes Take',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card has high value. Win +7, Lose -5. Bigger stakes!',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: { ...betNextIsHighValue(), successBonus: 7, failPenalty: -5 },
      tags: ['chaos'] as CardTag[],
    },
    {
      name: 'Russian Roulette',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is NOT an Incident. Win +4, Lose -6. Extreme risk!',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: { ...betNextIsNotIncident(), successBonus: 4, failPenalty: -6 },
      tags: ['chaos'] as CardTag[],
    },
    {
      name: 'Lost Everything',
      cardType: 'incident',
      baseQuality: -6,
      synergyText: 'The gamble failed spectacularly. Lose $2M. But Chaos tags fuel the fire.',
      synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'Catastrophic loss!' }),
      riskTag: '🔴',
      tags: ['chaos', 'chaos'] as CardTag[],
    },
  ],
};

const IRIS_MOON: Omit<Talent, 'id'> = {
  name: 'Iris Moon',
  type: 'Lead',
  skill: 3,
  heat: 0,
  cost: 7,
  genreBonus: { genre: 'Sci-Fi', bonus: 2 },
  trait: 'The Architect',
  traitDesc: '🏗️ Rewards careful deck construction. Bonus grows based on how many DIFFERENT talent types are in your cast.',
  cards: [
    {
      name: 'Blueprint Performance',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🏗️ +1 per unique source type in played cards (max +4). Diversity is strength.',
      synergyCondition: (ctx) => {
        const types = new Set(ctx.playedCards.map(c => c.sourceType));
        return types.size > 0 ? { bonus: Math.min(types.size, 4), description: `${types.size} types = architecture!` } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Calculated Risk',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🏗️ +2 if exactly 0 Incidents. +2 if discarded ≥ 1. Planned choices pay off.',
      synergyCondition: (ctx) => {
        let bonus = ctx.incidentCount === 0 ? 2 : 0;
        if (ctx.discardedCount >= 1) bonus += 2;
        return bonus > 0 ? { bonus, description: 'According to plan!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Structural Brilliance',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🏗️ +3 if 3+ unique tag types have been played. The blueprint comes together!',
      synergyCondition: (ctx) => {
        const uniqueTags = Object.keys(ctx.tagsPlayed).length;
        return uniqueTags >= 3 ? { bonus: 3, description: 'Blueprint complete!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision', 'spectacle'] as CardTag[],
    },
    {
      name: 'Design Flaw',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is NOT an Incident. Win +3, Lose -4',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsNotIncident(),
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Overthought It',
      cardType: 'incident',
      baseQuality: -3,
      synergyText: 'Analysis paralysis. -2 more if quality > 20 (perfectionism trap).',
      synergyCondition: (ctx) => ctx.totalQuality > 20 ? { bonus: -2, description: 'Perfectionism backfired!' } : { bonus: 0 },
      riskTag: '🔴',
    },
  ],
};

const ALL_LEADS: Omit<Talent, 'id'>[] = [JAKE_STEELE, VALENTINA_CORTEZ, MARCUS_WEBB, SOPHIE_CHEN, LENA_FROST, DARIUS_KNOX, MEI_LING, OLIVER_CROSS, CAMILLE_DURAND, RAFAEL_SANTOS, YUKI_TANAKA, EZRA_BLACKWOOD, IRIS_MOON];

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
      baseQuality: 1,
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
      baseQuality: 1,
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
  traitDesc: '💀 CHAOS specialist support. Weaponizes chaos — her incidents feed Chaos synergies.',
  cards: [
    {
      name: 'Viral Moment',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💀 CHAOS: +1 per Chaos tag played (max +5). Scandal = content.',
      synergyCondition: (ctx) => {
        const chaosBonus = Math.min(ctx.tagsPlayed['chaos'] || 0, 5);
        return chaosBonus > 0 ? { bonus: chaosBonus, description: 'Turned scandal into content!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['chaos'] as CardTag[],
    },
    {
      name: 'Drama On Set',
      cardType: 'incident',
      baseQuality: -5,
      synergyText: '💀 Total chaos on set. Adds Chaos tags but the damage is real.',
      synergyCondition: () => ({ bonus: 0, description: 'Drama derailed the production!' }),
      riskTag: '🔴',
      tags: ['chaos', 'chaos'] as CardTag[],
    },
    {
      name: 'Tabloid Distraction',
      cardType: 'incident',
      baseQuality: -5,
      synergyText: 'Lose $2M. But adds Chaos tags for later payoff.',
      synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'Tabloids cost $2M!' }),
      riskTag: '🔴',
      tags: ['chaos'] as CardTag[],
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
      baseQuality: 1,
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
      baseQuality: 1,
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
      baseQuality: 1,
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
      baseQuality: 1,
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
      baseQuality: 1,
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

const TOMMY_TBONE_JACKSON: Omit<Talent, 'id'> = {
  name: 'Tommy "T-Bone" Jackson',
  type: 'Support',
  skill: 2,
  heat: 1,
  cost: 5,
  trait: 'Comedy Sidekick',
  traitDesc: 'Boosts other Actor cards.',
  cards: [
    {
      name: 'Comic Relief',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 per Actor card played (max +4)',
      synergyCondition: (ctx) => {
        const count = Math.min(ctx.playedCards.filter(c => c.sourceType === 'actor').length, 2);
        return count > 0 ? { bonus: count * 2, description: `${count} actors boosted by comedy!` } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Blooper Reel Gold',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if any Incident played (turns mistakes into laughs)',
      synergyCondition: (ctx) => ctx.incidentCount > 0 ? { bonus: 2, description: 'Turned disaster into comedy!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Improvised Bit',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is Action. Win +4, Lose -3',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsAction(),
    },
    {
      name: 'Upstaged The Lead',
      cardType: 'incident',
      baseQuality: -3,
      synergyText: 'Lead actor is furious',
      synergyCondition: noSynergy,
      riskTag: '🔴',
    },
  ],
};

const PRIYA_SHARMA: Omit<Talent, 'id'> = {
  name: 'Priya Sharma',
  type: 'Support',
  skill: 3,
  heat: 0,
  cost: 6,
  trait: 'Versatile',
  traitDesc: 'Adapts to whatever genre is playing.',
  cards: [
    {
      name: 'Genre Chameleon',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+1 per unique source type played (max +4)',
      synergyCondition: (ctx) => {
        const types = new Set(ctx.playedCards.map(c => c.sourceType));
        return types.size > 0 ? { bonus: Math.min(types.size, 4), description: `${types.size} types = versatility!` } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Perfect Support',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if a Lead Actor card was played',
      synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'actor' && c.source !== 'Priya Sharma') ? { bonus: 2, description: 'Elevated the lead!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Seamless Adaptation',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if a Script card played, +1 if Director card played',
      synergyCondition: (ctx) => {
        let bonus = 0;
        if (ctx.playedCards.some(c => c.sourceType === 'script')) bonus += 2;
        if (ctx.playedCards.some(c => c.sourceType === 'director')) bonus += 1;
        return bonus > 0 ? { bonus, description: 'Adapted perfectly!' } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Identity Crisis',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card has high value. Win +5, Lose -3',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsHighValue(),
    },
  ],
};

const NIKOLAI_VOLKOV: Omit<Talent, 'id'> = {
  name: 'Nikolai Volkov',
  type: 'Support',
  skill: 4,
  heat: 2,
  cost: 8,
  trait: 'Intense',
  traitDesc: 'High base values but contributes extra Incidents. ⚠️ Method danger — may add incident to deck.',
  baggage: { type: 'method_dangerous', label: '⚠️ Volatile', description: '50% chance of adding extra Incident to deck', incidentChance: 0.5 },
  cards: [
    {
      name: 'Terrifying Presence',
      cardType: 'action',
      baseQuality: 2,
      synergyText: '+2 if a Director card played',
      synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'director') ? { bonus: 2, description: 'Director channeled the intensity!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Raw Power',
      cardType: 'action',
      baseQuality: 2,
      synergyText: '+1 if this is draw 3+',
      synergyCondition: (ctx) => ctx.drawNumber >= 3 ? { bonus: 1, description: 'Building momentum!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Method Rage',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is NOT an Incident. Win +3, Lose -4',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsNotIncident(),
    },
    {
      name: 'Onset Intimidation',
      cardType: 'incident',
      baseQuality: -5,
      synergyText: 'Cast is terrified. Poisons next card.',
      synergyCondition: noSynergy,
      riskTag: '🔴',
      special: 'poisonNext',
    },
    {
      name: 'Vodka-Fueled Rant',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Lose $1M in damage control',
      synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'PR nightmare!' }),
      riskTag: '🔴',
    },
  ],
};

// ─── NEW SUPPORTS (Round 7) ───

const FELIX_WU: Omit<Talent, 'id'> = {
  name: 'Felix Wu',
  type: 'Support',
  skill: 3,
  heat: 1,
  cost: 7,
  trait: 'The Healer',
  traitDesc: '💕 Undoes damage. Cards that actively repair incidents and restore quality. Pure recovery.',
  cards: [
    {
      name: 'Calming Presence',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💕 HEAL: +2 per Incident played (max +6). Transforms trauma into tenderness.',
      synergyCondition: (ctx) => {
        const bonus = Math.min(ctx.incidentCount * 2, 6);
        return bonus > 0 ? { bonus, description: `Healed ${ctx.incidentCount} wounds!` } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Group Therapy',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💕 +1 per Actor card played (max +3). +2 if any Heart tag exists. Ensemble healing.',
      synergyCondition: (ctx) => {
        let bonus = Math.min(ctx.playedCards.filter(c => c.sourceType === 'actor').length, 3);
        if ((ctx.tagsPlayed['heart'] || 0) > 0) bonus += 2;
        return bonus > 0 ? { bonus, description: 'Group healing!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Silver Lining',
      cardType: 'action',
      baseQuality: 1,
      synergyText: 'Remove 1 Incident from remaining deck. If Heart ≥ 3, remove 2 instead.',
      synergyCondition: (ctx) => {
        return { bonus: 0, description: (ctx.tagsPlayed['heart'] || 0) >= 3 ? 'Double heal!' : 'Healed one!' };
      },
      riskTag: '🟢',
      special: 'removeRed',
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Compassion Fatigue',
      cardType: 'incident',
      baseQuality: -3,
      synergyText: 'Even healers break. But adds Heart tag for future recovery.',
      synergyCondition: noSynergy,
      riskTag: '🔴',
      tags: ['heart'] as CardTag[],
    },
  ],
};

const DIEGO_FUENTES: Omit<Talent, 'id'> = {
  name: 'Diego Fuentes',
  type: 'Support',
  skill: 3,
  heat: 2,
  cost: 8,
  trait: 'The Wildcard',
  traitDesc: '✨🔥 Bridges Momentum + Spectacle. Cards that reward going big AND fast. Explosive support.',
  cards: [
    {
      name: 'Showstopper',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '✨🔥 +1 per Momentum tag + 1 per Spectacle tag (max +6 total). The show must go on!',
      synergyCondition: (ctx) => {
        const mom = ctx.tagsPlayed['momentum'] || 0;
        const spec = ctx.tagsPlayed['spectacle'] || 0;
        const bonus = Math.min(mom + spec, 6);
        return bonus > 0 ? { bonus, description: `${mom} momentum + ${spec} spectacle!` } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['momentum', 'spectacle'] as CardTag[],
    },
    {
      name: 'Grand Entrance',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+4 if this is draw 1 or 2. Steals the show early!',
      synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 4, description: 'Grand entrance!' } : { bonus: 0 },
      riskTag: '🟢',
      tags: ['spectacle'] as CardTag[],
    },
    {
      name: 'Crowd Eruption',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is Action. Win +5, Lose -3. Crowd goes wild!',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: { ...betNextIsAction(), successBonus: 5 },
      tags: ['momentum'] as CardTag[],
    },
    {
      name: 'Flameout',
      cardType: 'incident',
      baseQuality: -5,
      synergyText: 'Burned too bright. Lose $1M. But the spectacle lives on.',
      synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'Diego burned out!' }),
      riskTag: '🔴',
      tags: ['spectacle'] as CardTag[],
    },
  ],
};

const ALL_SUPPORTS: Omit<Talent, 'id'>[] = [DANNY_PARK, ROXANNE_BLAZE, OLD_RELIABLE, MIA_TANAKA, HECTOR_MORALES, TOMMY_TBONE_JACKSON, PRIYA_SHARMA, NIKOLAI_VOLKOV, FELIX_WU, DIEGO_FUENTES];

// ─── DIRECTORS ───

const AVA_THORNTON: Omit<Talent, 'id'> = {
  name: 'Ava Thornton',
  type: 'Director',
  skill: 5,
  heat: 1,
  cost: 14,
  filmsLeft: 3,
  trait: 'Auteur',
  traitDesc: 'The multiplier. 🎯 PRECISION specialist — her vision elevates disciplined productions.',
  cards: [
    {
      name: "Auteur's Vision",
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🎯 Multiply total quality by ×1.2. If 3+ Precision tags: ×1.4 instead!',
      synergyCondition: (ctx) => {
        const mult = (ctx.tagsPlayed['precision'] || 0) >= 3 ? 1.4 : 1.2;
        return { bonus: 0, multiply: mult, description: `Auteur\'s Vision ×${mult}!` };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Meticulous Framing',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🎯 PRECISION: +2 if Crew card played. +2 more if 0 Incidents so far.',
      synergyCondition: (ctx) => {
        let bonus = 0; let desc = '';
        if (ctx.playedCards.some(c => c.sourceType === 'crew')) { bonus += 2; desc += 'Perfect framing! '; }
        if (ctx.incidentCount === 0) { bonus += 2; desc += 'Clean set! '; }
        return bonus > 0 ? { bonus, description: desc } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
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
      synergyText: 'You MUST draw at least 1 more card. The auteur demands perfection.',
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
      baseQuality: 1,
      synergyText: 'Remove 1 Incident from remaining deck',
      synergyCondition: () => ({ bonus: 0, description: 'Removed a danger card!' }),
      riskTag: '🟢',
      special: 'removeRed',
    },
    {
      name: 'Uninspired Coverage',
      cardType: 'action',
      baseQuality: 1,
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
      baseQuality: 1,
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
  traitDesc: '🎯 PRECISION specialist. Clean productions, no waste. Rewards discipline and early wraps.',
  cards: [
    {
      name: 'Intimate Framing',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🎯 PRECISION: +3 if zero Incidents. +1 per Precision tag (max +3).',
      synergyCondition: (ctx) => {
        let bonus = ctx.incidentCount === 0 ? 3 : 0;
        bonus += Math.min(ctx.tagsPlayed['precision'] || 0, 3);
        return bonus > 0 ? { bonus, description: 'Clean production!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Natural Light',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🎯 +2 if Crew card played. +2 if discarded pile ≥ 2 (decisive editing).',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.some(c => c.sourceType === 'crew') ? 2 : 0;
        if (ctx.discardedCount >= 2) bonus += 2;
        return bonus > 0 ? { bonus, description: 'Naturalism!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Festival Darling',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🎯 +4 if ≤ 4 cards played and no Incidents. +2 if 3+ Precision tags.',
      synergyCondition: (ctx) => {
        let bonus = (ctx.playedCards.length <= 3 && ctx.incidentCount === 0) ? 4 : 0;
        if ((ctx.tagsPlayed['precision'] || 0) >= 3) bonus += 2;
        return bonus > 0 ? { bonus, description: 'Lean and beautiful!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Budget Crunch',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is NOT an Incident. Win +3, Lose -4',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsNotIncident(),
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Lost Distribution',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'No one will screen the film. Breaks precision discipline.',
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
  filmsLeft: 2,
  trait: 'Old School Blockbuster',
  traitDesc: 'Big swings. ✨ SPECTACLE specialist — massive payoffs. 💸 Demands $4M per film salary.',
  baggage: { type: 'salary_demand', label: '💸 Salary Demand', description: 'Demands $4M per film beyond hiring cost', extraCost: 4 },
  cards: [
    {
      name: 'Spectacular Set Piece',
      cardType: 'action',
      baseQuality: 2,
      synergyText: '✨ SPECTACLE: +2 if Crew card played. +2 per Spectacle tag (max +6). Go big!',
      synergyCondition: (ctx) => {
        let bonus = 0; let desc = '';
        if (ctx.playedCards.some(c => c.sourceType === 'crew')) { bonus += 2; desc += 'Crew delivered! '; }
        const specBonus = Math.min((ctx.tagsPlayed['spectacle'] || 0) * 2, 6);
        if (specBonus > 0) { bonus += specBonus; desc += `Spectacle chain! `; }
        return bonus > 0 ? { bonus, description: desc } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['spectacle'] as CardTag[],
    },
    {
      name: 'Star Vehicle',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '✨ SPECTACLE: +4 if Lead Skill 4+. Else -1. Needs a real star.',
      synergyCondition: (ctx) => ctx.leadSkill >= 4 ? { bonus: 4, description: 'Star power!' } : { bonus: -1, description: 'Needed a bigger star...' },
      riskTag: '🟢',
      tags: ['spectacle'] as CardTag[],
    },
    {
      name: 'Over Budget',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Sacrifice next card to double last card. High risk!',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betSacrificeForDouble(),
      tags: ['spectacle'] as CardTag[],
    },
    {
      name: 'Ego Trip',
      cardType: 'incident',
      baseQuality: -5,
      synergyText: 'Frank demands more money. Lose $2M. But spectacle builds...',
      synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'Frank\'s ego costs $2M!' }),
      riskTag: '🔴',
      tags: ['spectacle'] as CardTag[],
    },
    {
      name: 'Bloated Vision',
      cardType: 'incident',
      baseQuality: -5,
      synergyText: 'The film is a mess. -2 more if no Spectacle tags (no payoff for the chaos).',
      synergyCondition: (ctx) => (ctx.tagsPlayed['spectacle'] || 0) === 0 ? { bonus: -2, description: 'No spectacle to show for it!' } : { bonus: 0 },
      riskTag: '🔴',
    },
  ],
};

const SAMIRA_AL_RASHID: Omit<Talent, 'id'> = {
  name: 'Samira Al-Rashid',
  type: 'Director',
  skill: 4,
  heat: 0,
  cost: 10,
  trait: 'Doc-to-Narrative',
  traitDesc: 'Documentary-turned-narrative director. Cards reward clean wraps.',
  cards: [
    {
      name: 'Vérité Style',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+3 if zero Incidents so far',
      synergyCondition: (ctx) => ctx.incidentCount === 0 ? { bonus: 3, description: 'Clean production shines!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Authentic Emotion',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if an Actor card was played',
      synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'actor') ? { bonus: 2, description: 'Captured real emotion!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Documentary Instinct',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+4 if no Incidents and 3+ cards played',
      synergyCondition: (ctx) => (ctx.incidentCount === 0 && ctx.playedCards.length >= 3) ? { bonus: 4, description: 'Clean and deep!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Reality Check',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is NOT an Incident. Win +3, Lose -4',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsNotIncident(),
    },
    {
      name: 'Too Real',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Subject matter too heavy for audiences',
      synergyCondition: noSynergy,
      riskTag: '🔴',
    },
  ],
};

const JIMMY_CHANG: Omit<Talent, 'id'> = {
  name: 'James "Jimmy" Chang',
  type: 'Director',
  skill: 4,
  heat: 1,
  cost: 9,
  genreBonus: { genre: 'Horror', bonus: 2 },
  trait: 'Horror Specialist',
  traitDesc: '💀 CHAOS specialist. Turns incidents into horror gold. Pair with Chaos talent for devastating combos.',
  cards: [
    {
      name: 'Atmosphere of Dread',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💀 CHAOS: +1 per Chaos tag played (max +5). Dread builds with every dark moment.',
      synergyCondition: (ctx) => {
        const chaosBonus = Math.min(ctx.tagsPlayed['chaos'] || 0, 5);
        return chaosBonus > 0 ? { bonus: chaosBonus, description: `${ctx.tagsPlayed['chaos'] || 0} chaos tags fuel the horror!` } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['chaos'] as CardTag[],
    },
    {
      name: 'Terror Payoff',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💀 +4 if 5+ Chaos tags played. The horror crescendo.',
      synergyCondition: (ctx) => {
        return (ctx.tagsPlayed['chaos'] || 0) >= 5 ? { bonus: 4, description: 'Maximum terror!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['chaos'] as CardTag[],
    },
    {
      name: 'Practical Effects',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if Crew card played. +2 if any Chaos tag (gritty realism).',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.some(c => c.sourceType === 'crew') ? 2 : 0;
        if ((ctx.tagsPlayed['chaos'] || 0) > 0) bonus += 2;
        return bonus > 0 ? { bonus, description: 'Practical horror!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['chaos'] as CardTag[],
    },
    {
      name: 'Cursed Production',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card has high value. Win +5, Lose -3',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsHighValue(),
      tags: ['chaos'] as CardTag[],
    },
    {
      name: 'Actors Traumatized',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'The horror went too far. But adds Chaos tags for later payoff.',
      synergyCondition: noSynergy,
      riskTag: '🔴',
      special: 'poisonActors',
      tags: ['chaos', 'chaos'] as CardTag[],
    },
  ],
};

const DAKOTA_STEELE: Omit<Talent, 'id'> = {
  name: 'Dakota Steele',
  type: 'Director',
  skill: 2,
  heat: 1,
  cost: 3,
  trait: 'Nepotism Hire',
  traitDesc: 'Jake Steele\'s kid. Cheap but cards are mostly weak.',
  cards: [
    {
      name: 'Dad\'s Advice',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if an Actor card played',
      synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'actor') ? { bonus: 2, description: 'Dad taught something useful!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Social Media Buzz',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+1 per card played (max +2). Earn +$1M.',
      synergyCondition: (ctx) => {
        const bonus = Math.min(ctx.playedCards.length, 2);
        return { bonus, budgetMod: 1, description: 'Viral on TikTok!' };
      },
      riskTag: '🟢',
      budgetMod: 1,
    },
    {
      name: 'Confused Direction',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is Action. Win +4, Lose -3',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsAction(),
    },
    {
      name: 'Lost The Plot',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Dakota has no idea what they\'re doing',
      synergyCondition: noSynergy,
      riskTag: '🔴',
    },
    {
      name: 'Daddy\'s Money',
      cardType: 'incident',
      baseQuality: -3,
      synergyText: 'Embarrassing but at least it\'s funded. +$2M.',
      synergyCondition: () => ({ bonus: 0, budgetMod: 2, description: 'Jake bailed out the production!' }),
      riskTag: '🔴',
    },
  ],
};

// ─── NEW DIRECTORS (Round 7) ───

const NOVA_SINCLAIR: Omit<Talent, 'id'> = {
  name: 'Nova Sinclair',
  type: 'Director',
  skill: 4,
  heat: 1,
  cost: 11,
  genreBonus: { genre: 'Sci-Fi', bonus: 2 },
  trait: 'Visionary Futurist',
  traitDesc: '✨🏗️ Rewards building toward a big payoff. Late-game cards become extremely powerful.',
  cards: [
    {
      name: 'World Building',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '✨ +1 per draw count (max +5). The world deepens with every scene.',
      synergyCondition: (ctx) => {
        const bonus = Math.min(ctx.drawNumber, 5);
        return { bonus, description: `Draw ${ctx.drawNumber} = world built!` };
      },
      riskTag: '🟢',
      tags: ['spectacle'] as CardTag[],
    },
    {
      name: 'Cinematic Universe',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '✨ +2 if Crew card played. +3 if 4+ total unique tags played. Everything connects!',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.some(c => c.sourceType === 'crew') ? 2 : 0;
        if (Object.keys(ctx.tagsPlayed).length >= 4) bonus += 3;
        return bonus > 0 ? { bonus, description: 'The universe expands!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['spectacle', 'precision'] as CardTag[],
    },
    {
      name: 'Third Act Twist',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🔄 +5 if draw 5+. +2 if quality > 15. The payoff lands.',
      synergyCondition: (ctx) => {
        let bonus = ctx.drawNumber >= 5 ? 5 : 0;
        if (ctx.totalQuality > 15) bonus += 2;
        return bonus > 0 ? { bonus, description: 'Third act brilliance!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Scope Creep',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Sacrifice next card to double last card. Visionary risk!',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betSacrificeForDouble(),
      tags: ['spectacle'] as CardTag[],
    },
    {
      name: 'Vision Too Grand',
      cardType: 'incident',
      baseQuality: -5,
      synergyText: 'Lose $2M. The vision exceeded the budget.',
      synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'Vision exceeded budget!' }),
      riskTag: '🔴',
    },
  ],
};

const ALL_DIRECTORS: Omit<Talent, 'id'>[] = [AVA_THORNTON, RICK_BLASTER, KENJI_MURAKAMI, ZOE_PARK, FRANK_DELUCA, SAMIRA_AL_RASHID, JIMMY_CHANG, DAKOTA_STEELE, NOVA_SINCLAIR];

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
      baseQuality: 1,
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
  traitDesc: '🎯 PRECISION specialist. Award-winning eye. Pure value with clean productions.',
  cards: [
    {
      name: 'Gorgeous Shot',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🎯 +2 if Director card played. +1 per Precision tag (max +2).',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0;
        bonus += Math.min(ctx.tagsPlayed['precision'] || 0, 2);
        return bonus > 0 ? { bonus, description: 'Perfect shot!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Golden Hour Magic',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🎯 +2 if draw 3-5. +2 more if 0 Incidents (pristine timing).',
      synergyCondition: (ctx) => {
        let bonus = (ctx.drawNumber >= 3 && ctx.drawNumber <= 5) ? 2 : 0;
        if (ctx.incidentCount === 0 && bonus > 0) bonus += 2;
        return bonus > 0 ? { bonus, description: 'Golden hour!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Technical Precision',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🎯 +2 if 2+ Action cards played. +1 per Precision tag (max +2).',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.filter(c => c.cardType === 'action').length >= 2 ? 2 : 0;
        bonus += Math.min(ctx.tagsPlayed['precision'] || 0, 2);
        return bonus > 0 ? { bonus, description: 'Technical mastery!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
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
      baseQuality: 1,
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
      baseQuality: 1,
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
  traitDesc: '✨ SPECTACLE specialist. Expensive but amplifies spectacle-heavy productions.',
  cards: [
    {
      name: 'Seamless CG',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '✨ +2 if Director card played. +1 per Spectacle tag (max +3).',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0;
        bonus += Math.min(ctx.tagsPlayed['spectacle'] || 0, 3);
        return bonus > 0 ? { bonus, description: 'VFX magnificence!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['spectacle'] as CardTag[],
    },
    {
      name: 'Digital World',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '✨ +2 if another Crew card played. +2 if 3+ Spectacle tags (visual feast).',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.some(c => c.sourceType === 'crew' && c.source !== 'Apex Studios VFX') ? 2 : 0;
        if ((ctx.tagsPlayed['spectacle'] || 0) >= 3) bonus += 2;
        return bonus > 0 ? { bonus, description: 'Visual feast!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['spectacle'] as CardTag[],
    },
    {
      name: 'Award-Winning Effects',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '✨ SPECTACLE: +2 if 3+ cards played. Spectacle tags amplify everything.',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.length >= 3 ? 2 : 0;
        return bonus > 0 ? { bonus, description: 'Effects shine!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['spectacle'] as CardTag[],
    },
    {
      name: 'Render Farm Crash',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card has high value. Win +5, Lose -3',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsHighValue(),
      tags: ['spectacle'] as CardTag[],
    },
    {
      name: 'Uncanny Valley',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'The CG looks fake. -2 more if no Spectacle tags built up.',
      synergyCondition: (ctx) => (ctx.tagsPlayed['spectacle'] || 0) === 0 ? { bonus: -2, description: 'No spectacle foundation!' } : { bonus: 0 },
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
      baseQuality: 1,
      synergyText: '+4 if this is draw 1 or 2 (early hustle)',
      synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 4, description: 'Early hustle pays off!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Run And Gun',
      cardType: 'action',
      baseQuality: 1,
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

const STELLAR_SOUND_DESIGN: Omit<Talent, 'id'> = {
  name: 'Stellar Sound Design',
  type: 'Crew',
  skill: 3,
  heat: 0,
  cost: 8,
  trait: 'Audio Wizards',
  traitDesc: 'Cards synergize with Script cards.',
  cards: [
    {
      name: 'Immersive Soundscape',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 per Script card played (max +4)',
      synergyCondition: (ctx) => {
        const count = Math.min(ctx.playedCards.filter(c => c.sourceType === 'script').length, 2);
        return count > 0 ? { bonus: count * 2, description: `${count} Script card${count > 1 ? 's' : ''} enhanced by sound!` } : { bonus: 0 };
      },
      riskTag: '🟢',
    },
    {
      name: 'Perfect Score',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if a Director card was played',
      synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'director') ? { bonus: 2, description: 'Director guided the score!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Sound Mixing Magic',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+1 if 3+ cards played',
      synergyCondition: (ctx) => ctx.playedCards.length >= 3 ? { bonus: 1, description: 'Sound ties it together!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Audio Glitch',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card matches script source. Win +4, Lose -2',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextMatchesSource('script'),
    },
  ],
};

const IRON_GATE_SECURITY: Omit<Talent, 'id'> = {
  name: 'Iron Gate Security',
  type: 'Crew',
  skill: 3,
  heat: 0,
  cost: 10,
  trait: 'Security Detail',
  traitDesc: 'Premium crew that reduces Incident impact.',
  cards: [
    {
      name: 'Secure Perimeter',
      cardType: 'action',
      baseQuality: 1,
      synergyText: 'Remove 1 Incident from remaining deck',
      synergyCondition: () => ({ bonus: 0, description: 'Threat neutralized!' }),
      riskTag: '🟢',
      special: 'removeRed',
    },
    {
      name: 'VIP Protection',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if an Actor card was played (protecting the talent)',
      synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'actor') ? { bonus: 2, description: 'Talent feels safe!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Lockdown Protocol',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+3 if any Incident already played (damage control)',
      synergyCondition: (ctx) => ctx.incidentCount > 0 ? { bonus: 3, description: 'Security contained the damage!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'False Alarm',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is NOT an Incident. Win +3, Lose -4',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsNotIncident(),
    },
  ],
};

const FREELANCE_SKELETON_CREW: Omit<Talent, 'id'> = {
  name: 'Freelance Skeleton Crew',
  type: 'Crew',
  skill: 1,
  heat: 0,
  cost: 1,
  trait: 'Bare Bones',
  traitDesc: 'Ultra cheap but cards are mostly Challenge type (volatile).',
  cards: [
    {
      name: 'Scrappy Setup',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if a Director card played',
      synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'director') ? { bonus: 2, description: 'Director made it work!' } : { bonus: 0 },
      riskTag: '🟢',
    },
    {
      name: 'Risky Shortcut',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is Action. Win +4, Lose -3',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsAction(),
    },
    {
      name: 'Corner Cutting',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card has high value. Win +5, Lose -3',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsHighValue(),
    },
    {
      name: 'Equipment Breakdown',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Cheap gear fails again',
      synergyCondition: noSynergy,
      riskTag: '🔴',
    },
  ],
};

// ─── NEW CREW (Round 7) ───

const PHANTOM_EDITING: Omit<Talent, 'id'> = {
  name: 'Phantom Editing',
  type: 'Crew',
  skill: 4,
  heat: 0,
  cost: 11,
  trait: 'Master Editors',
  traitDesc: '🎯 PRECISION editors. Cards that manipulate the discard pile and reward selective play.',
  cards: [
    {
      name: 'Invisible Cut',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🎯 +2 per card discarded this production (max +6). Every cut makes it better.',
      synergyCondition: (ctx) => {
        const bonus = Math.min(ctx.discardedCount * 2, 6);
        return bonus > 0 ? { bonus, description: `${ctx.discardedCount} cuts = perfection!` } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Montage Magic',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🎯 +2 if Actor card played. +2 if Director card played. +1 per Precision tag (max +2).',
      synergyCondition: (ctx) => {
        let bonus = 0;
        if (ctx.playedCards.some(c => c.sourceType === 'actor')) bonus += 2;
        if (ctx.playedCards.some(c => c.sourceType === 'director')) bonus += 2;
        bonus += Math.min(ctx.tagsPlayed['precision'] || 0, 2);
        return bonus > 0 ? { bonus, description: 'Perfect montage!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Pacing Perfection',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🎯 +3 if draws 3-5 (the sweet spot). +2 if clean wrap still possible.',
      synergyCondition: (ctx) => {
        let bonus = (ctx.drawNumber >= 3 && ctx.drawNumber <= 5) ? 3 : 0;
        if (ctx.incidentCount === 0) bonus += 2;
        return bonus > 0 ? { bonus, description: 'Perfect pacing!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Continuity Error',
      cardType: 'incident',
      baseQuality: -3,
      synergyText: 'Editors missed something. -2 more if 0 discarded cards (no editing done).',
      synergyCondition: (ctx) => ctx.discardedCount === 0 ? { bonus: -2, description: 'No editing safety net!' } : { bonus: 0 },
      riskTag: '🔴',
    },
  ],
};

const ALL_CREW: Omit<Talent, 'id'>[] = [STANDARD_GRIP_TEAM, MARIA_SANTOS, QUICK_FIX_PRODUCTIONS, APEX_STUDIOS_VFX, THE_NOMADS, STELLAR_SOUND_DESIGN, IRON_GATE_SECURITY, FREELANCE_SKELETON_CREW, PHANTOM_EDITING];

// ─── SCRIPTS WITH CARD DECKS ───

const NIGHTMARE_ALLEY_CARDS: CardTemplate[] = [
  {
    name: 'Jump Scare',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💀 +3 if NO cards played yet. +2 if any Chaos tags (fear feeds on chaos).',
    synergyCondition: (ctx) => {
      let bonus = 0; let desc = '';
      if (ctx.playedCards.length === 0) { bonus += 3; desc += 'Opening shock! '; }
      if ((ctx.tagsPlayed['chaos'] || 0) > 0) { bonus += 2; desc += 'Chaos fuels fear! '; }
      return bonus > 0 ? { bonus, description: desc } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['chaos'] as CardTag[],
  },
  {
    name: 'Building Dread',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💀 CHAOS: +1 per card played (max +4). Incidents count double!',
    synergyCondition: (ctx) => {
      const base = Math.min(ctx.playedCards.length, 4);
      const incidentBonus = Math.min(ctx.incidentCount, 2);
      return (base + incidentBonus) > 0 ? { bonus: base + incidentBonus, description: `Dread builds... ${ctx.incidentCount > 0 ? 'incidents deepen the horror!' : ''}` } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['chaos'] as CardTag[],
  },
  {
    name: 'The Reveal',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+3 if draw 4+. +2 if 2+ Chaos tags (the horror was building all along).',
    synergyCondition: (ctx) => {
      let bonus = ctx.drawNumber >= 4 ? 3 : 0;
      if ((ctx.tagsPlayed['chaos'] || 0) >= 2) bonus += 2;
      return bonus > 0 ? { bonus, description: 'The reveal!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['chaos'] as CardTag[],
  },
  {
    name: 'Creepy Atmosphere',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+2 if Director card played. +1 per Chaos tag (max +2).',
    synergyCondition: (ctx) => {
      let bonus = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0;
      bonus += Math.min(ctx.tagsPlayed['chaos'] || 0, 2);
      return bonus > 0 ? { bonus, description: 'Atmosphere of dread!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['chaos'] as CardTag[],
  },
  {
    name: 'Gore Backlash',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: '-1 per Actor card played. But adds Chaos tags.',
    synergyCondition: (ctx) => {
      const count = ctx.playedCards.filter(c => c.sourceType === 'actor').length;
      return count > 0 ? { bonus: -count, description: `Stars hated this! -${count}` } : { bonus: 0 };
    },
    riskTag: '🔴',
    tags: ['chaos', 'chaos'] as CardTag[],
  },
  {
    name: 'Cursed Set',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'Bad luck on set. Feeds Chaos synergies.',
    synergyCondition: () => ({ bonus: 0, description: 'The set is cursed!' }),
    riskTag: '🔴',
    tags: ['chaos'] as CardTag[],
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
    baseQuality: 1,
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
    synergyText: '🎯💕 +3 if 2+ Actor cards played. +2 if both Precision AND Heart tags exist.',
    synergyCondition: (ctx) => {
      let bonus = 0; let desc = '';
      if (ctx.playedCards.filter(c => c.sourceType === 'actor').length >= 2) { bonus += 3; desc += 'Actors carried it! '; }
      if ((ctx.tagsPlayed['precision'] || 0) > 0 && (ctx.tagsPlayed['heart'] || 0) > 0) { bonus += 2; desc += 'Precision meets heart! '; }
      return bonus > 0 ? { bonus, description: desc } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['precision', 'heart'] as CardTag[],
  },
  {
    name: 'Subtle Writing',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '🎯 PRECISION: +2 if Director card played. +1 per Precision tag (max +3).',
    synergyCondition: (ctx) => {
      let bonus = 0; let desc = '';
      if (ctx.playedCards.some(c => c.sourceType === 'director')) { bonus += 2; desc += 'Director elevated! '; }
      const precBonus = Math.min(ctx.tagsPlayed['precision'] || 0, 3);
      if (precBonus > 0) { bonus += precBonus; desc += `${precBonus} Precision! `; }
      return bonus > 0 ? { bonus, description: desc } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['precision'] as CardTag[],
  },
  {
    name: 'Character Study',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+1 per unique source type played (max +4). Ensemble excellence.',
    synergyCondition: (ctx) => {
      const types = new Set(ctx.playedCards.map(c => c.sourceType));
      return types.size > 0 ? { bonus: Math.min(types.size, 4), description: `${types.size} unique types!` } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['precision'] as CardTag[],
  },
  {
    name: 'Awards Bait Monologue',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+3 if Lead Skill 4+. +2 if 4+ Precision tags (awards-worthy craft).',
    synergyCondition: (ctx) => {
      let bonus = ctx.leadSkill >= 4 ? 3 : 0;
      if ((ctx.tagsPlayed['precision'] || 0) >= 4) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Star monologue!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['precision', 'heart'] as CardTag[],
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
    synergyText: 'If quality under 10, -3 more. Precision without soul.',
    synergyCondition: (ctx) => ctx.totalQuality < 10 ? { bonus: -3, description: 'Pretension without substance!' } : { bonus: 0 },
    riskTag: '🔴',
  },
];

const NEON_FURY_CARDS: CardTemplate[] = [
  {
    name: 'Chase Sequence',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '🔥 MOMENTUM: +2 if Actor card played. +1 per Momentum tag (max +2).',
    synergyCondition: (ctx) => {
      let bonus = 0; let desc = '';
      if (ctx.playedCards.some(c => c.sourceType === 'actor')) { bonus += 2; desc += 'Star driving! '; }
      const momBonus = Math.min(ctx.tagsPlayed['momentum'] || 0, 2);
      if (momBonus > 0) { bonus += momBonus; desc += 'Momentum! '; }
      return bonus > 0 ? { bonus, description: desc } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['momentum', 'spectacle'] as CardTag[],
  },
  {
    name: 'Explosion!',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '✨ SPECTACLE: +2 if Crew card played. +2 if 3+ Spectacle tags.',
    synergyCondition: (ctx) => {
      let bonus = 0; let desc = '';
      if (ctx.playedCards.some(c => c.sourceType === 'crew')) { bonus += 2; desc += 'Practical effects! '; }
      if ((ctx.tagsPlayed['spectacle'] || 0) >= 3) { bonus += 2; desc += 'SPECTACLE CHAIN! '; }
      return bonus > 0 ? { bonus, description: desc } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['spectacle'] as CardTag[],
  },
  {
    name: 'Fight Choreography',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+2 if Lead Skill 4+. +1 per Momentum tag (max +2).',
    synergyCondition: (ctx) => {
      let bonus = ctx.leadSkill >= 4 ? 2 : 0;
      const momBonus = Math.min(ctx.tagsPlayed['momentum'] || 0, 2);
      bonus += momBonus;
      return bonus > 0 ? { bonus, description: 'Star choreography!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['momentum'] as CardTag[],
  },
  {
    name: 'Stunt Goes Wrong',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card is Action. Win +4, Lose -3',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: betNextIsAction(),
    tags: ['spectacle'] as CardTag[],
  },
  {
    name: 'CGI Overload',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Sacrifice next card to double last card. High risk!',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: betSacrificeForDouble(),
    tags: ['spectacle'] as CardTag[],
  },
  {
    name: 'Bloated Runtime',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'If 5+ cards drawn, -3 more. Spectacle without discipline.',
    synergyCondition: (ctx) => ctx.drawNumber >= 5 ? { bonus: -3, description: 'Movie is too long!' } : { bonus: 0 },
    riskTag: '🔴',
  },
];

const DEEP_BLUE_CARDS: CardTemplate[] = [
  {
    name: 'Quantum Leap',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+1 per unique source type played (max +4)',
    synergyCondition: (ctx) => {
      const types = new Set(ctx.playedCards.map(c => c.sourceType));
      return types.size > 0 ? { bonus: Math.min(types.size, 4), description: `${types.size} diverse types = innovation!` } : { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'AI Uprising',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+2 if a Crew card was played',
    synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'crew') ? { bonus: 2, description: 'VFX brought the AI to life!' } : { bonus: 0 },
    riskTag: '🟢',
  },
  {
    name: 'Space Walk Sequence',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+3 if a Director card was played',
    synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'director') ? { bonus: 3, description: 'Director nailed the zero-G!' } : { bonus: 0 },
    riskTag: '🟢',
  },
  {
    name: 'Temporal Paradox',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card is NOT an Incident. Win +3, Lose -4',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: betNextIsNotIncident(),
  },
  {
    name: 'Plot Hole',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'The science makes no sense. -2 more if no Script cards played.',
    synergyCondition: (ctx) => !ctx.playedCards.some(c => c.sourceType === 'script') ? { bonus: -2, description: 'No script foundation!' } : { bonus: 0 },
    riskTag: '🔴',
  },
  {
    name: 'VFX Budget Explosion',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: 'Lose $2M on effects',
    synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'VFX costs spiraled!' }),
    riskTag: '🔴',
  },
];

const HEARTS_ON_FIRE_CARDS: CardTemplate[] = [
  {
    name: 'Meet Cute',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💕 HEART: +3 if 2+ Actor cards played. +2 if 3+ Heart tags (the audience is invested).',
    synergyCondition: (ctx) => {
      let bonus = 0; let desc = '';
      if (ctx.playedCards.filter(c => c.sourceType === 'actor').length >= 2) { bonus += 3; desc += 'Chemistry! '; }
      if ((ctx.tagsPlayed['heart'] || 0) >= 3) { bonus += 2; desc += 'Audience invested! '; }
      return bonus > 0 ? { bonus, description: desc } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['heart'] as CardTag[],
  },
  {
    name: 'Grand Gesture',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💕 HEART: +2 if Actor card played. +1 per Heart tag (max +3).',
    synergyCondition: (ctx) => {
      let bonus = 0; let desc = '';
      if (ctx.playedCards.some(c => c.sourceType === 'actor')) { bonus += 2; desc += 'Star sold it! '; }
      const hb = Math.min(ctx.tagsPlayed['heart'] || 0, 3);
      if (hb > 0) { bonus += hb; desc += `${hb} Heart! `; }
      return bonus > 0 ? { bonus, description: desc } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['heart'] as CardTag[],
  },
  {
    name: 'Emotional Soundtrack',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💕 +2 if Crew card played. +2 if 5+ Heart tags (emotional climax!).',
    synergyCondition: (ctx) => {
      let bonus = 0; let desc = '';
      if (ctx.playedCards.some(c => c.sourceType === 'crew')) { bonus += 2; desc += 'Music swells! '; }
      if ((ctx.tagsPlayed['heart'] || 0) >= 5) { bonus += 2; desc += 'EMOTIONAL CLIMAX! '; }
      return bonus > 0 ? { bonus, description: desc } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['heart'] as CardTag[],
  },
  {
    name: 'Love Triangle',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card is from an Actor. Win +4, Lose -3',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: betNextIsFromActor(),
    tags: ['heart'] as CardTag[],
  },
  {
    name: 'Forced Chemistry',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'Leads have zero spark. -2 more if 0 Heart tags.',
    synergyCondition: (ctx) => (ctx.tagsPlayed['heart'] || 0) === 0 ? { bonus: -2, description: 'No emotional foundation!' } : { bonus: 0 },
    riskTag: '🔴',
  },
  {
    name: 'Cliché Overload',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: 'If quality under 15, -2 more. Heart tags can\'t save bad writing.',
    synergyCondition: (ctx) => ctx.totalQuality < 15 ? { bonus: -2, description: 'Too many clichés!' } : { bonus: 0 },
    riskTag: '🔴',
    tags: ['heart'] as CardTag[],
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
    abilityDesc: 'Final Girl: If you wrap after exactly 5 draws, +5 bonus. Chaos tags count as +1 quality each.',
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
    ability: 'precisionCraft',
    abilityDesc: 'Precision Craft: Each Precision tag adds +1 quality. Clean wrap bonus doubled.',
  },
  {
    title: 'Neon Fury',
    genre: 'Action',
    baseScore: 6,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 2,
    cards: NEON_FURY_CARDS,
    ability: 'blockbusterBonus',
    abilityDesc: 'Blockbuster: Market multiplier +0.3. Each Spectacle tag adds +0.05 more.',
  },
  {
    title: 'Deep Blue',
    genre: 'Sci-Fi',
    baseScore: 7,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 4,
    cards: DEEP_BLUE_CARDS,
    ability: 'prestige',
    abilityDesc: 'Diversity Bonus: Cards from diverse sources get extra value',
  },
  {
    title: 'Hearts on Fire',
    genre: 'Romance',
    baseScore: 5,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 2,
    cards: HEARTS_ON_FIRE_CARDS,
    ability: 'heartEngine',
    abilityDesc: 'Heart Engine: Each Heart tag adds +1 quality. 6+ Heart = additional ×1.2 multiplier!',
  },
];

// ─── THRILLER SCRIPTS ───

const SHADOW_PROTOCOL_CARDS: CardTemplate[] = [
  {
    name: 'Tension Build',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+1 per card played so far (max +4)',
    synergyCondition: (ctx) => {
      const count = Math.min(ctx.playedCards.length, 4);
      return count > 0 ? { bonus: count, description: `Tension mounts... +${count}!` } : { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'Plot Twist',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+4 if this is draw 4+, else +1',
    synergyCondition: (ctx) => ctx.drawNumber >= 4 ? { bonus: 4, description: 'The twist hits!' } : { bonus: 1, description: 'Building...' },
    riskTag: '🟢',
  },
  {
    name: 'Interrogation Scene',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+3 if an Actor AND Director card played',
    synergyCondition: (ctx) => {
      const hasActor = ctx.playedCards.some(c => c.sourceType === 'actor');
      const hasDir = ctx.playedCards.some(c => c.sourceType === 'director');
      return (hasActor && hasDir) ? { bonus: 3, description: 'Intense interrogation!' } : { bonus: 0 };
    },
    riskTag: '🟢',
  },
  {
    name: 'Red Herring',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card is NOT an Incident. Win +3, Lose -4',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: betNextIsNotIncident(),
  },
  {
    name: 'Logic Gap',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: 'Audience catches a plothole. -2 more if no Director card played.',
    synergyCondition: (ctx) => !ctx.playedCards.some(c => c.sourceType === 'director') ? { bonus: -2, description: 'No director to cover the gap!' } : { bonus: 0 },
    riskTag: '🔴',
  },
  {
    name: 'Predictable Ending',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'Everyone saw it coming',
    synergyCondition: noSynergy,
    riskTag: '🔴',
  },
];

const COLD_TRAIL_CARDS: CardTemplate[] = [
  {
    name: 'Opening Crime',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+3 if this is draw 1 or 2 (hook the audience)',
    synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 3, description: 'Gripping opening!' } : { bonus: 0 },
    riskTag: '🟢',
  },
  {
    name: 'Evidence Montage',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+2 if a Crew card was played',
    synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'crew') ? { bonus: 2, description: 'Crew nailed the montage!' } : { bonus: 0 },
    riskTag: '🟢',
  },
  {
    name: 'Suspect Confrontation',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+2 if 2+ Actor cards played',
    synergyCondition: (ctx) => ctx.playedCards.filter(c => c.sourceType === 'actor').length >= 2 ? { bonus: 2, description: 'Actors clash brilliantly!' } : { bonus: 0 },
    riskTag: '🟢',
  },
  {
    name: 'Case Goes Cold',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card has high value. Win +5, Lose -3',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: betNextIsHighValue(),
  },
  {
    name: 'Implausible Motive',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: 'The mystery falls apart',
    synergyCondition: noSynergy,
    riskTag: '🔴',
  },
  {
    name: 'Reshoots Needed',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'Key scene doesn\'t work. Lose $2M.',
    synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'Expensive reshoots!' }),
    riskTag: '🔴',
  },
];

// Add to ALL_SCRIPTS
ALL_SCRIPTS.push(
  {
    title: 'Shadow Protocol',
    genre: 'Thriller',
    baseScore: 6,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 3,
    cards: SHADOW_PROTOCOL_CARDS,
    ability: 'slowBurn',
    abilityDesc: 'Slow Burn: Cards after draw 4 get +1 base. Thriller Twist: exactly 2 Incidents = +8 quality!',
  },
  {
    title: 'Cold Trail',
    genre: 'Thriller',
    baseScore: 7,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 4,
    cards: COLD_TRAIL_CARDS,
    ability: 'prestige',
    abilityDesc: 'Prestige: Quality above 35 counts double for nominations',
  },
);

// ─── NEW SCRIPTS (Round 7) ───

const CHROME_DYNASTY_CARDS: CardTemplate[] = [
  {
    name: 'Neon Skyline',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '✨ SPECTACLE: +2 if Crew card played. +1 per Spectacle tag (max +3). Cyberpunk aesthetic.',
    synergyCondition: (ctx) => {
      let bonus = ctx.playedCards.some(c => c.sourceType === 'crew') ? 2 : 0;
      bonus += Math.min(ctx.tagsPlayed['spectacle'] || 0, 3);
      return bonus > 0 ? { bonus, description: 'Cyberpunk beauty!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['spectacle'] as CardTag[],
  },
  {
    name: 'Hacker Sequence',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '🔥 MOMENTUM: +2 if previous card was Action. +2 if action streak ≥ 2.',
    synergyCondition: (ctx) => {
      let bonus = (ctx.previousCard?.cardType === 'action') ? 2 : 0;
      if (ctx.greenStreak >= 2) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Hacking streak!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['momentum'] as CardTag[],
  },
  {
    name: 'Corporate Betrayal',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '+3 if Actor AND Director cards played. The conspiracy unfolds.',
    synergyCondition: (ctx) => {
      const hasActor = ctx.playedCards.some(c => c.sourceType === 'actor');
      const hasDir = ctx.playedCards.some(c => c.sourceType === 'director');
      return (hasActor && hasDir) ? { bonus: 3, description: 'Conspiracy!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['precision'] as CardTag[],
  },
  {
    name: 'System Crash',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Sacrifice next card to double last card. Digital risk!',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: betSacrificeForDouble(),
    tags: ['spectacle'] as CardTag[],
  },
  {
    name: 'Derivative Plot',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: 'Audiences saw it coming. -2 if no Spectacle tags (nothing new to offer).',
    synergyCondition: (ctx) => (ctx.tagsPlayed['spectacle'] || 0) === 0 ? { bonus: -2, description: 'Nothing new!' } : { bonus: 0 },
    riskTag: '🔴',
  },
  {
    name: 'Budget Blackhole',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'VFX costs spiraled. Lose $3M.',
    synergyCondition: () => ({ bonus: 0, budgetMod: -3, description: 'VFX costs exploded!' }),
    riskTag: '🔴',
  },
];

const LAST_DANCE_CARDS: CardTemplate[] = [
  {
    name: 'Opening Number',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💕 HEART: +3 if draw 1-2 (set the tone). +1 per Heart tag (max +2).',
    synergyCondition: (ctx) => {
      let bonus = ctx.drawNumber <= 2 ? 3 : 0;
      bonus += Math.min(ctx.tagsPlayed['heart'] || 0, 2);
      return bonus > 0 ? { bonus, description: 'The show begins!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['heart', 'spectacle'] as CardTag[],
  },
  {
    name: 'Duet',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💕 +3 if 2+ Actor cards played. Chemistry on the dance floor.',
    synergyCondition: (ctx) => ctx.playedCards.filter(c => c.sourceType === 'actor').length >= 2 ? { bonus: 3, description: 'Perfect duet!' } : { bonus: 0 },
    riskTag: '🟢',
    tags: ['heart'] as CardTag[],
  },
  {
    name: 'Final Bow',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💕✨ +2 per Heart tag + 1 per Spectacle tag (max +8). The grand finale!',
    synergyCondition: (ctx) => {
      const h = ctx.tagsPlayed['heart'] || 0;
      const s = ctx.tagsPlayed['spectacle'] || 0;
      const bonus = Math.min(h * 2 + s, 8);
      return bonus > 0 ? { bonus, description: 'Standing ovation!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['heart', 'spectacle'] as CardTag[],
  },
  {
    name: 'Costume Malfunction',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card is from an Actor. Win +4, Lose -3',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: betNextIsFromActor(),
    tags: ['heart'] as CardTag[],
  },
  {
    name: 'Tone Deaf Scene',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: 'Musical number falls flat. -2 if 0 Heart tags.',
    synergyCondition: (ctx) => (ctx.tagsPlayed['heart'] || 0) === 0 ? { bonus: -2, description: 'No heart, no music!' } : { bonus: 0 },
    riskTag: '🔴',
    tags: ['heart'] as CardTag[],
  },
  {
    name: 'Lip Sync Disaster',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'Caught lip syncing. The internet is merciless.',
    synergyCondition: noSynergy,
    riskTag: '🔴',
  },
];

const IRON_VERDICT_CARDS: CardTemplate[] = [
  {
    name: 'Opening Statement',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '🎯 +3 if draw 1-2. +1 per Precision tag (max +2). Set the case.',
    synergyCondition: (ctx) => {
      let bonus = ctx.drawNumber <= 2 ? 3 : 0;
      bonus += Math.min(ctx.tagsPlayed['precision'] || 0, 2);
      return bonus > 0 ? { bonus, description: 'Strong opening!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['precision'] as CardTag[],
  },
  {
    name: 'Cross Examination',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '🎯💕 +2 if Actor card played. +2 if Director card played. Courtroom precision.',
    synergyCondition: (ctx) => {
      let bonus = 0;
      if (ctx.playedCards.some(c => c.sourceType === 'actor')) bonus += 2;
      if (ctx.playedCards.some(c => c.sourceType === 'director')) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Brilliant examination!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['precision', 'heart'] as CardTag[],
  },
  {
    name: 'Closing Argument',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '🎯 +1 per card played (max +5). The case builds to a verdict.',
    synergyCondition: (ctx) => {
      const bonus = Math.min(ctx.playedCards.length, 5);
      return bonus > 0 ? { bonus, description: `${ctx.playedCards.length} pieces of evidence!` } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['precision'] as CardTag[],
  },
  {
    name: 'Surprise Witness',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card is from an Actor. Win +5, Lose -3. Surprise!',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: { ...betNextIsFromActor(), successBonus: 5 },
  },
  {
    name: 'Mistrial',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'Procedural error. -2 if no Precision tags (sloppy lawyering).',
    synergyCondition: (ctx) => (ctx.tagsPlayed['precision'] || 0) === 0 ? { bonus: -2, description: 'Sloppy case!' } : { bonus: 0 },
    riskTag: '🔴',
  },
  {
    name: 'Jury Walkout',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: 'Jury is bored. -1 per card played beyond 4 (too long!).',
    synergyCondition: (ctx) => {
      const excess = Math.max(0, ctx.playedCards.length - 4);
      return excess > 0 ? { bonus: -excess, description: 'Case dragged on!' } : { bonus: 0 };
    },
    riskTag: '🔴',
  },
];

const SAVAGE_LANDS_CARDS: CardTemplate[] = [
  {
    name: 'Into The Wild',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '🔥💀 +2 if draw 1-2. +2 per Chaos tag (max +4). Survival instinct kicks in.',
    synergyCondition: (ctx) => {
      let bonus = ctx.drawNumber <= 2 ? 2 : 0;
      bonus += Math.min((ctx.tagsPlayed['chaos'] || 0) * 2, 4);
      return bonus > 0 ? { bonus, description: 'Survival mode!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['momentum', 'chaos'] as CardTag[],
  },
  {
    name: 'Campfire Scene',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💕🔥 +2 if Actor card played. +2 if Heart tag exists. Quiet humanity amid chaos.',
    synergyCondition: (ctx) => {
      let bonus = ctx.playedCards.some(c => c.sourceType === 'actor') ? 2 : 0;
      if ((ctx.tagsPlayed['heart'] || 0) > 0) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Humanity shines through!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['heart', 'momentum'] as CardTag[],
  },
  {
    name: 'Predator Attack',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💀✨ +3 if any Incident played. +2 if Crew card played. Raw survival spectacle.',
    synergyCondition: (ctx) => {
      let bonus = ctx.incidentCount > 0 ? 3 : 0;
      if (ctx.playedCards.some(c => c.sourceType === 'crew')) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Survival spectacle!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['chaos', 'spectacle'] as CardTag[],
  },
  {
    name: 'Flash Flood',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card is NOT an Incident. Win +4, Lose -5. Nature is unpredictable!',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: { ...betNextIsNotIncident(), successBonus: 4, failPenalty: -5 },
    tags: ['chaos'] as CardTag[],
  },
  {
    name: 'Cast Rebellion',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: 'Actors hate the wilderness. Lose $1M.',
    synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'Actors want out!' }),
    riskTag: '🔴',
    tags: ['chaos'] as CardTag[],
  },
  {
    name: 'Weather Shutdown',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'Production halted by storms. Adds Chaos tag though.',
    synergyCondition: noSynergy,
    riskTag: '🔴',
    tags: ['chaos'] as CardTag[],
  },
];

ALL_SCRIPTS.push(
  {
    title: 'Chrome Dynasty',
    genre: 'Sci-Fi',
    baseScore: 8,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 5,
    cards: CHROME_DYNASTY_CARDS,
    ability: 'blockbusterBonus',
    abilityDesc: 'Cyberpunk Spectacle: Market multiplier +0.3. Each Spectacle tag adds +0.05 more.',
  },
  {
    title: 'Last Dance',
    genre: 'Romance',
    baseScore: 6,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 3,
    cards: LAST_DANCE_CARDS,
    ability: 'heartEngine',
    abilityDesc: 'Musical Heart: Each Heart tag adds +1 quality. 6+ Heart = additional ×1.2 multiplier!',
  },
  {
    title: 'Iron Verdict',
    genre: 'Drama',
    baseScore: 7,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 4,
    cards: IRON_VERDICT_CARDS,
    ability: 'precisionCraft',
    abilityDesc: 'Courtroom Precision: Each Precision tag adds +1 quality. Clean wrap bonus doubled.',
  },
  {
    title: 'Savage Lands',
    genre: 'Action',
    baseScore: 6,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 3,
    cards: SAVAGE_LANDS_CARDS,
    ability: 'survivalMode',
    abilityDesc: 'Survival Mode: Each Chaos tag adds +1 quality. Each Incident adds +$1M budget. Embrace the wild.',
  },
);

// ─── GENERATION FUNCTIONS ───

export function generateScripts(count: number, _season: number): Script[] {
  const pool = [...ALL_SCRIPTS];
  const result: Script[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
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
    const pick = pool[Math.floor(rng() * pool.length)];
    if (!usedNames.has(pick.name)) {
      usedNames.add(pick.name);
      result.push(makeTalent(pick));
    }
  }

  const allTalent = [...ALL_LEADS, ...ALL_SUPPORTS, ...ALL_DIRECTORS, ...ALL_CREW].filter(t => !rosterNames.has(t.name));
  while (result.length < count) {
    const available = allTalent.filter(t => !usedNames.has(t.name));
    if (available.length === 0) break;
    const pick = available[Math.floor(rng() * available.length)];
    usedNames.add(pick.name);
    result.push(makeTalent(pick));
  }

  return result;
}

// Starter pools: pick 1 from each pool for variety each run
const STARTER_LEADS: Omit<Talent, 'id'>[] = [SOPHIE_CHEN, DARIUS_KNOX, RAFAEL_SANTOS, LENA_FROST, IRIS_MOON];
const STARTER_DIRECTORS: Omit<Talent, 'id'>[] = [RICK_BLASTER, ZOE_PARK, DAKOTA_STEELE, NOVA_SINCLAIR];
const STARTER_CREW: Omit<Talent, 'id'>[] = [STANDARD_GRIP_TEAM, QUICK_FIX_PRODUCTIONS, THE_NOMADS, PHANTOM_EDITING];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function starterRoster(): Talent[] {
  return [
    makeTalent(pickRandom(STARTER_LEADS)),
    makeTalent(pickRandom(STARTER_DIRECTORS)),
    makeTalent(pickRandom(STARTER_CREW)),
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

export function generateMarketConditions(count: number, scriptGenres?: string[]): MarketCondition[] {
  const pool = [...ALL_MARKETS];
  const result: MarketCondition[] = [];
  
  // Guarantee at least one market matches an available script genre (if provided)
  // This prevents "no good market" frustration
  if (scriptGenres && scriptGenres.length > 0) {
    const matchingMarkets = pool.filter(m => m.genreBonus && scriptGenres.includes(m.genreBonus));
    if (matchingMarkets.length > 0) {
      const pick = matchingMarkets[Math.floor(rng() * matchingMarkets.length)];
      const idx = pool.findIndex(m => m.name === pick.name);
      if (idx >= 0) {
        result.push({ ...pool.splice(idx, 1)[0], id: uid() });
      }
    }
  }
  
  // Fill remaining slots randomly
  for (let i = result.length; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
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
    const idx = Math.floor(rng() * pool.length);
    result.push({ ...pool.splice(idx, 1)[0], id: uid() });
  }
  return result;
}

export function getSeasonTarget(season: number, gameMode: string = 'normal', challengeId?: string): number {
  let adjustedSeason = season;
  // Speed Run: use seasons 3/4/5 difficulty for seasons 1/2/3
  if (challengeId === 'speed_run') adjustedSeason = season + 2;
  const base = [20, 28, 38, 50, 62][adjustedSeason - 1] || 62 + (adjustedSeason - 5) * 12;
  let target = base;
  if (gameMode === 'newGamePlus') target = Math.round(base * 1.4);
  else if (gameMode === 'directorMode') target = Math.round(base * 1.8);
  // Critics' Choice: targets ×1.5
  if (challengeId === 'critics_choice') target = Math.round(target * 1.5);
  return target;
}

export interface IndustryEvent {
  id: string;
  name: string;
  description: string;
  effect: string; // key used by gameStore to apply mechanical effect
}

export const INDUSTRY_EVENTS: IndustryEvent[] = [
  { id: 'superhero_fatigue', name: 'Superhero Fatigue', description: 'Action films get -×0.3 market multiplier', effect: 'actionNerf' },
  { id: 'indie_boom', name: 'Indie Boom', description: 'Films with total Heat ≤ 3 get +5 quality', effect: 'indieBoost' },
  { id: 'tax_incentives', name: 'Tax Incentives', description: 'All hiring costs $2M less (min $1)', effect: 'cheapHires' },
  { id: 'sequel_mania', name: 'Sequel Mania', description: 'All script base scores +2', effect: 'baseBoost' },
  { id: 'streaming_surge', name: 'Streaming Surge', description: 'Flops only lose 25% earnings (not 50%)', effect: 'streamingSafety' },
  { id: 'award_hype', name: 'Award Season Hype', description: 'Drama films get +×0.5 market multiplier', effect: 'dramaBoost' },
  { id: 'horror_wave', name: 'Horror Wave', description: 'Horror films get +×0.5 market multiplier', effect: 'horrorBoost' },
  { id: 'comedy_renaissance', name: 'Comedy Renaissance', description: 'Comedy films get +×0.3 market multiplier', effect: 'comedyBoost' },
  { id: 'talent_drought', name: 'Talent Drought', description: 'Only 3 talent available in markets', effect: 'talentDrought' },
  { id: 'golden_age', name: 'Golden Age', description: 'All films get +3 base quality', effect: 'goldenAge' },
];

// ─── STUDIO ARCHETYPES ───

export const STUDIO_ARCHETYPES: StudioArchetype[] = [
  {
    id: 'prestige',
    name: 'Prestige Pictures',
    emoji: '🏆',
    description: 'Clean Wrap bonus doubled (+8 base). Genre mastery gives +3 instead of +2. Built for consistent excellence.',
    effect: 'prestige',
  },
  {
    id: 'blockbuster',
    name: 'Titan Studios',
    emoji: '💥',
    description: 'Start with +$5M budget. All box office multipliers get +0.2. Go big or go home.',
    effect: 'blockbuster',
  },
  {
    id: 'indie',
    name: 'Moonlight Films',
    emoji: '🌙',
    description: 'Start with 4 talent in roster (extra Support). Films with total Heat ≤ 3 get +5 quality. Quality over quantity.',
    effect: 'indie',
  },
  {
    id: 'chaos',
    name: 'Wildcard Entertainment',
    emoji: '🎰',
    description: 'Incidents need 4 to Disaster (not 3). Chaos-tagged cards get +1 base quality. High variance, no safety net.',
    effect: 'chaos',
  },
];

// ─── TALENT CHEMISTRY ───

export const ALL_CHEMISTRY: Chemistry[] = [
  { talent1: 'Valentina Cortez', talent2: 'Ava Thornton', name: 'Auteur\'s Muse', description: 'Valentina and Ava bring out each other\'s best. +4 quality.', qualityBonus: 4 },
  { talent1: 'Jake Steele', talent2: 'Mei Ling', name: 'Action Legends', description: 'Two action icons together. +3 quality.', qualityBonus: 3 },
  { talent1: 'Marcus Webb', talent2: 'Frank DeLuca', name: 'Method Meets Spectacle', description: 'Method acting meets blockbuster vision. +3 quality.', qualityBonus: 3 },
  { talent1: 'Oliver Cross', talent2: 'Kenji Murakami', name: 'Dark Vision', description: 'Two intense artists push the limits. +4 quality, but adds 1 extra Incident card.', qualityBonus: 4 },
  { talent1: 'Sophie Chen', talent2: 'Zoe Park', name: 'Indie Darlings', description: 'Rising star meets indie director. +3 quality.', qualityBonus: 3 },
  { talent1: 'Camille Durand', talent2: 'Samira Al-Rashid', name: 'Art House Alliance', description: 'European art meets documentary truth. +3 quality.', qualityBonus: 3 },
  { talent1: 'Rafael Santos', talent2: 'Roxanne Blaze', name: 'Tabloid Power Couple', description: 'The paparazzi can\'t look away. +2 quality, +$2M budget.', qualityBonus: 2 },
  { talent1: 'Lena Frost', talent2: 'Nikolai Volkov', name: 'Ice & Fire', description: 'Opposites attract. +3 quality.', qualityBonus: 3 },
  { talent1: 'Darius Knox', talent2: 'Danny Park', name: 'Character Duo', description: 'Two character actors elevate everything. +3 quality.', qualityBonus: 3 },
  { talent1: 'Jake Steele', talent2: 'Dakota Steele', name: 'Father & Child', description: 'Family connection. +2 quality, Dakota gets confidence.', qualityBonus: 2 },
  { talent1: 'Marcus Webb', talent2: 'Ava Thornton', name: 'Method & Vision', description: 'Director who can handle the method actor. +4 quality.', qualityBonus: 4 },
  { talent1: 'Valentina Cortez', talent2: 'Rafael Santos', name: 'Latin Fire', description: 'Explosive on-screen chemistry. +3 quality.', qualityBonus: 3 },
  { talent1: 'Oliver Cross', talent2: 'James "Jimmy" Chang', name: 'Horror Method', description: 'Oliver\'s commitment plus Jimmy\'s scares. +4 quality.', qualityBonus: 4 },
  { talent1: 'Hector "Clutch" Morales', talent2: 'The Nomads', name: 'Guerrilla Fix', description: 'The fixer keeps guerrilla production running. +2 quality, remove 1 Incident.', qualityBonus: 2 },
  { talent1: 'Maria Santos', talent2: 'Apex Studios VFX', name: 'Visual Perfection', description: 'Best cinematographer + best VFX. +3 quality.', qualityBonus: 3 },
  { talent1: 'Yuki Tanaka', talent2: 'Darius Knox', name: 'Shape Shifters', description: 'Two chameleons together become unstoppable. +4 quality.', qualityBonus: 4 },
  { talent1: 'Ezra Blackwood', talent2: 'Oliver Cross', name: 'Chaos Twins', description: 'Two agents of chaos. +3 quality, but adds 1 extra Incident.', qualityBonus: 3 },
  { talent1: 'Iris Moon', talent2: 'Nova Sinclair', name: 'Architect & Visionary', description: 'Methodical meets grand vision. +4 quality.', qualityBonus: 4 },
  { talent1: 'Felix Wu', talent2: 'Roxanne Blaze', name: 'Damage & Repair', description: 'One breaks things, the other fixes them. +3 quality.', qualityBonus: 3 },
  { talent1: 'Diego Fuentes', talent2: 'Mei Ling', name: 'Explosive Duo', description: 'Momentum + spectacle fireworks. +3 quality.', qualityBonus: 3 },
  { talent1: 'Phantom Editing', talent2: 'Ava Thornton', name: 'Precision Machine', description: 'Best editors + best auteur. +4 quality.', qualityBonus: 4 },
  { talent1: 'Yuki Tanaka', talent2: 'James "Jimmy" Chang', name: 'Psychological Horror', description: 'Mimic + horror master. +3 quality.', qualityBonus: 3 },
];

export function getActiveChemistry(castNames: string[]): Chemistry[] {
  return ALL_CHEMISTRY.filter(c =>
    castNames.includes(c.talent1) && castNames.includes(c.talent2)
  );
}
