// ─── MOD MANAGER UI ───
// R205: Import/export mod packs, toggle on/off, view details, share

import { useState, useRef } from 'react';
import {
  getAllModPacks, importModPack, removeModPack, toggleModPack,
  exportModPack, modToShareURL, type ModPack, getModStats,
} from '../modding';
import { getAllCustomCards, type CustomCard } from '../customCards';
import { customCardsToModPack } from '../modding';
import { sfx } from '../sound';

/* ── tiny helpers ─────────────────────────────── */

const Badge = ({ children, color = '#888' }: { children: React.ReactNode; color?: string }) => (
  <span style={{ background: color, color: '#fff', padding: '1px 6px', borderRadius: 8, fontSize: '0.65rem', marginLeft: 4 }}>{children}</span>
);

const cardCount = (m: ModPack) => {
  const s = m.cards.filter(c => c.type === 'script').length;
  const t = m.cards.filter(c => c.type === 'talent').length;
  const e = m.cards.filter(c => c.type === 'event').length;
  const parts: string[] = [];
  if (s) parts.push(`${s} script${s > 1 ? 's' : ''}`);
  if (t) parts.push(`${t} talent`);
  if (e) parts.push(`${e} event${e > 1 ? 's' : ''}`);
  if (m.genres.length) parts.push(`${m.genres.length} genre${m.genres.length > 1 ? 's' : ''}`);
  if (m.events.length) parts.push(`${m.events.length} mod event${m.events.length > 1 ? 's' : ''}`);
  return parts.join(', ') || 'empty';
};

/* ── Export as Mod Pack dialog ─────────────────── */

