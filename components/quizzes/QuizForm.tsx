"use client";

// components/quizzes/QuizForm.tsx
// 수정사항:
// 1. autocomplete="off" + name 속성 변경 → 브라우저 자동완성 알림창 제거
// 2. 힌트를 퀴즈 레벨로 이동 (텍스트 힌트 + URL 힌트)
// 3. URL 힌트 클릭 시 새 탭으로 이동

import { useState } from "react";
import type { Quiz, QuizType, CreateQuizInput, UpdateQuizInput } from "@/types/post";
import { QUIZ_TYPE_LABEL } from "@/types/post";

// ─────────────────────────────────────────────
// 타입 확장 (hint_text, hint_url 포함)
// ─────────────────────────────────────────────

interface QuizFormData {
  type: QuizType;
  question: string;
  answer: string;
  options: string[];
  pass_count: number;
  explanation: string;
  score: number;
  hint_text: string;
  hint_url: string;
}

interface QuizFormProps {
  postId: string;
  initial?: Quiz & { hint_text?: string; hint_url?: string };
  onSave: (data: CreateQuizInput | UpdateQuizInput) => Promise<void>;
  onCancel: () => void;
}

const QUIZ_TYPES: QuizType[] = [
  "short_answer", "single_choice", "multi_choice", "ox",
];

const DEFAULT_OPTIONS = ["", "", "", ""];

// ─────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────

