import { NextResponse } from 'next/server';
import { init } from '@/lib/config/sources';

let initialized = false;

export function ensureInit() {
  if (!initialized) {
    init();
    initialized = true;
  }
}

export function json(data: any, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: { message } }, { status });
}
