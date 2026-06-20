import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateChapter, type StoryConfig } from '@/lib/ai/engine';
import { auth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : 1;

  const { id } = await params;
  const db = getDb();

  const story = db.prepare('SELECT * FROM ai_stories WHERE id = ?').get(Number(id)) as any;
  if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

  // Parse outline and config from synopsis
  let outline: any = { chapterOutlines: [] };
  let config: StoryConfig = {} as StoryConfig;
  try {
    const outlineMatch = story.synopsis?.match(/【大纲JSON】(\{[\s\S]*?\})【配置JSON】/);
    const configMatch = story.synopsis?.match(/【配置JSON】(\{[\s\S]*?\})/);
    if (outlineMatch) outline = JSON.parse(outlineMatch[1]);
    if (configMatch) config = JSON.parse(configMatch[1]);
  } catch {}

  const chapterNum = (request as any).nextUrl?.searchParams?.get('chapter')
    ? Number(new URL(request.url).searchParams.get('chapter'))
    : (story.total_chapters || 0) + 1;

  const totalOutlined = outline.chapterOutlines?.length || 0;
  if (chapterNum > totalOutlined && totalOutlined > 0) {
    return NextResponse.json({ error: '所有章节已生成完毕' }, { status: 400 });
  }

  // Get previous chapters for context
  const book = db.prepare("SELECT * FROM books WHERE source_url = ?").get(`ai://story/${id}`) as any;
  let prevChapters: any[] = [];
  if (book) {
    prevChapters = db.prepare(
      'SELECT * FROM chapters WHERE book_id = ? ORDER BY chapter_num ASC'
    ).all(book.id) as any[];
  }

  // Generate the chapter
  let title = `第${chapterNum}章`;
  let content = '';
  try {
    const result = await generateChapter(
      config,
      outline,
      chapterNum,
      prevChapters.map(c => ({ number: c.chapter_num, title: c.title, content: c.content }))
    );
    title = result.title || title;
    content = result.content || '';
  } catch (e: any) {
    return NextResponse.json({ error: `AI生成失败: ${e.message}` }, { status: 500 });
  }

  if (!content) return NextResponse.json({ error: 'AI未返回内容' }, { status: 500 });

  // Create or get the book entry
  let bookId = book?.id;
  if (!bookId) {
    bookId = db.prepare(`
      INSERT INTO books (title, author, description, source_id, source_url, language)
      VALUES (?, ?, ?, 'ai-generated', ?, ?)
    `).run(
      story.title,
      (db.prepare('SELECT name FROM users WHERE id = ?').get(story.user_id) as any)?.name || 'AI Author',
      (story.synopsis || '').replace(/【大纲JSON】[\s\S]*/, '').slice(0, 500),
      `ai://story/${id}`,
      story.language || 'zh-CN'
    ).lastInsertRowid;
  } else {
    // Update book metadata
    db.prepare('UPDATE books SET total_chapters = ?, last_chapter = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(chapterNum, title, bookId);
  }

  // Save chapter
  const wordCount = content.replace(/\s/g, '').length;
  db.prepare(`
    INSERT OR REPLACE INTO chapters (book_id, title, chapter_num, source_url, content, is_cached, word_count)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `).run(bookId, title, chapterNum, `ai://story/${id}/chapter/${chapterNum}`, content, wordCount);

  // Update story progress
  db.prepare('UPDATE ai_stories SET total_chapters = ?, total_words = total_words + ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(chapterNum, wordCount, 'published', Number(id));

  return NextResponse.json({
    chapter: { number: chapterNum, title, wordCount },
    bookId,
    progress: `${chapterNum}/${totalOutlined || '?'}`,
  });
}
