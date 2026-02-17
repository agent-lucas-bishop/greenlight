// ─── STUDIO CUSTOMIZATION ───
// Extended studio identity: motto, founding year, office decor, nameplates, card backs, banners
// Persists across runs via localStorage

import { getLifetimeStats, type LifetimeStats } from './studioLegacy';
import { getUnlockedAchievements } from './achievements';

const CUSTOM_KEY = 'greenlight_studio_custom';

// ─── OFFICE DECOR TIERS ───

export type DecorTier = 'garage' | 'loft' | 'office' | 'penthouse' | 'mansion';

export interface DecorTierDef {
  id: DecorTier;
  name: string;
  emoji: string;
  description: string;
  earningsThreshold: number; // lifetime earnings to unlock
  windowView: string; // flavor text for the window view
  deskStyle: string;
  chairStyle: string;
}

export const DECOR_TIERS: DecorTierDef[] = [
  { id: 'garage', name: 'The Garage', emoji: '🏚️', description: 'A cramped garage with a folding table and dreams.', earningsThreshold: 0, windowView: 'A dumpster and a stray cat', deskStyle: 'Folding table', chairStyle: 'Plastic chair' },
  { id: 'loft', name: 'The Loft', emoji: '🏠', description: 'A converted loft space — you can almost stand up straight.', earningsThreshold: 200, windowView: 'A fire escape and some pigeons', deskStyle: 'IKEA desk', chairStyle: 'Thrift store office chair' },
  { id: 'office', name: 'The Office', emoji: '🏢', description: 'A proper office with actual walls and a door that locks.', earningsThreshold: 1000, windowView: 'The Sunset Strip', deskStyle: 'Mahogany desk', chairStyle: 'Leather executive chair' },
  { id: 'penthouse', name: 'The Penthouse', emoji: '🏙️', description: 'Corner office, 40th floor. The city sprawls beneath you.', earningsThreshold: 5000, windowView: 'The Hollywood sign at sunset', deskStyle: 'Italian marble desk', chairStyle: 'Herman Miller Aeron' },
  { id: 'mansion', name: 'The Mansion', emoji: '🏰', description: 'A studio compound rivaling the Golden Age moguls.', earningsThreshold: 15000, windowView: 'Your private vineyard and helipad', deskStyle: 'Antique oak executive desk', chairStyle: 'Custom throne-style chair' },
];

export function getCurrentDecorTier(stats?: LifetimeStats): DecorTierDef {
  const s = stats ?? getLifetimeStats();
  let current = DECOR_TIERS[0];
  for (const tier of DECOR_TIERS) {
    if (s.totalRevenue >= tier.earningsThreshold) current = tier;
  }
  return current;
}

export function getNextDecorTier(stats?: LifetimeStats): DecorTierDef | null {
  const current = getCurrentDecorTier(stats);
  const idx = DECOR_TIERS.findIndex(t => t.id === current.id);
  return idx < DECOR_TIERS.length - 1 ? DECOR_TIERS[idx + 1] : null;
}

export function getDecorProgress(stats?: LifetimeStats): number {
  const s = stats ?? getLifetimeStats();
  const current = getCurrentDecorTier(s);
  const next = getNextDecorTier(s);
  if (!next) return 1;
  const range = next.earningsThreshold - current.earningsThreshold;
  const progress = s.totalRevenue - current.earningsThreshold;
  return Math.min(1, Math.max(0, progress / range));
}

// ─── NAMEPLATE STYLES ───

export interface NameplateStyle {
  id: string;
  name: string;
  fontFamily: string;
  color: string;
  unlockCondition: string; // human-readable
  isUnlocked: (stats: LifetimeStats) => boolean;
}

export const NAMEPLATE_STYLES: NameplateStyle[] = [
  { id: 'classic', name: 'Classic', fontFamily: "'Bebas Neue', sans-serif", color: '#d4a843', unlockCondition: 'Default', isUnlocked: () => true },
  { id: 'neon', name: 'Neon', fontFamily: "'Bebas Neue', sans-serif", color: '#ff00ff', unlockCondition: 'Produce 10 films', isUnlocked: (s) => s.totalFilmsProduced >= 10 },
  { id: 'golden', name: 'Golden Age', fontFamily: "'Georgia', serif", color: '#ffd700', unlockCondition: 'Earn $500M lifetime', isUnlocked: (s) => s.totalRevenue >= 500 },
  { id: 'noir', name: 'Noir', fontFamily: "'Courier New', monospace", color: '#c0c0c0', unlockCondition: 'Win 5 runs', isUnlocked: (s) => s.totalWins >= 5 },
  { id: 'blockbuster', name: 'Blockbuster', fontFamily: "'Impact', sans-serif", color: '#ff4444', unlockCondition: 'Produce 10 blockbusters', isUnlocked: (s) => s.totalBlockbusters >= 10 },
  { id: 'holographic', name: 'Holographic', fontFamily: "'Bebas Neue', sans-serif", color: '#00ffcc', unlockCondition: 'Master 3 genres', isUnlocked: (s) => Object.values(s.genreFilmCounts).filter(c => c >= 10).length >= 3 },
];

