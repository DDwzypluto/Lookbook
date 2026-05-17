export interface SearchResult {
  title: string;
  author: string;
  sourceUrl: string;
  coverUrl?: string;
  description?: string;
}

export interface ChapterInfo {
  title: string;
  chapterNum: number;
  sourceUrl: string;
}

export interface ChapterContent {
  title: string;
  content: string;
  wordCount: number;
}

export interface BookMeta {
  title: string;
  author: string;
  coverUrl?: string;
  description?: string;
  isFinished: boolean;
}

export interface BookSource {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly enabled: boolean;

  search(keyword: string): Promise<SearchResult[]>;
  getBookMeta(bookUrl: string): Promise<BookMeta>;
  getChapterList(bookUrl: string): Promise<ChapterInfo[]>;
  getChapterContent(chapterUrl: string): Promise<ChapterContent>;
}
