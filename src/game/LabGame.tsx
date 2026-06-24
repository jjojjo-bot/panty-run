"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { RISK_TUNING, RISK_FLAGS } from "./riskTuning";
import { LAUNCH_TUNING } from "./launchTuning";

// 회색 박스 프로토타입 부트스트랩. 메인 게임과 완전히 분리.
// 새 토이를 추가하면 PROTOS 배열에만 등록하면 된다.
const PROTOS = [
  { key: "rhythm", label: "⑤ 리듬(등속)" },
  { key: "launch", label: "④ 빤쓰 발사" },
  { key: "risk", label: "③ 리스크=속도" },
  { key: "swing", label: "① 진자 스윙" },
  { key: "dash", label: "② 관성 대시" },
] as const;

type ProtoKey = (typeof PROTOS)[number]["key"];

type SliderDef = { key: string; label: string; min: number; max: number; step: number };
type SliderGroup = { title: string; sliders: SliderDef[] };

// #3 리스크=속도 비행 필
const RISK_GROUPS: SliderGroup[] = [
  {
    title: "⬆️ 상승 (꾹 누름)",
    sliders: [
      { key: "thrust", label: "상승력", min: 600, max: 3000, step: 25 },
      { key: "vyUp", label: "상승 최고속도", min: 200, max: 900, step: 10 },
    ],
  },
  {
    title: "🪂 활공 (기류 소모)",
    sliders: [
      { key: "glideGravity", label: "활공 중력", min: 60, max: 1000, step: 10 },
      { key: "vyGlide", label: "활공 최고속도", min: 40, max: 400, step: 5 },
    ],
  },
  {
    title: "⬇️ 자유낙하 (안 누름)",
    sliders: [
      { key: "gravity", label: "낙하 중력", min: 200, max: 2000, step: 25 },
      { key: "vyDown", label: "낙하 최고속도", min: 120, max: 700, step: 10 },
    ],
  },
  {
    title: "💨 기류 게이지",
    sliders: [
      { key: "fillBank", label: "충전(상승px·클수록 천천히)", min: 300, max: 3000, step: 50 },
      { key: "glideBank", label: "소모(활공px·클수록 오래)", min: 100, max: 1600, step: 20 },
    ],
  },
  {
    title: "💥 리스크=속도 (그레이즈)",
    sliders: [
      { key: "grazeDist", label: "그레이즈 범위", min: 8, max: 60, step: 2 },
      { key: "grazeGain", label: "부스트 충전", min: 0.3, max: 5, step: 0.1 },
      { key: "boostDecay", label: "부스트 감소", min: 0.1, max: 2, step: 0.05 },
      { key: "boostSpeed", label: "부스트 추가속도", min: 100, max: 1000, step: 20 },
      { key: "baseSpeed", label: "기본 속도", min: 150, max: 600, step: 10 },
    ],
  },
  {
    title: "🧱 장애물",
    sliders: [
      { key: "spacing", label: "간격(클수록 듬성)", min: 280, max: 1100, step: 20 },
      { key: "gapMin", label: "틈 최소", min: 100, max: 360, step: 10 },
      { key: "gapMax", label: "틈 최대", min: 120, max: 440, step: 10 },
    ],
  },
];

// #4 빤쓰 발사
const LAUNCH_GROUPS: SliderGroup[] = [
  {
    title: "🎯 발사",
    sliders: [
      { key: "power", label: "파워 배수", min: 2, max: 10, step: 0.5 },
      { key: "maxPull", label: "최대 당김(px)", min: 120, max: 400, step: 10 },
    ],
  },
  {
    title: "🪂 공중 (펄럭)",
    sliders: [
      { key: "gravity", label: "낙하 중력", min: 600, max: 2200, step: 50 },
      { key: "flutterThrust", label: "펄럭 상승력", min: 800, max: 3500, step: 50 },
      { key: "fuelMax", label: "기류 최대(초)", min: 0.3, max: 3, step: 0.1 },
      { key: "fuelDrain", label: "기류 소모(/s)", min: 0.3, max: 2.5, step: 0.1 },
    ],
  },
  {
    title: "💎 공중 아이템 (기류 회복)",
    sliders: [
      { key: "itemFuel", label: "회복량(초)", min: 0.1, max: 1.5, step: 0.05 },
      { key: "itemGap", label: "간격(px·폴백)", min: 120, max: 500, step: 10 },
    ],
  },
  {
    title: "🎵 음악 트레일",
    sliders: [{ key: "musicPxPerSec", label: "곡1초=px(클수록 듬성)", min: 120, max: 700, step: 20 }],
  },
];

