import { useState, useEffect } from 'react';
import { getDevStats } from '../analytics';

export default function DevStats() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setVisible(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!visible) return null;

  const stats = getDevStats();

  return (
    <div style={{
      position: 'fixed', bottom: 12, right: 12, zIndex: 9999,
      background: 'rgba(0,0,0,0.92)', border: '1px solid #444',
      borderRadius: 10, padding: '14px 18px', minWidth: 240, maxWidth: 'calc(100vw - 24px)',
      fontFamily: 'monospace', fontSize: '0.75rem', color: '#ccc',
      backdropFilter: 'blur(8px)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ color: '#f39c12', fontWeight: 700, fontSize: '0.8rem' }}>📊 DEV STATS</span>
        <button onClick={() => setVisible(false)} style={{
          background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1rem',
        }}>✕</button>
      </div>
      {([
        ['Runs Started', stats.runsStarted],
        ['Runs Completed', stats.runsCompleted],
        ['Completion Rate', stats.completionRate],
        ['Win Rate', stats.winRate],
        ['Avg Score', stats.avgScore],
        ['Avg Duration', stats.avgDurationMin],
        ['Top Talent', stats.topTalent],
        ['Top Genre', stats.topGenre],
        ['Top Challenge', stats.topChallenge],
        ['Top Archetype', stats.topArchetype],
      ] as [string, string | number][]).map(([label, value]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid #222' }}>
          <span style={{ color: '#888' }}>{label}</span>
          <span style={{ color: '#eee' }}>{value}</span>
        </div>
      ))}
      <div style={{ color: '#555', fontSize: '0.6rem', marginTop: 8, textAlign: 'center' }}>Ctrl+Shift+D to toggle</div>
    </div>
  );
}
