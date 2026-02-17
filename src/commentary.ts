/**
 * R298: Director's Commentary System
 * Contextual flavor text and behind-the-scenes insights during gameplay.
 */

export type CommentaryCategory = 'production' | 'trivia' | 'strategy' | 'meta' | 'milestone';

export interface CommentarySnippet {
  id: string;
  text: string;
  category: CommentaryCategory;
  /** Keywords/genres that trigger this snippet contextually */
  triggers: string[];
}

const COMMENTARY: CommentarySnippet[] = [
  // ── Film Production Tips ────────────────────────────────────
  { id: 'prod01', text: 'Horror films with low budgets historically outperform expectations. The Blair Witch Project cost $60K and made $248M.', category: 'production', triggers: ['horror', 'budget_low'] },
  { id: 'prod02', text: 'The "rule of thirds" applies to budgets too — a third on talent, a third on production, a third on marketing.', category: 'production', triggers: ['budget_high', 'greenlight'] },
  { id: 'prod03', text: 'Practical effects age better than CGI. Something to consider when the budget\'s tight.', category: 'production', triggers: ['sci-fi', 'action', 'budget_low'] },
  { id: 'prod04', text: 'Test screenings have saved — and doomed — more films than any executive decision.', category: 'production', triggers: ['release', 'postproduction'] },
  { id: 'prod05', text: 'Most films shoot 3-5x more footage than ends up in the final cut.', category: 'production', triggers: ['production'] },
  { id: 'prod06', text: 'The best directors know when to throw the script away and follow the moment.', category: 'production', triggers: ['production', 'drama'] },
  { id: 'prod07', text: 'Color grading can completely transform the mood of a film. Blue = cold, orange = warm. Hollywood loves that combo.', category: 'production', triggers: ['postproduction'] },
  { id: 'prod08', text: 'Sound design is 50% of the movie experience. Audiences feel it before they see it.', category: 'production', triggers: ['horror', 'thriller', 'production'] },
  { id: 'prod09', text: 'The "golden hour" — that perfect light right before sunset — has launched a thousand cinematography careers.', category: 'production', triggers: ['romance', 'drama', 'production'] },
  { id: 'prod10', text: 'A good editor can save a bad film. A bad editor can ruin a great one.', category: 'production', triggers: ['postproduction'] },

  // ── Industry Trivia ─────────────────────────────────────────
  { id: 'triv01', text: 'The average Hollywood film costs $65M to produce — and another $35M to market.', category: 'trivia', triggers: ['greenlight', 'budget_high'] },
  { id: 'triv02', text: 'Only about 1 in 10 Hollywood films turns a theatrical profit. The rest rely on streaming and home video.', category: 'trivia', triggers: ['release', 'flop'] },
  { id: 'triv03', text: 'The first horror film ever made was "Le Manoir du Diable" in 1896. Just three minutes long.', category: 'trivia', triggers: ['horror'] },
  { id: 'triv04', text: 'Romantic comedies dominated the \'90s box office but have largely migrated to streaming.', category: 'trivia', triggers: ['romance', 'comedy'] },
  { id: 'triv05', text: 'The longest Oscar acceptance speech was Greer Garson\'s in 1943 — nearly six minutes.', category: 'trivia', triggers: ['milestone', 'festival'] },
  { id: 'triv06', text: 'The word "blockbuster" originally referred to a bomb powerful enough to destroy a city block.', category: 'trivia', triggers: ['blockbuster'] },
  { id: 'triv07', text: 'In 1975, Jaws invented the summer blockbuster — and terrified a generation out of the ocean.', category: 'trivia', triggers: ['action', 'thriller', 'blockbuster'] },
  { id: 'triv08', text: 'The Wilhelm Scream has appeared in over 400 films. You\'ve heard it. You just don\'t know it.', category: 'trivia', triggers: ['action', 'production'] },
  { id: 'triv09', text: 'South Korea\'s film industry went from censorship to Parasite winning Best Picture in just 30 years.', category: 'trivia', triggers: ['drama', 'thriller'] },
  { id: 'triv10', text: 'The average movie trailer is 2 minutes 30 seconds. Studios have tested this down to the second.', category: 'trivia', triggers: ['release', 'greenlight'] },

  // ── Strategic Hints ─────────────────────────────────────────
  { id: 'strat01', text: 'Sequels to hit films have a 70% higher greenlight rate — and a built-in audience.', category: 'strategy', triggers: ['greenlight', 'blockbuster'] },
  { id: 'strat02', text: 'Diversifying genres reduces risk. A horror flop hurts less when your comedy is printing money.', category: 'strategy', triggers: ['greenlight'] },
  { id: 'strat03', text: 'High-budget films have higher ceilings but also deeper floors. Risk and reward, always.', category: 'strategy', triggers: ['budget_high', 'greenlight'] },
  { id: 'strat04', text: 'Genre mastery compounds. Sticking with what you know can be just as valid as diversifying.', category: 'strategy', triggers: ['greenlight'] },
  { id: 'strat05', text: 'Sometimes the best move is the cheapest script. Live to fight another season.', category: 'strategy', triggers: ['budget_low', 'greenlight'] },
  { id: 'strat06', text: 'A-list talent costs more but brings audience draw. The math usually works out... usually.', category: 'strategy', triggers: ['casting', 'budget_high'] },
  { id: 'strat07', text: 'Pay attention to market trends. Swimming against the current is brave — but expensive.', category: 'strategy', triggers: ['greenlight'] },
  { id: 'strat08', text: 'Your reputation is your currency. Guard it like the studio depends on it — because it does.', category: 'strategy', triggers: ['flop', 'release'] },
  { id: 'strat09', text: 'Card synergies are the secret sauce. A well-built deck outperforms raw talent every time.', category: 'strategy', triggers: ['production'] },
  { id: 'strat10', text: 'The shop between seasons is where moguls are made. Invest wisely.', category: 'strategy', triggers: ['shop'] },

  // ── Meta Humor ──────────────────────────────────────────────
  { id: 'meta01', text: 'Your studio\'s accounting department is getting nervous. They always are, though.', category: 'meta', triggers: ['budget_low'] },
  { id: 'meta02', text: 'Somewhere, a film critic is sharpening their pen. They can smell a new release.', category: 'meta', triggers: ['release'] },
  { id: 'meta03', text: 'The board of directors just ordered more antacids. Standard procedure around here.', category: 'meta', triggers: ['budget_low', 'flop'] },
  { id: 'meta04', text: 'Fun fact: your studio lot has a coffee machine that costs more per year than some indie films.', category: 'meta', triggers: ['budget_high', 'greenlight'] },
  { id: 'meta05', text: 'Your intern just pitched a film about a game where you run a film studio. How meta.', category: 'meta', triggers: ['greenlight'] },
  { id: 'meta06', text: 'The catering budget alone could fund a documentary. Priorities.', category: 'meta', triggers: ['production', 'budget_high'] },
  { id: 'meta07', text: 'A screenwriter somewhere just whispered "it\'s about the journey" and meant it unironically.', category: 'meta', triggers: ['drama', 'production'] },
  { id: 'meta08', text: 'Your publicist is already drafting the "creative differences" press release. Just in case.', category: 'meta', triggers: ['production'] },
  { id: 'meta09', text: 'Legend has it, if you greenlight three horror films in a row, the studio lights flicker at midnight.', category: 'meta', triggers: ['horror', 'greenlight'] },
  { id: 'meta10', text: 'The studio cat just walked across the budget spreadsheet. Honestly, might improve things.', category: 'meta', triggers: ['budget_low'] },

  // ── Milestone Reactions ─────────────────────────────────────
  { id: 'mile01', text: 'Your first blockbuster! Every mogul remembers theirs. Frame that box office report.', category: 'milestone', triggers: ['first_blockbuster'] },
  { id: 'mile02', text: 'A flop? Every legendary studio has one. It\'s character building. Expensive character building.', category: 'milestone', triggers: ['first_flop'] },
  { id: 'mile03', text: 'Season 5 already? You\'ve outlasted most real studio executives.', category: 'milestone', triggers: ['season_5'] },
  { id: 'mile04', text: 'Ten films produced. You\'re officially not a one-hit wonder anymore.', category: 'milestone', triggers: ['films_10'] },
  { id: 'mile05', text: '$500M total box office! The trade papers are writing profiles about you now.', category: 'milestone', triggers: ['box_office_500'] },
  { id: 'mile06', text: 'Three blockbusters in a row? That\'s not luck anymore — that\'s a golden touch.', category: 'milestone', triggers: ['streak_3'] },
  { id: 'mile07', text: 'You survived your first strike. The studio\'s still standing. That counts for something.', category: 'milestone', triggers: ['first_strike'] },
  { id: 'mile08', text: 'A billion dollars in total earnings. You could buy a small island. Or greenlight one more film.', category: 'milestone', triggers: ['box_office_1000'] },
  { id: 'mile09', text: 'Festival recognition! Your films aren\'t just profitable — they\'re art. (Don\'t let the board hear that.)', category: 'milestone', triggers: ['festival'] },
  { id: 'mile10', text: 'You\'ve mastered a genre. Specialists in Hollywood are either celebrated or typecast. Why not both?', category: 'milestone', triggers: ['genre_mastery'] },
];

