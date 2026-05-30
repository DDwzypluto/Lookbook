'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useSession } from 'next-auth/react';

const TOKEN_PACKAGES = [
  { id: 'basic', name: '体验包', amount: 1, tokens: 1000, desc: '约可生成2万字', popular: false },
  { id: 'standard', name: '标准包', amount: 10, tokens: 15000, desc: '约可生成30万字', popular: true },
  { id: 'pro', name: '专业包', amount: 50, tokens: 100000, desc: '约可生成200万字', popular: false },
  { id: 'max', name: '创作者包', amount: 200, tokens: 500000, desc: '约可生成1000万字', popular: false },
];

export default function PricingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleBuy = async (pkg: typeof TOKEN_PACKAGES[0]) => {
    if (!session) { router.push('/auth'); return; }
    setLoading(pkg.id);
    setError('');
    setResult(null);
    try {
      const resp = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id, method: 'alipay' }),
      });
      const d = await resp.json();
      if (d.error) throw new Error(d.error);
      setResult(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-center text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Token 充值</h1>
      <p className="mb-10 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
        Token 用于 AI 故事生成，1 Token ≈ 生成 2 个中文字符
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {TOKEN_PACKAGES.map(pkg => (
          <div key={pkg.id}
            className="relative rounded-xl border p-6 text-center transition-all hover:shadow-lg"
            style={{
              borderColor: pkg.popular ? 'var(--accent)' : 'var(--border)',
              backgroundColor: 'var(--bg-secondary)',
              borderWidth: pkg.popular ? '2px' : '1px',
            }}>
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs text-white"
                style={{ backgroundColor: 'var(--accent)' }}>推荐</div>
            )}
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{pkg.name}</h3>
            <p className="mt-2 text-3xl font-bold" style={{ color: 'var(--accent)' }}>
              ¥{pkg.amount}
            </p>
            <p className="mt-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {pkg.tokens.toLocaleString()} Token
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{pkg.desc}</p>
            <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              约 ¥{((pkg.amount / pkg.tokens) * 1000).toFixed(3)}/千Token
            </p>
            <button
              onClick={() => handleBuy(pkg)}
              disabled={loading === pkg.id}
              className="mt-4 w-full rounded-lg py-3 text-sm font-medium text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)' }}>
              {loading === pkg.id ? '处理中...' : session ? '立即购买' : '登录后购买'}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-6 rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 rounded-xl border p-6 text-center" style={{ borderColor: 'var(--accent)', backgroundColor: 'var(--bg-secondary)' }}>
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>订单已创建</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            订单号：{result.orderNo}<br />
            金额：¥{result.amount} | 到账：{result.tokens.toLocaleString()} Token
          </p>
          <p className="mt-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {result.note}
          </p>
        </div>
      )}

      <div className="mt-12 rounded-lg border p-6 text-sm" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
        <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>💡 使用说明</h3>
        <ul className="space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <li>1. 选择套餐并购买 Token</li>
          <li>2. 进入「AI 创作」页面，设定故事参数</li>
          <li>3. AI 自动生成大纲预览</li>
          <li>4. 确认后逐章生成，从 Token 余额扣费</li>
          <li>5. 生成的故事自动上架，供读者阅读</li>
        </ul>
      </div>
    </div>
  );
}
