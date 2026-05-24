const BQ_PROXY = process.env.BQ_PROXY || '';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
];

let proxyAgent: any = null;

function getProxyAgent() {
  if (BQ_PROXY && !proxyAgent) {
    try {
      const { ProxyAgent } = require('undici');
      proxyAgent = new ProxyAgent(BQ_PROXY);
    } catch { /* fallback: no proxy */ }
  }
  return proxyAgent;
}

export function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export function randomDelay(min = 800, max = 2200): Promise<void> {
  const ms = Math.random() * (max - min) + min;
  return new Promise(r => setTimeout(r, ms));
}

function looksLikeChallenge(html: string): boolean {
  if (html.length < 600) return true;
  if (html.includes('cf-challenge') || html.includes('_cf_chl_opt')) return true;
  if (html.includes('Just a moment') || html.includes('Checking your browser')) return true;
  return false;
}

export async function fetchWithRetry(
  url: string,
  options: { retries?: number; timeout?: number } = {}
): Promise<string> {
  const { retries = 4, timeout = 15000 } = options;
  const agent = getProxyAgent();

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const delay = attempt === 0 ? randomDelay(500, 1500) : randomDelay(3000, 8000);
      await delay;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const fetchOpts: any = {
        headers: {
          'User-Agent': randomUA(),
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'zh-CN,zh;q=0.9',
        },
        signal: controller.signal,
        redirect: 'follow',
      };
      if (agent) fetchOpts.dispatcher = agent;

      const resp = await fetch(url, fetchOpts);
      clearTimeout(timer);

      if (!resp.ok) {
        if (resp.status === 429) { await randomDelay(5000, 10000); continue; }
        if (resp.status >= 500) { await randomDelay(2000, 5000); continue; }
        throw new Error(`HTTP ${resp.status}`);
      }

      let html: string;
      const contentType = resp.headers.get('content-type') || '';

      if (contentType.includes('gb') || contentType.includes('GB')) {
        const buf = Buffer.from(await resp.arrayBuffer());
        try {
          const iconv = await import('iconv-lite');
          html = iconv.default.decode(buf, 'gbk');
        } catch {
          html = buf.toString('utf-8');
        }
      } else {
        html = await resp.text();
      }

      if (looksLikeChallenge(html) && attempt < retries - 1) continue;

      return html;
    } catch (err: any) {
      if (attempt === retries - 1) throw err;
    }
  }
  throw new Error('fetchWithRetry: unreachable');
}
