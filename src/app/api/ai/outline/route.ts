import { NextRequest, NextResponse } from 'next/server';
import { generateOutline, estimateTokenCost, type StoryConfig } from '@/lib/ai/engine';

export async function POST(request: NextRequest) {
  try {
    const config: StoryConfig = await request.json();
    if (!config.title) return NextResponse.json({ error: '书名不能为空' }, { status: 400 });

    const tokenEstimate = estimateTokenCost(config);
    const outline = await generateOutline(config);

    return NextResponse.json({
      outline,
      tokenEstimate,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
