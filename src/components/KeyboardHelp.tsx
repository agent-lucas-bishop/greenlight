import { useEffect, useRef } from 'react';
import { trapFocus, KEYBOARD_SHORTCUTS } from '../accessibility';

/**
 * R279: Comprehensive keyboard shortcut reference overlay.
 * Triggered by `?` key globally.
 */

function KeyboardHelp({ onClose }: { onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modalRef.current) return trapFocus(modalRef.current);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Group shortcuts by screen
  const grouped: Record<string, typeof KEYBOARD_SHORTCUTS> = {};
  for (const s of KEYBOARD_SHORTCUTS) {
    const screen = s.screen || 'Other';
    if (!grouped[screen]) grouped[screen] = [];
    grouped[screen].push(s);
  }

  const sectionOrder = ['Global', 'Production', 'Card Selection', 'Menus', 'Other'];
  const sortedSections = sectionOrder.filter(s => grouped[s]);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts reference">
      <div
        ref={modalRef}
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 500, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close keyboard shortcuts">✕</button>
        <h2 style={{ color: 'var(--gold)', marginBottom: 16 }}>⌨️ Keyboard Shortcuts</h2>

        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {sortedSections.map(section => (
            <div key={section}>
              <h3 style={{
                color: '#aaa', fontSize: '0.75rem', textTransform: 'uppercase',
                letterSpacing: '0.1em', marginBottom: 8, borderBottom: '1px solid #333', paddingBottom: 4,
              }}>
                {section}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {grouped[section].map(shortcut => (
                  <div key={shortcut.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <kbd style={{
                      background: '#222', border: '1px solid #444', borderRadius: 4,
                      padding: '3px 8px', color: 'var(--gold)', fontFamily: 'monospace',
                      fontSize: '0.75rem', minWidth: 110, textAlign: 'center',
                      boxShadow: '0 2px 0 #333',
                    }}>
                      {shortcut.key}
                    </kbd>
                    <span style={{ color: '#aaa', fontSize: '0.8rem' }}>{shortcut.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, flexShrink: 0 }}>
          <span style={{ color: '#555', fontSize: '0.7rem' }}>Press <kbd style={{
            background: '#222', border: '1px solid #444', borderRadius: 3, padding: '1px 5px',
            color: 'var(--gold)', fontFamily: 'monospace', fontSize: '0.7rem',
          }}>?</kbd> anytime to show this help</span>
        </div>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <button className="btn btn-small" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}

export default KeyboardHelp;