export function getUnlockedNameplates(): NameplateStyle[] {
  const stats = getLifetimeStats();
  return NAMEPLATE_STYLES.filter(n => n.isUnlocked(stats));
}

// ─── CARD BACK DESIGNS ───

export type CardBackId = 'default' | 'filmStrip' | 'starField' | 'artDeco' | 'neonGrid' | 'vintage' | 'minimalist' | 'holographic';

export interface CardBackDesign {
  id: CardBackId;
  name: string;
  emoji: string;
  description: string;
  unlockCondition: string;
  isUnlocked: (stats: LifetimeStats, achievementCount: number) => boolean;
  // CSS properties for rendering
  background: string;
  borderColor: string;
  pattern: string; // CSS pattern description
}

export const CARD_BACK_DESIGNS: CardBackDesign[] = [
  {
    id: 'default', name: 'Classic', emoji: '🎬', description: 'The standard studio card back.',
    unlockCondition: 'Default',
    isUnlocked: () => true,
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    borderColor: '#d4a843',
    pattern: 'radial-gradient(circle at 50% 50%, rgba(212,168,67,0.15) 0%, transparent 70%)',
  },
  {
    id: 'filmStrip', name: 'Film Strip', emoji: '🎞️', description: 'Sprocket holes line the edges like 35mm film.',
    unlockCondition: 'Produce 25 films',
    isUnlocked: (s) => s.totalFilmsProduced >= 25,
    background: 'linear-gradient(180deg, #1a1a1a 0%, #2a2a2a 100%)',
    borderColor: '#888',
    pattern: 'repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(255,255,255,0.08) 8px, rgba(255,255,255,0.08) 10px)',
  },
  {
    id: 'starField', name: 'Star Field', emoji: '✨', description: 'A cosmic field of twinkling stars.',
    unlockCondition: 'Earn $1,000M lifetime',
    isUnlocked: (s) => s.totalRevenue >= 1000,
    background: 'radial-gradient(ellipse at 30% 20%, #1a0533 0%, #0a0a1a 100%)',
    borderColor: '#9b59b6',
    pattern: 'radial-gradient(1px 1px at 20% 30%, white 50%, transparent 50%), radial-gradient(1px 1px at 40% 70%, white 50%, transparent 50%), radial-gradient(1px 1px at 60% 20%, rgba(155,89,182,0.8) 50%, transparent 50%), radial-gradient(1px 1px at 80% 50%, white 50%, transparent 50%), radial-gradient(1px 1px at 10% 80%, rgba(255,215,0,0.6) 50%, transparent 50%), radial-gradient(1px 1px at 70% 90%, white 50%, transparent 50%)',
  },
  {
    id: 'artDeco', name: 'Art Deco', emoji: '🏛️', description: 'Geometric elegance from the golden age of cinema.',
    unlockCondition: 'Win 10 runs',
    isUnlocked: (s) => s.totalWins >= 10,
    background: 'linear-gradient(135deg, #1a1408 0%, #2a2010 100%)',
    borderColor: '#ffd700',
    pattern: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,215,0,0.06) 10px, rgba(255,215,0,0.06) 12px), repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(255,215,0,0.06) 10px, rgba(255,215,0,0.06) 12px)',
  },
  {
    id: 'neonGrid', name: 'Neon Grid', emoji: '🌐', description: 'A retro-futuristic grid pulsing with neon light.',
    unlockCondition: 'Unlock 15 achievements',
    isUnlocked: (_s, achCount) => achCount >= 15,
    background: 'linear-gradient(180deg, #0a0020 0%, #150030 100%)',
    borderColor: '#ff00ff',
    pattern: 'repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(255,0,255,0.12) 18px, rgba(255,0,255,0.12) 19px), repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(0,255,255,0.08) 18px, rgba(0,255,255,0.08) 19px)',
  },
  {
    id: 'vintage', name: 'Vintage', emoji: '📜', description: 'Sepia-toned parchment with a film noir vibe.',
    unlockCondition: 'Produce 50 films',
    isUnlocked: (s) => s.totalFilmsProduced >= 50,
    background: 'linear-gradient(135deg, #2c1810 0%, #3d2417 50%, #2c1810 100%)',
    borderColor: '#cd853f',
    pattern: 'radial-gradient(ellipse at 50% 0%, rgba(205,133,63,0.15) 0%, transparent 60%)',
  },
  {
    id: 'minimalist', name: 'Minimalist', emoji: '◻️', description: 'Clean lines. Nothing wasted.',
    unlockCondition: 'Win streak of 3+',
    isUnlocked: (s) => s.longestWinStreak >= 3,
    background: '#0f0f0f',
    borderColor: '#444',
    pattern: 'linear-gradient(0deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
  },
  {
    id: 'holographic', name: 'Holographic', emoji: '🌈', description: 'Shimmering prismatic foil. The ultimate flex.',
    unlockCondition: 'Earn $10,000M lifetime',
    isUnlocked: (s) => s.totalRevenue >= 10000,
    background: 'linear-gradient(135deg, #ff006620 0%, #00ff6620 25%, #0066ff20 50%, #ff00ff20 75%, #ffff0020 100%)',
    borderColor: '#00ffcc',
    pattern: 'linear-gradient(135deg, rgba(255,0,102,0.15) 0%, rgba(0,255,102,0.15) 25%, rgba(0,102,255,0.15) 50%, rgba(255,0,255,0.15) 75%, rgba(255,255,0,0.15) 100%)',
  },
];

