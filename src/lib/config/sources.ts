import { initDb } from '@/lib/db';
import { spiderRegistry } from '@/lib/spider/registry';
import { BiqugeSpider } from '@/lib/spider/biquge';
import { LocalTestSpider } from '@/lib/spider/local-test';
import { GutenbergSpider } from '@/lib/spider/gutenberg';
import { GutendexSpider } from '@/lib/spider/gutendex';
import { OpenLibrarySpider } from '@/lib/spider/openlibrary';

// Chinese sources (may be blocked depending on server IP)
const BIQUGE_MIRRORS = [
  { id: 'bqg-xyz', name: '笔趣阁(xyz)', baseUrl: 'https://www.biquge7.xyz' },
  { id: 'bqg-tv', name: '笔趣阁(tv)', baseUrl: 'https://www.biquge.tv' },
  { id: 'bqg-789', name: '笔趣阁(cc)', baseUrl: 'https://www.xbiquge.com' },
];

export function initSources() {
  // Always available
  spiderRegistry.register(new LocalTestSpider());
  spiderRegistry.register(new GutenbergSpider());
  spiderRegistry.register(new GutendexSpider());
  spiderRegistry.register(new OpenLibrarySpider());

  // Chinese sources (disabled in production if BQ_ENABLED=false)
  const bqEnabled = process.env.BQ_ENABLED !== 'false';
  if (bqEnabled) {
    for (const mirror of BIQUGE_MIRRORS) {
      spiderRegistry.register(new BiqugeSpider(mirror));
    }
  }
}

export function init() {
  initDb();
  initSources();
}
