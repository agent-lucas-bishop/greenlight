// Detailed playtest simulation — narrates a full game run

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Simplified talent with cards
const TALENT = {
  leads: [
    { name: 'Sophie Chen', skill: 3, heat: 1, cost: 6, cards: [
      { name: 'Quiet Intensity', type: 'action', base: 1, syn: '+2 early' },
      { name: 'Breakout Moment', type: 'action', base: 1, syn: '+2 per clean draw' },
      { name: 'Natural Talent', type: 'action', base: 1, syn: '+1 with actors' },
      { name: 'Nervous Energy', type: 'challenge', base: 0, syn: 'bet' },
      { name: 'Overwhelmed', type: 'incident', base: -3, syn: '' },
    ]},
    { name: 'Marcus Webb', skill: 5, heat: 3, cost: 15, cards: [
      { name: 'Transformative Performance', type: 'action', base: 1, syn: '+3 with director' },
      { name: 'Stayed In Character', type: 'action', base: 1, syn: '+1/script card' },
      { name: 'Creative Differences', type: 'challenge', base: 0, syn: 'bet' },
      { name: 'Refused Direction', type: 'incident', base: -4, syn: '' },
      { name: 'Onset Altercation', type: 'incident', base: -5, syn: '' },
    ]},
    { name: 'Valentina Cortez', skill: 5, heat: 4, cost: 18, cards: [
      { name: 'Iconic Performance', type: 'action', base: 1, syn: '+4 with director' },
      { name: 'Awards Clip', type: 'action', base: 1, syn: '+3 late' },
      { name: 'Method Acting', type: 'challenge', base: 0, syn: 'bet' },
      { name: 'Diva Meltdown', type: 'incident', base: -5, syn: '-$3M' },
      { name: 'Scandal!', type: 'incident', base: -5, syn: 'poison actors' },
      // Heat 4 extra card:
      { name: 'Late Night Partying', type: 'incident', base: -4, syn: 'poison next' },
    ]},
  ],
  directors: [
    { name: 'Rick Blaster', skill: 3, heat: 0, cost: 6, cards: [
      { name: 'By The Numbers', type: 'action', base: 1, syn: '+1 with crew' },
      { name: 'Focus Group Approved', type: 'action', base: 1, syn: '+2 if quality 5-20' },
      { name: 'Studio-Friendly Cut', type: 'action', base: 1, syn: 'remove incident' },
      { name: 'Uninspired Coverage', type: 'action', base: 1, syn: '+1 if 3+ cards' },
    ]},
    { name: 'Ava Thornton', skill: 5, heat: 1, cost: 14, cards: [
      { name: "Auteur's Vision", type: 'action', base: 1, syn: 'x1.3 multiply' },
      { name: 'Meticulous Framing', type: 'action', base: 1, syn: '+2 with crew' },
      { name: 'Artistic Disagreement', type: 'challenge', base: 0, syn: 'bet' },
      { name: 'Perfection Paralysis', type: 'incident', base: -3, syn: 'force draw' },
    ]},
  ],
  crew: [
    { name: 'Standard Grip', skill: 2, heat: 0, cost: 3, cards: [
      { name: 'Clean Setup', type: 'action', base: 1, syn: '+1 with director' },
      { name: 'Smooth Operation', type: 'action', base: 1, syn: '+2 with crew' },
      { name: 'Overtime', type: 'challenge', base: 0, syn: 'bet' },
    ]},
  ],
  support: [
    { name: 'Danny Park', skill: 3, heat: 0, cost: 5, cards: [
      { name: 'Scene Stealer', type: 'action', base: 1, syn: '+3 with lead' },
      { name: 'Ensemble Energy', type: 'action', base: 1, syn: '+1/card played' },
      { name: 'Budget Overrun', type: 'challenge', base: 0, syn: 'bet' },
    ]},
  ],
};

