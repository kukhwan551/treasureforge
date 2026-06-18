"use client";
export const ZOOM_MIN=0.5,ZOOM_MAX=3,ZOOM_STEP=0.25,ZOOM_DEFAULT=1;

// app/play/[shareCode]/components/ExploreMap.tsx
// 자동 패닝 방식 (안정화 버전)

import { useRef, useEffect } from "react";
import type { PostWithQuiz, SignalLevel } from "@/types/explore";
import type { CharacterId } from "@/types/character";

interface ExploreMapProps {
  mapUrl: string;
  posts: PostWithQuiz[];
  completedIds: Set<string>;
  nearbyIds: Set<string>;
  signalLevel: SignalLevel;
  seniorMode: boolean;
  zoom: number;
  characterId: CharacterId;
  compassAssist?: boolean;
  onCursorMove: (x: number, y: number) => void;
  onPostClick:  (post: PostWithQuiz) => void;
}

const CHAR_COLOR: Record<SignalLevel, string> = {
  0: "#7a756c", 1: "#6a8a6a", 2: "#9ab06a", 3: "#b89a5a", 4: "#4a9d6f",
};
const EDGE_RATIO = 0.22;
const PAN_SPEED  = 5;
const MIN_SCALE  = 1.5;

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  size: number, step: 0 | 1, flipped: boolean, sl: SignalLevel
) {
  const color = CHAR_COLOR[sl];
  const skin  = "#f5d5a0";
  const pants = sl >= 3 ? "#2a4a3a" : "#3a3830";
  const shoe  = "#2a2420";
  const sc    = size / 60;
  ctx.save();
  ctx.translate(cx, cy);
  if (flipped) ctx.scale(-1, 1);
  ctx.scale(sc, sc);
  ctx.translate(-20, -55);
  ctx.beginPath(); ctx.arc(20, 9, 7, 0, Math.PI * 2);
  ctx.fillStyle = skin; ctx.fill();
  ctx.fillStyle = "#3a2a1a";
  ctx.beginPath(); ctx.arc(17.5, 8, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(22.5, 8, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sl >= 3 ? 16 : 17, 11);
  ctx.quadraticCurveTo(20, sl >= 3 ? 14 : 13, sl >= 3 ? 24 : 23, 11);
  ctx.strokeStyle = "#8a5a4a"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(13, 8);
  ctx.quadraticCurveTo(14, 3, 20, 2); ctx.quadraticCurveTo(26, 3, 27, 8);
  ctx.fillStyle = "rgba(58,42,26,0.8)"; ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(13, 16, 14, 14, 3); ctx.fill();
  const lLeg = step === 0 ?  20 : -20;
  const rLeg = step === 0 ? -20 :  20;
  const lArm = step === 0 ? -25 :  25;
  const rArm = step === 0 ?  25 : -25;
  ctx.save(); ctx.translate(13,18); ctx.rotate(lArm*Math.PI/180); ctx.translate(-13,-18);
  ctx.fillStyle=skin; ctx.beginPath(); ctx.roundRect(8,16,5,10,2.5); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(27,18); ctx.rotate(rArm*Math.PI/180); ctx.translate(-27,-18);
  ctx.fillStyle=skin; ctx.beginPath(); ctx.roundRect(27,16,5,10,2.5); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(17,30); ctx.rotate(lLeg*Math.PI/180); ctx.translate(-17,-30);
  ctx.fillStyle=pants; ctx.beginPath(); ctx.roundRect(13,29,6,12,3); ctx.fill();
  ctx.fillStyle=shoe; ctx.beginPath(); ctx.roundRect(12,40,7,4,2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(23,30); ctx.rotate(rLeg*Math.PI/180); ctx.translate(-23,-30);
  ctx.fillStyle=pants; ctx.beginPath(); ctx.roundRect(21,29,6,12,3); ctx.fill();
  ctx.fillStyle=shoe; ctx.beginPath(); ctx.roundRect(21,40,7,4,2); ctx.fill(); ctx.restore();
  if (sl >= 4) {
    ctx.font="8px sans-serif"; ctx.textAlign="center";
    ctx.fillStyle="#ffdd44"; ctx.fillText("★",20,2);
  }
  ctx.restore();
}

export default function ExploreMap({
  mapUrl, posts, completedIds, nearbyIds,
  signalLevel, seniorMode, zoom, characterId, compassAssist,
  onCursorMove, onPostClick,
}: ExploreMapProps) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 모든 상태를 하나의 ref 객체로 관리
  const stateRef = useRef({
    img:       null as HTMLImageElement | null,
    imgLoaded: false,
    natW: 0, natH: 0,
    mapW: 0, mapH: 0,
    viewX: 0, viewY: 0,
    charX: 0, charY: 0,   // 스크린 픽셀
    isMob: false,
    charVisible: false,
    moving: false,
    walkStep: 0 as 0 | 1,
    lastWalkTs: 0,
    flipped: false,
    lastScreenX: null as number | null,
    sl: 0 as SignalLevel,
    sm: seniorMode,
    posts: posts,
    completed: completedIds,
    nearby: nearbyIds,
    // 터치
    touchActive: false,
    isTap: false,
    tapStartX: 0, tapStartY: 0,
  });

  // prop 동기화
  useEffect(() => { stateRef.current.sl = signalLevel; }, [signalLevel]);
  useEffect(() => { stateRef.current.sm = seniorMode; }, [seniorMode]);
  useEffect(() => { stateRef.current.posts = posts; }, [posts]);
  useEffect(() => { stateRef.current.completed = completedIds; }, [completedIds]);
  useEffect(() => { stateRef.current.nearby = nearbyIds; }, [nearbyIds]);

  // 맵 크기 계산
  function calcMap(cW: number, cH: number, nW: number, nH: number) {
    const scale = Math.min(cW / nW, cH / nH) * MIN_SCALE;
    return { w: nW * scale, h: nH * scale };
  }

  // 뷰포트 클램프
  function clamp(vx: number, vy: number, cW: number, cH: number, mW: number, mH: number) {
    return {
      x: Math.max(0, Math.min(vx, Math.max(0, mW - cW))),
      y: Math.max(0, Math.min(vy, Math.max(0, mH - cH))),
    };
  }

  // ── 이미지 로드 ──
  useEffect(() => {
    const s = stateRef.current;
    s.imgLoaded = false;

    const img = new Image();
    img.crossOrigin = "anonymous";
    s.img = img;

    img.onload = () => {
      const cvs  = canvasRef.current;
      const wrap = wrapRef.current;
      if (!cvs || !wrap) return;

      // ★ 캔버스 크기를 먼저 확실히 설정
      const cW = wrap.clientWidth;
      const cH = wrap.clientHeight;
      if (cW === 0 || cH === 0) return;

      cvs.width  = cW;
      cvs.height = cH;

      s.natW = img.naturalWidth;
      s.natH = img.naturalHeight;

      const m = calcMap(cW, cH, s.natW, s.natH);
      s.mapW = m.w; s.mapH = m.h;

      // 초기 뷰포트: 지도 중앙
      const v = clamp(m.w/2 - cW/2, m.h/2 - cH/2, cW, cH, m.w, m.h);
      s.viewX = v.x; s.viewY = v.y;

      // 초기 캐릭터: 화면 중앙
      s.charX = cW / 2;
      s.charY = cH / 2;
      s.charVisible = true;
      s.imgLoaded = true;
    };

    img.onerror = () => {
      console.error("[ExploreMap] image load failed:", mapUrl);
    };

    img.src = mapUrl;
    return () => { img.onload = null; img.onerror = null; };
  }, [mapUrl]); // eslint-disable-line

  // ── 캔버스 크기 동기화 ──
  useEffect(() => {
    const wrap = wrapRef.current;
    const cvs  = canvasRef.current;
    if (!wrap || !cvs) return;

    function resize() {
      if (!wrap || !cvs) return;
      const cW = wrap.clientWidth;
      const cH = wrap.clientHeight;
      if (cW === 0 || cH === 0) return;
      cvs.width  = cW;
      cvs.height = cH;
      const s = stateRef.current;
      s.isMob = cW < 768; // 모바일 여부 동기화
      if (s.natW > 0) {
        const m = calcMap(cW, cH, s.natW, s.natH);
        s.mapW = m.w; s.mapH = m.h;
        const v = clamp(s.viewX, s.viewY, cW, cH, m.w, m.h);
        s.viewX = v.x; s.viewY = v.y;
      }
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    window.addEventListener("orientationchange", () => setTimeout(resize, 300));
    return () => ro.disconnect();
  }, []); // eslint-disable-line

  // ── RAF 루프 ──
  useEffect(() => {
    let rafId: number;

    function loop(ts: number) {
      rafId = requestAnimationFrame(loop);
      const cvs = canvasRef.current;
      if (!cvs) return;

      const ctx = cvs.getContext("2d");
      if (!ctx) return;

      const cW = cvs.width;
      const cH = cvs.height;
      if (cW === 0 || cH === 0) return;

      const s = stateRef.current;

      // 자동 패닝
      if (s.charVisible && s.moving && s.mapW > 0) {
        const edX = cW * EDGE_RATIO;
        const edY = cH * EDGE_RATIO;
        let dvx = 0, dvy = 0;
        if (s.charX < edX)       dvx = -PAN_SPEED * (1 - s.charX / edX);
        if (s.charX > cW - edX)  dvx =  PAN_SPEED * (1 - (cW - s.charX) / edX);
        if (s.charY < edY)       dvy = -PAN_SPEED * (1 - s.charY / edY);
        if (s.charY > cH - edY)  dvy =  PAN_SPEED * (1 - (cH - s.charY) / edY);
        if (dvx !== 0 || dvy !== 0) {
          const nv = clamp(s.viewX + dvx, s.viewY + dvy, cW, cH, s.mapW, s.mapH);
          const ax = nv.x - s.viewX;
          const ay = nv.y - s.viewY;
          s.viewX = nv.x; s.viewY = nv.y;
          s.charX += ax; s.charY += ay;
          const mapX = Math.max(0, Math.min(100, ((s.viewX + s.charX) / s.mapW) * 100));
          const mapY = Math.max(0, Math.min(100, ((s.viewY + s.charY) / s.mapH) * 100));
          onCursorMove(mapX, mapY);
        }
      }

      ctx.clearRect(0, 0, cW, cH);

      // 배경
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, cW, cH);

      // 지도
      if (s.imgLoaded && s.img && s.mapW > 0) {
        ctx.drawImage(s.img, -s.viewX, -s.viewY, s.mapW, s.mapH);
      } else {
        // 로딩 중 표시
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, 0, cW, cH);
        ctx.fillStyle = "#b89a5a";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🗺️ 지도 로딩 중...", cW / 2, cH / 2);
        return;
      }

      // 핀
      const isMob = cW < 768;
      const pinR  = isMob ? 18 : 14;
      for (const post of s.posts) {
        const done    = s.completed.has(post.id);
        const near    = s.nearby.has(post.id);
        if (!done && !near) continue;
        if (post.coord_x == null || post.coord_y == null) continue;
        const px = (Number(post.coord_x) / 100) * s.mapW - s.viewX;
        const py = (Number(post.coord_y) / 100) * s.mapH - s.viewY;
        if (px < -pinR*3 || px > cW+pinR*3 || py < -pinR*3 || py > cH+pinR*3) continue;
        const col = done ? "#4a9d6f" : "#b89a5a";
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py+pinR+8);
        ctx.strokeStyle = col; ctx.lineWidth = isMob ? 3 : 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(px, py-pinR, pinR, 0, Math.PI*2);
        ctx.fillStyle = col; ctx.fill();
        if (isMob && near && !done) {
          ctx.beginPath(); ctx.arc(px, py-pinR, pinR+4, 0, Math.PI*2);
          ctx.strokeStyle = "rgba(184,154,90,0.4)"; ctx.lineWidth = 3; ctx.stroke();
        }
        ctx.fillStyle = "#0f0f10";
        ctx.font = `bold ${isMob?14:12}px sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(done ? "✓" : "!", px, py-pinR);
        const label = (done ? "✓ " : "") + post.name;
        ctx.font = `${isMob?13:11}px sans-serif`;
        const tw = ctx.measureText(label).width;
        const lx = px-tw/2-7; const ly = py-pinR*2-(isMob?26:20);
        const lw = tw+14; const lh = isMob?22:18;
        ctx.fillStyle = done ? "#4a9d6f" : "rgba(0,0,0,0.85)";
        ctx.beginPath(); ctx.roundRect(lx,ly,lw,lh,4); ctx.fill();
        ctx.fillStyle="#e8e4d9"; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(label, px, ly+lh/2);
      }

      // 캐릭터
      if (s.charVisible) {
        if (s.moving && ts - s.lastWalkTs > 180) {
          s.walkStep = s.walkStep === 0 ? 1 : 0;
          s.lastWalkTs = ts;
        }
        drawCharacter(ctx, s.charX, s.charY,
          s.sm ? 56 : 44, s.walkStep, s.flipped, s.sl);
      }
    }

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [onCursorMove]); // eslint-disable-line

  // 공통 포인터 처리
  function processPos(clientX: number, clientY: number) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const s = stateRef.current;
    if (!s.imgLoaded || s.mapW === 0) return;

    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    if (s.lastScreenX !== null && Math.abs(sx - s.lastScreenX) > 1)
      s.flipped = sx < s.lastScreenX;
    s.lastScreenX = sx;
    s.charX = sx;
    // 모바일 터치: 손가락이 캐릭터를 가리지 않도록 위로 오프셋
    const touchOffset = s.isMob ? 70 : 0;
    s.charY = sy - touchOffset;
    s.charVisible = true;
    s.moving = true;

    const mapX = Math.max(0, Math.min(100, ((s.viewX + sx) / s.mapW) * 100));
    const mapY = Math.max(0, Math.min(100, ((s.viewY + sy) / s.mapH) * 100));
    onCursorMove(mapX, mapY);
  }

  function checkPin(clientX: number, clientY: number) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const s = stateRef.current;
    if (!s.imgLoaded || s.mapW === 0) return;
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const mapX = ((s.viewX + sx) / s.mapW) * 100;
    const mapY = ((s.viewY + sy) / s.mapH) * 100;
    const thr  = wrap.clientWidth < 768 ? 10 : 5;
    for (const post of s.posts) {
      if (!s.nearby.has(post.id) || s.completed.has(post.id)) continue;
      if (post.coord_x == null || post.coord_y == null) continue;
      const dx = mapX - Number(post.coord_x);
      const dy = mapY - Number(post.coord_y);
      if (Math.sqrt(dx*dx+dy*dy) < thr) { onPostClick(post); return; }
    }
  }

  // 마우스
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let stopT: ReturnType<typeof setTimeout> | null = null;
    function onMove(e: MouseEvent) {
      processPos(e.clientX, e.clientY);
      if (stopT) clearTimeout(stopT);
      stopT = setTimeout(() => { stateRef.current.moving = false; }, 150);
    }
    function onLeave() { stateRef.current.charVisible = false; stateRef.current.moving = false; }
    function onClick(e: MouseEvent) { checkPin(e.clientX, e.clientY); }
    wrap.addEventListener("mousemove",  onMove,   { passive: true });
    wrap.addEventListener("mouseleave", onLeave);
    wrap.addEventListener("click",      onClick);
    return () => {
      wrap.removeEventListener("mousemove",  onMove);
      wrap.removeEventListener("mouseleave", onLeave);
      wrap.removeEventListener("click",      onClick);
      if (stopT) clearTimeout(stopT);
    };
  }, [onCursorMove, onPostClick]); // eslint-disable-line

  // 터치
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let stopT: ReturnType<typeof setTimeout> | null = null;
    const s = stateRef.current;
    function onTStart(e: TouchEvent) {
      const t = e.touches[0];
      s.touchActive = true; s.isTap = true;
      s.tapStartX = t.clientX; s.tapStartY = t.clientY;
      s.charVisible = true;
    }
    function onTMove(e: TouchEvent) {
      e.preventDefault();
      const t = e.touches[0];
      if (Math.abs(t.clientX-s.tapStartX)>10 || Math.abs(t.clientY-s.tapStartY)>10)
        s.isTap = false;
      processPos(t.clientX, t.clientY);
      if (stopT) clearTimeout(stopT);
      stopT = setTimeout(() => { s.moving = false; }, 200);
    }
    function onTEnd(e: TouchEvent) {
      s.touchActive = false; s.moving = false;
      const t = e.changedTouches[0];
      if (s.isTap) { processPos(t.clientX, t.clientY); setTimeout(() => checkPin(t.clientX, t.clientY), 80); }
      if (stopT) clearTimeout(stopT);
      stopT = setTimeout(() => { s.charVisible = false; }, 2000);
    }
    wrap.addEventListener("touchstart", onTStart, { passive: true });
    wrap.addEventListener("touchmove",  onTMove,  { passive: false });
    wrap.addEventListener("touchend",   onTEnd,   { passive: true });
    return () => {
      wrap.removeEventListener("touchstart", onTStart);
      wrap.removeEventListener("touchmove",  onTMove);
      wrap.removeEventListener("touchend",   onTEnd);
      if (stopT) clearTimeout(stopT);
    };
  }, [onCursorMove, onPostClick]); // eslint-disable-line

  return (
    <div ref={wrapRef}
      className="w-full h-full overflow-hidden select-none"
      style={{ position: "relative", cursor: "none", touchAction: "none",
               background: "#0a0a0a" }}>
      <canvas ref={canvasRef}
        style={{ position: "absolute", inset: 0, display: "block" }}/>
    </div>
  );
}
