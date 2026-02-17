// ─── MOD MANAGER UI ───
// R275: Mod management with glm_ import, conflict warnings, toggle switches

import { useState } from 'react';
import {
  getAllMods, importMod, removeMod, toggleMod, encodeMod,
  detectConflicts, getModContentSummary,
  type GameMod, type ModConflict,
} from '../modSystem';
import { sfx } from '../sound';

/* ── helpers ─────────────────────────────── */

const Badge = ({ children, color = '#888' }: { children: React.ReactNode; color?: string }) => (
  <span style={{ background: color, color: '#fff', padding: '1px 6px', borderRadius: 8, fontSize: '0.65rem', marginLeft: 4 }}>{children}</span>
);

/* ── Mod Detail Card ──────────────────────── */

function ModCard({ mod, conflicts, onRefresh }: { mod: GameMod; conflicts: ModConflict[]; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const myConflicts = conflicts.filter(c => c.modA === mod.name || c.modB === mod.name);

  const handleToggle = () => {
    const result = toggleMod(mod.id);
    if (result.success) {
      sfx.modToggleClick();
      onRefresh();
    } else {
      alert(result.error);
    }
  };

  const handleRemove = () => {
    if (confirm(`Remove "${mod.name}"? This cannot be undone.`)) {
      removeMod(mod.id);
      onRefresh();
    }
  };

  const handleShare = () => {
    const code = encodeMod(mod);
    navigator.clipboard.writeText(code).then(() => {
      sfx.modExportChime();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      background: mod.enabled ? 'rgba(212,168,67,0.08)' : '#1a1a1a',
      border: `1px solid ${mod.enabled ? 'var(--gold-dim)' : '#333'}`,
      borderRadius: 8, padding: 12, marginBottom: 8,
      position: 'relative',
    }}>
      {/* Conflict warning banner */}
      {mod.enabled && myConflicts.length > 0 && (
        <div style={{ background: 'rgba(204,68,68,0.15)', border: '1px solid rgba(204,68,68,0.3)', borderRadius: 4, padding: '4px 8px', marginBottom: 8, fontSize: '0.7rem', color: '#e74c3c' }}>
          ⚠️ Conflicts: {myConflicts.map(c => `${c.itemName} (${c.type})`).join(', ')}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: mod.enabled ? 'var(--gold)' : '#ccc' }}>
              {mod.name}
            </span>
            <Badge color="#555">v{mod.version}</Badge>
            {mod.enabled && <Badge color="rgba(102,204,102,0.8)">Active</Badge>}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#888', marginTop: 2 }}>
            by {mod.author} • {getModContentSummary(mod)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={handleToggle} title={mod.enabled ? 'Disable' : 'Enable'}
            style={{ background: mod.enabled ? 'rgba(102,204,102,0.2)' : '#333', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', color: mod.enabled ? '#6c6' : '#888', fontSize: '0.7rem' }}>
            {mod.enabled ? '✓ On' : 'Off'}
          </button>
          <button onClick={() => setExpanded(!expanded)} title="Details"
            style={{ background: '#333', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', color: '#888', fontSize: '0.7rem' }}>
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #333' }}>
          {mod.description && <p style={{ color: '#aaa', fontSize: '0.75rem', margin: '0 0 8px' }}>{mod.description}</p>}

          {/* Content breakdown */}
          {mod.content.cards.length > 0 && (
            <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: 4 }}>
              <strong style={{ color: '#aaa' }}>Cards:</strong>{' '}
              {mod.content.cards.slice(0, 8).map(c => `${c.name} (${c.role})`).join(', ')}
              {mod.content.cards.length > 8 && ` +${mod.content.cards.length - 8} more`}
            </div>
          )}

          {mod.content.events.length > 0 && (
            <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: 4 }}>
              <strong style={{ color: '#aaa' }}>Events:</strong>{' '}
              {mod.content.events.map(e => e.title).join(', ')}
            </div>
          )}

          {mod.content.genres.length > 0 && (
            <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: 4 }}>
              <strong style={{ color: '#aaa' }}>Genres:</strong>{' '}
              {mod.content.genres.map(g => `${g.icon} ${g.name}`).join(', ')}
            </div>
          )}

          {mod.content.modifiers.length > 0 && (
            <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: 4 }}>
              <strong style={{ color: '#aaa' }}>Modifiers:</strong>{' '}
              {mod.content.modifiers.map(m => m.name).join(', ')}
            </div>
          )}

          <div style={{ fontSize: '0.65rem', color: '#666', marginTop: 4, marginBottom: 8 }}>
            Created {new Date(mod.createdAt).toLocaleDateString()}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={handleShare}
              style={{ background: '#333', border: 'none', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', color: '#aaa', fontSize: '0.7rem' }}>
              📋 {copied ? 'Copied!' : 'Share Mod'}
            </button>
            <button onClick={handleRemove}
              style={{ background: 'rgba(204,68,68,0.15)', border: 'none', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', color: '#c66', fontSize: '0.7rem' }}>
              🗑 Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main ModManager component ────────────── */

export default function ModManager({ onCreateMod }: { onCreateMod?: () => void }) {
  const [mods, setMods] = useState(getAllMods);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const refresh = () => setMods(getAllMods());
  const conflicts = detectConflicts(mods);
  const activeCount = mods.filter(m => m.enabled).length;

  const handleImport = () => {
    const code = importText.trim();
    if (!code) return;
    const result = importMod(code);
    if (result.mod) {
      sfx.modImportSuccess();
      setImportResult({ ok: true, msg: `Imported "${result.mod.name}" (${getModContentSummary(result.mod)})${result.warnings.length ? ` ⚠ ${result.warnings.join(', ')}` : ''}` });
      setImportText('');
      refresh();
    } else {
      setImportResult({ ok: false, msg: result.errors.join(', ') });
    }
  };

  return (
    <div>
      <h3 style={{ color: '#ccc', fontSize: '0.85rem', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        🔧 Mod Manager
      </h3>

      {/* Stats bar */}
      <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: 12, padding: '6px 10px', background: '#1a1a1a', borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
        <span>{mods.length} mod{mods.length !== 1 ? 's' : ''} installed</span>
        <span style={{ color: activeCount > 0 ? '#6c6' : '#666' }}>{activeCount}/5 active</span>
      </div>

      {/* Conflict warnings */}
      {conflicts.length > 0 && (
        <div style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: '0.7rem', color: '#e74c3c' }}>
          ⚠️ <strong>{conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} detected</strong> between active mods.
          Conflicting items may behave unpredictably.
        </div>
      )}

      {/* Mod list */}
      {mods.length === 0 ? (
        <div style={{ color: '#666', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>
          No mods installed. Import a mod code below or create one.
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          {mods.map(m => <ModCard key={m.id} mod={m} conflicts={conflicts} onRefresh={refresh} />)}
        </div>
      )}

      {/* Import section */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #333' }}>
        <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: 6, fontWeight: 600 }}>Import Mod</div>
        <textarea
          value={importText}
          onChange={e => setImportText(e.target.value)}
          placeholder='Paste glm_ mod code here...'
          rows={3}
          style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 4, padding: 8, color: '#ccc', fontSize: '0.7rem', resize: 'vertical', fontFamily: 'monospace', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={handleImport} disabled={!importText.trim()}
            style={{ background: importText.trim() ? 'var(--gold-dim)' : '#333', color: importText.trim() ? '#000' : '#666', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: importText.trim() ? 'pointer' : 'default', fontSize: '0.75rem' }}>
            Import
          </button>
          {onCreateMod && (
            <button onClick={onCreateMod}
              style={{ background: '#333', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', color: '#aaa', fontSize: '0.75rem' }}>
              ✨ Create New Mod
            </button>
          )}
        </div>

        {importResult && (
          <div style={{ marginTop: 6, padding: '4px 8px', borderRadius: 4, fontSize: '0.7rem', background: importResult.ok ? 'rgba(102,204,102,0.1)' : 'rgba(204,68,68,0.1)', color: importResult.ok ? '#6c6' : '#c66' }}>
            {importResult.msg}
          </div>
        )}
      </div>
    </div>
  );
}
