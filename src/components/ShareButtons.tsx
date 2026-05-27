'use client';

import { useState, useCallback, useEffect } from 'react';

interface ShareButtonsProps {
  title: string;
  description: string;
  url: string;         // 공유할 전체 URL (https://24now.kr/guide/...)
  imageUrl: string;    // OG 이미지 URL
}

const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? '';
const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';

function loadKakaoSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject();
    if (window.Kakao?.isInitialized?.()) return resolve();

    // SDK가 이미 로드됐지만 아직 init 안 된 경우
    if (window.Kakao) {
      window.Kakao.init(KAKAO_JS_KEY);
      return resolve();
    }

    const script = document.createElement('script');
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.onload = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(KAKAO_JS_KEY);
      }
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function ShareButtons({ title, description, url, imageUrl }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [kakaoReady, setKakaoReady] = useState(false);

  useEffect(() => {
    loadKakaoSdk()
      .then(() => setKakaoReady(true))
      .catch(() => {});
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [url]);

  const handleKakao = useCallback(async () => {
    if (!kakaoReady) {
      await loadKakaoSdk().catch(() => {});
    }
    if (!window.Kakao?.Share) return;

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title,
        description,
        imageUrl,
        link: {
          mobileWebUrl: url,
          webUrl: url,
        },
      },
      buttons: [
        {
          title: '가이드 보기',
          link: { mobileWebUrl: url, webUrl: url },
        },
        {
          title: '지도에서 찾기',
          link: {
            mobileWebUrl: 'https://24now.kr',
            webUrl: 'https://24now.kr',
          },
        },
      ],
    });
  }, [kakaoReady, title, description, imageUrl, url]);

  return (
    <div className="share-buttons">
      <span className="share-label">공유하기</span>
      <div className="share-btn-group">
        {/* 링크 복사 */}
        <button
          className={`share-btn share-btn-copy ${copied ? 'share-btn-copied' : ''}`}
          onClick={handleCopy}
          aria-label="링크 복사"
        >
          {copied ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              복사됨
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              링크 복사
            </>
          )}
        </button>

        {/* 카카오 공유 */}
        <button
          className="share-btn share-btn-kakao"
          onClick={handleKakao}
          aria-label="카카오톡으로 공유"
        >
          {/* 카카오 로고 */}
          <svg width="18" height="17" viewBox="0 0 18 17" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M9 0C4.029 0 0 3.134 0 7c0 2.493 1.638 4.681 4.108 5.945L3.03 16.5a.375.375 0 0 0 .553.407L8.25 14.01c.246.017.494.026.75.026 4.971 0 9-3.134 9-7S13.971 0 9 0z" fill="currentColor"/>
          </svg>
          카카오 공유
        </button>
      </div>
    </div>
  );
}
