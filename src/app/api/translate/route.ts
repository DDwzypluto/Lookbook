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
    const t = data.responseData?.translatedText || '';
    if (t && !t.includes('MYMEMORY WARNING')) return t;
  }
  return ''; // Return empty on failure, caller handles
}

// Check if translation looks valid (target language character ratio)
function looksValid(text: string, to: string): boolean {
  if (!text || text.length < 2) return false;
  const total = text.length;
  // For English target, most chars should be ASCII
  if (to === 'en') {
    const ascii = text.split('').filter(c => c <= '\x7f').length;
    return ascii / total > 0.5;
  }
  // For Chinese target, should have CJK characters
  if (to === 'zh') {
    const cjk = text.split('').filter(c => {
      const code = c.charCodeAt(0);
      return (code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF);
    }).length;
    return cjk / total > 0.1;
  }
  return total > 2;
}

function splitBySentences(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  let current = '';
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
      if (cached && looksValid(cached.content, to)) {
        return NextResponse.json({ content: cached.content, word_count: cached.word_count, cached: true });
      }
    }

    // Split into small chunks (400 chars max for reliable translation)
    const chunks = splitBySentences(text, 400);
    const results: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const translated = await translateChunk(chunks[i], from, to);
      if (translated && looksValid(translated, to)) {
        results.push(translated);
      } else {
        // On failure, keep original text rather than garbage
        results.push(chunks[i]);
      }
      if (chunks.length > 1 && i < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    const fullText = results.join('\n\n');

    // Only cache if the result looks valid
    if (chapterId && chapterId > 0 && fullText !== text && looksValid(fullText, to)) {
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
