import Phaser from "phaser";
import type { GeneratedRunSetup } from "@/lib/types";

export interface RunSceneData {
  setup: GeneratedRunSetup;
  onGameOver: (stats: { time: number; distance: number; coins: number }) => void;
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

// 지형(언덕) 높이 오프셋 — 표면 기준 위쪽으로 얼마나 띄울지
const FOOT_STAND = 30;
const FOOT_SLIDE = 16;
const OFF_GROUND_OBS = 30;
const OFF_HIGH_OBS = 110;
const OFF_COIN = 100;

const PLAYER_EMOJI = "🩲";
const COIN_EMOJI = "🪙";
const FALLBACK_OBSTACLE_EMOJI = "❓";

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
  private terrain!: Phaser.GameObjects.Graphics;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private coins!: Phaser.Physics.Arcade.Group;
  private scoreText!: Phaser.GameObjects.Text;
  private introText!: Phaser.GameObjects.Text;

  private setup!: GeneratedRunSetup;
  private onGameOver!: RunSceneData["onGameOver"];

  private elapsed = 0;
  private distance = 0;
  private coinCount = 0;
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

  constructor() {
    super("RunScene");
  }

  init(data: RunSceneData) {
    this.setup = data.setup;
    this.onGameOver = data.onGameOver;
    this.elapsed = 0;
    this.distance = 0;
    this.coinCount = 0;
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
  }

