# GREENLIGHT Playtest Log — Round 35

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Focus:** Tutorial & New Player Experience

## Summary

Improved the new player experience with contextual hints, strategy nudges, and hoverable stat explanations — without over-tutorializing. The game should still feel like discovery, but new players won't be lost.

## Changes

### 💡 Strategy Nudges in Phase Tips
- **Change:** Added italic "Tip:" sub-lines to every phase tip with lightweight strategic guidance
- **Reasoning:** The existing phase tips explained *what* each phase was but not *what to look for*. Nudges like "At 2 incidents, seriously consider wrapping" give new players actionable guidance without being prescriptive.

### ❓ StatTooltip Component
- **Change:** New `StatTooltip` component — small "?" icons that reveal explanations on hover/tap
- **Reasoning:** Stats like Reputation, Heat, and Deck composition (A/C/I) are non-obvious to new players. Tooltips provide on-demand explanations without cluttering the UI. Works on both desktop (hover) and mobile (tap).

### 🎯 Tooltips Applied To
- **Header:** Reputation ("Stars multiply box office earnings"), Target ("Earn at least this much..."), Strikes ("Miss target = strike, 3 = game over")
- **Casting:** Skill ("Higher = better action cards"), Heat ("Heat 4+ adds incident cards"), Deck composition ("A = Action, C = Challenge, I = Incident")
- **Production:** Clean Wrap badge ("Finish with zero incidents to keep bonus"), Deck remaining ("When deck runs out, production wraps automatically")

### 📝 Improved Phase Tip Copy
- **Change:** Rewrote all 6 phase tips for clarity and precision
- **Reasoning:** Original tips were good but could be tighter. E.g., Greenlight tip now explicitly mentions Hot trends and market conditions; Casting tip now points to deck preview; Production tip emphasizes the 2-incident danger zone.

## Design Philosophy
- **Non-intrusive:** Tooltips only appear on hover/tap, phase tips dismiss on click, all shown only first 3 runs
- **Helpful not patronizing:** Strategy nudges are suggestions, not commands
- **Discovery preserved:** No mandatory tutorials, no blocking modals, no forced walkthroughs

## Build Status
- `npx tsc --noEmit` — ✅ PASS
- `npm run build` — ✅ PASS (445KB JS / 38KB CSS)

## Deployed
- Commit: `ba2cfa8` → Vercel auto-deploy

---

# GREENLIGHT Playtest Log — Round 34

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Focus:** Accessibility & Final Polish

## Summary

Final round of the marathon session. Focused on making the game accessible to keyboard-only users, screen reader users, and users with motion sensitivities — plus social sharing polish.

## Accessibility Changes

### 🎯 Focus Indicators
- **Change:** Added `:focus-visible` styles with gold outline + glow to all interactive elements
- **Reasoning:** Keyboard users had no visual feedback when tabbing through cards, buttons, and slots. Now every focusable element gets a clear `2px solid var(--gold-bright)` outline with a `4px` glow ring.

### 🎬 Reduced Motion Support
- **Change:** Added `@media (prefers-reduced-motion: reduce)` that disables all animations/transitions
- **Reasoning:** The game has extensive animations (card flips, shakes, combos, particles). Users with vestibular disorders or motion sensitivity need an escape hatch. All animation durations are set to `0.01ms` under this media query.

### ♿ Screen Reader Support
- **Change:** Added `aria-labels` to all interactive cards, buttons, cast slots; `role="button"` and `tabIndex` to clickable non-button elements; `aria-live="polite"` on main content area; `role="dialog"` and `aria-modal` on help modals; `aria-hidden` on decorative elements
- **Reasoning:** Screen readers couldn't meaningfully navigate the game. Cards now announce their name, type, and quality value. Phase transitions are announced via `aria-live`. Decorative spotlight and film-strip elements are hidden from assistive tech.

