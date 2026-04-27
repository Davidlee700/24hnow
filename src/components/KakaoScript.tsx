'use client';

import Script from 'next/script';

export default function KakaoScript() {
  return (
    <Script
      src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.0/kakao.min.js"
      integrity="sha384-lSQ7vULjY7ByPu7JstS+6SOm97n69OaGf9InpS9D05FvI5Oq0uXN5+vTzZ45b6u1"
      crossOrigin="anonymous"
      strategy="afterInteractive"
      onLoad={() => {
        if (window.Kakao && !window.Kakao.isInitialized()) {
          window.Kakao.init('267ae86d30c2a074fc1f69eb82b93c8f');
        }
      }}
    />
  );
}
