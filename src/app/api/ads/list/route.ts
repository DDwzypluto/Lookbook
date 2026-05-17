import { listAds, insertAd, updateAd, deleteAd } from '@/lib/db';
import { ensureInit, json, jsonError } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET() {
  ensureInit();
  return json(listAds());
}

export async function POST(request: NextRequest) {
  ensureInit();
  try {
    const body = await request.json();
    insertAd(body);
    return json({ success: true });
  } catch (e: any) {
    return jsonError(e.message, 500);
  }
}

export async function PUT(request: NextRequest) {
  ensureInit();
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    const body = await request.json();
    updateAd(id, body);
    return json({ success: true });
  } catch (e: any) {
    return jsonError(e.message, 500);
  }
}

export async function DELETE(request: NextRequest) {
  ensureInit();
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    deleteAd(id);
    return json({ success: true });
  } catch (e: any) {
    return jsonError(e.message, 500);
  }
}
