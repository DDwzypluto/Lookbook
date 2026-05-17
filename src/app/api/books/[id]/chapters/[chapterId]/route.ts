import { getChapter, getAdjacentChapter, getBook, updateChapterContent, getTranslation } from '@/lib/db';
import { ensureInit, json, jsonError } from '@/lib/api-utils';
import { spiderRegistry } from '@/lib/spider/registry';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  ensureInit();
  try {
    const { id, chapterId } = await params;
    const { searchParams } = new URL(request.url);
    const uiLang = searchParams.get('lang') || 'zh';

    const chapter = getChapter(Number(chapterId));
    if (!chapter || chapter.book_id !== Number(id)) return jsonError('章节不存在', 404);

    // If not cached, scrape now
    if (!chapter.is_cached) {
      const book = getBook(Number(id));
      if (!book) return jsonError('书籍不存在', 404);
      const source = spiderRegistry.get(book.source_id);
      if (!source) return jsonError('未知书源', 500);

      const content = await source.getChapterContent(chapter.source_url);
      updateChapterContent(chapter.id, content.content, content.wordCount);
      chapter.content = content.content;
      chapter.is_cached = 1;
      chapter.word_count = content.wordCount;
    }

    // Translation: if UI lang differs from book lang, check cache
    const book = getBook(Number(id));
    const bookLang = book?.language || 'zh';
    let translatedContent: string | null = null;
    let translatedWordCount = 0;

    if (uiLang !== bookLang && chapter.is_cached) {
      const cached = getTranslation(chapter.id, uiLang);
      if (cached) {
        translatedContent = cached.content;
        translatedWordCount = cached.word_count;
      }
    }

    // Get prev/next
    const prev = getAdjacentChapter(chapter.book_id, chapter.chapter_num, -1);
    const next = getAdjacentChapter(chapter.book_id, chapter.chapter_num, 1);

    return json({
      chapter,
      prevChapterId: prev?.id || null,
      nextChapterId: next?.id || null,
      bookLanguage: bookLang,
      translated: translatedContent ? { content: translatedContent, word_count: translatedWordCount } : null,
    });
  } catch (e: any) {
    return jsonError(e.message, 500);
  }
}
