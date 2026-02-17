import { useState, useEffect } from 'react';
import { getRandomTip } from '../loadingTips';

const REEL_FRAMES = ['◐', '◓', '◑', '◒'];

export default function LoadingScreen() {
  const [tip] = useState(() => getRandomTip());
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setFrame(f => (f + 1) % REEL_FRAMES.length), 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-screen">
      <div className="loading-reel-container">
        <div className="loading-clapperboard">
          <div className="clapperboard-top">
            <div className="clapperboard-stripes">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="clapperboard-stripe" style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          </div>
          <div className="clapperboard-body">
            <span className="clapperboard-text">GREENLIGHT</span>
          </div>
        </div>
        <div className="loading-reel-spinner" aria-hidden="true">
          {REEL_FRAMES[frame]}
        </div>
      </div>
      <div className="loading-title">🎬 GREENLIGHT</div>
      <div className="loading-subtitle">Preparing the set…</div>
      <div className="loading-filmstrip" aria-hidden="true">
        <div className="filmstrip-scroll">
          {'▪ ▫ ▪ ▫ ▪ ▫ ▪ ▫ ▪ ▫ ▪ ▫ ▪ ▫ ▪ ▫ ▪ ▫ ▪ ▫ '}
        </div>
      </div>
      {tip && (
        <div className="loading-tip">
          <span className="loading-tip-label">FROM THE PRODUCER'S DESK</span>
          {tip}
        </div>
      )}
    </div>
  );
}
