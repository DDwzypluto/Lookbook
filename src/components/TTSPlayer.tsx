'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Props {
  content: string;
  lang: string;
  onClose: () => void;
}

const PREMIUM_VOICES: Record<string, string[]> = {
  zh: ['Google', 'Tingting', 'Yaoyao', 'Meijia', 'Yunxi', 'Xiaoxiao', 'zh-CN'],
  en: ['Google', 'Samantha', 'Alex', 'Daniel', 'Karen', 'Microsoft', 'en-US', 'en-GB'],
};

function findBestVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const prefs = PREMIUM_VOICES[lang] || [];
  for (const name of prefs) {
    const found = voices.find(v => v.name.includes(name));
    if (found) return found;
  }
  return voices.find(v => v.lang.startsWith(lang)) || null;
}

export default function TTSPlayer({ content, lang, onClose }: Props) {
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [charIdx, setCharIdx] = useState(0);
  const [error, setError] = useState('');
  const totalRef = useRef(0);
  const mountedRef = useRef(true);

  const cleanText = (content || '').replace(/<[^>]+>/g, '').trim();

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      if (!voice) {
        const best = findBestVoice(lang);
        if (best) setVoice(best);
      }
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, [lang]); // eslint-disable-line

  const stop = useCallback(() => {
    try { window.speechSynthesis.cancel(); } catch {}
    setPlaying(false);
    setPaused(false);
    setCharIdx(0);
    setError('');
  }, []);

  const speak = useCallback(() => {
    if (!cleanText) return;
    setError('');

    try { window.speechSynthesis.cancel(); } catch {}

    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.voice = voice;
    utter.rate = speed;
    utter.pitch = 1.0;
    utter.volume = 1;
    utter.lang = lang === 'en' ? 'en-US' : 'zh-CN';

    totalRef.current = cleanText.length;
    setCharIdx(0);

    utter.onboundary = (e) => {
      if (e.charIndex !== undefined && mountedRef.current) setCharIdx(e.charIndex);
    };
    utter.onend = () => {
      if (mountedRef.current) { setPlaying(false); setPaused(false); setCharIdx(totalRef.current); }
    };
    utter.onerror = (e) => {
      if (!mountedRef.current) return;
      // 'canceled' is normal when user stops, don't show error
      if (e.error === 'canceled' || e.error === 'interrupted') {
        setPlaying(false);
        setPaused(false);
        return;
      }
      setError(`Speech error: ${e.error || 'unknown'}`);
      setPlaying(false);
      setPaused(false);
    };

    try {
      window.speechSynthesis.speak(utter);
      setPlaying(true);
      setPaused(false);
    } catch (e: any) {
      setError(e.message || 'Speech failed');
    }
  }, [cleanText, voice, speed, lang]);

  const pause = useCallback(() => {
    try { window.speechSynthesis.pause(); } catch {}
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    try { window.speechSynthesis.resume(); } catch {}
    setPaused(false);
  }, []);

  useEffect(() => {
    return () => {
      try { window.speechSynthesis.cancel(); } catch {}
    };
  }, []);

  const progress = totalRef.current > 0 ? Math.round(charIdx / totalRef.current * 100) : 0;
  const langVoices = voices.filter(v => v.lang.startsWith(lang));

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 rounded-xl border px-5 py-3 shadow-lg backdrop-blur-md min-w-[360px]"
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
      {error && (
        <div className="flex items-center justify-between rounded px-3 py-2" style={{ backgroundColor: 'rgba(229,62,62,0.1)' }}>
          <p className="text-xs" style={{ color: '#e53e3e' }}>{error}</p>
          <button onClick={() => setError('')} className="text-xs" style={{ color: '#e53e3e' }}>✕</button>
        </div>
      )}

      {langVoices.length === 0 && !error && (
        <p className="text-xs text-center" style={{ color: 'var(--accent)' }}>
          No {lang} voices. Install language pack in system settings.
        </p>
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }} />
        </div>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{progress}%</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => { if (!playing) speak(); else if (paused) resume(); else pause(); }}
          disabled={!cleanText}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white text-lg disabled:opacity-40"
          style={{ backgroundColor: 'var(--accent)' }}>
          {!playing ? '▶' : paused ? '▶' : '⏸'}
        </button>
        <button onClick={stop}
          className="flex h-8 w-8 items-center justify-center rounded border"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>⏹</button>

        <select value={speed} onChange={e => setSpeed(Number(e.target.value))}
          className="rounded border px-2 py-1 text-xs bg-transparent"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          {[0.75, 0.9, 1, 1.15, 1.3, 1.5].map(s => <option key={s} value={s}>{s}x</option>)}
        </select>

        <select value={voice?.name || ''} onChange={e => { const v = voices.find(v => v.name === e.target.value); if (v) setVoice(v); }}
          className="rounded border px-2 py-1 text-xs bg-transparent flex-1 min-w-0"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          {langVoices.length > 0
            ? langVoices.map(v => <option key={v.name} value={v.name}>{v.name} {v.localService ? '(local)' : '(remote)'}</option>)
            : <option value="">No voices</option>}
        </select>

        <button onClick={onClose}
          className="rounded border px-2 py-1 text-xs"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>✕</button>
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
        {!playing ? 'Ready' : paused ? 'Paused' : `Speaking · ${voice?.name || 'Default'}`}
      </p>
    </div>
  );
}
