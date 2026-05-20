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
  verification: {
    other: { 'naver-site-verification': 'c5dc754217a37217eaae29667c74a995b8890eeb' },
  },
  title: "24시나우 | 내 주변 24시간 카페·편의점 지도 찾기",
  description: "지금 내 주변에서 열려 있는 24시 카페·편의점·세차장·약국을 지도에서 바로 찾아보세요. 새벽에도, 휴일에도 — 24시나우.",
  keywords: [
    // 핵심 (검색량 상위)
    "24시 카페", "24시간 카페", "내주변 24시 카페", "24시간 카페 찾기",
    // 지역별 롱테일 (블랙키위 데이터 기반)
    "홍대 24시간 카페", "강남역 24시간 카페", "광화문 24시간 카페",
    "경기도 24시 카페", "남양주 24시간 카페", "서울 근교 24시간 카페",
    "강남 24시 카페", "신촌 24시 카페", "이태원 24시 카페",
    "합정 24시 카페", "건대 24시 카페", "신림 24시 카페",
    // 야간·새벽
    "새벽 카페", "심야 카페", "야간 카페", "밤새 카페", "밤늦게 카페",
    // 편의점·기타
    "24시 편의점", "24시간 편의점", "근처 24시 편의점",
    "24시 셀프세차", "24시간 세차장", "24시 PC방", "24시 코인노래방",
    // 브랜드
    "밤샘지도", "24시나우", "24now",
  ],
  openGraph: {
    title: "24시나우 | 내 주변 24시간 카페·편의점 지도",
    description: "홍대·강남·경기도 — 지금 열려 있는 24시간 영업 장소를 지도에서 바로 찾아보세요.",
    type: "website",
    url: BASE_URL,
    siteName: "24시나우",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 1200,
        alt: "24시나우 — 내 주변 24시간 카페·편의점 지도",
      },
    ],
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "24시나우 | 내 주변 24시간 카페 지도",
    description: "홍대·강남·경기도 — 지금 열려 있는 24시 영업 장소 바로 찾기",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

import KakaoScript from "@/components/KakaoScript";

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${BASE_URL}/#webapp`,
      "name": "24시나우",
      "url": BASE_URL,
      "applicationCategory": "LifestyleApplication",
      "operatingSystem": "All",
      "description": "내 주변 24시간 영업 카페·편의점·세차장·PC방을 지도에서 실시간으로 찾아주는 서비스",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "KRW" },
      "inLanguage": "ko-KR",
      "areaServed": {
        "@type": "Country",
        "name": "대한민국"
      },
    },
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      "url": BASE_URL,
      "name": "24시나우 — 밤샘지도",
      "description": "새벽에도 열려 있는 24시간 장소를 지도에서 찾아보세요",
      "inLanguage": "ko-KR",
      "potentialAction": {
        "@type": "SearchAction",
        "target": { "@type": "EntryPoint", "urlTemplate": `${BASE_URL}/?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
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
