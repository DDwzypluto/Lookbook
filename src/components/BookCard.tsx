'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

interface BookCardProps {
  book: {
    id: number;
    title: string;
    author: string;
    cover_url: string;
    last_chapter: string;
    total_chapters: number;
    progress_chapter_id?: number | null;
    progress_scroll?: number | null;
  };
  onDelete?: (id: number) => void;
}

export default function BookCard({ book, onDelete }: BookCardProps) {
  const t = useTranslations('home');
  const router = useRouter();

  const goToBook = () => router.push(`/books/${book.id}`);
  const goToRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (book.progress_chapter_id != null) {
      router.push(`/books/${book.id}/read/${book.progress_chapter_id}`);
    }
  };

  return (
    <div
      onClick={goToBook}
      className="group relative rounded-lg border p-4 transition-shadow hover:shadow-md cursor-pointer"
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}
    >
      <div className="mb-3 flex gap-3">
        <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded text-xs text-white"
          style={{ backgroundColor: 'var(--accent)' }}>
          {book.cover_url ? (
            <img src={book.cover_url} alt={book.title} className="h-full w-full rounded object-cover" />
          ) : (
            <span className="text-center leading-tight">{book.title.slice(0, 3)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold" style={{ color: 'var(--text-primary)' }}>{book.title}</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{book.author || 'Unknown'}</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {t('totalChapters', { count: book.total_chapters })}
          </p>
          {book.last_chapter && (
            <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-secondary)' }}>
              {t('latest')}: {book.last_chapter}
            </p>
          )}
        </div>
      </div>

      {book.progress_chapter_id != null && (
        <button onClick={goToRead}
          className="mt-2 block w-full rounded py-1.5 text-center text-sm font-medium text-white transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--accent)' }}>
          {t('continueReading')}
        </button>
      )}

      {onDelete && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(book.id); }}
          className="absolute right-2 top-2 hidden rounded-full p-1 text-xs opacity-50 hover:opacity-100 group-hover:block"
          style={{ color: 'var(--text-secondary)' }} title="Delete">
          ✕
        </button>
      )}
    </div>
  );
}
