# 🎬 GREENLIGHT — A Movie Studio Roguelite

**[Play Now →](https://greenlight-plum.vercel.app)**

A push-your-luck deckbuilding roguelite where you run a Hollywood movie studio. Pick scripts, cast talent, survive chaotic productions, and chase box office glory across 5 seasons.

Built with React + TypeScript + Vite. No external dependencies for game logic — even the sound effects are procedurally generated via Web Audio API.

## 🎮 How to Play

You're a freshly hired studio head. Each of your **5 seasons** follows the same flow:

1. **Greenlight** — Pick a script. Match its genre to market conditions for bonus box office.
2. **Casting** — Fill talent slots from your roster or hire new talent. Each talent adds their cards to the production deck. High Skill = great cards. High Heat = powerful but risky (more Incident cards).
3. **Production** *(the core)* — Draw 2 cards, keep 1. Incidents auto-play. **3 Incidents = DISASTER** (lose all quality). Wrap early to play safe, or push for more.
4. **Release** — Quality × market × reputation = box office. Hit the target or get a strike.
5. **Off-Season** — Buy studio perks, hire talent, train your roster, pay down debt.

**You lose if:** 3 strikes (missed targets) or reputation hits 0.

## ✨ Features

### Core Systems
- **Draw-2-Keep-1 card play** with synergy chains, combo tracking, and tag-based archetypes
- **5 keyword tags** (🔥 Momentum, 🎯 Precision, 💀 Chaos, 💕 Heart, ✨ Spectacle) with escalating bonuses
- **Archetype Focus** — dominate one tag type (60%+) for bonus quality
- **Director's Cut** — peek at top 3 cards and rearrange (once per production)
- **Encore** — push-your-luck: draw one more after wrapping for a +3 bonus, but Incidents hit extra hard
- **Challenge cards** with visible odds and accept/decline betting
- **Block mechanic** — sacrifice an Action card to nullify an Incident

### Talent & Casting
- **13 Lead Actors**, 10 Support, 9 Directors, 9 Crew — each with unique card decks and playstyles
- **22 Chemistry pairs** — cast the right duo for free quality bonuses
- **Talent Baggage** — salary demands (💸), schedule conflicts (📅), entourage costs (👥), dangerous method acting (⚠️)
- **Talent Training** — remove Incident cards or upgrade Action cards between seasons
- **Contract system** — some talent have limited films before they leave

### Studio Building
- **4 Studio Archetypes** — Prestige 🏆, Blockbuster 💥, Indie 🌙, Wildcard 🎰
- **12 purchasable perks** — Reshoots, Crisis Manager, Insurance, Marketing Machine, etc.
- **Genre Mastery** — making multiple films in the same genre gives escalating bonuses
- **Procedural studio names and film titles** based on genre + dominant tag

### Economy & Progression
- **Genre Market Trends** — hot genres get +25% box office, cold genres get -20%
- **Debt system** — overspend and debt compounds at 20% per season; ≥$15M = reputation penalty
- **Rival studios** that release competing films each season (chase hot genres)
- **Industry events** that shift the meta each off-season

### Meta-Progression
- **9 Legacy Perks** unlocked by career milestones (permanent bonuses across runs)
- **Career Stats** — lifetime films, blockbusters, box office, genre breakdown, rank distribution
- **Daily Challenge** with seeded RNG, streak tracking, and leaderboard
- **6 Challenge Modes** — One Take, Shoestring Budget, Critics' Choice, Typecast, Speed Run, Chaos Reigns
- **New Game+** and **Director Mode** with escalating difficulty
- **Run History** with filmography, achievements, and shareable emoji grid

### Polish
- **23 procedural sound effects** via Web Audio API (no audio files)
- **Mute toggle** with localStorage persistence
- **Onboarding** — simplified first run (no debt/trends), contextual phase tips for first 3 runs
- **"New systems unlocked" toast** after completing first run
- **Animated transitions** — card flip/pick/discard, combo counters, disaster shake, victory confetti
- **Quality progress meter** with real-time estimation during production
- **Critic quotes** and **newspaper headlines** generated from game state
- **Mobile responsive** design

## 🛠 Development

```bash
npm install
npm run dev     # dev server
npm run build   # production build
```

Designed and built by Bishop, Feb 2026.
