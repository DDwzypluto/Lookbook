import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { ensureInit } from '@/lib/api-utils';
import { auth } from '@/lib/auth';

export async function GET() {
  ensureInit();
  const stories = getDb().prepare(`
    SELECT s.*, b.id as book_id, b.total_chapters, b.cover_url, u.name as author_name
    FROM ai_stories s
    LEFT JOIN books b ON b.source_url = ('ai://story/' || s.id)
    LEFT JOIN users u ON u.id = s.user_id
    WHERE s.status = 'published'
    ORDER BY b.total_chapters DESC, s.created_at DESC
    LIMIT 50
  `).all();
  return NextResponse.json({ stories });
}

export async function POST(request: NextRequest) {
  ensureInit();
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : 1;
  const body = await request.json();
  const { title, synopsis, genre, language, style, outline, config } = body;

  if (!title) return NextResponse.json({ error: '书名不能为空' }, { status: 400 });

  const result = getDb().prepare(`
    INSERT INTO ai_stories (user_id, title, synopsis, genre, language, style, status, token_cost)
    VALUES (?, ?, ?, ?, ?, ?, 'draft', 0)
  `).run(userId, title, synopsis || '', genre || '', language || 'zh-CN', style || '',);

  const storyId = result.lastInsertRowid;

  // Store the outline and config as metadata (for chapter generation)
  if (outline) {
    getDb().prepare('UPDATE ai_stories SET synopsis = synopsis || ? WHERE id = ?')
      .run(`\n【大纲JSON】${JSON.stringify(outline)}`, Number(storyId));
    getDb().prepare('UPDATE ai_stories SET synopsis = synopsis || ? WHERE id = ?')
      .run(`\n【配置JSON】${JSON.stringify(config)}`, Number(storyId));
  }

  return NextResponse.json({ id: storyId });
}
