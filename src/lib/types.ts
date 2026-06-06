export type SituationCategory =
  | "None"
  | "Company"
  | "School"
  | "Romance"
  | "Military"
  | "Family"
  | "Reality";

export type EmotionType =
  | "None"
  | "Fear"
  | "Awkward"
  | "Tired"
  | "Angry"
  | "Brave";

export interface AnalysisResult {
  originalInput: string;
  category: SituationCategory;
  emotion: EmotionType;
  intensity: number;
  matchedKeywords: string[];
}

export interface GeneratedRunSetup {
  inputText: string;
  category: SituationCategory;
  emotion: EmotionType;
  intensity: number;
  characterId: string;
  backgroundId: string;
  obstacleIds: string[];
  introText: string;
  resultTemplate: string;
  stageId?: string; // 있으면 스테이지(구간) 모드로 구동
}

export interface CategoryDefinition {
  id: Exclude<SituationCategory, "None">;
  label: string;
  keywords: string[];
  characterStyleTags: string[];
  backgroundIds: string[];
  obstacleIds: string[];
  introTemplates: string[];
  resultTemplates: string[];
  emotionFallback: Exclude<EmotionType, "None">;
}

export interface EmotionDefinition {
  id: Exclude<EmotionType, "None">;
  label: string;
  keywords: string[];
  characterBase: string;
}

export interface RunResult {
  setup: GeneratedRunSetup;
  survivedSeconds: number;
  distanceMeters: number;
  coins: number;
  nearMisses: number;
  score: number;
  items: Record<string, number>; // 이번 판에 획득한 능력 아이템 종류별 수
  mental?: number; // 게임 끝 멘탈 잔량(%) — 스테이지 모드
  dodgedNotifs?: number; // 회피한 알림 수
  ignoredCalls?: number; // 무시한 전화 수
}
