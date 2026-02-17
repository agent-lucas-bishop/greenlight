/**
 * R255: Save Slots Panel
 * Shows 3 manual save slots + 1 auto-save slot with metadata.
 */

import { useState } from 'react';
import { listSlots, getAutoSaveMeta, saveToSlot, loadFromSlot, loadAutoSave, deleteSlot, type SaveSlotMeta } from '../saveSlots';
import { resumeGame } from '../gameStore';
import { STUDIO_ARCHETYPES } from '../data';
import { DIFFICULTIES } from '../difficulty';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function getArchetypeEmoji(archetype: string | null): string {
  if (!archetype) return '🎬';
  return STUDIO_ARCHETYPES.find(a => a.id === archetype)?.emoji || '🎬';
}

function getDifficultyBadge(diff: string): { emoji: string; color: string } {
  const d = DIFFICULTIES.find(dd => dd.id === diff);
  return d ? { emoji: d.emoji, color: d.color } : { emoji: '🟡', color: '#f1c40f' };
}

function SlotCard({ meta, slotLabel, isAutoSave, onLoad, onSave, onDelete, canSave }: {
  meta: SaveSlotMeta | null;
  slotLabel: string;
  isAutoSave?: boolean;
  onLoad: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  canSave: boolean;
}) {
  const [confirmAction, setConfirmAction] = useState<'save' | 'delete' | 'load' | null>(null);

  const handleConfirm = () => {
    if (confirmAction === 'save' && onSave) onSave();
    else if (confirmAction === 'delete' && onDelete) onDelete();
    else if (confirmAction === 'load') onLoad();
    setConfirmAction(null);
  };

  if (!meta) {
    // Empty slot
    return (
      <div style={{
        padding: '16px 20px', background: 'rgba(255,255,255,0.02)',
        border: '1px dashed #333', borderRadius: 10, marginBottom: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#555', fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.05em' }}>
              {slotLabel}
            </div>
            <div style={{ color: '#444', fontSize: '0.75rem', marginTop: 2 }}>Empty Slot</div>
          </div>
          {canSave && !isAutoSave && (
            <button
              className="btn btn-small"
              onClick={() => onSave?.()}
              style={{ color: '#2ecc71', borderColor: 'rgba(46,204,113,0.3)', fontSize: '0.75rem', padding: '6px 14px' }}
            >
              💾 Save
            </button>
          )}
        </div>
      </div>
    );
  }

  const diff = getDifficultyBadge(meta.difficulty);

  return (
    <div style={{
      padding: '16px 20px', background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${isAutoSave ? 'rgba(52,152,219,0.3)' : 'rgba(212,168,67,0.2)'}`,
      borderRadius: 10, marginBottom: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: '1rem' }}>{getArchetypeEmoji(meta.archetype)}</span>
            <span style={{ color: isAutoSave ? '#3498db' : 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.05em' }}>
              {slotLabel}
            </span>
            {isAutoSave && <span style={{ fontSize: '0.6rem', color: '#3498db', background: 'rgba(52,152,219,0.15)', padding: '1px 6px', borderRadius: 3 }}>AUTO</span>}
          </div>
          {meta.studioName && (
            <div style={{ color: 'var(--gold)', fontSize: '0.75rem', opacity: 0.8 }}>{meta.studioName}</div>
          )}
        </div>
        <div style={{ color: '#666', fontSize: '0.65rem', textAlign: 'right' }}>
          {formatDate(meta.savedAt)}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: '0.7rem', color: '#ccc', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>
          🎬 Season {meta.season}/{meta.maxSeasons}
        </span>
        <span style={{ fontSize: '0.7rem', color: '#ccc', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>
          💰 ${meta.score.toFixed(1)}M
        </span>
        <span style={{ fontSize: '0.7rem', color: '#ccc', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>
          ⭐ {'★'.repeat(meta.reputation)}{'☆'.repeat(Math.max(0, 5 - meta.reputation))}
        </span>
        <span style={{ fontSize: '0.7rem', color: diff.color, background: `${diff.color}15`, padding: '2px 8px', borderRadius: 4 }}>
          {diff.emoji} {meta.difficulty}
        </span>
        {meta.strikes > 0 && (
          <span style={{ fontSize: '0.7rem', color: '#e74c3c', background: 'rgba(231,76,60,0.1)', padding: '2px 8px', borderRadius: 4 }}>
            ✕{meta.strikes} strikes
          </span>
        )}
      </div>

      {/* Thumbnail */}
      <div style={{ color: '#777', fontSize: '0.7rem', marginBottom: 10, fontStyle: 'italic' }}>
        {meta.thumbnail}
      </div>

      {/* Confirmation dialog */}
      {confirmAction && (
        <div style={{
          background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)',
          borderRadius: 6, padding: '10px 14px', marginBottom: 8, textAlign: 'center',
        }}>
          <div style={{ color: '#e74c3c', fontSize: '0.8rem', marginBottom: 8 }}>
            {confirmAction === 'save' && '⚠️ Overwrite this save?'}
            {confirmAction === 'delete' && '🗑️ Delete this save permanently?'}
            {confirmAction === 'load' && '📂 Load this save? Current progress will be lost.'}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn btn-small" onClick={handleConfirm}
              style={{ color: confirmAction === 'delete' ? '#e74c3c' : '#2ecc71', borderColor: confirmAction === 'delete' ? 'rgba(231,76,60,0.3)' : 'rgba(46,204,113,0.3)', fontSize: '0.7rem', padding: '4px 12px' }}>
              Confirm
            </button>
            <button className="btn btn-small" onClick={() => setConfirmAction(null)}
              style={{ color: '#999', borderColor: '#333', fontSize: '0.7rem', padding: '4px 12px' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!confirmAction && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-small" onClick={() => setConfirmAction('load')}
            style={{ color: '#3498db', borderColor: 'rgba(52,152,219,0.3)', fontSize: '0.7rem', padding: '5px 12px' }}>
            📂 Load
          </button>
          {canSave && !isAutoSave && (
            <button className="btn btn-small" onClick={() => setConfirmAction('save')}
              style={{ color: '#2ecc71', borderColor: 'rgba(46,204,113,0.3)', fontSize: '0.7rem', padding: '5px 12px' }}>
              💾 Save
            </button>
          )}
          {!isAutoSave && (
            <button className="btn btn-small" onClick={() => setConfirmAction('delete')}
              style={{ color: '#e74c3c', borderColor: 'rgba(231,76,60,0.3)', fontSize: '0.7rem', padding: '5px 12px' }}>
              🗑️ Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function SaveSlotsPanel({ onClose, canSave = false }: { onClose: () => void; canSave?: boolean }) {
  const [slots, setSlots] = useState(() => listSlots());
  const [autoMeta, setAutoMeta] = useState(() => getAutoSaveMeta());
  const [toast, setToast] = useState<string | null>(null);

  const refresh = () => {
    setSlots(listSlots());
    setAutoMeta(getAutoSaveMeta());
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleSave = (index: number) => {
    const ok = saveToSlot(index);
    if (ok) { showToast(`Saved to Slot ${index + 1}!`); refresh(); }
    else showToast('Save failed');
  };

  const handleLoad = (index: number) => {
    const data = loadFromSlot(index);
    if (data) { resumeGame(data); onClose(); }
  };

  const handleLoadAuto = () => {
    const data = loadAutoSave();
    if (data) { resumeGame(data); onClose(); }
  };

  const handleDelete = (index: number) => {
    deleteSlot(index);
    showToast(`Slot ${index + 1} deleted`);
    refresh();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h2 style={{ color: 'var(--gold)', marginBottom: 4, textAlign: 'center' }}>💾 Save Slots</h2>
        <p style={{ color: '#888', fontSize: '0.75rem', textAlign: 'center', marginBottom: 16 }}>
          {canSave ? 'Save your progress or load a previous run.' : 'Load a saved game to continue.'}
        </p>

        {toast && (
          <div style={{
            background: 'rgba(46,204,113,0.15)', border: '1px solid rgba(46,204,113,0.3)',
            borderRadius: 6, padding: '8px 16px', marginBottom: 12, textAlign: 'center',
            color: '#2ecc71', fontSize: '0.8rem',
          }}>
            {toast}
          </div>
        )}

        {/* Auto-save slot */}
        <SlotCard
          meta={autoMeta}
          slotLabel="Auto-Save"
          isAutoSave
          onLoad={handleLoadAuto}
          canSave={false}
        />

        {/* Divider */}
        <div style={{ borderTop: '1px solid #222', margin: '12px 0', position: 'relative' }}>
          <span style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', background: '#111', padding: '0 8px', color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Manual Saves</span>
        </div>

        {/* Manual slots */}
        {[0, 1, 2].map(i => (
          <SlotCard
            key={i}
            meta={slots[i]}
            slotLabel={`Slot ${i + 1}`}
            onLoad={() => handleLoad(i)}
            onSave={() => handleSave(i)}
            onDelete={() => handleDelete(i)}
            canSave={canSave}
          />
        ))}
      </div>
    </div>
  );
}