export function getUnlockedCardBacks(): CardBackDesign[] {
  const stats = getLifetimeStats();
  const achCount = getUnlockedAchievements().length;
  return CARD_BACK_DESIGNS.filter(d => d.isUnlocked(stats, achCount));
}

// ─── BANNER THEMES ───

export type BannerThemeId = 'default' | 'golden' | 'noir' | 'neon' | 'vintage' | 'prestige';

export interface BannerTheme {
  id: BannerThemeId;
  name: string;
  textColor: string;
  accentColor: string;
  bgGradient: string;
  unlockCondition: string;
  isUnlocked: (stats: LifetimeStats) => boolean;
}

export const BANNER_THEMES: BannerTheme[] = [
  { id: 'default', name: 'Classic', textColor: '#d4a843', accentColor: '#d4a843', bgGradient: 'none', unlockCondition: 'Default', isUnlocked: () => true },
  { id: 'golden', name: 'Golden Age', textColor: '#ffd700', accentColor: '#ffd700', bgGradient: 'linear-gradient(180deg, rgba(255,215,0,0.08) 0%, transparent 100%)', unlockCondition: 'Earn $2,000M lifetime', isUnlocked: (s) => s.totalRevenue >= 2000 },
  { id: 'noir', name: 'Noir', textColor: '#c0c0c0', accentColor: '#888', bgGradient: 'linear-gradient(180deg, rgba(192,192,192,0.05) 0%, transparent 100%)', unlockCondition: 'Win 15 runs', isUnlocked: (s) => s.totalWins >= 15 },
  { id: 'neon', name: 'Neon', textColor: '#ff00ff', accentColor: '#00ffff', bgGradient: 'linear-gradient(180deg, rgba(255,0,255,0.06) 0%, rgba(0,255,255,0.03) 100%)', unlockCondition: 'Unlock 20 achievements', isUnlocked: () => getUnlockedAchievements().length >= 20 },
  { id: 'vintage', name: 'Vintage', textColor: '#cd853f', accentColor: '#8b4513', bgGradient: 'linear-gradient(180deg, rgba(205,133,63,0.08) 0%, transparent 100%)', unlockCondition: 'Produce 100 films', isUnlocked: (s) => s.totalFilmsProduced >= 100 },
  { id: 'prestige', name: 'Prestige', textColor: '#bb86fc', accentColor: '#9b59b6', bgGradient: 'linear-gradient(180deg, rgba(155,89,182,0.08) 0%, transparent 100%)', unlockCondition: 'Master 5 genres', isUnlocked: (s) => Object.values(s.genreFilmCounts).filter(c => c >= 10).length >= 5 },
];

// ─── PERSISTENT STATE ───

export interface StudioCustomization {
  motto: string;
  foundingYear: number;
  selectedNameplate: string;
  selectedCardBack: CardBackId;
  selectedBanner: BannerThemeId;
}

const DEFAULT_MOTTOS = [
  'Lights, Camera, Chaos.',
  'Where stories come alive.',
  'Dream bigger. Film bolder.',
  'Every frame tells a story.',
  'The show must go on.',
];

function getDefaultMotto(): string {
  return DEFAULT_MOTTOS[Math.floor(Math.random() * DEFAULT_MOTTOS.length)];
}

