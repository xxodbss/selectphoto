import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Pretendard 가변 폰트 (굵기 45–920을 파일 하나로)
const pretendard = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

export const metadata: Metadata = {
  title: "selectphoto",
  description: "스냅 사진 셀렉 — 링크로 보고, 별점 매기고, 제출",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // 브라우저 확장(예: Zotero)이 <html>에 속성을 덧붙여도 경고하지 않게 (이 태그에만 적용)
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
