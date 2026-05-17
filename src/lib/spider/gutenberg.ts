import { BaseSpider } from './base';
import type { SearchResult, ChapterInfo, ChapterContent, BookMeta } from './types';

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
        const title = rawTitle.split('\n')[0].trim();
        results.push({
          title,
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

  // Returns placeholder - actual content downloaded on-demand
  async getChapterList(bookUrl: string): Promise<ChapterInfo[]> {
    // Return a single placeholder chapter immediately.
    // The actual text download and chapter splitting happens in getChapterContent.
    return [{
      title: 'Full Text',
      chapterNum: 1,
      sourceUrl: bookUrl,
    }];
  }

  // Downloads the full text, splits into chapters, returns the requested one
  async getChapterContent(chapterUrl: string): Promise<ChapterContent> {
    const bookUrl = chapterUrl.replace(/#c:\d+$/, '');
    const text = await this.downloadText(bookUrl);

    if (!text) {
      throw new Error('Downloading book content, please try again in a moment...');
    }

    const chapters = splitIntoChapters(text);
    const idxMatch = chapterUrl.match(/#c:(\d+)$/);
    const idx = idxMatch ? Number(idxMatch[1]) : 0;

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
      return await this.fetch(url, { retries: 1, timeout: 120000 });
    } catch {
      return '';
    }
  }
}

function splitIntoChapters(text: string): { title: string; content: string; wordCount: number }[] {
  const chapters: { title: string; content: string; wordCount: number }[] = [];

  const startMarker = /\*\*\* START OF (THE|THIS) PROJECT GUTENBERG EBOOK/i;
  const endMarker = /\*\*\* END OF (THE|THIS) PROJECT GUTENBERG EBOOK/i;
  const startIdx = text.search(startMarker);
  const endIdx = text.search(endMarker);
  const body = text.slice(
    startIdx >= 0 ? text.indexOf('\n', startIdx) : 0,
    endIdx >= 0 ? endIdx : text.length
  );

  const chapterPatterns = [
    /(?:^|\n)\s*(?:Heading to )?(?:CHAPTER|Chapter)\s+([IVXLCDM\d]+[\.\s]*.*?)(?:\n|$)/gi,
    /(?:^|\n)\s*(?:ADVENTURE|Adventure)\s+([IVXLCDM\d]+[\.\s]*.*?)(?:\n|$)/gi,
    /(?:^|\n)\s*([IVXLCDM]+)\.\s+(.*?)(?:\n|$)/g,
    /(?:^|\n)\s*(\d+)\.\s+(.*?)(?:\n|$)/g,
    /(?:^|\n)\s*(?:PART|Part|BOOK|Book)\s+([IVXLCDM\d]+[\.\s]*.*?)(?:\n|$)/gim,
  ];

  type Match = { index: number; title: string };
  const matches: Match[] = [];

  for (const pattern of chapterPatterns) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(body)) !== null) {
      const title = m[0].trim();
      if (title.length < 3 || title.length > 120) continue;
      matches.push({ index: m.index, title });
    }
    if (matches.length > 3) break;
  }

  const seen = new Set<string>();
  const sorted = matches
    .filter(m => { const k = `${m.index}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.index - b.index);

  if (sorted.length < 2) {
    const content = body.replace(/\n{4,}/g, '\n\n\n').trim();
    return [{
      title: 'Full Text',
      content,
      wordCount: content.replace(/\s/g, '').length,
    }];
  }

  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i].index;
    const end = i < sorted.length - 1 ? sorted[i + 1].index : body.length;
    const content = body.slice(start, end).replace(/\n{4,}/g, '\n\n\n').trim();
    const wordCount = content.replace(/\s/g, '').length;
    if (content.length > 50) {
      chapters.push({
        title: sorted[i].title.replace(/^[\s\n]+/, '').slice(0, 100),
        content,
        wordCount,
      });
    }
  }
  return chapters;
}
