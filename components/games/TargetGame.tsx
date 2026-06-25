"use client";
// components/games/TargetGame.tsx - 과녁 맞추기

import { useState, useEffect, useRef } from "react";

interface Props { seniorMode: boolean; onComplete: (score: number) => void; onSkip: () => void; }

const PASS_HITS = 8;
const TOTAL_TIME = 30;
const TARGET_SIZE = 64;

export default function TargetGame({ seniorMode, onComplete, onSkip }: Props) {
  const [target, setTarget]   = useState({ x: 50, y: 50, vx: 3, vy: 2 });
  const [hits, setHits]       = useState(0);
  const [misses, setMisses]   = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [phase, setPhase]     = useState<"playing"|"result">("playing");
  const [flash, setFlash]     = useState<"hit"|"miss"|null>(null);
  const hitsRef = useRef(0);
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timer); setPhase("result"); return 0; }
        return t - 1;
      });
    }, 1000);

    const mover = setInterval(() => {
      setTarget(prev => {
        let { x, y, vx, vy } = prev;
        const speed = seniorMode ? 1.5 : 2.5;
        x += vx * speed;
        y += vy * speed;
        const maxX = 100 - (TARGET_SIZE / (fieldRef.current?.clientWidth  || 300)) * 100;
        const maxY = 100 - (TARGET_SIZE / (fieldRef.current?.clientHeight || 400)) * 100;
        if (x < 0 || x > maxX) { vx *= -1; x = Math.max(0, Math.min(maxX, x)); }
        if (y < 0 || y > maxY) { vy *= -1; y = Math.max(0, Math.min(maxY, y)); }
        return { x, y, vx, vy };
      });
    }, 16);

    return () => { clearInterval(timer); clearInterval(mover); };
  }, [seniorMode]);

  function handleFieldClick(e: React.PointerEvent<HTMLDivElement>) {
    if (phase !== "playing") return;
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = ((e.clientX - rect.left) / rect.width)  * 100;
    const cy = ((e.clientY - rect.top)  / rect.height) * 100;
    const tw = (TARGET_SIZE / rect.width)  * 100;
    const th = (TARGET_SIZE / rect.height) * 100;
    const hit = cx >= target.x && cx <= target.x + tw && cy >= target.y && cy <= target.y + th;
    if (hit) {
      hitsRef.current++;
      setHits(hitsRef.current);
      setFlash("hit");
      if (hitsRef.current >= PASS_HITS) setPhase("result");
    } else {
      setMisses(m => m + 1);
      setFlash("miss");
    }
    setTimeout(() => setFlash(null), 300);
  }

  const passed = hitsRef.current >= PASS_HITS;

  if (phase === "result") {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-6 px-4">
        <div className="text-7xl">{passed ? "🎉" : "😢"}</div>
        <h2 className={`font-bold ${passed ? "text-[#4a9d6f]" : "text-[#e07070]"} ${seniorMode ? "text-3xl" : "text-2xl"}`}>
          {passed ? "통과!" : "아쉽네요!"}
        </h2>
        <p className={`text-[#c4bfb4] ${seniorMode ? "text-xl" : "text-base"}`}>
          {hitsRef.current}회 명중 (통과 기준: {PASS_HITS}회)
        </p>
        <div className="space-y-3 w-full max-w-xs">
          {passed
            ? <button onClick={() => onComplete(hitsRef.current * 10)}
                className={`w-full rounded-xl bg-[#4a9d6f] font-bold text-white ${seniorMode ? "py-5 text-xl" : "py-3 text-base"}`}>
                🗝 열쇠 획득!
              </button>
            : <button onClick={() => { hitsRef.current=0; setHits(0); setMisses(0); setTimeLeft(TOTAL_TIME); setPhase("playing"); }}
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
    <div className="h-full flex flex-col">
      {/* HUD */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-[#2a2924]">
        <p className={`font-bold text-[#4a9d6f] ${seniorMode ? "text-2xl" : "text-lg"}`}>🎯 {hits}/{PASS_HITS}</p>
        <p className={`font-bold ${timeLeft <= 10 ? "text-[#e07070] animate-pulse" : "text-[#e8e4d9]"} ${seniorMode ? "text-2xl" : "text-lg"}`}>⏱ {timeLeft}s</p>
        <button onClick={onSkip} className={`text-[#4a4840] ${seniorMode ? "text-base" : "text-xs"}`}>포기</button>
      </div>

      {/* 필드 */}
      <div ref={fieldRef} className="flex-1 relative overflow-hidden bg-[#0a0a10] cursor-crosshair"
        style={{ background: flash === "hit" ? "rgba(74,157,111,0.15)" : flash === "miss" ? "rgba(192,80,74,0.15)" : undefined }}
        onPointerDown={handleFieldClick}>

        {/* 과녁 */}
        <div className="absolute transition-none pointer-events-none"
          style={{ left: `${target.x}%`, top: `${target.y}%`, width: TARGET_SIZE, height: TARGET_SIZE }}>
          <div className="w-full h-full rounded-full border-4 border-[#e07070] bg-[#e07070]/20 flex items-center justify-center">
            <div className="w-2/3 h-2/3 rounded-full border-3 border-[#b89a5a] bg-[#b89a5a]/20 flex items-center justify-center">
              <div className="w-1/3 h-1/3 rounded-full bg-[#e07070]"/>
            </div>
          </div>
        </div>

        {flash === "hit" && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-5xl animate-ping">✨</span></div>}
      </div>

      <p className={`text-center text-[#5a5650] py-2 ${seniorMode ? "text-base" : "text-xs"}`}>
        빨간 과녁을 탭하세요!
      </p>
    </div>
  );
}
