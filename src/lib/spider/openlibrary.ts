import { BaseSpider } from './base';
import type { SearchResult, ChapterInfo, ChapterContent, BookMeta } from './types';

export class OpenLibrarySpider extends BaseSpider {
  readonly id = 'openlib';
  readonly name = 'Open Library';
  readonly baseUrl = 'https://openlibrary.org';
  readonly enabled = true;

  async ping(): Promise<boolean> {
    try { await this.fetch(`${this.baseUrl}/search.json?q=test&limit=1`); return true; } catch { return false; }
  }

  async search(keyword: string): Promise<SearchResult[]> {
    const encoded = encodeURIComponent(keyword);
    const url = `${this.baseUrl}/search.json?q=${encoded}&limit=20&fields=title,author_name,cover_i,first_sentence,key,language`;
    const resp = await this.fetch(url);
    const data = JSON.parse(resp) as any;
    const results: SearchResult[] = [];

    for (const doc of data.docs || []) {
      const olKey = doc.key || '';
      const coverId = doc.cover_i;
      const author = (doc.author_name || ['Unknown'])[0];

      results.push({
        title: doc.title || 'Unknown',
        author,
        sourceUrl: `${this.baseUrl}${olKey}`,
        coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : undefined,
        description: doc.first_sentence ? (Array.isArray(doc.first_sentence) ? doc.first_sentence[0] : doc.first_sentence) : undefined,
      });
    }
    return results;
  }

  async getBookMeta(bookUrl: string): Promise<BookMeta> {
    const url = `${bookUrl}.json`;
    const resp = await this.fetch(url);
    const data = JSON.parse(resp) as any;

    const title = data.title || 'Unknown';
    const author = data.authors?.[0]?.name || (data.author_name?.[0]) || 'Unknown';
    const description = (data.description && typeof data.description === 'string')
      ? data.description
      : (data.description?.value || data.first_sentence?.value || '');
    const coverId = data.covers?.[0];
    const subjects = data.subjects || [];

    return {
      title,
      author,
      coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : undefined,
      description: description || subjects.slice(0, 3).join(', '),
      isFinished: true,
    };
  }

  async getChapterList(bookUrl: string): Promise<ChapterInfo[]> {
    // Open Library provides metadata, not full text.
    // We link to Gutenberg / Internet Archive for reading.
    // For now, return a placeholder that directs to read online.
    const url = `${bookUrl}.json`;
    try {
      const resp = await this.fetch(url);
      const data = JSON.parse(resp) as any;

      // Check if there's a readable edition
      const editions = data.works?.[0] || data;
      const readUrl = data.links?.find((l: any) => l.url?.includes('gutenberg'))?.url
        || `https://archive.org/details/${data.ocaid || ''}`;

      return [{
        title: 'Full Text (External)',
        chapterNum: 1,
        sourceUrl: readUrl || bookUrl,
      }];
    } catch {
      return [{ title: 'Metadata Only', chapterNum: 1, sourceUrl: bookUrl }];
    }
  }

  async getChapterContent(chapterUrl: string): Promise<ChapterContent> {
    // Open Library is metadata-only. Try to redirect to Gutenberg or IA for full text.
    const gutenbergMatch = chapterUrl.match(/ebooks\/(\d+)/);
    if (gutenbergMatch) {
      // If it links to Gutenberg, delegate there
      const { GutenbergSpider } = await import('./gutenberg');
      const gu = new GutenbergSpider();
      return gu.getChapterContent(chapterUrl);
    }

    return {
      title: 'Open Library Entry',
      content: `This book is available on Open Library. Visit ${chapterUrl} to read online or borrow.\n\nOpen Library provides metadata for millions of books. For full text, many books link to Project Gutenberg or Internet Archive.`,
      wordCount: 0,
    };
  }
}
