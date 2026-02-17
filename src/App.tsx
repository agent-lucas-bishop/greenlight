import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { getState, subscribe, clearRetirementNotification, resolveStoryEvent, resolveNarrativeEvent } from './gameStore';
import StoryEventModal from './components/StoryEventModal';
import NarrativeEventCard from './components/NarrativeEvent';
import { GameState } from './types';
import StartScreen from './screens/StartScreen';
import Header from './components/Header';
import TutorialOverlay from './components/TutorialOverlay';
import ContextualTooltip from './components/ContextualTooltip';
import { getTipIfNew, markTipShown, type ContextualTip } from './contextualTips';
import StudioFoundingNarrative from './components/StudioFoundingNarrative';
import { shouldShowNarrative, markNarrativeShown } from './onboarding';
import { isTutorialActive } from './tutorial';
import { CUTSCENES, isStoryMomentsEnabled, hasCutsceneBeenSeen, type CutsceneData } from './cutscenes';
import { checkURLForMod, importModPack } from './modding';
import CutsceneOverlay from './components/CutsceneOverlay';
import { getRandomTip } from './loadingTips';
import LoadingScreen from './components/LoadingScreen';
import { checkAchievements, persistAchievements } from './achievements';
import type { AchievementDef } from './achievements';
import AchievementToast from './components/AchievementToast';
import AchievementPopup, { queueAchievementPopups } from './components/AchievementPopup';
import UnlockToast from './components/UnlockToast';
import { checkUnlockConditions, UNLOCKABLE_DEFS } from './unlockableContent';
import type { UnlockableDef } from './unlockableContent';
import DevStats from './components/DevStats';
import BottomNav from './components/BottomNav';
import WorldEventBanner from './components/WorldEventBanner';
import SeasonalBanner from './components/SeasonalBanner';
import EventBanner from './components/EventBanner';
import { applyEventTheme } from './seasonalEvents';
import RetirementToast from './components/RetirementToast';
import { getSeasonTheme, applySeasonTheme } from './seasonThemes';
import { sfx } from './sound';
import { announcePhase, setupGlobalKeyboardListeners } from './accessibility';
import { showTenseVignette, hideTenseVignette } from './visualEffects';
import KeyboardHelp from './components/KeyboardHelp';

// Lazy-load screens that aren't needed at startup
const NeowScreen = lazy(() => import('./screens/NeowScreen'));
const GreenlightScreen = lazy(() => import('./screens/GreenlightScreen'));
const CastingScreen = lazy(() => import('./screens/CastingScreen'));
const ProductionScreen = lazy(() => import('./screens/ProductionScreen'));
const PostProductionScreen = lazy(() => import('./screens/PostProductionScreen'));
const ReleaseScreen = lazy(() => import('./screens/ReleaseScreen'));
const ShopScreen = lazy(() => import('./screens/ShopScreen'));
const CardWorkshop = lazy(() => import('./components/CardWorkshop'));
const EventScreen = lazy(() => import('./screens/EventScreen'));
const FestivalScreen = lazy(() => import('./screens/FestivalScreen'));
const EndScreen = lazy(() => import('./screens/EndScreen'));

