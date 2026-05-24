import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/api-utils';
import { saveTranslation, getTranslation } from '@/lib/db';

async function translateChunk(text: string, from: string, to: string): Promise<string> {
  const params = new URLSearchParams();
  params.append('q', text);
  params.append('langpair', `${from}|${to}`);

  const resp = await fetch('https://api.mymemory.translated.net/get', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    signal: AbortSignal.timeout(15000),
  });
  const data = await resp.json() as any;

  if (data.responseStatus === 200 || data.responseStatus === '200') {
    return data.responseData?.translatedText || text;
  }
  return text; // Return original on failure
}

function splitBySentences(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  let current = '';
  // Split on sentence boundaries
  const sentences = text.split(/(?<=[.!?。！？\n])\s*/);
  for (const s of sentences) {
    if ((current + s).length > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

export async function POST(request: NextRequest) {
  ensureInit();
  try {
    const { text, from, to, chapterId } = await request.json();
    if (!text || !from || !to) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    // Check cache
    if (chapterId && chapterId > 0) {
      const cached = getTranslation(Number(chapterId), to);
      if (cached) {
        return NextResponse.json({ content: cached.content, word_count: cached.word_count, cached: true });
      }
    }

    // Split large text into chunks, translate each
    const chunks = splitBySentences(text, 1500);
    const results: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const translated = await translateChunk(chunks[i], from, to);
      if (translated && translated !== chunks[i] && !translated.includes('MYMEMORY WARNING')) {
        results.push(translated);
      } else {
        results.push(chunks[i]);
      }
      // Small delay between chunks to avoid rate limiting
      if (chunks.length > 1 && i < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    const fullText = results.join('\n\n');

    // Cache result for chapters
    if (chapterId && chapterId > 0 && fullText !== text) {
      saveTranslation(Number(chapterId), to, fullText, fullText.replace(/\s/g, '').length);
    }

    return NextResponse.json({
      content: fullText,
      word_count: fullText.replace(/\s/g, '').length,
      cached: false,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