const SCRIPTS = [
  { name: 'Broken Crown', genre: 'Drama', base: 8, cost: 5, cards: [
    { name: 'Emotional Climax', type: 'action', base: 1, syn: '+3 with 2 actors' },
    { name: 'Subtle Writing', type: 'action', base: 1, syn: '+2 with director' },
    { name: 'Character Study', type: 'action', base: 1, syn: '+1/unique type' },
    { name: 'Awards Bait', type: 'action', base: 1, syn: '+3 if lead skill 4+' },
    { name: 'Pacing Issues', type: 'challenge', base: 0, syn: 'bet' },
    { name: 'Pretentious Drivel', type: 'incident', base: -5, syn: '-3 more if quality < 10' },
  ]},
  { name: 'Neon Fury', genre: 'Action', base: 6, cost: 2, cards: [
    { name: 'Chase Sequence', type: 'action', base: 1, syn: '+2 with actor' },
    { name: 'Explosion!', type: 'action', base: 1, syn: '+2 with crew' },
    { name: 'Fight Choreography', type: 'action', base: 1, syn: '+2 if lead skill 4+' },
    { name: 'Stunt Goes Wrong', type: 'challenge', base: 0, syn: 'bet' },
    { name: 'CGI Overload', type: 'challenge', base: 0, syn: 'sacrifice bet' },
    { name: 'Bloated Runtime', type: 'incident', base: -5, syn: '-3 more if 5+ draws' },
  ]},
];