function App() {
  const [state, setState] = useState<GameState>(getState());
  const [transitioning, setTransitioning] = useState(false);
  const [prevPhase, setPrevPhase] = useState<string>(state.phase);
  const [showNarrative, setShowNarrative] = useState(false);
  const [toastQueue, setToastQueue] = useState<AchievementDef[]>([]);
  const [unlockToastQueue, setUnlockToastQueue] = useState<UnlockableDef[]>([]);
  const [checkedPhases, setCheckedPhases] = useState<string>('');
  const [activeTip, setActiveTip] = useState<ContextualTip | null>(null);
  const [seasonOverlay, setSeasonOverlay] = useState<number | null>(null);
  const [seasonOverlayExit, setSeasonOverlayExit] = useState(false);
  const [seasonTip, setSeasonTip] = useState('');
  const [seasonHeadline, setSeasonHeadline] = useState('');
  const [activeCutscene, setActiveCutscene] = useState<{ data: CutsceneData; vars?: Record<string, string> } | null>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  
  useEffect(() => subscribe(() => setState(getState())), []);

  // R279: Global keyboard shortcuts (? for help, M for mute)
  useEffect(() => {
    return setupGlobalKeyboardListeners({
      onOpenKeyboardHelp: () => setShowKeyboardHelp(true),
      onToggleMute: () => { import('./sound').then(m => { m.toggleMute(); }); },
    });
  }, []);

  // R250: Tense vignette for low budget or reputation
  useEffect(() => {
    if (state.phase === 'start') { hideTenseVignette(); return; }
    // Don't override production screen's own vignette logic
    if (state.phase === 'production') return;
    if (state.reputation <= 1 || state.strikes >= 2) {
      showTenseVignette('intense');
    } else if (state.budget < 5 && state.budget > 0 && state.phase !== 'release') {
      showTenseVignette('mild');
    } else {
      hideTenseVignette();
    }
  }, [state.phase, state.reputation, state.strikes, state.budget]);

  // R205: Check URL for shared mod pack
  useEffect(() => {
    const mod = checkURLForMod();
    if (mod) {
      const json = JSON.stringify(mod);
      const result = importModPack(json);
      if (result.mod) {
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
        alert(`Mod pack "${result.mod.name}" by ${result.mod.author} has been imported! Enable it in Settings → Mods.`);
      }
    }
  }, []);

  // R167: Apply seasonal theme CSS properties
  useEffect(() => {
    if (state.phase !== 'start') {
      applySeasonTheme(state.season);
    }
  }, [state.season, state.phase]);

  // R245: Apply real-world seasonal event theme overrides
  useEffect(() => {
    if (state.phase !== 'start') {
      applyEventTheme();
    }
  }, [state.phase]);

  // R218: Contextual tooltips — trigger on first encounter of game mechanics
  useEffect(() => {
    if (activeTip) return; // don't stack tips
    // First retirement
    if (state.retirementNotification) {
      const tip = getTipIfNew('firstRetirement');
      if (tip) { setActiveTip(tip); return; }
    }
    // First world event
    if (state.activeWorldEvents && state.activeWorldEvents.length > 0) {
      const tip = getTipIfNew('firstWorldEvent');
      if (tip) { setActiveTip(tip); return; }
    }
    // First festival
    if (state.phase === 'festival') {
      const tip = getTipIfNew('firstFestival');
      if (tip) { setActiveTip(tip); return; }
    }
    // First prestige opportunity (check if prestige data exists in season history)
    if (state.seasonHistory.some(s => s.nominated)) {
      const tip = getTipIfNew('firstPrestige');
      if (tip) { setActiveTip(tip); return; }
    }
    // First synergy / ability — check production played cards
    if (state.phase === 'production' && state.production) {
      const played = state.production.played;
      if (played.some(c => c.synergyFired)) {
        const tip = getTipIfNew('firstSynergy');
        if (tip) { setActiveTip(tip); return; }
      }
      if (played.some(c => c.abilityActivated)) {
        const tip = getTipIfNew('firstAbility');
        if (tip) { setActiveTip(tip); return; }
      }
    }
  }, [state.phase, state.retirementNotification, state.activeWorldEvents, state.seasonHistory, state.production, activeTip]);

  // Check achievements on phase transitions
  useEffect(() => {
    const phaseKey = `${state.phase}-${state.season}-${state.seasonHistory.length}`;
    if (phaseKey === checkedPhases) return;
    if (state.phase === 'start') return;
    setCheckedPhases(phaseKey);
    const newAchs = checkAchievements(state);
    if (newAchs.length > 0) {
      persistAchievements(newAchs.map(a => a.id));
      setToastQueue(prev => [...prev, ...newAchs]);
      queueAchievementPopups(newAchs);
    }
    // Check for unlockable content
    const newUnlockIds = checkUnlockConditions();
    if (newUnlockIds.length > 0) {
      const newUnlocks = newUnlockIds.map(id => UNLOCKABLE_DEFS.find(d => d.id === id)!).filter(Boolean);
      setUnlockToastQueue(prev => [...prev, ...newUnlocks]);
    }
  }, [state.phase, state.season, state.seasonHistory.length, checkedPhases]);

  // Show narrative on first-ever neow entry
  useEffect(() => {
    if (state.phase === 'neow' && shouldShowNarrative()) {
      setShowNarrative(true);
      markNarrativeShown();
    }
  }, [state.phase]);

  // R183: Cutscene trigger system
  useEffect(() => {
    if (!isStoryMomentsEnabled()) return;
    const s = state;
    const tryShow = (id: string, vars?: Record<string, string>) => {
      if (!hasCutsceneBeenSeen(id) && CUTSCENES[id]) {
        setActiveCutscene({ data: CUTSCENES[id], vars });
      }
    };

    // Game start: when entering first greenlight (season 1)
    if (s.phase === 'greenlight' && s.season === 1 && s.seasonHistory.length === 0) {
      tryShow('gameStart');
    }

    // First BLOCKBUSTER
    if (s.phase === 'release' && s.lastTier === 'BLOCKBUSTER' && !s.seasonHistory.some(h => h.tier === 'BLOCKBUSTER')) {
      tryShow('firstBlockbuster');
    }

    // First FLOP
    if (s.phase === 'release' && s.lastTier === 'FLOP' && !s.seasonHistory.some(h => h.tier === 'FLOP')) {
      tryShow('firstFlop');
    }

    // Nemesis appears
    if (s.nemesisStudio && s.phase === 'release') {
      tryShow('nemesisAppears', { rivalName: s.nemesisStudio });
    }

    // Endless mode start (season > maxSeasons in endless)
    if (s.gameMode === 'endless' && s.phase === 'greenlight' && s.season === s.maxSeasons + 1) {
      tryShow('endlessMode');
    }

    // Final season (non-endless)
    if (s.gameMode !== 'endless' && s.phase === 'greenlight' && s.season === s.maxSeasons && s.season > 1) {
      tryShow('finalSeason');
    }
  }, [state.phase, state.season, state.lastTier, state.nemesisStudio, state.gameMode]);

  // Season announcement overlay
  useEffect(() => {
    if (state.phase === 'greenlight' && state.season > 1 && (prevPhase === 'shop' || prevPhase === 'event' || prevPhase === 'workshop')) {
      setSeasonOverlay(state.season);
      setSeasonOverlayExit(false);
      setSeasonTip(getRandomTip());
      // R170: Season-themed transition sounds
      const theme = getSeasonTheme(state.season);
      if (theme.name === 'Spring') sfx.seasonSpring();
      else if (theme.name === 'Summer') sfx.seasonSummer();
      else if (theme.name === 'Autumn') sfx.seasonAutumn();
      else if (theme.name === 'Winter') sfx.seasonWinter();
      else if (theme.name === 'Awards') sfx.seasonAwards();
      else sfx.seasonTransition();
      // Generate newspaper headline from last season's results
      const lastSeason = state.seasonHistory[state.seasonHistory.length - 1];
      if (lastSeason) {
        const films = state.seasonHistory.filter(s => s.season === state.season - 1);
        const totalBO = films.reduce((s, f) => s + f.boxOffice, 0);
        const studioName = state.studioName || 'Studio';
        const filmCount = films.length;
        const bestFilm = films.reduce((a, b) => a.boxOffice > b.boxOffice ? a : b, films[0]);
        const anyNom = films.some(f => f.nominated);
        const anyFlop = films.some(f => f.tier === 'FLOP');
        const allHit = films.every(f => f.hitTarget);
        let headline = '';
        if (anyNom && allHit) {
          headline = `SEASON ${state.season - 1} WRAP: ${studioName.toUpperCase()} DAZZLES — $${totalBO.toFixed(0)}M across ${filmCount} film${filmCount !== 1 ? 's' : ''}, awards buzz for "${bestFilm.title}"`;
        } else if (allHit) {
          headline = `SEASON ${state.season - 1} WRAP: ${studioName.toUpperCase()} HITS ALL TARGETS — $${totalBO.toFixed(0)}M total, "${bestFilm.title}" leads the slate`;
        } else if (anyFlop) {
          headline = `SEASON ${state.season - 1} WRAP: MIXED RESULTS FOR ${studioName.toUpperCase()} — $${totalBO.toFixed(0)}M earned, but "${films.find(f => f.tier === 'FLOP')?.title}" stumbles`;
        } else {
          headline = `SEASON ${state.season - 1} WRAP: ${studioName.toUpperCase()} EARNS $${totalBO.toFixed(0)}M — "${bestFilm.title}" headlines the season`;
        }
        setSeasonHeadline(headline);
      }
      const t1 = setTimeout(() => setSeasonOverlayExit(true), 2800);
      const t2 = setTimeout(() => setSeasonOverlay(null), 3300);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [state.phase, state.season]);

  // Phase transition effect + focus management + screen reader announcement
  useEffect(() => {
    if (state.phase !== prevPhase) {
      setTransitioning(true);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      const t = setTimeout(() => {
        setTransitioning(false);
        setPrevPhase(state.phase);
        // Move focus to main content for screen readers on phase change
        const main = document.getElementById('main-content');
        if (main) {
          main.focus({ preventScroll: true });
        }
        // Announce phase change to screen readers
        announcePhase(state.phase);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [state.phase, prevPhase]);

  const renderPhase = useCallback(() => {
    switch (state.phase) {
      case 'start': return <StartScreen />;
      case 'neow': return <NeowScreen />;
      case 'greenlight': return <GreenlightScreen state={state} />;
      case 'casting': return <CastingScreen state={state} />;
      case 'production': return <ProductionScreen state={state} />;
      case 'postProduction': return <PostProductionScreen state={state} />;
      case 'release': {
        const latestRivals = state.rivalHistory[state.rivalHistory.length - 1];
        return <ReleaseScreen state={state} rivalFilms={latestRivals?.films || []} />;
      }
      case 'shop': return <ShopScreen state={state} />;
      case 'workshop': return <CardWorkshop state={state} />;
      case 'festival': return <FestivalScreen state={state} />;
      case 'event': return <EventScreen state={state} />;
      case 'gameOver': return <EndScreen state={state} type="gameover" />;
      case 'victory': return <EndScreen state={state} type="victory" />;
      default: return <StartScreen />;
    }
  }, [state]);

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <div className="spotlight" aria-hidden="true" />
      {state.phase !== 'start' && (
        <div className="weather-particles" aria-hidden="true">
          <div className="weather-particle p1" />
          <div className="weather-particle p2" />
          <div className="weather-particle p3" />
          <div className="weather-particle p4" />
        </div>
      )}
      {state.phase !== 'start' && <EventBanner />}
      {state.phase !== 'start' && <SeasonalBanner />}
      {state.phase !== 'start' && <Header state={state} />}
      {state.phase !== 'start' && state.activeWorldEvents && state.activeWorldEvents.length > 0 && (
        <WorldEventBanner events={state.activeWorldEvents} currentSeason={state.season} />
      )}
      <div className="film-strip" aria-hidden="true" />
      <main id="main-content" className={`main ${transitioning ? 'phase-exit' : 'phase-enter'}`} role="main" aria-live="polite" tabIndex={-1} style={{ outline: 'none' }}>
        <Suspense fallback={<LoadingScreen />}>
          {renderPhase()}
        </Suspense>
      </main>
      <div className="film-strip" aria-hidden="true" />
      {showNarrative && (
        <StudioFoundingNarrative
          studioName={state.studioName || 'Your Studio'}
          onComplete={() => setShowNarrative(false)}
        />
      )}
      {state.phase !== 'start' && isTutorialActive() && (
        <TutorialOverlay phase={state.phase} />
      )}
      {activeTip && !isTutorialActive() && (
        <ContextualTooltip tip={activeTip} onDismiss={() => setActiveTip(null)} />
      )}
      {toastQueue.length > 0 && (
        <AchievementToast
          achievement={toastQueue[0]}
          onDone={() => setToastQueue(prev => prev.slice(1))}
        />
      )}
      <AchievementPopup />
      {unlockToastQueue.length > 0 && toastQueue.length === 0 && (
        <UnlockToast
          unlock={unlockToastQueue[0]}
          onDone={() => setUnlockToastQueue(prev => prev.slice(1))}
        />
      )}
      {state.retirementNotification && (
        <RetirementToast
          talentName={state.retirementNotification}
          onDone={clearRetirementNotification}
        />
      )}
      {activeCutscene && (
        <CutsceneOverlay
          cutscene={activeCutscene.data}
          vars={activeCutscene.vars}
          onComplete={() => setActiveCutscene(null)}
        />
      )}
      {state.pendingStoryEvent && (
        <StoryEventModal
          event={state.pendingStoryEvent}
          onChoice={resolveStoryEvent}
        />
      )}
      {state.pendingNarrativeEvent && (
        <NarrativeEventCard
          event={state.pendingNarrativeEvent}
          onResolve={resolveNarrativeEvent}
        />
      )}
      <BottomNav state={state} />
      <DevStats />
      {showKeyboardHelp && <KeyboardHelp onClose={() => setShowKeyboardHelp(false)} />}
      {seasonOverlay !== null && (
        <div className={`season-overlay ${seasonOverlayExit ? 'season-overlay-exit' : ''}`} onClick={() => { setSeasonOverlayExit(true); setTimeout(() => setSeasonOverlay(null), 500); }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { setSeasonOverlayExit(true); setTimeout(() => setSeasonOverlay(null), 500); } }} style={{ cursor: 'pointer' }}>
          <div className="season-overlay-inner">
            {seasonHeadline && (
              <div className="season-headline">
                <div className="season-headline-masthead">THE DAILY REEL</div>
                <div className="season-headline-rule" />
                <div className="season-headline-text">{seasonHeadline}</div>
                <div className="season-headline-rule" />
              </div>
            )}
            <div className="season-theme-icon">{getSeasonTheme(seasonOverlay).icon}</div>
            <div className="season-number">SEASON {seasonOverlay}: {getSeasonTheme(seasonOverlay).name}</div>
            {seasonTip && (
              <div className="season-tip-text">
                {seasonTip}
              </div>
            )}
            <div className="season-click-hint">CLICK TO CONTINUE</div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
