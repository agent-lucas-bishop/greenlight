/**
 * R311: Fire/flame CSS animation for 3+ win streaks.
 */

interface StreakIndicatorProps {
  streak: number;
  className?: string;
}

export default function StreakIndicator({ streak, className = '' }: StreakIndicatorProps) {
  if (streak < 3) return null;

  const intensity = streak >= 5 ? 'inferno' : streak >= 4 ? 'blaze' : 'fire';

  return (
    <span className={`streak-indicator streak-${intensity} ${className}`} aria-label={`${streak} win streak`}>
      <span className="streak-flame" aria-hidden="true">🔥</span>
      <span className="streak-count">{streak}</span>
      <span className="streak-label">STREAK</span>
      <span className="streak-glow" aria-hidden="true" />
    </span>
  );
}
