import { BaseSpider } from './base';
import type { SearchResult, ChapterInfo, ChapterContent, BookMeta } from './types';

interface BiqugeConfig {
  id: string;
  name: string;
  baseUrl: string;
}

const SEARCH_PATHS = ['/search?keyword=', '/search/?keyword=', '/search.php?keyword=', '/modules/article/search.php?searchkey='];

export class BiqugeSpider extends BaseSpider {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly enabled = true;

  constructor(config: BiqugeConfig) {
    super();
    this.id = config.id;
    this.name = config.name;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  async ping(): Promise<boolean> {
    try {
      await this.fetch(this.baseUrl);
      return true;
    } catch { return false; }
  }

  private async trySearchUrls(keyword: string): Promise<string> {
    const encoded = encodeURIComponent(keyword);
    for (const path of SEARCH_PATHS) {
      try {
        const html = await this.fetch(`${this.baseUrl}${path}${encoded}`);
        if (html.length > 500) return html;
      } catch { continue; }
    }
    throw new Error('所有搜索路径均不可用');
  }

  async search(keyword: string): Promise<SearchResult[]> {
    const html = await this.trySearchUrls(keyword);
    const $ = this.parseHtml(html);
    const results: SearchResult[] = [];

    // Template A: tui_1_item (biquge7.xyz style)
    $('.tui_1_item').each((_: number, el: any) => {
      const $el = $(el);
      const $titleA = $el.find('.item_title .title a').first();
      const title = $titleA.text().trim();
      const sourceUrl = $titleA.attr('href') || '';
      const author = $el.find('.item_title .title .author').first().text().trim();
      const coverUrl = $el.find('img').attr('src') || $el.find('img').attr('data-src') || undefined;
      const desc = $el.find('.item_title p').first().text().trim() || undefined;

      if (title && sourceUrl) {
        results.push({
          title: title.replace(/<[^>]+>/g, ''),
          author: author || '未知',
          sourceUrl: this.absUrl(sourceUrl),
          coverUrl: coverUrl ? this.absUrl(coverUrl) : undefined,
          description: desc,
        });
      }
    });

    if (results.length > 0) return results;

    // Template B: traditional biquge (#newscontent, .result-list, etc.)
    const tradSelectors = ['.result-item', '.result-list .item', '.novel-list li', '.search-list li', '.bookbox', '#newscontent .l li'];
    for (const sel of tradSelectors) {
      $(sel).each((_: number, el: any) => {
        const $el = $(el);
        const $link = $el.find('a').first();
        let title = $link.text().trim();
        let sourceUrl = $link.attr('href') || '';
        if (!title || !sourceUrl) {
          title = $el.find('h3, .title, .name').first().text().trim();
          sourceUrl = $el.find('h3 a, .title a').first().attr('href') || '';
        }
        if (title && sourceUrl && !results.some(r => r.sourceUrl === this.absUrl(sourceUrl))) {
          const author = $el.find('.author, .autor, em').first().text().trim().replace(/作者[：:]\s*/, '');
          const coverUrl = $el.find('img').attr('src') || $el.find('img').attr('data-src') || undefined;
          results.push({
            title, author: author || '未知', sourceUrl: this.absUrl(sourceUrl),
            coverUrl: coverUrl ? this.absUrl(coverUrl) : undefined,
          });
        }
      });
      if (results.length > 0) break;
    }

    return results;
  }

  async getBookMeta(bookUrl: string): Promise<BookMeta> {
    const html = await this.fetch(bookUrl);
    const $ = this.parseHtml(html);

    // OG meta tags (most reliable)
    const title = $('meta[property="og:novel:book_name"]').attr('content')
      || $('meta[property="og:title"]').attr('content')
      || $('meta[name="og:novel:book_name"]').attr('content')
      || $('#info h1, .book-info h1, #bookname, #info h2, h1').first().text().trim()
      || documentTitle($, html);
    const author = $('meta[property="og:novel:author"]').attr('content')
      || $('meta[property="og:article:author"]').attr('content')
      || $('meta[name="og:novel:author"]').attr('content')
      || $('.author, .writer, #info p').first().text().trim().replace(/作者[：:]\s*/, '').replace(/作\s+者[：:]\s*/, '');
    const coverUrl = $('meta[property="og:image"]').attr('content')
      || $('meta[name="og:image"]').attr('content')
      || $('#fmimg img, .book-img img, .detail a img').attr('src')
      || undefined;

    const description = $('meta[property="og:description"]').attr('content')
      || $('#intro, .book-intro, .des, #bookintro, .intro').first().text().trim();

    const statusText = $('#info p, .book-info .status, .info .status').text();
    const isFinished = /完[本结]|已完[本结]|全本|完本/.test(statusText);

    return {
      title: (title || '未知书名').replace(/^\s*(最新|热门|全本|)\s*/g, ''),
      author: author || '未知',
      coverUrl: coverUrl ? this.absUrl(coverUrl) : undefined,
      description: description || '',
      isFinished,
    };
  }

  async getChapterList(bookUrl: string): Promise<ChapterInfo[]> {
    const html = await this.fetch(bookUrl);
    const $ = this.parseHtml(html);

    // Template A: div.list li a (biquge7.xyz style)
    const chapters: ChapterInfo[] = [];
    const listDiv = $('div.list').first();
    if (listDiv.length > 0) {
      listDiv.find('li a').each((i: number, el: any) => {
        const $a = $(el);
        const title = $a.text().trim();
        const href = $a.attr('href');
        if (title && href && title.length > 1) {
          chapters.push({ title, chapterNum: i + 1, sourceUrl: this.absUrl(href) });
        }
      });
      if (chapters.length > 5) return chapters;
    }

    // Template B: Traditional #list dl dd a
    chapters.length = 0;
    const tradSelectors = ['#list dl dd a', 'div.listmain dl dd a', '.catalog dl dd a', '#chapterlist dd a', 'dd a'];
    for (const sel of tradSelectors) {
      chapters.length = 0;
      $(sel).each((i: number, el: any) => {
        const $a = $(el);
        const title = $a.text().trim();
        const href = $a.attr('href');
        if (title && href && title.length > 1) {
          chapters.push({ title, chapterNum: i + 1, sourceUrl: this.absUrl(href) });
        }
      });
      if (chapters.length > 5) break;
    }

    return chapters;
  }

  async getChapterContent(chapterUrl: string): Promise<ChapterContent> {
    const html = await this.fetch(chapterUrl);
    const $ = this.parseHtml(html);

    // Template A: h1#tit + div.text (biquge7.xyz)
    let title = $('#tit').text().trim() || $('h1').first().text().trim();
    let $content: any = $('div.text');

    if ($content.length === 0 || ($content.text().trim().length < 50)) {
      // Template B: #content (traditional)
      title = $('h1, .chapter-title, #chapter-name, .title').first().text().trim() || title;
      $content = $(
        '#content, #chaptercontent, #htmlContent, #txtContent, ' +
        '.chapter-content, .content, .txt, #novel_content, #acontent, #BookText'
      );
    }

    if ($content.length === 0) {
      $content = $('body');
    }

    $content.find('script, style, noscript, iframe, .ad, .ads, .bottem1, .bottem2, .toplink, .hot_box, .pc_word').remove();

    let text = $content.html() || '';
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<\/div>/gi, '\n');
    const content = text.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n').trim();
    const wordCount = content.replace(/\s/g, '').length;

    return { title: title || '', content, wordCount };
  }
}

function documentTitle(_$: any, html: string): string {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  if (match) {
    return match[1].replace(/_[^_]*$/, '').replace(/最新章节.*$/, '').trim();
  }
  return '';
}
