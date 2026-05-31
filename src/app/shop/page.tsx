"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  SKINS,
  buySkin,
  getStats,
  isSkinUnlocked,
  setEquippedSkin,
  type Stats,
} from "@/lib/progress";
import { PantyIcon } from "@/components/PantyIcon";

const SHOP_SKINS = SKINS.filter((s) => s.price !== undefined);

export default function ShopPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1500);
  }

  function buy(id: string, name: string) {
    const r = buySkin(id);
    setStats(getStats());
    if (r.ok) flash(`${name} 구매 완료!`);
    else if (r.reason === "insufficient") flash("비누방울이 부족해!");
  }

  function equip(id: string) {
    setEquippedSkin(id);
    setStats(getStats());
  }

  return (
    <main className="flex flex-col items-center min-h-dvh px-6 py-8">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <Link href="/" className="text-panty-mute text-sm hover:text-panty-ink transition">
            ← 홈
          </Link>
          <h1 className="text-lg font-extrabold text-panty-pink">🛒 빤쓰 상점</h1>
          <span className="text-sm font-extrabold text-panty-ink">
            🫧 {stats.coinBalance.toLocaleString()}
          </span>
        </div>

        <p className="text-xs text-panty-mute mb-4 text-center">
          도망치며 모은 비누방울로 새 빤쓰를 사자
        </p>

        <div className="grid grid-cols-2 gap-3">
          {SHOP_SKINS.map((sk) => {
            const owned = isSkinUnlocked(sk, stats);
            const equipped = stats.equippedSkin === sk.id;
            const afford = stats.coinBalance >= (sk.price ?? 0);
            return (
              <div key={sk.id} className="bg-panty-panel rounded-2xl p-4 flex flex-col items-center">
                {sk.type ? (
                  <PantyIcon type={sk.type} tint={sk.tint} size={56} />
                ) : (
                  <span className="text-4xl leading-none">🩲</span>
                )}
                <span className="text-sm font-bold text-panty-ink mt-2">
                  {sk.name.replace(" 빤쓰", "")}
                </span>

                {owned ? (
                  <button
                    onClick={() => equip(sk.id)}
                    className={`mt-3 w-full rounded-lg py-2 text-xs font-extrabold transition ${
                      equipped
                        ? "bg-panty-bg text-panty-mute"
                        : "bg-panty-pink text-panty-bg active:scale-95"
                    }`}
                    disabled={equipped}
                  >
                    {equipped ? "장착 중" : "장착"}
                  </button>
                ) : (
                  <button
                    onClick={() => buy(sk.id, sk.name)}
                    disabled={!afford}
                    className={`mt-3 w-full rounded-lg py-2 text-xs font-extrabold transition ${
                      afford
                        ? "bg-panty-pink text-panty-bg active:scale-95"
                        : "bg-panty-bg text-panty-mute cursor-not-allowed"
                    }`}
                  >
                    🫧 {sk.price?.toLocaleString()}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 mt-8">
          <Link
            href="/collection"
            className="flex-1 rounded-xl bg-panty-panel py-3 text-center text-panty-ink active:scale-[0.98] transition"
          >
            🏅 업적
          </Link>
          <Link
            href="/"
            className="flex-1 rounded-xl bg-panty-pink py-3 text-center font-extrabold text-panty-bg active:scale-[0.98] transition"
          >
            도망가기 →
          </Link>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-panty-ink text-panty-bg text-sm font-bold rounded-full px-5 py-2 shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}
