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

---

# Round 18 — VISUAL POLISH & JUICE
**Date:** 2026-02-16
**Focus:** Visual design overhaul — color coherence, typography, card design, animations, production screen drama

## Changes

### 1. Color Coherence — Tag Visual Language
- Added CSS custom properties for all 5 tag types: `--tag-chaos` (purple), `--tag-precision` (blue), `--tag-momentum` (orange), `--tag-heart` (pink), `--tag-spectacle` (yellow)
- Each tag has matching `--tag-*-bg` for backgrounds — consistent everywhere they appear
- Added `.tag-badge` CSS class with per-tag variants for uniform rendering
- Card type colors also centralized: `--type-action`, `--type-challenge`, `--type-incident`
- Talent type colors: `--talent-lead`, `--talent-support`, `--talent-director`, `--talent-crew`

### 2. Typography Hierarchy
- Title bumped to 7rem (from 6) with deeper text-shadow and letter-spacing
- Phase titles bumped to 2.8rem with 0.08em tracking
- Box office number: 6rem (from 5rem) with double shadow layers for impact
- End screen rank display: 5rem (from 4rem) with blur-in animation
- Stat labels: 0.6rem uppercase with 0.12em tracking + font-weight 600
- Added Inter 800/900 weights for emphasis opportunities
- Header stat values bumped to 1.4rem

### 3. Card Design — Slay the Spire Aesthetic
- Cards now use `linear-gradient(145deg, #1e1e24, #16161a)` — darker, more distinct from background
- Added `inset 0 1px 0 rgba(255,255,255,0.03)` for subtle inner highlight
- Border-radius increased to 12px (from 8px) for softer card feel
- Top accent bar uses gradient (dim→bright→dim) instead of flat color
- Hover: translateY(-4px) with 32px shadow spread and gold tint glow
- Production cards: 10px radius, 165px width, gradient top accent matching card type
- All shadows use rgba(0,0,0,0.4-0.6) for deeper floating effect

### 4. Animations & Transitions
- Title reveal: added `filter: blur(8px)` at start, dissolves into focus
- Rank reveal: added blur-in effect
- Score reveal: blur-in effect on box office numbers
- All transitions use `cubic-bezier(0.22, 1, 0.36, 1)` for snappy-then-smooth feel
- Added `.animate-slide-up` utility class
- Added stagger classes `.stagger-1` through `.stagger-4` for card grid entrances
- Reward items get slideUp animation
- Victory title: added blur-in at start

### 5. Production Screen — Draw-2-Pick-1 Drama
- New `.choice-area` class: radial gradient background with gold accent edges
- Added floating "VS" text between card choices (`.choice-vs`)
- Increased gap between choice cards (24px from 12px)
- Choice header bumped to 1.4rem Bebas Neue with letter-spacing
- Selectable cards: translateY(-8px) on hover with 40px gold shadow spread
- Cards get `::after` pseudo-element for type-colored top accent line

### 6. General Visual Polish
- Background surfaces use `rgba` with blur backdrop instead of solid colors
- Film strip reduced to 6px height, 50% opacity — subtler
- Modal overlay: 0.9 opacity + backdrop blur
- Modal: 16px radius, deeper shadow (80px spread)
- Buttons: 6px radius (from 4px), added active state (translateY(0))
- History pips: 36px (from 32px), rgba backgrounds
- All `#1e1e1e` hardcoded colors replaced with rgba equivalents for consistency
- Incident pips: rgba backgrounds + box-shadow glow when filled

## Build & Deploy
- **URL:** https://greenlight-plum.vercel.app
- **Build:** Clean, no errors
- **Files modified:** index.css (comprehensive rewrite), ProductionScreen.tsx (choice area), CardComponents.tsx (tag color vars)
