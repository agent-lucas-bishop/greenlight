import { useState, useRef } from 'react';
import { isMuted, setMuted, getVolume, setVolume, getSfxVolume, setSfxVolume } from '../sound';
import { getStudioIdentity, setStudioIdentity, getRandomDefaultName, STUDIO_LOGOS, DEFAULT_STUDIO_NAMES, type StudioLogo } from '../studioIdentity';
import { isStoryMomentsEnabled, setStoryMomentsEnabled } from '../cutscenes';
import { resetTutorial, isTutorialComplete } from '../tutorial';

/* ── helpers ─────────────────────────────────────────────────── */

const LS = {
  get: (k: string, fallback: string) => { try { return localStorage.getItem(k) ?? fallback; } catch { return fallback; } },
  getBool: (k: string, fallback: boolean) => { try { const v = localStorage.getItem(k); return v === null ? fallback : v === 'true'; } catch { return fallback; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} },
};

/* ── Toggle component ────────────────────────────────────────── */

function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id: string }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="settings-toggle"
      style={{ background: checked ? 'var(--gold-dim)' : '#333' }}
      aria-label={label}
    >
      <span className="settings-toggle-knob" style={{ transform: checked ? 'translateX(22px)' : 'translateX(0)' }} />
    </button>
  );
}

/* ── Section heading ─────────────────────────────────────────── */

