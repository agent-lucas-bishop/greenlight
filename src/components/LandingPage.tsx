import { useState, useEffect } from 'react';

const FEATURES = [
  { emoji: '🃏', title: 'Deck-Building Strategy', desc: 'Your cast shapes your deck. Every talent brings unique cards — build synergies, manage risk, craft the perfect production.' },
  { emoji: '💰', title: 'Dynamic Box Office', desc: 'Genre trends shift each season. Read the market, time your releases, and ride the wave to blockbuster earnings.' },
  { emoji: '🏆', title: 'Festival Awards', desc: 'Chase critical acclaim at film festivals. Win awards, build prestige, and cement your legacy in Hollywood history.' },
  { emoji: '🔧', title: 'Mod Support', desc: 'Create custom cards, challenges, and mod packs. Share them with the community and play user-generated content.' },
];

export default function LandingPage() {
  const [revealed, setRevealed] = useState(false);
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [featuresVisible, setFeaturesVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setRevealed(true), 200);
    const t2 = setTimeout(() => setTaglineVisible(true), 1200);
    const t3 = setTimeout(() => setFeaturesVisible(true), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const handlePlay = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('landing');
    window.history.replaceState({}, '', url.toString());
    window.location.reload();
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a1a', color: '#eee',
      fontFamily: "'Bebas Neue', 'Inter', sans-serif", overflow: 'hidden',
    }}>
      {/* Hero */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', position: 'relative',
        padding: '40px 20px', textAlign: 'center',
      }}>
        {/* Background gradient glow */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Film strip decorations */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: 'repeating-linear-gradient(90deg, #22c55e 0px, #22c55e 20px, transparent 20px, transparent 40px)',
          opacity: 0.3,
        }} />

        <div style={{
          fontSize: 'clamp(3rem, 10vw, 7rem)', fontFamily: "'Bebas Neue', sans-serif",
          letterSpacing: '0.15em', lineHeight: 1,
          background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
        }}>
          GREENLIGHT
        </div>

        <div style={{
          fontSize: 'clamp(0.7rem, 2vw, 1rem)', letterSpacing: '0.3em',
          color: '#666', marginTop: 8, fontFamily: "'Bebas Neue', sans-serif",
          opacity: revealed ? 1 : 0, transition: 'opacity 1s ease 0.4s',
        }}>
          A MOVIE STUDIO ROGUELITE
        </div>

        <div style={{
          marginTop: 32, fontSize: 'clamp(0.9rem, 2.5vw, 1.25rem)',
          color: '#ccc', maxWidth: 500, lineHeight: 1.6, fontFamily: 'Inter, sans-serif',
          opacity: taglineVisible ? 1 : 0, transform: taglineVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}>
          Build your studio. Cast your stars.<br />Chase the green light.
        </div>

        <button onClick={handlePlay} style={{
          marginTop: 48, padding: '16px 48px', fontSize: '1.1rem',
          fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.15em',
          background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff',
          border: 'none', borderRadius: 8, cursor: 'pointer',
          boxShadow: '0 0 30px rgba(34,197,94,0.3), 0 4px 15px rgba(0,0,0,0.3)',
          opacity: taglineVisible ? 1 : 0, transition: 'opacity 0.6s ease 0.3s, transform 0.15s ease, box-shadow 0.2s ease',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(34,197,94,0.5), 0 6px 20px rgba(0,0,0,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(34,197,94,0.3), 0 4px 15px rgba(0,0,0,0.3)'; }}
        >
          ▶ PLAY NOW
        </button>

        {/* Scroll hint */}
        <div style={{
          position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
          color: '#444', fontSize: '0.75rem', letterSpacing: '0.1em',
          animation: 'landing-bounce 2s infinite',
        }}>
          ↓ SCROLL FOR MORE
        </div>
      </section>

      {/* Features */}
      <section style={{
        padding: '80px 20px', maxWidth: 900, margin: '0 auto',
        opacity: featuresVisible ? 1 : 0, transition: 'opacity 0.8s ease',
      }}>
        <h2 style={{
          textAlign: 'center', fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
          fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.1em',
          color: '#22c55e', marginBottom: 48,
        }}>
          THE HOLLYWOOD EXPERIENCE
        </h2>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 24,
        }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(34,197,94,0.15)',
              borderRadius: 12, padding: 24, textAlign: 'center',
              transition: 'border-color 0.2s, transform 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(34,197,94,0.4)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(34,197,94,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{f.emoji}</div>
              <div style={{
                color: '#22c55e', fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '1.1rem', letterSpacing: '0.08em', marginBottom: 8,
              }}>{f.title}</div>
              <div style={{ color: '#999', fontSize: '0.8rem', lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Game Preview Mockup */}
      <section style={{ padding: '40px 20px 80px', maxWidth: 700, margin: '0 auto' }}>
        <h2 style={{
          textAlign: 'center', fontSize: '1.5rem', fontFamily: "'Bebas Neue', sans-serif",
          letterSpacing: '0.1em', color: '#22c55e', marginBottom: 32,
        }}>
          A GLIMPSE INSIDE
        </h2>
        <div style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #0f1923 100%)',
          border: '1px solid rgba(34,197,94,0.2)', borderRadius: 16,
          padding: 32, position: 'relative', overflow: 'hidden',
        }}>
          {/* Fake game UI mockup */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ color: '#22c55e', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem' }}>
              🎬 SEASON 3 — GREENLIGHT
            </div>
            <div style={{ display: 'flex', gap: 12, color: '#888', fontSize: '0.75rem' }}>
              <span>💰 $42M</span>
              <span>⭐⭐⭐⭐☆</span>
            </div>
          </div>
          {/* Fake cards */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { title: 'Thriller Script', genre: '🔪 Thriller', quality: 'A-Tier' },
              { title: 'A-List Lead', genre: '🎭 Drama', quality: 'Star Power' },
              { title: 'VFX Upgrade', genre: '🚀 Sci-Fi', quality: '+3 Quality' },
            ].map((card, i) => (
              <div key={i} style={{
                width: 140, padding: 16, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{card.genre.split(' ')[0]}</div>
                <div style={{ color: '#ccc', fontSize: '0.75rem', fontWeight: 600 }}>{card.title}</div>
                <div style={{ color: '#22c55e', fontSize: '0.65rem', marginTop: 4 }}>{card.quality}</div>
              </div>
            ))}
          </div>
          <div style={{
            textAlign: 'center', marginTop: 20, color: '#444',
            fontSize: '0.7rem', fontStyle: 'italic',
          }}>
            Actual in-game interface
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{
        padding: '60px 20px 80px', textAlign: 'center',
        borderTop: '1px solid rgba(34,197,94,0.1)',
      }}>
        <div style={{
          fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
          fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.1em',
          color: '#eee', marginBottom: 24,
        }}>
          READY TO RUN A STUDIO?
        </div>
        <button onClick={handlePlay} style={{
          padding: '14px 40px', fontSize: '1rem',
          fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.15em',
          background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff',
          border: 'none', borderRadius: 8, cursor: 'pointer',
          boxShadow: '0 0 20px rgba(34,197,94,0.25)',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          ▶ PLAY FREE IN BROWSER
        </button>
        <div style={{ color: '#444', fontSize: '0.7rem', marginTop: 12 }}>
          No download required · Works on desktop & mobile
        </div>
      </section>

      <style>{`
        @keyframes landing-bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(8px); }
        }
      `}</style>
    </div>
  );
}
