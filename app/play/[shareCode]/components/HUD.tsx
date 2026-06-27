"use client";

// app/play/[shareCode]/components/HUD.tsx
// 모바일 대응: 좁은 화면에서 정보 압축

import type { SignalLevel } from "@/types/explore";

interface HUDProps {
  gameTitle: string;
  total: number;
  completed: number;
  keys: number;
  signalLevel: SignalLevel;
  seniorMode: boolean;
  soundEnabled: boolean;
  gameTimeLeft: number | null;
  elapsedSec: number;
  zoom: number;
  nickname?: string;
  score?: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleSound: () => void;
  onExit: () => void;
}

const SIGNAL_BAR_COLOR: Record<SignalLevel, string> = {
  0: "bg-[#2a2924]", 1: "bg-[#4a6a4a]", 2: "bg-[#7a9a3a]",
  3: "bg-[#b89a5a]", 4: "bg-[#4a9d6f]",
};

function fmtTime(sec: number) {
  const m = Math.floor(Math.abs(sec) / 60).toString().padStart(2, "0");
  const s = (Math.abs(sec) % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const HUD_HEIGHT = 72;
export { HUD_HEIGHT };

export default function HUD({
  gameTitle, total, completed, keys, signalLevel,
  seniorMode, soundEnabled,
  gameTimeLeft, elapsedSec,
  zoom, nickname, score,
  onZoomIn, onZoomOut,
  onToggleSound, onExit,
}: HUDProps) {
  const progress     = total > 0 ? Math.round((completed / total) * 100) : 0;
  const hasTimeLimit = gameTimeLeft !== null;
  const timeWarning  = hasTimeLimit && gameTimeLeft !== null && gameTimeLeft <= 30;
  const timeCritical = hasTimeLimit && gameTimeLeft !== null && gameTimeLeft <= 10;

  return (
    <div
      className="w-full bg-[#0f0f10] border-b border-[#2a2924] flex-shrink-0"
      style={{ height: HUD_HEIGHT, minHeight: HUD_HEIGHT, maxHeight: HUD_HEIGHT }}
    >
      <div className="h-full flex flex-col justify-between px-2 sm:px-3">

        {/* 메인 행 */}
        <div className="flex items-center gap-1.5 sm:gap-2 pt-1.5">

          {/* 게임 제목 — 모바일에서 짧게 */}
          <span className={`font-semibold text-[#e8e4d9] truncate flex-1 min-w-0
            ${seniorMode ? "text-sm" : "text-[11px] sm:text-xs"}`}>
            {gameTitle}
          </span>

          {/* 스탯 그룹 */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">

            {/* 🗝 열쇠 */}
            <div className="flex items-center gap-0.5 sm:gap-1 rounded-md border
              border-[#b89a5a]/30 bg-[#b89a5a]/10 px-1.5 sm:px-2 py-0.5">
              <span className="text-xs sm:text-sm">🗝</span>
              <span className={`font-bold text-[#b89a5a] tabular-nums
                ${seniorMode ? "text-sm" : "text-[11px] sm:text-xs"}`}>
                {keys}/{total}
              </span>
            </div>

            {/* ⏱ 시간 */}
            <div className={`flex items-center gap-0.5 rounded-md border px-1.5 sm:px-2 py-0.5
              ${timeCritical
                ? "border-[#c0504a]/40 bg-[#c0504a]/15"
                : timeWarning
                ? "border-[#c07040]/30 bg-[#c07040]/10"
                : "border-[#2a2924] bg-[#18181a]"
              }`}>
              <span className="text-[10px] sm:text-xs">
                {hasTimeLimit ? (timeCritical ? "⌛" : "⏳") : "🕐"}
              </span>
              <span className={`font-mono font-bold tabular-nums
                ${seniorMode ? "text-sm" : "text-[11px] sm:text-xs"}
                ${timeCritical
                  ? "text-[#e07070] animate-pulse"
                  : timeWarning ? "text-[#c0804a]"
                  : hasTimeLimit ? "text-[#e8e4d9]" : "text-[#5a5650]"
                }`}>
                {hasTimeLimit ? fmtTime(gameTimeLeft ?? 0) : fmtTime(elapsedSec)}
              </span>
            </div>

            {/* 신호 바 — 모바일에서도 표시 */}
            <div className="hidden xs:flex items-end gap-0.5 border border-[#2a2924]
              bg-[#18181a] rounded-md px-1.5 sm:px-2 py-0.5">
              {([1, 2, 3, 4] as SignalLevel[]).map((lv) => (
                <div key={lv}
                  className={`rounded-sm transition-all duration-200
                    ${signalLevel >= lv ? SIGNAL_BAR_COLOR[signalLevel] : "bg-[#2a2924]"}`}
                  style={{ width: 3, height: 3 + lv * 2.5 }}
                />
              ))}
            </div>

            {/* 신호 이모지 — 모바일 전용 (바 대신) */}
            <span className="flex xs:hidden text-base leading-none">
              {signalLevel === 0 ? "📡" :
               signalLevel === 1 ? "🟡" :
               signalLevel === 2 ? "🟠" :
               signalLevel === 3 ? "🔴" : "✨"}
            </span>

            {/* 🔍 확대/축소 */}
            <div className="flex items-center gap-0.5 rounded-md border border-[#2a2924]
              bg-[#18181a] px-0.5 py-0.5">
              <button onClick={onZoomOut} title="축소"
                className="rounded-sm p-1 text-[#7a756c] hover:text-[#9a9590]
                  active:scale-90 transition-all min-w-[24px] min-h-[24px]
                  flex items-center justify-center disabled:opacity-30"
                disabled={zoom <= 1.0}>
                <MinusIcon/>
              </button>
              <span className="text-[10px] font-mono text-[#7a756c] w-7 text-center
                tabular-nums select-none">
                {zoom.toFixed(2).replace(/0$/, "")}x
              </span>
              <button onClick={onZoomIn} title="확대"
                className="rounded-sm p-1 text-[#7a756c] hover:text-[#9a9590]
                  active:scale-90 transition-all min-w-[24px] min-h-[24px]
                  flex items-center justify-center disabled:opacity-30"
                disabled={zoom >= 2.5}>
                <PlusIcon/>
              </button>
            </div>

            {/* 소리 */}
            <button onClick={onToggleSound}
              title={soundEnabled ? "소리 끄기" : "소리 켜기"}
              className="rounded-md border border-[#2a2924] p-1 sm:p-1 text-[#5a5650]
                hover:text-[#9a9590] active:scale-95 transition-all
                min-w-[28px] min-h-[28px] flex items-center justify-center">
              {soundEnabled ? <SoundOnIcon/> : <SoundOffIcon/>}
            </button>

            {/* 나가기 */}
            <button onClick={onExit} title="나가기"
              className="rounded-md border border-[#3a2424] p-1 text-[#5a4040]
                hover:border-[#c0504a]/40 hover:text-[#e07070] active:scale-95
                transition-all min-w-[28px] min-h-[28px] flex items-center justify-center">
              <ExitIcon/>
            </button>
          </div>
        </div>

        {/* 닉네임 + 포인트 */}
        {nickname && (
          <div className="flex items-center gap-2 px-0.5 pb-0.5">
            <span className="text-[10px] text-[#5a5650] truncate flex-1 min-w-0">
              👤 {nickname}
            </span>
            <span className="text-[10px] font-bold text-[#b89a5a] tabular-nums shrink-0">
              🏅 {(score ?? 0)}pt
            </span>
          </div>
        )}

        {/* 진행률 바 */}
        <div className="w-full h-1 bg-[#2a2924] rounded-full overflow-hidden mb-1.5">
          <div className="h-full rounded-full bg-[#b89a5a] transition-all duration-700"
            style={{ width: `${progress}%` }}/>
        </div>

      </div>
    </div>
  );
}

function MinusIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>;
}

function PlusIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>;
}

function SoundOnIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>;
}

function SoundOffIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <line x1="23" y1="9" x2="17" y2="15"/>
    <line x1="17" y1="9" x2="23" y2="15"/>
  </svg>;
}

function ExitIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>;
}
