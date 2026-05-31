// 성장·보상 단일 소스 — 누적 통계, 업적, 스킨(빤쓰 색상) 해금/장착.
// 전부 localStorage 기반 (백엔드 없음). SSR 안전 가드 포함.
import type { RunResult } from "./types";

const STATS_KEY = "panty_run_stats";
const LEGACY_BEST_KEY = "panty_run_best"; // 이전 버전 최고점수 — 마이그레이션용

export interface Stats {
  totalRuns: number;
  totalDistance: number;
  totalCoins: number;
  totalNearMisses: number;
  bestScore: number;
  bestDistance: number;
  maxNearMissesInRun: number;
  minSurvived: number | null;
  newRecordCount: number;
  categoriesPlayed: string[];
  itemTotals: Record<string, number>; // 능력 아이템 종류별 누적 획득 수
  maxItemsInRun: number; // 한 판 최다 아이템 획득
  unlocked: string[]; // 해금된 업적 id
  equippedSkin: string; // 장착 스킨 id
}

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  desc: string;
}

export interface Skin {
  id: string;
  name: string;
  tint: number; // 0xRRGGBB (0xffffff = 원래 색)
  achievementId: string | null; // null = 기본(항상 보유)
}

function defaultStats(): Stats {
  return {
    totalRuns: 0,
    totalDistance: 0,
    totalCoins: 0,
    totalNearMisses: 0,
    bestScore: 0,
    bestDistance: 0,
    maxNearMissesInRun: 0,
    minSurvived: null,
    newRecordCount: 0,
    categoriesPlayed: [],
    itemTotals: {},
    maxItemsInRun: 0,
    unlocked: [],
    equippedSkin: "default",
  };
}

function sumItems(s: Stats): number {
  return Object.values(s.itemTotals).reduce((a, b) => a + b, 0);
}

// ── 업적 정의 ────────────────────────────────────────────────
// 판정은 누적 통계(Stats)만으로 결정 → 언제든 재평가 가능(멱등).
interface AchievementDef extends Achievement {
  test: (s: Stats) => boolean;
}

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: "first_run", emoji: "🏃", title: "첫 도망", desc: "처음으로 도망쳤다", test: (s) => s.totalRuns >= 1 },
  { id: "runs_10", emoji: "🎮", title: "도망 10판", desc: "10번 도망쳤다", test: (s) => s.totalRuns >= 10 },
  { id: "runs_50", emoji: "🦿", title: "도망 단골", desc: "50번 도망쳤다", test: (s) => s.totalRuns >= 50 },
  { id: "dist_1k", emoji: "🗺️", title: "천릿길", desc: "한 판에 1,000m 돌파", test: (s) => s.bestDistance >= 1000 },
  { id: "total_dist_10k", emoji: "🛣️", title: "마라토너", desc: "누적 10,000m 주파", test: (s) => s.totalDistance >= 10000 },
  { id: "coins_50", emoji: "💰", title: "코인 부자", desc: "누적 코인 50개", test: (s) => s.totalCoins >= 50 },
  { id: "near_5", emoji: "😎", title: "아슬아슬의 달인", desc: "한 판에 아슬 5번", test: (s) => s.maxNearMissesInRun >= 5 },
  { id: "score_1k", emoji: "🔥", title: "네 자릿수", desc: "1,000점 돌파", test: (s) => s.bestScore >= 1000 },
  { id: "score_3k", emoji: "🏆", title: "고득점러", desc: "3,000점 돌파", test: (s) => s.bestScore >= 3000 },
  { id: "all_categories", emoji: "🌍", title: "현실 부정 마스터", desc: "5개 상황 전부 플레이", test: (s) => s.categoriesPlayed.length >= 6 },
  { id: "record_5", emoji: "📈", title: "기록 경신왕", desc: "신기록 5회 달성", test: (s) => s.newRecordCount >= 5 },
  { id: "quick_death", emoji: "☠️", title: "3초 컷", desc: "3초 만에 산화", test: (s) => s.minSurvived !== null && s.minSurvived < 3 },
  // 능력 아이템 연계
  { id: "item_first", emoji: "🎁", title: "능력 각성", desc: "능력 아이템 첫 획득", test: (s) => sumItems(s) >= 1 },
  { id: "item_collector", emoji: "🧲", title: "능력 수집가", desc: "아이템 누적 20개", test: (s) => sumItems(s) >= 20 },
  { id: "rocket_5", emoji: "🚀", title: "로켓맨", desc: "로켓 빤쓰 5번", test: (s) => (s.itemTotals.rocket ?? 0) >= 5 },
  { id: "item_glutton", emoji: "🎰", title: "능력 폭식", desc: "한 판에 아이템 4개", test: (s) => s.maxItemsInRun >= 4 },
  { id: "mine_step", emoji: "💩", title: "똥 밟았다", desc: "지뢰 빤쓰를 밟았다", test: (s) => (s.itemTotals.mine ?? 0) >= 1 },
];

export const ACHIEVEMENTS: Achievement[] = ACHIEVEMENT_DEFS.map(
  ({ id, emoji, title, desc }) => ({ id, emoji, title, desc }),
);

