// 성장·보상 단일 소스 — 누적 통계, 업적, 스킨(빤쓰 색상) 해금/장착.
// 전부 localStorage 기반 (백엔드 없음). SSR 안전 가드 포함.
import type { RunResult } from "./types";
import type { PantyType } from "./pantyArt";

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
  coinBalance: number; // 쓸 수 있는 코인 잔액(상점 구매에 사용)
  purchased: string[]; // 코인으로 구매한 스킨 id
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
  tint: number; // 색상 스킨: 🩲 이모지 틴트 / 종류 스킨: 원단 색
  achievementId: string | null; // 업적으로 해금되는 스킨이면 업적 id
  price?: number; // 코인 상점 구매가 (있으면 상점 전용)
  type?: PantyType; // 있으면 이모지 대신 직접 그린 '종류' 빤쓰
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
    coinBalance: 0,
    purchased: [],
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
  { id: "coins_50", emoji: "🫧", title: "비누방울 부자", desc: "누적 비누방울 50개", test: (s) => s.totalCoins >= 50 },
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
  // 코인 상점 전용 — 색이 아니라 '종류'가 다른 빤쓰 (직접 그림)
  { id: "holey", name: "구멍난 빤쓰", tint: 0x9a9aa5, type: "holey", achievementId: null, price: 40 },
  { id: "thong", name: "끈 빤쓰", tint: 0xff5fa2, type: "thong", achievementId: null, price: 90 },
  { id: "boxer", name: "트렁크 빤쓰", tint: 0x4a6fd0, type: "boxer", achievementId: null, price: 140 },
  { id: "heart_p", name: "하트 빤쓰", tint: 0xff8aa8, type: "heart", achievementId: null, price: 200 },
  { id: "luxury", name: "명품 빤쓰", tint: 0x23232e, type: "luxury", achievementId: null, price: 350 },
  { id: "patched", name: "기운 빤쓰", tint: 0xcdb89a, type: "patched", achievementId: null, price: 60 },
  { id: "prison", name: "죄수 빤쓰", tint: 0x2f3140, type: "prison", achievementId: null, price: 100 },
  { id: "leopard", name: "호피 빤쓰", tint: 0xd8a24a, type: "leopard", achievementId: null, price: 180 },
  { id: "rainbow", name: "무지개 빤쓰", tint: 0xff66cc, type: "rainbow", achievementId: null, price: 280 },
  { id: "hero", name: "히어로 빤쓰", tint: 0x3a5bd0, type: "hero", achievementId: null, price: 320 },
  // 2026 트렌드 반영 (최신 유행 검색)
  { id: "butterddeok", name: "버터떡 빤쓰", tint: 0xf3ecd9, type: "butterddeok", achievementId: null, price: 90 },
  { id: "strawberry", name: "딸기 빤쓰", tint: 0xff4d5e, type: "strawberry", achievementId: null, price: 100 },
  { id: "bubbletea", name: "버블티 빤쓰", tint: 0xcaa46a, type: "bubbletea", achievementId: null, price: 110 },
  { id: "jelly", name: "젤리 빤쓰", tint: 0xff5a8a, type: "jelly", achievementId: null, price: 120 },
  { id: "blindbox", name: "랜덤박스 빤쓰", tint: 0xb98cff, type: "blindbox", achievementId: null, price: 130 },
  { id: "chillguy", name: "칠가이 빤쓰", tint: 0xe0a86b, type: "chillguy", achievementId: null, price: 140 },
  { id: "dubai", name: "두바이 빤쓰", tint: 0x5b3a1e, type: "dubai", achievementId: null, price: 160 },
  { id: "godsaeng", name: "갓생 빤쓰", tint: 0x2e8b57, type: "godsaeng", achievementId: null, price: 170 },
  { id: "puppy", name: "댕댕이 빤쓰", tint: 0xd9b38c, type: "puppy", achievementId: null, price: 190 },
  { id: "ai", name: "AI 빤쓰", tint: 0x14202b, type: "ai", achievementId: null, price: 230 },
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
    const parsed = JSON.parse(raw) as Partial<Stats>;
    const merged = { ...defaultStats(), ...parsed };
    // 지갑 도입 전 사용자: 그동안 모은 코인을 잔액으로 이관
    if (parsed.coinBalance === undefined) merged.coinBalance = merged.totalCoins;
    return merged;
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
  s.coinBalance += result.coins; // 상점에서 쓸 수 있는 잔액 적립
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
  if (skin.id === "default") return true;
  if (skin.achievementId) return stats.unlocked.includes(skin.achievementId);
  if (skin.price !== undefined) return stats.purchased.includes(skin.id); // 상점 스킨
  return true;
}

export function getCoinBalance(): number {
  return getStats().coinBalance;
}

export interface BuyResult {
  ok: boolean;
  reason?: "owned" | "insufficient" | "invalid";
  balance: number;
}

/** 코인으로 스킨 구매. 성공 시 차감·소유 처리하고 잔액 반환. */
export function buySkin(skinId: string): BuyResult {
  const s = getStats();
  const skin = SKINS.find((sk) => sk.id === skinId);
  if (!skin || skin.price === undefined) return { ok: false, reason: "invalid", balance: s.coinBalance };
  if (isSkinUnlocked(skin, s)) return { ok: false, reason: "owned", balance: s.coinBalance };
  if (s.coinBalance < skin.price) return { ok: false, reason: "insufficient", balance: s.coinBalance };
  s.coinBalance -= skin.price;
  s.purchased.push(skin.id);
  saveStats(s);
  return { ok: true, balance: s.coinBalance };
}

export function setEquippedSkin(skinId: string): void {
  const s = getStats();
  const skin = SKINS.find((sk) => sk.id === skinId);
  if (!skin || !isSkinUnlocked(skin, s)) return;
  s.equippedSkin = skinId;
  saveStats(s);
}

/** 장착 스킨 객체 (잠겨있거나 없으면 기본 스킨). */
export function getEquippedSkin(): Skin {
  const s = getStats();
  const skin = SKINS.find((sk) => sk.id === s.equippedSkin);
  if (!skin || !isSkinUnlocked(skin, s)) return SKINS[0];
  return skin;
}

/** 게임에서 플레이어에 적용할 틴트 (색상 스킨용; 종류 스킨은 getEquippedSkin 사용). */
export function getEquippedSkinTint(): number {
  return getEquippedSkin().tint;
}
