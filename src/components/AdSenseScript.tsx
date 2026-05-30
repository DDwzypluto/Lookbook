'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';

interface Props {
  googleId?: string;
  baiduId?: string;
}

export default function AdSenseScript({ googleId, baiduId }: Props) {
  const locale = useLocale();

  useEffect(() => {
    if (locale === 'zh' && baiduId) {
      if (document.querySelector('script[src*="cpro.baidustatic"]')) return;
      const script = document.createElement('script');
      script.src = 'https://cpro.baidustatic.com/cpro/ui/cm.js';
      script.async = true;
      document.head.appendChild(script);
    }

    if (locale !== 'zh' && googleId) {
      if (document.querySelector('script[src*="pagead2.googlesyndication"]')) return;
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${googleId}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }
  }, [locale, googleId, baiduId]);

  return null;
}
