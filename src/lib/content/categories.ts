import type { CategoryDefinition, SituationCategory } from "../types";

export const CATEGORIES: Record<
  Exclude<SituationCategory, "None">,
  CategoryDefinition
> = {
  Company: {
    id: "Company",
    label: "회사",
    keywords: [
      "출근", "퇴근", "회사", "부장", "팀장", "상사", "과장", "회의",
      "야근", "결재", "보고서", "월요일", "메신저", "슬랙", "카톡방",
      "업무", "실적", "보고", "발표자료",
    ],
    characterStyleTags: ["office", "necktie"],
    backgroundIds: ["bg_company_hall", "bg_subway", "bg_office_floor"],
    obstacleIds: ["obs_document", "obs_boss", "obs_popup", "obs_coffee"],
    introTemplates: [
      "월요일이 추격을 시작했다",
      "결재 라인이 다가온다",
      "{input}... 빤쓰가 달린다",
    ],
    resultTemplates: [
      "출근 압박에서 {time}초 버텼다",
      "결재 지옥을 {distance}m 회피했다",
      "야근 {coins}개를 피해 달아났다",
    ],
    emotionFallback: "Tired",
  },
  School: {
    id: "School",
    label: "학교",
    keywords: [
      "학교", "시험", "중간고사", "기말고사", "발표", "숙제", "과제",
      "수업", "선생님", "공부", "조별", "학점", "교수", "레포트",
    ],
    characterStyleTags: ["student", "uniform"],
    backgroundIds: ["bg_school_hall", "bg_classroom"],
    obstacleIds: ["obs_textbook", "obs_teacher", "obs_homework", "obs_quiz"],
    introTemplates: [
      "시험이 추격을 시작했다",
      "조별 과제가 다가온다",
      "{input}... 교실을 탈출하자",
    ],
    resultTemplates: [
      "발표 공포에서 {time}초 버텼다",
      "숙제 지옥을 {distance}m 도망쳤다",
      "{coins}개의 과제를 외면했다",
    ],
    emotionFallback: "Awkward",
  },
  Romance: {
    id: "Romance",
    label: "연애",
    keywords: [
      "소개팅", "썸", "연애", "이별", "헤어져", "헤어진", "고백",
      "차였", "전남친", "전여친", "데이트", "짝사랑", "크러쉬",
    ],
    characterStyleTags: ["heartbreak", "romance"],
    backgroundIds: ["bg_cafe", "bg_park"],
    obstacleIds: ["obs_heart", "obs_ex", "obs_message", "obs_bouquet"],
    introTemplates: [
      "썸의 그림자가 다가온다",
      "헤어진 연인의 추억이 추격한다",
      "{input}... 도망치자, 빤쓰야",
    ],
    resultTemplates: [
      "이별에서 {time}초 버텼다",
      "연애 후유증 {distance}m 도망 성공",
      "{coins}개의 읽씹 알림을 피했다",
    ],
    emotionFallback: "Awkward",
  },
  Military: {
    id: "Military",
    label: "군대",
    keywords: [
      "군대", "훈련", "훈련소", "상병", "병장", "행군", "점호",
      "내무반", "간부", "유격", "PX", "포상",
    ],
    characterStyleTags: ["soldier"],
    backgroundIds: ["bg_barracks", "bg_field"],
    obstacleIds: ["obs_helmet", "obs_sergeant", "obs_pack", "obs_whistle"],
    introTemplates: [
      "점호 시간이 다가온다",
      "행군이 시작됐다",
      "{input}... 탈영은 안 돼, 달리기만",
    ],
    resultTemplates: [
      "훈련에서 {time}초 버텼다",
      "행군 {distance}m 성공",
      "PX 간식 {coins}개 확보",
    ],
    emotionFallback: "Fear",
  },
  Family: {
    id: "Family",
    label: "가족",
    keywords: [
      "엄마", "아빠", "부모님", "명절", "시댁", "친척", "잔소리",
      "용돈", "결혼", "취업", "언제", "시집", "장가",
    ],
    characterStyleTags: ["home"],
    backgroundIds: ["bg_home", "bg_dining"],
    obstacleIds: ["obs_mom", "obs_relative", "obs_kimchi", "obs_call"],
    introTemplates: [
      "명절이 추격한다",
      "엄마의 잔소리가 시작됐다",
      "{input}... 친척 모임 탈출!",
    ],
    resultTemplates: [
      "잔소리에서 {time}초 버텼다",
      "친척 질문 {distance}m 회피",
      "{coins}개의 비교 발언을 피했다",
    ],
    emotionFallback: "Tired",
  },
  Reality: {
    id: "Reality",
    label: "현실",
    keywords: [],
    characterStyleTags: ["casual"],
    backgroundIds: ["bg_street", "bg_city"],
    obstacleIds: ["obs_bill", "obs_rain", "obs_news", "obs_time"],
    introTemplates: [
      "현실이 추격을 시작했다",
      "{input}... 그래, 도망치자",
      "빤쓰는 오늘도 달린다",
    ],
    resultTemplates: [
      "현실에서 {time}초 버텼다",
      "{distance}m 도망 성공",
      "걱정 {coins}개를 뿌리쳤다",
    ],
    emotionFallback: "Tired",
  },
};

export const CATEGORY_ORDER: Array<Exclude<SituationCategory, "None">> = [
  "Company",
  "School",
  "Romance",
  "Military",
  "Family",
  "Reality",
];
