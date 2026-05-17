import { getProgress, upsertProgress } from '@/lib/db';
import { ensureInit, json, jsonError } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureInit();
  try {
    const { id } = await params;
    const progress = getProgress(Number(id));
    return json(progress || null);
  } catch (e: any) {
    return jsonError(e.message, 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureInit();
  try {
    const { id } = await params;
    const { chapterId, scrollPercent } = await request.json();
    upsertProgress(Number(id), Number(chapterId), Number(scrollPercent));
    return json({ success: true });
  } catch (e: any) {
    return jsonError(e.message, 500);
  }
}

// sendBeacon uses POST
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureInit();
  try {
    const { id } = await params;
    const body = await request.text();
    const { chapterId, scrollPercent } = JSON.parse(body);
    upsertProgress(Number(id), Number(chapterId), Number(scrollPercent));
    return json({ success: true });
  } catch (e: any) {
    return jsonError(e.message, 500);
  }
}
