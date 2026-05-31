"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { GeneratedRunSetup, RunResult } from "@/lib/types";
import { computeScore } from "@/lib/grade";

const PhaserGame = dynamic(() => import("@/game/PhaserGame"), { ssr: false });

export default function PlayPage() {
  const router = useRouter();
  const [setup, setSetup] = useState<GeneratedRunSetup | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("panty_run_setup");
    if (!raw) {
      router.replace("/");
      return;
    }
    try {
      setSetup(JSON.parse(raw) as GeneratedRunSetup);
    } catch {
      router.replace("/");
    }
  }, [router]);

  const onGameOver = useCallback(
    (stats: {
      time: number;
      distance: number;
      coins: number;
      nearMisses: number;
    }) => {
      if (!setup) return;
      const score = computeScore({
        distance: stats.distance,
        coins: stats.coins,
        nearMisses: stats.nearMisses,
      });
      const result: RunResult = {
        setup,
        survivedSeconds: stats.time,
        distanceMeters: stats.distance,
        coins: stats.coins,
        nearMisses: stats.nearMisses,
        score,
      };
      sessionStorage.setItem("panty_run_result", JSON.stringify(result));
      router.push("/result");
    },
    [setup, router],
  );

  if (!setup) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <div className="text-panty-mute text-sm">로딩...</div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-panty-bg no-select">
      <PhaserGame setup={setup} onGameOver={onGameOver} />
    </main>
  );
}