const SectionH3 = ({ children }: { children: React.ReactNode }) => (
  <h3 style={{ color: '#ccc', fontSize: '0.85rem', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{children}</h3>
);

/* ── Studio Identity Editor ──────────────────────────────────── */

function StudioIdentityEditor() {
  const existing = getStudioIdentity();
  const [name, setName] = useState(existing?.name || '');
  const [logo, setLogo] = useState<StudioLogo>(existing?.logo || '🎬');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const finalName = name.trim() || getRandomDefaultName();
    setStudioIdentity({ name: finalName, logo });
    setName(finalName);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label htmlFor="studio-name-input" style={{ color: '#aaa', fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>Studio Name</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input id="studio-name-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter studio name..." maxLength={30}
            style={{ flex: 1, background: '#1a1a2e', border: '1px solid #333', borderRadius: 6, padding: '8px 12px', color: '#eee', fontSize: '0.85rem', outline: 'none' }} />
          <button className="btn btn-small" onClick={() => setName(getRandomDefaultName())} title="Random name" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>🎲</button>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
          {DEFAULT_STUDIO_NAMES.slice(0, 5).map(n => (
            <button key={n} onClick={() => setName(n)} style={{ background: 'transparent', border: '1px solid #333', borderRadius: 4, padding: '2px 6px', color: '#666', fontSize: '0.6rem', cursor: 'pointer' }}>{n}</button>
          ))}
        </div>
      </div>
      <div>
        <label style={{ color: '#aaa', fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>Studio Logo</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {STUDIO_LOGOS.map(l => (
            <button key={l} onClick={() => setLogo(l)} style={{
              fontSize: '1.5rem', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, cursor: 'pointer',
              background: logo === l ? 'rgba(212,168,67,0.2)' : 'rgba(255,255,255,0.03)', border: `2px solid ${logo === l ? 'var(--gold)' : '#333'}`, transition: 'all 0.2s',
            }} aria-label={`Logo: ${l}`} aria-pressed={logo === l}>{l}</button>
          ))}
        </div>
      </div>
      <button className="btn btn-small" onClick={handleSave} style={{ color: saved ? '#2ecc71' : 'var(--gold)', borderColor: saved ? '#2ecc71' : 'var(--gold-dim)', width: '100%' }}>
        {saved ? '✅ Saved!' : '💾 Save Studio Identity'}
      </button>
    </div>
  );
}

/* ── Settings sections ───────────────────────────────────────── */

type Tab = 'sound' | 'animation' | 'display' | 'game' | 'data' | 'keyboard' | 'studio' | 'credits';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'sound', icon: '🔊', label: 'Sound' },
  { id: 'animation', icon: '✨', label: 'Animation' },
  { id: 'display', icon: '👁', label: 'Display' },
  { id: 'game', icon: '🎮', label: 'Game' },
  { id: 'studio', icon: '🏛', label: 'Studio' },
  { id: 'data', icon: '💾', label: 'Data' },
  { id: 'keyboard', icon: '⌨️', label: 'Keys' },
  { id: 'credits', icon: 'ℹ️', label: 'About' },
];

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('sound');
  const [muted, setMutedLocal] = useState(isMuted());
  const [volume, setVolumeLocal] = useState(getVolume());
  const [sfxVol, setSfxVolLocal] = useState(getSfxVolume());

  // Animation
  const [reduceMotion, setReduceMotion] = useState(document.documentElement.classList.contains('force-reduce-motion'));
  const [animSpeed, setAnimSpeed] = useState(() => {
    const v = LS.get('greenlight-anim-speed', '1');
    return parseFloat(v) || 1;
  });

  // Display
  const [textSize, setTextSize] = useState<'small' | 'medium' | 'large'>(() => LS.get('greenlight-text-size', 'medium') as any);
  const [highContrast, setHighContrast] = useState(() => LS.getBool('greenlight-high-contrast', false));
  const [colorblindMode, setColorblindMode] = useState(() => LS.getBool('greenlight-colorblind', false));

  // Game
  const [autoSave, setAutoSave] = useState(() => LS.getBool('greenlight-auto-save', true));
  const [confirmEndTurn, setConfirmEndTurn] = useState(() => LS.getBool('greenlight-confirm-end-turn', false));
  const [showTooltips, setShowTooltips] = useState(() => LS.getBool('greenlight-show-tooltips', true));
  const [showStoryMoments, setShowStoryMoments] = useState(() => isStoryMomentsEnabled());
  const [tutorialReset, setTutorialReset] = useState(false);

  // Data
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  /* ── handlers ──────────────────────────────────────────────── */

  const handleMuteToggle = () => { const next = !muted; setMuted(next); setMutedLocal(next); };
  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => { const v = parseFloat(e.target.value); setVolume(v); setVolumeLocal(v); };
  const handleSfxVolume = (e: React.ChangeEvent<HTMLInputElement>) => { const v = parseFloat(e.target.value); setSfxVolume(v); setSfxVolLocal(v); };

  const handleReduceMotion = () => {
    const next = !reduceMotion;
    setReduceMotion(next);
    document.documentElement.classList.toggle('force-reduce-motion', next);
    LS.set('greenlight-reduce-motion', String(next));
  };

  const handleAnimSpeed = (v: number) => {
    setAnimSpeed(v);
    LS.set('greenlight-anim-speed', String(v));
    document.documentElement.style.setProperty('--animation-speed', String(v));
  };

  const handleTextSize = (size: 'small' | 'medium' | 'large') => {
    setTextSize(size);
    LS.set('greenlight-text-size', size);
    document.documentElement.dataset.textSize = size;
  };

  const handleHighContrast = (v: boolean) => {
    setHighContrast(v);
    LS.set('greenlight-high-contrast', String(v));
    document.documentElement.classList.toggle('high-contrast', v);
  };

  const handleColorblind = (v: boolean) => {
    setColorblindMode(v);
    LS.set('greenlight-colorblind', String(v));
    document.documentElement.classList.toggle('colorblind-mode', v);
  };

  const handleAutoSave = (v: boolean) => { setAutoSave(v); LS.set('greenlight-auto-save', String(v)); };
  const handleConfirmEndTurn = (v: boolean) => { setConfirmEndTurn(v); LS.set('greenlight-confirm-end-turn', String(v)); };
  const handleShowTooltips = (v: boolean) => { setShowTooltips(v); LS.set('greenlight-show-tooltips', String(v)); };
  const handleStoryMoments = (v: boolean) => { setShowStoryMoments(v); setStoryMomentsEnabled(v); };

  const handleExport = () => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('greenlight')) data[k] = localStorage.getItem(k) || '';
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `greenlight-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (typeof data !== 'object' || data === null) throw new Error('Invalid format');
        let count = 0;
        for (const [k, v] of Object.entries(data)) {
          if (k.startsWith('greenlight') && typeof v === 'string') { localStorage.setItem(k, v); count++; }
        }
        setImportMsg(`✅ Imported ${count} entries. Reload to apply.`);
      } catch {
        setImportMsg('❌ Invalid save file.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetProgress = () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('greenlight'));
    keys.forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };

  // Keyboard: close on Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
  };

  /* ── render helpers ────────────────────────────────────────── */

  const Slider = ({ id, value, onChange, disabled, label, min = 0, max = 1, step = 0.05 }: {
    id: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean; label: string; min?: number; max?: number; step?: number;
  }) => (
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={onChange}
      disabled={disabled} aria-label={label} className="settings-slider" style={{ width: 120 }} />
  );

  const Row = ({ children, dimmed }: { children: React.ReactNode; dimmed?: boolean }) => (
    <div className="settings-row" style={dimmed ? { opacity: 0.4 } : undefined}>{children}</div>
  );

  const Label = ({ htmlFor, children, sub }: { htmlFor?: string; children: React.ReactNode; sub?: string }) => (
    <div style={{ flex: 1 }}>
      <label htmlFor={htmlFor} style={{ color: '#aaa', fontSize: '0.85rem', display: 'block' }}>{children}</label>
      {sub && <span style={{ color: '#666', fontSize: '0.7rem' }}>{sub}</span>}
    </div>
  );

  const ANIM_SPEEDS = [0.5, 1, 2];

  /* ── tab content ───────────────────────────────────────────── */

  const renderTab = () => {
    switch (tab) {
      case 'sound':
        return (
          <div className="settings-section" style={{ borderBottom: 'none' }}>
            <SectionH3>Sound Settings</SectionH3>
            <Row>
              <Label htmlFor="sound-toggle">Sound Effects</Label>
              <Toggle id="sound-toggle" checked={!muted} onChange={() => handleMuteToggle()} label={muted ? 'Sound off' : 'Sound on'} />
            </Row>
            <Row dimmed={muted}>
              <Label htmlFor="master-vol">Master Volume <span style={{ color: '#666', fontSize: '0.75rem' }}>{Math.round(volume * 100)}%</span></Label>
              <Slider id="master-vol" value={volume} onChange={handleVolume} disabled={muted} label={`Master volume: ${Math.round(volume * 100)}%`} />
            </Row>
            <Row dimmed={muted}>
              <Label htmlFor="sfx-vol">SFX Volume <span style={{ color: '#666', fontSize: '0.75rem' }}>{Math.round(sfxVol * 100)}%</span></Label>
              <Slider id="sfx-vol" value={sfxVol} onChange={handleSfxVolume} disabled={muted} label={`SFX volume: ${Math.round(sfxVol * 100)}%`} />
            </Row>
          </div>
        );
      case 'animation':
        return (
          <div className="settings-section" style={{ borderBottom: 'none' }}>
            <SectionH3>Animation Settings</SectionH3>
            <Row>
              <Label htmlFor="reduce-motion-toggle" sub="Disables animations and visual effects">Reduce Motion</Label>
              <Toggle id="reduce-motion-toggle" checked={reduceMotion} onChange={handleReduceMotion} label="Reduce motion" />
            </Row>
            <Row dimmed={reduceMotion}>
              <Label sub="Controls how fast animations play">Animation Speed</Label>
              <div style={{ display: 'flex', gap: 4 }}>
                {ANIM_SPEEDS.map(s => (
                  <button key={s} className="btn btn-small" onClick={() => handleAnimSpeed(s)}
                    style={{ padding: '4px 10px', fontSize: '0.75rem', color: animSpeed === s ? 'var(--gold)' : '#666', borderColor: animSpeed === s ? 'var(--gold-dim)' : '#333' }}
                    aria-pressed={animSpeed === s}>{s}x</button>
                ))}
              </div>
            </Row>
          </div>
        );
      case 'display':
        return (
          <div className="settings-section" style={{ borderBottom: 'none' }}>
            <SectionH3>Display Settings</SectionH3>
            <Row>
              <Label sub="Adjusts base font size">Text Size</Label>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['small', 'medium', 'large'] as const).map(s => (
                  <button key={s} className="btn btn-small" onClick={() => handleTextSize(s)}
                    style={{ padding: '4px 10px', fontSize: '0.75rem', textTransform: 'capitalize', color: textSize === s ? 'var(--gold)' : '#666', borderColor: textSize === s ? 'var(--gold-dim)' : '#333' }}
                    aria-pressed={textSize === s}>{s}</button>
                ))}
              </div>
            </Row>
            <Row>
              <Label htmlFor="high-contrast-toggle" sub="Increases contrast ratios for readability">High Contrast</Label>
              <Toggle id="high-contrast-toggle" checked={highContrast} onChange={handleHighContrast} label="High contrast mode" />
            </Row>
            <Row>
              <Label htmlFor="colorblind-toggle" sub="Adds patterns/icons alongside color indicators">Colorblind-Friendly</Label>
              <Toggle id="colorblind-toggle" checked={colorblindMode} onChange={handleColorblind} label="Colorblind-friendly mode" />
            </Row>
          </div>
        );
      case 'game':
        return (
          <div className="settings-section" style={{ borderBottom: 'none' }}>
            <SectionH3>Game Settings</SectionH3>
            <Row>
              <Label htmlFor="auto-save-toggle" sub="Automatically saves progress each phase">Auto-Save</Label>
              <Toggle id="auto-save-toggle" checked={autoSave} onChange={handleAutoSave} label="Auto-save" />
            </Row>
            <Row>
              <Label htmlFor="confirm-end-turn-toggle" sub="Ask for confirmation before ending your turn">Confirm End Turn</Label>
              <Toggle id="confirm-end-turn-toggle" checked={confirmEndTurn} onChange={handleConfirmEndTurn} label="Confirm before ending turn" />
            </Row>
            <Row>
              <Label htmlFor="tooltips-toggle" sub="Show helpful hints on hover">Show Tooltips</Label>
              <Toggle id="tooltips-toggle" checked={showTooltips} onChange={handleShowTooltips} label="Show tooltips" />
            </Row>
            <Row>
              <Label htmlFor="story-moments-toggle" sub="Brief cinematic moments at key milestones">Show Story Moments</Label>
              <Toggle id="story-moments-toggle" checked={showStoryMoments} onChange={handleStoryMoments} label="Show story moments" />
            </Row>
            <div style={{ borderTop: '1px solid #333', paddingTop: 12, marginTop: 8 }}>
              <button
                className="btn btn-small"
                onClick={() => { resetTutorial(); setTutorialReset(true); setTimeout(() => setTutorialReset(false), 2000); }}
                style={{ width: '100%', color: tutorialReset ? '#2ecc71' : 'var(--gold)', borderColor: tutorialReset ? '#2ecc71' : 'var(--gold-dim)' }}
                aria-label="Replay tutorial"
              >
                {tutorialReset ? '✅ Tutorial will replay next game!' : '🎓 Replay Tutorial'}
              </button>
            </div>
          </div>
        );
      case 'studio':
        return (
          <div className="settings-section" style={{ borderBottom: 'none' }}>
            <SectionH3>Studio Identity</SectionH3>
            <StudioIdentityEditor />
          </div>
        );
      case 'data':
        return (
          <div className="settings-section" style={{ borderBottom: 'none' }}>
            <SectionH3>Data Management</SectionH3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn btn-small" onClick={handleExport} style={{ width: '100%' }} aria-label="Export save data">
                📥 Export Save Data
              </button>
              <button className="btn btn-small" onClick={() => importRef.current?.click()} style={{ width: '100%' }} aria-label="Import save data">
                📤 Import Save Data
              </button>
              <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
              {importMsg && <p style={{ color: importMsg.startsWith('✅') ? '#2ecc71' : '#e74c3c', fontSize: '0.8rem', textAlign: 'center' }}>{importMsg}</p>}

              <div style={{ borderTop: '1px solid #333', paddingTop: 12, marginTop: 4 }}>
                {!showResetConfirm ? (
                  <button className="btn btn-small" onClick={() => setShowResetConfirm(true)}
                    style={{ color: '#e74c3c', borderColor: '#e74c3c', width: '100%' }} aria-label="Reset all progress">
                    🗑️ Reset All Progress
                  </button>
                ) : (
                  <div style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                    <p style={{ color: '#e74c3c', fontSize: '0.85rem', marginBottom: 12 }}>
                      ⚠️ This will delete <strong>all</strong> save data, run history, achievements, and unlocks. This cannot be undone.
                    </p>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <button className="btn btn-small" onClick={handleResetProgress} style={{ color: '#e74c3c', borderColor: '#e74c3c' }}>Yes, Delete Everything</button>
                      <button className="btn btn-small" onClick={() => setShowResetConfirm(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'keyboard':
        return (
          <div className="settings-section" style={{ borderBottom: 'none' }}>
            <SectionH3>Keyboard Shortcuts</SectionH3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Tab / Shift+Tab', 'Navigate between elements'],
                ['Enter / Space', 'Activate buttons & cards'],
                ['Esc', 'Close modals & overlays'],
                ['← →', 'Navigate card selection'],
                ['↑ ↓', 'Scroll through options'],
                ['?', 'Show keyboard shortcuts'],
                ['M', 'Toggle mute'],
                ['S', 'Open settings'],
              ].map(([key, desc]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <kbd style={{
                    background: '#222', border: '1px solid #444', borderRadius: 4, padding: '3px 8px',
                    color: 'var(--gold)', fontFamily: 'monospace', fontSize: '0.75rem', minWidth: 110, textAlign: 'center', boxShadow: '0 2px 0 #333',
                  }}>{key}</kbd>
                  <span style={{ color: '#aaa', fontSize: '0.8rem' }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'credits':
        return (
          <div className="settings-section" style={{ borderBottom: 'none' }}>
            <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
              <p style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.2rem', marginBottom: 8 }}>GREENLIGHT</p>
              <p style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: 8 }}>A Movie Studio Roguelite</p>
              <p style={{ color: '#666', fontSize: '0.75rem', lineHeight: 1.6 }}>
                Built with React, TypeScript, and procedural Web Audio.<br />
                No external assets — all sounds are synthesized in real-time.<br />
                Fonts: Bebas Neue & Inter via Google Fonts.
              </p>
              <p style={{ color: '#555', fontSize: '0.7rem', marginTop: 12 }}>© 2026 · Made with 🎬 and ☕</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Settings" onKeyDown={handleKeyDown}>
      <div className="modal settings-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close settings">✕</button>
        <h2 style={{ color: 'var(--gold)', marginBottom: 12, flexShrink: 0 }}>⚙️ Settings</h2>

        {/* Tab bar */}
        <div className="settings-tab-bar" role="tablist" style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginBottom: 16, flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className="settings-tab-btn"
              style={{
                padding: '6px 10px', fontSize: '0.7rem', background: tab === t.id ? 'rgba(212,168,67,0.15)' : 'transparent',
                border: `1px solid ${tab === t.id ? 'var(--gold-dim)' : '#333'}`, borderRadius: 6, color: tab === t.id ? 'var(--gold)' : '#888',
                cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4,
              }}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {renderTab()}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
