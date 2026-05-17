import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/api-utils';
import { saveTranslation, getTranslation } from '@/lib/db';

export async function POST(request: NextRequest) {
  ensureInit();
  try {
    const { text, from, to, chapterId } = await request.json();
    if (!text || !from || !to) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    if (chapterId && chapterId > 0) {
      const cached = getTranslation(Number(chapterId), to);
      if (cached) {
        return NextResponse.json({ content: cached.content, word_count: cached.word_count, cached: true });
      }
    }

    const params = new URLSearchParams();
    params.append('q', text.slice(0, 500));
    params.append('langpair', `${from}|${to}`);

    const resp = await fetch('https://api.mymemory.translated.net/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    });
    const data = await resp.json() as any;

    if (data.responseStatus === 200 || data.responseStatus === '200') {
      const translated = data.responseData?.translatedText || '';
      if (translated && translated !== text && !translated.includes('MYMEMORY WARNING')) {
        if (chapterId && chapterId > 0) {
          saveTranslation(Number(chapterId), to, translated, translated.replace(/\s/g, '').length);
        }
        return NextResponse.json({ content: translated, word_count: translated.replace(/\s/g, '').length, cached: false });
      }
    }

    // Return original text on failure, so UI doesn't break
    return NextResponse.json({ content: text, word_count: text.replace(/\s/g, '').length, cached: false });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
