import { Genre, CardTag, RewardTier, CastSlot } from './types';
import { rng } from './seededRng';

// ─── FILM TITLE GENERATOR ───
// Generates evocative titles based on genre + dominant tag

type TitleTemplate = { prefix: string; suffix: string };

const GENRE_TAG_TITLES: Record<Genre, Partial<Record<CardTag | 'default', TitleTemplate[]>>> = {
  Action: {
    momentum: [
      { prefix: 'Full', suffix: 'Throttle' },
      { prefix: 'No Brakes:', suffix: 'Terminal Velocity' },
      { prefix: 'Redline', suffix: 'Pursuit' },
      { prefix: 'Chain', suffix: 'Reaction' },
      { prefix: 'Rush', suffix: 'Hour Protocol' },
      { prefix: 'Overdrive', suffix: '' },
      { prefix: 'Breakneck', suffix: 'Speed' },
      { prefix: 'Pedal to the', suffix: 'Metal' },
    ],
    chaos: [
      { prefix: 'Blood Moon', suffix: 'Protocol' },
      { prefix: 'Total', suffix: 'Mayhem' },
      { prefix: 'When the Dust', suffix: 'Settles' },
      { prefix: 'Scorched', suffix: 'Earth' },
      { prefix: 'Wrecking', suffix: 'Crew' },
      { prefix: 'Absolute', suffix: 'Carnage' },
      { prefix: 'Firestorm', suffix: '' },
      { prefix: 'No Rules', suffix: 'Left' },
    ],
    precision: [
      { prefix: 'Surgical', suffix: 'Strike' },
      { prefix: 'Clean', suffix: 'Kill' },
      { prefix: 'The', suffix: 'Operative' },
      { prefix: 'Calculated', suffix: 'Risk' },
      { prefix: 'Zero', suffix: 'Error' },
      { prefix: 'One Shot', suffix: 'One Kill' },
      { prefix: 'Ghost', suffix: 'Protocol' },
      { prefix: 'Sniper\'s', suffix: 'Patience' },
    ],
    heart: [
      { prefix: 'Brothers in', suffix: 'Arms' },
      { prefix: 'The Last', suffix: 'Promise' },
      { prefix: 'Hold the', suffix: 'Line' },
      { prefix: 'One of', suffix: 'Us' },
      { prefix: 'Shield', suffix: 'and Sword' },
      { prefix: 'No One', suffix: 'Left Behind' },
      { prefix: 'Blood', suffix: 'Brothers' },
      { prefix: 'The', suffix: 'Oath' },
    ],
    spectacle: [
      { prefix: 'Skyfall', suffix: 'Rising' },
      { prefix: 'The Grand', suffix: 'Collapse' },
      { prefix: 'Inferno', suffix: 'Protocol' },
      { prefix: 'Titan', suffix: 'Strike' },
      { prefix: 'Event', suffix: 'Horizon' },
      { prefix: 'Detonation', suffix: 'Day' },
      { prefix: 'Ground', suffix: 'Zero' },
      { prefix: 'The Last', suffix: 'Explosion' },
    ],
    default: [
      { prefix: 'Iron', suffix: 'Dawn' },
      { prefix: 'Final', suffix: 'Command' },
      { prefix: 'Shadow', suffix: 'Force' },
      { prefix: 'Lethal', suffix: 'Edge' },
      { prefix: 'The', suffix: 'Reckoning' },
      { prefix: 'Warpath', suffix: '' },
      { prefix: 'Dead', suffix: 'Drop' },
      { prefix: 'Killswitch', suffix: '' },
    ],
  },
  Comedy: {
    chaos: [
      { prefix: 'Absolute', suffix: 'Disaster' },
      { prefix: 'Oh No,', suffix: 'Not Again' },
      { prefix: 'The', suffix: 'Meltdown' },
      { prefix: 'Plan B:', suffix: 'Panic' },
      { prefix: 'Oops,', suffix: 'My Bad' },
      { prefix: 'Catastrophe', suffix: 'Mode' },
      { prefix: 'What Could', suffix: 'Go Wrong' },
      { prefix: 'Trainwreck', suffix: 'Tuesday' },
    ],
    heart: [
      { prefix: 'Love,', suffix: 'Actually Terrible' },
      { prefix: 'The Good', suffix: 'Ones' },
      { prefix: 'Warm', suffix: 'Fuzzies' },
      { prefix: 'You Had Me at', suffix: 'Yikes' },
      { prefix: 'Best', suffix: 'Intentions' },
      { prefix: 'Group', suffix: 'Hug' },
      { prefix: 'Wholesome', suffix: 'Chaos' },
      { prefix: 'Found', suffix: 'Family' },
    ],
    momentum: [
      { prefix: 'Non-Stop', suffix: 'Nonsense' },
      { prefix: 'Too Fast,', suffix: 'Too Funny' },
      { prefix: 'Running', suffix: 'Late' },
      { prefix: 'Go Go', suffix: 'Disaster' },
      { prefix: 'Speed', suffix: 'Bumps' },
      { prefix: 'Can\'t', suffix: 'Stop Won\'t Stop' },
      { prefix: 'Full', suffix: 'Send' },
      { prefix: 'No', suffix: 'Brakes' },
    ],
    spectacle: [
      { prefix: 'The Big', suffix: 'Show' },
      { prefix: 'Maximum', suffix: 'Embarrassment' },
      { prefix: 'Grand', suffix: 'Fiasco' },
      { prefix: 'Ladies and', suffix: 'Gentlemen...' },
      { prefix: 'Showtime', suffix: 'Baby' },
      { prefix: 'Look At', suffix: 'This Mess' },
      { prefix: 'Center', suffix: 'Stage' },
      { prefix: 'The Main', suffix: 'Event' },
    ],
    precision: [
      { prefix: 'The Art of', suffix: 'the Insult' },
      { prefix: 'Perfectly', suffix: 'Awkward' },
      { prefix: 'According to', suffix: 'Plan' },
      { prefix: 'Exactly', suffix: 'Wrong' },
      { prefix: 'Methodical', suffix: 'Madness' },
      { prefix: 'Surgical', suffix: 'Comedy' },
      { prefix: 'Dry', suffix: 'Wit' },
      { prefix: 'The Setup', suffix: 'and Punchline' },
    ],
    default: [
      { prefix: 'My Big', suffix: 'Weekend' },
      { prefix: 'Totally', suffix: 'Normal' },
      { prefix: 'The Last', suffix: 'Laugh' },
      { prefix: 'Awkward', suffix: 'Pause' },
      { prefix: 'No', suffix: 'Refunds' },
      { prefix: 'It\'s', suffix: 'Complicated' },
      { prefix: 'Laugh', suffix: 'Track' },
      { prefix: 'Unhinged', suffix: '' },
    ],
  },
  Drama: {
    heart: [
      { prefix: 'Letters from', suffix: 'the Lake' },
      { prefix: 'All the Light We', suffix: 'Carry' },
      { prefix: 'The Weight of', suffix: 'Us' },
      { prefix: 'Still', suffix: 'Breathing' },
      { prefix: 'Where the Heart', suffix: 'Rests' },
      { prefix: 'The', suffix: 'Tender Hours' },
      { prefix: 'Closer Than', suffix: 'Blood' },
      { prefix: 'What We', suffix: 'Owe' },
    ],
    chaos: [
      { prefix: 'Unraveling', suffix: '' },
      { prefix: 'The', suffix: 'Collapse' },
      { prefix: 'Everything Burns', suffix: 'Slowly' },
      { prefix: 'Fractured', suffix: 'Lives' },
      { prefix: 'Coming', suffix: 'Apart' },
      { prefix: 'House of', suffix: 'Cards' },
      { prefix: 'Scorched', suffix: 'Bridges' },
      { prefix: 'The', suffix: 'Ruin' },
    ],
    precision: [
      { prefix: 'The', suffix: 'Verdict' },
      { prefix: 'Measured', suffix: 'Words' },
      { prefix: 'A Careful', suffix: 'Life' },
      { prefix: 'The', suffix: 'Arrangement' },
      { prefix: 'Composed', suffix: '' },
      { prefix: 'The', suffix: 'Deposition' },
      { prefix: 'Every', suffix: 'Detail' },
      { prefix: 'Nothing', suffix: 'Wasted' },
    ],
    momentum: [
      { prefix: 'Before It', suffix: 'Ends' },
      { prefix: 'Running', suffix: 'Out of Time' },
      { prefix: 'The', suffix: 'Urgency' },
      { prefix: 'While We', suffix: 'Still Can' },
      { prefix: 'Faster Than', suffix: 'Truth' },
      { prefix: 'Burning', suffix: 'Daylight' },
      { prefix: 'The Clock', suffix: 'Ticks' },
      { prefix: 'Last', suffix: 'Chance' },
    ],
    spectacle: [
      { prefix: 'The Grand', suffix: 'Opera' },
      { prefix: 'Kingdom', suffix: 'of Dust' },
      { prefix: 'Empire', suffix: 'of Light' },
      { prefix: 'The Gilded', suffix: 'Age' },
      { prefix: 'Monuments', suffix: '' },
      { prefix: 'A Crown', suffix: 'of Thorns' },
      { prefix: 'Palace', suffix: 'Intrigue' },
      { prefix: 'The', suffix: 'Dynasty' },
    ],
    default: [
      { prefix: 'The Weight of', suffix: 'Silence' },
      { prefix: 'Still', suffix: 'Water' },
      { prefix: 'Between', suffix: 'Everything' },
      { prefix: 'After the', suffix: 'Storm' },
      { prefix: 'Ordinary', suffix: 'Grace' },
      { prefix: 'Inheritance', suffix: '' },
      { prefix: 'The Quiet', suffix: 'Ones' },
      { prefix: 'Harbour', suffix: '' },
    ],
  },
  Horror: {
    chaos: [
      { prefix: 'Blood Moon', suffix: 'Protocol' },
      { prefix: 'The', suffix: 'Unmaking' },
      { prefix: 'Feeding', suffix: 'Frenzy' },
      { prefix: 'Viscera', suffix: '' },
      { prefix: 'All Hell', suffix: 'Breaks Loose' },
      { prefix: 'Meat', suffix: 'Grinder' },
      { prefix: 'The', suffix: 'Purge' },
      { prefix: 'Feral', suffix: '' },
    ],
    heart: [
      { prefix: 'What We', suffix: 'Buried' },
      { prefix: 'The House That', suffix: 'Loved Us' },
      { prefix: 'Dear', suffix: 'Departed' },
      { prefix: 'Those We', suffix: 'Left Behind' },
      { prefix: 'Inherited', suffix: 'Grief' },
      { prefix: 'Mother\'s', suffix: 'Lullaby' },
      { prefix: 'The', suffix: 'Mourning' },
      { prefix: 'Beloved', suffix: '' },
    ],
    precision: [
      { prefix: 'The', suffix: 'Experiment' },
      { prefix: 'Specimen', suffix: '' },
      { prefix: 'Clinical', suffix: 'Terror' },
      { prefix: 'Observed', suffix: '' },
      { prefix: 'The', suffix: 'Procedure' },
      { prefix: 'Patient', suffix: 'Zero' },
      { prefix: 'Sterile', suffix: '' },
      { prefix: 'Lab', suffix: 'Rats' },
    ],
    spectacle: [
      { prefix: 'The', suffix: 'Summoning' },
      { prefix: 'Hellgate', suffix: '' },
      { prefix: 'Apocalypse', suffix: 'Rising' },
      { prefix: 'When the Sky', suffix: 'Bleeds' },
      { prefix: 'The Great', suffix: 'Devouring' },
      { prefix: 'Leviathan', suffix: '' },
      { prefix: 'The', suffix: 'Rapture' },
      { prefix: 'Armageddon', suffix: 'Eve' },
    ],
    momentum: [
      { prefix: 'It Follows', suffix: 'Still' },
      { prefix: 'Run', suffix: '' },
      { prefix: 'Don\'t', suffix: 'Stop' },
      { prefix: 'The', suffix: 'Chase' },
      { prefix: 'Closer', suffix: 'Every Second' },
      { prefix: 'Don\'t', suffix: 'Breathe' },
      { prefix: 'It\'s', suffix: 'Behind You' },
      { prefix: 'Final', suffix: 'Sprint' },
    ],
    default: [
      { prefix: 'The', suffix: 'Hollow' },
      { prefix: 'Don\'t', suffix: 'Look' },
      { prefix: 'Below the', suffix: 'Surface' },
      { prefix: 'Last', suffix: 'Whisper' },
      { prefix: 'They', suffix: 'Watch' },
      { prefix: 'The', suffix: 'Harrowing' },
      { prefix: 'Skin', suffix: 'Deep' },
      { prefix: 'Crawl', suffix: '' },
    ],
  },
  'Sci-Fi': {
    spectacle: [
      { prefix: 'The Last', suffix: 'Cosmos' },
      { prefix: 'Stellar', suffix: 'Extinction' },
      { prefix: 'Nebula', suffix: 'Born' },
      { prefix: 'The', suffix: 'Dyson Sphere' },
      { prefix: 'Galactic', suffix: 'Dawn' },
      { prefix: 'The', suffix: 'Singularity' },
      { prefix: 'Supernova', suffix: '' },
      { prefix: 'Cosmic', suffix: 'Requiem' },
    ],
    precision: [
      { prefix: 'Algorithm', suffix: '' },
      { prefix: 'The', suffix: 'Equation' },
      { prefix: 'Quantum', suffix: 'Lock' },
      { prefix: 'Recursive', suffix: '' },
      { prefix: 'Probability', suffix: 'Zero' },
      { prefix: 'Proof of', suffix: 'Concept' },
      { prefix: 'The', suffix: 'Theorem' },
      { prefix: 'Binary', suffix: '' },
    ],
    chaos: [
      { prefix: 'System', suffix: 'Failure' },
      { prefix: 'The', suffix: 'Glitch' },
      { prefix: 'Entropy', suffix: '' },
      { prefix: 'Meltdown', suffix: 'Protocol' },
      { prefix: 'Unstable', suffix: 'Core' },
      { prefix: 'Cascade', suffix: 'Event' },
      { prefix: 'Critical', suffix: 'Mass' },
      { prefix: 'Rogue', suffix: 'AI' },
    ],
    heart: [
      { prefix: 'Light Years', suffix: 'from Home' },
      { prefix: 'The Last', suffix: 'Transmission' },
      { prefix: 'Echo of', suffix: 'Earth' },
      { prefix: 'Human', suffix: 'Signal' },
      { prefix: 'Remember', suffix: 'the Stars' },
      { prefix: 'Letters to', suffix: 'Mars' },
      { prefix: 'The', suffix: 'Homecoming' },
      { prefix: 'Earth', suffix: 'Mother' },
    ],
    momentum: [
      { prefix: 'Hyperdrive', suffix: '' },
      { prefix: 'Warp', suffix: 'Speed' },
      { prefix: 'Velocity', suffix: 'Unknown' },
      { prefix: 'FTL', suffix: '' },
      { prefix: 'Breakaway', suffix: '' },
      { prefix: 'Launch', suffix: 'Window' },
      { prefix: 'Escape', suffix: 'Velocity' },
      { prefix: 'Lightspeed', suffix: '' },
    ],
    default: [
      { prefix: 'Neon', suffix: 'Frontier' },
      { prefix: 'Beyond', suffix: 'Orbit' },
      { prefix: 'The Last', suffix: 'Signal' },
      { prefix: 'Zero', suffix: 'Point' },
      { prefix: 'Star', suffix: 'Colony' },
      { prefix: 'Andromeda', suffix: '' },
      { prefix: 'Terraform', suffix: '' },
      { prefix: 'The Void', suffix: '' },
    ],
  },
  Romance: {
    heart: [
      { prefix: 'All I', suffix: 'Ever Wanted' },
      { prefix: 'Letters We', suffix: 'Never Sent' },
      { prefix: 'The Space', suffix: 'Between Us' },
      { prefix: 'Yours,', suffix: 'Truly' },
      { prefix: 'When You', suffix: 'Left' },
    ],
    chaos: [
      { prefix: 'Love in the Time of', suffix: 'Disaster' },
      { prefix: 'Beautifully', suffix: 'Messy' },
      { prefix: 'Tangled', suffix: 'Hearts' },
      { prefix: 'The Worst', suffix: 'Timing' },
      { prefix: 'Complicated', suffix: '' },
    ],
    spectacle: [
      { prefix: 'A Paris', suffix: 'Affair' },
      { prefix: 'The Grand', suffix: 'Romance' },
      { prefix: 'Dancing Under', suffix: 'the Stars' },
      { prefix: 'Midnight in', suffix: 'Venice' },
      { prefix: 'The', suffix: 'Gala' },
    ],
    precision: [
      { prefix: 'The Rules of', suffix: 'Attraction' },
      { prefix: 'Calculated', suffix: 'Chemistry' },
      { prefix: 'By the', suffix: 'Numbers' },
      { prefix: 'A Logical', suffix: 'Heart' },
      { prefix: 'Terms of', suffix: 'Endearment' },
    ],
    momentum: [
      { prefix: 'Fast', suffix: 'Hearts' },
      { prefix: 'Before', suffix: 'Dawn' },
      { prefix: 'One More', suffix: 'Night' },
      { prefix: 'Running', suffix: 'to You' },
      { prefix: 'Can\'t', suffix: 'Wait' },
    ],
    default: [
      { prefix: 'Before', suffix: 'Sunrise' },
      { prefix: 'Letters to', suffix: 'Paris' },
      { prefix: 'One More', suffix: 'Chance' },
      { prefix: 'The Way', suffix: 'Home' },
      { prefix: 'Always', suffix: 'You' },
    ],
  },
  Thriller: {
    precision: [
      { prefix: 'The', suffix: 'Deposition' },
      { prefix: 'Airtight', suffix: '' },
      { prefix: 'No Loose', suffix: 'Ends' },
      { prefix: 'Cold', suffix: 'Calculation' },
      { prefix: 'The Perfect', suffix: 'Alibi' },
    ],
    chaos: [
      { prefix: 'Unhinged', suffix: '' },
      { prefix: 'The', suffix: 'Spiral' },
      { prefix: 'Coming', suffix: 'Undone' },
      { prefix: 'When It All', suffix: 'Falls' },
      { prefix: 'Loose', suffix: 'Cannon' },
    ],
    heart: [
      { prefix: 'Trust', suffix: 'No One' },
      { prefix: 'The Ones We', suffix: 'Suspect' },
      { prefix: 'Closer Than', suffix: 'You Think' },
      { prefix: 'Among', suffix: 'Friends' },
      { prefix: 'The Inner', suffix: 'Circle' },
    ],
    momentum: [
      { prefix: 'Ticking', suffix: 'Clock' },
      { prefix: '72', suffix: 'Hours' },
      { prefix: 'Deadline', suffix: '' },
      { prefix: 'Countdown', suffix: '' },
      { prefix: 'No Time', suffix: 'Left' },
    ],
    spectacle: [
      { prefix: 'The Grand', suffix: 'Deception' },
      { prefix: 'House of', suffix: 'Mirrors' },
      { prefix: 'The Long', suffix: 'Con' },
      { prefix: 'Smoke and', suffix: 'Mirrors' },
      { prefix: 'The', suffix: 'Illusion' },
    ],
    default: [
      { prefix: 'The', suffix: 'Informant' },
      { prefix: 'No', suffix: 'Exit' },
      { prefix: 'Behind', suffix: 'Closed Doors' },
      { prefix: 'Red', suffix: 'Line' },
      { prefix: 'Silent', suffix: 'Witness' },
    ],
  },
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function generateFilmTitle(genre: Genre, tagsPlayed?: Record<string, number>): string {
  // Find dominant tag
  let dominantTag: CardTag | 'default' = 'default';
  if (tagsPlayed) {
    let maxCount = 0;
    for (const [tag, count] of Object.entries(tagsPlayed)) {
      if (count > maxCount) { maxCount = count; dominantTag = tag as CardTag; }
    }
  }

  const genreTemplates = GENRE_TAG_TITLES[genre];
  const templates = genreTemplates[dominantTag] || genreTemplates['default'] || [];
  const t = pick(templates);
  const title = t.suffix ? `${t.prefix} ${t.suffix}` : t.prefix;
  return title;
}

// ─── CRITIC QUOTES ───

interface CriticTemplate {
  template: string; // {genre}, {title}, {lead} are replaced
}

const CRITIC_QUOTES: Record<'BLOCKBUSTER' | 'SMASH' | 'HIT' | 'FLOP', CriticTemplate[]> = {
  BLOCKBUSTER: [
    { template: '"A masterpiece. {title} will be studied for generations." — ★★★★★' },
    { template: '"Absolutely transcendent {genre_adj} filmmaking. I wept." — ★★★★★' },
    { template: '"{lead} delivers a career-defining performance in this instant classic." — ★★★★★' },
    { template: '"This {genre_adj} epic redefines what cinema can be." — ★★★★★' },
    { template: '"I haven\'t felt this alive in a theater since I was twelve." — ★★★★★' },
  ],
  SMASH: [
    { template: '"{title} is the {genre_adj} film we\'ve been waiting for." — ★★★★' },
    { template: '"Smart, stylish, and surprisingly moving. A must-see." — ★★★★' },
    { template: '"{lead} shines in a {genre_adj} triumph that sticks with you." — ★★★★' },
    { template: '"A masterclass in {genre_adj} tension. Don\'t miss it." — ★★★★' },
    { template: '"Confident filmmaking that knows exactly what it wants to be." — ★★★★' },
  ],
  HIT: [
    { template: '"{title} is solid entertainment — nothing more, nothing less." — ★★★' },
    { template: '"A competent {genre_adj} outing with a few standout moments." — ★★★' },
    { template: '"{lead} does good work, even when the script doesn\'t." — ★★★' },
    { template: '"Worth your time, if not your full attention." — ★★★' },
    { template: '"A perfectly acceptable Friday night at the movies." — ★★★' },
  ],
  FLOP: [
    { template: '"{title} is a cautionary tale in studio hubris." — ★' },
    { template: '"I wanted to like this {genre_adj} mess. I really did." — ★½' },
    { template: '"{lead} deserves better than this." — ★' },
    { template: '"Two hours of my life I\'ll never get back." — ½' },
    { template: '"The most expensive nap I\'ve ever taken." — ★' },
  ],
};

const GENRE_ADJECTIVES: Record<Genre, string[]> = {
  Action: ['action', 'action-packed', 'adrenaline-fueled'],
  Comedy: ['comedy', 'comedic', 'laugh-out-loud'],
  Drama: ['dramatic', 'emotionally raw', 'intimate'],
  Horror: ['horror', 'bone-chilling', 'nightmarish'],
  'Sci-Fi': ['sci-fi', 'speculative', 'visionary'],
  Romance: ['romantic', 'tender', 'heartfelt'],
  Thriller: ['thriller', 'pulse-pounding', 'white-knuckle'],
};

export function generateCriticQuote(
  tier: RewardTier,
  genre: Genre,
  title: string,
  leadName?: string,
): string {
  const templates = CRITIC_QUOTES[tier];
  const t = pick(templates);
  const genreAdj = pick(GENRE_ADJECTIVES[genre]);
  return t.template
    .replace('{title}', title)
    .replace('{genre_adj}', genreAdj)
    .replace('{lead}', leadName || 'The lead');
}

// ─── STUDIO NAME GENERATOR ───

const STUDIO_PREFIXES = [
  'Silver', 'Golden', 'Iron', 'Crimson', 'Midnight', 'Neon', 'Velvet',
  'Crystal', 'Shadow', 'Starlight', 'Thunder', 'Electric', 'Sapphire',
  'Emerald', 'Copper', 'Obsidian', 'Ivory', 'Cobalt', 'Amber', 'Onyx',
];

const STUDIO_SUFFIXES = [
  'Pictures', 'Studios', 'Entertainment', 'Films', 'Productions',
  'Media', 'Cinematic', 'Motion Pictures', 'Arts', 'Vision',
];

const STUDIO_TAGLINES = [
  'Where Stories Come Alive',
  'Dream Bigger',
  'Lights. Camera. Legacy.',
  'The Future of Film',
  'Making Magic Since Day One',
  'Stories Worth Telling',
  'Beyond the Screen',
  'Cinema Reimagined',
  'Every Frame Counts',
  'Bold Stories. Big Dreams.',
];

export function generateStudioName(): { name: string; tagline: string } {
  const prefix = pick(STUDIO_PREFIXES);
  const suffix = pick(STUDIO_SUFFIXES);
  const tagline = pick(STUDIO_TAGLINES);
  return { name: `${prefix} ${suffix}`, tagline };
}

// ─── ENHANCED HEADLINES ───

export function generateDetailedHeadline(
  playerFilm: { title: string; tier: RewardTier; boxOffice: number; genre: Genre },
  rivalFilms: { studioName: string; studioEmoji: string; title: string; genre: Genre; boxOffice: number; tier: RewardTier }[],
  season: number,
  totalPlayerEarnings: number,
  totalRivalEarnings: Record<string, number>,
  strikes: number,
  reputation: number,
  castSlots?: CastSlot[],
  studioName?: string,
): string {
  const allFilms = [...rivalFilms, { ...playerFilm, studioName: studioName || 'YOUR STUDIO', studioEmoji: '🎬' }];
  const topFilm = allFilms.reduce((a, b) => a.boxOffice > b.boxOffice ? a : b);
  const playerIsTop = topFilm.studioName === (studioName || 'YOUR STUDIO');
  const playerIsFlop = playerFilm.tier === 'FLOP';
  const playerIsBlockbuster = playerFilm.tier === 'BLOCKBUSTER';
  const rivalBlockbusters = rivalFilms.filter(f => f.tier === 'BLOCKBUSTER');
  const leadTalent = castSlots?.find(s => s.slotType === 'Lead' && s.talent)?.talent;
  const bo = playerFilm.boxOffice.toFixed(1);
  const studio = studioName || 'Your Studio';

  // Season 1 specifics
  if (season === 1) {
    if (playerIsBlockbuster) return `🌟 "${playerFilm.title}" Explodes with $${bo}M — ${studio} is Hollywood's Hottest New Name!`;
    if (playerIsTop) return `📰 ${studio} Takes #1 with "${playerFilm.title}" ($${bo}M)`;
    if (playerIsFlop) return `📉 "${playerFilm.title}" Opens to Dismal $${bo}M — Rough Start for ${studio}`;
    return `📰 "${playerFilm.title}" Posts Respectable $${bo}M Debut`;
  }

  // Crisis
  if (strikes >= 2) return `🚨 "${playerFilm.title}" Earns Just $${bo}M — Board Demands Answers from ${studio}`;

  // Blockbuster with lead name
  if (playerIsBlockbuster && playerIsTop && leadTalent) {
    return `🏆 ${leadTalent.name} Leads "${playerFilm.title}" to $${bo}M #1 Opening!`;
  }
  if (playerIsBlockbuster && playerIsTop) {
    return `🏆 "${playerFilm.title}" Dominates with $${bo}M — ${studio} on Top!`;
  }
  if (playerIsBlockbuster && leadTalent) {
    return `🔥 "${playerFilm.title}" Starring ${leadTalent.name} Earns Massive $${bo}M`;
  }
  if (playerIsBlockbuster) {
    return `🔥 "${playerFilm.title}" Joins the $${bo}M Club — ${playerFilm.genre} is Hot!`;
  }

  // Rival dominance
  if (rivalBlockbusters.length > 0 && playerIsFlop) {
    const rival = rivalBlockbusters[0];
    return `📰 ${rival.studioEmoji} ${rival.studioName}'s "${rival.title}" ($${rival.boxOffice.toFixed(1)}M) Towers Over the Competition`;
  }

  // Player on top but not blockbuster
  if (playerIsTop && leadTalent) {
    return `📰 ${leadTalent.name} Carries "${playerFilm.title}" to #1 with $${bo}M`;
  }
  if (playerIsTop) {
    return `📰 "${playerFilm.title}" Leads Box Office with $${bo}M Weekend`;
  }

  // Flop
  if (playerIsFlop && leadTalent) {
    return `📉 "${playerFilm.title}" Bombs at $${bo}M — ${leadTalent.name} Can't Save It`;
  }
  if (playerIsFlop) {
    return `📉 "${playerFilm.title}" Disappoints with $${bo}M — ${playerFilm.genre} Fatigue?`;
  }

  // Late game flavor
  if (season >= 4 && reputation >= 4) return `👑 ${studio} Cements A-List Status — "${playerFilm.title}" Earns $${bo}M`;
  if (season >= 4 && reputation <= 2) return `📉 ${studio} Struggles to Stay Relevant — "${playerFilm.title}" at $${bo}M`;

  // Generic but with numbers
  const generics = [
    `📰 "${playerFilm.title}" Posts $${bo}M in Competitive ${playerFilm.genre} Market`,
    `📰 Mixed Weekend: "${playerFilm.title}" Earns $${bo}M`,
    `📰 Season ${season} Sees "${playerFilm.title}" Land at $${bo}M`,
  ];
  return pick(generics);
}
