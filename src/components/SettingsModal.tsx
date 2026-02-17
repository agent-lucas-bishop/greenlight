import { useState } from 'react';
import { isMuted, setMuted, getVolume, setVolume } from '../sound';

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [muted, setMutedLocal] = useState(isMuted());
  const [volume, setVolumeLocal] = useState(getVolume());
  const [reduceMotion, setReduceMotion] = useState(
    document.documentElement.classList.contains('force-reduce-motion')
  );
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCredits, setShowCredits] = useState(false);

  const handleMuteToggle = () => {
    const next = !muted;
    setMuted(next);
    setMutedLocal(next);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setVolumeLocal(v);
  };

  const handleReduceMotion = () => {
    const next = !reduceMotion;
    setReduceMotion(next);
    document.documentElement.classList.toggle('force-reduce-motion', next);
    try { localStorage.setItem('greenlight-reduce-motion', String(next)); } catch {}
  };

  const handleResetProgress = () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('greenlight'));
    keys.forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Settings">
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <button className="modal-close" onClick={onClose} aria-label="Close settings">✕</button>
        <h2 style={{ color: 'var(--gold)', marginBottom: 20 }}>⚙️ Settings</h2>

        {/* Sound section */}
        <div className="settings-section">
          <h3 style={{ color: '#ccc', fontSize: '0.85rem', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Audio</h3>

          <div className="settings-row">
            <label htmlFor="sound-toggle" style={{ color: '#aaa', fontSize: '0.85rem', flex: 1 }}>Sound Effects</label>
            <button
              id="sound-toggle"
              role="switch"
              aria-checked={!muted}
              onClick={handleMuteToggle}
              className="settings-toggle"
              style={{ background: muted ? '#333' : 'var(--gold-dim)' }}
              aria-label={muted ? 'Sound off, click to enable' : 'Sound on, click to disable'}
            >
              <span className="settings-toggle-knob" style={{ transform: muted ? 'translateX(0)' : 'translateX(22px)' }} />
            </button>
          </div>

          <div className="settings-row" style={{ opacity: muted ? 0.4 : 1 }}>
            <label htmlFor="volume-slider" style={{ color: '#aaa', fontSize: '0.85rem', flex: 1 }}>
              Volume <span style={{ color: '#666', fontSize: '0.75rem' }}>{Math.round(volume * 100)}%</span>
            </label>
            <input
              id="volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              disabled={muted}
              aria-label={`Volume: ${Math.round(volume * 100)}%`}
              className="settings-slider"
              style={{ width: 120 }}
            />
          </div>
        </div>

        {/* Accessibility section */}
        <div className="settings-section">
          <h3 style={{ color: '#ccc', fontSize: '0.85rem', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Accessibility</h3>

          <div className="settings-row">
            <div style={{ flex: 1 }}>
              <label htmlFor="reduce-motion-toggle" style={{ color: '#aaa', fontSize: '0.85rem', display: 'block' }}>Reduce Motion</label>
              <span style={{ color: '#666', fontSize: '0.7rem' }}>Disables animations and visual effects</span>
            </div>
            <button
              id="reduce-motion-toggle"
              role="switch"
              aria-checked={reduceMotion}
              onClick={handleReduceMotion}
              className="settings-toggle"
              style={{ background: reduceMotion ? 'var(--gold-dim)' : '#333' }}
              aria-label={reduceMotion ? 'Reduce motion enabled, click to disable' : 'Reduce motion disabled, click to enable'}
            >
              <span className="settings-toggle-knob" style={{ transform: reduceMotion ? 'translateX(22px)' : 'translateX(0)' }} />
            </button>
          </div>
        </div>

        {/* Data section */}
        <div className="settings-section">
          <h3 style={{ color: '#ccc', fontSize: '0.85rem', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Data</h3>

          {!showResetConfirm ? (
            <button
              className="btn btn-small"
              onClick={() => setShowResetConfirm(true)}
              style={{ color: '#e74c3c', borderColor: '#e74c3c', width: '100%' }}
              aria-label="Reset all progress"
            >
              🗑️ Reset All Progress
            </button>
          ) : (
            <div style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
              <p style={{ color: '#e74c3c', fontSize: '0.85rem', marginBottom: 12 }}>
                ⚠️ This will delete <strong>all</strong> save data, run history, achievements, and unlocks. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn btn-small" onClick={handleResetProgress} style={{ color: '#e74c3c', borderColor: '#e74c3c' }} aria-label="Confirm reset all progress">
                  Yes, Delete Everything
                </button>
                <button className="btn btn-small" onClick={() => setShowResetConfirm(false)} aria-label="Cancel reset">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Credits */}
        <div className="settings-section" style={{ borderBottom: 'none' }}>
          <button
            className="btn btn-small"
            onClick={() => setShowCredits(!showCredits)}
            style={{ width: '100%', color: '#888', borderColor: '#444' }}
            aria-expanded={showCredits}
            aria-controls="credits-content"
          >
            {showCredits ? '▾' : '▸'} Credits & About
          </button>
          {showCredits && (
            <div id="credits-content" style={{ marginTop: 12, padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
              <p style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.2rem', marginBottom: 8 }}>GREENLIGHT</p>
              <p style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: 8 }}>A Movie Studio Roguelite</p>
              <p style={{ color: '#666', fontSize: '0.75rem', lineHeight: 1.6 }}>
                Built with React, TypeScript, and procedural Web Audio.
                <br />No external assets — all sounds are synthesized in real-time.
                <br />Fonts: Bebas Neue & Inter via Google Fonts.
              </p>
              <p style={{ color: '#555', fontSize: '0.7rem', marginTop: 12 }}>
                © 2026 · Made with 🎬 and ☕
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
