import type { EmotionDefinition, EmotionType } from "../types";

export const EMOTIONS: Record<Exclude<EmotionType, "None">, EmotionDefinition> = {
  Fear: {
    id: "Fear",
    label: "공포",
    keywords: ["무서워", "무섭", "겁", "공포", "두려워", "소름"],
    characterBase: "pants_panic",
  },
  Awkward: {
    id: "Awkward",
    label: "민망",
    keywords: ["어색", "민망", "부끄", "쪽팔", "어쩌지", "눈치"],
    characterBase: "pants_awkward",
  },
  Tired: {
    id: "Tired",
    label: "지침",
    keywords: ["피곤", "지쳐", "지친", "힘들", "졸려", "귀찮", "번아웃", "빡세"],
    characterBase: "pants_tired",
  },
  Angry: {
    id: "Angry",
    label: "분노",
    keywords: ["화나", "짜증", "빡쳐", "빡침", "열받", "꼴보기"],
    characterBase: "pants_angry",
  },
  Brave: {
    id: "Brave",
    label: "용감",
    keywords: ["가자", "해보자", "도전", "이길", "돌파"],
    characterBase: "pants_brave",
  },
};

export const EMOTION_ORDER: Array<Exclude<EmotionType, "None">> = [
  "Angry",
  "Fear",
  "Awkward",
  "Tired",
  "Brave",
];
