import { Script, Talent, CardTemplate, StudioPerk, MarketCondition, Genre, ChallengeBet, Chemistry, StudioArchetype, CardTag } from './types';
import { rng } from './seededRng';
import { getUnlockedScriptDefs, getUnlockedTalentDefs } from './unlockableContent';
import { isTalentRetired, isLoyalTalent, getAgentFee } from './talentHistory';
import { getEnabledModScripts, getEnabledModTalent } from './modding';
import { customCardToCardTemplate } from './customCards';
import type { CustomScript, CustomTalent } from './customCards';

// Cache prestige level in memory to avoid localStorage reads on every render
let _cachedPrestigeLevel = 0;
try {
  const _pd = JSON.parse(localStorage.getItem('greenlight_prestige') || '{}');
  _cachedPrestigeLevel = _pd.level || 0;
} catch {}
/** Call after prestige level changes to update the in-memory cache */
export function refreshPrestigeLevelCache() {
  try {
    const _pd = JSON.parse(localStorage.getItem('greenlight_prestige') || '{}');
    _cachedPrestigeLevel = _pd.level || 0;
  } catch {}
}

let _id = 0;
const uid = () => `id_${_id++}`;

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
      synergyText: 'Copy the bonus of the last played card (max +4). Knox becomes whatever you need.',
      synergyCondition: (ctx) => {
        const prev = ctx.previousCard;
        if (prev && prev.totalValue && prev.totalValue > 0) {
          const bonus = Math.min(prev.totalValue, 4); // R33: capped at +4 to prevent degenerate combos
          return { bonus, description: `Copied ${prev.name}'s +${bonus}!` };
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

// ─── NEW LEADS (Round 55) ───

const BENNY_ROMANO: Omit<Talent, 'id'> = {
  name: 'Benny Romano',
  type: 'Lead',
  skill: 3,
  heat: 1,
  cost: 8,
  genreBonus: { genre: 'Comedy', bonus: 3 },
  trait: 'Comedy King',
  traitDesc: '😂 Turns chaos into laughs. Incidents become comedy gold when he\'s around. Heart tags fuel wholesome humor.',
  cards: [
    {
      name: 'Perfect Pratfall',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '😂 +2 per Incident played (max +6). Disasters become comedy gold!',
      synergyCondition: (ctx) => {
        const bonus = Math.min(ctx.incidentCount * 2, 6);
        return bonus > 0 ? { bonus, description: `${ctx.incidentCount} disasters = comedy genius!` } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['heart', 'chaos'] as CardTag[],
    },
    {
      name: 'Improvised Monologue',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💕 +2 if Actor card played. +1 per Heart tag (max +3). Wholesome humor.',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.some(c => c.sourceType === 'actor') ? 2 : 0;
        bonus += Math.min(ctx.tagsPlayed['heart'] || 0, 3);
        return bonus > 0 ? { bonus, description: 'Crowd in tears laughing!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Running Bit',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🔥 +1 per Action card in a row (max +4). The bit keeps building!',
      synergyCondition: (ctx) => {
        return ctx.greenStreak > 0 ? { bonus: Math.min(ctx.greenStreak, 4), description: `${ctx.greenStreak} card streak = the bit lands!` } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['momentum'] as CardTag[],
    },
    {
      name: 'Audience Callback',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is NOT an Incident. Win +4, Lose -3',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: { ...betNextIsNotIncident(), successBonus: 4, failPenalty: -3 },
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Bombed On Stage',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Silence. But adds Heart tag (they felt something, at least).',
      synergyCondition: noSynergy,
      riskTag: '🔴',
      tags: ['heart'] as CardTag[],
    },
  ],
};

const CASSANDRA_VOSS: Omit<Talent, 'id'> = {
  name: 'Cassandra Voss',
  type: 'Lead',
  skill: 5,
  heat: 2,
  cost: 15,
  filmsLeft: 3,
  genreBonus: { genre: 'Thriller', bonus: 2 },
  trait: 'The Strategist',
  traitDesc: '🎯✨ Precision + Spectacle hybrid. Rewards diverse, well-planned productions. Calculated brilliance.',
  cards: [
    {
      name: 'Calculated Move',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🎯 +1 per unique source type played (max +4). +2 if 0 Incidents (perfect execution).',
      synergyCondition: (ctx) => {
        const types = new Set(ctx.playedCards.map(c => c.sourceType));
        let bonus = Math.min(types.size, 4);
        if (ctx.incidentCount === 0) bonus += 2;
        return bonus > 0 ? { bonus, description: 'All according to plan!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Power Play',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '✨ +3 if Director card played. +2 if 3+ Spectacle tags (commanding the screen).',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.some(c => c.sourceType === 'director') ? 3 : 0;
        if ((ctx.tagsPlayed['spectacle'] || 0) >= 3) bonus += 2;
        return bonus > 0 ? { bonus, description: 'Commanding presence!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['spectacle', 'precision'] as CardTag[],
    },
    {
      name: 'Masterclass Scene',
      cardType: 'action',
      baseQuality: 2,
      synergyText: '🎯✨ +2 if both Precision AND Spectacle tags exist. The best of both worlds.',
      synergyCondition: (ctx) => {
        const hasBoth = (ctx.tagsPlayed['precision'] || 0) > 0 && (ctx.tagsPlayed['spectacle'] || 0) > 0;
        return hasBoth ? { bonus: 2, description: 'Precision meets spectacle!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision', 'spectacle'] as CardTag[],
    },
    {
      name: 'Hostile Negotiation',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card has high value. Win +5, Lose -3',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsHighValue(),
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Outmaneuvered',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'The plan fell apart. -2 if no Precision tags (no fallback strategy).',
      synergyCondition: (ctx) => (ctx.tagsPlayed['precision'] || 0) === 0 ? { bonus: -2, description: 'No backup plan!' } : { bonus: 0 },
      riskTag: '🔴',
    },
  ],
};

const WADE_HARMON: Omit<Talent, 'id'> = {
  name: 'Wade Harmon',
  type: 'Lead',
  skill: 4,
  heat: 3,
  cost: 14,
  genreBonus: { genre: 'Action', bonus: 2 },
  trait: 'The Showman',
  traitDesc: '✨🔥 SPECTACLE + MOMENTUM hybrid. Big entrances, bigger finales. The crowd goes wild.',
  cards: [
    {
      name: 'Grand Entrance',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '✨ +4 if draw 1-2. +1 per Spectacle tag (max +2). Start with a bang!',
      synergyCondition: (ctx) => {
        let bonus = ctx.drawNumber <= 2 ? 4 : 0;
        bonus += Math.min(ctx.tagsPlayed['spectacle'] || 0, 2);
        return bonus > 0 ? { bonus, description: 'What an entrance!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['spectacle', 'momentum'] as CardTag[],
    },
    {
      name: 'Crowd Roar',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🔥 +1 per Momentum tag + 1 per Spectacle tag (max +6). The show must go on!',
      synergyCondition: (ctx) => {
        const mom = ctx.tagsPlayed['momentum'] || 0;
        const spec = ctx.tagsPlayed['spectacle'] || 0;
        const bonus = Math.min(mom + spec, 6);
        return bonus > 0 ? { bonus, description: `${mom} momentum + ${spec} spectacle = showtime!` } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['momentum', 'spectacle'] as CardTag[],
    },
    {
      name: 'Show-Stopping Finale',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '✨ +3 if draw 5+. +2 if Crew card played. The big finish!',
      synergyCondition: (ctx) => {
        let bonus = ctx.drawNumber >= 5 ? 3 : 0;
        if (ctx.playedCards.some(c => c.sourceType === 'crew')) bonus += 2;
        return bonus > 0 ? { bonus, description: 'What a finish!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['spectacle'] as CardTag[],
    },
    {
      name: 'Ego Check',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is Action. Win +5, Lose -4',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: { ...betNextIsAction(), successBonus: 5, failPenalty: -4 },
      tags: ['momentum'] as CardTag[],
    },
    {
      name: 'Upstaged By Stuntman',
      cardType: 'incident',
      baseQuality: -5,
      synergyText: 'Wade\'s ego bruised. Lose $1M. But Spectacle tag remains.',
      synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'Wade stormed off set!' }),
      riskTag: '🔴',
      tags: ['spectacle'] as CardTag[],
    },
  ],
};

export const ALL_LEADS: Omit<Talent, 'id'>[] = [JAKE_STEELE, VALENTINA_CORTEZ, MARCUS_WEBB, SOPHIE_CHEN, LENA_FROST, DARIUS_KNOX, MEI_LING, OLIVER_CROSS, CAMILLE_DURAND, RAFAEL_SANTOS, YUKI_TANAKA, EZRA_BLACKWOOD, IRIS_MOON, BENNY_ROMANO, CASSANDRA_VOSS, WADE_HARMON];

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

// ─── NEW SUPPORTS (Round 55) ───

const LUNA_PRICE: Omit<Talent, 'id'> = {
  name: 'Luna Price',
  type: 'Support',
  skill: 3,
  heat: 1,
  cost: 7,
  trait: 'Social Media Star',
  traitDesc: '✨💕 Bridges Spectacle + Heart. Turns engagement into box office. Modern audience magnet.',
  cards: [
    {
      name: 'Viral Clip',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '✨💕 +1 per Heart tag + 1 per Spectacle tag (max +5). Engagement = money.',
      synergyCondition: (ctx) => {
        const h = ctx.tagsPlayed['heart'] || 0;
        const s = ctx.tagsPlayed['spectacle'] || 0;
        const bonus = Math.min(h + s, 5);
        return bonus > 0 ? { bonus, description: `${h} heart + ${s} spectacle = viral!` } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['heart', 'spectacle'] as CardTag[],
    },
    {
      name: 'Behind The Scenes',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+3 if Crew card played (fans love the BTS content). Earn +$1M.',
      synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'crew') ? { bonus: 3, budgetMod: 1, description: 'BTS content went viral!' } : { bonus: 0 },
      riskTag: '🟢',
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Cancel Culture',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Twitter turned on her. Lose $1M. But adds Heart tag (sympathy engagement).',
      synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'Cancelled!' }),
      riskTag: '🔴',
      tags: ['heart'] as CardTag[],
    },
  ],
};

const JACK_NAVARRO: Omit<Talent, 'id'> = {
  name: 'Jack Navarro',
  type: 'Support',
  skill: 3,
  heat: 0,
  cost: 6,
  trait: 'Stunt Coordinator',
  traitDesc: '🔥✨ MOMENTUM + SPECTACLE specialist. Makes action sequences safe and spectacular.',
  cards: [
    {
      name: 'Precision Stunt',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🔥 +2 if Lead Skill 4+. +1 per Momentum tag (max +3). Safe and spectacular.',
      synergyCondition: (ctx) => {
        let bonus = ctx.leadSkill >= 4 ? 2 : 0;
        bonus += Math.min(ctx.tagsPlayed['momentum'] || 0, 3);
        return bonus > 0 ? { bonus, description: 'Stunt perfection!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['momentum', 'spectacle'] as CardTag[],
    },
    {
      name: 'Wire Rig Magic',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '✨ +2 if Crew card played. +2 if previous card was Action (combo setup).',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.some(c => c.sourceType === 'crew') ? 2 : 0;
        if (ctx.previousCard?.cardType === 'action') bonus += 2;
        return bonus > 0 ? { bonus, description: 'Stunt magic!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['spectacle'] as CardTag[],
    },
    {
      name: 'Safety First',
      cardType: 'action',
      baseQuality: 1,
      synergyText: 'Remove 1 Incident from remaining deck. Stunts done right.',
      synergyCondition: () => ({ bonus: 0, description: 'Safety protocols!' }),
      riskTag: '🟢',
      special: 'removeRed',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Stunt Gone Wrong',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Someone got hurt. Lose $1M.',
      synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'Medical bills!' }),
      riskTag: '🔴',
    },
  ],
};

const GRACE_OKONKWO: Omit<Talent, 'id'> = {
  name: 'Grace Okonkwo',
  type: 'Support',
  skill: 4,
  heat: 1,
  cost: 9,
  genreBonus: { genre: 'Drama', bonus: 2 },
  trait: 'Dramatic Anchor',
  traitDesc: '💕🎯 HEART + PRECISION. The emotional core of any ensemble. Elevates dramatic scenes.',
  cards: [
    {
      name: 'Emotional Anchor',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💕 +2 if Lead Actor card played. +1 per Heart tag (max +3). Grounds the ensemble.',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.some(c => c.sourceType === 'actor' && c.source !== 'Grace Okonkwo') ? 2 : 0;
        bonus += Math.min(ctx.tagsPlayed['heart'] || 0, 3);
        return bonus > 0 ? { bonus, description: 'Emotional anchor!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['heart', 'precision'] as CardTag[],
    },
    {
      name: 'Quiet Power',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🎯 +3 if ≤ 3 cards played and 0 Incidents. Restrained brilliance.',
      synergyCondition: (ctx) => (ctx.playedCards.length <= 2 && ctx.incidentCount === 0) ? { bonus: 3, description: 'Less is more!' } : { bonus: 0 },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Unspoken Bond',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💕 +2 if 2+ Actor cards played. +2 if 4+ Heart tags (emotional crescendo).',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.filter(c => c.sourceType === 'actor').length >= 2 ? 2 : 0;
        if ((ctx.tagsPlayed['heart'] || 0) >= 4) bonus += 2;
        return bonus > 0 ? { bonus, description: 'Unspoken chemistry!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Overemotional',
      cardType: 'incident',
      baseQuality: -3,
      synergyText: 'Too much feeling. But adds Heart tag.',
      synergyCondition: noSynergy,
      riskTag: '🔴',
      tags: ['heart'] as CardTag[],
    },
  ],
};

export const ALL_SUPPORTS: Omit<Talent, 'id'>[] = [DANNY_PARK, ROXANNE_BLAZE, OLD_RELIABLE, MIA_TANAKA, HECTOR_MORALES, TOMMY_TBONE_JACKSON, PRIYA_SHARMA, NIKOLAI_VOLKOV, FELIX_WU, DIEGO_FUENTES, LUNA_PRICE, JACK_NAVARRO, GRACE_OKONKWO];

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

// ─── NEW DIRECTORS (Round 55) ───

const PETRA_WILLIAMS: Omit<Talent, 'id'> = {
  name: 'Petra Williams',
  type: 'Director',
  skill: 4,
  heat: 0,
  cost: 10,
  genreBonus: { genre: 'Comedy', bonus: 2 },
  trait: 'Comedy Auteur',
  traitDesc: '💕😂 HEART specialist director. Finds the humor in humanity. Clean productions with emotional resonance.',
  cards: [
    {
      name: 'Comic Timing',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💕 +2 if Actor card played. +1 per Heart tag (max +3). The timing is everything.',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.some(c => c.sourceType === 'actor') ? 2 : 0;
        bonus += Math.min(ctx.tagsPlayed['heart'] || 0, 3);
        return bonus > 0 ? { bonus, description: 'Perfect comic timing!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Warm Ensemble',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💕 +1 per unique source type played (max +4). +2 if 3+ Heart tags (warm and funny).',
      synergyCondition: (ctx) => {
        const types = new Set(ctx.playedCards.map(c => c.sourceType));
        let bonus = Math.min(types.size, 4);
        if ((ctx.tagsPlayed['heart'] || 0) >= 3) bonus += 2;
        return bonus > 0 ? { bonus, description: 'Warm ensemble!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Tonal Shift',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is from an Actor. Win +4, Lose -3',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsFromActor(),
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Tone Deaf Direction',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Comedy fell flat. -2 if 0 Heart tags (no warmth to save it).',
      synergyCondition: (ctx) => (ctx.tagsPlayed['heart'] || 0) === 0 ? { bonus: -2, description: 'No heart, no laughs!' } : { bonus: 0 },
      riskTag: '🔴',
    },
  ],
};

const MARCUS_AURELIUS_JONES: Omit<Talent, 'id'> = {
  name: 'Marcus A. Jones',
  type: 'Director',
  skill: 5,
  heat: 2,
  cost: 13,
  filmsLeft: 2,
  genreBonus: { genre: 'Action', bonus: 2 },
  trait: 'Action Maestro',
  traitDesc: '🔥✨ MOMENTUM + SPECTACLE. The ultimate action director. Big budgets, bigger results.',
  cards: [
    {
      name: 'Setpiece Sequence',
      cardType: 'action',
      baseQuality: 2,
      synergyText: '✨🔥 +1 per Momentum tag + 1 per Spectacle tag (max +6). Peak cinema.',
      synergyCondition: (ctx) => {
        const mom = ctx.tagsPlayed['momentum'] || 0;
        const spec = ctx.tagsPlayed['spectacle'] || 0;
        const bonus = Math.min(mom + spec, 6);
        return bonus > 0 ? { bonus, description: `Action masterpiece!` } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['momentum', 'spectacle'] as CardTag[],
    },
    {
      name: 'Controlled Chaos',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🔥 +2 if Crew card played. +2 if action streak ≥ 2. Organized mayhem.',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.some(c => c.sourceType === 'crew') ? 2 : 0;
        if (ctx.greenStreak >= 2) bonus += 2;
        return bonus > 0 ? { bonus, description: 'Controlled chaos!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['momentum'] as CardTag[],
    },
    {
      name: 'Over The Top',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Sacrifice next card to double last card. GO BIG!',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betSacrificeForDouble(),
      tags: ['spectacle'] as CardTag[],
    },
    {
      name: 'Budget Detonation',
      cardType: 'incident',
      baseQuality: -5,
      synergyText: 'Blew through the budget. Lose $3M. But Spectacle tags remain.',
      synergyCondition: () => ({ bonus: 0, budgetMod: -3, description: 'Budget exploded!' }),
      riskTag: '🔴',
      tags: ['spectacle'] as CardTag[],
    },
  ],
};

export const ALL_DIRECTORS: Omit<Talent, 'id'>[] = [AVA_THORNTON, RICK_BLASTER, KENJI_MURAKAMI, ZOE_PARK, FRANK_DELUCA, SAMIRA_AL_RASHID, JIMMY_CHANG, DAKOTA_STEELE, NOVA_SINCLAIR, PETRA_WILLIAMS, MARCUS_AURELIUS_JONES];

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

// ─── NEW CREW (Round 55) ───

const HEARTSTRINGS_MUSIC: Omit<Talent, 'id'> = {
  name: 'Heartstrings Music',
  type: 'Crew',
  skill: 3,
  heat: 0,
  cost: 9,
  trait: 'Emotional Composers',
  traitDesc: '💕 HEART specialist crew. Musical scores that make audiences cry. Pure emotional amplification.',
  cards: [
    {
      name: 'Emotional Score',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💕 +1 per Heart tag played (max +4). +2 if Actor card played. Music elevates everything.',
      synergyCondition: (ctx) => {
        let bonus = Math.min(ctx.tagsPlayed['heart'] || 0, 4);
        if (ctx.playedCards.some(c => c.sourceType === 'actor')) bonus += 2;
        return bonus > 0 ? { bonus, description: 'The score brings tears!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Leitmotif',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💕 +2 if Director card played. +2 if draw 3+ (the theme develops).',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0;
        if (ctx.drawNumber >= 3) bonus += 2;
        return bonus > 0 ? { bonus, description: 'Theme developed!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Musical Crescendo',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💕 +3 if 5+ Heart tags. The emotional climax of the film.',
      synergyCondition: (ctx) => (ctx.tagsPlayed['heart'] || 0) >= 5 ? { bonus: 3, description: 'EMOTIONAL CRESCENDO!' } : { bonus: 0 },
      riskTag: '🟢',
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Temp Track Disaster',
      cardType: 'incident',
      baseQuality: -3,
      synergyText: 'Wrong music choice. -2 if 0 Heart tags (no emotional context).',
      synergyCondition: (ctx) => (ctx.tagsPlayed['heart'] || 0) === 0 ? { bonus: -2, description: 'No emotional foundation!' } : { bonus: 0 },
      riskTag: '🔴',
    },
  ],
};

const DARKROOM_COLLECTIVE: Omit<Talent, 'id'> = {
  name: 'Darkroom Collective',
  type: 'Crew',
  skill: 3,
  heat: 1,
  cost: 7,
  trait: 'Horror Crew',
  traitDesc: '💀 CHAOS specialist crew. Practical horror effects. Turns fear into art.',
  cards: [
    {
      name: 'Practical Gore',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💀 +1 per Chaos tag played (max +4). +2 if Director card played. Handcrafted horror.',
      synergyCondition: (ctx) => {
        let bonus = Math.min(ctx.tagsPlayed['chaos'] || 0, 4);
        if (ctx.playedCards.some(c => c.sourceType === 'director')) bonus += 2;
        return bonus > 0 ? { bonus, description: 'Horrifying craft!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['chaos'] as CardTag[],
    },
    {
      name: 'Creature Design',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💀 +3 if any Incident played. The monster is real because the fear is real.',
      synergyCondition: (ctx) => ctx.incidentCount > 0 ? { bonus: 3, description: 'Fear made it real!' } : { bonus: 0 },
      riskTag: '🟢',
      tags: ['chaos', 'spectacle'] as CardTag[],
    },
    {
      name: 'Set Malfunction',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is NOT an Incident. Win +4, Lose -5. Horror crew tempts fate!',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: { ...betNextIsNotIncident(), successBonus: 4, failPenalty: -5 },
      tags: ['chaos'] as CardTag[],
    },
    {
      name: 'Prop Accident',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Practical effects went wrong. But adds Chaos tags for later.',
      synergyCondition: noSynergy,
      riskTag: '🔴',
      tags: ['chaos', 'chaos'] as CardTag[],
    },
  ],
};

export const ALL_CREW: Omit<Talent, 'id'>[] = [STANDARD_GRIP_TEAM, MARIA_SANTOS, QUICK_FIX_PRODUCTIONS, APEX_STUDIOS_VFX, THE_NOMADS, STELLAR_SOUND_DESIGN, IRON_GATE_SECURITY, FREELANCE_SKELETON_CREW, PHANTOM_EDITING, HEARTSTRINGS_MUSIC, DARKROOM_COLLECTIVE];

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
    abilityDesc: 'Survival Mode: Each Chaos tag adds +1 quality. Embrace the wild.',
  },
);

// ─── NEW SCRIPTS (Round 55) ───

const MIDNIGHT_MANSION_CARDS: CardTemplate[] = [
  {
    name: 'Creaking Door',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💀 +3 if draw 1-2 (opening dread). +1 per Chaos tag (max +3).',
    synergyCondition: (ctx) => {
      let bonus = ctx.drawNumber <= 2 ? 3 : 0;
      bonus += Math.min(ctx.tagsPlayed['chaos'] || 0, 3);
      return bonus > 0 ? { bonus, description: 'Something lurks...' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['chaos'] as CardTag[],
  },
  {
    name: 'The Séance',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💀 +2 if 2+ Chaos tags. +2 if Actor card played. Summoning something terrible.',
    synergyCondition: (ctx) => {
      let bonus = (ctx.tagsPlayed['chaos'] || 0) >= 2 ? 2 : 0;
      if (ctx.playedCards.some(c => c.sourceType === 'actor')) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Contact made!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['chaos', 'heart'] as CardTag[],
  },
  {
    name: 'Escape Sequence',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '🔥💀 +2 if any Incident played. +2 if action streak ≥ 2. Run!',
    synergyCondition: (ctx) => {
      let bonus = ctx.incidentCount > 0 ? 2 : 0;
      if (ctx.greenStreak >= 2) bonus += 2;
      return bonus > 0 ? { bonus, description: 'RUN!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['momentum', 'chaos'] as CardTag[],
  },
  {
    name: 'Who\'s Next?',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card is NOT an Incident. Win +4, Lose -5. Who survives?',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: { ...betNextIsNotIncident(), successBonus: 4, failPenalty: -5 },
    tags: ['chaos'] as CardTag[],
  },
  {
    name: 'Possessed Actor',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'Method acting went supernatural. Poisons next card. Adds Chaos tags.',
    synergyCondition: noSynergy,
    riskTag: '🔴',
    special: 'poisonNext',
    tags: ['chaos', 'chaos'] as CardTag[],
  },
  {
    name: 'Haunted Set',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: 'Crew refuses to work nights. Lose $1M.',
    synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'The set is haunted!' }),
    riskTag: '🔴',
    tags: ['chaos'] as CardTag[],
  },
];

const WEDDING_CRASHERS_2_CARDS: CardTemplate[] = [
  {
    name: 'Meet Cute Disaster',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💕😂 +3 if 2+ Actor cards played. +2 if any Incident (comedy from chaos!).',
    synergyCondition: (ctx) => {
      let bonus = ctx.playedCards.filter(c => c.sourceType === 'actor').length >= 2 ? 3 : 0;
      if (ctx.incidentCount > 0) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Romantic catastrophe!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['heart'] as CardTag[],
  },
  {
    name: 'Toast Gone Wrong',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '😂 +1 per card played (max +4). The speech gets worse and funnier.',
    synergyCondition: (ctx) => {
      const bonus = Math.min(ctx.playedCards.length, 4);
      return bonus > 0 ? { bonus, description: 'The toast is legendary!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['heart', 'chaos'] as CardTag[],
  },
  {
    name: 'Dance Floor Mayhem',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '🔥💕 +2 if previous card was Action. +2 if Heart ≥ 3. Party escalates!',
    synergyCondition: (ctx) => {
      let bonus = ctx.previousCard?.cardType === 'action' ? 2 : 0;
      if ((ctx.tagsPlayed['heart'] || 0) >= 3) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Dance floor chaos!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['momentum', 'heart'] as CardTag[],
  },
  {
    name: 'Objection!',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card is from an Actor. Win +5, Lose -3. Drama at the altar!',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: { ...betNextIsFromActor(), successBonus: 5 },
    tags: ['heart'] as CardTag[],
  },
  {
    name: 'Cake Catastrophe',
    cardType: 'incident',
    baseQuality: -3,
    synergyText: '😂 The cake is ruined. But it\'s hilarious. Adds Heart tag.',
    synergyCondition: noSynergy,
    riskTag: '🔴',
    tags: ['heart'] as CardTag[],
  },
  {
    name: 'Drunk Uncle Speech',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: 'Extremely awkward. -2 if 0 Heart tags. Adds Chaos.',
    synergyCondition: (ctx) => (ctx.tagsPlayed['heart'] || 0) === 0 ? { bonus: -2, description: 'No warmth to balance the cringe!' } : { bonus: 0 },
    riskTag: '🔴',
    tags: ['chaos'] as CardTag[],
  },
];

const DYNASTY_CARDS: CardTemplate[] = [
  {
    name: 'Opening Monologue',
    cardType: 'action',
    baseQuality: 2,
    synergyText: '🎯 +3 if Lead Skill 5+. +2 if draw 1-2. Prestige demands excellence.',
    synergyCondition: (ctx) => {
      let bonus = ctx.leadSkill >= 5 ? 3 : 0;
      if (ctx.drawNumber <= 2) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Commanding opening!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['precision'] as CardTag[],
  },
  {
    name: 'Family Confrontation',
    cardType: 'action',
    baseQuality: 2,
    synergyText: '🎯💕 +2 if 2+ Actor cards played. +2 if Director card played. +2 if both Precision AND Heart tags.',
    synergyCondition: (ctx) => {
      let bonus = ctx.playedCards.filter(c => c.sourceType === 'actor').length >= 2 ? 2 : 0;
      if (ctx.playedCards.some(c => c.sourceType === 'director')) bonus += 2;
      if ((ctx.tagsPlayed['precision'] || 0) > 0 && (ctx.tagsPlayed['heart'] || 0) > 0) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Generational drama!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['precision', 'heart'] as CardTag[],
  },
  {
    name: 'Power Transfer',
    cardType: 'action',
    baseQuality: 2,
    synergyText: '🎯 +1 per unique source type played (max +4). +2 if 4+ Precision tags. The empire shifts.',
    synergyCondition: (ctx) => {
      const types = new Set(ctx.playedCards.map(c => c.sourceType));
      let bonus = Math.min(types.size, 4);
      if ((ctx.tagsPlayed['precision'] || 0) >= 4) bonus += 2;
      return bonus > 0 ? { bonus, description: 'The dynasty shifts!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['precision'] as CardTag[],
  },
  {
    name: 'Boardroom Betrayal',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card has high value. Win +6, Lose -4. High stakes!',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: { ...betNextIsHighValue(), successBonus: 6, failPenalty: -4 },
    tags: ['precision'] as CardTag[],
  },
  {
    name: 'Oscar Bait Overreach',
    cardType: 'incident',
    baseQuality: -6,
    synergyText: 'Too ambitious. -2 if quality < 20 (didn\'t earn the prestige). Lose $2M.',
    synergyCondition: (ctx) => {
      let bonus = ctx.totalQuality < 20 ? -2 : 0;
      return { bonus, budgetMod: -2, description: 'Overreached!' };
    },
    riskTag: '🔴',
  },
  {
    name: 'Exhausted Cast',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'The emotional demands were too much. Poisons next card.',
    synergyCondition: noSynergy,
    riskTag: '🔴',
    special: 'poisonNext',
  },
];

const SPEED_DEMON_CARDS: CardTemplate[] = [
  {
    name: 'Nitro Boost',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '🔥✨ +2 if previous card was Action. +1 per Momentum tag (max +3). Pedal to the metal!',
    synergyCondition: (ctx) => {
      let bonus = ctx.previousCard?.cardType === 'action' ? 2 : 0;
      bonus += Math.min(ctx.tagsPlayed['momentum'] || 0, 3);
      return bonus > 0 ? { bonus, description: 'NITRO!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['momentum', 'spectacle'] as CardTag[],
  },
  {
    name: 'Pit Stop Drama',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💕 +2 if Actor card played. +2 if Crew card played. Human drama in the pit.',
    synergyCondition: (ctx) => {
      let bonus = ctx.playedCards.some(c => c.sourceType === 'actor') ? 2 : 0;
      if (ctx.playedCards.some(c => c.sourceType === 'crew')) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Pit stop intensity!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['heart'] as CardTag[],
  },
  {
    name: 'Final Lap',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '🔥✨ +3 if draw 4+. +2 if action streak ≥ 3. The climax!',
    synergyCondition: (ctx) => {
      let bonus = ctx.drawNumber >= 4 ? 3 : 0;
      if (ctx.greenStreak >= 3) bonus += 2;
      return bonus > 0 ? { bonus, description: 'FINAL LAP!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['momentum', 'spectacle'] as CardTag[],
  },
  {
    name: 'Yellow Flag',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card is Action. Win +4, Lose -3. Race resumes!',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: betNextIsAction(),
    tags: ['momentum'] as CardTag[],
  },
  {
    name: 'Crash!',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'Spectacular crash. Lose $2M. But adds Spectacle + Chaos.',
    synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'Fiery crash!' }),
    riskTag: '🔴',
    tags: ['spectacle', 'chaos'] as CardTag[],
  },
  {
    name: 'Rain Delay',
    cardType: 'incident',
    baseQuality: -3,
    synergyText: 'Production halted. -2 if no Momentum tags (lost all pacing).',
    synergyCondition: (ctx) => (ctx.tagsPlayed['momentum'] || 0) === 0 ? { bonus: -2, description: 'Lost all momentum!' } : { bonus: 0 },
    riskTag: '🔴',
  },
];

const DOUBLE_CROSS_CARDS: CardTemplate[] = [
  {
    name: 'The Setup',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '🎯 +3 if draw 1-2. +1 per Precision tag (max +2). Every detail matters.',
    synergyCondition: (ctx) => {
      let bonus = ctx.drawNumber <= 2 ? 3 : 0;
      bonus += Math.min(ctx.tagsPlayed['precision'] || 0, 2);
      return bonus > 0 ? { bonus, description: 'The con begins...' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['precision'] as CardTag[],
  },
  {
    name: 'The Con',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '🎯💀 +2 if Actor + Director played. +2 if both Precision AND Chaos tags exist.',
    synergyCondition: (ctx) => {
      let bonus = (ctx.playedCards.some(c => c.sourceType === 'actor') && ctx.playedCards.some(c => c.sourceType === 'director')) ? 2 : 0;
      if ((ctx.tagsPlayed['precision'] || 0) > 0 && (ctx.tagsPlayed['chaos'] || 0) > 0) bonus += 2;
      return bonus > 0 ? { bonus, description: 'The con deepens!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['precision', 'chaos'] as CardTag[],
  },
  {
    name: 'The Reveal',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '🎯 +4 if draw 5+. +2 if 3+ Precision tags. Everything clicks.',
    synergyCondition: (ctx) => {
      let bonus = ctx.drawNumber >= 5 ? 4 : 0;
      if ((ctx.tagsPlayed['precision'] || 0) >= 3) bonus += 2;
      return bonus > 0 ? { bonus, description: 'THE REVEAL!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['precision'] as CardTag[],
  },
  {
    name: 'Trust Fall',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card is from an Actor. Win +5, Lose -4. Who can you trust?',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: { ...betNextIsFromActor(), successBonus: 5, failPenalty: -4 },
    tags: ['chaos'] as CardTag[],
  },
  {
    name: 'Cover Blown',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'The con failed. -2 if no Precision tags (sloppy work).',
    synergyCondition: (ctx) => (ctx.tagsPlayed['precision'] || 0) === 0 ? { bonus: -2, description: 'Amateur hour!' } : { bonus: 0 },
    riskTag: '🔴',
  },
  {
    name: 'Double Agent',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: 'Betrayed from within. Poisons actors.',
    synergyCondition: noSynergy,
    riskTag: '🔴',
    special: 'poisonActors',
    tags: ['chaos'] as CardTag[],
  },
];

const COSMIC_HARVEST_CARDS: CardTemplate[] = [
  {
    name: 'First Contact',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '✨💕 +3 if draw 1-2. +2 if both Heart AND Spectacle tags. Wonder and emotion.',
    synergyCondition: (ctx) => {
      let bonus = ctx.drawNumber <= 2 ? 3 : 0;
      if ((ctx.tagsPlayed['heart'] || 0) > 0 && (ctx.tagsPlayed['spectacle'] || 0) > 0) bonus += 2;
      return bonus > 0 ? { bonus, description: 'First contact...' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['spectacle', 'heart'] as CardTag[],
  },
  {
    name: 'Zero Gravity Ballet',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '✨ +2 if Crew card played. +1 per Spectacle tag (max +3). Visual poetry.',
    synergyCondition: (ctx) => {
      let bonus = ctx.playedCards.some(c => c.sourceType === 'crew') ? 2 : 0;
      bonus += Math.min(ctx.tagsPlayed['spectacle'] || 0, 3);
      return bonus > 0 ? { bonus, description: 'Weightless beauty!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['spectacle'] as CardTag[],
  },
  {
    name: 'Message From Earth',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💕 +2 if Actor card played. +2 if 3+ Heart tags. The human connection across the void.',
    synergyCondition: (ctx) => {
      let bonus = ctx.playedCards.some(c => c.sourceType === 'actor') ? 2 : 0;
      if ((ctx.tagsPlayed['heart'] || 0) >= 3) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Humanity reaches across space!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['heart'] as CardTag[],
  },
  {
    name: 'Wormhole Gambit',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Sacrifice next card to double last card. Through the wormhole!',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: betSacrificeForDouble(),
    tags: ['spectacle'] as CardTag[],
  },
  {
    name: 'Science Nonsense',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: 'Physicists are furious. -2 if no Spectacle tags (nothing to distract from the bad science).',
    synergyCondition: (ctx) => (ctx.tagsPlayed['spectacle'] || 0) === 0 ? { bonus: -2, description: 'Bad science, no spectacle!' } : { bonus: 0 },
    riskTag: '🔴',
  },
  {
    name: 'Studio Interference',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'Studio demanded a different ending. Lose $2M.',
    synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'Studio meddling!' }),
    riskTag: '🔴',
  },
];

ALL_SCRIPTS.push(
  {
    title: 'Midnight Mansion',
    genre: 'Horror',
    baseScore: 6,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 2,
    cards: MIDNIGHT_MANSION_CARDS,
    ability: 'finalGirl',
    abilityDesc: 'Haunted House: If you wrap after exactly 5 draws, +5 bonus. Chaos tags count as +1 quality each.',
  },
  {
    title: 'Wedding Season',
    genre: 'Comedy',
    baseScore: 4,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 2,
    cards: WEDDING_CRASHERS_2_CARDS,
    ability: 'heartEngine',
    abilityDesc: 'Guilty Pleasure: Each Heart tag adds +1 quality. 6+ Heart = additional ×1.2 multiplier! 🍿 Low stakes, big laughs.',
  },
  {
    title: 'Dynasty',
    genre: 'Drama',
    baseScore: 10,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 7,
    cards: DYNASTY_CARDS,
    ability: 'precisionCraft',
    abilityDesc: '🏆 PRESTIGE: Each Precision tag adds +1 quality. Clean wrap bonus doubled. High cost, high ceiling.',
  },
  {
    title: 'Speed Demon',
    genre: 'Action',
    baseScore: 5,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 2,
    cards: SPEED_DEMON_CARDS,
    ability: 'blockbusterBonus',
    abilityDesc: 'Racing Blockbuster: Market multiplier +0.3. Each Spectacle tag adds +0.05 more.',
  },
  {
    title: 'Double Cross',
    genre: 'Thriller',
    baseScore: 7,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 4,
    cards: DOUBLE_CROSS_CARDS,
    ability: 'slowBurn',
    abilityDesc: 'Heist Film: Cards after draw 4 get +1 base. Exactly 2 Incidents = +8 quality (living on the edge).',
  },
  {
    title: 'Cosmic Harvest',
    genre: 'Sci-Fi',
    baseScore: 7,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 5,
    cards: COSMIC_HARVEST_CARDS,
    ability: 'prestige',
    abilityDesc: 'Spectacle & Heart: Quality above 35 counts double for nominations. Wonder meets emotion.',
  },
);

// ─── SEASON EVENTS (Round 55) ───

export interface SeasonEvent {
  id: string;
  name: string;
  emoji: string;
  description: string;
  flavorText: string;
  effect: string; // key used by gameStore
  rarity?: 'common' | 'rare' | 'legendary'; // default: common
}

export const ALL_SEASON_EVENTS: SeasonEvent[] = [
  {
    id: 'award_buzz',
    name: 'Award Season Buzz',
    emoji: '🏆',
    description: 'Your highest-rated film gets +$5M retroactive bonus.',
    flavorText: 'The trades are buzzing. Your publicist can\'t stop smiling. Three separate critics used the word "masterwork."',
    effect: 'awardBuzz',
  },
  {
    id: 'scandal',
    name: 'Industry Scandal',
    emoji: '📰',
    description: 'Lose 1 reputation. The whole industry looks bad.',
    flavorText: 'A journalist with receipts, a leaked email chain, and a 12-part Twitter thread. The whole town is on fire.',
    effect: 'scandal',
  },
  {
    id: 'streaming_deal',
    name: 'Streaming Deal',
    emoji: '📺',
    description: 'Guaranteed +$10M now, but next film gets -×0.4 market multiplier (no theatrical buzz).',
    flavorText: 'StreamFlix calls at 2 AM with an offer that makes your accountant weep with joy. The theater chains, however, are already drafting angry letters.',
    effect: 'streamingDeal',
  },
  {
    id: 'talent_showcase',
    name: 'Talent Showcase',
    emoji: '🌟',
    description: 'All talent in next market costs $3 less (min $1). Fresh faces emerge.',
    flavorText: 'NYU, USC, and AFI all graduated the same week. Fifty hungry kids with demo reels and zero ego. Yet.',
    effect: 'talentShowcase',
  },
  {
    id: 'genre_revival',
    name: 'Genre Revival',
    emoji: '🎬',
    description: 'Your most-made genre gets +×0.4 market multiplier next season.',
    flavorText: 'A viral essay declares your signature genre "the most important storytelling form of the decade." Suddenly everyone\'s a fan.',
    effect: 'genreRevival',
  },
  {
    id: 'budget_windfall',
    name: 'Budget Windfall',
    emoji: '💰',
    description: 'Receive +$8M from a surprise investor.',
    flavorText: 'A crypto bro turned angel investor slides into your DMs: "I believe in the power of story." His check clears. That\'s all that matters.',
    effect: 'budgetWindfall',
  },
  {
    id: 'creative_retreat',
    name: 'Creative Retreat',
    emoji: '🏔️',
    description: 'Next film gets +3 base quality. Your team bonds over a mountain retreat.',
    flavorText: 'A cabin in Big Bear. Whiteboard walls. Your writer cries during a trust exercise. Your DP has an epiphany at sunrise. Best $3K you ever spent.',
    effect: 'creativeRetreat',
  },
  {
    id: 'foreign_distribution',
    name: 'Foreign Distribution Deal',
    emoji: '🌍',
    description: 'Next film gets +×0.3 market multiplier from international sales.',
    flavorText: 'Your last film broke records in South Korea. A German distributor is flying in tomorrow. Your subtitler just asked for a raise.',
    effect: 'foreignDeal',
  },
  {
    id: 'union_dispute',
    name: 'Union Dispute',
    emoji: '✊',
    description: 'All crew costs +$2 next season. But crew cards get +1 base quality.',
    flavorText: 'Picket signs on Sunset Blvd. Your gaffer texts: "No hard feelings, boss. See you on the other side." Fair wages aren\'t cheap.',
    effect: 'unionDispute',
  },
  {
    id: 'viral_marketing',
    name: 'Viral Marketing Campaign',
    emoji: '📱',
    description: 'Next film: if quality > 25, earn +$5M bonus.',
    flavorText: 'A mysterious countdown. A fake missing persons report. 4 million views before lunch. Your marketing team is either brilliant or criminally insane.',
    effect: 'viralMarketing',
  },
  {
    id: 'legacy_actor_return',
    name: 'Legacy Actor Returns',
    emoji: '🎭',
    description: 'A legendary actor joins your next film free! (Adds +5 quality to next production).',
    flavorText: 'The phone rings at midnight. A voice you recognize from a hundred films: "I read the script. I wept. I\'m in." You try not to scream.',
    effect: 'legacyActor',
  },
  {
    id: 'critic_darling',
    name: 'Critics\' Darling',
    emoji: '📝',
    description: 'Next film: Clean Wrap bonus doubled.',
    flavorText: 'A New Yorker profile, a Letterboxd retrospective, and three Film Twitter accounts dedicated to your output. No pressure.',
    effect: 'criticDarling',
  },
  // ─── R80: NEW EVENTS ───
  {
    id: 'casting_scandal',
    name: 'Casting Couch Scandal',
    emoji: '🔥',
    description: 'Lose 1 reputation. But the publicity gives your next film +$10M box office.',
    flavorText: 'TMZ breaks the story at 6 AM. By noon, your name is trending. By dinner, your publicist has a plan: "All press is good press." She\'s terrifyingly right.',
    effect: 'castingScandal',
    rarity: 'rare',
  },
  {
    id: 'tax_incentive',
    name: 'Tax Incentive',
    emoji: '🏛️',
    description: 'Next film costs -30% budget, but must be a specific genre (shown after picking).',
    flavorText: 'The governor\'s office calls. They\'ll subsidize your next production — but only if it "showcases the cultural heritage of the region." Translation: they pick the genre.',
    effect: 'taxIncentive',
    rarity: 'common',
  },
  {
    id: 'studio_merger',
    name: 'Studio Merger Offer',
    emoji: '🏢',
    description: 'Gain $15M cash injection. But lose 1 talent roster slot permanently.',
    flavorText: 'MegaCorp wants to "align synergies." Their check has a lot of zeros. Their contract has even more pages. Somewhere in the fine print: "operational restructuring."',
    effect: 'studioMerger',
    rarity: 'rare',
  },
  {
    id: 'film_festival_award',
    name: 'Film Festival Award',
    emoji: '🎪',
    description: 'If your last film had quality > 30, gain +2 reputation. Otherwise, nothing.',
    flavorText: 'Cannes calls. Your film is in competition. The jury deliberates for six hours. You chain-smoke outside the Palais. Your phone buzzes...',
    effect: 'filmFestivalAward',
    rarity: 'common',
  },
  {
    id: 'streaming_bidding_war',
    name: 'Streaming Bidding War',
    emoji: '💻',
    description: 'Guaranteed $40M floor for next film. But no theatrical multiplier bonus.',
    flavorText: 'StreamFlix, Prism+, and WatchTower are in a three-way bidding war for your next picture. The floor is insane. The ceiling? Gone. No theaters means no multiplier magic.',
    effect: 'streamingBiddingWar',
    rarity: 'legendary',
  },
  {
    id: 'actors_strike',
    name: 'Actor\'s Strike',
    emoji: '✊🎭',
    description: 'All lead hiring costs double next season. But all leads get +2 skill.',
    flavorText: 'SAG-AFTRA walks out. Picket signs line Wilshire. Your casting director panics. But when they come back? They come back hungry, focused, and twice as good.',
    effect: 'actorsStrike',
    rarity: 'rare',
  },
  {
    id: 'nostalgia_wave',
    name: 'Nostalgia Wave',
    emoji: '📼',
    description: 'Same-genre bonus and sequel bonuses doubled this season.',
    flavorText: '"Everything old is new again." Twitter is flooded with "they don\'t make \'em like they used to" takes. For once, the algorithm agrees with the critics.',
    effect: 'nostalgiaWave',
    rarity: 'common',
  },
  {
    id: 'foreign_distribution_deal',
    name: 'Foreign Distribution Deal',
    emoji: '🌏',
    description: 'Next film gets +×0.3 multiplier. But -5 base quality (dubbing penalty).',
    flavorText: 'A Chinese mega-distributor wants your next film — dubbed, not subtitled. Your dialogue coach weeps. Your accountant does a little dance.',
    effect: 'foreignDistributionDeal',
    rarity: 'common',
  },
];

export function generateSeasonEvents(count: number, extraEvents?: SeasonEvent[]): SeasonEvent[] {
  const pool: SeasonEvent[] = [...ALL_SEASON_EVENTS, ...(extraEvents || [])];
  const result: SeasonEvent[] = [];
  
  for (let i = 0; i < count && pool.length > 0; i++) {
    // Rarity-weighted selection: common 70%, rare 25%, legendary 5%
    const rarityWeights: Record<string, number> = { common: 70, rare: 25, legendary: 5 };
    const weighted = pool.map(e => ({ event: e, weight: rarityWeights[e.rarity || 'common'] || 70 }));
    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    let roll = rng() * totalWeight;
    let picked = weighted[0];
    for (const w of weighted) {
      roll -= w.weight;
      if (roll <= 0) { picked = w; break; }
    }
    const idx = pool.indexOf(picked.event);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

// ─── GENERATION FUNCTIONS ───

// ─── R128: PRESTIGE MILESTONE SCRIPT — Oscar Bait (Prestige 5+) ───
const OSCAR_BAIT_CARDS: CardTemplate[] = [
  { name: 'Awards Season Performance', cardType: 'action', baseQuality: 2, synergyText: '🎯💕 PRECISION + HEART dual: +2 per Precision tag + +2 per Heart tag (max +8). Oscar-caliber craft.', synergyCondition: (ctx) => { const b = Math.min((ctx.tagsPlayed['precision'] || 0) * 2 + (ctx.tagsPlayed['heart'] || 0) * 2, 8); return b > 0 ? { bonus: b, description: 'Oscar-worthy performance!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['precision', 'heart'] as CardTag[] },
  { name: 'Tearjerker Monologue', cardType: 'action', baseQuality: 2, synergyText: '💕 +3 if Actor card played. +3 if 3+ Heart tags. The audience weeps.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'actor') ? 3 : 0; if ((ctx.tagsPlayed['heart'] || 0) >= 3) b += 3; return b > 0 ? { bonus: b, description: 'Not a dry eye in the house!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Meticulous Direction', cardType: 'action', baseQuality: 2, synergyText: '🎯 +3 if Director card played. +2 if 0 Incidents. Precision filmmaking.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'director') ? 3 : 0; if (ctx.incidentCount === 0) b += 2; return b > 0 ? { bonus: b, description: 'Flawless direction!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
  { name: 'For Your Consideration', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next card has high value. Win +6, Lose -3. Campaign for gold.', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: { ...betNextIsHighValue(), successBonus: 6, failPenalty: -3 }, tags: ['precision', 'heart'] as CardTag[] },
  { name: 'Awards Fatigue', cardType: 'incident', baseQuality: -4, synergyText: 'Voters are tired. -2 if no Precision tags. But adds Heart tag.', synergyCondition: (ctx) => (ctx.tagsPlayed['precision'] || 0) === 0 ? { bonus: -2, description: 'No craft to fall back on!' } : { bonus: 0 }, riskTag: '🔴', tags: ['heart'] as CardTag[] },
  { name: 'Harvey Weinstein Moment', cardType: 'incident', baseQuality: -5, synergyText: 'Scandal threatens the campaign. Lose $1M.', synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'Campaign derailed!' }), riskTag: '🔴' },
];

const OSCAR_BAIT_SCRIPT: Omit<Script, 'id'> = {
  title: 'Oscar Bait',
  genre: 'Drama',
  baseScore: 10,
  slots: ['Lead', 'Support', 'Director', 'Crew'],
  cost: 7,
  cards: OSCAR_BAIT_CARDS,
  ability: 'oscarBait',
  abilityDesc: 'Oscar Bait: Precision Craft + Heart Engine dual — Precision AND Heart tags both contribute. Clean productions with emotional depth are rewarded.',
  keywordTags: ['precision', 'heart'],
};

function modScriptToPool(ms: CustomScript): Omit<Script, 'id'> {
  const e = ms.cardEffect;
  const cards: CardTemplate[] = [
    { name: `${ms.name} — Core`, cardType: 'action', baseQuality: Math.max(0, ms.baseScore - 3), synergyText: ms.description || 'Modded script card', synergyCondition: null, riskTag: '🟢' },
    { name: `${ms.name} — Vision`, cardType: 'action', baseQuality: e.qualityBonus, synergyText: ms.description || 'Modded bonus', synergyCondition: null, riskTag: e.qualityBonus >= 3 ? '🟡' : '🟢' },
    customCardToCardTemplate(ms),
  ];
  return {
    title: ms.name,
    genre: ms.genre,
    cost: ms.cost,
    baseScore: ms.baseScore,
    slots: ms.slots,
    cards,
  };
}

function modTalentToPool(mt: CustomTalent): Omit<Talent, 'id'> {
  const cards: CardTemplate[] = [
    customCardToCardTemplate(mt),
    { name: `${mt.name} — Skill`, cardType: 'action', baseQuality: Math.ceil(mt.skill / 2), synergyText: 'Talent contribution', synergyCondition: null, riskTag: '🟢' },
  ];
  return {
    name: mt.name,
    type: mt.talentType,
    skill: mt.skill,
    cost: mt.cost,
    cards,
  };
}

export function generateScripts(count: number, _season: number): Script[] {
  const pool = [...ALL_SCRIPTS];
  // R205: Add modded scripts to pool
  for (const ms of getEnabledModScripts()) {
    pool.push(modScriptToPool(ms));
  }
  // Prestige 4+: add legendary scripts to pool
  if (_cachedPrestigeLevel >= 4) {
    pool.push(...LEGENDARY_SCRIPTS);
  }
  // Prestige 5+: add Oscar Bait milestone script
  if (_cachedPrestigeLevel >= 5) {
    pool.push(OSCAR_BAIT_SCRIPT);
  }
  // Add unlocked meta-progression scripts to pool
  const unlockedScripts = getUnlockedScriptDefs();
  for (const us of unlockedScripts) {
    pool.push(us as Omit<Script, 'id'>);
  }
  const result: Script[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    const s = pool.splice(idx, 1)[0];
    let script = { ...s, id: uid() };
    // Season 5 escalation: scripts have higher base scores but more variance
    // Cards get amplified — bigger highs and lower lows
    if (_season >= 5) {
      script.baseScore += 2;
      script.cards = script.cards.map(c => {
        if (c.cardType === 'action') return { ...c, baseQuality: c.baseQuality + 1 };
        if (c.cardType === 'incident') return { ...c, baseQuality: c.baseQuality - 1 };
        return c;
      });
    }
    result.push(script);
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

  const filterPool = (pool: Omit<Talent, 'id'>[]) => pool.filter(t => !rosterNames.has(t.name) && !isTalentRetired(t.name));

  const ensureTypes: Omit<Talent, 'id'>[][] = [filterPool(ALL_LEADS), filterPool(ALL_DIRECTORS), filterPool(ALL_CREW)];
  for (const pool of ensureTypes) {
    if (result.length >= count || pool.length === 0) continue;
    const pick = pool[Math.floor(rng() * pool.length)];
    if (!usedNames.has(pick.name)) {
      usedNames.add(pick.name);
      result.push(makeTalent(pick));
    }
  }

  // Prestige 4+: include elite talent in the pool
  const elitePool = _cachedPrestigeLevel >= 4 ? [...ELITE_LEADS, ...ELITE_SUPPORTS, ...ELITE_DIRECTORS, ...ELITE_CREW] : [];
  // Add unlocked meta-progression talent to pool
  const unlockedTalent = getUnlockedTalentDefs() as Omit<Talent, 'id'>[];
  // R205: Add modded talent to pool
  const modTalent = getEnabledModTalent().map(mt => modTalentToPool(mt));
  const allTalent = [...ALL_LEADS, ...ALL_SUPPORTS, ...ALL_DIRECTORS, ...ALL_CREW, ...elitePool, ...unlockedTalent, ...modTalent].filter(t => !rosterNames.has(t.name) && !isTalentRetired(t.name));
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

export interface PerkDef extends Omit<StudioPerk, 'id'> {
  prestigeRequired?: number; // minimum prestige level to appear in shop
}

export const ALL_PERKS: PerkDef[] = [
  { name: 'Reshoots Budget', cost: 12, description: 'Redraw 1 production card per film', effect: 'reshoots' },
  { name: 'Casting Network', cost: 8, description: 'See 6 talent in market instead of 4', effect: 'moreTalent' },
  { name: 'Marketing Machine', cost: 10, description: 'Choose your market condition', effect: 'chooseMarket' },
  { name: 'Independent Spirit', cost: 6, description: 'If total Heat ≤ 4, +×0.5 mult', effect: 'indieSpirit' },
  { name: 'Genre Specialist', cost: 7, description: 'Pick a genre for permanent +×0.3', effect: 'genreSpec' },
  { name: 'Crisis Manager', cost: 8, description: 'Incident card quality penalties halved', effect: 'crisisManager' },
  { name: 'Buzz Machine', cost: 10, description: 'If quality > 35, +×0.5 mult', effect: 'buzz' },
  { name: 'Insurance Policy', cost: 11, description: 'Disasters reduce quality 25% instead of losing all', effect: 'insurance' },
  { name: 'Precision Filmmaking', cost: 8, description: 'Clean Wrap bonus increased to +8', effect: 'precisionFilm' },
  { name: 'Prestige Label', cost: 12, description: 'Award nominations give +×0.3 mult', effect: 'prestige' },
  { name: 'Talent Scout', cost: 7, description: 'Peek at talent before hiring', effect: 'talentScout' },
  { name: 'Development Slate', cost: 6, description: 'See 4 scripts instead of 3', effect: 'devSlate' },
  // ─── New R92 Perks ───
  { name: 'Second Unit', cost: 7, description: 'See 1 extra script choice each season', effect: 'secondUnit' },
  { name: 'Method Acting', cost: 9, description: '+5 quality if lead actor skill ≥ 6', effect: 'methodActing' },
  { name: 'Viral Marketing', cost: 6, description: '×1.2 box office multiplier if script cost < $15M', effect: 'viralMarketing' },
  { name: 'Genre Pivot', cost: 8, description: 'Making a different genre than last film gives +5 quality', effect: 'genrePivot' },
  { name: 'Sequel Rights', cost: 10, description: 'Same genre as last film: +$10M box office', effect: 'sequelRights' },
  { name: 'Chaos Dividend', cost: 11, description: '+3 quality per Incident in production (max +9). Dangerous but rewarding.', effect: 'chaosDividend', prestigeRequired: 3 },
  { name: 'Talent Agency', cost: 14, description: 'All hired talent gets +1 Skill. Expensive but elite.', effect: 'talentAgency', prestigeRequired: 5 },
  { name: 'Completion Bond', cost: 6, description: 'Insurance: if your next film FLOPs, it\'s upgraded to a MISS (no strike). One-use, consumed on trigger.', effect: 'completionBond' },
];

export function generatePerkMarket(count: number, owned: string[]): (StudioPerk & { prestigeRequired?: number })[] {
  const prestigeLevel = _cachedPrestigeLevel;
  const pool = ALL_PERKS.filter(p => !owned.includes(p.name));
  const result: (StudioPerk & { prestigeRequired?: number })[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    const perk = pool.splice(idx, 1)[0];
    result.push({ ...perk, id: uid() });
  }
  return result;
}

/** Check if a perk is locked behind prestige */
export function isPerkLocked(perk: { prestigeRequired?: number }): boolean {
  return (perk.prestigeRequired ?? 0) > _cachedPrestigeLevel;
}

export function getSeasonTarget(season: number, gameMode: string = 'normal', challengeId?: string, dailyModifierId?: string, dailyModifierId2?: string): number {
  let adjustedSeason = season;
  // Speed Run: use seasons 2/3/4 difficulty for seasons 1/2/3 (was +2, too punishing)
  if (challengeId === 'speed_run') adjustedSeason = season + 1;
  // Extended targets for Marathon (seasons 6-8) and beyond
  const BASE_TARGETS = [20, 28, 38, 50, 62, 74, 86, 98];
  const base = BASE_TARGETS[adjustedSeason - 1] || 98 + (adjustedSeason - 8) * 12;
  let target = base;
  if (gameMode === 'newGamePlus') target = Math.round(base * 1.4);
  else if (gameMode === 'directorMode') target = Math.round(base * 1.8);
  // Critics' Choice: targets ×1.5
  if (challengeId === 'critics_choice') target = Math.round(target * 1.5);
  // Daily modifier: Award Season — quality targets +5
  if (dailyModifierId === 'award_season' || dailyModifierId2 === 'award_season') target += 5;
  // Veteran scaling: prestige level 5+ increases targets by 5% per level above 4
  // This keeps veteran players challenged as their legacy perks accumulate
  // Use cached prestige level instead of reading localStorage every call
  const prestigeLevel = _cachedPrestigeLevel;
  if (prestigeLevel >= 5) {
    const veteranScaling = 1 + (prestigeLevel - 4) * 0.05;
    target = Math.round(target * veteranScaling);
  }
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
    description: 'Clean Wrap bonus +7 (vs +5 base). Genre mastery gives +3 instead of +2. Built for consistent excellence.',
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

// ─── NEW SCRIPTS (Round 67) ───

const FOUND_FOOTAGE_CARDS: CardTemplate[] = [
  {
    name: 'Shaky Cam Reveal',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💀 +3 if draw 1-2. +2 if any Incident played (authentic terror).',
    synergyCondition: (ctx) => {
      let bonus = ctx.drawNumber <= 2 ? 3 : 0;
      if (ctx.incidentCount > 0) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Raw footage terror!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['chaos'] as CardTag[],
  },
  {
    name: 'Night Vision',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💀 +1 per Chaos tag (max +4). The camera sees everything.',
    synergyCondition: (ctx) => {
      const bonus = Math.min(ctx.tagsPlayed['chaos'] || 0, 4);
      return bonus > 0 ? { bonus, description: 'What did the camera catch?' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['chaos'] as CardTag[],
  },
  {
    name: 'Final Recording',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💀 +4 if draw 5+. +2 if 3+ Chaos tags. The last tape.',
    synergyCondition: (ctx) => {
      let bonus = ctx.drawNumber >= 5 ? 4 : 0;
      if ((ctx.tagsPlayed['chaos'] || 0) >= 3) bonus += 2;
      return bonus > 0 ? { bonus, description: 'The final recording...' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['chaos', 'momentum'] as CardTag[],
  },
  {
    name: 'Battery Dying',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card is NOT an Incident. Win +4, Lose -5. Keep filming!',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: { ...betNextIsNotIncident(), successBonus: 4, failPenalty: -5 },
    tags: ['chaos'] as CardTag[],
  },
  {
    name: 'Camera Drops',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: 'Lost footage. Adds Chaos tags.',
    synergyCondition: noSynergy,
    riskTag: '🔴',
    tags: ['chaos', 'chaos'] as CardTag[],
  },
  {
    name: 'Crew Vanishes',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'Half the crew quit. Lose $1M.',
    synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'They ran!' }),
    riskTag: '🔴',
    tags: ['chaos'] as CardTag[],
  },
];

const OPEN_MIC_CARDS: CardTemplate[] = [
  {
    name: 'Crowd Work',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💕😂 +2 if Actor card played. +1 per Heart tag (max +3). Reading the room.',
    synergyCondition: (ctx) => {
      let bonus = ctx.playedCards.some(c => c.sourceType === 'actor') ? 2 : 0;
      bonus += Math.min(ctx.tagsPlayed['heart'] || 0, 3);
      return bonus > 0 ? { bonus, description: 'The crowd loves it!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['heart'] as CardTag[],
  },
  {
    name: 'Callback Bit',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '🔥 +1 per Action card in a row (max +4). The callback lands!',
    synergyCondition: (ctx) => ctx.greenStreak > 0 ? { bonus: Math.min(ctx.greenStreak, 4), description: `${ctx.greenStreak} card streak!` } : { bonus: 0 },
    riskTag: '🟢',
    tags: ['momentum', 'heart'] as CardTag[],
  },
  {
    name: 'Vulnerable Moment',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💕 +3 if any Incident played (comedy from pain). +2 if 3+ Heart tags.',
    synergyCondition: (ctx) => {
      let bonus = ctx.incidentCount > 0 ? 3 : 0;
      if ((ctx.tagsPlayed['heart'] || 0) >= 3) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Real and funny!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['heart', 'chaos'] as CardTag[],
  },
  {
    name: 'Heckler',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card is Action. Win +4, Lose -3. Shut them down!',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: betNextIsAction(),
    tags: ['chaos'] as CardTag[],
  },
  {
    name: 'Bombed Hard',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: 'Dead silence. Adds Heart tag (they felt the cringe).',
    synergyCondition: noSynergy,
    riskTag: '🔴',
    tags: ['heart'] as CardTag[],
  },
  {
    name: 'Canceled',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'Old tweets surface. Lose $1M in damage control.',
    synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'PR disaster!' }),
    riskTag: '🔴',
  },
];

const ETERNAL_VOW_CARDS: CardTemplate[] = [
  {
    name: 'Stolen Glances',
    cardType: 'action',
    baseQuality: 2,
    synergyText: '💕🎯 +3 if 2+ Actor cards played. +2 if both Precision AND Heart tags.',
    synergyCondition: (ctx) => {
      let bonus = ctx.playedCards.filter(c => c.sourceType === 'actor').length >= 2 ? 3 : 0;
      if ((ctx.tagsPlayed['precision'] || 0) > 0 && (ctx.tagsPlayed['heart'] || 0) > 0) bonus += 2;
      return bonus > 0 ? { bonus, description: 'The longing is palpable!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['heart', 'precision'] as CardTag[],
  },
  {
    name: 'Period Ball Scene',
    cardType: 'action',
    baseQuality: 2,
    synergyText: '✨💕 +2 if Crew card played. +2 if Director card played. Lavish production.',
    synergyCondition: (ctx) => {
      let bonus = ctx.playedCards.some(c => c.sourceType === 'crew') ? 2 : 0;
      if (ctx.playedCards.some(c => c.sourceType === 'director')) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Breathtaking ball!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['spectacle', 'heart'] as CardTag[],
  },
  {
    name: 'Forbidden Letter',
    cardType: 'action',
    baseQuality: 2,
    synergyText: '💕 +1 per Heart tag (max +4). +2 if Lead Skill 5+. Pure emotion.',
    synergyCondition: (ctx) => {
      let bonus = Math.min(ctx.tagsPlayed['heart'] || 0, 4);
      if (ctx.leadSkill >= 5) bonus += 2;
      return bonus > 0 ? { bonus, description: 'The letter changes everything!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['heart', 'precision'] as CardTag[],
  },
  {
    name: 'Secret Rendezvous',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card is from an Actor. Win +5, Lose -3. Secret meeting!',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: { ...betNextIsFromActor(), successBonus: 5 },
    tags: ['heart'] as CardTag[],
  },
  {
    name: 'Melodrama Overload',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'Too much. -2 if no Precision tags (no restraint). Lose $2M.',
    synergyCondition: (ctx) => ({ bonus: (ctx.tagsPlayed['precision'] || 0) === 0 ? -2 : 0, budgetMod: -2, description: 'The drama overwhelmed!' }),
    riskTag: '🔴',
  },
  {
    name: 'Historical Inaccuracy',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: 'Historians are livid. -2 if quality < 15.',
    synergyCondition: (ctx) => ctx.totalQuality < 15 ? { bonus: -2, description: 'Not good enough to forgive the errors!' } : { bonus: 0 },
    riskTag: '🔴',
  },
];

const COLOSSEUM_CARDS: CardTemplate[] = [
  {
    name: 'Arena Battle',
    cardType: 'action',
    baseQuality: 2,
    synergyText: '✨🔥 +2 if Crew card played. +1 per Spectacle tag (max +3). +1 per Momentum tag (max +2).',
    synergyCondition: (ctx) => {
      let bonus = ctx.playedCards.some(c => c.sourceType === 'crew') ? 2 : 0;
      bonus += Math.min(ctx.tagsPlayed['spectacle'] || 0, 3);
      bonus += Math.min(ctx.tagsPlayed['momentum'] || 0, 2);
      return bonus > 0 ? { bonus, description: 'Epic arena battle!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['spectacle', 'momentum'] as CardTag[],
  },
  {
    name: 'Gladiator\'s Speech',
    cardType: 'action',
    baseQuality: 2,
    synergyText: '💕✨ +3 if Lead Skill 5+. +2 if both Heart AND Spectacle tags exist.',
    synergyCondition: (ctx) => {
      let bonus = ctx.leadSkill >= 5 ? 3 : 0;
      if ((ctx.tagsPlayed['heart'] || 0) > 0 && (ctx.tagsPlayed['spectacle'] || 0) > 0) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Crowd roars!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['heart', 'spectacle'] as CardTag[],
  },
  {
    name: 'Chariot Chase',
    cardType: 'action',
    baseQuality: 2,
    synergyText: '🔥 +2 if previous card was Action. +2 if action streak ≥ 3. Thundering hooves!',
    synergyCondition: (ctx) => {
      let bonus = ctx.previousCard?.cardType === 'action' ? 2 : 0;
      if (ctx.greenStreak >= 3) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Chariot chase!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['momentum', 'spectacle'] as CardTag[],
  },
  {
    name: 'Thumb\'s Down',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card has high value. Win +6, Lose -4. The emperor decides!',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: { ...betNextIsHighValue(), successBonus: 6, failPenalty: -4 },
    tags: ['spectacle'] as CardTag[],
  },
  {
    name: 'Set Collapse',
    cardType: 'incident',
    baseQuality: -6,
    synergyText: 'The colosseum set collapsed. Lose $3M.',
    synergyCondition: () => ({ bonus: 0, budgetMod: -3, description: 'Massive set failure!' }),
    riskTag: '🔴',
    tags: ['spectacle'] as CardTag[],
  },
  {
    name: 'Extras Revolt',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: '5000 extras walk off. -2 if no Spectacle tags.',
    synergyCondition: (ctx) => (ctx.tagsPlayed['spectacle'] || 0) === 0 ? { bonus: -2, description: 'No spectacle to show!' } : { bonus: 0 },
    riskTag: '🔴',
  },
];

const SUMMER_FLING_CARDS: CardTemplate[] = [
  {
    name: 'Beach Montage',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💕🔥 +2 if Actor card played. +1 per Momentum tag (max +2). +1 per Heart tag (max +2). Summer vibes.',
    synergyCondition: (ctx) => {
      let bonus = ctx.playedCards.some(c => c.sourceType === 'actor') ? 2 : 0;
      bonus += Math.min(ctx.tagsPlayed['momentum'] || 0, 2);
      bonus += Math.min(ctx.tagsPlayed['heart'] || 0, 2);
      return bonus > 0 ? { bonus, description: 'Summer vibes!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['heart', 'momentum'] as CardTag[],
  },
  {
    name: 'Sunset Confession',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💕 +3 if 2+ Actor cards played. +2 if draw 4+ (built to this moment).',
    synergyCondition: (ctx) => {
      let bonus = ctx.playedCards.filter(c => c.sourceType === 'actor').length >= 2 ? 3 : 0;
      if (ctx.drawNumber >= 4) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Golden hour confession!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['heart'] as CardTag[],
  },
  {
    name: 'Road Trip Detour',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '🔥 +2 if previous card was Action. +2 if Crew card played. Adventure awaits.',
    synergyCondition: (ctx) => {
      let bonus = ctx.previousCard?.cardType === 'action' ? 2 : 0;
      if (ctx.playedCards.some(c => c.sourceType === 'crew')) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Detour magic!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['momentum'] as CardTag[],
  },
  {
    name: 'Rain Ruins the Date',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card is from an Actor. Win +4, Lose -3. Can they save it?',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: betNextIsFromActor(),
    tags: ['heart'] as CardTag[],
  },
  {
    name: 'Cringe Dialogue',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: 'The script is bad. -2 if 0 Heart tags (no chemistry to cover it).',
    synergyCondition: (ctx) => (ctx.tagsPlayed['heart'] || 0) === 0 ? { bonus: -2, description: 'No chemistry!' } : { bonus: 0 },
    riskTag: '🔴',
  },
  {
    name: 'Leads Hate Each Other',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'Zero chemistry off camera. Poisons actors.',
    synergyCondition: noSynergy,
    riskTag: '🔴',
    special: 'poisonActors',
  },
];

const GALACTIC_SENATE_CARDS: CardTemplate[] = [
  {
    name: 'Senate Debate',
    cardType: 'action',
    baseQuality: 2,
    synergyText: '🎯 +3 if 2+ Actor cards played. +1 per Precision tag (max +3). Political intrigue.',
    synergyCondition: (ctx) => {
      let bonus = ctx.playedCards.filter(c => c.sourceType === 'actor').length >= 2 ? 3 : 0;
      bonus += Math.min(ctx.tagsPlayed['precision'] || 0, 3);
      return bonus > 0 ? { bonus, description: 'Political brilliance!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['precision'] as CardTag[],
  },
  {
    name: 'Fleet Battle',
    cardType: 'action',
    baseQuality: 2,
    synergyText: '✨ +2 if Crew card played. +2 if 3+ Spectacle tags. Epic space warfare.',
    synergyCondition: (ctx) => {
      let bonus = ctx.playedCards.some(c => c.sourceType === 'crew') ? 2 : 0;
      if ((ctx.tagsPlayed['spectacle'] || 0) >= 3) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Space warfare!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['spectacle'] as CardTag[],
  },
  {
    name: 'Alien Diplomacy',
    cardType: 'action',
    baseQuality: 2,
    synergyText: '🎯💕 +2 if Director card played. +2 if both Precision AND Heart tags. First contact done right.',
    synergyCondition: (ctx) => {
      let bonus = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0;
      if ((ctx.tagsPlayed['precision'] || 0) > 0 && (ctx.tagsPlayed['heart'] || 0) > 0) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Diplomacy triumph!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['precision', 'heart'] as CardTag[],
  },
  {
    name: 'Coup Attempt',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Sacrifice next card to double last card. Political gambit!',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: betSacrificeForDouble(),
    tags: ['precision'] as CardTag[],
  },
  {
    name: 'Worldbuilding Overload',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'Too much lore. -2 if no Spectacle tags (nothing visual to anchor it). Lose $2M.',
    synergyCondition: (ctx) => ({ bonus: (ctx.tagsPlayed['spectacle'] || 0) === 0 ? -2 : 0, budgetMod: -2, description: 'Audiences lost!' }),
    riskTag: '🔴',
  },
  {
    name: 'Fan Backlash',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: 'The fandom is furious. -2 if quality < 20.',
    synergyCondition: (ctx) => ctx.totalQuality < 20 ? { bonus: -2, description: 'Fans revolt!' } : { bonus: 0 },
    riskTag: '🔴',
  },
];

const STAND_UP_SPECIAL_CARDS: CardTemplate[] = [
  {
    name: 'Opening Joke',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💕🔥 +3 if draw 1-2. +1 per Heart tag (max +2). Set the tone!',
    synergyCondition: (ctx) => {
      let bonus = ctx.drawNumber <= 2 ? 3 : 0;
      bonus += Math.min(ctx.tagsPlayed['heart'] || 0, 2);
      return bonus > 0 ? { bonus, description: 'Strong opener!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['heart', 'momentum'] as CardTag[],
  },
  {
    name: 'Personal Story',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💕 +2 if Actor card played. +3 if 4+ Heart tags. Raw and real.',
    synergyCondition: (ctx) => {
      let bonus = ctx.playedCards.some(c => c.sourceType === 'actor') ? 2 : 0;
      if ((ctx.tagsPlayed['heart'] || 0) >= 4) bonus += 3;
      return bonus > 0 ? { bonus, description: 'The audience connects!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['heart'] as CardTag[],
  },
  {
    name: 'Killer Closer',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '🔥 +3 if draw 4+. +2 if action streak ≥ 2. Bring the house down!',
    synergyCondition: (ctx) => {
      let bonus = ctx.drawNumber >= 4 ? 3 : 0;
      if (ctx.greenStreak >= 2) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Standing ovation!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['momentum'] as CardTag[],
  },
  {
    name: 'Crowd Turns',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card is NOT an Incident. Win +3, Lose -4.',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: betNextIsNotIncident(),
    tags: ['heart'] as CardTag[],
  },
  {
    name: 'Joke Theft Accusation',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: 'Twitter says you stole bits. Lose $1M.',
    synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'Plagiarism scandal!' }),
    riskTag: '🔴',
  },
  {
    name: 'Empty Room',
    cardType: 'incident',
    baseQuality: -3,
    synergyText: 'Nobody showed up. -2 if 0 Heart tags.',
    synergyCondition: (ctx) => (ctx.tagsPlayed['heart'] || 0) === 0 ? { bonus: -2, description: 'No connection, no audience!' } : { bonus: 0 },
    riskTag: '🔴',
  },
];

const PHANTOM_FREQUENCY_CARDS: CardTemplate[] = [
  {
    name: 'Radio Static',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💀🎯 +2 if draw 1-2. +2 if both Chaos AND Precision tags. Controlled dread.',
    synergyCondition: (ctx) => {
      let bonus = ctx.drawNumber <= 2 ? 2 : 0;
      if ((ctx.tagsPlayed['chaos'] || 0) > 0 && (ctx.tagsPlayed['precision'] || 0) > 0) bonus += 2;
      return bonus > 0 ? { bonus, description: 'Something on the frequency...' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['chaos', 'precision'] as CardTag[],
  },
  {
    name: 'Investigation Scene',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '🎯 +2 if Director card played. +1 per Precision tag (max +3). Methodical terror.',
    synergyCondition: (ctx) => {
      let bonus = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0;
      bonus += Math.min(ctx.tagsPlayed['precision'] || 0, 3);
      return bonus > 0 ? { bonus, description: 'Methodical horror!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['precision'] as CardTag[],
  },
  {
    name: 'The Signal',
    cardType: 'action',
    baseQuality: 1,
    synergyText: '💀 +3 if draw 4+. +2 if 2+ Chaos tags. The signal gets stronger...',
    synergyCondition: (ctx) => {
      let bonus = ctx.drawNumber >= 4 ? 3 : 0;
      if ((ctx.tagsPlayed['chaos'] || 0) >= 2) bonus += 2;
      return bonus > 0 ? { bonus, description: 'THE SIGNAL!' } : { bonus: 0 };
    },
    riskTag: '🟢',
    tags: ['chaos'] as CardTag[],
  },
  {
    name: 'Frequency Shift',
    cardType: 'challenge',
    baseQuality: 0,
    synergyText: 'Challenge: Bet next card has high value. Win +5, Lose -3.',
    synergyCondition: noSynergy,
    riskTag: '🟡',
    challengeBet: betNextIsHighValue(),
    tags: ['chaos'] as CardTag[],
  },
  {
    name: 'Sound Designer Breakdown',
    cardType: 'incident',
    baseQuality: -4,
    synergyText: 'The sound engineer heard something. Lose $1M. Adds Chaos.',
    synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'What did they hear?' }),
    riskTag: '🔴',
    tags: ['chaos'] as CardTag[],
  },
  {
    name: 'Audience Walkout',
    cardType: 'incident',
    baseQuality: -5,
    synergyText: 'Too disturbing. -2 if no Precision tags (no craft to ground it).',
    synergyCondition: (ctx) => (ctx.tagsPlayed['precision'] || 0) === 0 ? { bonus: -2, description: 'All shock, no craft!' } : { bonus: 0 },
    riskTag: '🔴',
  },
];

ALL_SCRIPTS.push(
  {
    title: 'Found Footage',
    genre: 'Horror',
    baseScore: 4,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 1,
    cards: FOUND_FOOTAGE_CARDS,
    ability: 'finalGirl',
    abilityDesc: 'Raw Terror: If you wrap after exactly 5 draws, +5 bonus. Chaos tags count as +1 quality each.',
  },
  {
    title: 'Open Mic Night',
    genre: 'Comedy',
    baseScore: 4,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 1,
    cards: OPEN_MIC_CARDS,
    ability: 'heartEngine',
    abilityDesc: 'Crowd Warmth: Each Heart tag adds +1 quality. 6+ Heart = additional ×1.2 multiplier!',
  },
  {
    title: 'Eternal Vow',
    genre: 'Romance',
    baseScore: 9,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 6,
    cards: ETERNAL_VOW_CARDS,
    ability: 'precisionCraft',
    abilityDesc: '🏆 PRESTIGE ROMANCE: Each Precision tag adds +1 quality. Clean wrap bonus doubled. Period epic.',
  },
  {
    title: 'The Colosseum',
    genre: 'Action',
    baseScore: 9,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 7,
    cards: COLOSSEUM_CARDS,
    ability: 'blockbusterBonus',
    abilityDesc: '🏆 EPIC SPECTACLE: Market multiplier +0.3. Each Spectacle tag adds +0.05 more. Historic blockbuster.',
  },
  {
    title: 'Summer Fling',
    genre: 'Romance',
    baseScore: 5,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 2,
    cards: SUMMER_FLING_CARDS,
    ability: 'heartEngine',
    abilityDesc: 'Summer Love: Each Heart tag adds +1 quality. 6+ Heart = additional ×1.2 multiplier!',
  },
  {
    title: 'Galactic Senate',
    genre: 'Sci-Fi',
    baseScore: 9,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 6,
    cards: GALACTIC_SENATE_CARDS,
    ability: 'prestige',
    abilityDesc: '🏆 SPACE OPERA: Quality above 35 counts double for nominations. Political sci-fi epic.',
  },
  {
    title: 'Stand-Up Special',
    genre: 'Comedy',
    baseScore: 5,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 3,
    cards: STAND_UP_SPECIAL_CARDS,
    ability: 'crowdPleaser',
    abilityDesc: 'Live Energy: For every 3 consecutive Action cards, +2 bonus.',
  },
  {
    title: 'Phantom Frequency',
    genre: 'Horror',
    baseScore: 7,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 4,
    cards: PHANTOM_FREQUENCY_CARDS,
    ability: 'slowBurn',
    abilityDesc: 'Psychological Horror: Cards after draw 4 get +1 base. Exactly 2 Incidents = +8 quality!',
  },
);

// ─── NEW TALENT (Round 67) ───

const NINA_OKAFOR: Omit<Talent, 'id'> = {
  name: 'Nina Okafor',
  type: 'Lead',
  skill: 4,
  heat: 2,
  cost: 13,
  genreBonus: { genre: 'Drama', bonus: 2 },
  trait: 'The Empath',
  traitDesc: '💕🎯 HEART + PRECISION hybrid. Emotional intelligence meets technical skill. Elevates dramatic ensembles.',
  cards: [
    {
      name: 'Empathic Reading',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💕 +2 if Actor card played. +1 per Heart tag (max +3). +1 per Precision tag (max +2).',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.some(c => c.sourceType === 'actor') ? 2 : 0;
        bonus += Math.min(ctx.tagsPlayed['heart'] || 0, 3);
        bonus += Math.min(ctx.tagsPlayed['precision'] || 0, 2);
        return bonus > 0 ? { bonus, description: 'She feels the scene!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['heart', 'precision'] as CardTag[],
    },
    {
      name: 'Crying Scene',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💕 +4 if Director card played AND 2+ Heart tags. The tears are real.',
      synergyCondition: (ctx) => {
        const hasDir = ctx.playedCards.some(c => c.sourceType === 'director');
        const hearts = ctx.tagsPlayed['heart'] || 0;
        return (hasDir && hearts >= 2) ? { bonus: 4, description: 'Everyone is crying!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Understated Power',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🎯 +3 if ≤ 3 cards played and 0 Incidents. Less is more.',
      synergyCondition: (ctx) => (ctx.playedCards.length <= 2 && ctx.incidentCount === 0) ? { bonus: 3, description: 'Restraint is power!' } : { bonus: 0 },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Emotional Overload',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card has high value. Win +5, Lose -3.',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsHighValue(),
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Burnout',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Too much feeling. -2 if 5+ cards played (exhaustion). But adds Heart tag.',
      synergyCondition: (ctx) => ctx.playedCards.length >= 5 ? { bonus: -2, description: 'Emotional exhaustion!' } : { bonus: 0 },
      riskTag: '🔴',
      tags: ['heart'] as CardTag[],
    },
  ],
};

const RJ_MITCHELL: Omit<Talent, 'id'> = {
  name: 'R.J. Mitchell',
  type: 'Lead',
  skill: 3,
  heat: 0,
  cost: 7,
  genreBonus: { genre: 'Horror', bonus: 3 },
  trait: 'Scream Queen',
  traitDesc: '💀 CHAOS specialist. Horror icon. Incidents become fuel — the worse things get, the better R.J. performs.',
  cards: [
    {
      name: 'Blood-Curdling Scream',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💀 +2 per Incident played (max +6). Horror royalty thrives in chaos.',
      synergyCondition: (ctx) => {
        const bonus = Math.min(ctx.incidentCount * 2, 6);
        return bonus > 0 ? { bonus, description: `${ctx.incidentCount} incidents = terror gold!` } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['chaos'] as CardTag[],
    },
    {
      name: 'Final Survivor',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💀 +3 if draw 5+. +2 if 3+ Chaos tags. The last one standing.',
      synergyCondition: (ctx) => {
        let bonus = ctx.drawNumber >= 5 ? 3 : 0;
        if ((ctx.tagsPlayed['chaos'] || 0) >= 3) bonus += 2;
        return bonus > 0 ? { bonus, description: 'SOLE SURVIVOR!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['chaos', 'momentum'] as CardTag[],
    },
    {
      name: 'Genre Icon Moment',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+3 if Director card played. +1 per Chaos tag (max +2). Iconic.',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.some(c => c.sourceType === 'director') ? 3 : 0;
        bonus += Math.min(ctx.tagsPlayed['chaos'] || 0, 2);
        return bonus > 0 ? { bonus, description: 'Horror icon moment!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['chaos'] as CardTag[],
    },
    {
      name: 'Typecast Trap',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is NOT an Incident. Win +3, Lose -4.',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsNotIncident(),
      tags: ['chaos'] as CardTag[],
    },
    {
      name: 'Panic Attack',
      cardType: 'incident',
      baseQuality: -3,
      synergyText: 'Too real. But adds Chaos tags (the fear is authentic).',
      synergyCondition: noSynergy,
      riskTag: '🔴',
      tags: ['chaos', 'chaos'] as CardTag[],
    },
  ],
};

const VERA_KINGSLEY: Omit<Talent, 'id'> = {
  name: 'Vera Kingsley',
  type: 'Support',
  skill: 3,
  heat: 1,
  cost: 7,
  genreBonus: { genre: 'Thriller', bonus: 2 },
  trait: 'The Provocateur',
  traitDesc: '💀🎯 Bridges Chaos + Precision. Cards that create controlled chaos — risk with calculated payoff.',
  cards: [
    {
      name: 'Controlled Provocation',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💀🎯 +2 if both Chaos AND Precision tags exist. +2 if Actor card played.',
      synergyCondition: (ctx) => {
        let bonus = ((ctx.tagsPlayed['chaos'] || 0) > 0 && (ctx.tagsPlayed['precision'] || 0) > 0) ? 2 : 0;
        if (ctx.playedCards.some(c => c.sourceType === 'actor')) bonus += 2;
        return bonus > 0 ? { bonus, description: 'Calculated provocation!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['chaos', 'precision'] as CardTag[],
    },
    {
      name: 'Under Pressure',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+3 if any Incident played AND Director card played. Thrives in adversity.',
      synergyCondition: (ctx) => {
        return (ctx.incidentCount > 0 && ctx.playedCards.some(c => c.sourceType === 'director')) ? { bonus: 3, description: 'Pressure makes diamonds!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Sabotage Suspicion',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card has high value. Win +5, Lose -3. Trust no one.',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: betNextIsHighValue(),
      tags: ['chaos'] as CardTag[],
    },
    {
      name: 'Pushed Too Far',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Crossed the line. Poisons next card. But adds both Chaos and Precision tags.',
      synergyCondition: noSynergy,
      riskTag: '🔴',
      special: 'poisonNext',
      tags: ['chaos', 'precision'] as CardTag[],
    },
  ],
};

const SAM_ODUYA: Omit<Talent, 'id'> = {
  name: 'Sam Oduya',
  type: 'Support',
  skill: 4,
  heat: 0,
  cost: 8,
  genreBonus: { genre: 'Sci-Fi', bonus: 2 },
  trait: 'Technical Genius',
  traitDesc: '🎯✨ PRECISION + SPECTACLE. Methodical support who amplifies high-production films.',
  cards: [
    {
      name: 'Systems Check',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🎯 +2 if Crew card played. +1 per Precision tag (max +3). Everything runs smooth.',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.some(c => c.sourceType === 'crew') ? 2 : 0;
        bonus += Math.min(ctx.tagsPlayed['precision'] || 0, 3);
        return bonus > 0 ? { bonus, description: 'Systems nominal!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Technical Breakthrough',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '✨ +3 if 3+ unique source types played. +2 if 0 Incidents (flawless execution).',
      synergyCondition: (ctx) => {
        const types = new Set(ctx.playedCards.map(c => c.sourceType));
        let bonus = types.size >= 3 ? 3 : 0;
        if (ctx.incidentCount === 0) bonus += 2;
        return bonus > 0 ? { bonus, description: 'Technical breakthrough!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision', 'spectacle'] as CardTag[],
    },
    {
      name: 'Override Protocol',
      cardType: 'action',
      baseQuality: 1,
      synergyText: 'Remove 1 Incident from remaining deck. Technical problem-solving.',
      synergyCondition: () => ({ bonus: 0, description: 'Override successful!' }),
      riskTag: '🟢',
      special: 'removeRed',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'System Failure',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Critical error. -2 if 0 Precision tags (no fallback).',
      synergyCondition: (ctx) => (ctx.tagsPlayed['precision'] || 0) === 0 ? { bonus: -2, description: 'No precision fallback!' } : { bonus: 0 },
      riskTag: '🔴',
    },
  ],
};

const KATYA_VOLKOV: Omit<Talent, 'id'> = {
  name: 'Katya Volkov',
  type: 'Director',
  skill: 5,
  heat: 1,
  cost: 13,
  filmsLeft: 3,
  genreBonus: { genre: 'Thriller', bonus: 2 },
  trait: 'Tension Master',
  traitDesc: '🎯💀 PRECISION + CHAOS. Creates unbearable tension through controlled chaos. Rewards discipline AND danger.',
  cards: [
    {
      name: 'Pressure Cooker',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🎯💀 +2 if both Precision AND Chaos tags exist. +2 if Actor card played. Calculated tension.',
      synergyCondition: (ctx) => {
        let bonus = ((ctx.tagsPlayed['precision'] || 0) > 0 && (ctx.tagsPlayed['chaos'] || 0) > 0) ? 2 : 0;
        if (ctx.playedCards.some(c => c.sourceType === 'actor')) bonus += 2;
        return bonus > 0 ? { bonus, description: 'Unbearable tension!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision', 'chaos'] as CardTag[],
    },
    {
      name: 'Silent Dread',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🎯 +3 if 0 Incidents and draw 3+. +1 per Precision tag (max +2). Building toward something terrible.',
      synergyCondition: (ctx) => {
        let bonus = (ctx.incidentCount === 0 && ctx.drawNumber >= 3) ? 3 : 0;
        bonus += Math.min(ctx.tagsPlayed['precision'] || 0, 2);
        return bonus > 0 ? { bonus, description: 'The silence screams!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Explosive Reveal',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💀 +4 if any Incident played. +2 if 3+ Chaos tags. The tension breaks.',
      synergyCondition: (ctx) => {
        let bonus = ctx.incidentCount > 0 ? 4 : 0;
        if ((ctx.tagsPlayed['chaos'] || 0) >= 3) bonus += 2;
        return bonus > 0 ? { bonus, description: 'REVEAL!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['chaos'] as CardTag[],
    },
    {
      name: 'Paranoia Check',
      cardType: 'challenge',
      baseQuality: 0,
      synergyText: 'Challenge: Bet next card is NOT an Incident. Win +4, Lose -5. Trust nothing.',
      synergyCondition: noSynergy,
      riskTag: '🟡',
      challengeBet: { ...betNextIsNotIncident(), successBonus: 4, failPenalty: -5 },
      tags: ['chaos'] as CardTag[],
    },
    {
      name: 'Cast Meltdown',
      cardType: 'incident',
      baseQuality: -5,
      synergyText: 'Katya pushed everyone too hard. Poisons actors. Adds Chaos + Precision tags.',
      synergyCondition: noSynergy,
      riskTag: '🔴',
      special: 'poisonActors',
      tags: ['chaos', 'precision'] as CardTag[],
    },
  ],
};

const LEO_MARCHETTI: Omit<Talent, 'id'> = {
  name: 'Leo Marchetti',
  type: 'Director',
  skill: 3,
  heat: 0,
  cost: 7,
  genreBonus: { genre: 'Romance', bonus: 3 },
  trait: 'Romance Specialist',
  traitDesc: '💕 HEART specialist director. Knows how to film love. Cheap, focused, and effective for romance builds.',
  cards: [
    {
      name: 'Chemistry Direction',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💕 +3 if 2+ Actor cards played. +1 per Heart tag (max +3). He knows how to film love.',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.filter(c => c.sourceType === 'actor').length >= 2 ? 3 : 0;
        bonus += Math.min(ctx.tagsPlayed['heart'] || 0, 3);
        return bonus > 0 ? { bonus, description: 'He sees the chemistry!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Intimate Lighting',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💕 +2 if Crew card played. +2 if discarded ≥ 1 (selective editing).',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.some(c => c.sourceType === 'crew') ? 2 : 0;
        if (ctx.discardedCount >= 1) bonus += 2;
        return bonus > 0 ? { bonus, description: 'Soft, warm light!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Emotional Climax',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '💕 +3 if 4+ Heart tags. +2 if draw 4+. The emotional peak.',
      synergyCondition: (ctx) => {
        let bonus = (ctx.tagsPlayed['heart'] || 0) >= 4 ? 3 : 0;
        if (ctx.drawNumber >= 4) bonus += 2;
        return bonus > 0 ? { bonus, description: 'EMOTIONAL CLIMAX!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['heart'] as CardTag[],
    },
    {
      name: 'Sappy Direction',
      cardType: 'incident',
      baseQuality: -3,
      synergyText: 'Too sentimental. -2 if 0 Heart tags (no foundation). Adds Heart tag.',
      synergyCondition: (ctx) => (ctx.tagsPlayed['heart'] || 0) === 0 ? { bonus: -2, description: 'Sappy without substance!' } : { bonus: 0 },
      riskTag: '🔴',
      tags: ['heart'] as CardTag[],
    },
  ],
};

const VELOCITY_PRODUCTIONS: Omit<Talent, 'id'> = {
  name: 'Velocity Productions',
  type: 'Crew',
  skill: 3,
  heat: 0,
  cost: 6,
  trait: 'Action Crew',
  traitDesc: '🔥 MOMENTUM specialist crew. Fast setups, rapid turnarounds. Makes action sequences sing.',
  cards: [
    {
      name: 'Quick Setup',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🔥 +3 if draw 1-2. +1 per Momentum tag (max +2). Speed is everything.',
      synergyCondition: (ctx) => {
        let bonus = ctx.drawNumber <= 2 ? 3 : 0;
        bonus += Math.min(ctx.tagsPlayed['momentum'] || 0, 2);
        return bonus > 0 ? { bonus, description: 'Lightning fast setup!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['momentum'] as CardTag[],
    },
    {
      name: 'Rapid Coverage',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🔥 +2 if Director card played. +2 if previous card was Action. Keep rolling!',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0;
        if (ctx.previousCard?.cardType === 'action') bonus += 2;
        return bonus > 0 ? { bonus, description: 'Keep rolling!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['momentum'] as CardTag[],
    },
    {
      name: 'Turnaround Magic',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if action streak ≥ 2. +2 if 3+ Momentum tags. The pace never stops.',
      synergyCondition: (ctx) => {
        let bonus = ctx.greenStreak >= 2 ? 2 : 0;
        if ((ctx.tagsPlayed['momentum'] || 0) >= 3) bonus += 2;
        return bonus > 0 ? { bonus, description: 'Unstoppable pace!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['momentum'] as CardTag[],
    },
    {
      name: 'Rushed Take',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Too fast. -2 if 0 Momentum tags (speed without rhythm).',
      synergyCondition: (ctx) => (ctx.tagsPlayed['momentum'] || 0) === 0 ? { bonus: -2, description: 'Speed without purpose!' } : { bonus: 0 },
      riskTag: '🔴',
    },
  ],
};

const LUMIERE_LIGHTING: Omit<Talent, 'id'> = {
  name: 'Lumière Lighting',
  type: 'Crew',
  skill: 4,
  heat: 0,
  cost: 10,
  trait: 'Master Lighting',
  traitDesc: '✨💕 Bridges Spectacle + Heart. Award-winning lighting that creates mood and emotion.',
  cards: [
    {
      name: 'Mood Lighting',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '✨💕 +1 per Heart tag + 1 per Spectacle tag (max +5). Light shapes emotion.',
      synergyCondition: (ctx) => {
        const h = ctx.tagsPlayed['heart'] || 0;
        const s = ctx.tagsPlayed['spectacle'] || 0;
        const bonus = Math.min(h + s, 5);
        return bonus > 0 ? { bonus, description: `${h} heart + ${s} spectacle = perfect light!` } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['heart', 'spectacle'] as CardTag[],
    },
    {
      name: 'Chiaroscuro',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '+2 if Director card played. +2 if Actor card played. Light and shadow.',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0;
        if (ctx.playedCards.some(c => c.sourceType === 'actor')) bonus += 2;
        return bonus > 0 ? { bonus, description: 'Masterful lighting!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['spectacle'] as CardTag[],
    },
    {
      name: 'Practical Glow',
      cardType: 'action',
      baseQuality: 1,
      synergyText: '🎯 +2 if another Crew card played. +2 if 0 Incidents (pristine conditions).',
      synergyCondition: (ctx) => {
        let bonus = ctx.playedCards.some(c => c.sourceType === 'crew' && c.source !== 'Lumière Lighting') ? 2 : 0;
        if (ctx.incidentCount === 0) bonus += 2;
        return bonus > 0 ? { bonus, description: 'Perfect conditions!' } : { bonus: 0 };
      },
      riskTag: '🟢',
      tags: ['precision'] as CardTag[],
    },
    {
      name: 'Generator Blowout',
      cardType: 'incident',
      baseQuality: -4,
      synergyText: 'Power failure. Lose $1M.',
      synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'Generators failed!' }),
      riskTag: '🔴',
    },
  ],
};

// Add new talent to pools
ALL_LEADS.push(NINA_OKAFOR, RJ_MITCHELL);
ALL_SUPPORTS.push(VERA_KINGSLEY, SAM_ODUYA);
ALL_DIRECTORS.push(KATYA_VOLKOV, LEO_MARCHETTI);
ALL_CREW.push(VELOCITY_PRODUCTIONS, LUMIERE_LIGHTING);

// ─── NEW SEASON EVENTS (Round 67) ───

ALL_SEASON_EVENTS.push(
  {
    id: 'rival_poaching',
    name: 'Rival Talent Raid',
    emoji: '🕵️',
    description: 'A rival studio poaches your cheapest talent. Lose 1 roster member (lowest cost). But gain +$5M compensation.',
    flavorText: '"They made me an offer I couldn\'t refuse." — Your former hire, waving from across the lot.',
    effect: 'rivalPoaching',
  },
  {
    id: 'genre_masterclass',
    name: 'Genre Masterclass',
    emoji: '🎓',
    description: 'Your most-made genre gets permanent +1 mastery level. But costs $4M for the intensive workshop.',
    flavorText: 'A legendary filmmaker offers a private masterclass in your specialty genre. Expensive, but transformative.',
    effect: 'genreMasterclass',
  },
  {
    id: 'insurance_fraud',
    name: 'Insurance Scam',
    emoji: '🔥',
    description: 'Gain +$8M from "mysterious" set damage. But next film adds 2 extra Incidents to deck (investigators snooping).',
    flavorText: 'The fire was... suspicious. The payout is great, but people are asking questions.',
    effect: 'insuranceFraud',
  },
  {
    id: 'festival_invitation',
    name: 'Festival Invitation',
    emoji: '🎪',
    description: 'Next film: if quality > 30, earn +$8M festival bonus. If quality ≤ 20, lose $3M (embarrassing premiere).',
    flavorText: 'Cannes wants your next film for opening night. No pressure.',
    effect: 'festivalInvitation',
  },
  {
    id: 'rival_flop',
    name: 'Rival Studio Flop',
    emoji: '📉',
    description: 'A rival\'s blockbuster bombed. All your films this season get +×0.2 market multiplier (less competition).',
    flavorText: 'Their $200M tentpole opened to $12M. The schadenfreude is real — and profitable.',
    effect: 'rivalFlop',
  },
  {
    id: 'method_epidemic',
    name: 'Method Acting Epidemic',
    emoji: '🎭',
    description: 'All talent gain +1 Skill this season. But all talent gain +1 Heat (everyone\'s dramatic now).',
    flavorText: 'Every actor in Hollywood is "staying in character" 24/7. The performances are incredible. The behavior is not.',
    effect: 'methodEpidemic',
  },
);

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
  // R55 Chemistry
  { talent1: 'Benny Romano', talent2: 'Petra Williams', name: 'Comedy Dream Team', description: 'Comedy king meets comedy auteur. +4 quality.', qualityBonus: 4 },
  { talent1: 'Cassandra Voss', talent2: 'Ava Thornton', name: 'Calculated Perfection', description: 'Two strategists in sync. +4 quality.', qualityBonus: 4 },
  { talent1: 'Wade Harmon', talent2: 'Marcus A. Jones', name: 'Action Titans', description: 'The showman meets the maestro. +4 quality.', qualityBonus: 4 },
  { talent1: 'Grace Okonkwo', talent2: 'Heartstrings Music', name: 'Emotional Depth', description: 'Dramatic anchor + emotional score. +3 quality.', qualityBonus: 3 },
  { talent1: 'Luna Price', talent2: 'Diego Fuentes', name: 'Internet Famous', description: 'Social media meets spectacle. +3 quality.', qualityBonus: 3 },
  { talent1: 'Jack Navarro', talent2: 'Mei Ling', name: 'Stunt Legends', description: 'Coordinator + action star. +3 quality.', qualityBonus: 3 },
  { talent1: 'Benny Romano', talent2: 'Tommy "T-Bone" Jackson', name: 'Comedy Duo', description: 'Two funny guys. Guaranteed laughs. +3 quality.', qualityBonus: 3 },
  { talent1: 'Darkroom Collective', talent2: 'James "Jimmy" Chang', name: 'Horror Factory', description: 'Horror crew + horror director. +4 quality.', qualityBonus: 4 },
  // R67 Chemistry
  { talent1: 'Nina Okafor', talent2: 'Grace Okonkwo', name: 'Emotional Powerhouse', description: 'Two dramatic forces combine. +4 quality.', qualityBonus: 4 },
  { talent1: 'R.J. Mitchell', talent2: 'James "Jimmy" Chang', name: 'Horror Royalty', description: 'Scream queen meets horror master. +4 quality.', qualityBonus: 4 },
  { talent1: 'Katya Volkov', talent2: 'Cassandra Voss', name: 'Tension & Strategy', description: 'Thriller director + thriller lead. +4 quality.', qualityBonus: 4 },
  { talent1: 'Leo Marchetti', talent2: 'Rafael Santos', name: 'Romance Masters', description: 'Romance director + romance lead. Perfect pairing. +3 quality.', qualityBonus: 3 },
  { talent1: 'Vera Kingsley', talent2: 'Oliver Cross', name: 'Chaos Architects', description: 'Controlled provocation meets method extremism. +3 quality.', qualityBonus: 3 },
  { talent1: 'Sam Oduya', talent2: 'Apex Studios VFX', name: 'Tech Supremacy', description: 'Technical genius + premium VFX. +3 quality.', qualityBonus: 3 },
  { talent1: 'Lumière Lighting', talent2: 'Maria Santos', name: 'Visual Poetry', description: 'Master lighting + master cinematography. +4 quality.', qualityBonus: 4 },
  { talent1: 'R.J. Mitchell', talent2: 'Darkroom Collective', name: 'Practical Nightmares', description: 'Scream queen + horror crew. +3 quality.', qualityBonus: 3 },
  { talent1: 'Nina Okafor', talent2: 'Leo Marchetti', name: 'Tearjerker Duo', description: 'Empath lead + romance director. +3 quality.', qualityBonus: 3 },
  { talent1: 'Velocity Productions', talent2: 'Marcus A. Jones', name: 'Action Machine', description: 'Fast crew + action director. +3 quality.', qualityBonus: 3 },
];

// ─── R82b: NEW SCRIPTS ───

const GLASS_CATHEDRAL_CARDS: CardTemplate[] = [
  { name: 'Stained Light', cardType: 'action', baseQuality: 2, synergyText: '💕 +2 if Actor card played. Beauty in fragility.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'actor') ? { bonus: 2, description: 'Fragile beauty!' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Confession Scene', cardType: 'action', baseQuality: 1, synergyText: '💕 +3 if 2+ Heart tags. Raw honesty.', synergyCondition: (ctx) => (ctx.tagsPlayed['heart'] || 0) >= 2 ? { bonus: 3, description: 'Heart-wrenching!' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Shattered Vow', cardType: 'action', baseQuality: 1, synergyText: '+2 if Director card played.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'director') ? { bonus: 2, description: 'Directed with grace!' } : { bonus: 0 }, riskTag: '🟢' },
  { name: 'Melodrama Trap', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next card is Action. Win +4, Lose -3', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsAction() },
  { name: 'Over-Sentimentality', cardType: 'incident', baseQuality: -4, synergyText: 'Too much crying. Audience checks out.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Failed Climax', cardType: 'incident', baseQuality: -5, synergyText: 'Emotional payoff falls flat.', synergyCondition: noSynergy, riskTag: '🔴' },
];

const VELOCITY_CARDS: CardTemplate[] = [
  { name: 'Opening Chase', cardType: 'action', baseQuality: 2, synergyText: '✨ +3 if draw 1-2. Start fast!', synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 3, description: 'Explosive start!' } : { bonus: 0 }, riskTag: '🟢', tags: ['spectacle', 'momentum'] as CardTag[] },
  { name: 'Gear Shift', cardType: 'action', baseQuality: 1, synergyText: '🔥 +1 per Momentum tag (max +4).', synergyCondition: (ctx) => { const b = Math.min(ctx.tagsPlayed['momentum'] || 0, 4); return b > 0 ? { bonus: b, description: `Momentum x${b}!` } : { bonus: 0 }; }, riskTag: '🟢', tags: ['momentum'] as CardTag[] },
  { name: 'Nitro Burst', cardType: 'action', baseQuality: 1, synergyText: '✨ +3 if Crew card played. Practical effects shine.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'crew') ? { bonus: 3, description: 'Crew delivers!' } : { bonus: 0 }, riskTag: '🟢', tags: ['spectacle'] as CardTag[] },
  { name: 'Blind Corner', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next card is NOT Incident. Win +4, Lose -5', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsNotIncident() },
  { name: 'Tire Blowout', cardType: 'incident', baseQuality: -4, synergyText: 'Stunt gone wrong. Lose $1M.', synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'Stunt accident!' }), riskTag: '🔴' },
  { name: 'CGI Backlash', cardType: 'incident', baseQuality: -5, synergyText: 'Fake-looking effects. Audience groans.', synergyCondition: noSynergy, riskTag: '🔴' },
];

const BONE_GARDEN_CARDS: CardTemplate[] = [
  { name: 'Unearthed Skull', cardType: 'action', baseQuality: 1, synergyText: '🌀 +2 if draw 1-3 (the mystery deepens early).', synergyCondition: (ctx) => ctx.drawNumber <= 3 ? { bonus: 2, description: 'Creepy discovery!' } : { bonus: 0 }, riskTag: '🟢', tags: ['chaos'] as CardTag[] },
  { name: 'Night Dig', cardType: 'action', baseQuality: 1, synergyText: '+3 if Director + Crew cards played.', synergyCondition: (ctx) => { const d = ctx.playedCards.some(c => c.sourceType === 'director'); const cr = ctx.playedCards.some(c => c.sourceType === 'crew'); return (d && cr) ? { bonus: 3, description: 'Atmospheric!' } : { bonus: 0 }; }, riskTag: '🟢' },
  { name: 'Buried Secret', cardType: 'action', baseQuality: 2, synergyText: '+2 if 3+ cards played. Payoff builds.', synergyCondition: (ctx) => ctx.playedCards.length >= 3 ? { bonus: 2, description: 'Secrets revealed!' } : { bonus: 0 }, riskTag: '🟢' },
  { name: 'False Grave', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next has high value. Win +5, Lose -3', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsHighValue() },
  { name: 'Jump Scare Fatigue', cardType: 'incident', baseQuality: -4, synergyText: 'Too many scares. Diminishing returns.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Cursed Prop', cardType: 'incident', baseQuality: -5, synergyText: 'Actor injured by prop. Lose $2M.', synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'Prop malfunction!' }), riskTag: '🔴' },
];

const STARFALL_CARDS: CardTemplate[] = [
  { name: 'Launch Sequence', cardType: 'action', baseQuality: 2, synergyText: '🎯 +2 if Crew card played. Technical precision.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'crew') ? { bonus: 2, description: 'Perfect launch!' } : { bonus: 0 }, riskTag: '🟢', tags: ['precision', 'spectacle'] as CardTag[] },
  { name: 'Zero-G Romance', cardType: 'action', baseQuality: 1, synergyText: '💕 +3 if Actor card played. Weightless chemistry.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'actor') ? { bonus: 3, description: 'Floating chemistry!' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Wormhole Reveal', cardType: 'action', baseQuality: 1, synergyText: '✨ +4 if draw 4+. The big reveal.', synergyCondition: (ctx) => ctx.drawNumber >= 4 ? { bonus: 4, description: 'Mind-blowing!' } : { bonus: 0 }, riskTag: '🟢', tags: ['spectacle'] as CardTag[] },
  { name: 'Science vs Drama', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is from Actor. Win +4, Lose -3', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsFromActor() },
  { name: 'Plot Hole Discovered', cardType: 'incident', baseQuality: -4, synergyText: 'Reddit found a plot hole before release.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'VFX Incomplete', cardType: 'incident', baseQuality: -5, synergyText: 'Unfinished effects in the trailer. Lose $2M.', synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'VFX disaster!' }), riskTag: '🔴' },
];

const BITTER_HONEY_CARDS: CardTemplate[] = [
  { name: 'Meet Cute', cardType: 'action', baseQuality: 2, synergyText: '💕 +3 if draw 1-2. Classic opening.', synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 3, description: 'Adorable!' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Rain Kiss', cardType: 'action', baseQuality: 1, synergyText: '💕 +2 per Heart tag (max +4). Swoon!', synergyCondition: (ctx) => { const b = Math.min((ctx.tagsPlayed['heart'] || 0) * 2, 4); return b > 0 ? { bonus: b, description: 'Swoon!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Airport Dash', cardType: 'action', baseQuality: 1, synergyText: '🔥 +4 if draw 5+. The big romantic gesture.', synergyCondition: (ctx) => ctx.drawNumber >= 5 ? { bonus: 4, description: 'Run to them!' } : { bonus: 0 }, riskTag: '🟢', tags: ['momentum'] as CardTag[] },
  { name: 'Love Triangle', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is Action. Win +4, Lose -4', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsAction() },
  { name: 'Cringe Dialogue', cardType: 'incident', baseQuality: -4, synergyText: '"You complete me" — again?', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Zero Chemistry', cardType: 'incident', baseQuality: -5, synergyText: 'Leads can\'t stand each other. It shows.', synergyCondition: noSynergy, riskTag: '🔴' },
];

const CHROME_SAINTS_CARDS: CardTemplate[] = [
  { name: 'Rev the Engine', cardType: 'action', baseQuality: 1, synergyText: '🔥 +2 if draw 1-2. Momentum starts early.', synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 2, description: 'Engines roaring!' } : { bonus: 0 }, riskTag: '🟢', tags: ['momentum'] as CardTag[] },
  { name: 'Heist Montage', cardType: 'action', baseQuality: 2, synergyText: '✨ +2 if Crew card played. +1 per Spectacle tag (max +2).', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'crew') ? 2 : 0; b += Math.min(ctx.tagsPlayed['spectacle'] || 0, 2); return b > 0 ? { bonus: b, description: 'Slick montage!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['spectacle'] as CardTag[] },
  { name: 'Double Cross', cardType: 'action', baseQuality: 1, synergyText: '+3 if 3+ cards played. Betrayal hits harder late.', synergyCondition: (ctx) => ctx.playedCards.length >= 3 ? { bonus: 3, description: 'Betrayal!' } : { bonus: 0 }, riskTag: '🟢' },
  { name: 'Bluffing Scene', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is NOT Incident. Win +5, Lose -4', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsNotIncident() },
  { name: 'Predictable Heist', cardType: 'incident', baseQuality: -4, synergyText: 'We\'ve seen this before.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Botched Getaway', cardType: 'incident', baseQuality: -5, synergyText: 'Third act falls apart. Lose $1M.', synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'Getaway botched!' }), riskTag: '🔴' },
];

const PAPER_TIGERS_CARDS: CardTemplate[] = [
  { name: 'Opening Monologue', cardType: 'action', baseQuality: 2, synergyText: '+3 if Actor card played. Riveting speech.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'actor') ? { bonus: 3, description: 'Riveting!' } : { bonus: 0 }, riskTag: '🟢' },
  { name: 'Courtroom Clash', cardType: 'action', baseQuality: 1, synergyText: '+2 if 2+ Actor cards. Dueling performances.', synergyCondition: (ctx) => ctx.playedCards.filter(c => c.sourceType === 'actor').length >= 2 ? { bonus: 2, description: 'Objection!' } : { bonus: 0 }, riskTag: '🟢' },
  { name: 'Verdict Scene', cardType: 'action', baseQuality: 1, synergyText: '🎯 +4 if draw 5+. The payoff.', synergyCondition: (ctx) => ctx.drawNumber >= 5 ? { bonus: 4, description: 'Guilty!' } : { bonus: 0 }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
  { name: 'Hung Jury', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next has high value. Win +4, Lose -4', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsHighValue() },
  { name: 'Objection Overruled', cardType: 'incident', baseQuality: -4, synergyText: 'Key argument dismissed.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Witness Recants', cardType: 'incident', baseQuality: -5, synergyText: 'Star witness crumbles. Case falls apart.', synergyCondition: noSynergy, riskTag: '🔴' },
];

const WHISKEY_LULLABY_CARDS: CardTemplate[] = [
  { name: 'Dusty Road', cardType: 'action', baseQuality: 1, synergyText: '💕 +2 if draw 1-2. Set the mood.', synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 2, description: 'Mood set!' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Bar Fight', cardType: 'action', baseQuality: 1, synergyText: '✨ +3 if Actor card played. Gritty action.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'actor') ? { bonus: 3, description: 'Bar brawl!' } : { bonus: 0 }, riskTag: '🟢', tags: ['spectacle'] as CardTag[] },
  { name: 'Quiet Redemption', cardType: 'action', baseQuality: 2, synergyText: '💕 +3 if 2+ Heart tags. Earned moment.', synergyCondition: (ctx) => (ctx.tagsPlayed['heart'] || 0) >= 2 ? { bonus: 3, description: 'Redemption!' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Slow Pacing', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is from Actor. Win +4, Lose -3', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsFromActor() },
  { name: 'Audience Naps', cardType: 'incident', baseQuality: -4, synergyText: 'Too slow. Phones come out.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Cliché Ending', cardType: 'incident', baseQuality: -5, synergyText: 'Seen it a thousand times.', synergyCondition: noSynergy, riskTag: '🔴' },
];

const SIGNAL_LOST_CARDS: CardTemplate[] = [
  { name: 'Static Burst', cardType: 'action', baseQuality: 1, synergyText: '🌀 +2 if draw 1-2. Disorienting opening.', synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 2, description: 'What was that?' } : { bonus: 0 }, riskTag: '🟢', tags: ['chaos'] as CardTag[] },
  { name: 'Found Footage', cardType: 'action', baseQuality: 1, synergyText: '+3 if Crew card played. Authentic feel.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'crew') ? { bonus: 3, description: 'So real!' } : { bonus: 0 }, riskTag: '🟢' },
  { name: 'The Entity', cardType: 'action', baseQuality: 2, synergyText: '+2 if Director card played. Controlled terror.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'director') ? { bonus: 2, description: 'Terrifying!' } : { bonus: 0 }, riskTag: '🟢' },
  { name: 'Camera Malfunction', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is NOT Incident. Win +5, Lose -4', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsNotIncident() },
  { name: 'Boring Monster', cardType: 'incident', baseQuality: -4, synergyText: 'The reveal disappoints.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Motion Sickness', cardType: 'incident', baseQuality: -5, synergyText: 'Shaky cam goes too far. Audience physically ill.', synergyCondition: noSynergy, riskTag: '🔴' },
];

const DEAD_FREQUENCY_CARDS: CardTemplate[] = [
  { name: 'Radio Whisper', cardType: 'action', baseQuality: 1, synergyText: '🌀 +3 if 2+ Chaos tags. Paranormal escalation.', synergyCondition: (ctx) => (ctx.tagsPlayed['chaos'] || 0) >= 2 ? { bonus: 3, description: 'The voices!' } : { bonus: 0 }, riskTag: '🟢', tags: ['chaos'] as CardTag[] },
  { name: 'Séance Scene', cardType: 'action', baseQuality: 2, synergyText: '+2 if Actor card played. Convincing terror.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'actor') ? { bonus: 2, description: 'Spine-tingling!' } : { bonus: 0 }, riskTag: '🟢' },
  { name: 'Possession Climax', cardType: 'action', baseQuality: 1, synergyText: '✨ +4 if draw 4+. The big scare.', synergyCondition: (ctx) => ctx.drawNumber >= 4 ? { bonus: 4, description: 'Possessed!' } : { bonus: 0 }, riskTag: '🟢', tags: ['spectacle'] as CardTag[] },
  { name: 'Fake Ending', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next has high value. Win +5, Lose -4', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsHighValue() },
  { name: 'Silly Ghost', cardType: 'incident', baseQuality: -4, synergyText: 'The ghost looks goofy. Unintentional comedy.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Audience Laughs', cardType: 'incident', baseQuality: -5, synergyText: 'Horror becomes comedy. Not in a good way.', synergyCondition: noSynergy, riskTag: '🔴' },
];

const QUANTUM_HEIST_CARDS: CardTemplate[] = [
  { name: 'Parallel Planning', cardType: 'action', baseQuality: 2, synergyText: '🎯 +2 if Director card played. +1 per Precision tag (max +2).', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0; b += Math.min(ctx.tagsPlayed['precision'] || 0, 2); return b > 0 ? { bonus: b, description: 'Calculated!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
  { name: 'Timeline Split', cardType: 'action', baseQuality: 1, synergyText: '✨ +3 if 3+ cards played. Parallel timelines converge.', synergyCondition: (ctx) => ctx.playedCards.length >= 3 ? { bonus: 3, description: 'Timelines merge!' } : { bonus: 0 }, riskTag: '🟢', tags: ['spectacle'] as CardTag[] },
  { name: 'Quantum Lock', cardType: 'action', baseQuality: 1, synergyText: '+3 if Crew card played. Tech wizardry.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'crew') ? { bonus: 3, description: 'Tech perfection!' } : { bonus: 0 }, riskTag: '🟢' },
  { name: 'Paradox Risk', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is Action. Win +5, Lose -4', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsAction() },
  { name: 'Confusing Plot', cardType: 'incident', baseQuality: -4, synergyText: 'Nobody understands what happened.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Tenet Comparisons', cardType: 'incident', baseQuality: -5, synergyText: '"It\'s just a Tenet ripoff" — every review.', synergyCondition: noSynergy, riskTag: '🔴' },
];

const LAST_LAUGH_CARDS: CardTemplate[] = [
  { name: 'Opening Bit', cardType: 'action', baseQuality: 2, synergyText: '+3 if draw 1-2. Hook them with a joke.', synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 3, description: 'Ha!' } : { bonus: 0 }, riskTag: '🟢' },
  { name: 'Improv Scene', cardType: 'action', baseQuality: 1, synergyText: '🌀 +2 if Actor card played. +1 per Chaos tag (max +2). Unscripted gold.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'actor') ? 2 : 0; b += Math.min(ctx.tagsPlayed['chaos'] || 0, 2); return b > 0 ? { bonus: b, description: 'Improv magic!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['chaos'] as CardTag[] },
  { name: 'Heartfelt Moment', cardType: 'action', baseQuality: 1, synergyText: '💕 +3 if 2+ Heart tags. Comedy with soul.', synergyCondition: (ctx) => (ctx.tagsPlayed['heart'] || 0) >= 2 ? { bonus: 3, description: 'Laughing through tears!' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Joke Falls Flat', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is NOT Incident. Win +4, Lose -4', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsNotIncident() },
  { name: 'Offensive Joke', cardType: 'incident', baseQuality: -4, synergyText: 'Twitter erupts. Bad press.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Lead Breaks Character', cardType: 'incident', baseQuality: -5, synergyText: 'Laughing during takes. Nothing is usable.', synergyCondition: noSynergy, riskTag: '🔴' },
];

const IRON_MERIDIAN_CARDS: CardTemplate[] = [
  { name: 'War Room', cardType: 'action', baseQuality: 2, synergyText: '🎯 +3 if Director card played. Strategic vision.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'director') ? { bonus: 3, description: 'Commander\'s vision!' } : { bonus: 0 }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
  { name: 'Battle Sequence', cardType: 'action', baseQuality: 1, synergyText: '✨ +2 if Crew card played. +1 per Spectacle tag (max +3).', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'crew') ? 2 : 0; b += Math.min(ctx.tagsPlayed['spectacle'] || 0, 3); return b > 0 ? { bonus: b, description: 'Epic battle!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['spectacle'] as CardTag[] },
  { name: 'Fallen Comrade', cardType: 'action', baseQuality: 1, synergyText: '💕 +3 if Actor card played. Emotional sacrifice.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'actor') ? { bonus: 3, description: 'Tears in the trenches!' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Friendly Fire', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next has high value. Win +5, Lose -3', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsHighValue() },
  { name: 'Historical Inaccuracy', cardType: 'incident', baseQuality: -4, synergyText: 'Historians roast you online.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Budget Overrun', cardType: 'incident', baseQuality: -5, synergyText: 'Battle scenes too expensive. Lose $3M.', synergyCondition: () => ({ bonus: 0, budgetMod: -3, description: 'Way over budget!' }), riskTag: '🔴' },
];

const SILK_AND_DAGGERS_CARDS: CardTemplate[] = [
  { name: 'Ballroom Entrance', cardType: 'action', baseQuality: 2, synergyText: '✨ +3 if draw 1-2. Dazzling introduction.', synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 3, description: 'Stunning!' } : { bonus: 0 }, riskTag: '🟢', tags: ['spectacle'] as CardTag[] },
  { name: 'Whispered Threat', cardType: 'action', baseQuality: 1, synergyText: '+3 if 2+ Actor cards. Tension between leads.', synergyCondition: (ctx) => ctx.playedCards.filter(c => c.sourceType === 'actor').length >= 2 ? { bonus: 3, description: 'Dangerous words!' } : { bonus: 0 }, riskTag: '🟢' },
  { name: 'Poison Reveal', cardType: 'action', baseQuality: 1, synergyText: '+4 if draw 4+. The twist lands.', synergyCondition: (ctx) => ctx.drawNumber >= 4 ? { bonus: 4, description: 'Poisoned!' } : { bonus: 0 }, riskTag: '🟢' },
  { name: 'Wrong Suspect', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is from Actor. Win +4, Lose -3', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsFromActor() },
  { name: 'Pacing Drags', cardType: 'incident', baseQuality: -4, synergyText: 'Period pieces can be slow. This one is.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Accent Disaster', cardType: 'incident', baseQuality: -5, synergyText: 'Lead\'s accent is unintentionally hilarious.', synergyCondition: noSynergy, riskTag: '🔴' },
];

ALL_SCRIPTS.push(
  { title: 'Glass Cathedral', genre: 'Drama', baseScore: 8, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 5, cards: GLASS_CATHEDRAL_CARDS, ability: 'heartEngine', abilityDesc: 'Heart Engine: Each Heart tag adds +1 quality. 6+ Heart = additional ×1.2 multiplier!' },
  { title: 'Velocity', genre: 'Action', baseScore: 6, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 3, cards: VELOCITY_CARDS, ability: 'blockbusterBonus', abilityDesc: 'Blockbuster: Market multiplier +0.3. Each Spectacle tag adds +0.05 more.' },
  { title: 'Bone Garden', genre: 'Horror', baseScore: 7, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 3, cards: BONE_GARDEN_CARDS, ability: 'finalGirl', abilityDesc: 'Final Girl: If you wrap after exactly 5 draws, +5 bonus. Chaos tags count as +1 quality each.' },
  { title: 'Starfall', genre: 'Sci-Fi', baseScore: 8, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 5, cards: STARFALL_CARDS, ability: 'prestige', abilityDesc: 'Diversity Bonus: Cards from diverse sources get extra value' },
  { title: 'Bitter Honey', genre: 'Romance', baseScore: 5, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 2, cards: BITTER_HONEY_CARDS, ability: 'heartEngine', abilityDesc: 'Heart Engine: Each Heart tag adds +1 quality. 6+ Heart = additional ×1.2 multiplier!' },
  { title: 'Chrome Saints', genre: 'Thriller', baseScore: 7, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 4, cards: CHROME_SAINTS_CARDS, ability: 'slowBurn', abilityDesc: 'Slow Burn: Quality bonus grows each draw (+1, +2, +3...). Wrapping early costs double.' },
  { title: 'Paper Tigers', genre: 'Drama', baseScore: 7, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 4, cards: PAPER_TIGERS_CARDS, ability: 'precisionCraft', abilityDesc: 'Precision Craft: Each Precision tag adds +1 quality. Clean wrap bonus doubled.' },
  { title: 'Whiskey Lullaby', genre: 'Drama', baseScore: 6, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 3, cards: WHISKEY_LULLABY_CARDS, ability: 'slowBurn', abilityDesc: 'Slow Burn: Quality bonus grows each draw (+1, +2, +3...). Wrapping early costs double.' },
  { title: 'Signal Lost', genre: 'Horror', baseScore: 6, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 2, cards: SIGNAL_LOST_CARDS, ability: 'survivalMode', abilityDesc: 'Survival Mode: Each draw you survive without busting adds +2. High risk, high reward.' },
  { title: 'Dead Frequency', genre: 'Horror', baseScore: 7, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 3, cards: DEAD_FREQUENCY_CARDS, ability: 'finalGirl', abilityDesc: 'Final Girl: If you wrap after exactly 5 draws, +5 bonus. Chaos tags count as +1 quality each.' },
  { title: 'Quantum Heist', genre: 'Sci-Fi', baseScore: 8, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 5, cards: QUANTUM_HEIST_CARDS, ability: 'precisionCraft', abilityDesc: 'Precision Craft: Each Precision tag adds +1 quality. Clean wrap bonus doubled.' },
  { title: 'Last Laugh', genre: 'Comedy', baseScore: 5, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 2, cards: LAST_LAUGH_CARDS, ability: 'crowdPleaser', abilityDesc: 'Crowd Pleaser: For every 3 consecutive Action cards, +2 bonus' },
  { title: 'Iron Meridian', genre: 'Action', baseScore: 7, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 4, cards: IRON_MERIDIAN_CARDS, ability: 'blockbusterBonus', abilityDesc: 'Blockbuster: Market multiplier +0.3. Each Spectacle tag adds +0.05 more.' },
  { title: 'Silk & Daggers', genre: 'Thriller', baseScore: 7, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 4, cards: SILK_AND_DAGGERS_CARDS, ability: 'slowBurn', abilityDesc: 'Slow Burn: Quality bonus grows each draw (+1, +2, +3...). Wrapping early costs double.' },
  { title: 'Neon Serenade', genre: 'Romance', baseScore: 6, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 3, cards: BITTER_HONEY_CARDS, ability: 'heartEngine', abilityDesc: 'Heart Engine: Each Heart tag adds +1 quality. 6+ Heart = additional ×1.2 multiplier!' },
);

// ─── R82b: NEW TALENT ───

const AURORA_JAMES: Omit<Talent, 'id'> = {
  name: 'Aurora James',
  type: 'Lead',
  skill: 4,
  heat: 2,
  cost: 12,
  genreBonus: { genre: 'Sci-Fi', bonus: 2 },
  trait: 'Method Futurist',
  traitDesc: '🎯 PRECISION: Lived on a space station set for 3 months. Commits fully.',
  cards: [
    { name: 'Gravity Well', cardType: 'action', baseQuality: 2, synergyText: '🎯 +2 if Director card played. +1 per Precision tag (max +3).', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0; b += Math.min(ctx.tagsPlayed['precision'] || 0, 3); return b > 0 ? { bonus: b, description: 'Deep in character!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
    { name: 'Emotional Core', cardType: 'action', baseQuality: 1, synergyText: '💕 +3 if 2+ Heart tags. Sci-fi with soul.', synergyCondition: (ctx) => (ctx.tagsPlayed['heart'] || 0) >= 2 ? { bonus: 3, description: 'Heart of the film!' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
    { name: 'Technical Burnout', cardType: 'incident', baseQuality: -4, synergyText: 'Method acting too intense. Needs a break.', synergyCondition: noSynergy, riskTag: '🔴' },
  ],
};

const THEO_BANKS: Omit<Talent, 'id'> = {
  name: 'Theo Banks',
  type: 'Lead',
  skill: 3,
  heat: 1,
  cost: 8,
  genreBonus: { genre: 'Comedy', bonus: 2 },
  trait: 'Natural Comedian',
  traitDesc: '🌀 CHAOS: Improvises everything. Sometimes brilliantly, sometimes not.',
  cards: [
    { name: 'Improv Gold', cardType: 'action', baseQuality: 1, synergyText: '🌀 +3 if Actor card played. +1 per Chaos tag (max +2).', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'actor') ? 3 : 0; b += Math.min(ctx.tagsPlayed['chaos'] || 0, 2); return b > 0 ? { bonus: b, description: 'Comedy gold!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['chaos'] as CardTag[] },
    { name: 'Physical Gag', cardType: 'action', baseQuality: 2, synergyText: '✨ +2 if draw 3+. Slapstick lands.', synergyCondition: (ctx) => ctx.drawNumber >= 3 ? { bonus: 2, description: 'Slapstick!' } : { bonus: 0 }, riskTag: '🟢', tags: ['spectacle'] as CardTag[] },
    { name: 'Goes Too Far', cardType: 'incident', baseQuality: -4, synergyText: 'Improv crosses a line. Awkward set.', synergyCondition: noSynergy, riskTag: '🔴' },
  ],
};

const ELENA_VOSS: Omit<Talent, 'id'> = {
  name: 'Elena Voss',
  type: 'Support',
  skill: 4,
  heat: 1,
  cost: 9,
  genreBonus: { genre: 'Thriller', bonus: 2 },
  trait: 'Scene Stealer',
  traitDesc: '✨ SPECTACLE: Every scene she\'s in becomes the scene everyone remembers.',
  cards: [
    { name: 'Unforgettable Entrance', cardType: 'action', baseQuality: 2, synergyText: '✨ +3 if draw 1-2. Steal the opening.', synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 3, description: 'Who IS she?!' } : { bonus: 0 }, riskTag: '🟢', tags: ['spectacle'] as CardTag[] },
    { name: 'Quiet Menace', cardType: 'action', baseQuality: 1, synergyText: '+2 if Director card played. Subtle and terrifying.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'director') ? { bonus: 2, description: 'Chilling!' } : { bonus: 0 }, riskTag: '🟢' },
    { name: 'Upstages Lead', cardType: 'incident', baseQuality: -3, synergyText: 'Lead actor complains. Tension on set.', synergyCondition: noSynergy, riskTag: '🔴' },
  ],
};

const KAI_DELGADO: Omit<Talent, 'id'> = {
  name: 'Kai Delgado',
  type: 'Support',
  skill: 3,
  heat: 0,
  cost: 6,
  genreBonus: { genre: 'Action', bonus: 2 },
  trait: 'Stunt Double Origins',
  traitDesc: '🔥 MOMENTUM: Former stunt performer. Does their own stunts. Always.',
  cards: [
    { name: 'Practical Stunt', cardType: 'action', baseQuality: 1, synergyText: '🔥 +2 if Crew card played. +1 per Momentum tag (max +3).', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'crew') ? 2 : 0; b += Math.min(ctx.tagsPlayed['momentum'] || 0, 3); return b > 0 ? { bonus: b, description: 'Real stunts!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['momentum'] as CardTag[] },
    { name: 'Rooftop Chase', cardType: 'action', baseQuality: 2, synergyText: '✨ +3 if draw 3+. Action builds.', synergyCondition: (ctx) => ctx.drawNumber >= 3 ? { bonus: 3, description: 'Incredible chase!' } : { bonus: 0 }, riskTag: '🟢', tags: ['spectacle', 'momentum'] as CardTag[] },
    { name: 'Hospital Visit', cardType: 'incident', baseQuality: -5, synergyText: 'Stunt went wrong. Lose $2M. Production halts.', synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'Kai\'s in the hospital!' }), riskTag: '🔴' },
  ],
};

const MIRIAM_STONE: Omit<Talent, 'id'> = {
  name: 'Miriam Stone',
  type: 'Director',
  skill: 5,
  heat: 2,
  cost: 16,
  genreBonus: { genre: 'Drama', bonus: 3 },
  trait: 'Three-Time Oscar Winner',
  traitDesc: '🎯💕 PRECISION + HEART: Demands perfection. Gets it. Films always resonate.',
  cards: [
    { name: 'Actors\' Director', cardType: 'action', baseQuality: 2, synergyText: '💕 +2 per Actor card played (max +4). She elevates everyone.', synergyCondition: (ctx) => { const b = Math.min(ctx.playedCards.filter(c => c.sourceType === 'actor').length * 2, 4); return b > 0 ? { bonus: b, description: 'Oscar-worthy!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['precision', 'heart'] as CardTag[] },
    { name: 'Emotional Precision', cardType: 'action', baseQuality: 1, synergyText: '🎯 +2 if 0 Incidents. +1 per Precision tag (max +2). Clean and moving.', synergyCondition: (ctx) => { let b = ctx.incidentCount === 0 ? 2 : 0; b += Math.min(ctx.tagsPlayed['precision'] || 0, 2); return b > 0 ? { bonus: b, description: 'Flawless direction!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
    { name: 'Perfectionist Meltdown', cardType: 'incident', baseQuality: -4, synergyText: '47 takes of one scene. Everyone is exhausted. Lose $1M.', synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: '47 takes!' }), riskTag: '🔴' },
  ],
};

const JAXON_REED: Omit<Talent, 'id'> = {
  name: 'Jaxon Reed',
  type: 'Director',
  skill: 3,
  heat: 3,
  cost: 10,
  genreBonus: { genre: 'Horror', bonus: 3 },
  trait: 'Shock Auteur',
  traitDesc: '🌀✨ CHAOS + SPECTACLE: Controversial. Visceral. Every film sparks debate.',
  cards: [
    { name: 'Visceral Opening', cardType: 'action', baseQuality: 1, synergyText: '🌀 +4 if draw 1. +2 if draw 2. Shock the audience immediately.', synergyCondition: (ctx) => ctx.drawNumber === 1 ? { bonus: 4, description: 'SHOCKING opener!' } : ctx.drawNumber === 2 ? { bonus: 2, description: 'Disturbing...' } : { bonus: 0 }, riskTag: '🟢', tags: ['chaos', 'spectacle'] as CardTag[] },
    { name: 'Practical Gore', cardType: 'action', baseQuality: 2, synergyText: '✨ +2 if Crew card played. Real effects > CGI.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'crew') ? { bonus: 2, description: 'Disgustingly real!' } : { bonus: 0 }, riskTag: '🟢', tags: ['spectacle'] as CardTag[] },
    { name: 'Walkouts', cardType: 'incident', baseQuality: -5, synergyText: 'Audience members leave. Controversy is a double-edged sword.', synergyCondition: noSynergy, riskTag: '🔴' },
  ],
};

const PIXEL_PERFECT_VFX: Omit<Talent, 'id'> = {
  name: 'Pixel Perfect VFX',
  type: 'Crew',
  skill: 4,
  heat: 0,
  cost: 11,
  trait: 'Digital Wizards',
  traitDesc: '✨🎯 SPECTACLE + PRECISION: Cutting-edge VFX house. Everything looks incredible.',
  cards: [
    { name: 'CGI Spectacle', cardType: 'action', baseQuality: 2, synergyText: '✨ +2 if Director card played. +1 per Spectacle tag (max +3).', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0; b += Math.min(ctx.tagsPlayed['spectacle'] || 0, 3); return b > 0 ? { bonus: b, description: 'Jaw-dropping VFX!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['spectacle', 'precision'] as CardTag[] },
    { name: 'Seamless Integration', cardType: 'action', baseQuality: 1, synergyText: '🎯 +3 if 0 Incidents. Clean pipeline.', synergyCondition: (ctx) => ctx.incidentCount === 0 ? { bonus: 3, description: 'Invisible effects!' } : { bonus: 0 }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
    { name: 'Render Farm Crash', cardType: 'incident', baseQuality: -4, synergyText: 'Servers down. Lose $2M in delays.', synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'Render farm down!' }), riskTag: '🔴' },
  ],
};

const GUERRILLA_SOUND: Omit<Talent, 'id'> = {
  name: 'Guerrilla Sound',
  type: 'Crew',
  skill: 3,
  heat: 0,
  cost: 7,
  trait: 'Location Audio Legends',
  traitDesc: '🔥🌀 MOMENTUM + CHAOS: Record anywhere. Ambient sound is their specialty.',
  cards: [
    { name: 'Ambient Masterpiece', cardType: 'action', baseQuality: 1, synergyText: '🔥 +2 if 2+ Momentum tags. +1 per Chaos tag (max +2). Raw sound.', synergyCondition: (ctx) => { let b = (ctx.tagsPlayed['momentum'] || 0) >= 2 ? 2 : 0; b += Math.min(ctx.tagsPlayed['chaos'] || 0, 2); return b > 0 ? { bonus: b, description: 'Incredible sound!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['momentum', 'chaos'] as CardTag[] },
    { name: 'Field Recording', cardType: 'action', baseQuality: 2, synergyText: '+2 if Director card played. Authentic atmosphere.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'director') ? { bonus: 2, description: 'Perfect ambience!' } : { bonus: 0 }, riskTag: '🟢' },
    { name: 'Audio Bleed', cardType: 'incident', baseQuality: -4, synergyText: 'Background noise ruins a key take.', synergyCondition: noSynergy, riskTag: '🔴' },
  ],
};

const TESSA_KWON: Omit<Talent, 'id'> = {
  name: 'Tessa Kwon',
  type: 'Lead',
  skill: 5,
  heat: 3,
  cost: 15,
  genreBonus: { genre: 'Thriller', bonus: 2 },
  trait: 'Cold Precision',
  traitDesc: '🎯 PRECISION: Never wastes a take. Every gesture is calculated. Intimidates co-stars.',
  cards: [
    { name: 'Calculated Performance', cardType: 'action', baseQuality: 2, synergyText: '🎯 +2 per Precision tag (max +4). Surgical acting.', synergyCondition: (ctx) => { const b = Math.min((ctx.tagsPlayed['precision'] || 0) * 2, 4); return b > 0 ? { bonus: b, description: 'Every beat lands!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
    { name: 'Interrogation Masterclass', cardType: 'action', baseQuality: 1, synergyText: '+3 if Director card played. Perfectly directed intensity.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'director') ? { bonus: 3, description: 'Intense!' } : { bonus: 0 }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
    { name: 'Intimidates Cast', cardType: 'incident', baseQuality: -3, synergyText: 'Co-stars are afraid. Chemistry suffers.', synergyCondition: noSynergy, riskTag: '🔴' },
  ],
};

const OMAR_HASSAN: Omit<Talent, 'id'> = {
  name: 'Omar Hassan',
  type: 'Support',
  skill: 3,
  heat: 0,
  cost: 7,
  genreBonus: { genre: 'Drama', bonus: 2 },
  trait: 'Quiet Authority',
  traitDesc: '💕 HEART: Few words, massive presence. Every line lands.',
  cards: [
    { name: 'One-Line Wonder', cardType: 'action', baseQuality: 2, synergyText: '💕 +3 if Actor card played. Scene-defining delivery.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'actor') ? { bonus: 3, description: 'One line. Goosebumps.' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
    { name: 'Silent Presence', cardType: 'action', baseQuality: 1, synergyText: '💕 +2 if 2+ Heart tags. Says nothing. Steals the scene.', synergyCondition: (ctx) => (ctx.tagsPlayed['heart'] || 0) >= 2 ? { bonus: 2, description: 'Powerful silence!' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
    { name: 'Too Quiet', cardType: 'incident', baseQuality: -3, synergyText: 'Audience forgets he\'s in the movie.', synergyCondition: noSynergy, riskTag: '🔴' },
  ],
};

// Add R82b talent to pools
ALL_LEADS.push(AURORA_JAMES, THEO_BANKS, TESSA_KWON);
ALL_SUPPORTS.push(ELENA_VOSS, KAI_DELGADO, OMAR_HASSAN);
ALL_DIRECTORS.push(MIRIAM_STONE, JAXON_REED);
ALL_CREW.push(PIXEL_PERFECT_VFX, GUERRILLA_SOUND);

// ─── R82b: NEW CHEMISTRY ───

ALL_CHEMISTRY.push(
  { talent1: 'Aurora James', talent2: 'Miriam Stone', name: 'Precision Perfection', description: 'Method futurist + Oscar auteur. +4 quality.', qualityBonus: 4 },
  { talent1: 'Theo Banks', talent2: 'Benny Romano', name: 'Comedy Kings', description: 'Two comedians feeding off each other. +3 quality.', qualityBonus: 3 },
  { talent1: 'Tessa Kwon', talent2: 'Katya Volkov', name: 'Ice Queens', description: 'Cold precision meets cold thriller. +4 quality.', qualityBonus: 4 },
  { talent1: 'Elena Voss', talent2: 'Jaxon Reed', name: 'Shock & Awe', description: 'Scene stealer + shock auteur. Unforgettable. +3 quality.', qualityBonus: 3 },
  { talent1: 'Kai Delgado', talent2: 'Jack Navarro', name: 'Stunt Brothers', description: 'Two stunt performers. Action scenes become legendary. +3 quality.', qualityBonus: 3 },
  { talent1: 'Omar Hassan', talent2: 'Darius Knox', name: 'Silent & Loud', description: 'Quiet authority meets character chameleon. +3 quality.', qualityBonus: 3 },
  { talent1: 'Pixel Perfect VFX', talent2: 'Apex Studios VFX', name: 'VFX Arms Race', description: 'Two VFX houses competing on the same film. +4 quality but costs $2M extra.', qualityBonus: 4 },
  { talent1: 'Guerrilla Sound', talent2: 'The Nomads', name: 'Field Warriors', description: 'Location audio + location crew. Authentic filmmaking. +3 quality.', qualityBonus: 3 },
  { talent1: 'Tessa Kwon', talent2: 'Elena Voss', name: 'Cold & Hot', description: 'Calculated lead + scene-stealing support. Electric tension. +4 quality.', qualityBonus: 4 },
  { talent1: 'Aurora James', talent2: 'Sam Oduya', name: 'Sci-Fi Synergy', description: 'Futurist actor + tech genius. +3 quality.', qualityBonus: 3 },
);

export function getActiveChemistry(castNames: string[]): Chemistry[] {
  return ALL_CHEMISTRY.filter(c =>
    castNames.includes(c.talent1) && castNames.includes(c.talent2)
  );
}

// ─── R102: LEGENDARY SCRIPTS (Prestige 4+) ───

const OPUS_MAGNUM_CARDS: CardTemplate[] = [
  { name: 'Symphonic Structure', cardType: 'action', baseQuality: 2, synergyText: '🎯💕✨ +1 per UNIQUE tag type played (max +5). A three-act masterpiece.', synergyCondition: (ctx) => { const u = Object.keys(ctx.tagsPlayed).length; return u > 0 ? { bonus: Math.min(u, 5), description: `${u} tag types = symphonic!` } : { bonus: 0 }; }, riskTag: '🟢', tags: ['precision', 'heart', 'spectacle'] as CardTag[] },
  { name: 'The Third Act', cardType: 'action', baseQuality: 2, synergyText: '+4 if draw 5+. +2 if Director card played. The masterpiece reveals itself.', synergyCondition: (ctx) => { let b = ctx.drawNumber >= 5 ? 4 : 0; if (ctx.playedCards.some(c => c.sourceType === 'director')) b += 2; return b > 0 ? { bonus: b, description: 'The third act lands!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['precision', 'heart'] as CardTag[] },
  { name: 'Grand Ambition', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next card has high value. Win +6, Lose -4. Worthy of the opus.', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: { ...betNextIsHighValue(), successBonus: 6, failPenalty: -4 }, tags: ['spectacle'] as CardTag[] },
  { name: 'Scope Creep', cardType: 'incident', baseQuality: -5, synergyText: 'The vision grew too large. Lose $2M. But adds all three tag types.', synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'Ambition has a price!' }), riskTag: '🔴', tags: ['precision', 'heart', 'spectacle'] as CardTag[] },
];

const FRANCHISE_CARDS: CardTemplate[] = [
  { name: 'Franchise Hook', cardType: 'action', baseQuality: 2, synergyText: '✨🔥 +2 per Spectacle tag + 1 per Momentum tag (max +7). Set up the universe.', synergyCondition: (ctx) => { const b = Math.min((ctx.tagsPlayed['spectacle'] || 0) * 2 + (ctx.tagsPlayed['momentum'] || 0), 7); return b > 0 ? { bonus: b, description: 'Franchise potential!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['spectacle', 'momentum'] as CardTag[] },
  { name: 'Universe Building', cardType: 'action', baseQuality: 2, synergyText: '+3 if Crew card played. +2 if 4+ cards played. World-building at scale.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'crew') ? 3 : 0; if (ctx.playedCards.length >= 4) b += 2; return b > 0 ? { bonus: b, description: 'The universe expands!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['spectacle'] as CardTag[] },
  { name: 'Sequel Tease', cardType: 'action', baseQuality: 1, synergyText: '+5 if quality ≥ 20. Post-credits scene that breaks the internet.', synergyCondition: (ctx) => ctx.totalQuality >= 20 ? { bonus: 5, description: 'POST-CREDITS SCENE!' } : { bonus: 0 }, riskTag: '🟢', tags: ['momentum', 'spectacle'] as CardTag[] },
  { name: 'Franchise Fatigue', cardType: 'incident', baseQuality: -6, synergyText: 'Audience burned out. Lose $3M. Spectacle tags soften the blow.', synergyCondition: (ctx) => (ctx.tagsPlayed['spectacle'] || 0) >= 3 ? { bonus: 2, budgetMod: -3, description: 'VFX saved it somewhat.' } : { bonus: 0, budgetMod: -3, description: 'Franchise fatigue!' }, riskTag: '🔴', tags: ['spectacle'] as CardTag[] },
];

const MIDNIGHT_MASTERPIECE_CARDS: CardTemplate[] = [
  { name: 'Creeping Dread', cardType: 'action', baseQuality: 1, synergyText: '💀 +3 per Incident played (max +9). Each disaster makes it scarier.', synergyCondition: (ctx) => { const b = Math.min(ctx.incidentCount * 3, 9); return b > 0 ? { bonus: b, description: `${ctx.incidentCount} incidents = pure terror!` } : { bonus: 0 }; }, riskTag: '🟢', tags: ['chaos'] as CardTag[] },
  { name: 'The Twist', cardType: 'action', baseQuality: 2, synergyText: '💀 +4 if quality is currently negative. The darkness IS the point.', synergyCondition: (ctx) => ctx.totalQuality < 0 ? { bonus: 4, description: 'From darkness, brilliance!' } : { bonus: 0 }, riskTag: '🟢', tags: ['chaos', 'heart'] as CardTag[] },
  { name: 'Jump Scare', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next card is an Incident. Win +8, Lose -2. Lean into the chaos!', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: { description: 'Bet the next card IS an Incident', successBonus: 8, failPenalty: -2, condition: (ctx) => ctx.remainingDeck.length > 0 && ctx.remainingDeck[0].cardType === 'incident', oddsHint: (ctx) => { const r = ctx.remainingDeck; const n = r.filter(c => c.cardType === 'incident').length; return `${n} of ${r.length} are Incidents (${r.length > 0 ? Math.round(n/r.length*100) : 0}%)`; } }, tags: ['chaos'] as CardTag[] },
  { name: 'Cursed Production', cardType: 'incident', baseQuality: -3, synergyText: '💀 Only -3 (soft for an incident). Adds 2 Chaos tags. The curse feeds the art.', synergyCondition: noSynergy, riskTag: '🔴', tags: ['chaos', 'chaos'] as CardTag[] },
  { name: 'Real Haunting', cardType: 'incident', baseQuality: -4, synergyText: '💀 Something happened on set. Lose $1M. But +3 quality if 3+ Chaos tags.', synergyCondition: (ctx) => (ctx.tagsPlayed['chaos'] || 0) >= 3 ? { bonus: 3, budgetMod: -1, description: 'The haunting IS the film!' } : { bonus: 0, budgetMod: -1, description: 'Unexplained events...' }, riskTag: '🔴', tags: ['chaos'] as CardTag[] },
];

export const LEGENDARY_SCRIPTS: Omit<Script, 'id'>[] = [
  {
    title: 'Opus Magnum',
    genre: 'Drama',
    baseScore: 12,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 20,
    cards: OPUS_MAGNUM_CARDS,
    ability: 'opusMagnum',
    abilityDesc: 'Opus Magnum: 3 keyword tags (Precision + Heart + Spectacle). Each unique tag type in production adds +2 quality.',
    legendary: true,
    keywordTags: ['precision', 'heart', 'spectacle'],
  },
  {
    title: 'The Franchise',
    genre: 'Action',
    baseScore: 10,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 22,
    cards: FRANCHISE_CARDS,
    ability: 'franchise',
    abilityDesc: 'Franchise: If this hits BLOCKBUSTER+, you get a free sequel script next season with +5 base quality!',
    legendary: true,
    keywordTags: ['spectacle', 'momentum'],
  },
  {
    title: 'Midnight Masterpiece',
    genre: 'Horror',
    baseScore: 9,
    slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'],
    cost: 18,
    cards: MIDNIGHT_MASTERPIECE_CARDS,
    ability: 'midnightMasterpiece',
    abilityDesc: 'Midnight Masterpiece: Incidents add +3 quality instead of hurting. Chaos IS the art.',
    legendary: true,
    keywordTags: ['chaos'],
  },
];

// ─── R102: ELITE TALENT (Prestige 4+) ───

const DIVINE_DIRECTOR: Omit<Talent, 'id'> = {
  name: 'Isabella Divine',
  type: 'Director',
  skill: 9,
  heat: 2,
  cost: 16,
  filmsLeft: 2,
  trait: 'The Oracle',
  traitDesc: '👑 ELITE: +2 quality to ALL films for the rest of the run (not just hers). Legendary vision.',
  elite: true,
  elitePassive: '+2 quality to ALL films for the rest of the run',
  elitePassiveEffect: 'globalQualityBoost',
  cards: [
    { name: 'Divine Vision', cardType: 'action', baseQuality: 3, synergyText: '👑 Multiply total quality by ×1.3. If 4+ unique tags: ×1.5!', synergyCondition: (ctx) => { const u = Object.keys(ctx.tagsPlayed).length; const mult = u >= 4 ? 1.5 : 1.3; return { bonus: 0, multiply: mult, description: `Divine Vision ×${mult}!` }; }, riskTag: '🟢', tags: ['precision', 'spectacle'] as CardTag[] },
    { name: 'Oracle\'s Insight', cardType: 'action', baseQuality: 2, synergyText: '🎯 +3 if 0 Incidents. +2 per Precision tag (max +4). Perfect foresight.', synergyCondition: (ctx) => { let b = ctx.incidentCount === 0 ? 3 : 0; b += Math.min((ctx.tagsPlayed['precision'] || 0) * 2, 4); return b > 0 ? { bonus: b, description: 'She saw it all coming!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
    { name: 'Impossible Standard', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next card has high value. Win +7, Lose -5.', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: { ...betNextIsHighValue(), successBonus: 7, failPenalty: -5 }, tags: ['precision'] as CardTag[] },
    { name: 'Creative Burnout', cardType: 'incident', baseQuality: -5, synergyText: 'Even legends burn out. Forces extra draw.', synergyCondition: () => ({ bonus: 0, description: 'Isabella demands perfection!' }), riskTag: '🔴', special: 'forceExtraDraw' },
  ],
};

const DOUBLE_CHEMISTRY_LEAD: Omit<Talent, 'id'> = {
  name: 'Sebastian Montague',
  type: 'Lead',
  skill: 8,
  heat: 3,
  cost: 15,
  filmsLeft: 3,
  genreBonus: { genre: 'Romance', bonus: 3 },
  trait: 'The Heartthrob',
  traitDesc: '👑 ELITE: Chemistry bonuses are DOUBLED when he\'s in the cast. Irresistible screen presence.',
  elite: true,
  elitePassive: 'Chemistry bonuses doubled',
  elitePassiveEffect: 'doubleChemistry',
  cards: [
    { name: 'Magnetic Presence', cardType: 'action', baseQuality: 2, synergyText: '💕 +2 per Actor card played (max +6). +2 per Heart tag (max +4). Everyone shines around him.', synergyCondition: (ctx) => { let b = Math.min(ctx.playedCards.filter(c => c.sourceType === 'actor').length * 2, 6); b += Math.min((ctx.tagsPlayed['heart'] || 0) * 2, 4); return b > 0 ? { bonus: b, description: 'Magnetic chemistry!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
    { name: 'Leading Man Moment', cardType: 'action', baseQuality: 2, synergyText: '💕✨ +3 if Director card played. +3 if 4+ Heart tags. The audience melts.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'director') ? 3 : 0; if ((ctx.tagsPlayed['heart'] || 0) >= 4) b += 3; return b > 0 ? { bonus: b, description: 'Audience swoons!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['heart', 'spectacle'] as CardTag[] },
    { name: 'Romantic Gambit', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next card is from an Actor. Win +6, Lose -3.', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: { ...betNextIsFromActor(), successBonus: 6, failPenalty: -3 }, tags: ['heart'] as CardTag[] },
    { name: 'Tabloid Heartbreak', cardType: 'incident', baseQuality: -5, synergyText: 'Romance off-screen went wrong. Lose $2M. But Heart tags persist.', synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'Tabloid heartbreak!' }), riskTag: '🔴', tags: ['heart'] as CardTag[] },
    { name: 'Ego Clash', cardType: 'incident', baseQuality: -4, synergyText: 'Too many stars. Poisons next card.', synergyCondition: noSynergy, riskTag: '🔴', special: 'poisonNext' },
  ],
};

const AUTEUR_CREW: Omit<Talent, 'id'> = {
  name: 'The Auteur Collective',
  type: 'Crew',
  skill: 8,
  heat: 1,
  cost: 14,
  trait: 'Tag Alchemists',
  traitDesc: '👑 ELITE: Replaces one random keyword tag on the script with a guaranteed-synergy tag matching your cast.',
  elite: true,
  elitePassive: 'Replaces one script keyword tag with a synergy-matching tag',
  elitePassiveEffect: 'tagAlchemy',
  cards: [
    { name: 'Synergy Engineering', cardType: 'action', baseQuality: 2, synergyText: '🎯 +2 per unique tag type in production (max +8). Tag specialists.', synergyCondition: (ctx) => { const u = Object.keys(ctx.tagsPlayed).length; return u > 0 ? { bonus: Math.min(u * 2, 8), description: `${u} tag types = alchemy!` } : { bonus: 0 }; }, riskTag: '🟢', tags: ['precision', 'spectacle'] as CardTag[] },
    { name: 'Perfect Setup', cardType: 'action', baseQuality: 2, synergyText: '+3 if Actor card played. +2 if Crew card played. Technical perfection.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'actor') ? 3 : 0; if (ctx.playedCards.some(c => c.sourceType === 'crew')) b += 2; return b > 0 ? { bonus: b, description: 'Perfect technical setup!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
    { name: 'Creative Overhaul', cardType: 'action', baseQuality: 1, synergyText: 'Remove 1 Incident from deck. +2 if 3+ Precision tags. Clean production.', synergyCondition: (ctx) => (ctx.tagsPlayed['precision'] || 0) >= 3 ? { bonus: 2, description: 'Precision overhaul!' } : { bonus: 0 }, riskTag: '🟢', special: 'removeRed', tags: ['precision'] as CardTag[] },
    { name: 'Over-Engineering', cardType: 'incident', baseQuality: -4, synergyText: 'Too clever. Lose $2M in rewrites.', synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'Over-engineered!' }), riskTag: '🔴' },
  ],
};

const GLOBAL_BUFF_SUPPORT: Omit<Talent, 'id'> = {
  name: 'Zara Osei-Mensah',
  type: 'Support',
  skill: 8,
  heat: 1,
  cost: 12,
  genreBonus: { genre: 'Drama', bonus: 2 },
  trait: 'The Muse',
  traitDesc: '👑 ELITE: Inspires everyone. +1 Skill to ALL other talent in your roster for the rest of the run.',
  elite: true,
  elitePassive: '+1 Skill to all other roster talent',
  elitePassiveEffect: 'rosterSkillBoost',
  cards: [
    { name: 'Inspirational Presence', cardType: 'action', baseQuality: 2, synergyText: '💕 +1 per other Actor card played (max +4). +2 per Heart tag (max +4). She lifts everyone.', synergyCondition: (ctx) => { let b = Math.min(ctx.playedCards.filter(c => c.sourceType === 'actor').length, 4); b += Math.min((ctx.tagsPlayed['heart'] || 0) * 2, 4); return b > 0 ? { bonus: b, description: 'Everyone plays better around her!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
    { name: 'Ensemble Elevation', cardType: 'action', baseQuality: 2, synergyText: '+2 per unique source type played (max +6). The whole team rises.', synergyCondition: (ctx) => { const t = new Set(ctx.playedCards.map(c => c.sourceType)); return t.size > 0 ? { bonus: Math.min(t.size * 2, 6), description: `${t.size} source types elevated!` } : { bonus: 0 }; }, riskTag: '🟢', tags: ['heart', 'precision'] as CardTag[] },
    { name: 'Muse\'s Touch', cardType: 'action', baseQuality: 1, synergyText: 'Next card drawn gets +3. The muse blesses the next take.', synergyCondition: () => ({ bonus: 0, description: 'Blessing the next draw!' }), riskTag: '🟢', special: 'buffNext', tags: ['heart'] as CardTag[] },
    { name: 'Muse Exhaustion', cardType: 'incident', baseQuality: -4, synergyText: 'Even muses tire. But adds Heart tag.', synergyCondition: noSynergy, riskTag: '🔴', tags: ['heart'] as CardTag[] },
  ],
};

export const ELITE_LEADS: Omit<Talent, 'id'>[] = [DOUBLE_CHEMISTRY_LEAD];
export const ELITE_SUPPORTS: Omit<Talent, 'id'>[] = [GLOBAL_BUFF_SUPPORT];
export const ELITE_DIRECTORS: Omit<Talent, 'id'>[] = [DIVINE_DIRECTOR];
export const ELITE_CREW: Omit<Talent, 'id'>[] = [AUTEUR_CREW];

// Chemistry for elite talent
ALL_CHEMISTRY.push(
  { talent1: 'Isabella Divine', talent2: 'Sebastian Montague', name: 'Divine Romance', description: 'The greatest director meets the greatest star. +5 quality.', qualityBonus: 5 },
  { talent1: 'Zara Osei-Mensah', talent2: 'Sebastian Montague', name: 'Muse & Star', description: 'The muse inspires the heartthrob. +4 quality.', qualityBonus: 4 },
  { talent1: 'Isabella Divine', talent2: 'The Auteur Collective', name: 'Visionary Alliance', description: 'Oracle director + tag alchemists. +4 quality.', qualityBonus: 4 },
  { talent1: 'Zara Osei-Mensah', talent2: 'Grace Okonkwo', name: 'Heart Sisters', description: 'Two hearts beating as one. +3 quality.', qualityBonus: 3 },
);

// ─── R115: CONTENT EXPANSION — SCRIPTS, EVENTS, TALENT ───

// ── NEW SCRIPTS ──

const CABIN_FOOTAGE_CARDS: CardTemplate[] = [
  { name: 'Shaky Cam Opening', cardType: 'action', baseQuality: 1, synergyText: '🌀 +3 if draw 1-2. Found footage hook.', synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 3, description: 'Is this real?!' } : { bonus: 0 }, riskTag: '🟢', tags: ['chaos'] as CardTag[] },
  { name: 'Night Vision', cardType: 'action', baseQuality: 1, synergyText: '🌀 +2 if Crew card played. +1 per Chaos tag (max +3).', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'crew') ? 2 : 0; b += Math.min(ctx.tagsPlayed['chaos'] || 0, 3); return b > 0 ? { bonus: b, description: 'What was that noise?!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['chaos'] as CardTag[] },
  { name: 'The Last Recording', cardType: 'action', baseQuality: 2, synergyText: '+4 if draw 5+. Final tape plays.', synergyCondition: (ctx) => ctx.drawNumber >= 5 ? { bonus: 4, description: 'They never came back...' } : { bonus: 0 }, riskTag: '🟢' },
  { name: 'Battery Dies', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is NOT Incident. Win +4, Lose -4', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsNotIncident() },
  { name: 'Obvious Green Screen', cardType: 'incident', baseQuality: -4, synergyText: 'So much for "authentic footage."', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Audience Walks Out', cardType: 'incident', baseQuality: -5, synergyText: 'Motion sickness claims another victim.', synergyCondition: noSynergy, riskTag: '🔴' },
];

const CROWN_OF_ASHES_CARDS: CardTemplate[] = [
  { name: 'Coronation Scene', cardType: 'action', baseQuality: 2, synergyText: '✨ +3 if draw 1-2. Epic period opening.', synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 3, description: 'All hail!' } : { bonus: 0 }, riskTag: '🟢', tags: ['spectacle'] as CardTag[] },
  { name: 'Political Intrigue', cardType: 'action', baseQuality: 1, synergyText: '🎯 +2 if Director card played. +1 per Precision tag (max +3).', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0; b += Math.min(ctx.tagsPlayed['precision'] || 0, 3); return b > 0 ? { bonus: b, description: 'Machiavellian!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
  { name: 'Death of a King', cardType: 'action', baseQuality: 1, synergyText: '💕 +4 if 2+ Heart tags. Tragic and earned.', synergyCondition: (ctx) => (ctx.tagsPlayed['heart'] || 0) >= 2 ? { bonus: 4, description: 'Long live the king...' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Anachronism Spotted', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next has high value. Win +5, Lose -4', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsHighValue() },
  { name: 'Costumes Look Cheap', cardType: 'incident', baseQuality: -4, synergyText: 'Party City called. They want their crowns back.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Epic Scope, Empty Story', cardType: 'incident', baseQuality: -5, synergyText: 'Beautiful but boring. Lose $2M.', synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'All spectacle, no substance!' }), riskTag: '🔴' },
];

const WEIRD_WONDERFUL_CARDS: CardTemplate[] = [
  { name: 'Absurd Opening', cardType: 'action', baseQuality: 2, synergyText: '🌀 +3 if draw 1-2. What am I watching?!', synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 3, description: 'Delightfully weird!' } : { bonus: 0 }, riskTag: '🟢', tags: ['chaos'] as CardTag[] },
  { name: 'Quirky Monologue', cardType: 'action', baseQuality: 1, synergyText: '+3 if Actor card played. Offbeat charm.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'actor') ? { bonus: 3, description: 'So quotable!' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Emotional Gut Punch', cardType: 'action', baseQuality: 1, synergyText: '💕 +3 if 2+ Heart tags. Comedy meets tragedy.', synergyCondition: (ctx) => (ctx.tagsPlayed['heart'] || 0) >= 2 ? { bonus: 3, description: 'Laughing through tears!' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Too Indie', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is Action. Win +4, Lose -3', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsAction() },
  { name: 'Audience Confused', cardType: 'incident', baseQuality: -4, synergyText: 'Quirky became incomprehensible.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Festival Walkout', cardType: 'incident', baseQuality: -5, synergyText: 'Three people clapped. Forty left.', synergyCondition: noSynergy, riskTag: '🔴' },
];

const NEBULA_THRONE_CARDS: CardTemplate[] = [
  { name: 'Fleet Launch', cardType: 'action', baseQuality: 2, synergyText: '✨ +3 if Crew card played. VFX spectacle.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'crew') ? { bonus: 3, description: 'Ships away!' } : { bonus: 0 }, riskTag: '🟢', tags: ['spectacle'] as CardTag[] },
  { name: 'Alien Diplomacy', cardType: 'action', baseQuality: 1, synergyText: '🎯 +2 if Director card played. +1 per Precision tag (max +2).', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0; b += Math.min(ctx.tagsPlayed['precision'] || 0, 2); return b > 0 ? { bonus: b, description: 'Fascinating!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
  { name: 'Space Battle Climax', cardType: 'action', baseQuality: 1, synergyText: '✨ +4 if draw 4+. +1 per Spectacle tag (max +2).', synergyCondition: (ctx) => { let b = ctx.drawNumber >= 4 ? 4 : 0; b += Math.min(ctx.tagsPlayed['spectacle'] || 0, 2); return b > 0 ? { bonus: b, description: 'Epic space warfare!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['spectacle', 'momentum'] as CardTag[] },
  { name: 'Lore Dump', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is from Actor. Win +5, Lose -4', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsFromActor() },
  { name: 'Bad Alien Design', cardType: 'incident', baseQuality: -4, synergyText: 'The aliens look like rubber suits.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'VFX Budget Explosion', cardType: 'incident', baseQuality: -5, synergyText: 'Post-production costs spiral. Lose $3M.', synergyCondition: () => ({ bonus: 0, budgetMod: -3, description: 'VFX way over budget!' }), riskTag: '🔴' },
];

const GOLDEN_VAULT_CARDS: CardTemplate[] = [
  { name: 'The Plan', cardType: 'action', baseQuality: 2, synergyText: '🎯 +3 if Director card played. Meticulous setup.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'director') ? { bonus: 3, description: 'The plan unfolds!' } : { bonus: 0 }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
  { name: 'The Crew Assembles', cardType: 'action', baseQuality: 1, synergyText: '+2 if 2+ Actor cards. The team clicks.', synergyCondition: (ctx) => ctx.playedCards.filter(c => c.sourceType === 'actor').length >= 2 ? { bonus: 2, description: 'Dream team!' } : { bonus: 0 }, riskTag: '🟢', tags: ['momentum'] as CardTag[] },
  { name: 'The Twist', cardType: 'action', baseQuality: 1, synergyText: '+4 if draw 5+. Nobody saw it coming.', synergyCondition: (ctx) => ctx.drawNumber >= 5 ? { bonus: 4, description: 'What a twist!' } : { bonus: 0 }, riskTag: '🟢' },
  { name: 'Alarm Triggers', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is NOT Incident. Win +5, Lose -4', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsNotIncident() },
  { name: 'Predictable Plot', cardType: 'incident', baseQuality: -4, synergyText: 'Everyone guessed the twist at minute 20.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Caught Red-Handed', cardType: 'incident', baseQuality: -5, synergyText: 'Third act collapses. Lose $1M.', synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'Heist goes wrong!' }), riskTag: '🔴' },
];

const SUMMER_DAZE_CARDS: CardTemplate[] = [
  { name: 'Golden Hour Shot', cardType: 'action', baseQuality: 2, synergyText: '💕 +3 if draw 1-2. Instant nostalgia.', synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 3, description: 'Beautiful!' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Dance Sequence', cardType: 'action', baseQuality: 1, synergyText: '💕 +2 if Actor card played. +1 per Heart tag (max +3).', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'actor') ? 2 : 0; b += Math.min(ctx.tagsPlayed['heart'] || 0, 3); return b > 0 ? { bonus: b, description: 'Magical!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Bittersweet Goodbye', cardType: 'action', baseQuality: 1, synergyText: '+4 if draw 5+. Summer ends. Tears flow.', synergyCondition: (ctx) => ctx.drawNumber >= 5 ? { bonus: 4, description: 'Don\'t go...' } : { bonus: 0 }, riskTag: '🟢' },
  { name: 'Cheesy Montage', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is from Actor. Win +4, Lose -3', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsFromActor() },
  { name: 'Saccharine Overload', cardType: 'incident', baseQuality: -4, synergyText: 'Too sweet. Diabetic coma risk.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'No Conflict', cardType: 'incident', baseQuality: -5, synergyText: 'Nothing happens for 90 minutes. Pretty though.', synergyCondition: noSynergy, riskTag: '🔴' },
];

const DEEP_STATE_CARDS: CardTemplate[] = [
  { name: 'Wire Tap', cardType: 'action', baseQuality: 1, synergyText: '🎯 +3 if Director card played. Taut direction.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'director') ? { bonus: 3, description: 'Paranoia builds!' } : { bonus: 0 }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
  { name: 'Car Chase', cardType: 'action', baseQuality: 2, synergyText: '🔥 +2 if Crew card played. +1 per Momentum tag (max +2).', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'crew') ? 2 : 0; b += Math.min(ctx.tagsPlayed['momentum'] || 0, 2); return b > 0 ? { bonus: b, description: 'Pedal to metal!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['momentum', 'spectacle'] as CardTag[] },
  { name: 'Conspiracy Revealed', cardType: 'action', baseQuality: 1, synergyText: '+4 if 3+ cards played. The truth comes out.', synergyCondition: (ctx) => ctx.playedCards.length >= 3 ? { bonus: 4, description: 'It goes all the way to the top!' } : { bonus: 0 }, riskTag: '🟢' },
  { name: 'Double Agent', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next has high value. Win +5, Lose -4', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsHighValue() },
  { name: 'Convoluted Plot', cardType: 'incident', baseQuality: -4, synergyText: 'Even the director lost track of who betrayed whom.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Test Audience Baffled', cardType: 'incident', baseQuality: -5, synergyText: 'Focus group average comprehension: 12%.', synergyCondition: noSynergy, riskTag: '🔴' },
];

const MECH_WARRIORS_CARDS: CardTemplate[] = [
  { name: 'Mech Activation', cardType: 'action', baseQuality: 2, synergyText: '✨ +3 if draw 1-2. Giant robots incoming!', synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 3, description: 'Mechs online!' } : { bonus: 0 }, riskTag: '🟢', tags: ['spectacle', 'momentum'] as CardTag[] },
  { name: 'Pilot Bond', cardType: 'action', baseQuality: 1, synergyText: '💕 +3 if Actor card played. Pilot chemistry.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'actor') ? { bonus: 3, description: 'Neural link synced!' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Final Stand', cardType: 'action', baseQuality: 1, synergyText: '✨ +4 if draw 4+. +1 per Spectacle tag (max +2).', synergyCondition: (ctx) => { let b = ctx.drawNumber >= 4 ? 4 : 0; b += Math.min(ctx.tagsPlayed['spectacle'] || 0, 2); return b > 0 ? { bonus: b, description: 'For humanity!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['spectacle'] as CardTag[] },
  { name: 'Physics Problem', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is Action. Win +4, Lose -4', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsAction() },
  { name: 'Terrible Dialogue', cardType: 'incident', baseQuality: -4, synergyText: '"I\'m going to punch that alien... with my robot." Ugh.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'CGI Meltdown', cardType: 'incident', baseQuality: -5, synergyText: 'Unfinished renders in the final cut. Lose $2M.', synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'CGI nightmare!' }), riskTag: '🔴' },
];

const LOVE_ALGORITHM_CARDS: CardTemplate[] = [
  { name: 'App Match', cardType: 'action', baseQuality: 2, synergyText: '+3 if draw 1-2. Modern meet cute.', synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 3, description: 'Swipe right!' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Awkward First Date', cardType: 'action', baseQuality: 1, synergyText: '🌀 +2 if Actor card played. +1 per Chaos tag (max +2). Charming disaster.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'actor') ? 2 : 0; b += Math.min(ctx.tagsPlayed['chaos'] || 0, 2); return b > 0 ? { bonus: b, description: 'Adorably awkward!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['chaos', 'heart'] as CardTag[] },
  { name: 'Delete the App', cardType: 'action', baseQuality: 1, synergyText: '💕 +4 if 3+ Heart tags. They choose each other over algorithms.', synergyCondition: (ctx) => (ctx.tagsPlayed['heart'] || 0) >= 3 ? { bonus: 4, description: 'Love wins!' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Catfish Reveal', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is from Actor. Win +4, Lose -3', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsFromActor() },
  { name: 'Cringe Factor', cardType: 'incident', baseQuality: -4, synergyText: 'Product placement for dating apps ruins the mood.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Seen It Before', cardType: 'incident', baseQuality: -5, synergyText: 'Every romcom cliché in one film.', synergyCondition: noSynergy, riskTag: '🔴' },
];

const BLOOD_MERIDIAN_CARDS: CardTemplate[] = [
  { name: 'Desert Panorama', cardType: 'action', baseQuality: 2, synergyText: '✨ +2 if Crew card played. +1 per Spectacle tag (max +2). Breathtaking vistas.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'crew') ? 2 : 0; b += Math.min(ctx.tagsPlayed['spectacle'] || 0, 2); return b > 0 ? { bonus: b, description: 'Stunning landscape!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['spectacle'] as CardTag[] },
  { name: 'Philosophical Duel', cardType: 'action', baseQuality: 1, synergyText: '+3 if 2+ Actor cards. Dueling monologues.', synergyCondition: (ctx) => ctx.playedCards.filter(c => c.sourceType === 'actor').length >= 2 ? { bonus: 3, description: 'Riveting dialogue!' } : { bonus: 0 }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
  { name: 'Ambiguous Ending', cardType: 'action', baseQuality: 1, synergyText: '+3 if Director card played. Haunting final shot.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'director') ? { bonus: 3, description: 'What does it mean?' } : { bonus: 0 }, riskTag: '🟢' },
  { name: 'Too Violent', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is NOT Incident. Win +5, Lose -4', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsNotIncident() },
  { name: 'NC-17 Rating', cardType: 'incident', baseQuality: -4, synergyText: 'MPAA slaps the dreaded rating. Limited release.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Author\'s Estate Sues', cardType: 'incident', baseQuality: -5, synergyText: 'Legal battle kills momentum. Lose $2M.', synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'Lawyers everywhere!' }), riskTag: '🔴' },
];

ALL_SCRIPTS.push(
  { title: 'Cabin Footage', genre: 'Horror', baseScore: 5, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 1, cards: CABIN_FOOTAGE_CARDS, ability: 'survivalMode', abilityDesc: 'Survival Mode: Each draw you survive without busting adds +2. High risk, high reward.' },
  { title: 'Crown of Ashes', genre: 'Drama', baseScore: 9, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 6, cards: CROWN_OF_ASHES_CARDS, ability: 'precisionCraft', abilityDesc: 'Precision Craft: Each Precision tag adds +1 quality. Clean wrap bonus doubled.' },
  { title: 'Weird & Wonderful', genre: 'Comedy', baseScore: 6, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 2, cards: WEIRD_WONDERFUL_CARDS, ability: 'crowdPleaser', abilityDesc: 'Crowd Pleaser: For every 3 consecutive Action cards, +2 bonus' },
  { title: 'Nebula Throne', genre: 'Sci-Fi', baseScore: 9, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 6, cards: NEBULA_THRONE_CARDS, ability: 'blockbusterBonus', abilityDesc: 'Blockbuster: Market multiplier +0.3. Each Spectacle tag adds +0.05 more.' },
  { title: 'Golden Vault', genre: 'Thriller', baseScore: 7, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 4, cards: GOLDEN_VAULT_CARDS, ability: 'slowBurn', abilityDesc: 'Slow Burn: Quality bonus grows each draw (+1, +2, +3...). Wrapping early costs double.' },
  { title: 'Summer Daze', genre: 'Romance', baseScore: 5, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 2, cards: SUMMER_DAZE_CARDS, ability: 'heartEngine', abilityDesc: 'Heart Engine: Each Heart tag adds +1 quality. 6+ Heart = additional ×1.2 multiplier!' },
  { title: 'Deep State', genre: 'Thriller', baseScore: 8, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 5, cards: DEEP_STATE_CARDS, ability: 'slowBurn', abilityDesc: 'Slow Burn: Quality bonus grows each draw (+1, +2, +3...). Wrapping early costs double.' },
  { title: 'Mech Warriors: Uprising', genre: 'Action', baseScore: 7, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 4, cards: MECH_WARRIORS_CARDS, ability: 'blockbusterBonus', abilityDesc: 'Blockbuster: Market multiplier +0.3. Each Spectacle tag adds +0.05 more.' },
  { title: 'The Love Algorithm', genre: 'Romance', baseScore: 5, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 1, cards: LOVE_ALGORITHM_CARDS, ability: 'heartEngine', abilityDesc: 'Heart Engine: Each Heart tag adds +1 quality. 6+ Heart = additional ×1.2 multiplier!' },
  { title: 'Blood Meridian', genre: 'Drama', baseScore: 8, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 5, cards: BLOOD_MERIDIAN_CARDS, ability: 'precisionCraft', abilityDesc: 'Precision Craft: Each Precision tag adds +1 quality. Clean wrap bonus doubled.' },
);

// ── NEW SEASON EVENTS ──

ALL_SEASON_EVENTS.push(
  {
    id: 'market_crash',
    name: 'Market Crash',
    emoji: '📉',
    description: 'All script costs -$2 next season (min $1). But box office multiplier -0.2.',
    flavorText: 'Wall Street sneezes, Hollywood catches pneumonia. Budgets shrink. Talent agents lower their rates. Silver linings exist if you squint.',
    effect: 'marketCrash',
    rarity: 'rare',
  },
  {
    id: 'talent_strike',
    name: 'Talent Strike',
    emoji: '🪧',
    description: 'Can\'t hire new talent next season. Must work with your current roster.',
    flavorText: 'Every agency in town shuts their doors simultaneously. Your rolodex is useless. Better hope your bench is deep enough.',
    effect: 'talentStrike',
    rarity: 'rare',
  },
  {
    id: 'genre_renaissance',
    name: 'Genre Renaissance',
    emoji: '🎨',
    description: 'A random genre gets +×0.6 market multiplier next season. (Revealed after picking.)',
    flavorText: 'A24 releases three bangers in one genre, TikTok goes wild, and suddenly every studio wants in. The zeitgeist picks a lane.',
    effect: 'genreRenaissance',
    rarity: 'common',
  },
  {
    id: 'indie_darling_wave',
    name: 'Indie Darling Wave',
    emoji: '🎥',
    description: 'Scripts costing $3 or less get +5 base quality next season. Cheap films overperform.',
    flavorText: 'Mumblecore is back, baby. Film Twitter is in ecstasy. A movie shot on an iPhone just won Sundance. Your accountant has never been happier.',
    effect: 'indieDarlingWave',
    rarity: 'common',
  },
  {
    id: 'awards_campaign',
    name: 'Awards Campaign',
    emoji: '🏅',
    description: 'Spend $5M now. If next film quality > 35, gain +3 reputation. Otherwise, lose $5M for nothing.',
    flavorText: 'Your publicist books every trade ad, every screening, every schmooze dinner in town. "For Your Consideration" plastered on every bus in LA. Now you just need the film to be good.',
    effect: 'awardsCampaign',
    rarity: 'rare',
  },
);

// ── NEW SEASON EVENTS (Round 130) ──

ALL_SEASON_EVENTS.push(
  {
    id: 'studio_tour',
    name: 'Studio Tour',
    emoji: '🎟️',
    description: 'Open your studio to the public. Earn +$2M from tour revenue.',
    flavorText: 'Tourists in matching hats flood your backlot. One kid touches the Oscar replica. Security is overwhelmed. The gift shop sells out by noon.',
    effect: 'studioTour',
    rarity: 'common',
  },
  {
    id: 'script_leak',
    name: 'Script Leak',
    emoji: '📄',
    description: 'Your current script leaks online. Lose 1 reputation.',
    flavorText: 'Someone left the third draft in a Starbucks. Reddit has a megathread. Your writer is inconsolable. Your lawyer is on line two.',
    effect: 'scriptLeak',
    rarity: 'rare',
  },
  {
    id: 'film_festival_submit',
    name: 'Film Festival',
    emoji: '🎬🏆',
    description: 'Submit your current film early. If quality > 30: +2 rep, +×0.3 multiplier. Otherwise, nothing.',
    flavorText: 'The festival programmers saw a rough cut and went silent. Then one of them texted a single emoji: 🔥. You\'re in.',
    effect: 'filmFestivalSubmit',
    rarity: 'common',
  },
  {
    id: 'union_negotiations',
    name: 'Union Negotiations',
    emoji: '🤝',
    description: 'Pay $3M to settle union demands, or lose all crew card bonuses this season.',
    flavorText: 'The union rep slides a napkin across the table with a number on it. Three million. Your crew watches from the hallway. The silence is deafening.',
    effect: 'unionNegotiations',
    rarity: 'rare',
  },
  {
    id: 'streaming_deal_flat',
    name: 'Streaming Deal (Flat Rate)',
    emoji: '📺💵',
    description: 'Take a guaranteed $8M flat rate for your next film. Skip box office tier calculation entirely.',
    flavorText: 'StreamFlix offers a clean, simple deal: eight million, no strings, no theatrical window. Your agent says take it. Your ego says gamble. Your rent says take it.',
    effect: 'streamingDealFlat',
    rarity: 'common',
  },
  {
    id: 'celebrity_cameo',
    name: 'Celebrity Cameo',
    emoji: '⭐🎥',
    description: 'A celebrity drops by set. +3 quality boost, but 30% chance of scandal (-2 rep).',
    flavorText: 'They showed up unannounced in a golf cart, wearing sunglasses indoors. "I heard you were shooting. Put me in." Your AD mouths "say yes" from behind the monitor.',
    effect: 'celebrityCameo',
    rarity: 'common',
  },
  {
    id: 'tax_break',
    name: 'Tax Break',
    emoji: '🧾',
    description: 'Government incentive: your next script costs $2 less.',
    flavorText: 'The state film commission rubber-stamps your application. Two million in tax credits. Your accountant does a rare smile. You didn\'t even have to lie this time.',
    effect: 'taxBreak',
    rarity: 'common',
  },
  {
    id: 'documentary_trend',
    name: 'Documentary Trend',
    emoji: '🎞️',
    description: 'If your next film is Drama, double the market multiplier. Otherwise, no effect.',
    flavorText: 'True crime is dead. Prestige docs are in. Every streamer wants "the next Icarus." If you\'re making drama, you\'re golden. If not... tough luck.',
    effect: 'documentaryTrend',
    rarity: 'common',
  },
);

// ── NEW TALENT ──

const HASSAN_IBRAHIM: Omit<Talent, 'id'> = {
  name: 'Hassan Ibrahim',
  type: 'Lead',
  skill: 4,
  heat: 1,
  cost: 10,
  genreBonus: { genre: 'Thriller', bonus: 2 },
  trait: 'Quiet Intensity',
  traitDesc: '🎯 PRECISION: Says more with a look than most actors say in a monologue.',
  cards: [
    { name: 'Silent Stare', cardType: 'action', baseQuality: 2, synergyText: '🎯 +3 if Director card played. Controlled intensity.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'director') ? { bonus: 3, description: 'Mesmerizing!' } : { bonus: 0 }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
    { name: 'Breaking Point', cardType: 'action', baseQuality: 1, synergyText: '+3 if draw 4+. Restraint finally snaps.', synergyCondition: (ctx) => ctx.drawNumber >= 4 ? { bonus: 3, description: 'Explosive!' } : { bonus: 0 }, riskTag: '🟢', tags: ['momentum'] as CardTag[] },
    { name: 'Too Subtle', cardType: 'incident', baseQuality: -3, synergyText: 'Performance so understated nobody notices.', synergyCondition: noSynergy, riskTag: '🔴' },
  ],
};

const ROSA_DELGADO: Omit<Talent, 'id'> = {
  name: 'Rosa Delgado',
  type: 'Lead',
  skill: 5,
  heat: 3,
  cost: 15,
  genreBonus: { genre: 'Drama', bonus: 2 },
  trait: 'Telenovela Queen',
  traitDesc: '💕✨ HEART + SPECTACLE: Brings maximum emotion to every scene. Fans love her.',
  cards: [
    { name: 'Tears on Command', cardType: 'action', baseQuality: 2, synergyText: '💕 +2 per Heart tag (max +4). Raw emotion.', synergyCondition: (ctx) => { const b = Math.min((ctx.tagsPlayed['heart'] || 0) * 2, 4); return b > 0 ? { bonus: b, description: 'Devastating!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
    { name: 'Grand Gesture', cardType: 'action', baseQuality: 1, synergyText: '✨ +3 if draw 3+. The audience gasps.', synergyCondition: (ctx) => ctx.drawNumber >= 3 ? { bonus: 3, description: 'Telenovela magic!' } : { bonus: 0 }, riskTag: '🟢', tags: ['spectacle', 'heart'] as CardTag[] },
    { name: 'Diva Moment', cardType: 'incident', baseQuality: -4, synergyText: 'Demands her own trailer. And a bigger one. And a pool.', synergyCondition: noSynergy, riskTag: '🔴' },
  ],
};

const ZEKE_MORRISON: Omit<Talent, 'id'> = {
  name: 'Zeke Morrison',
  type: 'Support',
  skill: 3,
  heat: 0,
  cost: 5,
  genreBonus: { genre: 'Horror', bonus: 2 },
  trait: 'Scream King',
  traitDesc: '🌀 CHAOS: The guy who dies first — but makes it unforgettable.',
  cards: [
    { name: 'Iconic Death Scene', cardType: 'action', baseQuality: 1, synergyText: '🌀 +3 if 2+ Chaos tags. Memorable demise.', synergyCondition: (ctx) => (ctx.tagsPlayed['chaos'] || 0) >= 2 ? { bonus: 3, description: 'Legendary death!' } : { bonus: 0 }, riskTag: '🟢', tags: ['chaos'] as CardTag[] },
    { name: 'Comic Relief', cardType: 'action', baseQuality: 2, synergyText: '+2 if Actor card played. Lightens the mood.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'actor') ? { bonus: 2, description: 'Nervous laughter!' } : { bonus: 0 }, riskTag: '🟢' },
    { name: 'Overacts Dying', cardType: 'incident', baseQuality: -3, synergyText: 'Death scene becomes unintentional comedy.', synergyCondition: noSynergy, riskTag: '🔴' },
  ],
};

const NADIA_PETROVA: Omit<Talent, 'id'> = {
  name: 'Nadia Petrova',
  type: 'Support',
  skill: 4,
  heat: 2,
  cost: 10,
  genreBonus: { genre: 'Sci-Fi', bonus: 2 },
  trait: 'Tech Whisperer',
  traitDesc: '🎯 PRECISION: Makes technobabble sound like poetry.',
  cards: [
    { name: 'Exposition Mastery', cardType: 'action', baseQuality: 2, synergyText: '🎯 +2 if Director card played. +1 per Precision tag (max +2). Clear and compelling.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0; b += Math.min(ctx.tagsPlayed['precision'] || 0, 2); return b > 0 ? { bonus: b, description: 'Makes it make sense!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
    { name: 'Eureka Moment', cardType: 'action', baseQuality: 1, synergyText: '+3 if draw 3+. The solution clicks.', synergyCondition: (ctx) => ctx.drawNumber >= 3 ? { bonus: 3, description: 'She figured it out!' } : { bonus: 0 }, riskTag: '🟢' },
    { name: 'Upstages Lead (Again)', cardType: 'incident', baseQuality: -3, synergyText: 'Too good. Lead actor threatens to quit.', synergyCondition: noSynergy, riskTag: '🔴' },
  ],
};

const VINCENT_OKAFOR: Omit<Talent, 'id'> = {
  name: 'Vincent Okafor',
  type: 'Director',
  skill: 4,
  heat: 1,
  cost: 13,
  genreBonus: { genre: 'Action', bonus: 2 },
  trait: 'One-Take Wonder',
  traitDesc: '🔥✨ MOMENTUM + SPECTACLE: Famous for impossibly long tracking shots through chaos.',
  cards: [
    { name: 'Tracking Shot', cardType: 'action', baseQuality: 2, synergyText: '🔥 +2 per Momentum tag (max +4). The camera never stops.', synergyCondition: (ctx) => { const b = Math.min((ctx.tagsPlayed['momentum'] || 0) * 2, 4); return b > 0 ? { bonus: b, description: 'One continuous take!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['momentum', 'spectacle'] as CardTag[] },
    { name: 'Controlled Chaos', cardType: 'action', baseQuality: 1, synergyText: '+3 if Crew card played. Orchestrated mayhem.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'crew') ? { bonus: 3, description: 'Brilliant choreography!' } : { bonus: 0 }, riskTag: '🟢' },
    { name: 'Camera Breaks', cardType: 'incident', baseQuality: -4, synergyText: 'One-take requires one working camera. Lose $1M.', synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'Camera destroyed!' }), riskTag: '🔴' },
  ],
};

const ECHO_STUDIOS: Omit<Talent, 'id'> = {
  name: 'Echo Studios',
  type: 'Crew',
  skill: 3,
  heat: 0,
  cost: 7,
  genreBonus: { genre: 'Horror', bonus: 2 },
  trait: 'Sound Design Wizards',
  traitDesc: '🌀 CHAOS: Their sound design makes audiences jump out of their seats.',
  cards: [
    { name: 'Atmospheric Soundscape', cardType: 'action', baseQuality: 2, synergyText: '🌀 +2 if Director card played. +1 per Chaos tag (max +2). Terrifying audio.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0; b += Math.min(ctx.tagsPlayed['chaos'] || 0, 2); return b > 0 ? { bonus: b, description: 'What was that sound?!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['chaos'] as CardTag[] },
    { name: 'Jump Scare Sting', cardType: 'action', baseQuality: 1, synergyText: '+3 if draw 3+. Perfectly timed audio jolt.', synergyCondition: (ctx) => ctx.drawNumber >= 3 ? { bonus: 3, description: 'BOOM!' } : { bonus: 0 }, riskTag: '🟢' },
    { name: 'Audio Bleed', cardType: 'incident', baseQuality: -4, synergyText: 'Mic picks up crew talking. Ruins immersion.', synergyCondition: noSynergy, riskTag: '🔴' },
  ],
};

ALL_LEADS.push(HASSAN_IBRAHIM, ROSA_DELGADO);
ALL_SUPPORTS.push(ZEKE_MORRISON, NADIA_PETROVA);
ALL_DIRECTORS.push(VINCENT_OKAFOR);
ALL_CREW.push(ECHO_STUDIOS);

ALL_CHEMISTRY.push(
  { talent1: 'Hassan Ibrahim', talent2: 'Elena Voss', name: 'Silent Tension', description: 'Two masters of restraint. The screen crackles between them. +3 quality.', qualityBonus: 3 },
  { talent1: 'Rosa Delgado', talent2: 'Theo Banks', name: 'Fire & Ice', description: 'Maximum drama meets maximum comedy. Somehow it works. +3 quality.', qualityBonus: 3 },
  { talent1: 'Zeke Morrison', talent2: 'Echo Studios', name: 'Scream Symphony', description: 'His screams + their sound design = horror perfection. +3 quality.', qualityBonus: 3 },
  { talent1: 'Nadia Petrova', talent2: 'Aurora James', name: 'Science Sisters', description: 'Two sci-fi powerhouses elevate any space story. +3 quality.', qualityBonus: 3 },
  { talent1: 'Vincent Okafor', talent2: 'Kai Delgado', name: 'One-Take Mayhem', description: 'Tracking shots through live stunts. Insane and incredible. +4 quality.', qualityBonus: 4 },
);

// ─── R145: CONTENT EXPANSION 2 — SCRIPTS, TALENT & CHEMISTRY ───

// ── NEW SCRIPTS (R145) ──

const CONCRETE_JUNGLE_CARDS: CardTemplate[] = [
  { name: 'Rooftop Showdown', cardType: 'action', baseQuality: 2, synergyText: '🔥 +3 if draw 1-2. Starts with a bang.', synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 3, description: 'Rooftop chaos!' } : { bonus: 0 }, riskTag: '🟢', tags: ['momentum', 'spectacle'] as CardTag[] },
  { name: 'Back Alley Brawl', cardType: 'action', baseQuality: 1, synergyText: '🔥 +2 if Crew card played. +1 per Momentum tag (max +3). Gritty action.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'crew') ? 2 : 0; b += Math.min(ctx.tagsPlayed['momentum'] || 0, 3); return b > 0 ? { bonus: b, description: 'Street-level brutality!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['momentum'] as CardTag[] },
  { name: 'Brotherhood Pact', cardType: 'action', baseQuality: 1, synergyText: '💕 +3 if 2+ Actor cards. Bonds forged in fire.', synergyCondition: (ctx) => ctx.playedCards.filter(c => c.sourceType === 'actor').length >= 2 ? { bonus: 3, description: 'Ride or die!' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Ambush!', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is Action. Win +5, Lose -3', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: { ...betNextIsAction(), successBonus: 5 }, tags: ['momentum'] as CardTag[] },
  { name: 'Shaky Cam Overload', cardType: 'incident', baseQuality: -4, synergyText: 'Can\'t tell who\'s punching whom.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Location Permit Revoked', cardType: 'incident', baseQuality: -5, synergyText: 'City shuts down the shoot. Lose $2M.', synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'Kicked off the streets!' }), riskTag: '🔴' },
];

const GLACIER_POINT_CARDS: CardTemplate[] = [
  { name: 'Summit Approach', cardType: 'action', baseQuality: 1, synergyText: '✨ +3 if Crew card played. Breathtaking cinematography.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'crew') ? { bonus: 3, description: 'IMAX-worthy!' } : { bonus: 0 }, riskTag: '🟢', tags: ['spectacle'] as CardTag[] },
  { name: 'Avalanche Sequence', cardType: 'action', baseQuality: 2, synergyText: '✨🔥 +3 if draw 4+. +1 per Spectacle tag (max +2). VFX spectacle.', synergyCondition: (ctx) => { let b = ctx.drawNumber >= 4 ? 3 : 0; b += Math.min(ctx.tagsPlayed['spectacle'] || 0, 2); return b > 0 ? { bonus: b, description: 'Run!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['spectacle', 'momentum'] as CardTag[] },
  { name: 'Survival Instinct', cardType: 'action', baseQuality: 1, synergyText: '💀 +2 if any Incident played. +2 if Actor card played. Grit.', synergyCondition: (ctx) => { let b = ctx.incidentCount > 0 ? 2 : 0; if (ctx.playedCards.some(c => c.sourceType === 'actor')) b += 2; return b > 0 ? { bonus: b, description: 'Survival!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['chaos'] as CardTag[] },
  { name: 'Thin Ice', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is NOT Incident. Win +4, Lose -5', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: { ...betNextIsNotIncident(), successBonus: 4, failPenalty: -5 } },
  { name: 'CGI Snow Looks Fake', cardType: 'incident', baseQuality: -4, synergyText: 'Audience can tell it\'s a green screen.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Frostbite On Set', cardType: 'incident', baseQuality: -5, synergyText: 'Location shoot goes wrong. Lose $2M.', synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'Hypothermia!' }), riskTag: '🔴' },
];

const MIDNIGHT_IMPROV_CARDS: CardTemplate[] = [
  { name: 'Cold Open', cardType: 'action', baseQuality: 2, synergyText: '+3 if draw 1-2. Joke lands immediately.', synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 3, description: 'HILARIOUS!' } : { bonus: 0 }, riskTag: '🟢', tags: ['chaos'] as CardTag[] },
  { name: 'Callback Joke', cardType: 'action', baseQuality: 1, synergyText: '🔥 +1 per card played (max +5). Comedy snowball.', synergyCondition: (ctx) => { const b = Math.min(ctx.playedCards.length, 5); return b > 0 ? { bonus: b, description: 'The callback!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['momentum'] as CardTag[] },
  { name: 'Unscripted Magic', cardType: 'action', baseQuality: 1, synergyText: '🌀 +2 if Actor card played. +1 per Chaos tag (max +3). Pure improv.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'actor') ? 2 : 0; b += Math.min(ctx.tagsPlayed['chaos'] || 0, 3); return b > 0 ? { bonus: b, description: 'Off-script genius!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['chaos'] as CardTag[] },
  { name: 'Timing Is Everything', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next has high value. Win +5, Lose -3', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsHighValue() },
  { name: 'Dead Audience', cardType: 'incident', baseQuality: -4, synergyText: 'Not a single laugh. Devastating.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Lead Corpsing', cardType: 'incident', baseQuality: -5, synergyText: 'Can\'t stop laughing during takes. Day wasted.', synergyCondition: noSynergy, riskTag: '🔴' },
];

const ROAST_BATTLE_CARDS: CardTemplate[] = [
  { name: 'Opening Roast', cardType: 'action', baseQuality: 1, synergyText: '💀 +3 if draw 1-2. First joke hits hard.', synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 3, description: 'BURNED!' } : { bonus: 0 }, riskTag: '🟢', tags: ['chaos'] as CardTag[] },
  { name: 'Crowd Work', cardType: 'action', baseQuality: 2, synergyText: '💕 +2 if Actor card played. +1 per Heart tag (max +2). Audience connection.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'actor') ? 2 : 0; b += Math.min(ctx.tagsPlayed['heart'] || 0, 2); return b > 0 ? { bonus: b, description: 'They love it!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Comeback Line', cardType: 'action', baseQuality: 1, synergyText: '+3 if any Incident played. Turns disaster into gold.', synergyCondition: (ctx) => ctx.incidentCount > 0 ? { bonus: 3, description: 'Comedy from tragedy!' } : { bonus: 0 }, riskTag: '🟢' },
  { name: 'Too Mean', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is NOT Incident. Win +4, Lose -4', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsNotIncident() },
  { name: 'Joke Bombs', cardType: 'incident', baseQuality: -4, synergyText: 'Silence. Pure, horrible silence.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Celebrity Walkout', cardType: 'incident', baseQuality: -5, synergyText: 'Went too far. Guest of honor storms off. Lose $1M.', synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'Too personal!' }), riskTag: '🔴' },
];

const INHERITANCE_CARDS: CardTemplate[] = [
  { name: 'Reading of the Will', cardType: 'action', baseQuality: 2, synergyText: '🎯 +3 if draw 1-2. Gripping setup.', synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 3, description: 'Everyone\'s a suspect!' } : { bonus: 0 }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
  { name: 'Family Secrets', cardType: 'action', baseQuality: 1, synergyText: '💕 +2 if 2+ Actor cards. +2 if Director card played. Layers of betrayal.', synergyCondition: (ctx) => { let b = ctx.playedCards.filter(c => c.sourceType === 'actor').length >= 2 ? 2 : 0; if (ctx.playedCards.some(c => c.sourceType === 'director')) b += 2; return b > 0 ? { bonus: b, description: 'Shocking revelations!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['heart', 'precision'] as CardTag[] },
  { name: 'Courtroom Finale', cardType: 'action', baseQuality: 1, synergyText: '🎯 +4 if draw 5+. +1 per Precision tag (max +2). Justice delivered.', synergyCondition: (ctx) => { let b = ctx.drawNumber >= 5 ? 4 : 0; b += Math.min(ctx.tagsPlayed['precision'] || 0, 2); return b > 0 ? { bonus: b, description: 'The verdict!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
  { name: 'Missing Evidence', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is from Actor. Win +5, Lose -3', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: { ...betNextIsFromActor(), successBonus: 5 } },
  { name: 'Melodrama Creep', cardType: 'incident', baseQuality: -4, synergyText: 'Subtlety lost. Audience eye-rolls.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Third Act Sag', cardType: 'incident', baseQuality: -5, synergyText: 'Resolution drags. Lose $1M in reshoots.', synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'Needs a tighter edit!' }), riskTag: '🔴' },
];

const FEVER_DREAM_CARDS: CardTemplate[] = [
  { name: 'Lucid Opening', cardType: 'action', baseQuality: 2, synergyText: '💕 +3 if draw 1-2. Draws you in immediately.', synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 3, description: 'Am I dreaming?' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Slow Dance', cardType: 'action', baseQuality: 1, synergyText: '💕 +2 if Actor card played. +1 per Heart tag (max +3). Achingly beautiful.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'actor') ? 2 : 0; b += Math.min(ctx.tagsPlayed['heart'] || 0, 3); return b > 0 ? { bonus: b, description: 'Time stops...' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Midnight Confession', cardType: 'action', baseQuality: 1, synergyText: '💕 +4 if 3+ Heart tags. Raw vulnerability.', synergyCondition: (ctx) => (ctx.tagsPlayed['heart'] || 0) >= 3 ? { bonus: 4, description: 'Heart-shattering!' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Love or Career', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is from Actor. Win +4, Lose -4', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: { ...betNextIsFromActor(), failPenalty: -4 } },
  { name: 'Chemistry Gap', cardType: 'incident', baseQuality: -4, synergyText: 'Leads don\'t spark. Fatal for a romance.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Cliché Storm', cardType: 'incident', baseQuality: -5, synergyText: 'Rain kiss. Airport chase. Boom box. All of them.', synergyCondition: noSynergy, riskTag: '🔴' },
];

const LETTERS_FROM_MARS_CARDS: CardTemplate[] = [
  { name: 'Mars Landing', cardType: 'action', baseQuality: 2, synergyText: '✨ +3 if Crew card played. +1 per Spectacle tag (max +2). Red planet beauty.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'crew') ? 3 : 0; b += Math.min(ctx.tagsPlayed['spectacle'] || 0, 2); return b > 0 ? { bonus: b, description: 'One small step...' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['spectacle'] as CardTag[] },
  { name: 'Video Letter Home', cardType: 'action', baseQuality: 1, synergyText: '💕 +3 if Actor card played. +1 per Heart tag (max +2). Distance makes the heart ache.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'actor') ? 3 : 0; b += Math.min(ctx.tagsPlayed['heart'] || 0, 2); return b > 0 ? { bonus: b, description: '34 million miles from home...' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
  { name: 'Dust Storm Climax', cardType: 'action', baseQuality: 1, synergyText: '✨ +4 if draw 4+. Epic finale.', synergyCondition: (ctx) => ctx.drawNumber >= 4 ? { bonus: 4, description: 'Survive the storm!' } : { bonus: 0 }, riskTag: '🟢', tags: ['spectacle', 'momentum'] as CardTag[] },
  { name: 'Oxygen Leak', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is NOT Incident. Win +5, Lose -4', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: { ...betNextIsNotIncident(), successBonus: 5, failPenalty: -4 } },
  { name: 'Bad Science Backlash', cardType: 'incident', baseQuality: -4, synergyText: 'Neil deGrasse Tyson tweets a correction thread.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'VFX Unfinished', cardType: 'incident', baseQuality: -5, synergyText: 'Mars looks like Arizona with a red filter. Lose $2M.', synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'That\'s clearly Sedona!' }), riskTag: '🔴' },
];

const HIVE_MIND_CARDS: CardTemplate[] = [
  { name: 'Alien Signal', cardType: 'action', baseQuality: 1, synergyText: '🎯 +3 if Director card played. Taut sci-fi tension.', synergyCondition: (ctx) => ctx.playedCards.some(c => c.sourceType === 'director') ? { bonus: 3, description: 'What\'s out there?' } : { bonus: 0 }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
  { name: 'Neural Link', cardType: 'action', baseQuality: 2, synergyText: '🎯 +2 if 2+ Actor cards. +1 per Precision tag (max +2). Mind meld.', synergyCondition: (ctx) => { let b = ctx.playedCards.filter(c => c.sourceType === 'actor').length >= 2 ? 2 : 0; b += Math.min(ctx.tagsPlayed['precision'] || 0, 2); return b > 0 ? { bonus: b, description: 'Connected minds!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
  { name: 'Consciousness Upload', cardType: 'action', baseQuality: 1, synergyText: '✨ +4 if draw 5+. Transcendence.', synergyCondition: (ctx) => ctx.drawNumber >= 5 ? { bonus: 4, description: 'Beyond human!' } : { bonus: 0 }, riskTag: '🟢', tags: ['spectacle'] as CardTag[] },
  { name: 'Technobabble Trap', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next has high value. Win +5, Lose -3', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsHighValue() },
  { name: 'Derivative Script', cardType: 'incident', baseQuality: -4, synergyText: '"It\'s just The Matrix meets Arrival." Every review.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Studio Demands Dumbing Down', cardType: 'incident', baseQuality: -5, synergyText: 'Too smart for test audiences. Lose $1M in reshoots.', synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'Studio notes!' }), riskTag: '🔴' },
];

const SLEEP_CLINIC_CARDS: CardTemplate[] = [
  { name: 'Night Terror', cardType: 'action', baseQuality: 1, synergyText: '🌀 +3 if draw 1-2. Disorienting opening.', synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 3, description: 'Can\'t tell what\'s real!' } : { bonus: 0 }, riskTag: '🟢', tags: ['chaos'] as CardTag[] },
  { name: 'Sleep Study', cardType: 'action', baseQuality: 2, synergyText: '🎯 +2 if Director card played. +1 per Precision tag (max +2). Clinical dread.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0; b += Math.min(ctx.tagsPlayed['precision'] || 0, 2); return b > 0 ? { bonus: b, description: 'Don\'t fall asleep...' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['precision', 'chaos'] as CardTag[] },
  { name: 'Lucid Nightmare', cardType: 'action', baseQuality: 1, synergyText: '🌀✨ +3 if 2+ Chaos tags. +2 if Crew card played. Terrifying visuals.', synergyCondition: (ctx) => { let b = (ctx.tagsPlayed['chaos'] || 0) >= 2 ? 3 : 0; if (ctx.playedCards.some(c => c.sourceType === 'crew')) b += 2; return b > 0 ? { bonus: b, description: 'WAKE UP!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['chaos', 'spectacle'] as CardTag[] },
  { name: 'False Awakening', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is NOT Incident. Win +5, Lose -4', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: { ...betNextIsNotIncident(), successBonus: 5, failPenalty: -4 } },
  { name: 'Confusing Structure', cardType: 'incident', baseQuality: -4, synergyText: 'Nobody knows what\'s a dream and what\'s real.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Test Audience Hates It', cardType: 'incident', baseQuality: -5, synergyText: 'Focus group score: 12/100. Lose $1M.', synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'Back to the drawing board!' }), riskTag: '🔴' },
];

const VANISHING_POINT_CARDS: CardTemplate[] = [
  { name: 'Cold Open', cardType: 'action', baseQuality: 1, synergyText: '🎯 +3 if draw 1-2. +1 per Precision tag (max +2). Gripping first scene.', synergyCondition: (ctx) => { let b = ctx.drawNumber <= 2 ? 3 : 0; b += Math.min(ctx.tagsPlayed['precision'] || 0, 2); return b > 0 ? { bonus: b, description: 'Hooked!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
  { name: 'Paranoia Builds', cardType: 'action', baseQuality: 2, synergyText: '+2 if Director card played. +2 if Actor card played. Trust no one.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0; if (ctx.playedCards.some(c => c.sourceType === 'actor')) b += 2; return b > 0 ? { bonus: b, description: 'Who\'s lying?' } : { bonus: 0 }; }, riskTag: '🟢' },
  { name: 'The Disappearance', cardType: 'action', baseQuality: 1, synergyText: '+4 if draw 4+. The mystery deepens.', synergyCondition: (ctx) => ctx.drawNumber >= 4 ? { bonus: 4, description: 'Where did they go?' } : { bonus: 0 }, riskTag: '🟢' },
  { name: 'Red Herring', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next has high value. Win +5, Lose -4', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: { ...betNextIsHighValue(), successBonus: 5, failPenalty: -4 } },
  { name: 'Unsatisfying Reveal', cardType: 'incident', baseQuality: -5, synergyText: '"That\'s the twist?!" Audience groans.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Pacing Issues', cardType: 'incident', baseQuality: -4, synergyText: 'Second act drags. People check phones.', synergyCondition: noSynergy, riskTag: '🔴' },
];

const WHIPLASH_EFFECT_CARDS: CardTemplate[] = [
  { name: 'Opening Salvo', cardType: 'action', baseQuality: 2, synergyText: '🔥 +3 if draw 1-2. Relentless from frame one.', synergyCondition: (ctx) => ctx.drawNumber <= 2 ? { bonus: 3, description: 'No mercy!' } : { bonus: 0 }, riskTag: '🟢', tags: ['momentum'] as CardTag[] },
  { name: 'Psychological Game', cardType: 'action', baseQuality: 1, synergyText: '🎯 +2 if Director card played. +2 if Actor card played. Battle of wills.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0; if (ctx.playedCards.some(c => c.sourceType === 'actor')) b += 2; return b > 0 ? { bonus: b, description: 'Mind games!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
  { name: 'Breaking Point', cardType: 'action', baseQuality: 1, synergyText: '💀 +3 if any Incident played. +2 if draw 4+. Pressure creates diamonds.', synergyCondition: (ctx) => { let b = ctx.incidentCount > 0 ? 3 : 0; if (ctx.drawNumber >= 4) b += 2; return b > 0 ? { bonus: b, description: 'SNAP!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['chaos', 'momentum'] as CardTag[] },
  { name: 'Double or Nothing', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Sacrifice next card to double last card. All or nothing!', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betSacrificeForDouble() },
  { name: 'Audience Exhaustion', cardType: 'incident', baseQuality: -4, synergyText: 'Relentless pace becomes exhausting.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Lead Walks Off', cardType: 'incident', baseQuality: -5, synergyText: 'Too intense. Star quits mid-production. Lose $2M.', synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'Star quits!' }), riskTag: '🔴' },
];

const POSSESSION_PROTOCOL_CARDS: CardTemplate[] = [
  { name: 'Creepy Kid', cardType: 'action', baseQuality: 1, synergyText: '🌀 +3 if draw 1-3. Something\'s wrong with the child.', synergyCondition: (ctx) => ctx.drawNumber <= 3 ? { bonus: 3, description: 'Unsettling...' } : { bonus: 0 }, riskTag: '🟢', tags: ['chaos'] as CardTag[] },
  { name: 'Exorcism Scene', cardType: 'action', baseQuality: 2, synergyText: '✨💀 +2 if Actor card played. +1 per Chaos tag (max +3). Visceral.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'actor') ? 2 : 0; b += Math.min(ctx.tagsPlayed['chaos'] || 0, 3); return b > 0 ? { bonus: b, description: 'The power of cinema compels you!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['spectacle', 'chaos'] as CardTag[] },
  { name: 'Final Confrontation', cardType: 'action', baseQuality: 1, synergyText: '+4 if draw 5+. Good vs evil climax.', synergyCondition: (ctx) => ctx.drawNumber >= 5 ? { bonus: 4, description: 'Begone!' } : { bonus: 0 }, riskTag: '🟢' },
  { name: 'Sequel Bait', cardType: 'challenge', baseQuality: 0, synergyText: 'Challenge: Bet next is Action. Win +4, Lose -3', synergyCondition: noSynergy, riskTag: '🟡', challengeBet: betNextIsAction() },
  { name: 'Derivative Exorcist Clone', cardType: 'incident', baseQuality: -4, synergyText: 'We\'ve seen this movie 47 times before.', synergyCondition: noSynergy, riskTag: '🔴' },
  { name: 'Child Actor Meltdown', cardType: 'incident', baseQuality: -5, synergyText: 'Stage parent intervenes. Lose $1M.', synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'Stage parent nightmare!' }), riskTag: '🔴' },
];

ALL_SCRIPTS.push(
  { title: 'Concrete Jungle', genre: 'Action', baseScore: 6, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 2, cards: CONCRETE_JUNGLE_CARDS, ability: 'blockbusterBonus', abilityDesc: 'Street Action: Market multiplier +0.3. Each Spectacle tag adds +0.05 more.' },
  { title: 'Glacier Point', genre: 'Action', baseScore: 8, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 5, cards: GLACIER_POINT_CARDS, ability: 'survivalMode', abilityDesc: 'Survival Mode: Each draw you survive without busting adds +2. High risk, high reward.' },
  { title: 'Midnight Improv', genre: 'Comedy', baseScore: 5, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 1, cards: MIDNIGHT_IMPROV_CARDS, ability: 'crowdPleaser', abilityDesc: 'Crowd Pleaser: For every 3 consecutive Action cards, +2 bonus' },
  { title: 'Roast Battle', genre: 'Comedy', baseScore: 6, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 3, cards: ROAST_BATTLE_CARDS, ability: 'heartEngine', abilityDesc: 'Heart Engine: Each Heart tag adds +1 quality. 6+ Heart = additional ×1.2 multiplier!' },
  { title: 'The Inheritance', genre: 'Drama', baseScore: 8, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 5, cards: INHERITANCE_CARDS, ability: 'precisionCraft', abilityDesc: 'Precision Craft: Each Precision tag adds +1 quality. Clean wrap bonus doubled.' },
  { title: 'Fever Dream', genre: 'Drama', baseScore: 7, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 3, cards: FEVER_DREAM_CARDS, ability: 'heartEngine', abilityDesc: 'Heart Engine: Each Heart tag adds +1 quality. 6+ Heart = additional ×1.2 multiplier!' },
  { title: 'Sleep Clinic', genre: 'Horror', baseScore: 6, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 2, cards: SLEEP_CLINIC_CARDS, ability: 'finalGirl', abilityDesc: 'Final Girl: If you wrap after exactly 5 draws, +5 bonus. Chaos tags count as +1 quality each.' },
  { title: 'Possession Protocol', genre: 'Horror', baseScore: 7, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 4, cards: POSSESSION_PROTOCOL_CARDS, ability: 'survivalMode', abilityDesc: 'Survival Mode: Each draw you survive without busting adds +2. High risk, high reward.' },
  { title: 'Letters from Mars', genre: 'Sci-Fi', baseScore: 8, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 5, cards: LETTERS_FROM_MARS_CARDS, ability: 'prestige', abilityDesc: 'Prestige: Quality above 35 counts double for nominations.' },
  { title: 'Hive Mind', genre: 'Sci-Fi', baseScore: 7, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 4, cards: HIVE_MIND_CARDS, ability: 'precisionCraft', abilityDesc: 'Precision Craft: Each Precision tag adds +1 quality. Clean wrap bonus doubled.' },
  { title: 'Vanishing Point', genre: 'Thriller', baseScore: 7, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 3, cards: VANISHING_POINT_CARDS, ability: 'slowBurn', abilityDesc: 'Slow Burn: Quality bonus grows each draw (+1, +2, +3...). Wrapping early costs double.' },
  { title: 'The Whiplash Effect', genre: 'Thriller', baseScore: 8, slots: ['Lead', 'Support', 'Director', 'Crew', 'Wild'], cost: 5, cards: WHIPLASH_EFFECT_CARDS, ability: 'slowBurn', abilityDesc: 'Slow Burn: Cards after draw 4 get +1 base. Exactly 2 Incidents = +8 quality!' },
);

// ── NEW TALENT (R145) ──

const DARNELL_WASHINGTON: Omit<Talent, 'id'> = {
  name: 'Darnell Washington',
  type: 'Lead',
  skill: 4,
  heat: 2,
  cost: 12,
  genreBonus: { genre: 'Drama', bonus: 2 },
  trait: 'The Everyman',
  traitDesc: '💕 HEART: Audiences see themselves in him. Every performance feels personal and lived-in.',
  cards: [
    { name: 'Quiet Dignity', cardType: 'action', baseQuality: 2, synergyText: '💕 +2 if Director card played. +1 per Heart tag (max +3). Authentic and grounded.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0; b += Math.min(ctx.tagsPlayed['heart'] || 0, 3); return b > 0 ? { bonus: b, description: 'So real it hurts!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
    { name: 'Working Man\'s Speech', cardType: 'action', baseQuality: 1, synergyText: '💕 +3 if 2+ Heart tags. +2 if 2+ Actor cards. Brings the house down.', synergyCondition: (ctx) => { let b = (ctx.tagsPlayed['heart'] || 0) >= 2 ? 3 : 0; if (ctx.playedCards.filter(c => c.sourceType === 'actor').length >= 2) b += 2; return b > 0 ? { bonus: b, description: 'Standing ovation!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
    { name: 'Too Earnest', cardType: 'incident', baseQuality: -3, synergyText: 'Sincerity reads as naive. Critics snicker.', synergyCondition: noSynergy, riskTag: '🔴' },
  ],
};

const JIN_SOO_PARK: Omit<Talent, 'id'> = {
  name: 'Jin-soo Park',
  type: 'Lead',
  skill: 5,
  heat: 3,
  cost: 16,
  genreBonus: { genre: 'Action', bonus: 2 },
  trait: 'K-Action Star',
  traitDesc: '🔥✨ MOMENTUM + SPECTACLE: Korean action cinema royalty. Every fight is choreographed poetry.',
  cards: [
    { name: 'Corridor Fight', cardType: 'action', baseQuality: 2, synergyText: '🔥 +2 if previous card was Action. +1 per Momentum tag (max +3). Oldboy homage.', synergyCondition: (ctx) => { let b = ctx.previousCard?.cardType === 'action' ? 2 : 0; b += Math.min(ctx.tagsPlayed['momentum'] || 0, 3); return b > 0 ? { bonus: b, description: 'Hallway brawl!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['momentum', 'spectacle'] as CardTag[] },
    { name: 'Emotional Flashback', cardType: 'action', baseQuality: 1, synergyText: '💕 +3 if 2+ Heart tags. Action with soul.', synergyCondition: (ctx) => (ctx.tagsPlayed['heart'] || 0) >= 2 ? { bonus: 3, description: 'Tears in the rain!' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
    { name: 'Ego Clash with Director', cardType: 'incident', baseQuality: -4, synergyText: 'Wants to direct the fight scenes himself. Tension on set.', synergyCondition: noSynergy, riskTag: '🔴' },
  ],
};

const AMARA_OSEI: Omit<Talent, 'id'> = {
  name: 'Amara Osei',
  type: 'Support',
  skill: 3,
  heat: 0,
  cost: 6,
  genreBonus: { genre: 'Comedy', bonus: 2 },
  trait: 'Deadpan Queen',
  traitDesc: '🌀💕 CHAOS + HEART: Never cracks a smile. Somehow the funniest person in every room.',
  cards: [
    { name: 'Stone Face', cardType: 'action', baseQuality: 2, synergyText: '🌀 +2 if Actor card played. +1 per Chaos tag (max +2). Straight-faced genius.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'actor') ? 2 : 0; b += Math.min(ctx.tagsPlayed['chaos'] || 0, 2); return b > 0 ? { bonus: b, description: 'Not a single twitch!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['chaos', 'heart'] as CardTag[] },
    { name: 'Perfect Timing', cardType: 'action', baseQuality: 1, synergyText: '+3 if draw 3+. Comedy is all about timing.', synergyCondition: (ctx) => ctx.drawNumber >= 3 ? { bonus: 3, description: 'Wait for it...' } : { bonus: 0 }, riskTag: '🟢' },
    { name: 'Too Deadpan', cardType: 'incident', baseQuality: -3, synergyText: 'Audience can\'t tell if she\'s joking. Confused laughter.', synergyCondition: noSynergy, riskTag: '🔴' },
  ],
};

const NIKOLAI_PETROV: Omit<Talent, 'id'> = {
  name: 'Nikolai Petrov',
  type: 'Support',
  skill: 4,
  heat: 1,
  cost: 8,
  genreBonus: { genre: 'Thriller', bonus: 2 },
  trait: 'The Villain',
  traitDesc: '💀🎯 CHAOS + PRECISION: Born to play antagonists. Cold, calculated menace.',
  cards: [
    { name: 'Menacing Monologue', cardType: 'action', baseQuality: 2, synergyText: '🎯 +2 if Director card played. +1 per Precision tag (max +2). Chilling.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0; b += Math.min(ctx.tagsPlayed['precision'] || 0, 2); return b > 0 ? { bonus: b, description: 'Terrifying villain!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['precision', 'chaos'] as CardTag[] },
    { name: 'Unexpected Mercy', cardType: 'action', baseQuality: 1, synergyText: '💕 +3 if 2+ Heart tags. Even villains have layers.', synergyCondition: (ctx) => (ctx.tagsPlayed['heart'] || 0) >= 2 ? { bonus: 3, description: 'Complex villainy!' } : { bonus: 0 }, riskTag: '🟢', tags: ['heart'] as CardTag[] },
    { name: 'Typecast Backlash', cardType: 'incident', baseQuality: -3, synergyText: 'Critics say he plays the same guy every time.', synergyCondition: noSynergy, riskTag: '🔴' },
  ],
};

const CELESTE_MOREAU: Omit<Talent, 'id'> = {
  name: 'Celeste Moreau',
  type: 'Director',
  skill: 4,
  heat: 1,
  cost: 11,
  genreBonus: { genre: 'Romance', bonus: 3 },
  trait: 'Romantic Visionary',
  traitDesc: '💕✨ HEART + SPECTACLE: Makes love stories look like paintings. Every frame is art.',
  cards: [
    { name: 'Golden Hour Magic', cardType: 'action', baseQuality: 2, synergyText: '💕 +2 if Actor card played. +1 per Heart tag (max +3). Swoon-worthy.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'actor') ? 2 : 0; b += Math.min(ctx.tagsPlayed['heart'] || 0, 3); return b > 0 ? { bonus: b, description: 'Pure romance!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['heart', 'spectacle'] as CardTag[] },
    { name: 'Visual Poetry', cardType: 'action', baseQuality: 1, synergyText: '✨ +3 if Crew card played. +1 per Spectacle tag (max +2). Cinematic beauty.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'crew') ? 3 : 0; b += Math.min(ctx.tagsPlayed['spectacle'] || 0, 2); return b > 0 ? { bonus: b, description: 'Every frame a painting!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['spectacle'] as CardTag[] },
    { name: 'Style Over Substance', cardType: 'incident', baseQuality: -4, synergyText: 'Beautiful but hollow. Critics unimpressed.', synergyCondition: noSynergy, riskTag: '🔴' },
  ],
};

const DESMOND_COLE: Omit<Talent, 'id'> = {
  name: 'Desmond Cole',
  type: 'Director',
  skill: 3,
  heat: 2,
  cost: 9,
  genreBonus: { genre: 'Comedy', bonus: 2 },
  trait: 'Improv Champion',
  traitDesc: '🌀🔥 CHAOS + MOMENTUM: Throws out the script. Trusts the actors. Sometimes it\'s genius.',
  cards: [
    { name: 'Loose Set', cardType: 'action', baseQuality: 1, synergyText: '🌀 +2 if Actor card played. +1 per Chaos tag (max +3). Controlled mayhem.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'actor') ? 2 : 0; b += Math.min(ctx.tagsPlayed['chaos'] || 0, 3); return b > 0 ? { bonus: b, description: 'Improv gold!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['chaos', 'momentum'] as CardTag[] },
    { name: 'Happy Accident', cardType: 'action', baseQuality: 2, synergyText: '+3 if any Incident played. Mistakes become magic.', synergyCondition: (ctx) => ctx.incidentCount > 0 ? { bonus: 3, description: 'Happy accident!' } : { bonus: 0 }, riskTag: '🟢' },
    { name: 'No Plan B', cardType: 'incident', baseQuality: -4, synergyText: 'Improv fails. No script to fall back on. Lose $1M.', synergyCondition: () => ({ bonus: 0, budgetMod: -1, description: 'Should\'ve had a script!' }), riskTag: '🔴' },
  ],
};

const WILDFIRE_PRODUCTIONS: Omit<Talent, 'id'> = {
  name: 'Wildfire Productions',
  type: 'Crew',
  skill: 3,
  heat: 0,
  cost: 6,
  genreBonus: { genre: 'Action', bonus: 2 },
  trait: 'Practical FX Crew',
  traitDesc: '🔥✨ MOMENTUM + SPECTACLE: Real explosions. Real fire. Real danger. Real spectacle.',
  cards: [
    { name: 'Practical Explosion', cardType: 'action', baseQuality: 2, synergyText: '✨ +2 if Director card played. +1 per Spectacle tag (max +3). Real fire!', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0; b += Math.min(ctx.tagsPlayed['spectacle'] || 0, 3); return b > 0 ? { bonus: b, description: 'REAL explosions!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['spectacle', 'momentum'] as CardTag[] },
    { name: 'Rigging Perfection', cardType: 'action', baseQuality: 1, synergyText: '🔥 +2 if 2+ Momentum tags. +2 if Actor card played. Stunt work at its finest.', synergyCondition: (ctx) => { let b = (ctx.tagsPlayed['momentum'] || 0) >= 2 ? 2 : 0; if (ctx.playedCards.some(c => c.sourceType === 'actor')) b += 2; return b > 0 ? { bonus: b, description: 'Flawless stunt!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['momentum'] as CardTag[] },
    { name: 'Fire Hazard', cardType: 'incident', baseQuality: -5, synergyText: 'Set catches fire for real. Lose $2M.', synergyCondition: () => ({ bonus: 0, budgetMod: -2, description: 'NOT a controlled burn!' }), riskTag: '🔴' },
  ],
};

const ATLAS_POST: Omit<Talent, 'id'> = {
  name: 'Atlas Post',
  type: 'Crew',
  skill: 4,
  heat: 0,
  cost: 9,
  trait: 'Color Grading Masters',
  traitDesc: '🎯✨ PRECISION + SPECTACLE: Their color work defines the visual tone. Every film looks iconic.',
  cards: [
    { name: 'Signature Look', cardType: 'action', baseQuality: 2, synergyText: '✨ +2 if Director card played. +1 per Precision tag (max +2). Visual identity.', synergyCondition: (ctx) => { let b = ctx.playedCards.some(c => c.sourceType === 'director') ? 2 : 0; b += Math.min(ctx.tagsPlayed['precision'] || 0, 2); return b > 0 ? { bonus: b, description: 'Iconic palette!' } : { bonus: 0 }; }, riskTag: '🟢', tags: ['precision', 'spectacle'] as CardTag[] },
    { name: 'Final Grade', cardType: 'action', baseQuality: 1, synergyText: '🎯 +3 if draw 4+. The final polish that makes everything pop.', synergyCondition: (ctx) => ctx.drawNumber >= 4 ? { bonus: 3, description: 'The colors!' } : { bonus: 0 }, riskTag: '🟢', tags: ['precision'] as CardTag[] },
    { name: 'Monitor Calibration Disaster', cardType: 'incident', baseQuality: -4, synergyText: 'Everything looks green in theaters. Embarrassing.', synergyCondition: noSynergy, riskTag: '🔴' },
  ],
};

ALL_LEADS.push(DARNELL_WASHINGTON, JIN_SOO_PARK);
ALL_SUPPORTS.push(AMARA_OSEI, NIKOLAI_PETROV);
ALL_DIRECTORS.push(CELESTE_MOREAU, DESMOND_COLE);
ALL_CREW.push(WILDFIRE_PRODUCTIONS, ATLAS_POST);

// ── NEW CHEMISTRY (R145) ──

ALL_CHEMISTRY.push(
  { talent1: 'Darnell Washington', talent2: 'Miriam Stone', name: 'Everyman\'s Director', description: 'Authentic lead + Oscar-winning director. Awards bait perfected. +4 quality.', qualityBonus: 4 },
  { talent1: 'Jin-soo Park', talent2: 'Vincent Okafor', name: 'Action Auteurs', description: 'K-action star + one-take director. Fight scenes become art. +4 quality.', qualityBonus: 4 },
  { talent1: 'Amara Osei', talent2: 'Benny Romano', name: 'Straight Man & Clown', description: 'Deadpan meets slapstick. Comedy perfection. +3 quality.', qualityBonus: 3 },
  { talent1: 'Nikolai Petrov', talent2: 'Tessa Kwon', name: 'Cold War', description: 'Villain + ice queen. Thriller electricity. +4 quality.', qualityBonus: 4 },
  { talent1: 'Celeste Moreau', talent2: 'Rafael Santos', name: 'Romance Royalty', description: 'Romance director + romance lead. The audience never stood a chance. +4 quality.', qualityBonus: 4 },
  { talent1: 'Wildfire Productions', talent2: 'Jack Navarro', name: 'Stunt Factory', description: 'Practical FX + stunt coordinator. Action scenes become legendary. +3 quality.', qualityBonus: 3 },
);
