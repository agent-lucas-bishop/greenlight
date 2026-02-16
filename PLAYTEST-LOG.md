# GREENLIGHT Playtest Log — Round 27

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Focus:** NEW GAME+ & REPLAYABILITY — Meta-progression, career stats, daily streaks, run history

## What Was Added

### 📊 Career Stats Panel (new tab on title screen)
- **Lifetime stats:** Total films, lifetime box office, blockbusters, win rate, best score, perfect runs
- **Genre breakdown:** Shows all genres explored with counts, progress toward 7/7
- **Rank distribution:** Visual breakdown of S/A/B/C/D ranks across all runs
- **Daily streak tracker:** Current streak + best streak with 🔥 indicator
- **Milestone progress:** 9 milestones with progress bars showing how close you are to unlocking each

### 🔓 New Milestone Unlocks (4 new legacy perks)
- **Indie Darling** 🎬 — Make 10 films → Start with +$2M budget
- **Mogul** 💰 — Earn $500M lifetime BO → Start with +$3M budget
- **Genre Savant** 🌈 — Film in all 7 genres → Genre mastery starts at +1 for all genres
- **Daily Devotee** 📅 — 7-day daily streak → Daily runs get +$3M starting budget

### 📅 Daily Challenge Streak
- Tracks consecutive days of daily challenge play
- Shows 🔥 streak counter on Daily Run button
- Best streak displayed in Career Stats panel
- Streak-based legacy perk reward

### 📜 Run History (new tab on title screen)
- Last 10 completed runs with full details
- Shows: rank, score, archetype, earnings, reputation, game mode, challenge
- Filmography per run with color-coded tiers
- Best film highlighted per run

### 🔧 Enhanced Tracking
- `recordRunEnd()` now tracks: total lifetime BO, rank distribution, archetypes used, challenges completed, daily streak
- All localStorage usage handles missing/corrupt data gracefully with defaults

## Build Status
- `npx tsc --noEmit` — ✅ clean (0 errors)
- `npm run build` — ✅ clean (435KB JS, 36KB CSS)
- Deployed via git push to Vercel

## Stats
- Round: 27
- Files changed: 4 (unlocks.ts, gameStore.ts, StartScreen.tsx, EndScreen.tsx)
- New features: 4 (career stats, milestones, daily streak, run history)
- New legacy perks: 4 (Indie Darling, Mogul, Genre Savant, Daily Devotee)
- Bug/regression: None

---

# GREENLIGHT Playtest Log — Round 26

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Focus:** STRESS-TEST & BALANCE R25 SYSTEMS — Talent baggage, genre trends, budget debt

## Simulation Analysis

### Strategy 1: All-Star Expensive Cast (Heavy Baggage)
- **Valentina ($18 + $3M/film) + Frank DeLuca ($14 + $4M/film):** $32 hire cost against $15-30 starting budget = instant debt. Plus $7M/film ongoing drain across 5 seasons = $35M lifetime overhead. Combined with Valentina's 3 incidents in deck (2 base + 1 heat card) and Frank's 2 incidents... disaster risk is real.
- **Verdict:** Playable but genuinely risky. The debt spiral + baggage costs make this a "go big or go home" strategy. A single FLOP cascades into unrecoverable debt. **BALANCED ✅**

### Strategy 2: Budget Cast (Sophie Chen + Zoe Park)
- **Sophie ($6) + Zoe ($8):** $14 total, stays in budget. Sophie grows with Rising Star trait. Zoe + Sophie = precision synergy dream team. Clean wrap bonuses compound.
- **Concern:** This was clearly dominant. Low risk, decent reward, Sophie scales to S5+ by endgame.
- **Assessment:** The gap between S3 and S5 talent skill (+2 raw quality) isn't enough to justify the massive cost/baggage difference... BUT genre trends and market conditions add enough variance that budget cast needs good trend luck too. **BALANCED ✅** (after trend tuning)

