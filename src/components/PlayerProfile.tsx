// R223: Player Profile & Stats Dashboard Component
import { useState, useEffect, useRef } from 'react';
import {
  loadProfile, getCareerTitle, getAvatarFrameColor,
  CAREER_MILESTONES, getAllMilestonesWithStatus,
  type PlayerProfile as ProfileType, type DifficultyStats, type FilmRecord,
} from '../playerProfile';

// ─── Animated Counter ───
function AnimatedCounter({ end, duration = 1200, prefix = '', suffix = '' }: { end: number; duration?: number; prefix?: string; suffix?: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = 0;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (end - start) * eased));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [end, duration]);

  return <>{prefix}{value.toLocaleString()}{suffix}</>;
}

// ─── CSS-only Genre Radar Chart ───
function GenreRadarChart({ genres }: { genres: Record<string, number> }) {
  const allGenres = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];
  const maxVal = Math.max(1, ...Object.values(genres));
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 80;
  const n = allGenres.length;

  const getPoint = (i: number, r: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  // Build polygon path for data
  const dataPoints = allGenres.map((g, i) => {
    const val = genres[g] || 0;
    const r = (val / maxVal) * radius;
    return getPoint(i, Math.max(r, 4));
  });
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        {/* Grid rings */}
        {rings.map(r => {
          const points = allGenres.map((_, i) => getPoint(i, radius * r));
          const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
          return <path key={r} d={path} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />;
        })}
        {/* Axis lines */}
        {allGenres.map((_, i) => {
          const p = getPoint(i, radius);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />;
        })}
        {/* Data polygon */}
        <path d={dataPath} fill="rgba(212,168,67,0.2)" stroke="var(--gold)" strokeWidth={2} />
        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--gold)" />
        ))}
        {/* Labels */}
        {allGenres.map((g, i) => {
          const p = getPoint(i, radius + 18);
          const count = genres[g] || 0;
          return (
            <text key={g} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
              fill={count > 0 ? '#ccc' : '#555'} fontSize="10" fontFamily="inherit">
              {g}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Difficulty Tab ───
function DifficultyStatsGrid({ stats, label, color }: { stats: DifficultyStats; label: string; color: string }) {
  if (stats.runs === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 20, color: '#555', fontSize: '0.8rem' }}>
        No {label} runs yet
      </div>
    );
  }
  const winRate = stats.runs > 0 ? Math.round((stats.wins / stats.runs) * 100) : 0;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {[
        { label: 'Runs', value: stats.runs, c: '#ccc' },
        { label: 'Win Rate', value: winRate, c: color, suffix: '%' },
        { label: 'Best Score', value: stats.bestScore, c: 'var(--gold)' },
        { label: 'Best Streak', value: stats.bestStreak, c: '#f39c12' },
        { label: 'Total BO', value: Math.round(stats.totalBoxOffice), c: '#2ecc71', prefix: '$', suffix: 'M' },
        { label: 'S-Ranks', value: stats.sRankCount, c: '#ff6b6b' },
      ].map((s, i) => (
        <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #222', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
          <div style={{ color: s.c, fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>
            <AnimatedCounter end={s.value} prefix={s.prefix} suffix={s.suffix} />
          </div>
          <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───
export default function PlayerProfileModal({ onClose }: { onClose: () => void }) {
  const [profile, setProfile] = useState<ProfileType>(loadProfile);
  const [section, setSection] = useState<'overview' | 'stats' | 'genres' | 'milestones' | 'runs' | 'hof'>('overview');
  const career = getCareerTitle(profile);
  const frameColor = getAvatarFrameColor(profile);
  const milestones = getAllMilestonesWithStatus();
  const unlockedCount = milestones.filter(m => m.unlocked).length;

  const diffTabs: { id: 'all' | 'indie' | 'studio' | 'mogul'; label: string; emoji: string; color: string }[] = [
    { id: 'all', label: 'All', emoji: '📊', color: '#ccc' },
    { id: 'indie', label: 'Indie', emoji: '🎥', color: '#2ecc71' },
    { id: 'studio', label: 'Studio', emoji: '🎬', color: '#3498db' },
    { id: 'mogul', label: 'Mogul', emoji: '💀', color: '#e74c3c' },
  ];
  const [diffTab, setDiffTab] = useState<'all' | 'indie' | 'studio' | 'mogul'>('all');

  const sections = [
    { id: 'overview', emoji: '👤', label: 'Overview' },
    { id: 'stats', emoji: '📊', label: 'Stats' },
    { id: 'genres', emoji: '🎭', label: 'Genres' },
    { id: 'milestones', emoji: '🏅', label: 'Milestones' },
    { id: 'runs', emoji: '📜', label: 'Recent Runs' },
    { id: 'hof', emoji: '🏛️', label: 'Hall of Fame' },
  ] as const;

  const winRate = profile.totalRuns > 0 ? Math.round((profile.wins / profile.totalRuns) * 100) : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: '90vh', overflow: 'auto' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(212,168,67,0.15)' }}>
          {/* Avatar frame */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 12px',
            border: `3px solid ${frameColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${frameColor}15`, boxShadow: `0 0 20px ${frameColor}30`,
          }}>
            <span style={{ fontSize: '2rem' }}>{career.emoji}</span>
          </div>
          <h2 style={{ color: 'var(--gold)', marginBottom: 4, fontSize: '1.3rem' }}>Player Profile</h2>
          <div style={{ color: frameColor, fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.05em' }}>
            {career.emoji} {career.title}
          </div>
          <div style={{ color: '#666', fontSize: '0.7rem', marginTop: 4 }}>
            {unlockedCount}/{CAREER_MILESTONES.length} milestones · {profile.totalRuns} runs
          </div>
        </div>

        {/* Section nav */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              style={{
                background: section === s.id ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${section === s.id ? 'rgba(212,168,67,0.4)' : '#333'}`,
                borderRadius: 6, padding: '6px 12px', color: section === s.id ? 'var(--gold)' : '#888',
                cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit', transition: 'all 0.2s',
              }}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>

        {/* ─── OVERVIEW ─── */}
        {section === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Total Runs', value: profile.totalRuns, color: '#ccc' },
                { label: 'Wins', value: profile.wins, color: '#2ecc71' },
                { label: 'Win Rate', value: winRate, color: '#3498db', suffix: '%' },
                { label: 'Best Streak', value: profile.bestStreak, color: '#f39c12' },
                { label: 'Movies Made', value: profile.moviesProduced, color: 'var(--gold)' },
                { label: 'S-Ranks', value: profile.sRankCount, color: '#ff6b6b' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #222', borderRadius: 8, padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ color: s.color, fontFamily: 'Bebas Neue', fontSize: '1.4rem' }}>
                    <AnimatedCounter end={s.value} suffix={s.suffix} />
                  </div>
                  <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #222', borderRadius: 8, padding: '12px' }}>
                <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase', marginBottom: 4 }}>💰 Lifetime Box Office</div>
                <div style={{ color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '1.3rem' }}>
                  $<AnimatedCounter end={Math.round(profile.totalBoxOffice)} />M
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #222', borderRadius: 8, padding: '12px' }}>
                <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase', marginBottom: 4 }}>💸 Total Budget Spent</div>
                <div style={{ color: '#e74c3c', fontFamily: 'Bebas Neue', fontSize: '1.3rem' }}>
                  $<AnimatedCounter end={Math.round(profile.totalBudgetSpent)} />M
                </div>
              </div>
            </div>
            {profile.highestGrossingFilm && (
              <div style={{ marginTop: 16, background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.2)', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase', marginBottom: 4 }}>🏆 Highest-Grossing Film</div>
                <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '1rem' }}>"{profile.highestGrossingFilm.title}"</div>
                <div style={{ color: '#888', fontSize: '0.75rem' }}>
                  {profile.highestGrossingFilm.genre} · ${profile.highestGrossingFilm.boxOffice.toFixed(1)}M · Q{profile.highestGrossingFilm.quality}
                </div>
              </div>
            )}
            {profile.favoriteTalent && (
              <div style={{ marginTop: 10, color: '#888', fontSize: '0.75rem', textAlign: 'center' }}>
                ⭐ Favorite Talent: <span style={{ color: 'var(--gold)' }}>{profile.favoriteTalent}</span>
                <span style={{ color: '#666' }}> ({profile.talentUsage[profile.favoriteTalent] || 0} hires)</span>
              </div>
            )}
          </div>
        )}

        {/* ─── STATS (per-difficulty) ─── */}
        {section === 'stats' && (
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, justifyContent: 'center' }}>
              {diffTabs.map(t => (
                <button key={t.id} onClick={() => setDiffTab(t.id)}
                  style={{
                    background: diffTab === t.id ? `${t.color}15` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${diffTab === t.id ? `${t.color}60` : '#333'}`,
                    borderRadius: 6, padding: '5px 12px', color: diffTab === t.id ? t.color : '#888',
                    cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit',
                  }}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
            {diffTab === 'all' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { label: 'Total Runs', value: profile.totalRuns, c: '#ccc' },
                  { label: 'Win Rate', value: winRate, c: '#3498db', suffix: '%' },
                  { label: 'Best Streak', value: profile.bestStreak, c: '#f39c12' },
                  { label: 'Total BO', value: Math.round(profile.totalBoxOffice), c: '#2ecc71', prefix: '$', suffix: 'M' },
                  { label: 'Budget Spent', value: Math.round(profile.totalBudgetSpent), c: '#e74c3c', prefix: '$', suffix: 'M' },
                  { label: 'S-Ranks', value: profile.sRankCount, c: '#ff6b6b' },
                  { label: 'Movies', value: profile.moviesProduced, c: 'var(--gold)' },
                  { label: 'Genres Used', value: Object.keys(profile.genresUsed).length, c: '#9b59b6' },
                  { label: 'Losses', value: profile.losses, c: '#e74c3c' },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #222', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ color: s.c, fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>
                      <AnimatedCounter end={s.value} prefix={s.prefix} suffix={s.suffix} />
                    </div>
                    <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <DifficultyStatsGrid
                stats={profile.difficultyStats[diffTab]}
                label={diffTabs.find(t => t.id === diffTab)!.label}
                color={diffTabs.find(t => t.id === diffTab)!.color}
              />
            )}
          </div>
        )}

        {/* ─── GENRES ─── */}
        {section === 'genres' && (
          <div>
            {Object.keys(profile.genresUsed).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#555' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎭</div>
                <div>No genre data yet. Complete a run to see your genre radar!</div>
              </div>
            ) : (
              <>
                <GenreRadarChart genres={profile.genresUsed} />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 16 }}>
                  {Object.entries(profile.genresUsed).sort((a, b) => b[1] - a[1]).map(([genre, count]) => (
                    <span key={genre} style={{
                      background: 'rgba(52,152,219,0.1)', border: '1px solid rgba(52,152,219,0.3)',
                      borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', color: '#3498db',
                    }}>{genre} ×{count}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── MILESTONES ─── */}
        {section === 'milestones' && (
          <div>
            <div style={{ color: '#999', fontSize: '0.75rem', textAlign: 'center', marginBottom: 16 }}>
              {unlockedCount}/{CAREER_MILESTONES.length} milestones unlocked
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {milestones.map(m => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  background: m.unlocked ? 'rgba(46,204,113,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${m.unlocked ? 'rgba(46,204,113,0.3)' : '#222'}`,
                  borderRadius: 8, opacity: m.unlocked ? 1 : 0.6,
                }}>
                  <span style={{ fontSize: '1.3rem' }}>{m.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: m.unlocked ? '#2ecc71' : '#aaa', fontSize: '0.85rem', fontWeight: 600 }}>
                      {m.name} {m.unlocked && '✓'}
                    </div>
                    <div style={{ color: '#999', fontSize: '0.7rem' }}>{m.description}</div>
                  </div>
                  {m.unlockedAt && (
                    <div style={{ color: '#666', fontSize: '0.6rem' }}>{m.unlockedAt}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── RECENT RUNS ─── */}
        {section === 'runs' && (
          <div>
            {profile.recentRuns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#555' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📜</div>
                <div>No runs recorded yet.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {profile.recentRuns.map(r => {
                  const rankColors: Record<string, string> = { S: '#ff6b6b', A: '#ffd93d', B: '#6bcb77', C: '#5dade2', D: '#999', F: '#e74c3c' };
                  const diffColors: Record<string, string> = { indie: '#2ecc71', studio: '#3498db', mogul: '#e74c3c' };
                  return (
                    <div key={r.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${r.won ? 'rgba(46,204,113,0.2)' : 'rgba(231,76,60,0.2)'}`,
                      borderRadius: 8,
                    }}>
                      <span style={{ color: rankColors[r.rank] || '#999', fontFamily: 'Bebas Neue', fontSize: '1.4rem', width: 28, textAlign: 'center' }}>{r.rank}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: r.won ? '#2ecc71' : '#e74c3c', fontSize: '0.75rem', fontWeight: 600 }}>
                            {r.won ? '🏆 WON' : '💀 LOST'}
                          </span>
                          <span style={{ color: '#999', fontSize: '0.65rem' }}>{r.date}</span>
                          <span style={{ color: diffColors[r.difficulty] || '#888', fontSize: '0.6rem', background: `${diffColors[r.difficulty] || '#888'}15`, padding: '1px 6px', borderRadius: 3 }}>
                            {r.difficulty}
                          </span>
                        </div>
                        <div style={{ color: '#888', fontSize: '0.7rem', marginTop: 2 }}>
                          {r.filmsProduced} films · ${r.earnings.toFixed(1)}M · {r.archetype}
                        </div>
                      </div>
                      <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>{r.score}pts</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── HALL OF FAME ─── */}
        {section === 'hof' && (
          <div>
            {profile.hallOfFame.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#555' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏛️</div>
                <div>Your hall of fame is empty. Make some movies!</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {profile.hallOfFame.map((f, i) => {
                  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                  const tierColors: Record<string, string> = { BLOCKBUSTER: '#2ecc71', SMASH: '#f1c40f', HIT: '#e67e22', FLOP: '#e74c3c' };
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                      background: i === 0 ? 'rgba(212,168,67,0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${i === 0 ? 'rgba(212,168,67,0.3)' : '#222'}`,
                      borderRadius: 8,
                    }}>
                      <span style={{ fontSize: '1.3rem' }}>{medals[i]}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: i === 0 ? 'var(--gold)' : '#ccc', fontWeight: 700, fontSize: '0.95rem' }}>"{f.title}"</div>
                        <div style={{ color: '#888', fontSize: '0.7rem', marginTop: 2 }}>
                          {f.genre} · <span style={{ color: tierColors[f.tier] }}>{f.tier}</span> · Q{f.quality} · ${f.boxOffice.toFixed(1)}M
                        </div>
                        <div style={{ color: '#666', fontSize: '0.6rem' }}>{f.date} · {f.difficulty}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
