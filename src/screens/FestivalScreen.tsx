import { useState, useRef, useEffect } from 'react';
import { GameState } from '../types';
import { submitToFestival, skipFestival } from '../gameStore';
import { canSubmitToFestival, getFestival, getAwardLabel, getLaurelBadge, type FestivalId } from '../filmFestivals';
import { sfx } from '../sound';
import { getAudioEngine } from '../audioEngine';

export default function FestivalScreen({ state }: { state: GameState }) {
  const [selectedFestival, setSelectedFestival] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const festivals = state.festivalEligible || [];
  const result = state.festivalResult;

  // Get the most recent film (current season)
  const currentSeasonFilms = state.seasonHistory.filter(f => f.season === state.season);
  const latestFilm = currentSeasonFilms[currentSeasonFilms.length - 1];
  const filmIndex = latestFilm ? state.seasonHistory.indexOf(latestFilm) : -1;

  const handleSubmit = () => {
    if (!selectedFestival || filmIndex < 0) return;
    sfx.festivalDrumRoll();
    setSubmitted(true);
    submitToFestival(selectedFestival, filmIndex);
  };

  const handleSkip = () => {
    sfx.click();
    skipFestival();
  };

  const handleContinue = () => {
    sfx.click();
    skipFestival();
  };

  // Show result screen after submission
  // Play festival result sound once
  const festSoundPlayed = useRef(false);
  useEffect(() => {
    if (result && !festSoundPlayed.current) {
      festSoundPlayed.current = true;
      if (result.award === 'grandPrize') setTimeout(() => { sfx.festivalGrandPrize(); getAudioEngine().playAward(); }, 100);
      else if (result.award === 'winner') setTimeout(() => { sfx.festivalWinnerFanfare(); getAudioEngine().playAward(); setTimeout(() => sfx.festivalLaurelStamp(), 400); }, 100);
      else if (result.award === 'nomination') setTimeout(() => sfx.festivalNominationChime(), 100);
    }
  }, [result]);

  if (result) {
    const awardColor = result.award === 'grandPrize' ? '#f1c40f' : result.award === 'winner' ? '#2ecc71' : result.award === 'nomination' ? '#3498db' : '#e74c3c';
    return (
      <div className="screen" style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', marginBottom: 8 }}>
          {result.festivalEmoji} {result.festivalName}
        </h2>
        <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: 20 }}>
          Results for <strong style={{ color: '#fff' }}>{result.filmTitle}</strong>
        </p>

        <div style={{
          background: `rgba(${result.award ? '46,204,113' : '231,76,60'},0.1)`,
          border: `2px solid ${awardColor}`,
          borderRadius: 16,
          padding: '32px 24px',
          maxWidth: 400,
          margin: '0 auto 24px',
        }}>
          {result.award ? (
            <>
              <div style={{ fontSize: '3rem', marginBottom: 8 }}>
                {getLaurelBadge(result.award as any)}
              </div>
              <div style={{
                fontSize: 'clamp(1.2rem, 3vw, 1.6rem)',
                fontWeight: 700,
                color: awardColor,
                marginBottom: 8,
              }}>
                {getAwardLabel(result.award as any)}!
              </div>
              <div style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: 16 }}>
                Score: {result.score}/100
              </div>
              <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
                {result.repBoost > 0 && (
                  <div style={{ color: '#2ecc71', fontWeight: 700 }}>
                    ⭐ +{result.repBoost} Rep
                  </div>
                )}
                {result.budgetBonus > 0 && (
                  <div style={{ color: '#f1c40f', fontWeight: 700 }}>
                    💰 +${result.budgetBonus}M
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>😔</div>
              <div style={{
                fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
                fontWeight: 700,
                color: '#e74c3c',
                marginBottom: 8,
              }}>
                Not Selected
              </div>
              <div style={{ color: '#999', fontSize: '0.85rem' }}>
                The jury passed on your film this time. Score: {result.score}/100
              </div>
            </>
          )}
        </div>

        <button
          className="btn"
          onClick={handleContinue}
          style={{ background: '#2ecc71', padding: '10px 32px', fontSize: '1rem' }}
        >
          Continue →
        </button>
      </div>
    );
  }

  if (!latestFilm) {
    // Shouldn't happen, but safety fallback
    return (
      <div className="screen" style={{ textAlign: 'center' }}>
        <h2>🎬 Film Festivals</h2>
        <p style={{ color: '#aaa' }}>No films to submit.</p>
        <button className="btn" onClick={handleSkip} style={{ background: '#555', padding: '10px 24px' }}>
          Continue →
        </button>
      </div>
    );
  }

  return (
    <div className="screen" style={{ textAlign: 'center' }}>
      <h2 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', marginBottom: 4 }}>
        🎬 Film Festivals
      </h2>
      <p style={{ color: '#aaa', fontSize: 'clamp(0.75rem, 2vw, 0.95rem)', marginBottom: 8 }}>
        Submit <strong style={{ color: '#fff' }}>{latestFilm.title}</strong> ({latestFilm.genre}, Q:{latestFilm.quality}) to a festival?
      </p>
      <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: 20 }}>
        Budget: ${state.budget}M
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
        maxWidth: 800,
        margin: '0 auto 24px',
        padding: '0 8px',
      }}>
        {festivals.map(fest => {
          const fullFestival = getFestival(fest.id as FestivalId);
          const check = canSubmitToFestival(fullFestival, latestFilm, state.budget);
          const isSelected = selectedFestival === fest.id;
          const disabled = !check.eligible;

          return (
            <div
              key={fest.id}
              onClick={() => { if (!disabled && !submitted) { sfx.click(); setSelectedFestival(fest.id); } }}
              onKeyDown={e => { if (!disabled && !submitted && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setSelectedFestival(fest.id); } }}
              tabIndex={disabled || submitted ? -1 : 0}
              role="button"
              aria-label={`${fest.name}: Entry cost $${fest.entryCost}M`}
              aria-pressed={isSelected}
              aria-disabled={disabled}
              style={{
                background: disabled ? 'rgba(255,255,255,0.02)' : isSelected ? 'rgba(241,196,15,0.15)' : 'rgba(255,255,255,0.05)',
                border: isSelected ? '2px solid #f1c40f' : '2px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: '16px 12px',
                cursor: disabled || submitted ? 'default' : 'pointer',
                transition: 'all 0.2s',
                transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                opacity: disabled ? 0.4 : 1,
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: 6 }}>{fest.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 'clamp(0.8rem, 2vw, 1rem)', marginBottom: 4 }}>
                {fest.name}
              </div>
              <div style={{ color: '#f1c40f', fontSize: '0.8rem', marginBottom: 4 }}>
                Entry: ${fest.entryCost}M
              </div>
              <div style={{ color: '#aaa', fontSize: '0.75rem', marginBottom: 4 }}>
                {fullFestival.description}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#888' }}>
                Genres: {fullFestival.genreBonus.join(', ')}
              </div>
              {disabled && check.reason && (
                <div style={{ color: '#e74c3c', fontSize: '0.7rem', marginTop: 4 }}>
                  ⚠ {check.reason}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Festival career stats */}
      {state.festivalHistory.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 10,
          padding: '8px 16px',
          maxWidth: 400,
          margin: '0 auto 16px',
          fontSize: '0.75rem',
          color: '#888',
        }}>
          Career: {state.festivalHistory.filter(r => r.award).length} awards from {state.festivalHistory.length} entries
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          className="btn"
          onClick={handleSubmit}
          disabled={!selectedFestival || submitted}
          style={{
            background: selectedFestival ? '#f1c40f' : '#555',
            color: selectedFestival ? '#000' : '#fff',
            padding: '10px 28px',
            fontSize: 'clamp(0.85rem, 2vw, 1rem)',
            fontWeight: 700,
          }}
        >
          {submitted ? 'Submitting...' : selectedFestival ? `Submit to ${festivals.find(f => f.id === selectedFestival)?.emoji || ''} Festival` : 'Select a festival'}
        </button>
        {!submitted && (
          <button
            className="btn"
            onClick={handleSkip}
            style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '10px 20px',
              fontSize: 'clamp(0.75rem, 2vw, 0.9rem)',
              color: '#aaa',
            }}
          >
            Skip Festivals
          </button>
        )}
      </div>
    </div>
  );
}
