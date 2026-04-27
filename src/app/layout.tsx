import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "24시 카페·편의점·세차장 찾기 | 24시 나우 - 밤샘지도",
  description: "내 근처 24시 카페, 야간 편의점, 24시간 셀프세차장을 지도에서 바로 확인. 밤새도록 열려 있는 곳만 모았습니다.",
  keywords: [
    "24시 카페", "24시간 카페", "야간 카페", "새벽 카페",
    "근처 24시", "24시 편의점", "야간 편의점",
    "야간 세차장", "24시 셀프세차", "24시간 세차",
    "밤샘지도", "24시 나우", "24now"
  ],
  openGraph: {
    title: "24시 카페·편의점·세차장 찾기 | 24시 나우 - 밤샘지도",
    description: "내 근처 24시 카페, 야간 편의점, 24시간 셀프세차장을 지도에서 바로 확인. 밤새도록 열려 있는 곳만 모았습니다.",
    type: "website",
    url: "https://24now.kr",
    siteName: "24시 나우 - 밤샘지도",
    locale: "ko_KR",
    title: '24시나우 | 지금 내 주변 밤샘 장소 찾기',
    description: '어둡고 낯선 길 위에서도 24시나우와 함께라면 든든합니다.',
    url: 'https://24hnow.vercel.app',
    siteName: '24시나우',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 1200,
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '24시나우',
    description: '지금 당장 이용 가능한 밤샘 장소 찾기',
    images: ['/og-image.png'],
  },
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
        <Script 
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.0/kakao.min.js"
          integrity="sha384-lSQ7vULjY7ByPu7JstS+6SOm97n69OaGf9InpS9D05FvI5Oq0uXN5+vTzZ45b6u1"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        {/* Load Kakao Maps SDK with libraries (services, clusterer, drawing) if needed later */}
        <Script
          strategy="beforeInteractive"
          src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoJsKey}&libraries=services&autoload=false`}
        />
      </head>
      <body>
        <div className="app-wrapper">
          {children}
        </div>
      </body>
    </html>
  );
}
