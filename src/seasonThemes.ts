// R167: Seasonal Themes & Visual Variety

export interface SeasonTheme {
  name: string;
  icon: string;
  accent: string;
  bgTint: string;
  glow: string;
  weatherClass: string;
}

const SEASON_THEMES: Record<number, SeasonTheme> = {
  1: { name: 'Spring', icon: '🌱', accent: '#4caf50', bgTint: 'rgba(76,175,80,0.06)', glow: 'rgba(76,175,80,0.35)', weatherClass: 'weather-spring' },
  2: { name: 'Summer', icon: '☀️', accent: '#f0a030', bgTint: 'rgba(240,160,48,0.06)', glow: 'rgba(240,160,48,0.35)', weatherClass: 'weather-summer' },
  3: { name: 'Autumn', icon: '🍂', accent: '#e65100', bgTint: 'rgba(230,81,0,0.06)', glow: 'rgba(230,81,0,0.35)', weatherClass: 'weather-autumn' },
  4: { name: 'Winter', icon: '❄️', accent: '#64b5f6', bgTint: 'rgba(100,181,246,0.06)', glow: 'rgba(100,181,246,0.35)', weatherClass: 'weather-winter' },
};

const AWARDS_THEME: SeasonTheme = {
  name: 'Awards Season', icon: '🏆', accent: '#9c27b0', bgTint: 'rgba(156,39,176,0.06)', glow: 'rgba(212,168,67,0.4)', weatherClass: 'weather-awards',
};

export function getSeasonTheme(season: number): SeasonTheme {
  return SEASON_THEMES[season] || AWARDS_THEME;
}

export function applySeasonTheme(season: number): void {
  const theme = getSeasonTheme(season);
  const root = document.documentElement;
  root.style.setProperty('--season-accent', theme.accent);
  root.style.setProperty('--season-bg-tint', theme.bgTint);
  root.style.setProperty('--season-glow', theme.glow);
  // Remove old weather classes, add new
  root.classList.remove('weather-spring', 'weather-summer', 'weather-autumn', 'weather-winter', 'weather-awards');
  root.classList.add(theme.weatherClass);
}
