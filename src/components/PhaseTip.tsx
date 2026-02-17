import { useState, useEffect } from 'react';
import { isPhaseFirstVisit, markPhaseVisited, PHASE_TIPS, getRunCount, dismissTip, isTipDismissed, dismissAllTips, areAllTipsDismissed } from '../onboarding';

export default function PhaseTip({ phase }: { phase: string }) {
  const [visible, setVisible] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const tip = PHASE_TIPS[phase];
  
  useEffect(() => {
    // Show tips for first 3 runs on first visit to each phase per run, unless permanently dismissed
    const runCount = getRunCount();
    if (runCount <= 3 && tip && isPhaseFirstVisit(phase) && !isTipDismissed(phase)) {
      setVisible(true);
      markPhaseVisited(phase);
    }
  }, [phase]);

  if (!visible || !tip) return null;

  const handleDismiss = () => {
    if (dontShow) {
      dismissAllTips();
    }
    setVisible(false);
  };

  return (
    <div className="phase-tip animate-slide-down">
      <div className="phase-tip-content">
        <span className="phase-tip-icon">{tip.icon}</span>
        <div>
          <strong>{tip.title}:</strong> {tip.text}
          {tip.nudge && <span className="phase-tip-nudge">💡 {tip.nudge}</span>}
          <label className="phase-tip-dontshow" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: '0.7rem', color: '#666', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={dontShow}
              onChange={e => setDontShow(e.target.checked)}
              style={{ width: 12, height: 12, cursor: 'pointer' }}
            />
            Don't show tips again
          </label>
        </div>
        <button className="phase-tip-dismiss" onClick={handleDismiss} aria-label="Dismiss tip">✕</button>
      </div>
    </div>
  );
}
