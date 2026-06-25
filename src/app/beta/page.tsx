"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const LaunchGame = dynamic(() => import("@/game/LaunchGame"), { ssr: false });

// /beta — "빤쓰 발사" 베타 플레이. 랜딩에서 CTA로 진입.
export default function BetaPage() {
  return (
    <main className="no-select relative flex min-h-dvh w-full flex-col overflow-hidden bg-panty-bg">
      <header className="z-10 flex items-center justify-between px-4 py-2">
        <Link
          href="/"
          className="text-sm text-panty-mute transition hover:text-panty-ink"
        >
          ← 홈
        </Link>
        <span className="font-mono text-xs tracking-[0.3em] text-panty-yellow">
          빤쓰 발사 · BETA
        </span>
        <span className="w-10" aria-hidden />
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center p-2">
        <div className="aspect-video w-full max-w-5xl">
          <LaunchGame />
        </div>
      </div>
    </main>
  );
}
