import { getUncachedChapters, updateChapterContent, getBook } from '@/lib/db';
import { spiderRegistry } from '@/lib/spider/registry';
import { ensureInit, json, jsonError } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureInit();
  try {
    const { id } = await params;
    const { chapterNum, count = 3 } = await request.json();
    const book = getBook(Number(id));
    if (!book) return jsonError('书籍不存在', 404);
    const source = spiderRegistry.get(book.source_id);
    if (!source) return jsonError('未知书源', 500);

    const chapters = getUncachedChapters(Number(id), Number(chapterNum), count);

    // Fetch in background (don't await)
    Promise.all(
      chapters.map(async (ch) => {
        try {
          const content = await source.getChapterContent(ch.source_url);
          updateChapterContent(ch.id, content.content, content.wordCount);
        } catch {
          // Silently fail for prefetch
        }
      })
    ).catch(() => {});

    return json({ prefetching: chapters.length });
  } catch (e: any) {
    return jsonError(e.message, 500);
  }
}
