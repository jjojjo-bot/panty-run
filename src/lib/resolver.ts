import type { AnalysisResult, GeneratedRunSetup } from "./types";
import { CATEGORIES } from "./content/categories";
import { EMOTIONS } from "./content/emotions";

function pick<T>(arr: readonly T[], rand: () => number = Math.random): T {
  if (arr.length === 0) throw new Error("pick: empty array");
  return arr[Math.floor(rand() * arr.length)];
}

function sample<T>(arr: readonly T[], n: number, rand: () => number = Math.random): T[] {
  const copy = [...arr];
  const out: T[] = [];
  const take = Math.min(n, copy.length);
  for (let i = 0; i < take; i++) {
    const idx = Math.floor(rand() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export function resolveSetup(
  analysis: AnalysisResult,
  rand: () => number = Math.random,
): GeneratedRunSetup {
  const categoryId =
    analysis.category === "None" ? "Reality" : analysis.category;
  const cat = CATEGORIES[categoryId];

  const emotionId = analysis.emotion === "None" ? cat.emotionFallback : analysis.emotion;
  const emo = EMOTIONS[emotionId];

  const characterId = `${emo.characterBase}__${cat.characterStyleTags[0] ?? "casual"}`;
  const backgroundId = pick(cat.backgroundIds, rand);

  const obstacleCount = Math.max(3, Math.min(5, 3 + Math.floor(rand() * 3)));
  const obstacleIds = sample(cat.obstacleIds, obstacleCount, rand);

  const introRaw = pick(cat.introTemplates, rand);
  const introText = fillTemplate(introRaw, { input: analysis.originalInput });

  const resultTemplate = pick(cat.resultTemplates, rand);

  return {
    inputText: analysis.originalInput,
    category: categoryId,
    emotion: emotionId,
    intensity: analysis.intensity,
    characterId,
    backgroundId,
    obstacleIds,
    introText,
    resultTemplate,
  };
}

export function renderResultText(
  template: string,
  vars: { time: number; distance: number; coins: number; input: string },
): string {
  return fillTemplate(template, {
    time: String(Math.round(vars.time)),
    distance: String(Math.round(vars.distance)),
    coins: String(vars.coins),
    input: vars.input,
  });
}
