// 빤쓰 "종류" 스킨을 캔버스로 직접 그린다 (게임 텍스처 + React 미리보기 공용).
// 순수 Canvas 2D 함수라 Phaser/React 양쪽에서 동일하게 사용.

export type PantyType =
  | "briefs"
  | "thong"
  | "boxer"
  | "luxury"
  | "holey"
  | "heart"
  | "leopard"
  | "prison"
  | "patched"
  | "rainbow"
  | "hero"
  | "dubai"
  | "jelly"
  | "bubbletea"
  | "chillguy"
  | "ai"
  | "butterddeok"
  | "strawberry"
  | "blindbox"
  | "godsaeng"
  | "puppy";

interface Shape {
  halfTop: number; // 허리 반폭 (S 비율)
  waistTop: number;
  waistBottom: number;
  legY: number; // 다리 밑단 y
  innerHalf: number; // 가랑이 반폭
  crotchDip: number; // 가랑이 올라온 정도
}

const SHAPES: Record<PantyType, Shape> = {
  briefs: { halfTop: 0.4, waistTop: 0.32, waistBottom: 0.44, legY: 0.8, innerHalf: 0.13, crotchDip: 0.16 },
  thong: { halfTop: 0.34, waistTop: 0.3, waistBottom: 0.42, legY: 0.72, innerHalf: 0.05, crotchDip: 0.26 },
  boxer: { halfTop: 0.42, waistTop: 0.3, waistBottom: 0.42, legY: 0.92, innerHalf: 0.16, crotchDip: 0.08 },
  luxury: { halfTop: 0.4, waistTop: 0.32, waistBottom: 0.46, legY: 0.8, innerHalf: 0.13, crotchDip: 0.16 },
  holey: { halfTop: 0.4, waistTop: 0.32, waistBottom: 0.44, legY: 0.8, innerHalf: 0.13, crotchDip: 0.16 },
  heart: { halfTop: 0.4, waistTop: 0.32, waistBottom: 0.44, legY: 0.8, innerHalf: 0.13, crotchDip: 0.16 },
  leopard: { halfTop: 0.4, waistTop: 0.32, waistBottom: 0.44, legY: 0.8, innerHalf: 0.13, crotchDip: 0.16 },
  prison: { halfTop: 0.4, waistTop: 0.32, waistBottom: 0.44, legY: 0.8, innerHalf: 0.13, crotchDip: 0.16 },
  patched: { halfTop: 0.4, waistTop: 0.32, waistBottom: 0.44, legY: 0.8, innerHalf: 0.13, crotchDip: 0.16 },
  rainbow: { halfTop: 0.4, waistTop: 0.32, waistBottom: 0.44, legY: 0.8, innerHalf: 0.13, crotchDip: 0.16 },
  hero: { halfTop: 0.42, waistTop: 0.3, waistBottom: 0.44, legY: 0.82, innerHalf: 0.14, crotchDip: 0.14 },
  dubai: { halfTop: 0.4, waistTop: 0.32, waistBottom: 0.44, legY: 0.8, innerHalf: 0.13, crotchDip: 0.16 },
  jelly: { halfTop: 0.4, waistTop: 0.32, waistBottom: 0.44, legY: 0.8, innerHalf: 0.13, crotchDip: 0.16 },
  bubbletea: { halfTop: 0.4, waistTop: 0.32, waistBottom: 0.44, legY: 0.8, innerHalf: 0.13, crotchDip: 0.16 },
  chillguy: { halfTop: 0.4, waistTop: 0.32, waistBottom: 0.44, legY: 0.8, innerHalf: 0.13, crotchDip: 0.16 },
  ai: { halfTop: 0.4, waistTop: 0.32, waistBottom: 0.44, legY: 0.8, innerHalf: 0.13, crotchDip: 0.16 },
  butterddeok: { halfTop: 0.4, waistTop: 0.32, waistBottom: 0.44, legY: 0.8, innerHalf: 0.13, crotchDip: 0.16 },
  strawberry: { halfTop: 0.4, waistTop: 0.32, waistBottom: 0.44, legY: 0.8, innerHalf: 0.13, crotchDip: 0.16 },
  blindbox: { halfTop: 0.4, waistTop: 0.32, waistBottom: 0.44, legY: 0.8, innerHalf: 0.13, crotchDip: 0.16 },
  godsaeng: { halfTop: 0.4, waistTop: 0.32, waistBottom: 0.44, legY: 0.8, innerHalf: 0.13, crotchDip: 0.16 },
  puppy: { halfTop: 0.4, waistTop: 0.32, waistBottom: 0.44, legY: 0.8, innerHalf: 0.13, crotchDip: 0.16 },
};

