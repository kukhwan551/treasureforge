"use client";

// app/login/page.tsx
// 이메일 + 비밀번호 로그인
// Google 버튼은 추후 handleGoogleLogin 함수만 추가하면 됩니다.

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/games";

  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.email.trim()) { setError("이메일을 입력해 주세요."); return; }
    if (!form.password)      { setError("비밀번호를 입력해 주세요."); return; }

    startTransition(async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });

      if (error) {
        // Supabase 에러 메시지를 한국어로 변환
        const msg =
          error.message === "Invalid login credentials"
            ? "이메일 또는 비밀번호가 올바르지 않습니다."
            : error.message === "Email not confirmed"
            ? "이메일 인증이 필요합니다. 받은 편지함을 확인해 주세요."
            : error.message;
        setError(msg);
        return;
      }

      router.push(next);
      router.refresh(); // 서버 컴포넌트 세션 갱신
    });
  }

  // ── 추후 Google 로그인 추가 시 이 함수만 uncomment ──
  // async function handleGoogleLogin() {
  //   await supabase.auth.signInWithOAuth({
  //     provider: "google",
  //     options: { redirectTo: `${location.origin}/auth/confirm?next=${next}` },
  //   });
  // }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f10] px-4">
      <div className="w-full max-w-sm">

        {/* 로고 */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center justify-center
            rounded-2xl border border-[#2a2924] bg-[#18181a] p-3">
            <CompassIcon />
          </div>
          <h1 className="text-xl font-semibold text-[#e8e4d9] tracking-tight">
            TreasureForge AI
          </h1>
          <p className="mt-1 text-sm text-[#5a5650]">계속하려면 로그인하세요</p>
        </div>

        {/* 카드 */}
        <div className="rounded-2xl border border-[#2a2924] bg-[#18181a] p-6">

          {/* ── 추후 Google 버튼 위치 ──
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="mb-4 flex w-full items-center justify-center gap-2.5
              rounded-xl border border-[#2a2924] bg-[#1e1e20] py-2.5
              text-sm text-[#c4bfb4] hover:border-[#3a3830] hover:bg-[#222220]
              transition-colors"
          >
            <GoogleIcon />
            Google로 계속하기
          </button>
          <div className="relative mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#2a2924]" />
            <span className="text-xs text-[#3a3830]">또는</span>
            <div className="h-px flex-1 bg-[#2a2924]" />
          </div>
          ── 여기까지 ── */}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* 이메일 */}
            <div className="space-y-1.5">
              <label htmlFor="email"
                className="block text-sm font-medium text-[#c4bfb4]">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className={inputCls(false)}
              />
            </div>

            {/* 비밀번호 */}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <label htmlFor="password"
                  className="block text-sm font-medium text-[#c4bfb4]">
                  비밀번호
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#5a5650] hover:text-[#b89a5a] transition-colors"
                >
                  비밀번호 찾기
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`${inputCls(false)} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                    text-[#4a4840] hover:text-[#7a756c] transition-colors"
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="rounded-lg border border-[#c0504a]/30
                bg-[#c0504a]/10 px-3.5 py-2.5 text-sm text-[#e07070]"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2
                rounded-xl bg-[#b89a5a] py-2.5
                text-sm font-medium text-[#0f0f10]
                hover:bg-[#c9aa6a] active:bg-[#a88a4a]
                disabled:opacity-60 disabled:cursor-not-allowed
                transition-colors
                focus-visible:outline focus-visible:outline-2
                focus-visible:outline-[#b89a5a] focus-visible:outline-offset-2"
            >
              {isPending
                ? <><SpinnerIcon /> 로그인 중…</>
                : "로그인"}
            </button>
          </form>
        </div>

        {/* 회원가입 링크 */}
        <p className="mt-5 text-center text-sm text-[#5a5650]">
          계정이 없으신가요?{" "}
          <Link
            href="/signup"
            className="text-[#b89a5a] hover:text-[#c9aa6a] transition-colors"
          >
            회원가입
          </Link>
        </p>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

function inputCls(hasError: boolean) {
  return [
    "w-full rounded-xl border bg-[#141414] px-3.5 py-2.5 text-sm",
    "text-[#e8e4d9] placeholder:text-[#3a3830]",
    "focus:outline-none focus:ring-1 transition-colors",
    hasError
      ? "border-[#c0504a]/60 focus:border-[#c0504a] focus:ring-[#c0504a]/30"
      : "border-[#2a2924] hover:border-[#3a3830] focus:border-[#b89a5a] focus:ring-[#b89a5a]/20",
  ].join(" ");
}

// ─────────────────────────────────────────────
// 아이콘
// ─────────────────────────────────────────────

function CompassIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="#b89a5a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      className="animate-spin" aria-hidden="true">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
