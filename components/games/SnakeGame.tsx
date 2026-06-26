"use client";
// components/games/SnakeGame.tsx

import { useEffect, useRef, useState } from "react";

interface Props { seniorMode: boolean; onComplete: (score: number) => void; onSkip: () => void; }

const COLS = 16, ROWS = 20;
const PASS_FOOD = 5;
type Dir = "U"|"D"|"L"|"R";
type Pt  = { x: number; y: number };

// 게임 로직을 별도 컴포넌트로 분리 - key로 리마운트하여 재시작
function SnakeBoard({ seniorMode, onComplete, onSkip, onDead }: Props & { onDead: (eaten: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const s = useRef({
    snake: [{x:8,y:10},{x:7,y:10},{x:6,y:10}] as Pt[],
    dir: "R" as Dir, nextDir: "R" as Dir,
    food: {x:12,y:10} as Pt,
    eaten: 0,
  });
  const [eaten, setEaten] = useState(0);
  const rafRef  = useRef<number>(0);
  const lastRef = useRef(0);

  useEffect(() => {
    const cvs = canvasRef.current; if (!cvs) return;
    const CELL = seniorMode ? 22 : 18;
    const W = cvs.width  = COLS * CELL;
    const H = cvs.height = ROWS * CELL;
    const SPEED = seniorMode ? 250 : 180;

    function randFood(snake: Pt[]): Pt {
      let pt: Pt;
      do { pt = {x:Math.floor(Math.random()*COLS), y:Math.floor(Math.random()*ROWS)}; }
      while (snake.some(p=>p.x===pt.x&&p.y===pt.y));
      return pt;
    }

    function draw() {
      const ctx = cvs!.getContext("2d"); if (!ctx) return;
      ctx.fillStyle="#0a0a10"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="#12121a"; ctx.lineWidth=0.5;
      for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) ctx.strokeRect(c*CELL,r*CELL,CELL,CELL);

      s.current.snake.forEach((p,i)=>{
        ctx.fillStyle = i===0 ? "#4adf6f" : `hsl(${140-i*2},60%,40%)`;
        ctx.beginPath(); ctx.roundRect(p.x*CELL+1,p.y*CELL+1,CELL-2,CELL-2,i===0?4:2); ctx.fill();
        if (i===0) {
          ctx.fillStyle="#000";
          const d = s.current.dir;
          [[d==="R"?0.7:d==="L"?0.3:0.3, d==="D"?0.7:d==="U"?0.3:0.3],
           [d==="R"?0.7:d==="L"?0.3:0.7, d==="D"?0.7:d==="U"?0.3:0.7]].forEach(([ex,ey])=>{
            ctx.beginPath(); ctx.arc(p.x*CELL+ex*CELL, p.y*CELL+ey*CELL, 2, 0, Math.PI*2); ctx.fill();
          });
        }
      });
      ctx.fillStyle="#ff4444";
      ctx.beginPath(); ctx.arc(s.current.food.x*CELL+CELL/2, s.current.food.y*CELL+CELL/2, CELL/2-2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle="#ff8888";
      ctx.beginPath(); ctx.arc(s.current.food.x*CELL+CELL/2-2, s.current.food.y*CELL+CELL/2-2, CELL/4, 0, Math.PI*2); ctx.fill();
    }

    function loop(ts: number) {
      if (ts - lastRef.current > SPEED) {
        lastRef.current = ts;
        const cur = s.current;
        cur.dir = cur.nextDir;
        const head = {...cur.snake[0]};
        if (cur.dir==="R") head.x++; else if (cur.dir==="L") head.x--;
        else if (cur.dir==="U") head.y--; else head.y++;

        if (head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS||cur.snake.some(p=>p.x===head.x&&p.y===head.y)) {
          draw(); onDead(cur.eaten); return;
        }
        cur.snake.unshift(head);
        if (head.x===cur.food.x && head.y===cur.food.y) {
          cur.eaten++;
          setEaten(cur.eaten);
          if (cur.eaten >= PASS_FOOD) { draw(); onComplete(cur.eaten * 20); return; }
          cur.food = randFood(cur.snake);
        } else {
          cur.snake.pop();
        }
      }
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [seniorMode, onComplete, onDead]);

  function setDir(d: Dir) {
    const cur = s.current.dir;
    if ((d==="U"&&cur==="D")||(d==="D"&&cur==="U")||(d==="L"&&cur==="R")||(d==="R"&&cur==="L")) return;
    s.current.nextDir = d;
  }

  const btnCls = `rounded-xl bg-[#2a2924] active:bg-[#3a3930] font-bold text-[#e8e4d9] flex items-center justify-center ${seniorMode?"text-3xl":"text-2xl"}`;

  return (
    <div className="h-full flex flex-col items-center py-3 space-y-2">
      <div className="flex items-center gap-6">
        <p className={`text-[#4a9d6f] font-bold ${seniorMode?"text-xl":"text-base"}`}>🍎 {eaten}/{PASS_FOOD}</p>
        <p className={`text-[#7a756c] ${seniorMode?"text-lg":"text-sm"}`}>먹이 {PASS_FOOD}개 먹으면 통과!</p>
        <button onClick={onSkip} className={`text-[#4a4840] ${seniorMode?"text-base":"text-xs"}`}>포기</button>
      </div>
      <canvas ref={canvasRef} className="rounded-xl border border-[#2a2924]"/>
      <div className="grid grid-cols-3 gap-2 w-full max-w-[220px]">
        <div/>
        <button onPointerDown={()=>setDir("U")} className={`${btnCls} py-3`}>▲</button>
        <div/>
        <button onPointerDown={()=>setDir("L")} className={`${btnCls} py-3`}>◀</button>
        <div className="rounded-xl bg-[#18181a] flex items-center justify-center text-lg">🐍</div>
        <button onPointerDown={()=>setDir("R")} className={`${btnCls} py-3`}>▶</button>
        <div/>
        <button onPointerDown={()=>setDir("D")} className={`${btnCls} py-3`}>▼</button>
        <div/>
      </div>
    </div>
  );
}

export default function SnakeGame({ seniorMode, onComplete, onSkip }: Props) {
  const [key, setKey]     = useState(0);
  const [dead, setDead]   = useState<number|null>(null);

  if (dead !== null) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-6 px-4">
        <div className="text-7xl">😢</div>
        <h2 className={`font-bold text-[#e07070] ${seniorMode?"text-3xl":"text-2xl"}`}>충돌!</h2>
        <p className={`text-[#c4bfb4] ${seniorMode?"text-xl":"text-base"}`}>먹이 {dead}개 (목표: {PASS_FOOD}개)</p>
        <div className="space-y-3 w-full max-w-xs">
          <button onClick={()=>{ setDead(null); setKey(k=>k+1); }}
            className={`w-full rounded-xl bg-[#b89a5a] font-bold text-[#0f0f10] ${seniorMode?"py-5 text-xl":"py-3 text-base"}`}>
            🔄 다시 도전
          </button>
          <button onClick={onSkip} className={`w-full rounded-xl border border-[#2a2924] text-[#7a756c] ${seniorMode?"py-4 text-lg":"py-2.5 text-sm"}`}>나가기</button>
        </div>
      </div>
    );
  }

  return <SnakeBoard key={key} seniorMode={seniorMode} onComplete={onComplete} onSkip={onSkip} onDead={setDead}/>;
}
