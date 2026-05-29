import type {
  AnalysisResult,
  EmotionType,
  SituationCategory,
} from "./types";
import { CATEGORIES, CATEGORY_ORDER } from "./content/categories";
import { EMOTIONS, EMOTION_ORDER } from "./content/emotions";
import { INTENSITY_BOOSTERS } from "./content/intensity";

function normalize(input: string): string {
  return input.toLowerCase().replace(/\s+/g, "");
}

function countMatches(haystack: string, needles: string[]): { count: number; hits: string[] } {
  const hits: string[] = [];
  for (const n of needles) {
    if (!n) continue;
    const lower = n.toLowerCase();
    if (haystack.includes(lower)) hits.push(n);
  }
  return { count: hits.length, hits };
}

function detectCategory(normalized: string): {
  category: Exclude<SituationCategory, "None">;
  matched: string[];
} {
  let best: {
    category: Exclude<SituationCategory, "None">;
    count: number;
    hits: string[];
  } = { category: "Reality", count: 0, hits: [] };

  for (const id of CATEGORY_ORDER) {
    if (id === "Reality") continue;
    const def = CATEGORIES[id];
    const { count, hits } = countMatches(normalized, def.keywords);
    if (count > best.count) {
      best = { category: id, count, hits };
    }
  }

  if (best.count === 0) {
    return { category: "Reality", matched: [] };
  }
  return { category: best.category, matched: best.hits };
}

function detectEmotion(
  normalized: string,
  fallback: Exclude<EmotionType, "None">,
): { emotion: Exclude<EmotionType, "None">; matched: string[] } {
  let best: {
    emotion: Exclude<EmotionType, "None">;
    count: number;
    hits: string[];
  } = { emotion: fallback, count: 0, hits: [] };

  for (const id of EMOTION_ORDER) {
    const def = EMOTIONS[id];
    const { count, hits } = countMatches(normalized, def.keywords);
    if (count > best.count) {
      best = { emotion: id, count, hits };
    }
  }

  return { emotion: best.emotion, matched: best.hits };
}

function detectIntensity(normalized: string): number {
  let intensity = 1;
  for (const booster of INTENSITY_BOOSTERS) {
    if (normalized.includes(booster)) intensity += 1;
  }
  if (normalized.includes("!")) intensity += 1;
  return Math.min(5, Math.max(1, intensity));
}

export function analyzeInput(rawInput: string): AnalysisResult {
  const trimmed = rawInput.trim();
  const normalized = normalize(trimmed);

  const { category, matched: categoryHits } = detectCategory(normalized);
  const fallback =
    category === "Reality"
      ? "Tired"
      : CATEGORIES[category].emotionFallback;
  const { emotion, matched: emotionHits } = detectEmotion(normalized, fallback);
  const intensity = detectIntensity(normalized);

  return {
    originalInput: trimmed,
    category,
    emotion,
    intensity,
    matchedKeywords: [...categoryHits, ...emotionHits],
  };
}
