// 게임 그래픽 애셋(PNG) 매니페스트.
//
// 사용법: `public/sprites/`에 PNG를 넣고, 아래 SPRITE_MANIFEST에 { key, file } 한 줄을
// 추가하면 끝. RunScene이 preload에서 그 PNG를 같은 텍스처 키로 로드하고, 동일 키의
// 이모지/절차생성 텍스처를 자동으로 대체한다.
//   • 로드 성공 → PNG가 이김(이모지 생성 건너뜀)
//   • 로드 실패(파일 없음/깨짐) → 기존 이모지·절차생성으로 자동 폴백(게임 안 깨짐)
// 덕분에 애셋을 하나씩 점진 교체할 수 있다(전부 한 번에 만들 필요 없음).
//
// 텍스처 키 규칙은 RunScene.buildEmojiTextures() 참고:
//   tex_player / tex_coin / tex_chaser / tex_boss / tex_hand
//   tex_item_<kind>      (kind: angel, gold, shield, ... americano, vacation, holiday)
//   tex_zob_<emoji>      (구간 장애물, 예: tex_zob_⏰)
//   tex_batk_<emoji>     (보스 공격, 예: tex_batk_🏢)
//
// ⚠️ 내용이 setup/스테이지에 따라 바뀌는 키(tex_chaser=카테고리별, tex_boss=스테이지별)는
//    현재 MVP(월요일)에서만 1:1이다. 스테이지가 늘면 그때 키를 분기한다.
//
// 전체 애셋 목록·규격·AI 생성 프롬프트는 저장소 루트의 ASSETS.md 참고.

export interface SpriteAsset {
  /** Phaser 텍스처 키 (tex_*) — 이 키의 기존 텍스처를 대체한다 */
  key: string;
  /** public/sprites/ 기준 파일명 (예: "player.png") */
  file: string;
}

export const SPRITE_MANIFEST: SpriteAsset[] = [
  // 생성한 PNG를 여기에 추가 — 예시:
  // { key: "tex_player", file: "player.png" },
  // { key: "tex_boss", file: "boss_monday.png" },
  // { key: "tex_zob_⏰", file: "obstacle_alarm.png" },
  // { key: "tex_item_vacation", file: "item_vacation.png" },
];

/** 매니페스트에 등록된 키 집합 — 이모지 생성기가 PNG 텍스처를 덮어쓰지 않도록 가드용 */
export const SPRITE_KEYS = new Set(SPRITE_MANIFEST.map((a) => a.key));
