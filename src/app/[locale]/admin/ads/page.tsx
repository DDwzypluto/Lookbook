'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface Ad {
  id: number; type: string; title: string; url: string; duration: number; lang: string; active: number;
}

export default function AdminAdsPage() {
  const t = useTranslations('admin');
  const [ads, setAds] = useState<Ad[]>([]);
  const [form, setForm] = useState({ type: 'image', title: '', url: '', duration: 10, lang: 'all', active: 1 });

  useEffect(() => {
    fetch('/api/ads/list').then(r => r.json()).then(d => setAds(d.data || [])).catch(() => {});
  }, []);

  const handleAdd = async () => {
    await fetch('/api/ads/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ type: 'image', title: '', url: '', duration: 10, lang: 'all', active: 1 });
    const r = await fetch('/api/ads/list').then(r => r.json());
    setAds(r.data || []);
  };

  const handleToggle = async (ad: Ad) => {
    await fetch(`/api/ads/list?id=${ad.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: ad.active ? 0 : 1 }),
    });
    const r = await fetch('/api/ads/list').then(r => r.json());
    setAds(r.data || []);
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/ads/list?id=${id}`, { method: 'DELETE' });
    const r = await fetch('/api/ads/list').then(r => r.json());
    setAds(r.data || []);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('title')}</h1>

      {/* Add form */}
      <div className="mb-8 rounded-lg border p-4 space-y-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="flex gap-2">
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
            className="rounded border px-3 py-2 text-sm bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="html">HTML</option>
          </select>
          <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder={t('addAd')} className="flex-1 rounded border px-3 py-2 text-sm bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        </div>
        <div className="flex gap-2">
          <input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })}
            placeholder={t('url')} className="flex-1 rounded border px-3 py-2 text-sm bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          <input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })}
            placeholder={t('duration')} className="w-24 rounded border px-3 py-2 text-sm bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        </div>
        <button onClick={handleAdd}
          className="rounded-lg px-6 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--accent)' }}>
          {t('addAd')}
        </button>
      </div>

      {/* Ad list */}
      <div className="divide-y rounded-lg border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
        {ads.map(ad => (
          <div key={ad.id} className="flex items-center gap-4 p-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{ad.title || '(no title)'}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{ad.type} · {ad.url.slice(0, 60)} · {ad.duration}s · {ad.lang}</p>
            </div>
            <button onClick={() => handleToggle(ad)}
              className="rounded border px-3 py-1 text-xs" style={{
                borderColor: 'var(--border)',
                color: ad.active ? 'green' : 'var(--text-secondary)',
              }}>
              {ad.active ? 'ON' : 'OFF'}
            </button>
            <button onClick={() => handleDelete(ad.id)}
              className="rounded border px-3 py-1 text-xs"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
