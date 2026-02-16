# GREENLIGHT Playtest Log — Round 20

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Focus:** PLAYTESTING & BUG SWEEP — QA round, no new features

---

## Bugs Found & Fixed

### 🔴 Game-Breaking / Functional

1. **Missing `disaster-shake` CSS class** — ProductionScreen applied `disaster-shake` class on disaster, but the CSS keyframes were never defined. Disasters had no screen shake despite R19 claiming it was added.
   - **Fix:** Added full `disasterShake` keyframe animation (0.6s translate+rotate shake)

2. **Stale combo counter** — `combo` state variable was captured in a stale closure inside useEffect (dependency array only included `prod?.played.length`, not `combo`). Combo counts could be wrong, showing "2× NICE!" when it should be "3× COMBO!".
   - **Fix:** Replaced `combo + 1` with `setCombo(prev => prev + 1)` functional updater

3. **Hardcoded incident pip count (3)** — Incident tracker always showed 3 pips, even for Wildcard Entertainment (chaos archetype) which has a disaster threshold of 4. Players had no visual indication of their extra incident tolerance.
   - **Fix:** Dynamically generate pips based on `disasterThreshold` (3 or 4 depending on archetype)

### 🟡 Visual / Display

4. **FLOP earnings display always showed "60%"** — Didn't account for Streaming Surge industry event (which changes FLOP penalty to 75% retention). Also didn't show Critics' Choice -2 rep penalty.
   - **Fix:** Display now dynamically shows correct percentage and rep penalty based on active events/challenges

5. **Phase transitions missing scale+blur** — R19 log described scale(0.98) + blur(2px) transitions but CSS only had simple opacity+translateY. Transitions felt flat.
   - **Fix:** Added `scale(0.98)` and `filter: blur(2px)` to phase-exit, spring-eased scale+deblur to phase-enter

### 🟢 Cleanup

6. **Dead `SeasonRecapScreen.tsx` file** — Unused since R17 merge into ReleaseScreen. 207 lines of dead code.
   - **Fix:** Deleted file

7. **Unused `drawsLeft` variable** — Computed but never referenced in ProductionScreen.
   - **Fix:** Removed

---

## Code Review Findings (No Fix Needed)

- Challenge modes all correctly gate their mechanics (One Take blocks early wrap + disables encore, Shoestring reduces budget/stipend, etc.)
- Daily seed activates/deactivates correctly across game lifecycle
- Rival film generation and cumulative earnings tracking working correctly
- All sound effects fire in correct contexts (verified sfx references match sound.ts exports)
- R18 visual polish CSS variables and R19 animation keyframes coexist without conflicts
- Card animations (cardFlipIn, cardSlam, cardShatter) layer correctly with R18 card design changes
- Combo glow keyframes don't conflict with synergy-active card styles

---

## Build & Deploy

- **URL:** https://greenlight-plum.vercel.app
- **Build:** Clean, no errors (395ms)
- **Commit:** 7386f06
- **Files modified:** index.css, ProductionScreen.tsx, ReleaseScreen.tsx
- **Files deleted:** SeasonRecapScreen.tsx

---

# Previous Rounds

## Round 19 — JUICE & FEEDBACK
**Date:** 2026-02-16 | Phase transitions, card draw animation, disaster shake, blockbuster confetti

## Round 18 — VISUAL POLISH
**Date:** 2026-02-16 | Color coherence, typography, card design, production drama

## Round 17 — SCREEN MERGE & DECLUTTER
Season Recap merged into Release, collapsed casting cards, simplified numbers

## Round 16 — AUTO-ADVANCE
Auto-advance SEE BOX OFFICE removes dead click
