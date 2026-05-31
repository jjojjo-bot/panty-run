import Phaser from "phaser";
import type { GeneratedRunSetup } from "@/lib/types";
import { computeScore } from "@/lib/grade";
import { getEquippedSkinTint } from "@/lib/progress";

export interface RunSceneData {
  setup: GeneratedRunSetup;
  onGameOver: (stats: {
    time: number;
    distance: number;
    coins: number;
    nearMisses: number;
    score: number;
    items: Record<string, number>;
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
const COIN_EMOJI = "🪙";
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
  | "mine";
const ITEM_EMOJI: Record<ItemKind, string> = {
  angel: "😇", // 무적
  gold: "🥇", // 점수 2배
  shield: "🛡️", // 1회 방어
  propeller: "🪂", // 비행
  magnet: "🧲", // 코인 흡입
  turtle: "🐢", // 슬로우
  rocket: "🚀", // 폭주(가속+무적)
  coffee: "☕", // 각성(2단 점프)
  jackpot: "🧧", // 복주머니(즉시 코인)
  mine: "💩", // 함정(통제불능 가속)
};
const ITEM_LABEL: Record<ItemKind, string> = {
  angel: "😇 무적!",
  gold: "🥇 점수 2배!",
  shield: "🛡️ 철벽!",
  propeller: "🪂 비행!",
  magnet: "🧲 코인 자석!",
  turtle: "🐢 슬로우!",
  rocket: "🚀 폭주!",
  coffee: "☕ 각성! 2단 점프",
  jackpot: "🧧 코인 +15!",
  mine: "💩 으악, 지뢰!",
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

export class RunScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private bgFar!: Phaser.GameObjects.Graphics;
  private terrain!: Phaser.GameObjects.Graphics;
  private speedGfx!: Phaser.GameObjects.Graphics;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private coins!: Phaser.Physics.Arcade.Group;
  private items!: Phaser.Physics.Arcade.Group;
  private scoreText!: Phaser.GameObjects.Text;
  private effectText!: Phaser.GameObjects.Text;
  private introText!: Phaser.GameObjects.Text;

  private setup!: GeneratedRunSetup;
  private onGameOver!: RunSceneData["onGameOver"];

  private elapsed = 0;
  private distance = 0;
  private coinCount = 0;
  private nearMisses = 0;
  private speed = BASE_SPEED;
  private alive = true;
  private isSliding = false;
  private slideTimer = 0;
  private lastSpawn = 0;

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

  private streaks: { x: number; y: number; len: number }[] = [];

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
    this.alive = true;
    this.isSliding = false;
    this.slideTimer = 0;
    this.lastSpawn = 0;
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
    // 스킨: 색을 단색으로 채워(setTintFill) 또렷한 색상 빤쓰로. 기본(흰색)은 원래 이모지 유지.
    const skinTint = getEquippedSkinTint();
    if (skinTint !== 0xffffff) this.player.setTintFill(skinTint);
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setAllowGravity(false);
    this.playerBody.moves = false; // 이동은 직접 관리, Arcade는 overlap 감지용
    this.playerBody.setSize(40, 56, true);

    this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true });
    this.coins = this.physics.add.group({ allowGravity: false });
    this.items = this.physics.add.group({ allowGravity: false });

    this.physics.add.overlap(this.player, this.obstacles, (_p, o) =>
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

    this.scoreText = this.add
      .text(16, 16, "", {
        fontSize: "16px",
        color: "#f4f4f6",
        fontFamily: "system-ui, -apple-system, sans-serif",
      })
      .setDepth(1000);

    // 활성 능력 표시줄 (점수 아래)
    this.effectText = this.add
      .text(16, 38, "", {
        fontSize: "15px",
        color: "#ffe08a",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontStyle: "bold",
      })
      .setDepth(1000);

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
      (this.rocketTimer > 0 ? ROCKET_BOOST : 1) * (this.mineTimer > 0 ? MINE_BOOST : 1);
    const effSpeed = this.speed * slow * boost;
    this.distance += effSpeed * dt * 0.1;
    this.worldScroll += effSpeed * dt;
    // 황금(점수 2배) — 적용 중 벌어들인 거리만큼 보너스 추가
    if (this.multTimer > 0) this.bonusScore += effSpeed * dt * 0.1;

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

    this.drawBackground();
    this.drawTerrain();
    this.drawSpeedLines(dt);
    this.updatePlayer(dt);
    this.updateObstacles();
    this.updateCoins();
    this.updateItems();

    // 능력 아이템 등장 (코인보다 드물게)
    this.itemTimer -= dt;
    if (this.itemTimer <= 0) {
      this.itemTimer = Phaser.Math.FloatBetween(14, 22);
      this.spawnItem();
    }

    this.lastSpawn += dt;
    const spawnInterval = Phaser.Math.Clamp(
      1.4 - this.elapsed * 0.012,
      0.75,
      1.4,
    );
    if (this.lastSpawn >= spawnInterval) {
      this.spawn();
      this.lastSpawn = 0;
    }

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

    this.scoreText.setText(
      `🏆 ${this.liveScore()}   🏃 ${Math.round(this.distance)}m   🪙 ${this.coinCount}`,
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

    g.fillStyle(0x2b2b3a, 1);
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
          this.popText(PLAYER_X, pb.top - 18, "아슬!", "#ff5fa2");
        }
      }
      go.setData("psx", sx);
    });
  }

  private updateCoins() {
    const magnet = this.magnetTimer > 0;
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

  private pickObstacleTexture(): string {
    const ids = this.setup.obstacleIds;
    if (ids.length === 0) return "tex_fallback_obstacle";
    const id = ids[Math.floor(Math.random() * ids.length)];
    return `tex_${id}`;
  }

  /** 지상 장애물(점프로 회피). dx = 추가 월드 오프셋(연속 배치용) */
  private spawnGround(dx: number) {
    const obs = this.add.image(0, 0, this.pickObstacleTexture());
    obs.setDisplaySize(56, 56);
    const worldX = this.worldScroll + GAME_W + 30 + dx;
    obs.setData("worldX", worldX);
    obs.setData("off", OFF_GROUND_OBS);
    obs.setData("psx", GAME_W + 30 + dx);
    this.physics.add.existing(obs);
    const body = obs.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.moves = false;
    body.setSize(40, 44, true);
    this.obstacles.add(obs);
  }

  /** 머리 위 장애물(슬라이드로 회피) */
  private spawnOverhead() {
    const obs = this.add.image(0, 0, this.pickObstacleTexture());
    obs.setDisplaySize(50, 50);
    const worldX = this.worldScroll + GAME_W + 30;
    obs.setData("worldX", worldX);
    obs.setData("off", OFF_OVERHEAD);
    obs.setData("psx", GAME_W + 30);
    this.physics.add.existing(obs);
    const body = obs.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.moves = false;
    body.setSize(46, 26, true);
    this.obstacles.add(obs);
  }

  /** 점프 궤적을 따라 늘어선 코인 아크 */
  private spawnCoinArc() {
    const n = Phaser.Math.Between(3, 5);
    const baseX = this.worldScroll + GAME_W + 30;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1); // 0..1
      const arc = Math.sin(t * Math.PI); // 가운데가 가장 높음
      const off = OFF_COIN + arc * 70;
      const coin = this.add.image(0, 0, "tex_coin");
      coin.setDisplaySize(34, 34);
      coin.setData("worldX", baseX + i * 52);
      coin.setData("off", off);
      this.physics.add.existing(coin);
      const body = coin.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.moves = false;
      body.setSize(26, 26, true);
      this.coins.add(coin);
    }
  }

  private spawn() {
    const roll = Math.random();
    if (roll < 0.42) {
      this.spawnGround(0); // 점프
    } else if (roll < 0.68) {
      this.spawnOverhead(); // 슬라이드
    } else if (roll < 0.8) {
      // 연속 지상 장애물(리듬) — 점프 두 번
      this.spawnGround(0);
      this.spawnGround(190);
    } else {
      this.spawnCoinArc(); // 코인
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
  }

  /** 장애물 충돌 처리 — 무적/비행/실드면 부수고, 아니면 사망 */
  private hitObstacle(obj: Phaser.GameObjects.GameObject) {
    if (!this.alive) return;
    const go = obj as Phaser.GameObjects.Image;
    if (this.flying || this.invincibleTimer > 0) {
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
    this.die();
  }

  /** 장애물 파괴 연출 */
  private smash(go: Phaser.GameObjects.Image) {
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
    for (const kind of ITEM_KINDS) {
      this.makeEmojiTexture(`tex_item_${kind}`, ITEM_EMOJI[kind], 80);
    }
    for (const id of this.setup.obstacleIds) {
      const emoji = OBSTACLE_EMOJI[id] ?? FALLBACK_OBSTACLE_EMOJI;
      this.makeEmojiTexture(`tex_${id}`, emoji, 96);
    }
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
    this.tweens.killTweensOf(this.player);
    this.cameras.main.shake(300, 0.02);
    this.cameras.main.flash(140, 255, 80, 80);

    // 파편 터뜨리기
    for (let i = 0; i < 9; i++) {
      const f = this.add
        .circle(this.player.x, this.player.y, Phaser.Math.Between(3, 6), 0xff5fa2)
        .setDepth(40);
      const ang = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(45, 120);
      this.tweens.add({
        targets: f,
        x: f.x + Math.cos(ang) * dist,
        y: f.y + Math.sin(ang) * dist,
        alpha: 0,
        duration: 600,
        ease: "Cubic.easeOut",
        onComplete: () => f.destroy(),
      });
    }
    this.popText(this.player.x, this.player.y - 30, "💥", "#ffffff", true);

    this.tweens.add({ targets: this.player, angle: 90, duration: 300 });

    this.time.delayedCall(650, () => {
      this.onGameOver({
        time: this.elapsed,
        distance: this.distance,
        coins: this.coinCount,
        nearMisses: this.nearMisses,
        score: this.liveScore(),
        items: this.itemCounts,
      });
    });
  }

  private bgColor(): number {
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
