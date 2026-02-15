import { pickNeow } from '../gameStore';

const CHOICES = [
  { title: 'Fading Icon', desc: 'A volatile star: Skill 5, Heat 4. "Past Their Prime" — loses 1 Skill each season. A ticking time bomb of talent.', emoji: '⭐' },
  { title: '$10M Extra Cash', desc: 'Play it safe. Extra budget means more options early, but no star power to lean on.', emoji: '💰' },
  { title: 'Crisis Manager Perk', desc: 'Bad production card effects are halved. A safety net for the cautious producer.', emoji: '🛡️' },
];

export default function NeowScreen() {
  return (
    <div>
      <div className="phase-title">
        <h2>Welcome to Hollywood</h2>
        <div className="subtitle">Every studio head gets one break. Choose yours.</div>
      </div>
      <div className="neow-choices">
        {CHOICES.map((c, i) => (
          <div key={i} className="card" onClick={() => pickNeow(i)}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>{c.emoji}</div>
            <div className="card-title">{c.title}</div>
            <div className="card-body">{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
