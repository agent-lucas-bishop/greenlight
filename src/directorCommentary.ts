/**
 * R309: Director's Commentary — procedurally generated flavor text for each film.
 * References actual genre, budget, quality tier, box office, and season context.
 */

import type { Genre, RewardTier } from './types';

interface FilmContext {
  title: string;
  genre: Genre;
  quality: number;
  boxOffice: number;
  tier: RewardTier;
  budget: number; // studio budget at time of production
  season: number;
  hitTarget: boolean;
  nominated: boolean;
  criticScore?: number;
  isDisaster?: boolean; // quality <= 0
  totalFilms: number; // films made so far (including this one)
  hadPreviousFlop: boolean;
  hadPreviousBlockbuster: boolean;
  isFirstFilm: boolean;
}

// ── Template fragments ──

const GENRE_FLAVOR: Record<Genre, string[]> = {
  'Horror': [
    'the scares landed exactly where they needed to',
    'audiences slept with the lights on for weeks',
    'the jump scares alone were worth the price of admission',
    'we shot most of it in practical darkness — the crew hated us',
    'the test screening had three walkouts. We took that as a compliment',
  ],
  'Action': [
    'the stunt team earned every penny',
    'we blew through the pyrotechnics budget in week one',
    'the chase sequence alone took six weeks to shoot',
    'insurance premiums went through the roof',
    'the lead did their own stunts — we aged ten years watching',
  ],
  'Comedy': [
    'the blooper reel is longer than the actual film',
    'half the best lines were improvised on set',
    'the crew couldn\'t keep a straight face during dailies',
    'we rewrote the third act four times to stick the landing',
    'test audiences laughed in all the wrong places — then we leaned into it',
  ],
  'Drama': [
    'there wasn\'t a dry eye in the editing room',
    'the performances carried every scene',
    'we knew we had something special after the first table read',
    'the cinematographer deserves half the credit',
    'it\'s the kind of film that stays with you for days',
  ],
  'Sci-Fi': [
    'the VFX team pulled off miracles on a deadline',
    'world-building took longer than actual production',
    'we built entire languages for background characters',
    'the concept art alone could fill a gallery',
    'somewhere between the third and fourth draft, the science actually started making sense',
  ],
  'Romance': [
    'the chemistry between leads was undeniable',
    'we shot the climax at golden hour — one take, no safety net',
    'the soundtrack did half the emotional heavy lifting',
    'audiences brought tissues. Smart audiences brought two packs',
    'every frame of the third act was color-graded to perfection',
  ],
  'Thriller': [
    'the twist was locked in a safe until premiere night',
    'test audiences genuinely gasped at the reveal',
    'we planted clues so subtle even the editor missed one',
    'the tension in the editing bay was almost as thick as on screen',
    'half the crew didn\'t know the ending until the final cut',
  ],
};

const BUDGET_LOW = [
  'With a shoestring budget',
  'On what some would call an "ambitious" budget',
  'Scraping together every dollar we had',
  'With more passion than money',
  'Working with lunch money by Hollywood standards',
];

const BUDGET_MID = [
  'With a solid but modest budget',
  'With enough money to do things right',
  'Working within reasonable means',
  'With the kind of budget that demands efficiency',
];

const BUDGET_HIGH = [
  'With the studio\'s full backing',
  'Armed with a blockbuster-sized war chest',
  'With a budget that could fund a small country',
  'When the studio writes a check that big, expectations follow',
  'Money was no object — which is both a blessing and a curse',
];

const BLOCKBUSTER_REACTIONS = [
  'The result? Pure box office gold.',
  'It paid off beyond anyone\'s wildest projections.',
  'The numbers came in and the champagne flowed.',
  'We didn\'t just hit the target — we obliterated it.',
  'The accountants actually smiled. That never happens.',
  'Hollywood took notice. Everyone took notice.',
];

const SMASH_REACTIONS = [
  'A genuine crowd-pleaser that delivered.',
  'The kind of solid return that keeps studios alive.',
  'Not the biggest hit ever, but nothing to sneeze at.',
  'The trades called it "a smart investment." We\'ll take it.',
];

const HIT_REACTIONS = [
  'It found its audience, even if it wasn\'t everyone.',
  'Modest returns, but the film has its defenders.',
  'Not every film needs to break records.',
  'It performed... adequately. The board used that exact word.',
];

const FLOP_REACTIONS = [
  'The less said about the box office, the better.',
  'It tanked. There\'s really no other word for it.',
  'The premiere was electric. The second weekend... less so.',
  'Some films are ahead of their time. This one was just behind.',
  'We learned a lot. Expensive lessons, but lessons nonetheless.',
];

