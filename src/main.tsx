import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import ErrorBoundary from './components/ErrorBoundary'
import { setPrestigeChangeCallback } from './prestige'
import { refreshPrestigeLevelCache } from './data'
import { runMigrations, trimLargeData } from './storageManager'
import './index.css'
import './settings' // R241: Initialize centralized settings (applies CSS classes + audio on load)
import App from './App.tsx'
import LandingPage from './components/LandingPage'

// Wire prestige → data cache sync (avoids circular import)
setPrestigeChangeCallback(refreshPrestigeLevelCache)

// R203: Run storage migrations and trim oversized data on startup
runMigrations();
trimLargeData();

// Restore persisted settings
if (localStorage.getItem('greenlight-reduce-motion') === 'true') {
  document.documentElement.classList.add('force-reduce-motion');
}
if (localStorage.getItem('greenlight-high-contrast') === 'true') {
  document.documentElement.classList.add('high-contrast');
}
if (localStorage.getItem('greenlight-colorblind') === 'true') {
  document.documentElement.classList.add('colorblind-mode');
}
{
  const ts = localStorage.getItem('greenlight-text-size');
  if (ts === 'small' || ts === 'large') document.documentElement.dataset.textSize = ts;
}
{
  const as = localStorage.getItem('greenlight-anim-speed');
  if (as) document.documentElement.style.setProperty('--animation-speed', as);
}

// R290: Global chunk error recovery for lazy-load failures outside React render cycle
// (e.g. navigation-triggered dynamic imports that reject before React can catch them)
window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || String(event.reason || '');
  const isChunk =
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk');
  if (isChunk) {
    const key = 'greenlight_chunk_reload';
    const lastReload = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - lastReload > 30_000) {
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    }
  }
});

const isLanding = new URLSearchParams(window.location.search).get('landing') === 'true';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {isLanding ? <LandingPage /> : <App />}
      <Analytics />
      <SpeedInsights />
    </ErrorBoundary>
  </StrictMode>,
)
