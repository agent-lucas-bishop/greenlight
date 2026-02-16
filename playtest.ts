// Simulated playtest - runs through game logic programmatically
// Run with: npx tsx playtest.ts

import { 
  starterRoster, generateScripts, generateTalentMarket, 
  generateMarketConditions, getSeasonTarget, ALL_SCRIPTS,
  INDUSTRY_EVENTS
} from './src/data';
import { CardTemplate, Talent, Script, CastSlot, ProductionCard, SynergyContext } from './src/types';

let _cardId = 0;
const cardUid = () => `card_${_cardId++}`;

function templateToCard(template: CardTemplate, source: string, sourceType: ProductionCard['sourceType']): ProductionCard {
  return {
    id: cardUid(),
    name: template.name,
    source,
    sourceType,
    cardType: template.cardType,
    baseQuality: template.baseQuality,
    synergyText: template.synergyText,
    synergyCondition: template.synergyCondition,
    riskTag: template.riskTag,
    challengeBet: template.challengeBet,
    budgetMod: template.budgetMod,
    special: template.special,
  };
}

function buildDeck(slots: CastSlot[], script: Script): ProductionCard[] {
  const deck: ProductionCard[] = [];
  for (const t of script.cards) {
    deck.push(templateToCard(t, script.title, 'script'));
  }
  for (const slot of slots) {
    if (!slot.talent) continue;
    const st: ProductionCard['sourceType'] = 
      slot.talent.type === 'Lead' || slot.talent.type === 'Support' ? 'actor' :
      slot.talent.type === 'Director' ? 'director' : 'crew';
    for (const t of slot.talent.cards) {
      deck.push(templateToCard(t, slot.talent.name, st));
    }
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function simulateProduction(deck: ProductionCard[], slots: CastSlot[]): { quality: number; incidents: number; cardsPlayed: number; disaster: boolean } {
  let quality = 0;
  let incidents = 0;
  const played: ProductionCard[] = [];
  const maxDraws = Math.min(15, Math.max(6, Math.ceil(deck.length * 0.55)));
  let draws = 0;
  
  while (draws < maxDraws && deck.length > 0 && incidents < 3) {
    draws++;
    const card = deck.shift()!;
    
    // Simple synergy evaluation
    const ctx: SynergyContext = {
      playedCards: [...played],
      totalQuality: quality,
      drawNumber: draws,
      leadSkill: slots.find(s => s.slotType === 'Lead')?.talent?.skill || 0,
      redCount: incidents,
      incidentCount: incidents,
      previousCard: played.length > 0 ? played[played.length - 1] : null,
      greenStreak: 0,
      remainingDeck: deck,
      actionCardsPlayed: played.filter(c => c.cardType === 'action').length,
      challengeCardsPlayed: played.filter(c => c.cardType === 'challenge').length,
    };
    
    let value = card.baseQuality;
    if (card.synergyCondition) {
      const result = card.synergyCondition(ctx);
      value += result.bonus;
    }
    
    if (card.cardType === 'incident') {
      incidents++;
    }
    
    card.totalValue = value;
    played.push(card);
    quality += value;
    
    // AI wrap decision: wrap if quality > 15 and > 50% draws used, or if 2 incidents
    if (incidents >= 2 && draws >= 3) break;
    if (quality > 20 && draws >= maxDraws * 0.6) break;
  }
  
  const disaster = incidents >= 3;
  if (disaster) quality = 0;
  
  return { quality, incidents, cardsPlayed: played.length, disaster };
}

// Run 100 simulated games
console.log('=== GREENLIGHT PLAYTEST SIMULATION ===\n');

const results: { wins: number; losses: number; avgEarnings: number; disasters: number; totalGames: number } = {
  wins: 0, losses: 0, avgEarnings: 0, disasters: 0, totalGames: 0
};

const scriptStats: Record<string, { uses: number; avgQuality: number; disasters: number }> = {};

for (let game = 0; game < 100; game++) {
  let budget = 15;
  let rep = 3;
  let strikes = 0;
  let totalEarnings = 0;
  const roster = starterRoster();
  let survived = true;
  let totalDisasters = 0;
  
  for (let season = 1; season <= 5; season++) {
    if (strikes >= 3 || rep <= 0) { survived = false; break; }
    
    const scripts = generateScripts(3, season);
    // Pick cheapest affordable script
    const affordable = scripts.filter(s => budget >= s.cost).sort((a, b) => a.cost - b.cost);
    if (affordable.length === 0) { survived = false; break; }
    const script = affordable[Math.floor(Math.random() * affordable.length)];
    budget -= script.cost;
    
    // Assign roster to slots
    const slots: CastSlot[] = script.slots.map(s => ({ slotType: s, talent: null }));
    const available = [...roster];
    for (let i = 0; i < slots.length && available.length > 0; i++) {
      const matching = available.filter(t => {
        if (slots[i].slotType === 'Wild') return true;
        return t.type === slots[i].slotType;
      });
      if (matching.length > 0) {
        const pick = matching[0];
        slots[i].talent = pick;
        available.splice(available.indexOf(pick), 1);
      }
    }
    
    const talentSkill = slots.reduce((s, sl) => s + (sl.talent?.skill || 0), 0);
    const deck = buildDeck(slots, script);
    
    if (!scriptStats[script.title]) scriptStats[script.title] = { uses: 0, avgQuality: 0, disasters: 0 };
    scriptStats[script.title].uses++;
    
    const prod = simulateProduction(deck, slots);
    if (prod.disaster) totalDisasters++;
    if (prod.disaster) scriptStats[script.title].disasters++;
    
    const rawQuality = script.baseScore + talentSkill + prod.quality + (prod.incidents === 0 ? 3 : 0);
    scriptStats[script.title].avgQuality += rawQuality;
    
    const markets = generateMarketConditions(3);
    const market = markets[Math.floor(Math.random() * markets.length)];
    let mult = market.genreBonus === script.genre ? market.multiplier : 1.0;
    const repBonus = [0, 0.5, 0.75, 1.0, 1.25, 1.5][rep] || 1.0;
    const boxOffice = rawQuality * mult * repBonus;
    
    const target = getSeasonTarget(season);
    const hit = boxOffice >= target;
    
    if (!hit) {
      strikes++;
      rep = Math.max(0, rep - 1);
      budget += boxOffice * 0.5;
    } else {
      const ratio = boxOffice / target;
      if (ratio >= 1.25) { rep = Math.min(5, rep + 1); budget += boxOffice + 10; }
      else { budget += boxOffice; }
    }
    totalEarnings += boxOffice;
  }
  
  results.totalGames++;
  if (survived && strikes < 3 && rep > 0) results.wins++;
  else results.losses++;
  results.avgEarnings += totalEarnings;
  results.disasters += totalDisasters;
}

results.avgEarnings /= results.totalGames;

console.log(`Games: ${results.totalGames}`);
console.log(`Win Rate: ${(results.wins / results.totalGames * 100).toFixed(1)}%`);
console.log(`Avg Earnings: $${results.avgEarnings.toFixed(1)}M`);
console.log(`Total Disasters: ${results.disasters} (${(results.disasters / (results.totalGames * 5) * 100).toFixed(1)}% of productions)`);

console.log('\n=== SCRIPT STATS ===');
for (const [name, stats] of Object.entries(scriptStats).sort((a, b) => b[1].uses - a[1].uses)) {
  console.log(`${name}: Used ${stats.uses}x, Avg Quality: ${(stats.avgQuality / stats.uses).toFixed(1)}, Disasters: ${stats.disasters}`);
}

// Deck composition analysis
console.log('\n=== STARTER DECK ANALYSIS ===');
const starter = starterRoster();
const testScript = ALL_SCRIPTS[0]; // Nightmare Alley
const testSlots: CastSlot[] = [
  { slotType: 'Lead', talent: starter.find(t => t.type === 'Lead') || null },
  { slotType: 'Director', talent: starter.find(t => t.type === 'Director') || null },
  { slotType: 'Crew', talent: starter.find(t => t.type === 'Crew') || null },
];
const testScript2: Script = { ...testScript, id: 'test' };
const testDeck = buildDeck(testSlots, testScript2);
const actionCount = testDeck.filter(c => c.cardType === 'action').length;
const challengeCount = testDeck.filter(c => c.cardType === 'challenge').length;
const incidentCount = testDeck.filter(c => c.cardType === 'incident').length;
console.log(`Deck size: ${testDeck.length}`);
console.log(`Actions: ${actionCount} (${(actionCount/testDeck.length*100).toFixed(0)}%)`);
console.log(`Challenges: ${challengeCount} (${(challengeCount/testDeck.length*100).toFixed(0)}%)`);
console.log(`Incidents: ${incidentCount} (${(incidentCount/testDeck.length*100).toFixed(0)}%)`);
console.log(`Max draws: ${Math.min(15, Math.max(6, Math.ceil(testDeck.length * 0.55)))}`);
