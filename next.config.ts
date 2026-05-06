import type { NextConfig } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://24now.kr";

const CSP = [
  "default-src 'self'",
  // Next.js 하이드레이션 + GA4 인라인 스크립트 + 구글 애드센스
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://dapi.kakao.com https://t1.daumcdn.net https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://adservice.google.com",
  // 인라인 스타일 (glassmorphism) + Google Fonts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // 지도 타일, 매장 이미지, 광고 이미지 등 외부 이미지 허용
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Supabase, Kakao API, Google Analytics, 애드센스 통신
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://dapi.kakao.com https://kauth.kakao.com https://kapi.kakao.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://pagead2.googlesyndication.com https://adservice.google.com",
  "frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // www → non-www 리다이렉트 (도메인 연결 후 활성화)
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.24now.kr" }],
        destination: `${SITE_URL}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
