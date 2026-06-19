"use client";

// app/games/new/page.tsx
// NewGameForm을 별도 파일로 분리하지 않고 한 파일에 모두 포함합니다.
// components/games/NewGameForm.tsx 가 없어도 바로 동작합니다.

import { useState, useTransition, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

type GameDifficulty = "easy" | "medium" | "hard";
type TargetAgeGroup = "child" | "teen" | "adult" | "senior" | "all";

interface FormState {
  title: string;
  description: string;
  difficulty: GameDifficulty;
  target_age: TargetAgeGroup;
}

// ─────────────────────────────────────────────
// 옵션 상수
// ─────────────────────────────────────────────

const DIFFICULTY_OPTIONS: {
  value: GameDifficulty; label: string; hint: string; selClass: string;
}[] = [
  { value: "easy",   label: "쉬움",   hint: "단순한 단서, 짧은 탐험", selClass: "border-[#4a9d6f] bg-[#4a9d6f]/10" },
  { value: "medium", label: "보통",   hint: "균형 잡힌 난이도",        selClass: "border-[#b89a5a] bg-[#b89a5a]/10" },
  { value: "hard",   label: "어려움", hint: "복잡한 퍼즐, 많은 단서",  selClass: "border-[#c0504a] bg-[#c0504a]/10" },
];

const AGE_OPTIONS: { value: TargetAgeGroup; label: string; emoji: string }[] = [
  { value: "child",  label: "어린이", emoji: "🐣" },
  { value: "teen",   label: "청소년", emoji: "🎒" },
  { value: "adult",  label: "성인",   emoji: "🧭" },
  { value: "senior", label: "시니어", emoji: "🌿" },
  { value: "all",    label: "전 연령", emoji: "✨" },
];

// ─────────────────────────────────────────────
// 유효성 검사
// ─────────────────────────────────────────────

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const e: Partial<Record<keyof FormState, string>> = {};
  if (!form.title.trim())           e.title = "게임 제목을 입력해 주세요.";
  else if (form.title.trim().length < 2) e.title = "제목은 최소 2자 이상이어야 합니다.";
  else if (form.title.length > 100) e.title = "제목은 100자를 초과할 수 없습니다.";
  if (form.description.length > 500) e.description = "설명은 500자를 초과할 수 없습니다.";
  return e;
}

// ─────────────────────────────────────────────
// 페이지
// ─────────────────────────────────────────────