function playtest(buildName, lead, director, crew, support, script) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`PLAYTEST: ${buildName}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Lead: ${lead.name} (S${lead.skill}/H${lead.heat})`);
  console.log(`Director: ${director.name} (S${director.skill}/H${director.heat})`);
  console.log(`Crew: ${crew.name} (S${crew.skill}/H${crew.heat})`);
  console.log(`Support: ${support.name} (S${support.skill}/H${support.heat})`);
  console.log(`Script: ${script.name} (${script.genre}, Base ${script.base})`);

  // Build deck
  const allCards = [...lead.cards, ...director.cards, ...crew.cards, ...support.cards, ...script.cards];
  const deck = shuffle(allCards);
  
  const totalCards = deck.length;
  const actionCount = deck.filter(c => c.type === 'action').length;
  const challengeCount = deck.filter(c => c.type === 'challenge').length;
  const incidentCount = deck.filter(c => c.type === 'incident').length;
  
  console.log(`\nDeck: ${totalCards} cards (${actionCount}A/${challengeCount}C/${incidentCount}I)`);
  console.log(`Incident rate: ${(incidentCount/totalCards*100).toFixed(0)}%`);
  
  const maxDraws = Math.min(15, Math.max(6, Math.ceil(totalCards * 0.55)));
  console.log(`Max draws: ${maxDraws}`);
  
  let quality = 0;
  let incidents = 0;
  let draws = 0;
  let cleanWrap = true;
  const remaining = [...deck];
  const played = [];
  
  console.log(`\n--- PRODUCTION ---`);
  
  for (let d = 0; d < maxDraws && remaining.length > 0; d++) {
    // Draw 2
    const card1 = remaining.shift();
    const card2 = remaining.length > 0 ? remaining.shift() : null;
    draws++;
    
    const cards = card2 ? [card1, card2] : [card1];
    console.log(`\nDraw ${draws}: ${cards.map(c => `[${c.type.charAt(0).toUpperCase()}] ${c.name} (${c.base >= 0 ? '+' : ''}${c.base})`).join(' | ')}`);
    
    // Process incidents
    const drawnIncidents = cards.filter(c => c.type === 'incident');
    const drawnActions = cards.filter(c => c.type === 'action');
    const drawnChallenges = cards.filter(c => c.type === 'challenge');
    
    // Block mechanic check
    if (drawnIncidents.length === 1 && drawnActions.length === 1) {
      // Decide: block or keep both
      const shouldBlock = incidents >= 1 || (cleanWrap && drawnIncidents[0].base <= -4);
      if (shouldBlock) {
        console.log(`  🛡️ BLOCKED ${drawnIncidents[0].name} by sacrificing ${drawnActions[0].name}!`);
        continue;
      } else {
        console.log(`  ⚡ Kept both — taking the hit for the action card`);
      }
    }
    
    for (const inc of drawnIncidents) {
      incidents++;
      quality += inc.base;
      cleanWrap = false;
      console.log(`  💥 INCIDENT: ${inc.name} (${inc.base}) — Total quality: ${quality}, Incidents: ${incidents}/3`);
      if (incidents >= 3) {
        console.log(`  💀 DISASTER! ALL QUALITY LOST!`);
        quality = 0;
        break;
      }
    }
    if (incidents >= 3) break;
    
    // Process challenges (auto-accept for sim)
    for (const ch of drawnChallenges) {
      const won = Math.random() > 0.45;
      const bonus = won ? 4 : -3;
      quality += bonus;
      console.log(`  🎲 CHALLENGE: ${ch.name} — ${won ? 'WON +4' : 'LOST -3'} — Quality: ${quality}`);
    }
    
    // Process actions (keep best if 2)
    if (drawnActions.length > 0 && !(drawnIncidents.length === 1 && drawnActions.length === 1)) {
      // Simplified synergy: +2 bonus 60% of the time
      const synergy = Math.random() > 0.4 ? 2 : 0;
      const best = drawnActions.reduce((a, b) => (a.base + synergy) > (b.base + synergy) ? a : b);
      const total = best.base + synergy;
      quality += total;
      played.push(best);
      console.log(`  ✅ KEEP: ${best.name} (+${best.base}${synergy ? ` +${synergy} synergy` : ''} = +${total}) — Quality: ${quality}`);
    }
    
    // Stop decision
    if (incidents >= 2 && remaining.filter(c => c.type === 'incident').length > 0) {
      console.log(`  ⚠️ 2 incidents with more in deck — WRAPPING for safety`);
      break;
    }
    if (quality > 15 && incidents >= 1 && remaining.filter(c => c.type === 'incident').length >= 2 && Math.random() > 0.4) {
      console.log(`  📋 Good quality, risky deck — WRAPPING`);
      break;
    }
  }
  
  const cleanBonus = cleanWrap && draws > 0 ? 5 : 0;
  const talentSkill = lead.skill + director.skill + crew.skill + support.skill;
  const totalQuality = script.base + talentSkill + quality + cleanBonus;
  
  console.log(`\n--- RESULTS ---`);
  console.log(`Script Base: ${script.base}`);
  console.log(`Talent Skill: +${talentSkill}`);
  console.log(`Production: ${quality >= 0 ? '+' : ''}${quality}`);
  if (cleanBonus) console.log(`Clean Wrap: +${cleanBonus}`);
  console.log(`TOTAL QUALITY: ${totalQuality}`);
  
  // Box office
  const mult = 0.8 + Math.random() * 1.2;
  const repMult = 1.0; // start at rep 3
  const boxOffice = totalQuality * mult * repMult;
  const target = 20; // Season 1
  
  const tier = boxOffice >= target * 1.5 ? 'BLOCKBUSTER' : boxOffice >= target * 1.25 ? 'SMASH' : boxOffice >= target ? 'HIT' : 'FLOP';
  console.log(`\nBox Office: $${boxOffice.toFixed(1)}M (Market mult: x${mult.toFixed(1)})`);
  console.log(`Target: $${target}M`);
  console.log(`TIER: ${tier}`);
  
  return { quality: totalQuality, boxOffice, tier, cleanWrap, incidents, draws };
}

// Run playtests
console.log('\n🎬 GREENLIGHT PLAYTEST SESSION 🎬\n');

// Test 1: Safe build
playtest('Safe S1 Build',
  TALENT.leads[0], // Sophie Chen
  TALENT.directors[0], // Rick Blaster  
  TALENT.crew[0], // Standard Grip
  TALENT.support[0], // Danny Park
  SCRIPTS[1] // Neon Fury (cheap)
);

