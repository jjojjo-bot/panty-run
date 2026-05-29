"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { RunResult } from "@/lib/types";
import { renderResultText } from "@/lib/resolver";
import { encodeSharePayload } from "@/lib/sharePayload";

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<RunResult | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("panty_run_result");
    if (!raw) {
      router.replace("/");
      return;
    }
    try {
      setResult(JSON.parse(raw) as RunResult);
    } catch {
      router.replace("/");
    }
  }, [router]);

  if (!result) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <div className="text-panty-mute text-sm">로딩...</div>
      </main>
    );
  }

  const headline = renderResultText(result.setup.resultTemplate, {
    time: result.survivedSeconds,
    distance: result.distanceMeters,
    coins: result.coins,
    input: result.setup.inputText,
  });

  async function share() {
    if (!result) return;
    const payload = encodeSharePayload({
      i: result.setup.inputText,
      h: headline,
      c: result.setup.category,
      e: result.setup.emotion,
      t: Math.round(result.survivedSeconds),
      d: Math.round(result.distanceMeters),
      n: result.coins,
    });
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/r?d=${payload}`;
    const text = `🩲 빤쓰런\n"${result.setup.inputText}"\n→ ${headline}\n\n너도 도망쳐봐`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "빤쓰런", text, url });
      } catch {
        // user cancelled
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      alert("결과 링크를 복사했어!");
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-dvh px-6 py-10">
      <div className="w-full max-w-md bg-panty-panel rounded-2xl p-6 text-center">
        <div className="text-panty-mute text-xs tracking-widest">GAME OVER</div>
        <div className="text-panty-pink text-base font-bold mt-2">
          &ldquo;{result.setup.inputText}&rdquo;
        </div>
        <div className="text-2xl font-extrabold my-6 leading-snug">
          {headline}
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs text-panty-mute">
          <Stat label="생존" value={`${Math.round(result.survivedSeconds)}s`} />
          <Stat label="거리" value={`${Math.round(result.distanceMeters)}m`} />
          <Stat label="코인" value={`${result.coins}`} />
        </div>
      </div>

      <div className="flex gap-3 mt-6 w-full max-w-md">
        <button
          onClick={() => router.push("/")}
          className="flex-1 rounded-xl bg-panty-panel py-3 text-panty-ink active:scale-[0.98] transition"
        >
          다시 도망
        </button>
        <button
          onClick={share}
          className="flex-1 rounded-xl bg-panty-pink py-3 font-extrabold text-panty-bg active:scale-[0.98] transition"
        >
          공유 ↗
        </button>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panty-bg rounded-lg py-2">
      <div className="text-panty-ink font-bold text-lg">{value}</div>
      <div>{label}</div>
    </div>
  );
}
