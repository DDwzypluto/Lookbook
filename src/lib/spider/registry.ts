import type { BookSource } from './types';

class SpiderRegistry {
  private sources = new Map<string, BookSource>();

  register(source: BookSource) {
    this.sources.set(source.id, source);
  }

  get(id: string): BookSource | undefined {
    return this.sources.get(id);
  }

  getAll(): BookSource[] {
    return Array.from(this.sources.values());
  }

  getEnabled(): BookSource[] {
    return this.getAll().filter(s => s.enabled);
  }
}

export const spiderRegistry = new SpiderRegistry();