// ── 스킨 정의 ────────────────────────────────────────────────
export const SKINS: Skin[] = [
  { id: "default", name: "기본 빤쓰", tint: 0xffffff, achievementId: null },
  { id: "pink", name: "핫핑크 빤쓰", tint: 0xff5fa2, achievementId: "first_run" },
  { id: "sky", name: "하늘 빤쓰", tint: 0x6fc3ff, achievementId: "dist_1k" },
  { id: "purple", name: "보라 빤쓰", tint: 0xb98cff, achievementId: "runs_10" },
  { id: "red", name: "분노의 빤쓰", tint: 0xff5a4d, achievementId: "near_5" },
  { id: "mint", name: "민트 빤쓰", tint: 0x7fe6c0, achievementId: "all_categories" },
  { id: "gold", name: "황금 빤쓰", tint: 0xffd84d, achievementId: "score_3k" },
  { id: "neon", name: "네온 빤쓰", tint: 0x9eff3d, achievementId: "item_collector" },
  { id: "flame", name: "불꽃 빤쓰", tint: 0xff7a1a, achievementId: "rocket_5" },
  { id: "poop", name: "똥색 빤쓰", tint: 0x8b5a2b, achievementId: "mine_step" },
];

export function tintToHex(tint: number): string {
  return `#${tint.toString(16).padStart(6, "0")}`;
}

// ── 저장/로드 ────────────────────────────────────────────────
export function getStats(): Stats {
  if (typeof window === "undefined") return defaultStats();
  const raw = window.localStorage.getItem(STATS_KEY);
  if (!raw) {
    // 마이그레이션: 이전 최고점수만 있던 사용자 보존
    const s = defaultStats();
    const legacy = window.localStorage.getItem(LEGACY_BEST_KEY);
    const n = legacy ? parseInt(legacy, 10) : 0;
    if (Number.isFinite(n) && n > 0) s.bestScore = n;
    return s;
  }
  try {
    return { ...defaultStats(), ...(JSON.parse(raw) as Partial<Stats>) };
  } catch {
    return defaultStats();
  }
}

function saveStats(s: Stats) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STATS_KEY, JSON.stringify(s));
  window.localStorage.setItem(LEGACY_BEST_KEY, String(s.bestScore)); // 하위호환 유지
}

export function getBestScore(): number {
  return getStats().bestScore;
}

export interface RunOutcome {
  isNewRecord: boolean;
  best: number;
  newAchievements: Achievement[];
  newSkins: Skin[];
}

/** 한 판 결과를 누적 통계에 반영하고, 새로 해금된 업적·스킨을 반환한다. */
export function recordRun(result: RunResult): RunOutcome {
  const s = getStats();
  const dist = Math.round(result.distanceMeters);

  s.totalRuns += 1;
  s.totalDistance += dist;
  s.totalCoins += result.coins;
  s.totalNearMisses += result.nearMisses;
  s.bestDistance = Math.max(s.bestDistance, dist);
  s.maxNearMissesInRun = Math.max(s.maxNearMissesInRun, result.nearMisses);
  s.minSurvived =
    s.minSurvived === null
      ? result.survivedSeconds
      : Math.min(s.minSurvived, result.survivedSeconds);
  if (!s.categoriesPlayed.includes(result.setup.category)) {
    s.categoriesPlayed.push(result.setup.category);
  }

  // 능력 아이템 사용 누적
  const runItems = result.items ?? {};
  let runItemTotal = 0;
  for (const [kind, n] of Object.entries(runItems)) {
    s.itemTotals[kind] = (s.itemTotals[kind] ?? 0) + n;
    runItemTotal += n;
  }
  s.maxItemsInRun = Math.max(s.maxItemsInRun, runItemTotal);

  const isNewRecord = result.score > s.bestScore;
  if (isNewRecord) {
    s.bestScore = result.score;
    s.newRecordCount += 1;
  }

  // 업적 재평가
  const had = new Set(s.unlocked);
  const newAchievements: Achievement[] = [];
  for (const def of ACHIEVEMENT_DEFS) {
    if (!had.has(def.id) && def.test(s)) {
      s.unlocked.push(def.id);
      newAchievements.push({ id: def.id, emoji: def.emoji, title: def.title, desc: def.desc });
    }
  }
  const newIds = new Set(newAchievements.map((a) => a.id));
  const newSkins = SKINS.filter((sk) => sk.achievementId && newIds.has(sk.achievementId));

  saveStats(s);
  return { isNewRecord, best: s.bestScore, newAchievements, newSkins };
}

export function isSkinUnlocked(skin: Skin, stats: Stats): boolean {
  return skin.achievementId === null || stats.unlocked.includes(skin.achievementId);
}

export function setEquippedSkin(skinId: string): void {
  const s = getStats();
  const skin = SKINS.find((sk) => sk.id === skinId);
  if (!skin || !isSkinUnlocked(skin, s)) return;
  s.equippedSkin = skinId;
  saveStats(s);
}

/** 게임에서 플레이어에 적용할 틴트 (장착 스킨이 잠겨있으면 기본색). */
export function getEquippedSkinTint(): number {
  const s = getStats();
  const skin = SKINS.find((sk) => sk.id === s.equippedSkin);
  if (!skin || !isSkinUnlocked(skin, s)) return 0xffffff;
  return skin.tint;
}