function NewGamePageInner() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    difficulty: "medium",
    target_age: "all",
  });

  const [errors, setErrors]     = useState<Partial<Record<keyof FormState, string>>>({});
  const [touched, setTouched]   = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState<string | null>(null);
  const [templatePosts,  setTemplatePosts]  = useState<Record<string, unknown>[]>([]);

  const searchParams = useSearchParams();

  // ── 템플릿에서 시작 ──
  useEffect(() => {
    if (searchParams.get("from") !== "template") return;
    const raw = sessionStorage.getItem("template_draft");
    if (!raw) return;
    try {
      const t = JSON.parse(raw);
      setForm((f) => ({
        ...f,
        title:       t.title       ?? f.title,
        description: t.description ?? f.description,
        difficulty:  t.difficulty  ?? f.difficulty,
        target_age:  t.target_age  ?? f.target_age,
      }));
      setTemplateTitle(t.title);
      setTemplatePosts(t.template_posts ?? []);
      sessionStorage.removeItem("template_draft");
    } catch {}
  }, [searchParams]);

  // ── 이벤트 핸들러 ──
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    const next = { ...form, [name]: value };
    setForm(next);
    if (touched[name as keyof FormState]) {
      setErrors(validate(next));
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setTouched((t) => ({ ...t, [e.target.name]: true }));
    setErrors(validate(form));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setTouched({ title: true, description: true });
      return;
    }

    setSubmitError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title:       form.title.trim(),
            description: form.description.trim() || null,
            difficulty:  form.difficulty,
            target_age:  form.target_age,
          }),
        });

        const json = await res.json();
        if (json.error) throw new Error(json.error.message);

        const gameId = json.data.id;

        // 템플릿 포스트 일괄 생성
        if (templatePosts.length > 0) {
          const sorted = [...templatePosts].sort(
            (a, b) => ((a.order_index as number) ?? 0) - ((b.order_index as number) ?? 0)
          );
          await Promise.all(
            sorted.map((p, i) =>
              fetch("/api/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  game_id:        gameId,
                  name:           p.name,
                  description:    p.description ?? null,
                  order_index:    i,
                  order_mode:     p.order_mode    ?? "free",
                  mission_type:   p.mission_type  ?? "quiz",
                  time_limit_sec: p.time_limit_sec ?? null,
                  score:          p.score          ?? 10,
                  hint_1:         p.hint_1         ?? null,
                  hint_2:         p.hint_2         ?? null,
                  hint_3:         p.hint_3         ?? null,
                }),
              })
            )
          );
          // 포스트 편집 화면으로 바로 이동
          router.push(`/games/${gameId}/posts/editor`);
        } else {
          router.push("/games");
        }
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "게임 생성 중 오류가 발생했습니다."
        );
      }
    });
  }

  // ── 미리보기용 레이블 ──
  const diffLabel = DIFFICULTY_OPTIONS.find((d) => d.value === form.difficulty)?.label ?? "";
  const ageLabel  = AGE_OPTIONS.find((a) => a.value === form.target_age)?.label ?? "";

  return (
    <div className="min-h-screen bg-[#0f0f10] text-[#e8e4d9]">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">

        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => router.push("/games")}
              className="text-xs font-medium tracking-widest text-[#b89a5a]
                uppercase hover:text-[#c9aa6a] transition-colors"
            >
              게임 관리
            </button>
            <span className="text-[#3a3830]">/</span>
            <span className="text-xs text-[#5a5650] tracking-widest uppercase">
              새 게임
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-[#e8e4d9] tracking-tight">
            새 보물찾기 게임 만들기
          </h1>
          <p className="mt-1.5 text-sm text-[#7a756c]">
            기본 정보를 입력하면 바로 초안이 저장됩니다.
            지도와 미션은 이후 단계에서 추가할 수 있습니다.
          </p>
        </div>

        {/* 폼 */}
        {templateTitle && (
          <div className="mb-4 rounded-xl border border-[#b89a5a]/30 bg-[#b89a5a]/10
            px-4 py-3 flex items-center gap-2">
            <span className="text-lg">📋</span>
            <div>
              <p className="text-sm font-medium text-[#b89a5a]">템플릿 적용됨</p>
              <p className="text-xs text-[#7a756c]">"{templateTitle}" 기반 · 포스트 {templatePosts.length}개 자동 생성 예정. 나머지를 완성해 주세요.</p>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          {/* 제목 */}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor="title" className="text-sm font-medium text-[#c4bfb4]">
                게임 제목 <span className="text-[#b89a5a]">*</span>
              </label>
              <span className="text-[11px] tabular-nums text-[#4a4840]">
                {form.title.length}/100
              </span>
            </div>
            <input
              id="title" name="title" type="text"
              value={form.title} onChange={handleChange} onBlur={handleBlur}
              maxLength={100} autoFocus
              placeholder="예: 조선 왕조의 숨겨진 보물"
              className={inputCls(!!(touched.title && errors.title))}
            />
            {touched.title && errors.title && (
              <p className="text-xs text-[#e07070]" role="alert">{errors.title}</p>
            )}
          </div>

          {/* 설명 */}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor="description" className="text-sm font-medium text-[#c4bfb4]">
                게임 설명
              </label>
              <span className="text-[11px] tabular-nums text-[#4a4840]">
                {form.description.length}/500
              </span>
            </div>
            <textarea
              id="description" name="description"
              value={form.description} onChange={handleChange} onBlur={handleBlur}
              maxLength={500} rows={4}
              placeholder="참여자들에게 보여줄 게임 소개를 입력하세요."
              className={`${inputCls(!!(touched.description && errors.description))} resize-none`}
            />
            {touched.description && errors.description && (
              <p className="text-xs text-[#e07070]" role="alert">{errors.description}</p>
            )}
          </div>

          {/* 난이도 */}
          <div>
            <p className="mb-2 text-sm font-medium text-[#c4bfb4]">난이도</p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {DIFFICULTY_OPTIONS.map((opt) => {
                const selected = form.difficulty === opt.value;
                return (
                  <button
                    key={opt.value} type="button"
                    aria-pressed={selected}
                    onClick={() => setForm((f) => ({ ...f, difficulty: opt.value }))}
                    className={`relative rounded-xl border px-3 py-3.5 text-left transition-all
                      focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b89a5a]
                      ${selected
                        ? opt.selClass
                        : "border-[#2a2924] bg-[#18181a] hover:border-[#3a3830]"
                      }`}
                  >
                    <span className={`block text-sm font-medium
                      ${selected ? "text-white" : "text-[#e8e4d9]"}`}>
                      {opt.label}
                    </span>
                    <span className={`mt-0.5 block text-[11px]
                      ${selected ? "text-[#9a8f7a]" : "text-[#5a5650]"}`}>
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 대상 연령 */}
          <div>
            <p className="mb-2 text-sm font-medium text-[#c4bfb4]">대상 연령</p>
            <div className="flex flex-wrap gap-2">
              {AGE_OPTIONS.map((opt) => {
                const selected = form.target_age === opt.value;
                return (
                  <button
                    key={opt.value} type="button"
                    aria-pressed={selected}
                    onClick={() => setForm((f) => ({ ...f, target_age: opt.value }))}
                    className={`flex items-center gap-1.5 rounded-full border
                      px-3.5 py-1.5 text-sm transition-all
                      focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b89a5a]
                      ${selected
                        ? "border-[#b89a5a] bg-[#b89a5a]/15 text-[#d4b06a]"
                        : "border-[#2a2924] bg-[#18181a] text-[#7a756c] hover:border-[#3a3830] hover:text-[#9a9590]"
                      }`}
                  >
                    <span aria-hidden="true">{opt.emoji}</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 미리보기 */}
          <div className="rounded-xl border border-[#2a2924] bg-[#18181a] px-4 py-3.5">
            <p className="mb-2 text-[10px] font-medium tracking-widest
              text-[#4a4840] uppercase">미리보기</p>
            <p className={`text-sm font-semibold truncate
              ${form.title ? "text-[#e8e4d9]" : "text-[#3a3830]"}`}>
              {form.title || "게임 제목이 여기에 표시됩니다"}
            </p>
            {form.description && (
              <p className="mt-1 text-xs text-[#5a5650] line-clamp-2">
                {form.description}
              </p>
            )}
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              <Badge>{diffLabel}</Badge>
              <Badge>{ageLabel}</Badge>
              <Badge muted>초안</Badge>
            </div>
          </div>

          {/* 서버 에러 */}
          {submitError && (
            <div className="rounded-lg border border-[#c0504a]/30 bg-[#c0504a]/10
              px-4 py-3 text-sm text-[#e07070]" role="alert">
              {submitError}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-2">
            <button
              type="button"
              onClick={() => router.push("/games")}
              className="rounded-xl border border-[#2a2924] px-5 py-2.5 text-sm
                text-[#7a756c] hover:border-[#3a3830] hover:text-[#9a9590]
                transition-colors"
            >
              취소
            </button>
            <button
              type="submit" disabled={isPending}
              className="flex items-center justify-center gap-2 rounded-xl
                bg-[#b89a5a] px-6 py-2.5 text-sm font-medium text-[#0f0f10]
                hover:bg-[#c9aa6a] disabled:opacity-60 disabled:cursor-not-allowed
                transition-colors"
            >
              {isPending ? (
                <><SpinnerIcon /> 저장 중…</>
              ) : (
                <><CompassIcon /> 게임 초안 저장</>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 헬퍼 컴포넌트
// ─────────────────────────────────────────────

function Badge({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5
      text-[11px] font-medium
      ${muted ? "bg-[#2a2924] text-[#5a5650]" : "bg-[#b89a5a]/15 text-[#b89a5a]"}`}>
      {children}
    </span>
  );
}

function inputCls(hasError: boolean) {
  return [
    "w-full rounded-xl border bg-[#18181a] px-3.5 py-2.5 text-sm",
    "text-[#e8e4d9] placeholder:text-[#3a3830] transition-colors",
    "focus:outline-none focus:ring-1",
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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
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

export default function NewGamePage() {
  return (
    <Suspense fallback={null}>
      <NewGamePageInner />
    </Suspense>
  );
}
