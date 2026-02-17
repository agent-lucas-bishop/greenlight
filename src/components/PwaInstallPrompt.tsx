import { useState, useEffect, useCallback } from 'react';

const VISIT_KEY = 'greenlight_visit_count';
const DISMISS_KEY = 'greenlight_pwa_dismissed';
const MIN_VISITS = 2;

// Track the deferred prompt globally so it survives re-renders
let deferredPrompt: any = null;

export default function PwaInstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Don't show if already installed (standalone) or previously dismissed
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    // Increment visit count
    const visits = Number(localStorage.getItem(VISIT_KEY) || 0) + 1;
    localStorage.setItem(VISIT_KEY, String(visits));
    if (visits < MIN_VISITS) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    setShow(false);
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1');
    setShow(false);
  }, []);

  if (!show) return null;

  return (
    <div className="pwa-install-bar">
      <span className="pwa-install-text">📲 Add Greenlight to your home screen</span>
      <div className="pwa-install-actions">
        <button className="pwa-install-btn" onClick={handleInstall}>Install</button>
        <button className="pwa-install-dismiss" onClick={handleDismiss} aria-label="Dismiss">✕</button>
      </div>
    </div>
  );
}
