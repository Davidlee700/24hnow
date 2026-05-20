'use client';

import { useEffect } from 'react';
import Script from 'next/script';

interface AdBannerProps {
  dataAdSlot: string;
  dataAdFormat?: string;
  dataFullWidthResponsive?: boolean;
}

export default function AdBanner({
  dataAdSlot,
  dataAdFormat = 'auto',
  dataFullWidthResponsive = true,
}: AdBannerProps) {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error', err);
    }
  }, []);

  return (
    <div
      style={{
        margin: '24px 0',
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'var(--material-thin)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '0.5px solid var(--border-light)',
        padding: '8px', // 패딩을 주어 광고 주변에 여유를 줌 (Apple 감성)
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100px', // 광고가 뜨기 전 빈 공간 유지
      }}
    >
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9289780368966069"
        crossOrigin="anonymous"
        strategy="lazyOnload" // 메인 UI 로딩 후 지연 로드
      />
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%' }}
        data-ad-client="ca-pub-9289780368966069"
        data-ad-slot={dataAdSlot}
        data-ad-format={dataAdFormat}
        data-full-width-responsive={dataFullWidthResponsive}
      />
    </div>
  );
}
