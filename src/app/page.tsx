"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { analyzeInput } from "@/lib/analyzer";
import { resolveSetup } from "@/lib/resolver";
import { gradeForScore } from "@/lib/grade";
import { getBestScore, getCoinBalance } from "@/lib/progress";

const PRESETS = [
  "월요일 출근 너무 싫어",
  "내일 시험인데 공부 하나도 못했어",
  "전 여친이 결혼한대",
  "명절에 친척 잔소리 듣기 싫어",
  "팀장님이 나 또 불렀어",
];

export default function InputPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [best, setBest] = useState(0);
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    setBest(getBestScore());
    setCoins(getCoinBalance());
  }, []);

  function start() {
    const text = input.trim();
    if (!text) return;
    const analysis = analyzeInput(text);
    const setup = resolveSetup(analysis);
    sessionStorage.setItem("panty_run_setup", JSON.stringify(setup));
    sessionStorage.setItem("panty_run_analysis", JSON.stringify(analysis));
    router.push("/play");
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-dvh px-6 py-10">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="text-6xl mb-2">🩲</div>
        <h1 className="text-3xl font-extrabold text-panty-pink mb-1">빤쓰런</h1>
        <p className="text-panty-mute text-sm text-center mb-4">
          도망치고 싶은 순간을 적어.
          <br />
          빤쓰가 대신 달린다.
        </p>

        <div className="flex items-center gap-2 mb-6">
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

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="예: 월요일 출근 너무 싫어"
          className="w-full rounded-xl bg-panty-panel p-4 text-panty-ink outline-none resize-none h-24 placeholder:text-panty-mute/60"
          maxLength={120}
        />

        <div className="flex flex-wrap gap-2 my-4 w-full">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setInput(p)}
              className="text-xs px-3 py-1.5 rounded-full bg-panty-panel text-panty-mute hover:text-panty-ink transition"
            >
              {p}
            </button>
          ))}
        </div>

        <button
          onClick={start}
          disabled={!input.trim()}
          className="w-full rounded-xl bg-panty-pink py-4 text-lg font-extrabold text-panty-bg disabled:opacity-40 active:scale-[0.98] transition"
        >
          도망가기 →
        </button>

        <p className="text-[11px] text-panty-mute/60 mt-6 text-center">
          "현실에서 도망치고 싶은 순간을,
          <br />
          빤쓰가 대신 달려준다"
        </p>
      </div>
    </main>
  );
}
