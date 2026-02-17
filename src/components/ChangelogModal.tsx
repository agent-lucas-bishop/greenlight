import { useState, useEffect } from 'react';

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.9.0',
    date: '2026-02-17',
    changes: [
      '🎬 Marketing landing page with cinematic reveal animation',
      '📋 Changelog modal — you\'re looking at it!',
      '🎨 New green-accent favicon and refreshed meta tags',
      '🔍 Improved OpenGraph & Twitter Card previews',
    ],
  },
  {
    version: '0.8.5',
    date: '2026-02-14',
    changes: [
      '📊 Analytics dashboard with historical run data',
      '👥 Multiplayer lobby and async competitive mode',
      '💾 Save slot system — manage multiple runs',
      '🎵 AudioEngine initialization on first interaction',
    ],
  },
  {
    version: '0.8.0',
    date: '2026-02-10',
    changes: [
      '⭐ Prestige shop with Star Power currency',
      '🏛️ Studio Legacy panel and career milestones',
      '🔧 Mod creator — build and share custom mod packs',
      '⚒️ Card crafting workshop for custom card creation',
    ],
  },
  {
    version: '0.7.5',
    date: '2026-02-05',
    changes: [
      '🗓️ Weekly challenge mode with unique modifiers',
      '📅 Event calendar with seasonal rewards',
      '🏆 Trophy room for showcasing achievements',
      '🃏 Trading card gallery and collection tracking',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-01-30',
    changes: [
      '♾️ Endless mode — no season limit for veterans',
      '🎭 Cutscene system for story moments',
      '🔗 Synergy codex with all card combo info',
      '📖 In-game glossary and encyclopedia',
    ],
  },
];

const STORAGE_KEY = 'greenlight_last_seen_version';

export function getLatestVersion(): string {
  return CHANGELOG[0]?.version ?? '0.0.0';
}

export function hasUnseenChanges(): boolean {
  const last = localStorage.getItem(STORAGE_KEY);
  return last !== getLatestVersion();
}

export function markChangelogSeen(): void {
  localStorage.setItem(STORAGE_KEY, getLatestVersion());
}

export default function ChangelogModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    markChangelogSeen();
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '80vh', overflow: 'auto' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h2 style={{ color: 'var(--gold)', marginBottom: 4, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
          📋 What's New
        </h2>
        <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: 20 }}>
          Latest updates and patch notes
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {CHANGELOG.map((entry, i) => (
            <div key={entry.version} style={{
              padding: 16, background: i === 0 ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${i === 0 ? 'rgba(34,197,94,0.25)' : '#222'}`,
              borderRadius: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{
                  color: i === 0 ? '#22c55e' : 'var(--gold)', fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '1.1rem', letterSpacing: '0.05em',
                }}>
                  v{entry.version}
                </span>
                {i === 0 && (
                  <span style={{
                    fontSize: '0.6rem', color: '#22c55e', background: 'rgba(34,197,94,0.15)',
                    border: '1px solid rgba(34,197,94,0.3)', borderRadius: 4, padding: '1px 6px',
                  }}>
                    LATEST
                  </span>
                )}
                <span style={{ color: '#666', fontSize: '0.7rem', marginLeft: 'auto' }}>
                  {entry.date}
                </span>
              </div>
              <ul style={{ margin: 0, padding: '0 0 0 8px', listStyle: 'none' }}>
                {entry.changes.map((change, j) => (
                  <li key={j} style={{ color: '#bbb', fontSize: '0.8rem', lineHeight: 1.8 }}>
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button className="btn btn-primary" onClick={onClose}>Got it!</button>
        </div>
      </div>
    </div>
  );
}
