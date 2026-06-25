"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "done" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function NotifyForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;

    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setStatus("error");
      setMessage("이메일 주소를 다시 확인해 주세요.");
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setStatus("done");
      setMessage("등록됐어요! 출시되면 가장 먼저 알려드릴게요. 🩲");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("앗, 잠시 후 다시 시도해 주세요.");
    }
  }

  if (status === "done") {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-panty-pink/40 bg-panty-pink/10 px-5 py-4 text-center">
        <p className="text-sm font-medium text-panty-ink">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm" noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="이메일 주소"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          aria-label="이메일 주소"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-panty-panel px-4 py-3 text-sm text-panty-ink placeholder:text-panty-mute outline-none transition focus:border-panty-pink/60 focus:ring-2 focus:ring-panty-pink/20"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="shrink-0 rounded-xl bg-gradient-to-r from-panty-pink to-panty-yellow px-5 py-3 text-sm font-bold text-panty-bg transition active:scale-95 disabled:opacity-60"
        >
          {status === "loading" ? "등록 중…" : "출시 알림 받기"}
        </button>
      </div>
      <p
        className={`mt-2 min-h-[1.25rem] text-center text-xs ${
          status === "error" ? "text-panty-pink" : "text-panty-mute"
        }`}
      >
        {message || "출시 소식만 딱 한 번 보내드려요. 스팸 없음."}
      </p>
    </form>
  );
}
