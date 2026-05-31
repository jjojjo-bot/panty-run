"use client";

import { useEffect, useRef } from "react";
import { drawPanty, type PantyType } from "@/lib/pantyArt";
import { tintToHex } from "@/lib/progress";

/** 종류 스킨 미리보기 — pantyArt.drawPanty로 캔버스에 그린다. */
export function PantyIcon({
  type,
  tint,
  size = 56,
}: {
  type: PantyType;
  tint: number;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!ctx) return;
    drawPanty(ctx, size, type, tintToHex(tint));
  }, [type, tint, size]);

  return (
    <canvas ref={ref} width={size} height={size} style={{ width: size, height: size }} />
  );
}
