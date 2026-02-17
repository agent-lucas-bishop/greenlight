/**
 * R281: React hooks for audio engine integration.
 */

import { useCallback, useEffect, useRef } from 'react';
import { AudioEngine, getAudioEngine } from './audioEngine';
import type { Genre } from './types';

/** Returns the AudioEngine singleton */
export function useAudioEngine(): AudioEngine {
  return getAudioEngine();
}

/** Returns a play function for a named sound */
export function useUISound(soundName: string): () => void {
  const engine = getAudioEngine();
  return useCallback(() => {
    engine.init();
    engine.play(soundName);
  }, [soundName, engine]);
}

/** Manages ambient drone lifecycle tied to component mount/genre */
export function useMusicLayer(genre?: Genre | string): void {
  const engineRef = useRef(getAudioEngine());

  useEffect(() => {
    const engine = engineRef.current;
    if (genre) {
      engine.init();
      engine.playAmbientDrone(genre);
    }
    return () => {
      engine.stopAmbientDrone();
    };
  }, [genre]);
}
