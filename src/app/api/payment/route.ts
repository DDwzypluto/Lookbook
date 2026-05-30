import { NextRequest } from 'next/server';
import { createPaymentOrder, markOrderPaid, getPaymentOrder } from '@/lib/db';
import { ensureInit, json, jsonError } from '@/lib/api-utils';
import { auth } from '@/lib/auth';

const TOKEN_PACKAGES = [
  { id: 'basic', name: '体验包', amount: 1, tokens: 1000, desc: '约可生成2万字' },
  { id: 'standard', name: '标准包', amount: 10, tokens: 15000, desc: '约可生成30万字' },
  { id: 'pro', name: '专业包', amount: 50, tokens: 100000, desc: '约可生成200万字' },
  { id: 'max', name: '创作者包', amount: 200, tokens: 500000, desc: '约可生成1000万字' },
];

// GET: list token packages
export async function GET() {
  ensureInit();
  return json({ packages: TOKEN_PACKAGES });
}

// POST: create payment order
export async function POST(request: NextRequest) {
  ensureInit();
  const session = await auth();
  if (!session?.user?.id) return jsonError('请先登录', 401);

  const { packageId, method } = await request.json();
  const pkg = TOKEN_PACKAGES.find(p => p.id === packageId);
  if (!pkg) return jsonError('无效套餐', 400);

  const userId = Number(session.user.id);
  const orderNo = createPaymentOrder(userId, pkg.amount, pkg.tokens, method || 'alipay');

  // For now, return a QR code URL placeholder
  // In production, this would call Alipay API to get a real QR URL
  return json({
    orderNo,
    amount: pkg.amount,
    tokens: pkg.tokens,
    qrUrl: `https://qr.alipay.com/placeholder?order=${orderNo}&amount=${pkg.amount}`,
    note: '支付宝扫码支付（演示模式）',
  });
}
