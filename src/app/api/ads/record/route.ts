import { recordAdView } from '@/lib/db';
import { ensureInit, json } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  ensureInit();
  const { adId, bookId, chapterId, completed } = await request.json();
  recordAdView(Number(adId), 0, Number(bookId || 0), Number(chapterId || 0), Number(completed || 0));
  return json({ success: true });
}
