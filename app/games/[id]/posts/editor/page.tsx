"use client";

// app/games/[id]/posts/editor/page.tsx
// 수정:
// 1. 사이드 패널이 열려있을 때 지도 클릭 차단 → 좌표 변동 방지
// 2. 패널 열린 상태에서 새 포스트 추가하려면 패널 닫기 버튼 먼저 클릭
// 3. coord 저장을 PostForm onSaved 시점이 아닌 클릭 시점에 ref로 고정

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PostForm from "@/components/posts/PostForm";
import type { Post } from "@/types/post";

interface Game {
  id: string;
  title: string;
  description: string | null;
  difficulty: "easy" | "medium" | "hard";
  target_age: "child" | "teen" | "adult" | "senior" | "all";
}

interface MapInfo { public_url: string; }

export default function PostEditorPage() {
  const { id: gameId } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [game, setGame]       = useState<Game | null>(null);
  const [mapInfo, setMapInfo] = useState<MapInfo | null>(null);
  const [posts, setPosts]     = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showForm, setShowForm]         = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [pickingCoord, setPickingCoord]   = useState(false);

  // ★ 좌표를 ref로 고정 (state보다 먼저 확정)
  const pendingCoordRef = useRef<{ x: number; y: number } | null>(null);
  const [pendingCoordDisplay, setPendingCoordDisplay] = useState<{ x: number; y: number } | null>(null);

  const imgRef  = useRef<HTMLImageElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [, forceUpdate] = useState(0);

  // ★ posts ref (터치 핸들러에서 최신 posts 참조)
  const postsRef = useRef(posts);
  useEffect(() => { postsRef.current = posts; }, [posts]);

  // 패널 열림/닫힘 시 레이아웃 반영 후 강제 리렌더
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        forceUpdate((n) => n + 1);
      });
    });
  }, [showForm]);

  useEffect(() => {
    if (!gameId) return;
    (async () => {
      // ★ games, maps는 admin API 사용 (RLS 우회)
      const [gameRes, mapRes, postsRes] = await Promise.all([
        fetch(`/api/games/${gameId}`).then(r => r.json()),
        fetch(`/api/games/${gameId}/map`).then(r => r.json()),
        fetch(`/api/posts?game_id=${gameId}`).then(r => r.json()),
      ]);
      if (gameRes.data) setGame(gameRes.data as Game);
      if (mapRes.data)  setMapInfo(mapRes.data as MapInfo);
      if (postsRes.data) setPosts(postsRes.data as Post[]);
      setLoading(false);
    })();
  }, [gameId]); // eslint-disable-line

  function getContainRect(cW: number, cH: number, nW: number, nH: number) {
    const cr = cW / cH, ir = nW / nH;
    let w: number, h: number;
    if (ir > cr) { w = cW; h = cW / ir; }
    else         { h = cH; w = cH * ir; }
    return { left: (cW - w) / 2, top: (cH - h) / 2, width: w, height: h };
  }

  const handleMapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapInfo || !imgRef.current || !wrapRef.current) return;

    // ★ 패널이 열려있으면 지도 클릭 완전 차단
    if (showForm) return;

    const wRect   = wrapRef.current.getBoundingClientRect();
    const img     = imgRef.current;
    const contain = getContainRect(wRect.width, wRect.height, img.naturalWidth, img.naturalHeight);

    const relX = e.clientX - wRect.left - contain.left;
    const relY = e.clientY - wRect.top  - contain.top;
    if (relX < 0 || relY < 0 || relX > contain.width || relY > contain.height) return;

    const x = Math.round((relX / contain.width)  * 1000) / 10;
    const y = Math.round((relY / contain.height) * 1000) / 10;

    // 기존 핀 클릭 체크 (4% 이내)
    for (const post of posts) {
      if (post.coord_x === null || post.coord_y === null) continue;
      const dx = x - Number(post.coord_x);
      const dy = y - Number(post.coord_y);
      // ★ PC: 7%, 모바일: 10% (손가락 터치 오차 고려)
      const radius = typeof window !== "undefined" &&
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 10 : 7;
      if (Math.sqrt(dx * dx + dy * dy) < radius) {
        setSelectedPost(post);
        pendingCoordRef.current = null;
        setPendingCoordDisplay(null);
        setDeleteConfirm(false);
        setShowForm(true);
        return;
      }
    }

    // ★ 새 포스트: 좌표를 ref에 즉시 고정
    const coord = { x, y };
    pendingCoordRef.current = coord;
    setPendingCoordDisplay(coord);
    setSelectedPost(null);
    setDeleteConfirm(false);
    setShowForm(true);
  }, [mapInfo, posts, showForm]);

  function pinPos(coordX: number, coordY: number) {
    const wrap = wrapRef.current;
    const img  = imgRef.current;
    if (!wrap || !img || img.naturalWidth === 0) return null;
    const cW = wrap.clientWidth;
    const cH = wrap.clientHeight;
    if (cW === 0) return null;
    const c = getContainRect(cW, cH, img.naturalWidth, img.naturalHeight);
    return {
      left: `${c.left + (coordX / 100) * c.width}px`,
      top:  `${c.top  + (coordY / 100) * c.height}px`,
    };
  }

  // showForm ref (터치 핸들러에서 최신값 참조)
  const showFormRef = useRef(showForm);
  useEffect(() => { showFormRef.current = showForm; }, [showForm]);
  const pickingCoordRef = useRef(false);
  useEffect(() => { pickingCoordRef.current = pickingCoord; }, [pickingCoord]);
  const selectedPostRef = useRef(selectedPost);
  useEffect(() => { selectedPostRef.current = selectedPost; }, [selectedPost]);

  // ★ 터치 이벤트 — 마운트 시 한 번만 등록 (showForm은 ref로 참조)
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    let touchStartX = 0, touchStartY = 0, moved = false;

    function onTStart(e: TouchEvent) {
      if (showFormRef.current) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      moved = false;
    }

    function onTMove(e: TouchEvent) {
      const dx = Math.abs(e.touches[0].clientX - touchStartX);
      const dy = Math.abs(e.touches[0].clientY - touchStartY);
      if (dx > 8 || dy > 8) moved = true;
    }

    function onTEnd(e: TouchEvent) {
      if (moved) return;
      if (showFormRef.current && !pickingCoordRef.current) return;
      const t   = e.changedTouches[0];
      const img = imgRef.current;
      if (!img || img.naturalWidth === 0) return;

      const wrap2 = wrapRef.current;
      if (!wrap2) return;
      const rect = wrap2.getBoundingClientRect();
      const cW   = wrap2.clientWidth;
      const cH   = wrap2.clientHeight;
      if (cW === 0) return;

      // contain rect 계산
      const ir = img.naturalWidth / img.naturalHeight;
      const cr = cW / cH;
      let w: number, h: number;
      if (ir > cr) { w = cW; h = cW / ir; }
      else         { h = cH; w = cH * ir; }
      const left = (cW - w) / 2, top = (cH - h) / 2;

      const relX = t.clientX - rect.left - left;
      const relY = t.clientY - rect.top  - top;
      if (relX < 0 || relY < 0 || relX > w || relY > h) return;

      const x = Math.round((relX / w) * 1000) / 10;
      const y = Math.round((relY / h) * 1000) / 10;

      // 좌표 지정 모드이면 핀 클릭 체크 건너뜀
      if (pickingCoordRef.current) {
        pendingCoordRef.current = { x, y };
        setPendingCoordDisplay({ x, y });
        setPickingCoord(false);
        setShowForm(true);
        return;
      }
      // 핀 탭 (10% 이내)
      for (const post of postsRef.current) {
        if (post.coord_x === null || post.coord_y === null) continue;
        const dx = x - Number(post.coord_x);
        const dy = y - Number(post.coord_y);
        if (Math.sqrt(dx * dx + dy * dy) < 10) {
          setSelectedPost(post);
          pendingCoordRef.current = null;
          setPendingCoordDisplay(null);
          setDeleteConfirm(false);
          setShowForm(true);
          return;
        }
      }

      // 새 포스트
      pendingCoordRef.current = { x, y };
      setPendingCoordDisplay({ x, y });
      setSelectedPost(null);
      setDeleteConfirm(false);
      setShowForm(true);
    }

    // PC 마우스 클릭
    function onMouseClick(e: MouseEvent) {
      const img = imgRef.current;
      if (!img || img.naturalWidth === 0) return;
      const wrap2 = wrapRef.current;
      if (!wrap2) return;
      const rect = wrap2.getBoundingClientRect();
      const cW = wrap2.clientWidth, cH = wrap2.clientHeight;
      const ir = img.naturalWidth / img.naturalHeight;
      const cr = cW / cH;
      let w: number, h: number;
      if (ir > cr) { w = cW; h = cW / ir; } else { h = cH; w = cH * ir; }
      const left = (cW - w) / 2, top = (cH - h) / 2;
      const relX = e.clientX - rect.left - left;
      const relY = e.clientY - rect.top - top;
      if (relX < 0 || relY < 0 || relX > w || relY > h) return;
      const x = Math.round((relX / w) * 1000) / 10;
      const y = Math.round((relY / h) * 1000) / 10;
      if (pickingCoordRef.current) {
        pendingCoordRef.current = { x, y }; setPendingCoordDisplay({ x, y });
        setPickingCoord(false); setShowForm(true); return;
      }
      for (const post of postsRef.current) {
        if (post.coord_x === null || post.coord_y === null) continue;
        const dx = x - Number(post.coord_x), dy = y - Number(post.coord_y);
        if (Math.sqrt(dx*dx+dy*dy) < 7) {
          setSelectedPost(post); pendingCoordRef.current = null; setPendingCoordDisplay(null); setDeleteConfirm(false); setShowForm(true); return;
        }
      }
      if (showFormRef.current) return;
      pendingCoordRef.current = { x, y }; setPendingCoordDisplay({ x, y }); setSelectedPost(null); setDeleteConfirm(false); setShowForm(true);
    }
    wrap.addEventListener("click", onMouseClick);
    wrap.addEventListener("touchstart", onTStart, { passive: true });
    wrap.addEventListener("touchmove",  onTMove,  { passive: true });
    wrap.addEventListener("touchend",   onTEnd,   { passive: true });
    return () => {
      wrap.removeEventListener("click", onMouseClick);
      wrap.removeEventListener("touchstart", onTStart);
      wrap.removeEventListener("touchmove",  onTMove);
      wrap.removeEventListener("touchend",   onTEnd);
    };
  }, []); // eslint-disable-line — showForm/posts는 ref로 참조

  // ★ 화면 회전 대응
  useEffect(() => {
    function rerender() {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => forceUpdate((n) => n + 1));
      });
    }
    window.addEventListener("orientationchange", rerender);
    window.addEventListener("resize", rerender);
    return () => {
      window.removeEventListener("orientationchange", rerender);
      window.removeEventListener("resize", rerender);
    };
  }, []);

  async function handlePostSaved(post: Post) {
    if (!gameId || !post.id) return;

    // ★ ref에 저장된 좌표 사용 (state 타이밍 문제 없음)
    const coord = pendingCoordRef.current;

    if ((post.coord_x === null || post.coord_y === null) && coord) {
      const cr = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coord_x: coord.x, coord_y: coord.y }),
      });
      const cj = await cr.json();
      if (cj.data) post = cj.data as Post;
    }

    setPosts((prev) => {
      const exists = prev.find((p) => p.id === post.id);
      if (exists) return prev.map((p) => (p.id === post.id ? post : p));
      return [...prev, post];
    });

    setSelectedPost(post);
    // ★ 저장 완료 후 pendingCoord 초기화 (ref + display 모두)
    pendingCoordRef.current = null;
    setPendingCoordDisplay(null);
  }

  async function handleDeletePost() {
    if (!selectedPost?.id) return;
    setDeleting(true);
    try {
      await fetch(`/api/posts/${selectedPost.id}`, { method: "DELETE" });
      setPosts((prev) => prev.filter((p) => p.id !== selectedPost.id));
      handleClose();
    } catch (err) {
      console.error("포스트 삭제 오류:", err);
    } finally {
      setDeleting(false);
    }
  }

  function handleClose() {
    setShowForm(false);
    if (!pickingCoordRef.current) setSelectedPost(null);
    pendingCoordRef.current = null;
    setPendingCoordDisplay(null);
    setDeleteConfirm(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f10]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#b89a5a] border-t-transparent"/>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0f0f10] overflow-hidden">

      {/* 상단 네비게이션 */}
      <div className="flex-shrink-0 bg-[#0f0f10] border-b border-[#2a2924]
        px-4 py-2.5 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <button onClick={() => router.push("/games")}
            className="flex items-center gap-1.5 rounded-lg border border-[#2a2924]
              px-3 py-1.5 text-xs text-[#7a756c] hover:border-[#3a3830]
              hover:text-[#9a9590] transition-colors whitespace-nowrap">
            <HomeIcon/> 게임 목록
          </button>
          <span className="text-[#2a2924]">/</span>
          <button onClick={() => router.push(`/games/${gameId}/edit`)}
            className="flex items-center gap-1.5 rounded-lg border border-[#2a2924]
              px-3 py-1.5 text-xs text-[#7a756c] hover:border-[#3a3830]
              hover:text-[#9a9590] transition-colors whitespace-nowrap">
            <SettingsIcon/> 게임 설정
          </button>
          <span className="text-[#2a2924]">/</span>
          <button onClick={() => router.push(`/games/${gameId}/map`)}
            className="flex items-center gap-1.5 rounded-lg border border-[#2a2924]
              px-3 py-1.5 text-xs text-[#7a756c] hover:border-[#3a3830]
              hover:text-[#9a9590] transition-colors whitespace-nowrap">
            <MapIcon/> 지도 관리
          </button>
          <span className="text-[#2a2924]">/</span>
          <span className="text-xs font-medium text-[#b89a5a] truncate">포스트 배치</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {game && (
            <span className="text-xs text-[#5a5650] truncate max-w-[140px]">{game.title}</span>
          )}
          <span className="rounded-full border border-[#2a2924] bg-[#18181a]
            px-2.5 py-0.5 text-[11px] text-[#7a756c]">
            포스트 {posts.length}개
          </span>
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex flex-1 overflow-hidden">

        {/* 지도 영역 */}
        <div
          ref={wrapRef}
          className="relative flex-1 overflow-hidden"
          style={{ cursor: showForm ? "default" : (mapInfo ? "crosshair" : "default") }}
          onClick={handleMapClick}
        >
          {mapInfo ? (
            <img
              ref={imgRef}
              src={mapInfo.public_url}
              alt="보물지도"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              onLoad={() => setImgLoaded(true)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <p className="text-[#3a3830] text-sm">지도가 없습니다</p>
              <button onClick={() => router.push(`/games/${gameId}/map`)}
                className="rounded-xl bg-[#b89a5a] px-4 py-2 text-sm font-medium text-[#0f0f10]">
                지도 업로드하러 가기
              </button>
            </div>
          )}

          {/* 포스트 핀 */}
          {imgLoaded && posts.map((post) => {
            if (post.coord_x === null || post.coord_y === null) return null;
            const pos = pinPos(Number(post.coord_x), Number(post.coord_y));
            if (!pos) return null;
            const isSelected = selectedPost?.id === post.id;
            const hasQuiz    = (post.quizzes?.length ?? 0) > 0;
            return (
              <div key={post.id}
                className="absolute -translate-x-1/2 -translate-y-full pointer-events-none"
                style={{ left: pos.left, top: pos.top, zIndex: 10 }}>
                <div className="flex flex-col items-center">
                  <div className={`mb-1 rounded-lg px-2 py-0.5 text-[10px] font-medium
                    whitespace-nowrap shadow
                    ${isSelected ? "bg-[#b89a5a] text-[#0f0f10]" : "bg-black/80 text-white"}`}>
                    {post.name}
                  </div>
                  <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center
                    text-[10px] font-bold shadow-lg
                    ${isSelected
                      ? "border-white bg-white text-[#b89a5a] scale-125"
                      : hasQuiz
                      ? "border-[#4a9d6f] bg-[#4a9d6f] text-white"
                      : "border-[#b89a5a] bg-[#b89a5a] text-[#0f0f10]"
                    }`}>
                    {hasQuiz ? "Q" : "!"}
                  </div>
                  <div className={`w-0.5 h-2
                    ${isSelected ? "bg-white" : hasQuiz ? "bg-[#4a9d6f]" : "bg-[#b89a5a]"}`}/>
                </div>
              </div>
            );
          })}

          {/* 새 포스트 임시 핀 */}
          {showForm && pendingCoordDisplay && imgLoaded && (() => {
            const pos = pinPos(pendingCoordDisplay.x, pendingCoordDisplay.y);
            if (!pos) return null;
            return (
              <div className="absolute -translate-x-1/2 -translate-y-full pointer-events-none animate-bounce"
                style={{ left: pos.left, top: pos.top, zIndex: 15 }}>
                <div className="flex flex-col items-center">
                  <div className="mb-1 rounded-lg bg-[#b89a5a] px-2 py-0.5 text-[10px] font-medium text-[#0f0f10]">
                    새 포스트
                  </div>
                  <div className="h-6 w-6 rounded-full border-2 border-dashed border-[#b89a5a]
                    bg-[#b89a5a]/20 flex items-center justify-center text-[10px] text-[#b89a5a]">
                    +
                  </div>
                  <div className="w-0.5 h-2 bg-[#b89a5a]"/>
                </div>
              </div>
            );
          })()}

          {/* 좌표 지정 모드 오버레이 */}
          {pickingCoord && (
            <div className="absolute inset-0 z-30 pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.3)', pointerEvents: 'none' }}>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                rounded-xl border border-[#b89a5a] bg-[#0f0f10]/95
                px-5 py-3 text-center">
                <p className="text-sm font-medium text-[#b89a5a] mb-1">📍 위치를 탭/클릭하세요</p>
                <p className="text-xs text-[#5a5650]">원하는 위치를 탭하면 핀이 찍힙니다</p>
              </div>
            </div>
          )}
          {pickingCoord && (
            <button
              onClick={() => { setPickingCoord(false); setShowForm(true); }}
              className="absolute top-3 right-3 z-40 rounded-xl border border-[#2a2924]
                bg-[#0f0f10]/90 px-3 py-1.5 text-xs text-[#7a756c]
                hover:text-[#e07070] transition-colors backdrop-blur-sm">
              ✕ 취소
            </button>
          )}

          {/* 패널 열린 상태 안내 */}
          {showForm && !(selectedPost && selectedPost.coord_x === null) && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20
              rounded-xl border border-[#b89a5a]/30 bg-[#0f0f10]/85
              px-4 py-2 text-xs text-[#b89a5a] backdrop-blur-sm whitespace-nowrap">
              새 포스트 추가하려면 먼저 오른쪽 패널을 닫아주세요 (✕)
            </div>
          )}

          {/* 기본 안내 */}
          {!showForm && mapInfo && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20
              rounded-xl border border-[#2a2924] bg-[#0f0f10]/85
              px-4 py-2 text-xs text-[#5a5650] backdrop-blur-sm whitespace-nowrap">
              🖱️ 빈 곳 클릭 → 새 포스트 추가 &nbsp;|&nbsp; 📍 핀 클릭 → 수정 / 삭제
            </div>
          )}

          {/* 핀 범례 */}
          {imgLoaded && posts.length > 0 && (
            <div className="absolute top-3 left-3 z-20
              rounded-xl border border-[#2a2924] bg-[#0f0f10]/85
              px-3 py-2 space-y-1.5 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-[10px] text-[#5a5650]">
                <div className="h-3.5 w-3.5 rounded-full bg-[#4a9d6f]"/>퀴즈 있음
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#5a5650]">
                <div className="h-3.5 w-3.5 rounded-full bg-[#b89a5a]"/>퀴즈 없음
              </div>
            </div>
          )}

          {/* 미배치 포스트 목록 */}
            {posts.filter(p => p.coord_x === null || p.coord_y === null).length > 0 && (
              <div className="absolute left-3 z-20
                rounded-xl border border-[#b89a5a]/30 bg-[#0f0f10]/90
                px-3 py-2.5 space-y-1.5 backdrop-blur-sm max-w-[180px]"
                style={{ top: "calc(3rem + 80px)" }}>
                <p className="text-[10px] font-medium text-[#b89a5a] tracking-wide">
                  📍 배치 대기 중 ({posts.filter(p => p.coord_x === null || p.coord_y === null).length}개)
                </p>
                <p className="text-[9px] text-[#4a4840]">클릭 후 지도에서 위치 지정</p>
                {posts
                  .filter(p => p.coord_x === null || p.coord_y === null)
                  .map(p => (
                    <button key={p.id}
                      onClick={() => {
                        setSelectedPost(p);
                        setDeleteConfirm(false);
                        setShowForm(true);
                        pendingCoordRef.current = null;
                        setPendingCoordDisplay(null);
                      }}
                      className={`w-full text-left rounded-lg border px-2.5 py-1.5
                        text-[11px] transition-colors
                        ${selectedPost?.id === p.id
                          ? "border-[#b89a5a] bg-[#b89a5a]/15 text-[#e8e4d9]"
                          : "border-[#2a2924] text-[#7a756c] hover:border-[#b89a5a]/40 hover:text-[#c4bfb4]"
                        }`}>
                      {p.name}
                    </button>
                  ))
                }
              </div>
            )}
        </div>

        {/* 사이드 패널 */}
        {showForm && game && (
          <div className="w-[420px] flex-shrink-0 border-l border-[#2a2924]
            bg-[#18181a] overflow-y-auto flex flex-col">

            <div className="sticky top-0 bg-[#18181a] border-b border-[#2a2924]
              px-5 py-3.5 flex items-center justify-between flex-shrink-0 z-10">
              <div>
                <h2 className="text-sm font-semibold text-[#e8e4d9]">
                  {selectedPost?.id ? "포스트 수정" : "새 포스트 추가"}
                </h2>
                {pendingCoordDisplay ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[11px] text-[#5a5650]">
                      위치: ({pendingCoordDisplay.x.toFixed(1)}%, {pendingCoordDisplay.y.toFixed(1)}%)
                    </p>
                    <button type="button"
                      onClick={() => { setPickingCoord(true); setShowForm(false); }}
                      className="text-[10px] text-[#b89a5a] hover:underline">
                      변경 →
                    </button>
                  </div>
                ) : (
                  <button type="button"
                    onClick={() => { setPickingCoord(true); setShowForm(false); }}
                    className="mt-1 flex items-center gap-1 text-[11px] text-[#b89a5a]
                      hover:text-[#c9aa6a] transition-colors">
                    📍 지도에서 위치 지정
                  </button>
                )}
                {selectedPost && (
                  <p className="text-[11px] text-[#5a5650] mt-0.5">
                    퀴즈 {selectedPost.quizzes?.length ?? 0}개
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedPost?.id && (
                  <>
                    {!deleteConfirm ? (
                      <button onClick={() => setDeleteConfirm(true)}
                        className="flex items-center gap-1 rounded-lg border border-[#3a2424]
                          px-2.5 py-1.5 text-xs text-[#c0504a]
                          hover:border-[#c0504a]/50 hover:bg-[#c0504a]/10 transition-colors">
                        <TrashIcon/> 삭제
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[#c0504a]">정말 삭제?</span>
                        <button onClick={handleDeletePost} disabled={deleting}
                          className="rounded-lg bg-[#c0504a] px-2.5 py-1.5 text-[11px]
                            font-medium text-white hover:bg-[#d06050]
                            disabled:opacity-50 transition-colors">
                          {deleting ? "삭제 중…" : "확인"}
                        </button>
                        <button onClick={() => setDeleteConfirm(false)}
                          className="rounded-lg border border-[#2a2924] px-2.5 py-1.5
                            text-[11px] text-[#7a756c] hover:border-[#3a3830] transition-colors">
                          취소
                        </button>
                      </div>
                    )}
                  </>
                )}
                <button onClick={handleClose} title="패널 닫기"
                  className="rounded-lg border border-[#2a2924] p-1.5 text-[#5a5650]
                    hover:text-[#9a9590] transition-colors">
                  <CloseIcon/>
                </button>
              </div>
            </div>

            <div className="p-5 flex-1">
              <PostForm
                key={selectedPost?.id ?? "new"}
                gameId={gameId}
                game={game}
                initial={selectedPost ?? undefined}
                onSaved={handlePostSaved}
                onCancel={handleClose}
              />
            </div>

            <div className="border-t border-[#2a2924] px-5 py-3 flex gap-2 flex-shrink-0">
              <button onClick={() => router.push("/games")}
                className="flex-1 rounded-xl border border-[#2a2924] py-2
                  text-xs text-[#5a5650] hover:border-[#3a3830] transition-colors">
                🏠 게임 목록
              </button>
              <button onClick={() => router.push(`/games/${gameId}/edit`)}
                className="flex-1 rounded-xl border border-[#2a2924] py-2
                  text-xs text-[#5a5650] hover:border-[#3a3830] transition-colors">
                ⚙️ 게임 설정
              </button>
              <button onClick={() => router.push(`/games/${gameId}/map`)}
                className="flex-1 rounded-xl border border-[#2a2924] py-2
                  text-xs text-[#5a5650] hover:border-[#3a3830] transition-colors">
                🗺️ 지도 관리
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HomeIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>;
}
function SettingsIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>;
}
function MapIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
    <line x1="8" y1="2" x2="8" y2="18"/>
    <line x1="16" y1="6" x2="16" y2="22"/>
  </svg>;
}
function TrashIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
  </svg>;
}
function CloseIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>;
}
