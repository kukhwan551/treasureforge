"use client";
// components/video/VideoMissionPopup.tsx

import { useState, useRef, useEffect } from "react";

interface Props {
  postName: string;
  videoUrl: string;
  requiredSec?: number;
  seniorMode: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

type UrlType = "youtube" | "vimeo" | "direct" | "tiktok" | "webpage";

function getEmbedInfo(url: string): { type: UrlType; embedUrl: string } {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return {
    type: "youtube",
    embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1&enablejsapi=1`,
  };
  const vmMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vmMatch) return { type: "vimeo", embedUrl: `https://player.vimeo.com/video/${vmMatch[1]}` };
  if (url.match(/\.(mp4|webm|ogg|mov)(\?|$)/i)) return { type: "direct", embedUrl: url };
  if (url.includes("tiktok.com")) return { type: "tiktok", embedUrl: url };
  return { type: "webpage", embedUrl: url };
}

export default function VideoMissionPopup({ postName, videoUrl, requiredSec = 30, seniorMode, onComplete, onSkip }: Props) {
  const [watched, setWatched]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying]   = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const videoRef   = useRef<HTMLVideoElement>(null);
  const iframeRef  = useRef<HTMLIFrameElement>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval>|null>(null);
  const progressRef = useRef(0);
  const watchedRef  = useRef(false);

  const ts = seniorMode ? "text-xl"  : "text-base";
  const th = seniorMode ? "text-2xl" : "text-xl";

  const { type, embedUrl } = getEmbedInfo(videoUrl);

  // YouTube postMessage로 재생 감지
  useEffect(() => {
    if (type !== "youtube") return;

    function onMessage(e: MessageEvent) {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        // YouTube Player State: 1 = playing, 2 = paused, 0 = ended
        if (data?.event === "infoDelivery" && data?.info?.playerState !== undefined) {
          const state = data.info.playerState;
          if (state === 1) startTimer();   // 재생 시작
          else if (state === 2 || state === 0) pauseTimer(); // 일시정지/종료
        }
        // 구형 YouTube API
        if (data?.info?.playerState === 1) startTimer();
        else if (data?.info?.playerState === 2) pauseTimer();
      } catch {}
    }

    window.addEventListener("message", onMessage);

    // YouTube API 활성화 요청
    const t = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "listening" }), "*"
      );
    }, 1000);

    return () => { window.removeEventListener("message", onMessage); clearTimeout(t); };
  }, [type]); // eslint-disable-line

  // Vimeo postMessage로 재생 감지
  useEffect(() => {
    if (type !== "vimeo") return;
    function onMessage(e: MessageEvent) {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.event === "play") startTimer();
        else if (data?.event === "pause" || data?.event === "ended") pauseTimer();
      } catch {}
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [type]); // eslint-disable-line

  function startTimer() {
    if (watchedRef.current) return;
    setPlaying(true);
    if (timerRef.current) return; // 이미 실행 중
    timerRef.current = setInterval(() => {
      progressRef.current++;
      setProgress(progressRef.current);
      if (progressRef.current >= requiredSec) {
        watchedRef.current = true;
        setWatched(true);
        clearInterval(timerRef.current!);
        timerRef.current = null;
      }
    }, 1000);
  }

  function pauseTimer() {
    setPlaying(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // 직접 동영상 진행도
  useEffect(() => {
    const vid = videoRef.current; if (!vid) return;
    function onPlay()  { startTimer(); }
    function onPause() { pauseTimer(); }
    function onTimeUpdate() {
      if (!vid) return;
      setProgress(vid.currentTime);
      if (vid.duration > 0 && vid.currentTime / vid.duration >= 0.95) {
        watchedRef.current = true; setWatched(true);
      }
    }
    vid.addEventListener("play", onPlay);
    vid.addEventListener("pause", onPause);
    vid.addEventListener("timeupdate", onTimeUpdate);
    return () => { vid.removeEventListener("play", onPlay); vid.removeEventListener("pause", onPause); vid.removeEventListener("timeupdate", onTimeUpdate); };
  }, []); // eslint-disable-line

  function handleOpenNewTab() {
    window.open(videoUrl, "_blank");
    startTimer();
  }

  const pct = requiredSec > 0 ? Math.min((progress / requiredSec) * 100, 100) : 0;
  const remaining = Math.max(0, requiredSec - Math.round(progress));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0f0f10]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2924]">
        <div>
          <p className={`font-bold text-[#e8e4d9] ${th}`}>🎬 영상 시청 미션</p>
          <p className={`text-[#7a756c] ${seniorMode?"text-base":"text-sm"}`}>📍 {postName}</p>
        </div>
        <button onClick={onSkip} className={`text-[#4a4840] hover:text-[#7a756c] ${seniorMode?"text-base":"text-xs"}`}>나중에 하기</button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 space-y-4 overflow-hidden">
        <div className="w-full max-w-lg rounded-xl overflow-hidden border border-[#2a2924] bg-black"
          style={{ aspectRatio: type==="webpage"?"4/3":"16/9", maxHeight:"55vh" }}>

          {/* YouTube */}
          {type === "youtube" && (
            <iframe ref={iframeRef} src={embedUrl} className="w-full h-full"
              allow="autoplay; fullscreen" allowFullScreen/>
          )}

          {/* Vimeo */}
          {type === "vimeo" && (
            <iframe ref={iframeRef} src={embedUrl} className="w-full h-full"
              allow="autoplay; fullscreen" allowFullScreen/>
          )}

          {/* 직접 파일 */}
          {type === "direct" && (
            <video ref={videoRef} src={embedUrl} controls autoPlay playsInline
              className="w-full h-full object-contain"/>
          )}

          {/* 틱톡 */}
          {type === "tiktok" && (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-4 bg-[#0a0a0f]">
              <div className="text-5xl">🎵</div>
              <p className={`text-[#e8e4d9] font-bold ${ts}`}>틱톡 영상</p>
              <p className={`text-[#5a5650] text-center ${seniorMode?"text-base":"text-xs"} px-4`}>아래 버튼을 눌러 시청 후 돌아오세요.</p>
              <button onClick={handleOpenNewTab}
                className={`rounded-xl bg-[#b89a5a] font-bold text-[#0f0f10] px-6 ${seniorMode?"py-4 text-xl":"py-3 text-base"}`}>
                🎵 틱톡에서 보기
              </button>
            </div>
          )}

          {/* 웹페이지 */}
          {type === "webpage" && !iframeError && (
            <iframe src={embedUrl} className="w-full h-full" onError={() => setIframeError(true)}/>
          )}
          {type === "webpage" && iframeError && (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-4 bg-[#0a0a0f]">
              <div className="text-5xl">🌐</div>
              <p className={`text-[#e8e4d9] font-bold ${ts}`}>외부 페이지</p>
              <button onClick={handleOpenNewTab}
                className={`rounded-xl bg-[#b89a5a] font-bold text-[#0f0f10] px-6 ${seniorMode?"py-4 text-xl":"py-3 text-base"}`}>
                🌐 페이지 열기
              </button>
            </div>
          )}
        </div>

        {/* 안내 메시지 (YouTube/Vimeo - 재생 전) */}
        {(type === "youtube" || type === "vimeo") && !playing && !watched && (
          <p className={`text-center text-[#7a756c] ${seniorMode?"text-base":"text-xs"}`}>
            ▶ 영상을 탭하여 재생하면 타이머가 시작됩니다
          </p>
        )}

        {/* 진행바 */}
        {type !== "direct" && (playing || progress > 0) && (
          <div className="w-full max-w-lg space-y-1">
            <div className="flex justify-between">
              <p className={`text-[#7a756c] ${seniorMode?"text-base":"text-xs"}`}>
                {playing ? "⏱ 시청 중..." : "⏸ 일시정지"}
              </p>
              <p className={`text-[#b89a5a] font-bold ${seniorMode?"text-base":"text-xs"}`}>
                {watched ? "✅ 시청 완료!" : `${Math.round(pct)}%`}
              </p>
            </div>
            <div className="h-2 bg-[#2a2924] rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${playing?"bg-[#b89a5a]":"bg-[#5a5650]"}`}
                style={{ width:`${pct}%` }}/>
            </div>
            {!watched && (
              <p className={`text-center text-[#5a5650] ${seniorMode?"text-base":"text-xs"}`}>
                {remaining}초 더 시청하면 완료!
              </p>
            )}
          </div>
        )}

        {type === "direct" && !watched && (
          <p className={`text-center text-[#5a5650] ${seniorMode?"text-base":"text-xs"}`}>영상을 끝까지 시청하면 미션 완료!</p>
        )}

        {watched && (
          <button onClick={onComplete}
            className={`w-full max-w-lg rounded-xl bg-[#b89a5a] font-bold text-[#0f0f10]
              hover:bg-[#c9aa6a] transition-colors animate-in fade-in duration-500
              ${seniorMode?"py-5 text-xl":"py-3 text-base"}`}>
            🗝 열쇠 획득!
          </button>
        )}

        {(type === "tiktok" || (type === "webpage" && iframeError)) && progress > 0 && !watched && (
          <button onClick={handleOpenNewTab}
            className={`w-full max-w-lg rounded-xl border border-[#2a2924] text-[#7a756c] ${seniorMode?"py-4 text-lg":"py-2.5 text-sm"}`}>
            다시 열기 →
          </button>
        )}
      </div>
    </div>
  );
}
