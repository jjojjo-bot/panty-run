// 음악 파일 → 아이템 차트 분석.
// - spectral centroid(음색 밝기) → 아이템 높이 (고음=높이, 저음=낮음)
// - spectral flux 온셋(비트) → 아이템 타이밍 (빠른 구간=촘촘, 느린 구간=듬성)
// 곡 전체를 한 번 오프라인 분석 → {t, height01} 노트 리스트로 반환.
// 파일은 public/lab/music.{mp3,ogg,wav,m4a} 중 아무거나.

export type ChartNote = { t: number; height01: number; strength: number };
export type MusicChart = { notes: ChartNote[]; duration: number };

const CANDIDATES = ["/lab/music.mp3", "/lab/music.ogg", "/lab/music.wav", "/lab/music.m4a"];

export async function loadMusicChart(): Promise<{ chart: MusicChart; url: string } | null> {
  let buf: ArrayBuffer | null = null;
  let usedUrl = "";
  for (const u of CANDIDATES) {
    try {
      const res = await fetch(u);
      if (res.ok) {
        buf = await res.arrayBuffer();
        usedUrl = u;
        break;
      }
    } catch {
      // 다음 후보
    }
  }
  if (!buf) return null;

  const AC =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  try {
    const audio = await ctx.decodeAudioData(buf.slice(0));
    const chart = analyzeBuffer(audio);
    return { chart, url: usedUrl };
  } catch {
    return null;
  } finally {
    ctx.close();
  }
}

function analyzeBuffer(audio: AudioBuffer): MusicChart {
  const sr = audio.sampleRate;
  const ch0 = audio.getChannelData(0);
  const ch1 = audio.numberOfChannels > 1 ? audio.getChannelData(1) : null;
  const N = ch0.length;

  const FFT = 2048;
  const HOP = 2048;
  const hann = new Float32Array(FFT);
  for (let i = 0; i < FFT; i++) hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FFT - 1)));

  const re = new Float32Array(FFT);
  const im = new Float32Array(FFT);
  const prevMag = new Float32Array(FFT / 2);
  // 멜로디 대역(80~2000Hz)만으로 centroid → 고역 퍼커션 영향 줄여 음높이를 더 잘 반영
  const loBin = Math.max(1, Math.floor((80 * FFT) / sr));
  const hiBin = Math.min(FFT / 2 - 1, Math.ceil((2000 * FFT) / sr));

  const flux: number[] = [];
  const centroid: number[] = [];
  const times: number[] = [];

  for (let pos = 0; pos + FFT <= N; pos += HOP) {
    for (let i = 0; i < FFT; i++) {
      const s = ch1 ? (ch0[pos + i] + ch1[pos + i]) * 0.5 : ch0[pos + i];
      re[i] = s * hann[i];
      im[i] = 0;
    }
    fft(re, im);
    let f = 0;
    let magSum = 0;
    let freqSum = 0;
    for (let k = 0; k < FFT / 2; k++) {
      const mag = Math.hypot(re[k], im[k]);
      const d = mag - prevMag[k];
      if (d > 0) f += d;
      prevMag[k] = mag;
      if (k >= loBin && k <= hiBin) {
        magSum += mag;
        freqSum += ((k * sr) / FFT) * mag;
      }
    }
    flux.push(f);
    centroid.push(magSum > 1e-6 ? freqSum / magSum : 0);
    times.push(pos / sr);
  }

  // 음높이 곡선: centroid를 이동평균으로 매끈하게 → 멜로디 흐름을 부드럽게.
  const SM = 4; // 평활 반경(프레임) — 매끈함과 음높이 반영의 균형
  const smooth: number[] = [];
  for (let i = 0; i < centroid.length; i++) {
    let s = 0;
    let c = 0;
    for (let j = Math.max(0, i - SM); j <= Math.min(centroid.length - 1, i + SM); j++) {
      if (centroid[j] > 0) {
        s += centroid[j];
        c++;
      }
    }
    smooth.push(c ? s / c : 0);
  }

  // 퍼센타일(5~95%) 정규화 + 대비(gain): 고음 확실히 위, 저음 확실히 아래.
  const logs = smooth.filter((c) => c > 0).map((c) => Math.log(c)).sort((a, b) => a - b);
  const pct = (q: number) =>
    logs.length ? logs[Math.min(logs.length - 1, Math.max(0, Math.round(q * (logs.length - 1))))] : 0;
  const lo = pct(0.05);
  const hi = pct(0.95);
  const span = Math.max(0.001, hi - lo);
  const GAIN = 1.35; // 대비(고음 구간 단계 보존 — 화면 매핑에서 스파이크로 극화)

  // 일정 간격으로 촘촘히 샘플 → 부드럽게 이어지는 곡선 트레일.
  const STEP = 2; // 몇 프레임마다(작을수록 촘촘=더 매끈)
  const notes: ChartNote[] = [];
  for (let i = 0; i < smooth.length; i += STEP) {
    const c = smooth[i];
    if (c <= 0) continue;
    let h = (Math.log(c) - lo) / span;
    h = (h - 0.5) * GAIN + 0.5;
    notes.push({ t: times[i], height01: Math.min(1, Math.max(0, h)), strength: flux[i] });
  }

  return { notes, duration: N / sr };
}

// 반복형 radix-2 FFT (in-place). 길이는 2의 거듭제곱.
function fft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len >> 1; k++) {
        const a = i + k;
        const b = a + (len >> 1);
        const vr = re[b] * cr - im[b] * ci;
        const vi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - vr;
        im[b] = im[a] - vi;
        re[a] += vr;
        im[a] += vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}
