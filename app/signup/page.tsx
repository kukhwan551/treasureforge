"use client";

// app/signup/page.tsx
// 이메일 + 비밀번호 회원가입

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false); // 가입 완료 → 이메일 확인 안내

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((err) => ({ ...err, [e.target.name]: undefined }));
    setServerError(null);
  }

  function validate() {
    const e: Partial<typeof form> = {};
    if (!form.email.trim())        e.email = "이메일을 입력해 주세요.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "올바른 이메일 형식이 아닙니다.";
    if (!form.password)            e.password = "비밀번호를 입력해 주세요.";
    else if (form.password.length < 8) e.password = "비밀번호는 8자 이상이어야 합니다.";
    if (form.password !== form.passwordConfirm)
      e.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    startTransition(async () => {
      const { error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          // 가입 후 이메일 인증 → /auth/confirm 으로 리디렉션
          emailRedirectTo: `${location.origin}/auth/confirm`,
        },
      });

      if (error) {
        const msg =
          error.message === "User already registered"
            ? "이미 가입된 이메일입니다. 로그인을 시도해 주세요."
            : error.message;
        setServerError(msg);
        return;
      }

      setDone(true);
    });
  }

  // ── 가입 완료 화면 ──
  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f10] px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-4 inline-flex items-center justify-center
            rounded-full border border-[#4a9d6f]/40 bg-[#4a9d6f]/10 p-4">
            <MailIcon />
          </div>
          <h2 className="text-lg font-semibold text-[#e8e4d9]">이메일을 확인해 주세요</h2>
          <p className="mt-2 text-sm text-[#7a756c] leading-relaxed">
            <span className="text-[#b89a5a]">{form.email}</span>로<br />
            인증 링크를 발송했습니다.<br />
            링크를 클릭하면 자동으로 로그인됩니다.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm text-[#5a5650] hover:text-[#b89a5a] transition-colors"
          >
            ← 로그인 페이지로
          </Link>
        </div>
      </div>
    );
  }

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
          <p className="mt-1 text-sm text-[#5a5650]">무료로 시작하세요</p>
        </div>

        <div className="rounded-2xl border border-[#2a2924] bg-[#18181a] p-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            <Field label="이메일" error={errors.email}>
              <input
                id="email" name="email" type="email"
                autoComplete="email" autoFocus
                value={form.email} onChange={handleChange}
                placeholder="you@example.com"
                className={inputCls(!!errors.email)}
              />
            </Field>

            <Field label="비밀번호" hint="8자 이상" error={errors.password}>
              <input
                id="password" name="password" type="password"
                autoComplete="new-password"
                value={form.password} onChange={handleChange}
                placeholder="••••••••"
                className={inputCls(!!errors.password)}
              />
            </Field>

            <Field label="비밀번호 확인" error={errors.passwordConfirm}>
              <input
                id="passwordConfirm" name="passwordConfirm" type="password"
                autoComplete="new-password"
                value={form.passwordConfirm} onChange={handleChange}
                placeholder="••••••••"
                className={inputCls(!!errors.passwordConfirm)}
              />
            </Field>

            {serverError && (
              <div className="rounded-lg border border-[#c0504a]/30
                bg-[#c0504a]/10 px-3.5 py-2.5 text-sm text-[#e07070]"
                role="alert"
              >
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2
                rounded-xl bg-[#b89a5a] py-2.5
                text-sm font-medium text-[#0f0f10]
                hover:bg-[#c9aa6a] disabled:opacity-60 disabled:cursor-not-allowed
                transition-colors"
            >
              {isPending ? <><SpinnerIcon /> 가입 중…</> : "회원가입"}
            </button>

          </form>
        </div>

        <p className="mt-5 text-center text-sm text-[#5a5650]">
          이미 계정이 있으신가요?{" "}
          <Link href="/login"
            className="text-[#b89a5a] hover:text-[#c9aa6a] transition-colors">
            로그인
          </Link>
        </p>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 서브 컴포넌트
// ─────────────────────────────────────────────

function Field({
  label, hint, error, children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium text-[#c4bfb4]">{label}</label>
        {hint && <span className="text-[11px] text-[#4a4840]">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-[#e07070]" role="alert">{error}</p>}
    </div>
  );
}

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

function CompassIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="#b89a5a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="#4a9d6f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
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
