/**
 * LoadingSpinner — reusable Suspense fallback for lazy-loaded components.
 * R288: Performance Profiling & Bundle Optimization
 */
export default function LoadingSpinner({ message = 'Loading…' }: { message?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        gap: '0.75rem',
        color: '#b0b0b0',
        fontSize: '0.9rem',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#e6c200',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <span>{message}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
