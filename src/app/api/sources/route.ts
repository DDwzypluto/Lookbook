import { spiderRegistry } from '@/lib/spider/registry';
import { ensureInit, json, jsonError } from '@/lib/api-utils';

export async function GET() {
  ensureInit();
  try {
    const sources = spiderRegistry.getAll().map(s => ({
      id: s.id,
      name: s.name,
      baseUrl: s.baseUrl,
      enabled: s.enabled,
    }));
    return json(sources);
  } catch (e: any) {
    return jsonError(e.message, 500);
  }
}
