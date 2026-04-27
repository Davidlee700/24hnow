'use client';

import Script from 'next/script';

export default function KakaoScript() {
  return (
    <Script
      src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.0/kakao.min.js"
      strategy="afterInteractive"
      onLoad={() => {
        if (window.Kakao && !window.Kakao.isInitialized()) {
          window.Kakao.init('267ae86d30c2a074fc1f69eb82b93c8f');
        }
      }}
    />
  );
}
