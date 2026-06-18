"use client";

// components/puzzle/PuzzleCanvas.tsx
// v2: 덱 방식 퍼즐
// - 인트로: 2초간 전체 이미지 표시
// - 덱: 섞인 조각들이 쌓여있고 맨 위 1개만 보임
// - 드래그: 정위치면 고정, 틀리면 덱으로 복귀
// - 다음 버튼: 현재 조각을 덱 맨 아래로

import { useEffect, useRef, useCallback, useState } from "react";

interface PuzzleCanvasProps {
  imageUrl:    string;
  cols:        number;
  rows:        number;
  seniorMode:  boolean;
  hintEnabled: boolean;
  onComplete:  () => void;
}

type Phase = "loading" | "intro" | "playing";

interface Piece {
  id:         number;
  correctCol: number;
  correctRow: number;
  isPlaced:   boolean;
}

// ── 레이아웃 상수 ──
const BOARD_MARGIN = 12;
const DECK_GAP     = 3;   // 덱 카드 사이 간격 (시각적 쌓임 효과)
const DECK_CARDS   = 4;   // 뒤에 보이는 카드 수
const SNAP_RATIO   = 0.45; // 스냅 판정 (셀 크기 비율)
const INTRO_MS      = 1000; // 인트로 표시 시간
const HINT_DURATION = 3000; // 힌트 표시 시간 ms

