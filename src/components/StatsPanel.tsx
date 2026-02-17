import { useState, useEffect } from 'react';
import {
  getCareerAnalytics, getCareerAverages, getFavoriteTalent, getFavoriteGenre,
  getMostProfitableGenre, formatPlayTime, GENRE_FILM_MILESTONES,
  getGenreFilmMilestone, getNextGenreFilmMilestone, backfillFromExistingData,
  type CareerAnalyticsData,
} from '../careerAnalytics';
import { getLeaderboard, type LeaderboardEntry } from '../leaderboard';
import { getLifetimeStats } from '../statistics';
import { getAllGenreStats, MASTERY_THRESHOLDS } from '../genreMastery';
import { getRunStats } from '../unlocks';
import { STUDIO_ARCHETYPES } from '../data';
import { sfx } from '../sound';

type StatsSubTab = 'overview' | 'genres' | 'runs' | 'records';

export default function StatsPanel() {
  const [subTab, setSubTab] = useState<StatsSubTab>('overview');

  useEffect(() => { backfillFromExistingData(); }, []);

  const ca = getCareerAnalytics();
  const leaderboard = getLeaderboard();
  const stats = getRunStats();

  if (ca.totalRunsCompleted === 0 && leaderboard.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-title">No Stats Yet</div>
        <div className="empty-state-desc">Complete your first run to start tracking career analytics!</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      {/* Sub-tab nav */}
      <div className="stats-tab-nav" style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        {([
          { key: 'overview' as const, label: '📊 Overview' },
          { key: 'genres' as const, label: '🎭 Genres' },
          { key: 'runs' as const, label: '📜 Runs' },
          { key: 'records' as const, label: '🏅 Records' },
        ]).map(t => (
          <button key={t.key} onClick={() => { sfx.tabSwitch(); setSubTab(t.key); }} style={{
            background: subTab === t.key ? 'rgba(212,168,67,0.15)' : 'transparent',
            border: `1px solid ${subTab === t.key ? 'var(--gold-dim)' : '#333'}`,
            borderRadius: 6, padding: '8px 14px', color: subTab === t.key ? 'var(--gold)' : '#666',
            cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'Bebas Neue', letterSpacing: '0.05em',
            transition: 'all 0.2s', minHeight: 44,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'overview' && <OverviewTab ca={ca} leaderboard={leaderboard} />}
      {subTab === 'genres' && <GenresTab ca={ca} />}
      {subTab === 'runs' && <RunsTab leaderboard={leaderboard} ca={ca} />}
      {subTab === 'records' && <RecordsTab ca={ca} leaderboard={leaderboard} />}
    </div>
  );
}

// ─── OVERVIEW TAB ───

function OverviewTab({ ca, leaderboard }: { ca: CareerAnalyticsData; leaderboard: LeaderboardEntry[] }) {
  const avgs = getCareerAverages();
  const favTalent = getFavoriteTalent();
  const favGenre = getFavoriteGenre();
  const profitGenre = getMostProfitableGenre();

  const statCards: { label: string; value: string; color: string; sub?: string }[] = [
    { label: 'Total Films', value: ca.totalFilmsProduced.toString(), color: '#ccc' },
    { label: 'Total Box Office', value: `$${ca.totalBoxOfficeEarned.toFixed(0)}M`, color: 'var(--gold)' },
    { label: 'Runs Won', value: `${ca.totalRunsWon}/${ca.totalRunsCompleted}`, color: '#2ecc71',
      sub: ca.totalRunsCompleted > 0 ? `${Math.round(ca.totalRunsWon / ca.totalRunsCompleted * 100)}% win rate` : '' },
    { label: 'Best Film BO', value: ca.bestSingleFilmBO > 0 ? `$${ca.bestSingleFilmBO.toFixed(1)}M` : '—', color: '#f39c12',
      sub: ca.bestSingleFilmTitle || undefined },
    { label: 'Best Run BO', value: ca.bestSingleRunBO > 0 ? `$${ca.bestSingleRunBO.toFixed(1)}M` : '—', color: '#e67e22' },
    { label: 'Win Streak', value: ca.longestWinStreak.toString(), color: '#e74c3c',
      sub: ca.currentWinStreak > 0 ? `Current: ${ca.currentWinStreak}` : undefined },
    { label: 'Talent Hired', value: ca.totalTalentHired.toString(), color: '#3498db',
      sub: favTalent ? `Fav: ${favTalent.name} (×${favTalent.count})` : undefined },
    { label: 'Fav Genre', value: favGenre?.genre || '—', color: '#9b59b6',
      sub: favGenre ? `${favGenre.count} films` : undefined },
    { label: 'Most Profitable', value: profitGenre?.genre || '—', color: '#1abc9c',
      sub: profitGenre ? `Avg $${profitGenre.avgBO.toFixed(1)}M` : undefined },
    { label: 'Prestige', value: ca.highestPrestigeReached > 0 ? `Lv.${ca.highestPrestigeReached}` : '—', color: '#f1c40f' },
    { label: 'Play Time', value: formatPlayTime(ca.totalPlayTimeMs), color: '#95a5a6' },
    { label: 'Avg Run Score', value: avgs.avgScore > 0 ? Math.round(avgs.avgScore).toString() : '—', color: '#e67e22' },
  ];

  return (
    <div>
      <div className="stats-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        {statCards.map((s, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid #222', borderRadius: 8,
            padding: '12px 8px', textAlign: 'center',
          }}>
            <div style={{ color: s.color, fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>{s.value}</div>
            <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            {s.sub && <div style={{ color: '#666', fontSize: '0.55rem', marginTop: 2 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Archetype Win Rates */}
      {Object.keys(ca.archetypeRuns).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: 'var(--gold)', fontSize: '0.85rem', marginBottom: 8, letterSpacing: 1 }}>🏛️ ARCHETYPE PERFORMANCE</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {Object.entries(ca.archetypeRuns).sort((a, b) => b[1] - a[1]).map(([arch, runs]) => {
              const wins = ca.archetypeWins[arch] || 0;
              const emoji = STUDIO_ARCHETYPES.find(a => a.id === arch)?.emoji || '🎬';
              return (
                <div key={arch} style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid #222', borderRadius: 8,
                  padding: '10px 14px', textAlign: 'center', minWidth: 100,
                }}>
                  <div style={{ fontSize: '1.2rem' }}>{emoji}</div>
                  <div style={{ color: '#ccc', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }}>{arch}</div>
                  <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>
                    {runs > 0 ? `${Math.round(wins / runs * 100)}%` : '—'}
                  </div>
                  <div style={{ color: '#999', fontSize: '0.55rem' }}>{wins}W / {runs}R</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GENRES TAB ───

function GenresTab({ ca }: { ca: CareerAnalyticsData }) {
  const genreStats = getAllGenreStats();
  const tierColors: Record<string, string> = { platinum: '#b9f2ff', gold: '#ffd700', silver: '#c0c0c0', bronze: '#cd7f32', none: '#555' };

  const allGenres = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];

  return (
    <div>
      <h3 style={{ color: 'var(--gold)', fontSize: '0.85rem', marginBottom: 12, letterSpacing: 1, textAlign: 'center' }}>
        🎬 GENRE MASTERY TRACKER
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {allGenres.map(genre => {
          const gs = genreStats.find(g => g.genre === genre);
          const filmCount = ca.genreFilmCounts[genre] || (gs?.filmsProduced || 0);
          const currentMilestone = getGenreFilmMilestone(filmCount);
          const nextMilestone = getNextGenreFilmMilestone(filmCount);
          const totalBO = ca.genreBoxOffice[genre] || (gs?.totalBoxOffice || 0);
          const avgBO = filmCount > 0 ? totalBO / filmCount : 0;
          const progressToNext = nextMilestone
            ? Math.min(1, filmCount / nextMilestone.count)
            : 1;

          // BO mastery tier
          const boTier = gs?.tier || MASTERY_THRESHOLDS[MASTERY_THRESHOLDS.length - 1];
          const nextBoTier = MASTERY_THRESHOLDS.find(t => t.minBoxOffice > totalBO);
          const boProgress = nextBoTier
            ? Math.min(1, (totalBO - boTier.minBoxOffice) / (nextBoTier.minBoxOffice - boTier.minBoxOffice))
            : 1;

          return (
            <div key={genre} style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid #222', borderRadius: 8,
              padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1rem' }}>{boTier.emoji}</span>
                  <span style={{ color: tierColors[boTier.tier] || '#ccc', fontWeight: 700, fontSize: '0.9rem' }}>{genre}</span>
                  {currentMilestone && (
                    <span style={{
                      fontSize: '0.6rem', color: 'var(--gold)', background: 'rgba(212,168,67,0.12)',
                      padding: '2px 6px', borderRadius: 4,
                    }}>
                      {currentMilestone.emoji} {currentMilestone.label}
                    </span>
                  )}
                </div>
                <span style={{ color: '#888', fontSize: '0.7rem', fontFamily: 'Bebas Neue' }}>
                  {filmCount} film{filmCount !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Film count progress bar */}
              <div style={{ marginBottom: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: '#999', fontSize: '0.55rem' }}>
                    {nextMilestone ? `Next: ${nextMilestone.emoji} ${nextMilestone.label} (${nextMilestone.count} films)` : '✨ Max milestone reached!'}
                  </span>
                  <span style={{ color: '#666', fontSize: '0.55rem' }}>
                    {filmCount}{nextMilestone ? `/${nextMilestone.count}` : ''}
                  </span>
                </div>
                <div style={{ width: '100%', height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${progressToNext * 100}%`, height: '100%',
                    background: `linear-gradient(90deg, var(--gold-dim), var(--gold))`,
                    borderRadius: 3, transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>

              {/* BO mastery progress */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: '#999', fontSize: '0.55rem' }}>
                    BO Mastery: {boTier.label}
                    {nextBoTier ? ` → ${nextBoTier.label} ($${nextBoTier.minBoxOffice}M)` : ''}
                  </span>
                  <span style={{ color: '#666', fontSize: '0.55rem' }}>
                    ${totalBO.toFixed(0)}M
                  </span>
                </div>
                <div style={{ width: '100%', height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${boProgress * 100}%`, height: '100%',
                    background: tierColors[boTier.tier] || '#555',
                    borderRadius: 2, transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>

              {/* Stats row */}
              {filmCount > 0 && (
                <div style={{ display: 'flex', gap: 12, marginTop: 6, color: '#888', fontSize: '0.6rem' }}>
                  <span>Avg BO: ${avgBO.toFixed(1)}M</span>
                  {gs?.bestFilm && <span>👑 "{gs.bestFilm.title}" ${gs.bestFilm.boxOffice.toFixed(1)}M</span>}
                  {gs?.avgQuality && <span>Avg Q: {gs.avgQuality}</span>}
                </div>
              )}

              {/* Milestone badges */}
              {filmCount > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {GENRE_FILM_MILESTONES.map(m => (
                    <span key={m.count} title={`${m.label} (${m.count} films)`} style={{
                      fontSize: '0.65rem', opacity: filmCount >= m.count ? 1 : 0.25,
                      filter: filmCount >= m.count ? 'none' : 'grayscale(1)',
                    }}>
                      {m.emoji}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── RUNS TAB (Enhanced History) ───

function RunsTab({ leaderboard, ca }: { leaderboard: LeaderboardEntry[]; ca: CareerAnalyticsData }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const avgs = getCareerAverages();
  const rankColors: Record<string, string> = { S: '#ff6b6b', A: '#ffd93d', B: '#6bcb77', C: '#5dade2', D: '#999', F: '#e74c3c' };
  const tierColors: Record<string, string> = { BLOCKBUSTER: '#2ecc71', SMASH: '#f1c40f', HIT: '#e67e22', FLOP: '#e74c3c' };

  if (leaderboard.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📜</div>
        <div className="empty-state-title">No Runs Yet</div>
        <div className="empty-state-desc">Complete a run to see detailed history here.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Career averages banner */}
      {avgs.avgBO > 0 && (
        <div style={{
          display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 16, padding: '10px 16px',
          background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.12)', borderRadius: 8,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.9rem' }}>${avgs.avgBO.toFixed(1)}M</div>
            <div style={{ color: '#999', fontSize: '0.55rem' }}>AVG BO/RUN</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.9rem' }}>{Math.round(avgs.avgScore)}</div>
            <div style={{ color: '#999', fontSize: '0.55rem' }}>AVG SCORE</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.9rem' }}>{avgs.avgFilms.toFixed(1)}</div>
            <div style={{ color: '#999', fontSize: '0.55rem' }}>AVG FILMS</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {leaderboard.map((entry) => {
          const isExpanded = expandedId === entry.id;
          const archetypeEmoji = STUDIO_ARCHETYPES.find(a => a.id === entry.archetype)?.emoji || '🎬';

          // Compare to career averages
          const boDiff = avgs.avgBO > 0 ? entry.earnings - avgs.avgBO : 0;
          const scoreDiff = avgs.avgScore > 0 ? entry.score - avgs.avgScore : 0;

          return (
            <div key={entry.id} style={{
              padding: '12px 14px', background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${entry.won ? 'rgba(46,204,113,0.2)' : 'rgba(231,76,60,0.2)'}`,
              borderRadius: 8, cursor: 'pointer', transition: 'border-color 0.2s',
            }} onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: rankColors[entry.rank] || '#999', fontFamily: 'Bebas Neue', fontSize: '1.3rem' }}>{entry.rank}</span>
                  <span style={{ color: entry.won ? '#2ecc71' : '#e74c3c', fontSize: '0.7rem', fontWeight: 600 }}>
                    {entry.won ? '🏆' : '💀'}
                  </span>
                  <span style={{ color: '#888', fontSize: '0.65rem' }}>{entry.date}</span>
                  {entry.studioName && <span style={{ color: '#666', fontSize: '0.6rem' }}>· {entry.studioName}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1rem' }}>{entry.score}pts</span>
                  <span style={{ color: '#555', fontSize: '0.7rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : '' }}>▾</span>
                </div>
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontSize: '0.65rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4 }}>
                  {archetypeEmoji} {entry.archetype}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4 }}>
                  ${entry.earnings.toFixed(1)}M
                </span>
                {/* Career avg comparison */}
                {avgs.avgBO > 0 && (
                  <span style={{
                    fontSize: '0.6rem', padding: '1px 5px', borderRadius: 4,
                    color: boDiff >= 0 ? '#2ecc71' : '#e74c3c',
                    background: boDiff >= 0 ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)',
                  }}>
                    {boDiff >= 0 ? '▲' : '▼'} {Math.abs(boDiff).toFixed(1)}M vs avg
                  </span>
                )}
              </div>

              {/* Film tier strip */}
              <div style={{ display: 'flex', gap: 2 }}>
                {entry.films.map((f, j) => {
                  const tierEmoji: Record<string, string> = { BLOCKBUSTER: '🟩', SMASH: '🟨', HIT: '🟧', FLOP: '🟥' };
                  return <span key={j} title={`S${f.season || j + 1}: ${f.title} (${f.genre}) - ${f.tier}`}>{tierEmoji[f.tier] || '⬜'}</span>;
                })}
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }} onClick={e => e.stopPropagation()}>
                  {/* Season-by-season breakdown */}
                  <div style={{ color: '#888', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    Season-by-Season
                  </div>
                  {entry.films.map((f, j) => (
                    <div key={j} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
                      borderBottom: j < entry.films.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                    }}>
                      <span style={{ color: '#666', fontFamily: 'Bebas Neue', fontSize: '0.8rem', width: 24 }}>S{f.season || j + 1}</span>
                      <span style={{ color: tierColors[f.tier], fontSize: '0.85rem' }}>
                        {({ BLOCKBUSTER: '🟩', SMASH: '🟨', HIT: '🟧', FLOP: '🟥' } as Record<string, string>)[f.tier] || '⬜'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#ccc', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.title}
                        </div>
                        <div style={{ color: '#777', fontSize: '0.6rem' }}>
                          {f.genre} · Q:{f.quality || '?'} · {f.tier}
                        </div>
                      </div>
                      {f.boxOffice != null && (
                        <span style={{ color: tierColors[f.tier], fontFamily: 'Bebas Neue', fontSize: '0.85rem', minWidth: 50, textAlign: 'right' }}>
                          ${f.boxOffice.toFixed(1)}M
                        </span>
                      )}
                      {f.nominated && <span title="Award Nominated">🏆</span>}
                    </div>
                  ))}

                  {/* Comparison to averages */}
                  {avgs.avgBO > 0 && (
                    <div style={{
                      marginTop: 10, padding: '8px 10px', background: 'rgba(212,168,67,0.05)',
                      border: '1px solid rgba(212,168,67,0.1)', borderRadius: 6,
                    }}>
                      <div style={{ color: '#999', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                        VS CAREER AVERAGES
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <div>
                          <span style={{ color: '#888', fontSize: '0.65rem' }}>Score: </span>
                          <span style={{ color: scoreDiff >= 0 ? '#2ecc71' : '#e74c3c', fontFamily: 'Bebas Neue', fontSize: '0.85rem' }}>
                            {scoreDiff >= 0 ? '+' : ''}{Math.round(scoreDiff)}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#888', fontSize: '0.65rem' }}>BO: </span>
                          <span style={{ color: boDiff >= 0 ? '#2ecc71' : '#e74c3c', fontFamily: 'Bebas Neue', fontSize: '0.85rem' }}>
                            {boDiff >= 0 ? '+' : ''}${boDiff.toFixed(1)}M
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#888', fontSize: '0.65rem' }}>Films: </span>
                          <span style={{ color: '#ccc', fontFamily: 'Bebas Neue', fontSize: '0.85rem' }}>
                            {entry.films.length} (avg {avgs.avgFilms.toFixed(1)})
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.95rem' }}>{entry.seasons}</div>
                      <div style={{ color: '#999', fontSize: '0.5rem' }}>SEASONS</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.95rem' }}>
                        {'★'.repeat(entry.reputation)}{'☆'.repeat(Math.max(0, 5 - entry.reputation))}
                      </div>
                      <div style={{ color: '#999', fontSize: '0.5rem' }}>REPUTATION</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '0.95rem' }}>${entry.earnings.toFixed(1)}M</div>
                      <div style={{ color: '#999', fontSize: '0.5rem' }}>TOTAL BO</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── RECORDS TAB — Radar chart, win streak, most profitable film, timeline ───

function GenreRadarChart({ ca }: { ca: CareerAnalyticsData }) {
  const allGenres = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];
  const genreColors: Record<string, string> = {
    Action: '#e74c3c', Comedy: '#f1c40f', Drama: '#3498db', Horror: '#9b59b6',
    'Sci-Fi': '#1abc9c', Romance: '#e91e63', Thriller: '#e67e22',
  };

  // Calculate win rates per genre from leaderboard data
  const leaderboard = getLeaderboard();
  const genreWins: Record<string, number> = {};
  const genreTotal: Record<string, number> = {};
  for (const entry of leaderboard) {
    for (const f of entry.films) {
      genreTotal[f.genre] = (genreTotal[f.genre] || 0) + 1;
      if (f.tier !== 'FLOP') genreWins[f.genre] = (genreWins[f.genre] || 0) + 1;
    }
  }

  const maxCount = Math.max(1, ...Object.values(genreTotal));
  const n = allGenres.length;
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const r = 90;

  // Helper to get point on polygon
  const getPoint = (i: number, value: number) => {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    const dist = r * value;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };

  // Background rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <div style={{ textAlign: 'center', marginBottom: 24 }}>
      <h3 style={{ color: 'var(--gold)', fontSize: '0.85rem', marginBottom: 12, letterSpacing: 1 }}>
        🎯 GENRE WIN RATE RADAR
      </h3>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: '100%' }}>
        {/* Grid rings */}
        {rings.map((rv, ri) => (
          <polygon key={ri}
            points={allGenres.map((_, i) => { const p = getPoint(i, rv); return `${p.x},${p.y}`; }).join(' ')}
            fill="none" stroke="#333" strokeWidth={0.5} opacity={0.5}
          />
        ))}
        {/* Axis lines */}
        {allGenres.map((_, i) => {
          const p = getPoint(i, 1);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#333" strokeWidth={0.5} opacity={0.3} />;
        })}
        {/* Data polygon — win rate */}
        <polygon
          points={allGenres.map((g, i) => {
            const total = genreTotal[g] || 0;
            const wins = genreWins[g] || 0;
            const rate = total > 0 ? wins / total : 0;
            const p = getPoint(i, rate);
            return `${p.x},${p.y}`;
          }).join(' ')}
          fill="rgba(212,168,67,0.15)" stroke="var(--gold)" strokeWidth={2}
        />
        {/* Data dots + labels */}
        {allGenres.map((g, i) => {
          const total = genreTotal[g] || 0;
          const wins = genreWins[g] || 0;
          const rate = total > 0 ? wins / total : 0;
          const dp = getPoint(i, rate);
          const lp = getPoint(i, 1.22);
          return (
            <g key={g}>
              <circle cx={dp.x} cy={dp.y} r={3} fill="var(--gold)" />
              <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
                fill={genreColors[g] || '#888'} fontSize="9" fontFamily="Bebas Neue">
                {g}
              </text>
              {total > 0 && (
                <text x={lp.x} y={lp.y + 11} textAnchor="middle" dominantBaseline="middle"
                  fill="#666" fontSize="7">
                  {Math.round(rate * 100)}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function RecordsTab({ ca, leaderboard }: { ca: CareerAnalyticsData; leaderboard: LeaderboardEntry[] }) {
  const lifetime = getLifetimeStats();

  // Most profitable film of all time
  const allFilms: { title: string; bo: number; genre: string; date: string; quality: number }[] = [];
  for (const entry of leaderboard) {
    for (const f of entry.films) {
      allFilms.push({ title: f.title, bo: f.boxOffice ?? 0, genre: f.genre, date: entry.date, quality: f.quality ?? 0 });
    }
  }
  allFilms.sort((a, b) => b.bo - a.bo);
  const topFilm = allFilms[0] || null;

  return (
    <div>
      {/* Genre Radar Chart */}
      <GenreRadarChart ca={ca} />

      {/* Win Streak Tracker */}
      <div style={{
        marginBottom: 24, padding: '16px', background: 'rgba(255,255,255,0.03)',
        border: '1px solid #222', borderRadius: 10,
      }}>
        <h3 style={{ color: 'var(--gold)', fontSize: '0.85rem', marginBottom: 12, letterSpacing: 1 }}>
          🔥 WIN STREAK TRACKER
        </h3>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#e74c3c', fontFamily: 'Bebas Neue', fontSize: '2rem' }}>
              {lifetime.longestWinStreak}
            </div>
            <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase' }}>Best Streak</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: lifetime.currentWinStreak > 0 ? '#2ecc71' : '#666', fontFamily: 'Bebas Neue', fontSize: '2rem' }}>
              {lifetime.currentWinStreak}
            </div>
            <div style={{ color: '#999', fontSize: '0.6rem', textTransform: 'uppercase' }}>Current Streak</div>
          </div>
        </div>
        {/* Streak visualization */}
        {leaderboard.length > 0 && (
          <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            {leaderboard.slice(-20).map((entry, i) => (
              <div key={i} style={{
                width: 16, height: 16, borderRadius: 3,
                background: entry.won ? 'rgba(46,204,113,0.8)' : 'rgba(231,76,60,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.5rem', color: '#fff',
              }} title={`${entry.date}: ${entry.won ? 'Win' : 'Loss'} ($${entry.earnings.toFixed(1)}M)`}>
                {entry.won ? 'W' : 'L'}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Most Profitable Film */}
      {topFilm && (
        <div style={{
          marginBottom: 24, padding: '16px', background: 'linear-gradient(135deg, rgba(255,215,0,0.06), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,215,0,0.15)', borderRadius: 10,
        }}>
          <h3 style={{ color: 'var(--gold)', fontSize: '0.85rem', marginBottom: 12, letterSpacing: 1 }}>
            💰 MOST PROFITABLE FILM OF ALL TIME
          </h3>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ffd700', fontFamily: 'Bebas Neue', fontSize: '1.8rem' }}>
              "${topFilm.title}"
            </div>
            <div style={{ color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '1.4rem', marginTop: 4 }}>
              ${topFilm.bo.toFixed(1)}M
            </div>
            <div style={{ color: '#888', fontSize: '0.7rem', marginTop: 4 }}>
              {topFilm.genre} · Quality: {topFilm.quality} · {topFilm.date}
            </div>
          </div>
          {/* Top 5 films list */}
          {allFilms.length > 1 && (
            <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
              {allFilms.slice(1, 6).map((f, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#888', fontSize: '0.65rem' }}>
                  <span>#{i + 2} "{f.title}" ({f.genre})</span>
                  <span style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue' }}>${f.bo.toFixed(1)}M</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All-Time Records */}
      {lifetime.records.biggestBO && (
        <div style={{
          marginBottom: 24, padding: '16px', background: 'rgba(255,255,255,0.03)',
          border: '1px solid #222', borderRadius: 10,
        }}>
          <h3 style={{ color: 'var(--gold)', fontSize: '0.85rem', marginBottom: 12, letterSpacing: 1 }}>
            📊 ALL-TIME RECORDS
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {[
              { label: 'Biggest BO', value: lifetime.records.biggestBO ? `$${lifetime.records.biggestBO.value.toFixed(1)}M` : '—', sub: lifetime.records.biggestBO?.filmTitle, color: '#2ecc71' },
              { label: 'Worst Flop', value: lifetime.records.worstFlop ? `$${lifetime.records.worstFlop.value.toFixed(1)}M` : '—', sub: lifetime.records.worstFlop?.filmTitle, color: '#e74c3c' },
              { label: 'Highest Quality', value: lifetime.records.highestQuality ? `${lifetime.records.highestQuality.value}` : '—', sub: lifetime.records.highestQuality?.filmTitle, color: '#3498db' },
              { label: 'Best Critic Score', value: lifetime.records.highestCriticScore ? `${lifetime.records.highestCriticScore.value}%` : '—', sub: lifetime.records.highestCriticScore?.filmTitle, color: '#f39c12' },
              { label: 'Best Run BO', value: lifetime.records.highestRunBO ? `$${lifetime.records.highestRunBO.value.toFixed(1)}M` : '—', sub: lifetime.records.highestRunBO?.runDate, color: '#9b59b6' },
              { label: 'Most Films/Run', value: lifetime.records.mostFilmsInRun ? `${lifetime.records.mostFilmsInRun.value}` : '—', sub: lifetime.records.mostFilmsInRun?.runDate, color: '#1abc9c' },
            ].map((rec, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ color: rec.color, fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>{rec.value}</div>
                <div style={{ color: '#999', fontSize: '0.55rem', textTransform: 'uppercase' }}>{rec.label}</div>
                {rec.sub && <div style={{ color: '#555', fontSize: '0.5rem', marginTop: 2 }}>{rec.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historical Timeline */}
      {leaderboard.length > 1 && (
        <div style={{
          marginBottom: 24, padding: '16px', background: 'rgba(255,255,255,0.03)',
          border: '1px solid #222', borderRadius: 10,
        }}>
          <h3 style={{ color: 'var(--gold)', fontSize: '0.85rem', marginBottom: 12, letterSpacing: 1 }}>
            📈 HISTORICAL TIMELINE
          </h3>
          {/* Mini chart: BO over time using pure CSS bars */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80, padding: '0 4px' }}>
            {(() => {
              const runs = leaderboard.slice(-30);
              const maxBO = Math.max(1, ...runs.map(r => r.earnings));
              return runs.map((entry, i) => {
                const h = Math.max(2, (entry.earnings / maxBO) * 70);
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{
                      width: '100%', maxWidth: 16, height: h, borderRadius: '2px 2px 0 0',
                      background: entry.won
                        ? 'linear-gradient(to top, rgba(46,204,113,0.6), rgba(46,204,113,0.9))'
                        : 'linear-gradient(to top, rgba(231,76,60,0.4), rgba(231,76,60,0.7))',
                      transition: 'height 0.3s',
                    }} title={`${entry.date}: $${entry.earnings.toFixed(1)}M (${entry.won ? 'Win' : 'Loss'})`} />
                  </div>
                );
              });
            })()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ color: '#555', fontSize: '0.5rem' }}>{leaderboard[Math.max(0, leaderboard.length - 30)]?.date || ''}</span>
            <span style={{ color: '#555', fontSize: '0.5rem' }}>Latest</span>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8, color: '#666', fontSize: '0.55rem' }}>
            <span>🟩 Win</span>
            <span>🟥 Loss</span>
          </div>
        </div>
      )}
    </div>
  );
}
