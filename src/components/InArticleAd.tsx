'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';

interface Props {
  googleClient?: string;
  baiduId?: string;
  format?: 'auto' | 'rectangle' | 'horizontal';
}

export default function InArticleAd({ googleClient, baiduId, format = 'rectangle' }: Props) {
  const locale = useLocale();

  const isZh = locale === 'zh';
  const activeClient = isZh ? baiduId : googleClient;

  useEffect(() => {
    if (isZh && baiduId) {
      try {
        const script = document.createElement('script');
        script.src = 'https://cpro.baidustatic.com/cpro/ui/cm.js';
        script.async = true;
        document.head.appendChild(script);
      } catch {}
    }
    if (!isZh && googleClient) {
      try {
        const win = window as any;
        (win.adsbygoogle = win.adsbygoogle || []).push({});
      } catch {}
    }
  }, [isZh, baiduId, googleClient]);

  if (!activeClient) return null;

  const style = format === 'horizontal'
    ? { width: '100%', minHeight: '90px' }
    : { width: '100%', minHeight: '250px', maxWidth: '336px', margin: '0 auto' };

  return (
    <div className="my-6 flex justify-center">
      <div className="rounded-lg p-2" style={{ borderColor: 'var(--border)' }}>
        {isZh ? (
          <div className="baidu-ad" style={style}>
            <ins className="adsbybaidu" style={{ display: 'block' }}
              data-ad-client={baiduId} data-ad-format="auto" />
          </div>
        ) : (
          <ins className="adsbygoogle" style={{ display: 'block', ...style }}
            data-ad-client={`ca-${googleClient}`}
            data-ad-format={format}
            data-full-width-responsive="true" />
        )}
      </div>
    </div>
  );
}
