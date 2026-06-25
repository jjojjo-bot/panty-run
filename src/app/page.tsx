import Image from "next/image";
import Link from "next/link";
import NotifyForm from "@/components/NotifyForm";

// 루트(/) = bbanzzrun.com 랜딩 티저. "음악을 나는 빤쓰" 정체성.
// 게임 자체는 도메인에 노출하지 않고 /lab 등 별도 라우트에 유지한다.

const NOTES = [
  { ch: "♪", left: "8%", size: 26, delay: 0, dur: 7, drift: "18px", color: "rgba(255,93,162,0.35)" },
  { ch: "♫", left: "22%", size: 18, delay: 2.4, dur: 9, drift: "-14px", color: "rgba(255,216,77,0.30)" },
  { ch: "🎵", left: "44%", size: 20, delay: 4.1, dur: 8, drift: "22px", color: "rgba(255,255,255,0.18)" },
  { ch: "♩", left: "63%", size: 24, delay: 1.2, dur: 10, drift: "-20px", color: "rgba(255,93,162,0.28)" },
  { ch: "♬", left: "78%", size: 22, delay: 3.3, dur: 7.5, drift: "16px", color: "rgba(255,216,77,0.28)" },
  { ch: "♪", left: "90%", size: 16, delay: 5.0, dur: 9.5, drift: "-12px", color: "rgba(255,255,255,0.16)" },
];

export default function HomePage() {
  return (
    <main className="no-select relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-panty-bg px-6 py-14">
      {/* ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 45% at 50% 18%, rgba(255,93,162,0.18), transparent 70%), radial-gradient(55% 40% at 50% 95%, rgba(255,216,77,0.12), transparent 70%)",
        }}
      />

      {/* drifting music notes */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {NOTES.map((n, i) => (
          <span
            key={i}
            className="bb-note absolute bottom-[18%] select-none"
            style={{
              left: n.left,
              fontSize: n.size,
              color: n.color,
              animationDelay: `${n.delay}s`,
              animationDuration: `${n.dur}s`,
              ["--bb-drift" as string]: n.drift,
            }}
          >
            {n.ch}
          </span>
        ))}
      </div>

      {/* content */}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-7 text-center">
        {/* hero */}
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden
            className="bb-glow absolute h-52 w-52 rounded-full bg-panty-pink/30 blur-3xl"
          />
          <Image
            src="/bbanzzrun_cut.png"
            alt="둥둥 떠오르는 빤쓰"
            width={320}
            height={213}
            priority
            className="bb-float relative h-auto w-[260px] drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)] sm:w-[300px]"
          />
        </div>

        {/* wordmark */}
        <div className="flex flex-col items-center gap-1">
          <h1 className="bg-gradient-to-r from-panty-pink to-panty-yellow bg-clip-text font-display text-5xl font-bold leading-none text-transparent sm:text-6xl">
            빤쓰런
          </h1>
          <p className="font-display text-xs font-bold tracking-[0.45em] text-panty-mute">
            PANTY&nbsp;RUN
          </p>
        </div>

        {/* tagline */}
        <p className="text-base text-panty-ink/90 sm:text-lg">
          🎵 음악을 타고 하늘을 나는 빤쓰
        </p>

        {/* primary CTA: 빤쓰 발사 베타 플레이 */}
        <Link
          href="/beta"
          className="relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-panty-pink to-panty-yellow px-9 py-4 text-base font-bold text-panty-bg shadow-[0_10px_34px_rgba(255,93,162,0.35)] transition active:scale-95"
        >
          <span aria-hidden className="bb-shimmer absolute inset-0" />
          <span className="relative">▶&nbsp; 빤쓰 발사 베타 플레이</span>
        </Link>

        {/* notify */}
        <div className="mt-1 flex w-full flex-col items-center gap-3">
          <p className="text-xs text-panty-mute">
            아직 다듬는 중인 베타예요 · 정식 출시 소식 받기 ↓
          </p>
          <NotifyForm />
        </div>
      </div>

      {/* footer */}
      <footer className="absolute bottom-5 left-0 right-0 text-center text-[11px] tracking-wider text-panty-mute/70">
        bbanzzrun.com · © 2026
      </footer>
    </main>
  );
}
