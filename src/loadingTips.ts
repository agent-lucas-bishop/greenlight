// Rotating strategy tips shown during transitions (season overlays, loading)

export const LOADING_TIPS: string[] = [
  "💕 Chemistry bonuses can make or break a film — always check for pairs before casting.",
  "💀 Watch your reputation — 3 strikes and you're out!",
  "🎯 Wrapping early with decent quality beats risking a disaster.",
  "🔥 Match your film's genre to Hot trends for a massive box office multiplier.",
  "🎭 High Heat talent add powerful cards AND dangerous Incidents. Handle with care.",
  "🏷️ Focus on one keyword tag (50%+ of played cards) for escalating quality bonuses.",
  "💰 Training away Incident cards from risky talent can be more valuable than buying a new perk.",
  "⭐ Reputation stars multiply ALL earnings — protecting your rep is as important as raw quality.",
  "🎬 At 2 incidents, seriously consider wrapping. One more and you lose everything.",
  "🎁 Your starting bonus shapes the entire run — cash gives flexibility, perks give staying power.",
  "📰 Season events add strategic variety — no two runs play the same.",
  "🎵 Encore is high risk, high reward: success = bonus quality, failure = you lose some.",
  "🏛️ Studio archetypes shape your whole strategy — Prestige studios get critic bonuses, Blockbuster studios earn more $$$.",
  "🃏 Check the deck preview before production — if incidents outnumber actions, you're in danger territory.",
  "💕 Heart cards reward chemistry pairs and ensemble casts — build a tight-knit crew.",
  "✨ Spectacle cards are strongest in late draws — save your best for the climax.",
  "💀 Chaos cards get STRONGER when incidents happen — dangerous but powerful if you can survive.",
  "🎯 Precision rewards clean wraps with no incidents — best for risk-averse strategies.",
  "🔥 Momentum rewards streaks — cards get stronger the more Momentum cards you play in a row.",
  "📊 Quality × market conditions × reputation = your box office take. Maximize all three.",
];

let lastIndex = -1;

/** Get a random tip, avoiding repeating the last one shown */
export function getRandomTip(): string {
  let idx: number;
  do {
    idx = Math.floor(Math.random() * LOADING_TIPS.length);
  } while (idx === lastIndex && LOADING_TIPS.length > 1);
  lastIndex = idx;
  return LOADING_TIPS[idx];
}
