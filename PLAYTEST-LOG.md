# PLAYTEST-LOG — Round 49: Full Quality Pass & Integration Audit

## Date: 2026-02-16

### Integration Audit Results
All game flows traced end-to-end:
- ✅ New game → tutorial → neow → greenlight → cast → produce → release → shop → repeat → end
- ✅ Daily run flow (seeded RNG, daily modifier, daily share text)
- ✅ NG+ flow (unlocked after first win, ×1.4 targets, +$5M budget)
- ✅ Director Mode flow (unlocked after NG+ win, ×1.8 targets, +$10M budget)
- ✅ Save/resume flow (mid-run save with function rebuilding, snap to clean phase)
- ✅ All 6 endings (S through F, bankruptcy on game over)
- ✅ Challenge modes: One Take, Shoestring, Critics' Choice, Typecast, Speed Run, Chaos Reigns

### Fixes Applied

#### Dead Code Removal
1. **Unused import `isFirstRun`** in `App.tsx` — removed
2. **Unused import `CardTag`** in `CardComponents.tsx` — removed
3. **Unused import `isTutorialActive`** in `TutorialOverlay.tsx` — removed
4. **Unused import `TalentBaggage`** in `data.ts` — removed
5. **Unused constant `GENRES`** in `data.ts` — removed
6. **Unused `ctx` variables** (2 instances) in `gameStore.ts` `drawProductionCards()` — these were computing synergy context for challenge bets but never using the result. Removed.
7. **Dead `GamePhase` values** — `'awards'` and `'seasonRecap'` were in the type union but never set or matched anywhere. Removed from types.
8. **Unused loop variable `i`** in `TutorialOverlay.tsx` step indicator map — removed

#### Audio Bug Fix
9. **4 sound effects bypassing master volume** — `cardDiscard`, `challenge`, `boxOfficeReveal`, and `seasonTransition` connected directly to `AudioContext.destination` instead of routing through `getMaster()`. This meant volume slider and mute toggle had no effect on these sounds. Fixed all 4 to route through master gain node.

#### TypeScript Strictness
10. **`any` type in `StatTooltip.tsx`** — `ref as any` cast replaced with proper `React.Ref<HTMLSpanElement>` type

### State Consistency Audit
All localStorage keys verified — no collisions:
- `greenlight_unlocks` — persistent progression
- `greenlight_onboarding` — first-run detection
- `greenlight_tutorial` — tutorial step tracking
- `greenlight_midrun_save` — save/resume (version-gated)
- `greenlight_leaderboard` — run history
- `greenlight_hall_of_fame` — best-ever records
- `greenlight-muted` / `greenlight-volume` — audio prefs

Save/load round-trips correctly handle function serialization/rebuilding for all card synergies, challenge bets, and talent abilities.

### CSS Audit
- z-index range clean: 0→1000 in stylesheet, 900/1000/2000 for modal overlays (inline)
- No conflicting styles found
- Mobile bottom-sheet pattern properly applied to modals
- All animations use CSS classes with proper cleanup

### Build Status
- `tsc --noEmit`: ✅ Clean
- `npm run build`: ✅ Clean (428ms, 14 chunks)

---

## Round 50 — Analytics, Polish & Launch Readiness (2026-02-16)

### Changes
1. **Lightweight Analytics** — Added anonymous event tracking via `navigator.sendBeacon` → `/api/events` Vercel serverless endpoint. Tracks game starts (mode + archetype), game completions (win/loss + seasons), season outcomes (tier, genre, quality, box office), and tutorial skips. No cookies, no PII, no external services. Events logged to Vercel function logs for now.

2. **Error Boundary** — Added top-level React Error Boundary that catches crashes and shows a themed "Something went wrong — tap to restart" screen. Clears mid-run save to prevent crash loops. Career stats and unlocks are preserved.

3. **Visual Polish** — Fixed header right padding (110px → 56px) that wasted space on all screens. Added text-overflow ellipsis protection for card titles on mobile. Added word-break for card body text on narrow screens.

4. **README.md** — Updated deployment URL to greenlight.codyp.xyz. Added screenshot placeholder, analytics section, and proper credits with tech stack attribution.

### Build
- `tsc --noEmit`: ✅ Clean
- `npm run build`: ✅ Clean (453ms, 14 chunks)

### Milestone: Round 50
50 rounds of iteration from concept to a fully featured roguelite with:
- Complete game loop with 4 studio archetypes, 41 unique talent, 22 chemistry pairs
- Draw-2-keep-1 card system with synergies, tags, combos, and push-your-luck mechanics
- Meta-progression: 9 legacy perks, daily challenges with streaks, 6 challenge modes, NG+/Director Mode
- Full responsive mobile support, procedural audio, onboarding tutorial
- Anonymous analytics pipeline ready for data-driven balancing

---

## Round 51 — Achievements & Unlockable Cosmetics
**Date:** 2026-02-16

### Changes
1. **Achievements System** (`src/achievements.ts`) — 20 achievements across 4 categories:
   - **Milestone (5):** First Hit, Box Office King, Five Star Studio, Perfect Run, Half Billion Club
   - **Skill (5):** Clean Streak, Budget Hawk, Critics' Darling, A-List Studio, Hollywood Legend
   - **Discovery (4):** Genre Master, Ending Collector, Prolific Producer, Veteran Studio Head
   - **Fun (5):** Debt Lord, One Take Wonder, Flop Comeback, Death Spiral, Blockbuster Trilogy

2. **Achievement Toast** — Gold notification slides in from top when achievements unlock. Auto-dismisses after 3s. Queues multiple unlocks. Non-blocking with backdrop blur.

3. **Achievement Gallery** — New "🏅 TROPHIES" tab on Start screen. Shows all achievements as cards grouped by category with progress bar. Locked achievements show ❓ with hint text.

4. **Cosmetic Unlocks** — 4 cosmetic rewards tied to specific achievements:
   - Critics' Darling → "Legendary" studio prefix on title screen
   - Hollywood Legend (S rank) → Gold border on start screen
   - Genre Master → Crimson card back glow
   - Ending Collector → Royal purple card back glow
   Visual-only, no gameplay impact.

### Build
- `tsc --noEmit`: ✅ Clean
- `npm run build`: ✅ Clean (436ms)
