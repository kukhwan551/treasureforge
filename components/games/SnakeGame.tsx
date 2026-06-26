"use client";
// components/games/SnakeGame.tsx - 스네이크 게임

import { useEffect, useRef, useState, useCallback } from "react";

interface Props { seniorMode: boolean; onComplete: (score: number) => void; onSkip: () => void; }

const COLS = 16, ROWS = 20;
const PASS_FOOD = 5;

type Dir = "U"|"D"|"L"|"R";
type Pt = { x: number; y: number };

export default function SnakeGame({ seniorMode, onComplete, onSkip }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef  = useRef({
    snake: [{x:8,y:10},{x:7,y:10},{x:6,y:10}] as Pt[],
    dir: "R" as Dir,
    nextDir: "R" as Dir,
    food: {x:12,y:10} as Pt,
    eaten: 0,
    phase: "playing" as "playing"|"result",
    passed: false,
  });
  const [display, setDisplay] = useState({eaten:0, phase:"playing", passed:false});
  const rafRef  = useRef<number>(0);
  const lastRef = useRef(0);

  const randFood = useCallback((snake: Pt[]): Pt => {
    let pt: Pt;
    do { pt = {x:Math.floor(Math.random()*COLS), y:Math.floor(Math.random()*ROWS)}; }
    while (snake.some(s=>s.x===pt.x&&s.y===pt.y));
    return pt;
  }, []);

  useEffect(() => {
    const cvs = canvasRef.current; if (!cvs) return;
    const CELL = seniorMode ? 22 : 18;
    const W = cvs.width  = COLS * CELL;
    const H = cvs.height = ROWS * CELL;
    const SPEED = seniorMode ? 220 : 160;

    function loop(ts: number) {
      const ctx = cvs!.getContext("2d"); if (!ctx) return;
      const s = stateRef.current;
      if (s.phase !== "playing") return;

      // 틱
      if (ts - lastRef.current > SPEED) {
        lastRef.current = ts;
        s.dir = s.nextDir;
        const head = {...s.snake[0]};
        if (s.dir==="R") head.x++;
        else if (s.dir==="L") head.x--;
        else if (s.dir==="U") head.y--;
        else head.y++;

        // 벽 충돌
        if (head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS) {
          s.phase="result"; setDisplay({eaten:s.eaten,phase:"result",passed:s.passed}); return;
        }
        // 자기 충돌
        if (s.snake.some(p=>p.x===head.x&&p.y===head.y)) {
          s.phase="result"; setDisplay({eaten:s.eaten,phase:"result",passed:s.passed}); return;
        }

        s.snake.unshift(head);
        if (head.x===s.food.x&&head.y===s.food.y) {
          s.eaten++;
          if (s.eaten>=PASS_FOOD && !s.passed) s.passed=true;
          if (s.eaten>=PASS_FOOD) { s.phase="result"; setDisplay({eaten:s.eaten,phase:"result",passed:true}); return; }
          s.food = randFood(s.snake);
          setDisplay({eaten:s.eaten,phase:"playing",passed:s.passed});
        } else {
          s.snake.pop();
        }
      }

      // 그리기
      ctx.fillStyle="#0a0a10"; ctx.fillRect(0,0,W,H);
      // 그리드
      ctx.strokeStyle="#12121a"; ctx.lineWidth=0.5;
      for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) ctx.strokeRect(c*CELL,r*CELL,CELL,CELL);

      // 뱀
      s.snake.forEach((p,i)=>{
        const ratio = i/s.snake.length;
        ctx.fillStyle = i===0 ? "#4adf6f" : `hsl(${140-ratio*40},${70-ratio*20}%,${45-ratio*15}%)`;
        ctx.beginPath();
        ctx.roundRect(p.x*CELL+1,p.y*CELL+1,CELL-2,CELL-2, i===0?4:2);
        ctx.fill();
        // 눈
        if (i===0) {
          ctx.fillStyle="#000";
          const ex = s.dir==="R"?CELL*0.7:s.dir==="L"?CELL*0.3:CELL*0.3;
          const ey = s.dir==="D"?CELL*0.7:s.dir==="U"?CELL*0.3:CELL*0.3;
          const ex2 = s.dir==="R"?CELL*0.7:s.dir==="L"?CELL*0.3:CELL*0.7;
          const ey2 = s.dir==="D"?CELL*0.7:s.dir==="U"?CELL*0.3:CELL*0.7;
          ctx.beginPath(); ctx.arc(p.x*CELL+ex, p.y*CELL+ey, 2, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(p.x*CELL+ex2, p.y*CELL+ey2, 2, 0, Math.PI*2); ctx.fill();
        }
      });

      // 먹이
      ctx.fillStyle="#ff4444";
      ctx.beginPath(); ctx.arc(s.food.x*CELL+CELL/2, s.food.y*CELL+CELL/2, CELL/2-2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle="#ff8888";
      ctx.beginPath(); ctx.arc(s.food.x*CELL+CELL/2-2, s.food.y*CELL+CELL/2-2, CELL/4, 0, Math.PI*2); ctx.fill();

      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [seniorMode, randFood]);

  function setDir(d: Dir) {
    const cur = stateRef.current.dir;
    if ((d==="U"&&cur==="D")||(d==="D"&&cur==="U")||(d==="L"&&cur==="R")||(d==="R"&&cur==="L")) return;
    stateRef.current.nextDir = d;
  }

  function restart() {
    cancelAnimationFrame(rafRef.current);
    stateRef.current = {
      snake:[{x:8,y:10},{x:7,y:10},{x:6,y:10}],
      dir:"R", nextDir:"R",
      food:{x:12,y:10},
      eaten:0, phase:"playing", passed:false,
    };
    setDisplay({eaten:0, phase:"playing", passed:false});
    lastRef.current = 0;
    const cvs = canvasRef.current;
    if (!cvs) return;
    const CELL = seniorMode?22:18;
    const SPEED = seniorMode?220:160;
    function loop(ts: number) {
      const ctx = cvs!.getContext("2d"); if(!ctx) return;
      const s = stateRef.current;
      if (s.phase!=="playing") return;
      if (ts-lastRef.current>SPEED) {
        lastRef.current=ts;
        s.dir=s.nextDir;
        const head={...s.snake[0]};
        if(s.dir==="R")head.x++;else if(s.dir==="L")head.x--;else if(s.dir==="U")head.y--;else head.y++;
        if(head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS){s.phase="result";setDisplay({eaten:s.eaten,phase:"result",passed:s.passed});return;}
        if(s.snake.some(p=>p.x===head.x&&p.y===head.y)){s.phase="result";setDisplay({eaten:s.eaten,phase:"result",passed:s.passed});return;}
        s.snake.unshift(head);
        if(head.x===s.food.x&&head.y===s.food.y){
          s.eaten++;
          if(s.eaten>=PASS_FOOD){s.phase="result";setDisplay({eaten:s.eaten,phase:"result",passed:true});return;}
          s.food={x:Math.floor(Math.random()*COLS),y:Math.floor(Math.random()*ROWS)};
          setDisplay({eaten:s.eaten,phase:"playing",passed:false});
        } else { s.snake.pop(); }
      }
      const W=COLS*CELL,H=ROWS*CELL;
      ctx.fillStyle="#0a0a10";ctx.fillRect(0,0,W,H);
      s.snake.forEach((p,i)=>{
        ctx.fillStyle=i===0?"#4adf6f":`hsl(${140-i/s.snake.length*40},60%,40%)`;
        ctx.beginPath();ctx.roundRect(p.x*CELL+1,p.y*CELL+1,CELL-2,CELL-2,i===0?4:2);ctx.fill();
      });
      ctx.fillStyle="#ff4444";ctx.beginPath();ctx.arc(s.food.x*CELL+CELL/2,s.food.y*CELL+CELL/2,CELL/2-2,0,Math.PI*2);ctx.fill();
      rafRef.current=requestAnimationFrame(loop);
    }
    rafRef.current=requestAnimationFrame(loop);
  }

  if (display.phase==="result") {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-6 px-4">
        <div className="text-7xl">{display.passed?"🎉":"😢"}</div>
        <h2 className={`font-bold ${display.passed?"text-[#4a9d6f]":"text-[#e07070]"} ${seniorMode?"text-3xl":"text-2xl"}`}>
          {display.passed?"통과!":"충돌!"}
        </h2>
        <p className={`text-[#c4bfb4] ${seniorMode?"text-xl":"text-base"}`}>
          먹이 {display.eaten}개 (목표: {PASS_FOOD}개)
        </p>
        <div className="space-y-3 w-full max-w-xs">
          {display.passed
            ? <button onClick={()=>onComplete(display.eaten*20)}
                className={`w-full rounded-xl bg-[#4a9d6f] font-bold text-white ${seniorMode?"py-5 text-xl":"py-3 text-base"}`}>🗝 열쇠 획득!</button>
            : <button onClick={restart}
                className={`w-full rounded-xl bg-[#b89a5a] font-bold text-[#0f0f10] ${seniorMode?"py-5 text-xl":"py-3 text-base"}`}>🔄 다시 도전</button>
          }
          <button onClick={onSkip} className={`w-full rounded-xl border border-[#2a2924] text-[#7a756c] ${seniorMode?"py-4 text-lg":"py-2.5 text-sm"}`}>나가기</button>
        </div>
      </div>
    );
  }

  const btnCls = `rounded-xl bg-[#2a2924] active:bg-[#3a3930] font-bold text-[#e8e4d9] flex items-center justify-center ${seniorMode?"text-3xl":"text-2xl"}`;

  return (
    <div className="h-full flex flex-col items-center py-3 space-y-2">
      <div className="flex items-center gap-6">
        <p className={`text-[#4a9d6f] font-bold ${seniorMode?"text-xl":"text-base"}`}>🍎 {display.eaten}/{PASS_FOOD}</p>
        <p className={`text-[#7a756c] ${seniorMode?"text-lg":"text-sm"}`}>먹이를 {PASS_FOOD}개 먹으면 통과!</p>
        <button onClick={onSkip} className={`text-[#4a4840] ${seniorMode?"text-base":"text-xs"}`}>포기</button>
      </div>
      <canvas ref={canvasRef} className="rounded-xl border border-[#2a2924]"/>
      <div className="grid grid-cols-3 gap-2 w-full max-w-[240px]">
        <div/><button onPointerDown={()=>setDir("U")} className={`${btnCls} py-3`}>▲</button><div/>
        <button onPointerDown={()=>setDir("L")} className={`${btnCls} py-3`}>◀</button>
        <div className="rounded-xl bg-[#18181a] flex items-center justify-center text-lg">🐍</div>
        <button onPointerDown={()=>setDir("R")} className={`${btnCls} py-3`}>▶</button>
        <div/><button onPointerDown={()=>setDir("D")} className={`${btnCls} py-3`}>▼</button><div/>
      </div>
    </div>
  );
}
