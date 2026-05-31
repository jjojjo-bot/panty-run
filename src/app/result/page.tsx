"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { RunResult } from "@/lib/types";
import { renderResultText } from "@/lib/resolver";
import { encodeSharePayload } from "@/lib/sharePayload";
import { computeScore, gradeForScore, submitScore } from "@/lib/grade";

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<RunResult | null>(null);
  const [record, setRecord] = useState<{ best: number; isNewRecord: boolean } | null>(
    null,
  );
  // submitScore는 localStorage에 쓰는 부작용이 있어, StrictMode 이중 실행 시
  // 두 번째 호출이 '신기록'을 덮어쓴다. 마운트당 한 번만 제출하도록 가드.
  const submittedRef = useRef(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("panty_run_result");
    if (!raw) {
      router.replace("/");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as RunResult;
      // 옛 세션 데이터 호환: 누락된 필드 보정
      if (typeof parsed.nearMisses !== "number") parsed.nearMisses = 0;
      if (typeof parsed.score !== "number") {
        parsed.score = computeScore({
          distance: parsed.distanceMeters,
          coins: parsed.coins,
          nearMisses: parsed.nearMisses,
        });
      }
      setResult(parsed);
      if (!submittedRef.current) {
        submittedRef.current = true;
        setRecord(submitScore(parsed.score));
      }
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

  const grade = gradeForScore(result.score);
  const headline = renderResultText(result.setup.resultTemplate, {
    time: result.survivedSeconds,
    distance: result.distanceMeters,
    coins: result.coins,
    input: result.setup.inputText,
    near: result.nearMisses,
    score: result.score,
  });

  function openImageCard() {
    if (!result) return;
    const params = new URLSearchParams();
    params.set("i", result.setup.inputText);
    params.set("h", headline);
    params.set("c", result.setup.category);
    params.set("t", String(Math.round(result.survivedSeconds)));
    params.set("d", String(Math.round(result.distanceMeters)));
    params.set("n", String(result.coins));
    params.set("s", String(result.score));
    params.set("g", grade.title);
    window.open(`/api/og?${params.toString()}`, "_blank");
  }

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
      s: result.score,
      g: grade.title,
    });
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/r?d=${payload}`;
    const text = `🩲 빤쓰런\n"${result.setup.inputText}"\n→ ${grade.emoji} ${grade.title} · ${result.score}점\n${headline}\n\n너도 도망쳐봐`;
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

        {/* 등급 */}
        <div className="text-5xl mt-5">{grade.emoji}</div>
        <div className="text-xl font-extrabold text-panty-ink mt-1">
          {grade.title}
        </div>

        {/* 점수 히어로 */}
        <div className="mt-4">
          <div className="text-4xl font-extrabold text-panty-pink leading-none">
            {result.score.toLocaleString()}
            <span className="text-lg font-bold text-panty-mute ml-1">점</span>
          </div>
          {record?.isNewRecord ? (
            <div className="inline-block mt-2 text-xs font-extrabold text-panty-bg bg-panty-pink rounded-full px-3 py-1 animate-pulse">
              🎉 신기록!
            </div>
          ) : (
            <div className="mt-2 text-xs text-panty-mute">
              최고 {record?.best.toLocaleString() ?? "-"}점
            </div>
          )}
        </div>

        {/* 결과 문구 */}
        <div className="text-base font-bold my-5 leading-snug text-panty-ink">
          {headline}
        </div>

        <div className="grid grid-cols-4 gap-2 text-xs text-panty-mute">
          <Stat label="생존" value={`${Math.round(result.survivedSeconds)}s`} />
          <Stat label="거리" value={`${Math.round(result.distanceMeters)}m`} />
          <Stat label="코인" value={`${result.coins}`} />
          <Stat label="아슬" value={`${result.nearMisses}`} />
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

      <button
        onClick={openImageCard}
        className="mt-3 text-xs text-panty-mute hover:text-panty-ink transition"
      >
        🖼 결과 이미지 카드 보기
      </button>
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
