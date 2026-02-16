# GREENLIGHT Flow & Pacing Audit — Round 16

**Date:** 2026-02-16  
**Tester:** Bishop (AI subagent)  
**Build:** https://greenlight-plum.vercel.app  
**Method:** Full playthrough, tracked every click/screen transition

---

## 1. Full Game Flow Map

```
START SCREEN
  → [click] Close onboarding overlay (auto-shows on first visit)
  → [click] NEW RUN
NEOW: STUDIO SELECTION
  → [click] Pick studio archetype (4 choices) ★ meaningful
NEOW: STARTING BONUS
  → [click] Pick bonus (3 choices) ★ meaningful
GREENLIGHT
  → [click] Pick script (3 choices) ★ meaningful
CASTING
  → [click × 2-5] Assign talent to slots ★ meaningful
  → [click] BEGIN PRODUCTION
PRODUCTION
  → [click] DRAW FIRST CARDS
  → [click × 1-9] Draw/choose cards, handle incidents ★ core gameplay
  → [click] WRAP
  → [click] Encore decision (yes/no) ★ meaningful
  → [click] 📊 SEE BOX OFFICE → ⚠️ DEAD AIR
RELEASE DAY
  → [click] SEASON WRAP-UP → ⚠️ DEAD AIR (no decision)
SEASON RECAP
  → [click] BEGIN SEASON N → ⚠️ DEAD AIR (no decision)
OFF-SEASON SHOP
  → [click × 0-5] Buy perks, hire talent, train ★ meaningful
  → [click] BEGIN SEASON N
→ repeat GREENLIGHT through SHOP for seasons 2-5
```

---

## 2. Click Count Per Season

| Season | Greenlight | Casting | Production | Post-Production | Total |
|--------|-----------|---------|------------|-----------------|-------|
| 1 (incl. setup) | 1 (+ 4 setup) | 4 | 5-12 | 4 | **14-21** |
| 2-4 | 1 | 3-6 | 4-12 | 4 | **12-23** |
| 5 (final) | 1 | 3-6 | 4-12 | 2* | **10-21** |

*Season 5 has no Shop/Recap after.

**Post-production breakdown (the problem area):**
1. "SEE BOX OFFICE →" — dead click, no decision
2. "SEASON WRAP-UP →" on Release — dead click, no decision
3. "BEGIN SEASON N →" on Season Recap — dead click, no decision
4. "BEGIN SEASON N →" on Shop — valid (player may still be shopping)

**Finding:** 3 of 4 post-production clicks are dead air. That's **3 wasted clicks per season × 5 seasons = 15 unnecessary clicks per game.**

---

## 3. Information Overload Audit

| Screen | Competing Data Points | Verdict |
|--------|----------------------|---------|
| **Header bar** | 5 (Season, Budget, Rep, Target, Strikes) | ✅ Fine |
| **Greenlight** | 3 scripts × 5 stats each + 3 market conditions = ~18 | ⚠️ Borderline — but well-organized into cards |
| **Casting** | Skill, Heat, Cost, Genre bonus, Card count, individual card details × all talent | 🔴 **20+ data points** — most complex screen |
| **Production** | Quality, ~needed, Draws, Incidents, Cards remaining, quality breakdown, narrative | ⚠️ 7-8 points, slightly over 6 |
| **Release Day** | Quality, Box Office, Target, Tier, Bonus, Stipend, full quality breakdown, cast list | 🔴 **10+ data points** |
| **Season Recap** | Headline, 4-film rankings × 3 cols, career earnings × 4 rows, next season preview | ⚠️ Dense but one-time per season |
| **Shop** | Perks (4 options), Talent market (3-4), Roster training options | ⚠️ Necessarily complex |

**Worst offender: Casting screen.** Every talent card shows Skill, Heat, Cost, Genre bonus, Card count with A/C/I breakdown, and individual card details with synergy text. When all cards are expanded, this screen is overwhelming.

**Release Day** is also very dense — the quality breakdown (Script Base, Talent Skill, Production, Clean Wrap, Genre Mastery, Chemistry, Archetype, Total) shows 7-8 line items that most players won't carefully read.

---

