import { load } from 'cheerio';
import type { BookSource, SearchResult, ChapterInfo, ChapterContent, BookMeta } from './types';
import { fetchWithRetry } from './utils';

export abstract class BaseSpider implements BookSource {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly baseUrl: string;
  abstract readonly enabled: boolean;

  protected async fetch(url: string, options?: { retries?: number; timeout?: number }): Promise<string> {
    return fetchWithRetry(url, options);
  }

  protected parseHtml(html: string): ReturnType<typeof load> {
    return load(html);
  }

  protected absUrl(path: string): string {
    if (path.startsWith('http')) return path;
    return new URL(path, this.baseUrl).href;
  }

  abstract search(keyword: string): Promise<SearchResult[]>;
  abstract getBookMeta(bookUrl: string): Promise<BookMeta>;
  abstract getChapterList(bookUrl: string): Promise<ChapterInfo[]>;
  abstract getChapterContent(chapterUrl: string): Promise<ChapterContent>;
}
