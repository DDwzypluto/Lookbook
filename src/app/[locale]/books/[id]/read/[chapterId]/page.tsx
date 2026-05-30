'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';
import { useFontSize } from '@/hooks/useFontSize';
import { useTheme } from '@/providers/ThemeProvider';
import ReaderSettings from '@/components/ReaderSettings';
import TTSPlayer from '@/components/TTSPlayer';
import AdWall from '@/components/AdWall';
import InArticleAd from '@/components/InArticleAd';

interface ChapterData {
  chapter: {
    id: number;
    book_id: number;
    title: string;
    chapter_num: number;
    content: string;
    word_count: number;
  };
  prevChapterId: number | null;
  nextChapterId: number | null;
  bookLanguage?: string;
  translated?: { content: string; word_count: number } | null;
}

export default function ReaderPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('reader');
  const locale = useLocale();
  const bookId = Number(params.id);
  const chapterId = Number(params.chapterId);

  const [data, setData] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ttsActive, setTtsActive] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [translatedWords, setTranslatedWords] = useState(0);
  const [transError, setTransError] = useState('');
  const { containerRef, scrollToTop } = useReadingProgress(bookId, chapterId);
  const { size, increase, decrease, reset } = useFontSize();
  const { theme, setTheme } = useTheme();

  const fetchChapter = useCallback(async (cid: number) => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`/api/books/${bookId}/chapters/${cid}?lang=${locale}`);
      const d = await resp.json();
      if (d.error) throw new Error(d.error.message);
      setData(d.data);
      scrollToTop();
      setShowAd(true);

      const chNum = d.data.chapter.chapter_num;
      fetch(`/api/books/${bookId}/prefetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterNum: chNum, count: 3 }),
      }).catch(() => {});
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [bookId, scrollToTop]);

  useEffect(() => { fetchChapter(chapterId); }, [fetchChapter, chapterId]);

  const goToChapter = useCallback((cid: number | null) => {
    if (cid === null) return;
    router.push(`/books/${bookId}/read/${cid}`);
  }, [bookId, router]);

  const addBookmark = useCallback(() => {
    if (!data) return;
    fetch(`/api/books/${bookId}/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterId: data.chapter.id, note: data.chapter.title, chapterOffset: 0 }),
    }).then(() => {
      const el = document.createElement('div');
      el.textContent = t('bookmarkAdded');
      el.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:var(--accent);color:white;padding:8px 16px;border-radius:8px;font-size:14px;z-index:999;';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1500);
    }).catch(() => {});
  }, [data, bookId, t]);

  const toggleSettings = useCallback(() => setSettingsOpen(o => !o), []);

  useKeyboardNav({
    prevChapter: () => goToChapter(data?.prevChapterId ?? null),
    nextChapter: () => goToChapter(data?.nextChapterId ?? null),
    toggleSettings,
    addBookmark,
    contentRef: containerRef,
  });

  useEffect(() => {
    if (!loading && data && containerRef.current) {
      containerRef.current.focus();
    }
  }, [loading, data, containerRef]);

  if (loading) {
    return <div className="flex items-center justify-center py-40"><p style={{ color: 'var(--text-secondary)' }}>{t('loading')}</p></div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <Link href={`/books/${bookId}`} className="text-sm underline" style={{ color: 'var(--accent)' }}>{t('backToCatalog')}</Link>
      </div>
    );
  }

  if (!data) return null;

  const { chapter, prevChapterId, nextChapterId } = data;

  const handleTranslate = async () => {
    if (!data) return;
    setTranslating(true);
    setTransError('');
    try {
      const resp = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: data.chapter.content,
          from: data.bookLanguage || 'zh',
          to: locale,
          chapterId: data.chapter.id,
        }),
      });
      const tData = await resp.json();
      if (tData.error) throw new Error(tData.error);
      if (tData.content) {
        setTranslatedContent(tData.content);
        setTranslatedWords(tData.word_count || 0);
      }
    } catch (e: any) {
      setTransError(e.message || 'Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  const handleThemeChange = (th: string) => {
    setTheme(th === 'dark' ? 'dark' : th === 'green' ? 'green' : 'light');
  };

  // Use translated content if available
  const displayContent = translatedContent || data?.translated?.content || data?.chapter.content || '';
  const displayTitle = data?.chapter.title || '';
  const displayWords = translatedWords || data?.translated?.word_count || data?.chapter.word_count || 0;
  const needsTranslation = data?.bookLanguage && data.bookLanguage !== locale && !translatedContent && !data?.translated;

  return (
    <div className="relative mx-auto" style={{ maxWidth: 'var(--reader-width)' }}>
      {showAd && (
        <AdWall onComplete={() => setShowAd(false)} bookId={bookId} chapterId={chapterId} />
      )}
      {/* Top nav */}
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => goToChapter(prevChapterId)} disabled={!prevChapterId}
          className="rounded border px-3 py-1.5 text-sm transition-colors disabled:opacity-30"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          {t('prevChapter')}
        </button>
        <div className="text-center">
          <Link href={`/books/${bookId}`} className="text-xs underline" style={{ color: 'var(--text-secondary)' }}>{t('catalog')}</Link>
          <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{chapter.title}</p>
        </div>
        <button onClick={() => goToChapter(nextChapterId)} disabled={!nextChapterId}
          className="rounded border px-3 py-1.5 text-sm transition-colors disabled:opacity-30"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          {t('nextChapter')}
        </button>
      </div>

      {/* Reader content */}
      <div ref={containerRef} tabIndex={0}
        className="reader-content relative rounded-xl border p-8 leading-relaxed overflow-y-auto outline-none focus:ring-2 focus:ring-inset"
        style={{
          backgroundColor: 'var(--reader-bg)', borderColor: 'var(--border)', color: 'var(--reader-text)',
          fontSize: `var(--font-size-base)`, lineHeight: 'var(--line-height)',
          maxHeight: 'calc(100vh - 220px)', minHeight: '60vh', outline: 'none',
        }}>
        <h2 className="mb-6 text-center text-xl font-bold">{displayTitle}</h2>
        {needsTranslation && !translating && !transError && (
          <div className="mb-3 text-center">
            <button onClick={handleTranslate}
              className="rounded border px-3 py-1 text-xs transition-colors hover:opacity-80"
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
              {locale === 'zh' ? '🌐 AI 翻译为中文' : '🌐 AI Translate to English'}
            </button>
          </div>
        )}
        {translating && (
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            <p className="text-center text-sm" style={{ color: 'var(--accent)' }}>
              {locale === 'zh' ? '翻译中，请稍候...' : 'Translating, please wait...'}
            </p>
          </div>
        )}
        {transError && (
          <div className="mb-3 text-center">
            <p className="text-xs mb-1" style={{ color: '#e53e3e' }}>{transError}</p>
            <button onClick={handleTranslate} className="text-xs underline" style={{ color: 'var(--accent)' }}>
              {locale === 'zh' ? '重试' : 'Retry'}
            </button>
          </div>
        )}
        {(translatedContent || data?.translated) && !translating && (
          <p className="mb-3 text-center text-xs" style={{ color: 'var(--accent)' }}>AI 翻译 · 仅供参考</p>
        )}
        <div className="chapter-text whitespace-pre-wrap">
          {renderContentWithAds(displayContent, locale)}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="mt-6 flex items-center justify-between">
        <button onClick={() => goToChapter(prevChapterId)} disabled={!prevChapterId}
          className="rounded border px-4 py-2 text-sm transition-colors disabled:opacity-30"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          {t('prevChapter')}
        </button>

        <div className="flex gap-2">
          <button onClick={addBookmark} className="rounded border px-3 py-2 text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }} title="B">
            {t('bookmark')}
          </button>
          <button onClick={toggleSettings} className="rounded border px-3 py-2 text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            {t('settings')}
          </button>
          <button
            onClick={() => setTtsActive(a => !a)}
            className="rounded border px-3 py-2 text-xs"
            style={{ borderColor: 'var(--border)', color: ttsActive ? 'var(--accent)' : 'var(--text-secondary)' }}>
            {ttsActive ? t('stopListen') : t('listen')}
          </button>
        </div>

        <button onClick={() => goToChapter(nextChapterId)} disabled={!nextChapterId}
          className="rounded border px-4 py-2 text-sm transition-colors disabled:opacity-30"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          {t('nextChapter')}
        </button>
      </div>

      {/* TTS Player */}
      {ttsActive && data && (
        <TTSPlayer content={displayContent} lang={locale} onClose={() => setTtsActive(false)} />
      )}

      <p className="mt-3 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
        {displayWords > 0 ? `${displayWords} ${t('words')}` : ''}
        {displayWords > 0 && ' · '}
        {t('shortcuts')}
      </p>

      {/* Settings panel */}
      {settingsOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center pt-20"
          onClick={(e) => { if (e.target === e.currentTarget) setSettingsOpen(false); }}>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSettingsOpen(false)} />
          <div className="relative z-50" onClick={e => e.stopPropagation()}>
            <ReaderSettings size={size} onIncrease={increase} onDecrease={decrease} onReset={reset}
              theme={theme} onThemeChange={handleThemeChange} />
          </div>
        </div>
      )}
    </div>
  );
}

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '';
const BAIDU_UNION_ID = process.env.NEXT_PUBLIC_BAIDU_UNION_ID || '';

function renderContentWithAds(html: string, locale: string) {
  if (!html) return null;

  // Split by paragraph breaks, preserving the breaks
  const parts = html.split(/(\n\n+)/);
  const elements: React.ReactNode[] = [];
  let paraCount = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (/^\n\n+$/.test(part)) {
      // Preserve paragraph breaks
      elements.push(<span key={`br-${i}`}>{part}</span>);
      continue;
    }
    if (!part.trim()) continue;

    paraCount++;
    elements.push(
      <span key={`p-${i}`} dangerouslySetInnerHTML={{ __html: part }} />
    );

    // Insert ad after every 5 paragraphs
    if (paraCount % 5 === 0 && (ADSENSE_CLIENT || BAIDU_UNION_ID)) {
      elements.push(
        <InArticleAd key={`ad-${i}`} googleClient={ADSENSE_CLIENT} baiduId={BAIDU_UNION_ID} format="auto" />
      );
    }
  }

  return elements;
}

