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
  private ground!: Phaser.GameObjects.Rectangle;
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
  }

  create() {
    this.cameras.main.setBackgroundColor(this.bgColor());

    this.buildEmojiTextures();

    this.ground = this.add.rectangle(GAME_W / 2, GROUND_Y + 40, GAME_W, 80, 0x2b2b3a);
    this.physics.add.existing(this.ground, true);

    this.player = this.add.image(PLAYER_X, GROUND_Y - 30, "tex_player");
    this.player.setDisplaySize(64, 64);
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setSize(40, 56, true);
    this.playerBody.setGravityY(GRAVITY);
    this.playerBody.setCollideWorldBounds(true);

    this.physics.add.collider(this.player, this.ground);

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
      .setOrigin(0.5);
    this.tweens.add({
      targets: this.introText,
      alpha: 0,
      delay: 2200,
      duration: 800,
    });

    this.scoreText = this.add.text(16, 16, "", {
      fontSize: "16px",
      color: "#f4f4f6",
      fontFamily: "system-ui, -apple-system, sans-serif",
    });

    const hint = this.add.text(
      GAME_W / 2,
      GAME_H - 24,
      "위쪽 탭·스페이스 → 점프   ·   아래쪽 탭·↓ → 슬라이드",
      {
        fontSize: "12px",
        color: "#9b9baf",
        fontFamily: "system-ui, -apple-system, sans-serif",
      },
    ).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0, delay: 3500, duration: 600 });

    this.input.keyboard?.on("keydown-SPACE", () => this.tryJump());
    this.input.keyboard?.on("keydown-UP", () => this.tryJump());
    this.input.keyboard?.on("keydown-DOWN", () => this.startSlide());
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (p.y > GAME_H / 2) this.startSlide();
      else this.tryJump();
    });
  }

  update(_time: number, delta: number) {
    if (!this.alive) return;
    const dt = delta / 1000;
    this.elapsed += dt;
    this.speed += SPEED_RAMP * dt;
    this.distance += this.speed * dt * 0.1;

    this.obstacles.setVelocityX(-this.speed);
    this.coins.setVelocityX(-this.speed);

    this.obstacles.getChildren().forEach((obs) => {
      const go = obs as Phaser.GameObjects.Image;
      if (go.x < -60) obs.destroy();
    });
    this.coins.getChildren().forEach((c) => {
      const go = c as Phaser.GameObjects.Image;
      if (go.x < -60) c.destroy();
    });

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

  private tryJump() {
    if (!this.alive) return;
    if (!(this.playerBody.blocked.down || this.playerBody.touching.down)) return;
    if (this.isSliding) this.endSlide();
    this.playerBody.setVelocityY(JUMP_V);
  }

  private startSlide() {
    if (!this.alive || this.isSliding) return;
    if (!(this.playerBody.blocked.down || this.playerBody.touching.down)) return;
    this.isSliding = true;
    this.slideTimer = 0.6;
    this.player.setDisplaySize(72, 36);
    this.player.y = GROUND_Y - 15;
    this.playerBody.setSize(48, 28, true);
  }

  private endSlide() {
    this.isSliding = false;
    this.slideTimer = 0;
    this.player.setDisplaySize(64, 64);
    this.player.y = GROUND_Y - 30;
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
    if (roll < 0.6) {
      const obs = this.add.image(GAME_W + 30, GROUND_Y - 30, this.pickObstacleTexture());
      obs.setDisplaySize(56, 56);
      this.physics.add.existing(obs);
      const body = obs.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setSize(40, 44, true);
      this.obstacles.add(obs);
    } else if (roll < 0.85) {
      const obs = this.add.image(GAME_W + 30, GROUND_Y - 110, this.pickObstacleTexture());
      obs.setDisplaySize(56, 56);
      this.physics.add.existing(obs);
      const body = obs.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setSize(44, 36, true);
      this.obstacles.add(obs);
    } else {
      const coin = this.add.image(GAME_W + 20, GROUND_Y - 100, "tex_coin");
      coin.setDisplaySize(34, 34);
      this.physics.add.existing(coin);
      const body = coin.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
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
