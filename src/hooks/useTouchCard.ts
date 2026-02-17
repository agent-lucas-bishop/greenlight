import { useState, useCallback } from 'react';

/**
 * Touch-friendly card interaction: tap to select, tap again (or tap play) to play.
 * Returns selected index and handlers.
 */
export function useTouchCard(onPlay: (index: number) => void) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleTap = useCallback((index: number) => {
    if (selectedIndex === index) {
      // Second tap on same card → play it
      onPlay(index);
      setSelectedIndex(null);
    } else {
      // First tap → select
      setSelectedIndex(index);
    }
  }, [selectedIndex, onPlay]);

  const clearSelection = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  const playSelected = useCallback(() => {
    if (selectedIndex !== null) {
      onPlay(selectedIndex);
      setSelectedIndex(null);
    }
  }, [selectedIndex, onPlay]);

  return { selectedIndex, handleTap, clearSelection, playSelected };
}
