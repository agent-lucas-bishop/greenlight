// StudioCard.tsx — R313: Compact studio identity card for start screen + career stats
import { getStudioIdentity } from '../studioIdentity';
import { getStudioCustomization } from '../studioCustomization';
import { getStudioLogoConfig } from '../studioLegacy';
import { LogoSVG } from './StudioLogoEditor';
import { getCareerTitle, loadProfile } from '../playerProfile';
import { getAchievementShowcase } from '../achievementShowcase';
import { ACHIEVEMENTS } from '../achievements';
import { getAchievementRarity, RARITY_DEFS } from '../achievements-gallery';

export default function StudioCard({ compact }: { compact?: boolean }) {
  const identity = getStudioIdentity();
  const customization = getStudioCustomization();
  const logoConfig = getStudioLogoConfig();
  const profile = loadProfile();
  const career = getCareerTitle(profile);
  const showcase = getAchievementShowcase();

  if (!identity) return null;

  const showcaseAchs = showcase.map(id => ACHIEVEMENTS.find(a => a.id === id)).filter(Boolean);

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(212,168,67,0.06), rgba(255,215,0,0.03))',
      border: '1px solid rgba(212,168,67,0.2)',
      borderRadius: 14,
      padding: compact ? '14px 18px' : '20px 24px',
      maxWidth: compact ? 360 : 420,
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      gap: compact ? 14 : 18,
    }}>
      {/* Logo */}
      <div style={{ flexShrink: 0 }}>
        <LogoSVG config={logoConfig} size={compact ? 52 : 68} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: compact ? '0.7rem' : '0.8rem' }}>{identity.logo}</span>
          <span style={{
            color: 'var(--gold)', fontFamily: 'Bebas Neue',
            fontSize: compact ? '1rem' : '1.15rem', letterSpacing: '0.06em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {identity.name}
          </span>
        </div>

        {customization.motto && (
          <div style={{
            color: '#888', fontSize: compact ? '0.6rem' : '0.65rem',
            fontStyle: 'italic', marginBottom: 4,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            "{customization.motto}"
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#666', fontSize: '0.55rem' }}>
            Est. {customization.foundingYear}
          </span>
          <span style={{ color: '#555', fontSize: '0.55rem' }}>•</span>
          <span style={{ color: '#888', fontSize: '0.55rem' }}>
            {career.emoji} {career.title}
          </span>
        </div>

        {/* Achievement showcase badges */}
        {showcaseAchs.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            {showcaseAchs.map(ach => {
              if (!ach) return null;
              const rarity = getAchievementRarity(ach);
              const rarityDef = RARITY_DEFS[rarity];
              return (
                <div key={ach.id} title={ach.name} style={{
                  width: 26, height: 26, borderRadius: 6,
                  background: `linear-gradient(135deg, rgba(0,0,0,0.6), ${rarityDef.glowColor})`,
                  border: `1px solid ${rarityDef.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.85rem',
                  boxShadow: rarity === 'legendary' ? `0 0 8px ${rarityDef.glowColor}` : 'none',
                }}>
                  {ach.emoji}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
