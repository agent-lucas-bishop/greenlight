import { useState, useEffect } from 'react';
import { isPhaseFirstVisit, markPhaseVisited, PHASE_TIPS, getRunCount } from '../onboarding';

export default function PhaseTip({ phase }: { phase: string }) {
  const [visible, setVisible] = useState(false);
  const tip = PHASE_TIPS[phase];
  
  useEffect(() => {
    // Show tips for first 3 runs on first visit to each phase per run
    const runCount = getRunCount();
    if (runCount <= 3 && tip && isPhaseFirstVisit(phase)) {
      setVisible(true);
      markPhaseVisited(phase);
    }
  }, [phase]);

  if (!visible || !tip) return null;

  return (
    <div className="phase-tip animate-slide-down" onClick={() => setVisible(false)}>
      <div className="phase-tip-content">
        <span className="phase-tip-icon">{tip.icon}</span>
        <div>
          <strong>{tip.title}:</strong> {tip.text}
        </div>
        <button className="phase-tip-dismiss" onClick={() => setVisible(false)}>✕</button>
      </div>
    </div>
  );
}