function bodyPath(ctx: CanvasRenderingContext2D, S: number, sh: Shape) {
  const cx = S / 2;
  const ht = sh.halfTop * S;
  const T = sh.waistTop * S;
  const legB = sh.legY * S;
  const inner = sh.innerHalf * S;
  const dip = sh.crotchDip * S;
  ctx.beginPath();
  ctx.moveTo(cx - ht, T);
  ctx.lineTo(cx + ht, T); // 허리 윗변
  ctx.lineTo(cx + ht, sh.waistBottom * S);
  ctx.quadraticCurveTo(cx + ht, legB, cx + inner, legB); // 오른쪽 다리 밑단
  ctx.quadraticCurveTo(cx, legB - dip, cx - inner, legB); // 가랑이
  ctx.quadraticCurveTo(cx - ht, legB, cx - ht, sh.waistBottom * S); // 왼쪽 다리 밑단
  ctx.closePath();
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 255) + amt);
  const g = clamp(((n >> 8) & 255) + amt);
  const b = clamp((n & 255) + amt);
  return `rgb(${r},${g},${b})`;
}

/** type 종류의 빤쓰를 colorHex 색으로 size×size 캔버스에 그린다. */
export function drawPanty(
  ctx: CanvasRenderingContext2D,
  size: number,
  type: PantyType,
  colorHex: string,
) {
  const S = size;
  const cx = S / 2;
  const sh = SHAPES[type];
  ctx.clearRect(0, 0, S, S);
  ctx.lineJoin = "round";

  // 본체
  bodyPath(ctx, S, sh);
  ctx.fillStyle = colorHex;
  ctx.fill();
  ctx.lineWidth = S * 0.03;
  ctx.strokeStyle = shade(colorHex, -45);
  ctx.stroke();

  // 허리 밴드 (밝은 띠)
  const T = sh.waistTop * S;
  const WB = sh.waistBottom * S;
  ctx.save();
  bodyPath(ctx, S, sh);
  ctx.clip();
  ctx.fillStyle =
    type === "luxury" ? "#e8c45a" : "rgba(255,255,255,0.28)";
  ctx.fillRect(0, T, S, (WB - T) * (type === "luxury" ? 1.1 : 0.8));
  ctx.restore();

  // 종류별 디테일
  if (type === "thong") {
    // 양옆 끈
    ctx.lineWidth = S * 0.035;
    ctx.strokeStyle = colorHex;
    ctx.beginPath();
    ctx.moveTo(cx - sh.halfTop * S, T + 2);
    ctx.quadraticCurveTo(cx - 0.46 * S, 0.2 * S, cx - 0.4 * S, 0.16 * S);
    ctx.moveTo(cx + sh.halfTop * S, T + 2);
    ctx.quadraticCurveTo(cx + 0.46 * S, 0.2 * S, cx + 0.4 * S, 0.16 * S);
    ctx.stroke();
  } else if (type === "holey") {
    // 구멍 뚫기
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    const holes: [number, number, number][] = [
      [0.4, 0.6, 0.06],
      [0.6, 0.66, 0.05],
      [0.52, 0.5, 0.04],
    ];
    for (const [hx, hy, r] of holes) {
      ctx.beginPath();
      ctx.arc(hx * S, hy * S, r * S, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (type === "luxury") {
    // 금색 모노그램 점들
    ctx.fillStyle = "#e8c45a";
    const marks: [number, number][] = [
      [0.42, 0.6],
      [0.58, 0.6],
      [0.5, 0.68],
    ];
    for (const [mx, my] of marks) {
      drawDiamond(ctx, mx * S, my * S, S * 0.04);
    }
  } else if (type === "heart") {
    // 하트 무늬
    ctx.fillStyle = shade(colorHex, -55);
    drawHeart(ctx, 0.43 * S, 0.58 * S, S * 0.07);
    drawHeart(ctx, 0.58 * S, 0.62 * S, S * 0.055);
  } else if (type === "leopard") {
    // 표범 점무늬
    ctx.save();
    bodyPath(ctx, S, sh);
    ctx.clip();
    ctx.fillStyle = "#4a2f12";
    const spots: [number, number, number][] = [
      [0.4, 0.58, 0.05],
      [0.58, 0.6, 0.045],
      [0.5, 0.7, 0.04],
      [0.46, 0.5, 0.035],
      [0.63, 0.52, 0.04],
      [0.35, 0.66, 0.04],
    ];
    for (const [sx, sy, r] of spots) {
      ctx.beginPath();
      ctx.ellipse(sx * S, sy * S, r * S, r * S * 0.82, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (type === "prison") {
    // 죄수 세로 줄무늬 (탈옥 감성)
    ctx.save();
    bodyPath(ctx, S, sh);
    ctx.clip();
    ctx.fillStyle = shade(colorHex, 120);
    const barW = S * 0.07;
    for (let x = S * 0.04; x < S; x += S * 0.14) ctx.fillRect(x, 0, barW, S);
    ctx.restore();
  } else if (type === "patched") {
    // 헝겊 패치 + 꿰맨 자국
    rrect(ctx, 0.46 * S, 0.54 * S, 0.2 * S, 0.16 * S, S * 0.02);
    ctx.fillStyle = shade(colorHex, -38);
    ctx.fill();
    ctx.setLineDash([S * 0.035, S * 0.028]);
    ctx.lineWidth = S * 0.018;
    ctx.strokeStyle = "#6b5436";
    rrect(ctx, 0.46 * S, 0.54 * S, 0.2 * S, 0.16 * S, S * 0.02);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0.3 * S, 0.5 * S);
    ctx.lineTo(0.4 * S, 0.53 * S);
    ctx.stroke();
  } else if (type === "rainbow") {
    // 무지개 가로 줄
    ctx.save();
    bodyPath(ctx, S, sh);
    ctx.clip();
    const cols = ["#ff4d4d", "#ff9f40", "#ffe14d", "#4dd964", "#4db8ff", "#9a6bff"];
    const top = sh.waistTop * S;
    const bot = sh.legY * S;
    const h = (bot - top) / cols.length;
    cols.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, top + i * h, S, h + 1.5);
    });
    ctx.restore();
    bodyPath(ctx, S, sh);
    ctx.lineWidth = S * 0.03;
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.stroke();
  } else if (type === "hero") {
    // 별 엠블럼
    drawStar(ctx, 0.5 * S, 0.62 * S, S * 0.12, S * 0.05, "#ffd84d");
  } else if (type === "dubai") {
    // 두바이 초콜릿 — 피스타치오 드리즐
    ctx.save();
    bodyPath(ctx, S, sh);
    ctx.clip();
    ctx.strokeStyle = "#8fd14a";
    ctx.lineWidth = S * 0.028;
    ctx.lineCap = "round";
    for (const y0 of [0.55, 0.66]) {
      ctx.beginPath();
      ctx.moveTo(0.26 * S, y0 * S);
      ctx.quadraticCurveTo(0.4 * S, (y0 + 0.06) * S, 0.52 * S, y0 * S);
      ctx.quadraticCurveTo(0.64 * S, (y0 - 0.05) * S, 0.74 * S, (y0 + 0.02) * S);
      ctx.stroke();
    }
    ctx.restore();
  } else if (type === "jelly") {
    // 얼먹젤리 — 알록달록 젤리 블록
    ctx.save();
    bodyPath(ctx, S, sh);
    ctx.clip();
    const jc = ["#ff5a5a", "#ffd23f", "#4dd964", "#4db8ff"];
    jc.forEach((c, i) => {
      ctx.fillStyle = c;
      rrect(ctx, (0.3 + i * 0.11) * S, 0.6 * S, 0.09 * S, 0.11 * S, S * 0.02);
      ctx.fill();
    });
    ctx.restore();
  } else if (type === "bubbletea") {
    // 버블티 — 타피오카 펄
    ctx.save();
    bodyPath(ctx, S, sh);
    ctx.clip();
    ctx.fillStyle = "#3a2415";
    const pearls: [number, number][] = [
      [0.4, 0.68], [0.5, 0.7], [0.6, 0.68], [0.45, 0.62], [0.55, 0.62], [0.5, 0.6],
    ];
    for (const [px, py] of pearls) {
      ctx.beginPath();
      ctx.arc(px * S, py * S, S * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (type === "chillguy") {
    // 칠가이 — 선글라스
    ctx.fillStyle = "#1a1a22";
    rrect(ctx, 0.32 * S, 0.52 * S, 0.15 * S, 0.09 * S, S * 0.025);
    ctx.fill();
    rrect(ctx, 0.53 * S, 0.52 * S, 0.15 * S, 0.09 * S, S * 0.025);
    ctx.fill();
    ctx.fillRect(0.47 * S, 0.55 * S, 0.06 * S, 0.022 * S);
  } else if (type === "ai") {
    // AI — 회로 패턴 + 텍스트
    ctx.save();
    bodyPath(ctx, S, sh);
    ctx.clip();
    ctx.strokeStyle = "#39ff14";
    ctx.lineWidth = S * 0.016;
    ctx.beginPath();
    ctx.moveTo(0.3 * S, 0.56 * S);
    ctx.lineTo(0.42 * S, 0.56 * S);
    ctx.lineTo(0.42 * S, 0.68 * S);
    ctx.moveTo(0.7 * S, 0.58 * S);
    ctx.lineTo(0.6 * S, 0.58 * S);
    ctx.lineTo(0.6 * S, 0.7 * S);
    ctx.stroke();
    for (const [nx, ny] of [[0.3, 0.56], [0.42, 0.68], [0.7, 0.58], [0.6, 0.7]] as [number, number][]) {
      ctx.fillStyle = "#39ff14";
      ctx.beginPath();
      ctx.arc(nx * S, ny * S, S * 0.018, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = "#39ff14";
    ctx.font = `bold ${Math.floor(S * 0.16)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("AI", 0.5 * S, 0.62 * S);
  } else if (type === "butterddeok") {
    // 버터떡 — 노란 버터 한 조각
    rrect(ctx, 0.41 * S, 0.56 * S, 0.18 * S, 0.13 * S, S * 0.02);
    ctx.fillStyle = "#f5c842";
    ctx.fill();
    ctx.strokeStyle = "#d9a82a";
    ctx.lineWidth = S * 0.02;
    rrect(ctx, 0.41 * S, 0.56 * S, 0.18 * S, 0.13 * S, S * 0.02);
    ctx.stroke();
  } else if (type === "strawberry") {
    // 딸기(제철코어) — 씨 + 꼭지
    ctx.save();
    bodyPath(ctx, S, sh);
    ctx.clip();
    ctx.fillStyle = "#ffe14d";
    const seeds: [number, number][] = [
      [0.4, 0.56], [0.52, 0.58], [0.62, 0.56], [0.45, 0.66], [0.58, 0.66], [0.5, 0.72],
    ];
    for (const [sx, sy] of seeds) {
      ctx.beginPath();
      ctx.ellipse(sx * S, sy * S, S * 0.012, S * 0.02, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = "#4dbf5a"; // 꼭지
    ctx.beginPath();
    ctx.moveTo(0.5 * S, 0.3 * S);
    ctx.lineTo(0.44 * S, 0.36 * S);
    ctx.lineTo(0.56 * S, 0.36 * S);
    ctx.closePath();
    ctx.fill();
  } else if (type === "blindbox") {
    // 랜덤 블라인드박스 — 물음표
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.floor(S * 0.2)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", 0.42 * S, 0.62 * S);
    ctx.font = `bold ${Math.floor(S * 0.14)}px sans-serif`;
    ctx.fillText("?", 0.6 * S, 0.58 * S);
  } else if (type === "godsaeng") {
    // 갓생 — 운동 줄무늬 + 별
    ctx.save();
    bodyPath(ctx, S, sh);
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(0.3 * S, 0.46 * S, 0.04 * S, 0.4 * S);
    ctx.fillRect(0.66 * S, 0.46 * S, 0.04 * S, 0.4 * S);
    ctx.restore();
    drawStar(ctx, 0.5 * S, 0.62 * S, S * 0.09, S * 0.038, "#ffd84d");
  } else if (type === "puppy") {
    // 댕댕이 — 귀 + 코 + 눈
    ctx.fillStyle = shade(colorHex, -55);
    ctx.beginPath();
    ctx.ellipse(0.33 * S, 0.42 * S, S * 0.07, S * 0.11, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0.67 * S, 0.42 * S, S * 0.07, S * 0.11, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a2018"; // 코
    ctx.beginPath();
    ctx.ellipse(0.5 * S, 0.64 * S, S * 0.045, S * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath(); // 눈
    ctx.arc(0.42 * S, 0.55 * S, S * 0.022, 0, Math.PI * 2);
    ctx.arc(0.58 * S, 0.55 * S, S * 0.022, 0, Math.PI * 2);
    ctx.fill();
  }
}

function rrect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  color: string,
) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = outer * 0.12;
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.stroke();
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fill();
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.8);
  ctx.bezierCurveTo(x - r * 1.4, y - r * 0.6, x - r * 0.2, y - r * 1.2, x, y - r * 0.4);
  ctx.bezierCurveTo(x + r * 0.2, y - r * 1.2, x + r * 1.4, y - r * 0.6, x, y + r * 0.8);
  ctx.closePath();
  ctx.fill();
}

export const PANTY_TYPE_LABEL: Record<PantyType, string> = {
  briefs: "기본",
  thong: "끈 빤쓰",
  boxer: "트렁크",
  luxury: "명품",
  holey: "구멍난",
  heart: "하트",
  leopard: "호피",
  prison: "죄수",
  patched: "기운",
  rainbow: "무지개",
  hero: "히어로",
  dubai: "두바이",
  jelly: "젤리",
  bubbletea: "버블티",
  chillguy: "칠가이",
  ai: "AI",
  butterddeok: "버터떡",
  strawberry: "딸기",
  blindbox: "랜덤박스",
  godsaeng: "갓생",
  puppy: "댕댕이",
};
