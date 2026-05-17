import { listBookmarks, insertBookmark, deleteBookmark } from '@/lib/db';
import { ensureInit, json, jsonError } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureInit();
  try {
    const { id } = await params;
    const bookmarks = listBookmarks(Number(id));
    return json(bookmarks);
  } catch (e: any) {
    return jsonError(e.message, 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureInit();
  try {
    const { id } = await params;
    const { chapterId, note, chapterOffset } = await request.json();
    const result = insertBookmark({ book_id: Number(id), chapter_id: Number(chapterId), note: note || '', chapter_offset: Number(chapterOffset) || 0 });
    return json(result);
  } catch (e: any) {
    return jsonError(e.message, 500);
  }
}
