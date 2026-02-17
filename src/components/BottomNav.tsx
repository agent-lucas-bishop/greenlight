import { memo } from 'react';
import type { GameState } from '../types';

interface BottomNavProps {
  state: GameState;
  onNavigate?: (tab: string) => void;
}

/** Mobile bottom navigation bar — shown only on small viewports via CSS */
const BottomNav = memo(function BottomNav({ state }: BottomNavProps) {
  const phase = state.phase;
  
  // Only show during active game phases
  if (phase === 'start' || phase === 'gameOver' || phase === 'victory') return null;

  const items = [
    { id: 'game', icon: '🎬', label: 'Game' },
    { id: 'deck', icon: '🃏', label: 'Deck', count: state.production?.deck?.length },
    { id: 'stats', icon: '📊', label: 'Stats' },
    { id: 'info', icon: '💡', label: 'Info' },
  ];

  return (
    <nav className="bottom-nav" aria-label="Game navigation">
      {items.map(item => (
        <button
          key={item.id}
          className={`bottom-nav-item ${item.id === 'game' ? 'active' : ''}`}
          aria-label={item.label}
        >
          <span className="bottom-nav-icon">{item.icon}</span>
          <span className="bottom-nav-label">{item.label}</span>
          {item.count !== undefined && item.count > 0 && (
            <span className="bottom-nav-badge">{item.count}</span>
          )}
        </button>
      ))}
    </nav>
  );
});

export default BottomNav;
