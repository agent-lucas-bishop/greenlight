# Balance Tuning Pass — R168

## Changes Made

### 1. Economy: Marketing Costs Reduced
- **Standard Marketing:** $2M → $1M
- **Premium Marketing:** $4M → $3M
- **Rationale:** On Mogul difficulty ($8 start budget, 4 seasons), post-production marketing was effectively always-skip because there was no budget left after script + talent. Reducing costs by $1 each makes marketing a viable choice on Mogul without making it free. Standard at $1M is a no-brainer on Indie/Studio (which is fine — it's post-prod, not the main decision space), and Premium at $3M still requires real commitment on Mogul.

### 2. Score: Sequel Franchise Multiplier Inheritance Reduced
- **Market mult inheritance:** 50% → 30%
- **Rationale:** Sequels were inheriting too much multiplier bonus from their originals. A film with 1.5× mult was passing 0.75× to its sequel — nearly a free multiplier on top of the sequel's own market. At 30%, the inherited bonus (0.45×) is still meaningful but doesn't make sequel-farming the dominant strategy.

### 3. Score: Franchise Fatigue Kicks In Earlier
- **Mult penalty starts:** 4th film → 3rd film in franchise
- **Rationale:** Previously you could make 3 films in a franchise before any multiplier fatigue. Combined with the mult inheritance nerf, this ensures sequel chains degrade more naturally. The 2nd film in a franchise is still strong; the 3rd starts getting penalized.

### 4. Score: Genre Pivot Perk Buffed
- **Quality bonus:** +3 → +5 when making a different genre than last film
- **Rationale:** Genre specialization (via mastery at +2/film) accumulates +6-8 quality over a 5-season run. Genre Pivot at +3 per film couldn't compete — variety strategies were strictly worse. At +5, a player alternating genres gets comparable value to a specialist, making both strategies viable. The perk still costs $8, so it's an investment.

### 5. Score: Rival Competing Film Penalty Capped
- **Total rival multiplier penalty:** Capped at -0.3× (was uncapped)
- **Rationale:** On Mogul with 1.4× rival aggression and up to 3 rival actions per season, stacked competingFilm penalties could total -0.6× or more multiplier — essentially destroying a film's box office through no fault of the player. The -0.3× cap means rivals are still impactful but can't completely nuke your release. PR Campaign ($2M) remains useful since it reduces the number of actions, not just the cap.

### 6. Cards: Workshop Enhance Buffed
- **Quality bonus:** +2 → +3 per enhance
- **Rationale:** At +2 for $2M, Enhance was outclassed by Duplicate ($4M for a full card copy worth ~5 quality). At +3, Enhance becomes the efficiency pick (1.5 quality/$M) while Duplicate remains the high-ceiling pick for stacking powerful cards (1.25 quality/$M on a 5-quality card). Different strategic niches: Enhance for budget-conscious upgrades, Duplicate for doubling your best cards.

## Files Modified
- `src/gameStore.ts` — marketing costs, sequel mult inheritance, fatigue timing, genre pivot bonus, rival penalty cap, workshop enhance value
- `src/data.ts` — Genre Pivot perk description updated
- `src/screens/PostProductionScreen.tsx` — marketing cost display updated
- `src/components/CardWorkshop.tsx` — enhance label updated

## What Was Reviewed But Not Changed
- **Starting budgets:** Indie $15/Studio $15/Mogul $8 — appropriate per difficulty. Mogul's constraint is intentional; the marketing cost fix addresses the specific post-prod skip issue.
- **Remove at $1M:** Deck thinning is correctly powerful at this price point. It's the premier workshop action and that's fine.
- **Transmute at $3M:** Niche but distinct from Remove (preserves deck size). No change needed.
- **Duplicate at $4M:** Correctly positioned as the premium option. No change needed.
- **Awards system:** Nomination threshold (quality > 25 + season×5) scales appropriately. Awards bonuses from events are meaningful but not required for victory.
- **Rival aggression scaling:** 0.7×/1.0×/1.4× across difficulties feels right with the new penalty cap.
- **Season targets:** [20, 28, 38, 50, 62, 74, 86, 98] — well-curved with steepest jumps early.
- **Sequel base quality (70% of last quality):** Appropriate diminishing returns.