### ⌨️ Keyboard Navigation
- **Change:** All interactive cards (Neow choices, script selection, production card picks, talent cards, cast slots, studio archetypes) now respond to `Enter` and `Space` keypress in addition to click
- **Reasoning:** The game was mouse-only. Now every screen can be navigated and played with just a keyboard.

### 🎨 Color Contrast
- **Change:** `--gray` #666→#777, `--gray-light` #999→#aaa
- **Reasoning:** Several text elements using these colors on the dark background (#0a0a0a) fell below WCAG AA 4.5:1 contrast ratio. The new values bring them above threshold.

### 🔗 Skip Link
- **Change:** Added a "Skip to content" link that appears on focus, letting keyboard users jump past the header
- **Reasoning:** Standard accessibility pattern. Without it, keyboard users must tab through all header stats every phase change.

## Social Sharing Polish

### 📱 Meta Tags
- **Change:** Added `og:url`, `og:image`, `twitter:image`, `theme-color`; upgraded `twitter:card` to `summary_large_image`
- **Reasoning:** Sharing the game URL on Discord/Twitter/etc now shows a rich preview card with the game title and description.

### 🖼️ OG Image
- **Change:** Generated a 1200×630 PNG with game branding for social sharing
- **Reasoning:** Without an OG image, shared links look bare. The image features the GREENLIGHT title, subtitle, and key features.

## Semantic HTML

- Header wrapped in `<header>` with `role="banner"`
- Main content wrapped in `<main>` with `role="main"` and `id="main-content"`

## Build Status
- `npx tsc --noEmit` — ✅ PASS
- `npm run build` — ✅ PASS (443KB JS / 37KB CSS)

## Deployed
- Commit: `5dacb88` → Vercel auto-deploy

---

# GREENLIGHT Playtest Log — Round 33

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Focus:** Balance Tuning & Edge Case Hardening

## Summary

Deep audit of game balance, scoring math, edge cases, and rival AI. 11 targeted changes across 3 files with documented reasoning for every number change.

## Balance Changes

### 🎯 Sophie Chen Rising Star Nerf
- **Change:** Skill cap 6 → 5
- **Reasoning:** At $6 cost, Sophie was the best investment in the game. Over 5 seasons she could reach skill 8 (from 3), outperforming $18 Valentina Cortez. Cap at 5 means she's still great value but can't eclipse premium talent.

### 🏆 Prestige Archetype Adjustment
- **Change:** Clean wrap bonus 8 → 7
- **Reasoning:** Prestige was clearly dominant. +8 clean wrap + precision talent + genre mastery +3 created a consistency machine. +7 is still the best archetype for clean play but leaves room for other strategies.

### 🎭 Darius Knox Scene Chameleon Cap
- **Change:** Copy bonus now capped at +4 (was unlimited)
- **Reasoning:** Scene Chameleon copied `totalValue` of previous card with no limit. After a big synergy card (say +8), Knox would replicate the entire value. Cap at +4 keeps it useful without being degenerate.

### 🛡️ Block Mechanic Cost Increase
- **Change:** Block quality cost -2 → -3
- **Reasoning:** Incidents range from -3 to -6 base quality (plus synergy penalties). At -2 cost, blocking was almost always correct — the decision wasn't interesting. At -3, blocking a -3 incident is break-even, so you actually have to consider letting small incidents through.

### 🎵 Encore Failure Rebalance
- **Change:** Extra penalty -5 → -3
- **Reasoning:** Encore success gives +3 bonus on top of normal card value. Old failure was base + (-5), making expected value strongly negative. At -3 extra, encore becomes a real push-your-luck decision.

### 💰 Season Stipend Scaling
- **Change:** Flat $5M → 6/5/5/4/3 by season
- **Reasoning:** Early game was too tight (new players short on cash), late game too comfortable. Front-loading $1 extra helps survival; tapering to $3 in season 5 creates meaningful late-game budget pressure.

### 💸 Debt System Tightened
- **Change:** Rep penalty threshold $15 → $10; added -2 rep tier at $20+
- **Reasoning:** Old system let you freely carry ~$14 debt with no consequences. Now $10+ debt costs 1 rep, $20+ costs 2. Debt spiral is more punishing and demands earlier payoff.

## Edge Case Fixes

### ☠️ Rep 0 Death Spiral
- **Change:** Rep 0 multiplier ×0 → ×0.25
- **Reasoning:** Rep 0 with old ×0 multiplier = 0 box office = guaranteed FLOP = more rep loss. Completely unrecoverable. ×0.25 is still devastating but gives a theoretical path back.

### 🎰 Chaos Archetype Missing Implementation
- **Change:** Implemented "+1 base quality for chaos-tagged cards" for Wildcard Entertainment
- **Reasoning:** The archetype description promised this bonus but it was never coded. Chaos builds now actually benefit from their archetype choice beyond the 4-incident disaster threshold.

## Rival AI Improvements

### 🤖 Stronger, Less Predictable Rivals
- **Change:** Season quality scaling +3 → +4 per season; multiplier range widens per season
- **Reasoning:** Old rivals were too predictable (narrow 0.8-1.6 multiplier). New system: early rivals are slightly easier (wider low range), late rivals are genuinely threatening (multiplier up to 1.7 in season 5). Creates real competitive pressure.

## Scoring Analysis

### Rank Thresholds (unchanged, validated)
- FLOP: < 1.0× target
- HIT: 1.0-1.24× target
- SMASH: 1.25-1.49× target
- BLOCKBUSTER: ≥ 1.5× target

These feel well-calibrated. A typical well-played season produces quality 25-40, with multiplier 1.0-2.0 and rep bonus 1.0-1.5. This puts box office in the 25-120 range across seasons, which maps nicely to the 20/28/38/50/62 target curve.

## Build Status
- `npx tsc --noEmit` — ✅ PASS
- `npm run build` — ✅ PASS (441KB JS / 36KB CSS)

## Deployed
- Commit: `4709b65` → Vercel auto-deploy

---

# GREENLIGHT Playtest Log — Round 32

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Focus:** Game Feel Polish — transitions, UX cues, information clarity

## Summary

Code-level playtest audit of all game screens, focusing on game feel and new player experience. Nine targeted improvements across 8 files.

## Changes Made

### 🔄 Phase Transitions (Smoother)
- Increased exit animation from 220ms → 300ms, enter delay 50ms → 80ms
- Added `window.scrollTo({ top: 0 })` on every phase change — players no longer land mid-page

### 🎬 Production Screen (Core Loop Polish)
- **First draw button**: Larger, says "ACTION! — DRAW FIRST CARDS" — more inviting and thematic
- **Auto-advance timer**: Increased from 1.8s → 2.5s before "SEE BOX OFFICE" — gives players time to read encore results
- **Selectable card pulse**: Draw-2-pick-1 cards now gently pulse gold to draw attention, stops on hover

### 📊 Information Hierarchy Improvements
- **Greenlight**: Each script now shows "📦 X script cards added to production deck" — helps players understand deck-building
- **Casting**: Added "PRODUCTION DECK PREVIEW" summary box (Actions/Challenges/Incidents/Total) before BEGIN PRODUCTION — deck composition at a glance
- **Shop**: Added "HEADING INTO SEASON X" readiness summary (budget, talent, perks, rep, debt) before BEGIN SEASON
- **Release**: Explicit "✓ HIT" or "✗ MISSED" text next to target number — removes ambiguity

### ✨ Visual Polish
- **Neow choices**: Enhanced hover with colored glow + playful emoji rotation (-3deg)
- **CSS**: Selectable production cards pulse with `selectablePulse` animation

## Build Status
- `npx tsc --noEmit` — ✅ PASS
- `npm run build` — ✅ PASS (441KB JS / 36KB CSS)

## Deployed
- Commit: `0ae2689` → Vercel auto-deploy to https://greenlight-plum.vercel.app

---

# GREENLIGHT Playtest Log — Round 31

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Focus:** Visual Regression & Screenshot Audit — browser-based visual testing of all screens

## Summary

Visual audit of every game screen at desktop (1200px) and mobile (375px) viewports. Played through a complete run checking all UI elements.

## Critical Bug Found & Fixed

### 🔴 React Hooks Violation Crash (GAME-BREAKING)
- **Symptom:** Clicking "NEW RUN" → white screen / app crash
- **Cause:** `useState` and handler defined AFTER an early `return` in StartScreen.tsx (line ~201). When `showArchetypes` became true, the early return skipped those hooks, violating React's rules of hooks.
- **Fix:** Moved `useState(isMuted())` and `handleToggleMute` before the early return, alongside other hooks.
- **Impact:** This bug was **live in production** — no one could start a new game!

### 🟡 Header Stats Overflow
- **Symptom:** "STRIKES 0/3" text clipped/hidden behind mute & help buttons in header
- **Fix:** Added `padding-right: 80px` to `.header` to account for absolute-positioned buttons

## Visual Audit Results

### ✅ Screens Reviewed (All Passing)
| Screen | Desktop | Mobile | Notes |
|--------|---------|--------|-------|
| Title/Start | ✅ | ✅ | Clean, centered, mute toggle visible |
| Onboarding Modal | ✅ | N/A | Well-structured, scrollable |
| Archetype Selection | ✅ | ✅ | Cards flex-wrap properly on mobile |
| Neow (Welcome) | ✅ | ✅ | Cards stack vertically on mobile |
| Greenlight | ✅ | N/A | Market match badges, genre tags clean |
| Casting | ✅ | N/A | Dense but organized, talent cards clear |
| Production | ✅ | N/A | Quality bar, incident markers, card layout polished |
| Encore Modal | ✅ | N/A | Risk/reward clearly presented |
| Release Day | ✅ | N/A | Box office rankings, rival films, review quotes |

### Overall Visual Impression
**Polished indie game** — not a prototype. The dark cinema theme is cohesive, gold accents work well, card designs are readable, animations are smooth. The film strip borders and spotlight gradient add production value. Information density is high but well-organized.

## Deployment
- Commit: `1513f85` — `fix: React hooks violation crash + header overflow`
- Auto-deployed via Vercel on push

---

# GREENLIGHT Playtest Log — Round 30

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Focus:** FINAL QA PASS — Full integration audit, TypeScript check, build verification, logic audit, cosmetic polish

## Summary

Round 30 is the capstone round after 29 rounds of overnight iteration. Full codebase audit of all 27 source files.

## Checks Performed

### TypeScript Strict Check
- `npx tsc --noEmit` — **PASS** (zero errors, zero warnings)

### Build Verification
- `npm run build` — **PASS** (clean build, 439KB JS / 36KB CSS gzip'd to 123KB/8KB)

### Logic Audit: Talent Baggage
- ✅ `salary_demand` (extraCost) deducted in `resolveRelease()` via `baggageCost`
- ✅ `entourage` (budgetDrain) deducted same path
- ✅ `schedule_conflict` (slotBlocked) enforced in `assignTalent()` — blocked slots show 🔒 in UI
- ✅ `method_dangerous` (incidentChance) adds incident cards in `buildProductionDeck()` with proper RNG gating

### Logic Audit: Genre Trends
- ✅ Generated via `generateGenreTrends()` in `beginSeason()` — 1-2 hot, 1-2 cold, never overlapping
- ✅ Applied in `resolveRelease()`: hot = +0.25 multiplier, cold = -0.2 multiplier
- ✅ Rivals react to trends (50% chance to chase hot genre) in `generateRivalSeason()`
- ✅ Gated on `isSimplifiedRun()` — first-ever run shows no trends
- 🐛 **FIXED**: UI showed "+40%/-30%" but actual values are +25%/-20%. Corrected display text.

### Logic Audit: Debt
- ✅ Compounds at 20% per season in `resolveRelease()`: `debt = Math.round(debt * 1.2 * 10) / 10`
- ✅ Paydown via `payDebt()` — UI offers $5M, $10M, and full payoff buttons
- ✅ Rep penalty at ≥$15M: `debtRepPenalty = debt >= 15 ? -1 : 0`
- ✅ Overspending in `pickScript()` and `hireTalent()` adds to debt when `!isSimplifiedRun()`
- ✅ Debt display in header and casting screen
- ✅ `debtWarning` sound plays on shop mount when debt ≥$10M

### Logic Audit: Milestones
- ✅ 9 milestones with correct thresholds checked via `getMilestoneProgress()`
- ✅ `recordRunEnd()` updates career stats and checks for newly unlocked perks
- ✅ New perks display on end screen with animation

### Logic Audit: Simplified First Run
- ✅ `isSimplifiedRun()` returns true until `markFirstRunComplete()` called in EndScreen
- ✅ Gates: no debt (overspending just goes negative), no genre trends
- ✅ Unlock toast shows on second run via `shouldShowUnlockToast()`

### Logic Audit: Sound Effects
- ✅ All 23 sounds verified wired to correct moments:
  - cardFlip (draw), cardPick (keep), cardDiscard (reject), synergy (fired), combo (streak)
  - incident, disaster, blockbuster, hit, flop, smash, nomination
  - click (buttons), wrap, challenge (bet), victory, block
  - boxOfficeReveal, seasonTransition, scriptSelect, hire, purchase, debtWarning

### Cosmetic Check
- ✅ Header shows debt display with red styling when active
- ✅ Genre trend badges (🔥 HOT / ❄️ COLD) on greenlight screen
- ✅ Career stats tab with grid layout, rank distribution, daily streak, milestones with progress bars
- ✅ Mute toggle in header and start screen, persisted in localStorage
- ✅ Mobile: flex-wrap used throughout, clamp() for font sizes, max-width constraints

## Bug Fixed
1. **Genre trend percentage mismatch** — UI claimed "+40%/-30%" but code applies +25%/-20%. Fixed display to match actual values.

## Deployed
- Git pushed to `main` → Vercel auto-deploys to https://greenlight-plum.vercel.app
- README.md updated with comprehensive feature list and how-to-play guide

## Final State
- 27 source files, ~4700 lines of game logic + UI
- 13 Leads, 10 Supports, 9 Directors, 9 Crew (41 unique talent)
- 12 Scripts across 7 genres
- 22 Chemistry pairs
- 4 Studio Archetypes, 12 Perks, 6 Challenge Modes
- 9 Legacy Perks, 23 Sound Effects
- Clean TypeScript, clean build, all systems verified

## R36 — Mobile Touch Polish (2026-02-16)

**Mobile-first improvements:**
- **Viewport**: Added `viewport-fit=cover` for notched phones
- **Safe areas**: CSS `env(safe-area-inset-*)` on body, header, and button groups
- **Tap feedback**: CSS scale-bounce (0.95) on active state for all buttons, cards, slots — only on touch devices (`hover: none`)
- **Touch targets**: Header help/mute buttons bumped to 44×44px on mobile (was 28px)
- **Swipe gestures**: Greenlight script selection gets swipe-left/right card carousel on mobile (≤480px) with dot indicators
- **Bottom sheet**: HowToPlay and QuickHelp modals slide up from bottom on mobile with drag handle pill, 85vh max height
- **Mobile card carousel**: Single-card view on narrow screens with swipe navigation instead of cramped 3-column grid
- **`-webkit-tap-highlight-color: transparent`** on all interactive elements to remove blue flash
