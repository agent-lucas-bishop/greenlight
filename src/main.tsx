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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <Analytics />
      <SpeedInsights />
    </ErrorBoundary>
  </StrictMode>,
)
