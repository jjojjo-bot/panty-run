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
}
