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

// 최고점수·누적통계·업적·스킨은 @/lib/progress 로 이전됨.
