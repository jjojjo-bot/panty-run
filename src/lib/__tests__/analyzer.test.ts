import { describe, test, expect } from "vitest";
import { analyzeInput } from "../analyzer";

describe("카테고리 분류", () => {
  test("월요일 출근 → 회사", () => {
    const result = analyzeInput("월요일 출근 너무 싫어");
    expect(result.category).toBe("Company");
  });

  test("시험/숙제 → 학교", () => {
    const result = analyzeInput("내일 시험인데 숙제도 안 했어");
    expect(result.category).toBe("School");
  });

  test("썸/헤어짐 → 연애", () => {
    const result = analyzeInput("썸 타다가 헤어졌어");
    expect(result.category).toBe("Romance");
  });

  test("점호/훈련 → 군대", () => {
    const result = analyzeInput("내일 점호 무서워");
    expect(result.category).toBe("Military");
  });

  test("엄마 잔소리 → 가족", () => {
    const result = analyzeInput("엄마 잔소리 진짜 짜증나");
    expect(result.category).toBe("Family");
  });

  test("매칭 키워드 없으면 → 현실(Reality)로 폴백", () => {
    const result = analyzeInput("오늘 그냥 그래");
    expect(result.category).toBe("Reality");
  });

  test("두 카테고리 동점이면 CATEGORY_ORDER 앞쪽이 우선", () => {
    // "출근"(Company) + "시험"(School) 각 1개 → Company가 먼저라 이김
    const result = analyzeInput("출근하기 전에 시험 봐야 함");
    expect(result.category).toBe("Company");
  });
});

describe("감정 분류", () => {
  test("'무서워' → Fear", () => {
    const result = analyzeInput("내일 점호 무서워");
    expect(result.emotion).toBe("Fear");
  });

  test("'짜증' → Angry", () => {
    const result = analyzeInput("엄마 잔소리 진짜 짜증나");
    expect(result.emotion).toBe("Angry");
  });

  test("'힘들' → Tired", () => {
    const result = analyzeInput("썸 타다가 헤어졌어 너무 힘들어");
    expect(result.emotion).toBe("Tired");
  });

  test("감정 키워드 없으면 카테고리 fallback 사용 (회사 → Tired)", () => {
    const result = analyzeInput("월요일 출근");
    expect(result.emotion).toBe("Tired");
  });

  test("Reality 카테고리에 감정 없으면 → Tired", () => {
    const result = analyzeInput("그냥 평범한 하루");
    expect(result.category).toBe("Reality");
    expect(result.emotion).toBe("Tired");
  });
});

describe("강도(intensity)", () => {
  test("부스터 없으면 1", () => {
    const result = analyzeInput("출근");
    expect(result.intensity).toBe(1);
  });

  test("'너무' 한 개 → 2", () => {
    const result = analyzeInput("출근 너무 싫어");
    expect(result.intensity).toBe(2);
  });

  test("느낌표도 강도를 올린다", () => {
    const base = analyzeInput("출근 싫어");
    const louder = analyzeInput("출근 싫어!");
    expect(louder.intensity).toBeGreaterThan(base.intensity);
  });

  test("최대값은 5로 클램프된다", () => {
    const result = analyzeInput("진짜 너무 완전 미치겠 죽겠 극혐!!!");
    expect(result.intensity).toBe(5);
  });
});

describe("결과 객체 구조", () => {
  test("matchedKeywords에 매칭된 키워드가 들어간다", () => {
    const result = analyzeInput("월요일 출근 무서워");
    expect(result.matchedKeywords).toEqual(
      expect.arrayContaining(["월요일", "출근", "무서워"]),
    );
  });

  test("originalInput에 입력 원본(trim)이 보존된다", () => {
    const result = analyzeInput("  엄마 잔소리  ");
    expect(result.originalInput).toBe("엄마 잔소리");
  });
});
