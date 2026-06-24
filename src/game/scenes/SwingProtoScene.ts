import Phaser from "phaser";

// ─────────────────────────────────────────────────────────────
// 프로토타입 #1: 진자 스윙 (PENDULUM SWING) — 회색 박스 토이
// 테마/아트 없음. 토이 자체의 손맛만 검증한다.
//
// 토이의 핵심: "놓는 타이밍".
//   - 꾹 누르면 사정거리 안의 가장 좋은 고리에 밧줄로 매달린다.
//   - 매달리면 중력으로 진자 운동(아래에서 가속).
//   - 떼면 그 순간의 접선(tangent) 속도로 날아간다 → 다음 고리를 잡는다.
//   - 바닥/화면 아래로 떨어지면 추락. 멀리 갈수록 점수.
// ─────────────────────────────────────────────────────────────

export const SWING_DIMS = { width: 960, height: 540 };

const G = 1500;        // 중력 가속도 (px/s^2)
const MAX_ROPE = 300;  // 잡을 수 있는 최대 거리
const DAMP = 0.9992;   // 진자 감쇠 (아주 살짝)
const START_X = 200;
const DEATH_Y = 560;   // 이 아래로 떨어지면 추락 (scrollY 고정이므로 화면 좌표=월드 좌표)

type Anchor = { x: number; y: number };

export class SwingProtoScene extends Phaser.Scene {
  constructor() {
    super("SwingProtoScene");
  }

  private g!: Phaser.GameObjects.Graphics;
  private ui!: Phaser.GameObjects.Text;

  // 플레이어 상태
  private px = 0;
  private py = 0;
  private vx = 0;
  private vy = 0;
  private attached = false;
  private anchor: Anchor | null = null;
  private ropeLen = 0;
  private theta = 0; // 아래쪽 수직 기준 각도
  private omega = 0; // 각속도
  private holding = false;

  private anchors: Anchor[] = [];
  private lastAnchorX = 0;
  private trail: { x: number; y: number }[] = [];
  private best = 0;
  private dead = false;

  create() {
    this.g = this.add.graphics();
    this.ui = this.add
      .text(16, 14, "", { fontFamily: "monospace", fontSize: "20px", color: "#e8e8f0" })
      .setScrollFactor(0)
      .setDepth(10);
    this.add
      .text(
        SWING_DIMS.width / 2,
        SWING_DIMS.height - 26,
        "꾹 누르면 고리에 매달림 · 떼면 날아감   [마우스/터치/스페이스]   ·   R: 리셋",
        { fontFamily: "monospace", fontSize: "15px", color: "#8a8aa0" },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);

    this.reset();

    // 입력: 누르면 잡기 시도(매 프레임), 떼면 놓기
    this.input.on("pointerdown", () => {
      if (this.dead) {
        this.reset();
        return;
      }
      this.holding = true;
    });
    this.input.on("pointerup", () => {
      this.holding = false;
      this.release();
    });

    const kb = this.input.keyboard;
    if (kb) {
      kb.addCapture("SPACE");
      const space = kb.addKey("SPACE");
      space.on("down", () => {
        if (this.dead) {
          this.reset();
          return;
        }
        this.holding = true;
      });
      space.on("up", () => {
        this.holding = false;
        this.release();
      });
      kb.addKey("R").on("down", () => this.reset());
    }
  }

  private reset() {
    // 시작 고리 — 플레이어를 여기에 매달아서 첫 스윙을 보장
    const a0: Anchor = { x: START_X + 140, y: 120 };
    this.anchors = [a0];
    this.lastAnchorX = a0.x;
    for (let i = 0; i < 8; i++) this.spawnAnchor();

    this.anchor = a0;
    this.ropeLen = 240;
    this.theta = -1.0; // 고리 왼쪽 위로 들려 있다가 오른쪽으로 떨어진다
    this.omega = 0;
    this.attached = true;
    this.px = a0.x + this.ropeLen * Math.sin(this.theta);
    this.py = a0.y + this.ropeLen * Math.cos(this.theta);
    this.vx = 0;
    this.vy = 0;

    this.holding = false;
    this.trail = [];
    this.dead = false;
    this.cameras.main.setScroll(0, 0);
  }

  private spawnAnchor() {
    const gap = Phaser.Math.Between(220, 330);
    this.lastAnchorX += gap;
    const y = Phaser.Math.Between(70, 250);
    this.anchors.push({ x: this.lastAnchorX, y });
  }

