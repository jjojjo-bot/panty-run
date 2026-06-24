import Phaser from "phaser";

// ─────────────────────────────────────────────────────────────
// 프로토타입 #2: 관성 대시 (INERTIA DASH) — 회색 박스 토이  [v2: 복도 미로]
// 테마/아트 없음. Tomb of the Mask 류.
//
// v1의 결함: 뻥 뚫린 방 + 떠 있는 선반 → 틈에서 멈출 수 없어 등반 불가.
// v2의 해법: 벽이 꽉 찬 1칸 복도 계단을 '카브(carve)'해서, 대시가
//          항상 모퉁이(분기점)에 딱 멈추도록 = 올라가는 길이 보장된다.
//
// 토이의 핵심: "벽에 닿을 때까지 쭉 미끄러지고, 모퉁이에서 딱 멈춰 방향 전환".
//   - 중력 없음. 입력할 때만 움직인다.
//   - 밑에서 용암이 차오른다 → 멈춰 있으면 죽음 = 계속 위로.
//   - 복도의 코인을 쓸어담는다.
// ─────────────────────────────────────────────────────────────

export const DASH_DIMS = { width: 960, height: 600 };

const CELL = 60;
const COLS = 16; // 0과 COLS-1은 항상 벽(implicit border). 나머지도 기본은 벽.
const DASH_SPEED = 1500;
const LAVA_BASE = 50; // 용암 상승 속도 px/s
const LAVA_ACC = 3.5; // 시간당 가속

const key = (c: number, r: number) => `${c},${r}`;

export class DashProtoScene extends Phaser.Scene {
  constructor() {
    super("DashProtoScene");
  }

  private g!: Phaser.GameObjects.Graphics;
  private ui!: Phaser.GameObjects.Text;

  // 기본은 모두 벽. open에 든 셀만 통로.
  private open = new Set<string>();
  private dots = new Set<string>();
  private cursorC = 8;
  private cursorR = 0;
  private topRow = 0; // 가장 위(작은 값)까지 카브된 행

  private px = 0;
  private py = 0;
  private startPy = 0;
  private dashing = false;
  private tx = 0;
  private ty = 0;
  private bufx = 0;
  private bufy = 0;
  private hasBuf = false;

  private lavaY = 0;
  private elapsed = 0;
  private coins = 0;
  private best = 0;
  private dead = false;

  private downX = 0;
  private downY = 0;

