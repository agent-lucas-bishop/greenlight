// R264: Card Artwork Component — renders generated CSS art as card background
import { useMemo } from 'react';
import { generateCardArt, type CardArtStyle } from '../cardArt';
import type { TalentType } from '../types';
import type { CollectionCardRarity } from '../cardCollection';

interface Props {
  name: string;
  role: TalentType;
  rarity: CollectionCardRarity;
  isFoil?: boolean;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
}

export default function CardArtwork({ name, role, rarity, isFoil, style, className, children }: Props) {
  const art: CardArtStyle = useMemo(() => generateCardArt(name, role, rarity), [name, role, rarity]);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    background: art.background,
    backgroundSize: art.backgroundSize,
    backgroundBlendMode: art.backgroundBlendMode as React.CSSProperties['backgroundBlendMode'],
    ...style,
  };

  return (
    <div className={className} style={containerStyle}>
      {/* Decorative overlay shape */}
      {art.overlayBackground && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: art.overlayBackground,
          clipPath: art.overlayClipPath,
          opacity: art.overlayOpacity ?? 0.5,
          mixBlendMode: (art.overlayMixBlendMode ?? 'screen') as React.CSSProperties['mixBlendMode'],
          pointerEvents: 'none',
          zIndex: 1,
        }} />
      )}
      {/* Foil shimmer overlay */}
      {isFoil && <div className="foil-shimmer-overlay" />}
      {/* Card content */}
      <div style={{ position: 'relative', zIndex: 3 }}>
        {children}
      </div>
    </div>
  );
}
