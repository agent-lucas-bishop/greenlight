# GREENLIGHT Playtest Log — Round 16

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Focus:** FLOW & PACING AUDIT — Click counts, dead air, information overload

## Previous Round Summary
Round 15 added Season Identity system (5 named seasons with scaling resources), 3 rival AI studios, Season Recap screen with headlines and rankings, and dynamic narrative headlines.

## Problems Identified
1. **3 dead-air clicks per season** — "SEE BOX OFFICE", "SEASON WRAP-UP", and "BEGIN SEASON N" on Recap are all Continue buttons with no decision
2. **Season Recap feels like a speed bump** — Rankings are neat the first time but become spam-click fodder by season 3
3. **Casting screen information overload** — 20+ data points when card details are expanded
4. **15 unnecessary clicks per full game** (3 dead clicks × 5 seasons)

## Changes Implemented
1. **Auto-advance "SEE BOX OFFICE"** — After wrapping + encore decision, the Release screen loads automatically after 1.8s with a progress bar. Player can still click to skip. Saves 1 click per season (5 per game).

## Recommendations (Not Yet Implemented)
- Merge Season Recap into Release screen as collapsible section
- Collapse card details on Casting by default  
- Remove Career Earnings table from Recap
- Consider merging Release → Shop flow

## Full Audit
See `FLOW-AUDIT.md` for detailed findings including click counts, screen-by-screen info density analysis, and the Season Recap assessment.

---

# GREENLIGHT Playtest Log — Round 15

**Date:** 2026-02-16
**Tester:** Bishop (AI subagent)
**Focus:** NARRATIVE ARC & SEASON IDENTITY — Making the game feel like a story

## Previous Round Summary
Round 14 pruned and balanced: nerfed Archetype Focus, fixed Chaos dominance (tags not incidents), cut Legacy Perks from 10 to 5, made Encore riskier by hiding deck info. Round 13 added daily seeds, leaderboard, and 6 challenge modes. Game had deep systems but every season felt identical — no narrative arc, no sense of industry context.

## Problems Identified
1. **No narrative arc across seasons** — Season 1 and Season 5 feel identical. Same talent pool, same pacing. No escalation beyond harder targets.
2. **Playing in a vacuum** — No other studios exist. You're making films in an empty industry with no competition or context.
3. **No between-season storytelling** — After release, you jump straight to the shop. No moment to reflect on how the season went relative to the industry.

## Changes Implemented

### 1. 🎬 Season Identity System
Each of the 5 seasons now has a distinct identity with scaled resources:

| Season | Name | Talent Pool | Budget Bonus | Flavor |
|--------|------|-------------|--------------|--------|
| 1 | THE DEBUT | 3 talent | +$0 | Limited budget, unknown talent. Prove you belong. |
| 2 | THE SOPHOMORE | 4 talent | +$0 | Avoid the slump. Deliver again or be a one-hit wonder. |
| 3 | THE PRIME | 5 talent | +$2M | Peak of your powers. More talent, bigger budgets. |
| 4 | THE RECKONING | 5 talent | +$3M | Rivals catching up. The market is ruthless. |
| 5 | THE LEGACY | 6 talent | +$5M | Define your studio forever. Make it count. |

- Season name + subtitle displayed on Greenlight screen
- Talent market size scales per season (was always 4)
- Budget bonuses for later seasons offset harder targets
- Creates a narrative arc from scrappy indie to legacy studio

### 2. 🦅 Rival Studios (3 AI Competitors)
Three rival studios release films each season alongside the player:

- **🦅 Apex Global** — Big-budget blockbuster factory (Action/Sci-Fi focus, quality 15-45)
- **🕯️ Lumière Collective** — Prestige arthouse darling (Drama/Romance focus, quality 18-40)
- **👻 Fright Factory** — Genre specialists with cult followings (Horror/Thriller focus, quality 12-42)

Rivals generate a random genre from their pool, roll quality (scaling up with season), and compute box office. Their films appear alongside yours in the Season Recap. Simple but effective — you feel like you're in an industry, not a vacuum.

### 3. 📰 Season Recap Screen
New phase between Release and Shop. Shows:

- **Headline** — Contextual news headline based on performance ("Newcomer Shocks Industry!", "Studio in Crisis — Board Meeting Called", etc.)
- **Box Office Rankings** — All films (yours + 3 rivals) ranked by box office, with tier emojis and color coding
- **Career Earnings** — Running totals for all studios with crown for the leader
- **Next Season Preview** — Shows upcoming season identity name and description

Headlines are dynamic based on: season number, player tier, whether player topped the charts, strike count, reputation, rival performance. ~15 unique headline templates.

### 4. 📊 Rival Film Title Generator
Rivals get procedurally generated film titles per genre:
- Action: "Iron Protocol", "Shadow Fury", "Crimson Dawn"
- Drama: "The Weight of Silence", "After the Storm"
- Horror: "The Hollow", "Below the Surface"
- etc.

Adds flavor and makes the recap screen feel like reading Variety.

## Technical Notes
- `src/rivals.ts` — **NEW** — Rival studios, season identities, film generation, headline generation
- `src/screens/SeasonRecapScreen.tsx` — **NEW** — Full recap UI with phased reveals
- `src/types.ts` — Added `seasonRecap` phase, `RivalSeasonData` type, `rivalHistory`/`cumulativeRivalEarnings` to GameState
- `src/gameStore.ts` — Rival film generation in `resolveRelease()`, season identity budget bonuses in `beginSeason()`, talent pool scaling from season identity, new `proceedToRecap()`/`proceedFromRecap()` flow
- `src/screens/ReleaseScreen.tsx` — Now calls `proceedToRecap` instead of `proceedToShop`
- `src/screens/GreenlightScreen.tsx` — Shows season identity name + description
- `src/App.tsx` — Routes `seasonRecap` phase to SeasonRecapScreen
- Zero TypeScript errors (`tsc --noEmit` clean)

## Design Philosophy
- **Story emerges from structure, not scripted events.** The season names, rival results, and headlines create narrative without railroading.
- **Competition creates context.** Seeing "#1 at the box office" vs "#4 behind Apex Global" gives your numbers meaning.
- **Escalation creates drama.** Season 1's limited talent pool → Season 5's full industry feels like career progression.
- **No new mechanics.** This round adds zero card mechanics, zero perks. It's purely about making existing gameplay FEEL like a story.

## Deployment
- **URL:** https://greenlight-plum.vercel.app
- Deployed to Vercel production

## What's Next (Round 16 Ideas)
- Rival studios that adapt to player success (if player dominates, rivals get better)
- End-of-career retrospective with all rival comparisons
- Industry awards ceremony between seasons
- Rival studio "feuds" that affect market conditions

---

# GREENLIGHT Playtest Log — Round 13

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Focus:** ENDGAME AND REPLAYABILITY — Why come back after winning?

## Previous Round Summary
Round 12 added full onboarding system: auto-show tutorial for first-timers, contextual phase tips, redesigned How to Play modal, persistent "?" help button. Game was polished and accessible but had thin endgame — after beating Normal and NG+/Director Mode, there was no compelling reason to keep playing.

