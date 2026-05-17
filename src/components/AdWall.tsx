'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface AdData {
  id: number;
  type: string;
  title: string;
  url: string;
  duration: number;
}

interface Props {
  onComplete: () => void;
  bookId: number;
  chapterId: number;
}

export default function AdWall({ onComplete, bookId, chapterId }: Props) {
  const t = useTranslations('ad');
  const [ad, setAd] = useState<AdData | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    fetch('/api/ads/active')
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setAd(d.data);
          setSecondsLeft(d.data.duration || 10);
        } else {
          onComplete();
        }
      })
      .catch(() => onComplete());
  }, [onComplete]);

  useEffect(() => {
    if (!ad) return;
    if (secondsLeft <= 0) {
      setCanSkip(true);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [ad, secondsLeft]);

  const handleSkip = () => {
    if (ad) {
      fetch('/api/ads/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId: ad.id, bookId, chapterId, completed: canSkip ? 1 : 0 }),
      }).catch(() => {});
    }
    onComplete();
  };

  if (!ad) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 max-w-lg rounded-2xl p-8 text-center"
        style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <p className="mb-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{t('message')}</p>
        <h3 className="mb-6 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{ad.title || t('title')}</h3>

        {ad.type === 'image' ? (
          <img src={ad.url} alt="Ad" className="mx-auto mb-6 max-h-60 rounded-lg object-contain" />
        ) : ad.type === 'video' ? (
          <video src={ad.url} autoPlay muted className="mx-auto mb-6 max-h-60 rounded-lg" />
        ) : (
          <div className="mx-auto mb-6 flex h-40 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'var(--bg-primary)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{ad.title}</span>
          </div>
        )}

        {canSkip ? (
          <button onClick={handleSkip}
            className="rounded-lg px-8 py-3 font-medium text-white transition-opacity hover:opacity-85"
            style={{ backgroundColor: 'var(--accent)' }}>
            {t('skipNow')}
          </button>
        ) : (
          <button onClick={handleSkip}
            className="rounded-lg border px-8 py-3 text-sm transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            {t('skip', { seconds: secondsLeft })}
          </button>
        )}
      </div>
    </div>
  );
}
