function KeyboardHints({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <button className="modal-close" onClick={onClose} aria-label="Close keyboard shortcuts">✕</button>
        <h2 style={{ color: 'var(--gold)', marginBottom: 16 }}>⌨️ Keyboard Shortcuts</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            ['Tab / Shift+Tab', 'Navigate between elements'],
            ['Enter / Space', 'Activate buttons & cards'],
            ['Esc', 'Close modals & overlays'],
            ['?', 'Show this help (from start screen)'],
          ].map(([key, desc]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <kbd style={{
                background: '#222', border: '1px solid #444', borderRadius: 4,
                padding: '3px 8px', color: 'var(--gold)', fontFamily: 'monospace',
                fontSize: '0.75rem', minWidth: 100, textAlign: 'center',
                boxShadow: '0 2px 0 #333',
              }}>{key}</kbd>
              <span style={{ color: '#aaa', fontSize: '0.8rem' }}>{desc}</span>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button className="btn btn-small" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}

export default KeyboardHints;