const DISASTER_REACTIONS = [
  'An absolute catastrophe. The insurance company sent flowers.',
  'Everything that could go wrong did go wrong — then found new ways to go wrong.',
  'The production was cursed from day one. We should have listened to the signs.',
  'A cautionary tale for every film school in the country.',
];

const FIRST_FILM = [
  'For our very first production, ',
  'Starting the studio\'s journey, ',
  'On our inaugural film, ',
  'For the debut that would define us, ',
];

const NOMINATED_SUFFIX = [
  ' The awards buzz started before it even left theaters.',
  ' And then the nominations came rolling in.',
  ' Critics and audiences agreed: this one was special.',
  ' The festival circuit loved it almost as much as we did.',
];

const COMEBACK = [
  'After the last film\'s stumble, we needed this.',
  'This was a redemption story, on and off screen.',
  'After licking our wounds, we came back swinging.',
];

const STREAK = [
  'Another one for the win column. The streak continues.',
  'At this point, people were starting to wonder if we could miss.',
  'Back-to-back successes. The studio was on fire.',
];

// ── Seeded random ──

function seededPick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function simpleHash(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// ── Main generator ──

export function generateDirectorCommentary(ctx: FilmContext): string {
  const seed = simpleHash(ctx.title + ctx.genre + ctx.season);
  const parts: string[] = [];

  // Opening: budget context
  let budgetPhrase: string;
  if (ctx.budget <= 8) {
    budgetPhrase = seededPick(BUDGET_LOW, seed);
  } else if (ctx.budget <= 30) {
    budgetPhrase = seededPick(BUDGET_MID, seed + 1);
  } else {
    budgetPhrase = seededPick(BUDGET_HIGH, seed + 2);
  }

  // First film special opener
  if (ctx.isFirstFilm) {
    parts.push(seededPick(FIRST_FILM, seed + 3));
  }

  // Combine budget + genre flavor
  const genreFlavor = seededPick(GENRE_FLAVOR[ctx.genre] || GENRE_FLAVOR['Drama'], seed + 4);

  if (ctx.isDisaster) {
    parts.push(`${budgetPhrase}, we set out to make "${ctx.title}" — a ${ctx.genre.toLowerCase()} that ${genreFlavor}. At least, that was the plan.`);
    parts.push(seededPick(DISASTER_REACTIONS, seed + 5));
  } else {
    parts.push(`${budgetPhrase}, we brought "${ctx.title}" to life — a ${ctx.genre.toLowerCase()} where ${genreFlavor}.`);

    // Result reaction
    if (ctx.tier === 'BLOCKBUSTER') {
      parts.push(seededPick(BLOCKBUSTER_REACTIONS, seed + 5));
    } else if (ctx.tier === 'SMASH') {
      parts.push(seededPick(SMASH_REACTIONS, seed + 5));
    } else if (ctx.tier === 'HIT') {
      parts.push(seededPick(HIT_REACTIONS, seed + 5));
    } else {
      parts.push(seededPick(FLOP_REACTIONS, seed + 5));
    }
  }

  // Box office specific color
  if (ctx.boxOffice >= 50) {
    parts.push(`$${ctx.boxOffice.toFixed(1)}M at the box office — the kind of number that gets your calls returned.`);
  } else if (ctx.boxOffice >= 20) {
    parts.push(`$${ctx.boxOffice.toFixed(1)}M — respectable numbers in a tough market.`);
  } else if (ctx.boxOffice < 5 && ctx.tier !== 'BLOCKBUSTER') {
    parts.push(`$${ctx.boxOffice.toFixed(1)}M. We don\'t talk about the numbers.`);
  }

  // Context-dependent extras
  if (ctx.nominated) {
    parts.push(seededPick(NOMINATED_SUFFIX, seed + 6));
  }

  if (ctx.hadPreviousFlop && (ctx.tier === 'BLOCKBUSTER' || ctx.tier === 'SMASH')) {
    parts.push(seededPick(COMEBACK, seed + 7));
  }

  if (ctx.hadPreviousBlockbuster && ctx.tier === 'BLOCKBUSTER') {
    parts.push(seededPick(STREAK, seed + 8));
  }

  // Critic score mention
  if (ctx.criticScore !== undefined) {
    if (ctx.criticScore >= 80) {
      parts.push(`Critics gave it ${ctx.criticScore}% fresh — practically unheard of.`);
    } else if (ctx.criticScore <= 30) {
      parts.push(`The critics were... unkind. ${ctx.criticScore}% fresh. We disagree, for the record.`);
    }
  }

  return parts.join(' ');
}

// ── Generate poster seed ──

export function generatePosterSeed(title: string, genre: Genre, season: number): number {
  return simpleHash(`${title}:${genre}:${season}:poster`);
}
