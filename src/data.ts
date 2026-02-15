import { Script, Talent, ProductionCard, StudioPerk, MarketCondition, Genre } from './types';

let _id = 0;
const uid = () => `id_${_id++}`;

const GENRES: Genre[] = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];

// --- SCRIPTS ---
export const ALL_SCRIPTS: Omit<Script, 'id'>[] = [
  { title: 'Fast Lane', genre: 'Action', baseScore: 6, slots: ['Lead','Support','Director','Crew','Wild'], cost: 3, ability: 'stuntDouble', abilityDesc: 'Stunt bonuses doubled' },
  { title: 'Midnight Caller', genre: 'Horror', baseScore: 7, slots: ['Lead','Director','Crew','Crew','Wild'], cost: 2, ability: 'scandalQuality', abilityDesc: 'Scandal cards add +1 quality instead' },
  { title: 'Summer Daze', genre: 'Comedy', baseScore: 5, slots: ['Lead','Support','Director','Crew','Wild'], cost: 0 },
  { title: 'The Last Emperor', genre: 'Drama', baseScore: 8, slots: ['Lead','Support','Director','Crew','Wild'], cost: 5, ability: 'directorDouble', abilityDesc: 'Director skill counts double' },
  { title: 'Galactic War', genre: 'Sci-Fi', baseScore: 8, slots: ['Lead','Support','Director','Crew','Crew'], cost: 8, ability: 'crewBonus', abilityDesc: '+3 quality if total crew skill ≥ 6' },
  { title: 'Broken Hearts Club', genre: 'Romance', baseScore: 5, slots: ['Lead','Support','Director','Crew','Wild'], cost: 1, ability: 'starChemistry', abilityDesc: '+4 if 2+ Stars in cast' },
  { title: 'Nightmare Fuel', genre: 'Horror', baseScore: 6, slots: ['Lead','Support','Director','Crew','Wild'], cost: 2, ability: 'scandalHeal', abilityDesc: 'Scandal cards heal +2 quality instead' },
  { title: 'Neon Streets', genre: 'Action', baseScore: 7, slots: ['Lead','Support','Director','Crew','Wild'], cost: 4 },
  { title: 'Laugh Track', genre: 'Comedy', baseScore: 5, slots: ['Lead','Support','Support','Director','Crew'], cost: 1, ability: 'coolCast', abilityDesc: '+2 per Star with Heat ≤ 1' },
  { title: 'Deep Cover', genre: 'Thriller', baseScore: 7, slots: ['Lead','Support','Director','Crew','Wild'], cost: 3, ability: 'directorSkill', abilityDesc: '+3 if Director skill ≥ 4' },
  { title: 'The Wanderer', genre: 'Drama', baseScore: 6, slots: ['Lead','Director','Crew','Wild','Wild'], cost: 2 },
  { title: 'Robot Uprising', genre: 'Sci-Fi', baseScore: 7, slots: ['Lead','Support','Director','Crew','Crew'], cost: 6 },
  { title: 'Love & Thunder', genre: 'Romance', baseScore: 6, slots: ['Lead','Support','Director','Crew','Wild'], cost: 2 },
  { title: 'Cabin Fever', genre: 'Horror', baseScore: 5, slots: ['Lead','Support','Director','Crew','Wild'], cost: 0 },
  { title: 'Grand Heist', genre: 'Thriller', baseScore: 8, slots: ['Lead','Support','Support','Director','Crew'], cost: 5, ability: 'uniqueTypes', abilityDesc: 'Each unique talent type gives +1' },
];

export function generateScripts(count: number, season: number): Script[] {
  const pool = [...ALL_SCRIPTS];
  const result: Script[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const s = pool.splice(idx, 1)[0];
    result.push({ ...s, id: uid(), baseScore: s.baseScore + Math.floor(season / 3) });
  }
  return result;
}

// --- TALENT ---
const TALENT_NAMES_STAR = [
  'Rex Sterling', 'Luna Vega', 'Dash Harmon', 'Vivian Cross', 'Marco Blaze',
  'Celeste Moon', 'Jack Thunder', 'Isla Night', 'Bruno Steel', 'Scarlett Faye',
  'Dominic Cash', 'Aurora Belle', 'Rocco Valiant', 'Zara Phoenix', 'Finn Wilder',
];
const TALENT_NAMES_DIR = [
  'Akira Lens', 'Sofia Reel', 'Victor Frame', 'Maya Shot', 'Klaus Vision',
  'Ingrid Scope', 'Roman Cut', 'Nadia Focus', 'Otto Zoom', 'Yuki Take',
];
const TALENT_NAMES_CREW = [
  'Sparks McGee', 'Dolly Grip', 'Flash Gordon Jr.', 'Steady Eddie', 'Pixel Pete',
  'Boom Mike', 'Lens Cap Larry', 'Filter Fiona', 'Gaffer Gary', 'Rigger Rosa',
];