export function getStudioCustomization(): StudioCustomization {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        motto: parsed.motto || getDefaultMotto(),
        foundingYear: parsed.foundingYear || new Date().getFullYear(),
        selectedNameplate: parsed.selectedNameplate || 'classic',
        selectedCardBack: parsed.selectedCardBack || 'default',
        selectedBanner: parsed.selectedBanner || 'default',
      };
    }
  } catch {}
  return {
    motto: getDefaultMotto(),
    foundingYear: new Date().getFullYear(),
    selectedNameplate: 'classic',
    selectedCardBack: 'default',
    selectedBanner: 'default',
  };
}

export function saveStudioCustomization(custom: Partial<StudioCustomization>): void {
  const current = getStudioCustomization();
  const updated = { ...current, ...custom };
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(updated)); } catch {}
}

export function getSelectedCardBackDesign(): CardBackDesign {
  const custom = getStudioCustomization();
  return CARD_BACK_DESIGNS.find(d => d.id === custom.selectedCardBack) ?? CARD_BACK_DESIGNS[0];
}

export function getSelectedNameplate(): NameplateStyle {
  const custom = getStudioCustomization();
  return NAMEPLATE_STYLES.find(n => n.id === custom.selectedNameplate) ?? NAMEPLATE_STYLES[0];
}

export function getSelectedBanner(): BannerTheme {
  const custom = getStudioCustomization();
  return BANNER_THEMES.find(b => b.id === custom.selectedBanner) ?? BANNER_THEMES[0];
}

// ─── OFFICE EASTER EGGS ───

export interface OfficeItem {
  id: string;
  name: string;
  emoji: string;
  flavorTexts: string[];
  minTier: DecorTier;
}

export const OFFICE_ITEMS: OfficeItem[] = [
  { id: 'desk', name: 'Desk', emoji: '🪑', flavorTexts: ['Covered in unread scripts.', 'There\'s a coffee ring from 2019.', 'A drawer full of rejection letters.'], minTier: 'garage' },
  { id: 'phone', name: 'Phone', emoji: '📞', flavorTexts: ['Your agent is on line 3. Again.', '"We need to talk about the budget..."', 'It hasn\'t stopped ringing since the Blockbuster.'], minTier: 'garage' },
  { id: 'poster', name: 'Movie Poster', emoji: '🖼️', flavorTexts: ['Your first film. Framed with love and delusion.', 'The critics hated it. You love it anyway.', '"Coming Soon" — it\'s been 3 years.'], minTier: 'loft' },
  { id: 'plant', name: 'Office Plant', emoji: '🌿', flavorTexts: ['Surprisingly alive. Unlike your last three projects.', 'Named it "Oscar." Still waiting.', 'The only thing in this office that grows consistently.'], minTier: 'loft' },
  { id: 'award', name: 'Award Shelf', emoji: '🏆', flavorTexts: ['Mostly participation trophies. For now.', 'One day this shelf will need reinforcement.', 'You dust them every morning. All three of them.'], minTier: 'office' },
  { id: 'minibar', name: 'Mini Bar', emoji: '🥃', flavorTexts: ['For celebrating wins. And mourning losses.', 'The good stuff is locked. Budget reasons.', 'Champagne for blockbusters, whiskey for flops.'], minTier: 'penthouse' },
  { id: 'telescope', name: 'Telescope', emoji: '🔭', flavorTexts: ['You can see the competition from here.', 'Pointed at the Hollywood sign. Aspirational.', 'Is that... a rival studio exec crying?'], minTier: 'penthouse' },
  { id: 'pool', name: 'Rooftop Pool', emoji: '🏊', flavorTexts: ['Shaped like an Oscar. Obviously.', 'The talent love it. So does the insurance company.', 'Heated by the burning passion for cinema. And gas.'], minTier: 'mansion' },
];

export function getAvailableItems(tier: DecorTier): OfficeItem[] {
  const tierOrder: DecorTier[] = ['garage', 'loft', 'office', 'penthouse', 'mansion'];
  const tierIdx = tierOrder.indexOf(tier);
  return OFFICE_ITEMS.filter(item => tierOrder.indexOf(item.minTier) <= tierIdx);
}

export function getRandomFlavorText(item: OfficeItem): string {
  return item.flavorTexts[Math.floor(Math.random() * item.flavorTexts.length)];
}

// ─── TROPHY DISPLAY DATA ───

export interface OfficeTrophy {
  id: string;
  name: string;
  emoji: string;
}

export function getOfficeTrophies(): OfficeTrophy[] {
  const achievements = getUnlockedAchievements();
  const trophies: OfficeTrophy[] = [];
  // Show first 8 achievements as trophies
  for (const ach of achievements.slice(0, 8)) {
    trophies.push({ id: ach.id, name: ach.name, emoji: ach.emoji });
  }
  return trophies;
}
