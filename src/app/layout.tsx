import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "24시나우 (24h Now) - 야간 작업자를 위한 전국 24시 점포 정보",
  description: "밤샘 카공족, 야간 작업자들을 위한 전국 24시간 영업 카페, 식당, 편의점의 진짜 운영 정보를 확인하세요.",
  keywords: ["24시", "24시간 카페", "야간 작업", "카공", "밤샘", "24시나우"],
  themeColor: "#000000",
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
