import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import ErrorBoundary from './components/ErrorBoundary'
import { setPrestigeChangeCallback } from './prestige'
import { refreshPrestigeLevelCache } from './data'
import './index.css'
import App from './App.tsx'

// Wire prestige → data cache sync (avoids circular import)
setPrestigeChangeCallback(refreshPrestigeLevelCache)

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <Analytics />
      <SpeedInsights />
    </ErrorBoundary>
  </StrictMode>,
)
