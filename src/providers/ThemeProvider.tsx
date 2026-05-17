'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'system' | 'light' | 'dark' | 'green';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: 'light' | 'dark' | 'green';
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
  resolved: 'light',
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolved, setResolved] = useState<'light' | 'dark' | 'green'>('light');

  const applyTheme = useCallback((t: Theme) => {
    let r: 'light' | 'dark' | 'green';
    if (t === 'system') {
      r = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      r = t as 'light' | 'dark' | 'green';
    }
    document.documentElement.setAttribute('data-theme', r);
    setResolved(r);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem('reader-theme', t);
    applyTheme(t);
  }, [applyTheme]);

  useEffect(() => {
    const stored = localStorage.getItem('reader-theme') as Theme | null;
    const initial = stored || 'system';
    setThemeState(initial);
    applyTheme(initial);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if ((localStorage.getItem('reader-theme') as Theme | null) === 'system' || !localStorage.getItem('reader-theme')) {
        applyTheme('system');
      }
    };
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}