const TRAITS: { name: string; desc: string }[] = [
  { name: 'Method Actor', desc: '+2 quality but +1 Heat after each film' },
  { name: 'Box Office Draw', desc: '+$5M guaranteed box office' },
  { name: 'Rising Star', desc: '+1 permanent Skill after successful films' },
  { name: 'Comeback Kid', desc: '+3 Skill if last film flopped' },
  { name: 'Perfectionist', desc: '+3 quality if 5+ production draws' },
  { name: 'Lucky', desc: 'First bad card each production is ignored' },
  { name: 'Mentor', desc: 'Adjacent talent gets +1 Skill' },
  { name: 'Diva', desc: 'Must be Lead or -2 Skill' },
  { name: 'Volatile', desc: '30% chance to quit on Scandal' },
  { name: 'Chameleon', desc: 'Counts as matching any genre bonus' },
];

const usedNames = new Set<string>();

function randomTalent(type: 'Star' | 'Director' | 'Crew', skillRange: [number, number], heatRange: [number, number]): Talent {
  const names = type === 'Star' ? TALENT_NAMES_STAR : type === 'Director' ? TALENT_NAMES_DIR : TALENT_NAMES_CREW;
  // Try to avoid duplicate names within a generation batch
  let name = names[Math.floor(Math.random() * names.length)];
  const genre = Math.random() > 0.5 ? GENRES[Math.floor(Math.random() * GENRES.length)] : undefined;
  const skill = skillRange[0] + Math.floor(Math.random() * (skillRange[1] - skillRange[0] + 1));
  const heat = heatRange[0] + Math.floor(Math.random() * (heatRange[1] - heatRange[0] + 1));
  const trait = Math.random() > 0.4 ? TRAITS[Math.floor(Math.random() * TRAITS.length)] : undefined;
  const cost = skill * 2 + heat * 3 + (trait ? 2 : 0);
  return {
    id: uid(),
    name,
    type,
    skill,
    heat,
    genreBonus: genre ? { genre, bonus: Math.floor(Math.random() * 3) + 1 } : undefined,
    trait: trait?.name,
    traitDesc: trait?.desc,
    cost,
  };
}

export function generateTalentMarket(count: number, season: number): Talent[] {
  const result: Talent[] = [];
  const minSkill = Math.min(1 + Math.floor(season / 2), 4);
  const maxSkill = Math.min(3 + season, 6);
  for (let i = 0; i < count; i++) {
    const types: ('Star' | 'Director' | 'Crew')[] = ['Star', 'Star', 'Director', 'Crew'];
    const type = types[Math.floor(Math.random() * types.length)];
    result.push(randomTalent(type, [minSkill, maxSkill], [0, Math.min(season + 1, 5)]));
  }
  return result;
}

export function starterRoster(): Talent[] {
  return [
    { id: uid(), name: 'Jamie Nobody', type: 'Star', skill: 2, heat: 0, cost: 0 },
    { id: uid(), name: 'Pat Firsttimer', type: 'Director', skill: 2, heat: 0, cost: 0 },
    { id: uid(), name: 'Sam Grip', type: 'Crew', skill: 1, heat: 0, cost: 0 },
  ];
}

export function neowTalent(): Talent {
  return {
    id: uid(),
    name: 'Fading Icon',
    type: 'Star',
    skill: 5,
    heat: 4,
    trait: 'Past Their Prime',
    traitDesc: '-1 Skill per season',
    cost: 0,
  };
}

// --- PRODUCTION CARDS ---
const GOOD_CARDS: Omit<ProductionCard, 'id'>[] = [
  { name: 'Magic Moment', type: 'good', effect: '+3 quality', qualityMod: 3 },
  { name: 'Perfect Take', type: 'good', effect: '+2 quality (+1 if Director Skill 4+)', qualityMod: 2, skillReq: { type: 'Director', min: 4 } },
  { name: 'On-Set Chemistry', type: 'good', effect: '+2 quality (if 2+ Stars)', qualityMod: 2 },
  { name: 'Award-Worthy Scene', type: 'good', effect: '+4 quality', qualityMod: 4 },
  { name: 'Viral Trailer', type: 'good', effect: '+2 quality, +$5M', qualityMod: 2, budgetMod: 5 },
  { name: 'Standing Ovation', type: 'good', effect: '+5 quality (high-heat only)', qualityMod: 5 },
  { name: 'Lightning in a Bottle', type: 'good', effect: '+3 quality', qualityMod: 3 },
  { name: 'Happy Accident', type: 'good', effect: '+2 quality', qualityMod: 2 },
  { name: 'Inspired Performance', type: 'good', effect: '+3 quality', qualityMod: 3 },
  { name: 'Crowd Pleaser', type: 'good', effect: '+2 quality', qualityMod: 2 },
  { name: 'Director\'s Vision', type: 'good', effect: '+3 quality', qualityMod: 3 },
  { name: 'Golden Hour', type: 'good', effect: '+2 quality, +$2M', qualityMod: 2, budgetMod: 2 },
];

