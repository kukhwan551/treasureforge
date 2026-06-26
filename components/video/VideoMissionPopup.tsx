"use client";
// components/video/VideoMissionPopup.tsx

import { useState, useRef, useEffect } from "react";

interface Props {
  postName: string;
  videoUrl: string;
  seniorMode: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

type UrlType = "youtube" | "vimeo" | "direct" | "tiktok" | "webpage";

function getEmbedInfo(url: string): { type: UrlType; embedUrl: string; requiredSec: number } {
  // YouTube (일반, Shorts, 단축)
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1`, requiredSec: 30 };

  // Vimeo
  const vmMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vmMatch) return { type: "vimeo", embedUrl: `https://player.vimeo.com/video/${vmMatch[1]}?autoplay=1`, requiredSec: 30 };

  // 직접 동영상 파일
  if (url.match(/\.(mp4|webm|ogg|mov)(\?|$)/i)) return { type: "direct", embedUrl: url, requiredSec: 0 };

  // 틱톡
  if (url.includes("tiktok.com")) return { type: "tiktok", embedUrl: url, requiredSec: 30 };

  // 일반 웹페이지
  return { type: "webpage", embedUrl: url, requiredSec: 30 };
}

export default function VideoMissionPopup({ postName, videoUrl, seniorMode, onComplete, onSkip }: Props) {
  const [watched, setWatched]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [started, setStarted]   = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const ts = seniorMode ? "text-xl"  : "text-base";
  const th = seniorMode ? "text-2xl" : "text-xl";

  const { type, embedUrl, requiredSec } = getEmbedInfo(videoUrl);
  const isEmbed = type === "youtube" || type === "vimeo" || (type === "webpage" && !iframeError);
  const isTimer = type === "youtube" || type === "vimeo" || type === "tiktok" || type === "webpage";

  // 직접 영상 진행도
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    function onTimeUpdate() {
      if (!vid) return;
      setProgress(vid.currentTime);
      if (vid.duration > 0 && vid.currentTime / vid.duration >= 0.95) setWatched(true);
    }
    vid.addEventListener("timeupdate", onTimeUpdate);
    return () => vid.removeEventListener("timeupdate", onTimeUpdate);
  }, []);

  // 타이머 기반 시청 완료
  useEffect(() => {
    if (!isTimer || !started || requiredSec === 0) return;
    let elapsed = 0;
    timerRef.current = setInterval(() => {
      elapsed++;
      setProgress(Math.min(elapsed, requiredSec));
      if (elapsed >= requiredSec) {
        setWatched(true);
        clearInterval(timerRef.current!);
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimer, started, requiredSec]);

  function handleOpenNewTab() {
    window.open(videoUrl, "_blank");
    setStarted(true);
  }

  const pct = requiredSec > 0 ? Math.min((progress / requiredSec) * 100, 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0f0f10]">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2924]">
        <div>
          <p className={`font-bold text-[#e8e4d9] ${th}`}>🎬 영상 시청 미션</p>
          <p className={`text-[#7a756c] ${seniorMode?"text-base":"text-sm"}`}>📍 {postName}</p>
        </div>
        <button onClick={onSkip} className={`text-[#4a4840] hover:text-[#7a756c] ${seniorMode?"text-base":"text-xs"}`}>
          나중에 하기
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 space-y-4 overflow-hidden">

        {/* 영상 영역 */}
        <div className="w-full max-w-lg rounded-xl overflow-hidden border border-[#2a2924] bg-black"
          style={{ aspectRatio: type === "webpage" ? "4/3" : "16/9", maxHeight: "55vh" }}>

          {/* YouTube / Vimeo / 일반 웹페이지 iframe */}
          {(type === "youtube" || type === "vimeo" || (type === "webpage" && !iframeError)) && (
            !started ? (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-3 bg-[#0a0a0f] cursor-pointer"
                onClick={() => setStarted(true)}>
                <div className="text-5xl">{type === "webpage" ? "🌐" : "▶️"}</div>
                <p className={`text-[#b89a5a] ${ts}`}>탭하여 {type === "webpage" ? "페이지 열기" : "영상 시작"}</p>
                <p className={`text-[#5a5650] ${seniorMode?"text-base":"text-xs"}`}>
                  {requiredSec}초 이상 {type === "webpage" ? "방문" : "시청"}하면 미션 완료!
                </p>
              </div>
            ) : (
              <iframe src={embedUrl} className="w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
                onError={() => setIframeError(true)}
              />
            )
          )}

          {/* 직접 동영상 파일 */}
          {type === "direct" && (
            <video ref={videoRef} src={embedUrl} controls autoPlay
              className="w-full h-full object-contain"
              onPlay={() => setStarted(true)}
            />
          )}

          {/* 틱톡 - 새 탭 열기 */}
          {type === "tiktok" && (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-4 bg-[#0a0a0f]">
              <div className="text-5xl">🎵</div>
              <p className={`text-[#e8e4d9] font-bold ${ts}`}>틱톡 영상</p>
              <p className={`text-[#5a5650] text-center ${seniorMode?"text-base":"text-xs"} px-4`}>
                틱톡은 앱에서 재생됩니다. 아래 버튼을 눌러 시청 후 돌아오세요.
              </p>
              <button onClick={handleOpenNewTab}
                className={`rounded-xl bg-[#b89a5a] font-bold text-[#0f0f10] px-6 ${seniorMode?"py-4 text-xl":"py-3 text-base"}`}>
                🎵 틱톡에서 보기
              </button>
            </div>
          )}

          {/* iframe 오류 시 대체 */}
          {type === "webpage" && iframeError && (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-4 bg-[#0a0a0f]">
              <div className="text-5xl">🌐</div>
              <p className={`text-[#e8e4d9] font-bold ${ts}`}>외부 페이지</p>
              <p className={`text-[#5a5650] text-center ${seniorMode?"text-base":"text-xs"} px-4`}>
                이 페이지는 직접 열어야 합니다. 아래 버튼을 눌러 방문 후 돌아오세요.
              </p>
              <button onClick={handleOpenNewTab}
                className={`rounded-xl bg-[#b89a5a] font-bold text-[#0f0f10] px-6 ${seniorMode?"py-4 text-xl":"py-3 text-base"}`}>
                🌐 페이지 열기
              </button>
            </div>
          )}
        </div>

        {/* 진행바 (타이머 기반) */}
        {isTimer && started && (
          <div className="w-full max-w-lg space-y-1">
            <div className="flex justify-between">
              <p className={`text-[#7a756c] ${seniorMode?"text-base":"text-xs"}`}>시청 시간</p>
              <p className={`text-[#b89a5a] font-bold ${seniorMode?"text-base":"text-xs"}`}>
                {watched ? "✅ 완료!" : `${Math.round(pct)}% (${Math.round(progress)}/${requiredSec}초)`}
              </p>
            </div>
            <div className="h-2 bg-[#2a2924] rounded-full overflow-hidden">
              <div className="h-full bg-[#b89a5a] rounded-full transition-all duration-1000"
                style={{ width: `${pct}%` }}/>
            </div>
            {!watched && (
              <p className={`text-center text-[#5a5650] ${seniorMode?"text-base":"text-xs"}`}>
                {requiredSec - Math.round(progress)}초 더 {type === "webpage" ? "방문" : "시청"}하면 완료!
              </p>
            )}
          </div>
        )}

        {/* 직접 영상 안내 */}
        {type === "direct" && !watched && (
          <p className={`text-center text-[#5a5650] ${seniorMode?"text-base":"text-xs"}`}>
            영상을 끝까지 시청하면 미션 완료!
          </p>
        )}

        {/* 완료 버튼 */}
        {watched && (
          <button onClick={onComplete}
            className={`w-full max-w-lg rounded-xl bg-[#b89a5a] font-bold text-[#0f0f10]
              hover:bg-[#c9aa6a] transition-colors animate-in fade-in duration-500
              ${seniorMode?"py-5 text-xl":"py-3 text-base"}`}>
            🗝 열쇠 획득!
          </button>
        )}

        {/* 새 탭 추가 버튼 (웹페이지/틱톡 - 시작 후) */}
        {(type === "tiktok" || (type === "webpage" && iframeError)) && started && !watched && (
          <button onClick={handleOpenNewTab}
            className={`w-full max-w-lg rounded-xl border border-[#2a2924] text-[#7a756c]
              hover:border-[#3a3830] transition-colors ${seniorMode?"py-4 text-lg":"py-2.5 text-sm"}`}>
            다시 열기 →
          </button>
        )}
      </div>
    </div>
  );
}
