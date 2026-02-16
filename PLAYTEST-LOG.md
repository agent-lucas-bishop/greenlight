# GREENLIGHT Playtest Log — Round 17

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Focus:** SCREEN MERGE & DECLUTTER — UX improvements based on Round 16 Flow Audit

---

## Changes Made

### 1. Merged Season Recap into Release Screen
- **Before:** SEE BOX OFFICE → Release → SEASON WRAP-UP → Season Recap → BEGIN SEASON → Shop (3 dead-air clicks)
- **After:** Release screen now shows player results (animated), then rival rankings + headline below, with single "OFF-SEASON →" button
- Eliminated `seasonRecap` phase entirely — Release now calls `proceedFromRecap` directly
- Removed Career Earnings table (audit flagged as forgettable)
- Removed "NEXT UP" preview (redundant with Greenlight screen)
- **Saves 2 clicks per season × 5 seasons = 10 fewer clicks per game**

### 2. Decluttered Casting Screen
- Talent cards now show collapsed by default: name, cost, Skill/Heat, 1-2 key tags, incident warning
- Full card list, traits, genre bonuses hidden behind "▼ N cards" expand button
- Removed always-visible Deck Preview bar (tag summary, card counts) — consolidated into casting stats line
- Script cards also collapsed by default behind toggle
- **Reduced visible data points from 20+ to ~8 per talent card**

### 3. Simplified Release Screen Numbers
- Core display: film title, quality score, box office (animated), tier banner
- Tier rewards condensed to 1-2 lines (was 3-4)
- Quality breakdown, market info, and cast credits moved behind expandable "Show Details" button
- Market condition moved into details section

### 4. Removed Unnecessary Continue Buttons
- "SEASON WRAP-UP →" button on Release replaced by "OFF-SEASON →" (merged flow)
- Season Recap screen's "BEGIN SEASON N →" eliminated entirely
- Release screen auto-advances through phases (counting → tier → rewards → rivals) then shows single action button

---

## Build & Deploy

- **URL:** https://greenlight-plum.vercel.app
- **Build:** Clean, no errors
- **Files modified:** ReleaseScreen.tsx, CastingScreen.tsx, App.tsx, gameStore.ts
- **Files made obsolete:** SeasonRecapScreen.tsx (still exists but no longer routed to)
