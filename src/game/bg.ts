// 배경 패럴랙스 레이어 매니페스트 — 존(zone)별 2.5D 이미지 레이어.
//
// 데이터 주도: RunScene은 이 정의를 '해석만' 한다. 신규 존 배경 = 여기에 항목 추가만.
// 이미지가 없거나 로드 실패하면 절차생성(Graphics) 배경으로 자동 폴백한다(게임 안 깨짐).
//
// 레이어는 뒤→앞 순서로 그려진다. scroll(패럴랙스 배수)이 작을수록 멀리(천천히),
// 클수록 가까이(빨리) 흐른다. depth는 RunScene의 다른 오브젝트와의 렌더 순서.
//   하늘/원경 back(0.2×, depth -28) → 중경 mid(0.55×, -15) → 지면 ground(1.0×, -9)
//   → [플레이어 5] → 전경 fore(1.4×, 31, 플레이어 앞)
//
// 파일은 public/sprites/ 의 webp. (원본 PNG는 cwebp로 변환해 용량 최적화)

export interface BgLayer {
  /** Phaser 텍스처 키 */
  key: string;
  /** public/sprites/ 기준 파일명 */
  file: string;
  /** 패럴랙스 배수 — worldScroll × scroll = 가로 이동량(px) */
  scroll: number;
  /** 렌더 깊이 (플레이어=5, 전경은 5보다 크게) */
  depth: number;
  /**
   * 세로 배치:
   *  - "cover"(기본): 캔버스 높이에 꽉 차게(불투명 풀씬·투명 풀프레임용)
   *  - "bottom": 화면 하단에 band 높이의 띠로 배치(바닥처럼 일부만 보이는 불투명 띠용)
   */
  anchor?: "cover" | "bottom";
  /** anchor="bottom"일 때 띠 높이(px). 화면 하단에 붙는다 */
  band?: number;
  /** 세로 맞춤 배수 — 생략 시 자동(cover=GAME_H/높이, bottom=band/높이) */
  scale?: number;
}

export interface ZoneBg {
  layers: BgLayer[];
  /** 지형을 평평하게(실내 바닥 등). true면 surfaceYAt가 groundY로 고정돼 발이 바닥에 붙음 */
  flatGround: boolean;
  /** 평지 표면 y(px). 바닥 이미지의 바닥선과 맞춰 튜닝. 기본 400(=GROUND_Y) */
  groundY?: number;
}

export const ZONE_BG: Record<string, ZoneBg> = {
  bedroom: {
    flatGround: true,
    groundY: 350, // 바닥(마룻바닥 윗선)에 발이 닿도록 — 스크린샷으로 튜닝
    layers: [
      // back: 창문 있는 풀 침실(불투명) — 천천히 흐르는 깊은 배경
      { key: "bg_bedroom_back", file: "bg_bedroom_back.webp", scroll: 0.25, depth: -28, anchor: "cover" },
      // ground: 마룻바닥 띠(불투명) — 발밑에서 가장 빠르게 흘러 속도감
      { key: "bg_bedroom_ground", file: "bg_bedroom_ground.webp", scroll: 1.0, depth: -9, anchor: "bottom", band: 175 },
      // 참고: mid(가구 실루엣)는 back에 가구가 이미 있어 이중 → 제외.
      // fore(이불자락 bg_bedroom_fore.webp)는 너무 커서 플레이어를 가림 → 보류(추후 더 맞는 애셋으로 폴리시)
    ],
  },
};

/** preload용 — 모든 존의 레이어를 중복 키 제거해 평탄화한 목록 */
export const ALL_BG_LAYERS: BgLayer[] = (() => {
  const seen = new Set<string>();
  const out: BgLayer[] = [];
  for (const z of Object.values(ZONE_BG)) {
    for (const l of z.layers) {
      if (seen.has(l.key)) continue;
      seen.add(l.key);
      out.push(l);
    }
  }
  return out;
})();
