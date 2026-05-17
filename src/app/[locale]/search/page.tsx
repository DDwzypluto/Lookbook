'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import SearchBar from '@/components/SearchBar';

interface SearchResult {
  title: string;
  author: string;
  sourceUrl: string;
  sourceId: string;
  sourceName: string;
  coverUrl?: string;
  description?: string;
}

interface SourceInfo {
  id: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
}

export default function SearchPage() {
  const t = useTranslations('search');
  const router = useRouter();
  const [tab, setTab] = useState<'search' | 'url'>('search');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [selectedSource, setSelectedSource] = useState('');
  const [directUrl, setDirectUrl] = useState('');

  useEffect(() => {
    fetch('/api/sources')
      .then(r => r.json())
      .then(d => {
        setSources(d.data || []);
        if (d.data?.length > 0) setSelectedSource(d.data[0].id);
      });
  }, []);

  const handleSearch = async (keyword: string) => {
    setSearching(true);
    setError('');
    try {
      const resp = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, sourceId: selectedSource || undefined }),
      });
      const d = await resp.json();
      if (d.error) throw new Error(d.error.message);
      setResults(d.data || []);
      if (d.data?.length === 0) setError(t('noResult'));
    } catch (e: any) {
      setError(e.message || t('searchFailed'));
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const addBook = async (sourceId: string, sourceUrl: string) => {
    setAdding(sourceUrl);
    setError('');
    try {
      const resp = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, sourceUrl }),
      });
      const d = await resp.json();
      if (d.error) throw new Error(d.error.message);
      router.push(`/books/${d.data.id}`);
    } catch (e: any) {
      setError(e.message || t('addFailed'));
    } finally {
      setAdding(null);
    }
  };

  const handleAddResult = (r: SearchResult) => addBook(r.sourceId, r.sourceUrl);

  const handleAddUrl = () => {
    if (!directUrl.trim() || !selectedSource) return;
    addBook(selectedSource, directUrl.trim());
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {t('title')}
      </h1>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border p-1" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
        <button onClick={() => setTab('search')} className="flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          style={{ backgroundColor: tab === 'search' ? 'var(--accent)' : 'transparent', color: tab === 'search' ? 'white' : 'var(--text-secondary)' }}>
          {t('searchTab')}
        </button>
        <button onClick={() => setTab('url')} className="flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          style={{ backgroundColor: tab === 'url' ? 'var(--accent)' : 'transparent', color: tab === 'url' ? 'white' : 'var(--text-secondary)' }}>
          {t('urlTab')}
        </button>
      </div>

      {/* Source selector */}
      <div className="mb-4">
        <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>{t('sourceLabel')}</label>
        <select value={selectedSource} onChange={e => setSelectedSource(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm bg-transparent"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          {sources.map(s => (
            <option key={s.id} value={s.id}>{s.name} - {s.baseUrl}</option>
          ))}
        </select>
      </div>

      {tab === 'search' ? (
        <SearchBar onSearch={handleSearch} loading={searching} placeholder={t('placeholder')} />
      ) : (
        <div className="flex flex-col gap-2">
          <input
            type="url" value={directUrl} onChange={e => setDirectUrl(e.target.value)}
            placeholder={t('urlPlaceholder')}
            className="w-full rounded-lg border px-4 py-3 text-sm outline-none transition-colors focus:ring-2"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          />
          <button onClick={handleAddUrl} disabled={!directUrl.trim() || !selectedSource || adding !== null}
            className="rounded-lg px-6 py-3 font-medium text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)' }}>
            {adding !== null ? t('adding') : t('addToShelf')}
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p>}

      {results.length > 0 && (
        <div className="mt-6 divide-y rounded-lg border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
          {results.map((r, i) => (
            <div key={i} className="flex items-start gap-4 p-4">
              <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded text-xs text-white"
                style={{ backgroundColor: 'var(--accent)' }}>
                {r.coverUrl ? <img src={r.coverUrl} alt={r.title} className="h-full w-full rounded object-cover" /> : <span>{r.title.slice(0, 3)}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{r.title}</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{r.author || t('unknownAuthor')} · {r.sourceName}</p>
                {r.description && <p className="mt-1 line-clamp-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{r.description}</p>}
              </div>
              <button onClick={() => handleAddResult(r)} disabled={adding === r.sourceUrl}
                className="shrink-0 rounded px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)' }}>
                {adding === r.sourceUrl ? t('adding') : t('addButton')}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-lg border p-4 text-xs" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
        <p className="mb-1 font-medium" style={{ color: 'var(--text-primary)' }}>{t('tips')}</p>
        <ul className="space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
          <li>{t('tip1')}</li>
          <li>{t('tip2')}</li>
          <li>{t('tip3')}</li>
        </ul>
      </div>
    </div>
  );
}
