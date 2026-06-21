"use client";

// app/play/[shareCode]/components/ExploreMap.tsx
// 자동 패닝 방식 (안정화 버전)

import { useRef, useEffect } from "react";
import type { PostWithQuiz, SignalLevel } from "@/types/explore";
import { getCharacter, type CharacterId } from "@/types/character";

interface ExploreMapProps {
  mapUrl: string;
  posts: PostWithQuiz[];
  completedIds: Set<string>;
  nearbyIds: Set<string>;
  signalLevel: SignalLevel;
  seniorMode: boolean;
  zoom: number;                          // ★ 외부에서 제어하는 줌 레벨
  characterId: CharacterId;              // ★ 선택된 캐릭터
  compassAssist?: boolean;               // ★ 찾기 도움 모드 (나침반)
  onCursorMove: (x: number, y: number) => void;
  onPostClick:  (post: PostWithQuiz) => void;
}

export { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, ZOOM_DEFAULT };

const CHAR_COLOR: Record<SignalLevel, string> = {
  0: "#7a756c", 1: "#6a8a6a", 2: "#9ab06a", 3: "#b89a5a", 4: "#4a9d6f",
};
const EDGE_RATIO = 0.22;
const PAN_SPEED  = 5;
const ZOOM_MIN   = 1.0;
const ZOOM_MAX   = 2.5;
const ZOOM_STEP  = 0.25;
const ZOOM_DEFAULT = 1.5;

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  size: number, step: 0 | 1, flipped: boolean, sl: SignalLevel,
  charId: CharacterId
) {
  const def   = getCharacter(charId);
  const color = sl >= 3 ? def.shirtColorHigh : def.shirtColor;
  const skin  = "#f5d5a0";
  const pants = def.pantsColor;
  const shoe  = "#2a2420";
  const sc    = size / 60;

  ctx.save();
  ctx.translate(cx, cy);
  if (flipped) ctx.scale(-1, 1);
  ctx.scale(sc, sc);
  ctx.translate(-20, -55);

  // 머리
  ctx.beginPath(); ctx.arc(20, 9, 7, 0, Math.PI * 2);
  ctx.fillStyle = skin; ctx.fill();

  // 안경 (시니어탐험가)
  if (def.hasGlasses) {
    ctx.strokeStyle = "#3a3830"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(17, 8.5, 2.2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(23, 8.5, 2.2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(19.2, 8.5); ctx.lineTo(20.8, 8.5); ctx.stroke();
  } else {
    ctx.fillStyle = "#3a2a1a";
    ctx.beginPath(); ctx.arc(17.5, 8, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(22.5, 8, 1.2, 0, Math.PI * 2); ctx.fill();
  }

  // 미소
  ctx.beginPath();
  ctx.moveTo(sl >= 3 ? 16 : 17, 11);
  ctx.quadraticCurveTo(20, sl >= 3 ? 14 : 13, sl >= 3 ? 24 : 23, 11);
  ctx.strokeStyle = "#8a5a4a"; ctx.lineWidth = 1.2; ctx.stroke();

  // 머리카락 / 모자 / 머리띠
  if (def.hasHat) {
    // 모자 (고고학자/선장)
    ctx.fillStyle = def.hatColor;
    ctx.beginPath();
    ctx.ellipse(20, 2.5, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(14, -1, 12, 5, 2);
    ctx.fill();
  } else if (def.hasHeadband) {
    // 머리띠 (해적)
    ctx.fillStyle = def.hairColor;
    ctx.beginPath();
    ctx.moveTo(13, 8); ctx.quadraticCurveTo(14, 3, 20, 2);
    ctx.quadraticCurveTo(26, 3, 27, 8);
    ctx.fill();
    ctx.fillStyle = def.headbandColor;
    ctx.beginPath();
    ctx.roundRect(12.5, 3.5, 15, 2.5, 1);
    ctx.fill();
  } else if (def.longHair) {
    // 양갈래 머리 (모험소녀)
    ctx.fillStyle = def.hairColor;
    ctx.beginPath();
    ctx.moveTo(13, 8); ctx.quadraticCurveTo(14, 2, 20, 1.5);
    ctx.quadraticCurveTo(26, 2, 27, 8);
    ctx.fill();
    // 양갈래
    ctx.beginPath(); ctx.ellipse(11, 12, 2.5, 4, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(29, 12, 2.5, 4, 0.3, 0, Math.PI * 2); ctx.fill();
  } else {
    // 기본 머리카락
    ctx.fillStyle = "rgba(58,42,26,0.85)";
    ctx.beginPath();
    ctx.moveTo(13, 8);
    ctx.quadraticCurveTo(14, 3, 20, 2); ctx.quadraticCurveTo(26, 3, 27, 8);
    ctx.fill();
  }

  // 몸통
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
    charVisible: false,
    moving: false,
    walkStep: 0 as 0 | 1,
    lastWalkTs: 0,
    flipped: false,
    lastScreenX: null as number | null,
    sl: 0 as SignalLevel,
    sm: seniorMode,
    zoom: zoom,
    charId: characterId,
    compassAssist: compassAssist ?? false,
    isMob: false,
    posts: posts,
    completed: completedIds,
    nearby: nearbyIds,
    // 터치
    touchActive: false,
    isTap: false,
    tapStartX: 0, tapStartY: 0,
    // ★ 핀별 애니메이션 상태 (postId -> 상태)
    pinAnim: new Map<string, {
      lastDist: number;        // 마지막 거리
      poppedAt: number | null; // 보물상자 팝업 시작 ts (null=미발생)
      particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string }[];
    }>(),
  });

  // prop 동기화
  useEffect(() => { stateRef.current.sl = signalLevel; }, [signalLevel]);
  useEffect(() => { stateRef.current.sm = seniorMode; }, [seniorMode]);
  useEffect(() => { stateRef.current.charId = characterId; }, [characterId]);
  useEffect(() => { stateRef.current.compassAssist = compassAssist ?? false; }, [compassAssist]);

  // ★ zoom 변경 시 캐릭터 위치를 유지하며 지도 크기/뷰포트 재계산
  useEffect(() => {
    const s = stateRef.current;
    const cvs  = canvasRef.current;
    const wrap = wrapRef.current;
    if (!cvs || !wrap || !s.imgLoaded) { s.zoom = zoom; return; }

    const cW = cvs.width;
    const cH = cvs.height;
    if (cW === 0 || cH === 0 || s.natW === 0) { s.zoom = zoom; return; }

    // 현재 캐릭터의 지도 절대 좌표(px, 기존 스케일 기준) 보존
    const charMapX = s.viewX + s.charX;
    const charMapY = s.viewY + s.charY;
    const ratioX = s.mapW > 0 ? charMapX / s.mapW : 0.5;
    const ratioY = s.mapH > 0 ? charMapY / s.mapH : 0.5;

    s.zoom = zoom;
    const m = calcMap(cW, cH, s.natW, s.natH, zoom);
    s.mapW = m.w; s.mapH = m.h;

    // 캐릭터의 지도상 상대위치(%)를 새 스케일에 적용
    const newCharMapX = ratioX * m.w;
    const newCharMapY = ratioY * m.h;

    const v = clamp(newCharMapX - s.charX, newCharMapY - s.charY, cW, cH, m.w, m.h);
    s.viewX = v.x; s.viewY = v.y;
  }, [zoom]); // eslint-disable-line
  useEffect(() => { stateRef.current.posts = posts; }, [posts]);
  useEffect(() => { stateRef.current.completed = completedIds; }, [completedIds]);
  useEffect(() => { stateRef.current.nearby = nearbyIds; }, [nearbyIds]);

  // 맵 크기 계산
  function calcMap(cW: number, cH: number, nW: number, nH: number, zoomLevel: number) {
    const scale = Math.min(cW / nW, cH / nH) * zoomLevel;
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

      const m = calcMap(cW, cH, s.natW, s.natH, s.zoom);
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
      if (s.natW > 0) {
        const m = calcMap(cW, cH, s.natW, s.natH, s.zoom);
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

      // 캐릭터 (핀보다 먼저 그려서 핀/이름표가 캐릭터 위에 보이도록)
      if (s.charVisible) {
        if (s.moving && ts - s.lastWalkTs > 180) {
          s.walkStep = s.walkStep === 0 ? 1 : 0;
          s.lastWalkTs = ts;
        }
        drawCharacter(ctx, s.charX, s.charY,
          s.sm ? 56 : 44, s.walkStep, s.flipped, s.sl, s.charId);

        // ── 찾기 도움 모드: 나침반 ──
        if (s.compassAssist && s.mapW > 0) {
          const isMobLocal = cW < 768;
          // 캐릭터의 지도 % 좌표
          const cMapX = ((s.viewX + s.charX) / s.mapW) * 100;
          const cMapY = ((s.viewY + s.charY) / s.mapH) * 100;

          // 가장 가까운 미발견 포스트 찾기
          let nearestPost: typeof s.posts[number] | null = null;
          let nearestDist = Infinity;
          for (const post of s.posts) {
            if (s.completed.has(post.id)) continue;
            if (post.coord_x == null || post.coord_y == null) continue;
            const dx = Number(post.coord_x) - cMapX;
            const dy = Number(post.coord_y) - cMapY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestDist) { nearestDist = dist; nearestPost = post; }
          }

          if (nearestPost) {
            const tdx = Number(nearestPost.coord_x) - cMapX;
            const tdy = Number(nearestPost.coord_y) - cMapY;
            const angle = Math.atan2(tdy, tdx);

            const compassR = (s.sm ? 56 : 44) * 0.62; // 캐릭터 크기에 비례한 거리
            const cx = s.charX + Math.cos(angle) * compassR;
            const cy = s.charY + Math.sin(angle) * compassR - (s.sm ? 8 : 6);

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle + Math.PI / 2); // 이모지 기본 방향(위쪽) 보정
            ctx.font = `${isMobLocal ? 18 : 15}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            // 약한 배경 원으로 가독성 확보
            ctx.rotate(-(angle + Math.PI / 2));
            ctx.beginPath();
            ctx.arc(0, 0, isMobLocal ? 12 : 10, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(15,15,16,0.55)";
            ctx.fill();
            ctx.rotate(angle + Math.PI / 2);
            ctx.fillText("🧭", 0, 0);
            ctx.restore();
          }
        }
      }

      // ── 거리 임계값 (signalEngine.ts와 동일) ──
      const DIST_L4 = 3, DIST_L3 = 8, DIST_L2 = 15, DIST_L1 = 25;

      // 캐릭터의 지도 % 좌표
      const charMapX = ((s.viewX + s.charX) / s.mapW) * 100;
      const charMapY = ((s.viewY + s.charY) / s.mapH) * 100;

      const isMob   = cW < 768;
      const baseR   = isMob ? 22 : 17; // ★ 기존보다 크게

      for (const post of s.posts) {
        const done = s.completed.has(post.id);
        const near = s.nearby.has(post.id);
        if (!done && !near) continue;
        if (post.coord_x == null || post.coord_y == null) continue;

        const px = (Number(post.coord_x) / 100) * s.mapW - s.viewX;
        const py = (Number(post.coord_y) / 100) * s.mapH - s.viewY;
        if (px < -baseR*4 || px > cW+baseR*4 || py < -baseR*4 || py > cH+baseR*4) continue;

        // 거리 계산 (완료된 포스트는 항상 최대 단계로 고정 표시)
        const dx = charMapX - Number(post.coord_x);
        const dy = charMapY - Number(post.coord_y);
        const dist = done ? 0 : Math.sqrt(dx*dx + dy*dy);

        // 애니메이션 상태 가져오기/생성
        let anim = s.pinAnim.get(post.id);
        if (!anim) {
          anim = { lastDist: dist, poppedAt: null, particles: [] };
          s.pinAnim.set(post.id, anim);
        }

        // 레벨4 진입 감지 → 팝업 트리거 (완료되지 않은 핀만)
        if (!done && dist <= DIST_L4 && anim.lastDist > DIST_L4 && anim.poppedAt === null) {
          anim.poppedAt = ts;
          // 파티클 생성 (반짝이는 점들이 사방으로 퍼짐)
          for (let i = 0; i < 14; i++) {
            const ang = (Math.PI * 2 * i) / 14 + Math.random() * 0.3;
            const spd = 1.5 + Math.random() * 2;
            anim.particles.push({
              x: px, y: py - baseR,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd - 1.5,
              life: 0, maxLife: 600 + Math.random() * 300,
              color: Math.random() > 0.5 ? "#ffd700" : "#b89a5a",
            });
          }
        }
        anim.lastDist = dist;

        // ── 단계 결정 (0~4) ──
        let stage: 0 | 1 | 2 | 3 | 4;
        if (done)               stage = 4;
        else if (dist <= DIST_L4) stage = 4;
        else if (dist <= DIST_L3) stage = 3;
        else if (dist <= DIST_L2) stage = 2;
        else if (dist <= DIST_L1) stage = 1;
        else                       stage = 0;
        if (stage === 0) continue; // 표시 안 함 (이론상 near/done이면 도달 안 함)

        // 팝업 애니메이션 진행도 (0~1, 350ms)
        const popElapsed = anim.poppedAt !== null ? ts - anim.poppedAt : 9999;
        const popT = Math.min(1, popElapsed / 350);
        const popping = anim.poppedAt !== null && popT < 1;

        // 단계별 시각 파라미터
        const stageScale = stage === 1 ? 0.55 : stage === 2 ? 0.75 : stage === 3 ? 0.9 : 1.0;
        const stageAlpha = stage === 1 ? 0.45 : stage === 2 ? 0.7 : stage === 3 ? 0.9 : 1.0;
        const glow = stage >= 3;
        const wobble = stage === 1 ? Math.sin(ts / 300) * 2 : 0;

        // 팝업 중이면 바운스 스케일 (overshoot)
        let popScale = 1;
        if (popping) {
          // ease-out-back 느낌의 바운스
          const ov = 1 - popT;
          popScale = 1 + Math.sin(popT * Math.PI) * 0.6 * ov;
        }

        const pinR = baseR * stageScale * (popping ? popScale : 1);
        const drawY = py + wobble;

        ctx.save();
        ctx.globalAlpha = stageAlpha;

        // 글로우 (3단계 이상)
        if (glow) {
          const glowR = pinR * (1.8 + Math.sin(ts / 200) * 0.15);
          const grad = ctx.createRadialGradient(px, drawY - pinR, 0, px, drawY - pinR, glowR);
          const glowColor = done ? "74,157,111" : "255,215,0";
          grad.addColorStop(0, `rgba(${glowColor},0.45)`);
          grad.addColorStop(1, `rgba(${glowColor},0)`);
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(px, drawY - pinR, glowR, 0, Math.PI*2); ctx.fill();
        }

        const col = done ? "#4a9d6f" : (stage === 4 ? "#ffd24a" : "#b89a5a");

        // 꼬리
        ctx.beginPath(); ctx.moveTo(px, drawY); ctx.lineTo(px, drawY + pinR + 8);
        ctx.strokeStyle = col; ctx.lineWidth = (isMob ? 3 : 2) * stageScale; ctx.stroke();

        if (stage === 4 && !done) {
          // ── 황금열쇠 모양 (4단계: 발견 직전/직후) ──
          const ky  = drawY - pinR;
          const ks  = pinR * 0.11; // 열쇠 스케일 단위

          ctx.save();
          ctx.translate(px, ky);
          ctx.rotate(-0.55); // 살짝 기울여서 역동적으로

          // 글로우 후광 (밝은 황금색)
          const haloR = pinR * 1.5;
          const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, haloR);
          halo.addColorStop(0, "rgba(255,223,90,0.55)");
          halo.addColorStop(1, "rgba(255,223,90,0)");
          ctx.fillStyle = halo;
          ctx.beginPath(); ctx.arc(0, 0, haloR, 0, Math.PI*2); ctx.fill();

          const GOLD_LIGHT = "#ffe680";
          const GOLD_MAIN  = "#ffd24a";
          const GOLD_DARK  = "#c89a1e";

          // 그라데이션 (입체감)
          const keyGrad = ctx.createLinearGradient(-ks*5, -ks*5, ks*5, ks*5);
          keyGrad.addColorStop(0, GOLD_LIGHT);
          keyGrad.addColorStop(0.5, GOLD_MAIN);
          keyGrad.addColorStop(1, GOLD_DARK);

          ctx.fillStyle = keyGrad;
          ctx.strokeStyle = GOLD_DARK;
          ctx.lineWidth = ks * 0.25;

          // 열쇠 머리 (링) — 위쪽
          ctx.beginPath();
          ctx.arc(0, -ks*3.2, ks*2.2, 0, Math.PI*2);
          ctx.fill(); ctx.stroke();
          // 링 안쪽 구멍 (배경색으로 뚫기)
          ctx.save();
          ctx.globalCompositeOperation = "destination-out";
          ctx.beginPath();
          ctx.arc(0, -ks*3.2, ks*1.1, 0, Math.PI*2);
          ctx.fill();
          ctx.restore();

          // 열쇠 자루 (세로 막대)
          ctx.beginPath();
          ctx.roundRect(-ks*0.7, -ks*1.2, ks*1.4, ks*5.2, ks*0.5);
          ctx.fill(); ctx.stroke();

          // 열쇠 톱니 (아래쪽, 오른쪽으로 돌출)
          ctx.beginPath();
          ctx.moveTo(ks*0.7, ks*2.4);
          ctx.lineTo(ks*2.4, ks*2.4);
          ctx.lineTo(ks*2.4, ks*3.4);
          ctx.lineTo(ks*1.6, ks*3.4);
          ctx.lineTo(ks*1.6, ks*4.0);
          ctx.lineTo(ks*0.7, ks*4.0);
          ctx.closePath();
          ctx.fill(); ctx.stroke();

          // 하이라이트 (반짝임 효과)
          ctx.strokeStyle = "rgba(255,255,255,0.7)";
          ctx.lineWidth = ks * 0.18;
          ctx.beginPath();
          ctx.arc(-ks*0.7, -ks*3.9, ks*1.3, Math.PI*1.1, Math.PI*1.7);
          ctx.stroke();

          ctx.restore();

          // 반짝이는 별 스파클 (팝업 직후에만, 톡톡 튀는 느낌)
          if (popping) {
            const sparkR = pinR * (0.9 + popT * 0.8);
            ctx.save();
            ctx.globalAlpha = 1 - popT;
            ctx.fillStyle = "#fff4cc";
            for (let i = 0; i < 4; i++) {
              const ang = (Math.PI / 2) * i + Math.PI / 4;
              const sx = px + Math.cos(ang) * sparkR;
              const sy = ky + Math.sin(ang) * sparkR;
              ctx.beginPath();
              ctx.arc(sx, sy, 2, 0, Math.PI*2);
              ctx.fill();
            }
            ctx.restore();
          }
        } else {
          // ── 일반 핀        } else {
          // ── 일반 핀 (원형) ──
          ctx.beginPath(); ctx.arc(px, drawY - pinR, pinR, 0, Math.PI*2);
          ctx.fillStyle = col; ctx.fill();
          ctx.fillStyle = done ? "#0f2a1a" : "#0f0f10";
          ctx.font = `bold ${(isMob?15:13) * stageScale}px sans-serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(done ? "✓" : "!", px, drawY - pinR);
        }

        ctx.restore();

        // 레이블 (단계 2 이상에서만 표시 — 너무 멀면 이름 안 보여줘서 긴장감)
        if (stage >= 2) {
          ctx.save();
          ctx.globalAlpha = stageAlpha;
          const label = (done ? "✓ " : "") + post.name;
          const fs = (isMob ? 14 : 12) * stageScale;
          ctx.font = `${fs}px sans-serif`;
          const tw = ctx.measureText(label).width;
          const lx = px - tw/2 - 10;
          const ly = drawY - pinR*2 - (isMob ? 42 : 34) * stageScale;
          const lw = tw + 20; const lh = (isMob ? 28 : 24) * stageScale;
          // ── 말풍선 그리기 ──
          const br = 7;        // 모서리 반경
          const ty = 8;        // 꼬리 높이
          const tx = 8;        // 꼬리 너비 절반
          const bx = lx, by = ly, bw = lw, bh = lh;
          const mx = bx + bw / 2; // 말풍선 중앙 x

          ctx.fillStyle = done ? "#3a8d5f" : "rgba(15,15,16,0.92)";
          ctx.strokeStyle = done ? "#4a9d6f" : "#b89a5a";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          // 상단 좌측 모서리
          ctx.moveTo(bx + br, by);
          // 상단 우측 모서리
          ctx.lineTo(bx + bw - br, by);
          ctx.arcTo(bx + bw, by, bx + bw, by + br, br);
          // 우측 하단 모서리
          ctx.lineTo(bx + bw, by + bh - br);
          ctx.arcTo(bx + bw, by + bh, bx + bw - br, by + bh, br);
          // 꼬리 오른쪽
          ctx.lineTo(mx + tx, by + bh);
          // 꼬리 끝 (아래 뾰족)
          ctx.lineTo(mx, by + bh + ty);
          // 꼬리 왼쪽
          ctx.lineTo(mx - tx, by + bh);
          // 하단 좌측 모서리
          ctx.lineTo(bx + br, by + bh);
          ctx.arcTo(bx, by + bh, bx, by + bh - br, br);
          // 좌측 상단 모서리
          ctx.lineTo(bx, by + br);
          ctx.arcTo(bx, by, bx + br, by, br);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = done ? "#d4f0e0" : "#e8e4d9";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, px, by + bh / 2);
          ctx.restore();
        }

        // ── 파티클 업데이트 + 그리기 ──
        if (anim.particles.length > 0) {
          anim.particles = anim.particles.filter((p) => p.life < p.maxLife);
          for (const p of anim.particles) {
            p.life += 16; // ~1프레임
            p.x += p.vx; p.y += p.vy;
            p.vy += 0.06; // 중력
            const lifeRatio = p.life / p.maxLife;
            ctx.save();
            ctx.globalAlpha = Math.max(0, 1 - lifeRatio);
            ctx.fillStyle = p.color;
            const psize = 2.5 * (1 - lifeRatio * 0.5);
            ctx.beginPath(); ctx.arc(p.x, p.y, psize, 0, Math.PI*2); ctx.fill();
            ctx.restore();
          }
        }
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
    const touchOffset = s.isMob ? 100 : 0;
    s.charY = sy - touchOffset;
    s.charVisible = true;
    s.moving = true;

    const mapX = Math.max(0, Math.min(100, ((s.viewX + s.charX) / s.mapW) * 100));
    const mapY = Math.max(0, Math.min(100, ((s.viewY + s.charY) / s.mapH) * 100));
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
    const pinOffset = s.isMob ? 100 : 0;
    const mapX = ((s.viewX + sx) / s.mapW) * 100;
    const mapY = ((s.viewY + sy - pinOffset) / s.mapH) * 100;
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
