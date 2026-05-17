'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import ChapterList from '@/components/ChapterList';

interface BookDetail {
  id: number;
  title: string;
  author: string;
  cover_url: string;
  description: string;
  source_id: string;
  total_chapters: number;
  last_chapter: string;
  is_finished: number;
  language?: string;
  chapters: { id: number; title: string; chapter_num: number; is_cached: number }[];
  progress?: { chapter_id: number; scroll_percent: number } | null;
}

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('book');
  const locale = useLocale();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [transDesc, setTransDesc] = useState('');
  const [transChapters, setTransChapters] = useState<Record<number, string>>({});
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    fetch(`/api/books/${params.id}`)
      .then(r => r.json())
      .then(res => {
        if (res.error) { router.push('/'); return; }
        setBook(res.data);
      })
      .catch(() => router.push('/'))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  // Auto-translate when book language differs from UI locale
  useEffect(() => {
    if (!book) return;
    const bookLang = book.language || 'zh';
    if (bookLang === locale) return;
    if (translating || transDesc) return;

    setTranslating(true);
    const run = async () => {
      if (book.description) {
        try {
          const resp = await fetch('/api/translate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: book.description, from: bookLang, to: locale, chapterId: 0 }),
          });
          const d = await resp.json();
          if (d.content && !d.error) setTransDesc(d.content);
        } catch {}
      }
      if (book.chapters?.length > 0) {
        // Only translate first 3 visible chapter titles (to save quota)
        const batch = book.chapters.slice(0, 3);
        const map: Record<number, string> = {};
        for (const c of batch) {
          try {
            const resp = await fetch('/api/translate', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: c.title, from: bookLang, to: locale }),
            });
            const d = await resp.json();
            if (d.content && !d.error && d.content !== c.title) {
              map[c.id] = d.content;
            }
          } catch {}
        }
        if (Object.keys(map).length > 0) setTransChapters(map);
      }
      setTranslating(false);
    };
    run();
  }, [book, locale]); // eslint-disable-line

  const handleDelete = async () => {
    if (!confirm(t('confirmRemove'))) return;
    setDeleting(true);
    await fetch(`/api/books/${params.id}`, { method: 'DELETE' });
    router.push('/');
  };

  if (loading) {
    return <p className="py-20 text-center" style={{ color: 'var(--text-secondary)' }}>{t('loading')}</p>;
  }
  if (!book) return null;

  const bookLang = book.language || 'zh';
  const descText = transDesc || book.description;
  const displayChapters = book.chapters.map(c => ({
    ...c,
    title: transChapters[c.id] || c.title,
  }));

  return (
    <div>
      <div className="mb-6 flex gap-4">
        <div className="flex h-32 w-20 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: 'var(--accent)' }}>
          {book.cover_url ? (
            <img src={book.cover_url} alt={book.title} className="h-full w-full rounded-lg object-cover" />
          ) : (
            <span className="text-lg font-bold">{book.title.slice(0, 3)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{book.title}</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {book.author || t('unknownAuthor')}
            {book.is_finished ? ` · ${t('finished')}` : ` · ${t('ongoing')}`}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {t('totalChapters', { count: book.total_chapters })} · {t('source')}: {book.source_id}
          </p>
          <div className="mt-3 flex gap-2">
            {book.progress?.chapter_id && (
              <Link href={`/books/${book.id}/read/${book.progress.chapter_id}`}
                className="rounded px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-85"
                style={{ backgroundColor: 'var(--accent)' }}>
                {t('continueReading')}
              </Link>
            )}
            {translating && (
              <span className="rounded border px-3 py-1.5 text-xs flex items-center gap-1"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-t-transparent" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                {locale === 'zh' ? '翻译中' : 'Translating'}
              </span>
            )}
            <button onClick={handleDelete} disabled={deleting}
              className="rounded border px-4 py-1.5 text-sm transition-colors disabled:opacity-50"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              {deleting ? t('removing') : t('remove')}
            </button>
          </div>
        </div>
      </div>

      {descText && (
        <div className="mb-6 rounded-lg border p-4 text-sm leading-relaxed"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{descText}</p>
          {transDesc && <p className="mt-2 text-xs" style={{ color: 'var(--accent)' }}>AI 翻译 · 仅供参考</p>}
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{t('catalog')}</h2>
      <div className="rounded-lg border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
        <ChapterList chapters={displayChapters} bookId={book.id} />
      </div>
    </div>
  );
}
