import { NextRequest } from 'next/server';
import { getTokenBalance, getTokenTransactions } from '@/lib/db';
import { ensureInit, json, jsonError } from '@/lib/api-utils';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  ensureInit();
  const session = await auth();
  if (!session?.user?.id) return jsonError('请先登录', 401);
  const userId = Number(session.user.id);
  return json({
    balance: getTokenBalance(userId),
    transactions: getTokenTransactions(userId),
  });
}
