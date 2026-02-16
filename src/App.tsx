import { useState, useEffect, useCallback } from 'react';
import { getState, subscribe } from './gameStore';
import { GameState } from './types';
import StartScreen from './screens/StartScreen';
import NeowScreen from './screens/NeowScreen';
import GreenlightScreen from './screens/GreenlightScreen';
import CastingScreen from './screens/CastingScreen';
import ProductionScreen from './screens/ProductionScreen';
import ReleaseScreen from './screens/ReleaseScreen';
import ShopScreen from './screens/ShopScreen';
import EndScreen from './screens/EndScreen';
import Header from './components/Header';

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
        {renderPhase()}
      </main>
      <div className="film-strip" aria-hidden="true" />
    </>
  );
}

export default App;
