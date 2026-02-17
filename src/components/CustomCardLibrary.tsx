import { useState } from 'react';
import { getAllCustomCards, toggleCardActive, deleteCustomCard, exportCustomCards, importCustomCards, getBalanceRating, getBalanceLabel, type CustomCard, type CustomCardType } from '../customCards';
import { sfx } from '../sound';

export default function CustomCardLibrary({ onEdit }: { onEdit: (card: CustomCard) => void }) {
  const [cards, setCards] = useState(getAllCustomCards);
  const [filter, setFilter] = useState<CustomCardType | 'all'>('all');
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [showImport, setShowImport] = useState(false);

  const refresh = () => setCards(getAllCustomCards());

  const filtered = filter === 'all' ? cards : cards.filter(c => c.type === filter);
  const counts = { script: cards.filter(c => c.type === 'script').length, talent: cards.filter(c => c.type === 'talent').length, event: cards.filter(c => c.type === 'event').length };

  const handleExport = () => {
    const json = exportCustomCards();
    navigator.clipboard.writeText(json).then(() => setImportMsg('Copied to clipboard!')).catch(() => {
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'greenlight-custom-cards.json'; a.click();
    });
    setTimeout(() => setImportMsg(''), 3000);
  };

  const handleImport = () => {
    const result = importCustomCards(importText);
    setImportMsg(`Imported ${result.imported} card(s)${result.errors.length ? `. Errors: ${result.errors.join('; ')}` : ''}`);
    if (result.imported > 0) sfx.cardImport();
    setImportText('');
    setShowImport(false);
    refresh();
    setTimeout(() => setImportMsg(''), 5000);
  };

  const typeIcon = (t: CustomCardType) => t === 'script' ? '📝' : t === 'talent' ? '🎭' : '⚡';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ color: '#999', fontSize: '0.8rem' }}>
          📝 {counts.script} Scripts · 🎭 {counts.talent} Talent · ⚡ {counts.event} Events · {cards.filter(c => c.active).length} Active
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleExport} style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid #444', borderRadius: 4, padding: '4px 10px', color: 'var(--gold)', fontSize: '0.75rem', cursor: 'pointer' }}>📤 Export</button>
          <button onClick={() => setShowImport(!showImport)} style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid #444', borderRadius: 4, padding: '4px 10px', color: 'var(--gold)', fontSize: '0.75rem', cursor: 'pointer' }}>📥 Import</button>
        </div>
      </div>

      {importMsg && <div style={{ background: 'rgba(102,204,102,0.1)', border: '1px solid #4a4', borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontSize: '0.8rem', color: '#8d8' }}>{importMsg}</div>}

      {showImport && (
        <div style={{ marginBottom: 12 }}>
          <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Paste JSON here..." rows={4} style={{ width: '100%', background: '#1a1a1a', border: '1px solid #444', borderRadius: 6, padding: 8, color: '#ccc', fontSize: '0.8rem', resize: 'vertical' }} />
          <button onClick={handleImport} disabled={!importText.trim()} style={{ marginTop: 4, background: 'var(--gold-dim)', border: 'none', borderRadius: 4, padding: '6px 16px', color: '#000', fontWeight: 600, cursor: 'pointer', opacity: importText.trim() ? 1 : 0.4 }}>Import Cards</button>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {(['all', 'script', 'talent', 'event'] as const).map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{ background: filter === t ? 'rgba(212,168,67,0.15)' : 'transparent', border: `1px solid ${filter === t ? 'var(--gold-dim)' : '#333'}`, borderRadius: 4, padding: '4px 10px', color: filter === t ? 'var(--gold)' : '#666', fontSize: '0.75rem', cursor: 'pointer' }}>
            {t === 'all' ? `All (${cards.length})` : `${typeIcon(t)} ${t.charAt(0).toUpperCase() + t.slice(1)} (${counts[t]})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <div style={{ textAlign: 'center', color: '#666', padding: 40, fontSize: '0.9rem' }}>No custom cards yet. Create one above!</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
        {filtered.map(card => {
          const balance = getBalanceLabel(getBalanceRating(card));
          return (
            <div key={card.id} style={{ background: card.active ? 'rgba(212,168,67,0.05)' : 'rgba(30,30,30,0.8)', border: `1px solid ${card.active ? 'var(--gold-dim)' : '#333'}`, borderRadius: 8, padding: 12, position: 'relative', opacity: card.active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: card.active ? 'var(--gold)' : '#888' }}>{typeIcon(card.type)} {card.name || 'Untitled'}</div>
                <span style={{ fontSize: '0.65rem', color: balance.color }}>{balance.emoji}</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: 8, minHeight: 28 }}>{card.description || 'No description'}</div>
              <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: 8 }}>
                {card.type === 'script' && `${card.genre} · $${card.cost}M · Score ${card.baseScore}`}
                {card.type === 'talent' && `${card.talentType} · $${card.cost}M · Skill ${card.skill}`}
                {card.type === 'event' && `Event card`}
                {card.cardEffect.qualityBonus ? ` · Q${card.cardEffect.qualityBonus > 0 ? '+' : ''}${card.cardEffect.qualityBonus}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => { toggleCardActive(card.id); refresh(); }} style={{ flex: 1, background: card.active ? 'rgba(102,204,102,0.15)' : 'rgba(100,100,100,0.15)', border: '1px solid #444', borderRadius: 4, padding: '3px 0', fontSize: '0.65rem', color: card.active ? '#8d8' : '#888', cursor: 'pointer' }}>{card.active ? '✓ Active' : 'Inactive'}</button>
                <button onClick={() => onEdit(card)} style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid #444', borderRadius: 4, padding: '3px 8px', fontSize: '0.65rem', color: 'var(--gold)', cursor: 'pointer' }}>✏️</button>
                <button onClick={() => { if (confirm(`Delete "${card.name}"?`)) { deleteCustomCard(card.id); refresh(); } }} style={{ background: 'rgba(204,68,68,0.1)', border: '1px solid #444', borderRadius: 4, padding: '3px 8px', fontSize: '0.65rem', color: '#c66', cursor: 'pointer' }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
