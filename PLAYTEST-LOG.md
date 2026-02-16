# GREENLIGHT Playtest Log — Round 25

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Focus:** DECISION DEPTH & STRATEGIC TENSION — Make decisions hurt

## What Changed

Three new systems designed to add meaningful trade-offs without new UI complexity:

### 1. Talent Baggage System
High-star talent now comes with real downsides. 6 talent affected:
- **Valentina Cortez** (Skill 5): 💸 $3M salary demand per film on top of hiring cost
- **Oliver Cross** (Skill 5): ⚠️ Dangerous method acting — adds 1 extra Incident card to production deck (guaranteed)
- **Marcus Webb** (Skill 5): 📅 Schedule conflict — blocks a Wild slot
- **Ezra Blackwood** (Skill 5): 👥 Entourage drains $2M per film
- **Frank DeLuca** (Skill 5): 💸 $4M salary demand per film
- **Nikolai Volkov** (Skill 4): ⚠️ 50% chance of adding extra Incident to deck

**Design intent:** Every S5 talent is now a genuine risk/reward decision. Sophie Chen (S3, Rising Star, no baggage) becomes more attractive relative to Valentina (S5, Diva, $3M/film drain). "Safe pick vs risky pick" dilemma at every cast slot.

### 2. Genre Market Trends
Each season generates 1-2 "hot" genres (+40% box office) and 1-2 "cold" genres (-30%):
- Shown prominently in Greenlight screen with 🔥 HOT / ❄️ COLD badges on scripts
- Rivals chase hot genres 50% of the time (making hot genres more competitive)
- Cold genres penalize rivals too (opportunity to dominate an unpopular niche)
- Creates the "chase trends vs buck them" tension from the mission brief

### 3. Budget Debt System
Overspending is now possible but painful:
- Scripts and talent can be purchased when broke — excess becomes debt
- Debt compounds at 20% interest per season
- Debt ≥$15M triggers -1 reputation penalty at release
- Debt shown in header bar + warnings on purchase cards showing exact debt amount
- "Goes into debt (+$XM)" warnings replace the old "Can't afford" blocks
- No more hard gates — just escalating consequences

## Design Analysis

**What this solves from OVERNIGHT-ANALYSIS.md:**
- "The game is wide but not deep" → Casting now involves genuine trade-off calculus
- Budget as soft constraint → Budget now has teeth (debt spiral is real)
- No external pressure → Rivals chase trends, making popular genres contested
- "Safe pick vs risky pick" → Every S5 talent forces you to weigh baggage

**What's still needed:**
- Marcus Webb's schedule_conflict `slotBlocked` isn't mechanically enforced yet (just shown as info)
- Could add more baggage types over time (e.g., "refuses to do genre X")
- Genre trends don't persist — each season is independent. Could add momentum.

## Build Status
- `npx tsc --noEmit` — ✅ clean
- `npm run build` — ✅ clean (421KB JS, 36KB CSS)
- Deployed via git push to Vercel
- Net: +169 lines added, -25 removed (+144 net)

## Stats
- Round: 25
- Files changed: 7 (types.ts, gameStore.ts, data.ts, rivals.ts, GreenlightScreen.tsx, CastingScreen.tsx, Header.tsx)
- New types: `BaggageType`, `TalentBaggage`
- New state fields: `hotGenres`, `coldGenres`, `debt`
