'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/navigation';

interface Story {
  id: number;
  title: string;
  genre: string;
  language: string;
  style: string;
  total_chapters: number;
  total_words: number;
  author_name: string;
  book_id: number | null;
  created_at: string;
}

export default function DiscoverPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'chapters' | 'words' | 'newest'>('chapters');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetch('/api/stories')
      .then(r => r.json())
      .then(d => setStories(d.stories || []))
      .finally(() => setLoading(false));
  }, []);

  const genres = [...new Set(stories.map(s => s.genre).filter(Boolean))];
  const filtered = stories
    .filter(s => !filter || s.genre === filter)
    .sort((a, b) => {
      if (sort === 'chapters') return (b.total_chapters || 0) - (a.total_chapters || 0);
      if (sort === 'words') return (b.total_words || 0) - (a.total_words || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>📚 小说广场</h1>
      <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>AI 生成的原创小说，免费阅读</p>

      {/* Filters */}
      <div className="mb-6 flex gap-3 flex-wrap">
        <select value={sort} onChange={e => setSort(e.target.value as any)}
          className="rounded border px-3 py-2 text-sm bg-transparent"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          <option value="chapters">最多章节</option>
          <option value="words">最多字数</option>
          <option value="newest">最新发布</option>
        </select>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="rounded border px-3 py-2 text-sm bg-transparent"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          <option value="">全部分类</option>
          {genres.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="py-12 text-center" style={{ color: 'var(--text-secondary)' }}>加载中...</p>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>还没有小说</p>
          <Link href="/create" className="mt-4 inline-block text-sm underline" style={{ color: 'var(--accent)' }}>
            去创作第一本 AI 小说 →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(story => (
            <Link key={story.id} href={story.book_id ? `/books/${story.book_id}` : '#'}
              className="rounded-xl border p-4 transition-all hover:shadow-lg hover:-translate-y-1 block"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
              <div className="flex items-center justify-center h-32 mb-3 rounded-lg text-white text-2xl font-bold"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-light))' }}>
                {story.title.slice(0, 3)}
              </div>
              <h3 className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{story.title}</h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                {story.author_name || 'AI Author'} · {story.genre}
              </p>
              <div className="flex gap-3 mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>{story.total_chapters || 0}章</span>
                <span>{(story.total_words || 0).toLocaleString()}字</span>
              </div>
              {story.language === 'en' && (
                <span className="inline-block mt-2 rounded px-2 py-0.5 text-xs"
                  style={{ backgroundColor: 'var(--accent)', color: 'white' }}>EN</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
