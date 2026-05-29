# 🩲 Panty Run (빤쓰런) — Product Spec

---

## 📌 Overview

Panty Run is a generated casual runner game where the player inputs a situation they want to escape from, and the system converts it into a humorous game scenario.

This is NOT a traditional runner game.  
It is a "situation-to-game translator".

---

## 🎯 Core Concept

> Turn real-life situations you want to escape into a funny runner game.

Example:

Input:
- 월요일 출근 너무 싫어

Generated:
- Character: Exhausted office pants
- Background: Office hallway
- Obstacles: documents, boss shadow, messenger popup
- Intro: "월요일이 추격을 시작했다"

---

## 🧠 System Architecture

User Input  
→ Input Analyzer  
→ Category + Emotion + Intensity  
→ Content Resolver  
→ Game Setup  
→ Runner Gameplay  
→ Result Card  

---

## 🧩 Core Data Model

### AnalysisResult

- originalInput: string  
- category: SituationCategory  
- emotion: EmotionType  
- intensity: number (1~5)  
- matchedKeywords: string[]  

---

### GeneratedRunSetup

- inputText: string  
- category: SituationCategory  
- emotion: EmotionType  
- intensity: number  
- characterId: string  
- backgroundId: string  
- obstacleIds: string[]  
- introText: string  
- resultTemplate: string  

---

## 🏷️ Enums

SituationCategory:
- None
- Company
- School
- Romance
- Military
- Family
- Reality

EmotionType:
- None
- Fear
- Awkward
- Tired
- Angry
- Brave

---

## 🗂️ Category Structure

Each category contains:

- keywords
- characterStyleTags
- backgroundIds
- obstacleIds
- introTemplates
- resultTemplates

---

### Example: Company

Keywords:
- 출근, 회사, 부장, 회의, 야근, 결재

Character Tags:
- office, necktie

Background:
- bg_company_hall, bg_subway

Obstacles:
- obs_document, obs_boss, obs_popup, obs_coffee

Intro:
- 월요일이 추격을 시작했다
- 결재 라인이 다가온다

Result:
- 출근 압박에서 {time}초 버텼다
- 결재 지옥을 {distance}m 회피했다

---

## 💢 Emotion Mapping

- Fear → pants_panic
- Awkward → pants_awkward
- Tired → pants_tired
- Angry → pants_angry
- Brave → pants_brave

---

## 🧠 Input Analysis Logic

### 1. Normalize
- 소문자 변환
- 공백 제거

---

### 2. Category Detection
- 키워드 매칭 개수 기반
- 가장 높은 카테고리 선택
- 없으면 Reality

---

### 3. Emotion Detection
- 동일 방식으로 감정 판별

Fallback:
- Company → Tired
- School → Awkward
- Romance → Awkward
- Military → Fear
- Default → Tired

---

### 4. Intensity

- "너무", "진짜", "미치겠다" 등 키워드 감지
- 기본값 1
- 최대 5까지 증가

---

## 🧪 Content Resolution

Character:
- emotion base + category tag

Background:
- category 기반 랜덤

Obstacles:
- category pool에서 3~5개 선택

Intro:
- 템플릿 랜덤 + {input} 치환

Result:
- 템플릿 랜덤

---

## 🎮 Gameplay

- Auto-run
- Jump / Slide
- Obstacle avoidance
- Coin collection
- Speed increase
- Collision = Game Over

---

## 🎭 Content Rules

Character:
- Base + Emotion + Style

Background:
- Category 기반

Obstacle:
- 상황 풍자 필수

---

## 🧾 Text System

Intro:
- 시작 시 1회

In-game:
- 랜덤 출력

Result:
- 템플릿 기반

예:
- "{input}에서 {time}초 생존"
- "{distance}m 도망 성공"

---

## 📱 UI Flow

1. Input Screen  
2. Preview Screen  
3. Gameplay  
4. Result Screen  

---

## 🚀 MVP Scope

포함:
- 입력 → 분석 → 생성
- 카테고리 5개
- 캐릭터 5종
- 배경 5개
- 장애물 약 20개

제외:
- AI 이미지 생성
- 스킨
- 랭킹

---

## 💰 Monetization

1단계:
- 없음

2단계:
- 부활 광고

3단계:
- 테마팩 / 캐릭터 판매

---

## 📊 KPI

- 입력 → 플레이 전환율
- 평균 플레이 시간
- 재시작률
- 공유율 (핵심)

---

## ⚠️ Risks

- 입력 품질 → 추천 태그
- 재미 부족 → 문구 강화
- 속도 문제 → 룰 기반 유지

---

## 🔥 Core Strategy

이 게임은 러너 게임이 아니라  
"상황 기반 밈 생성 게임"이다

---

## 🧠 Key Insight

성공 포인트는 AI가 아니라  
"얼마나 웃기게 번역하느냐"다

---

## 🏁 Final

"현실에서 도망치고 싶은 순간을, 빤쓰가 대신 달려준다"