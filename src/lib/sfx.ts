// 절차 합성 SFX — 에셋 파일 없이 Web Audio로 즉석 생성.
// 브라우저 자동재생 정책 때문에 첫 입력(탭/키)에서 unlockAudio()를 호출해야 하며,
// 그 전의 재생 호출은 전부 무음 no-op이다.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function unlockAudio() {
  if (ctx) {
    if (ctx.state === "suspended") void ctx.resume();
    return;
  }
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
}

/** 주파수 f0→f1로 미끄러지는 단일 오실레이터 톤 */
function tone(
  type: OscillatorType,
  f0: number,
  f1: number,
  dur: number,
  gain: number,
  delay = 0,
) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(Math.max(1, f0), t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** 밴드패스 필터를 거친 노이즈 버스트 (타격감·바람 소리용) */
function noise(dur: number, freq: number, gain: number, delay = 0) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + delay;
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = 0.9;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t);
}

export const sfx = {
  jump() {
    tone("square", 240, 460, 0.11, 0.09);
  },
  airJump() {
    tone("square", 320, 580, 0.1, 0.09);
  },
  coin() {
    tone("sine", 900, 1350, 0.07, 0.06);
  },
  /** 니어미스 — 휙 스치는 바람 */
  near() {
    noise(0.16, 2400, 0.16);
    tone("sine", 520, 940, 0.12, 0.04);
  },
  hit() {
    noise(0.18, 300, 0.45);
    tone("sawtooth", 160, 55, 0.22, 0.26);
  },
  item() {
    tone("sine", 660, 660, 0.08, 0.08);
    tone("sine", 880, 880, 0.08, 0.08, 0.07);
    tone("sine", 1320, 1320, 0.12, 0.08, 0.14);
  },
  /** 함정(지뢰) 등 나쁜 획득 */
  bad() {
    tone("sawtooth", 220, 85, 0.28, 0.18);
  },
  /** 위기·보스 공격 경고 (삐-뽀 2음) */
  warn() {
    tone("square", 640, 640, 0.12, 0.11);
    tone("square", 470, 470, 0.13, 0.11, 0.13);
  },
  /** 구간 전환 차임 */
  zone() {
    tone("sine", 520, 790, 0.18, 0.07);
  },
  fever() {
    for (let i = 0; i < 4; i++) {
      const f = 440 * Math.pow(1.26, i);
      tone("square", f, f, 0.09, 0.07, i * 0.07);
    }
  },
  /** 위기 탈출 성공 */
  success() {
    tone("sine", 660, 660, 0.09, 0.09);
    tone("sine", 990, 990, 0.15, 0.09, 0.09);
  },
  /** 보스 포효 — 등장·발악 */
  roar() {
    tone("sawtooth", 140, 48, 0.6, 0.3);
    noise(0.5, 160, 0.22);
  },
  /** 보스가 피격으로 가까워질 때 으르렁 */
  growl() {
    tone("sawtooth", 120, 65, 0.25, 0.2);
  },
  /** 손 휩쓸기 — 바람 가르는 소리 */
  sweep() {
    noise(0.24, 900, 0.24);
  },
  /** 서류 투척 */
  toss() {
    noise(0.12, 1600, 0.1);
  },
  /** 투척물 착탄 */
  impact() {
    noise(0.12, 240, 0.26);
    tone("sine", 130, 50, 0.13, 0.18);
  },
  /** 심장박동 쿵-쿵 (intensity 0~1) */
  heartbeat(intensity: number) {
    const v = Phaser_clamp(intensity, 0, 1);
    tone("sine", 88, 42, 0.16, 0.3 * v + 0.06);
    tone("sine", 76, 38, 0.14, 0.22 * v + 0.04, 0.16);
  },
  /** 보스에게 붙잡힘 */
  grab() {
    tone("sawtooth", 300, 45, 0.7, 0.34);
    noise(0.4, 200, 0.3);
  },
  /** 멘탈 붕괴 */
  collapse() {
    tone("sine", 420, 85, 0.9, 0.22);
  },
  /** 스테이지 클리어 팡파르 */
  clear() {
    [523, 659, 784, 1046].forEach((f, i) => tone("sine", f, f, 0.16, 0.11, i * 0.11));
  },
};

// Phaser 의존 없이 쓰는 작은 clamp (이 모듈은 순수 Web Audio)
function Phaser_clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