### Strategy 3: Chasing Hot Genres
- **Before tuning:** +40% box office for hot genres was game-deciding. If you got a hot genre script, it was always correct to pick it regardless of other factors.
- **After tuning:** +25% is meaningful (worth ~$5-8M extra on a typical film) but won't overcome a bad production or poor cast. Cold genres at -20% are a headwind but not a death sentence.
- **Key insight:** The tension should be "chase trends for a boost OR pick the genre you've mastered for mastery bonus?" Both paths should be viable. **TUNED ✅**

### Strategy 4: Intentional Debt Spending
- **The Exploit Attempt:** Borrow $15 in Season 1, hire all-star cast, pray for blockbuster. If blockbuster ($22 bonus + earnings), pay off debt easily. If flop, spiral to death.
- **After S1 interest:** $15 * 1.2 = $18M → triggers rep penalty. Even with debt paydown in shop, you need to earn enough to cover it.
- **Assessment:** This IS a viable risky strategy, which is good! It should be possible but punishing if it fails. The 20% interest + $15M rep penalty threshold creates a narrow window. **BALANCED ✅**

## Issues Found & Fixed

### 🐛 BUG: Marcus Webb's Schedule Conflict NOT Enforced
- `slotBlocked: 'Wild'` was defined in data but never checked in game logic
- Marcus Webb (S5, $15) had NO actual downside — free premium talent
- **Fix:** Added enforcement in `assignTalent()` + `isSlotBlocked()` helper. Wild slots show 🔒 and "Blocked by schedule conflict" when Marcus is cast. Cannot assign talent to blocked slots.
- **Impact:** Marcus now has a real cost — losing a Wild slot means less flexibility in casting.

### ⚖️ TUNED: Genre Trend Bonuses Too Strong
- Hot genres: +0.40 → **+0.25** multiplier
- Cold genres: -0.30 → **-0.20** multiplier  
- Rival hot genre chase bonus: 1.3x → **1.2x**
- Rival cold penalty: 0.7x → **0.8x**
- **Rationale:** At +0.4, hot genres were always the correct pick. At +0.25, they're a nice bonus but don't override other considerations (mastery bonus, cast synergy, script quality).

### 💳 NEW: Debt Paydown in Shop Phase
- Players can now actively pay down debt between seasons
- Buttons for $5M, $10M, and "pay all" in shop phase
- Creates a real strategic choice: invest in talent/perks OR reduce debt before it compounds
- **Rationale:** Without this, debt was "set it and forget it" — players had no agency over it once incurred.

## Edge Cases Checked

| Scenario | Result |
|----------|--------|
| Oliver Cross chaos self-synergy | His extra incident feeds chaos tags → net ~0 quality, but adds disaster risk. Fair trade. ✅ |
| Baggage talents always/never picked? | All have genuine trade-offs now. No free S5 talents. ✅ |
| Debt borrow-and-blockbuster exploit | Viable but risky — one flop = spiral. Interest + rep penalty = real consequences. ✅ |
| Hot genre + good market condition stacking | Reduced from potential +0.4+0.5=+0.9 boost to +0.25+0.5=+0.75. Still strong combo but requires multiple things going right. ✅ |
| Marcus Webb with no Wild slots in script | Schedule conflict is irrelevant — he's just good. Only matters on scripts WITH Wild slots. Acceptable. ✅ |

## Build Status
- `npx tsc --noEmit` — ✅ clean
- `npm run build` — ✅ clean (423KB JS, 36KB CSS)
- Deployed via git push to Vercel

## Stats
- Round: 26
- Files changed: 4 (gameStore.ts, CastingScreen.tsx, ShopScreen.tsx, rivals.ts)
- Bug fixed: 1 (Marcus Webb schedule_conflict enforcement)
- Numbers tuned: 4 (hot/cold genre bonuses, rival trend modifiers)
- Feature added: 1 (debt paydown in shop)