export default function QuizForm({ postId, initial, onSave, onCancel }: QuizFormProps) {
  const [form, setForm] = useState<QuizFormData>({
    type:        initial?.type        ?? "short_answer",
    question:    initial?.question    ?? "",
    answer:      initial?.answer      ?? "",
    options:     initial?.options?.length ? initial.options : [...DEFAULT_OPTIONS],
    pass_count:  initial?.pass_count  ?? 1,
    explanation: initial?.explanation ?? "",
    score:       initial?.score       ?? 10,
    hint_text:   initial?.hint_text   ?? "",
    hint_url:    initial?.hint_url    ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [urlError, setUrlError] = useState("");

  // ── 필드 변경 ──
  function set<K extends keyof QuizFormData>(key: K, value: QuizFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  // ── 보기 변경 ──
  function handleOption(idx: number, val: string) {
    const next = form.options.map((o, i) => (i === idx ? val : o));
    set("options", next);
  }

  function addOption() {
    if (form.options.length < 6) set("options", [...form.options, ""]);
  }

  function removeOption(idx: number) {
    if (form.options.length <= 2) return;
    set("options", form.options.filter((_, i) => i !== idx));
    if (form.type === "single_choice") {
      const cur = parseInt(form.answer);
      if (cur === idx)       set("answer", "0");
      else if (cur > idx)    set("answer", String(cur - 1));
    }
  }

  // ── 타입 변경 ──
  function handleTypeChange(t: QuizType) {
    setForm((prev) => ({
      ...prev,
      type:   t,
      answer: "",
      options: (t === "ox" || t === "short_answer")
        ? []
        : prev.options.length >= 2 ? prev.options : [...DEFAULT_OPTIONS],
    }));
  }

  // ── URL 유효성 검사 ──
  function validateUrl(url: string): boolean {
    if (!url) return true; // 비어있으면 통과
    try {
      const u = new URL(url);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  // ── 전체 유효성 검사 ──
  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.question.trim()) e.question = "문제를 입력해 주세요.";

    if (form.type === "short_answer" && !form.answer.trim())
      e.answer = "정답을 입력해 주세요.";
    if (form.type === "ox" && !form.answer)
      e.answer = "O 또는 X를 선택해 주세요.";
    if (form.type === "single_choice" && form.answer === "")
      e.answer = "정답 보기를 선택해 주세요.";
    if ((form.type === "single_choice" || form.type === "multi_choice") &&
        form.options.some((o) => !o.trim()))
      e.options = "모든 보기를 입력해 주세요.";

    if (form.hint_url && !validateUrl(form.hint_url)) {
      setUrlError("올바른 URL 형식이 아닙니다. (https://... 형태로 입력)");
      e.hint_url = "invalid";
    } else {
      setUrlError("");
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── 제출 ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({
        post_id:     postId,
        type:        form.type,
        question:    form.question.trim(),
        answer:      form.answer.trim(),
        options:     (form.type === "single_choice" || form.type === "multi_choice")
                       ? form.options : [],
        pass_count:  form.type === "multi_choice" ? form.pass_count : 1,
        total_count: form.type === "multi_choice" ? form.options.length : 1,
        explanation: form.explanation.trim() || null,
        score:       form.score,
        hint_text:   form.hint_text.trim() || null,
        hint_url:    form.hint_url.trim()  || null,
      } as CreateQuizInput);
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────
  // 렌더
  // ─────────────────────────────────────────────

  return (
    // autocomplete="off" — 폼 전체 자동완성 끄기
    <form onSubmit={handleSubmit} noValidate autoComplete="off" className="space-y-5">

      {/* 퀴즈 유형 */}
      <div>
        <p className="mb-2 text-xs font-medium text-[#c4bfb4]">퀴즈 유형</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {QUIZ_TYPES.map((t) => (
            <button
              key={t} type="button"
              aria-pressed={form.type === t}
              onClick={() => handleTypeChange(t)}
              className={`rounded-xl border py-2.5 text-xs font-medium transition-all
                ${form.type === t
                  ? "border-[#b89a5a] bg-[#b89a5a]/15 text-[#d4b06a]"
                  : "border-[#2a2924] bg-[#18181a] text-[#7a756c] hover:border-[#3a3830]"
                }`}
            >
              {QUIZ_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {/* 문제 — name을 quiz-question으로 설정해 자동완성 방지 */}
      <Field label="문제" required error={errors.question}>
        <textarea
          name="quiz-question"
          autoComplete="off"
          rows={3}
          value={form.question}
          onChange={(e) => set("question", e.target.value)}
          placeholder="문제를 입력하세요."
          className={`${iCls(!!errors.question)} resize-none`}
        />
      </Field>

      {/* 정답 영역 — 타입별 분기 */}
      {form.type === "short_answer" && (
        <Field label="정답" required error={errors.answer}>
          <input
            type="text"
            name="quiz-answer"
            autoComplete="off"
            value={form.answer}
            onChange={(e) => set("answer", e.target.value)}
            placeholder="정답을 입력하세요."
            className={iCls(!!errors.answer)}
          />
        </Field>
      )}

      {form.type === "ox" && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[#c4bfb4]">
            정답 <span className="text-[#b89a5a]">*</span>
          </p>
          <div className="flex gap-3">
            {["O", "X"].map((v) => (
              <button
                key={v} type="button"
                aria-pressed={form.answer === v}
                onClick={() => set("answer", v)}
                className={`flex-1 rounded-xl border py-3 text-lg font-bold transition-all
                  ${form.answer === v
                    ? v === "O"
                      ? "border-[#4a9d6f] bg-[#4a9d6f]/15 text-[#4a9d6f]"
                      : "border-[#c0504a] bg-[#c0504a]/15 text-[#c0504a]"
                    : "border-[#2a2924] bg-[#18181a] text-[#5a5650] hover:border-[#3a3830]"
                  }`}
              >
                {v}
              </button>
            ))}
          </div>
          {errors.answer && <Err>{errors.answer}</Err>}
        </div>
      )}

      {(form.type === "single_choice" || form.type === "multi_choice") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#c4bfb4]">보기</p>
            <button
              type="button" onClick={addOption}
              disabled={form.options.length >= 6}
              className="text-xs text-[#b89a5a] hover:text-[#c9aa6a]
                disabled:opacity-30 transition-colors"
            >
              + 보기 추가
            </button>
          </div>

          <div className="space-y-2">
            {form.options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {/* 정답 선택 버튼 */}
                {form.type === "single_choice" ? (
                  <button type="button"
                    onClick={() => set("answer", String(idx))}
                    className={`shrink-0 h-4 w-4 rounded-full border-2 transition-colors
                      ${form.answer === String(idx)
                        ? "border-[#b89a5a] bg-[#b89a5a]"
                        : "border-[#3a3830]"
                      }`}
                    aria-label={`보기 ${idx + 1} 정답`}
                  />
                ) : (
                  <button type="button"
                    onClick={() => {
                      const cur  = form.answer ? form.answer.split(",") : [];
                      const s    = String(idx);
                      const next = cur.includes(s)
                        ? cur.filter((x) => x !== s)
                        : [...cur, s];
                      set("answer", next.sort().join(","));
                    }}
                    className={`shrink-0 h-4 w-4 rounded border-2 transition-colors
                      ${form.answer.split(",").includes(String(idx))
                        ? "border-[#b89a5a] bg-[#b89a5a]"
                        : "border-[#3a3830]"
                      }`}
                    aria-label={`보기 ${idx + 1} 정답`}
                  />
                )}
                {/* 보기 입력 — name을 quiz-option-N으로 설정 */}
                <input
                  type="text"
                  name={`quiz-option-${idx}`}
                  autoComplete="off"
                  value={opt}
                  onChange={(e) => handleOption(idx, e.target.value)}
                  placeholder={`보기 ${idx + 1}`}
                  className={`${iCls(false)} flex-1`}
                />
                <button type="button" onClick={() => removeOption(idx)}
                  disabled={form.options.length <= 2}
                  className="shrink-0 text-[#3a3830] hover:text-[#e07070]
                    disabled:opacity-20 transition-colors">
                  <XIcon />
                </button>
              </div>
            ))}
          </div>

          {errors.options && <Err>{errors.options}</Err>}
          {errors.answer  && <Err>{errors.answer}</Err>}

          <p className="text-[11px] text-[#4a4840]">
            {form.type === "single_choice"
              ? "● 클릭해서 정답 보기를 선택하세요."
              : "■ 클릭해서 정답 보기를 모두 선택하세요."}
          </p>

          {/* 복수형 통과 기준 */}
          {form.type === "multi_choice" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#c4bfb4] shrink-0">
                {form.options.length}개 중
              </span>
              <input
                type="number" min={1} max={form.options.length}
                name="quiz-pass-count"
                autoComplete="off"
                value={form.pass_count}
                onChange={(e) => set("pass_count", Number(e.target.value))}
                className={`${iCls(false)} w-20`}
              />
              <span className="text-xs text-[#c4bfb4] shrink-0">개 이상 맞추면 통과</span>
            </div>
          )}
        </div>
      )}

      {/* ── 힌트 섹션 (퀴즈별) ── */}
      <div className="rounded-xl border border-[#2a2924] bg-[#141414] p-4 space-y-3">
        <p className="text-xs font-medium text-[#c4bfb4]">
          힌트
          <span className="ml-1.5 text-[11px] text-[#4a4840] font-normal">
            (선택 — 참여자가 요청 시 공개)
          </span>
        </p>

        {/* 텍스트 힌트 */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-[#5a5650]">텍스트 힌트</label>
          <textarea
            name="quiz-hint-text"
            autoComplete="off"
            rows={2}
            value={form.hint_text}
            onChange={(e) => set("hint_text", e.target.value)}
            placeholder="정답을 유추할 수 있는 힌트를 입력하세요."
            className={`${iCls(false)} resize-none`}
          />
        </div>

        {/* URL 힌트 */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-[#5a5650]">
            URL 힌트
            <span className="ml-1 text-[#3a3830]">
              (클릭 시 새 탭으로 이동)
            </span>
          </label>
          <input
            type="url"
            name="quiz-hint-url"
            autoComplete="off"
            value={form.hint_url}
            onChange={(e) => {
              set("hint_url", e.target.value);
              setUrlError("");
            }}
            onBlur={() => {
              if (form.hint_url && !validateUrl(form.hint_url)) {
                setUrlError("올바른 URL 형식이 아닙니다. (https://... 형태)");
              } else {
                setUrlError("");
              }
            }}
            placeholder="https://example.com/hint"
            className={iCls(!!urlError)}
          />
          {urlError && <Err>{urlError}</Err>}

          {/* URL 미리보기 */}
          {form.hint_url && validateUrl(form.hint_url) && (
            <a
              href={form.hint_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] text-[#b89a5a]
                hover:text-[#c9aa6a] transition-colors"
            >
              <LinkIcon />
              링크 미리보기 →
            </a>
          )}
        </div>
      </div>

      {/* 점수 */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-[#c4bfb4] shrink-0">배점</label>
        <input
          type="number" min={0} max={100}
          name="quiz-score"
          autoComplete="off"
          value={form.score}
          onChange={(e) => set("score", Number(e.target.value))}
          className={`${iCls(false)} w-24`}
        />
        <span className="text-xs text-[#5a5650]">점</span>
      </div>

      {/* 해설 */}
      <Field label="해설" hint="(선택 — 정답 공개 후 표시)">
        <textarea
          name="quiz-explanation"
          autoComplete="off"
          rows={2}
          value={form.explanation}
          onChange={(e) => set("explanation", e.target.value)}
          placeholder="정답 공개 후 보여줄 해설을 입력하세요."
          className={`${iCls(false)} resize-none`}
        />
      </Field>

      {/* 버튼 */}
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button" onClick={onCancel}
          className="rounded-xl border border-[#2a2924] px-4 py-2 text-sm
            text-[#7a756c] hover:border-[#3a3830] transition-colors">
          취소
        </button>
        <button
          type="submit" disabled={saving}
          className="flex items-center gap-1.5 rounded-xl bg-[#b89a5a]
            px-5 py-2 text-sm font-medium text-[#0f0f10]
            hover:bg-[#c9aa6a] disabled:opacity-60 transition-colors">
          {saving ? "저장 중…" : initial ? "퀴즈 수정" : "퀴즈 추가"}
        </button>
      </div>

    </form>
  );
}

// ─────────────────────────────────────────────
// 서브 컴포넌트
// ─────────────────────────────────────────────

function Field({
  label, hint, required, error, children,
}: {
  label: string; hint?: string; required?: boolean;
  error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-1.5">
        <label className="text-xs font-medium text-[#c4bfb4]">
          {label}
          {required && <span className="ml-0.5 text-[#b89a5a]">*</span>}
        </label>
        {hint && <span className="text-[11px] text-[#4a4840]">{hint}</span>}
      </div>
      {children}
      {error && <Err>{error}</Err>}
    </div>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-[#e07070]" role="alert">{children}</p>;
}

function iCls(hasErr: boolean) {
  return [
    "w-full rounded-xl border bg-[#141414] px-3.5 py-2.5 text-sm",
    "text-[#e8e4d9] placeholder:text-[#3a3830] transition-colors",
    "focus:outline-none focus:ring-1",
    hasErr
      ? "border-[#c0504a]/60 focus:border-[#c0504a] focus:ring-[#c0504a]/30"
      : "border-[#2a2924] hover:border-[#3a3830] focus:border-[#b89a5a] focus:ring-[#b89a5a]/20",
  ].join(" ");
}

// ─────────────────────────────────────────────
// 아이콘
// ─────────────────────────────────────────────

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  );
}
