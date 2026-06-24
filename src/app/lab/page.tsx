"use client";

import dynamic from "next/dynamic";

const LabGame = dynamic(() => import("@/game/LabGame"), { ssr: false });

// 게임성 검증용 프로토타입 실험실 (/lab). 메인 게임과 분리.
export default function LabPage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-start bg-black gap-3 p-4 overflow-y-auto no-select">
      <h1 className="text-white/80 font-mono text-sm tracking-widest">
        🧪 GAMEPLAY LAB — 회색 박스 토이 검증
      </h1>
      <LabGame />
    </main>
  );
}