// ── Seen tracking ─────────────────────────────────────────────

const SEEN_KEY = 'greenlight-commentary-seen';

function getSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function markSeen(id: string) {
  const seen = getSeenIds();
  seen.add(id);
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch {}
}

// ── Toggle ────────────────────────────────────────────────────

const ENABLED_KEY = 'greenlight-commentary-enabled';

export function isCommentaryEnabled(): boolean {
  try {
    const val = localStorage.getItem(ENABLED_KEY);
    return val === null ? true : val === 'true'; // default ON
  } catch { return true; }
}

export function setCommentaryEnabled(on: boolean) {
  try { localStorage.setItem(ENABLED_KEY, String(on)); } catch {}
}

// ── Context-based selection ───────────────────────────────────

export interface CommentaryContext {
  phase: string;
  genre?: string;
  budget?: number;
  budgetMax?: number;
  lastTier?: string | null;
  season?: number;
  totalFilms?: number;
  totalBoxOffice?: number;
  blockbusterStreak?: number;
  strikes?: number;
  festivalResult?: boolean;
  firstBlockbuster?: boolean;
  firstFlop?: boolean;
  firstStrike?: boolean;
  genreMastery?: boolean;
}

/**
 * Pick the best commentary snippet for the current context.
 * Returns null if commentary is disabled or nothing matches.
 */
