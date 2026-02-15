import { startGame } from '../gameStore';

export default function StartScreen() {
  return (
    <div className="start-screen">
      <div className="start-title">GREENLIGHT</div>
      <div className="start-subtitle">A Movie Studio Roguelite</div>
      <p style={{ color: '#666', maxWidth: 500, margin: '0 auto 32px', lineHeight: 1.6 }}>
        You're a freshly hired studio head. Make movies, build your reputation, survive the chaos of Hollywood.
        Push your luck in production, agonize over casting, and watch box office numbers explode.
      </p>
      <button className="btn btn-primary" onClick={startGame}>
        NEW RUN
      </button>
      <div style={{ marginTop: 40, display: 'flex', gap: 24, color: '#555', fontSize: '0.75rem' }}>
        <span>🎬 5 Seasons</span>
        <span>🎭 Push Your Luck</span>
        <span>⭐ Build Your Studio</span>
        <span>🏆 Chase the Oscar</span>
      </div>
    </div>
  );
}
