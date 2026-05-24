import { BaseSpider } from './base';
import type { SearchResult, ChapterInfo, ChapterContent, BookMeta } from './types';

export class GutendexSpider extends BaseSpider {
  readonly id = 'gutendex';
  readonly name = 'Gutendex';
  readonly baseUrl = 'https://gutendex.com';
  readonly enabled = true;

  async ping(): Promise<boolean> {
    try { await this.fetch(`${this.baseUrl}/books?page=1`); return true; } catch { return false; }
  }

  async search(keyword: string): Promise<SearchResult[]> {
    const encoded = encodeURIComponent(keyword);
    const url = `${this.baseUrl}/books?search=${encoded}&languages=en,zh`;
    const resp = await this.fetch(url);
    const data = JSON.parse(resp) as any;
    const results: SearchResult[] = [];

    for (const book of data.results || []) {
      const author = book.authors?.[0]?.name || 'Unknown';
      const coverUrl = book.formats?.['image/jpeg'] || book.formats?.['image/png'] || undefined;
      const desc = book.summaries?.[0] || undefined;
      const lang = book.languages?.[0] || 'en';

      results.push({
        title: book.title,
        author,
        sourceUrl: `${this.baseUrl}/books/${book.id}`,
        coverUrl,
        description: desc,
      });
    }
    return results.slice(0, 20);
  }

  async getBookMeta(bookUrl: string): Promise<BookMeta> {
    const resp = await this.fetch(bookUrl);
    const book = JSON.parse(resp) as any;

    const title = book.title || 'Unknown';
    const author = book.authors?.[0]?.name || 'Unknown';
    const coverUrl = book.formats?.['image/jpeg'] || book.formats?.['image/png'] || undefined;
    const desc = book.summaries?.[0] || '';
    const lang = book.languages?.[0] || 'en';

    // Store text URL in book meta for later use
    const textUrl = book.formats?.['text/plain; charset=utf-8']
      || book.formats?.['text/plain']
      || book.formats?.['text/html; charset=utf-8']
      || book.formats?.['text/html']
      || '';

    return {
      title,
      author,
      coverUrl,
      description: desc,
      isFinished: true,
    };
  }

  async getChapterList(bookUrl: string): Promise<ChapterInfo[]> {
    // Return single placeholder chapter.
    // Full text download happens in getChapterContent via the Gutendex formats URL.
    return [{ title: 'Full Text', chapterNum: 1, sourceUrl: bookUrl }];
  }

  async getChapterContent(chapterUrl: string): Promise<ChapterContent> {
    // Fetch book metadata from Gutendex to get the text URL
    const resp = await this.fetch(chapterUrl);
    const book = JSON.parse(resp) as any;

    const textUrl = book.formats?.['text/plain; charset=utf-8']
      || book.formats?.['text/plain']
      || book.formats?.['text/html; charset=utf-8']
      || book.formats?.['text/html'];

    if (!textUrl) {
      return { title: book.title || 'Unknown', content: '(No text format available)', wordCount: 0 };
    }

    try {
      const rawText = await this.fetch(textUrl, { retries: 2, timeout: 120000 });
      let text = rawText;

      // If HTML, strip tags
      if (textUrl.includes('text/html') || textUrl.includes('.html')) {
        text = stripHtml(text);
      }

      // Remove Gutenberg header/footer
      const start = text.search(/\*\*\* START OF/);
      const end = text.search(/\*\*\* END OF/);
      if (start >= 0) {
        text = text.slice(text.indexOf('\n', start) + 1, end >= 0 ? end : undefined);
      }
      text = text.trim();
      const wordCount = text.replace(/\s/g, '').length;

      return { title: book.title || 'Full Text', content: text, wordCount };
    } catch {
      return { title: book.title || 'Full Text', content: '(Download failed, please retry)', wordCount: 0 };
    }
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n');
}
