# GREENLIGHT — Comprehensive Playtest Notes (R146)

*Generated 2026-02-17 by Bishop for Cody's morning review*

---

## 1. Major Game Systems & Interactions

### Core Loop
**Greenlight → Casting → Production → Release → Shop → Event → (repeat)**

A 5-season roguelite where you run a movie studio. Each season you pick a script, cast talent, play through a deck-building production phase, then collect box office based on quality × market multiplier × reputation.

### System Map

| System | Feeds Into | Fed By |
|--------|-----------|--------|
| **Scripts** (genre, base score, ability, card pool) | Production deck, Box office genre trends | Shop, Sequel system |
| **Talent** (skill, heat, cards, traits, baggage) | Production deck quality, Quality calc | Roster mgmt, Shop hiring, Loyalty system |
| **Production** (draw-2-keep-1 deck play) | Raw quality total | Script cards + talent cards + incidents |
| **Card Tags** (momentum/precision/chaos/heart/spectacle) | Archetype Focus bonus, Script abilities | Talent cards, Script cards |
| **Challenge Bets** (gamble on next card drawn) | Quality swings (+4 to -4) | Challenge card type in deck |
| **Market Conditions** (genre-matched multipliers) | Box office | Random each season, perks can choose |
| **Genre Trends** (hot/cold genres) | Multiplier ±0.25/0.2 | Random per season |
| **Reputation** (0-5 stars) | Box office multiplier (0.5×–1.5×) | Tier results, events |
| **Budget** ($M economy) | Hiring, scripts, perks, debt | Box office earnings, stipend, events |
| **Perks** (permanent studio upgrades, max 5) | Various multipliers & bonuses | Shop purchases |
| **Studio Archetypes** (prestige/blockbuster/indie/chaos) | Starting bonuses, clean wrap, incident thresholds | Run start choice |
| **Genre Mastery** (in-run: +2-3/film same genre) | Quality bonus | Films completed |
| **Chemistry** (named talent pairs) | +3 quality per pair | Casting choices |
| **Director's Vision** (random condition per film) | +5 or -2 quality | Director in cast |
| **Franchise/Sequels** (SMASH+ generates sequel) | Next season script option, inherited multiplier | Tier results |
| **Prestige** (cross-run XP & level) | Legacy perks, veteran scaling, milestones | Run completion |
| **Rivals** (3+ AI studios) | Narrative flavor, rubber-banding | Season generation |
| **Season Events** (pick 1 of 3-4 between seasons) | Various buffs/debuffs/economy changes | Random generation |
| **Daily/Weekly Challenges** (seeded runs + modifiers) | Leaderboard competition | Date-based seeds |
| **Achievements** (60+ career milestones) | Prestige XP, unlock gating | Various triggers |

### Key Interactions
- **Talent Heat → Deck Pollution**: Heat ≥4 adds extra incident cards to production deck. This is THE core tension — powerful talent bring risk.
- **Archetype Focus → Tag Stacking**: If 60%+ of played tags are one type, get +2 to +5 quality. Encourages intentional deck composition.
- **Clean Wrap → Prestige Archetype**: Clean wrap (zero incidents) gives +5 quality (+8 for Prestige archetype). Rewards risk-averse play.
- **Debt → Death Spiral Protection**: Overspending creates debt at 20% interest. Combined with $5M stipend, prevents total lockout but punishes reckless spending.
- **Encore → Push-Your-Luck**: After wrapping, draw one more card. Success = +3 bonus on top of normal value. Failure (incident) = -5 extra penalty. Excellent tension point.

---

## 2. Potential Balance Issues & Degenerate Strategies

### 🔴 Chemistry Pair Stacking (HIGH PRIORITY)
The balance notes acknowledge this: two $6 talent with chemistry = 0.75 skill/$, far exceeding expensive talent. A player who memorizes chemistry pairs can consistently build $12 casts that rival $30+ casts. **The chemistry bonus (+3 quality per pair) is flat and doesn't scale with cost**, making cheap chemistry pairs the dominant strategy.

