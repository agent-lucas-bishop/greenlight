# GREENLIGHT Playtest Log — Round 24

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Focus:** INTEGRATION AUDIT & COHERENCE — Cleanup round, remove more than add

## What Changed
This was a **pure cleanup round**. No new features. Net -100 lines removed.

### Dead Code Removed
- `getGameMode()`, `getChallengeId()`, `proceedToRecap()` — exported from gameStore but never called
- `drawProductionCard()` — legacy alias that just called `drawProductionCards()`
- `generateHeadline()` in rivals.ts — 50-line function completely superseded by `generateDetailedHeadline()` in narrative.ts
- `getNewlyUnlockedPerks()` in unlocks.ts — exported but never imported
- `resetOnboarding()` in onboarding.ts — exported but never imported
- `RivalSeason` interface — defined but never used (different from `RivalSeasonData` in types)
- `generateRivalFilm` export removed (only used internally in rivals.ts)

### Duplicate Code Fixed
- `CardTypeBadge` was defined **twice**: once in `components/CardComponents.tsx` (exported) and again as a local function in `ProductionScreen.tsx`. Removed the duplicate, now imports from CardComponents.

### Unused Imports Cleaned
- `gameStore.ts`: removed `addLeaderboardEntry`, `RivalFilm`, `ChallengeMode`, `DrawChoice`, `PendingChallenge`, `EncoreState`, `getUnlocks`, `generateCriticQuote`, `generateDetailedHeadline`
- `data.ts`: removed `SynergyContext`, `TalentType`
- `ShopScreen.tsx`: removed `CardTemplate`, `CardTag`
- `CastingScreen.tsx`: removed `CardTag`

### Issues Identified but NOT Fixed (Low Risk, High Churn)
- `redCount` in ProductionState is a legacy alias for `incidentCount` — always set to same value. Removing would touch many synergy lambdas in data.ts for zero behavioral change.
- `riskTag` / `RiskTag` on CardTemplate — never read for logic, only defined. Removing from 100+ card definitions = huge diff, no behavior change.
- `targetMultiplier` field on SeasonIdentity — always 1.0, never read. Cosmetic dead weight.

### Contradictions/State Issues Found
- None critical. The `redCount`/`incidentCount` duplication is the only real state sync risk, and they're always updated together (verified by audit).

### Challenge Mode Verification
All 6 challenges reference correct gameStore state:
- `one_take`: checks `state.challengeId` in `wrapProduction()` ✓
- `shoestring`: applied in `pickArchetype()`, `resolveRelease()`, `buyPerk()` ✓
- `critics_choice`: applied in `getSeasonTarget()`, `resolveRelease()` ✓
- `typecast`: applied in `pickScript()`, `beginSeason()`, `calculateQuality()` ✓
- `speed_run`: applied in `startGame()` (maxSeasons/maxStrikes) ✓
- `chaos_reigns`: applied in `pickScript()`, `resolveCardPlay()` ✓

## Build Status
- `npx tsc --noEmit` — ✅ clean
- `npm run build` — ✅ clean (417KB JS, 36KB CSS)
- Deployed via git push to Vercel

## Stats
- **Lines removed:** 109
- **Lines added:** 9
- **Net:** -100 lines
