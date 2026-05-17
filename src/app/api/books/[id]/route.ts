import { getBook, deleteBook, getProgress, getAdjacentChapter } from '@/lib/db';
import { listChapters } from '@/lib/db';
import { ensureInit, json, jsonError } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureInit();
  try {
    const { id } = await params;
    const book = getBook(Number(id));
    if (!book) return jsonError('书籍不存在', 404);
    const chapters = listChapters(book.id);
    const progress = getProgress(book.id);
    return json({ ...book, chapters, progress });
  } catch (e: any) {
    return jsonError(e.message, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureInit();
  try {
    const { id } = await params;
    deleteBook(Number(id));
    return json({ success: true });
  } catch (e: any) {
    return jsonError(e.message, 500);
  }
}
