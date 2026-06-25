"use client";
// components/games/JumpGame.tsx - 점프 게임 (플래피버드 스타일)

import { useEffect, useRef, useState } from "react";

interface Props { seniorMode: boolean; onComplete: (score: number) => void; onSkip: () => void; }

const PASS_SCORE = 5;
const GRAVITY = (seniorMode: boolean) => seniorMode ? 0.4 : 0.55;
const JUMP = (seniorMode: boolean) => seniorMode ? -9 : -11;
const PIPE_SPEED = (seniorMode: boolean) => seniorMode ? 2.5 : 3.5;
const GAP = (seniorMode: boolean) => seniorMode ? 160 : 140;

export default function JumpGame({ seniorMode, onComplete, onSkip }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    y: 200, vy: 0,
    pipes: [] as {x:number; top:number; passed:boolean}[],
    score: 0, phase: "waiting" as "waiting"|"playing"|"result",
    frame: 0,
  });
  const [display, setDisplay] = useState({score:0, phase:"waiting"});
  const rafRef = useRef<number>(0);

  function jump() {
    const s = stateRef.current;
    if (s.phase === "waiting") { s.phase = "playing"; }
    if (s.phase === "playing") { s.vy = JUMP(seniorMode); }
  }

  useEffect(() => {
    const cvs = canvasRef.current; if (!cvs) return;
    const W = cvs.width = 380, H = cvs.height = 460;
    const R = 16;

    function loop() {
      const ctx = cvs!.getContext("2d"); if (!ctx) return;
      const s = stateRef.current;
      s.frame++;

      if (s.phase === "playing") {
        // 물리
        s.vy += GRAVITY(seniorMode);
        s.y += s.vy;

        // 파이프 생성
        if (s.frame % (seniorMode?120:90) === 0) {
          const top = 60 + Math.random() * (H - GAP(seniorMode) - 100);
          s.pipes.push({x: W, top, passed:false});
        }

        // 파이프 이동
        for (const p of s.pipes) {
          p.x -= PIPE_SPEED(seniorMode);
          // 통과 체크
          if (!p.passed && p.x + 50 < 80) {
            p.passed = true; s.score++;
            if (s.score >= PASS_SCORE) s.phase = "result";
            setDisplay({score:s.score, phase:s.phase});
          }
        }
        s.pipes = s.pipes.filter(p => p.x > -60);

        // 충돌 - 위/아래
        if (s.y - R < 0 || s.y + R > H) { s.phase = "result"; setDisplay({score:s.score, phase:"result"}); }

        // 파이프 충돌
        for (const p of s.pipes) {
          if (80+R > p.x && 80-R < p.x+50) {
            if (s.y-R < p.top || s.y+R > p.top+GAP(seniorMode)) {
              s.phase="result"; setDisplay({score:s.score, phase:"result"}); break;
            }
          }
        }
      }

      // 그리기
      // 하늘
      const sky = ctx.createLinearGradient(0,0,0,H);
      sky.addColorStop(0,"#1a1a3e"); sky.addColorStop(1,"#2a1a4e");
      ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);

      // 별
      ctx.fillStyle="rgba(255,255,255,0.5)";
      [50,120,200,300,60,180,350,90].forEach((x,i)=>{ ctx.beginPath(); ctx.arc(x,(i*57+30)%200,1.5,0,Math.PI*2); ctx.fill(); });

      // 파이프
      for (const p of s.pipes) {
        // 위 파이프
        const pg1=ctx.createLinearGradient(p.x,0,p.x+50,0);
        pg1.addColorStop(0,"#2d7a2d"); pg1.addColorStop(0.3,"#4a9d4a"); pg1.addColorStop(1,"#1d5a1d");
        ctx.fillStyle=pg1;
        ctx.fillRect(p.x,0,50,p.top);
        ctx.fillRect(p.x-5,p.top-20,60,20);
        // 아래 파이프
        const bot = p.top + GAP(seniorMode);
        ctx.fillStyle=pg1;
        ctx.fillRect(p.x,bot,50,H-bot);
        ctx.fillRect(p.x-5,bot,60,20);
      }

      // 캐릭터 (새)
      const wingY = Math.sin(s.frame*0.2)*3;
      ctx.save();
      ctx.translate(80, s.y);
      ctx.rotate(Math.max(-0.4, Math.min(0.4, s.vy*0.05)));
      // 몸통
      ctx.fillStyle="#f0c040";
      ctx.beginPath(); ctx.ellipse(0,0,R,R*0.8,0,0,Math.PI*2); ctx.fill();
      // 날개
      ctx.fillStyle="#e0a020";
      ctx.beginPath(); ctx.ellipse(-6, wingY, 8, 5, -0.3, 0, Math.PI*2); ctx.fill();
      // 눈
      ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(6,-3,4,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#000"; ctx.beginPath(); ctx.arc(7,-3,2,0,Math.PI*2); ctx.fill();
      // 부리
      ctx.fillStyle="#f06000";
      ctx.beginPath(); ctx.moveTo(R,0); ctx.lineTo(R+8,2); ctx.lineTo(R,-4); ctx.fill();
      ctx.restore();

      // 점수
      ctx.fillStyle="#fff";
      ctx.font=`bold ${seniorMode?28:22}px sans-serif`;
      ctx.textAlign="center";
      ctx.fillText(`${s.score} / ${PASS_SCORE}`, W/2, 35);

      // 대기 화면
      if (s.phase==="waiting") {
        ctx.fillStyle="rgba(0,0,0,0.5)";
        ctx.fillRect(0,0,W,H);
        ctx.fillStyle="#fff";
        ctx.font=`bold ${seniorMode?28:22}px sans-serif`;
        ctx.fillText("탭해서 시작!", W/2, H/2);
        ctx.font=`${seniorMode?20:16}px sans-serif`;
        ctx.fillText(`${PASS_SCORE}개 통과하면 성공!`, W/2, H/2+40);
      }

      if (s.phase==="playing" || s.phase==="waiting")
        rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [seniorMode]);

  if (display.phase === "result") {
    const passed = stateRef.current.score >= PASS_SCORE;
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-6 px-4">
        <div className="text-7xl">{passed?"🎉":"😢"}</div>
        <h2 className={`font-bold ${passed?"text-[#4a9d6f]":"text-[#e07070]"} ${seniorMode?"text-3xl":"text-2xl"}`}>
          {passed?"통과!":"충돌!"}
        </h2>
        <p className={`text-[#c4bfb4] ${seniorMode?"text-xl":"text-base"}`}>{display.score}개 통과 (목표: {PASS_SCORE}개)</p>
        <div className="space-y-3 w-full max-w-xs">
          {passed
            ? <button onClick={()=>onComplete(display.score*20)} className={`w-full rounded-xl bg-[#4a9d6f] font-bold text-white ${seniorMode?"py-5 text-xl":"py-3 text-base"}`}>🗝 열쇠 획득!</button>
            : <button onClick={()=>{
                stateRef.current={y:200,vy:0,pipes:[],score:0,phase:"waiting",frame:0};
                setDisplay({score:0,phase:"waiting"});
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
      <canvas ref={canvasRef} className="rounded-xl border border-[#2a2924] cursor-pointer"
        onPointerDown={jump}/>
      <button onClick={onSkip} className={`text-[#4a4840] ${seniorMode?"text-base":"text-xs"}`}>포기하기</button>
    </div>
  );
}
