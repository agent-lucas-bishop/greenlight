/**
 * R268: Rival Profile Dossier Card
 * Shows rival's name, CSS logo, specialty, recent films, rivalry meter,
 * and predicted next move.
 */

import { useState } from 'react';
import { RivalStudioAI, calculateRivalryMeter, predictNextMove } from '../rivalAI';
import { RivalStats, Genre } from '../types';

interface RivalProfileProps {
  rival: RivalStudioAI;
  stats: RivalStats | undefined;
  playerTotalEarnings: number;
  isNemesis: boolean;
  recentFilms: { title: string; genre: Genre; boxOffice: number; tier: string }[];
  currentSeason: number;
  playerGenre?: Genre;
}

export function RivalProfile({
  rival, stats, playerTotalEarnings, isNemesis,
  recentFilms, currentSeason, playerGenre,
}: RivalProfileProps) {
  const [expanded, setExpanded] = useState(false);
  const rivalryMeter = calculateRivalryMeter(rival.name, stats, playerTotalEarnings, isNemesis);
  const prediction = predictNextMove(rival, currentSeason, playerGenre);

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: `linear-gradient(135deg, ${rival.themeColor}, rgba(0,0,0,0.9))`,
        border: `1px solid ${isNemesis ? '#e74c3c' : rival.accentColor}40`,
        borderRadius: 12,
        padding: 16,
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Nemesis badge */}
      {isNemesis && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: '#e74c3c', color: '#fff',
          fontSize: 10, fontWeight: 'bold',
          padding: '2px 8px', borderRadius: 4,
        }}>
          ⚔️ NEMESIS
        </div>
      )}

      {/* Header: Logo + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* CSS Logo */}
        <div style={{
          width: 48, height: 48, borderRadius: 10,
          background: `linear-gradient(135deg, ${rival.accentColor}, ${rival.themeColor})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 'bold', color: '#fff',
          fontFamily: 'Georgia, serif',
          boxShadow: `0 0 12px ${rival.accentColor}40`,
        }}>
          {rival.logoChar}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', color: '#eee', fontSize: 16 }}>
            {rival.emoji} {rival.name}
          </div>
          <div style={{ fontSize: 12, color: rival.accentColor, fontStyle: 'italic' }}>
            {rival.tagline}
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
            {rival.specialty}
          </div>
        </div>

        {/* Stats summary */}
        {stats && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#f1c40f', fontWeight: 'bold', fontSize: 14 }}>
              ${stats.totalBoxOffice.toFixed(1)}M
            </div>
            <div style={{ fontSize: 11, color: '#888' }}>
              {stats.filmsMade} film{stats.filmsMade !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {/* Rivalry Meter */}
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: '#888' }}>Rivalry</span>
          <span style={{ fontSize: 11, color: rivalryMeter > 70 ? '#e74c3c' : rivalryMeter > 40 ? '#f1c40f' : '#888' }}>
            {rivalryMeter > 70 ? '🔥 Intense' : rivalryMeter > 40 ? '⚡ Competitive' : '😐 Mild'}
          </span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
          <div style={{
            width: `${rivalryMeter}%`, height: '100%', borderRadius: 4,
            background: rivalryMeter > 70 ? '#e74c3c' : rivalryMeter > 40 ? '#f1c40f' : '#3498db',
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop: 14, borderTop: `1px solid ${rival.accentColor}20`, paddingTop: 10 }}>
          {/* Description */}
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 10, lineHeight: 1.5 }}>
            {rival.description}
          </div>

          {/* Traits */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {rival.traits.map(t => (
              <span key={t} style={{
                fontSize: 10, color: rival.accentColor,
                background: `${rival.accentColor}15`,
                padding: '2px 8px', borderRadius: 10,
                border: `1px solid ${rival.accentColor}30`,
              }}>
                {t}
              </span>
            ))}
          </div>

          {/* Signature Move */}
          <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
            <span style={{ color: '#aaa', fontWeight: 'bold' }}>Signature Move:</span>{' '}
            {rival.signatureMove}
          </div>

          {/* Recent Films */}
          {recentFilms.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Recent Films:</div>
              {recentFilms.slice(-3).map((f, i) => (
                <div key={i} style={{
                  fontSize: 12, color: '#aaa',
                  display: 'flex', justifyContent: 'space-between',
                  padding: '2px 0',
                }}>
                  <span>{f.title} ({f.genre})</span>
                  <span style={{ color: f.tier === 'BLOCKBUSTER' ? '#f1c40f' : f.tier === 'FLOP' ? '#e74c3c' : '#2ecc71' }}>
                    ${f.boxOffice.toFixed(1)}M
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Predicted Next Move */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 6,
            padding: '8px 10px',
            fontSize: 11,
            color: '#ccc',
          }}>
            <span style={{ color: '#f1c40f' }}>🔮 Intel:</span>{' '}
            {prediction}
          </div>

          {/* Head-to-head record */}
          {stats && stats.timesBeatenPlayer > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#e74c3c' }}>
              ⚠️ Has outperformed you {stats.timesBeatenPlayer} time{stats.timesBeatenPlayer !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
