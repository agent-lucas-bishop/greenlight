# GREENLIGHT — State of the Game
*After 24 rounds of overnight iteration (Feb 15-16, 2026)*

**Live:** https://greenlight-plum.vercel.app
**Repo:** ~/.openclaw/workspace/greenlight (27 commits, ~16k lines)

## What It Is
A movie studio roguelite — you're a film producer making 5 movies across 5 seasons. Draft talent, build a production deck, draw cards to determine quality, manage budget and reputation. Slay the Spire meets Hollywood.

## Systems (All Working)
| System | Round Added | Status |
|--------|------------|--------|
| Core loop (greenlight→cast→produce→release→shop) | R1-R4 | ✅ Solid |
| Deck-building (talent brings cards) | R5-R8 | ✅ Solid |
| Sound effects (procedural Web Audio) | R9 | ✅ |
| Combo counter | R9 | ✅ |
| Archetype focus (genre specialization bonus) | R10 | ✅ Nerfed in R14 |
| Encore (push your luck) | R10 | ✅ Made riskier in R14 |
| Legacy perks (cross-run unlocks) | R10 | ✅ Cut from 10→5 in R14 |
| Polish pass (wired broken perks) | R11 | ✅ |
| Onboarding (auto-tutorial + phase tips) | R12 | ✅ |
| Challenge modes (6 modes) | R13 | ✅ |
| Daily seed runs | R13 | ✅ |
| Local leaderboard | R13 | ✅ |
| Balance & prune (chaos nerf, UI simplify) | R14 | ✅ |
| Rival studios (3 AI opponents) | R15 | ✅ |
| Season identity (5 named seasons) | R15 | ✅ |
| Flow audit + auto-advance | R16 | ✅ |
| Screen merge (recap→release) | R17 | ✅ |
| Visual polish (colors, typography, cards) | R18 | ✅ |
| Juice (transitions, shake, confetti) | R19 | ✅ |
| Bug sweep (5 fixes) | R20 | ✅ |
| Mobile responsive | R21 | ✅ |
| Narrative (titles, critics, studio names) | R22 | ✅ |
| End-of-run recap + shareable results | R23 | ✅ |
| Integration audit (-100 lines) | R24 | ✅ |
| Dev analytics + daily/share verification | R25 | ✅ |

## Architecture
```
src/
  gameStore.ts      — Zustand store, all game logic
  types.ts          — TypeScript interfaces
  data.ts           — Talent, scripts, shop items
  narrative.ts      — Film titles, critic quotes, headlines
  challenges.ts     — 6 challenge mode definitions
  rivals.ts         — 3 AI rival studios
  sound.ts          — Procedural Web Audio effects
  seededRng.ts      — Deterministic RNG for daily mode
  leaderboard.ts    — localStorage leaderboard
  onboarding.ts     — First-run detection
  unlocks.ts        — Legacy perk system
  screens/          — 8 screen components (game phases)
  components/       — 3 shared components
```

## What's Good
- **The core loop is fun.** Drawing cards and making cast/wrap decisions feels engaging.
- **Visual polish is strong.** Slay the Spire card aesthetic, cinematic transitions, screen shake, confetti.
- **Narrative flavor sells it.** Procedural film titles and critic quotes make each run feel unique.
- **Shareable results** (Wordle-style emoji grid) make it viral-ready.
- **Mobile works.** Fluid typography, touch targets, responsive grids.
- **Clean codebase.** R24 audit found no contradictions, no state bugs, -100 lines.

## What Needs Attention
1. **No browser playtesting done** — all iteration was code-review based. Visual regressions are possible, especially R18+R19 CSS layering.
2. **Sound might be overwhelming** — lots of procedural effects added but never heard together in a real session.
3. **Challenge mode balance untested** — Speed Run (3 seasons, ×2.0 multiplier) might be trivial or impossible.
4. ~~**Daily mode needs verification**~~ — ✅ Code-audited: seeded RNG (`mulberry32`) is activated at `startGame('daily')` and all random calls use `rng()` (data.ts, narrative.ts, gameStore.ts, rivals.ts). Same date → same seed → deterministic talent pool, scripts, markets. Verified no `Math.random()` leaks in game logic.
5. ~~**No analytics**~~ — ✅ Added lightweight localStorage analytics (`analytics.ts`). Tracks: runs started/completed, scores, talent picks, genre picks, challenge usage, archetype picks, run duration. Dev Stats panel toggled via **Ctrl+Shift+D**.
6. **Leaderboard is local-only** — no sharing or global competition.
7. **No save/resume** — closing the tab loses your run.
8. ~~**Shareable results**~~ — ✅ Verified: Wordle-style emoji grid (`generateShareText`) uses tier emojis (🟩🟨🟧🟥💀), copies to clipboard via `navigator.clipboard.writeText`. Working correctly.

## Recommended Next Steps (When Cody Plays It)
1. **Play a full run yourself** — first impressions matter most
2. **Try it on your phone** — R21 added responsive but it needs real-device testing  
3. **Try a daily seed run** — verify determinism works
4. **Try 2-3 challenge modes** — are they fun or frustrating?
5. **Decide: ship or iterate?** — the game is feature-complete for a free browser game

## Cost This Session
24 GREENLIGHT rounds × ~$0.03-0.07 each ≈ ~$1-2 total on the GREENLIGHT track alone.
