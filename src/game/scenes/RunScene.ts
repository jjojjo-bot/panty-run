import Phaser from "phaser";
import type { GeneratedRunSetup, SituationCategory } from "@/lib/types";
import { computeScore } from "@/lib/grade";
import { getEquippedSkin, tintToHex } from "@/lib/progress";
import { drawPanty } from "@/lib/pantyArt";
import { getStage, type StageDef, type AvoidKind, type BossDef } from "@/lib/content/stages";

export interface RunSceneData {
  setup: GeneratedRunSetup;
  onGameOver: (stats: {
    time: number;
    distance: number;
    coins: number;
    nearMisses: number;
    score: number;
    items: Record<string, number>;
    mental: number;
    dodgedNotifs: number;
    ignoredCalls: number;
    cleared: boolean; // 보스를 따돌려 클리어했는가
  }) => void;
}

const GAME_W = 800;
const GAME_H = 480;
const GROUND_Y = 400;
const PLAYER_X = 120;
const GRAVITY = 2000;
const JUMP_V = -780;
const BASE_SPEED = 360;
const SPEED_RAMP = 14;
const MENTAL_MAX = 100; // 멘탈(정신력) 최대 — 0이면 출근(게임오버)
const DEFAULT_DAMAGE = 12; // 데이터에 없을 때 기본 멘탈 데미지
const HIT_IFRAMES = 1.2; // 피격 후 무적 시간(초)

// 콤보 & 피버
const FEVER_MAX = 100; // 피버 게이지 최대
const FEVER_DUR = 7; // 피버 지속(초)
const GAUGE_BUBBLE = 7; // 비누방울 1개당 게이지
const GAUGE_NEAR = 12; // 아슬 1회당 게이지
const FEVER_SPEED = 1.25; // 피버 중 가속
const HIT_GAUGE_PENALTY = 35; // 피격 시 게이지 감소

// ── 리듬 국면(평상 → 위기 → 휴식)으로 긴장-이완 ─────────────────
// 거리(px) 기준이라 슬로우/로켓으로 속도가 바뀌어도 구간 길이가 일관됨.
const FIRST_DANGER_X = 5000; // 첫 위기까지 평상 거리(px) — 충분한 워밍업
const NORMAL_LEN_MIN = 2400; // 평상 구간 길이 범위(px)
const NORMAL_LEN_MAX = 3200;
const DANGER_LEN = 2200; // 위기 구간 길이(px)
const CALM_LEN = 1100; // 휴식(보상) 구간 길이(px)
const DANGER_SPEED = 1.12; // 위기 중 가속 배수
const ESCAPE_BONUS = 8; // 위기 탈출 시 비누방울 보너스
const CHASER_GAP = 78; // 추격자 기본 추격 간격(px, 플레이어 뒤) — 화면에 보이게
const CHASER_HIT_CLOSE = 0.4; // 위기 중 피격 시 추격자 근접도 증가량

// 내리막에서도 점프가 먹히게 하는 접지 보정값
const COYOTE_TIME = 0.12; // 지면을 떠난 직후 점프 허용 유예(초)
const GROUND_SNAP = 36; // 점프 중이 아닐 때 이 간격 이내면 지형에 붙임(px)

// 지형(언덕) 표면 기준, 위쪽으로 띄우는 오프셋(px) — 충돌 박스 기준
const FOOT_STAND = 30; // 서있을 때 발 오프셋(중심→발)
const FOOT_SLIDE = 16; // 슬라이드 시 발 오프셋
const OFF_GROUND_OBS = 30; // 지상 장애물(점프로 회피) 중심 높이
const OFF_OVERHEAD = 52; // 머리 위 장애물(슬라이드로 회피) 중심 높이
const OFF_COIN = 100; // 코인 기본 높이

const NEARMISS_GAP = 24; // 이 간격(px) 이내로 스쳐 지나가면 '아슬!'
const STAND_SCALE = 64 / 96; // 서있는 플레이어 기본 스케일(텍스처 96 → 표시 64)

const PLAYER_EMOJI = "🩲";
const COIN_EMOJI = "🫧"; // 비누방울 (획득 재화)
const FALLBACK_OBSTACLE_EMOJI = "❓";

// 인게임 랜덤 대사 (가끔 플레이어 옆에 뜸)
const QUIPS = [
  "헉헉",
  "거의 다 왔어!",
  "안 잡혀!",
  "조금만 더!",
  "빤쓰 파이팅",
  "못 잡지롱~",
  "도망은 실력이야",
  "현생아 잘 있어",
  "존버는 승리한다",
  "갓생은 내일부터",
  "도망 폼 미쳤다",
  "이왜진?!",
];

// ── 빤쓰 능력 아이템 ──────────────────────────────────────────
type ItemKind =
  | "angel"
  | "gold"
  | "shield"
  | "propeller"
  | "magnet"
  | "turtle"
  | "rocket"
  | "coffee"
  | "jackpot"
  | "mine"
  | "americano"
  | "vacation"
  | "holiday";
const ITEM_EMOJI: Record<ItemKind, string> = {
  angel: "😇", // 무적
  gold: "🥇", // 점수 2배
  shield: "🛡️", // 1회 방어
  propeller: "🪂", // 비행
  magnet: "🧲", // 코인 흡입
  turtle: "🐢", // 슬로우
  rocket: "🚀", // 폭주(가속+무적)
  coffee: "⚡", // 각성(2단 점프)
  jackpot: "🧧", // 복주머니(즉시 코인)
  mine: "💩", // 함정(통제불능 가속)
  americano: "☕", // 멘탈 +10
  vacation: "🏖️", // 멘탈 +50
  holiday: "🎌", // 멘탈 풀충전
};
const ITEM_LABEL: Record<ItemKind, string> = {
  angel: "😇 무적!",
  gold: "🥇 점수 2배!",
  shield: "🛡️ 철벽!",
  propeller: "🪂 비행!",
  magnet: "🧲 비누방울 자석!",
  turtle: "🐢 슬로우!",
  rocket: "🚀 폭주!",
  coffee: "⚡ 각성! 2단 점프",
  jackpot: "🧧 비누방울 +15!",
  mine: "💩 으악, 지뢰!",
  americano: "☕ 멘탈 +10",
  vacation: "🏖️ 멘탈 +50!",
  holiday: "🎌 멘탈 풀충전!",
};
// 스폰 가중치 — 함정(mine)은 드물게, 나머지는 비슷하게
const ITEM_WEIGHTS: Record<ItemKind, number> = {
  angel: 3,
  gold: 3,
  shield: 3,
  propeller: 3,
  magnet: 3,
  turtle: 3,
  rocket: 2,
  coffee: 2,
  jackpot: 2,
  mine: 1,
  americano: 3,
  vacation: 1,
  holiday: 1,
};
const ITEM_KINDS = Object.keys(ITEM_EMOJI) as ItemKind[]; // 텍스처 생성용 전체 목록
const ITEM_POOL: ItemKind[] = (Object.keys(ITEM_WEIGHTS) as ItemKind[]).flatMap(
  (k) => Array<ItemKind>(ITEM_WEIGHTS[k]).fill(k),
); // 가중치 적용 스폰 풀

const DUR_INVINCIBLE = 5;
const DUR_GOLD = 8;
const DUR_FLY = 5;
const DUR_MAGNET = 8;
const DUR_SLOW = 5;
const DUR_ROCKET = 3;
const DUR_COFFEE = 7;
const DUR_MINE = 2.5;
const SLOW_FACTOR = 0.55;
const ROCKET_BOOST = 1.8;
const MINE_BOOST = 1.35;
const COFFEE_JUMP_V = -980; // 각성 시 강화 점프
const JACKPOT_COINS = 15;
const MAGNET_RADIUS = 240;

const OBSTACLE_EMOJI: Record<string, string> = {
  obs_document: "📄",
  obs_boss: "👔",
  obs_popup: "💬",
  obs_coffee: "☕",
  obs_textbook: "📚",
  obs_teacher: "👨‍🏫",
  obs_homework: "📝",
  obs_quiz: "📋",
  obs_heart: "💔",
  obs_ex: "👻",
  obs_message: "💌",
  obs_bouquet: "💐",
  obs_helmet: "⛑️",
  obs_sergeant: "🪖",
  obs_pack: "🎒",
  obs_whistle: "📯",
  obs_mom: "👩",
  obs_relative: "👴",
  obs_kimchi: "🥬",
  obs_call: "📞",
  obs_bill: "💸",
  obs_rain: "🌧️",
  obs_news: "📰",
  obs_time: "⏰",
};

// ── 위기 구간 추격자 — 카테고리별 빌런 ─────────────────────────
const CHASER_EMOJI: Record<SituationCategory, string> = {
  None: "👹",
  Company: "👔",
  School: "👨‍🏫",
  Romance: "👻",
  Military: "🪖",
  Family: "👩",
  Reality: "👹",
};
const CHASER_LABEL: Record<SituationCategory, string> = {
  None: "현생",
  Company: "상사",
  School: "선생님",
  Romance: "전 애인",
  Military: "조교",
  Family: "엄마",
  Reality: "현실",
};

// ── 스폰 패턴(청크) 라이브러리 ─────────────────────────────────
// gap·tail은 "초(시간)" 단위 — 스폰 시 현재 속도로 px 변환한다.
// 점프 체공은 속도와 무관하게 일정(JUMP_AIRTIME)하므로, 간격을 시간으로
// 잡아야 속도가 빨라져도 "점프로 넘을 수 있는 간격"이 항상 유지된다.
const JUMP_AIRTIME = (2 * Math.abs(JUMP_V)) / GRAVITY; // 점프~착지 체공 ≈0.78s
const T_SOLO = JUMP_AIRTIME + 0.28; // 개별 점프 최소 간격(착지+반응 여유) ≈1.06s
const T_MIX = JUMP_AIRTIME + 0.12; // 점프↔슬라이드 전환 ≈0.9s
const T_SLIDE = 0.8; // 슬라이드~슬라이드(슬라이드 0.6s 지속)

