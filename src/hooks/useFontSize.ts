'use client';

import { useState, useEffect, useCallback } from 'react';

const MIN = 14;
const MAX = 32;
const DEFAULT = 18;
const STORAGE_KEY = 'reader-font-size';

export function useFontSize() {
  const [size, setSize] = useState(DEFAULT);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSize(Number(stored));
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-size-base', `${size}px`);
    localStorage.setItem(STORAGE_KEY, String(size));
  }, [size]);

  const increase = useCallback(() => setSize(s => Math.min(MAX, s + 1)), []);
  const decrease = useCallback(() => setSize(s => Math.max(MIN, s - 1)), []);
  const reset = useCallback(() => setSize(DEFAULT), []);

  return { size, increase, decrease, reset, setSize };
}