// 슬라이더 패널 — groups + tuning 객체를 받아 실시간 조정.
function TuningPanel({
  groups,
  tuning,
  header,
}: {
  groups: SliderGroup[];
  tuning: Record<string, number>;
  header: ReactNode;
}) {
  const [, force] = useState(0);
  const all = groups.flatMap((g) => g.sliders);
  return (
    <div className="w-full max-w-3xl mx-auto rounded bg-white/5 p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between text-white/60 font-mono text-xs">{header}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-3">
        {groups.map((grp) => (
          <div key={grp.title} className="flex flex-col gap-2">
            <div className="text-white/45 font-mono text-[11px]">{grp.title}</div>
            {grp.sliders.map((s) => (
              <label key={s.key} className="flex flex-col gap-0.5 text-white/80 font-mono text-xs">
                <span className="flex justify-between">
                  <span>{s.label}</span>
                  <span className="text-white/50">{tuning[s.key]}</span>
                </span>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  defaultValue={tuning[s.key]}
                  onChange={(e) => {
                    tuning[s.key] = Number(e.target.value);
                    force((n) => n + 1);
                  }}
                  className="accent-white"
                />
              </label>
            ))}
          </div>
        ))}
      </div>
      <button
        className="text-left text-white/40 font-mono text-[11px] underline"
        onClick={() => {
          navigator.clipboard?.writeText(all.map((s) => `${s.key}: ${tuning[s.key]}`).join(", "));
          force((n) => n + 1);
        }}
      >
        현재값 전부 복사 → {all.map((s) => `${s.label} ${tuning[s.key]}`).join(" · ")}
      </button>
    </div>
  );
}

export default function LabGame() {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{ destroy: (removeCanvas: boolean) => void } | null>(null);
  const [proto, setProto] = useState<ProtoKey>("launch");
  const [, force] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const Phaser = (await import("phaser")).default;

      let scene: Phaser.Types.Scenes.SceneType;
      let dims: { width: number; height: number };
      if (proto === "swing") {
        const m = await import("./scenes/SwingProtoScene");
        scene = m.SwingProtoScene;
        dims = m.SWING_DIMS;
      } else if (proto === "dash") {
        const m = await import("./scenes/DashProtoScene");
        scene = m.DashProtoScene;
        dims = m.DASH_DIMS;
      } else if (proto === "risk") {
        const m = await import("./scenes/RiskProtoScene");
        scene = m.RiskProtoScene;
        dims = m.RISK_DIMS;
      } else if (proto === "launch") {
        const m = await import("./scenes/LaunchProtoScene");
        scene = m.LaunchProtoScene;
        dims = m.LAUNCH_DIMS;
      } else if (proto === "rhythm") {
        const m = await import("./scenes/RhythmProtoScene");
        scene = m.RhythmProtoScene;
        dims = m.RHYTHM_DIMS;
      } else {
        return;
      }
      if (cancelled || !mountRef.current) return;

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: mountRef.current,
        width: dims.width,
        height: dims.height,
        backgroundColor: "#0b0b12",
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [scene],
      });
      gameRef.current = game;
    })();

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [proto]);

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="flex gap-2 flex-wrap justify-center">
        {PROTOS.map((p) => (
          <button
            key={p.key}
            onClick={() => setProto(p.key)}
            className={`px-3 py-1.5 rounded text-sm font-mono ${
              proto === p.key ? "bg-white text-black" : "bg-white/10 text-white/70"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div
        ref={mountRef}
        className="w-full max-w-3xl aspect-[16/9] mx-auto no-select rounded overflow-hidden"
      />

      {proto === "risk" && (
        <TuningPanel
          groups={RISK_GROUPS}
          tuning={RISK_TUNING}
          header={
            <>
              <span>🎛️ 비행 필 실시간 튜닝 — 드래그 즉시 반영</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={RISK_FLAGS.obstacles}
                  onChange={(e) => {
                    RISK_FLAGS.obstacles = e.target.checked;
                    force((n) => n + 1);
                  }}
                  className="accent-white"
                />
                <span>장애물 {RISK_FLAGS.obstacles ? "ON" : "OFF"}</span>
              </label>
            </>
          }
        />
      )}

      {(proto === "launch" || proto === "rhythm") && (
        <TuningPanel
          groups={LAUNCH_GROUPS}
          tuning={LAUNCH_TUNING}
          header={
            <span>
              🎛️ {proto === "rhythm" ? "리듬" : "발사"} 필 실시간 튜닝 — 드래그 즉시 반영
            </span>
          }
        />
      )}
    </div>
  );
}
