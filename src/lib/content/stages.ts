// 스테이지 정의 — 거리별 '구간'으로 배경·장애물 테마가 바뀐다.
// 첫 스테이지: 월요일 출근 탈출 (침실 → 거실 → 복도 → 출근길 → [보스 MONDAY]).
// 데이터 주도 설계: 엔진(RunScene)은 이 데이터를 해석만 한다. 신규 스테이지는 데이터 추가만으로.
import type { GeneratedRunSetup } from "../types";

// 장애물 회피 방식: jump=점프(지상), slide=슬라이드(머리 위), fly=투사체(날아옴, 숙여 피함)
export type AvoidKind = "jump" | "slide" | "fly";

export interface ZoneObstacle {
  emoji: string;
  avoid: AvoidKind;
  mental: number; // 피격 시 멘탈 감소량(직장인 공감 수치)
  label?: string; // 투사체 말풍선 문구 등
}

export interface StageZone {
  id: string;
  name: string; // 구간 진입 배너 (이모지 포함)
  bg: number; // 배경색
  ground: number; // 지형 색
  obstacles: ZoneObstacle[];
  dur: number; // 이 구간 지속 시간(초)
}

export interface BossDef {
  emoji: string; // 보스 외형 (📅 거대 월요일)
  name: string; // MONDAY
  escapeDur: number; // 따돌리기까지 버텨야 하는 시간(초) — 도망 진행도
}

export interface StageDef {
  id: string;
  name: string;
  intro: string;
  zones: StageZone[];
  boss?: BossDef;
}

export const MONDAY_STAGE: StageDef = {
  id: "monday",
  name: "월요일 출근 탈출",
  intro: "월요일 아침 6시… 오늘만은 출근을 막아야 한다!",
  zones: [
    {
      id: "bedroom",
      name: "🛏️ 침실",
      bg: 0x1c1a44, // 새벽 인디고
      ground: 0x322c5c,
      obstacles: [
        { emoji: "⏰", avoid: "jump", mental: 8 }, // 알람시계
        { emoji: "🧦", avoid: "jump", mental: 5 }, // 바닥 양말
        { emoji: "👕", avoid: "slide", mental: 6 }, // 널린 빨래
      ],
      dur: 40,
    },
    {
      id: "living",
      name: "🛋️ 거실",
      bg: 0x34191c, // 따뜻한 와인/적갈 (TV 불빛)
      ground: 0x4c2a2c,
      obstacles: [
        { emoji: "🛋️", avoid: "jump", mental: 8 }, // 소파
        { emoji: "📺", avoid: "slide", mental: 8 }, // TV장
        { emoji: "📱", avoid: "fly", mental: 20, label: "팀장 전화" }, // 팀장 전화(제일 아픔)
        { emoji: "💬", avoid: "fly", mental: 10, label: "김대리 출근했어요?" }, // 회사 카톡
      ],
      dur: 45,
    },
    {
      id: "hallway",
      name: "🚪 아파트 복도",
      bg: 0x0e2a2e, // 차가운 청록 (형광등)
      ground: 0x1c3e42,
      obstacles: [
        { emoji: "📦", avoid: "jump", mental: 10 }, // 택배 박스
        { emoji: "🧑", avoid: "jump", mental: 8 }, // 이웃 주민
        { emoji: "🛗", avoid: "slide", mental: 10 }, // 엘리베이터 문
      ],
      dur: 45,
    },
    {
      id: "street",
      name: "🚏 출근길",
      bg: 0x163450, // 여명 푸른 하늘
      ground: 0x294c68,
      obstacles: [
        { emoji: "🚌", avoid: "jump", mental: 15 }, // 만원버스
        { emoji: "🚦", avoid: "slide", mental: 10 }, // 신호등
        { emoji: "☕", avoid: "fly", mental: 15, label: "모닝커피" }, // 날아오는 커피
      ],
      dur: 50,
    },
  ],
  boss: { emoji: "📅", name: "MONDAY", escapeDur: 22 },
};

export const STAGES: Record<string, StageDef> = {
  monday: MONDAY_STAGE,
};

export function getStage(id: string): StageDef | undefined {
  return STAGES[id];
}

/** 스테이지를 분석 없이 바로 구동하기 위한 setup 생성 (입력→분석 경로를 건너뜀). */
export function makeStageSetup(stageId: string): GeneratedRunSetup {
  const stage = STAGES[stageId] ?? MONDAY_STAGE;
  return {
    inputText: stage.name,
    category: "Company", // 월요일=회사 (추격자 등 기존 시스템과 호환)
    emotion: "Tired",
    intensity: 3,
    characterId: "tired__casual",
    backgroundId: `stage_${stage.id}`,
    obstacleIds: [], // 스테이지는 구간(zone) 장애물을 사용
    introText: stage.intro,
    resultTemplate: "오늘도 출근을 미뤘다",
    stageId: stage.id,
  };
}
