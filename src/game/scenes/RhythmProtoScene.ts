import Phaser from "phaser";
import { LAUNCH_TUNING } from "../launchTuning";
import { loadMusicChart, type ChartNote } from "../musicChart";

// ─────────────────────────────────────────────────────────────
// 프로토타입 #5: 등속 리듬모드 (RHYTHM) — 회색 박스 토이
// 발사 없이 빤쓰가 '음악 시간'에 맞춰 등속 전진(playhead = audioTime × px/s).
// → 아이템(음악 차트: 고음=높이/비트=간격)이 오디오와 동기되어 다가온다.
// 플레이어는 위아래로만 조작(꾹=펄럭 상승/떼면 낙하, 기류 연료) → 박자에 맞춰 노트를 먹는다.
// 노트 먹으면 기류 회복 = 비행 유지. 곡 끝까지 = 정확도 점수.
// ─────────────────────────────────────────────────────────────

export const RHYTHM_DIMS = { width: 960, height: 540 };

const PLAYER_SX = 280; // 빤쓰 고정 화면 X
const HALF = 13;
const GROUND_H = 40;
const CATCH_R = 38; // 노트 잡기 세로 허용범위

type Item = { x: number; y: number; taken: boolean; hit: boolean };

export class RhythmProtoScene extends Phaser.Scene {
  constructor() {
    super("RhythmProtoScene");
  }

  private g!: Phaser.GameObjects.Graphics;
  private ui!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private groundY = 0;

  private started = false;
  private ended = false;
  private py = 0;
  private vy = 0;
  private fuel = 0;
  private holding = false;

  private playhead = 0; // 월드 px (= audioTime × pps)
  private manualT = 0; // 오디오 없을 때 수동 시계

  private chartNotes: ChartNote[] | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private items: Item[] = [];
  private lastItemX = 0; // 폴백 랜덤워크용
  private itemY = 0;

  private score = 0;
  private hits = 0;
  private total = 0;
  private best = 0;
  private camCY = 0;

