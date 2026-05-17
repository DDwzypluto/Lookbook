'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import BookGrid from '@/components/BookGrid';

export default function HomePage() {
  const t = useTranslations('home');
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBooks = useCallback(() => {
    setLoading(true);
    fetch('/api/books')
      .then(r => r.json())
      .then(res => setBooks(res.data || []))
      .catch(() => setBooks([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const handleDelete = async (id: number) => {
    await fetch(`/api/books/${id}`, { method: 'DELETE' });
    setBooks(prev => prev.filter(b => b.id !== id));
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('myShelf')}</h1>
        <Link
          href="/search"
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {t('addBook')}
        </Link>
      </div>

      {loading ? (
        <p className="py-12 text-center" style={{ color: 'var(--text-secondary)' }}>{t('loading')}</p>
      ) : books.length === 0 ? (
        <div className="py-20 text-center">
          <p className="mb-4 text-lg" style={{ color: 'var(--text-secondary)' }}>
            {t('empty')}
          </p>
          <Link
            href="/search"
            className="text-sm underline"
            style={{ color: 'var(--accent)' }}
          >
            {t('emptyHint')}
          </Link>
        </div>
      ) : (
        <BookGrid books={books} onDelete={handleDelete} />
      )}
    </div>
  );
}
