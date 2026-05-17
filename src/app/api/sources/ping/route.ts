import { spiderRegistry } from '@/lib/spider/registry';
import { ensureInit, json } from '@/lib/api-utils';
import { BiqugeSpider } from '@/lib/spider/biquge';

export async function POST() {
  ensureInit();
  const sources = spiderRegistry.getAll();
  const results: { id: string; name: string; baseUrl: string; status: 'ok' | 'fail'; error?: string; latency: number }[] = [];

  for (const source of sources) {
    if (source instanceof BiqugeSpider) {
      const start = Date.now();
      try {
        const ok = await source.ping();
        results.push({ id: source.id, name: source.name, baseUrl: source.baseUrl, status: ok ? 'ok' : 'fail', latency: Date.now() - start });
      } catch (e: any) {
        results.push({ id: source.id, name: source.name, baseUrl: source.baseUrl, status: 'fail', error: e.message, latency: Date.now() - start });
      }
    } else {
      results.push({ id: source.id, name: source.name, baseUrl: source.baseUrl, status: 'ok', latency: 0 });
    }
  }

  return json(results);
}