function ExportAsModDialog({ onClose, onExport }: { onClose: () => void; onExport: (name: string, author: string, desc: string) => void }) {
  const [name, setName] = useState('My Mod Pack');
  const [author, setAuthor] = useState('');
  const [desc, setDesc] = useState('');

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #444', borderRadius: 8, padding: 16, marginTop: 8 }}>
      <h4 style={{ color: 'var(--gold)', margin: '0 0 8px' }}>📦 Export Custom Cards as Mod Pack</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Mod name" maxLength={50}
          style={{ background: '#222', border: '1px solid #444', borderRadius: 4, padding: '4px 8px', color: '#eee', fontSize: '0.8rem' }} />
        <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author name" maxLength={40}
          style={{ background: '#222', border: '1px solid #444', borderRadius: 4, padding: '4px 8px', color: '#eee', fontSize: '0.8rem' }} />
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" maxLength={200}
          style={{ background: '#222', border: '1px solid #444', borderRadius: 4, padding: '4px 8px', color: '#eee', fontSize: '0.8rem' }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={() => { if (name.trim() && author.trim()) onExport(name.trim(), author.trim(), desc.trim()); }}
          style={{ background: 'var(--gold-dim)', color: '#000', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: '0.75rem' }}>
          Export
        </button>
        <button onClick={onClose}
          style={{ background: '#333', color: '#aaa', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: '0.75rem' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Mod Detail Card ──────────────────────────── */

function ModCard({ mod, onRefresh }: { mod: ModPack; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleToggle = () => { toggleModPack(mod.id); sfx.modToggleClick(); onRefresh(); };
  const handleRemove = () => { if (confirm(`Remove "${mod.name}"?`)) { removeModPack(mod.id); onRefresh(); } };
  const handleExportJSON = () => {
    const json = exportModPack(mod.id);
    if (!json) return;
    sfx.modExportChime();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${mod.name.replace(/\s+/g, '_')}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const handleShare = () => {
    const url = modToShareURL(mod);
    setShareUrl(url);
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div style={{
      background: mod.enabled ? 'rgba(212,168,67,0.08)' : '#1a1a1a',
      border: `1px solid ${mod.enabled ? 'var(--gold-dim)' : '#333'}`,
      borderRadius: 8, padding: 12, marginBottom: 8,
    }}>
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
            by {mod.author} • {cardCount(mod)}
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

          {/* Card breakdown */}
          {mod.cards.length > 0 && (
            <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: 8 }}>
              <strong style={{ color: '#aaa' }}>Cards:</strong>{' '}
              {mod.cards.slice(0, 10).map(c => c.name).join(', ')}
              {mod.cards.length > 10 && ` +${mod.cards.length - 10} more`}
            </div>
          )}

          {mod.genres.length > 0 && (
            <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: 8 }}>
              <strong style={{ color: '#aaa' }}>Genres:</strong>{' '}
              {mod.genres.map(g => `${g.icon} ${g.name}`).join(', ')}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={handleExportJSON}
              style={{ background: '#333', border: 'none', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', color: '#aaa', fontSize: '0.7rem' }}>
              💾 Export JSON
            </button>
            <button onClick={handleShare}
              style={{ background: '#333', border: 'none', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', color: '#aaa', fontSize: '0.7rem' }}>
              🔗 {copied ? 'Copied!' : 'Share URL'}
            </button>
            <button onClick={handleRemove}
              style={{ background: 'rgba(204,68,68,0.15)', border: 'none', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', color: '#c66', fontSize: '0.7rem' }}>
              🗑 Remove
            </button>
          </div>

          {shareUrl && (
            <div style={{ marginTop: 6, padding: 6, background: '#111', borderRadius: 4, fontSize: '0.65rem', color: '#888', wordBreak: 'break-all' }}>
              {shareUrl.length > 2000 ? '⚠️ URL is very long — consider sharing the JSON file instead' : shareUrl}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main ModManager component ────────────────── */

export default function ModManager() {
  const [mods, setMods] = useState(getAllModPacks);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => setMods(getAllModPacks());

  const handleImportJSON = () => {
    if (!importText.trim()) return;
    const result = importModPack(importText.trim());
    if (result.mod) {
      sfx.modImportSuccess();
      setImportResult({ ok: true, msg: `Imported "${result.mod.name}" (${cardCount(result.mod)})${result.warnings.length ? ` ⚠ ${result.warnings.join(', ')}` : ''}` });
      setImportText('');
      refresh();
    } else {
      setImportResult({ ok: false, msg: result.errors.join(', ') });
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const result = importModPack(text);
      if (result.mod) {
        sfx.modImportSuccess();
        setImportResult({ ok: true, msg: `Imported "${result.mod.name}" from file` });
        refresh();
      } else {
        setImportResult({ ok: false, msg: result.errors.join(', ') });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportCustomCards = (name: string, author: string, desc: string) => {
    const cards = getAllCustomCards();
    if (cards.length === 0) {
      setImportResult({ ok: false, msg: 'No custom cards to export' });
      setShowExportDialog(false);
      return;
    }
    const mod = customCardsToModPack(cards, name, author, desc);
    const json = JSON.stringify(mod, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${name.replace(/\s+/g, '_')}.json`; a.click();
    URL.revokeObjectURL(url);
    sfx.modExportChime();
    setShowExportDialog(false);
    setImportResult({ ok: true, msg: `Exported ${cards.length} custom cards as "${name}"` });
  };

  const stats = getModStats();

  return (
    <div>
      <h3 style={{ color: '#ccc', fontSize: '0.85rem', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        🧩 Mod Packs
      </h3>

      {/* Stats bar */}
      {stats.totalMods > 0 && (
        <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: 12, padding: '6px 10px', background: '#1a1a1a', borderRadius: 6 }}>
          {stats.totalMods} mod{stats.totalMods !== 1 ? 's' : ''} installed
          {stats.enabledMods > 0 && <> • <span style={{ color: '#6c6' }}>{stats.enabledMods} active</span> ({stats.totalCards} cards, {stats.totalEvents} events)</>}
        </div>
      )}

      {/* Mod list */}
      {mods.length === 0 ? (
        <div style={{ color: '#666', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>
          No mods installed. Import a mod pack below or export your custom cards as a mod.
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          {mods.map(m => <ModCard key={m.id} mod={m} onRefresh={refresh} />)}
        </div>
      )}

      {/* Import section */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #333' }}>
        <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: 6, fontWeight: 600 }}>Import Mod Pack</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <button onClick={() => fileRef.current?.click()}
            style={{ background: '#333', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', color: '#aaa', fontSize: '0.75rem' }}>
            📁 From File
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleFileImport} style={{ display: 'none' }} />
          <button onClick={() => setShowExportDialog(!showExportDialog)}
            style={{ background: '#333', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', color: '#aaa', fontSize: '0.75rem' }}>
            📦 Export Cards as Mod
          </button>
        </div>

        {/* Paste JSON */}
        <textarea
          value={importText}
          onChange={e => setImportText(e.target.value)}
          placeholder='Paste mod pack JSON here...'
          rows={3}
          style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 4, padding: 8, color: '#ccc', fontSize: '0.7rem', resize: 'vertical', fontFamily: 'monospace', boxSizing: 'border-box' }}
        />
        <button onClick={handleImportJSON} disabled={!importText.trim()}
          style={{ background: importText.trim() ? 'var(--gold-dim)' : '#333', color: importText.trim() ? '#000' : '#666', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: importText.trim() ? 'pointer' : 'default', fontSize: '0.75rem', marginTop: 4 }}>
          Import
        </button>

        {showExportDialog && <ExportAsModDialog onClose={() => setShowExportDialog(false)} onExport={handleExportCustomCards} />}

        {importResult && (
          <div style={{ marginTop: 6, padding: '4px 8px', borderRadius: 4, fontSize: '0.7rem', background: importResult.ok ? 'rgba(102,204,102,0.1)' : 'rgba(204,68,68,0.1)', color: importResult.ok ? '#6c6' : '#c66' }}>
            {importResult.msg}
          </div>
        )}
      </div>
    </div>
  );
}
