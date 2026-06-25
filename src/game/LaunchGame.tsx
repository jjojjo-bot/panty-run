"use client";

import { useEffect, useRef } from "react";

// 베타 플레이용: "빤쓰 발사"(LaunchProtoScene)만 풀스크린으로 부트한다.
// 랩(LabGame)의 프로토 전환·튜닝 슬라이더 chrome 없이 게임만.
export default function LaunchGame() {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{ destroy: (removeCanvas: boolean) => void } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const Phaser = (await import("phaser")).default;
      const m = await import("./scenes/LaunchProtoScene");
      if (cancelled || !mountRef.current) return;

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: mountRef.current,
        width: m.LAUNCH_DIMS.width,
        height: m.LAUNCH_DIMS.height,
        backgroundColor: "#0b0b12",
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [m.LaunchProtoScene],
      });
      gameRef.current = game;
    })();

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={mountRef} className="no-select h-full w-full" />;
}
