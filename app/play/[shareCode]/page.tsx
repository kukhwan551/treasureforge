"use client";

// app/play/[shareCode]/page.tsx
// 수정: mission_type에 따라 퀴즈 또는 퍼즐 팝업 분기

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import GameIntro        from "./components/GameIntro";
import ExploreMap, { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, ZOOM_DEFAULT, setObstaclePaused } from "./components/ExploreMap";
import { CHARACTERS, type CharacterId } from "@/types/character";
import HUD, { HUD_HEIGHT } from "./components/HUD";
import MissionPopup     from "./components/MissionPopup";
import PuzzlePopup       from "@/components/puzzle/PuzzlePopup";
import PhotoMissionPopup from "@/components/photo/PhotoMissionPopup";
import TreasureComplete from "./components/TreasureComplete";
import ConfettiCanvas   from "./components/ConfettiCanvas";
import KeyFlyAnimation  from "./components/KeyFlyAnimation";
import ResultOverlay, { ResultType } from "./components/ResultOverlay";
import {
  distToSignal, NEARBY_THRESHOLD,
  initAudio, disposeAudio,
  playSignalBeep, playCorrectSound, playWrongSound,
  playKeySound, playTimeoutSound, playTreasureSound,
} from "@/lib/signalEngine";
import type {
  PublicGame, PlayerSession, ActiveQuizState,
  GamePhase, SignalLevel, PostWithQuiz,
} from "@/types/explore";

