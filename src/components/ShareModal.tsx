/**
 * R244: Share Modal — Social sharing UI after each film or end of run.
 * Preview of canvas share card, share buttons, platform-specific text.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { RunShareData } from '../sharing';
import {
  generateShareCard,
  generateTextSummary,
  generateTwitterText,
  generateShareText,
  getTwitterIntentUrl,
  copyToClipboard,
  shareResult,
  downloadShareCard,
  generateShareUrl,
} from '../sharing';
import { sfx } from '../sound';

interface ShareModalProps {
  data: RunShareData;
  onClose: () => void;
  /** Show compact version (e.g. after single film) vs full (end of run) */
  compact?: boolean;
}

export default function ShareModal({ data, onClose, compact = false }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [tab, setTab] = useState<'card' | 'text'>('card');
  const previewRef = useRef<HTMLImageElement>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  // Generate canvas preview on mount
  useEffect(() => {
    try {
      const canvas = generateShareCard(data);
      setPreviewSrc(canvas.toDataURL('image/png'));
    } catch {
      // Canvas generation may fail in some environments
    }
  }, [data]);

  const handleNativeShare = useCallback(async () => {
    sfx.shareSnap();
    const result = await shareResult('both', data);
    if (result.success) {
      setShareStatus(result.method === 'native' ? 'Shared!' : 'Copied to clipboard!');
    } else {
      setShareStatus('Share cancelled');
    }
    setTimeout(() => setShareStatus(null), 2000);
  }, [data]);

  const handleCopyText = useCallback(async () => {
    sfx.shareCopy();
    const text = generateTextSummary(data);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [data]);

  const handleCopyLink = useCallback(async () => {
    sfx.shareCopy();
    const url = generateShareUrl(data);
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }, [data]);

  const handleDownload = useCallback(async () => {
    if (downloading) return;
    sfx.shareSnap();
    setDownloading(true);
    await downloadShareCard(data);
    setDownloading(false);
  }, [data, downloading]);

  const handleTweet = useCallback(() => {
    sfx.shareSnap();
    const text = generateTwitterText(data);
    window.open(getTwitterIntentUrl(text), '_blank', 'noopener,noreferrer');
  }, [data]);

  const twitterText = generateTwitterText(data);
  const fullText = generateTextSummary(data);
  const shortText = generateShareText(data);

  return (
    <div className="share-card-overlay" onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, animation: 'fadeIn 0.3s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: 460, width: '100%', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{
            color: '#d4a843', fontFamily: 'Bebas Neue', fontSize: '1.5rem',
            letterSpacing: 3,
          }}>
            📸 SHARE YOUR {compact ? 'FILM' : 'RUN'}
          </div>
          {shareStatus && (
            <div style={{
              color: '#2ecc71', fontSize: '0.8rem', marginTop: 4,
              animation: 'fadeIn 0.2s ease',
            }}>
              {shareStatus}
            </div>
          )}
        </div>

        {/* Tab switcher */}
        {!compact && (
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 12 }}>
            <button onClick={() => setTab('card')} style={{
              background: tab === 'card' ? 'rgba(212,168,67,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${tab === 'card' ? 'rgba(212,168,67,0.4)' : 'rgba(255,255,255,0.1)'}`,
              color: tab === 'card' ? '#d4a843' : '#888',
              padding: '6px 16px', borderRadius: 6, cursor: 'pointer',
              fontFamily: 'Bebas Neue', fontSize: '0.85rem', letterSpacing: 1,
            }}>
              📸 Card
            </button>
            <button onClick={() => setTab('text')} style={{
              background: tab === 'text' ? 'rgba(212,168,67,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${tab === 'text' ? 'rgba(212,168,67,0.4)' : 'rgba(255,255,255,0.1)'}`,
              color: tab === 'text' ? '#d4a843' : '#888',
              padding: '6px 16px', borderRadius: 6, cursor: 'pointer',
              fontFamily: 'Bebas Neue', fontSize: '0.85rem', letterSpacing: 1,
            }}>
              📝 Text
            </button>
          </div>
        )}

        {/* Card preview */}
        {(tab === 'card' || compact) && previewSrc && (
          <div style={{
            borderRadius: 12, overflow: 'hidden', marginBottom: 16,
            border: '2px solid rgba(212,168,67,0.3)',
          }}>
            <img
              ref={previewRef}
              src={previewSrc}
              alt="Share card preview"
              style={{ width: '100%', display: 'block' }}
            />
          </div>
        )}

        {/* Text preview */}
        {tab === 'text' && !compact && (
          <div style={{ marginBottom: 16 }}>
            {/* Twitter-length */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ color: '#1da1f2', fontSize: '0.7rem', fontFamily: 'Bebas Neue', letterSpacing: 1, marginBottom: 4 }}>
                TWITTER / X ({twitterText.length}/280)
              </div>
              <div style={{
                background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(29,161,242,0.3)',
                borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace',
                fontSize: '0.78rem', color: '#ddd', whiteSpace: 'pre-line', lineHeight: 1.6,
              }}>
                {twitterText}
              </div>
            </div>
            {/* Full text */}
            <div>
              <div style={{ color: '#d4a843', fontSize: '0.7rem', fontFamily: 'Bebas Neue', letterSpacing: 1, marginBottom: 4 }}>
                FULL SUMMARY
              </div>
              <div style={{
                background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(212,168,67,0.2)',
                borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace',
                fontSize: '0.75rem', color: '#ddd', whiteSpace: 'pre-line', lineHeight: 1.6,
                maxHeight: 200, overflowY: 'auto',
              }}>
                {fullText}
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
        }}>
          {/* Native share (mobile) */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button onClick={handleNativeShare} style={{
              gridColumn: 'span 2',
              background: 'linear-gradient(135deg, rgba(212,168,67,0.25), rgba(155,89,182,0.15))',
              border: '2px solid rgba(212,168,67,0.5)',
              color: '#d4a843', padding: '12px 20px', borderRadius: 10, cursor: 'pointer',
              fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: 2,
            }}>
              📤 Share...
            </button>
          )}

          <button onClick={handleTweet} style={{
            background: 'rgba(29,161,242,0.15)', border: '1px solid rgba(29,161,242,0.4)',
            color: '#1da1f2', padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'Bebas Neue', fontSize: '0.85rem', letterSpacing: 1,
          }}>
            🐦 Post to X
          </button>

          <button onClick={handleCopyLink} style={{
            background: copiedLink ? 'rgba(46,204,113,0.2)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${copiedLink ? '#2ecc71' : 'rgba(255,255,255,0.15)'}`,
            color: copiedLink ? '#2ecc71' : '#ccc',
            padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'Bebas Neue', fontSize: '0.85rem', letterSpacing: 1,
            transition: 'all 0.3s',
          }}>
            {copiedLink ? '✅ Link Copied!' : '🔗 Copy Link'}
          </button>

          <button onClick={handleCopyText} style={{
            background: copied ? 'rgba(46,204,113,0.2)' : 'rgba(212,168,67,0.12)',
            border: `1px solid ${copied ? '#2ecc71' : 'rgba(212,168,67,0.3)'}`,
            color: copied ? '#2ecc71' : '#d4a843',
            padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'Bebas Neue', fontSize: '0.85rem', letterSpacing: 1,
            transition: 'all 0.3s',
          }}>
            {copied ? '✅ Copied!' : '📋 Copy Text'}
          </button>

          <button onClick={handleDownload} disabled={downloading} style={{
            background: 'rgba(155,89,182,0.15)', border: '1px solid rgba(155,89,182,0.4)',
            color: '#bb86fc', padding: '10px 16px', borderRadius: 8,
            cursor: downloading ? 'wait' : 'pointer',
            fontFamily: 'Bebas Neue', fontSize: '0.85rem', letterSpacing: 1,
            opacity: downloading ? 0.6 : 1,
          }}>
            {downloading ? '⏳ Saving...' : '💾 Download Image'}
          </button>
        </div>

        {/* Close */}
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#666',
            cursor: 'pointer', fontSize: '0.75rem', padding: '8px 16px',
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
