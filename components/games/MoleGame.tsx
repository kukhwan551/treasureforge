"use client";
// components/games/MoleGame.tsx - 두더지 잡기

import { useState, useEffect, useRef, useCallback } from "react";

interface Props { seniorMode: boolean; onComplete: (score: number) => void; onSkip: () => void; }

const TOTAL_TIME = 30;
const PASS_SCORE = 5;
const GRID = 9; // 3x3

export default function MoleGame({ seniorMode, onComplete, onSkip }: Props) {
  const [moles, setMoles]     = useState<boolean[]>(Array(GRID).fill(false));
  const [score, setScore]     = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [phase, setPhase]     = useState<"playing"|"result">("playing");
  const [missed, setMissed]   = useState(0);
  const scoreRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const moleTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const spawnMole = useCallback(() => {
    const idx = Math.floor(Math.random() * GRID);
    setMoles(prev => { const n = [...prev]; n[idx] = true; return n; });
    const t = setTimeout(() => {
      setMoles(prev => { const n = [...prev]; if (n[idx]) { setMissed(m => m + 1); n[idx] = false; } return n; });
    }, seniorMode ? 1200 : 900);
    moleTimers.current.push(t);
  }, [seniorMode]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase("result");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    const interval = setInterval(spawnMole, seniorMode ? 800 : 600);
    return () => {
      clearInterval(timerRef.current!);
      clearInterval(interval);
      moleTimers.current.forEach(clearTimeout);
    };
  }, [spawnMole, seniorMode]);

  function hitMole(idx: number) {
    if (phase !== "playing") return;
    setMoles(prev => {
      if (!prev[idx]) return prev;
      const n = [...prev]; n[idx] = false;
      scoreRef.current++;
      setScore(scoreRef.current);
      return n;
    });
  }

  if (phase === "result") {
    const passed = scoreRef.current >= PASS_SCORE;
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-6 px-4">
        <div className="text-7xl">{passed ? "🎉" : "😢"}</div>
        <h2 className={`font-bold ${passed ? "text-[#4a9d6f]" : "text-[#e07070]"} ${seniorMode ? "text-3xl" : "text-2xl"}`}>
          {passed ? "통과!" : "아쉽네요!"}
        </h2>
        <p className={`text-[#c4bfb4] ${seniorMode ? "text-xl" : "text-base"}`}>
          두더지 {scoreRef.current}마리 잡음 (통과 기준: {PASS_SCORE}마리)
        </p>
        <div className="space-y-3 w-full max-w-xs">
          {passed
            ? <button onClick={() => onComplete(scoreRef.current * 10)}
                className={`w-full rounded-xl bg-[#4a9d6f] font-bold text-white ${seniorMode ? "py-5 text-xl" : "py-3 text-base"}`}>
                🗝 열쇠 획득!
              </button>
            : <button onClick={() => { setScore(0); scoreRef.current=0; setMissed(0); setTimeLeft(TOTAL_TIME); setMoles(Array(GRID).fill(false)); setPhase("playing"); }}
                className={`w-full rounded-xl bg-[#b89a5a] font-bold text-[#0f0f10] ${seniorMode ? "py-5 text-xl" : "py-3 text-base"}`}>
                🔄 다시 도전
              </button>
          }
          <button onClick={onSkip} className={`w-full rounded-xl border border-[#2a2924] text-[#7a756c] ${seniorMode ? "py-4 text-lg" : "py-2.5 text-sm"}`}>
            나가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-between py-6 px-4">
      {/* 상단 HUD */}
      <div className="w-full max-w-sm flex items-center justify-between">
        <div className="text-center">
          <p className={`font-bold text-[#b89a5a] ${seniorMode ? "text-3xl" : "text-2xl"}`}>🐹 {score}</p>
          <p className={`text-[#5a5650] ${seniorMode ? "text-base" : "text-xs"}`}>잡은 두더지</p>
        </div>
        <div className="text-center">
          <p className={`font-bold ${timeLeft <= 10 ? "text-[#e07070] animate-pulse" : "text-[#e8e4d9]"} ${seniorMode ? "text-3xl" : "text-2xl"}`}>
            {timeLeft}s
          </p>
          <p className={`text-[#5a5650] ${seniorMode ? "text-base" : "text-xs"}`}>남은 시간</p>
        </div>
        <div className="text-center">
          <p className={`font-bold text-[#4a9d6f] ${seniorMode ? "text-xl" : "text-base"}`}>목표 {PASS_SCORE}마리</p>
          <p className={`text-[#5a5650] ${seniorMode ? "text-base" : "text-xs"}`}>통과 기준</p>
        </div>
      </div>

      {/* 진행바 */}
      <div className="w-full max-w-sm h-2 bg-[#2a2924] rounded-full">
        <div className="h-full bg-[#b89a5a] rounded-full transition-all duration-1000"
          style={{ width: `${(timeLeft / TOTAL_TIME) * 100}%` }}/>
      </div>

      {/* 3x3 그리드 */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
        {moles.map((active, i) => (
          <button key={i} onPointerDown={() => hitMole(i)}
            className={`aspect-square rounded-2xl border-2 transition-all active:scale-95 flex items-center justify-center
              ${active
                ? "border-[#b89a5a] bg-[#b89a5a]/20 scale-105"
                : "border-[#2a2924] bg-[#18181a]"}`}>
            <span style={{ fontSize: seniorMode ? 48 : 36 }}>
              {active ? "🐹" : "🕳️"}
            </span>
          </button>
        ))}
      </div>

      <button onClick={onSkip} className={`text-[#4a4840] hover:text-[#7a756c] ${seniorMode ? "text-base" : "text-xs"}`}>
        포기하기
      </button>
    </div>
  );
}
