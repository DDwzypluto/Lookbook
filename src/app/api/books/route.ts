import { listBooks, insertBook } from '@/lib/db';
import { ensureInit, json, jsonError } from '@/lib/api-utils';
import { spiderRegistry } from '@/lib/spider/registry';
import { insertChapters, updateBook } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET() {
  ensureInit();
  try {
    const books = listBooks();
    return json(books);
  } catch (e: any) {
    return jsonError(e.message, 500);
  }
}

export async function POST(request: NextRequest) {
  ensureInit();
  try {
    const body = await request.json();
    const { sourceId, sourceUrl, keyword } = body;

    // Search flow: keyword -> pick first result -> add
    if (keyword) {
      const src = sourceId ? spiderRegistry.get(sourceId) : spiderRegistry.getEnabled()[0];
      if (!src) return jsonError('没有可用的书源', 400);

      const results = await src.search(keyword);
      if (results.length === 0) return jsonError('未找到相关书籍', 404);

      const r = results[0];
      const url = r.sourceUrl.startsWith('http') ? r.sourceUrl : new URL(r.sourceUrl, src.baseUrl).href;
      const meta = await src.getBookMeta(url);
      const book = insertBook({
        title: meta.title,
        author: meta.author,
        cover_url: meta.coverUrl || '',
        description: meta.description || '',
        source_id: src.id,
        source_url: url,
      });
      const chapters = await src.getChapterList(url);
      if (chapters.length > 0) {
        insertChapters(chapters.map(c => ({
          book_id: book.id,
          title: c.title,
          chapter_num: c.chapterNum,
          source_url: c.sourceUrl.startsWith('http') ? c.sourceUrl : new URL(c.sourceUrl, src.baseUrl).href,
        })));
        updateBook(book.id, { total_chapters: chapters.length, last_chapter: chapters[chapters.length - 1].title });
      }
      return json(book);
    }

    // Direct URL flow
    if (sourceUrl && sourceId) {
      const source = spiderRegistry.get(sourceId);
      if (!source) return jsonError('未知书源', 400);
      const url = sourceUrl.startsWith('http') ? sourceUrl : new URL(sourceUrl, source.baseUrl).href;
      const meta = await source.getBookMeta(url);
      const bookLang = sourceId === 'gutenberg' || sourceId.startsWith('en-') ? 'en' : 'zh';
      const book = insertBook({
        title: meta.title,
        author: meta.author,
        cover_url: meta.coverUrl || '',
        description: meta.description || '',
        source_id: sourceId,
        source_url: url,
        language: bookLang,
      });
      const chapters = await source.getChapterList(url);
      if (chapters.length > 0) {
        insertChapters(chapters.map(c => ({
          book_id: book.id,
          title: c.title,
          chapter_num: c.chapterNum,
          source_url: c.sourceUrl.startsWith('http') ? c.sourceUrl : new URL(c.sourceUrl, source.baseUrl).href,
        })));
        updateBook(book.id, { total_chapters: chapters.length, last_chapter: chapters[chapters.length - 1].title });
      }

      return json(book);
    }

    return jsonError('请提供 keyword 或 sourceUrl + sourceId', 400);
  } catch (e: any) {
    return jsonError(e.message, 500);
  }
}
