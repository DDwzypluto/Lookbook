'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export default function AuthPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        name: isRegister ? name : undefined,
        action: isRegister ? 'register' : 'login',
        redirect: false,
      });

      if (result?.error) {
        setError(isRegister ? 'Registration failed. Email may already exist.' : 'Invalid email or password.');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm py-20">
      <h1 className="mb-6 text-center text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {isRegister ? t('register') : t('login')}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isRegister && (
          <input
            type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder={t('name')} required
            className="rounded-lg border px-4 py-3 text-sm outline-none"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          />
        )}
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder={t('email')} required
          className="rounded-lg border px-4 py-3 text-sm outline-none"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        />
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder={t('password')} required minLength={6}
          className="rounded-lg border px-4 py-3 text-sm outline-none"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button type="submit" disabled={loading}
          className="rounded-lg px-6 py-3 font-medium text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)' }}>
          {loading ? '...' : (isRegister ? t('registerBtn') : t('loginBtn'))}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        <button onClick={() => { setIsRegister(!isRegister); setError(''); }}
          className="underline" style={{ color: 'var(--accent)' }}>
          {isRegister ? t('hasAccount') : t('noAccount')}
        </button>
      </p>
    </div>
  );
}
