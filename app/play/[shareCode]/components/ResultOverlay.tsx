"use client";

// app/play/[shareCode]/components/ResultOverlay.tsx
// 수정:
// 1. "timeout" 타입 추가 — 시간 초과 전용 애니메이션
// 2. 정답/오답/시간초과 각각 다른 이모지·메시지·색상

import { useEffect, useState } from "react";

// ← "timeout" 추가
export type ResultType = "correct" | "correct_intermediate" | "wrong" | "timeout" | null;

interface ResultOverlayProps {
  result: ResultType;
  postName: string;
  seniorMode: boolean;
  onDismiss: () => void;
}

const WRONG_MESSAGES = [
  "아쉽네요! 다시 도전해보세요 💪",
  "조금 더 생각해봐요! 할 수 있어요 🔥",
  "포기하지 마세요! 정답이 가까워요 ✨",
  "아이쿠! 힌트를 사용해보세요 💡",
  "惜しい! 다시 한번! 🎯",
];

const TIMEOUT_MESSAGES = [
  "시간이 다 됐어요! 다음엔 더 빠르게!",
  "조금 더 서두를 필요가 있어요 ⏰",
  "시간 안에 풀기 아슬아슬! 다시 도전!",
];

export default function ResultOverlay({
  result, postName, seniorMode, onDismiss,
}: ResultOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [wrongMsg]   = useState(WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)]);
  const [timeoutMsg] = useState(TIMEOUT_MESSAGES[Math.floor(Math.random() * TIMEOUT_MESSAGES.length)]);

  useEffect(() => {
    if (!result) { setVisible(false); return; }
    setVisible(true);

    // 정답 2800ms, 오답/시간초과 2000ms
    const duration = result === "correct" ? 2800 : 2000;
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, duration);
    return () => clearTimeout(t);
  }, [result]); // eslint-disable-line

  if (!result) return null;

  const sm = seniorMode;

  // ── 배경 색상 ──
  const bgGradient =
    result === "correct" ? "rgba(74,157,111,0.15)"
    : result === "timeout" ? "rgba(180,150,60,0.20)"
    : "rgba(192,80,74,0.28)";

  return (
    <>
      {/* 배경 플래시 */}
      <div
        className={`fixed inset-0 pointer-events-none transition-opacity duration-300
          ${visible ? "opacity-100" : "opacity-0"}`}
        style={{
          zIndex: 90,
          background: `radial-gradient(ellipse at center, ${bgGradient} 0%, transparent 70%)`,
        }}
      />

      {/* 중앙 카드 */}
      <div
        className={`fixed left-1/2 pointer-events-none
          transition-all duration-300
          ${visible
            ? "opacity-100 -translate-x-1/2 -translate-y-1/2"
            : "opacity-0 -translate-x-1/2 -translate-y-1/2 scale-90"
          }`}
        style={{ top: "42%", zIndex: 95 }}
      >

        {/* 정답 */}
        {result === "correct" && (
          <div className={`text-center space-y-2 px-8 py-6
            rounded-3xl border border-[#4a9d6f]/40
            bg-[#0a1a10]/90 backdrop-blur-sm shadow-2xl
            ${visible ? "animate-[pop-in_0.4s_ease-out]" : ""}`}>
            <div className={sm ? "text-8xl" : "text-6xl"}>🎊</div>
            <p className={`font-black text-[#4a9d6f] ${sm ? "text-4xl" : "text-3xl"}`}>
              정답입니다!
            </p>
            {postName && (
              <p className={`text-[#6abd8f] ${sm ? "text-xl" : "text-base"}`}>
                📍 {postName}
              </p>
            )}
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className={sm ? "text-4xl" : "text-3xl"}>🗝</span>
              <span className={`font-bold text-[#b89a5a] ${sm ? "text-2xl" : "text-xl"}`}>
                황금열쇠 획득!
              </span>
            </div>
          </div>
        )}


        {/* 중간 정답 - 다음 퀴즈 있음 */}
        {result === "correct_intermediate" && (
          <div className={`text-center space-y-2 px-8 py-6
            rounded-3xl border border-[#4a9d6f]/40
            bg-[#0a1a10]/90 backdrop-blur-sm shadow-2xl
            ${visible ? "animate-[pop-in_0.4s_ease-out]" : ""}`}>
            <div className={sm ? "text-8xl" : "text-6xl"}>⭕</div>
            <p className={`font-black text-[#4a9d6f] ${sm ? "text-4xl" : "text-3xl"}`}>
              정답입니다!
            </p>
            <p className={`text-[#6abd8f] ${sm ? "text-xl" : "text-base"}`}>
              다음 퀴즈로 이동합니다 →
            </p>
          </div>
        )}
        {/* 오답 */
        {result === "wrong" && (
          <div className={`text-center space-y-2 px-8 py-6
            rounded-3xl border border-[#c0504a]/40
            bg-[#1a0a0a]/90 backdrop-blur-sm shadow-2xl
            ${visible ? "animate-[wiggle_0.5s_ease-in-out]" : ""}`}>
            <div className={sm ? "text-8xl" : "text-6xl"}>😢</div>
            <p className={`font-black text-[#e07070] ${sm ? "text-4xl" : "text-3xl"}`}>
              틀렸습니다
            </p>
            <p className={`text-[#9a7070] ${sm ? "text-xl" : "text-base"}`}>
              {wrongMsg}
            </p>
          </div>
        )}

        {/* 시간 초과 — 모래시계 테마 */}
        {result === "timeout" && (
          <div className={`text-center space-y-2 px-8 py-6
            rounded-3xl border border-[#b89a5a]/40
            bg-[#1a1400]/90 backdrop-blur-sm shadow-2xl
            ${visible ? "animate-[pop-in_0.4s_ease-out]" : ""}`}>
            {/* 모래시계 크게 + 흔들기 */}
            <div className={`${visible ? "animate-[wiggle_0.6s_ease-in-out]" : ""}
              inline-block`}>
              <span className={sm ? "text-8xl" : "text-6xl"}>⌛</span>
            </div>
            <p className={`font-black text-[#d4b06a] ${sm ? "text-4xl" : "text-3xl"}`}>
              시간 초과!
            </p>
            <p className={`text-[#9a8a5a] ${sm ? "text-xl" : "text-base"}`}>
              {timeoutMsg}
            </p>
            <p className={`text-[#7a6a4a] ${sm ? "text-lg" : "text-sm"}`}>
              포스트를 다시 찾아 도전하세요!
            </p>
          </div>
        )}

      </div>
    </>
  );
}