## Endgame Analysis

### Problems Identified
1. **NG+ and Director Mode are just number multipliers** — Same gameplay, higher targets. Not a meaningfully different experience.
2. **No daily/competitive element** — No way to compare runs or chase a specific score.
3. **No challenge modes** — Every run follows the same rules. No modifiers to force new strategies.
4. **No leaderboard** — Scores vanish after the end screen. No persistent record of achievements.
5. **One dominant strategy** — Precision Focus + clean wrap + prestige archetype was consistently the best path.
6. **No reason to experiment** — Without challenge constraints, players optimize once and repeat.

### What Makes Roguelites Replayable?
Looking at Slay the Spire, Hades, Balatro:
1. **Daily runs** — Same seed for everyone, compete on a level field
2. **Challenge modes** — Forced constraints that break dominant strategies
3. **Leaderboards** — Persistent score tracking creates personal bests to chase
4. **Score multipliers** — Reward risk-taking with higher scores
5. **Variety of viable strategies** — No single dominant path

## Changes Implemented

### 1. 📅 Daily Seed Runs
- Deterministic seeded PRNG (Mulberry32) replaces Math.random when active
- Same seed every day based on date string — everyone gets identical RNG
- Daily run button on start screen shows today's date
- Once completed, shows your score and grays out (one attempt per day)
- Seeded RNG affects: script generation, talent markets, market conditions, deck shuffling
- Creates a daily ritual: "Let me try today's run"

### 2. 🏆 Local Leaderboard (Hall of Fame)
- Persistent top 20 runs tracked in localStorage
- Shows: rank (S/A/B/C/D), score, films made, mode, challenge, win/loss
- New "Hall of Fame" tab on start screen
- Film titles displayed as a career timeline
- Gold/silver/bronze coloring for top 3 entries
- Daily runs and challenge runs clearly labeled
- Scores are comparable across modes via challenge multipliers

### 3. ⚡ Six Challenge Modes
Each fundamentally changes how you play:

- **🎥 One Take** (×1.5 score) — Cannot wrap early. Must draw every card. No encore. Forces you to build decks that survive full draws.
- **💸 Shoestring Budget** (×1.8 score) — Start with $8M, reduced stipend ($3M), perks cost +$1. Every hiring decision is agonizing.
- **📝 Critics' Choice** (×1.6 score) — Targets ×1.5, flops lose 2 reputation. But blockbusters give +$10M extra. High risk, high reward.
- **🎭 Typecast** (×1.4 score) — First genre locks in for all 5 seasons. Only matching scripts appear. Genre mastery accumulates faster (+3/film). Rewards deep specialization.
- **⚡ Speed Run** (×2.0 score) — Only 3 seasons with late-game difficulty (seasons 3/4/5 targets). 2 strikes = fired. Every decision is critical.
- **🌪️ Chaos Reigns** (×1.7 score) — All talent +2 Heat. Incidents everywhere but each gives +1 quality. Forces Chaos builds and incident management.

### 4. 🎯 Challenge Score Multipliers
- Each challenge has a score multiplier applied at end of run
- Displayed on challenge selection cards and end screen
- Incentivizes playing harder modes for leaderboard glory
- Speed Run at ×2.0 is the highest risk/reward

### 5. 📊 Tabbed Start Screen
- Three tabs: PLAY (default), CHALLENGES, HALL OF FAME
- Tabs only appear after first run (clean first-time experience)
- Challenge cards show rules, emoji, description, and multiplier
- Clean grid layout for leaderboard with sortable visual hierarchy

### 6. 🔧 Dynamic Game Length
- `maxSeasons` and `maxStrikes` are now per-run state (not hardcoded to 5/3)
- Header dynamically shows "Season X/Y" and "Strikes X/Y"
- Speed Run uses 3 seasons / 2 strikes
- Future challenges could use different values

## Technical Notes
- `src/seededRng.ts` — Mulberry32 PRNG, daily seed generation, global RNG activation
- `src/leaderboard.ts` — localStorage persistence, top 20 tracking, daily best lookup
- `src/challenges.ts` — Challenge mode definitions with rules and multipliers
- All `Math.random()` calls in data.ts and gameStore.ts replaced with `rng()` (transparent seeded/unseeded)
- Challenge effects integrated at 8 game logic points: budget, wrapping, targets, stipend, perk costs, genre locking, incident bonuses, mastery rates
- Zero errors on `tsc --noEmit`

## Files Modified
- `src/seededRng.ts` — **NEW** — Seeded PRNG, daily seeds, global RNG state
- `src/leaderboard.ts` — **NEW** — Local leaderboard persistence
- `src/challenges.ts` — **NEW** — 6 challenge mode definitions
- `src/types.ts` — Added `daily`/`challenge` to GameMode, added challengeId, dailySeed, lockedGenre, maxSeasons, maxStrikes to GameState
- `src/data.ts` — Replaced Math.random with seeded rng(), updated getSeasonTarget for challenges
- `src/gameStore.ts` — Challenge effects throughout (budget, wrapping, targets, stipend, perk costs, genre lock, incident bonuses, mastery), daily seed activation, dynamic seasons/strikes
- `src/screens/StartScreen.tsx` — Tabbed UI (Play/Challenges/Hall of Fame), daily run button, challenge cards, leaderboard grid
- `src/screens/EndScreen.tsx` — Challenge score multiplier, leaderboard recording
- `src/components/Header.tsx` — Dynamic season/strike counts, challenge display

## Design Philosophy
- **Constraints breed creativity** — Challenge modes force players out of comfort zones into new strategies
- **Daily runs create rituals** — One attempt per day is addictive (see Wordle, NYT games)
- **Leaderboards make scores meaningful** — A score only matters if you can see it next to your other scores
- **Score multipliers reward risk** — Playing harder should be rewarded, not just harder for no reason
- **Every run should teach something new** — Typecast teaches genre mastery, One Take teaches deck-building, Shoestring teaches economy

## Deployment
- **URL:** https://greenlight-plum.vercel.app
- Deployed to Vercel production

## What's Next (Round 14 Ideas)
- Weekly challenge rotation with curated modifiers
- "Studio Specialization" paths — permanent unlockable bonuses for different playstyles
- Rival AI studios competing for box office share
- Film festival awards ceremony as between-season event
- Achievement badges that display on leaderboard entries
- Mobile responsive pass

---

# GREENLIGHT Playtest Log — Round 12

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Focus:** NEW PLAYER EXPERIENCE — Onboarding, first impressions, contextual guidance

## Previous Round Summary
Round 11 wired 8/10 legacy perks into actual gameplay, extracted shared components, and removed redundant quality target display. Game had deep mechanics across 11 rounds of iteration but zero onboarding — new players were dropped into a complex game with no guidance unless they found the small "How to Play" button.

## New Player Experience Analysis

