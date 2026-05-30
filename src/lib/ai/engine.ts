const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function chat(messages: ChatMessage[], temperature = 0.8, maxTokens = 4000): Promise<string> {
  if (!DEEPSEEK_KEY) throw new Error('DEEPSEEK_API_KEY not configured');

  const resp = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
    signal: AbortSignal.timeout(120000),
  });

  const data = await resp.json() as any;
  if (data.error) throw new Error(data.error.message || 'AI API error');
  return data.choices?.[0]?.message?.content || '';
}

export interface StoryConfig {
  title: string;
  authorName: string;
  genre: string;
  language: string;
  pov: string;           // 人称
  style: string;         // 写作风格
  creativity: number;    // 0.3~1.5
  protagonist: string;   // 主角设定
  sideCharacters: string; // 配角设定
  antagonist: string;    // 反派
  hook: string;          // 一句话梗概
  synopsis: string;      // 详细简介
  worldSetting: string;  // 世界观
  mainPlot: string;      // 主线
  subPlot: string;       // 支线
  coreConflict: string;  // 核心冲突
  openingHook: string;   // 开篇钩子
  totalChapters: number;
  wordsPerChapter: number;
  chapterTitleStyle: string;
}

export interface StoryOutline {
  title: string;
  synopsis: string;
  chapterOutlines: { number: number; title: string; summary: string }[];
}

export async function generateOutline(config: StoryConfig): Promise<StoryOutline> {
  const lang = config.language === 'en' ? 'English' : config.language === 'zh-TW' ? '繁體中文' : '简体中文';
  const chapterStyleHint = config.chapterTitleStyle === '悬念式' ? '标题要有悬念感，吸引读者点击' :
    config.chapterTitleStyle === '概括式' ? '标题要概括本章核心情节' : '标题要简洁明了';

  const prompt = `你是一位资深网络小说作家。请根据以下设定，为一部新小说生成大纲。

【基本信息】
书名：《${config.title}》
类型：${config.genre}
语言：${lang}
作者笔名：${config.authorName}

【叙述设定】
人称：${config.pov}
写作风格：${config.style}
AI创造力：${config.creativity}

【人物设定】
主角：${config.protagonist || '未指定'}
重要配角：${config.sideCharacters || '未指定'}
反派/对手：${config.antagonist || '未指定'}

【故事框架】
一句话梗概：${config.hook || '未指定'}
详细简介：${config.synopsis || '未指定'}
世界观：${config.worldSetting || '未指定'}
主线剧情：${config.mainPlot || '未指定'}
支线剧情：${config.subPlot || '未指定'}
核心冲突：${config.coreConflict || '未指定'}
开篇钩子：${config.openingHook || '未指定'}

【分章】
总章节：${config.totalChapters}章
每章字数：${config.wordsPerChapter}字
章节标题风格：${chapterStyleHint}

请以JSON格式返回（不要markdown代码块），结构如下：
{
  "title": "优化后的书名",
  "synopsis": "优化后的简介（200字内）",
  "chapterOutlines": [
    {"number": 1, "title": "第1章标题", "summary": "本章内容概要（50字内）"},
    ...（共${Math.min(config.totalChapters, 30)}章大纲）
  ]
}`;

  const result = await chat([
    { role: 'system', content: '你是一位专业的小说大纲生成器。只返回JSON，不要任何额外说明。' },
    { role: 'user', content: prompt },
  ], 0.6, 4000);

  // Parse JSON from response (handle markdown code blocks)
  let json = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const outline = JSON.parse(json) as StoryOutline;
  return outline;
}

export async function generateChapter(
  config: StoryConfig,
  outline: StoryOutline,
  chapterNumber: number,
  previousChapters: { number: number; title: string; content: string }[]
): Promise<{ title: string; content: string }> {
  const lang = config.language === 'en' ? 'English' : config.language === 'zh-TW' ? '繁體中文' : '简体中文';
  const chapterOutline = outline.chapterOutlines.find(c => c.number === chapterNumber);
  const prevSummary = previousChapters.slice(-3).map(c =>
    `第${c.number}章《${c.title}》摘要：${c.content.slice(0, 200)}...`
  ).join('\n');

  const prompt = `请为小说《${config.title}》撰写第${chapterNumber}章。

【小说设定】
类型：${config.genre} | 人称：${config.pov} | 风格：${config.style}
语言：${lang}
主角：${config.protagonist}
世界观：${config.worldSetting}
核心冲突：${config.coreConflict}

【本章大纲】
${chapterOutline ? `${chapterOutline.summary}` : '按照故事主线自然推进'}

【前情提要】
${prevSummary || '这是第一章，没有前情'}

【写作要求】
- 字数：${config.wordsPerChapter}字左右
- 语言：${lang}
- 标题格式：${config.chapterTitleStyle === '悬念式' ? '使用悬念式标题' : config.chapterTitleStyle === '概括式' ? '使用概括式标题' : '简洁标题'}
- 保持风格一致，人物设定不矛盾
- 章节结尾留悬念或钩子

请以JSON格式返回（不要markdown代码块）：
{
  "title": "章节标题",
  "content": "章节正文内容"
}`;

  const result = await chat([
    { role: 'system', content: `你是一位资深${config.genre}小说作家，笔名${config.authorName}。只返回JSON格式。` },
    { role: 'user', content: prompt },
  ], config.creativity, config.wordsPerChapter * 2);

  let json = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(json) as { title: string; content: string };
}

export function estimateTokenCost(config: StoryConfig): number {
  // Rough estimate: ~2 tokens per Chinese character
  const charsPerChapter = config.wordsPerChapter;
  const promptOverhead = 800; // System prompt + context
  const totalTokens = (charsPerChapter + promptOverhead) * config.totalChapters * 1.5; // 1.5x buffer
  return Math.ceil(totalTokens / 1000); // Return in K tokens
}
