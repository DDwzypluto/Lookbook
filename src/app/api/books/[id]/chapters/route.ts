import { listChapters, getAdjacentChapter } from '@/lib/db';
import { ensureInit, json, jsonError } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureInit();
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('pageSize')) || 200;

    const all = listChapters(Number(id));
    const start = (page - 1) * pageSize;
    const items = all.slice(start, start + pageSize);

    return json({ items, total: all.length, page, pageSize });
  } catch (e: any) {
    return jsonError(e.message, 500);
  }
}