### Problems Identified
1. **"How to Play" was invisible** — Small button below the main CTA, easy to skip. First-time players would click "NEW RUN" and be immediately confused by studio archetype selection with no context.
2. **No contextual guidance during gameplay** — Each phase (Greenlight, Casting, Production) has its own mechanics but zero inline explanation. Production especially is complex (draw-2-pick-1, incidents, wrapping, Director's Cut, Encore) with no in-game help.
3. **No persistent help access** — Once past the start screen, there was no way to review how the game works. Players who skipped the tutorial were stuck.
4. **How to Play was a wall of text** — The existing modal was informative but had poor visual hierarchy. New players wouldn't read 9 sections of dense text.
5. **No first-run detection** — Returning players and brand new players saw identical experiences.

### The First 2 Minutes (Before Changes)
1. See title screen → likely click "NEW RUN" immediately (skip "How to Play")
2. See archetype selection → "Choose Your Studio" with no context on what studios do strategically
3. See Neow screen → 3 cryptic choices with no guidance on which is safer for beginners
4. See Greenlight → 3 scripts with stats but no explanation of what "Base Score," "slots," or market matching means
5. See Casting → Complex talent cards with Skill/Heat/tags/chemistry — completely overwhelming

**Verdict:** A new player would be lost within 30 seconds.

## Changes Implemented

### 1. 🎓 Auto-Show Tutorial for First-Time Players
- First-run detection via localStorage (`greenlight_onboarding`)
- On very first visit, "How to Play" modal auto-opens after 600ms delay
- Modal has a warm welcome header: "Welcome, Studio Head!" with movie emoji
- Closing the tutorial marks the player as no longer a first-timer
- TL;DR box at the top: "Pick scripts → Cast talent → Play cards → Hit targets → Survive 5 seasons"

### 2. 📝 Redesigned "How to Play" Modal
- **TL;DR summary box** at top for scanners
- **Visual flow diagram** for the 5 season steps (numbered circles, step descriptions)
- **Card type cards** with colored borders instead of bullet list
- **"THE CORE" label** on Production step to signal importance
- **Action button** at bottom: "LET'S MAKE MOVIES! 🎬" for first-timers vs "Got it!" for returning players
- Better visual hierarchy throughout — scannable in 30 seconds

### 3. 💡 Contextual Phase Tips
- Dismissible tip banners appear at the top of each game phase
- Show for first 3 runs, on first visit to each phase per run
- **Neow:** "Each option shapes your early game differently. The cash is safe, the star is powerful but risky..."
- **Greenlight:** "Match the genre to market conditions for a big box office multiplier..."
- **Casting:** "Each talent adds their cards to production. High Skill = great cards. High Heat = powerful BUT adds Incidents..."
- **Production:** "Each draw reveals 2 cards. Incidents auto-play. 3 incidents = DISASTER. Wrap early to play safe..."
- **Shop:** "Buy studio perks for permanent bonuses. Hire new talent..."
- Tips auto-dismiss on click, styled with blue accent border and subtle pulse animation

### 4. ❓ Persistent Help Button in Header
- Small "?" button in top-right corner of the game header
- Available throughout the entire game
- Opens a condensed "Quick Reference" modal with goal, production rules, and tips
- Players who skip the tutorial can always get help mid-game

## Technical Notes
- New file: `src/onboarding.ts` — First-run detection, phase visit tracking, tip definitions
- New file: `src/components/PhaseTip.tsx` — Reusable contextual tip component
- Onboarding state persists in localStorage, resets phase visits each new run
- Tips show for first 3 runs then stop (avoids annoying veteran players)
- Zero impact on existing gameplay logic — purely additive UI layer

## Files Modified
- `src/onboarding.ts` — **NEW** — First-run detection, phase tips, localStorage persistence
- `src/components/PhaseTip.tsx` — **NEW** — Contextual tip banner component
- `src/screens/StartScreen.tsx` — Auto-show tutorial, redesigned How to Play modal, markRunStarted
- `src/components/Header.tsx` — Added "?" quick reference button
- `src/screens/NeowScreen.tsx` — Added PhaseTip
- `src/screens/GreenlightScreen.tsx` — Added PhaseTip
- `src/screens/CastingScreen.tsx` — Added PhaseTip
- `src/screens/ProductionScreen.tsx` — Added PhaseTip
- `src/screens/ShopScreen.tsx` — Added PhaseTip
- `src/index.css` — New styles: htp-tldr, htp-flow, htp-card-type, phase-tip, header-help-btn

## Design Philosophy
- **Don't make players read — show them at the moment they need it** — Phase tips > wall of text
- **First impressions are everything** — Auto-showing the tutorial ensures no one misses it
- **Respect player time** — TL;DR for scanners, detailed steps for readers, tips that fade after 3 runs
- **Always have an escape hatch** — The "?" button means help is always one click away

## Deployment
- **URL:** https://greenlight-plum.vercel.app
- Deployed to Vercel production

## What's Next (Round 13 Ideas)
- Interactive tutorial: guided first production with arrows/highlights
- Tooltip on hover for stats (Skill, Heat, tags) explaining what they mean
- "Recommended" badge on beginner-friendly archetype (Auteur)
- Mobile responsive pass
- Sound mute toggle in header

---

# GREENLIGHT Playtest Log — Round 11

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Focus:** POLISH AND COHESION — Making 10 rounds of systems work together cleanly

## Previous Round Summary
Round 10 added Archetype Focus system, Encore push-your-luck, and Legacy Unlock system with 10 career perks. Game had deep mechanics but legacy perks were display-only (never applied to gameplay), shared UI components were duplicated across 3 files, and the production screen had redundant quality target info.

## Code Analysis & Playtest Observations

### What Works
- The sheer depth is impressive: 41 talent, 12 scripts, 23 chemistry pairs, 5 tag archetypes, 3 game modes
- Archetype Focus creates genuine build-around decisions during casting
- Encore is a perfectly tense push-your-luck moment
- Sound effects and animations make every click feel satisfying
- Quality progress bar gives clear at-a-glance feedback during production

### Top 3 Rough Edges Found

#### 1. 🔴 Legacy Perks Were Purely Cosmetic (CRITICAL)
The entire Legacy system from Round 10 — 10 career perks that players unlock across runs — was **never wired into gameplay**. Players could see "Veteran Producer: +$3M starting budget" on the start screen, but the code never actually gave them the budget. This was the biggest broken promise in the game. All 10 perks were affected:
- `startBudget3` — never added to starting budget
- `horrorBase3` / `actionBase3` / `dramaBase3` — never added to script base scores
- `cheaperTalent` — never reduced hiring costs
- `startCrisisManager` — never granted the perk
- `precisionCleanWrap3` — never added to clean wrap bonus
- `marketBoost01` — never increased market multipliers
- `comebackBonus` — never gave quality after flops
- `chaosFirstIncident` — defined but not yet implemented (requires deeper production flow changes)

#### 2. 🟡 Duplicate Components Across 3 Files
`CardTypeBadge` and `CardPreview` were copy-pasted into ProductionScreen, ShopScreen, and CastingScreen with minor style variations. Any bug fix or change had to be applied 3 times. Classic code smell.

#### 3. 🟡 Redundant Quality Target Display
The production screen showed quality targets in TWO places with DIFFERENT calculations:
- Progress bar: "Quality: X / ~Y needed" (using market multiplier estimation)
- Quality breakdown: "🎯 Need ~Z quality" (using a simpler `target / 1.2` formula)
These often showed different numbers, confusing players about what they were actually aiming for.

## Changes Implemented

### 1. ⚡ Legacy Perks Now Functional (8 of 10 wired in)
Connected 8 legacy perk effects to actual game logic:
- **Veteran Producer** (`startBudget3`): Applied in `pickArchetype()` — adds $3M to starting budget
- **Horror/Action/Drama Master** (`horrorBase3`/`actionBase3`/`dramaBase3`): Applied in `calculateQuality()` — adds +3 to script base score for matching genre
- **Talent Whisperer** (`cheaperTalent`): Applied in `hireTalent()` — reduces hiring cost by $1 (min $1)
- **Perfectionist** (`startCrisisManager`): Applied in `pickNeow()` — grants Crisis Manager perk at run start
- **Precision Master** (`precisionCleanWrap3`): Applied in `calculateQuality()` — adds +3 to clean wrap bonus
- **Blockbuster Factory** (`marketBoost01`): Applied in `resolveRelease()` — adds +0.1 to market multiplier
- **Comeback Kid** (`comebackBonus`): Applied in `resolveRelease()` — adds +5 quality after a FLOP season

Note: `chaosFirstIncident` requires deeper production flow changes (modifying incident resolution mid-card-play) and is deferred to a future round.

### 2. 🧹 Shared Component Extraction
Extracted `CardTypeBadge` and `CardPreview` into `src/components/CardComponents.tsx`. Updated ShopScreen and CastingScreen to import from the shared module. ProductionScreen retains its own `SourceBadge` (unique to that screen) but could import `CardTypeBadge` in a future cleanup.

### 3. 🎯 Removed Redundant Quality Target
Removed the "Need ~X quality" line from the quality breakdown section. The progress bar above already shows this information more accurately and visually. One source of truth > two conflicting ones.

## Technical Notes
- `getActiveLegacyPerks()` is called at each relevant game action (archetype pick, neow, hire, quality calc, release)
- Legacy perks are cached in localStorage so they persist across browser sessions
- Shared components use consistent styling — the slight padding differences between screens were normalized
- Build verified with `tsc --noEmit` (zero errors)

## Files Modified
- `src/gameStore.ts` — Wired 8 legacy perk effects into pickArchetype, pickNeow, hireTalent, calculateQuality, resolveRelease
- `src/components/CardComponents.tsx` — **NEW** — Shared CardTypeBadge, CardPreview, TAG_CONFIG
- `src/screens/ShopScreen.tsx` — Replaced inline CardTypeBadge/CardPreview with shared imports
- `src/screens/CastingScreen.tsx` — Replaced inline CardTypeBadge/CardPreview with shared imports
- `src/screens/ProductionScreen.tsx` — Removed redundant "Need ~X quality" from quality breakdown

## Design Philosophy
- **If it's shown, it should work** — Legacy perks were the worst kind of bug: players earn rewards that do nothing
- **DRY matters for maintainability** — 10 rounds of iteration created natural duplication; now is the time to consolidate
- **One source of truth** — When two UI elements show conflicting info, remove the worse one

## Deployment
- **URL:** https://greenlight-plum.vercel.app
- Deployed to Vercel production

## What's Next (Round 12 Ideas)
- Wire up `chaosFirstIncident` legacy perk (requires production flow refactor)
- Sound volume/mute toggle in header
- Mobile responsive pass (game likely has layout issues on small screens)
- Rival studio system competing for box office share
- Film festival/awards ceremony as a between-season event

---

# GREENLIGHT Playtest Log — Round 10

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Focus:** STRATEGIC DEPTH — Meaningful decisions, specialization rewards, meta-progression

## Previous Round Summary
Round 9 added procedural sound effects, combo counter, and card slam animations. Game felt great to play but lacked strategic depth — card choices were often obvious, there was no reward for specializing in a tag archetype, wrapping had no risk/reward tension, and meta-progression was limited to NG+/Director Mode.

## Code Analysis & Playtest Observations

### What Works
- Tag system creates distinct build identities (Chaos, Precision, Momentum, Heart, Spectacle)
- Draw-2-pick-1 with block mechanic is satisfying
- Sound and animation juice make every click feel good
- Chemistry pairs encourage specific cast combos
- Director's Cut gives a satisfying peek/rearrange moment

### What Doesn't (Strategic Depth Issues)
1. **No reward for specialization** — Picking best-value talent always beats committing to a tag archetype. There's no bonus for building a focused deck.
2. **Wrapping is always safe** — Once quality is decent, there's zero reason to push further. No risk/reward tension at the most critical decision point.
3. **Meta-progression is thin** — After unlocking NG+ and Director Mode, there's nothing left to work toward across runs. No reason to try different strategies.

## Changes Implemented

### 1. ⚡ Archetype Focus System (Strategic Depth)
When 50%+ of your played tags are one type, you get an **Archetype Focus bonus**:
- **50-59%**: +2 quality
- **60-69%**: +4 quality
- **70-79%**: +6 quality
- **80%+**: +9 quality

This creates a genuine strategic choice during casting: do you grab the generically strong talent, or commit to a focused build for the escalating bonus? A 70% Chaos Focus (+6) is worth more than most individual card synergies, but requires sacrificing versatility.

Display: Prominent colored banner during production shows current focus status, percentage, and bonus. Also shown in quality breakdown on both Production and Release screens.

### 2. 🎬 Encore (Push Your Luck at Wrap)
After wrapping, you now face a choice: **Encore or Cut?**
- **Encore**: Draw 1 more card. If it's an Action/Challenge card, it plays with a **+3 bonus** on top of its normal value.
- **Risk**: If it's an Incident, you take **-3 extra penalty** AND lose Clean Wrap bonus.
- Full risk information shown: number of incidents remaining, percentage danger.

This transforms wrapping from a no-brainer into the game's most tense decision. With 2 incidents in the deck of 8 remaining cards (25% danger), do you push for +5-10 quality or protect your clean wrap bonus?

### 3. 🏆 Legacy Unlock System (Meta-Progression)
10 Legacy Perks that unlock based on career achievements across ALL runs:
- **Veteran Producer** (3 runs): +$3M starting budget
- **Horror/Action/Drama Master** (5 genre films): +3 base score for that genre
- **Chaos Embracer** (2 Chaos focus wins): First incident gives +3 quality
- **Precision Master** (2 Precision focus wins): Clean Wrap +3
- **Blockbuster Factory** (5 blockbusters): All market multipliers +0.1
- **Comeback Kid** (4+ flops, 1+ wins): After a FLOP, next film gets +5 quality
- **Perfectionist** (1 perfect run): Start with Crisis Manager perk
- **Talent Whisperer** (5 wins): All hiring costs $1 less

Legacy perks are shown on the start screen and newly unlocked perks get a celebration on the end screen. Career stats track total films, genre breakdown, tag focus wins, blockbusters, flops, and highest quality across all runs.

## Strategic Depth Analysis
These three changes create interlocking decisions:
1. **During casting**: "Do I build focused or flexible?" Focus gives big bonus but less adaptability.
2. **During production**: "Do I push my focus percentage or play the best card?" Sometimes discarding a strong card to maintain focus % is correct.
3. **At wrap**: "Do I encore?" Risk assessment based on remaining deck composition.
4. **Across runs**: "Which legacy perks am I close to? Should I try a Chaos build to unlock Chaos Embracer?"

## Technical Notes
- `ArchetypeFocus` type in types.ts tracks tag, percentage, bonus, and label
- `calculateArchetypeFocus()` in gameStore.ts computes focus from tagsPlayed
- `EncoreState` type handles the push-your-luck state machine
- `attemptEncore()` / `declineEncore()` manage the encore flow
- Legacy perks use a `check` function pattern for extensibility
- Career stats tracked in `UnlockState.careerStats` with genre/tag/tier breakdowns
- `recordRunEnd()` now accepts seasonHistory and dominantTag for proper tracking

## Files Modified
- `src/types.ts` — Added ArchetypeFocus, EncoreState types, encoreState to ProductionState
- `src/gameStore.ts` — calculateArchetypeFocus(), attemptEncore(), declineEncore(), archetypeFocusBonus in calculateQuality
- `src/unlocks.ts` — Complete rewrite: LegacyPerk system, career stats, getActiveLegacyPerks(), getNewlyUnlockedPerks()
- `src/screens/ProductionScreen.tsx` — Archetype Focus indicator, Encore UI, focus bonus in quality breakdown
- `src/screens/ReleaseScreen.tsx` — Archetype Focus in quality breakdown
- `src/screens/EndScreen.tsx` — Legacy perk unlock celebration, updated recordRunEnd call
- `src/screens/StartScreen.tsx` — Legacy perks display

## Design Philosophy
- **Reward commitment, not just luck** — Focus system makes intentional deck-building pay off
- **The best decisions are hard decisions** — Encore creates genuine tension, not obvious choices
- **Long-term goals drive short-term play** — Legacy perks give every run purpose, even losses
- **Visible information enables strategy** — Focus percentage and encore risk stats are transparent

## Deployment
- **URL:** https://greenlight-plum.vercel.app
- Deployed to Vercel production

## What's Next (Round 11 Ideas)
- Rival studios that compete for box office share
- Event-driven narrative beats between seasons
- Legacy perk selection (choose 3 of your unlocked perks per run)
- Synergy preview showing which cards in deck would fire given current tags
- Film festival system: nominate your best film for awards with mechanical rewards

---

# GREENLIGHT Playtest Log — Round 9

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Focus:** GAME FEEL — Juice, Sound, Satisfaction

## Previous Round Summary
Round 7 added 7 new talent, 4 scripts, NG+ modes, 8 chemistry pairs. Round 8 attempted browser playtesting but got stuck. Game had deep mechanics and visual polish but zero audio and muted feedback on the most important moments.

## Changes Implemented

### 1. 🔊 Procedural Sound Effects System (New: `src/sound.ts`)
Built a complete Web Audio API sound system with **zero external files** — all sounds are procedurally generated:
- **Card flip** — quick "fwip" noise burst + high frequency tick
- **Card pick** — satisfying bass "thunk" when choosing a card
- **Card discard** — descending whoosh for rejected cards
- **Synergy chime** — ascending sparkle (880→1320→1760 Hz arpeggio)
- **Combo escalation** — pitch rises with combo count, adds harmonics at 3+
- **Incident** — ominous bass thud (80Hz + noise)
- **Disaster** — dramatic sawtooth crash with layered noise
- **Blockbuster reveal** — triumphant C major fanfare with shimmer overlay
- **Flop** — sad descending trombone (440→370→311→261 Hz)
- **Hit/Smash** — positive two-note chime
- **Challenge bet** — tension riser (sawtooth sweep 200→800 Hz)
- **Wrap** — film reel click pattern
- **Victory** — full celebration with shimmer overlay
- **Block** — shield clang (square wave + noise burst)
- **Button click** — subtle tick

Sounds are integrated into: ProductionScreen (draw, pick, discard, wrap, block, bet, incidents, disasters), ReleaseScreen (tier-specific reveals), EndScreen (victory/defeat).

### 2. 🔥 Combo Counter System
Tracks consecutive synergy fires during production:
- **2× NICE!** — gold text, bounce-in animation
- **3× COMBO!** — orange, larger, pulsing glow
- **4× ON FIRE!** — red, even larger, faster glow
- **5× LEGENDARY!** — bright red, massive text, intense glow + text-shadow
- Each combo level has unique sound (ascending pitch + additional harmonics)
- Counter resets on incidents or non-synergy cards
- Auto-hides after 2.5s of inactivity
- CSS animations: `comboAppear` (spring bounce-in), `comboGlow3/4/5` (escalating pulse)

### 3. 💥 Card Choice Celebration
The core mechanic (draw-2-pick-1) now has dramatic feedback:
- **Chosen card**: "Card Slam" animation — scales up 115%, rotates, gold glow burst, then settles with persistent gold shadow
- **Rejected card**: "Card Shatter" — shrinks to 30%, rotates 15°, blurs out, fades to transparent
- **Quality number punch**: When quality changes, the number scales up 140% with gold flash, then springs back
- Sound layering: pick thunk + delayed discard whoosh for satisfying one-two feedback
- 350ms animation delay before state update so player sees the full animation

## Technical Notes
- Sound system is fully self-contained (`sound.ts`) — no dependencies, no audio files
- Uses `AudioContext` with lazy initialization and automatic `resume()` for browser autoplay policies
- All animations use `cubic-bezier(0.34, 1.56, 0.64, 1)` (spring overshoot) for satisfying bounce
- Combo counter CSS uses escalating `text-shadow` for glow that intensifies per level

## Files Modified
- `src/sound.ts` — **NEW** — Complete procedural sound effects system (150 lines)
- `src/screens/ProductionScreen.tsx` — Sound integration, combo counter state, card choice animations, quality punch
- `src/screens/ReleaseScreen.tsx` — Tier-specific sound triggers on reveal
- `src/screens/EndScreen.tsx` — Victory/defeat sounds
- `src/index.css` — Combo counter styles, card slam/shatter animations, quality punch animation

## Design Philosophy
- **Every click should feel good** — sound + visual + timing create satisfaction loops
- **Escalation creates excitement** — combo counter makes synergy chains feel increasingly powerful
- **The core choice matters most** — draw-2-pick-1 is THE moment, so it gets THE most juice
- **Procedural > sample** — Web Audio lets us tune sounds to match game events perfectly

## Deployment
- **URL:** https://greenlight-plum.vercel.app
- Deployed to Vercel production

## What's Next (Round 10 Ideas)
- Screen shake on disasters (subtle CSS transform on root)
- Haptic feedback on mobile (`navigator.vibrate`)
- Sound volume/mute toggle in header
- Film poster generator at end of production
- Combo multiplier that actually affects quality (risk/reward)

---

# GREENLIGHT Playtest Log — Round 7

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Focus:** Content Expansion & Replayability

## Previous Round Summary
Round 6 added extensive polish: card flip animations, narrative system, tag milestone visuals, dramatic tier reveals, victory particles, and ~15 CSS animations. Game felt great but content was limited — runs started feeling samey after 3-4 plays.

## Changes Implemented

### 1. New Talent — 7 New Characters (Total: 41 talent)
- **Yuki Tanaka** (Lead, $13) — 🔄 The Mimic. Cards copy/transform based on previous cards. Thriller specialist. Unique "mirror" mechanic.
- **Ezra Blackwood** (Lead, $16) — 🎲 The Gambler. Challenge cards become dramatically more powerful. Higher stakes bets (+7/-5, +4/-6). Horror specialist.
- **Iris Moon** (Lead, $7) — 🏗️ The Architect. Rewards diverse deck construction and careful play. Sci-Fi specialist. Budget-friendly precision build.
- **Felix Wu** (Support, $7) — 💕 The Healer. Active recovery cards that scale with incidents. Turns damage into Heart synergy.
- **Diego Fuentes** (Support, $8) — ✨🔥 Bridges Momentum + Spectacle. Explosive early-game support with tag generation.
- **Nova Sinclair** (Director, $11) — ✨🏗️ Visionary Futurist. Late-game scaling — cards get stronger the deeper you draw. Sci-Fi specialist.
- **Phantom Editing** (Crew, $11) — 🎯 Master Editors. Rewards discarding cards (selective play). Precision cards that scale with discard count.

### 2. New Scripts — 4 New Scripts (Total: 12 scripts)
- **Chrome Dynasty** (Sci-Fi, $5) — Cyberpunk spectacle. Momentum + Spectacle hybrid. Blockbuster bonus ability.
- **Last Dance** (Romance, $3) — Musical romance. Heart + Spectacle hybrid. Heart Engine ability with big finale payoffs.
- **Iron Verdict** (Drama, $4) — Courtroom drama. Precision-heavy with building case mechanic. Precision Craft ability.
- **Savage Lands** (Action, $3) — Survival adventure. Chaos + Momentum hybrid. NEW ability: Survival Mode — each Chaos tag = +1 quality, each Incident = +$1M budget.

### 3. New Game Modes — Unlock System
- **New Game+** — Unlocked after first victory. Targets ×1.4, start with +$5M budget. Harder but more rewarding.
- **Director Mode** — Unlocked after winning NG+. Targets ×1.8, start with +$10M budget. The ultimate challenge.
- Mode selection on start screen with visual indicators.
- Persistent unlock tracking via localStorage.

### 4. New Chemistry Pairs — 8 New Pairs (Total: 23)
- Yuki + Darius = "Shape Shifters" (+4)
- Ezra + Oliver = "Chaos Twins" (+3)
- Iris + Nova = "Architect & Visionary" (+4)
- Felix + Roxanne = "Damage & Repair" (+3)
- Diego + Mei Ling = "Explosive Duo" (+3)
- Phantom Editing + Ava = "Precision Machine" (+4)
- Yuki + Jimmy Chang = "Psychological Horror" (+3)

### 5. Unique Card Effects (Avoiding "+X if Y" Repetition)
- **Mirror Performance** (Yuki): Counts matching source types for scaling bonus
- **All Or Nothing** (Ezra): Scales with total draw count — infinitely
- **Invisible Cut** (Phantom): Scales with discard pile size
- **World Building** (Nova): Scales linearly with draw count
- **Reverse Psychology** (Yuki): Bonus when quality is negative
- **Structural Brilliance** (Iris): Rewards unique TAG diversity, not card diversity
- **Survival Mode** ability: Incidents give budget BACK — first ability to make incidents profitable

### 6. New Game+ Specific Achievements
- "NG+ Perfect" — Perfect run on New Game+
- "Director's Vision" — Perfect run on Director Mode

### 7. Expanded Starter Pools
- Added Iris Moon, Nova Sinclair, Phantom Editing to starter pools for more run variety

## Content Summary
| Category | Before | After | Added |
|----------|--------|-------|-------|
| Lead Actors | 10 | 13 | +3 |
| Support Actors | 8 | 10 | +2 |
| Directors | 8 | 9 | +1 |
| Crew | 8 | 9 | +1 |
| Scripts | 8 | 12 | +4 |
| Chemistry Pairs | 15 | 23 | +8 |
| Game Modes | 1 | 3 | +2 |
| **Total Talent** | **34** | **41** | **+7** |

## Design Philosophy
- **New mechanics > more of the same.** Each new talent has a genuinely unique card effect pattern.
- **Tag bridges create new archetypes.** Diego bridges Momentum+Spectacle, Yuki adapts to any build.
- **Unlockable modes give endgame goals.** Win → NG+ → Director Mode creates a clear progression.
- **Survival Mode is the boldest ability** — it makes incidents profitable, creating a true "embrace chaos" playstyle.

## Files Modified
- `src/data.ts` — 7 new talent, 4 new scripts, 8 new chemistry pairs, expanded starter pools, NG+ target scaling
- `src/types.ts` — Added GameMode type
- `src/gameStore.ts` — NG+ budget bonuses, survivalMode script ability
- `src/unlocks.ts` — Full rewrite: NG+/Director unlock tracking, mode-aware recording
- `src/screens/StartScreen.tsx` — Game mode selector UI
- `src/screens/EndScreen.tsx` — Mode label, NG+ achievements
- `src/screens/GreenlightScreen.tsx` — Mode-aware targets
- `src/screens/ReleaseScreen.tsx` — Mode-aware targets
- `src/screens/ProductionScreen.tsx` — Mode-aware targets
- `src/components/Header.tsx` — Mode-aware targets

## What's Next (Round 8 Ideas)
- Sound effects via Web Audio API
- Film poster generator at end of each production
- Seasonal leaderboard / high score tracking
- More scripts for underserved genres (Comedy only has 1)
- "Legacy" mode: carry 1 talent between runs

---

# GREENLIGHT Playtest Log — Round 6

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Focus:** Polish & Game Feel (JUICE)

## Previous Round Summary
Round 5 added keyword tag system (Momentum, Precision, Chaos, Heart, Spectacle) with cross-talent synergies. Game had strategic depth but lacked satisfying feedback — card reveals were flat, synergies fired silently, victory/defeat screens were underwhelming.

## Changes Implemented

### 1. Card Flip Animations (Major Feel Upgrade)
- Cards now flip in with a 3D perspective rotation (`rotateY`) instead of the flat slide-down
- Incident cards have their own danger-variant flip with a red glow burst at peak
- Cards with fired synergies gain a persistent gold glow border (`synergy-active` class)

### 2. Production Narrative System (New)
- Added contextual flavor text below the quality meter that changes with production state
- "Quiet on set... and... ACTION! 🎬" at start
- "Magic is happening on set!" when big synergies fire
- "The studio execs are getting nervous..." at 2 incidents
- Creates the feeling of watching a movie get made, not just clicking through cards

### 3. Tag Activation Visual Feedback
- Tags at ≥3 count now have a glowing milestone animation (`tag-milestone`)
- Tags at ≥2 show an "↗" arrow indicating building momentum
- Tag threshold text pulses with currentColor glow

### 4. Dramatic Tier Reveals on Release
- Each tier has its own unique animation:
  - **FLOP**: Violent screen shake (8px, rotation)
  - **HIT**: Clean pop-in scale
  - **SMASH**: Bouncy overshoot with rotation
  - **BLOCKBUSTER**: Dramatic zoom from 0 with rotation + persistent glow pulse
- Screen flash effects: gold flash on BLOCKBUSTER, red flash on FLOP
- Box office number has `score-reveal` blur-to-focus animation

### 5. Victory/Defeat Screens Overhauled
- **Victory**: Particle rain (🌟⭐🏆🎬✨🎭🎥💫) falling across the screen
- **Victory title**: Dramatic scale + letter-spacing animation
- **Game Over title**: Heavy drop-in from above
- Rank display has blur-to-focus reveal

### 6. Production UX Polish
- Draw button pulses red when at 2 incidents (danger tension!)
- Clean Wrap badge now has a persistent gold pulse glow
- Disaster banner has a dramatic scale-bounce entry animation with flavor text ("The studio insurance department is on the phone...")
- Drawing animation now shows 2 spinning cards side by side with gold drop-shadow
- Selectable cards (draw-2-keep-1) have hover lift effect (+6px translateY, scale 1.03)

### 7. CSS Animation System
Added ~15 new keyframe animations and utility classes:
- `cardFlipIn` / `cardFlipInDanger` — 3D card reveals
- `screenFlashRed` / `screenFlashGold` — full-screen color flashes
- `tagBurst` / `tagMilestoneGlow` — tag activation feedback
- `disasterEntry` — dramatic disaster banner
- `particleFall` — victory screen particles
- `victoryTitle` / `gameOverTitle` — end screen title animations
- `cleanWrapPulse` — persistent clean wrap indicator
- `drawDramatic` — danger-state draw button
- `scoreReveal` — blur-to-focus number reveal

## Tag System Verification
Code review confirms tags are working correctly:
- Tags tracked in `tagsPlayed` Record during `resolveCardPlay`
- `buildSynergyContext` aggregates tags from all played cards
- Script abilities (`finalGirl`, `heartEngine`, `precisionCraft`, `blockbusterBonus`) all read `prod.tagsPlayed` correctly
- Tag display on cards uses `[...new Set(card.tags)]` for dedup with count display
- No bugs found in Round 5 tag implementation

## Files Modified
- `src/index.css` — 15+ new animations, improved card/tier/screen effect styles
- `src/screens/ProductionScreen.tsx` — Narrative system, tag milestone classes, danger draw button, improved disaster banner, 2-card draw animation
- `src/screens/ReleaseScreen.tsx` — Screen flash effects, score reveal animation
- `src/screens/EndScreen.tsx` — Victory particles, dramatic title animations

## Design Philosophy
- **Juice doesn't change mechanics — it makes existing mechanics FEEL good**
- Every action should have visual feedback proportional to its importance
- Tension should build visually (pulsing buttons, glowing tags, screen effects)
- Victory/defeat should feel EARNED — dramatic reveals, not instant displays

## What's Next (Round 7 Ideas)
- Add CSS `@property` animated gradients for card backgrounds
- Sound effects via Web Audio API (card flip, synergy chime, disaster boom)
- Haptic feedback (navigator.vibrate) on mobile for incidents
- Add a "film poster" generated at end of each production with cast/stats
- Screen transition animations between phases (fade/wipe)

---

# GREENLIGHT Playtest Log — Round 5

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Focus:** Deck-building depth & player agency

## Previous Round Summary
Round 4 fixed: season targets, smart market generation, economy death spirals. Game was playable but lacked strategic depth — card choices felt samey and deck composition didn't matter much.

## Pre-Change Analysis

### Core Problem: Homogeneous Synergies
~80% of card synergies followed the pattern: "if [source type] was played, +N". This meant:
- **No deck-composition strategy** — it didn't matter which specific actors/directors you picked, just their Skill/Heat ratio
- **Obvious card choices** — draw-2-keep-1 almost always had a clearly better pick
- **No build-around mechanics** — no reason to specialize
- **Talent felt interchangeable** — most actors did the same thing at different power levels
- **Scripts lacked identity** — abilities were weak and didn't change playstyle

### What Makes Good Deck-Building?
Looking at Slay the Spire (the gold standard):
1. **Card keywords/tags** that create cross-card synergies
2. **Build-around cards** that are weak alone but powerful with support
3. **Meaningful tradeoffs** — power at a cost
4. **Deck archetypes** that emerge from card choices
5. **Information** that helps players make strategic decisions

## Changes Implemented

### 1. Keyword Tag System (Major)
Added 5 keyword tags that create cross-talent synergies:
- **🔥 MOMENTUM** — Rewards action streaks. Cards get stronger the more Momentum tags are played. Jake Steele, Mei Ling, Neon Fury.
- **🎯 PRECISION** — Rewards clean, disciplined productions. Bonuses for no incidents, discards, small plays. Sophie Chen, Ava Thornton, Zoe Park, Maria Santos, Broken Crown.
- **💀 CHAOS** — Turns disasters into power. Incidents and chaos feed these cards. Oliver Cross, Roxanne Blaze, Jimmy Chang, Nightmare Alley.
- **💕 HEART** — Emotional resonance builds throughout production. Late-game payoffs for accumulated heart. Rafael Santos, Hearts on Fire.
- **✨ SPECTACLE** — Big, expensive, impressive. Rewards large-scale productions. Frank DeLuca, Apex VFX, Neon Fury.

### 2. Tag-Aware Card Synergies (Major)
Rewrote ~40 cards across 10+ talent and 5 scripts to use tag-based synergies:
- Cards now have dual conditions: traditional source-type checks PLUS tag-based bonuses
- Example: Mei Ling's "Wire Work Mastery" now gives +3 if Crew played AND +1 per Momentum tag
- Build-around cards: Oliver Cross's "Oscar-Worthy Take" gives +2 per Incident AND +2 per Chaos tag (max +8)
- Bridge character: Darius Knox's cards carry ALL tags, making him the ultimate combo enabler

### 3. Tag-Aware Script Abilities (Major)
Scripts now interact with the tag system:
- **Nightmare Alley (Horror):** Each Chaos tag = +1 quality. Rewards Chaos-heavy casts.
- **Neon Fury (Action):** Market multiplier +0.3 base + 0.05 per Spectacle tag. Spectacle-heavy casts earn more.
- **Hearts on Fire (Romance):** Each Heart tag = +1 quality. 6+ Hearts = ×1.2 multiplier. Romance-focused builds explode.
- **Broken Crown (Drama):** Each Precision tag = +1 quality. Clean wrap bonus doubled. Precision builds shine.

### 4. Strategic Casting Archetypes (Emergent)
The tag system creates natural deck archetypes:
- **MOMENTUM build:** Jake Steele + Mei Ling + Neon Fury script → action streak machine
- **CHAOS build:** Oliver Cross + Roxanne Blaze + Jimmy Chang + Nightmare Alley → incidents become power
- **PRECISION build:** Sophie Chen + Ava Thornton + Zoe Park + Broken Crown → clean wrap perfection
- **HEART build:** Rafael Santos + Hearts on Fire + any actor support → emotional crescendo
- **SPECTACLE build:** Frank DeLuca + Apex VFX + Neon Fury → big budget powerhouse
- **HYBRID builds:** Darius Knox bridges archetypes; Broken Crown rewards both Precision AND Heart

### 5. UI Improvements
- **Tag badges** on cards during production (colored emoji indicators)
- **Tag tracker** during production shows accumulated tag counts with threshold indicators
- **Deck preview tags** during casting shows tag composition and highlights dominant archetypes
- **Tag indicators** in shop and casting talent cards
- **Synergy preview** in draw-2-keep-1 now accounts for tags

### 6. Incident Cards Have Value
In the CHAOS archetype, incidents now carry Chaos tags. This creates a genuine strategic question: "Do I want incidents in my deck?" Roxanne Blaze's incidents give 2 Chaos tags each, which fuel Oliver Cross and Jimmy Chang.

### 7. Meaningful Card Choices
Draw-2-keep-1 now presents real dilemmas:
- "This card has better base value, but that one has tags I need for my build"
- "Do I keep the Momentum card to maintain my streak, or the Precision card for clean wrap?"
- Block mechanic now has tag implications: blocking an incident prevents Chaos tag accumulation

## Design Philosophy
- **Don't just add content — make existing mechanics more interesting**
- Tags are not a new mechanic — they're a lens on existing card synergies that makes them visible and strategic
- Every tag has natural synergy with certain scripts, talent, and playstyles
- Incidents in Chaos builds are genuinely desired, not just tolerated — this is the deepest strategic change

## Files Modified
- `src/types.ts` — Added CardTag type, tags to CardTemplate/ProductionCard, tagsPlayed tracking
- `src/data.ts` — Rewrote ~40 cards, updated 4 script abilities, added tags throughout
- `src/gameStore.ts` — Tag tracking in SynergyContext, tag-aware script abilities, precision/heart/chaos bonuses
- `src/screens/ProductionScreen.tsx` — Tag display on cards, tag tracker, tag-aware synergy preview
- `src/screens/CastingScreen.tsx` — Tag summary in deck preview, tag indicators on card previews
- `src/screens/ShopScreen.tsx` — Tag display on talent cards and card previews

## What's Next (Round 6 Ideas)
- Add tags to remaining talent who don't have them yet (Valentina, Marcus, Lena, Camille, etc.)
- Add a "Tag Mastery" system: after 3+ films with a dominant tag, get a permanent bonus
- Consider a "Sacrifice" mechanic: discard a card from hand for bonus effects
- Add more hybrid scripts that reward mixing 2 tag types
- Balance pass on tag thresholds after extensive playtesting

---

# Round 14: Balance & Prune
**Date:** 2026-02-16
**Focus:** Subtractive balance — making existing systems tighter, not adding new ones.
**Deploy:** https://greenlight-plum.vercel.app

## Changes

### 1. Archetype Focus Nerfed
- **Threshold raised** from 50% to 60% minimum
- **Bonus capped** at +5 (was +9 at 80%)
- New curve: 60-69% = +2, 70-79% = +3, 80%+ = +5
- Still rewards focus, but hybrid builds are now competitive

### 2. Chaos Dominance Fixed
- **Wildcard Entertainment** no longer gives +2 quality per incident (still has 4-incident disaster threshold)
- **Oliver Cross**: Cards now scale off Chaos *tags*, not incident count. Broke Character incident now poisons next card instead of buffing actors.
- **Roxanne Blaze**: Viral Moment scales off Chaos tags only (not incidents). Drama On Set no longer buffs actors.
- **Jimmy Chang**: Atmosphere of Dread and Terror Payoff now reward Chaos tag accumulation, not incident count.
- **Yuki Tanaka**: Reverse Psychology only triggers on negative quality (removed per-incident bonus).
- **Survival Mode script**: Removed incident → budget recovery mechanic.
- **Philosophy**: Chaos tags are the fuel, not incidents. You need Chaos-tagged cards to power the archetype, but incidents still *hurt*. High variance, not free power.

### 3. Legacy Perks Simplified (10 → 5)
**Kept** (gameplay-changing):
- ⭐ Perfectionist (start with Crisis Manager)
- 🔄 Comeback Kid (FLOP → +5 quality next film)
- 💎 Precision Master (Clean Wrap +3)
- 🎭 Talent Whisperer ($1 hiring discount)
- 🏭 Blockbuster Factory (+0.1 market multipliers)

**Cut** (stat bumps):
- 🎖️ Veteran Producer (+$3M budget — boring)
- 👻 Horror Master (+3 base — invisible)
- 💪 Action Mogul (+3 base — invisible)
- 👑 Drama Royalty (+3 base — invisible)
- 🌪️ Chaos Embracer (first incident = upside — contradicts chaos fix)

### 4. Encore Tuned (Riskier)
- Failure penalty increased from -3 to **-5 extra**
- **Deck composition hidden** during Encore decision (no more counting cards)
- Deck forecast removed from production screen (was showing exact incident/action/challenge counts)
- Encore is now a genuine gut-check, not a math problem

### 5. UI Simplified
- Removed detailed deck composition display (action/challenge/incident breakdown)
- Stats bar simplified to Draws + Incidents only
- Deck shows only total remaining count
- Disaster risk warning still shows when at 2 incidents
- Reduced decision information overload

## Design Philosophy
- **Incidents should always hurt.** No mechanic should make you *want* incidents.
- **Chaos = tag accumulation**, not incident farming. Build Chaos through casting choices, not by getting lucky with incident timing.
- **Less information = harder decisions.** Hiding deck composition makes wrapping/encore genuine risk assessment, not calculation.
- **Fewer perks, more impact.** Each legacy perk should change how you play, not just add a number.

## Files Modified
- `src/gameStore.ts` — Archetype Focus rebalanced, Chaos archetype incident bonus removed, Survival Mode budget recovery removed, Encore penalty increased to -5
- `src/data.ts` — Oliver Cross, Roxanne Blaze, Jimmy Chang, Yuki Tanaka cards rebalanced; Wildcard archetype description updated
- `src/unlocks.ts` — Legacy perks cut from 10 to 5
- `src/screens/ProductionScreen.tsx` — Deck forecast removed, stats bar simplified, Encore UI hides deck composition
- `src/components/Header.tsx` — Updated help text for 60% focus threshold
