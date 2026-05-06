import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://24now.kr";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#000000",
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "24시나우 | 지금 내 주변 24시간 장소 찾기",
  description: "새벽에도, 휴일에도 — 지금 열려 있는 24시간 카페·편의점·세차장을 지도에서 바로 찾아보세요. 사용자 제보와 실시간 데이터로 가장 신뢰할 수 있는 밤샘 정보를 드립니다.",
  keywords: [
    "24시 카페", "24시간 카페", "야간 카페", "새벽 카페",
    "근처 24시", "24시 편의점", "야간 편의점",
    "야간 세차장", "24시 셀프세차", "24시간 세차",
    "밤샘지도", "24시나우", "24now", "약국", "PC방"
  ],
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: "24시나우 | 새벽에도 문 여는 곳, 지도에서 바로",
    description: "카페, 편의점, 세차장 — 지금 이 순간 열려 있는 곳을 지도 위에서 찾아보세요.",
    type: "website",
    url: BASE_URL,
    siteName: "24시나우",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 1200,
        alt: "24시나우 — 새벽에도 문 여는 곳 지도",
      },
    ],
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "24시나우",
    description: "새벽에도 문 여는 곳, 지도에서 바로 찾기",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

import KakaoScript from "@/components/KakaoScript";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const kakaoJsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

  return (
    <html lang="ko">
      <head>
        <KakaoScript />
        {/* Google AdSense */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9289780368966069"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
        {/* Load Kakao Maps SDK with libraries (services, clusterer, drawing) if needed later */}
        <Script
          strategy="beforeInteractive"
          src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoJsKey}&libraries=services&autoload=false`}
        />
      </head>
      <body>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-5L3MG4LSLQ"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-5L3MG4LSLQ');
          `}
        </Script>
        <div className="app-wrapper">
          {children}
        </div>
      </body>
    </html>
  );
}
