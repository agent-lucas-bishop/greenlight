// R313: Achievement Showcase — pick up to 3 achievements to display on leaderboard/studio card
const SHOWCASE_KEY = 'greenlight_achievement_showcase';

export function getAchievementShowcase(): string[] {
  try {
    const raw = localStorage.getItem(SHOWCASE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function setAchievementShowcase(ids: string[]): void {
  try {
    localStorage.setItem(SHOWCASE_KEY, JSON.stringify(ids.slice(0, 3)));
  } catch {}
}

export function toggleShowcaseAchievement(id: string): string[] {
  const current = getAchievementShowcase();
  if (current.includes(id)) {
    const updated = current.filter(x => x !== id);
    setAchievementShowcase(updated);
    return updated;
  }
  if (current.length >= 3) return current; // max 3
  const updated = [...current, id];
  setAchievementShowcase(updated);
  return updated;
}
