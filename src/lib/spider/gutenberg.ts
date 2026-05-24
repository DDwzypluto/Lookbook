import { BaseSpider } from './base';
import type { SearchResult, ChapterInfo, ChapterContent, BookMeta } from './types';

// In-memory cache for downloaded Gutenberg texts (one per book)
const textCache = new Map<string, string>();

export class GutenbergSpider extends BaseSpider {
  readonly id = 'gutenberg';
  readonly name = 'Gutenberg';
  readonly baseUrl = 'https://www.gutenberg.org';
  readonly enabled = true;

  async ping(): Promise<boolean> {
    try { await this.fetch(this.baseUrl); return true; } catch { return false; }
  }

  async search(keyword: string): Promise<SearchResult[]> {
    const encoded = encodeURIComponent(keyword);
    const html = await this.fetch(`${this.baseUrl}/ebooks/search/?query=${encoded}`);
    const $ = this.parseHtml(html);
    const results: SearchResult[] = [];

    $('.booklink').each((_: number, el: any) => {
      const $el = $(el);
      const $link = $el.find('a.link').first();
      const rawTitle = $link.text().trim();
      const href = $link.attr('href') || '';
      const author = $el.find('.subtitle, .author').first().text().trim();
      const descEl = $el.find('.details').first().text().trim() || undefined;

      if (rawTitle && href) {
        results.push({
          title: rawTitle.split('\n')[0].trim(),
          author: author || 'Unknown',
          sourceUrl: this.absUrl(href),
          description: descEl,
        });
      }
    });
    return results.slice(0, 20);
  }

  async getBookMeta(bookUrl: string): Promise<BookMeta> {
    const html = await this.fetch(bookUrl);
    const $ = this.parseHtml(html);

    const title = $('meta[property="og:book:title"], meta[property="og:title"]').attr('content')
      || $('h1').first().text().trim()
      || $('title').text().replace(/\|.*$/, '').trim();
    const author = $('meta[property="og:book:author"]').attr('content')
      || $('a[rel="author"], .author').first().text().trim();
    const coverEl = $('meta[property="og:image"]').attr('content')
      || $('.cover-thumb img, .book-cover img').attr('src');
    const description = $('meta[property="og:description"]').attr('content')
      || $('.summary, .description').first().text().trim();

    return {
      title: (title || 'Unknown').trim(),
      author: author || 'Unknown',
      coverUrl: coverEl ? this.absUrl(coverEl) : undefined,
      description: description || '',
      isFinished: true,
    };
  }

  // Downloads full text, splits into chapters, returns the complete chapter list
  async getChapterList(bookUrl: string): Promise<ChapterInfo[]> {
    const text = await this.downloadText(bookUrl);
    if (!text) return [{ title: 'Full Text', chapterNum: 1, sourceUrl: bookUrl }];

    const chapters = splitIntoChapters(text);
    if (chapters.length === 0) {
      return [{ title: 'Full Text', chapterNum: 1, sourceUrl: bookUrl }];
    }

    // Cache the full text for getChapterContent
    textCache.set(bookUrl, text);

    return chapters.map((ch, i) => ({
      title: ch.title,
      chapterNum: i + 1,
      sourceUrl: `${bookUrl}#c:${i}`,
    }));
  }

  // Returns individual chapter content from cached text or re-downloads
  async getChapterContent(chapterUrl: string): Promise<ChapterContent> {
    const [bookUrl, idxStr] = chapterUrl.split('#c:');
    const idx = Number(idxStr) || 0;

    let text = textCache.get(bookUrl) || '';
    if (!text) {
      text = await this.downloadText(bookUrl);
      if (text) textCache.set(bookUrl, text);
    }
    if (!text) {
      return { title: 'Error', content: 'Download failed, please retry', wordCount: 0 };
    }

    const chapters = splitIntoChapters(text);
    if (chapters.length === 0) {
      return { title: 'Full Text', content: text, wordCount: text.replace(/\s/g, '').length };
    }

    const ch = chapters[idx] || chapters[0];
    return { title: ch.title, content: ch.content, wordCount: ch.wordCount };
  }

