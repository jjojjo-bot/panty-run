import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bbanzzrun.com"),
  title: "빤쓰런 — Panty Run",
  description: "🎵 음악을 타고 하늘을 나는 빤쓰. 곧 출시됩니다.",
  openGraph: {
    title: "빤쓰런 — Panty Run",
    description: "🎵 음악을 타고 하늘을 나는 빤쓰. 곧 출시됩니다.",
    url: "/",
    siteName: "빤쓰런",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "빤쓰런 — Panty Run",
    description: "🎵 음악을 타고 하늘을 나는 빤쓰. 곧 출시됩니다.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0b0b12",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-dvh bg-panty-bg text-panty-ink antialiased">{children}</body>
    </html>
  );
}
