import Phaser from "phaser";
import { LAUNCH_TUNING } from "../launchTuning";
import { loadMusicChart, type ChartNote } from "../musicChart";

// ─────────────────────────────────────────────────────────────
// 프로토타입 #4: 빤쓰 발사 (LAUNCH) — 회색 박스 토이
// 포트리스 × 앵그리버드 × 우리가 튜닝한 비행.
//
// 토이의 핵심: "당겨서 조준 → 포물선 → 공중에서 펄럭으로 궤도 조작 → 임팩트".
//   조준 : 새총에서 드래그로 당김(각도+파워). 점선 궤도 미리보기.
//   발사 : 놓으면 포물선 비행(중력).
//   공중 : 꾹 누르면 펄럭(상승, 연료 소모) = 발사한 빤쓰를 더 멀리/조준 보정.
//   임팩트: 사무실 구조물(박스) 부수기 + 거리.
// ─────────────────────────────────────────────────────────────

export const LAUNCH_DIMS = { width: 960, height: 540 };

const HALF = 13;
const SLING_X = 170;
const GROUND_H = 40;

type Box = { x: number; y: number; w: number; h: number; hit: boolean };

export class LaunchProtoScene extends Phaser.Scene {
  constructor() {
    super("LaunchProtoScene");
  }

  private g!: Phaser.GameObjects.Graphics;
  private ui!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private groundY = 0;
  private anchorY = 0;

  private state: "aim" | "fly" | "land" | "clear" = "aim";
  private px = 0;
  private py = 0;
  private vx = 0;
  private vy = 0;
  private fuel = 0;
  private holding = false;

  private aiming = false;
  private downX = 0;
  private downY = 0;
  private curX = 0;
  private curY = 0;

  private boxes: Box[] = [];
  private items: { x: number; y: number; taken: boolean }[] = [];
  private lastItemX = 0;
  private itemY = 0;

  // 빤쓰 비행 경로 잔상(블러 선) — 날며 멜로디를 그린다
  private trail: { x: number; y: number }[] = [];

