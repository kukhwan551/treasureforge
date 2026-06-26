"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface Props { seniorMode: boolean; target?: number; onComplete: (score: number) => void; onSkip: () => void; }

const COLS=10,ROWS=18;
const PIECES=[
  {shape:[[1,1,1,1]],color:"#00f0f0"},{shape:[[1,1],[1,1]],color:"#f0f000"},
  {shape:[[0,1,0],[1,1,1]],color:"#a000f0"},{shape:[[1,0],[1,0],[1,1]],color:"#f0a000"},
  {shape:[[0,1],[0,1],[1,1]],color:"#0000f0"},{shape:[[0,1,1],[1,1,0]],color:"#00f000"},
  {shape:[[1,1,0],[0,1,1]],color:"#f00000"},
];
function emptyBoard(){return Array.from({length:ROWS},()=>Array(COLS).fill(0));}
function randPiece(){return {...PIECES[Math.floor(Math.random()*PIECES.length)]};}
function rotate(s:number[][]){return s[0].map((_,i)=>s.map(r=>r[i]).reverse());}

function TetrisBoard({seniorMode,target,onComplete,onSkip,onResult}:Props&{onResult:(l:number,s:number)=>void}){
  const PASS=target||10;
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const CELL=seniorMode?22:18;
  const board=useRef(emptyBoard());
  const piece=useRef(randPiece());
  const pos=useRef({x:3,y:0});
  const lines=useRef(0);
  const score=useRef(0);
  const alive=useRef(true);
  const [display,setDisplay]=useState({lines:0,score:0});

  const valid=useCallback((shape:number[][],px:number,py:number)=>{
    for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++){
      if(!shape[r][c])continue;
      if(py+r<0||py+r>=ROWS||px+c<0||px+c>=COLS||board.current[py+r][px+c])return false;
    }
    return true;
  },[]);

  const lock=useCallback(()=>{
    const{shape,color}=piece.current;const{x,y}=pos.current;
    for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++)
      if(shape[r][c])board.current[y+r][x+c]=color as unknown as number;
    let cleared=0;
    board.current=board.current.filter(row=>{if(row.every(c=>c)){cleared++;return false;}return true;});
    while(board.current.length<ROWS)board.current.unshift(Array(COLS).fill(0));
    lines.current+=cleared;score.current+=cleared*100;
    setDisplay({lines:lines.current,score:score.current});
    if(lines.current>=PASS){alive.current=false;onComplete(score.current);return;}
    piece.current=randPiece();pos.current={x:3,y:0};
    if(!valid(piece.current.shape,3,0)){alive.current=false;onResult(lines.current,score.current);}
  },[valid,onComplete,onResult,PASS]);

  useEffect(()=>{
    const cvs=canvasRef.current;if(!cvs)return;
    cvs.width=COLS*CELL;cvs.height=ROWS*CELL;
    let last=0;const SPEED=seniorMode?900:700;
    function draw(){
      const ctx=cvs!.getContext("2d");if(!ctx)return;
      ctx.fillStyle="#0a0a0f";ctx.fillRect(0,0,COLS*CELL,ROWS*CELL);
      ctx.strokeStyle="#1a1a2e";ctx.lineWidth=0.5;
      for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)ctx.strokeRect(c*CELL,r*CELL,CELL,CELL);
      for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)
        if(board.current[r][c]){ctx.fillStyle=board.current[r][c] as unknown as string;ctx.fillRect(c*CELL+1,r*CELL+1,CELL-2,CELL-2);}
      const{shape,color}=piece.current;const{x,y}=pos.current;
      for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++)
        if(shape[r][c]){ctx.fillStyle=color;ctx.fillRect((x+c)*CELL+1,(y+r)*CELL+1,CELL-2,CELL-2);}
    }
    function loop(ts:number){
      if(!alive.current)return;
      if(ts-last>SPEED){last=ts;if(valid(piece.current.shape,pos.current.x,pos.current.y+1))pos.current.y++;else lock();}
      draw();if(alive.current)requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  },[CELL,lock,seniorMode,valid]);

  function moveLeft(){if(valid(piece.current.shape,pos.current.x-1,pos.current.y))pos.current.x--;}
  function moveRight(){if(valid(piece.current.shape,pos.current.x+1,pos.current.y))pos.current.x++;}
  function moveDown(){if(valid(piece.current.shape,pos.current.x,pos.current.y+1))pos.current.y++;else lock();}
  function rotatePc(){const r=rotate(piece.current.shape);if(valid(r,pos.current.x,pos.current.y))piece.current={...piece.current,shape:r};}

  return(
    <div className="h-full flex flex-col items-center py-3 space-y-2">
      <div className="flex items-center gap-6">
        <p className={`text-[#b89a5a] font-bold ${seniorMode?"text-xl":"text-base"}`}>🟦 {display.lines}/{PASS}줄</p>
        <p className={`text-[#7a756c] ${seniorMode?"text-lg":"text-sm"}`}>점수 {display.score}</p>
        <button onClick={onSkip} className={`text-[#4a4840] ${seniorMode?"text-base":"text-xs"}`}>포기</button>
      </div>
      <canvas ref={canvasRef} className="rounded-xl border border-[#2a2924]"/>
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
        <button onPointerDown={moveLeft} className={`rounded-xl bg-[#2a2924] active:bg-[#3a3930] font-bold text-[#e8e4d9] ${seniorMode?"py-5 text-2xl":"py-3 text-xl"}`}>◀</button>
        <button onPointerDown={rotatePc} className={`rounded-xl bg-[#b89a5a]/20 border border-[#b89a5a]/40 font-bold text-[#b89a5a] ${seniorMode?"py-5 text-2xl":"py-3 text-xl"}`}>↻</button>
        <button onPointerDown={moveRight} className={`rounded-xl bg-[#2a2924] active:bg-[#3a3930] font-bold text-[#e8e4d9] ${seniorMode?"py-5 text-2xl":"py-3 text-xl"}`}>▶</button>
        <div/><button onPointerDown={moveDown} className={`rounded-xl bg-[#2a2924] active:bg-[#3a3930] font-bold text-[#e8e4d9] ${seniorMode?"py-5 text-2xl":"py-3 text-xl"}`}>▼</button><div/>
      </div>
    </div>
  );
}

