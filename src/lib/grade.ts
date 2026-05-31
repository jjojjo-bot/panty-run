// 점수·등급 단일 소스 — 인게임 HUD / 결과 / 공유 카드가 공통으로 사용

export interface Grade {
  emoji: string;
  title: string;
}

/** 거리(주 점수) + 코인 + 니어미스 보너스 */
export function computeScore(p: {
  distance: number;
  coins: number;
  nearMisses: number;
}): number {
  return Math.round(p.distance) + p.coins * 10 + p.nearMisses * 25;
}

/** 점수 → 등급(놀림 반 칭찬 반의 타이틀) */
export function gradeForScore(score: number): Grade {
  if (score >= 2000) return { emoji: "🏆", title: "전설의 도망러" };
  if (score >= 1200) return { emoji: "🔥", title: "프로 탈출러" };
  if (score >= 700) return { emoji: "💨", title: "베테랑 도망러" };
  if (score >= 350) return { emoji: "🏃", title: "열혈 도망러" };
  if (score >= 120) return { emoji: "😅", title: "새내기 도망러" };
  return { emoji: "🐌", title: "오늘은 못 도망쳤다" };
}

const BEST_KEY = "panty_run_best";

/** 로컬 최고 점수 읽기 (SSR 안전) */
export function getBestScore(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(BEST_KEY);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

/**
 * 점수가 기존 최고를 넘으면 저장하고 true 반환.
 * @returns { best, isNewRecord }
 */
export function submitScore(score: number): { best: number; isNewRecord: boolean } {
  const prev = getBestScore();
  if (score > prev) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BEST_KEY, String(score));
    }
    return { best: score, isNewRecord: true };
  }
  return { best: prev, isNewRecord: false };
}
