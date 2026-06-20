'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

const GENRES = ['玄幻', '仙侠', '都市', '科幻', '言情', '悬疑', '历史', '网游', '轻小说', '短篇'];
const POVS = ['第一人称', '第三人称限知', '第三人称全知'];
const STYLES = ['轻松爽文', '严肃文学', '幽默吐槽', '暗黑压抑', '诗意文艺', '网文化'];
const LANGUAGES = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en', label: 'English' },
];
const TITLE_STYLES = ['简洁', '悬念式', '概括式'];

interface FormData {
  title: string; authorName: string; genre: string; language: string;
  pov: string; style: string; creativity: number;
  protagonist: string; sideCharacters: string; antagonist: string;
  hook: string; synopsis: string; worldSetting: string;
  mainPlot: string; subPlot: string; coreConflict: string; openingHook: string;
  totalChapters: number; wordsPerChapter: number; chapterTitleStyle: string;
}

const defaultForm: FormData = {
  title: '', authorName: '', genre: '玄幻', language: 'zh-CN',
  pov: '第三人称全知', style: '轻松爽文', creativity: 0.8,
  protagonist: '', sideCharacters: '', antagonist: '',
  hook: '', synopsis: '', worldSetting: '',
  mainPlot: '', subPlot: '', coreConflict: '', openingHook: '',
  totalChapters: 50, wordsPerChapter: 2000, chapterTitleStyle: '简洁',
};