  private async downloadText(bookUrl: string): Promise<string> {
    const match = bookUrl.match(/ebooks\/(\d+)/);
    const bookId = match ? match[1] : '';
    if (!bookId) return '';

    const url = `https://www.gutenberg.org/cache/epub/${bookId}/pg${bookId}.txt`;
    try {
      return await this.fetch(url, { retries: 2, timeout: 120000 });
    } catch {
      return '';
    }
  }
}

function splitIntoChapters(text: string): { title: string; content: string; wordCount: number }[] {
  // Strip Gutenberg header/footer
  const startMarker = /\*\*\* START OF (THE|THIS) PROJECT GUTENBERG EBOOK/i;
  const endMarker = /\*\*\* END OF (THE|THIS) PROJECT GUTENBERG EBOOK/i;
  const startIdx = text.search(startMarker);
  const endIdx = text.search(endMarker);
  const body = text.slice(
    startIdx >= 0 ? text.indexOf('\n', startIdx) : 0,
    endIdx >= 0 ? endIdx : text.length
  );

  // Multiple chapter patterns for different book formats
  const chapterPatterns = [
    /(?:^|\n)\s*(?:CHAPTER|Chapter)\s+([IVXLCDM\d]+)([\.\n]|$)/gi,
    /(?:^|\n)\s*([IVXLCDM]+)\.\s*\n/g,
    /(?:^|\n)\s*(\d+)\.\s*\n(?!\s*[a-z])/g,
    /(?:^|\n)\s*(?:PART|Part|BOOK|Book)\s+(?:ONE|TWO|THREE|FOUR|FIVE|[IVXLCDM\d]+)([\.\n]|$)/gi,
  ];

  type Match = { index: number; title: string };
  const matches: Match[] = [];

  for (const pattern of chapterPatterns) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(body)) !== null) {
      const title = m[0].trim();
      if (title.length < 2 || title.length > 80) continue;
      // Avoid matching common words that happen to be Roman numerals
      if (/^[IVX]$/.test(title) && m.index > 0 && /[a-z]$/i.test(body[m.index - 1])) continue;
      matches.push({ index: m.index, title });
    }
    if (matches.length > 3) break;
  }

  // Deduplicate and sort by position
  const seen = new Set<string>();
  const sorted = matches
    .filter(m => seen.has(`${m.index}`) ? false : (seen.add(`${m.index}`), true))
    .sort((a, b) => a.index - b.index);

  if (sorted.length < 2) {
    // No chapters found - check if text is reasonable size for a single chapter
    const clean = body.replace(/\n{4,}/g, '\n\n\n').trim();
    // If very long (>50000 chars), split by paragraph breaks roughly
    if (clean.length > 50000) {
      return splitLargeText(clean);
    }
    return [{ title: 'Full Text', content: clean, wordCount: clean.replace(/\s/g, '').length }];
  }

  const chapters: { title: string; content: string; wordCount: number }[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i].index;
    const end = i < sorted.length - 1 ? sorted[i + 1].index : body.length;
    const content = body.slice(start, end).replace(/\n{4,}/g, '\n\n\n').trim();
    if (content.length > 50) {
      chapters.push({
        title: sorted[i].title.replace(/^[\s\n]+/, '').slice(0, 80),
        content,
        wordCount: content.replace(/\s/g, '').length,
      });
    }
  }

  return chapters.length > 0 ? chapters : [{
    title: 'Full Text',
    content: body.replace(/\n{4,}/g, '\n\n\n').trim(),
    wordCount: body.replace(/\s/g, '').length,
  }];
}

// For books without clear chapters, split by double newlines into reasonable chunks
function splitLargeText(text: string): { title: string; content: string; wordCount: number }[] {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50);
  const chapters: { title: string; content: string; wordCount: number }[] = [];
  const chunkSize = Math.ceil(paragraphs.length / 20); // aim for ~20 chapters

  for (let i = 0; i < paragraphs.length; i += chunkSize) {
    const chunk = paragraphs.slice(i, i + chunkSize).join('\n\n');
    if (chunk.trim().length > 50) {
      chapters.push({
        title: `Section ${chapters.length + 1}`,
        content: chunk,
        wordCount: chunk.replace(/\s/g, '').length,
      });
    }
  }

  return chapters.length > 0 ? chapters : [{
    title: 'Full Text',
    content: text,
    wordCount: text.replace(/\s/g, '').length,
  }];
}
