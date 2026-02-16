// Round 2 playtest - testing varied starters, chemistry, and balance
import { 
  starterRoster, generateScripts, generateTalentMarket, 
  generateMarketConditions, getSeasonTarget, ALL_SCRIPTS,
  getActiveChemistry, ALL_CHEMISTRY,
} from './src/data';
import { CardTemplate, Talent, Script, CastSlot, ProductionCard, SynergyContext } from './src/types';

let _cardId = 0;
const cardUid = () => `card_${_cardId++}`;

function templateToCard(template: CardTemplate, source: string, sourceType: ProductionCard['sourceType']): ProductionCard {
  return { id: cardUid(), name: template.name, source, sourceType, cardType: template.cardType, baseQuality: template.baseQuality, synergyText: template.synergyText, synergyCondition: template.synergyCondition, riskTag: template.riskTag, challengeBet: template.challengeBet, budgetMod: template.budgetMod, special: template.special };
}

function buildDeck(slots: CastSlot[], script: Script): ProductionCard[] {
  const deck: ProductionCard[] = [];
  for (const t of script.cards) deck.push(templateToCard(t, script.title, 'script'));
  for (const slot of slots) {
    if (!slot.talent) continue;
    const st: ProductionCard['sourceType'] = slot.talent.type === 'Lead' || slot.talent.type === 'Support' ? 'actor' : slot.talent.type === 'Director' ? 'director' : 'crew';
    for (const t of slot.talent.cards) deck.push(templateToCard(t, slot.talent.name, st));
  }
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return deck;
}

function simulateProduction(deck: ProductionCard[], slots: CastSlot[]): { quality: number; incidents: number; cardsPlayed: number; disaster: boolean } {
  let quality = 0;
  let incidents = 0;
  const played: ProductionCard[] = [];
  const maxDraws = Math.min(15, Math.max(6, Math.ceil(deck.length * 0.55)));
  let draws = 0;
  
  // Draw-2-pick-1 simulation (smarter AI)
  while (draws < maxDraws && deck.length > 0 && incidents < 3) {
    draws++;
    const card1 = deck.shift()!;
    const card2 = deck.length > 0 ? deck.shift() : null;
    const cards = card2 ? [card1, card2] : [card1];
    
    // Auto-play incidents, pick best action card
    for (const c of cards) {
      if (c.cardType === 'incident') {
        incidents++;
        let value = c.baseQuality;
        if (c.synergyCondition) {
          const ctx: SynergyContext = { playedCards: [...played], totalQuality: quality, drawNumber: draws, leadSkill: slots.find(s => s.slotType === 'Lead')?.talent?.skill || 0, redCount: incidents, incidentCount: incidents, previousCard: played.length > 0 ? played[played.length - 1] : null, greenStreak: 0, remainingDeck: deck, actionCardsPlayed: played.filter(c => c.cardType === 'action').length, challengeCardsPlayed: played.filter(c => c.cardType === 'challenge').length };
          value += c.synergyCondition(ctx).bonus;
        }
        c.totalValue = value;
        played.push(c);
        quality += value;
      }
    }
    
    // Pick best action card from remaining
    const actions = cards.filter(c => c.cardType === 'action');
    if (actions.length > 0) {
      // Evaluate each and pick best
      let bestCard = actions[0];
      let bestValue = -999;
      for (const c of actions) {
        let value = c.baseQuality;
        if (c.synergyCondition) {
          const ctx: SynergyContext = { playedCards: [...played], totalQuality: quality, drawNumber: draws, leadSkill: slots.find(s => s.slotType === 'Lead')?.talent?.skill || 0, redCount: incidents, incidentCount: incidents, previousCard: played.length > 0 ? played[played.length - 1] : null, greenStreak: 0, remainingDeck: deck, actionCardsPlayed: played.filter(c => c.cardType === 'action').length, challengeCardsPlayed: played.filter(c => c.cardType === 'challenge').length };
          value += c.synergyCondition(ctx).bonus;
        }
        if (value > bestValue) { bestValue = value; bestCard = c; }
      }
      bestCard.totalValue = bestValue;
      played.push(bestCard);
      quality += bestValue;
    }
    
    // Challenge cards: 50% accept bet
    const challenges = cards.filter(c => c.cardType === 'challenge');
    for (const c of challenges) {
      if (Math.random() > 0.5 && c.challengeBet) {
        const ctx: SynergyContext = { playedCards: [...played], totalQuality: quality, drawNumber: draws, leadSkill: 0, redCount: incidents, incidentCount: incidents, previousCard: null, greenStreak: 0, remainingDeck: deck, actionCardsPlayed: 0, challengeCardsPlayed: 0 };
        const won = c.challengeBet.condition(ctx);
        quality += won ? c.challengeBet.successBonus : c.challengeBet.failPenalty;
      }
      played.push(c);
    }
    
    // Smart wrap: if quality good enough and risk is high, wrap
    if (incidents >= 2 && draws >= 2) break;
    if (quality > 18 && draws >= maxDraws * 0.5) break;
  }
  
  const disaster = incidents >= 3;
  if (disaster) quality = 0;
  return { quality, incidents, cardsPlayed: played.length, disaster };
}