  // 클리어 연출(폭죽 자유주행)
  private clearTime = 0;
  private clearY = 0;
  private fwTimer = 0;
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: number }[] = [];

  // 음악 차트
  private chartNotes: ChartNote[] | null = null;
  private chartIdx = 0; // 다음에 깔 노트 인덱스(창 단위 생성, 루프 없음)
  private statusText!: Phaser.GameObjects.Text;
  private audioEl: HTMLAudioElement | null = null;
  private score = 0;
  private best = 0;

  // 카메라 보간용 (부드러운 줌/패닝)
  private camZoom = 1;
  private camCX = 0;
  private camCY = 0;

  create() {
    this.groundY = LAUNCH_DIMS.height - GROUND_H;
    // 새총을 화면 중간쯤으로: 위로 쏘려면 아래로 당겨야 하므로 당길 여유 확보.
    this.anchorY = this.groundY - 200;
    this.g = this.add.graphics();
    this.ui = this.add
      .text(16, 12, "", { fontFamily: "monospace", fontSize: "18px", color: "#e8e8f0" })
      .setScrollFactor(0)
      .setDepth(10);
    this.hint = this.add
      .text(
        LAUNCH_DIMS.width / 2,
        LAUNCH_DIMS.height - 16,
        "새총: 드래그로 당겨 조준→놓으면 발사  ·  공중: 꾹(클릭/스페이스)=펄럭(연료 소모)  ·  착지 후 클릭=다시  ·  R:리셋",
        { fontFamily: "monospace", fontSize: "12px", color: "#8a8aa0" },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);

    this.statusText = this.add
      .text(LAUNCH_DIMS.width - 12, 12, "🎵 음악 불러오는 중...", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#88ccff",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10);

    // UI는 줌 영향 안 받게 별도 카메라로 분리(메인 카메라는 줌아웃됨)
    this.uiCam = this.cameras.add(0, 0, LAUNCH_DIMS.width, LAUNCH_DIMS.height);
    this.cameras.main.ignore([this.ui, this.hint, this.statusText]);
    this.uiCam.ignore([this.g]);

    this.reset();

    // 음악 분석 → 아이템 트레일 (없으면 랜덤워크 폴백)
    loadMusicChart()
      .then((res) => {
        if (!res) {
          this.statusText.setText("🎵 음악 없음 (public/lab/music.*)");
          return;
        }
        this.chartNotes = res.chart.notes;
        const name = res.url.split("/").pop();
        this.statusText.setText(`🎵 ${name} · 노트 ${res.chart.notes.length}`);
        this.audioEl = new Audio(res.url);
        this.audioEl.volume = 0.7;
        this.reset();
      })
      .catch(() => this.statusText.setText("🎵 음악 분석 실패"));

    if (typeof window !== "undefined") {
      (window as unknown as { __launch?: LaunchProtoScene }).__launch = this;
    }

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.state === "land" || (this.state === "clear" && this.clearTime > 1)) {
        this.reset();
        return;
      }
      if (this.state === "aim") {
        this.aiming = true;
        this.downX = p.x;
        this.downY = p.y;
        this.curX = p.x;
        this.curY = p.y;
      } else if (this.state === "fly") {
        this.holding = true;
      }
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.aiming) {
        this.curX = p.x;
        this.curY = p.y;
      }
    });
    this.input.on("pointerup", () => {
      if (this.state === "aim" && this.aiming) {
        this.aiming = false;
        this.launch();
      } else if (this.state === "fly") {
        this.holding = false;
      }
    });

    const kb = this.input.keyboard;
    if (kb) {
      kb.addCapture(["SPACE", "R"]);
      const sp = kb.addKey("SPACE");
      sp.on("down", () => {
        if (this.state === "fly") this.holding = true;
        else if (this.state === "land" || (this.state === "clear" && this.clearTime > 1)) this.reset();
      });
      sp.on("up", () => {
        this.holding = false;
      });
      kb.addKey("R").on("down", () => this.reset());
    }
  }

  private reset() {
    this.state = "aim";
    this.aiming = false;
    this.holding = false;
    this.px = SLING_X;
    this.py = this.anchorY;
    this.vx = 0;
    this.vy = 0;
    this.fuel = 0;
    this.score = 0;
    this.particles = [];
    this.clearTime = 0;
    this.fwTimer = 0;
    this.boxes = [...this.stack(1300), ...this.stack(2150), ...this.stack(3100)];
    // 아이템: 앞쪽만 창(window) 단위로 생성(루프 없음, 곡 끝까지 한 번). 화면 밖은 안 그림.
    // 빤쓰 가로 = SLING_X + pps×audioTime, 아이템 x = SLING_X + note.t×pps → 정확히 동기.
    this.items = [];
    this.trail = [];
    this.chartIdx = 0;
    this.lastItemX = SLING_X;
    this.itemY = this.groundY - 220;
    this.fillItems();
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
    }
    // 조준 카메라: 새총 + 앞쪽 하늘 트레일(고음 소어 포함)이 보이게 줌아웃
    const az = 0.5;
    this.camZoom = az;
    this.camCX = SLING_X + (LAUNCH_DIMS.width / az) * 0.3;
    this.camCY = this.groundY + GROUND_H - LAUNCH_DIMS.height / az / 2;
    this.cameras.main.setZoom(az);
    this.cameras.main.centerOn(this.camCX, this.camCY);
  }

  private stack(x: number): Box[] {
    const arr: Box[] = [];
    const bw = 40;
    const bh = 40;
    for (let r = 0; r < 3; r++) arr.push({ x, y: this.groundY - bh * (r + 1), w: bw, h: bh, hit: false });
    return arr;
  }

  // 아이템 높이: 선형(매끈한 흐름 유지) + 아주 높은 밴드(클라이막스 고음이 극적으로 치솟음).
  private heightToY(h01: number) {
    const h = Phaser.Math.Clamp(h01, 0, 1);
    const yBot = this.groundY - 240; // 저음(하늘)
    const yTop = this.groundY - 1500; // 고음(클라이막스 = 하늘 높이 찌름)
    return yBot + (yTop - yBot) * h;
  }

  // 공중 아이템을 앞쪽으로 끝없이 채운다.
  // 음악 차트가 있으면 곡 윤곽을 루프(타일링)해서 무한히 이어붙임(중간에 안 끊김).
  // 없으면 높낮이 랜덤워크 트레일.
  // 앞쪽만 창(window) 단위로 채움. 차트는 노트 순서대로 한 번(루프 없음), 폴백은 랜덤워크.
  private fillItems() {
    const ahead = (this.state === "fly" ? this.px : SLING_X) + 1700;
    const notes = this.chartNotes;
    if (notes && notes.length) {
      const pps = LAUNCH_TUNING.musicPxPerSec;
      while (this.chartIdx < notes.length) {
        const n = notes[this.chartIdx];
        const x = SLING_X + n.t * pps;
        if (x > ahead) break;
        this.items.push({ x, y: this.heightToY(n.height01), taken: false });
        this.lastItemX = x;
        this.chartIdx++;
      }
    } else {
      const yTop = this.groundY - 1050;
      const yBot = this.groundY - 240;
      while (this.lastItemX < ahead) {
        this.lastItemX += LAUNCH_TUNING.itemGap;
        this.itemY = Phaser.Math.Clamp(this.itemY + Phaser.Math.Between(-180, 180), yTop, yBot);
        this.items.push({ x: this.lastItemX, y: this.itemY, taken: false });
      }
    }
  }

  private spawnFirework() {
    const palette = [0xff5566, 0xffd166, 0x55ffcc, 0x66ccff, 0xcc88ff, 0xffffff];
    const color = palette[Phaser.Math.Between(0, palette.length - 1)];
    const cx = this.px + Phaser.Math.Between(-340, 200);
    const cy = this.clearY + Phaser.Math.Between(-280, -40);
    const n = 20;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const sp = Phaser.Math.Between(130, 280);
      this.particles.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color });
    }
  }

  private updateParticles(dt: number) {
    if (!this.particles.length) return;
    for (const p of this.particles) {
      p.vy += 320 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt / 1.1;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private currentLaunchVel() {
    let pdx = this.downX - this.curX;
    let pdy = this.downY - this.curY;
    const mag = Math.hypot(pdx, pdy);
    const mp = LAUNCH_TUNING.maxPull;
    if (mag > mp) {
      pdx = (pdx / mag) * mp;
      pdy = (pdy / mag) * mp;
    }
    return { vx: pdx * LAUNCH_TUNING.power, vy: pdy * LAUNCH_TUNING.power, mag: Math.min(mag, mp) };
  }

  private launch() {
    const v = this.currentLaunchVel();
    if (v.mag < 12) return;
    // 가로는 오디오 시간으로 동기 구동하므로 발사는 '세로(상승)'만 결정.
    this.vx = 0;
    this.vy = v.vy;
    this.px = SLING_X;
    this.py = this.anchorY;
    this.fuel = LAUNCH_TUNING.fuelMax;
    this.state = "fly";
    if (this.audioEl) {
      this.audioEl.currentTime = 0;
      this.audioEl.play().catch(() => {});
    }
  }

  // 테스트용(eval): 세로 발사 세기(0~1)
  testLaunch(_angleDeg: number, powerFrac: number) {
    const mp = LAUNCH_TUNING.maxPull * Math.max(0, Math.min(1, powerFrac));
    this.vx = 0;
    this.vy = -mp * LAUNCH_TUNING.power;
    this.px = SLING_X;
    this.py = this.anchorY;
    this.fuel = LAUNCH_TUNING.fuelMax;
    this.state = "fly";
  }

  update(_t: number, dms: number) {
    const dt = Math.min(dms, 32) / 1000;
    if (this.state === "fly") {
      let ay = LAUNCH_TUNING.gravity;
      if (this.holding && this.fuel > 0) {
        ay = -LAUNCH_TUNING.flutterThrust;
        this.fuel = Math.max(0, this.fuel - LAUNCH_TUNING.fuelDrain * dt);
      }
      this.vy += ay * dt;
      // 상한을 넉넉히 — 발사 펀치 유지(연료 1.2초 제한이 로켓을 막음). 낙하만 적당히 캡.
      this.vy = Phaser.Math.Clamp(this.vy, -1150, 920);
      this.py += this.vy * dt;
      // 가로: 오디오 시간으로 직접 구동 → 빤쓰 위치 = 지금 들리는 음(완벽 동기).
      // 오디오 막히면 등속(pps)으로 폴백.
      if (this.audioEl && !this.audioEl.paused && this.audioEl.currentTime > 0) {
        this.px = SLING_X + LAUNCH_TUNING.musicPxPerSec * this.audioEl.currentTime;
      } else {
        this.px += LAUNCH_TUNING.musicPxPerSec * dt;
      }

      // 잔상 기록(블러 선) — 빤쓰가 그리는 멜로디 경로 (길게)
      this.trail.push({ x: this.px, y: this.py });
      if (this.trail.length > 320) this.trail.shift();

      for (const b of this.boxes) {
        if (b.hit) continue;
        if (
          this.px + HALF > b.x - b.w / 2 &&
          this.px - HALF < b.x + b.w / 2 &&
          this.py + HALF > b.y &&
          this.py - HALF < b.y + b.h
        ) {
          b.hit = true;
          this.score += 100;
          this.vy *= 0.6;
          this.vx *= 0.85;
        }
      }

      // 공중 아이템 수집 → 기류(연료) 회복 = 비행 이어가기
      const ir = 14;
      for (const it of this.items) {
        if (it.taken) continue;
        const ddx = it.x - this.px;
        const ddy = it.y - this.py;
        if (ddx * ddx + ddy * ddy < (HALF + ir) * (HALF + ir)) {
          it.taken = true;
          this.fuel = Math.min(LAUNCH_TUNING.fuelMax, this.fuel + LAUNCH_TUNING.itemFuel);
          this.score += 50;
        }
      }
      this.fillItems();
      const cullX = this.cameras.main.worldView.x - 200;
      this.items = this.items.filter((it) => !it.taken && it.x > cullX);

      // 곡 끝(모든 노트 깔고 마지막까지 통과, 또는 오디오 종료) = 런 종료
      const allPlaced = !this.chartNotes || this.chartIdx >= this.chartNotes.length;
      const songEnded =
        this.chartNotes != null && allPlaced && (this.px > this.lastItemX || (this.audioEl?.ended ?? false));
      if (this.py >= this.groundY - HALF) {
        // 추락 = 실패
        this.py = this.groundY - HALF;
        this.state = "land";
        this.best = Math.max(this.best, Math.max(0, Math.floor((this.px - SLING_X) / 50)) + this.score);
        if (this.audioEl) this.audioEl.pause();
      } else if (songEnded) {
        // 곡 완주(살아서 끝까지) = 클리어! 폭죽 자유주행
        this.state = "clear";
        this.clearTime = 0;
        this.fwTimer = 0;
        this.clearY = Phaser.Math.Clamp(this.py, this.groundY - 700, this.groundY - 300);
        this.best = Math.max(this.best, Math.max(0, Math.floor((this.px - SLING_X) / 50)) + this.score);
        if (this.audioEl) this.audioEl.pause();
      }
    } else if (this.state === "clear") {
      // 클리어 자유주행: 등속 전진 + 일정 높이 부드러운 출렁 + 폭죽
      this.clearTime += dt;
      this.px += LAUNCH_TUNING.musicPxPerSec * dt;
      this.py = this.clearY + Math.sin(this.clearTime * 2.4) * 30;
      this.trail.push({ x: this.px, y: this.py });
      if (this.trail.length > 320) this.trail.shift();
      this.fwTimer -= dt;
      if (this.fwTimer <= 0) {
        this.fwTimer = 0.32;
        this.spawnFirework();
      }
    }

    this.updateParticles(dt);

    // 카메라: 상태별 타깃 + 부드러운 보간
    {
      let tz: number;
      let tcx: number;
      let tcy: number;
      if (this.state === "fly" || this.state === "clear") {
        // 비행: 빤쓰 항상 화면 중앙, 높이 솟으면 줌아웃
        const distGround = Math.max(0, this.groundY - this.py);
        tz = Phaser.Math.Clamp(LAUNCH_DIMS.height / (2 * (distGround + 120)), 0.3, 1);
        tcx = this.px;
        tcy = this.py;
      } else if (this.state === "aim") {
        // 조준: 새총 + 하늘 트레일 한눈에
        tz = 0.5;
        tcx = SLING_X + (LAUNCH_DIMS.width / tz) * 0.3;
        tcy = this.groundY + GROUND_H - LAUNCH_DIMS.height / tz / 2;
      } else {
        tz = this.camZoom;
        tcx = this.camCX;
        tcy = this.camCY;
      }
      const kk = 1 - Math.exp(-7 * dt);
      this.camZoom = Phaser.Math.Linear(this.camZoom, tz, kk);
      this.camCX = Phaser.Math.Linear(this.camCX, tcx, kk);
      this.camCY = Phaser.Math.Linear(this.camCY, tcy, kk);
      this.cameras.main.setZoom(this.camZoom);
      this.cameras.main.centerOn(this.camCX, this.camCY);
    }

    this.draw();
  }

  private draw() {
    const g = this.g;
    g.clear();

    // 지면 (줌아웃 시 보이는 폭 전체를 덮게 worldView 기준)
    const wv = this.cameras.main.worldView;
    g.fillStyle(0x2a2a3a, 1);
    g.fillRect(wv.x - 4, this.groundY, wv.width + 8, GROUND_H + Math.max(0, wv.bottom - (this.groundY + GROUND_H)) + 4);

    // 새총 (Y자: 기둥 + 갈래)
    const forkBase = this.anchorY + 26;
    g.lineStyle(5, 0x8a6a4a, 1);
    g.lineBetween(SLING_X, this.groundY, SLING_X, forkBase);
    g.lineBetween(SLING_X, forkBase, SLING_X - 12, this.anchorY);
    g.lineBetween(SLING_X, forkBase, SLING_X + 12, this.anchorY);

    // 박스(사무실 구조물)
    for (const b of this.boxes) {
      g.fillStyle(b.hit ? 0x333344 : 0x6a6a8a, 1);
      g.fillRect(b.x - b.w / 2, b.y, b.w, b.h);
    }

    // 공중 아이템 — 화면 안만 그림(성능). 점으로만, 연결 곡선은 투명.
    for (const it of this.items) {
      if (it.taken) continue;
      if (it.x < wv.x - 30 || it.x > wv.right + 30) continue;
      g.lineStyle(2, 0x224a44, 1);
      g.strokeCircle(it.x, it.y, 14);
      g.fillStyle(0x55ffcc, 1);
      g.fillCircle(it.x, it.y, 9);
    }

    // 빤쓰 잔상(블러 선) — 날며 그린 멜로디 경로
    const tl = this.trail.length;
    for (let i = 0; i < tl; i++) {
      const t = this.trail[i];
      const f = i / tl; // 0=오래됨 → 1=최신
      g.fillStyle(0xffd166, 0.04 + f * 0.12); // 글로우(블러)
      g.fillCircle(t.x, t.y, 11 - f * 3);
      g.fillStyle(0xfff0b0, 0.1 + f * 0.4); // 코어
      g.fillCircle(t.x, t.y, 2.5 + f * 3.5);
    }

    // 폭죽 파티클
    for (const p of this.particles) {
      const a = Math.max(0, p.life);
      g.fillStyle(p.color, a);
      g.fillCircle(p.x, p.y, 2 + a * 3);
    }

    // 조준 미리보기
    if (this.state === "aim" && this.aiming) {
      const v = this.currentLaunchVel();
      let sx = SLING_X;
      let sy = this.anchorY;
      const svx = LAUNCH_TUNING.musicPxPerSec; // 가로는 음악 속도로 동기
      let svy = v.vy;
      g.fillStyle(0xffffff, 0.5);
      for (let i = 0; i < 40; i++) {
        svy += LAUNCH_TUNING.gravity * 0.03;
        sx += svx * 0.03;
        sy += svy * 0.03;
        if (sy > this.groundY) break;
        if (i % 2 === 0) g.fillCircle(sx, sy, 3);
      }
      // 당김 밴드 + 당겨진 빤쓰
      let dx = this.curX - this.downX;
      let dy = this.curY - this.downY;
      const mag = Math.hypot(dx, dy);
      if (mag > LAUNCH_TUNING.maxPull) {
        dx = (dx / mag) * LAUNCH_TUNING.maxPull;
        dy = (dy / mag) * LAUNCH_TUNING.maxPull;
      }
      const pullX = SLING_X + dx;
      const pullY = this.anchorY + dy;
      g.lineStyle(3, 0xffd166, 0.8);
      g.lineBetween(SLING_X - 10, this.anchorY, pullX, pullY);
      g.lineBetween(SLING_X + 10, this.anchorY, pullX, pullY);
      g.fillStyle(0xffd166, 1);
      g.fillRect(pullX - HALF, pullY - HALF, HALF * 2, HALF * 2);
    } else {
      // 빤쓰
      g.fillStyle(this.state === "land" ? 0xff8866 : this.holding && this.fuel > 0 ? 0xffffff : 0xffd166, 1);
      g.fillRect(this.px - HALF, this.py - HALF, HALF * 2, HALF * 2);
      // 펄럭 연료 표시(공중)
      if (this.state === "fly") {
        g.fillStyle(0x222233, 1);
        g.fillRect(this.px - 20, this.py - HALF - 12, 40, 5);
        g.fillStyle(0x66ccff, 1);
        g.fillRect(this.px - 20, this.py - HALF - 12, 40 * (this.fuel / LAUNCH_TUNING.fuelMax), 5);
      }
    }

    const dist = Math.max(0, Math.floor((this.px - SLING_X) / 50));
    let msg: string;
    if (this.state === "aim") msg = `드래그로 당겨 조준 → 놓으면 발사   ·   합산최고 ${this.best}`;
    else if (this.state === "fly") msg = `거리 ${dist}m · 점수 ${this.score} · 기류 ${this.fuel.toFixed(1)}`;
    else if (this.state === "clear")
      msg = `🎉 CLEAR! 완주!  점수 ${this.score} · 거리 ${dist}m · 합산최고 ${this.best}   [클릭=다시]`;
    else msg = `추락! 거리 ${dist}m · 점수 ${this.score} · 합산최고 ${this.best}   [클릭=다시]`;
    this.ui.setText(msg);
  }
}