  create() {
    this.groundY = RHYTHM_DIMS.height - GROUND_H;
    this.g = this.add.graphics();
    this.ui = this.add
      .text(16, 12, "", { fontFamily: "monospace", fontSize: "18px", color: "#e8e8f0" })
      .setScrollFactor(0)
      .setDepth(10);
    this.statusText = this.add
      .text(RHYTHM_DIMS.width - 12, 12, "🎵 음악 불러오는 중...", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#88ccff",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10);
    this.hint = this.add
      .text(
        RHYTHM_DIMS.width / 2,
        RHYTHM_DIMS.height - 16,
        "탭/스페이스 = 시작 & 펄럭(상승), 떼면 낙하 — 다가오는 노트 높이에 맞춰 먹기   ·   R: 리셋",
        { fontFamily: "monospace", fontSize: "12px", color: "#8a8aa0" },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);

    this.uiCam = this.cameras.add(0, 0, RHYTHM_DIMS.width, RHYTHM_DIMS.height);
    this.cameras.main.ignore([this.ui, this.hint, this.statusText]);
    this.uiCam.ignore([this.g]);

    if (typeof window !== "undefined") {
      (window as unknown as { __rhythm?: RhythmProtoScene }).__rhythm = this;
    }

    this.reset();

    this.input.on("pointerdown", () => this.press());
    this.input.on("pointerup", () => {
      this.holding = false;
    });
    const kb = this.input.keyboard;
    if (kb) {
      kb.addCapture(["SPACE", "R"]);
      const sp = kb.addKey("SPACE");
      sp.on("down", () => this.press());
      sp.on("up", () => {
        this.holding = false;
      });
      kb.addKey("R").on("down", () => this.reset());
    }

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
        this.audioEl.volume = 0.8;
        this.reset();
      })
      .catch(() => this.statusText.setText("🎵 음악 분석 실패"));
  }

  private press() {
    if (this.ended) {
      this.reset();
      return;
    }
    if (!this.started) {
      this.started = true;
      this.manualT = 0;
      if (this.audioEl) {
        this.audioEl.currentTime = 0;
        this.audioEl.play().catch(() => {});
      }
    }
    this.holding = true;
  }

  private heightToY(h01: number) {
    const h = Phaser.Math.Clamp(h01, 0, 1);
    const yBot = this.groundY - 240;
    const yTop = this.groundY - 1500;
    return yBot + (yTop - yBot) * h;
  }

  private reset() {
    this.started = false;
    this.ended = false;
    this.holding = false;
    this.playhead = 0;
    this.manualT = 0;
    this.py = this.groundY - 300;
    this.vy = 0;
    this.fuel = LAUNCH_TUNING.fuelMax;
    this.score = 0;
    this.hits = 0;
    this.camCY = this.py;

    this.items = [];
    if (this.chartNotes) {
      const pps = LAUNCH_TUNING.musicPxPerSec;
      this.items = this.chartNotes.map((n) => ({
        x: PLAYER_SX + n.t * pps,
        y: this.heightToY(n.height01),
        taken: false,
        hit: false,
      }));
      this.total = this.items.length;
    } else {
      this.lastItemX = PLAYER_SX + 500;
      this.itemY = this.groundY - 300;
      this.total = 0;
      this.fillItems();
    }

    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
    }
    this.cameras.main.setScroll(0, 0);
  }

  // 오디오 없을 때 폴백: 앞쪽으로 랜덤워크 아이템 채우기
  private fillItems() {
    const yTop = this.groundY - 700;
    const yBot = this.groundY - 80;
    const pantyX = PLAYER_SX + this.playhead;
    while (this.lastItemX < pantyX + 1400) {
      this.lastItemX += LAUNCH_TUNING.itemGap;
      this.itemY = Phaser.Math.Clamp(this.itemY + Phaser.Math.Between(-130, 130), yTop, yBot);
      this.items.push({ x: this.lastItemX, y: this.itemY, taken: false, hit: false });
    }
  }

  update(_t: number, dms: number) {
    const dt = Math.min(dms, 32) / 1000;
    const pps = LAUNCH_TUNING.musicPxPerSec;

    if (this.started && !this.ended) {
      // playhead = 수동 시계(항상 전진) + 오디오 있으면 부드럽게 동기 보정.
      // 오디오만으로 구동하면 자동재생 차단/로딩 지연 시 멈춰버림 → 견고하게.
      this.manualT += dt;
      if (this.audioEl && !this.audioEl.paused && this.audioEl.currentTime > 0) {
        this.manualT += (this.audioEl.currentTime - this.manualT) * 0.08;
        if (this.audioEl.ended) this.ended = true;
      }
      this.playhead = this.manualT * pps;

      // 세로 비행
      let ay = LAUNCH_TUNING.gravity;
      if (this.holding && this.fuel > 0) {
        ay = -LAUNCH_TUNING.flutterThrust;
        this.fuel = Math.max(0, this.fuel - LAUNCH_TUNING.fuelDrain * dt);
      }
      this.vy += ay * dt;
      this.py += this.vy * dt;
      if (this.py < HALF) {
        this.py = HALF;
        this.vy = 0;
      }
      if (this.py > this.groundY - HALF) {
        this.py = this.groundY - HALF;
        this.vy = 0;
      }

      const pantyX = PLAYER_SX + this.playhead;

      // 노트 판정: playhead가 노트 x를 지나는 순간 세로 정렬돼 있으면 HIT
      for (const it of this.items) {
        if (it.taken) continue;
        if (it.x <= pantyX) {
          it.taken = true;
          if (Math.abs(this.py - it.y) < CATCH_R) {
            it.hit = true;
            this.hits++;
            this.score += 100;
            this.fuel = Math.min(LAUNCH_TUNING.fuelMax, this.fuel + LAUNCH_TUNING.itemFuel);
          }
        }
      }

      if (!this.chartNotes) {
        this.fillItems();
        this.total = this.items.length;
      } else {
        // 차트 끝까지 가면 종료
        if (this.items.length && pantyX > this.items[this.items.length - 1].x + 200) this.ended = true;
      }

      // 카메라: 가로는 playhead 고정 추적, 세로는 빤쓰 따라가기(지면 바닥 클램프)
      this.cameras.main.scrollX = pantyX - PLAYER_SX;
      const k = 1 - Math.exp(-9 * dt);
      this.camCY = Phaser.Math.Linear(this.camCY, this.py, k);
      const maxScrollY = this.groundY + GROUND_H - RHYTHM_DIMS.height;
      this.cameras.main.scrollY = Math.min(this.camCY - RHYTHM_DIMS.height * 0.5, maxScrollY);

      if (this.ended) {
        this.best = Math.max(this.best, this.score);
        if (this.audioEl) this.audioEl.pause();
      }
    }

    this.draw();
  }

  private draw() {
    const g = this.g;
    const cam = this.cameras.main;
    const pantyX = PLAYER_SX + this.playhead;
    g.clear();

    // 지면
    const wv = cam.worldView;
    g.fillStyle(0x2a2a3a, 1);
    g.fillRect(wv.x - 4, this.groundY, wv.width + 8, wv.bottom - this.groundY + 4);

    // "지금" 판정선 (빤쓰 위치)
    g.lineStyle(2, 0xffffff, 0.12);
    g.lineBetween(pantyX, wv.y, pantyX, this.groundY);

    // 노트
    for (const it of this.items) {
      if (it.taken && !it.hit) continue; // 놓친 건 사라짐
      if (it.x < wv.x - 30 || it.x > wv.right + 30) continue;
      if (it.hit) {
        g.fillStyle(0xffe08a, 0.5);
        g.fillCircle(it.x, it.y, 6);
      } else {
        g.lineStyle(2, 0x224a44, 1);
        g.strokeCircle(it.x, it.y, 14);
        g.fillStyle(0x55ffcc, 1);
        g.fillCircle(it.x, it.y, 9);
      }
    }

    // 빤쓰
    g.fillStyle(this.holding && this.fuel > 0 ? 0xffffff : 0xffd166, 1);
    g.fillRect(pantyX - HALF, this.py - HALF, HALF * 2, HALF * 2);
    // 기류 막대
    g.fillStyle(0x222233, 1);
    g.fillRect(pantyX - 20, this.py - HALF - 12, 40, 5);
    g.fillStyle(0x66ccff, 1);
    g.fillRect(pantyX - 20, this.py - HALF - 12, 40 * (this.fuel / LAUNCH_TUNING.fuelMax), 5);

    const acc = this.total > 0 ? Math.round((this.hits / this.total) * 100) : 0;
    if (!this.started) {
      this.ui.setText(`탭/스페이스로 시작!   ·   최고 ${this.best}`);
    } else if (this.ended) {
      this.ui.setText(`끝!  점수 ${this.score} · 명중 ${this.hits}/${this.total} (${acc}%) · 최고 ${this.best}   [탭=다시]`);
    } else {
      this.ui.setText(`점수 ${this.score} · 명중 ${this.hits} · 기류 ${this.fuel.toFixed(1)}`);
    }
  }
}
