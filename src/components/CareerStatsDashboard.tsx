// Career Stats Dashboard — lifetime stats pulled from run history & unlocks
import { getLeaderboard } from '../leaderboard';
import { getUnlocks } from '../unlocks';
export default function CareerStatsDashboard() {
  const leaderboard = getLeaderboard();
  const unlocks = getUnlocks();

  // Compute lifetime stats from leaderboard
  const totalFilms = unlocks.careerStats.totalFilms;
  const totalBoxOffice = unlocks.careerStats.totalBoxOffice || 0;
  const totalSeasons = leaderboard.reduce((sum, e) => sum + e.seasons, 0);
  const totalRuns = unlocks.totalRuns;

  // Average quality across all films
  const allFilms = leaderboard.flatMap(e => e.films);
  const filmsWithQuality = allFilms.filter(f => f.quality != null && f.quality > 0);
  const avgQuality = filmsWithQuality.length > 0
    ? Math.round(filmsWithQuality.reduce((s, f) => s + (f.quality || 0), 0) / filmsWithQuality.length)
    : 0;

  // Best single film by quality
  const bestQualityFilm = filmsWithQuality.length > 0
    ? filmsWithQuality.reduce((best, f) => (f.quality || 0) > (best.quality || 0) ? f : best)
    : null;

  // Highest grossing single film
  const filmsWithBO = allFilms.filter(f => f.boxOffice != null && f.boxOffice > 0);
  const highestGrossingFilm = filmsWithBO.length > 0
    ? filmsWithBO.reduce((best, f) => (f.boxOffice || 0) > (best.boxOffice || 0) ? f : best)
    : null;

  // Favorite genre
  const genreFilms = unlocks.careerStats.genreFilms;
  const genreEntries = Object.entries(genreFilms).sort((a, b) => b[1] - a[1]);
  const favGenre = genreEntries.length > 0 ? genreEntries[0] : null;

  // Win/loss record
  const wins = unlocks.totalWins;
  const losses = totalRuns - wins;

  // Longest streak of BLOCKBUSTERS across all runs
  let longestBlockbusterStreak = 0;
  let currentStreak = 0;
  for (const entry of leaderboard) {
    for (const film of entry.films) {
      if (film.tier === 'BLOCKBUSTER') {
        currentStreak++;
        longestBlockbusterStreak = Math.max(longestBlockbusterStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    // Reset streak between runs
    currentStreak = 0;
  }
  // Also check within each run individually for consecutive
  for (const entry of leaderboard) {
    let streak = 0;
    for (const film of entry.films) {
      if (film.tier === 'BLOCKBUSTER') {
        streak++;
        longestBlockbusterStreak = Math.max(longestBlockbusterStreak, streak);
      } else {
        streak = 0;
      }
    }
  }

  // Positive vs negative score runs
  const positiveRuns = leaderboard.filter(e => e.score > 0).length;
  const negativeRuns = leaderboard.filter(e => e.score <= 0).length;

  if (totalRuns === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-title">No Career Data Yet</div>
        <div className="empty-state-desc">Complete your first run to start tracking your lifetime stats!</div>
      </div>
    );
  }

  const statCards: { label: string; value: string; sub?: string; color: string; emoji: string }[] = [
    { label: 'Total Films', value: totalFilms.toString(), emoji: '🎬', color: '#ccc' },
    { label: 'Total Box Office', value: `$${totalBoxOffice.toFixed(0)}M`, emoji: '💰', color: 'var(--gold)' },
    { label: 'Average Quality', value: avgQuality > 0 ? avgQuality.toString() : '—', emoji: '⭐', color: '#f39c12' },
    { label: 'Total Seasons', value: totalSeasons.toString(), emoji: '📅', color: '#3498db' },
    { label: 'Win / Loss', value: `${wins}W – ${losses}L`, emoji: '🏆', color: wins > losses ? '#2ecc71' : '#e74c3c' },
    { label: 'Blockbuster Streak', value: longestBlockbusterStreak > 0 ? longestBlockbusterStreak.toString() : '—', sub: 'consecutive', emoji: '🔥', color: '#e67e22' },
    ...(() => {
      const filmsWithCritic = allFilms.filter(f => f.criticScore != null);
      if (filmsWithCritic.length === 0) return [];
      const avgCritic = Math.round(filmsWithCritic.reduce((s, f) => s + (f.criticScore || 0), 0) / filmsWithCritic.length);
      return [{ label: 'Avg Critic Score', value: `${avgCritic}%`, sub: avgCritic >= 60 ? 'Fresh' : 'Rotten', emoji: avgCritic >= 60 ? '🍅' : '🤢', color: avgCritic >= 60 ? '#e74c3c' : '#7f8c2a' }];
    })(),
  ];

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.4rem', letterSpacing: '0.08em' }}>
          📊 CAREER STATS
        </div>
        <div style={{ color: '#666', fontSize: '0.75rem' }}>
          Lifetime statistics across {totalRuns} run{totalRuns !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Main stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        {statCards.map((s, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(212,168,67,0.12)',
            borderRadius: 10,
            padding: '16px 10px',
            textAlign: 'center',
            transition: 'border-color 0.2s',
          }}>
            <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{s.emoji}</div>
            <div style={{ color: s.color, fontFamily: 'Bebas Neue', fontSize: '1.4rem', lineHeight: 1.2 }}>{s.value}</div>
            {s.sub && <div style={{ color: '#555', fontSize: '0.55rem' }}>{s.sub}</div>}
            <div style={{ color: '#888', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Featured Films */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24,
      }}>
        {/* Best Quality Film */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(243,156,18,0.08), rgba(212,168,67,0.04))',
          border: '1px solid rgba(243,156,18,0.2)',
          borderRadius: 10, padding: '14px 16px',
        }}>
          <div style={{ color: '#f39c12', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            ⭐ Highest Quality Film
          </div>
          {bestQualityFilm ? (
            <>
              <div style={{ color: '#ffd700', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>
                "{bestQualityFilm.title}"
              </div>
              <div style={{ color: '#999', fontSize: '0.7rem' }}>
                {bestQualityFilm.genre} · Quality {bestQualityFilm.quality}
              </div>
            </>
          ) : (
            <div style={{ color: '#555', fontSize: '0.8rem' }}>—</div>
          )}
        </div>

        {/* Highest Grossing Film */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(46,204,113,0.08), rgba(39,174,96,0.04))',
          border: '1px solid rgba(46,204,113,0.2)',
          borderRadius: 10, padding: '14px 16px',
        }}>
          <div style={{ color: '#2ecc71', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            💰 Highest Grossing Film
          </div>
          {highestGrossingFilm ? (
            <>
              <div style={{ color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>
                "{highestGrossingFilm.title}"
              </div>
              <div style={{ color: '#999', fontSize: '0.7rem' }}>
                {highestGrossingFilm.genre} · ${(highestGrossingFilm.boxOffice || 0).toFixed(1)}M
              </div>
            </>
          ) : (
            <div style={{ color: '#555', fontSize: '0.8rem' }}>—</div>
          )}
        </div>
      </div>

      {/* Favorite Genre */}
      {favGenre && (
        <div style={{
          background: 'rgba(155,89,182,0.06)', border: '1px solid rgba(155,89,182,0.2)',
          borderRadius: 10, padding: '14px 16px', marginBottom: 24, textAlign: 'center',
        }}>
          <div style={{ color: '#9b59b6', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            🎭 Favorite Genre
          </div>
          <div style={{ color: '#bb86fc', fontFamily: 'Bebas Neue', fontSize: '1.6rem' }}>{favGenre[0]}</div>
          <div style={{ color: '#888', fontSize: '0.7rem' }}>{favGenre[1]} film{favGenre[1] !== 1 ? 's' : ''} produced</div>
          {genreEntries.length > 1 && (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
              {genreEntries.slice(1, 5).map(([genre, count]) => (
                <span key={genre} style={{
                  background: 'rgba(155,89,182,0.1)', border: '1px solid rgba(155,89,182,0.2)',
                  borderRadius: 6, padding: '2px 8px', fontSize: '0.65rem', color: '#9b59b6',
                }}>
                  {genre} ×{count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Win/Loss Breakdown */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', border: '1px solid #222',
        borderRadius: 10, padding: '14px 16px', marginBottom: 24,
      }}>
        <div style={{ color: 'var(--gold)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          📈 Run Breakdown
        </div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#2ecc71', fontFamily: 'Bebas Neue', fontSize: '1.6rem' }}>{wins}</div>
            <div style={{ color: '#888', fontSize: '0.6rem' }}>WINS</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#e74c3c', fontFamily: 'Bebas Neue', fontSize: '1.6rem' }}>{losses}</div>
            <div style={{ color: '#888', fontSize: '0.6rem' }}>LOSSES</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#f39c12', fontFamily: 'Bebas Neue', fontSize: '1.6rem' }}>
              {totalRuns > 0 ? `${Math.round((wins / totalRuns) * 100)}%` : '—'}
            </div>
            <div style={{ color: '#888', fontSize: '0.6rem' }}>WIN RATE</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#3498db', fontFamily: 'Bebas Neue', fontSize: '1.6rem' }}>{positiveRuns}</div>
            <div style={{ color: '#888', fontSize: '0.6rem' }}>POSITIVE SCORE</div>
          </div>
        </div>
        {/* Win/loss bar */}
        {totalRuns > 0 && (
          <div style={{ marginTop: 12, width: '100%', height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${(wins / totalRuns) * 100}%`, height: '100%', background: '#2ecc71', transition: 'width 0.5s' }} />
            <div style={{ flex: 1, height: '100%', background: '#e74c3c' }} />
          </div>
        )}
      </div>

      {/* R179: Soundtrack stats */}
      {(unlocks.careerStats.bestSoundtrackScore > 0 || unlocks.careerStats.favoriteComposer) && (
        <div style={{
          background: 'rgba(230, 126, 34, 0.06)', border: '1px solid rgba(230, 126, 34, 0.2)',
          borderRadius: 10, padding: '14px 16px', marginBottom: 24,
        }}>
          <div style={{ color: '#e67e22', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            🎵 Soundtrack Stats
          </div>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
            {unlocks.careerStats.bestSoundtrackScore > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#e67e22', fontFamily: 'Bebas Neue', fontSize: '1.4rem' }}>
                  {'🎵'.repeat(unlocks.careerStats.bestSoundtrackScore)}
                </div>
                <div style={{ color: '#888', fontSize: '0.6rem' }}>BEST SCORE</div>
              </div>
            )}
            {unlocks.careerStats.favoriteComposer && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#ffd700', fontFamily: 'Bebas Neue', fontSize: '1.1rem' }}>
                  {unlocks.careerStats.favoriteComposer}
                </div>
                <div style={{ color: '#888', fontSize: '0.6rem' }}>FAVORITE COMPOSER</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tier distribution */}
      {allFilms.length > 0 && (() => {
        const tiers: Record<string, { count: number; color: string; emoji: string }> = {
          BLOCKBUSTER: { count: 0, color: '#2ecc71', emoji: '🟩' },
          SMASH: { count: 0, color: '#f1c40f', emoji: '🟨' },
          HIT: { count: 0, color: '#e67e22', emoji: '🟧' },
          FLOP: { count: 0, color: '#e74c3c', emoji: '🟥' },
        };
        for (const f of allFilms) {
          if (tiers[f.tier]) tiers[f.tier].count++;
        }
        return (
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid #222',
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ color: 'var(--gold)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              🎬 Film Tier Distribution
            </div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              {Object.entries(tiers).map(([tier, data]) => (
                <div key={tier} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem' }}>{data.emoji}</div>
                  <div style={{ color: data.color, fontFamily: 'Bebas Neue', fontSize: '1.3rem' }}>{data.count}</div>
                  <div style={{ color: '#888', fontSize: '0.55rem' }}>{tier}</div>
                </div>
              ))}
            </div>
            {/* Tier bar */}
            <div style={{ marginTop: 10, width: '100%', height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
              {Object.entries(tiers).map(([tier, data]) => (
                <div key={tier} style={{ width: `${(data.count / allFilms.length) * 100}%`, height: '100%', background: data.color, transition: 'width 0.5s' }} />
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
