import { BaseSpider } from './base';
import type { SearchResult, ChapterInfo, ChapterContent, BookMeta } from './types';

const MOCK_CHAPTERS = [
  { title: '第一章 起始', content: '这是一个测试章节的内容。\n\n清晨的阳光透过窗帘的缝隙洒进房间，整个屋子都笼罩在一片金色的光芒中。他缓缓睁开眼睛，看着天花板，回想着昨晚那个奇怪的梦。\n\n"这到底意味着什么？"他喃喃自语，翻身坐了起来。\n\n窗外的鸟鸣声此起彼伏，新的一天又开始了。' },
  { title: '第二章 出发', content: '第二章的测试内容。\n\n收拾好行装，他站在门口深吸一口气。这趟旅程已经计划了很久，但真正要出发的时候，心里还是难免有些忐忑。\n\n"一路顺风。"母亲的声音从身后传来。\n\n他点点头，推开门走了出去。天空万里无云，是个出行的好日子。' },
  { title: '第三章 奇遇', content: '第三章来了。\n\n走在小路上，他突然听到一阵奇怪的声音。那声音忽远忽近，似乎在召唤他。\n\n他顺着声音的方向走去，拨开茂密的灌木丛，一个从未见过的景象出现在眼前。\n\n"这...这是什么地方？"' },
  { title: '第四章 谜团', content: '第四章内容在这里。越来越多的问题开始浮现。每一个答案似乎都引出了更多的疑问。他开始怀疑自己是否真的了解这个世界。' },
  { title: '第五章 转折', content: '第五章的转折点。危机来得毫无预兆。就在他以为自己已经安全的时候，真正的危险悄然而至。他想起了师父说过的话："真正的考验，往往出现在你最放松的瞬间。"他握紧了拳头，准备迎接即将到来的一切。' },
  { title: '第六章 成长', content: '第六章。经历了那些事情之后，他感觉自己变了很多。不再是那个无忧无虑的少年，肩上的担子重了许多。但这也是成长的必经之路吧。' },
  { title: '第七章 告别', content: '第七章。离别的时刻终究还是到了。望着身后熟悉的景色，他默默地说了声再见。前方的路还很长，但他已经不再害怕。' },
  { title: '第八章 新世界', content: '第八章。眼前的世界和他想象中的完全不同。高大的建筑，熙熙攘攘的人群，一切都那么新奇。他深吸一口气，迈出了第一步。' },
  { title: '第九章 重逢', content: '第九章。命运总是如此奇妙，在你最意想不到的时候，让故人重逢。站在街角的那个身影，他再熟悉不过了。' },
  { title: '第十章 终章', content: '最后一章了。\n\n故事总会有一个结局。回头看看走过的路，有欢笑，有泪水，有遗憾，也有收获。但最重要的是，这一路上从未后悔过。\n\n阳光再次洒落，他闭上眼睛，感受着这一刻的宁静。\n\n一个新的故事，正在前方等待。' },
];

export class LocalTestSpider extends BaseSpider {
  readonly id = 'local-test';
  readonly name = '本地测试';
  readonly baseUrl = 'local://test';
  readonly enabled = true;

  async search(keyword: string): Promise<SearchResult[]> {
    return [{
      title: `《测试之书》`,
      author: '测试作者',
      sourceUrl: 'local://test/book/1',
      description: '这是一本用于测试的本地模拟书籍，包含了10个章节的内容，用于验证阅读器的各项功能是否正常工作。',
    }];
  }

  async getBookMeta(bookUrl: string): Promise<BookMeta> {
    return {
      title: '测试之书',
      author: '测试作者',
      description: '这是一本用于测试的本地模拟书籍，包含了10个章节的内容，用于验证阅读器的各项功能是否正常工作。',
      isFinished: true,
    };
  }

  async getChapterList(bookUrl: string): Promise<ChapterInfo[]> {
    return MOCK_CHAPTERS.map((ch, i) => ({
      title: ch.title,
      chapterNum: i + 1,
      sourceUrl: `local://test/book/1/chapter/${i + 1}`,
    }));
  }

  async getChapterContent(chapterUrl: string): Promise<ChapterContent> {
    const match = chapterUrl.match(/chapter\/(\d+)$/);
    const idx = match ? Number(match[1]) - 1 : 0;
    const ch = MOCK_CHAPTERS[idx] || MOCK_CHAPTERS[0];
    return {
      title: ch.title,
      content: ch.content,
      wordCount: ch.content.replace(/\s/g, '').length,
    };
  }
}