const BAD_CARDS: Omit<ProductionCard, 'id'>[] = [
  { name: 'Over Budget', type: 'bad', effect: '-$3M', qualityMod: 0, budgetMod: -3 },
  { name: 'Scandal!', type: 'bad', effect: '-2 quality, tabloid chaos', qualityMod: -2, isScandal: true },
  { name: 'Creative Differences', type: 'bad', effect: '-2 quality', qualityMod: -2 },
  { name: 'On-Set Injury', type: 'bad', effect: '-1 quality', qualityMod: -1 },
  { name: 'Paparazzi Swarm', type: 'bad', effect: '-2 quality', qualityMod: -2 },
  { name: 'Studio Interference', type: 'bad', effect: '-1 quality, -$2M', qualityMod: -1, budgetMod: -2 },
  { name: 'Weather Disaster', type: 'bad', effect: '-2 quality', qualityMod: -2 },
  { name: 'Equipment Failure', type: 'bad', effect: '-1 quality, -$1M', qualityMod: -1, budgetMod: -1 },
];

const NEUTRAL_CARDS: Omit<ProductionCard, 'id'>[] = [
  { name: 'Test Screening', type: 'neutral', effect: 'No effect — audience feedback', qualityMod: 0 },
  { name: 'Press Junket', type: 'neutral', effect: '+$1M publicity', qualityMod: 0, budgetMod: 1 },
  { name: 'Rewrites', type: 'neutral', effect: 'A gamble — +1 or -1 quality', qualityMod: 0 }, // resolved at draw time
];

export function buildProductionDeck(totalHeat: number): ProductionCard[] {
  const deck: ProductionCard[] = [];
  // Base: 7 good, 3 neutral, 2 bad
  for (let i = 0; i < 7; i++) {
    const c = GOOD_CARDS[Math.floor(Math.random() * GOOD_CARDS.length)];
    deck.push({ ...c, id: uid() });
  }
  for (let i = 0; i < 3; i++) {
    const c = NEUTRAL_CARDS[Math.floor(Math.random() * NEUTRAL_CARDS.length)];
    // Resolve Rewrites at deck-build time
    const card = { ...c, id: uid() };
    if (card.name === 'Rewrites') {
      card.qualityMod = Math.random() > 0.5 ? 1 : -1;
      card.effect = card.qualityMod > 0 ? 'Rewrites paid off! +1 quality' : 'Rewrites made it worse. -1 quality';
    }
    deck.push(card);
  }
  for (let i = 0; i < 2; i++) {
    const c = BAD_CARDS[Math.floor(Math.random() * BAD_CARDS.length)];
    deck.push({ ...c, id: uid() });
  }
  // Heat scaling: +1 good, +1 bad per heat (above 6: +1G, +2B)
  for (let h = 0; h < totalHeat; h++) {
    const g = GOOD_CARDS[Math.floor(Math.random() * GOOD_CARDS.length)];
    deck.push({ ...g, id: uid() });
    const b = BAD_CARDS[Math.floor(Math.random() * BAD_CARDS.length)];
    deck.push({ ...b, id: uid() });
    if (h >= 6) {
      const b2 = BAD_CARDS[Math.floor(Math.random() * BAD_CARDS.length)];
      deck.push({ ...b2, id: uid() });
    }
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// --- MARKET CONDITIONS ---
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

// --- STUDIO PERKS ---
export const ALL_PERKS: Omit<StudioPerk, 'id'>[] = [
  { name: 'Reshoots Budget', cost: 12, description: 'Redraw 1 production card per film', effect: 'reshoots' },
  { name: 'Casting Network', cost: 8, description: 'See 6 talent in market instead of 4', effect: 'moreTalent' },
  { name: 'Marketing Machine', cost: 10, description: 'Choose your market condition', effect: 'chooseMarket' },
  { name: 'Independent Spirit', cost: 6, description: 'If total Heat ≤ 4, +×0.5 mult', effect: 'indieSpirit' },
  { name: 'Genre Specialist', cost: 5, description: 'Pick a genre for permanent +×0.3', effect: 'genreSpec' },
  { name: 'Crisis Manager', cost: 8, description: 'Bad card effects halved', effect: 'crisisManager' },
  { name: 'Buzz Machine', cost: 10, description: 'If quality > 35, +×0.5 mult', effect: 'buzz' },
  { name: 'Insurance Policy', cost: 15, description: 'Disasters reduce quality 25% instead of 50%', effect: 'insurance' },
  { name: 'Method Studio', cost: 8, description: '+1 extra good card per 2 Heat', effect: 'methodStudio' },
  { name: 'Prestige Label', cost: 12, description: 'Award nominations give +×0.3 mult', effect: 'prestige' },
  { name: 'Talent Scout', cost: 7, description: 'Peek at blind-draw talent', effect: 'talentScout' },
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
  // Slightly softened early targets: 22, 38, 52, 65, 85
  return [22, 38, 52, 65, 85][season - 1] || 85 + (season - 5) * 20;
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