export default function CreateStoryPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [outline, setOutline] = useState<any>(null);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState('');

  const update = (field: keyof FormData, value: any) => setForm(f => ({ ...f, [field]: value }));

  const handleGenerateOutline = async () => {
    if (!form.title) { setError('请输入书名'); return; }
    setLoading(true); setError('');
    try {
      const resp = await fetch('/api/ai/outline', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await resp.json();
      if (d.error) throw new Error(d.error);
      if (!d.outline) throw new Error('AI 返回数据异常，请重试');
      setOutline(d.outline);
      setStep(4);
    } catch (e: any) { setError(e.message || '请求失败，请检查网络后重试'); }
    finally { setLoading(false); }
  };

  const handleGenerateAll = async () => {
    if (!outline) return;
    setGenerating(true);
    setError('');
    try {
      // Save story to DB
      const saveResp = await fetch('/api/stories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: outline.title || form.title,
          synopsis: outline.synopsis || form.synopsis,
          genre: form.genre, language: form.language, style: form.style,
          outline, config: form,
        }),
      });
      const saveData = await saveResp.json();
      if (saveData.error) throw new Error(saveData.error);
      const storyId = saveData.id;

      // Generate all chapters
      const totalChapters = outline.chapterOutlines?.length || 10;
      let lastBookId = 0;
      for (let i = 1; i <= totalChapters; i++) {
        setGenProgress(`正在生成第 ${i}/${totalChapters} 章...`);
        const genResp = await fetch(`/api/stories/${storyId}/generate?chapter=${i}`, {
          method: 'POST',
        });
        const genData = await genResp.json();
        if (genData.error) throw new Error(genData.error);
        lastBookId = genData.bookId;
      }

      setGenProgress('✅ 全部生成完毕！');
      if (lastBookId) {
        setTimeout(() => router.push(`/books/${lastBookId}`), 1000);
      }
    } catch (e: any) {
      setError(e.message);
      setGenerating(false);
    }
  };

  const steps = ['基础信息', '叙述风格', '人物设定', '故事框架', '生成预览'];

  const inputClass = "w-full rounded-lg border px-4 py-3 text-sm outline-none transition-colors focus:ring-2";
  const labelClass = "mb-1 block text-xs font-medium";
  const textareaClass = "w-full rounded-lg border px-4 py-3 text-sm outline-none transition-colors focus:ring-2 min-h-[80px] resize-y";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>AI 故事创作</h1>

      {/* Step indicator */}
      <div className="mb-8 flex gap-1">
        {steps.map((s, i) => (
          <div key={i} className="flex-1">
            <div className="h-1 rounded-full transition-colors"
              style={{ backgroundColor: i <= step ? 'var(--accent)' : 'var(--border)' }} />
            <p className="mt-1 text-xs text-center" style={{ color: i <= step ? 'var(--accent)' : 'var(--text-secondary)' }}>
              {i + 1}. {s}
            </p>
          </div>
        ))}
      </div>

      {/* Step 0: Basic Info */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>书名 *</label>
            <input className={inputClass} style={inputStyle} value={form.title} onChange={e => update('title', e.target.value)}
              placeholder="给你的故事起个名字..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>笔名</label>
              <input className={inputClass} style={inputStyle} value={form.authorName} onChange={e => update('authorName', e.target.value)}
                placeholder="你的笔名" />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>小说类型</label>
              <select className={inputClass} style={inputStyle} value={form.genre} onChange={e => update('genre', e.target.value)}>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>输出语言</label>
              <select className={inputClass} style={inputStyle} value={form.language} onChange={e => update('language', e.target.value)}>
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>总章节数</label>
              <input className={inputClass} style={inputStyle} type="number" min={5} max={500} value={form.totalChapters}
                onChange={e => update('totalChapters', Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>每章字数</label>
              <input className={inputClass} style={inputStyle} type="number" min={500} max={5000} step={500} value={form.wordsPerChapter}
                onChange={e => update('wordsPerChapter', Number(e.target.value))} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>章节标题风格</label>
              <select className={inputClass} style={inputStyle} value={form.chapterTitleStyle} onChange={e => update('chapterTitleStyle', e.target.value)}>
                {TITLE_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Narrative Style */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>叙述人称</label>
              <select className={inputClass} style={inputStyle} value={form.pov} onChange={e => update('pov', e.target.value)}>
                {POVS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>写作风格</label>
              <select className={inputClass} style={inputStyle} value={form.style} onChange={e => update('style', e.target.value)}>
                {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>
                AI 创造力：{form.creativity.toFixed(1)}
              </label>
              <input type="range" min="0.3" max="1.5" step="0.1" value={form.creativity}
                onChange={e => update('creativity', Number(e.target.value))}
                className="w-full mt-3" />
              <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>保守</span><span>发散</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Characters */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>主角设定</label>
            <textarea className={textareaClass} style={inputStyle} value={form.protagonist}
              onChange={e => update('protagonist', e.target.value)}
              placeholder="姓名、年龄、性格、背景故事、核心动机..." />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>重要配角</label>
            <textarea className={textareaClass} style={inputStyle} value={form.sideCharacters}
              onChange={e => update('sideCharacters', e.target.value)}
              placeholder="配角1: 姓名、性格、与主角关系...&#10;配角2: 姓名、性格、与主角关系..." />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>反派/对手</label>
            <textarea className={textareaClass} style={inputStyle} value={form.antagonist}
              onChange={e => update('antagonist', e.target.value)}
              placeholder="反派的身份、动机、与主角的冲突..." />
          </div>
        </div>
      )}

      {/* Step 3: Story Framework */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>一句话梗概 *</label>
            <input className={inputClass} style={inputStyle} value={form.hook}
              onChange={e => update('hook', e.target.value)}
              placeholder="用一句话抓住读者，例：废柴少年觉醒上古血脉，诸天神佛皆为蝼蚁" />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>详细简介</label>
            <textarea className={textareaClass} style={inputStyle} value={form.synopsis}
              onChange={e => update('synopsis', e.target.value)}
              placeholder="500字内的故事概要，介绍主要情节..." rows={4} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>世界观设定</label>
            <textarea className={textareaClass} style={inputStyle} value={form.worldSetting}
              onChange={e => update('worldSetting', e.target.value)}
              placeholder="故事发生的世界、规则、势力、历史..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>主线剧情</label>
              <textarea className={textareaClass} style={inputStyle} value={form.mainPlot}
                onChange={e => update('mainPlot', e.target.value)}
                placeholder="主线剧情走向..." />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>支线剧情</label>
              <textarea className={textareaClass} style={inputStyle} value={form.subPlot}
                onChange={e => update('subPlot', e.target.value)}
                placeholder="副线、感情线..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>核心冲突</label>
              <textarea className={textareaClass} style={inputStyle} value={form.coreConflict}
                onChange={e => update('coreConflict', e.target.value)}
                placeholder="推动故事的主要矛盾..." />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>开篇钩子</label>
              <textarea className={textareaClass} style={inputStyle} value={form.openingHook}
                onChange={e => update('openingHook', e.target.value)}
                placeholder="第一章如何抓住读者..." />
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Outline Preview */}
      {step === 4 && outline && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4" style={{ borderColor: 'var(--accent)', backgroundColor: 'var(--bg-secondary)' }}>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>📖 {outline.title}</h3>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{outline.synopsis}</p>
          </div>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>章节大纲（共 {outline.chapterOutlines?.length || 0} 章）</h3>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {outline.chapterOutlines?.map((ch: any) => (
              <div key={ch.number} className="rounded-lg border p-3 flex gap-3"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                <span className="text-sm font-bold shrink-0" style={{ color: 'var(--accent)' }}>第{ch.number}章</span>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{ch.title}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{ch.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="mt-8 flex justify-between">
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
          className="rounded-lg border px-6 py-3 text-sm transition-opacity disabled:opacity-30"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          ← 上一步
        </button>

        {step < 3 ? (
          <button onClick={() => setStep(s => s + 1)}
            className="rounded-lg px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-85"
            style={{ backgroundColor: 'var(--accent)' }}>
            下一步 →
          </button>
        ) : step === 3 ? (
          <button onClick={handleGenerateOutline} disabled={loading}
            className="rounded-lg px-6 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)' }}>
            {loading ? '⏳ AI 生成中...' : '✨ 生成大纲'}
          </button>
        ) : (
          <button onClick={handleGenerateAll} disabled={generating}
            className="rounded-lg px-6 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)' }}>
            {generating ? (genProgress || '⏳ 生成中...') : '✅ 确认并逐章生成'}
          </button>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  borderColor: 'var(--border)',
  backgroundColor: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
} as const;
