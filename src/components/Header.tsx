'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { useTheme } from '@/providers/ThemeProvider';
import { useSession, signOut } from 'next-auth/react';

export default function Header() {
  const t = useTranslations('header');
  const tAuth = useTranslations('auth');
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();

  const themes = [
    { value: 'system' as const, label: t('themeAuto') },
    { value: 'light' as const, label: t('themeLight') },
    { value: 'dark' as const, label: t('themeDark') },
    { value: 'green' as const, label: t('themeGreen') },
  ];

  const switchTo = (locale: string) => {
    router.replace(pathname, { locale });
  };

  return (
    <header className="sticky top-0 z-50 border-b backdrop-blur-sm"
      style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--border)' }}>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold tracking-wide" style={{ color: 'var(--accent)' }}>
          {t('bookshelf')}
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/create" className="text-sm font-medium hover:underline"
            style={{ color: 'var(--accent)' }}>
            ✨ AI 创作
          </Link>
          <Link href="/search" className="text-sm hover:underline" style={{ color: 'var(--text-secondary)' }}>
            {t('search')}
          </Link>

          {/* Language switcher */}
          <div className="flex rounded border overflow-hidden text-xs" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => switchTo('zh')}
              className="px-2 py-1 transition-colors"
              style={{
                backgroundColor: locale === 'zh' ? 'var(--accent)' : 'transparent',
                color: locale === 'zh' ? 'white' : 'var(--text-secondary)',
              }}>
              中
            </button>
            <button onClick={() => switchTo('en')}
              className="px-2 py-1 transition-colors"
              style={{
                backgroundColor: locale === 'en' ? 'var(--accent)' : 'transparent',
                color: locale === 'en' ? 'white' : 'var(--text-secondary)',
              }}>
              EN
            </button>
          </div>

          {session ? (
            <div className="flex items-center gap-3">
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{session.user?.name}</span>
              <button onClick={() => signOut()} className="text-sm hover:underline"
                style={{ color: 'var(--text-secondary)' }}>
                {tAuth('logout')}
              </button>
            </div>
          ) : (
            <Link href="/auth" className="text-sm hover:underline" style={{ color: 'var(--text-secondary)' }}>
              {tAuth('login')}
            </Link>
          )}
          <select
            value={theme}
            onChange={e => setTheme(e.target.value as typeof theme)}
            className="rounded border px-2 py-1 text-sm bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            {themes.map(th => (
              <option key={th.value} value={th.value}>{th.label}</option>
            ))}
          </select>
        </nav>
      </div>
    </header>
  );
}