## 4. Dead Air Analysis

### 🔴 "SEE BOX OFFICE →" (after wrapping/encore)
- **Where:** Production screen, after wrap + encore decision
- **Problem:** Player already wrapped. There's no more decision. This button exists purely to transition to the Release screen.
- **Fix:** Auto-transition to Release after a brief delay (1-2s), or merge wrap confirmation with the transition.

### 🟡 "SEASON WRAP-UP →" (Release screen)
- **Where:** Release screen, bottom
- **Problem:** Release screen shows results, which IS interesting. But the player just clicks through. The animated tier reveal (1.6s + 1.2s delay) already provides the dramatic moment. The button is fine as a "when you're ready" gate.
- **Verdict:** Keep — it gates a nice animation. Not truly dead air.

### 🔴 Season Recap screen (entire screen)
- **Where:** Between Release and Shop
- **Problem:** Rival studios and rankings are mildly interesting the first time but become a speed bump by season 3. No decisions. Player is just reading and clicking Continue.
- **The honest assessment:** It feels like a **speed bump**. The headline is fun, the rankings create brief "oh I beat Apex!" moments, but by season 3-4 it's pure friction. The career earnings section is especially forgettable — just numbers.
- **Fix options:**
  - A) Merge into Release screen as a collapsible "Industry Rankings" section
  - B) Make it skippable/auto-advance after 3 seconds
  - C) Add a decision: pick a rival to "challenge" next season for bonus stakes

---

## 5. Start-to-First-Interesting-Decision

| Click | Screen | Action | Decision? |
|-------|--------|--------|-----------|
| 1 | Start | Close onboarding overlay | No |
| 2 | Start | NEW RUN | No |
| 3 | Neow | Pick studio archetype | **YES — 1st meaningful choice** |

**3 clicks / 2 screens to first meaningful choice.** This is excellent. The onboarding overlay auto-shows which adds one extra click, but only on first visit (localStorage).

If the player has seen the tutorial before, it's **2 clicks** to first decision. Very good.

---

## 6. Season Recap Assessment

> Does the new rival studio / recap flow feel like a reward or a speed bump?

**Honest answer: Speed bump.**

**What works:**
- Headlines are contextual and fun ("Solid Debut — A Studio to Watch?")
- Seeing your rank among rivals gives competition context
- First time seeing it is genuinely interesting

**What doesn't work:**
- No decisions = no engagement. It's a newspaper you're forced to read
- Career Earnings section is just numbers — not emotionally resonant
- "NEXT UP: Season 3: THE PRIME" preview is redundant — the Greenlight screen already shows the season name
- By season 3, you're spam-clicking through it
- The 3-phase staggered animation (600ms, 1400ms, 2200ms) makes it feel even slower

**Recommendation:** Fold the headline + rankings into the Release screen as an expandable section. Kill the Career Earnings table. Keep the "Next Up" only if it's merged. This saves 1 entire screen + 1 click per season.

---

## 7. Quick Fixes Implemented

### Fix 1: Remove "SEE BOX OFFICE" dead click
After wrapping + encore, auto-transition to Release after 1.5s pause instead of requiring a manual click. The production screen already shows the final quality; the player doesn't need to "confirm" going to results.

### Fix 2: Auto-advance delay on Season Recap (if no interaction)
Added a "Skip" affordance and reduced animation stagger.

---

## 8. Recommendations (Not Yet Implemented)

1. **Merge Season Recap into Release screen** — Show rankings as a section within Release. One less screen transition, one less "Continue" click. Saves ~15 clicks per game.

2. **Collapse card details on Casting screen by default** — Show only talent name, Skill/Heat, Cost, and card count summary. Let players expand to see individual cards. Reduces information overload dramatically.

3. **Consider removing Career Earnings table** from Recap — Nobody is doing mental math on cumulative rival earnings. Just show the season rankings.

4. **Remove "NEXT UP" preview from Recap** — The Greenlight screen already introduces the next season. Redundant.

5. **Consider merging Release → Shop** — After seeing your box office results, go directly to the shop. The "SEASON WRAP-UP" button on Release could say "OFF-SEASON →" and skip the Recap entirely.
