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
  
  useEffect(() => subscribe(() => setState(getState())), []);

  const renderPhase = useCallback(() => {
    switch (state.phase) {
      case 'start': return <StartScreen />;
      case 'neow': return <NeowScreen />;
      case 'greenlight': return <GreenlightScreen state={state} />;
      case 'casting': return <CastingScreen state={state} />;
      case 'production': return <ProductionScreen state={state} />;
      case 'release': return <ReleaseScreen state={state} />;
      case 'shop': return <ShopScreen state={state} />;
      case 'gameOver': return <EndScreen state={state} type="gameover" />;
      case 'victory': return <EndScreen state={state} type="victory" />;
      default: return <StartScreen />;
    }
  }, [state]);

  return (
    <>
      <div className="spotlight" />
      {state.phase !== 'start' && <Header state={state} />}
      <div className="film-strip" />
      <div className="main">
        {renderPhase()}
      </div>
      <div className="film-strip" />
    </>
  );
}

export default App;
