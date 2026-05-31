"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { gradeForScore } from "@/lib/grade";
import {
  ACHIEVEMENTS,
  SKINS,
  getStats,
  isSkinUnlocked,
  setEquippedSkin,
  tintToHex,
  type Stats,
} from "@/lib/progress";

export default function CollectionPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    setStats(getStats());
  }, []);

  if (!stats) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <div className="text-panty-mute text-sm">로딩...</div>
      </main>
    );
  }

  const unlocked = new Set(stats.unlocked);
  const grade = gradeForScore(stats.bestScore);

  function equip(skinId: string) {
    setEquippedSkin(skinId);
    setStats(getStats());
  }

  return (
    <main className="flex flex-col items-center min-h-dvh px-6 py-8">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <Link href="/" className="text-panty-mute text-sm hover:text-panty-ink transition">
            ← 홈
          </Link>
          <h1 className="text-lg font-extrabold text-panty-pink">내 도망 기록</h1>
          <span className="w-8" />
        </div>

        {/* 통계 요약 */}
        <div className="bg-panty-panel rounded-2xl p-4 mb-6">
          <div className="text-center mb-3">
            <span className="text-3xl">{grade.emoji}</span>
            <div className="text-sm font-bold text-panty-ink">{grade.title}</div>
            <div className="text-2xl font-extrabold text-panty-pink">
              {stats.bestScore.toLocaleString()}
              <span className="text-sm text-panty-mute ml-1">점 (최고)</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs text-panty-mute">
            <Stat label="플레이" value={`${stats.totalRuns}`} />
            <Stat label="총 거리" value={`${stats.totalDistance.toLocaleString()}m`} />
            <Stat label="총 코인" value={`${stats.totalCoins}`} />
            <Stat label="신기록" value={`${stats.newRecordCount}`} />
          </div>
        </div>

        {/* 업적 */}
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-sm font-extrabold text-panty-ink">🏅 업적</h2>
          <span className="text-xs text-panty-mute">
            {unlocked.size} / {ACHIEVEMENTS.length}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {ACHIEVEMENTS.map((a) => {
            const got = unlocked.has(a.id);
            return (
              <div
                key={a.id}
                className={`rounded-xl p-3 ${got ? "bg-panty-panel" : "bg-panty-panel/40"}`}
              >
                <div className={`text-2xl ${got ? "" : "grayscale opacity-40"}`}>
                  {got ? a.emoji : "🔒"}
                </div>
                <div className={`text-xs font-bold mt-1 ${got ? "text-panty-ink" : "text-panty-mute"}`}>
                  {a.title}
                </div>
                <div className="text-[11px] text-panty-mute/80 leading-tight mt-0.5">
                  {a.desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* 스킨 */}
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-sm font-extrabold text-panty-ink">🎨 빤쓰 스킨</h2>
          <span className="text-xs text-panty-mute">탭해서 장착</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {SKINS.map((sk) => {
            const got = isSkinUnlocked(sk, stats);
            const equipped = stats.equippedSkin === sk.id;
            return (
              <button
                key={sk.id}
                onClick={() => got && equip(sk.id)}
                disabled={!got}
                className={`rounded-xl p-3 flex flex-col items-center transition ${
                  equipped
                    ? "bg-panty-panel ring-2 ring-panty-pink"
                    : got
                      ? "bg-panty-panel active:scale-95"
                      : "bg-panty-panel/40 cursor-not-allowed"
                }`}
              >
                <span
                  className="text-3xl leading-none"
                  style={
                    got && sk.tint !== 0xffffff
                      ? { filter: `drop-shadow(0 0 0 ${tintToHex(sk.tint)})` }
                      : undefined
                  }
                >
                  {got ? "🩲" : "🔒"}
                </span>
                {/* 색상 칩으로 스킨 색을 명확히 표시 */}
                <span
                  className="mt-1 h-2 w-8 rounded-full"
                  style={{ backgroundColor: tintToHex(sk.tint), opacity: got ? 1 : 0.25 }}
                />
                <span className={`text-[11px] font-bold mt-1 ${got ? "text-panty-ink" : "text-panty-mute"}`}>
                  {sk.name.replace(" 빤쓰", "")}
                </span>
                <span className="text-[10px] text-panty-mute">
                  {equipped ? "장착 중" : got ? "장착" : "잠김"}
                </span>
              </button>
            );
          })}
        </div>

        <Link
          href="/"
          className="mt-8 block w-full rounded-xl bg-panty-pink py-4 text-center text-lg font-extrabold text-panty-bg active:scale-[0.98] transition"
        >
          도망가기 →
        </Link>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panty-bg rounded-lg py-2 text-center">
      <div className="text-panty-ink font-bold text-sm">{value}</div>
      <div>{label}</div>
    </div>
  );
}
