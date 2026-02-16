# GREENLIGHT Playtest Log — Round 19

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Focus:** JUICE & FEEDBACK — Game feel polish, animations, and feedback improvements

---

## Changes Made

### 1. Phase Transitions (App.tsx, index.css)
- **Before:** Simple 150ms opacity fade with slight translateY
- **After:** 220ms exit with scale(0.98) + blur(2px), 350ms enter with spring-eased scale + deblur
- Uses `cubic-bezier(0.22, 1, 0.36, 1)` for snappy but smooth feel
- Transitions between all phases (Greenlight → Casting → Production → Release → Shop) now feel like cinematic cuts

### 2. Weighty Card Draw Animation (ProductionScreen, index.css)
- **Before:** 400ms delay, basic rotateY spin
- **After:** 550ms delay, cards "deal" from above with perspective rotateX, spring bounce, and glow shadow
- Staggered timing (2nd card 120ms delayed) feels like being dealt from a deck
- Card flip-in animation enhanced with translateY motion and shadow pulse

### 3. Disaster Screen Shake (ProductionScreen, index.css)
- New `disaster-shake` class applies 600ms shake to entire production area when disaster fires
- Combined with existing `screen-flash-red` on Release — now also shakes
- Shake uses translate + subtle rotate for natural camera-bump feel

### 4. Blockbuster Confetti (ReleaseScreen, index.css)
- 30 emoji particles (🌟 ✨ 🏆 ⭐ 🎬 🎉) rain down on BLOCKBUSTER tier reveal
- Randomized size, speed, and delay for organic feel
- Uses existing `victory-particles` / `particleFall` CSS with per-particle variation
- Gold screen flash enhanced — brighter peak, slower fade

### 5. Production Card Animation Polish
- `cardFlipIn` now uses spring easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`)
- Adds translateY motion and temporary box-shadow glow during flip
- 4-keyframe bounce (overshoot → settle → micro-overshoot → rest) for satisfying weight

### 6. Sound Effects Verified
- All sfx still fire correctly after R17 restructuring: cardFlip, cardPick, cardDiscard, synergy, combo, incident, disaster, blockbuster, hit, flop, wrap, challenge, victory, block
- No broken references found

---

## What Was NOT Changed (Subtractive Approach)
- No new game systems or mechanics added
- Combo counter CSS from R9 still works well — left as-is
- Existing card-slam/card-shatter pick animations untouched — already solid
- No new dependencies or audio files

---

## Build & Deploy

- **URL:** https://greenlight-plum.vercel.app
- **Build:** Clean, no errors (388ms)
- **Commits:** R17 (350560b) + R19 (9d36aae)
- **Files modified:** App.tsx, index.css, ProductionScreen.tsx, ReleaseScreen.tsx