  create() {
    this.g = this.add.graphics();
    this.ui = this.add
      .text(16, 12, "", { fontFamily: "monospace", fontSize: "20px", color: "#e8e8f0" })
      .setScrollFactor(0)
      .setDepth(10);
    this.add
      .text(
        DASH_DIMS.width / 2,
        DASH_DIMS.height - 22,
        "스와이프 / 방향키(↑↓←→·WASD) 대시 — 벽까지 쭉, 모퉁이에서 멈춤. 지그재그로 올라가라!  용암이 쫓아온다   ·   R: 리셋",
        { fontFamily: "monospace", fontSize: "13px", color: "#8a8aa0" },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);

    this.reset();

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.dead) {
        this.reset();
        return;
      }
      this.downX = p.x;
      this.downY = p.y;
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      const dx = p.x - this.downX;
      const dy = p.y - this.downY;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) this.setDash(Math.sign(dx), 0);
      else this.setDash(0, Math.sign(dy));
    });

    const kb = this.input.keyboard;
    if (kb) {
      kb.addCapture(["UP", "DOWN", "LEFT", "RIGHT", "SPACE", "W", "A", "S", "D", "R"]);
      const on = (k: string, dx: number, dy: number) =>
        kb.addKey(k).on("down", () => this.setDash(dx, dy));
      on("UP", 0, -1);
      on("W", 0, -1);
      on("DOWN", 0, 1);
      on("S", 0, 1);
      on("LEFT", -1, 0);
      on("A", -1, 0);
      on("RIGHT", 1, 0);
      on("D", 1, 0);
      kb.addKey("R").on("down", () => this.reset());
      kb.addKey("SPACE").on("down", () => {
        if (this.dead) this.reset();
      });
    }
  }

  private reset() {
    this.open.clear();
    this.dots.clear();
    this.cursorC = 8;
    this.cursorR = 0;
    this.topRow = 0;
    this.open.add(key(this.cursorC, this.cursorR));

    this.px = this.centerX(this.cursorC);
    this.py = this.centerY(this.cursorR);
    this.startPy = this.py;
    this.dashing = false;
    this.hasBuf = false;
    this.lavaY = this.py + 7 * CELL;
    this.elapsed = 0;
    this.coins = 0;
    this.dead = false;

    this.carveTo(this.rowOf(this.py) - 18);
    this.cameras.main.setScroll(0, this.startPy - DASH_DIMS.height * 0.6);
  }

  private colOf(x: number) {
    return Math.floor(x / CELL);
  }
  private rowOf(y: number) {
    return Math.floor(y / CELL);
  }
  private centerX(c: number) {
    return c * CELL + CELL / 2;
  }
  private centerY(r: number) {
    return r * CELL + CELL / 2;
  }

  private isSolid(c: number, r: number) {
    if (c <= 0 || c >= COLS - 1) return true;
    return !this.open.has(key(c, r));
  }

  private carve(c: number, r: number, withCoin: boolean) {
    this.open.add(key(c, r));
    if (withCoin && Phaser.Math.Between(0, 100) < 65) this.dots.add(key(c, r));
  }

  // 계단형 복도를 위로 카브: (수직 ↑) → (수평) 반복.
  // 1칸 복도라 대시는 항상 모퉁이에 멈춘다 = 등반 보장.
  private carveTo(uptoRow: number) {
    let guard = 0;
    while (this.topRow > uptoRow && guard++ < 200) {
      // 수직 상승 구간
      const up = Phaser.Math.Between(3, 6);
      for (let i = 0; i < up; i++) {
        this.cursorR -= 1;
        this.carve(this.cursorC, this.cursorR, true);
      }
      this.topRow = Math.min(this.topRow, this.cursorR);

      // 수평 구간 (벽 안에서 방향 선택)
      const dir = this.cursorC <= 3 ? 1 : this.cursorC >= COLS - 4 ? -1 : Phaser.Math.Between(0, 1) ? 1 : -1;
      const len = Phaser.Math.Between(2, 5);
      for (let i = 0; i < len; i++) {
        const nc = this.cursorC + dir;
        if (nc <= 0 || nc >= COLS - 1) break;
        this.cursorC = nc;
        this.carve(this.cursorC, this.cursorR, true);
      }
    }
  }

  private setDash(dx: number, dy: number) {
    if (this.dead) return;
    if (this.dashing) {
      this.bufx = dx;
      this.bufy = dy;
      this.hasBuf = true;
      return;
    }
    this.beginDash(dx, dy);
  }

  private beginDash(dx: number, dy: number) {
    const c0 = this.colOf(this.px);
    const r0 = this.rowOf(this.py);
    let c = c0;
    let r = r0;
    for (let i = 0; i < 80; i++) {
      const nc = c + dx;
      const nr = r + dy;
      if (this.isSolid(nc, nr)) break;
      c = nc;
      r = nr;
    }
    if (c === c0 && r === r0) return; // 막혔음
    this.tx = this.centerX(c);
    this.ty = this.centerY(r);
    this.dashing = true;
  }

  update(_t: number, dms: number) {
    const dt = Math.min(dms, 32) / 1000;
    if (!this.dead) {
      this.elapsed += dt;

      if (this.dashing) {
        const step = DASH_SPEED * dt;
        const dx = this.tx - this.px;
        const dy = this.ty - this.py;
        const dist = Math.hypot(dx, dy);
        if (dist <= step) {
          this.px = this.tx;
          this.py = this.ty;
          this.dashing = false;
        } else {
          this.px += (dx / dist) * step;
          this.py += (dy / dist) * step;
        }
        const ck = key(this.colOf(this.px), this.rowOf(this.py));
        if (this.dots.has(ck)) {
          this.dots.delete(ck);
          this.coins++;
        }
        if (!this.dashing && this.hasBuf) {
          this.hasBuf = false;
          this.beginDash(this.bufx, this.bufy);
        }
      }

      const lavaSpeed = LAVA_BASE + LAVA_ACC * this.elapsed;
      this.lavaY -= lavaSpeed * dt;
      if (this.py >= this.lavaY) this.die();

      this.carveTo(this.rowOf(this.py) - 16);
    }

    const camMax = this.startPy - DASH_DIMS.height * 0.6;
    this.cameras.main.scrollY = Math.min(camMax, this.py - DASH_DIMS.height * 0.6);
    this.cameras.main.scrollX = 0;

    this.draw();
  }

  private die() {
    if (this.dead) return;
    this.dead = true;
    const climbed = Math.max(0, Math.floor((this.startPy - this.py) / CELL));
    this.best = Math.max(this.best, climbed);
  }

  private draw() {
    const g = this.g;
    const cam = this.cameras.main;
    g.clear();

    const r0 = Math.floor(cam.scrollY / CELL) - 1;
    const r1 = Math.floor((cam.scrollY + DASH_DIMS.height) / CELL) + 1;

    // 벽 (기본 전부 벽, 통로만 비어 있음)
    g.fillStyle(0x2a2a3a, 1);
    for (let r = r0; r <= r1; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.isSolid(c, r)) g.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
      }
    }

    // 코인
    g.fillStyle(0xffd166, 1);
    for (let r = r0; r <= r1; r++) {
      for (let c = 1; c <= COLS - 2; c++) {
        if (this.dots.has(key(c, r))) g.fillCircle(this.centerX(c), this.centerY(r), 7);
      }
    }

    // 용암
    g.fillStyle(0xcc2233, 0.85);
    g.fillRect(0, this.lavaY, COLS * CELL, cam.scrollY + DASH_DIMS.height - this.lavaY + CELL);

    // 플레이어
    g.fillStyle(this.dead ? 0xff5566 : 0x55ddff, 1);
    g.fillRect(this.px - CELL / 2 + 6, this.py - CELL / 2 + 6, CELL - 12, CELL - 12);

    const climbed = Math.max(0, Math.floor((this.startPy - this.py) / CELL));
    this.ui.setText(
      this.dead
        ? `타버림!  높이 ${climbed} · 코인 ${this.coins} · 최고 ${this.best}   [클릭/스페이스 재시작]`
        : `높이 ${climbed} · 코인 ${this.coins}`,
    );
  }
}
