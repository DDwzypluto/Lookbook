import { getActiveAd } from '@/lib/db';
import { ensureInit, json } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  ensureInit();
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'all';
  const ad = getActiveAd(lang);
  return json(ad);
}
