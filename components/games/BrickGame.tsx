"use client";
// components/games/BrickGame.tsx - 벽돌깨기 (모두 깨면 통과)

import { useEffect, useRef, useState } from "react";

interface Props { seniorMode: boolean; onComplete: (score: number) => void; onSkip: () => void; }

function BrickBoard({ seniorMode, onComplete, onSkip, onDead }: Props & { onDead: (broken: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [broken, setBroken] = useState(0);
  const alive = useRef(true);

  useEffect(() => {
    const cvs = canvasRef.current; if (!cvs) return;
    const W = cvs.width = 380, H = cvs.height = 460;
    const PW = seniorMode ? 90 : 70;
    let px = 150;
    let bx = 190, by = 250;
    let bdx = seniorMode ? 3 : 4, bdy = seniorMode ? -3 : -4;
    const BR = 8;

    const ROWS_B = 4, COLS_B = 8;
    const bricks = Array.from({length:ROWS_B},(_,r)=>Array.from({length:COLS_B},(_,c)=>({
      x:c*45+8, y:r*24+40, w:38, h:18, alive:true,
      color:["#e07070","#b89a5a","#4a9d6f","#7070e0"][r]
    }))).flat();
    const TOTAL = bricks.length;
    let brokenCount = 0;

    function loop() {
      if (!alive.current) return;
      const ctx = cvs!.getContext("2d"); if (!ctx) return;
      bx+=bdx; by+=bdy;
      if(bx-BR<0||bx+BR>W) bdx*=-1;
      if(by-BR<0) bdy*=-1;
      if(by+BR>H) { alive.current=false; onDead(brokenCount); return; }
      if(by+BR>=H-40&&bx>=px&&bx<=px+PW) {
        bdy=-Math.abs(bdy);
        bdx=((bx-(px+PW/2))/(PW/2))*5;
      }
      for(const b of bricks) {
        if(!b.alive) continue;
        if(bx+BR>b.x&&bx-BR<b.x+b.w&&by+BR>b.y&&by-BR<b.y+b.h) {
          b.alive=false; bdy*=-1; brokenCount++;
          setBroken(brokenCount);
          if(brokenCount>=TOTAL) { alive.current=false; onComplete(brokenCount*10); return; }
          break;
        }
      }
      ctx.fillStyle="#0a0a0f"; ctx.fillRect(0,0,W,H);
      for(const b of bricks) {
        if(!b.alive) continue;
        ctx.fillStyle=b.color; ctx.fillRect(b.x,b.y,b.w,b.h);
        ctx.fillStyle="rgba(255,255,255,0.2)"; ctx.fillRect(b.x,b.y,b.w,4);
      }
      const pg=ctx.createLinearGradient(px,0,px+PW,0);
      pg.addColorStop(0,"#b89a5a"); pg.addColorStop(0.5,"#e8c87a"); pg.addColorStop(1,"#b89a5a");
      ctx.fillStyle=pg; ctx.beginPath(); ctx.roundRect(px,H-40,PW,12,6); ctx.fill();
      const bg=ctx.createRadialGradient(bx-2,by-2,1,bx,by,BR);
      bg.addColorStop(0,"#fff"); bg.addColorStop(1,"#b89a5a");
      ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(bx,by,BR,0,Math.PI*2); ctx.fill();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    function onTouch(e: TouchEvent) {
      const rect=cvs!.getBoundingClientRect();
      const x=(e.touches[0].clientX-rect.left)*(W/rect.width);
      px=Math.max(0,Math.min(W-PW,x-PW/2));
    }
    function onMouse(e: MouseEvent) {
      const rect=cvs!.getBoundingClientRect();
      const x=(e.clientX-rect.left)*(W/rect.width);
      px=Math.max(0,Math.min(W-PW,x-PW/2));
    }
    cvs.addEventListener("touchmove",onTouch,{passive:true});
    cvs.addEventListener("mousemove",onMouse);
    return () => { alive.current=false; cvs.removeEventListener("touchmove",onTouch); cvs.removeEventListener("mousemove",onMouse); };
  },[seniorMode,onComplete,onDead]);

  return (
    <div className="h-full flex flex-col items-center py-3 space-y-2">
      <div className="flex items-center gap-6">
        <p className={`text-[#b89a5a] font-bold ${seniorMode?"text-xl":"text-base"}`}>🧱 {broken}개 파괴</p>
        <p className={`text-[#7a756c] ${seniorMode?"text-lg":"text-sm"}`}>모두 깨면 통과!</p>
        <button onClick={onSkip} className={`text-[#4a4840] ${seniorMode?"text-base":"text-xs"}`}>포기</button>
      </div>
      <canvas ref={canvasRef} className="rounded-xl border border-[#2a2924] touch-none"/>
      <p className={`text-[#5a5650] ${seniorMode?"text-base":"text-xs"}`}>화면을 움직여 패들을 조종하세요</p>
    </div>
  );
}

export default function BrickGame({ seniorMode, onComplete, onSkip }: Props) {
  const [key, setKey]   = useState(0);
  const [dead, setDead] = useState<number|null>(null);

  if (dead !== null) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-6 px-4">
        <div className="text-7xl">😢</div>
        <h2 className={`font-bold text-[#e07070] ${seniorMode?"text-3xl":"text-2xl"}`}>아쉽네요!</h2>
        <p className={`text-[#c4bfb4] ${seniorMode?"text-xl":"text-base"}`}>{dead}개 파괴 (모두 깨면 통과)</p>
        <div className="space-y-3 w-full max-w-xs">
          <button onClick={()=>{ setDead(null); setKey(k=>k+1); }} className={`w-full rounded-xl bg-[#b89a5a] font-bold text-[#0f0f10] ${seniorMode?"py-5 text-xl":"py-3 text-base"}`}>🔄 다시 도전</button>
          <button onClick={onSkip} className={`w-full rounded-xl border border-[#2a2924] text-[#7a756c] ${seniorMode?"py-4 text-lg":"py-2.5 text-sm"}`}>나가기</button>
        </div>
      </div>
    );
  }

  return <BrickBoard key={key} seniorMode={seniorMode} onComplete={onComplete} onSkip={onSkip} onDead={setDead}/>;
}
