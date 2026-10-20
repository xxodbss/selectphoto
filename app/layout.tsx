import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// Pretendard 가변 폰트 (굵기 45–920을 파일 하나로)
const pretendard = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

export const metadata: Metadata = {
  title: "epilego",
  description: "에필레고 — 스냅 사진 셀렉. 링크로 보고, 별점 매기고, 제출",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // 브라우저나 확장(예: Zotero, 카톡 인앱 브라우저)이 <html>·<body>에 속성을 덧붙여도
    // 경고하지 않게 (이 두 태그에만 적용, 안쪽 화면은 그대로 검사)
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        {/* Vercel 방문 수 집계 (배포 사이트에서만 보냄) */}
        <Analytics />
      </body>
    </html>
  );
}
