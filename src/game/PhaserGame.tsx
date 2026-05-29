"use client";

import { useEffect, useRef } from "react";
import type { GeneratedRunSetup } from "@/lib/types";

interface Props {
  setup: GeneratedRunSetup;
  onGameOver: (stats: { time: number; distance: number; coins: number }) => void;
}

export default function PhaserGame({ setup, onGameOver }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{ destroy: (removeCanvas: boolean) => void } | null>(null);
  const setupRef = useRef(setup);
  const onGameOverRef = useRef(onGameOver);

  setupRef.current = setup;
  onGameOverRef.current = onGameOver;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const PhaserModule = await import("phaser");
      const Phaser = PhaserModule.default;
      const { RunScene, GAME_DIMENSIONS } = await import("./scenes/RunScene");
      if (cancelled || !mountRef.current) return;

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: mountRef.current,
        width: GAME_DIMENSIONS.width,
        height: GAME_DIMENSIONS.height,
        backgroundColor: "#0b0b12",
        physics: {
          default: "arcade",
          arcade: { gravity: { x: 0, y: 0 }, debug: false },
        },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [RunScene],
      });
      gameRef.current = game;
      game.scene.start("RunScene", {
        setup: setupRef.current,
        onGameOver: (s: { time: number; distance: number; coins: number }) =>
          onGameOverRef.current(s),
      });
    })();
    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-full max-w-4xl aspect-[5/3] mx-auto no-select"
    />
  );
}
