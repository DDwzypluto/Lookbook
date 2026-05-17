import { ensureInit, json, jsonError } from '@/lib/api-utils';
import { spiderRegistry } from '@/lib/spider/registry';
import { BiqugeSpider } from '@/lib/spider/biquge';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  ensureInit();
  try {
    const { sourceId } = await request.json();
    const source = spiderRegistry.get(sourceId) as BiqugeSpider;
    if (!source) return jsonError('未知书源', 400);

    // Test the search page fetch
    const encoded = encodeURIComponent('斗罗大陆');
    const url = `${source.baseUrl}/search?keyword=${encoded}`;
    const html = await (source as any).fetch(url);

    return json({
      sourceId,
      url,
      length: html.length,
      hasCloudflare: html.includes('challenge') || html.includes('cf-') || html.includes('Cloudflare'),
      head: html.slice(0, 600),
    });
  } catch (e: any) {
    return jsonError(e.message, 500);
  }
}
