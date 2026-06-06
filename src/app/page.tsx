"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { gradeForScore } from "@/lib/grade";
import { getBestScore, getCoinBalance } from "@/lib/progress";
import { makeStageSetup } from "@/lib/content/stages";

export default function HomePage() {
  const router = useRouter();
  const [best, setBest] = useState(0);
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    setBest(getBestScore());
    setCoins(getCoinBalance());
  }, []);

  function startStage(id: string) {
    const setup = makeStageSetup(id);
    sessionStorage.setItem("panty_run_setup", JSON.stringify(setup));
    router.push("/play");
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-dvh px-6 py-10">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="text-6xl mb-2">🩲</div>
        <h1 className="text-3xl font-extrabold text-panty-pink mb-1">빤쓰런</h1>
        <p className="text-panty-mute text-sm text-center mb-5">
          현실에서 도망쳐라.
          <br />
          오늘의 적은 — 월요일.
        </p>

        <div className="flex items-center gap-2 mb-6 flex-wrap justify-center">
          {best > 0 && (
            <div className="text-xs font-bold text-panty-mute bg-panty-panel rounded-full px-4 py-1.5">
              🏆 최고 {best.toLocaleString()}점 · {gradeForScore(best).title}
            </div>
          )}
          <Link
            href="/collection"
            className="text-xs font-bold text-panty-mute bg-panty-panel rounded-full px-4 py-1.5 hover:text-panty-ink transition"
          >
            🏅 업적·스킨
          </Link>
          <Link
            href="/shop"
            className="text-xs font-bold text-panty-mute bg-panty-panel rounded-full px-4 py-1.5 hover:text-panty-ink transition"
          >
            🛒 상점 · 🫧{coins.toLocaleString()}
          </Link>
        </div>

        {/* STAGE 1 — 월요일 출근 탈출 */}
        <button
          onClick={() => startStage("monday")}
          className="w-full rounded-2xl bg-panty-panel p-5 text-left active:scale-[0.98] transition border border-white/5 hover:border-panty-pink/40"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-extrabold text-panty-pink">📅 STAGE 1</span>
            <span className="text-xs text-panty-mute">▶ 도망가기</span>
          </div>
          <div className="text-xl font-extrabold text-panty-ink mb-1">월요일 출근 탈출</div>
          <div className="text-[11px] text-panty-mute">
            🛏️ 침실 → 🛋️ 거실 → 🚪 복도 → 🚏 출근길 → 📅 보스
          </div>
        </button>

        {/* 잠긴 슬롯 — 다음 현실 도피 예고 */}
        <div className="w-full rounded-2xl bg-panty-panel/40 p-4 mt-3 flex items-center gap-3 opacity-50">
          <span className="text-2xl">🧧</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-panty-ink">명절 탈출</div>
            <div className="text-[11px] text-panty-mute">친척군단의 "결혼은 언제?" 폭격</div>
          </div>
          <span className="text-[11px] text-panty-mute whitespace-nowrap">🔒 준비 중</span>
        </div>
        <div className="w-full rounded-2xl bg-panty-panel/40 p-4 mt-2 flex items-center gap-3 opacity-50">
          <span className="text-2xl">📚</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-panty-ink">중간고사 탈출</div>
            <div className="text-[11px] text-panty-mute">시험기간의 PTSD</div>
          </div>
          <span className="text-[11px] text-panty-mute whitespace-nowrap">🔒 준비 중</span>
        </div>

        <p className="text-[11px] text-panty-mute/60 mt-6 text-center">
          "현실에서 도망치고 싶은 순간을,
          <br />
          빤쓰가 대신 달려준다"
        </p>
      </div>
    </main>
  );
}
