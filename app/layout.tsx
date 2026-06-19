import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TreasureForge AI — 보물찾기 게임 플랫폼",
  description: "지도 위에서 펼쳐지는 나만의 보물찾기 게임. 퀴즈와 그림퍼즐로 숨겨진 보물을 찾아보세요!",
  openGraph: {
    title: "TreasureForge AI",
    description: "지도 위에서 펼쳐지는 나만의 보물찾기 게임",
    url: "https://treasureforge.vercel.app",
    siteName: "TreasureForge AI",
    images: [
      {
        url: "https://treasureforge.vercel.app/og-default.png",
        width: 1200,
        height: 630,
        alt: "TreasureForge AI 보물찾기 게임",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
