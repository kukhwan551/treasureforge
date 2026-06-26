"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface Props { seniorMode: boolean; target?: number; onComplete: (score: number) => void; onSkip: () => void; }

const TOTAL_TIME = 40;
const GRID = 9;

function MoleBoard({ seniorMode, target, onComplete, onSkip, onResult }: Props & { onResult: (score: number) => void }) {
  const PASS = target || 30;
  const [moles, setMoles] = useState<boolean[]>(Array(GRID).fill(false));
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const scoreRef = useRef(0);
  const activeRef = useRef(true);

  const spawnMole = useCallback(() => {
    if (!activeRef.current) return;
    const idx = Math.floor(Math.random() * GRID);
    setMoles(prev => { const n=[...prev]; n[idx]=true; return n; });
    setTimeout(() => {
      if (!activeRef.current) return;
      setMoles(prev => { const n=[...prev]; n[idx]=false; return n; });
    }, seniorMode ? 1400 : 1000);
  }, [seniorMode]);

  useEffect(() => {
    activeRef.current = true;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t<=1) { clearInterval(timer); activeRef.current=false; onResult(scoreRef.current); return 0; }
        return t-1;
      });
    }, 1000);
    const spawner = setInterval(() => spawnMole(), seniorMode?900:650);
    return () => { clearInterval(timer); clearInterval(spawner); activeRef.current=false; };
  }, [spawnMole, seniorMode, onResult]);

  function hitMole(idx: number) {
    setMoles(prev => {
      if (!prev[idx]) return prev;
      const n=[...prev]; n[idx]=false;
      scoreRef.current++; setScore(scoreRef.current);
      return n;
    });
  }

  return (
    <div className="h-full flex flex-col items-center justify-between py-6 px-4">
      <div className="w-full max-w-sm flex items-center justify-between">
        <div className="text-center">
          <p className={`font-bold text-[#b89a5a] ${seniorMode?"text-3xl":"text-2xl"}`}>🐹 {score}</p>
          <p className={`text-[#5a5650] ${seniorMode?"text-base":"text-xs"}`}>잡은 두더지</p>
        </div>
        <div className="text-center">
          <p className={`font-bold ${timeLeft<=10?"text-[#e07070] animate-pulse":"text-[#e8e4d9]"} ${seniorMode?"text-3xl":"text-2xl"}`}>{timeLeft}s</p>
          <p className={`text-[#5a5650] ${seniorMode?"text-base":"text-xs"}`}>남은 시간</p>
        </div>
        <div className="text-center">
          <p className={`font-bold text-[#4a9d6f] ${seniorMode?"text-xl":"text-base"}`}>목표 {PASS}마리</p>
        </div>
      </div>
      <div className="w-full max-w-sm h-2 bg-[#2a2924] rounded-full">
        <div className="h-full bg-[#b89a5a] rounded-full transition-all duration-1000" style={{width:`${(timeLeft/TOTAL_TIME)*100}%`}}/>
      </div>
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
        {moles.map((active,i) => (
          <button key={i} onPointerDown={()=>hitMole(i)}
            className={`aspect-square rounded-2xl border-2 transition-all active:scale-95 flex items-center justify-center ${active?"border-[#b89a5a] bg-[#b89a5a]/20 scale-105":"border-[#2a2924] bg-[#18181a]"}`}>
            <span style={{fontSize:seniorMode?48:36}}>{active?"🐹":"🕳️"}</span>
          </button>
        ))}
      </div>
      <button onClick={onSkip} className={`text-[#4a4840] ${seniorMode?"text-base":"text-xs"}`}>포기하기</button>
    </div>
  );
}

export default function MoleGame({ seniorMode, target, onComplete, onSkip }: Props) {
  const [key, setKey] = useState(0);
  const [result, setResult] = useState<number|null>(null);
  const PASS = target || 30;

  if (result !== null) {
    const passed = result >= PASS;
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-6 px-4">
        <div className="text-7xl">{passed?"🎉":"😢"}</div>
        <h2 className={`font-bold ${passed?"text-[#4a9d6f]":"text-[#e07070]"} ${seniorMode?"text-3xl":"text-2xl"}`}>{passed?"통과!":"아쉽네요!"}</h2>
        <p className={`text-[#c4bfb4] ${seniorMode?"text-xl":"text-base"}`}>{result}마리 (목표: {PASS}마리)</p>
        <div className="space-y-3 w-full max-w-xs">
          {passed
            ? <button onClick={()=>onComplete(result*5)} className={`w-full rounded-xl bg-[#4a9d6f] font-bold text-white ${seniorMode?"py-5 text-xl":"py-3 text-base"}`}>🗝 열쇠 획득!</button>
            : <button onClick={()=>{setResult(null);setKey(k=>k+1);}} className={`w-full rounded-xl bg-[#b89a5a] font-bold text-[#0f0f10] ${seniorMode?"py-5 text-xl":"py-3 text-base"}`}>🔄 다시 도전</button>}
          <button onClick={onSkip} className={`w-full rounded-xl border border-[#2a2924] text-[#7a756c] ${seniorMode?"py-4 text-lg":"py-2.5 text-sm"}`}>나가기</button>
        </div>
      </div>
    );
  }
  return <MoleBoard key={key} seniorMode={seniorMode} target={target} onComplete={onComplete} onSkip={onSkip} onResult={setResult}/>;
}