type StepKind = "ground" | "overhead" | "arc" | "line";
interface PatternStep {
  kind: StepKind;
  gap: number; // 직전 스텝(첫 스텝은 패턴 시작)으로부터의 시간 간격(초)
  n?: number; // line: 코인 개수
}
interface Pattern {
  id: string;
  steps: PatternStep[];
  tail: number; // 다음 패턴까지 최소 여유(초)
  diff?: number; // 평상 패턴 난이도(1 쉬움 ~ 3 어려움). 진행도에 따라 해금
  weight?: number; // 등장 가중치(기본 1)
}

/** 가중치 기반 패턴 추첨 */
function pickPattern(pool: Pattern[]): Pattern {
  let total = 0;
  for (const p of pool) total += p.weight ?? 1;
  let r = Math.random() * total;
  for (const p of pool) {
    r -= p.weight ?? 1;
    if (r < 0) return p;
  }
  return pool[pool.length - 1];
}

// 평상: diff로 초반 워밍업 → 점진 해금. 모든 점프는 개별 회피(T_SOLO) 기반
const NORMAL_PATTERNS: Pattern[] = [
  // diff 1 — 단발/코인 (워밍업)
  { id: "single-jump", steps: [{ kind: "ground", gap: 0 }], tail: 0.45, diff: 1 },
  { id: "single-slide", steps: [{ kind: "overhead", gap: 0 }], tail: 0.45, diff: 1 },
  { id: "coin-arc", steps: [{ kind: "arc", gap: 0 }], tail: 0.4, diff: 1, weight: 3 },
  // diff 2 — 두 동작 조합
  { id: "double-jump", steps: [{ kind: "ground", gap: 0 }, { kind: "ground", gap: T_SOLO }], tail: 0.5, diff: 2 },
  { id: "jump-slide", steps: [{ kind: "ground", gap: 0 }, { kind: "overhead", gap: T_MIX }], tail: 0.5, diff: 2 },
  { id: "slide-jump", steps: [{ kind: "overhead", gap: 0 }, { kind: "ground", gap: T_MIX }], tail: 0.5, diff: 2 },
  { id: "tunnel", steps: [{ kind: "overhead", gap: 0 }, { kind: "overhead", gap: T_SLIDE }], tail: 0.5, diff: 2 },
  // diff 3 — 3연타(각각 개별 점프 간격)
  { id: "stairs", steps: [{ kind: "ground", gap: 0 }, { kind: "ground", gap: T_SOLO }, { kind: "ground", gap: T_SOLO }], tail: 0.6, diff: 3 },
];

// 위기: 점프·슬라이드가 번갈아 몰아침. 간격은 평상과 비슷하되 가속·추격자로 긴장
const DANGER_PATTERNS: Pattern[] = [
  { id: "d-zigzag", steps: [{ kind: "ground", gap: 0 }, { kind: "overhead", gap: T_MIX }, { kind: "ground", gap: T_MIX }], tail: 0.5 },
  { id: "d-slide-jump", steps: [{ kind: "overhead", gap: 0 }, { kind: "ground", gap: T_MIX }, { kind: "overhead", gap: T_MIX }], tail: 0.5 },
  { id: "d-double", steps: [{ kind: "ground", gap: 0 }, { kind: "ground", gap: T_SOLO }], tail: 0.45 },
  { id: "d-triple", steps: [{ kind: "ground", gap: 0 }, { kind: "ground", gap: T_SOLO }, { kind: "ground", gap: T_SOLO }], tail: 0.5 },
];

// 휴식: 장애물 없이 비누방울 보상만
const CALM_PATTERNS: Pattern[] = [
  { id: "calm-arc", steps: [{ kind: "arc", gap: 0 }], tail: 0.6 },
  { id: "calm-line", steps: [{ kind: "line", gap: 0, n: 6 }], tail: 0.7 },
  { id: "calm-double-arc", steps: [{ kind: "arc", gap: 0 }, { kind: "arc", gap: 1.1 }], tail: 0.7 },
];

