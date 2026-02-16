# GREENLIGHT Design Log — Round 2

## Changes Implemented

### 1. Varied Starters (Implemented)
**Problem:** Every run started with Sophie Chen / Rick Blaster / Standard Grip Team. Identical early game every time.
**Solution:** 3 pools: pick 1 from each.
- Starter Leads: Sophie Chen, Darius Knox, Rafael Santos, Lena Frost
- Starter Directors: Rick Blaster, Zoe Park, Dakota Steele
- Starter Crew: Standard Grip Team, Quick Fix Productions, The Nomads

**Result:** 36 unique starting combos (4×3×3). Each run feels different from the opening.

**Design rationale:** Kept starter talent budget-friendly (costs $3-12). Sophie Chen (Rising Star) is still available but now competes with other interesting starters. Dakota Steele (Nepotism Hire, $3) is a fun cheap option. The Nomads add high variance starts.

### 2. Director's Cut Ability (Implemented)
**Problem:** Production phase lacked player agency. Once you drew, you were at the mercy of the shuffle.
**Solution:** Once per production, peek at the top 3 cards and rearrange them in any order.

**Design rationale:** This gives players meaningful tactical decisions:
- See upcoming incidents and bury them deeper
- Set up synergy combos (put Director card before Actor card that synergizes with it)
- Info advantage: knowing what's coming helps wrap/continue decisions
- Once-per-production keeps it strategic, not spammable

### 3. Talent Chemistry System (Implemented)
**Problem:** Casting felt like pure math (highest Skill per dollar). No narrative flavor.
**Solution:** 15 specific talent pairs have special chemistry bonuses (+2 to +4 quality).

**Design rationale:**
- Creates "build-around" moments: "I should hire Ava Thornton because I already have Valentina Cortez"
- Adds replayability: discovering chemistry pairs is rewarding
- Quality bonuses are significant (2-4) but not game-breaking
- Chemistry pairs tell mini-stories: "Auteur's Muse", "Father & Child", "Ice & Fire"
- Some pairs are cross-type (Actor + Director) encouraging diverse roster building

### 4. Updated How to Play (Implemented)
**Problem:** How to Play modal still described old single-draw system.
**Solution:** Completely rewritten to cover:
- Draw-2-pick-1 system
- Card types (Action/Challenge/Incident)
- Casting = Deckbuilding concept
- Chemistry system
- Director's Cut
- Genre mastery

### 5. Chemistry Display in Casting (Implemented)
**Problem:** Players wouldn't know about chemistry without documentation.
**Solution:** 
- Active chemistry pairs shown with 💕 icon during casting
- Potential chemistry from roster/market talent shown as hints
- Chemistry bonus visible in quality breakdown during production and release

## Playtest Results

### Simulation (500 games, AI player):
- Win Rate: 0% (AI is very dumb — only uses 3 roster members)
- Avg Quality: 14.3
- This is NOT representative of human play since AI doesn't:
  - Fill all 5 cast slots
  - Hire talent between seasons
  - Choose scripts strategically
  - Use Director's Cut
  - Play around chemistry

### Starter Variety:
- 36 unique starting combos observed
- Distribution is roughly uniform (4-6% each)

## What's Still Missing (Ideas for Round 3+)

1. **Talent progression beyond Rising Star** — More talents should change over time
2. **Event cards during production** — Random one-time events (studio exec visits, weather delay) that add narrative flavor
3. **Sequel system** — Successful films can spawn sequels with bonuses
4. **Award ceremony screen** — End of game should celebrate best moments
5. **Talent fatigue** — Using same talent repeatedly should have diminishing returns or risk
6. **Script rewrites** — Spend money to improve a script's base score or add cards
7. **More card mechanics** — Cards that let you draw extra, cards that transform other cards, etc.

## Deployment
- Beta URL: https://greenlight-beta-nu.vercel.app
- Separate from main deployment
