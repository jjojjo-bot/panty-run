import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 출시 알림 신청 수집.
// NOTIFY_WEBHOOK_URL 환경변수(예: Discord/Slack 웹훅, Google Apps Script, Formspree)가
// 설정돼 있으면 그쪽으로 전달한다. 미설정이면 서버 로그(Vercel 함수 로그)에 남겨 유실을 막는다.
export async function POST(req: Request) {
  let email: unknown;
  try {
    const body = await req.json();
    email = body?.email;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim()) || email.length > 254) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const clean = email.trim().toLowerCase();
  const when = new Date().toISOString();
  const webhook = process.env.NOTIFY_WEBHOOK_URL;

  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // content: Discord/Slack 호환 / email: 일반 수집기 호환
        body: JSON.stringify({
          content: `📩 빤쓰런 출시 알림 신청: ${clean}`,
          email: clean,
          source: "bbanzzrun.com",
          at: when,
        }),
      });
      if (!res.ok) {
        console.error(`[notify] webhook responded ${res.status} for ${clean}`);
        // 사용자에겐 성공으로 응답하되 로그에 남겨 유실 방지
        console.log(`[notify] FALLBACK signup: ${clean} @ ${when}`);
      }
    } catch (err) {
      console.error(`[notify] webhook fetch failed:`, err);
      console.log(`[notify] FALLBACK signup: ${clean} @ ${when}`);
    }
  } else {
    // 웹훅 미설정: 최소한 로그에 남긴다 (Vercel → 프로젝트 → Logs 에서 확인 가능)
    console.log(`[notify] signup (no webhook configured): ${clean} @ ${when}`);
  }

  return NextResponse.json({ ok: true });
}