  private tryGrab() {
    if (this.attached) return;
    let best: Anchor | null = null;
    let bestScore = Infinity;
    for (const a of this.anchors) {
      const dx = a.x - this.px;
      const dy = a.y - this.py;
      const d = Math.hypot(dx, dy);
      if (d > MAX_ROPE || d < 24) continue;
      // 앞에 있고 위에 있는 고리를 선호
      const aheadPenalty = a.x >= this.px - 40 ? 0 : 500;
      const abovePenalty = a.y <= this.py ? 0 : 300;
      const score = d + aheadPenalty + abovePenalty;
      if (score < bestScore) {
        bestScore = score;
        best = a;
      }
    }
    if (!best) return;

    this.anchor = best;
    this.ropeLen = Math.hypot(best.x - this.px, best.y - this.py);
    const relx = this.px - best.x;
    const rely = this.py - best.y;
    this.theta = Math.atan2(relx, rely);
    // 현재 속도를 접선 성분 → 각속도로 변환 (운동량 보존)
    const tx = Math.cos(this.theta);
    const ty = -Math.sin(this.theta);
    const vt = this.vx * tx + this.vy * ty;
    this.omega = vt / this.ropeLen;
    this.attached = true;
  }

  private release() {
    if (!this.attached || !this.anchor) return;
    const tx = Math.cos(this.theta);
    const ty = -Math.sin(this.theta);
    const speed = this.omega * this.ropeLen;
    this.vx = speed * tx;
    this.vy = speed * ty;
    this.attached = false;
    this.anchor = null;
  }

  update(_t: number, dms: number) {
    const dt = Math.min(dms, 32) / 1000;

    if (!this.dead) {
      if (this.holding && !this.attached) this.tryGrab();

      if (this.attached && this.anchor) {
        const alpha = -(G / this.ropeLen) * Math.sin(this.theta);
        this.omega = (this.omega + alpha * dt) * DAMP;
        this.theta += this.omega * dt;
        this.px = this.anchor.x + this.ropeLen * Math.sin(this.theta);
        this.py = this.anchor.y + this.ropeLen * Math.cos(this.theta);
      } else {
        this.vy += G * dt;
        this.px += this.vx * dt;
        this.py += this.vy * dt;
      }

      this.trail.push({ x: this.px, y: this.py });
      if (this.trail.length > 26) this.trail.shift();

      while (this.lastAnchorX < this.px + 1300) this.spawnAnchor();
      this.anchors = this.anchors.filter((a) => a.x > this.px - 700);

      if (this.py > DEATH_Y + 80) {
        this.dead = true;
        this.best = Math.max(this.best, Math.floor(this.px / 50));
      }
    }

    // 카메라: 가로만 따라감, 세로 고정(추락 판정을 위해)
    this.cameras.main.scrollX = this.px - SWING_DIMS.width * 0.32;
    this.cameras.main.scrollY = 0;

    this.draw();
  }

  private draw() {
    const g = this.g;
    const cam = this.cameras.main;
    g.clear();

    // 추락선
    g.lineStyle(2, 0x442233, 1);
    g.lineBetween(cam.scrollX, DEATH_Y, cam.scrollX + SWING_DIMS.width, DEATH_Y);

    // 고리들
    for (const a of this.anchors) {
      g.lineStyle(2, 0x224a44, 1);
      g.strokeCircle(a.x, a.y, 14);
      g.fillStyle(0x55ffcc, 1);
      g.fillCircle(a.x, a.y, 7);
    }

    // 밧줄
    if (this.attached && this.anchor) {
      g.lineStyle(3, 0xffffff, 0.85);
      g.lineBetween(this.anchor.x, this.anchor.y, this.px, this.py);
    }

    // 잔상(트레일) — 스윙 호를 강조
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const a = (i / this.trail.length) * 0.5;
      g.fillStyle(0xffd166, a);
      g.fillCircle(t.x, t.y, 5);
    }

    // 플레이어
    g.fillStyle(this.dead ? 0xff5566 : 0xffd166, 1);
    g.fillRect(this.px - 12, this.py - 12, 24, 24);

    const dist = Math.max(0, Math.floor(this.px / 50));
    this.ui.setText(
      this.dead
        ? `추락!  거리 ${dist}m · 최고 ${this.best}m   [클릭/스페이스로 재시작]`
        : `거리 ${dist}m · 최고 ${this.best}m`,
    );
  }
}
