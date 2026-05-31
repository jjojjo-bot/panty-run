import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { decodeSharePayload, type SharePayload } from "@/lib/sharePayload";

type SearchParams = Record<string, string | string[] | undefined>;

function getStr(sp: SearchParams, key: string, fallback = ""): string {
  const v = sp[key];
  if (Array.isArray(v)) return v[0] ?? fallback;
  return v ?? fallback;
}

function readPayload(sp: SearchParams): Partial<SharePayload> {
  const d = getStr(sp, "d");
  return d ? decodeSharePayload(d) : {};
}

function buildOgUrl(p: Partial<SharePayload>): string {
  const params = new URLSearchParams();
  if (p.i) params.set("i", p.i);
  if (p.h) params.set("h", p.h);
  if (p.c) params.set("c", p.c);
  if (p.e) params.set("e", p.e);
  if (p.t !== undefined) params.set("t", String(p.t));
  if (p.d !== undefined) params.set("d", String(p.d));
  if (p.n !== undefined) params.set("n", String(p.n));
  if (p.s !== undefined) params.set("s", String(p.s));
  if (p.g) params.set("g", p.g);
  return `/api/og?${params.toString()}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const payload = readPayload(sp);
  const input = payload.i ?? "";
  const headline = payload.h ?? "빤쓰가 달렸다";
  const ogUrl = buildOgUrl(payload);

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const metadataBase = new URL(`${proto}://${host}`);

  const title = input ? `빤쓰런 — "${input}"` : "빤쓰런";
  const description =
    headline || "현실에서 도망치고 싶은 순간을, 빤쓰가 대신 달려준다.";

  return {
    metadataBase,
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default async function SharedResultPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const payload = readPayload(sp);
  const input = payload.i ?? "";
  const headline = payload.h ?? "빤쓰가 달렸다";
  const time = payload.t ?? 0;
  const distance = payload.d ?? 0;
  const coins = payload.n ?? 0;
  const score = payload.s;
  const gradeTitle = payload.g;

  return (
    <main className="flex flex-col items-center justify-center min-h-dvh px-6 py-10">
      <div className="text-6xl mb-2">🩲</div>
      <h1 className="text-3xl font-extrabold text-panty-pink mb-1">빤쓰런</h1>
      <p className="text-panty-mute text-sm text-center mb-6">
        친구가 도망쳤어. 너도 도망쳐봐.
      </p>

      <div className="w-full max-w-md bg-panty-panel rounded-2xl p-6 text-center">
        {input && (
          <div className="text-panty-pink text-base font-bold">
            &ldquo;{input}&rdquo;
          </div>
        )}
        {gradeTitle && (
          <div className="text-lg font-extrabold text-panty-ink mt-3">
            {gradeTitle}
          </div>
        )}
        {score !== undefined && (
          <div className="text-3xl font-extrabold text-panty-pink mt-1">
            {score.toLocaleString()}
            <span className="text-base font-bold text-panty-mute ml-1">점</span>
          </div>
        )}
        <div className="text-xl font-bold my-4 leading-snug text-panty-ink">
          {headline}
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs text-panty-mute">
          <Stat label="생존" value={`${time}s`} />
          <Stat label="거리" value={`${distance}m`} />
          <Stat label="방울" value={String(coins)} />
        </div>
      </div>

      <Link
        href="/"
        className="mt-8 w-full max-w-md rounded-xl bg-panty-pink py-4 text-center text-lg font-extrabold text-panty-bg active:scale-[0.98] transition"
      >
        나도 도망가기 →
      </Link>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panty-bg rounded-lg py-2">
      <div className="text-panty-ink font-bold text-lg">{value}</div>
      <div>{label}</div>
    </div>
  );
}
