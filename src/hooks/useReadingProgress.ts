'use client';

import { useEffect, useRef, useCallback } from 'react';

export function useReadingProgress(bookId: number, chapterId: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const saved = useRef(false);

  // Restore progress
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    fetch(`/api/books/${bookId}/progress`)
      .then(r => r.json())
      .then(res => {
        if (res.data?.scroll_percent && res.data.chapter_id === chapterId) {
          const maxScroll = container.scrollHeight - container.clientHeight;
          container.scrollTop = (res.data.scroll_percent / 100) * maxScroll;
        }
      })
      .catch(() => {});
  }, [bookId, chapterId]);

  // Save progress on scroll (debounced)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let timer: ReturnType<typeof setTimeout>;
    const save = () => {
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll <= 0) return;
      const percent = Math.round((container.scrollTop / maxScroll) * 100);
      fetch(`/api/books/${bookId}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId, scrollPercent: percent }),
      }).catch(() => {});
    };

    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(save, 3000);
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
    };
  }, [bookId, chapterId]);

  // Save on page unload
  useEffect(() => {
    const onUnload = () => {
      const container = containerRef.current;
      if (!container) return;
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll <= 0) return;
      const percent = Math.round((container.scrollTop / maxScroll) * 100);
      navigator.sendBeacon(
        `/api/books/${bookId}/progress`,
        JSON.stringify({ chapterId, scrollPercent: percent })
      );
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [bookId, chapterId]);

  const scrollToTop = useCallback(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return { containerRef, scrollToTop };
}
