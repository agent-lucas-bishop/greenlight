// Simulate GREENLIGHT game runs — post-balance-pass
const RUNS = 200;
const results = { wins: 0, losses: 0, reasons: {}, avgSeasons: 0, avgQuality: [], tiers: { FLOP: 0, HIT: 0, SMASH: 0, BLOCKBUSTER: 0 }, disasters: 0, cleanWraps: 0, totalFilms: 0 };

function simDeck(deckSize, incidentRate) {
  const deck = [];
  for (let i = 0; i < deckSize; i++) {
    const r = Math.random();
    if (r < incidentRate) {
      deck.push({ type: 'incident', value: -(3 + Math.floor(Math.random() * 3)) }); // -3 to -5 (softened)
    } else if (r < incidentRate + 0.15) {
      deck.push({ type: 'challenge', value: 0 });
    } else {
      deck.push({ type: 'action', value: 1 + Math.floor(Math.random() * 2) }); // 1-2 base (bumped from 0-2)
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function simProduction(deckSize, incidentRate, synergyBonus) {
  const deck = simDeck(deckSize, incidentRate);
  const maxDraws = Math.ceil(deckSize * 0.55);
  let quality = 0;
  let incidents = 0;
  let draws = 0;
  let cleanWrap = true;

  for (let d = 0; d < maxDraws && deck.length > 0; d++) {
    const cards = [];
    cards.push(deck.shift());
    if (deck.length > 0) cards.push(deck.shift());
    draws++;

    for (const c of cards.filter(c => c.type === 'incident')) {
      incidents++;
      quality += c.value;
      cleanWrap = false;
      if (incidents >= 3) return { quality: 0, draws, disaster: true, cleanWrap: false };
    }

    for (const c of cards.filter(c => c.type === 'challenge')) {
      if (Math.random() > 0.5) {
        quality += Math.random() > 0.5 ? 4 : -3;
      }
    }

    const actions = cards.filter(c => c.type === 'action');
    if (actions.length > 0) {
      const best = actions.reduce((a, b) => a.value > b.value ? a : b);
      quality += best.value + synergyBonus * (Math.random() > 0.4 ? 1 : 0);
    }

    if (incidents >= 2) {
      const remainingIncidents = deck.filter(c => c.type === 'incident').length;
      if (remainingIncidents > 0 && Math.random() > 0.3) break;
    }
    if (quality > 12 && incidents >= 1 && Math.random() > 0.5) break;
  }

  return { quality: Math.max(0, quality), draws, disaster: false, cleanWrap };
}

function simRun() {
  let budget = 15;
  let rep = 3;
  let strikes = 0;
  let seasons = 0;
  const filmQualities = [];

  for (let s = 1; s <= 5; s++) {
    seasons = s;
    const target = [20, 30, 42, 55, 70][s - 1]; // lowered targets

    const scriptBase = 5 + Math.floor(Math.random() * 4);
    const talentSkill = 8 + Math.floor(s * 1.5) + Math.floor(Math.random() * 4);
    const deckSize = 18 + Math.floor(Math.random() * 6);
    const incidentRate = 0.15 + Math.random() * 0.15;
    const synergyBonus = 1 + Math.floor(Math.random() * 2);

    const prod = simProduction(deckSize, incidentRate, synergyBonus);
    
    if (prod.disaster) results.disasters++;
    if (prod.cleanWrap) results.cleanWraps++;
    results.totalFilms++;

    const cleanWrapBonus = prod.cleanWrap && prod.draws > 0 ? 5 : 0; // bumped from 3
    const rawQuality = scriptBase + talentSkill + prod.quality + cleanWrapBonus;
    filmQualities.push(rawQuality);
    
    const mult = 0.8 + Math.random() * 1.2;
    const repMult = [0, 0.5, 0.75, 1.0, 1.25, 1.5][rep];
    const boxOffice = rawQuality * mult * repMult;

    let tier;
    if (boxOffice >= target * 1.5) tier = 'BLOCKBUSTER';
    else if (boxOffice >= target * 1.25) tier = 'SMASH';
    else if (boxOffice >= target) tier = 'HIT';
    else tier = 'FLOP';

    results.tiers[tier]++;

    if (tier === 'FLOP') {
      strikes++;
      rep = Math.max(0, rep - 1);
      budget += boxOffice * 0.5;
    } else {
      if (tier === 'SMASH' || tier === 'BLOCKBUSTER') {
        rep = Math.min(5, rep + 1);
        budget += boxOffice + (tier === 'BLOCKBUSTER' ? 20 : 10);
      } else {
        budget += boxOffice;
      }
    }

    if (strikes >= 3 || rep <= 0) {
      results.losses++;
      results.reasons[`S${s}`] = (results.reasons[`S${s}`] || 0) + 1;
      results.avgSeasons += seasons;
      results.avgQuality.push(...filmQualities);
      return;
    }
  }

  results.wins++;
  results.avgSeasons += seasons;
  results.avgQuality.push(...filmQualities);
}

for (let i = 0; i < RUNS; i++) simRun();

console.log(`\n=== GREENLIGHT SIMULATION POST-BALANCE (${RUNS} runs) ===\n`);
console.log(`Win rate: ${results.wins}/${RUNS} (${(results.wins/RUNS*100).toFixed(1)}%)`);
console.log(`Avg seasons survived: ${(results.avgSeasons/RUNS).toFixed(1)}`);
console.log(`\nTier distribution (${results.totalFilms} films):`);
for (const [t, c] of Object.entries(results.tiers)) {
  console.log(`  ${t}: ${c} (${(c/results.totalFilms*100).toFixed(1)}%)`);
}
console.log(`\nDisasters: ${results.disasters} (${(results.disasters/results.totalFilms*100).toFixed(1)}%)`);
console.log(`Clean Wraps: ${results.cleanWraps} (${(results.cleanWraps/results.totalFilms*100).toFixed(1)}%)`);
console.log(`\nAvg film quality: ${(results.avgQuality.reduce((a,b)=>a+b,0)/results.avgQuality.length).toFixed(1)}`);
console.log(`Quality range: ${Math.min(...results.avgQuality)} - ${Math.max(...results.avgQuality)}`);
console.log(`\nLoss by season:`, results.reasons);
