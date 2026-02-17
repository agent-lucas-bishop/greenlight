import { memo } from 'react';

/** Reusable loading skeleton for lazy-loaded components */
export const LoadingSkeleton = memo(function LoadingSkeleton({ 
  lines = 3, 
  style 
}: { 
  lines?: number; 
  style?: React.CSSProperties;
}) {
  return (
    <div className="loading-skeleton-container" style={style} role="status" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="shimmer-skeleton"
          style={{
            height: i === 0 ? '24px' : '16px',
            width: i === 0 ? '60%' : i === lines - 1 ? '40%' : '80%',
            marginBottom: '12px',
          }}
        />
      ))}
    </div>
  );
});

/** Card-shaped skeleton */
export const CardSkeleton = memo(function CardSkeleton() {
  return (
    <div className="card-skeleton shimmer-skeleton" role="status" aria-label="Loading card">
      <div className="shimmer-skeleton" style={{ height: 20, width: '50%', marginBottom: 8 }} />
      <div className="shimmer-skeleton" style={{ height: 14, width: '80%', marginBottom: 6 }} />
      <div className="shimmer-skeleton" style={{ height: 14, width: '60%' }} />
    </div>
  );
});

/** Panel skeleton for sidebar/stats */
export const PanelSkeleton = memo(function PanelSkeleton() {
  return (
    <div className="panel-skeleton" role="status" aria-label="Loading panel">
      <div className="shimmer-skeleton" style={{ height: 28, width: '40%', marginBottom: 16 }} />
      <div className="shimmer-skeleton" style={{ height: 60, width: '100%', marginBottom: 12, borderRadius: 8 }} />
      <div className="shimmer-skeleton" style={{ height: 60, width: '100%', marginBottom: 12, borderRadius: 8 }} />
      <div className="shimmer-skeleton" style={{ height: 60, width: '100%', borderRadius: 8 }} />
    </div>
  );
});

export default LoadingSkeleton;
