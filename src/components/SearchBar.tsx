'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  onSearch: (keyword: string) => void;
  loading?: boolean;
  placeholder?: string;
}

export default function SearchBar({ onSearch, loading, placeholder }: Props) {
  const t = useTranslations('search');
  const [keyword, setKeyword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) onSearch(keyword.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text" value={keyword} onChange={e => setKeyword(e.target.value)}
        placeholder={placeholder || t('placeholder')}
        className="flex-1 rounded-lg border px-4 py-3 text-lg outline-none transition-colors focus:ring-2"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        autoFocus
      />
      <button type="submit" disabled={loading || !keyword.trim()}
        className="rounded-lg px-6 py-3 font-medium text-white transition-opacity disabled:opacity-50"
        style={{ backgroundColor: 'var(--accent)' }}>
        {loading ? t('searching') : t('search')}
      </button>
    </form>
  );
}
