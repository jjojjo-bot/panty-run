import Phaser from "phaser";
import { RISK_TUNING, RISK_FLAGS } from "../riskTuning";

// ─────────────────────────────────────────────────────────────
// 프로토타입 #3: 리스크 = 속도 (RISK = SPEED) — 회색 박스 토이
// 테마/아트 없음.
//
// 토이의 핵심: "위험에 스칠수록 빨라지고 점수가 터진다 = 욕심 vs 생존".
//
// 비행(2버튼 + 기류 게이지):
//   상승   : 상승버튼(스페이스/좌측/↑) 꾹 → 떠오름. 기류 게이지가 '오른 거리만큼' 찬다.
//   활공   : 활공버튼(Shift/우측/↓) 꾹 + 기류>0 → 기류 타고 천천히 자유 비행. (원할 때만)
//   자유낙하: 아무것도 안 누름 → 더 무겁고 빠르게.
//   게이지 : 상승 거리만큼 차고, 하강 거리만큼 빠진다.
// ─────────────────────────────────────────────────────────────

export const RISK_DIMS = { width: 960, height: 540 };

const PLAYER_X = 240;
const HALF = 14;
const OBS_HALF_W = 22;
// 간격/틈/속도/그레이즈/부스트 감도는 RISK_TUNING(슬라이더)에서 읽는다.

type Obs = { x: number; gapY: number; gapH: number; grazed: boolean; passed: boolean };

export class RiskProtoScene extends Phaser.Scene {
  constructor() {
    super("RiskProtoScene");
  }

  private g!: Phaser.GameObjects.Graphics;
  private ui!: Phaser.GameObjects.Text;

  private kRise?: Phaser.Input.Keyboard.Key;
  private kRise2?: Phaser.Input.Keyboard.Key;
  private kGlide?: Phaser.Input.Keyboard.Key;
  private kGlide2?: Phaser.Input.Keyboard.Key;
  private risePtr = false;
  private glidePtr = false;

  private py = 0;
  private vy = 0;
  private lift = 0; // 기류 게이지 0..1
  private mode = "낙하";

  private obs: Obs[] = [];
  private boost = 0;
  private speed = 0;
  private score = 0;
  private best = 0;
  private flash = 0;
  private combo = 0;
  private streak = 0;
  private dead = false;

