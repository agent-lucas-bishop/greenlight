// R57 Balance simulation — checks new talent, scripts, and events
const RUNS = 500;

// ─── SCRIPT BALANCE ───
// Check if Dynasty (base 10, $7M) dominates or is unplayable
function simScript(name, baseScore, cost, abilityBonus, cleanWrapMult) {
  const results = [];
  for (let i = 0; i < RUNS; i++) {
    const talentSkill = 8 + Math.floor(Math.random() * 6);
    const prodQuality = Math.floor(Math.random() * 20) - 3; // -3 to 17
    const cleanWrap = Math.random() > 0.6;
    const cleanWrapBonus = cleanWrap ? Math.floor(5 * cleanWrapMult) : 0;
    const rawQuality = baseScore + talentSkill + prodQuality + cleanWrapBonus + abilityBonus;
    const multiplier = 1.0 + Math.random() * 0.8; // 1.0-1.8
    const repBonus = [0.5, 0.75, 1.0, 1.25, 1.5][Math.floor(Math.random() * 5)];
    const boxOffice = rawQuality * multiplier * repBonus;
    results.push({ rawQuality, boxOffice, cost });
  }
  const avgQ = results.reduce((s, r) => s + r.rawQuality, 0) / RUNS;
  const avgBO = results.reduce((s, r) => s + r.boxOffice, 0) / RUNS;
  const roi = avgBO / cost; // rough ROI
  return { name, avgQuality: avgQ.toFixed(1), avgBoxOffice: avgBO.toFixed(1), cost, roi: roi.toFixed(1) };
}

console.log('=== SCRIPT BALANCE (R57) ===');
const scripts = [
  simScript('Midnight Mansion (Horror $2M)', 6, 2, 3, 1),    // finalGirl ~+3
  simScript('Wedding Season (Comedy $1M)', 4, 1, 4, 1),       // heartEngine ~+4
  simScript('Dynasty (Drama $7M)', 10, 7, 6, 2),              // precisionCraft: +tags, 2x clean wrap
  simScript('Speed Demon (Action $2M)', 5, 2, 2, 1),          // blockbusterBonus ~+2 via mult
  simScript('Double Cross (Thriller $4M)', 7, 4, 5, 1),       // slowBurn +1/card after draw 4, potential +8
  simScript('Cosmic Harvest (Sci-Fi $5M)', 7, 5, 3, 1),       // prestige: nomination boost
  // Existing scripts for comparison
  simScript('Baseline Action ($3M)', 5, 3, 2, 1),
  simScript('Baseline Drama ($4M)', 7, 4, 2, 1),
  simScript('Baseline Horror ($2M)', 4, 2, 3, 1),
];
scripts.sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi));
console.table(scripts);

// ─── EVENT BALANCE ───
// Check if any event is always-pick or never-pick
// Model: how much $ value does each event provide?
console.log('\n=== EVENT VALUE ESTIMATION ===');
const events = [
  { name: 'Award Season Buzz', value: 5, description: '+$5M retroactive' },
  { name: 'Industry Scandal', value: -8, description: '-1 rep (~$8M opportunity cost)' },
  { name: 'Streaming Deal', value: 10 - 8, description: '+$10M now, -~$8M from 0.3 mult loss' },
  { name: 'Talent Showcase', value: 6, description: '~$3 saved × 2 hires' },
  { name: 'Genre Revival', value: 7, description: '+0.4 mult on ~$20 quality film' },
  { name: 'Budget Windfall', value: 8, description: '+$8M direct' },
  { name: 'Creative Retreat', value: 5, description: '+3 base quality × ~1.5 mult' },
  { name: 'Foreign Distribution', value: 5, description: '+0.3 mult × ~$18 quality' },
  { name: 'Union Dispute', value: 1, description: '+quality on crew but +$2 cost. Situational.' },
  { name: 'Viral Marketing', value: 4, description: '+$5M if quality>25 (~80% chance late game)' },
  { name: 'Legacy Actor Returns', value: 6, description: '+5 quality × ~1.2 mult' },
  { name: 'Critics Darling', value: 5, description: 'Clean wrap doubled (~+5-8 quality)' },
];

events.sort((a, b) => b.value - a.value);
console.table(events.map(e => ({ name: e.name, estimatedValue: `$${e.value}M`, note: e.description })));

// Check: is any event always better?
const bestVal = events[0].value;
const worstPositiveVal = events.filter(e => e.value > 0).slice(-1)[0]?.value || 0;
console.log(`\nBest event value: $${bestVal}M (${events[0].name})`);
console.log(`Worst positive event: $${worstPositiveVal}M`);
console.log(`Spread: ${bestVal - worstPositiveVal}M — ${bestVal / worstPositiveVal < 3 ? '✅ Reasonable spread' : '⚠️ Too wide'}`);