export class RunScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private playerDmg!: Phaser.GameObjects.Image; // 생명 감소 시 낡음 오버레이
  private playerBody!: Phaser.Physics.Arcade.Body;
  private bgFar!: Phaser.GameObjects.Graphics;
  private terrain!: Phaser.GameObjects.Graphics;
  private speedGfx!: Phaser.GameObjects.Graphics;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private coins!: Phaser.Physics.Arcade.Group;
  private items!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group; // 날아오는 투사체(fly)
  private scoreText!: Phaser.GameObjects.Text;
  private effectText!: Phaser.GameObjects.Text;
  private centerFx!: Phaser.GameObjects.Text; // 화면 중앙 큰 효과 표시
  private introText!: Phaser.GameObjects.Text;

  private setup!: GeneratedRunSetup;
  private onGameOver!: RunSceneData["onGameOver"];

  private elapsed = 0;
  private distance = 0;
  private coinCount = 0;
  private nearMisses = 0;
  private speed = BASE_SPEED;
  private baseSpeed = BASE_SPEED; // 피격 시 되돌릴 초기 속도
  private mental = MENTAL_MAX; // 멘탈(정신력) 0~100, 0이면 출근
  private alive = true;
  private isSliding = false;
  private slideTimer = 0;

  private worldScroll = 0;
  private playerVy = 0;
  private grounded = true;
  private jumping = false;
  private coyote = 0;
  private quipTimer = 0;

  // 능력 아이템 효과 상태
  private invincibleTimer = 0; // 무적(천사)
  private multTimer = 0; // 점수 2배(황금)
  private magnetTimer = 0; // 코인 자석
  private slowTimer = 0; // 슬로우(거북이)
  private flying = false; // 비행(프로펠러)
  private flyTimer = 0;
  private shield = false; // 1회 방어(철벽)
  private rocketTimer = 0; // 로켓 폭주(가속+무적)
  private coffeeTimer = 0; // 카페인(2단 점프)
  private mineTimer = 0; // 지뢰(통제불능 가속)
  private airJumpUsed = false; // 공중 2단 점프 사용 여부
  private bonusScore = 0; // 점수 2배 동안 쌓은 추가 점수
  private itemTimer = 0; // 다음 아이템 등장까지
  private itemCounts: Record<string, number> = {}; // 이번 판 아이템 획득 집계

  // 콤보 & 피버
  private combo = 0;
  private feverGauge = 0;
  private fever = false;
  private feverTimer = 0;
  private feverBar!: Phaser.GameObjects.Graphics;
  private feverOverlay!: Phaser.GameObjects.Rectangle;
  private mentalBar!: Phaser.GameObjects.Graphics;
  private mentalText!: Phaser.GameObjects.Text;

  private streaks: { x: number; y: number; len: number }[] = [];

  // 리듬 국면 & 거리 기반 패턴 스폰
  private phase: "normal" | "danger" | "calm" = "normal";
  private phaseEndX = 0; // worldScroll가 이 값을 넘으면 다음 국면으로
  private nextPatternX = 0; // 다음 패턴을 배치할 worldX
  private dangerCount = 0; // 지나온 위기 횟수
  private warnText!: Phaser.GameObjects.Text; // 위기 경고·탈출 배너

  // 추격자(위기 빌런)
  private chaser?: Phaser.GameObjects.Image;
  private chaserAura?: Phaser.GameObjects.Arc; // 빌런 강조용 붉은 오라
  private chaserX = -80; // 추격자 화면 x
  private chaserClose = 0; // 0(멀리)~1(바짝) — 위기 중 피격 시 증가

  // 스테이지(구간) 모드 — 거리별로 배경·장애물 테마가 바뀜
  private stage?: StageDef;
  private zoneIdx = 0;
  private zoneEndX = 0; // worldScroll가 이 값을 넘으면 다음 구간
  private terrainColor = 0x2b2b3a; // 현재 구간 지형 색
  private projTimer = 0; // 다음 투사체 발사까지(초)
  private dodgedNotifs = 0; // 💬 회피한 알림 수
  private ignoredCalls = 0; // 📱 무시한 전화 수

  // 보스(MONDAY) — 공격이 아니라 따돌리기
  private boss?: BossDef;
  private bossActive = false;
  private escapeTimer = 0; // 남은 버티기 시간(0이면 따돌림=클리어)
  private bossImg?: Phaser.GameObjects.Image;
  private escapeBar!: Phaser.GameObjects.Graphics;

  constructor() {
    super("RunScene");
  }

  init(data: RunSceneData) {
    this.setup = data.setup;
    this.onGameOver = data.onGameOver;
    this.elapsed = 0;
    this.distance = 0;
    this.coinCount = 0;
    this.nearMisses = 0;
    this.speed = BASE_SPEED * (1 + (data.setup.intensity - 1) * 0.08);
    this.baseSpeed = this.speed;
    this.mental = MENTAL_MAX;
    this.alive = true;
    this.isSliding = false;
    this.slideTimer = 0;
    this.worldScroll = 0;
    this.playerVy = 0;
    this.grounded = true;
    this.jumping = false;
    this.coyote = 0;
    this.quipTimer = 3;
    this.invincibleTimer = 0;
    this.multTimer = 0;
    this.magnetTimer = 0;
    this.slowTimer = 0;
    this.flying = false;
    this.flyTimer = 0;
    this.shield = false;
    this.rocketTimer = 0;
    this.coffeeTimer = 0;
    this.mineTimer = 0;
    this.airJumpUsed = false;
    this.bonusScore = 0;
    this.itemTimer = 10;
    this.itemCounts = {};
    this.combo = 0;
    this.feverGauge = 0;
    this.fever = false;
    this.feverTimer = 0;
    this.phase = "normal";
    this.phaseEndX = FIRST_DANGER_X;
    this.nextPatternX = GAME_W + 200;
    this.dangerCount = 0;
    this.chaser = undefined;
    this.chaserAura = undefined;
    this.chaserX = -80;
    this.chaserClose = 0;
    // 스테이지(구간) 모드 — stageId가 있으면 구간별 테마로 구동
    this.stage = this.setup.stageId ? getStage(this.setup.stageId) : undefined;
    this.zoneIdx = 0;
    this.projTimer = 1.5;
    this.dodgedNotifs = 0;
    this.ignoredCalls = 0;
    this.boss = undefined;
    this.bossActive = false;
    this.escapeTimer = 0;
    this.bossImg = undefined;
    if (this.stage) {
      this.zoneEndX = this.stage.zones[0].length;
      this.terrainColor = this.stage.zones[0].ground;
    } else {
      this.terrainColor = 0x2b2b3a;
    }
  }

  create() {
    this.cameras.main.setBackgroundColor(this.bgColor());

    this.buildEmojiTextures();

    // 레이어: 원경 언덕(패럴랙스) → 지형 → 스피드라인 → 엔티티 → 플레이어 → 팝업 → HUD
    this.bgFar = this.add.graphics().setDepth(-20);
    this.terrain = this.add.graphics().setDepth(-10);
    this.speedGfx = this.add.graphics().setDepth(-5);

    this.streaks = [];
    for (let i = 0; i < 16; i++) {
      this.streaks.push({
        x: Phaser.Math.Between(0, GAME_W),
        y: Phaser.Math.Between(40, GAME_H - 90),
        len: Phaser.Math.Between(28, 78),
      });
    }

    this.player = this.add
      .image(PLAYER_X, this.surfaceYAt(PLAYER_X) - FOOT_STAND, "tex_player")
      .setDepth(5);
    this.player.setDisplaySize(64, 64);
    // 스킨 적용: 종류 스킨은 직접 그린 텍스처, 색상 스킨은 이모지 틴트.
    const skin = getEquippedSkin();
    if (skin.type) {
      this.makeSkinTexture("tex_skin", skin.type, tintToHex(skin.tint));
      this.player.setTexture("tex_skin");
      this.player.setDisplaySize(64, 64);
    } else if (skin.tint !== 0xffffff) {
      this.player.setTintFill(skin.tint);
    }
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setAllowGravity(false);
    this.playerBody.moves = false; // 이동은 직접 관리, Arcade는 overlap 감지용
    this.playerBody.setSize(40, 56, true);

    // 낡음 오버레이 — 생명 줄수록 구멍·얼룩·찢김이 심해진다
    this.makeDamageTexture("tex_dmg1", 1);
    this.makeDamageTexture("tex_dmg2", 2);
    this.playerDmg = this.add.image(PLAYER_X, this.player.y, "tex_dmg1").setDepth(6).setVisible(false);
    this.playerDmg.setDisplaySize(64, 64);

    this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true });
    this.coins = this.physics.add.group({ allowGravity: false });
    this.items = this.physics.add.group({ allowGravity: false });
    this.projectiles = this.physics.add.group({ allowGravity: false });

    this.physics.add.overlap(this.player, this.obstacles, (_p, o) =>
      this.hitObstacle(o as Phaser.GameObjects.GameObject),
    );
    this.physics.add.overlap(this.player, this.projectiles, (_p, o) =>
      this.hitObstacle(o as Phaser.GameObjects.GameObject),
    );
    this.physics.add.overlap(this.player, this.coins, (_p, c) =>
      this.collectCoin(c as Phaser.GameObjects.Image),
    );
    this.physics.add.overlap(this.player, this.items, (_p, it) =>
      this.collectItem(it as Phaser.GameObjects.GameObject),
    );

    this.introText = this.add
      .text(GAME_W / 2, 60, this.setup.introText, {
        fontSize: "22px",
        color: "#ffd84d",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(1000);
    this.tweens.add({
      targets: this.introText,
      alpha: 0,
      delay: 2200,
      duration: 800,
    });

    // 멘탈 게이지 (좌상단, 핵심 생존 지표)
    this.mentalText = this.add
      .text(16, 13, "🧠 100%", {
        fontSize: "15px",
        color: "#f4f4f6",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontStyle: "bold",
      })
      .setDepth(1000);
    this.mentalBar = this.add.graphics().setDepth(1000);

    this.scoreText = this.add
      .text(16, 40, "", {
        fontSize: "16px",
        color: "#f4f4f6",
        fontFamily: "system-ui, -apple-system, sans-serif",
      })
      .setDepth(1000);

    // 활성 능력 표시줄 (점수 아래)
    this.effectText = this.add
      .text(16, 64, "", {
        fontSize: "15px",
        color: "#ffe08a",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontStyle: "bold",
      })
      .setDepth(1000);

    // 화면 중앙 큰 효과 표시 (깜빡임)
    this.centerFx = this.add
      .text(GAME_W / 2, 150, "", {
        fontSize: "34px",
        color: "#ffffff",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontStyle: "bold",
        align: "center",
        stroke: "#000000",
        strokeThickness: 6,
        lineSpacing: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(900);

    // 피버 화면 오버레이(무지개 번쩍) + 게이지 바
    this.feverOverlay = this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0xff7a1a)
      .setDepth(800)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.feverBar = this.add.graphics().setDepth(1000);
    this.escapeBar = this.add.graphics().setDepth(1000);

    // 위기 경고·탈출 배너 (큰 글씨, 평소 숨김)
    this.warnText = this.add
      .text(GAME_W / 2, 118, "", {
        fontSize: "30px",
        color: "#ff5a6a",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontStyle: "bold",
        align: "center",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(1100);

    const hint = this.add
      .text(
        GAME_W / 2,
        GAME_H - 24,
        "위쪽 탭·스페이스 → 점프   ·   아래쪽 탭·↓ → 슬라이드",
        {
          fontSize: "12px",
          color: "#9b9baf",
          fontFamily: "system-ui, -apple-system, sans-serif",
        },
      )
      .setOrigin(0.5)
      .setDepth(1000);
    this.tweens.add({ targets: hint, alpha: 0, delay: 3500, duration: 600 });

    this.input.keyboard?.on("keydown-SPACE", () => this.tryJump());
    this.input.keyboard?.on("keydown-UP", () => this.tryJump());
    this.input.keyboard?.on("keydown-DOWN", () => this.startSlide());
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (p.y > GAME_H / 2) this.startSlide();
      else this.tryJump();
    });

    this.drawBackground();
    this.drawTerrain();
  }

  update(_time: number, delta: number) {
    if (!this.alive) return;
    const dt = delta / 1000;
    this.elapsed += dt;
    this.speed += SPEED_RAMP * dt;

    // 속도 보정: 거북이(슬로우) ↓, 로켓·지뢰 ↑
    const slow = this.slowTimer > 0 ? SLOW_FACTOR : 1;
    const boost =
      (this.rocketTimer > 0 ? ROCKET_BOOST : 1) *
      (this.mineTimer > 0 ? MINE_BOOST : 1) *
      (this.fever ? FEVER_SPEED : 1) *
      (this.phase === "danger" ? DANGER_SPEED : 1);
    const effSpeed = this.speed * slow * boost;
    this.distance += effSpeed * dt * 0.1;
    this.worldScroll += effSpeed * dt;
    // 황금(점수 2배) — 적용 중 벌어들인 거리만큼 보너스 추가
    if (this.multTimer > 0) this.bonusScore += effSpeed * dt * 0.1;
    // 피버 — 거리 점수 3배(기본 1 + 보너스 2)
    if (this.fever) this.bonusScore += effSpeed * dt * 0.1 * 2;

    // 효과 타이머 감소
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
    if (this.multTimer > 0) this.multTimer -= dt;
    if (this.magnetTimer > 0) this.magnetTimer -= dt;
    if (this.slowTimer > 0) this.slowTimer -= dt;
    if (this.rocketTimer > 0) this.rocketTimer -= dt;
    if (this.coffeeTimer > 0) this.coffeeTimer -= dt;
    if (this.mineTimer > 0) this.mineTimer -= dt;
    if (this.flying) {
      this.flyTimer -= dt;
      if (this.flyTimer <= 0) this.flying = false;
    }
    if (this.fever) {
      this.feverTimer -= dt;
      if (this.feverTimer <= 0) this.endFever();
    }
    this.drawFeverBar();
    this.feverOverlay.setAlpha(
      this.fever ? 0.1 + 0.09 * Math.abs(Math.sin(this.elapsed * 14)) : 0,
    );
    if (this.fever) {
      const hues = [0xff7a1a, 0xff3b8b, 0xffd84d, 0x3bb0ff];
      this.feverOverlay.setFillStyle(hues[Math.floor(this.elapsed * 8) % hues.length]);
    }

    this.drawBackground();
    this.drawTerrain();
    this.drawSpeedLines(dt);
    this.updatePlayer(dt);
    this.syncPlayerDmg();
    this.updateObstacles();
    this.updateCoins();
    this.updateItems();

    // 능력 아이템 등장 (코인보다 드물게)
    this.itemTimer -= dt;
    if (this.itemTimer <= 0) {
      this.itemTimer = Phaser.Math.FloatBetween(14, 22);
      this.spawnItem();
    }

    // 리듬 국면 전환 + 거리 기반 패턴 스폰 + 추격자
    this.updatePhase();
    if (this.stage) this.updateZone();
    if (this.bossActive) this.updateBoss(dt);
    let guard = 0;
    while (this.nextPatternX - this.worldScroll < GAME_W + 200 && guard++ < 8) {
      this.spawnNextPattern();
    }
    this.updateChaser(dt);

    // 투사체(fly) — 현재 구간에 fly 장애물이 있으면 주기적으로 날아옴
    if (this.zoneHasFly()) {
      this.projTimer -= dt;
      if (this.projTimer <= 0) {
        this.projTimer = Phaser.Math.FloatBetween(1.6, 2.6);
        this.spawnProjectile();
      }
    }
    this.updateProjectiles(dt);

    if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) this.endSlide();
    }

    this.quipTimer -= dt;
    if (this.quipTimer <= 0) {
      this.quipTimer = Phaser.Math.FloatBetween(3.5, 6.5);
      if (Math.random() < 0.7) {
        const q = QUIPS[Math.floor(Math.random() * QUIPS.length)];
        this.popText(this.player.x + 34, this.player.y - 38, q, "#cfcfe0");
      }
    }

    this.mentalText.setText(`🧠 ${Math.ceil(this.mental)}%`);
    this.drawMentalBar();
    const comboStr = this.combo >= 2 ? `   🔥x${this.combo}` : "";
    this.scoreText.setText(
      `🏆 ${this.liveScore()}   🏃 ${Math.round(this.distance)}m   🫧 ${this.coinCount}${comboStr}`,
    );

    // 활성 능력 표시
    const fx: string[] = [];
    if (this.rocketTimer > 0) fx.push(`🚀${Math.ceil(this.rocketTimer)}`);
    else if (this.flying) fx.push(`🪂${Math.ceil(this.flyTimer)}`);
    else if (this.invincibleTimer > 0) fx.push(`😇${Math.ceil(this.invincibleTimer)}`);
    if (this.multTimer > 0) fx.push(`🥇${Math.ceil(this.multTimer)}`);
    if (this.coffeeTimer > 0) fx.push(`☕${Math.ceil(this.coffeeTimer)}`);
    if (this.magnetTimer > 0) fx.push(`🧲${Math.ceil(this.magnetTimer)}`);
    if (this.slowTimer > 0) fx.push(`🐢${Math.ceil(this.slowTimer)}`);
    if (this.mineTimer > 0) fx.push(`💩${Math.ceil(this.mineTimer)}`);
    if (this.shield) fx.push("🛡️");
    this.effectText.setText(fx.join("   "));

    // 화면 중앙 큰 표시 (아이템명 + 남은 시간, 깜빡임)
    const lines: string[] = [];
    if (this.fever) lines.push(`🔥 피버!! x3  ${Math.ceil(this.feverTimer)}`);
    if (this.rocketTimer > 0) lines.push(`🚀 폭주 ${Math.ceil(this.rocketTimer)}`);
    else if (this.flying) lines.push(`🪂 비행 ${Math.ceil(this.flyTimer)}`);
    else if (this.invincibleTimer > 0) lines.push(`😇 무적 ${Math.ceil(this.invincibleTimer)}`);
    if (this.multTimer > 0) lines.push(`🥇 점수 2배 ${Math.ceil(this.multTimer)}`);
    if (this.coffeeTimer > 0) lines.push(`☕ 2단 점프 ${Math.ceil(this.coffeeTimer)}`);
    if (this.magnetTimer > 0) lines.push(`🧲 비누방울 자석 ${Math.ceil(this.magnetTimer)}`);
    if (this.slowTimer > 0) lines.push(`🐢 슬로우 ${Math.ceil(this.slowTimer)}`);
    if (this.mineTimer > 0) lines.push(`💩 지뢰! ${Math.ceil(this.mineTimer)}`);
    if (this.shield) lines.push("🛡️ 철벽");
    if (lines.length > 0) {
      this.centerFx.setText(lines.join("\n"));
      this.centerFx.setAlpha(0.45 + 0.55 * Math.abs(Math.sin(this.elapsed * 9)));
    } else {
      this.centerFx.setText("");
      this.centerFx.setAlpha(0);
    }
  }

  /** 현재 점수 (거리+코인+아슬 + 점수2배 보너스) */
  private liveScore(): number {
    return (
      computeScore({
        distance: this.distance,
        coins: this.coinCount,
        nearMisses: this.nearMisses,
      }) + Math.round(this.bonusScore)
    );
  }

  /**
   * 지형 표면의 y좌표 (작을수록 높은 언덕).
   * 진폭을 진행 거리(worldX)에 비례해 키워서 갈수록 경사가 험해진다.
   * 시간이 아니라 위치 기준이라, 지나간 지형은 모양이 변하지 않고
   * 장애물·코인의 지형 기준 높이도 항상 일관되게 유지된다.
   */
  private surfaceYAt(worldX: number): number {
    const ramp = Phaser.Math.Clamp((worldX - 800) / 9000, 0, 1);
    const peak = 44 + ramp * 62; // 진폭 44px → 106px
    const unit =
      Math.sin(worldX * 0.0022) * 0.45 +
      Math.sin(worldX * 0.006 + 2.1) * 0.33 +
      Math.sin(worldX * 0.012 + 0.7) * 0.22;
    const y = GROUND_Y - 6 - unit * peak;
    return Phaser.Math.Clamp(y, 150, 452);
  }

  /** 원경 언덕 — 느린 스크롤(패럴랙스)로 속도감과 깊이감 부여 */
  private farSurfaceAt(worldX: number): number {
    return (
      300 - Math.sin(worldX * 0.0016) * 42 - Math.sin(worldX * 0.0041 + 1.0) * 20
    );
  }

  private drawBackground() {
    const g = this.bgFar;
    const step = 16;
    const scroll = this.worldScroll * 0.4; // 본 지형보다 천천히
    g.clear();
    g.fillStyle(0x000000, 0.18);
    g.beginPath();
    g.moveTo(0, GAME_H);
    for (let x = 0; x <= GAME_W; x += step) {
      g.lineTo(x, this.farSurfaceAt(scroll + x));
    }
    g.lineTo(GAME_W, GAME_H);
    g.closePath();
    g.fillPath();
  }

  private drawTerrain() {
    const g = this.terrain;
    const step = 12;
    g.clear();

    g.fillStyle(this.terrainColor, 1);
    g.beginPath();
    g.moveTo(0, GAME_H);
    for (let x = 0; x <= GAME_W; x += step) {
      g.lineTo(x, this.surfaceYAt(this.worldScroll + x));
    }
    g.lineTo(GAME_W, GAME_H);
    g.closePath();
    g.fillPath();

    g.lineStyle(3, 0x4a4a63, 1);
    g.beginPath();
    g.moveTo(0, this.surfaceYAt(this.worldScroll));
    for (let x = step; x <= GAME_W; x += step) {
      g.lineTo(x, this.surfaceYAt(this.worldScroll + x));
    }
    g.strokePath();
  }

  /** 속도가 빠를수록 진해지는 스피드라인 */
  private drawSpeedLines(dt: number) {
    const g = this.speedGfx;
    g.clear();
    const intensity = Phaser.Math.Clamp((this.speed - BASE_SPEED) / 500, 0, 1);
    if (intensity < 0.03) return;
    g.lineStyle(2, 0xffffff, 0.08 + 0.16 * intensity);
    for (const s of this.streaks) {
      s.x -= this.speed * 1.4 * dt;
      if (s.x < -s.len) {
        s.x = GAME_W + Math.random() * 140;
        s.y = Phaser.Math.Between(40, GAME_H - 90);
      }
      g.beginPath();
      g.moveTo(s.x, s.y);
      g.lineTo(s.x + s.len, s.y);
      g.strokePath();
    }
  }

  private updatePlayer(dt: number) {
    // 프로펠러(비행): 중력 무시하고 공중에 떠서 장애물 위로
    if (this.flying) {
      const flySurface = this.surfaceYAt(this.worldScroll + PLAYER_X);
      const target = flySurface - 175;
      this.player.y = Phaser.Math.Linear(this.player.y, target, 0.08);
      this.player.rotation = Phaser.Math.Linear(this.player.rotation, -0.12, 0.1);
      this.playerVy = 0;
      this.grounded = false;
      this.applyBlink();
      this.playerBody.updateFromGameObject();
      return;
    }

    const wasAir = !this.grounded;
    const surface = this.surfaceYAt(this.worldScroll + PLAYER_X);
    const foot = this.isSliding ? FOOT_SLIDE : FOOT_STAND;
    const restY = surface - foot;

    this.playerVy += GRAVITY * dt;
    let ny = this.player.y + this.playerVy * dt;
    if (ny >= restY && this.playerVy >= 0) {
      // 하강 중 지면에 닿음(착지). 솟는 중(점프 직후 vy<0)엔
      // 슬라이드 웅크림 높이에서 출발해도 착지로 오판하지 않는다.
      ny = restY;
      this.playerVy = 0;
      this.grounded = true;
      this.jumping = false;
      this.airJumpUsed = false; // 착지 시 2단 점프 리셋
      if (wasAir && !this.isSliding) {
        this.squash(1.25, 0.78); // 착지 스쿼시
        this.dustPuff(this.player.x, surface);
      }
    } else if (!this.jumping && restY - ny <= GROUND_SNAP) {
      // 점프 중이 아닌데 지면 살짝 위 → 내리막 지형에 붙여 접지 유지
      ny = restY;
      this.playerVy = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }
    this.player.y = ny;

    // 코요테 타임: 접지 중엔 가득, 떠나면 점점 줄어듦
    this.coyote = this.grounded ? COYOTE_TIME : Math.max(0, this.coyote - dt);

    // 경사를 따라 살짝 기울이기 (지면에 붙어 있을 때만)
    let targetRot = 0;
    if (this.grounded && !this.isSliding) {
      const ahead = this.surfaceYAt(this.worldScroll + PLAYER_X + 20);
      const behind = this.surfaceYAt(this.worldScroll + PLAYER_X - 20);
      targetRot = Phaser.Math.Clamp(Math.atan2(ahead - behind, 40) * 0.6, -0.4, 0.4);
    }
    this.player.rotation = Phaser.Math.Linear(this.player.rotation, targetRot, 0.2);

    this.applyBlink();
    this.playerBody.updateFromGameObject();
  }

  /** 무적/비행 중 깜빡임 (그 외엔 불투명) */
  private applyBlink() {
    const inv = this.invincibleTimer > 0 || this.flying;
    this.player.alpha = inv
      ? 0.55 + 0.45 * Math.abs(Math.sin(this.elapsed * 18))
      : 1;
  }

  private updateObstacles() {
    const pb = this.playerBody;
    this.obstacles.getChildren().forEach((obj) => {
      const go = obj as Phaser.GameObjects.Image;
      const worldX = go.getData("worldX") as number;
      const off = go.getData("off") as number;
      const prevSx = go.getData("psx") as number;
      const sx = worldX - this.worldScroll;
      if (sx < -60) {
        go.destroy();
        return;
      }
      go.x = sx;
      go.y = this.surfaceYAt(worldX) - off;
      const body = go.body as Phaser.Physics.Arcade.Body;
      body.updateFromGameObject();

      // 니어미스: 플레이어 x를 막 지나친 순간, 살짝 스쳤으면 '아슬!'
      if (this.alive && prevSx >= PLAYER_X && sx < PLAYER_X && !go.getData("passed")) {
        go.setData("passed", true);
        const gap = Math.max(0, Math.max(pb.top - body.bottom, body.top - pb.bottom));
        if (gap > 0 && gap < NEARMISS_GAP) {
          this.nearMisses += 1;
          if (this.multTimer > 0) this.bonusScore += 25; // 점수 2배: 아슬 추가분
          this.addCombo(true);
          this.popText(PLAYER_X, pb.top - 18, "아슬!", "#ff5fa2");
        }
      }
      go.setData("psx", sx);
    });
  }

  private updateCoins() {
    const magnet = this.magnetTimer > 0 || this.fever; // 피버 중 자동 흡입
    this.coins.getChildren().forEach((obj) => {
      const go = obj as Phaser.GameObjects.Image;
      const worldX = go.getData("worldX") as number;
      const off = go.getData("off") as number;
      const sx = worldX - this.worldScroll;
      if (sx < -60) {
        go.destroy();
        return;
      }
      const baseY = this.surfaceYAt(worldX) - off;
      // 자석: 반경 안의 코인을 플레이어 쪽으로 끌어당겨 자동 수거
      if (magnet) {
        const dist = Phaser.Math.Distance.Between(sx, baseY, this.player.x, this.player.y);
        if (dist < MAGNET_RADIUS) {
          go.x = Phaser.Math.Linear(go.x || sx, this.player.x, 0.2);
          go.y = Phaser.Math.Linear(go.y || baseY, this.player.y, 0.2);
          (go.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
          if (dist < 28) this.collectCoin(go);
          return;
        }
      }
      go.x = sx;
      go.y = baseY;
      (go.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
    });
  }

  private tryJump() {
    if (!this.alive || this.flying) return;
    const jv = this.coffeeTimer > 0 ? COFFEE_JUMP_V : JUMP_V; // 각성 시 강화 점프
    if (this.grounded || this.coyote > 0) {
      if (this.isSliding) this.endSlide();
      this.playerVy = jv;
      this.grounded = false;
      this.jumping = true;
      this.coyote = 0;
      this.airJumpUsed = false;
      this.squash(0.82, 1.22); // 점프 스트레치
    } else if (this.coffeeTimer > 0 && !this.airJumpUsed) {
      // 카페인: 공중에서 한 번 더 (2단 점프)
      this.playerVy = jv * 0.9;
      this.airJumpUsed = true;
      this.squash(0.82, 1.22);
      this.dustPuff(this.player.x, this.player.y + 28);
    }
  }

  private startSlide() {
    if (!this.alive || this.isSliding) return;
    if (!this.grounded) return;
    this.isSliding = true;
    this.slideTimer = 0.6;
    this.tweens.killTweensOf(this.player); // 스쿼시 트윈과 충돌 방지
    this.player.setDisplaySize(72, 36);
    this.playerBody.setSize(48, 28, true);
  }

  private endSlide() {
    this.isSliding = false;
    this.slideTimer = 0;
    this.tweens.killTweensOf(this.player);
    this.player.setDisplaySize(64, 64);
    this.playerBody.setSize(40, 56, true);
  }

  /** 스쿼시&스트레치 — 현재 스케일에서 시작해 기본으로 복귀 */
  private squash(sx: number, sy: number) {
    if (this.isSliding || !this.alive) return;
    this.tweens.killTweensOf(this.player);
    this.player.setScale(STAND_SCALE * sx, STAND_SCALE * sy);
    this.tweens.add({
      targets: this.player,
      scaleX: STAND_SCALE,
      scaleY: STAND_SCALE,
      duration: 170,
      ease: "Quad.easeOut",
    });
  }

  private dustPuff(x: number, surfaceY: number) {
    for (let i = 0; i < 3; i++) {
      const d = this.add
        .circle(x + Phaser.Math.Between(-10, 10), surfaceY - 4, Phaser.Math.Between(3, 6), 0xb9b9cc, 0.5)
        .setDepth(4);
      this.tweens.add({
        targets: d,
        x: d.x + Phaser.Math.Between(-22, 22),
        y: d.y - Phaser.Math.Between(6, 16),
        alpha: 0,
        scale: 0.3,
        duration: 320,
        ease: "Cubic.easeOut",
        onComplete: () => d.destroy(),
      });
    }
  }

  private popText(x: number, y: number, msg: string, color: string, big = false) {
    const t = this.add
      .text(x, y, msg, {
        fontSize: big ? "30px" : "18px",
        color,
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(50);
    this.tweens.add({
      targets: t,
      y: y - 42,
      alpha: 0,
      duration: 720,
      ease: "Cubic.easeOut",
      onComplete: () => t.destroy(),
    });
  }

  private collectCoin(coin: Phaser.GameObjects.Image) {
    const x = coin.x;
    const y = coin.y;
    coin.destroy();
    this.coinCount += 1;
    if (this.multTimer > 0) this.bonusScore += 10; // 점수 2배: 코인 추가분
    if (this.fever) this.bonusScore += 10; // 피버 보너스
    this.addCombo(false);
    this.popText(x, y, "+1", "#ffd84d");
    const ring = this.add
      .circle(x, y, 6, 0xffd84d, 0)
      .setStrokeStyle(2, 0xffd84d, 0.9)
      .setDepth(49);
    this.tweens.add({
      targets: ring,
      scale: 3,
      alpha: 0,
      duration: 340,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
  }

  private pickObstacle(avoid?: AvoidKind): { tex: string; mental: number } {
    if (this.stage) {
      const zone = this.stage.zones[this.zoneIdx];
      const pool = avoid ? zone.obstacles.filter((o) => o.avoid === avoid) : zone.obstacles;
      const list = pool.length ? pool : zone.obstacles;
      const o = list[Math.floor(Math.random() * list.length)];
      return { tex: `tex_zob_${o.emoji}`, mental: o.mental };
    }
    const ids = this.setup.obstacleIds;
    if (ids.length === 0) return { tex: "tex_fallback_obstacle", mental: DEFAULT_DAMAGE };
    const id = ids[Math.floor(Math.random() * ids.length)];
    return { tex: `tex_${id}`, mental: DEFAULT_DAMAGE };
  }

  /** 지상 장애물(점프로 회피)을 worldX에 배치 */
  private spawnGroundAt(worldX: number) {
    const pick = this.pickObstacle("jump");
    const obs = this.add.image(0, 0, pick.tex);
    obs.setDisplaySize(56, 56);
    obs.setData("worldX", worldX);
    obs.setData("off", OFF_GROUND_OBS);
    obs.setData("psx", worldX - this.worldScroll);
    obs.setData("mental", pick.mental);
    this.physics.add.existing(obs);
    const body = obs.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.moves = false;
    body.setSize(40, 44, true);
    this.obstacles.add(obs);
  }

  /** 머리 위 장애물(슬라이드로 회피)을 worldX에 배치 */
  private spawnOverheadAt(worldX: number) {
    const pick = this.pickObstacle("slide");
    const obs = this.add.image(0, 0, pick.tex);
    obs.setDisplaySize(50, 50);
    obs.setData("worldX", worldX);
    obs.setData("off", OFF_OVERHEAD);
    obs.setData("psx", worldX - this.worldScroll);
    obs.setData("mental", pick.mental);
    this.physics.add.existing(obs);
    const body = obs.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.moves = false;
    body.setSize(46, 26, true);
    this.obstacles.add(obs);
  }

  /** 코인 1개를 worldX·지면 기준 높이 off에 배치 */
  private spawnCoinAt(worldX: number, off: number) {
    const coin = this.add.image(0, 0, "tex_coin");
    coin.setDisplaySize(34, 34);
    coin.setData("worldX", worldX);
    coin.setData("off", off);
    this.physics.add.existing(coin);
    const body = coin.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.moves = false;
    body.setSize(26, 26, true);
    this.coins.add(coin);
  }

  /**
   * 플레이어가 worldX에서 점프한 '실제 궤적'을 시뮬레이션해 그 위에 코인을 배치한다.
   * updatePlayer와 같은 물리(중력 + 지형 착지)라, 오르막에선 점프가 짧아지고 코인도
   * 따라 짧아져 — 코인이 지면에 박히거나 점프로 못 닿는 일이 없다. 첫 코인서 점프하면 전부 관통.
   */
  private spawnCoinArcAt(worldX: number) {
    const n = 6;
    const v = this.speed; // 점프 중 수평 진행 속도 ≈ 현재 속도
    const air = JUMP_AIRTIME;
    const step = 1 / 60;
    let simWX = worldX;
    let simY = this.surfaceYAt(worldX) - FOOT_STAND; // 시작 발 위치
    let vy = JUMP_V;
    let placed = 0;
    for (let t = 0; placed < n; t += step) {
      while (placed < n && t >= (air * placed) / (n - 1)) {
        this.spawnCoinAt(simWX, this.surfaceYAt(simWX) - simY); // 코인 화면 y = simY
        placed++;
      }
      vy += GRAVITY * step;
      simY += vy * step;
      simWX += v * step;
      const restY = this.surfaceYAt(simWX) - FOOT_STAND;
      if (simY >= restY && vy >= 0) {
        simY = restY; // 지형에 착지 → 이후 코인은 지면을 따라 (박힘 방지)
        vy = 0;
      }
    }
  }

  /** 지면 위 일정 높이의 직선 코인 줄 */
  private spawnCoinLineAt(worldX: number, n: number) {
    for (let i = 0; i < n; i++) this.spawnCoinAt(worldX + i * 48, OFF_COIN);
  }

  /** 현재 국면 패턴 풀에서 하나 뽑아 배치하고 nextPatternX를 전진 */
  private spawnNextPattern() {
    let pool: Pattern[];
    if (this.phase === "danger") pool = DANGER_PATTERNS;
    else if (this.phase === "calm") pool = CALM_PATTERNS;
    else {
      // 평상: 진행도에 따라 난이도 해금 — 초반 14초는 단발/코인만, 32초+ 전체
      const maxDiff = this.elapsed < 14 ? 1 : this.elapsed < 32 ? 2 : 3;
      pool = NORMAL_PATTERNS.filter((p) => (p.diff ?? 1) <= maxDiff);
    }
    const pat = pickPattern(pool);
    // 시간(초) 간격 → 현재 속도로 px 변환. 속도가 빨라져도 점프 타이밍이 일정해짐.
    const pps = this.speed;
    const startX = this.nextPatternX;
    let cursorSec = 0;
    for (const step of pat.steps) {
      cursorSec += step.gap;
      const wx = startX + cursorSec * pps;
      switch (step.kind) {
        case "ground":
          this.spawnGroundAt(wx);
          break;
        case "overhead":
          this.spawnOverheadAt(wx);
          break;
        case "arc":
          this.spawnCoinArcAt(wx);
          break;
        case "line":
          this.spawnCoinLineAt(wx, step.n ?? 5);
          break;
      }
    }
    // 패턴 사이 여유(초) — 평상은 초반 넉넉 → 점점 좁아짐, 위기 촘촘, 휴식 넉넉
    const extraSec =
      this.phase === "danger"
        ? 0.5
        : this.phase === "calm"
          ? 0.8
          : Phaser.Math.Clamp(1.15 - this.elapsed * 0.008, 0.7, 1.15);
    this.nextPatternX = startX + (cursorSec + pat.tail + extraSec) * pps;
  }

  /** 국면 전환 체크 (거리 기준): 평상 → 위기 → 휴식 → 평상 */
  private updatePhase() {
    if (this.worldScroll < this.phaseEndX) return;
    if (this.phase === "danger") this.enterCalm();
    else if (this.phase === "calm") this.enterNormal();
    else this.enterDanger();
  }

  private enterNormal() {
    this.phase = "normal";
    this.phaseEndX =
      this.worldScroll + Phaser.Math.Between(NORMAL_LEN_MIN, NORMAL_LEN_MAX);
  }

  private enterDanger() {
    this.phase = "danger";
    this.dangerCount += 1;
    this.phaseEndX = this.worldScroll + DANGER_LEN;
    this.spawnChaser();
    this.flashWarn(`⚠️ ${CHASER_LABEL[this.setup.category]} 추격!!`, "#ff5a6a");
    this.cameras.main.shake(260, 0.012);
    this.cameras.main.flash(220, 255, 80, 80);
  }

  private enterCalm() {
    this.phase = "calm";
    this.phaseEndX = this.worldScroll + CALM_LEN;
    this.escapeChaser();
  }

  /** 스테이지 구간 전환 — 거리가 구간 길이를 넘으면 다음 구간으로 */
  private updateZone() {
    if (!this.stage || this.bossActive) return;
    if (this.zoneIdx >= this.stage.zones.length - 1) {
      // 마지막 구간을 다 지나면 보스 등장
      if (this.stage.boss && this.worldScroll >= this.zoneEndX) this.enterBoss();
      return;
    }
    if (this.worldScroll >= this.zoneEndX) {
      this.zoneIdx += 1;
      this.enterZone();
    }
  }

  /** 새 구간 진입 — 배경·지형색 전환 + 구간 배너 */
  private enterZone() {
    const zone = this.stage!.zones[this.zoneIdx];
    this.zoneEndX += zone.length;
    this.terrainColor = zone.ground;
    this.cameras.main.setBackgroundColor(zone.bg);
    this.cameras.main.flash(320, 30, 30, 50);
    this.flashWarn(zone.name, "#cfe8ff");
  }

  /** 보스(MONDAY) 등장 — 공격이 아니라 '버티며 따돌리기' */
  private enterBoss() {
    if (!this.stage?.boss) return;
    this.boss = this.stage.boss;
    this.bossActive = true;
    this.escapeTimer = this.boss.escapeDur;
    // 보스 동안 위기 국면 고정(빡빡한 패턴 + 가속)
    this.phase = "danger";
    this.phaseEndX = Number.MAX_SAFE_INTEGER;
    // 일반 위기 추격자(상사) 정리
    if (this.chaser) {
      this.tweens.killTweensOf(this.chaser);
      this.chaser.destroy();
      this.chaser = undefined;
    }
    if (this.chaserAura) {
      this.chaserAura.destroy();
      this.chaserAura = undefined;
    }
    // 거대 월요일 등장
    this.bossImg = this.add.image(-140, GAME_H / 2 - 30, "tex_boss").setDepth(8);
    this.bossImg.setDisplaySize(170, 170);
    this.tweens.add({ targets: this.bossImg, x: 95, duration: 900, ease: "Back.easeOut" });
    this.flashWarn(`📅 ${this.boss.name} 출근 강요!!`, "#ff3b3b");
    this.cameras.main.shake(420, 0.02);
    this.cameras.main.flash(420, 255, 50, 50);
  }

  /** 보스 추격 연출 + 도망 진행도 갱신 */
  private updateBoss(dt: number) {
    this.escapeTimer = Math.max(0, this.escapeTimer - dt);
    const b = this.bossImg;
    if (b) {
      // 위협적으로 둥실거리며 따라옴 (멘탈 낮을수록 바짝)
      const close = 1 - this.mental / MENTAL_MAX;
      b.x = Phaser.Math.Linear(b.x, 95 - close * 32, 0.04) + Math.sin(this.elapsed * 2.4) * 6;
      b.y = GAME_H / 2 - 30 + Math.sin(this.elapsed * 1.7) * 14;
      b.rotation = Math.sin(this.elapsed * 3) * 0.06;
    }
    this.drawEscapeBar();
    if (this.escapeTimer <= 0) this.clearStage();
  }

  /** 도망 진행도 게이지 (상단 중앙) — 다 차면 따돌림 */
  private drawEscapeBar() {
    if (!this.boss) return;
    const g = this.escapeBar;
    g.clear();
    const w = 240;
    const h = 14;
    const x = GAME_W / 2 - w / 2;
    const y = 14;
    g.fillStyle(0x000000, 0.5);
    g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 6);
    const ratio = 1 - this.escapeTimer / this.boss.escapeDur; // 진행도
    g.fillStyle(0x7cfc9b, 1);
    g.fillRoundedRect(x, y, Math.max(3, w * Phaser.Math.Clamp(ratio, 0, 1)), h, 5);
  }

  /** 보스 따돌림 성공 → 클리어 */
  private clearStage() {
    if (!this.alive) return;
    this.alive = false;
    this.physics.pause();
    this.flashWarn("탈출 성공! 🏖️", "#7cfc9b");
    this.cameras.main.flash(300, 120, 255, 160);
    if (this.bossImg) {
      this.tweens.add({
        targets: this.bossImg,
        x: -220,
        alpha: 0,
        angle: -30,
        duration: 900,
        ease: "Quad.easeIn",
      });
    }
    this.tweens.add({ targets: this.player, y: this.player.y - 30, yoyo: true, repeat: 2, duration: 250 });
    this.time.delayedCall(1600, () => {
      this.onGameOver({
        time: this.elapsed,
        distance: this.distance,
        coins: this.coinCount,
        nearMisses: this.nearMisses,
        score: this.liveScore(),
        items: this.itemCounts,
        mental: this.mental,
        dodgedNotifs: this.dodgedNotifs,
        ignoredCalls: this.ignoredCalls,
        cleared: true,
      });
    });
  }

  /** 위기 경고·탈출 배너를 잠깐 띄운다 */
  private flashWarn(msg: string, color: string) {
    this.warnText.setText(msg);
    this.warnText.setColor(color);
    this.tweens.killTweensOf(this.warnText);
    this.warnText.setAlpha(1).setScale(0.6);
    this.tweens.add({ targets: this.warnText, scale: 1, duration: 280, ease: "Back.easeOut" });
    this.tweens.add({ targets: this.warnText, alpha: 0, delay: 1400, duration: 500 });
  }

  /** 위기 빌런 등장 (화면 왼쪽 밖에서 달려 들어옴) */
  private spawnChaser() {
    if (this.chaser) {
      this.tweens.killTweensOf(this.chaser);
      this.chaser.destroy();
    }
    if (this.chaserAura) this.chaserAura.destroy();
    this.chaserX = -80;
    this.chaserClose = 0;
    // 붉은 오라로 장애물과 구분 + 위협감
    this.chaserAura = this.add
      .circle(this.chaserX, GROUND_Y, 48, 0xff2a2a, 0.34)
      .setDepth(3)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.chaser = this.add.image(this.chaserX, GROUND_Y, "tex_chaser").setDepth(4);
    this.chaser.setDisplaySize(78, 78);
  }

  /** 추격자 위치·달리기 연출 갱신 */
  private updateChaser(dt: number) {
    const c = this.chaser;
    if (!c) return;
    // 근접도는 시간이 지나면 서서히 회복(빤쓰가 거리를 벌림)
    this.chaserClose = Math.max(0, this.chaserClose - dt * 0.22);
    const gap = CHASER_GAP - this.chaserClose * 48; // close=1이면 30px 뒤까지 바짝
    this.chaserX = Phaser.Math.Linear(this.chaserX, PLAYER_X - gap, 0.07);
    c.x = this.chaserX;
    c.y =
      this.surfaceYAt(this.worldScroll + this.chaserX) -
      34 +
      Math.sin(this.elapsed * 13) * 6; // 달리는 바운스
    c.rotation = Math.sin(this.elapsed * 17) * 0.09;
    if (this.chaserAura) {
      this.chaserAura.setPosition(c.x, c.y);
      this.chaserAura.setScale(1 + 0.12 * Math.sin(this.elapsed * 10));
      // 가까워질수록 진해지는 붉은 맥동
      this.chaserAura.setAlpha(
        0.26 + 0.14 * Math.abs(Math.sin(this.elapsed * 10)) + this.chaserClose * 0.3,
      );
    }
  }

  /** 위기 탈출 — 추격자 후퇴 + 비누방울 보너스 */
  private escapeChaser() {
    const c = this.chaser;
    const aura = this.chaserAura;
    this.chaser = undefined;
    this.chaserAura = undefined;
    this.chaserClose = 0;
    this.coinCount += ESCAPE_BONUS;
    if (this.multTimer > 0) this.bonusScore += ESCAPE_BONUS * 10;
    this.flashWarn("탈출 성공! 🎉", "#7cfc9b");
    this.popText(this.player.x, this.player.y - 50, `+${ESCAPE_BONUS} 🫧`, "#7cfc9b", true);
    this.cameras.main.flash(160, 120, 255, 160);
    if (c) {
      this.tweens.killTweensOf(c);
      this.tweens.add({
        targets: c,
        x: -140,
        alpha: 0,
        duration: 650,
        ease: "Quad.easeIn",
        onComplete: () => c.destroy(),
      });
    }
    if (aura) {
      this.tweens.killTweensOf(aura);
      this.tweens.add({
        targets: aura,
        x: -140,
        alpha: 0,
        duration: 650,
        ease: "Quad.easeIn",
        onComplete: () => aura.destroy(),
      });
    }
  }

  /** 능력 아이템 등장 (점프로 닿는 높이, 반짝이는 펄스) */
  private spawnItem() {
    const kind = ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)];
    const it = this.add.image(0, 0, `tex_item_${kind}`).setDepth(6);
    it.setDisplaySize(46, 46);
    it.setData("worldX", this.worldScroll + GAME_W + 30);
    it.setData("off", 96);
    it.setData("kind", kind);
    this.physics.add.existing(it);
    const body = it.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.moves = false;
    body.setSize(42, 42, true);
    this.items.add(it);
    this.tweens.add({
      targets: it,
      scale: it.scale * 1.18,
      duration: 480,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private updateItems() {
    this.items.getChildren().forEach((obj) => {
      const go = obj as Phaser.GameObjects.Image;
      const worldX = go.getData("worldX") as number;
      const off = go.getData("off") as number;
      const sx = worldX - this.worldScroll;
      if (sx < -60) {
        this.tweens.killTweensOf(go);
        go.destroy();
        return;
      }
      go.x = sx;
      go.y = this.surfaceYAt(worldX) - off;
      (go.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
    });
  }

  /** 현재 구간에 투사체(fly) 장애물이 있는가 */
  private zoneHasFly(): boolean {
    if (!this.stage) return false;
    return this.stage.zones[this.zoneIdx].obstacles.some((o) => o.avoid === "fly");
  }

  /** 투사체 발사 — 화면 오른쪽에서 머리 높이로 날아옴 (슬라이드로 숙여 회피) */
  private spawnProjectile() {
    if (!this.stage) return;
    const flyList = this.stage.zones[this.zoneIdx].obstacles.filter((o) => o.avoid === "fly");
    if (!flyList.length) return;
    const o = flyList[Math.floor(Math.random() * flyList.length)];
    const y = this.surfaceYAt(this.worldScroll + PLAYER_X) - 64; // 머리 높이
    const p = this.add.image(GAME_W + 40, y, `tex_zob_${o.emoji}`).setDepth(7);
    p.setDisplaySize(46, 46);
    this.physics.add.existing(p);
    const body = p.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.moves = false;
    body.setSize(40, 40, true);
    p.setData("mental", o.mental);
    p.setData("emoji", o.emoji);
    p.setData("vx", -Phaser.Math.Between(520, 600));
    if (o.label) {
      const lbl = this.add
        .text(GAME_W + 40, y - 32, o.label, {
          fontSize: "13px",
          color: "#ffffff",
          backgroundColor: "#2a2a3a",
          padding: { x: 7, y: 3 },
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(7);
      p.setData("label", lbl);
    }
    this.projectiles.add(p);
    this.tweens.add({ targets: p, angle: 14, duration: 160, yoyo: true, repeat: -1 });
  }

  /** 투사체 이동 + 말풍선 동기화 */
  private updateProjectiles(dt: number) {
    this.projectiles.getChildren().forEach((obj) => {
      const p = obj as Phaser.GameObjects.Image;
      const vx = (p.getData("vx") as number) ?? -560;
      p.x += vx * dt;
      // 플레이어를 지나치면(=회피 성공) 종류별로 집계
      if (this.alive && p.x < PLAYER_X - 30 && !p.getData("passed")) {
        p.setData("passed", true);
        const emoji = p.getData("emoji") as string;
        if (emoji === "📱" || emoji === "📞") this.ignoredCalls += 1;
        else this.dodgedNotifs += 1;
      }
      const lbl = p.getData("label") as Phaser.GameObjects.Text | undefined;
      if (lbl) lbl.setPosition(p.x, p.y - 32);
      (p.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
      if (p.x < -80) {
        this.tweens.killTweensOf(p);
        lbl?.destroy();
        p.destroy();
      }
    });
  }

  private collectItem(obj: Phaser.GameObjects.GameObject) {
    const go = obj as Phaser.GameObjects.Image;
    const kind = go.getData("kind") as ItemKind;
    const x = go.x;
    const y = go.y;
    this.tweens.killTweensOf(go);
    go.destroy();
    this.itemCounts[kind] = (this.itemCounts[kind] ?? 0) + 1;
    this.activateItem(kind, x, y);
  }

  private activateItem(kind: ItemKind, x: number, y: number) {
    switch (kind) {
      case "angel":
        this.invincibleTimer = Math.max(this.invincibleTimer, DUR_INVINCIBLE);
        break;
      case "gold":
        this.multTimer = Math.max(this.multTimer, DUR_GOLD);
        break;
      case "shield":
        this.shield = true;
        break;
      case "propeller":
        this.flying = true;
        this.flyTimer = Math.max(this.flyTimer, DUR_FLY);
        break;
      case "magnet":
        this.magnetTimer = Math.max(this.magnetTimer, DUR_MAGNET);
        break;
      case "turtle":
        this.slowTimer = Math.max(this.slowTimer, DUR_SLOW);
        break;
      case "rocket":
        this.rocketTimer = Math.max(this.rocketTimer, DUR_ROCKET);
        this.invincibleTimer = Math.max(this.invincibleTimer, DUR_ROCKET); // 폭주 중 무적
        break;
      case "coffee":
        this.coffeeTimer = Math.max(this.coffeeTimer, DUR_COFFEE);
        break;
      case "jackpot":
        this.coinCount += JACKPOT_COINS;
        if (this.multTimer > 0) this.bonusScore += JACKPOT_COINS * 10;
        break;
      case "mine":
        this.mineTimer = Math.max(this.mineTimer, DUR_MINE);
        break;
      case "americano":
        this.healMental(10);
        break;
      case "vacation":
        this.healMental(50);
        break;
      case "holiday":
        this.healMental(MENTAL_MAX);
        break;
    }
    const bad = kind === "mine";
    const accent = bad ? 0xb58b5a : 0xffe08a;
    this.popText(x, y - 10, ITEM_LABEL[kind], bad ? "#d2a679" : "#ffe08a", true);
    const ring = this.add
      .circle(x, y, 8, 0xffffff, 0)
      .setStrokeStyle(3, accent, 0.9)
      .setDepth(49);
    this.tweens.add({
      targets: ring,
      scale: 4,
      alpha: 0,
      duration: 420,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
    if (bad) this.cameras.main.flash(150, 150, 90, 40);
    else this.cameras.main.flash(120, 255, 220, 130);

    // 중앙 표시 스케일 팝(획득 강조)
    this.tweens.killTweensOf(this.centerFx);
    this.centerFx.setScale(1.5);
    this.tweens.add({
      targets: this.centerFx,
      scale: 1,
      duration: 320,
      ease: "Back.easeOut",
    });
  }

  /** 장애물 충돌 처리 — 무적/비행/실드면 부수고, 아니면 사망 */
  private hitObstacle(obj: Phaser.GameObjects.GameObject) {
    if (!this.alive) return;
    const go = obj as Phaser.GameObjects.Image;
    if (this.flying || this.invincibleTimer > 0 || this.fever) {
      this.smash(go);
      return;
    }
    if (this.shield) {
      this.shield = false;
      this.invincibleTimer = Math.max(this.invincibleTimer, 0.6); // 직후 재충돌 방지
      this.popText(go.x, go.y - 18, "철벽!", "#9fd0ff");
      this.smash(go);
      return;
    }
    this.loseLife(go);
  }

  /** 생명 1 차감 — 0이면 게임오버, 아니면 속도 초기화 + 짧은 무적 */
  private loseLife(go: Phaser.GameObjects.Image) {
    const dmg = (go.getData("mental") as number) ?? DEFAULT_DAMAGE;
    this.mental = Math.max(0, this.mental - dmg);
    if (this.mental <= 0) {
      this.smash(go);
      this.die(); // 멘탈 붕괴 → 출근
      return;
    }
    this.smash(go); // 부딪힌 장애물 제거
    this.speed = this.baseSpeed; // 속도 초기화로 숨통
    this.invincibleTimer = Math.max(this.invincibleTimer, HIT_IFRAMES);
    this.combo = 0; // 콤보 끊김
    this.feverGauge = Math.max(0, this.feverGauge - HIT_GAUGE_PENALTY);
    // 멘탈 낮을수록 빤쓰가 낡음 (66% 이하 1단계, 33% 이하 2단계)
    if (this.mental <= 33) this.playerDmg.setTexture("tex_dmg2");
    else if (this.mental <= 66) this.playerDmg.setTexture("tex_dmg1");
    this.playerDmg.setVisible(this.mental <= 66);
    this.cameras.main.shake(180, 0.014);
    this.cameras.main.flash(120, 255, 110, 110);
    this.popText(this.player.x, this.player.y - 30, `멘탈 -${dmg} 🧠`, "#ff5a6a", true);
    // 위기 중 피격 → 추격자가 바짝 따라붙음(긴장)
    if (this.phase === "danger" && this.chaser) {
      this.chaserClose = Math.min(1, this.chaserClose + CHASER_HIT_CLOSE);
    }
  }

  /** 멘탈 회복 (회복 아이템) — 낡음 오버레이도 갱신 */
  private healMental(n: number) {
    this.mental = Math.min(MENTAL_MAX, this.mental + n);
    if (this.mental > 66) this.playerDmg.setVisible(false);
    else if (this.mental > 33) this.playerDmg.setTexture("tex_dmg1");
  }

  /** 장애물 파괴 연출 */
  private smash(go: Phaser.GameObjects.Image) {
    const lbl = go.getData("label") as Phaser.GameObjects.Text | undefined;
    if (lbl) lbl.destroy();
    const x = go.x;
    const y = go.y;
    go.destroy();
    for (let i = 0; i < 6; i++) {
      const f = this.add
        .circle(x, y, Phaser.Math.Between(3, 6), 0xffe08a)
        .setDepth(40);
      const ang = Math.random() * Math.PI * 2;
      const d = Phaser.Math.Between(30, 80);
      this.tweens.add({
        targets: f,
        x: x + Math.cos(ang) * d,
        y: y + Math.sin(ang) * d,
        alpha: 0,
        duration: 420,
        ease: "Cubic.easeOut",
        onComplete: () => f.destroy(),
      });
    }
  }

  private buildEmojiTextures() {
    this.makeEmojiTexture("tex_player", PLAYER_EMOJI, 96);
    this.makeEmojiTexture("tex_coin", COIN_EMOJI, 64);
    this.makeEmojiTexture("tex_fallback_obstacle", FALLBACK_OBSTACLE_EMOJI, 96);
    this.makeEmojiTexture("tex_chaser", CHASER_EMOJI[this.setup.category], 96);
    if (this.stage?.boss) this.makeEmojiTexture("tex_boss", this.stage.boss.emoji, 128);
    for (const kind of ITEM_KINDS) {
      this.makeEmojiTexture(`tex_item_${kind}`, ITEM_EMOJI[kind], 80);
    }
    for (const id of this.setup.obstacleIds) {
      const emoji = OBSTACLE_EMOJI[id] ?? FALLBACK_OBSTACLE_EMOJI;
      this.makeEmojiTexture(`tex_${id}`, emoji, 96);
    }
    if (this.stage) {
      const seen = new Set<string>();
      for (const zone of this.stage.zones) {
        for (const o of zone.obstacles) {
          if (seen.has(o.emoji)) continue;
          seen.add(o.emoji);
          this.makeEmojiTexture(`tex_zob_${o.emoji}`, o.emoji, 96);
        }
      }
    }
  }

  /** 낡음(데미지) 오버레이 텍스처 — 구멍·얼룩·찢김 */
  private makeDamageTexture(key: string, level: number) {
    if (this.textures.exists(key)) this.textures.remove(key);
    const tex = this.textures.createCanvas(key, 96, 96);
    if (!tex) return;
    const ctx = tex.getContext();
    const S = 96;
    ctx.clearRect(0, 0, S, S);
    const hole = (x: number, y: number, r: number) => {
      ctx.beginPath();
      ctx.arc(x * S, y * S, r * S, 0, Math.PI * 2);
      ctx.fillStyle = "#15151c";
      ctx.fill();
      ctx.lineWidth = S * 0.012;
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.stroke();
    };
    const dirt = (x: number, y: number, r: number) => {
      ctx.beginPath();
      ctx.ellipse(x * S, y * S, r * S, r * S * 0.7, 0.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(90,64,40,0.5)";
      ctx.fill();
    };
    if (level === 1) {
      hole(0.4, 0.62, 0.045);
      dirt(0.6, 0.58, 0.07);
    } else {
      hole(0.38, 0.6, 0.05);
      hole(0.61, 0.64, 0.045);
      hole(0.5, 0.5, 0.035);
      dirt(0.56, 0.7, 0.09);
      dirt(0.34, 0.66, 0.06);
      // 너덜너덜 찢긴 아래 가장자리
      ctx.strokeStyle = "#15151c";
      ctx.lineWidth = S * 0.02;
      ctx.beginPath();
      const y0 = 0.78 * S;
      ctx.moveTo(0.3 * S, y0);
      for (let i = 1; i <= 6; i++) {
        ctx.lineTo((0.3 + i * 0.066) * S, y0 + (i % 2 ? -S * 0.03 : S * 0.02));
      }
      ctx.stroke();
    }
    tex.refresh();
  }

  /** 콤보 1 증가 + 피버 게이지 충전 */
  private addCombo(near: boolean) {
    this.combo += 1;
    if (!this.fever) {
      this.feverGauge = Math.min(FEVER_MAX, this.feverGauge + (near ? GAUGE_NEAR : GAUGE_BUBBLE));
      if (this.feverGauge >= FEVER_MAX) this.startFever();
    }
    if (this.combo > 0 && this.combo % 5 === 0) {
      this.popText(this.player.x, this.player.y - 48, `${this.combo} COMBO!`, "#ffd84d", true);
    }
  }

  private startFever() {
    this.fever = true;
    this.feverTimer = FEVER_DUR;
    this.cameras.main.shake(250, 0.016);
    this.cameras.main.flash(220, 255, 180, 60);
    this.popText(GAME_W / 2, 220, "🔥 FEVER! 🔥", "#ffd84d", true);
  }

  private endFever() {
    this.fever = false;
    this.feverGauge = 0;
  }

  /** 멘탈 게이지 바 (좌상단, 🧠 텍스트 옆) */
  private drawMentalBar() {
    const g = this.mentalBar;
    g.clear();
    const w = 110;
    const h = 12;
    const x = 104;
    const y = 16;
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 5);
    const ratio = Phaser.Math.Clamp(this.mental / MENTAL_MAX, 0, 1);
    const col = this.mental > 50 ? 0x7fe6c0 : this.mental > 20 ? 0xffd84d : 0xff5a4d;
    if (ratio > 0) {
      g.fillStyle(col, 1);
      g.fillRoundedRect(x, y, Math.max(3, w * ratio), h, 4);
    }
  }

  /** 피버 게이지/타이머 바 (우상단) */
  private drawFeverBar() {
    const g = this.feverBar;
    g.clear();
    const w = 150;
    const h = 12;
    const x = GAME_W - w - 16;
    const y = 14;
    g.fillStyle(0x000000, 0.45);
    g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 6);
    const ratio = this.fever ? this.feverTimer / FEVER_DUR : this.feverGauge / FEVER_MAX;
    const col = this.fever ? 0xff3b3b : this.feverGauge >= FEVER_MAX ? 0xffd84d : 0xff7a1a;
    if (ratio > 0) {
      g.fillStyle(col, 1);
      g.fillRoundedRect(x, y, Math.max(4, w * Phaser.Math.Clamp(ratio, 0, 1)), h, 5);
    }
  }

  /** 낡음 오버레이를 플레이어 변형에 맞춰 동기화 */
  private syncPlayerDmg() {
    if (!this.playerDmg.visible) return;
    this.playerDmg.setPosition(this.player.x, this.player.y);
    this.playerDmg.rotation = this.player.rotation;
    this.playerDmg.setScale(this.player.scaleX, this.player.scaleY);
    this.playerDmg.setAlpha(this.player.alpha);
  }

  /** 종류 스킨용 — 직접 그린 빤쓰 텍스처 */
  private makeSkinTexture(key: string, type: Parameters<typeof drawPanty>[2], colorHex: string) {
    if (this.textures.exists(key)) this.textures.remove(key);
    const tex = this.textures.createCanvas(key, 96, 96);
    if (!tex) return;
    drawPanty(tex.getContext(), 96, type, colorHex);
    tex.refresh();
  }

  private makeEmojiTexture(key: string, emoji: string, size: number) {
    if (this.textures.exists(key)) this.textures.remove(key);
    const tex = this.textures.createCanvas(key, size, size);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, size, size);
    ctx.font = `${Math.floor(size * 0.78)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, size / 2, size / 2);
    tex.refresh();
  }

  private die() {
    if (!this.alive) return;
    this.alive = false;
    this.physics.pause();
    this.playerDmg.setVisible(false);
    this.tweens.killTweensOf(this.player);
    this.cameras.main.shake(260, 0.018);

    // 멘탈 붕괴 — 빤쓰가 축 늘어짐 🫠
    this.popText(this.player.x, this.player.y - 30, "🫠", "#ffffff", true);
    this.tweens.add({
      targets: this.player,
      angle: 90,
      alpha: 0.4,
      y: this.player.y + 14,
      duration: 500,
      ease: "Quad.easeIn",
    });

    // 암전 → (침묵) → 🎤"출근." → 결과로
    const black = this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0)
      .setDepth(2000);
    this.tweens.add({ targets: black, alpha: 1, delay: 500, duration: 600 });
    const chul = this.add
      .text(GAME_W / 2, GAME_H / 2, "출근.", {
        fontSize: "46px",
        color: "#e8e8ee",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(2001)
      .setAlpha(0);
    this.tweens.add({ targets: chul, alpha: 1, delay: 1600, duration: 500 });

    this.time.delayedCall(2700, () => {
      this.onGameOver({
        time: this.elapsed,
        distance: this.distance,
        coins: this.coinCount,
        nearMisses: this.nearMisses,
        score: this.liveScore(),
        items: this.itemCounts,
        mental: this.mental,
        dodgedNotifs: this.dodgedNotifs,
        ignoredCalls: this.ignoredCalls,
        cleared: false,
      });
    });
  }

  private bgColor(): number {
    if (this.stage) return this.stage.zones[this.zoneIdx].bg;
    switch (this.setup.category) {
      case "Company": return 0x1a1f2e;
      case "School": return 0x1f2e1a;
      case "Romance": return 0x2e1a28;
      case "Military": return 0x2a2a1a;
      case "Family": return 0x2a1e1a;
      default: return 0x151a22;
    }
  }
}

export const GAME_DIMENSIONS = { width: GAME_W, height: GAME_H };
