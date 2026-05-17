'use client';

import { useEffect, useRef } from 'react';

interface UseKeyboardNavOptions {
  prevChapter: () => void;
  nextChapter: () => void;
  toggleSettings: () => void;
  addBookmark: () => void;
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function useKeyboardNav({ prevChapter, nextChapter, toggleSettings, addBookmark, contentRef }: UseKeyboardNavOptions) {
  const ref = useRef({ prevChapter, nextChapter, toggleSettings, addBookmark });
  ref.current = { prevChapter, nextChapter, toggleSettings, addBookmark };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const { prevChapter, nextChapter, toggleSettings, addBookmark } = ref.current;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const content = contentRef.current;
      if (!content) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          prevChapter();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextChapter();
          break;
        case 'ArrowDown':
          e.preventDefault();
          content.scrollBy({ top: 60, behavior: 'smooth' });
          break;
        case 'ArrowUp':
          e.preventDefault();
          content.scrollBy({ top: -60, behavior: 'smooth' });
          break;
        case ' ':
          e.preventDefault();
          content.scrollBy({ top: content.clientHeight * 0.8, behavior: 'smooth' });
          break;
        case 'PageDown':
          e.preventDefault();
          content.scrollBy({ top: content.clientHeight * 0.9, behavior: 'smooth' });
          break;
        case 'PageUp':
          e.preventDefault();
          content.scrollBy({ top: -content.clientHeight * 0.9, behavior: 'smooth' });
          break;
        case 'Home':
          e.preventDefault();
          content.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'End':
          e.preventDefault();
          content.scrollTo({ top: content.scrollHeight, behavior: 'smooth' });
          break;
        case 'Escape':
          e.preventDefault();
          toggleSettings();
          break;
        case 'b':
          e.preventDefault();
          addBookmark();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [contentRef]);
}