export default function TetrisGame({seniorMode,target,onComplete,onSkip}:Props){
  const[key,setKey]=useState(0);
  const[result,setResult]=useState<{lines:number;score:number}|null>(null);
  const PASS=target||10;
  if(result!==null)return(
    <div className="h-full flex flex-col items-center justify-center space-y-6 px-4">
      <div className="text-7xl">😢</div>
      <h2 className={`font-bold text-[#e07070] ${seniorMode?"text-3xl":"text-2xl"}`}>게임 오버</h2>
      <p className={`text-[#c4bfb4] ${seniorMode?"text-xl":"text-base"}`}>{result.lines}줄 (목표: {PASS}줄)</p>
      <div className="space-y-3 w-full max-w-xs">
        <button onClick={()=>{setResult(null);setKey(k=>k+1);}} className={`w-full rounded-xl bg-[#b89a5a] font-bold text-[#0f0f10] ${seniorMode?"py-5 text-xl":"py-3 text-base"}`}>🔄 다시 도전</button>
        <button onClick={onSkip} className={`w-full rounded-xl border border-[#2a2924] text-[#7a756c] ${seniorMode?"py-4 text-lg":"py-2.5 text-sm"}`}>나가기</button>
      </div>
    </div>
  );
  return<TetrisBoard key={key} seniorMode={seniorMode} target={target} onComplete={onComplete} onSkip={onSkip} onResult={(l,s)=>setResult({lines:l,score:s})}/>;
}
