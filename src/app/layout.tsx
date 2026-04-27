import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "24시나우 | 지금 당장 갈 수 있는 밤샘 장소 찾기",
  description: "서울/경기/인천 전 지역의 24시 카페, 편의점, 세차장, PC방, 약국을 가장 정확하게 찾아보세요. 실시간 데이터와 사용자 제보로 가장 신뢰할 수 있는 밤샘 정보를 제공합니다.",
  keywords: [
    "24시 카페", "24시간 카페", "야간 카페", "새벽 카페",
    "근처 24시", "24시 편의점", "야간 편의점",
    "야간 세차장", "24시 셀프세차", "24시간 세차",
    "밤샘지도", "24시 나우", "24now", "약국", "PC방"
  ],
  openGraph: {
    title: "24시나우 | 지금 내 주변 밤샘 장소 찾기",
    description: "어둡고 낯선 길 위에서도 24시나우와 함께라면 든든합니다.",
    type: "website",
    url: "https://24hnow.vercel.app",
    siteName: "24시나우",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 1200,
      },
    ],
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "24시나우",
    description: "지금 당장 이용 가능한 밤샘 장소 찾기",
    images: ["/og-image.png"],
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
