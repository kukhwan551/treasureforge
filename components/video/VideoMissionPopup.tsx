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

function getEmbedUrl(url: string): { type: "youtube"|"vimeo"|"direct"|"unknown"; embedUrl: string } {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1` };
  }
  // Vimeo
  const vmMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vmMatch) {
    return { type: "vimeo", embedUrl: `https://player.vimeo.com/video/${vmMatch[1]}?autoplay=1` };
  }
  // 직접 동영상 파일 (mp4 등)
  if (url.match(/\.(mp4|webm|ogg|mov)(\?|$)/i)) {
    return { type: "direct", embedUrl: url };
  }
  return { type: "unknown", embedUrl: url };
}

export default function VideoMissionPopup({ postName, videoUrl, seniorMode, onComplete, onSkip }: Props) {
  const [watched, setWatched]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [started, setStarted]   = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const ts = seniorMode ? "text-xl"  : "text-base";
  const th = seniorMode ? "text-2xl" : "text-xl";

  const { type, embedUrl } = getEmbedUrl(videoUrl);
  const isEmbed = type === "youtube" || type === "vimeo";

  // 직접 영상일 때 진행도 추적
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    function onTimeUpdate() {
      if (!vid) return;
      setProgress(vid.currentTime);
      setDuration(vid.duration || 0);
      // 95% 이상 시청 시 완료
      if (vid.duration > 0 && vid.currentTime / vid.duration >= 0.95) {
        setWatched(true);
      }
    }
    vid.addEventListener("timeupdate", onTimeUpdate);
    return () => vid.removeEventListener("timeupdate", onTimeUpdate);
  }, []);

  // YouTube/Vimeo embed일 때 타이머로 시청 완료 체크 (30초 기준)
  useEffect(() => {
    if (!isEmbed || !started) return;
    let elapsed = 0;
    const REQUIRED = 30; // 30초 시청 시 완료
    timerRef.current = setInterval(() => {
      elapsed++;
      setProgress(Math.min(elapsed, REQUIRED));
      setDuration(REQUIRED);
      if (elapsed >= REQUIRED) {
        setWatched(true);
        clearInterval(timerRef.current!);
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isEmbed, started]);

  const pct = duration > 0 ? Math.min((progress / duration) * 100, 100) : 0;

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

      {/* 영상 */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 space-y-4">
        <div className="w-full max-w-lg rounded-xl overflow-hidden border border-[#2a2924] bg-black"
          style={{ aspectRatio: "16/9" }}>
          {isEmbed ? (
            !started ? (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-4 bg-[#0a0a0f]"
                onClick={() => setStarted(true)}>
                <div className="text-6xl">▶️</div>
                <p className={`text-[#b89a5a] ${ts}`}>탭하여 영상 시작</p>
                <p className={`text-[#5a5650] ${seniorMode?"text-base":"text-xs"}`}>
                  30초 이상 시청하면 미션 완료!
                </p>
              </div>
            ) : (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            )
          ) : type === "direct" ? (
            <video ref={videoRef} src={embedUrl} controls autoPlay
              className="w-full h-full object-contain"
              onPlay={() => setStarted(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className={`text-[#e07070] ${ts}`}>영상을 불러올 수 없습니다.</p>
            </div>
          )}
        </div>

        {/* 진행바 */}
        <div className="w-full max-w-lg space-y-1">
          <div className="flex justify-between">
            <p className={`text-[#7a756c] ${seniorMode?"text-base":"text-xs"}`}>
              {isEmbed ? "시청 시간" : "재생 진행도"}
            </p>
            <p className={`text-[#b89a5a] font-bold ${seniorMode?"text-base":"text-xs"}`}>
              {watched ? "✅ 시청 완료!" : `${Math.round(pct)}%`}
            </p>
          </div>
          <div className="h-2 bg-[#2a2924] rounded-full overflow-hidden">
            <div className="h-full bg-[#b89a5a] rounded-full transition-all duration-1000"
              style={{ width: `${pct}%` }}/>
          </div>
          {isEmbed && !watched && started && (
            <p className={`text-center text-[#5a5650] ${seniorMode?"text-base":"text-xs"}`}>
              {Math.round(duration - progress)}초 더 시청하면 완료!
            </p>
          )}
          {!started && isEmbed && (
            <p className={`text-center text-[#5a5650] ${seniorMode?"text-base":"text-xs"}`}>
              영상을 탭하여 시작하세요
            </p>
          )}
        </div>

        {/* 완료 버튼 */}
        {watched && (
          <button onClick={onComplete}
            className={`w-full max-w-lg rounded-xl bg-[#b89a5a] font-bold text-[#0f0f10]
              hover:bg-[#c9aa6a] transition-colors animate-in fade-in duration-500
              ${seniorMode?"py-5 text-xl":"py-3 text-base"}`}>
            🗝 열쇠 획득!
          </button>
        )}
      </div>
    </div>
  );
}
