import { spiderRegistry } from '@/lib/spider/registry';
import { ensureInit, json, jsonError } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  ensureInit();
  try {
    const { keyword, sourceId } = await request.json();
    if (!keyword) return jsonError('请输入搜索关键词', 400);

    const sources = sourceId
      ? [spiderRegistry.get(sourceId)].filter(s => s != null)
      : spiderRegistry.getEnabled();

    const allResults: any[] = [];

    for (const source of sources) {
      try {
        const results = await source!.search(keyword);
        for (const r of results) {
          allResults.push({
            ...r,
            sourceId: source!.id,
            sourceName: source!.name,
          });
        }
        if (sourceId) break;
        if (allResults.length > 0) break;
      } catch {
        // Skip failed sources
      }
    }

    return json(allResults);
  } catch (e: any) {
    return jsonError(e.message, 500);
  }
}
