"use client";
// components/games/DodgeGame.tsx - 장애물 피하기

import { useState, useEffect, useRef, useCallback } from "react";

interface Props { seniorMode: boolean; onComplete: (score: number) => void; onSkip: () => void; }

const PASS_TIME = 20;
const LANES = 5;

export default function DodgeGame({ seniorMode, onComplete, onSkip }: Props) {
  const [playerLane, setPlayerLane] = useState(2);
  const [obstacles, setObstacles]   = useState<{ lane: number; y: number; id: number }[]>([]);
  const [survived, setSurvived]     = useState(0);
  const [phase, setPhase]           = useState<"playing"|"dead"|"result">("playing");
  const [touchStartX, setTouchStartX] = useState<number|null>(null);
  const survivedRef = useRef(0);
  const playerLaneRef = useRef(2);
  const obstacleIdRef = useRef(0);
  const phaseRef = useRef<"playing"|"dead"|"result">("playing");

  const tick = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    setObstacles(prev => {
      // 이동
      let next = prev.map(o => ({ ...o, y: o.y + (seniorMode ? 6 : 8) }));
      // 충돌
      const hit = next.some(o => o.y >= 85 && o.y <= 100 && o.lane === playerLaneRef.current);
      if (hit) {
        phaseRef.current = "dead";
        setPhase("dead");
        setTimeout(() => setPhase("result"), 1500);
        return next;
      }
      // 제거
      next = next.filter(o => o.y < 110);
      // 생성
      if (Math.random() < 0.3) {
        next.push({ lane: Math.floor(Math.random() * LANES), y: 0, id: obstacleIdRef.current++ });
      }
      return next;
    });
    setSurvived(s => {
      const ns = s + 1;
      survivedRef.current = ns;
      if (ns >= PASS_TIME * 20) {
        phaseRef.current = "result";
        setPhase("result");
      }
      return ns;
    });
  }, [seniorMode]);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
  }, [phase, tick]);

  function moveLeft()  { setPlayerLane(l => { const n = Math.max(0, l-1); playerLaneRef.current = n; return n; }); }
  function moveRight() { setPlayerLane(l => { const n = Math.min(LANES-1, l+1); playerLaneRef.current = n; return n; }); }

  const survived_sec = Math.floor(survivedRef.current / 20);
  const passed = survived_sec >= PASS_TIME || (phase === "result" && survivedRef.current >= PASS_TIME * 20);

  if (phase === "result") {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-6 px-4">
        <div className="text-7xl">{passed ? "🎉" : "💥"}</div>
        <h2 className={`font-bold ${passed ? "text-[#4a9d6f]" : "text-[#e07070]"} ${seniorMode ? "text-3xl" : "text-2xl"}`}>
          {passed ? "통과!" : "충돌!"}
        </h2>
        <p className={`text-[#c4bfb4] ${seniorMode ? "text-xl" : "text-base"}`}>
          {survived_sec}초 생존 (통과 기준: {PASS_TIME}초)
        </p>
        <div className="space-y-3 w-full max-w-xs">
          {passed
            ? <button onClick={() => onComplete(survived_sec * 5)}
                className={`w-full rounded-xl bg-[#4a9d6f] font-bold text-white ${seniorMode ? "py-5 text-xl" : "py-3 text-base"}`}>
                🗝 열쇠 획득!
              </button>
            : <button onClick={() => { setPlayerLane(2); playerLaneRef.current=2; setObstacles([]); setSurvived(0); survivedRef.current=0; phaseRef.current="playing"; setPhase("playing"); }}
                className={`w-full rounded-xl bg-[#b89a5a] font-bold text-[#0f0f10] ${seniorMode ? "py-5 text-xl" : "py-3 text-base"}`}>
                🔄 다시 도전
              </button>
          }
          <button onClick={onSkip} className={`w-full rounded-xl border border-[#2a2924] text-[#7a756c] ${seniorMode ? "py-4 text-lg" : "py-2.5 text-sm"}`}>나가기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col select-none"
      onTouchStart={e => setTouchStartX(e.touches[0].clientX)}
      onTouchEnd={e => {
        if (touchStartX === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (dx > 30) moveRight();
        else if (dx < -30) moveLeft();
        setTouchStartX(null);
      }}>

      {/* HUD */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2924]">
        <p className={`font-bold text-[#e8e4d9] ${seniorMode ? "text-2xl" : "text-lg"}`}>⏱ {survived_sec}s</p>
        <p className={`text-[#b89a5a] ${seniorMode ? "text-xl" : "text-sm"}`}>목표: {PASS_TIME}초 생존</p>
        <p className={`text-[#4a9d6f] font-bold ${seniorMode ? "text-2xl" : "text-lg"}`}>🚀</p>
      </div>

      {/* 게임 필드 */}
      <div className="flex-1 relative overflow-hidden bg-[#0a0a0f]"
        style={{ backgroundImage: "repeating-linear-gradient(90deg, #1a1a2e 0px, #1a1a2e 1px, transparent 1px, transparent calc(100%/5))" }}>

        {/* 장애물 */}
        {obstacles.map(o => (
          <div key={o.id}
            className="absolute flex items-center justify-center text-2xl transition-none"
            style={{ left: `${(o.lane / LANES) * 100}%`, top: `${o.y}%`, width: `${100/LANES}%`, transform: "translateX(0)" }}>
            🪨
          </div>
        ))}

        {/* 플레이어 */}
        {phase !== "dead" && (
          <div className="absolute bottom-[8%] flex items-center justify-center transition-all duration-100"
            style={{ left: `${(playerLane / LANES) * 100}%`, width: `${100/LANES}%` }}>
            <span style={{ fontSize: seniorMode ? 40 : 32 }}>🚀</span>
          </div>
        )}
        {phase === "dead" && (
          <div className="absolute bottom-[8%] flex items-center justify-center"
            style={{ left: `${(playerLane / LANES) * 100}%`, width: `${100/LANES}%` }}>
            <span className="text-4xl animate-ping">💥</span>
          </div>
        )}
      </div>

      {/* 버튼 */}
      <div className="flex gap-3 px-4 py-4 border-t border-[#2a2924]">
        <button onPointerDown={moveLeft}
          className={`flex-1 rounded-xl bg-[#2a2924] active:bg-[#3a3930] font-bold text-[#e8e4d9] ${seniorMode ? "py-6 text-3xl" : "py-4 text-2xl"}`}>
          ◀
        </button>
        <button onClick={onSkip}
          className={`px-4 rounded-xl border border-[#2a2924] text-[#5a5650] ${seniorMode ? "text-base" : "text-xs"}`}>
          포기
        </button>
        <button onPointerDown={moveRight}
          className={`flex-1 rounded-xl bg-[#2a2924] active:bg-[#3a3930] font-bold text-[#e8e4d9] ${seniorMode ? "py-6 text-3xl" : "py-4 text-2xl"}`}>
          ▶
        </button>
      </div>
    </div>
  );
}
