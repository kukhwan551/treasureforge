"use client";

// components/quizzes/MissionPopup.tsx (탐험용)
// 수정: 힌트 URL 클릭 시 추적 API 호출

import { useState, useEffect, useRef } from "react";
import type { PostWithQuiz, ActiveQuizState } from "@/types/explore";
import { QUIZ_TYPE_LABEL } from "@/types/post";

interface MissionPopupProps {
  post:       PostWithQuiz;
  quizState:  ActiveQuizState;
  sessionId:  string | null;   // ← 추가: 클릭 추적용
  gameId:     string | null;   // ← 추가: 클릭 추적용
  seniorMode: boolean;
  onAnswer:   (answer: string) => void;
  onUseHint:  () => void;
  onClose:    () => void;
  onSkip:     () => void;
}

export default function MissionPopup({
  post, quizState, sessionId, gameId, seniorMode,
  onAnswer, onUseHint, onClose, onSkip,
}: MissionPopupProps) {
  const { quiz, status } = quizState;

  const [inputAnswer,    setInputAnswer]    = useState("");
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [timeLeft,       setTimeLeft]       = useState(quizState.timeLeft);
  const [hintVisible,    setHintVisible]    = useState(false);
  const totalTime    = useRef(quizState.timeLeft ?? 0);
  const timedOutRef  = useRef(false);
  const inputRef     = useRef<HTMLInputElement>(null);

  const sm   = seniorMode;
  const ts   = sm ? "text-xl"  : "text-sm";
  const tm   = sm ? "text-2xl" : "text-base";
  const btnH = sm ? "py-4"     : "py-2.5";

  useEffect(() => {
    if (quiz.type === "short_answer") setTimeout(() => inputRef.current?.focus(), 200);
  }, [quiz.type]);

  // 카운트다운
  useEffect(() => {
    if (quizState.timeLeft === null || status !== "answering") return;
    timedOutRef.current = false;
    setTimeLeft(quizState.timeLeft);
    totalTime.current = quizState.timeLeft;

    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null) return null;
        if (t <= 1) {
          clearInterval(id);
          if (!timedOutRef.current) {
            timedOutRef.current = true;
            setTimeout(() => onAnswer("__TIMEOUT__"), 0);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [quizState.timeLeft, status]); // eslint-disable-line

  const timerPct   = timeLeft !== null && totalTime.current > 0
    ? (timeLeft / totalTime.current) * 100 : 100;
  const timerColor = timerPct > 50 ? "#4a9d6f" : timerPct > 25 ? "#b89a5a" : "#c0504a";

  function fmtTime(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  }

  function handleSubmit() {
    if (status !== "answering") return;
    switch (quiz.type) {
      case "short_answer":  if (!inputAnswer.trim()) return; onAnswer(inputAnswer.trim()); break;
      case "ox":            if (!inputAnswer) return; onAnswer(inputAnswer); break;
      case "single_choice": if (inputAnswer === "") return; onAnswer(inputAnswer); break;
      case "multi_choice":  if (selectedOptions.length === 0) return; onAnswer(selectedOptions.sort().join(",")); break;
    }
  }

  // ★ 힌트 URL 클릭 추적
  async function trackHintClick(url: string) {
    try {
      await fetch("/api/track/hint-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_id:    quiz.id,
          game_id:    gameId,
          session_id: sessionId,
          hint_url:   url,
        }),
      });
    } catch {}
  }

  function handleHintToggle() {
    setHintVisible((v) => !v);
    if (!hintVisible) onUseHint();
  }

  const hasHint = !!(quiz.hint_text || quiz.hint_url);
  const canSkip = post.order_mode === "free";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={status !== "answering" ? onClose : undefined}/>

      <div className="relative w-full sm:max-w-lg bg-[#18181a] border border-[#2a2924]
        rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">

        {/* 타이머 바 */}
        {timeLeft !== null && status === "answering" && (
          <div className="h-1.5 bg-[#2a2924]">
            <div className="h-full transition-all duration-1000 ease-linear"
              style={{ width: `${timerPct}%`, background: timerColor }}/>
          </div>
        )}

        <div className="p-5 space-y-4">

          {/* 헤더 */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`inline-flex rounded-full bg-[#b89a5a]/15
                  px-3 py-0.5 font-semibold text-[#b89a5a] ${sm ? "text-base" : "text-xs"}`}>
                  {QUIZ_TYPE_LABEL[quiz.type]}
                </span>
                <span className={`text-[#5a5650] ${sm ? "text-base" : "text-xs"}`}>
                  📍 {post.name}
                </span>
              </div>
              <p className={`font-semibold text-[#e8e4d9] leading-relaxed ${tm}`}>
                {quiz.question}
              </p>
            </div>
            {timeLeft !== null && status === "answering" && (
              <span className={`shrink-0 font-mono font-bold tabular-nums
                ${sm ? "text-2xl" : "text-xl"}
                ${timeLeft <= 10 ? "animate-pulse" : ""}`}
                style={{ color: timerColor }}>
                {fmtTime(timeLeft)}
              </span>
            )}
          </div>

          {/* 힌트 패널 */}
          {hasHint && status === "answering" && hintVisible && (
            <div className="rounded-xl border border-[#b89a5a]/20 bg-[#b89a5a]/5 px-4 py-3 space-y-2">
              <p className={`font-medium text-[#b89a5a] ${ts}`}>💡 힌트</p>
              {quiz.hint_text && (
                <p className={`text-[#c4bfb4] leading-relaxed ${ts}`}>{quiz.hint_text}</p>
              )}
              {quiz.hint_url && (
                <div className="space-y-1">
                  <p className={`text-[#7a756c] ${sm ? "text-sm" : "text-xs"}`}>
                    아래 페이지를 방문하면 힌트를 얻을 수 있어요!
                  </p>
                  {/* ★ 클릭 추적 링크 */}
                  <a
                    href={quiz.hint_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackHintClick(quiz.hint_url!)}
                    className={`inline-flex items-center gap-2 rounded-xl
                      border border-[#b89a5a]/40 bg-[#b89a5a]/10
                      px-4 py-2.5 font-medium text-[#b89a5a]
                      hover:bg-[#b89a5a]/20 transition-colors ${ts}`}>
                    <ExternalLinkIcon/>
                    힌트 페이지 방문하기 →
                  </a>
                  <p className={`text-[#4a4840] ${sm ? "text-sm" : "text-[11px]"}`}>
                    {quiz.hint_url}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 오답 횟수 */}
          {quizState.attempts > 0 && status === "answering" && (
            <p className={`text-center text-[#c0504a] ${ts}`}>
              {quizState.attempts}번 시도했습니다. 다시 도전!
            </p>
          )}

          {/* ── 퀴즈 입력 ── */}
          {quiz.type === "short_answer" && (
            <input ref={inputRef} type="text" value={inputAnswer}
              onChange={(e) => setInputAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              disabled={status !== "answering"}
              placeholder="정답을 입력하세요" autoComplete="off"
              className={`w-full rounded-xl border bg-[#141414] px-4
                ${sm ? "py-4 text-xl" : "py-3 text-sm"}
                text-[#e8e4d9] placeholder:text-[#3a3830] border-[#2a2924]
                focus:outline-none focus:border-[#b89a5a] disabled:opacity-50`}/>
          )}

          {quiz.type === "ox" && (
            <div className="grid grid-cols-2 gap-3">
              {["O", "X"].map((v) => (
                <button key={v} type="button" disabled={status !== "answering"}
                  onClick={() => setInputAnswer(v)}
                  className={`rounded-2xl border-2 font-black transition-all active:scale-95
                    ${sm ? "py-8 text-6xl" : "py-5 text-4xl"}
                    ${inputAnswer === v
                      ? v === "O"
                        ? "border-[#4a9d6f] bg-[#4a9d6f]/20 text-[#4a9d6f] scale-105"
                        : "border-[#c0504a] bg-[#c0504a]/20 text-[#c0504a] scale-105"
                      : "border-[#2a2924] bg-[#141414] text-[#5a5650]"
                    } disabled:opacity-50`}>
                  {v}
                </button>
              ))}
            </div>
          )}

          {quiz.type === "single_choice" && (
            <div className="space-y-2">
              {quiz.options.map((opt, idx) => (
                <button key={idx} type="button" disabled={status !== "answering"}
                  onClick={() => setInputAnswer(String(idx))}
                  className={`w-full text-left rounded-xl border px-4 active:scale-[0.98]
                    ${sm ? "py-4 text-xl" : "py-3 text-sm"} transition-all disabled:opacity-50
                    ${inputAnswer === String(idx)
                      ? "border-[#b89a5a] bg-[#b89a5a]/15 text-[#d4b06a] scale-[1.01]"
                      : "border-[#2a2924] bg-[#141414] text-[#c4bfb4] hover:border-[#b89a5a]/30"
                    }`}>
                  <span className={`mr-2 inline-flex h-6 w-6 items-center justify-center
                    rounded-full border font-bold text-xs align-middle
                    ${inputAnswer === String(idx)
                      ? "border-[#b89a5a] bg-[#b89a5a] text-[#0f0f10]"
                      : "border-[#3a3830] text-[#5a5650]"}`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {quiz.type === "multi_choice" && (
            <div className="space-y-2">
              <p className={`text-[#5a5650] text-center ${ts}`}>
                {quiz.pass_count}개 이상 선택하세요
              </p>
              {quiz.options.map((opt, idx) => {
                const sel = selectedOptions.includes(idx);
                return (
                  <button key={idx} type="button" disabled={status !== "answering"}
                    onClick={() => setSelectedOptions((prev) =>
                      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
                    )}
                    className={`w-full text-left rounded-xl border px-4 active:scale-[0.98]
                      ${sm ? "py-4 text-xl" : "py-3 text-sm"} transition-all disabled:opacity-50
                      ${sel
                        ? "border-[#b89a5a] bg-[#b89a5a]/15 text-[#d4b06a]"
                        : "border-[#2a2924] bg-[#141414] text-[#c4bfb4] hover:border-[#b89a5a]/30"
                      }`}>
                    <span className={`mr-2 inline-block h-4 w-4 rounded border-2 align-middle
                      ${sel ? "border-[#b89a5a] bg-[#b89a5a]" : "border-[#3a3830]"}`}/>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex flex-col gap-2 pt-1">
            {status === "answering" && (
              <button onClick={handleSubmit}
                className={`w-full rounded-2xl font-black text-[#0f0f10]
                  bg-gradient-to-r from-[#b89a5a] to-[#d4b46a]
                  hover:from-[#c9aa6a] hover:to-[#e4c47a]
                  active:scale-[0.98] shadow-lg transition-all
                  ${btnH} ${sm ? "text-2xl" : "text-lg"}`}>
                ✨ 정답 제출
              </button>
            )}

            {status === "answering" && hasHint && (
              <button onClick={handleHintToggle}
                className={`w-full rounded-2xl border transition-all active:scale-[0.98]
                  ${hintVisible
                    ? "border-[#b89a5a]/50 bg-[#b89a5a]/10 text-[#b89a5a]"
                    : "border-[#2a2924] text-[#5a5650] hover:border-[#b89a5a]/30 hover:text-[#b89a5a]"
                  } ${btnH} ${ts}`}>
                {hintVisible ? "💡 힌트 숨기기" : "💡 힌트 보기"}
              </button>
            )}

            {status === "answering" && canSkip && (
              <button onClick={onSkip}
                className={`w-full rounded-2xl border border-[#2a2924]
                  text-[#5a5650] hover:border-[#3a3830] hover:text-[#7a756c]
                  transition-all ${btnH} ${ts}`}>
                나중에 풀기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  );
}
