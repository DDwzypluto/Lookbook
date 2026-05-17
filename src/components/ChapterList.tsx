'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

interface Chapter {
  id: number;
  title: string;
  chapter_num: number;
  is_cached: number;
}

interface Props {
  chapters: Chapter[];
  bookId: number;
  currentChapterId?: number;
}

export default function ChapterList({ chapters, bookId, currentChapterId }: Props) {
  const t = useTranslations('book');

  return (
    <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
      {chapters.map(ch => (
        <Link
          key={ch.id}
          href={`/books/${bookId}/read/${ch.id}`}
          className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-black/5"
          style={{
            backgroundColor: ch.id === currentChapterId ? 'var(--accent-light)' + '22' : 'transparent',
          }}
        >
          <span className="w-12 shrink-0 text-right text-xs" style={{ color: 'var(--text-secondary)' }}>
            {ch.chapter_num}
          </span>
          <span className="flex-1 truncate text-sm" style={{ color: 'var(--text-primary)' }}>
            {ch.title}
          </span>
          {ch.is_cached ? (
            <span className="text-xs" style={{ color: 'var(--accent)' }}>{t('cached')}</span>
          ) : (
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('uncached')}</span>
          )}
        </Link>
      ))}
    </div>
  );
}
