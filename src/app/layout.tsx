import type { Metadata } from "next";
import "./globals.css";

// Dynamic Metadata generation base configuration
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
  return (
    <html lang="ko">
      <body>
        <div className="app-wrapper">
          <header className="header liquid-glass">
            <h1 style={{ fontSize: '1.25rem' }}>
              24h <span className="text-neon">Now</span>
            </h1>
            <nav>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Seoul, KR</span>
            </nav>
          </header>
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
