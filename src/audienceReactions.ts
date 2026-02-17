// R185: Audience Reactions & Social Media System

import { Genre, RewardTier, MarketingTier, CastSlot, Difficulty } from './types';

// ─── TYPES ───

export interface AudienceTweet {
  avatar: string;       // emoji avatar
  handle: string;       // @username
  displayName: string;
  text: string;
  likes: string;        // e.g. "12.4K"
  retweets: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface ViralEvent {
  type: 'meme_boost' | 'controversy';
  label: string;
  description: string;
  boxOfficeModifier: number; // +2M or -1M
}

export interface BuzzResult {
  level: 'low' | 'medium' | 'high' | 'extreme';
  score: number;         // 0-100
  multiplier: number;    // opening weekend multiplier (1.0 - 1.25)
  label: string;
}

export interface AudienceReaction {
  audienceScore: number;  // 0-100
  tweets: AudienceTweet[];
  viralEvent: ViralEvent | null;
  buzz: BuzzResult;
}

// ─── AVATAR & HANDLE POOLS ───

const AVATARS = ['😎', '🤓', '👩‍🎤', '🧔', '👵', '🦊', '🐸', '💀', '🤖', '🎭', '👻', '🌟', '🔥', '🍿', '🎬', '👽', '🐱', '🦄', '🤡', '🧙'];

const HANDLES = [
  'cinephile99', 'movieguy_', 'filmtwt_stan', 'popcornqueen', 'rikilikesfilms',
  'darkmovienerd', 'screenjunkiez', 'blockbuster_bro', 'arthouse_anna', 'themoviecritic',
  'hollywoodtakes', 'reeltalknow', 'casualviewer', 'scifiSarah', 'horrorHank',
  'romcomlover22', 'actionjax', 'thrillerking', 'midwestmovies', 'coastalcinema',
];

const DISPLAY_NAMES = [
  'CineNerd', 'Popcorn Takes', 'Film Twitter', 'Movie Mom', 'Screen Junkie',
  'Dark Cinema', 'Reel Talk', 'Blockbuster Bro', 'Arthouse Anna', 'The Critic',
  'Hollywood Takes', 'Weekend Viewer', 'Casual Dan', 'Genre Queen', 'Plot Twist Pete',
  'Cinema Sins', 'Director\'s Cut', 'Third Act Larry', 'Opening Night', 'Box Office Nerd',
];

// ─── TWEET TEMPLATES ───

const POSITIVE_TWEETS: Record<Genre, string[]> = {
  'Action': [
    'Just saw {title} and my jaw is still on the floor. Pure adrenaline. 🔥',
    '{title} is exactly what summer movies should be. {lead} absolutely CRUSHED it.',
    'the third act of {title} had the entire theater screaming. 10/10 popcorn flick',
    'if you don\'t see {title} in IMAX you\'re doing it wrong. the sound design alone...',
    '{title} goes SO hard. {lead} is an action god.',
  ],
  'Comedy': [
    'I haven\'t laughed this hard in a theater in YEARS. {title} is genuinely hilarious 😂',
    '{title} is comedy of the year idc what anyone says. {lead} has perfect timing.',
    'took my whole family to {title} and we were all crying laughing. go see this.',
    'the improv in {title} is insane. you can tell they had so much fun making this.',
    '{lead} in {title} is giving peak comedy. every scene lands.',
  ],
  'Drama': [
    '{title} wrecked me emotionally. {lead} deserves every award for this performance.',
    'If {title} doesn\'t get nominated I\'m rioting. Absolutely stunning filmmaking.',
    'just left {title} and I need a moment. what a film. what a FILM.',
    '{title} is the kind of movie that stays with you for days. masterful.',
    '{lead} in {title} is career-best work. the final scene... I\'m still processing.',
  ],
  'Horror': [
    '{title} is TERRIFYING. I watched half of it through my fingers. best horror in years.',
    'ok {title} actually got me. that mirror scene??? NOPE. 😱',
    '{title} proves horror is the best genre. {lead} carried that terror beautifully.',
    'do NOT watch {title} alone at night. learned that the hard way. incredible film tho.',
    'the atmosphere in {title} is suffocating in the best way. elevated horror done right.',
  ],
  'Sci-Fi': [
    '{title} is a sci-fi masterpiece. the world-building is insane.',
    'this is the sci-fi movie I\'ve been waiting for. {title} delivers on every level.',
    '{title} made me think about the universe differently. {lead} is phenomenal.',
    'the visual effects in {title} are genuinely next-level. jaw-dropping.',
    '{title} proves original sci-fi can still dominate. we don\'t need another franchise.',
  ],
  'Romance': [
    '{title} made me believe in love again 😭❤️ {lead} has incredible chemistry.',
    'the chemistry in {title} is OFF THE CHARTS. I\'m swooning.',
    'took my partner to {title} and now we\'re both ugly crying in the parking lot',
    '{title} is the romance movie of the decade. every scene is perfect.',
    '{lead} in {title}... I am looking respectfully. what a performance.',
  ],
  'Thriller': [
    '{title} kept me on the edge of my seat for two straight hours. genius.',
    'that twist in {title}... I audibly gasped. {lead} was mesmerizing.',
    '{title} is a masterclass in tension. I forgot to breathe.',
    'went in blind to {title} and WOW. do not read spoilers. just go.',
    'the pacing in {title} is flawless. hitchcock would be proud.',
  ],
};

const NEGATIVE_TWEETS: Record<Genre, string[]> = {
  'Action': [
    '{title} is just explosions with no plot. felt like a 2-hour trailer.',
    'I wanted to like {title} but it\'s the most generic action movie I\'ve ever seen.',
    '{title} proves Hollywood has run out of ideas. {lead} deserves better.',
    'fell asleep during {title}. yes, an action movie put me to sleep.',
    '{title} had potential but the CGI looked like a PS3 game. embarrassing.',
  ],
  'Comedy': [
    '{title} had maybe 2 funny moments in 2 hours. painful.',
    'who told them {title} was funny? genuinely asking.',
    '{title} is the cinematic equivalent of a dad joke that goes on too long.',
    'I didn\'t laugh once during {title}. not once. {lead} was trying too hard.',
    '{title} feels like they filmed a first draft. where were the jokes?',
  ],
  'Drama': [
    '{title} is 3 hours of people staring out windows. pretentious.',
    'I respect what {title} was trying to do but it was painfully boring.',
    '{title} thinks it\'s deeper than it is. style over substance.',
    '{lead} sleepwalked through {title}. phoning it in for the paycheck.',
    '{title} is what happens when a director has no editor. self-indulgent.',
  ],
  'Horror': [
    '{title} wasn\'t scary at all. just loud noises and jump scares.',
    'saw {title} and the scariest thing was the ticket price. generic.',
    '{title} is "elevated horror" that forgot to be either elevated or horror.',
    'the characters in {title} are so dumb it hurt to watch. horror 101 violations.',
    '{title} had a great first act then completely fell apart. disappointing.',
  ],
  'Sci-Fi': [
    '{title} has amazing visuals and absolutely nothing else. hollow.',
    'the science in {title} makes zero sense. couldn\'t suspend my disbelief.',
    '{title} wants to be Blade Runner so bad it hurts. derivative.',
    'fell asleep during {title} and woke up during the climax. didn\'t miss anything.',
    '{title} is proof that good VFX can\'t save bad writing.',
  ],
  'Romance': [
    '{title} has zero chemistry. watching two mannequins would be more romantic.',
    'if I have to watch one more {title}-type movie I\'m giving up on love.',
    '{title} is every romance cliché crammed into one painfully predictable movie.',
    '{lead} and the love interest had anti-chemistry. awkward.',
    '{title} made me roll my eyes so hard I saw my brain.',
  ],
  'Thriller': [
    'figured out the twist in {title} in the first 10 minutes. disappointing.',
    '{title} is a "thriller" with zero thrills. just people talking in rooms.',
    'the plot holes in {title} are big enough to drive a truck through.',
    '{title} thinks it\'s smarter than the audience. it is not.',
    '{lead} in {title} was miscast. the whole movie suffers for it.',
  ],
};

const NEUTRAL_TWEETS: string[] = [
  '{title} was fine. not great, not terrible. perfectly adequate cinema.',
  'saw {title} this weekend. it exists. {lead} was alright.',
  '{title}: solid 6/10. worth a matinee, not a full-price ticket.',
  'my take on {title}: technically competent but ultimately forgettable.',
  '{title} is the definition of a "wait for streaming" movie.',
];

const VIRAL_MEME_TWEETS: string[] = [
  'LMAOOO the {title} memes are killing me 💀 this movie is unintentionally iconic',
  'ok {title} is bad but in the BEST way. the theater was dying laughing',
  '{title} somehow became the movie of the year through sheer meme power. wild.',
  'my entire timeline is {title} memes and i haven\'t even seen it yet. buying tickets rn',
  'the way {title} went from "mid" to cultural phenomenon overnight is hilarious',
];

const CONTROVERSY_TWEETS: string[] = [
  'the backlash against {title} is getting intense. yikes. 😬',
  'so... that scene in {title} did NOT age well. already trending for the wrong reasons.',
  '{title} discourse has reached toxic levels. touching grass immediately.',
  'the {title} controversy is wild. idk how they didn\'t see this coming in post.',
  'film twitter has decided {title} is problematic and honestly... I kinda see it.',
];

// ─── LIKE/RT GENERATION ───

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function randomLikes(rng: () => number, tier: RewardTier, viral: boolean): string {
  const base = tier === 'BLOCKBUSTER' ? 50000 : tier === 'SMASH' ? 20000 : tier === 'HIT' ? 5000 : 1000;
  const mult = viral ? 5 : 1;
  return formatCount(Math.round((base + rng() * base * 2) * mult));
}

function randomRetweets(rng: () => number, tier: RewardTier, viral: boolean): string {
  const base = tier === 'BLOCKBUSTER' ? 15000 : tier === 'SMASH' ? 5000 : tier === 'HIT' ? 1200 : 200;
  const mult = viral ? 4 : 1;
  return formatCount(Math.round((base + rng() * base * 1.5) * mult));
}

// ─── BUZZ SYSTEM ───

export function calculateBuzz(
  castSlots: CastSlot[],
  marketingTier: MarketingTier | null | undefined,
  rng: () => number,
): BuzzResult {
  // Star power: sum of heat from all cast
  let starPower = 0;
  for (const slot of castSlots) {
    if (slot.talent) {
      starPower += slot.talent.heat;
      // Elite talent = extra buzz
      if (slot.talent.elite) starPower += 2;
      // Lead gets double weight
      if (slot.slotType === 'Lead') starPower += slot.talent.heat;
    }
  }

  // Marketing contribution
  const marketingBonus: Record<string, number> = {
    'none': 0, 'standard': 15, 'premium': 30, 'viral': 25,
  };
  const mktBonus = marketingBonus[marketingTier || 'none'] || 0;

  // Base buzz score: 0-100
  let buzzScore = Math.min(100, Math.round(starPower * 4 + mktBonus + rng() * 10));

  let level: BuzzResult['level'];
  let multiplier: number;
  let label: string;

  if (buzzScore >= 80) {
    level = 'extreme'; multiplier = 1.25; label = '🔥 EXTREME BUZZ';
  } else if (buzzScore >= 55) {
    level = 'high'; multiplier = 1.15; label = '📈 HIGH BUZZ';
  } else if (buzzScore >= 30) {
    level = 'medium'; multiplier = 1.05; label = '📊 MODERATE BUZZ';
  } else {
    level = 'low'; multiplier = 1.0; label = '📉 LOW BUZZ';
  }

  return { level, score: buzzScore, multiplier, label };
}

// ─── AUDIENCE SCORE ───

function calculateAudienceScore(
  quality: number,
  tier: RewardTier,
  genre: Genre,
  difficulty: Difficulty,
  rng: () => number,
): number {
  // Base: quality scaled to ~0-100
  let score = Math.min(100, Math.max(0, quality * 1.8 + 10));

  // Populist bias: action/comedy get a boost, drama/artsy get penalized on Indie
  const populistGenres: Genre[] = ['Action', 'Comedy', 'Horror'];
  const artsyGenres: Genre[] = ['Drama', 'Romance'];

  if (populistGenres.includes(genre)) {
    score += 8 + rng() * 5;
  } else if (artsyGenres.includes(genre) && difficulty === 'indie') {
    score -= 10 + rng() * 5;
  }

  // Tier adjustment
  if (tier === 'BLOCKBUSTER') score += 10;
  else if (tier === 'SMASH') score += 5;
  else if (tier === 'FLOP') score -= 15;

  // Random variance
  score += (rng() - 0.5) * 12;

  return Math.round(Math.min(100, Math.max(5, score)));
}

// ─── VIRAL EVENTS ───

function rollViralEvent(
  quality: number,
  tier: RewardTier,
  rng: () => number,
): ViralEvent | null {
  // Mediocre films (HIT tier, quality 20-35) have a chance to go viral via memes
  const isMediocre = tier === 'HIT' || (tier === 'SMASH' && quality < 35);
  const isGood = tier === 'SMASH' || tier === 'BLOCKBUSTER';

  const roll = rng();

  // ~8% chance for mediocre film to go viral (meme boost)
  if (isMediocre && roll < 0.08) {
    return {
      type: 'meme_boost',
      label: '🐸 GONE VIRAL!',
      description: 'Your film became an internet meme sensation!',
      boxOfficeModifier: 2, // +$2M
    };
  }

  // ~5% chance for good film to get canceled (controversy)
  if (isGood && roll < 0.05) {
    return {
      type: 'controversy',
      label: '😬 CONTROVERSY!',
      description: 'Your film sparked a social media backlash!',
      boxOfficeModifier: -1, // -$1M
    };
  }

  return null;
}

// ─── TWEET GENERATION ───

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function fillTemplate(template: string, title: string, lead?: string): string {
  let text = template.replace(/\{title\}/g, title);
  text = text.replace(/\{lead\}/g, lead || 'the lead');
  return text;
}

function generateTweets(
  title: string,
  genre: Genre,
  tier: RewardTier,
  quality: number,
  audienceScore: number,
  leadName: string | undefined,
  viralEvent: ViralEvent | null,
  rng: () => number,
): AudienceTweet[] {
  const count = 3 + Math.floor(rng() * 3); // 3-5 tweets
  const tweets: AudienceTweet[] = [];
  const usedHandles = new Set<string>();

  // Determine sentiment distribution based on audience score
  const positiveChance = audienceScore / 100;

  for (let i = 0; i < count; i++) {
    let handle: string;
    do { handle = pickRandom(HANDLES, rng); } while (usedHandles.has(handle));
    usedHandles.add(handle);

    const avatar = pickRandom(AVATARS, rng);
    const displayName = pickRandom(DISPLAY_NAMES, rng);

    let text: string;
    let sentiment: AudienceTweet['sentiment'];

    // If viral event, include 1 viral tweet
    if (viralEvent && i === 0) {
      const pool = viralEvent.type === 'meme_boost' ? VIRAL_MEME_TWEETS : CONTROVERSY_TWEETS;
      text = fillTemplate(pickRandom(pool, rng), title, leadName);
      sentiment = viralEvent.type === 'meme_boost' ? 'positive' : 'negative';
    } else if (rng() < positiveChance) {
      text = fillTemplate(pickRandom(POSITIVE_TWEETS[genre], rng), title, leadName);
      sentiment = 'positive';
    } else if (rng() < 0.3) {
      text = fillTemplate(pickRandom(NEUTRAL_TWEETS, rng), title, leadName);
      sentiment = 'neutral';
    } else {
      text = fillTemplate(pickRandom(NEGATIVE_TWEETS[genre], rng), title, leadName);
      sentiment = 'negative';
    }

    tweets.push({
      avatar,
      handle: `@${handle}`,
      displayName,
      text,
      likes: randomLikes(rng, tier, !!viralEvent && i === 0),
      retweets: randomRetweets(rng, tier, !!viralEvent && i === 0),
      sentiment,
    });
  }

  return tweets;
}

// ─── MAIN EXPORT ───

export function generateAudienceReactions(
  title: string,
  genre: Genre,
  quality: number,
  tier: RewardTier,
  difficulty: Difficulty,
  castSlots: CastSlot[],
  marketingTier: MarketingTier | null | undefined,
  rng: () => number,
): AudienceReaction {
  const leadTalent = castSlots.find(s => s.slotType === 'Lead' && s.talent)?.talent;
  const leadName = leadTalent?.name;

  const buzz = calculateBuzz(castSlots, marketingTier, rng);
  const viralEvent = rollViralEvent(quality, tier, rng);
  const audienceScore = calculateAudienceScore(quality, tier, genre, difficulty, rng);
  const tweets = generateTweets(title, genre, tier, quality, audienceScore, leadName, viralEvent, rng);

  return { audienceScore, tweets, viralEvent, buzz };
}
