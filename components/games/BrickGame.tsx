"use client";
// components/games/BrickGame.tsx - 벽돌깨기

import { useEffect, useRef, useState } from "react";

interface Props { seniorMode: boolean; onComplete: (score: number) => void; onSkip: () => void; }

const PASS_BRICKS = 15;

export default function BrickGame({ seniorMode, onComplete, onSkip }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef  = useRef({
    px: 150, pw: seniorMode?90:70, ph: 12,
    bx: 150, by: 200, bdx: seniorMode?3:4, bdy: seniorMode?-3:-4, br: 8,
    bricks: Array.from({length:4},(_,r)=>Array.from({length:8},(_,c)=>({
      x:c*45+15, y:r*22+40, w:38, h:16, alive:true,
      color:["#e07070","#b89a5a","#4a9d6f","#7070e0"][r]
    }))).flat(),
    broken: 0, phase: "playing" as "playing"|"result", passed: false,
  });
  const [display, setDisplay] = useState({broken:0, phase:"playing", passed:false});
  const rafRef = useRef<number>(0);
  const touchRef = useRef<number|null>(null);

  useEffect(() => {
    const cvs = canvasRef.current; if(!cvs) return;
    const W=cvs.width=380, H=cvs.height=460;

    function loop() {
      const ctx = cvs!.getContext("2d"); if(!ctx) return;
      const s = stateRef.current;
      if (s.phase !== "playing") return;

      // 공 이동
      s.bx += s.bdx; s.by += s.bdy;

      // 벽 반사
      if (s.bx-s.br<0||s.bx+s.br>W) s.bdx*=-1;
      if (s.by-s.br<0) s.bdy*=-1;

      // 바닥 - 실패
      if (s.by+s.br>H) {
        s.phase="result";
        setDisplay({broken:s.broken, phase:"result", passed:s.passed});
        return;
      }

      // 패들 충돌
      if (s.by+s.br>=H-40 && s.bx>=s.px && s.bx<=s.px+s.pw) {
        s.bdy = -Math.abs(s.bdy);
        const rel = (s.bx-(s.px+s.pw/2))/(s.pw/2);
        s.bdx = rel * 5;
      }

      // 벽돌 충돌
      for (const b of s.bricks) {
        if (!b.alive) continue;
        if (s.bx+s.br>b.x && s.bx-s.br<b.x+b.w && s.by+s.br>b.y && s.by-s.br<b.y+b.h) {
          b.alive=false; s.broken++; s.bdy*=-1;
          if (s.broken>=PASS_BRICKS && !s.passed) s.passed=true;
          if (s.bricks.every(bk=>!bk.alive)) { s.phase="result"; setDisplay({broken:s.broken,phase:"result",passed:s.passed}); return; }
          setDisplay({broken:s.broken, phase:"playing", passed:s.passed});
          break;
        }
      }

      // 그리기
      ctx.fillStyle="#0a0a0f"; ctx.fillRect(0,0,W,H);
      // 벽돌
      for (const b of s.bricks) {
        if(!b.alive) continue;
        ctx.fillStyle=b.color; ctx.fillRect(b.x,b.y,b.w,b.h);
        ctx.fillStyle="rgba(255,255,255,0.2)"; ctx.fillRect(b.x,b.y,b.w,4);
      }
      // 패들
      const pg=ctx.createLinearGradient(s.px,0,s.px+s.pw,0);
      pg.addColorStop(0,"#b89a5a"); pg.addColorStop(0.5,"#e8c87a"); pg.addColorStop(1,"#b89a5a");
      ctx.fillStyle=pg; ctx.beginPath(); ctx.roundRect(s.px,H-40,s.pw,s.ph,6); ctx.fill();
      // 공
      const bg=ctx.createRadialGradient(s.bx-2,s.by-2,1,s.bx,s.by,s.br);
      bg.addColorStop(0,"#fff"); bg.addColorStop(1,"#b89a5a");
      ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(s.bx,s.by,s.br,0,Math.PI*2); ctx.fill();

      rafRef.current=requestAnimationFrame(loop);
    }
    rafRef.current=requestAnimationFrame(loop);
    return ()=>cancelAnimationFrame(rafRef.current);
  }, [seniorMode]);

  function handleTouch(e: React.TouchEvent) {
    const cvs=canvasRef.current; if(!cvs) return;
    const rect=cvs.getBoundingClientRect();
    const x=(e.touches[0].clientX-rect.left)*(cvs.width/rect.width);
    stateRef.current.px=Math.max(0, Math.min(cvs.width-stateRef.current.pw, x-stateRef.current.pw/2));
  }
  function handleMouse(e: React.MouseEvent) {
    const cvs=canvasRef.current; if(!cvs) return;
    const rect=cvs.getBoundingClientRect();
    const x=(e.clientX-rect.left)*(cvs.width/rect.width);
    stateRef.current.px=Math.max(0, Math.min(cvs.width-stateRef.current.pw, x-stateRef.current.pw/2));
  }

  if (display.phase==="result") {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-6 px-4">
        <div className="text-7xl">{display.passed?"🎉":"😢"}</div>
        <h2 className={`font-bold ${display.passed?"text-[#4a9d6f]":"text-[#e07070]"} ${seniorMode?"text-3xl":"text-2xl"}`}>
          {display.passed?"통과!":"아쉽네요!"}
        </h2>
        <p className={`text-[#c4bfb4] ${seniorMode?"text-xl":"text-base"}`}>{display.broken}개 파괴 (목표: {PASS_BRICKS}개)</p>
        <div className="space-y-3 w-full max-w-xs">
          {display.passed
            ? <button onClick={()=>onComplete(display.broken*10)} className={`w-full rounded-xl bg-[#4a9d6f] font-bold text-white ${seniorMode?"py-5 text-xl":"py-3 text-base"}`}>🗝 열쇠 획득!</button>
            : <button onClick={()=>{
                const s=stateRef.current;
                s.px=150;s.bx=150;s.by=200;s.bdx=seniorMode?3:4;s.bdy=seniorMode?-3:-4;
                s.bricks=Array.from({length:4},(_,r)=>Array.from({length:8},(_,c)=>({x:c*45+15,y:r*22+40,w:38,h:16,alive:true,color:["#e07070","#b89a5a","#4a9d6f","#7070e0"][r]}))).flat();
                s.broken=0;s.phase="playing";s.passed=false;
                setDisplay({broken:0,phase:"playing",passed:false});
                rafRef.current=requestAnimationFrame(()=>{});
              }} className={`w-full rounded-xl bg-[#b89a5a] font-bold text-[#0f0f10] ${seniorMode?"py-5 text-xl":"py-3 text-base"}`}>🔄 다시 도전</button>
          }
          <button onClick={onSkip} className={`w-full rounded-xl border border-[#2a2924] text-[#7a756c] ${seniorMode?"py-4 text-lg":"py-2.5 text-sm"}`}>나가기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center py-3 space-y-2">
      <div className="flex items-center gap-6">
        <p className={`text-[#b89a5a] font-bold ${seniorMode?"text-xl":"text-base"}`}>🧱 {display.broken}/{PASS_BRICKS}개</p>
        <button onClick={onSkip} className={`text-[#4a4840] ${seniorMode?"text-base":"text-xs"}`}>포기</button>
      </div>
      <canvas ref={canvasRef} className="rounded-xl border border-[#2a2924] touch-none"
        onMouseMove={handleMouse} onTouchMove={handleTouch}/>
      <p className={`text-[#5a5650] ${seniorMode?"text-base":"text-xs"}`}>화면을 좌우로 움직여 패들을 조종하세요</p>
    </div>
  );
}
