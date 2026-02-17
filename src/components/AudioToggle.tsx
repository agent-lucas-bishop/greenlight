/**
 * R281: AudioToggle — Simple mute/unmute button for the header.
 */

import { useState, useCallback } from 'react';
import { getAudioEngine } from '../audioEngine';
import { getSettings } from '../settings';

export default function AudioToggle() {
  const engine = getAudioEngine();
  const [muted, setMutedState] = useState(engine.muted);
  const volume = getSettings().audio.masterVolume;

  const handleClick = useCallback(() => {
    engine.init(); // ensure AudioContext on first interaction
    const nowMuted = engine.toggleMute();
    setMutedState(nowMuted);
    if (!nowMuted) engine.playClick();
  }, [engine]);

  const icon = muted ? '🔇' : volume > 50 ? '🔊' : volume > 0 ? '🔉' : '🔈';
  const label = muted ? 'Unmute sound' : 'Mute sound';
  const tooltip = muted ? 'Sound: OFF' : `Volume: ${volume}%`;

  return (
    <button
      onClick={handleClick}
      aria-label={label}
      title={tooltip}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1.2rem',
        padding: '4px 8px',
        opacity: muted ? 0.5 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {icon}
    </button>
  );
}
