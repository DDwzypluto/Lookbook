import { initDb } from '@/lib/db';
import { spiderRegistry } from '@/lib/spider/registry';
import { BiqugeSpider } from '@/lib/spider/biquge';
import { LocalTestSpider } from '@/lib/spider/local-test';
import { GutenbergSpider } from '@/lib/spider/gutenberg';
import { OpenLibrarySpider } from '@/lib/spider/openlibrary';

const BIQUGE_MIRRORS = [
  { id: 'bqg-xyz', name: '笔趣阁(xyz)', baseUrl: 'https://www.biquge7.xyz' },
  { id: 'bqg-tv', name: '笔趣阁(tv)', baseUrl: 'https://www.biquge.tv' },
  { id: 'bqg-789', name: '笔趣阁(789)', baseUrl: 'https://www.biquge789.com' },
  { id: 'bqg-cc', name: '笔趣阁(cc)', baseUrl: 'https://www.biquge.cc' },
];

export function initSources() {
  spiderRegistry.register(new LocalTestSpider());
  spiderRegistry.register(new GutenbergSpider());
  spiderRegistry.register(new OpenLibrarySpider());
  for (const mirror of BIQUGE_MIRRORS) {
    spiderRegistry.register(new BiqugeSpider(mirror));
  }
}

export function init() {
  initDb();
  initSources();
}
