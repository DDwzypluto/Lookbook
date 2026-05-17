'use client';

import { useTranslations } from 'next-intl';

interface Props {
  size: number;
  onIncrease: () => void;
  onDecrease: () => void;
  onReset: () => void;
  theme: string;
  onThemeChange: (t: string) => void;
}

export default function ReaderSettings({ size, onIncrease, onDecrease, onReset, theme, onThemeChange }: Props) {
  const t = useTranslations('reader');
  const themes = [
    { value: 'light', label: t('themeLight'), bg: '#faf8f5', text: '#2c2c2c' },
    { value: 'dark', label: t('themeDark'), bg: '#1e1e1e', text: '#c9c9c9' },
    { value: 'green', label: t('themeGreen'), bg: '#c7edcc', text: '#2c4c3c' },
  ];

  return (
    <div className="rounded-xl border p-5 shadow-lg backdrop-blur-md"
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('settingsTitle')}</h3>

      <div className="mb-4">
        <p className="mb-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{t('theme')}</p>
        <div className="flex gap-2">
          {themes.map(th => (
            <button key={th.value} onClick={() => onThemeChange(th.value)}
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs transition-all"
              style={{
                backgroundColor: th.bg, color: th.text,
                borderColor: theme === th.value ? 'var(--accent)' : 'transparent',
                boxShadow: theme === th.value ? '0 0 0 2px var(--accent)' : undefined,
              }} title={th.label}>
              A
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t('fontSize')}: {size}px
        </p>
        <div className="flex items-center gap-2">
          <button onClick={onDecrease} className="flex h-8 w-8 items-center justify-center rounded border text-lg"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>-</button>
          <input type="range" min={14} max={32} value={size}
            onChange={e => { document.documentElement.style.setProperty('--font-size-base', `${e.target.value}px`); }}
            className="flex-1" />
          <button onClick={onIncrease} className="flex h-8 w-8 items-center justify-center rounded border text-lg"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>+</button>
          <button onClick={onReset} className="ml-2 rounded border px-2 py-1 text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{t('reset')}</button>
        </div>
      </div>
    </div>
  );
}
