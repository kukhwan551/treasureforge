"use client";

// components/puzzle/PuzzlePopup.tsx
// 탐험 중 퍼즐 팝업

import { useState, useEffect, useRef } from "react";
import PuzzleCanvas from "./PuzzleCanvas";
import type { PostPuzzle } from "@/types/puzzle";

interface PuzzlePopupProps {
  postName:  string;
  puzzle:    PostPuzzle;
  seniorMode: boolean;
  onComplete: () => void; // 완료 → 열쇠 획득
  onSkip:    () => void;  // 나가기
}

export default function PuzzlePopup({
  postName, puzzle, seniorMode, onComplete, onSkip,
}: PuzzlePopupProps) {
  const [timeLeft,  setTimeLeft]  = useState<number | null>(puzzle.time_limit_sec);
  const [phase,     setPhase]     = useState<"playing" | "success" | "timeout">("playing");
  const [attempts,  setAttempts]  = useState(1);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const timedOutRef = useRef(false);

  const sm = seniorMode;

  // 타이머
  useEffect(() => {
    if (puzzle.time_limit_sec === null || phase !== "playing") return;
    timedOutRef.current = false;

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null || t <= 1) {
          clearInterval(timerRef.current!);
          if (!timedOutRef.current) {
            timedOutRef.current = true;
            setTimeout(() => setPhase("timeout"), 0);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, puzzle.time_limit_sec]);

  function fmtTime(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  }

  function handlePuzzleComplete() {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("success");
    setTimeout(onComplete, 300); // 즉시 완료 (축하 애니메이션은 play/page.tsx에서 처리)
  }

  function handleRetry() {
    setAttempts((a) => a + 1);
    setTimeLeft(puzzle.time_limit_sec);
    setPhase("playing");
    timedOutRef.current = false;
  }

  const timerPct   = timeLeft !== null && puzzle.time_limit_sec
    ? (timeLeft / puzzle.time_limit_sec) * 100 : 100;
  const timerColor = timerPct > 50 ? "#4a9d6f" : timerPct > 25 ? "#b89a5a" : "#c0504a";
  const timeWarn   = timeLeft !== null && timeLeft <= 30;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"/>

      <div className="relative w-full max-w-2xl h-[90vh] mx-4
        bg-[#18181a] border border-[#2a2924] rounded-3xl shadow-2xl
        flex flex-col overflow-y-auto" style={{ maxHeight: "95dvh" }}>

        {/* 타이머 바 */}
        {timeLeft !== null && phase === "playing" && (
          <div className="h-1.5 bg-[#2a2924] flex-shrink-0">
            <div className="h-full transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${timerPct}%`, background: timerColor }}/>
          </div>
        )}

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3.5
          border-b border-[#2a2924] flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🧩</span>
              <h2 className={`font-bold text-[#e8e4d9] ${sm ? "text-xl" : "text-base"}`}>
                그림 퍼즐
              </h2>
              <span className={`text-[#5a5650] ${sm ? "text-base" : "text-xs"}`}>
                — {postName}
              </span>
            </div>
            <p className={`text-[#5a5650] mt-0.5 ${sm ? "text-sm" : "text-[11px]"}`}>
              {puzzle.cols}×{puzzle.rows} ({puzzle.cols * puzzle.rows}조각)
              {attempts > 1 && ` · ${attempts}번째 도전`}
            </p>
          </div>

          {/* 타이머 */}
          {timeLeft !== null && phase === "playing" && (
            <span className={`font-mono font-bold tabular-nums
              ${sm ? "text-3xl" : "text-2xl"}
              ${timeWarn ? "animate-pulse" : ""}`}
              style={{ color: timerColor }}>
              {fmtTime(timeLeft)}
            </span>
          )}
        </div>

        {/* 퍼즐 게임 영역 */}
        <div className="flex-1 min-h-0 p-3">
          {phase === "playing" && (
            <PuzzleCanvas
              key={attempts}
              imageUrl={puzzle.image_url}
              cols={puzzle.cols}
              rows={puzzle.rows}
              seniorMode={seniorMode}
              hintEnabled={puzzle.hint_enabled}
              onComplete={handlePuzzleComplete}
            />
          )}

          {/* 성공 */}
          {phase === "success" && (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <div className="text-7xl animate-bounce">🎉</div>
              <p className={`font-bold text-[#4a9d6f] ${sm ? "text-3xl" : "text-2xl"}`}>
                퍼즐 완성!
              </p>
              <p className={`text-[#7a756c] ${sm ? "text-lg" : "text-sm"}`}>
                열쇠를 획득했습니다 🗝
              </p>
            </div>
          )}

          {/* 시간 초과 */}
          {phase === "timeout" && (
            <div className="h-full flex flex-col items-center justify-center gap-5">
              <div className="text-6xl">⌛</div>
              <p className={`font-bold text-[#c0504a] ${sm ? "text-3xl" : "text-2xl"}`}>
                시간 초과
              </p>
              <p className={`text-[#7a756c] text-center ${sm ? "text-lg" : "text-sm"}`}>
                제한시간 {fmtTime(puzzle.time_limit_sec ?? 0)} 안에<br/>
                완성하지 못했습니다.
              </p>
              <div className="flex gap-3">
                <button onClick={handleRetry}
                  className={`rounded-2xl bg-[#b89a5a] font-bold text-[#0f0f10]
                    hover:bg-[#c9aa6a] transition-colors
                    ${sm ? "px-8 py-4 text-xl" : "px-6 py-3 text-base"}`}>
                  🔄 다시 도전
                </button>
                <button onClick={onSkip}
                  className={`rounded-2xl border border-[#2a2924] text-[#5a5650]
                    hover:border-[#3a3830] transition-colors
                    ${sm ? "px-6 py-4 text-lg" : "px-4 py-3 text-sm"}`}>
                  나가기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 하단 */}
        {phase === "playing" && (
          <div className="border-t border-[#2a2924] px-5 py-3 flex-shrink-0">
            <button onClick={onSkip}
              className={`text-[#4a4840] hover:text-[#7a756c] transition-colors
                ${sm ? "text-base" : "text-xs"}`}>
              포기하고 나가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