// Test 2: Risky build
playtest('Risky S1 Build',
  TALENT.leads[2], // Valentina
  TALENT.directors[1], // Ava Thornton
  TALENT.crew[0], // Standard Grip
  TALENT.support[0], // Danny Park
  SCRIPTS[0] // Broken Crown
);

// Test 3: Mid-tier build
playtest('Balanced Build',
  TALENT.leads[1], // Marcus Webb
  TALENT.directors[0], // Rick Blaster
  TALENT.crew[0], // Standard Grip
  TALENT.support[0], // Danny Park
  SCRIPTS[0] // Broken Crown
);

// Run 20 quick sims and report
console.log('\n\n=== BATCH SIM (50 runs per build) ===\n');

function batchSim(name, lead, dir, crew, sup, script, runs=50) {
  let results = { flop: 0, hit: 0, smash: 0, bb: 0, disaster: 0, clean: 0, avgQ: 0 };
  for (let i = 0; i < runs; i++) {
    const deck = shuffle([...lead.cards, ...dir.cards, ...crew.cards, ...sup.cards, ...script.cards]);
    let q = 0, inc = 0, draws = 0, cw = true;
    const rem = [...deck];
    for (let d = 0; d < 10 && rem.length > 0; d++) {
      const c1 = rem.shift();
      const c2 = rem.length > 0 ? rem.shift() : null;
      draws++;
      const cards = c2 ? [c1, c2] : [c1];
      const incs = cards.filter(c => c.type === 'incident');
      const acts = cards.filter(c => c.type === 'action');
      
      // Block: if 1 incident + 1 action and already have incident, block
      if (incs.length === 1 && acts.length === 1 && (inc >= 1 || cw)) {
        continue; // blocked
      }
      
      for (const c of incs) { inc++; q += c.base; cw = false; if (inc >= 3) { q = 0; break; } }
      if (inc >= 3) { results.disaster++; break; }
      for (const c of cards.filter(c => c.type === 'challenge')) { q += Math.random() > 0.45 ? 4 : -3; }
      if (acts.length > 0 && !(incs.length === 1 && acts.length === 1)) {
        q += Math.max(...acts.map(a => a.base)) + (Math.random() > 0.4 ? 2 : 0);
      }
      if (inc >= 2 && rem.filter(c => c.type === 'incident').length > 0) break;
    }
    const skill = lead.skill + dir.skill + crew.skill + sup.skill;
    const total = script.base + skill + q + (cw && draws > 0 ? 5 : 0);
    const bo = total * (0.8 + Math.random() * 1.2);
    const tier = bo >= 30 ? 'bb' : bo >= 25 ? 'smash' : bo >= 20 ? 'hit' : 'flop';
    results[tier]++;
    results.avgQ += total;
    if (cw) results.clean++;
  }
  results.avgQ /= runs;
  console.log(`${name}: Avg Q=${results.avgQ.toFixed(1)} | FLOP ${results.flop} | HIT ${results.hit} | SMASH ${results.smash} | BB ${results.bb} | Disasters ${results.disaster} | CleanWraps ${results.clean}`);
}

batchSim('Sophie+Rick+Grip+Danny+NeonFury', TALENT.leads[0], TALENT.directors[0], TALENT.crew[0], TALENT.support[0], SCRIPTS[1]);
batchSim('Sophie+Rick+Grip+Danny+BrokenCrown', TALENT.leads[0], TALENT.directors[0], TALENT.crew[0], TALENT.support[0], SCRIPTS[0]);
batchSim('Marcus+Rick+Grip+Danny+BrokenCrown', TALENT.leads[1], TALENT.directors[0], TALENT.crew[0], TALENT.support[0], SCRIPTS[0]);
batchSim('Valentina+Ava+Grip+Danny+BrokenCrown', TALENT.leads[2], TALENT.directors[1], TALENT.crew[0], TALENT.support[0], SCRIPTS[0]);
batchSim('Marcus+Ava+Grip+Danny+BrokenCrown', TALENT.leads[1], TALENT.directors[1], TALENT.crew[0], TALENT.support[0], SCRIPTS[0]);
