import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// 링크 공유용 OG 이미지. next/og(Satori)로 렌더 → 한글(Pretendard) 임베드.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "빤쓰런 — 음악을 타고 하늘을 나는 빤쓰";

export default async function OpengraphImage() {
  const [font, panty] = await Promise.all([
    readFile(join(process.cwd(), "public/fonts/Pretendard-Bold.otf")),
    readFile(join(process.cwd(), "public/bbanzzrun_cut.png")),
  ]);
  const pantySrc = `data:image/png;base64,${panty.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0b12",
          fontFamily: "Pretendard",
          position: "relative",
        }}
      >
        {/* 핑크 글로우 */}
        <div
          style={{
            position: "absolute",
            top: 40,
            width: 640,
            height: 640,
            borderRadius: "50%",
            background:
              "radial-gradient(closest-side, rgba(255,93,162,0.45), rgba(255,93,162,0))",
            display: "flex",
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pantySrc} width={440} height={293} alt="" style={{ marginBottom: 6 }} />
        <div style={{ display: "flex", fontSize: 104, color: "#ff5da2" }}>빤쓰런</div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#ffd84d",
            letterSpacing: 10,
            marginTop: 10,
          }}
        >
          PANTY RUN · 음악을 나는 빤쓰
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Pretendard", data: font, weight: 700, style: "normal" }],
    },
  );
}