**Suggested fix**: Chemistry bonus could scale: +2 for cheap pairs, +3 for mid, +4 for expensive. Or cap at 1 active chemistry per film.

### 🟡 Genre Mastery Lock-In
Typecast challenge gives +3/film mastery, but even in normal mode, playing the same genre every season yields +2, +4, +6, +8 quality by Season 5. Combined with Genre Specialist perk (+0.3 multiplier), single-genre runs significantly outperform genre diversity. There's Genre Pivot perk (+3 for switching) but it can't compete with escalating mastery.

**Observation**: This is somewhat intentional (franchise fantasy) but reduces strategic diversity in competitive play.

### 🟡 Indie Archetype + Low Heat Stacking
Indie archetype gives +5 quality if total cast heat ≤3, plus Independent Spirit perk gives +0.5 multiplier if heat ≤4. These combine to strongly incentivize hiring ONLY low-heat talent, which also means fewer incidents in the deck. The "downside" of lower skill is offset by the quality and multiplier bonuses.

### 🟢 Completion Bond Timing
At $6, Completion Bond (next FLOP → no strike) is bought once and sits until needed. It's essentially a "free life" with no ongoing cost. The timing incentive is buy-early, and there's no downside to holding it indefinitely. Consider: bond expires after 2 seasons if unused?

### 🟢 Extended Cut Free Value
$3M for 30-50% of original box office is almost always profitable. A $40 BO film yields $12-20M from Extended Cut, minus $3M cost = $9-17M net. The "cost" of skipping a season matters only if you can still win, but by the time you're getting SMASH/BLOCKBUSTER, you're usually safe. Could be a dominant end-game play.

### 🟢 Director's Cut Information Advantage
Peeking at top 3 cards and reordering is extremely powerful with the draw-2-keep-1 system. You can guarantee you get the best card and dodge incidents. No cost, once per production. This is fine for feel-good moments but may be undercosted at "free."

---

## 3. Missing Feedback & Unclear Mechanics

### Missing Feedback
1. **Deck composition visibility**: Players can't see what's left in their production deck. The challenge bet odds hints help, but a "remaining cards" summary (X action / Y challenge / Z incident) would reduce frustration and increase strategic depth.

2. **Franchise sequel quality decay**: Sequel base quality is `originalQuality × 0.7` with additional `-5 per sequel beyond 2nd`, but this isn't surfaced to the player before they pick the sequel script. Players may be surprised when their 4th franchise film tanks.

3. **Debt interest timing**: 20% compound interest applies at release, but there's no visual indicator showing projected debt growth. Players in debt can't easily calculate whether to pay it down vs. invest.

4. **Tag distribution preview**: Before production, players should see a breakdown of tags in their assembled deck (e.g., "4 momentum, 2 heart, 3 precision") to plan for Archetype Focus.

5. **Rival context**: Rivals generate box office numbers but there's no mechanical consequence — they're narrative-only. This could feel hollow after a few runs.

### Unclear Mechanics
1. **Block mechanic**: When 1 incident + 1 action are drawn together, you can "sacrifice" the action card to block the incident (costs -2 quality). The tradeoff math isn't intuitive — when is -2 better than taking the incident? (Answer: when incident base is worse than -2, which is always since incidents are -4 to -5. So blocking is almost never correct.) **This mechanic may be a trap.**

2. **Director's Vision resolution**: The +5/-2 swing is significant but the conditions (e.g., "wants 3+ unique tag types") are shown during production without clear feedback on progress toward meeting them.

3. **Veteran scaling**: Prestige 5+ adds +5% targets per level above 4, but this is invisible in normal gameplay. High-prestige players may not realize why their targets feel harder.

4. **Baggage effects**: Schedule Conflict blocks a Wild slot, but the UI may not clearly explain this before hiring. Method Dangerous's incident chance is probabilistic and invisible.

---

## 4. Five Specific Improvements for Next Iteration