export function pickCommentary(ctx: CommentaryContext): CommentarySnippet | null {
  if (!isCommentaryEnabled()) return null;

  // Build context tags for matching
  const tags = new Set<string>();
  
  // Phase
  tags.add(ctx.phase.toLowerCase());
  
  // Genre
  if (ctx.genre) tags.add(ctx.genre.toLowerCase());
  
  // Budget context
  if (ctx.budget !== undefined && ctx.budgetMax !== undefined) {
    if (ctx.budget < ctx.budgetMax * 0.3) tags.add('budget_low');
    if (ctx.budget > ctx.budgetMax * 0.7) tags.add('budget_high');
  } else if (ctx.budget !== undefined) {
    if (ctx.budget < 15) tags.add('budget_low');
    if (ctx.budget > 50) tags.add('budget_high');
  }
  
  // Result tiers
  if (ctx.lastTier === 'BLOCKBUSTER') tags.add('blockbuster');
  if (ctx.lastTier === 'FLOP') tags.add('flop');
  
  // Milestones
  if (ctx.firstBlockbuster) tags.add('first_blockbuster');
  if (ctx.firstFlop) tags.add('first_flop');
  if (ctx.firstStrike) tags.add('first_strike');
  if (ctx.season && ctx.season >= 5) tags.add('season_5');
  if (ctx.totalFilms && ctx.totalFilms >= 10) tags.add('films_10');
  if (ctx.totalBoxOffice && ctx.totalBoxOffice >= 500) tags.add('box_office_500');
  if (ctx.totalBoxOffice && ctx.totalBoxOffice >= 1000) tags.add('box_office_1000');
  if (ctx.blockbusterStreak && ctx.blockbusterStreak >= 3) tags.add('streak_3');
  if (ctx.festivalResult) tags.add('festival');
  if (ctx.genreMastery) tags.add('genre_mastery');

  // Score each snippet by how many triggers match
  const seen = getSeenIds();
  const scored = COMMENTARY
    .map(snippet => {
      const matchCount = snippet.triggers.filter(t => tags.has(t)).length;
      return { snippet, matchCount };
    })
    .filter(s => s.matchCount > 0) // must match at least one trigger
    .sort((a, b) => {
      // Prefer unseen
      const aUnseen = seen.has(a.snippet.id) ? 0 : 1;
      const bUnseen = seen.has(b.snippet.id) ? 0 : 1;
      if (aUnseen !== bUnseen) return bUnseen - aUnseen;
      // Then by match count
      return b.matchCount - a.matchCount;
    });

  if (scored.length === 0) return null;

  // Pick from top candidates with some randomness
  const topScore = scored[0].matchCount;
  const candidates = scored.filter(s => s.matchCount >= topScore - 1).slice(0, 5);
  const pick = candidates[Math.floor(Math.random() * candidates.length)].snippet;
  
  markSeen(pick.id);
  return pick;
}