export default function PuzzleCanvas({
  imageUrl, cols, rows, seniorMode, hintEnabled, onComplete,
}: PuzzleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);

  const imgRef    = useRef<HTMLImageElement | null>(null);
  const phaseRef  = useRef<Phase>("loading");
  const rafRef    = useRef<number | null>(null);

  // 덱: 남은 조각 순서 (index 0 = 맨 위)
  const deckRef   = useRef<Piece[]>([]);
  // 배치된 조각들
  const placedRef = useRef<Piece[]>([]);
  // 드래그 상태
  const dragRef   = useRef<{
    piece: Piece;
    curX:  number;
    curY:  number;
    startX: number;
    startY: number;
  } | null>(null);

  const completedRef  = useRef(false);
  const hintRef       = useRef(false);   // 힌트 표시 중 여부
  const hintTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 레이아웃 (패널 리사이즈 대응)
  const layoutRef = useRef({
    cW: 0, cH: 0,
    // 보드 (왼쪽)
    boardX: 0, boardY: 0, boardW: 0, boardH: 0,
    cellW: 0, cellH: 0,
    // 덱 영역 (오른쪽)
    deckX: 0, deckY: 0, deckW: 0, deckH: 0,
  });

  const [phase,      setPhase]      = useState<Phase>("loading");
  const [placedCount, setPlacedCount] = useState(0);
  const [deckSize,   setDeckSize]   = useState(0);
  const [introAlpha, setIntroAlpha] = useState(1);
  const [, forceRender] = useState(0); // 힌트 버튼 상태 갱신용

  const total = cols * rows;

  // ── 레이아웃 계산 ──
  function calcLayout(cW: number, cH: number) {
    const isMobilePortrait = cW < cH; // 세로 화면(모바일) 판별

    if (isMobilePortrait) {
      // ── 모바일 세로: 보드 상단(거의 전체 너비), 덱 하단 가로 배치 ──
      const boardW  = cW - BOARD_MARGIN * 2;
      const cellW   = Math.floor(boardW / cols);
      const cellH   = cellW; // 정사각형 셀
      const boardH  = cellH * rows;
      const boardX  = BOARD_MARGIN;
      const boardY  = BOARD_MARGIN;

      // 덱: 보드 아래, 가로 스크롤 없이 단일 카드 표시
      const deckCellW = Math.floor((cW - BOARD_MARGIN * 2) / 2); // 덱 카드는 좀 더 크게
      const deckCellH = deckCellW;
      const deckW     = deckCellW;
      const deckX     = BOARD_MARGIN;
      const deckY     = boardY + boardH + BOARD_MARGIN * 2;

      layoutRef.current = {
        cW, cH,
        boardX, boardY, boardW, boardH, cellW, cellH,
        deckX, deckY, deckW, deckH: deckCellH,
      };
    } else {
      // ── PC 가로: 보드 왼쪽 60%, 덱 오른쪽 38% ──
      const deckFrac = 0.38;
      const deckW    = Math.floor(cW * deckFrac) - BOARD_MARGIN;
      const boardW   = cW - deckW - BOARD_MARGIN * 3;
      const cellW    = Math.floor(boardW / cols);
      const cellH    = Math.floor(cellW * (rows / cols < 1 ? 1 : rows / cols));
      const boardH   = cellH * rows;
      const boardX   = BOARD_MARGIN;
      const boardY   = Math.max(BOARD_MARGIN, (cH - boardH) / 2);

      const deckX = boardX + boardW + BOARD_MARGIN * 2;
      const deckY = Math.max(BOARD_MARGIN, (cH - cellH) / 2);

      layoutRef.current = {
        cW, cH,
        boardX, boardY, boardW, boardH, cellW, cellH,
        deckX, deckY, deckW, deckH: cellH,
      };
    }
  }

  // ── 조각 초기화 + 셔플 ──
  function initPieces() {
    const pieces: Piece[] = Array.from({ length: total }, (_, i) => ({
      id:         i,
      correctCol: i % cols,
      correctRow: Math.floor(i / cols),
      isPlaced:   false,
    }));
    // Fisher-Yates 셔플
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    deckRef.current   = pieces;
    placedRef.current = [];
    setDeckSize(pieces.length);
    setPlacedCount(0);
  }

  // ── 조각 이미지 그리기 ──
  function drawPiece(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    piece: Piece,
    dx: number, dy: number, dw: number, dh: number,
    alpha = 1
  ) {
    const sw = img.naturalWidth  / cols;
    const sh = img.naturalHeight / rows;
    const sx = piece.correctCol  * sw;
    const sy = piece.correctRow  * sh;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();
  }

  // ── 메인 렌더 ──
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const L = layoutRef.current;
    ctx.clearRect(0, 0, L.cW, L.cH);

    const ph = phaseRef.current;

    // ── 인트로: 전체 이미지 표시 ──
    if (ph === "intro") {
      // 보드 영역에 전체 이미지
      ctx.save();
      ctx.globalAlpha = introAlpha;
      ctx.drawImage(img, L.boardX, L.boardY, L.boardW, L.boardH);
      // 테두리
      ctx.strokeStyle = "#b89a5a";
      ctx.lineWidth   = 2;
      ctx.strokeRect(L.boardX, L.boardY, L.boardW, L.boardH);
      ctx.restore();

      // 카운트다운 텍스트
      ctx.fillStyle    = "rgba(184,154,90,0.9)";
      ctx.font         = `bold ${seniorMode ? 18 : 14}px sans-serif`;
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("잘 기억해 두세요!", L.boardX + L.boardW / 2, L.boardY - 16);
      return;
    }

    if (ph !== "playing") return;

    // ── 보드 배경 ──
    ctx.fillStyle   = "#18181a";
    ctx.strokeStyle = "#2a2924";
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.roundRect(L.boardX - 4, L.boardY - 4, L.boardW + 8, L.boardH + 8, 8);
    ctx.fill();
    ctx.stroke();

    // 보드 셀 격자
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = L.boardX + c * L.cellW;
        const y = L.boardY + r * L.cellH;
        ctx.strokeStyle = "#2a2924";
        ctx.lineWidth   = 1;
        ctx.strokeRect(x, y, L.cellW, L.cellH);
      }
    }

    // 배치된 조각들
    for (const piece of placedRef.current) {
      const x = L.boardX + piece.correctCol * L.cellW;
      const y = L.boardY + piece.correctRow * L.cellH;
      drawPiece(ctx, img, piece, x, y, L.cellW, L.cellH);
      // 완료 테두리
      ctx.strokeStyle = "#4a9d6f";
      ctx.lineWidth   = 2;
      ctx.strokeRect(x + 1, y + 1, L.cellW - 2, L.cellH - 2);
    }

    // ── 덱 ──
    const deck = deckRef.current;
    const dragging = dragRef.current?.piece;

    if (deck.length > 0) {
      // 뒤에 쌓인 카드들 (그림자 효과)
      const showCards = Math.min(deck.length - 1, DECK_CARDS);
      for (let i = showCards; i >= 1; i--) {
        const offset = i * DECK_GAP;
        ctx.fillStyle   = `rgba(42,41,36,${0.6 - i * 0.1})`;
        ctx.strokeStyle = "#3a3830";
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.roundRect(
          L.deckX + offset, L.deckY + offset,
          L.cellW, L.cellH, 4
        );
        ctx.fill();
        ctx.stroke();
      }

      // 맨 위 카드 (드래그 중이면 숨김)
      const topPiece = deck[0];
      if (topPiece && topPiece.id !== dragging?.id) {
        drawPiece(ctx, img, topPiece, L.deckX, L.deckY, L.cellW, L.cellH);
        // 테두리
        ctx.strokeStyle = "#b89a5a";
        ctx.lineWidth   = 2;
        ctx.strokeRect(L.deckX, L.deckY, L.cellW, L.cellH);

        // 남은 수 표시
        if (deck.length > 1) {
          ctx.fillStyle    = "rgba(0,0,0,0.7)";
          ctx.beginPath();
          ctx.roundRect(L.deckX + L.cellW - 28, L.deckY + 4, 24, 20, 4);
          ctx.fill();
          ctx.fillStyle    = "#b89a5a";
          ctx.font         = "bold 11px sans-serif";
          ctx.textAlign    = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`${deck.length}`, L.deckX + L.cellW - 16, L.deckY + 14);
        }
      }

      // 안내 텍스트
      ctx.fillStyle    = "#5a5650";
      ctx.font         = `${seniorMode ? 13 : 11}px sans-serif`;
      ctx.textAlign    = "center";
      ctx.textBaseline = "top";
      ctx.fillText(
        "드래그하여 보드에 놓기",
        L.deckX + L.cellW / 2,
        L.deckY + L.cellH + 10
      );
    } else if (!dragging) {
      // 덱 비었음
      ctx.fillStyle    = "#3a3830";
      ctx.font         = `${seniorMode ? 14 : 12}px sans-serif`;
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("✓ 모두 배치됨", L.deckX + L.cellW / 2, L.deckY + L.cellH / 2);
    }

    // ── 힌트 오버레이 — 배치된 조각 위, 드래그 아래에 표시 ──
    if (hintRef.current && imgRef.current) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      // 보드 영역에만 클리핑
      ctx.beginPath();
      ctx.rect(L.boardX, L.boardY, L.boardW, L.boardH);
      ctx.clip();
      ctx.drawImage(imgRef.current, L.boardX, L.boardY, L.boardW, L.boardH);
      // 그리드 선 (조각 위치 가이드)
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = "#b89a5a";
      ctx.lineWidth   = 1;
      for (let c = 1; c < cols; c++) {
        ctx.beginPath();
        ctx.moveTo(L.boardX + c * L.cellW, L.boardY);
        ctx.lineTo(L.boardX + c * L.cellW, L.boardY + L.boardH);
        ctx.stroke();
      }
      for (let r = 1; r < rows; r++) {
        ctx.beginPath();
        ctx.moveTo(L.boardX,            L.boardY + r * L.cellH);
        ctx.lineTo(L.boardX + L.boardW, L.boardY + r * L.cellH);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── 드래그 중인 조각 (최상위) ──
    if (dragRef.current) {
      const { piece, curX, curY } = dragRef.current;
      const hw = L.cellW / 2;
      const hh = L.cellH / 2;
      ctx.save();
      ctx.shadowColor = "rgba(184,154,90,0.5)";
      ctx.shadowBlur  = 16;
      ctx.globalAlpha = 0.9;
      drawPiece(ctx, img, piece, curX - hw, curY - hh, L.cellW, L.cellH);
      // 드래그 테두리
      ctx.strokeStyle = "#b89a5a";
      ctx.lineWidth   = 2;
      ctx.strokeRect(curX - hw, curY - hh, L.cellW, L.cellH);
      ctx.restore();

      // 스냅 미리보기: 마우스 위치의 보드 셀 강조
      const relX = curX - L.boardX;
      const relY = curY - L.boardY;
      if (relX >= 0 && relX < L.boardW && relY >= 0 && relY < L.boardH) {
        const hoverC = Math.floor(relX / L.cellW);
        const hoverR = Math.floor(relY / L.cellH);
        // 이미 배치된 칸은 강조 안 함
        const occupied = placedRef.current.some(
          (p) => p.correctCol === hoverC && p.correctRow === hoverR
        );
        if (!occupied) {
          const isCorrect = hoverC === piece.correctCol && hoverR === piece.correctRow;
          ctx.strokeStyle = isCorrect ? "#4a9d6f" : "#c0504a";
          ctx.lineWidth   = 2;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(
            L.boardX + hoverC * L.cellW + 1,
            L.boardY + hoverR * L.cellH + 1,
            L.cellW - 2, L.cellH - 2
          );
          ctx.setLineDash([]);
        }
      }
    }
  }, [cols, rows, seniorMode, introAlpha]);

  // ── RAF 루프 ──
  useEffect(() => {
    function loop() {
      render();
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, [render]);

  // ── 이미지 로드 + 인트로 시작 ──
  useEffect(() => {
    const img    = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      initPieces();
      // 인트로 페이즈
      phaseRef.current = "intro";
      setPhase("intro");
      setIntroAlpha(1);

      // 2초 후 페이드아웃 → 플레이
      let alpha  = 1;
      const fade = setInterval(() => {
        alpha -= 0.05;
        setIntroAlpha(Math.max(0, alpha));
        if (alpha <= 0) {
          clearInterval(fade);
          phaseRef.current = "playing";
          setPhase("playing");
        }
      }, INTRO_MS / 20);
    };
    img.src = imageUrl;
    return () => { imgRef.current = null; };
  }, [imageUrl]); // eslint-disable-line

  // ── 리사이즈 ──
  useEffect(() => {
    const wrap   = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    function onResize() {
      if (!wrap || !canvas) return;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      canvas.width  = w;
      canvas.height = h;
      calcLayout(w, h);
    }
    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []); // eslint-disable-line

  // ── 드롭 처리 ──
  function handleDrop(x: number, y: number) {
    if (!dragRef.current) return;
    const { piece } = dragRef.current;
    const L = layoutRef.current;
    dragRef.current = null;

    // 보드 위에 드롭했는지 확인
    if (
      x >= L.boardX && x < L.boardX + L.boardW &&
      y >= L.boardY && y < L.boardY + L.boardH
    ) {
      const c = Math.floor((x - L.boardX) / L.cellW);
      const r = Math.floor((y - L.boardY) / L.cellH);

      // 이미 배치된 칸인지
      const occupied = placedRef.current.some(
        (p) => p.correctCol === c && p.correctRow === r
      );

      // 정위치 + 빈 칸
      if (!occupied && c === piece.correctCol && r === piece.correctRow) {
        // ✓ 정위치 배치
        piece.isPlaced = true;
        placedRef.current = [...placedRef.current, piece];
        deckRef.current   = deckRef.current.filter((p) => p.id !== piece.id);
        setPlacedCount(placedRef.current.length);
        setDeckSize(deckRef.current.length);

        // 완료 체크
        if (!completedRef.current && placedRef.current.length === total) {
          completedRef.current = true;
          setTimeout(onComplete, 300);
        }
        return;
      }
    }

    // 틀렸으면 덱으로 복귀 (맨 아래로)
    deckRef.current = [
      ...deckRef.current.filter((p) => p.id !== piece.id),
      piece,
    ];
    setDeckSize(deckRef.current.length);
  }

  // ── 힌트 버튼 ──
  function handleHint() {
    if (hintRef.current) return;
    hintRef.current = true;
    forceRender(n => n + 1);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => {
      hintRef.current = false;
      forceRender(n => n + 1);
    }, HINT_DURATION);
  }

  // ── 다음 버튼 ──
  function handleNext() {
    if (deckRef.current.length <= 1) return;
    const [top, ...rest] = deckRef.current;
    deckRef.current = [...rest, top]; // 맨 위를 맨 아래로
    setDeckSize(deckRef.current.length);
  }

  // ── 마우스/터치 이벤트 ──
  function getCanvasPos(e: MouseEvent | Touch): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function isOnDeckTop(x: number, y: number): boolean {
    const L = layoutRef.current;
    return (
      x >= L.deckX && x < L.deckX + L.cellW &&
      y >= L.deckY && y < L.deckY + L.cellH
    );
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function onDown(e: MouseEvent) {
      if (phaseRef.current !== "playing") return;
      const { x, y } = getCanvasPos(e);
      const deck      = deckRef.current;
      if (deck.length === 0 || !isOnDeckTop(x, y)) return;
      e.preventDefault();
      const piece = deck[0];
      const L     = layoutRef.current;
      dragRef.current = {
        piece,
        curX:   L.deckX + L.cellW / 2,
        curY:   L.deckY + L.cellH / 2,
        startX: x, startY: y,
      };
    }

    function onMove(e: MouseEvent) {
      if (!dragRef.current) return;
      e.preventDefault();
      const { x, y } = getCanvasPos(e);
      dragRef.current.curX = x;
      dragRef.current.curY = y;
    }

    function onUp(e: MouseEvent) {
      if (!dragRef.current) return;
      e.preventDefault();
      const { x, y } = getCanvasPos(e);
      handleDrop(x, y);
    }

    function onTouchStart(e: TouchEvent) {
      if (phaseRef.current !== "playing") return;
      const t      = e.touches[0];
      const { x, y } = getCanvasPos(t);
      const deck   = deckRef.current;
      if (deck.length === 0 || !isOnDeckTop(x, y)) return;
      e.preventDefault();
      const piece = deck[0];
      const L     = layoutRef.current;
      dragRef.current = {
        piece,
        curX:   L.deckX + L.cellW / 2,
        curY:   L.deckY + L.cellH / 2,
        startX: x, startY: y,
      };
    }

    function onTouchMove(e: TouchEvent) {
      if (!dragRef.current) return;
      e.preventDefault();
      const t      = e.touches[0];
      const { x, y } = getCanvasPos(t);
      dragRef.current.curX = x;
      dragRef.current.curY = y;
    }

    function onTouchEnd(e: TouchEvent) {
      if (!dragRef.current) return;
      e.preventDefault();
      const t      = e.changedTouches[0];
      const { x, y } = getCanvasPos(t);
      handleDrop(x, y);
    }

    canvas.addEventListener("mousedown",  onDown,       { passive: false });
    canvas.addEventListener("mousemove",  onMove,       { passive: false });
    canvas.addEventListener("mouseup",    onUp,         { passive: false });
    canvas.addEventListener("mouseleave", onUp,         { passive: false });
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove",  onTouchMove,  { passive: false });
    canvas.addEventListener("touchend",   onTouchEnd,   { passive: false });

    return () => {
      canvas.removeEventListener("mousedown",  onDown);
      canvas.removeEventListener("mousemove",  onMove);
      canvas.removeEventListener("mouseup",    onUp);
      canvas.removeEventListener("mouseleave", onUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove",  onTouchMove);
      canvas.removeEventListener("touchend",   onTouchEnd);
    };
  }, []); // eslint-disable-line

  return (
    <div className="w-full h-full flex flex-col gap-2">

      {/* 상단: 진행률 + 다음 버튼 */}
      <div className="flex items-center justify-between px-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#5a5650]">완료</span>
          <div className="w-28 h-1.5 bg-[#2a2924] rounded-full overflow-hidden">
            <div className="h-full bg-[#4a9d6f] rounded-full transition-all duration-500"
              style={{ width: total > 0 ? `${(placedCount / total) * 100}%` : "0%" }}/>
          </div>
          <span className="text-xs text-[#4a9d6f] font-mono tabular-nums">
            {placedCount}/{total}
          </span>
        </div>

        {/* 버튼 그룹 */}
        <div className="flex items-center gap-2">
          {/* 힌트 버튼 */}
          {hintEnabled && phase === "playing" && (
            <button onClick={handleHint} disabled={hintRef.current}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5
                text-xs font-medium transition-colors
                ${hintRef.current
                  ? "border-[#b89a5a]/50 bg-[#b89a5a]/10 text-[#b89a5a] cursor-not-allowed"
                  : "border-[#2a2924] text-[#5a5650] hover:border-[#b89a5a]/40 hover:text-[#b89a5a]"
                }`}>
              💡 {hintRef.current ? "보는 중…" : "힌트 (3초)"}
            </button>
          )}

          {/* 다음 버튼 */}
          {phase === "playing" && deckSize > 1 && (
            <button onClick={handleNext}
              className="flex items-center gap-1.5 rounded-lg border border-[#2a2924]
                px-3 py-1.5 text-xs text-[#7a756c]
                hover:border-[#b89a5a]/40 hover:text-[#b89a5a] transition-colors">
              다음 조각 →
            </button>
          )}
        </div>

        {phase === "intro" && (
          <span className="text-xs text-[#b89a5a] animate-pulse">
            🖼️ 그림을 기억하세요…
          </span>
        )}
      </div>

      {/* Canvas */}
      <div ref={wrapRef} className="relative w-full"
        style={{ height: "calc(100dvh - 120px)", minHeight: 320 }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{
            cursor:      phase === "playing" ? (dragRef.current ? "grabbing" : "grab") : "default",
            touchAction: "none",
          }}
        />
        {phase === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2
              border-[#b89a5a] border-t-transparent"/>
          </div>
        )}
      </div>

      <p className="text-center text-[10px] text-[#3a3830] flex-shrink-0">
        {phase === "intro"
          ? "잠시 후 퍼즐이 시작됩니다"
          : deckSize === 0 && placedCount < total
          ? "모든 조각을 배치했습니다!"
          : "맨 위 조각을 드래그하여 올바른 위치에 놓으세요"
        }
      </p>
    </div>
  );
}
