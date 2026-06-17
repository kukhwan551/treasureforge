"use client";

// components/quizzes/AiQuizGenerator.tsx
// 수정: api.anthropic.com 직접 호출 → /api/ai/quiz 프록시 호출

import { useState } from "react";
import type { Quiz, QuizType, CreateQuizInput } from "@/types/post";

interface GameContext {
  title: string;
  description: string | null;
  difficulty: "easy" | "medium" | "hard";
  target_age: "child" | "teen" | "adult" | "senior" | "all";
}

interface PostContext {
  id: string;
  name: string;
  description: string | null;
}

interface AiQuizGeneratorProps {
  game: GameContext;
  post: PostContext;
  onSelect: (input: CreateQuizInput) => void;
  onClose: () => void;
}

interface QuizDraft {
  type: QuizType;
  question: string;
  answer: string;
  options: string[];
  pass_count: number;
  explanation: string;
  hint_text: string;
  score: number;
}

const DIFFICULTY_LABEL = { easy: "쉬움", medium: "보통", hard: "어려움" };
const AGE_LABEL = {
  child: "어린이", teen: "청소년", adult: "성인",
  senior: "시니어", all: "전 연령",
};

const QUIZ_TYPE_OPTIONS: { value: QuizType; label: string; desc: string }[] = [
  { value: "ox",            label: "O/X",     desc: "맞으면 O, 틀리면 X" },
  { value: "short_answer",  label: "단답형",  desc: "직접 답 입력" },
  { value: "single_choice", label: "객관식",  desc: "4지선다 중 1개 선택" },
  { value: "multi_choice",  label: "복수선택", desc: "여러 개 선택" },
];

const ERA_OPTIONS = [
  "선택 안 함", "선사시대", "삼국시대", "고려시대", "조선시대",
  "근현대 (1900~)", "현재", "기타",
];