  create() {
    this.cameras.main.setBackgroundColor(this.bgColor());

    this.buildEmojiTextures();

    // 지형은 매 프레임 다시 그리는 그래픽스 (플레이어보다 뒤에 깔림)
    this.terrain = this.add.graphics();

    this.player = this.add.image(
      PLAYER_X,
      this.surfaceYAt(PLAYER_X) - FOOT_STAND,
      "tex_player",
    );
    this.player.setDisplaySize(64, 64);
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setAllowGravity(false);
    this.playerBody.moves = false; // 이동은 직접 관리, Arcade는 overlap 감지용
    this.playerBody.setSize(40, 56, true);

    this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true });
    this.coins = this.physics.add.group({ allowGravity: false });

    this.physics.add.overlap(this.player, this.obstacles, () => this.die());
    this.physics.add.overlap(this.player, this.coins, (_p, c) => {
      (c as Phaser.GameObjects.GameObject).destroy();
      this.coinCount += 1;
    });

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

    this.drawTerrain();
  }

  update(_time: number, delta: number) {
    if (!this.alive) return;
    const dt = delta / 1000;
    this.elapsed += dt;
    this.speed += SPEED_RAMP * dt;
    this.distance += this.speed * dt * 0.1;
    this.worldScroll += this.speed * dt;

    this.drawTerrain();
    this.updatePlayer(dt);
    this.updateEntities(this.obstacles);
    this.updateEntities(this.coins);

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

    this.scoreText.setText(
      `⏱ ${this.elapsed.toFixed(1)}s   🏃 ${Math.round(this.distance)}m   🪙 ${this.coinCount}`,
    );
  }

  /**
   * 지형 표면의 y좌표 (작을수록 높은 언덕).
   * 진폭을 진행 거리(worldX)에 비례해 키워서 갈수록 경사가 험해진다.
   * 시간이 아니라 위치 기준이라, 지나간 지형은 모양이 변하지 않고
   * 장애물·코인의 지형 기준 높이도 항상 일관되게 유지된다.
   */
  private surfaceYAt(worldX: number): number {
    // 0 → 1 로 서서히 증가 (약 800px 평탄 구간 후 ~9000px 동안 램프업)
    const ramp = Phaser.Math.Clamp((worldX - 800) / 9000, 0, 1);
    const peak = 44 + ramp * 62; // 진폭 44px → 106px
    // 화면 안에 언덕 한 개가 보이도록 중간 주파수 성분을 키운 합 (최대 ±1)
    const unit =
      Math.sin(worldX * 0.0022) * 0.45 +
      Math.sin(worldX * 0.006 + 2.1) * 0.33 +
      Math.sin(worldX * 0.012 + 0.7) * 0.22;
    const y = GROUND_Y - 6 - unit * peak;
    // 안전 클램프 — 언덕이 HUD를 침범하거나 골짜기가 화면 밖으로 나가지 않게
    return Phaser.Math.Clamp(y, 150, 452);
  }

  private drawTerrain() {
    const g = this.terrain;
    const step = 12;
    g.clear();

    // 땅 채우기
    g.fillStyle(0x2b2b3a, 1);
    g.beginPath();
    g.moveTo(0, GAME_H);
    for (let x = 0; x <= GAME_W; x += step) {
      g.lineTo(x, this.surfaceYAt(this.worldScroll + x));
    }
    g.lineTo(GAME_W, GAME_H);
    g.closePath();
    g.fillPath();

    // 윗면 강조선
    g.lineStyle(3, 0x4a4a63, 1);
    g.beginPath();
    g.moveTo(0, this.surfaceYAt(this.worldScroll));
    for (let x = step; x <= GAME_W; x += step) {
      g.lineTo(x, this.surfaceYAt(this.worldScroll + x));
    }
    g.strokePath();
  }

  private updatePlayer(dt: number) {
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

    this.playerBody.updateFromGameObject();
  }

  private updateEntities(group: Phaser.Physics.Arcade.Group) {
    group.getChildren().forEach((obj) => {
      const go = obj as Phaser.GameObjects.Image;
      const worldX = go.getData("worldX") as number;
      const off = go.getData("off") as number;
      const sx = worldX - this.worldScroll;
      if (sx < -60) {
        go.destroy();
        return;
      }
      go.x = sx;
      go.y = this.surfaceYAt(worldX) - off;
      (go.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
    });
  }

  private tryJump() {
    if (!this.alive) return;
    if (!this.grounded && this.coyote <= 0) return;
    if (this.isSliding) this.endSlide();
    this.playerVy = JUMP_V;
    this.grounded = false;
    this.jumping = true;
    this.coyote = 0; // 이중 점프 방지
  }

  private startSlide() {
    if (!this.alive || this.isSliding) return;
    if (!this.grounded) return;
    this.isSliding = true;
    this.slideTimer = 0.6;
    this.player.setDisplaySize(72, 36);
    this.playerBody.setSize(48, 28, true);
  }

  private endSlide() {
    this.isSliding = false;
    this.slideTimer = 0;
    this.player.setDisplaySize(64, 64);
    this.playerBody.setSize(40, 56, true);
  }

  private pickObstacleTexture(): string {
    const ids = this.setup.obstacleIds;
    if (ids.length === 0) return "tex_fallback_obstacle";
    const id = ids[Math.floor(Math.random() * ids.length)];
    return `tex_${id}`;
  }

  private spawn() {
    const roll = Math.random();
    const spawnWorldX = this.worldScroll + GAME_W + 30;
    if (roll < 0.6) {
      const obs = this.add.image(GAME_W + 30, 0, this.pickObstacleTexture());
      obs.setDisplaySize(56, 56);
      obs.setData("worldX", spawnWorldX);
      obs.setData("off", OFF_GROUND_OBS);
      this.physics.add.existing(obs);
      const body = obs.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.moves = false;
      body.setSize(40, 44, true);
      this.obstacles.add(obs);
    } else if (roll < 0.85) {
      const obs = this.add.image(GAME_W + 30, 0, this.pickObstacleTexture());
      obs.setDisplaySize(56, 56);
      obs.setData("worldX", spawnWorldX);
      obs.setData("off", OFF_HIGH_OBS);
      this.physics.add.existing(obs);
      const body = obs.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.moves = false;
      body.setSize(44, 36, true);
      this.obstacles.add(obs);
    } else {
      const coin = this.add.image(GAME_W + 20, 0, "tex_coin");
      coin.setDisplaySize(34, 34);
      coin.setData("worldX", this.worldScroll + GAME_W + 20);
      coin.setData("off", OFF_COIN);
      this.physics.add.existing(coin);
      const body = coin.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.moves = false;
      body.setSize(26, 26, true);
      this.coins.add(coin);
    }
  }

  private buildEmojiTextures() {
    this.makeEmojiTexture("tex_player", PLAYER_EMOJI, 96);
    this.makeEmojiTexture("tex_coin", COIN_EMOJI, 64);
    this.makeEmojiTexture("tex_fallback_obstacle", FALLBACK_OBSTACLE_EMOJI, 96);
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
    this.cameras.main.shake(220, 0.012);
    this.tweens.add({
      targets: this.player,
      angle: 90,
      duration: 300,
    });
    this.time.delayedCall(600, () => {
      this.onGameOver({
        time: this.elapsed,
        distance: this.distance,
        coins: this.coinCount,
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
