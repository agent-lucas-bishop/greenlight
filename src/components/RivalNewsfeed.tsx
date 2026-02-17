/**
 * R268: Rival Newsfeed — Scrolling ticker showing rival activities during gameplay.
 */

import { useState, useEffect, useRef } from 'react';
import { RivalNewsItem } from '../rivalAI';

interface RivalNewsfeedProps {
  items: RivalNewsItem[];
  /** Speed in pixels per second */
  speed?: number;
}

const TYPE_ICONS: Record<RivalNewsItem['type'], string> = {
  announcement: '📢',
  award: '🏆',
  scandal: '😱',
  release: '🎬',
  talent: '⭐',
};

export function RivalNewsfeed({ items, speed = 60 }: RivalNewsfeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (items.length === 0) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % items.length);
        setFade(true);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, [items.length]);

  if (items.length === 0) return null;

  const item = items[currentIndex];

  return (
    <div
      ref={containerRef}
      style={{
        background: 'rgba(0,0,0,0.8)',
        borderTop: '1px solid #333',
        borderBottom: '1px solid #333',
        padding: '6px 12px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        position: 'relative',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        opacity: fade ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}>
        <span style={{
          background: '#e74c3c',
          color: '#fff',
          fontSize: 9,
          fontWeight: 'bold',
          padding: '2px 6px',
          borderRadius: 3,
          flexShrink: 0,
        }}>
          BREAKING
        </span>
        <span style={{ fontSize: 14, flexShrink: 0 }}>
          {TYPE_ICONS[item.type]} {item.studioEmoji}
        </span>
        <span style={{
          fontSize: 12,
          color: '#ccc',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {item.headline}
        </span>
        <span style={{ fontSize: 10, color: '#555', marginLeft: 'auto', flexShrink: 0 }}>
          {currentIndex + 1}/{items.length}
        </span>
      </div>
    </div>
  );
}

/** Compact inline ticker for use in production/release screens */
export function RivalTickerCompact({ items }: { items: RivalNewsItem[] }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIdx(p => (p + 1) % items.length), 4000);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) return null;
  const item = items[idx];

  return (
    <div style={{
      fontSize: 11, color: '#888',
      padding: '4px 8px',
      background: 'rgba(0,0,0,0.4)',
      borderRadius: 6,
      textAlign: 'center',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }}>
      {item.studioEmoji} {item.headline}
    </div>
  );
}