// ─── TEST VARIED STARTERS ───
console.log('=== VARIED STARTER ANALYSIS ===');
const starterCombos: Record<string, number> = {};
for (let i = 0; i < 200; i++) {
  const roster = starterRoster();
  const key = roster.map(t => t.name).sort().join(' + ');
  starterCombos[key] = (starterCombos[key] || 0) + 1;
}
console.log(`Unique starter combos: ${Object.keys(starterCombos).length}`);
for (const [combo, count] of Object.entries(starterCombos).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
  console.log(`  ${combo}: ${count}x (${(count/200*100).toFixed(0)}%)`);
}

// ─── TEST CHEMISTRY ───
console.log('\n=== CHEMISTRY PAIRS ===');
console.log(`Total chemistry pairs: ${ALL_CHEMISTRY.length}`);
for (const c of ALL_CHEMISTRY) {
  console.log(`  ${c.talent1} + ${c.talent2} = "${c.name}" (+${c.qualityBonus})`);
}

// ─── FULL GAME SIMULATION (smarter) ───
console.log('\n=== FULL GAME SIMULATION (500 games) ===');
let wins = 0, losses = 0, totalDisasters = 0;
const seasonQuality: number[] = [];

for (let game = 0; game < 500; game++) {
  let budget = 15;
  let rep = 3;
  let strikes = 0;
  const roster = starterRoster();
  let survived = true;
  
  for (let season = 1; season <= 5; season++) {
    if (strikes >= 3 || rep <= 0) { survived = false; break; }
    
    const scripts = generateScripts(3, season);
    const affordable = scripts.filter(s => budget >= s.cost);
    if (affordable.length === 0) { survived = false; break; }
    const script = affordable[Math.floor(Math.random() * affordable.length)];
    budget -= script.cost;
    
    const slots: CastSlot[] = script.slots.map(s => ({ slotType: s, talent: null }));
    const available = [...roster];
    for (let i = 0; i < slots.length && available.length > 0; i++) {
      const matching = available.filter(t => slots[i].slotType === 'Wild' || t.type === slots[i].slotType);
      if (matching.length > 0) {
        const pick = matching[0];
        slots[i].talent = pick;
        available.splice(available.indexOf(pick), 1);
      }
    }
    
    // Chemistry bonus
    const castNames = slots.map(s => s.talent?.name).filter(Boolean) as string[];
    const chemistry = getActiveChemistry(castNames);
    const chemBonus = chemistry.reduce((s, c) => s + c.qualityBonus, 0);
    
    const talentSkill = slots.reduce((s, sl) => s + (sl.talent?.skill || 0), 0);
    const deck = buildDeck(slots, script);
    const prod = simulateProduction(deck, slots);
    if (prod.disaster) totalDisasters++;
    
    const rawQuality = script.baseScore + talentSkill + prod.quality + (prod.incidents === 0 ? 3 : 0) + chemBonus;
    seasonQuality.push(rawQuality);
    
    const markets = generateMarketConditions(3);
    const market = markets[Math.floor(Math.random() * markets.length)];
    let mult = market.genreBonus === script.genre ? market.multiplier : 1.0;
    if (market.condition === 'quality>30' && rawQuality > 30) mult = market.multiplier;
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
    
    // Buy talent between seasons
    if (season < 5 && budget > 8) {
      const market2 = generateTalentMarket(4, season, roster);
      const affordable2 = market2.filter(t => t.cost <= budget * 0.4);
      if (affordable2.length > 0) {
        const hire = affordable2[Math.floor(Math.random() * affordable2.length)];
        roster.push(hire);
        budget -= hire.cost;
      }
    }
  }
  
  if (survived && strikes < 3 && rep > 0) wins++;
  else losses++;
}

console.log(`Win Rate: ${(wins/500*100).toFixed(1)}%`);
console.log(`Disasters: ${totalDisasters} (${(totalDisasters/(500*5)*100).toFixed(1)}% of productions)`);
const avgQ = seasonQuality.reduce((a,b)=>a+b,0) / seasonQuality.length;
console.log(`Avg Quality: ${avgQ.toFixed(1)}`);
console.log(`Quality Range: ${Math.min(...seasonQuality)} - ${Math.max(...seasonQuality)}`);
console.log(`Season targets: ${[1,2,3,4,5].map(s => `S${s}=$${getSeasonTarget(s)}M`).join(', ')}`);