  create() {
    this.g = this.add.graphics();
    this.ui = this.add
      .text(16, 12, "", { fontFamily: "monospace", fontSize: "20px", color: "#e8e8f0" })
      .setDepth(10);
    this.add
      .text(286, 38, "부스트(속도)", { fontFamily: "monospace", fontSize: "11px", color: "#7a7a90" })
      .setDepth(10);
    this.add
      .text(286, 58, "기류(활공 연료)", { fontFamily: "monospace", fontSize: "11px", color: "#7a7a90" })
      .setDepth(10);
    this.add
      .text(
        RISK_DIMS.width / 2,
        RISK_DIMS.height - 20,
        "상승: 좌클릭/스페이스/↑  ·  활공: 우클릭/Shift/↓ (기류 소모)  ·  안누름: 자유낙하  ·  가장자리 스치면 부스트!  ·  R: 리셋",
        { fontFamily: "monospace", fontSize: "12px", color: "#8a8aa0" },
      )
      .setOrigin(0.5)
      .setDepth(10);

    this.reset();

    // [임시 디버그] 콘솔/eval에서 상태 측정용
    if (typeof window !== "undefined") {
      (window as unknown as { __risk?: RiskProtoScene }).__risk = this;
      (window as unknown as { __riskFlags?: typeof RISK_FLAGS }).__riskFlags = RISK_FLAGS;
    }

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.dead) {
        this.reset();
        return;
      }
      if (p.x < RISK_DIMS.width / 2) this.risePtr = true;
      else this.glidePtr = true;
    });
    this.input.on("pointerup", () => {
      this.risePtr = false;
      this.glidePtr = false;
    });

    const kb = this.input.keyboard;
    if (kb) {
      kb.addCapture(["SPACE", "SHIFT", "UP", "DOWN", "R"]);
      this.kRise = kb.addKey("SPACE");
      this.kRise2 = kb.addKey("UP");
      this.kGlide = kb.addKey("SHIFT");
      this.kGlide2 = kb.addKey("DOWN");
      kb.addKey("R").on("down", () => this.reset());
    }
  }

  private reset() {
    this.py = RISK_DIMS.height / 2;
    this.vy = 0;
    this.lift = 0;
    this.mode = "낙하";
    this.risePtr = false;
    this.glidePtr = false;
    this.obs = [];
    this.boost = 0;
    this.score = 0;
    this.flash = 0;
    this.combo = 0;
    this.streak = 0;
    this.dead = false;
    this.speed = RISK_TUNING.baseSpeed;
    this.fillObstacles();
  }

  private spawnObs(x: number) {
    const lo = Math.min(RISK_TUNING.gapMin, RISK_TUNING.gapMax);
    const hi = Math.max(RISK_TUNING.gapMin, RISK_TUNING.gapMax);
    const gapH = Phaser.Math.Between(lo, hi);
    const margin = 60;
    const gapY = Phaser.Math.Between(margin + gapH / 2, RISK_DIMS.height - margin - gapH / 2);
    this.obs.push({ x, gapY, gapH, grazed: false, passed: false });
  }

  // 가장 오른쪽 장애물 기준으로 화면 앞쪽을 채운다 (토글/리셋에 안전)
  private fillObstacles() {
    const spacing = RISK_TUNING.spacing;
    let nextX = this.obs.length
      ? Math.max(...this.obs.map((o) => o.x)) + spacing
      : RISK_DIMS.width + 120;
    while (nextX < RISK_DIMS.width + spacing * 2) {
      this.spawnObs(nextX);
      nextX += spacing;
    }
  }

  private popup(text: string, color: string) {
    const t = this.add
      .text(PLAYER_X + 24, this.py - 10, text, {
        fontFamily: "monospace",
        fontSize: "18px",
        color,
        fontStyle: "bold",
      })
      .setDepth(20);
    this.tweens.add({
      targets: t,
      y: t.y - 46,
      alpha: 0,
      duration: 640,
      ease: "Cubic.Out",
      onComplete: () => t.destroy(),
    });
  }

  update(_t: number, dms: number) {
    const dt = Math.min(dms, 32) / 1000;

    const rise = !!(this.kRise?.isDown || this.kRise2?.isDown || this.risePtr);
    const glide = !!(this.kGlide?.isDown || this.kGlide2?.isDown || this.glidePtr);

    if (this.dead) {
      if (rise) this.reset();
      this.draw();
      return;
    }

    // 비행 3단
    const oldPy = this.py;
    let ay: number;
    let downCap: number;
    if (rise) {
      ay = -RISK_TUNING.thrust;
      downCap = RISK_TUNING.vyDown;
      this.mode = "상승";
    } else if (glide && this.lift > 0 && this.vy > 0) {
      // 활공은 '하강 중'에만 발동 (올라가는 중/정점에선 안 먹힘)
      ay = RISK_TUNING.glideGravity;
      downCap = RISK_TUNING.vyGlide;
      this.mode = "활공";
    } else {
      ay = RISK_TUNING.gravity;
      downCap = RISK_TUNING.vyDown;
      this.mode = "낙하";
    }
    this.vy = Phaser.Math.Clamp(this.vy + ay * dt, -RISK_TUNING.vyUp, downCap);
    this.py += this.vy * dt;
    if (this.py < HALF) {
      this.py = HALF;
      this.vy = 0;
    }
    if (this.py > RISK_DIMS.height - HALF) {
      this.py = RISK_DIMS.height - HALF;
      this.vy = 0;
    }

    // 기류 게이지: 상승하면 '오른 거리만큼' 차고, '활공으로 하강할 때만' 소모.
    // 자유낙하(안 누름)는 기류를 보존한다 (소모 0).
    const moved = this.py - oldPy;
    if (moved < 0) {
      this.lift = Math.min(1, this.lift + -moved / RISK_TUNING.fillBank);
    } else if (moved > 0 && this.mode === "활공") {
      this.lift = Math.max(0, this.lift - moved / RISK_TUNING.glideBank);
    }

    // 속도 = 부스트
    this.boost = Phaser.Math.Clamp(this.boost - RISK_TUNING.boostDecay * dt, 0, 1);
    this.speed = RISK_TUNING.baseSpeed + this.boost * RISK_TUNING.boostSpeed;
    this.streak += this.speed * dt;

    // 장애물 이동/스폰 + 충돌 (RISK_FLAGS.obstacles로 토글)
    if (RISK_FLAGS.obstacles) {
    const dx = this.speed * dt;
    for (const o of this.obs) o.x -= dx;
    this.obs = this.obs.filter((o) => o.x > -OBS_HALF_W - 20);
    this.fillObstacles();

    // 충돌 / 그레이즈
    const pTop = this.py - HALF;
    const pBot = this.py + HALF;
    for (const o of this.obs) {
      if (Math.abs(o.x - PLAYER_X) >= OBS_HALF_W + HALF) {
        if (!o.passed && o.x < PLAYER_X) {
          o.passed = true;
          if (!o.grazed) this.combo = 0;
        }
        continue;
      }
      const gapTop = o.gapY - o.gapH / 2;
      const gapBot = o.gapY + o.gapH / 2;
      const topClear = pTop - gapTop;
      const botClear = gapBot - pBot;
      if (topClear < 0 || botClear < 0) {
        this.die();
        break;
      }
      const minClear = Math.min(topClear, botClear);
      if (minClear < RISK_TUNING.grazeDist) {
        this.boost = Phaser.Math.Clamp(this.boost + RISK_TUNING.grazeGain * dt, 0, 1);
        this.flash = 0.12;
        if (!o.grazed) {
          o.grazed = true;
          this.combo += 1;
          this.score += 50 * this.combo;
          this.popup(`+${50 * this.combo}${this.combo > 1 ? `  x${this.combo}` : ""}`, "#ffd166");
        }
      }
    }
    } else if (this.obs.length) {
      this.obs = [];
    }

    this.score += this.speed * dt * 0.1 * (1 + this.boost * 2);
    this.flash = Math.max(0, this.flash - dt);

    this.draw();
  }

  private die() {
    if (this.dead) return;
    this.dead = true;
    this.best = Math.max(this.best, Math.floor(this.score));
  }

  private draw() {
    const g = this.g;
    const W = RISK_DIMS.width;
    const H = RISK_DIMS.height;
    g.clear();

    // 속도 스트릭
    const len = 30 + this.boost * 160;
    g.lineStyle(2, 0x3a3a55, 0.4 + this.boost * 0.4);
    for (let i = 0; i < 14; i++) {
      const y = ((i * 97) % H) + 8;
      const x = W - ((this.streak * (0.6 + (i % 3) * 0.2) + i * 130) % (W + len));
      g.lineBetween(x, y, x - len, y);
    }

    // 장애물 + 그레이즈 존
    for (const o of this.obs) {
      const gapTop = o.gapY - o.gapH / 2;
      const gapBot = o.gapY + o.gapH / 2;
      g.fillStyle(0x42425a, 1);
      g.fillRect(o.x - OBS_HALF_W, 0, OBS_HALF_W * 2, gapTop);
      g.fillRect(o.x - OBS_HALF_W, gapBot, OBS_HALF_W * 2, H - gapBot);
      const gz = RISK_TUNING.grazeDist;
      g.fillStyle(0xffd166, 0.18);
      g.fillRect(o.x - OBS_HALF_W, gapTop, OBS_HALF_W * 2, gz);
      g.fillRect(o.x - OBS_HALF_W, gapBot - gz, OBS_HALF_W * 2, gz);
    }

    // 플레이어 (모드별 색)
    let col = 0x55ddff; // 상승
    if (this.mode === "활공") col = 0xaef0c8;
    else if (this.mode === "낙하") col = 0x6f8fb0;
    if (this.flash > 0) col = 0xffffff;
    if (this.dead) col = 0xff5566;
    g.fillStyle(col, 1);
    g.fillRect(PLAYER_X - HALF, this.py - HALF, HALF * 2, HALF * 2);

    // 부스트 미터
    const mx = 16;
    const mw = 260;
    g.fillStyle(0x222233, 1);
    g.fillRect(mx, 44, mw, 14);
    const bc = this.boost > 0.66 ? 0xff4466 : this.boost > 0.33 ? 0xffaa33 : 0x55cc88;
    g.fillStyle(bc, 1);
    g.fillRect(mx, 44, mw * this.boost, 14);

    // 기류 미터
    g.fillStyle(0x222233, 1);
    g.fillRect(mx, 64, mw, 10);
    g.fillStyle(0x66ccff, 1);
    g.fillRect(mx, 64, mw * this.lift, 10);

    this.ui.setText(
      this.dead
        ? `충돌!  점수 ${Math.floor(this.score)} · 최고 ${this.best}   [클릭/스페이스 재시작]`
        : `점수 ${Math.floor(this.score)} · 속도 ${Math.round(this.speed)} · [${this.mode}]${this.combo > 1 ? ` · 콤보 x${this.combo}` : ""}`,
    );
  }
}
