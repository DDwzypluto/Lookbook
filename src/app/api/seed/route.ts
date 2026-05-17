import { NextRequest } from 'next/server';
import { ensureInit, json, jsonError } from '@/lib/api-utils';
import { spiderRegistry } from '@/lib/spider/registry';
import { insertBook, insertChapters, updateBook, getBookBySourceUrl } from '@/lib/db';

// Top Chinese novels with known biquge7.xyz URLs
const CHINESE_BOOKS = [
  { title: '斗罗大陆', url: 'https://www.biquge7.xyz/34806' },
  { title: '斗罗大陆2绝世唐门', url: 'https://www.biquge7.xyz/49923' },
  { title: '斗罗大陆3龙王传说', url: 'https://www.biquge7.xyz/49907' },
  { title: '斗罗大陆4终极斗罗', url: 'https://www.biquge7.xyz/49924' },
  { title: '斗罗大陆5重生唐三', url: 'https://www.biquge7.xyz/50044' },
  { title: '狂神', url: 'https://www.biquge7.xyz/35534' },
  { title: '生肖守护神', url: 'https://www.biquge7.xyz/35368' },
  { title: '从斗罗开始打卡', url: 'https://www.biquge7.xyz/49957' },
  { title: '斗罗之龙凰传说', url: 'https://www.biquge7.xyz/50820' },
  { title: '斗罗：震惊我成了比比东', url: 'https://www.biquge7.xyz/50345' },
];

// Top English books on Gutenberg
const ENGLISH_BOOKS = [
  { title: 'Pride and Prejudice', url: 'https://www.gutenberg.org/ebooks/1342' },
  { title: "Alice's Adventures in Wonderland", url: 'https://www.gutenberg.org/ebooks/11' },
  { title: 'Frankenstein', url: 'https://www.gutenberg.org/ebooks/84' },
  { title: 'Dracula', url: 'https://www.gutenberg.org/ebooks/345' },
  { title: 'The Adventures of Sherlock Holmes', url: 'https://www.gutenberg.org/ebooks/1661' },
  { title: 'Moby Dick', url: 'https://www.gutenberg.org/ebooks/2701' },
  { title: 'Great Expectations', url: 'https://www.gutenberg.org/ebooks/1400' },
  { title: 'Jane Eyre', url: 'https://www.gutenberg.org/ebooks/1260' },
  { title: 'The Picture of Dorian Gray', url: 'https://www.gutenberg.org/ebooks/174' },
  { title: 'Treasure Island', url: 'https://www.gutenberg.org/ebooks/120' },
];

async function addBook(sourceId: string, sourceUrl: string, language: string) {
  const existing = getBookBySourceUrl(sourceUrl);
  if (existing) return { status: 'exists', id: existing.id, title: existing.title };

  const source = spiderRegistry.get(sourceId);
  if (!source) throw new Error(`Source ${sourceId} not found`);

  const meta = await source.getBookMeta(sourceUrl);
  const book = insertBook({
    title: meta.title,
    author: meta.author,
    cover_url: meta.coverUrl || '',
    description: meta.description || '',
    source_id: sourceId,
    source_url: sourceUrl,
    language,
  });

  const chapters = await source.getChapterList(sourceUrl);
  if (chapters.length > 0) {
    insertChapters(chapters.map(c => ({
      book_id: book.id,
      title: c.title,
      chapter_num: c.chapterNum,
      source_url: c.sourceUrl.startsWith('http') ? c.sourceUrl : new URL(c.sourceUrl, source.baseUrl).href,
    })));
    updateBook(book.id, { total_chapters: chapters.length, last_chapter: chapters[chapters.length - 1].title });
  }

  return { status: 'added', id: book.id, title: meta.title, chapters: chapters.length };
}

export async function POST(request: NextRequest) {
  ensureInit();
  const results: any[] = [];

  const biquge = spiderRegistry.get('bqg-xyz');
  const gutenberg = spiderRegistry.get('gutenberg');

  // Try Chinese books via biquge if available
  if (biquge) {
    for (const book of CHINESE_BOOKS) {
      try {
        const r = await addBook('bqg-xyz', book.url, 'zh');
        results.push({ ...r, lang: 'zh', source: 'bqg-xyz' });
      } catch (e: any) {
        results.push({ title: book.title, status: 'failed', error: e.message });
      }
    }
  }

  // English books via Gutenberg
  if (gutenberg) {
    for (const book of ENGLISH_BOOKS) {
      try {
        const r = await addBook('gutenberg', book.url, 'en');
        results.push({ ...r, lang: 'en', source: 'gutenberg' });
      } catch (e: any) {
        results.push({ title: book.title, status: 'failed', error: e.message });
      }
    }
  }

  const added = results.filter(r => r.status === 'added').length;
  const existed = results.filter(r => r.status === 'exists').length;
  const failed = results.filter(r => r.status === 'failed').length;

  return json({ summary: { added, existed, failed, total: results.length }, results });
}
