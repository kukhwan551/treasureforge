"use client";
// components/games/TetrisGame.tsx

import { useState, useEffect, useRef, useCallback } from "react";

interface Props { seniorMode: boolean; onComplete: (score: number) => void; onSkip: () => void; }

const COLS = 10, ROWS = 18;
const PASS_LINES = 3;

const PIECES = [
  { shape: [[1,1,1,1]], color: "#00f0f0" },           // I
  { shape: [[1,1],[1,1]], color: "#f0f000" },           // O
  { shape: [[0,1,0],[1,1,1]], color: "#a000f0" },       // T
  { shape: [[1,0],[1,0],[1,1]], color: "#f0a000" },     // L
  { shape: [[0,1],[0,1],[1,1]], color: "#0000f0" },     // J
  { shape: [[0,1,1],[1,1,0]], color: "#00f000" },       // S
  { shape: [[1,1,0],[0,1,1]], color: "#f00000" },       // Z
];

function emptyBoard() { return Array.from({length:ROWS}, () => Array(COLS).fill(0)); }
function randPiece() { return PIECES[Math.floor(Math.random()*PIECES.length)]; }
function rotate(shape: number[][]): number[][] {
  return shape[0].map((_,i) => shape.map(r => r[i]).reverse());
}

export default function TetrisGame({ seniorMode, onComplete, onSkip }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef  = useRef({
    board: emptyBoard(),
    piece: randPiece(),
    px: 3, py: 0,
    lines: 0,
    score: 0,
    phase: "playing" as "playing"|"result",
    passed: false,
  });
  const [display, setDisplay] = useState({ lines: 0, score: 0, phase: "playing", passed: false });
  const rafRef = useRef<number>(0);
  const dropRef = useRef(0);
  const CELL = seniorMode ? 22 : 18;

  const validPos = useCallback((shape: number[][], px: number, py: number, board: number[][]) => {
    for (let r=0;r<shape.length;r++) for (let c=0;c<shape[r].length;c++) {
      if (!shape[r][c]) continue;
      const nr=py+r, nc=px+c;
      if (nr<0||nr>=ROWS||nc<0||nc>=COLS||board[nr][nc]) return false;
    }
    return true;
  }, []);

  const lock = useCallback(() => {
    const s = stateRef.current;
    for (let r=0;r<s.piece.shape.length;r++) for (let c=0;c<s.piece.shape[r].length;c++) {
      if (s.piece.shape[r][c]) s.board[s.py+r][s.px+c] = s.piece.color as unknown as number;
    }
    // 줄 제거
    let cleared = 0;
    s.board = s.board.filter(row => { if (row.every(c=>c)) { cleared++; return false; } return true; });
    while (s.board.length < ROWS) s.board.unshift(Array(COLS).fill(0));
    s.lines += cleared;
    s.score += cleared * 100;
    if (s.lines >= PASS_LINES && !s.passed) { s.passed = true; }
    s.piece = randPiece();
    s.px = 3; s.py = 0;
    if (!validPos(s.piece.shape, s.px, s.py, s.board)) {
      s.phase = "result";
      setDisplay({...s});
    } else {
      setDisplay({lines:s.lines, score:s.score, phase:s.phase, passed:s.passed});
    }
  }, [validPos]);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const W = COLS * CELL, H = ROWS * CELL;
    cvs.width = W; cvs.height = H;

    function draw() {
      const ctx = cvs!.getContext("2d");
      if (!ctx) return;
      const s = stateRef.current;
      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0,0,W,H);
      // 그리드
      ctx.strokeStyle = "#1a1a2e";
      ctx.lineWidth = 0.5;
      for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
        ctx.strokeRect(c*CELL, r*CELL, CELL, CELL);
      }
      // 보드
      for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
        if (s.board[r][c]) {
          ctx.fillStyle = s.board[r][c] as unknown as string;
          ctx.fillRect(c*CELL+1, r*CELL+1, CELL-2, CELL-2);
        }
      }
      // 현재 피스
      for (let r=0;r<s.piece.shape.length;r++) for (let c=0;c<s.piece.shape[r].length;c++) {
        if (s.piece.shape[r][c]) {
          ctx.fillStyle = s.piece.color;
          ctx.fillRect((s.px+c)*CELL+1, (s.py+r)*CELL+1, CELL-2, CELL-2);
        }
      }
    }

    let last = 0;
    function loop(ts: number) {
      const s = stateRef.current;
      if (s.phase !== "playing") { draw(); return; }
      const speed = seniorMode ? 800 : 600;
      if (ts - last > speed) {
        last = ts;
        dropRef.current++;
        if (validPos(s.piece.shape, s.px, s.py+1, s.board)) {
          s.py++;
        } else {
          lock();
        }
      }
      draw();
      if (stateRef.current.phase === "playing") rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [CELL, lock, seniorMode, validPos]);

  function moveLeft()  { const s=stateRef.current; if (validPos(s.piece.shape,s.px-1,s.py,s.board)) s.px--; }
  function moveRight() { const s=stateRef.current; if (validPos(s.piece.shape,s.px+1,s.py,s.board)) s.px++; }
  function moveDown()  { const s=stateRef.current; if (validPos(s.piece.shape,s.px,s.py+1,s.board)) s.py++; else lock(); }
  function rotatePiece() {
    const s=stateRef.current;
    const r=rotate(s.piece.shape);
    if (validPos(r,s.px,s.py,s.board)) s.piece={...s.piece, shape:r};
  }

  if (display.phase === "result") {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-6 px-4">
        <div className="text-7xl">{display.passed?"🎉":"😢"}</div>
        <h2 className={`font-bold ${display.passed?"text-[#4a9d6f]":"text-[#e07070]"} ${seniorMode?"text-3xl":"text-2xl"}`}>
          {display.passed?"통과!":"게임 오버"}
        </h2>
        <p className={`text-[#c4bfb4] ${seniorMode?"text-xl":"text-base"}`}>{display.lines}줄 클리어 (목표: {PASS_LINES}줄)</p>
        <div className="space-y-3 w-full max-w-xs">
          {display.passed
            ? <button onClick={() => onComplete(display.score)}
                className={`w-full rounded-xl bg-[#4a9d6f] font-bold text-white ${seniorMode?"py-5 text-xl":"py-3 text-base"}`}>🗝 열쇠 획득!</button>
            : <button onClick={() => { stateRef.current={board:emptyBoard(),piece:randPiece(),px:3,py:0,lines:0,score:0,phase:"playing",passed:false}; setDisplay({lines:0,score:0,phase:"playing",passed:false}); rafRef.current=requestAnimationFrame(()=>{}); }}
                className={`w-full rounded-xl bg-[#b89a5a] font-bold text-[#0f0f10] ${seniorMode?"py-5 text-xl":"py-3 text-base"}`}>🔄 다시 도전</button>
          }
          <button onClick={onSkip} className={`w-full rounded-xl border border-[#2a2924] text-[#7a756c] ${seniorMode?"py-4 text-lg":"py-2.5 text-sm"}`}>나가기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center py-3 space-y-2">
      <div className="flex items-center gap-6">
        <p className={`text-[#b89a5a] font-bold ${seniorMode?"text-xl":"text-base"}`}>🟦 {display.lines}/{PASS_LINES}줄</p>
        <p className={`text-[#7a756c] ${seniorMode?"text-lg":"text-sm"}`}>점수 {display.score}</p>
        <button onClick={onSkip} className={`text-[#4a4840] ${seniorMode?"text-base":"text-xs"}`}>포기</button>
      </div>
      <canvas ref={canvasRef} className="rounded-xl border border-[#2a2924]"/>
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
        <button onPointerDown={moveLeft}  className={`rounded-xl bg-[#2a2924] active:bg-[#3a3930] font-bold text-[#e8e4d9] ${seniorMode?"py-5 text-2xl":"py-3 text-xl"}`}>◀</button>
        <button onPointerDown={rotatePiece} className={`rounded-xl bg-[#b89a5a]/20 border border-[#b89a5a]/40 font-bold text-[#b89a5a] ${seniorMode?"py-5 text-2xl":"py-3 text-xl"}`}>↻</button>
        <button onPointerDown={moveRight} className={`rounded-xl bg-[#2a2924] active:bg-[#3a3930] font-bold text-[#e8e4d9] ${seniorMode?"py-5 text-2xl":"py-3 text-xl"}`}>▶</button>
        <div/>
        <button onPointerDown={moveDown}  className={`rounded-xl bg-[#2a2924] active:bg-[#3a3930] font-bold text-[#e8e4d9] ${seniorMode?"py-5 text-2xl":"py-3 text-xl"}`}>▼</button>
        <div/>
      </div>
    </div>
  );
}