### 1. 🎯 Deck Tracker / Card Counter
Add a small collapsible panel during Production showing remaining deck composition: `🟢 X action | 🟡 Y challenge | 🔴 Z incident | Tags: {breakdown}`. This transforms Production from "hope for the best" to genuine card-counting strategy. Roguelite deckbuilders like Slay the Spire thrive on this information.

### 2. 🎭 Rival Consequences
Make rivals mechanically relevant. Ideas:
- Rivals compete for the same market conditions (if a rival also made an Action film this season, your Action market multiplier is diluted)
- End-of-run ranking against rivals affects prestige XP
- Rival "bidding wars" for talent in the shop (popular talent gets +$2 if a rival also wanted them)

### 3. 💰 Rebalance Block Mechanic
The block mechanic (sacrifice action card + pay 2 quality to discard an incident) is mathematically dominated by "just take the incident and keep the action card" in nearly all cases. Since incidents are -4 to -5 and the action card typically adds +1 to +5 quality, taking both is usually better than discarding both for -2.

**Fix**: Make blocking free (no -2 penalty) but the action card is still lost. Now the decision is: "Is this action card worth less than the incident is bad?" — a genuine tradeoff.

### 4. 📊 Post-Production Analytics
After each film's release, show a "Film Report" with:
- Quality breakdown (script base / talent skill / production / synergies / focus / etc.)
- "What if" scenarios ("If you'd picked the other card on Draw 3, quality would have been +4")
- Deck efficiency rating (% of cards that fired synergies)

This gives players learning feedback and makes the numbers feel less opaque.

### 5. 🔄 Dynamic Talent Aging
Currently, talent have static skill (except Rising Star/Past Their Prime). Add a lightweight aging system:
- Talent gain +0.5 skill after a HIT+ film (cap at +2 over base)
- Talent lose -0.5 skill after sitting on the bench for 2 seasons
- Creates roster management tension: use your best talent every season (risk burnout/heat) or rotate?

---

## 5. Overall Assessment

### Game Depth: ⭐⭐⭐⭐ (4/5)
The system interactions are genuinely deep. There are 4 archetypes × 10+ challenge modes × daily modifiers × 7 genres × dozens of talent combinations. The production phase's draw-2-keep-1 with challenge bets and the block mechanic creates real decision points every draw. The franchise/sequel system adds long-term planning across seasons.

### Replayability: ⭐⭐⭐⭐½ (4.5/5)
Exceptional. Daily/weekly seeded runs with leaderboards, 10 challenge modes (some locked behind progression), prestige XP with 12 levels, genre mastery cross-run tracking, 60+ achievements, legacy perks, and the NG+/Director Mode difficulty tiers. There is an enormous amount of content here for a browser game.

### Accessibility: ⭐⭐⭐ (3/5)
The weakest area. There are SO many systems that new players will be overwhelmed. The simplified first-run helps (fewer shop options, no genre trends), but there's still: archetypes, Neow choices, script abilities, talent traits, baggage, card tags, synergies, challenge bets, Director's Cut, Encore, Director's Vision, Archetype Focus, chemistry, genre mastery, market conditions, and genre trends — all active by Season 2. The tutorial overlay and glossary help, but progressive disclosure could be stronger.

### Balance: ⭐⭐⭐½ (3.5/5)
The R110 economy audit was thorough and the perk tier analysis is solid. The biggest remaining issue is that chemistry pair memorization creates a skill ceiling that's more about external knowledge than in-game decision-making. Genre mastery lock-in is a soft dominant strategy. The block mechanic needs rebalancing. Overall the difficulty curve feels right — Season 1 is approachable, Season 5 requires optimization.

### Fun Factor: ⭐⭐⭐⭐ (4/5)
The Hollywood theme is executed well — film titles are procedurally generated, rival studios have personality, the franchise system creates emergent narratives. The Encore push-your-luck moment is a genuine highlight. Challenge bets with odds hints create poker-like moments. The prestige system provides excellent long-term motivation.

### Overall: **Strong roguelite with exceptional replayability, held back slightly by complexity overload and a few balance edges. Ready for broader playtesting.**

---

*End of playtest notes. — Bishop*
