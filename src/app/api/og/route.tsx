import { ImageResponse } from "next/og";

export const runtime = "edge";

const CATEGORY_EMOJI: Record<string, string> = {
  Company: "💼",
  School: "📚",
  Romance: "💔",
  Military: "🪖",
  Family: "👵",
  Reality: "🌧️",
};

let cachedFont: ArrayBuffer | null = null;

async function loadFont(origin: string): Promise<ArrayBuffer> {
  if (cachedFont) return cachedFont;
  const res = await fetch(`${origin}/fonts/Pretendard-Bold.otf`);
  if (!res.ok) throw new Error(`font load failed: ${res.status}`);
  cachedFont = await res.arrayBuffer();
  return cachedFont;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { searchParams } = url;
  const input = (searchParams.get("i") ?? "도망치고 싶은 순간").slice(0, 60);
  const headline = (searchParams.get("h") ?? "빤쓰가 달렸다").slice(0, 80);
  const category = searchParams.get("c") ?? "Reality";
  const time = searchParams.get("t") ?? "0";
  const distance = searchParams.get("d") ?? "0";
  const coins = searchParams.get("n") ?? "0";
  const score = searchParams.get("s");
  const grade = (searchParams.get("g") ?? "").slice(0, 20);

  const fontData = await loadFont(url.origin);
  const catEmoji = CATEGORY_EMOJI[category] ?? "🌧️";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0b0b12",
          color: "#f4f4f6",
          padding: "60px 80px",
          fontFamily: "Pretendard",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 40,
          }}
        >
          <span style={{ fontSize: 64 }}>🩲</span>
          <span style={{ color: "#ff5da2", fontWeight: 800 }}>빤쓰런</span>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 36,
            fontSize: 40,
            color: "#9b9baf",
          }}
        >
          &quot;{input}&quot;
        </div>

        {grade && (
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 24,
              marginTop: 20,
            }}
          >
            <span style={{ fontSize: 52, fontWeight: 800, color: "#ffd84d" }}>
              {grade}
            </span>
            {score && (
              <span style={{ fontSize: 52, fontWeight: 800, color: "#ff5da2" }}>
                {score}점
              </span>
            )}
          </div>
        )}

        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.15,
            color: "#f4f4f6",
          }}
        >
          {headline}
        </div>

        <div
          style={{
            display: "flex",
            gap: 60,
            marginTop: "auto",
            fontSize: 44,
            color: "#f4f4f6",
          }}
        >
          <span style={{ display: "flex" }}>⏱ {time}s</span>
          <span style={{ display: "flex" }}>🏃 {distance}m</span>
          <span style={{ display: "flex" }}>🫧 {coins}</span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 12,
            marginTop: 24,
            fontSize: 32,
            color: "#9b9baf",
          }}
        >
          <span>{catEmoji}</span>
          <span>panty.run</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Pretendard",
          data: fontData,
          style: "normal",
          weight: 700,
        },
      ],
      emoji: "twemoji",
    },
  );
}
