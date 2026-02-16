import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { getState, subscribe } from './gameStore';
import { GameState } from './types';
import StartScreen from './screens/StartScreen';
import Header from './components/Header';

// Lazy-load screens that aren't needed at startup
const NeowScreen = lazy(() => import('./screens/NeowScreen'));
const GreenlightScreen = lazy(() => import('./screens/GreenlightScreen'));
const CastingScreen = lazy(() => import('./screens/CastingScreen'));
const ProductionScreen = lazy(() => import('./screens/ProductionScreen'));
const ReleaseScreen = lazy(() => import('./screens/ReleaseScreen'));
const ShopScreen = lazy(() => import('./screens/ShopScreen'));
const EndScreen = lazy(() => import('./screens/EndScreen'));

function App() {
  const [state, setState] = useState<GameState>(getState());
  const [transitioning, setTransitioning] = useState(false);
  const [prevPhase, setPrevPhase] = useState<string>(state.phase);
  
  useEffect(() => subscribe(() => setState(getState())), []);

  // Phase transition effect
  useEffect(() => {
    if (state.phase !== prevPhase) {
      setTransitioning(true);
      // Scroll to top on phase change
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      const t = setTimeout(() => {
        setTransitioning(false);
        setPrevPhase(state.phase);
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
      case 'release': {
        const latestRivals = state.rivalHistory[state.rivalHistory.length - 1];
        return <ReleaseScreen state={state} rivalFilms={latestRivals?.films || []} />;
      }
      case 'shop': return <ShopScreen state={state} />;
      case 'gameOver': return <EndScreen state={state} type="gameover" />;
      case 'victory': return <EndScreen state={state} type="victory" />;
      default: return <StartScreen />;
    }
  }, [state]);

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <div className="spotlight" aria-hidden="true" />
      {state.phase !== 'start' && <Header state={state} />}
      <div className="film-strip" aria-hidden="true" />
      <main id="main-content" className={`main ${transitioning ? 'phase-exit' : 'phase-enter'}`} role="main" aria-live="polite">
        <Suspense fallback={
          <div style={{ padding: '2rem', maxWidth: 600, margin: '0 auto' }}>
            <div className="shimmer-skeleton" style={{ height: 40, width: '60%', margin: '0 auto 20px', borderRadius: 8 }} />
            <div className="shimmer-skeleton" style={{ height: 120, marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="shimmer-skeleton" style={{ height: 160, flex: 1 }} />
              <div className="shimmer-skeleton" style={{ height: 160, flex: 1 }} />
            </div>
            <div className="shimmer-skeleton" style={{ height: 44, width: '50%', margin: '20px auto 0', borderRadius: 6 }} />
          </div>
        }>
          {renderPhase()}
        </Suspense>
      </main>
      <div className="film-strip" aria-hidden="true" />
    </>
  );
}

export default App;