export default function PlayPage() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const router = useRouter();

  // ── 카카오톡 인앱 브라우저 감지 ──
  // (Canvas 렌더링이 카카오 인앱 웹뷰에서 정상 동작하지 않는 문제 우회)
  useEffect(() => {
    const ua = navigator.userAgent || "";
    const inKakao = /KAKAOTALK/i.test(ua);
    if (!inKakao) return;
    setIsKakaoInApp(true);

    // 안드로이드는 카카오 공식 스킴으로 외부 브라우저 자동 전환 가능
    const isAndroid = /Android/i.test(ua);
    if (isAndroid) {
      const targetUrl = window.location.href;
      window.location.href =
        "kakaotalk://web/openExternal?url=" + encodeURIComponent(targetUrl);
    }
    // iOS는 카카오 정책상 자동 전환이 막혀있어, 안내 화면을 그대로 보여줌
  }, []);

  const [game, setGame]           = useState<PublicGame | null>(null);
  const [isKakaoInApp, setIsKakaoInApp] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase]         = useState<GamePhase>("loading");
  const [entryInput, setEntryInput] = useState("");
  const [entryError, setEntryError] = useState("");
  const [session, setSession]     = useState<PlayerSession | null>(null);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [nearbyIds, setNearbyIds]       = useState<Set<string>>(new Set());
  const [signalLevel, setSignalLevel]   = useState<SignalLevel>(0);
  const [activePost, setActivePost]     = useState<PostWithQuiz | null>(null);
  const [quizState, setQuizState]       = useState<ActiveQuizState | null>(null);
  const [quizIndex, setQuizIndex]       = useState(0);
  const [totalQuizScore, setTotalQuizScore] = useState(0);

  const [resultOverlay, setResultOverlay]   = useState<ResultType>(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const [keyFly, setKeyFly] = useState<{ active: boolean; x: number; y: number }>({
    active: false, x: 50, y: 50,
  });

  const [gameTimeLimitSec, setGameTimeLimitSec] = useState<number | null>(null);
  const [gameTimeLeft, setGameTimeLeft]         = useState<number | null>(null);
  const [elapsedSec, setElapsedSec]             = useState(0);
  const gameTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [seniorMode, setSeniorMode]     = useState(false);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [characterId, setCharacterId] = useState<CharacterId>(CHARACTERS[0].id);

  function handleZoomIn()  { setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100)); }
  function handleZoomOut() { setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100)); }
  const [soundEnabled, setSoundEnabled] = useState(true);

  const gameRef         = useRef<PublicGame | null>(null);
  const completedIdsRef = useRef<Set<string>>(new Set());
  const phaseRef        = useRef<GamePhase>("loading");
  const pauseBubbleRef  = useRef(false);
  const exploremapPauseRef = useRef<React.MutableRefObject<boolean> | null>(null);
  const soundEnabledRef = useRef(true);
  const lastSignalRef   = useRef<SignalLevel>(0);
  const beepTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef          = useRef<number | null>(null);

  useEffect(() => { gameRef.current         = game;         }, [game]);
  useEffect(() => { completedIdsRef.current = completedIds; }, [completedIds]);
  // phaseRef 동기화
  useEffect(() => {
    phaseRef.current = phase;
    pauseBubbleRef.current = phase !== "exploring";
    // 참고: setObstaclePaused는 여기서 호출하지 않음
    // phase가 exploring으로 바뀔 때 false로 덮어씌우는 문제 방지
    // setObstaclePaused는 퍼즐/퀴즈 시작 시와 터치 이동 시에만 호출
    if (phase !== "exploring") {
      setObstaclePaused(true);
    }
  }, [phase]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  useEffect(() => {
    if (!shareCode) return;
    (async () => {
      try {
        const res  = await fetch(`/api/play/${shareCode}`);
        const json = await res.json();
        if (json.error) { setLoadError(json.error.message); return; }
        const gameData: PublicGame = json.data;
        setGame(gameData);
        gameRef.current = gameData;
        setGameTimeLimitSec(gameData.time_limit_sec ?? null);
        setPhase(gameData.status === "private" ? "entry_code" : "intro");
      } catch {
        setLoadError("게임을 불러올 수 없습니다.");
      }
    })();
    return () => {
      disposeAudio();
      if (rafRef.current)          cancelAnimationFrame(rafRef.current);
      if (beepTimerRef.current)    clearTimeout(beepTimerRef.current);
      if (gameTimerRef.current)    clearInterval(gameTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [shareCode]); // eslint-disable-line

  useEffect(() => {
    if (phase !== "exploring") return;
    if (gameTimerRef.current)    clearInterval(gameTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);

    setElapsedSec(0);
    elapsedTimerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);

    if (gameTimeLimitSec && gameTimeLimitSec > 0) {
      setGameTimeLeft(gameTimeLimitSec);
      gameTimerRef.current = setInterval(() => {
        setGameTimeLeft((t) => {
          if (t === null || t <= 1) {
            clearInterval(gameTimerRef.current!);
            handleTimeExpired();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      setGameTimeLeft(null);
    }

    return () => {
      if (gameTimerRef.current)    clearInterval(gameTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [phase, gameTimeLimitSec]); // eslint-disable-line

  function clearExploreState() {
    setCompletedIds(new Set());
    completedIdsRef.current = new Set();
    setNearbyIds(new Set());
    setSignalLevel(0);
    lastSignalRef.current = 0;
    setActivePost(null);
    setQuizState(null);
    setGameTimeLeft(null);
    setElapsedSec(0);
    if (gameTimerRef.current)    clearInterval(gameTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
  }

  function handleTimeExpired() { clearExploreState(); setSession(null); setPhase("intro"); }
  function handleExit()        { clearExploreState(); setSession(null); setPhase("intro"); }

  async function handleEntryCode() {
    if (!game) return;
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const sb = createClient();
      const { data } = await sb.from("games").select("entry_code").eq("id", game.id).single();
      if (data?.entry_code !== entryInput.trim()) { setEntryError("입장 코드가 올바르지 않습니다."); return; }
      setPhase("intro");
    } catch { setEntryError("확인 중 오류가 발생했습니다."); }
  }

  async function handleStart(nickname: string, charId: CharacterId, contact: string) {
    if (!game) return;
    setCharacterId(charId);
    const res = await fetch("/api/play/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game_id: game.id, nickname, character_id: charId, contact }),
    });
    const json = await res.json();
    if (json.error) return;
    setSession(json.data);
    if (json.data?.already_claimed) setAlreadyClaimed(true);
    if (soundEnabled) initAudio();
    setPhase("exploring");
  }

  const handleCursorMove = useCallback((x: number, y: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const g = gameRef.current;
      if (!g || phaseRef.current !== "exploring") return;
      const completed = completedIdsRef.current;

      let accessibleIds: Set<string>;
      if (g.order_mode === "sequential") {
        const sorted = [...g.posts].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
        const next   = sorted.find((p) => !completed.has(p.id));
        accessibleIds = new Set(next ? [next.id] : []);
      } else {
        accessibleIds = new Set(g.posts.filter((p) => !completed.has(p.id)).map((p) => p.id));
      }

      const distances = g.posts
        .filter((p) => accessibleIds.has(p.id) && p.coord_x !== null && p.coord_y !== null)
        .map((p) => ({
          post: p,
          dist: Math.sqrt(Math.pow(x - Number(p.coord_x), 2) + Math.pow(y - Number(p.coord_y), 2)),
        }))
        .sort((a, b) => a.dist - b.dist);

      const nearest  = distances[0] ?? null;
      const newLevel: SignalLevel = nearest ? distToSignal(nearest.dist) : 0;
      setSignalLevel(newLevel);

      const newNearby = new Set<string>([
        ...Array.from(completed),
        ...distances.filter((d) => d.dist <= NEARBY_THRESHOLD).map((d) => d.post.id),
      ]);
      setNearbyIds(newNearby);

      if (newLevel !== lastSignalRef.current) {
        lastSignalRef.current = newLevel;
        if (beepTimerRef.current) clearTimeout(beepTimerRef.current);
        if (soundEnabledRef.current && newLevel > 0) {
          beepTimerRef.current = setTimeout(() => playSignalBeep(newLevel), 0);
        }
      }
    });
  }, []);

  // ── 포스트 클릭 — mission_type 분기 ──
  function handlePostClick(post: PostWithQuiz) {
    if (!nearbyIds.has(post.id) || completedIds.has(post.id)) return;
    setActivePost(post);

    const missionType = post.mission_type ?? "quiz";

    if (missionType === "puzzle") {
      const puzzle = post.post_puzzles?.[0];
      if (!puzzle) { handlePostComplete(post, 0); return; }
      pauseBubbleRef.current = true;
      setObstaclePaused(true);
      setPhase("puzzle");
      return;
    }

    if (missionType === "photo") {
      pauseBubbleRef.current = true;
      setPhase("photo");
      return;
    }

    // 퀴즈 미션 (기본)
    if (post.quizzes.length === 0) { handlePostComplete(post, 0); return; }
    setQuizIndex(0);
    setTotalQuizScore(0);
    setQuizState({
      quiz:       post.quizzes[0],
      postId:     post.id,
      attempts:   0,
      hintsUsed:  0,
      timeLeft:   post.time_limit_sec ?? null,
      status:     "answering",
      userAnswer: "",
    });
    setPhase("mission");
  }

  function handleAnswer(answer: string) {
    if (!quizState || !activePost) return;
    const post  = activePost;
    const score = quizState.quiz.score;

    if (answer === "__TIMEOUT__") {
      if (soundEnabled) playTimeoutSound();
      setActivePost(null); setQuizState(null);
      setPhase("exploring");
      setResultOverlay("timeout");
      return;
    }

    const isCorrect = checkAnswer(answer, quizState.quiz.answer, quizState.quiz.type);

    if (isCorrect) {
      if (soundEnabled) playCorrectSound();
      const nextIndex = quizIndex + 1;
      const accumulated = totalQuizScore + score;

      // 다음 퀴즈가 있으면 계속 진행
      if (nextIndex < post.quizzes.length) {
        setQuizIndex(nextIndex);
        setTotalQuizScore(accumulated);
        setResultOverlay("correct_intermediate");
        setTimeout(() => {
          setResultOverlay(null);
          setQuizState({
            quiz:       post.quizzes[nextIndex],
            postId:     post.id,
            attempts:   0,
            hintsUsed:  0,
            timeLeft:   post.time_limit_sec ?? null,
            status:     "answering",
            userAnswer: "",
          });
        }, 1200);
        return;
      }

      // 모든 퀴즈 완료
      setActivePost(null); setQuizState(null);
      setQuizIndex(0); setTotalQuizScore(0);
      setPhase("exploring");

      const g = gameRef.current;
      const completed = completedIdsRef.current;
      const isLast = g ? (completed.size + 1 >= g.posts.length) : false;

      setConfettiActive(true);
      setResultOverlay("correct");
      const px = Number(post.coord_x) ?? 50;
      const py = Number(post.coord_y) ?? 50;
      setTimeout(() => setKeyFly({ active: true, x: px, y: py }), 300);

      const delay = isLast ? 1500 : 5600;
      setTimeout(() => {
        setConfettiActive(false);
        setKeyFly((k) => ({ ...k, active: false }));
        handlePostComplete(post, accumulated);
      }, delay);
    } else {
      if (soundEnabled) playWrongSound();
      setActivePost(null); setQuizState(null);
      setQuizIndex(0); setTotalQuizScore(0);
      setPhase("exploring");
      setResultOverlay("wrong");
    }
  }

  // 퍼즐 완료
  function handlePuzzleComplete() {
    if (!activePost) return;
    const post = activePost;
    // 즉시 pause 유지 (축하 애니메이션 동안)
    setObstaclePaused(true);
    pauseBubbleRef.current = true;
    if (soundEnabled) playCorrectSound();
    setActivePost(null);
    setPhase("exploring");

    const g = gameRef.current;
    const completed = completedIdsRef.current;
    const isLast = g ? (completed.size + 1 >= g.posts.length) : false;

    setConfettiActive(true);
    setResultOverlay("correct");
    const px = Number(post.coord_x) ?? 50;
    const py = Number(post.coord_y) ?? 50;
    setTimeout(() => setKeyFly({ active: true, x: px, y: py }), 300);

    const delay = isLast ? 1500 : 5600;
    setTimeout(() => {
      setConfettiActive(false);
      setKeyFly((k) => ({ ...k, active: false }));
      pauseBubbleRef.current = false;
      // 장애물 재개는 터치/마우스 이동 시 자연스럽게 처리됨
      setObstaclePaused(false);
      handlePostComplete(post, 0);
    }, delay);
  }

  function handlePuzzleSkip() {
    setObstaclePaused(false);
    pauseBubbleRef.current = false;
    setActivePost(null);
    setPhase("exploring");
  }

  function handleSkip() {
    setActivePost(null); setQuizState(null);
    setPhase("exploring");
  }

  async function handlePostComplete(post: PostWithQuiz, quizScore: number) {
    if (!session) return;
    const newCompleted    = new Set(completedIdsRef.current).add(post.id);
    const newKeys         = (session.keys ?? 0) + 1;
    const newScore        = (session.score ?? 0) + post.score + quizScore;
    const newCompletedArr = Array.from(newCompleted);

    if (soundEnabled) playKeySound();
    setCompletedIds(newCompleted);
    completedIdsRef.current = newCompleted;
    setSession((s) => s ? { ...s, keys: newKeys, score: newScore, completed_post_ids: newCompletedArr } : null);

    await fetch("/api/play/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: session.id, keys: newKeys, score: newScore, completed_post_ids: newCompletedArr }),
    });

    if (game && newCompleted.size >= game.posts.length) {
      if (gameTimerRef.current)    clearInterval(gameTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      if (soundEnabled) playTreasureSound();
      const finishedAt = new Date().toISOString();
      setSession((s) => s ? { ...s, finished_at: finishedAt } : null);
      if (!alreadyClaimed) await fetch("/api/play/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session.id, finished_at: finishedAt }),
      });
      setPhase("complete");
    }
  }

  function handleObstacleHit() {
    setCompletedIds(new Set());
    completedIdsRef.current = new Set();
    setSession((s) => s ? { ...s, keys: 0, score: 0, completed_post_ids: [] } : null);
  }

  function handleRestart() { clearExploreState(); setSession(null); setPhase("intro"); }

  // ── 렌더 ──

  if (isKakaoInApp) {
    return (
      <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <div className="text-4xl mb-4">🧭</div>
          <h1 className="text-lg font-semibold text-[#e8e4d9] mb-2">
            외부 브라우저로 열어주세요
          </h1>
          <p className="text-sm text-[#9a9590] leading-relaxed mb-6">
            카카오톡 안에서는 지도가 정상적으로 표시되지 않을 수 있습니다.
            <br/>
            화면 우측 상단의 <span className="text-[#b89a5a] font-medium">⋯ (더보기)</span> 를 눌러
            <br/>
            <span className="text-[#b89a5a] font-medium">&quot;다른 브라우저로 열기&quot;</span>를 선택해 주세요.
          </p>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              alert("링크가 복사되었습니다. 크롬/사파리에 붙여넣어 주세요.");
            }}
            className="rounded-xl bg-[#b89a5a] px-5 py-2.5 text-sm font-medium text-[#0f0f10]
              hover:bg-[#c9aa6a] transition-colors"
          >
            링크 복사하기
          </button>
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f10]">
        {loadError
          ? <p className="text-sm text-[#e07070]">{loadError}</p>
          : <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#b89a5a] border-t-transparent"/>
        }
      </div>
    );
  }
  if (!game) return null;



  if (phase === "entry_code") {
    return (
      <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center">
            <div className="text-5xl mb-3">🔒</div>
            <h1 className="text-xl font-bold text-[#e8e4d9]">{game.title}</h1>
            <p className="mt-1 text-sm text-[#7a756c]">비공개 게임입니다.</p>
          </div>
          <div className="rounded-2xl border border-[#2a2924] bg-[#18181a] p-6 space-y-4">
            <input type="text" value={entryInput} maxLength={6} autoComplete="off"
              onChange={(e) => { setEntryInput(e.target.value.replace(/\D/g, "")); setEntryError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleEntryCode()}
              placeholder="입장 코드"
              className="w-full rounded-xl border border-[#2a2924] bg-[#141414] px-4 py-4
                text-center font-mono tracking-[0.5em] text-2xl text-[#e8e4d9]
                focus:outline-none focus:border-[#b89a5a]"/>
            {entryError && <p className="text-sm text-[#e07070] text-center">{entryError}</p>}
            <button onClick={handleEntryCode}
              className="w-full rounded-xl bg-[#b89a5a] py-3 font-bold text-[#0f0f10] hover:bg-[#c9aa6a]">
              입장
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <GameIntro game={game} seniorMode={seniorMode}
        onStart={handleStart}
        onToggleSenior={() => setSeniorMode((v) => !v)}/>
    );
  }

  if (phase === "complete" && session) {
    return (
      <TreasureComplete game={game} session={session}
        seniorMode={seniorMode} soundEnabled={soundEnabled}
        alreadyClaimed={alreadyClaimed}
        onRestart={handleRestart}
        onExit={() => router.push("/")}/>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a0a]" style={{ height: "100dvh" }}>
      {session && (
        <div className="fixed top-0 left-0 right-0" style={{ zIndex: 40 }}>
          <HUD
            gameTitle={game.title}
            total={game.posts.length}
            completed={completedIds.size}
            keys={session.keys}
            signalLevel={signalLevel}
            seniorMode={seniorMode}
            soundEnabled={soundEnabled}
            gameTimeLeft={gameTimeLeft}
            elapsedSec={elapsedSec}
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onToggleSound={() => setSoundEnabled((v) => !v)}
            onExit={handleExit}
          />
        </div>
      )}

      <div className="fixed left-0 right-0" style={{ top: session ? HUD_HEIGHT : 0, bottom: 0, zIndex: 10 }}>
        {game.map_url && (
          <ExploreMap
            mapUrl={game.map_url}
            posts={game.posts}
            completedIds={completedIds}
            nearbyIds={nearbyIds}
            signalLevel={signalLevel}
            seniorMode={seniorMode}
            zoom={zoom}
            characterId={characterId}
            compassAssist={game.compass_assist}
            obstacleType={game.obstacle_type ?? "none"}
            obstacleLevel={game.obstacle_level ?? "easy"}
            pauseObstacle={phase !== "exploring"}
            getPauseRef={(ref) => { exploremapPauseRef.current = ref; }}
            onObstacleHit={handleObstacleHit}
            onCursorMove={handleCursorMove}
            onPostClick={handlePostClick}
          />
        )}
      </div>

      {/* 퀴즈 팝업 */}
      {phase === "mission" && activePost && quizState && (
        <MissionPopup
          post={activePost} quizState={quizState} seniorMode={seniorMode}
            quizIndex={quizIndex} totalQuizzes={activePost?.quizzes?.length ?? 1}
          sessionId={session?.id ?? null}
          gameId={game?.id ?? null}
          onAnswer={handleAnswer}
          onUseHint={() => setQuizState((q) => q ? { ...q, hintsUsed: (q.hintsUsed ?? 0) + 1 } : null)}
          onClose={handleSkip} onSkip={handleSkip}
        />
      )}

      {/* ★ 인증샷 팝업 */}
      {phase === "photo" && activePost && (
        <PhotoMissionPopup
          post={activePost}
          seniorMode={seniorMode}
          onComplete={() => {
            pauseBubbleRef.current = false;
            setObstaclePaused(true);
            setActivePost(null);
            setPhase("exploring");
            if (soundEnabled) playCorrectSound();
            setConfettiActive(true);
            setResultOverlay("correct");
            const px = Number(activePost.coord_x) ?? 50;
            const py = Number(activePost.coord_y) ?? 50;
            setTimeout(() => setKeyFly({ active: true, x: px, y: py }), 300);
            const g = gameRef.current;
            const completed = completedIdsRef.current;
            const isLast = g ? (completed.size + 1 >= g.posts.length) : false;
            const delay = isLast ? 1500 : 5600;
            setTimeout(() => {
              setConfettiActive(false);
              setKeyFly((k) => ({ ...k, active: false }));
              setObstaclePaused(false);
              handlePostComplete(activePost, 0);
            }, delay);
          }}
          onSkip={() => { pauseBubbleRef.current = false; setActivePost(null); setPhase("exploring"); }}
        />
      )}

      {/* ★ 퍼즐 팝업 */}
      {phase === "puzzle" && activePost && (() => {
        const puzzle = activePost.post_puzzles?.[0];
        if (!puzzle) return null;
        return (
          <PuzzlePopup
            postName={activePost.name}
            puzzle={puzzle}
            seniorMode={seniorMode}
            onComplete={handlePuzzleComplete}
            onSkip={handlePuzzleSkip}
          />
        );
      })()}

      <ResultOverlay result={resultOverlay} postName="" seniorMode={seniorMode}
        onDismiss={() => setResultOverlay(null)}/>

      <ConfettiCanvas active={confettiActive} originX={50} originY={45}/>

      <KeyFlyAnimation active={keyFly.active} fromX={keyFly.x} fromY={keyFly.y}
        onComplete={() => setKeyFly((k) => ({ ...k, active: false }))}/>

      {gameTimeLeft !== null && gameTimeLeft <= 10 && gameTimeLeft > 0 && phase === "exploring" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40
          rounded-2xl border border-[#c0504a]/50 bg-[#1a0a0a]/90
          px-6 py-3 text-center backdrop-blur-sm animate-pulse">
          <p className={`font-bold text-[#e07070] ${seniorMode ? "text-2xl" : "text-lg"}`}>
            ⌛ {gameTimeLeft}초 후 리셋됩니다!
          </p>
        </div>
      )}
    </div>
  );
}

function checkAnswer(userAnswer: string, correctAnswer: string, type: string): boolean {
  switch (type) {
    case "short_answer":  return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    case "ox":            return userAnswer === correctAnswer;
    case "single_choice": return userAnswer === correctAnswer;
    case "multi_choice":
      return userAnswer.split(",").sort().join(",") === correctAnswer.split(",").sort().join(",");
    default: return false;
  }
}
