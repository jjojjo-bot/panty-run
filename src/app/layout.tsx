import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "빤쓰런 — Panty Run",
  description: "현실에서 도망치고 싶은 순간을, 빤쓰가 대신 달려준다.",
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