export default function AiQuizGenerator({
  game, post, onSelect, onClose,
}: AiQuizGeneratorProps) {
  const [quizType, setQuizType]           = useState<QuizType>("single_choice");
  const [era, setEra]                     = useState("선택 안 함");
  const [customEra, setCustomEra]         = useState("");
  const [specialRequest, setSpecialRequest] = useState("");
  const [count, setCount]                 = useState(3);
  const [loading, setLoading]             = useState(false);
  const [drafts, setDrafts]               = useState<QuizDraft[]>([]);
  const [error, setError]                 = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx]     = useState<number | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setDrafts([]);
    setSelectedIdx(null);

    const eraStr = era === "기타" ? customEra : era === "선택 안 함" ? "" : era;

    const systemPrompt = `당신은 보물찾기 게임용 퀴즈를 생성하는 전문가입니다.
주어진 조건에 맞는 퀴즈를 정확히 JSON 배열 형식으로만 출력하세요.
다른 설명이나 마크다운 없이 순수 JSON만 출력하세요.`;

    const userPrompt = `다음 조건으로 퀴즈 ${count}개를 생성해주세요.

=== 게임 정보 ===
게임 제목: ${game.title}
게임 설명: ${game.description || "없음"}
난이도: ${DIFFICULTY_LABEL[game.difficulty]}
대상 연령: ${AGE_LABEL[game.target_age]}

=== 포스트 정보 ===
포스트 이름: ${post.name}
포스트 설명: ${post.description || "없음"}

=== 퀴즈 조건 ===
퀴즈 유형: ${getTypeLabel(quizType)}
${eraStr ? `시대/배경: ${eraStr}` : ""}
${specialRequest ? `특별 요청: ${specialRequest}` : ""}

=== 출력 형식 (JSON 배열) ===
[
  {
    "type": "${quizType}",
    "question": "문제 내용",
    "answer": "${getAnswerFormat(quizType)}",
    "options": ${quizType === "ox" || quizType === "short_answer" ? "[]" : '["보기1", "보기2", "보기3", "보기4"]'},
    "pass_count": ${quizType === "multi_choice" ? 2 : 1},
    "explanation": "정답 해설 (1~2문장)",
    "hint_text": "힌트 내용 (짧게)",
    "score": ${game.difficulty === "easy" ? 10 : game.difficulty === "medium" ? 20 : 30}
  }
]

=== 규칙 ===
- ${AGE_LABEL[game.target_age]} 수준에 맞는 언어와 내용 사용
- 난이도 "${DIFFICULTY_LABEL[game.difficulty]}"에 맞게 조정
- 포스트 이름(${post.name})과 직접 관련된 퀴즈여야 함
- 객관식이면 반드시 4개의 보기 제공
- 단답형이면 options는 빈 배열 []
- OX형이면 answer는 "O" 또는 "X", options는 빈 배열 []
- 복수선택이면 answer는 쉼표로 구분된 인덱스 (예: "0,2")
- JSON만 출력, 다른 텍스트 없음`;

    try {
      // ★ 직접 호출 대신 Next.js 프록시 사용
      const res = await fetch("/api/ai/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model:      "claude-sonnet-4-6",
          max_tokens: 2000,
          system:     systemPrompt,
          messages:   [{ role: "user", content: userPrompt }],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? `오류: ${res.status}`);
      }

      const data = await res.json();
      const text = data.content?.[0]?.text ?? "";

      const clean = text.replace(/```json|```/g, "").trim();
      const parsed: QuizDraft[] = JSON.parse(clean);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("퀴즈를 생성하지 못했습니다. 다시 시도해주세요.");
      }

      setDrafts(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(draft: QuizDraft, idx: number) {
    setSelectedIdx(idx);
    const input: CreateQuizInput = {
      post_id:     post.id,
      type:        draft.type,
      question:    draft.question,
      answer:      draft.answer,
      options:     draft.options ?? [],
      pass_count:  draft.pass_count ?? 1,
      total_count: draft.options?.length ?? 0,
      explanation: draft.explanation ?? "",
      hint_text:   draft.hint_text ?? "",
      hint_url:    "",
      score:       draft.score ?? 10,
    };
    onSelect(input);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}/>

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto
        bg-[#18181a] border border-[#2a2924] rounded-3xl shadow-2xl mx-4">

        {/* 헤더 */}
        <div className="sticky top-0 bg-[#18181a] border-b border-[#2a2924]
          px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-[#e8e4d9]">✨ AI 퀴즈 자동 생성</h2>
            <p className="text-xs text-[#5a5650] mt-0.5">📍 {post.name}</p>
          </div>
          <button onClick={onClose}
            className="rounded-xl border border-[#2a2924] p-2 text-[#5a5650]
              hover:text-[#9a9590] transition-colors">
            <CloseIcon/>
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* 자동 반영 정보 */}
          <div className="rounded-xl border border-[#b89a5a]/20 bg-[#b89a5a]/5 px-4 py-3">
            <p className="text-xs font-medium text-[#b89a5a] mb-2">📋 게임 설정 자동 반영</p>
            <div className="flex flex-wrap gap-2">
              <Tag>🎯 {DIFFICULTY_LABEL[game.difficulty]}</Tag>
              <Tag>👥 {AGE_LABEL[game.target_age]}</Tag>
              <Tag>🎮 {game.title}</Tag>
              {post.description && (
                <Tag>📝 {post.description.slice(0, 20)}{post.description.length > 20 ? "…" : ""}</Tag>
              )}
            </div>
          </div>

          {/* 퀴즈 유형 */}
          <div>
            <label className="block text-sm font-medium text-[#c4bfb4] mb-2">
              퀴즈 유형 <span className="text-[#b89a5a]">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {QUIZ_TYPE_OPTIONS.map((opt) => {
                const sel = quizType === opt.value;
                return (
                  <button key={opt.value} type="button"
                    onClick={() => setQuizType(opt.value)}
                    className={`rounded-xl border px-3 py-3 text-left transition-all
                      ${sel
                        ? "border-[#b89a5a] bg-[#b89a5a]/15"
                        : "border-[#2a2924] bg-[#141414] hover:border-[#3a3830]"
                      }`}>
                    <span className={`block text-sm font-semibold
                      ${sel ? "text-[#b89a5a]" : "text-[#7a756c]"}`}>
                      {opt.label}
                    </span>
                    <span className="block text-[10px] text-[#5a5650] mt-0.5">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 시대/배경 */}
          <div>
            <label className="block text-sm font-medium text-[#c4bfb4] mb-2">
              시대 / 배경
              <span className="ml-1.5 text-[11px] text-[#4a4840] font-normal">(선택)</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {ERA_OPTIONS.map((e) => (
                <button key={e} type="button"
                  onClick={() => setEra(e)}
                  className={`rounded-full border px-3 py-1 text-xs transition-all
                    ${era === e
                      ? "border-[#b89a5a] bg-[#b89a5a]/15 text-[#b89a5a]"
                      : "border-[#2a2924] text-[#5a5650] hover:border-[#3a3830]"
                    }`}>
                  {e}
                </button>
              ))}
            </div>
            {era === "기타" && (
              <input type="text" value={customEra}
                onChange={(e) => setCustomEra(e.target.value)}
                placeholder="시대/배경 직접 입력"
                className="w-full rounded-xl border border-[#2a2924] bg-[#141414]
                  px-3.5 py-2.5 text-sm text-[#e8e4d9] placeholder:text-[#3a3830]
                  focus:outline-none focus:border-[#b89a5a]"
              />
            )}
          </div>

          {/* 특별 요청 */}
          <div>
            <label className="block text-sm font-medium text-[#c4bfb4] mb-2">
              특별 요청
              <span className="ml-1.5 text-[11px] text-[#4a4840] font-normal">(선택)</span>
            </label>
            <input type="text" value={specialRequest}
              onChange={(e) => setSpecialRequest(e.target.value)}
              placeholder='예: "재미있게", "사진 설명 형식으로", "속담 활용"'
              className="w-full rounded-xl border border-[#2a2924] bg-[#141414]
                px-3.5 py-2.5 text-sm text-[#e8e4d9] placeholder:text-[#3a3830]
                focus:outline-none focus:border-[#b89a5a]"
            />
          </div>

          {/* 생성 개수 */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-[#c4bfb4]">생성 개수</label>
            <div className="flex gap-2">
              {[1, 2, 3].map((n) => (
                <button key={n} type="button"
                  onClick={() => setCount(n)}
                  className={`rounded-lg border px-4 py-1.5 text-sm transition-all
                    ${count === n
                      ? "border-[#b89a5a] bg-[#b89a5a]/15 text-[#b89a5a]"
                      : "border-[#2a2924] text-[#5a5650] hover:border-[#3a3830]"
                    }`}>
                  {n}개
                </button>
              ))}
            </div>
          </div>

          {/* 생성 버튼 */}
          <button type="button" onClick={handleGenerate} disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-[#b89a5a] to-[#d4b46a]
              py-3.5 font-bold text-[#0f0f10] text-base
              hover:from-[#c9aa6a] hover:to-[#e4c47a]
              disabled:opacity-60 transition-all flex items-center justify-center gap-2">
            {loading ? (
              <><SpinnerIcon/> Claude가 퀴즈를 생성하는 중…</>
            ) : (
              "✨ 퀴즈 생성하기"
            )}
          </button>

          {/* 에러 */}
          {error && (
            <div className="rounded-xl border border-[#c0504a]/30 bg-[#c0504a]/10
              px-4 py-3 text-sm text-[#e07070]">
              {error}
            </div>
          )}

          {/* 퀴즈 초안 */}
          {drafts.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-[#e8e4d9]">
                퀴즈 초안 — 마음에 드는 것을 선택하세요
              </p>
              {drafts.map((draft, idx) => (
                <QuizDraftCard
                  key={idx}
                  draft={draft}
                  index={idx}
                  selected={selectedIdx === idx}
                  onSelect={() => handleSelect(draft, idx)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── QuizDraftCard ─────────────────────────────

function QuizDraftCard({
  draft, index, selected, onSelect,
}: {
  draft: QuizDraft; index: number; selected: boolean; onSelect: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 space-y-3 transition-all cursor-pointer
        ${selected
          ? "border-[#4a9d6f] bg-[#4a9d6f]/10"
          : "border-[#2a2924] bg-[#141414] hover:border-[#b89a5a]/40"
        }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold
            ${selected ? "bg-[#4a9d6f]/20 text-[#4a9d6f]" : "bg-[#b89a5a]/15 text-[#b89a5a]"}`}>
            초안 {index + 1}
          </span>
          <span className="text-[11px] text-[#5a5650]">{getTypeLabel(draft.type)}</span>
          <span className="text-[11px] text-[#5a5650]">{draft.score}점</span>
        </div>
        {selected && <span className="text-xs font-bold text-[#4a9d6f]">✓ 선택됨</span>}
      </div>

      <p className="text-sm font-semibold text-[#e8e4d9] leading-relaxed">{draft.question}</p>

      {draft.options && draft.options.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {draft.options.map((opt, i) => (
            <div key={i}
              className={`rounded-lg border px-3 py-1.5 text-xs
                ${draft.answer.split(",").includes(String(i))
                  ? "border-[#4a9d6f]/40 bg-[#4a9d6f]/10 text-[#4a9d6f]"
                  : "border-[#2a2924] text-[#7a756c]"
                }`}>
              <span className="font-bold mr-1.5">{String.fromCharCode(65 + i)}.</span>{opt}
            </div>
          ))}
        </div>
      )}

      {draft.type === "ox" && (
        <div className="flex gap-2">
          {["O", "X"].map((v) => (
            <div key={v}
              className={`flex-1 rounded-xl border py-2 text-center font-bold text-lg
                ${draft.answer === v
                  ? "border-[#4a9d6f]/40 bg-[#4a9d6f]/10 text-[#4a9d6f]"
                  : "border-[#2a2924] text-[#5a5650]"
                }`}>
              {v}
            </div>
          ))}
        </div>
      )}

      {draft.type === "short_answer" && (
        <div className="rounded-lg border border-[#4a9d6f]/30 bg-[#4a9d6f]/5 px-3 py-2 text-xs text-[#6abd8f]">
          정답: <strong>{draft.answer}</strong>
        </div>
      )}

      <div className="space-y-1">
        {draft.hint_text && <p className="text-[11px] text-[#9a8f7a]">💡 힌트: {draft.hint_text}</p>}
        {draft.explanation && <p className="text-[11px] text-[#5a5650]">📖 해설: {draft.explanation}</p>}
      </div>

      <button type="button" onClick={(e) => { e.stopPropagation(); onSelect(); }}
        className={`w-full rounded-xl py-2 text-sm font-semibold transition-all
          ${selected
            ? "bg-[#4a9d6f] text-white"
            : "border border-[#b89a5a]/40 text-[#b89a5a] hover:bg-[#b89a5a]/10"
          }`}>
        {selected ? "✓ 이 퀴즈 선택됨" : "이 퀴즈 사용하기"}
      </button>
    </div>
  );
}

// ─── 헬퍼 ──────────────────────────────────────

function getTypeLabel(type: QuizType): string {
  return { ox: "O/X", short_answer: "단답형", single_choice: "객관식", multi_choice: "복수선택" }[type] ?? type;
}

function getAnswerFormat(type: QuizType): string {
  switch (type) {
    case "ox":            return "O 또는 X";
    case "short_answer":  return "정답 단어";
    case "single_choice": return "0";
    case "multi_choice":  return "0,2";
  }
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#b89a5a]/30 bg-[#b89a5a]/10
      px-2.5 py-0.5 text-[11px] text-[#b89a5a]">{children}</span>
  );
}

function CloseIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>;
}

function SpinnerIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>;
}