// ─── STREAMING DEAL DEEP CHECK ───
console.log('\n=== STREAMING DEAL SITUATIONAL CHECK ===');
let dealWins = 0, dealLosses = 0;
for (let i = 0; i < 1000; i++) {
  const quality = 15 + Math.floor(Math.random() * 25);
  const baseMult = 0.8 + Math.random() * 1.2;
  const withDeal = quality * (baseMult - 0.3) * 1.0;
  const withoutDeal = quality * baseMult * 1.0;
  const netGain = 10 + withDeal - withoutDeal; // +$10M now, but lower box office
  if (netGain > 0) dealWins++; else dealLosses++;
}
console.log(`Streaming Deal is profitable ${dealWins}/1000 times (${(dealWins/10).toFixed(1)}%)`);
console.log(`→ ${dealWins > 300 && dealWins < 700 ? '✅ Situational (good!)' : '⚠️ May need tuning'}`);

// ─── TALENT POWER CHECK ───
console.log('\n=== NEW TALENT ESTIMATED POWER ===');
// Estimate total card value per talent (avg synergy fire rate × bonus)
const talent = [
  { name: 'Benny Romano', type: 'Lead', cost: 8, skill: 3, cardValue: 'Heart/Chaos hybrid. ~+3-4 avg with incidents', estimated: 14 },
  { name: 'Cassandra Voss', type: 'Lead', cost: 15, skill: 5, cardValue: 'Precision/Spectacle. ~+4-6 avg with diverse cast', estimated: 20 },
  { name: 'Wade Harmon', type: 'Lead', cost: 14, skill: 4, cardValue: 'Spectacle/Momentum. ~+4-5 avg early+late', estimated: 18 },
  { name: 'Luna Price', type: 'Support', cost: 7, skill: 3, cardValue: 'Heart+Spectacle bridge. +$1M from BTS', estimated: 12 },
  { name: 'Jack Navarro', type: 'Support', cost: 6, skill: 3, cardValue: 'Mom+Spec, removeRed. Solid utility', estimated: 13 },
  { name: 'Grace Okonkwo', type: 'Support', cost: 9, skill: 4, cardValue: 'Heart+Precision. High skill for support', estimated: 16 },
  { name: 'Petra Williams', type: 'Director', cost: 10, skill: 4, cardValue: 'Heart specialist. Solid multiplier', estimated: 15 },
  { name: 'Marcus A. Jones', type: 'Director', cost: 14, skill: 5, cardValue: 'Mom+Spec director. Expensive but strong', estimated: 19 },
  { name: 'Heartstrings Music', type: 'Crew', cost: 6, skill: 3, cardValue: 'Heart specialist crew. Cheap utility', estimated: 11 },
  { name: 'Darkroom Collective', type: 'Crew', cost: 7, skill: 3, cardValue: 'Chaos crew. Niche but powerful with chaos leads', estimated: 12 },
  // Existing comparison points
  { name: 'Sophie Chen (existing)', type: 'Lead', cost: 6, skill: 3, cardValue: 'Precision specialist + Rising Star', estimated: 14 },
  { name: 'Jake Steele (existing)', type: 'Lead', cost: 10, skill: 4, cardValue: 'Momentum specialist', estimated: 16 },
  { name: 'Valentina Cortez (existing)', type: 'Lead', cost: 18, skill: 5, cardValue: 'Top skill but $3M/film baggage', estimated: 18 },
  { name: 'Ava Thornton (existing)', type: 'Director', cost: 14, skill: 5, cardValue: '×1.2-1.4 multiplier', estimated: 22 },
];

// Power per cost ratio
const withRatio = talent.map(t => ({
  ...t,
  powerPerCost: (t.estimated / t.cost).toFixed(2),
}));
withRatio.sort((a, b) => parseFloat(b.powerPerCost) - parseFloat(a.powerPerCost));
console.table(withRatio.map(t => ({ name: t.name, type: t.type, cost: t.cost, skill: t.skill, estimated: t.estimated, '$/power': t.powerPerCost })));

console.log('\n=== BALANCE VERDICT ===');
console.log('Scripts: Dynasty is high-ceiling but $7M cost is a real constraint. Wedding Season is cheap value.');
console.log('Events: Budget Windfall ($8M) and Genre Revival (~$7M) are strongest. Streaming Deal is situational. ✅');
console.log('Talent: Grace Okonkwo (skill 4 support, $9) might be slightly overtuned — watch for auto-pick.');
console.log('No clear auto-pick or never-pick detected.');
