import { useState, useEffect, useCallback } from 'react';
import type { CutsceneData } from '../cutscenes';
import { resolveLines, markCutsceneSeen } from '../cutscenes';

interface CutsceneOverlayProps {
  cutscene: CutsceneData;
  vars?: Record<string, string>;
  onComplete: () => void;
}

/**
 * R183: Full-screen cinematic overlay with typewriter text,
 * letterbox bars, atmospheric gradient, and continue button.
 */
export default function CutsceneOverlay({ cutscene, vars = {}, onComplete }: CutsceneOverlayProps) {
  const lines = resolveLines(cutscene, vars);
  const speed = cutscene.typingSpeed ?? 35;

  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [completedLines, setCompletedLines] = useState<string[]>([]);
  const [showContinue, setShowContinue] = useState(false);
  const [exiting, setExiting] = useState(false);

  const currentLine = lines[lineIndex] ?? '';
  const displayedText = currentLine.slice(0, charIndex);
  const allDone = lineIndex >= lines.length;

  // Typewriter effect
  useEffect(() => {
    if (allDone) {
      const t = setTimeout(() => setShowContinue(true), 400);
      return () => clearTimeout(t);
    }
    if (charIndex < currentLine.length) {
      const t = setTimeout(() => setCharIndex(c => c + 1), speed);
      return () => clearTimeout(t);
    }
    // Line complete — pause then advance
    const t = setTimeout(() => {
      setCompletedLines(prev => [...prev, currentLine]);
      setLineIndex(i => i + 1);
      setCharIndex(0);
    }, 600);
    return () => clearTimeout(t);
  }, [charIndex, lineIndex, allDone, currentLine, speed]);

  const handleSkip = useCallback(() => {
    if (exiting) return;
    // If still typing, skip to end
    if (!allDone) {
      setCompletedLines(lines);
      setLineIndex(lines.length);
      setCharIndex(0);
      setShowContinue(true);
      return;
    }
    // Continue
    setExiting(true);
    markCutsceneSeen(cutscene.id);
    setTimeout(onComplete, 500);
  }, [allDone, exiting, lines, cutscene.id, onComplete]);

  // Click or key anywhere to skip/continue
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleSkip]);

  return (
    <div
      className={`cutscene-overlay ${exiting ? 'cutscene-exit' : 'cutscene-enter'}`}
      onClick={handleSkip}
      role="dialog"
      aria-label="Story moment"
      style={{ background: cutscene.gradient }}
    >
      {/* Letterbox bars */}
      <div className="cutscene-letterbox cutscene-letterbox-top" />
      <div className="cutscene-letterbox cutscene-letterbox-bottom" />

      {/* Content */}
      <div className="cutscene-content">
        {completedLines.map((line, i) => (
          <p key={i} className="cutscene-line cutscene-line-done">{line}</p>
        ))}
        {!allDone && (
          <p className="cutscene-line cutscene-line-active">
            {displayedText}
            <span className="cutscene-cursor">▊</span>
          </p>
        )}
      </div>

      {/* Continue prompt */}
      {showContinue && (
        <div className="cutscene-continue">
          <span>CONTINUE</span>
          <span className="cutscene-continue-arrow">▸</span>
        </div>
      )}

      {/* Skip hint */}
      {!showContinue && (
        <div className="cutscene-skip-hint">click or press space to skip</div>
      )}
    </div>
  );
}
