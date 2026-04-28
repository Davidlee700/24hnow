'use client';

import Script from 'next/script';

export default function KakaoScript() {
  return (
    <Script
      src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.0/kakao.min.js"
      strategy="afterInteractive"
      onLoad={() => {
        const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
        if (window.Kakao && !window.Kakao.isInitialized() && key) {
          window.Kakao.init(key);
        }
      }}
    />
  );
}
