import type { NextConfig } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://24now.kr";

const securityHeaders = [
  // 클릭재킹 방지
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // MIME 타입 스니핑 방지
  { key: "X-Content-Type-Options", value: "nosniff" },
  // XSS 필터 (레거시 브라우저)
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Referrer 정보 최소화
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // HTTPS 강제 (1년, 서브도메인 포함)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // 권한 정책 — 불필요한 브라우저 기능 비활성화
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
