/**
 * R279: Overhauled Settings Panel with collapsible sections.
 * Sections: Display, Accessibility, Gameplay, Audio, Data.
 * Re-exports as default for backward compatibility.
 */
import { useState, useRef, useEffect } from 'react';
import { trapFocus } from '../accessibility';
import { getA11ySettings, setA11ySettings, type ColorBlindMode, type FontScale, type CardPlaySpeed } from '../accessibility';
import { isMuted, setMuted, getVolume, setVolume, getSfxVolume, setSfxVolume, getMusicVolume, setMusicVolume } from '../sound';
import { getSettings, updateSettings, exportAllSaveData, importSaveData, resetAllProgress } from '../settings';
import { auditStorage, clearNonEssentialStorage } from '../storageManager';
import { resetTutorial } from '../tutorial';
import { resetTooltips } from './TutorialTooltip';
import { isCommentaryEnabled, setCommentaryEnabled } from '../commentary';

/* ── Toggle ──────────────────────────────────────────────────── */

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

/* ── Collapsible Section ─────────────────────────────────────── */

function Section({ title, icon, defaultOpen, children }: {
  title: string; icon: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div style={{ borderBottom: '1px solid #222' }}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 4px', background: 'transparent', border: 'none',
          color: open ? 'var(--gold)' : '#aaa', cursor: 'pointer', fontSize: '0.85rem',
          textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
        }}
      >
        <span>{icon}</span>
        <span style={{ flex: 1, textAlign: 'left' }}>{title}</span>
        <span style={{ fontSize: '0.7rem', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
      </button>
      {open && <div style={{ padding: '0 4px 16px' }}>{children}</div>}
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────── */

const Row = ({ children, dimmed }: { children: React.ReactNode; dimmed?: boolean }) => (
  <div className="settings-row" style={dimmed ? { opacity: 0.4 } : undefined}>{children}</div>
);

const Label = ({ htmlFor, children, sub }: { htmlFor?: string; children: React.ReactNode; sub?: string }) => (
  <div style={{ flex: 1 }}>
    <label htmlFor={htmlFor} style={{ color: '#aaa', fontSize: '0.85rem', display: 'block' }}>{children}</label>
    {sub && <span style={{ color: '#666', fontSize: '0.7rem' }}>{sub}</span>}
  </div>
);

const Slider = ({ id, value, onChange, disabled, label, min = 0, max = 1, step = 0.05 }: {
  id: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean; label: string; min?: number; max?: number; step?: number;
}) => (
  <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={onChange}
    disabled={disabled} aria-label={label} className="settings-slider" style={{ width: 120 }} />
);

/* ── Main Component ──────────────────────────────────────────── */

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Audio state
  const [muted, setMutedLocal] = useState(isMuted());
  const [volume, setVolumeLocal] = useState(getVolume());
  const [sfxVol, setSfxVolLocal] = useState(getSfxVolume());
  const [musicVol, setMusicVolLocal] = useState(getMusicVolume());

  // A11y state
  const [a11y, setA11yLocal] = useState(getA11ySettings());

  // Gameplay
  const settings = getSettings();
  const [autoSave, setAutoSave] = useState(settings.gameplay.autoSave);
  const [confirmActions, setConfirmActions] = useState(settings.gameplay.confirmEndTurn);
  const [tutorialHints, setTutorialHints] = useState(settings.gameplay.tutorialHints);
  const [showTooltips, setShowTooltips] = useState(settings.gameplay.showTooltips);
  const [commentary, setCommentary] = useState(() => isCommentaryEnabled());
  const [tutorialReset, setTutorialReset] = useState(false);

  // Data
  const [resetStep, setResetStep] = useState(0); // 0=none, 1=first confirm, 2=second confirm, 3=final
  const [importMsg, setImportMsg] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    if (modalRef.current) return trapFocus(modalRef.current);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
  };

  // A11y helpers
  const updateA11y = (patch: Partial<typeof a11y>) => {
    const next = setA11ySettings(patch);
    setA11yLocal({ ...next });
  };

  // Audio handlers
  const handleMuteToggle = () => {
    const next = !muted; setMuted(next); setMutedLocal(next);
    updateSettings({ audio: { ...getSettings().audio, muteAll: next } });
  };
  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value); setVolume(v); setVolumeLocal(v);
    updateSettings({ audio: { ...getSettings().audio, masterVolume: Math.round(v * 100) } });
  };
  const handleSfxVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value); setSfxVolume(v); setSfxVolLocal(v);
    updateSettings({ audio: { ...getSettings().audio, sfxVolume: Math.round(v * 100) } });
  };
  const handleMusicVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value); setMusicVolume(v); setMusicVolLocal(v);
    updateSettings({ audio: { ...getSettings().audio, musicVolume: Math.round(v * 100) } });
  };

  // Gameplay handlers
  const handleAutoSave = (v: boolean) => { setAutoSave(v); updateSettings({ gameplay: { ...getSettings().gameplay, autoSave: v } }); };
  const handleConfirm = (v: boolean) => { setConfirmActions(v); updateSettings({ gameplay: { ...getSettings().gameplay, confirmEndTurn: v } }); };
  const handleTutorial = (v: boolean) => { setTutorialHints(v); updateSettings({ gameplay: { ...getSettings().gameplay, tutorialHints: v } }); };
  const handleTooltips = (v: boolean) => { setShowTooltips(v); updateSettings({ gameplay: { ...getSettings().gameplay, showTooltips: v } }); };
  const handleCommentary = (v: boolean) => { setCommentary(v); setCommentaryEnabled(v); };

  // Data handlers
  const handleExport = () => {
    const json = exportAllSaveData();
    const blob = new Blob([json], { type: 'application/json' });
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
      const result = importSaveData(reader.result as string);
      setImportMsg(result.success ? `✅ Imported ${result.count} entries. Reload to apply.` : `❌ ${result.error || 'Invalid file.'}`);
    };
    reader.readAsText(file);
  };

  const handleResetProgress = () => {
    if (resetStep < 3) { setResetStep(resetStep + 1); return; }
    resetAllProgress();
    window.location.reload();
  };

  const handleClearCache = () => {
    clearNonEssentialStorage();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  };

  const audit = auditStorage();
  const usedKB = (audit.totalBytes / 1024).toFixed(1);

  const FONT_SCALES: { value: FontScale; label: string }[] = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
    { value: 'xl', label: 'XL' },
  ];

  const SPEEDS: { value: CardPlaySpeed; label: string }[] = [
    { value: 'fast', label: 'Fast' },
    { value: 'normal', label: 'Normal' },
    { value: 'slow', label: 'Slow' },
  ];

  const resetLabels = ['🗑️ Reset All Progress', '⚠️ Are you sure?', '⚠️ Really delete everything?', '💀 Final confirmation — DELETE ALL'];

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Settings" onKeyDown={handleKeyDown}>
      <div ref={modalRef} className="modal settings-modal" onClick={e => e.stopPropagation()}
        style={{ maxWidth: 520, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close settings">✕</button>
        <h2 style={{ color: 'var(--gold)', marginBottom: 12, flexShrink: 0 }}>⚙️ Settings</h2>

        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>

          {/* ── DISPLAY ── */}
          <Section title="Display" icon="🖥️" defaultOpen>
            <Row>
              <Label sub="Adjust base font size">Font Size</Label>
              <div style={{ display: 'flex', gap: 4 }}>
                {FONT_SCALES.map(s => (
                  <button key={s.value} className="btn btn-small" onClick={() => updateA11y({ fontScale: s.value })}
                    style={{
                      padding: '4px 10px', fontSize: '0.75rem',
                      color: a11y.fontScale === s.value ? 'var(--gold)' : '#666',
                      borderColor: a11y.fontScale === s.value ? 'var(--gold-dim)' : '#333',
                    }}
                    aria-pressed={a11y.fontScale === s.value}>{s.label}</button>
                ))}
              </div>
            </Row>
            <Row>
              <Label htmlFor="animations-toggle" sub="Enable/disable all animations">Animations</Label>
              <Toggle id="animations-toggle" checked={a11y.animations} onChange={v => updateA11y({ animations: v })} label="Animations" />
            </Row>
            <Row>
              <Label htmlFor="screen-shake-toggle" sub="Camera shake on impacts">Screen Shake</Label>
              <Toggle id="screen-shake-toggle" checked={a11y.screenShake} onChange={v => updateA11y({ screenShake: v })} label="Screen shake" />
            </Row>
          </Section>

          {/* ── ACCESSIBILITY ── */}
          <Section title="Accessibility" icon="♿">
            <Row>
              <Label htmlFor="high-contrast-toggle" sub="Boosted colors, thicker borders, no transparency">High Contrast</Label>
              <Toggle id="high-contrast-toggle" checked={a11y.highContrast} onChange={v => updateA11y({ highContrast: v })} label="High contrast" />
            </Row>
            <Row>
              <Label htmlFor="colorblind-select" sub="CSS filter-based + semantic color alternatives">Color Blind Mode</Label>
              <select
                id="colorblind-select"
                value={a11y.colorBlindMode}
                onChange={e => updateA11y({ colorBlindMode: e.target.value as ColorBlindMode })}
                aria-label="Color blind mode"
                style={{ background: '#1a1a1a', color: '#ccc', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                <option value="off">Off</option>
                <option value="protanopia">Protanopia (Red-weak)</option>
                <option value="deuteranopia">Deuteranopia (Green-weak)</option>
                <option value="tritanopia">Tritanopia (Blue-weak)</option>
              </select>
            </Row>
            <Row>
              <Label htmlFor="reduced-motion-toggle" sub="Minimize animations (also detects system preference)">Reduced Motion</Label>
              <Toggle id="reduced-motion-toggle" checked={a11y.reducedMotion} onChange={v => updateA11y({ reducedMotion: v })} label="Reduced motion" />
            </Row>
            <Row>
              <Label htmlFor="sr-mode-toggle" sub="Extra context for screen reader users">Screen Reader Mode</Label>
              <Toggle id="sr-mode-toggle" checked={a11y.screenReaderMode} onChange={v => updateA11y({ screenReaderMode: v })} label="Screen reader mode" />
            </Row>
            <Row>
              <Label htmlFor="large-text-toggle" sub="1.25x font scale override">Large Text</Label>
              <Toggle id="large-text-toggle" checked={a11y.largeText} onChange={v => updateA11y({ largeText: v })} label="Large text" />
            </Row>
            <Row>
              <Label htmlFor="focus-indicators-toggle" sub="Visible focus outlines for keyboard navigation">Focus Indicators</Label>
              <Toggle id="focus-indicators-toggle" checked={a11y.focusIndicators} onChange={v => updateA11y({ focusIndicators: v })} label="Focus indicators" />
            </Row>
          </Section>

          {/* ── GAMEPLAY ── */}
          <Section title="Gameplay" icon="🎮">
            <Row>
              <Label htmlFor="tutorial-hints-toggle" sub="Show contextual tips for new mechanics">Tutorial Hints</Label>
              <Toggle id="tutorial-hints-toggle" checked={tutorialHints} onChange={handleTutorial} label="Tutorial hints" />
            </Row>
            <Row>
              <Label htmlFor="auto-save-toggle" sub="Automatically save progress each phase">Auto-Save</Label>
              <Toggle id="auto-save-toggle" checked={autoSave} onChange={handleAutoSave} label="Auto-save" />
            </Row>
            <Row>
              <Label htmlFor="confirm-actions-toggle" sub="Ask before ending turn or confirming major actions">Confirm Actions</Label>
              <Toggle id="confirm-actions-toggle" checked={confirmActions} onChange={handleConfirm} label="Confirm actions" />
            </Row>
            <Row>
              <Label htmlFor="tooltips-toggle" sub="Show helpful hints on hover">Show Tooltips</Label>
              <Toggle id="tooltips-toggle" checked={showTooltips} onChange={handleTooltips} label="Show tooltips" />
            </Row>
            <Row>
              <Label htmlFor="commentary-toggle" sub="Flavor text and industry insights during gameplay">Director's Commentary</Label>
              <Toggle id="commentary-toggle" checked={commentary} onChange={handleCommentary} label="Director's Commentary" />
            </Row>
            <Row>
              <Label sub="Speed of card animations during play">Card Play Speed</Label>
              <div style={{ display: 'flex', gap: 4 }}>
                {SPEEDS.map(s => (
                  <button key={s.value} className="btn btn-small" onClick={() => updateA11y({ cardPlaySpeed: s.value })}
                    style={{
                      padding: '4px 10px', fontSize: '0.75rem',
                      color: a11y.cardPlaySpeed === s.value ? 'var(--gold)' : '#666',
                      borderColor: a11y.cardPlaySpeed === s.value ? 'var(--gold-dim)' : '#333',
                    }}
                    aria-pressed={a11y.cardPlaySpeed === s.value}>{s.label}</button>
                ))}
              </div>
            </Row>
            <div style={{ borderTop: '1px solid #333', paddingTop: 12, marginTop: 8 }}>
              <button className="btn btn-small" onClick={() => {
                resetTutorial(); resetTooltips(); setTutorialReset(true);
                setTimeout(() => setTutorialReset(false), 2000);
              }} style={{
                width: '100%', color: tutorialReset ? '#2ecc71' : 'var(--gold)',
                borderColor: tutorialReset ? '#2ecc71' : 'var(--gold-dim)',
              }}>
                {tutorialReset ? '✅ Tutorial will replay next game!' : '🎓 Replay Tutorial'}
              </button>
            </div>
          </Section>

          {/* ── AUDIO ── */}
          <Section title="Audio" icon="🔊">
            <Row>
              <Label htmlFor="mute-toggle">Mute All</Label>
              <Toggle id="mute-toggle" checked={muted} onChange={() => handleMuteToggle()} label={muted ? 'Sound off' : 'Sound on'} />
            </Row>
            <Row dimmed={muted}>
              <Label htmlFor="master-vol">Master Volume <span style={{ color: '#666', fontSize: '0.75rem' }}>{Math.round(volume * 100)}%</span></Label>
              <Slider id="master-vol" value={volume} onChange={handleVolume} disabled={muted} label={`Master volume: ${Math.round(volume * 100)}%`} />
            </Row>
            <Row dimmed={muted}>
              <Label htmlFor="sfx-vol">SFX Volume <span style={{ color: '#666', fontSize: '0.75rem' }}>{Math.round(sfxVol * 100)}%</span></Label>
              <Slider id="sfx-vol" value={sfxVol} onChange={handleSfxVolume} disabled={muted} label={`SFX volume: ${Math.round(sfxVol * 100)}%`} />
            </Row>
            <Row dimmed={muted}>
              <Label htmlFor="music-vol">Music Volume <span style={{ color: '#666', fontSize: '0.75rem' }}>{Math.round(musicVol * 100)}%</span></Label>
              <Slider id="music-vol" value={musicVol} onChange={handleMusicVolume} disabled={muted} label={`Music volume: ${Math.round(musicVol * 100)}%`} />
            </Row>
          </Section>

          {/* ── DATA ── */}
          <Section title="Data" icon="💾">
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #333', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#aaa', fontSize: '0.75rem' }}>💾 Storage Usage</span>
                <span style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{usedKB} KB</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn btn-small" onClick={handleExport} style={{ width: '100%' }}>📥 Export All Data (JSON)</button>
              <button className="btn btn-small" onClick={() => importRef.current?.click()} style={{ width: '100%' }}>📤 Import Data</button>
              <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
              {importMsg && <p style={{ color: importMsg.startsWith('✅') ? '#2ecc71' : '#e74c3c', fontSize: '0.8rem', textAlign: 'center' }}>{importMsg}</p>}

              <button className="btn btn-small" onClick={handleClearCache}
                style={{ width: '100%', color: cacheCleared ? '#2ecc71' : '#e67e22', borderColor: cacheCleared ? '#2ecc71' : '#e67e22' }}>
                {cacheCleared ? '✅ Cache cleared!' : '🧹 Clear Cache'}
              </button>

              <div style={{ borderTop: '1px solid #333', paddingTop: 12, marginTop: 4 }}>
                {resetStep === 0 ? (
                  <button className="btn btn-small" onClick={handleResetProgress}
                    style={{ color: '#e74c3c', borderColor: '#e74c3c', width: '100%' }}>
                    {resetLabels[0]}
                  </button>
                ) : (
                  <div style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                    <p style={{ color: '#e74c3c', fontSize: '0.85rem', marginBottom: 12 }}>
                      {resetStep === 1 && '⚠️ This will delete ALL save data, achievements, and unlocks.'}
                      {resetStep === 2 && '⚠️ Are you absolutely sure? This cannot be undone!'}
                      {resetStep >= 3 && '💀 Last chance. Click to permanently delete everything.'}
                    </p>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <button className="btn btn-small" onClick={handleResetProgress}
                        style={{ color: '#e74c3c', borderColor: '#e74c3c' }}>
                        {resetLabels[Math.min(resetStep, 3)]}
                      </button>
                      <button className="btn btn-small" onClick={() => setResetStep(0)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;
