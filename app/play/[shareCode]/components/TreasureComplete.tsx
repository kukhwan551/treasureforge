"use client";

// app/play/[shareCode]/components/TreasureComplete.tsx
// 전체 완료 — 보물상자 등장 + 보상 표시

import { useEffect, useState } from "react";
import type { PublicGame, PlayerSession } from "@/types/explore";
import { playTreasureSound } from "@/lib/signalEngine";

interface TreasureCompleteProps {
  game: PublicGame;
  session: PlayerSession;
  seniorMode: boolean;
  soundEnabled: boolean;
  onRestart: () => void;
  onExit: () => void;
}

export default function TreasureComplete({
  game, session, seniorMode, soundEnabled,
  onRestart, onExit,
}: TreasureCompleteProps) {
  const [phase, setPhase] = useState<"chest" | "open" | "reward">("chest");
  const ts  = seniorMode ? "text-xl"  : "text-base";
  const th  = seniorMode ? "text-3xl" : "text-2xl";
  const btnH = seniorMode ? "py-5"    : "py-3";

  useEffect(() => {
    // 보물상자 등장 → 열림 → 보상
    if (soundEnabled) playTreasureSound();

    const t1 = setTimeout(() => setPhase("open"),   1000);
    const t2 = setTimeout(() => setPhase("reward"),  2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []); // eslint-disable-line

  const elapsed = session.finished_at && session.started_at
    ? Math.floor(
        (new Date(session.finished_at).getTime() -
         new Date(session.started_at).getTime()) / 1000
      )
    : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center
      bg-[#0f0f10] px-4">

      {/* 별 배경 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute animate-ping"
            style={{
              left:  `${Math.random() * 100}%`,
              top:   `${Math.random() * 100}%`,
              width:  Math.random() * 6 + 2,
              height: Math.random() * 6 + 2,
              borderRadius: "50%",
              background: "#b89a5a",
              animationDuration: `${Math.random() * 2 + 1}s`,
              animationDelay: `${Math.random() * 1}s`,
              opacity: 0.6,
            }}
          />
        ))}
      </div>

      {/* 보물상자 */}
      <div className={`relative transition-all duration-700
        ${phase === "chest" ? "scale-75 opacity-60" : "scale-100 opacity-100"}`}>
        <div className={`text-center ${phase === "open" ? "animate-bounce" : ""}`}>
          <span style={{ fontSize: seniorMode ? 120 : 80 }}>
            {phase === "chest" ? "📦" : "🎁"}
          </span>
        </div>
      </div>

      {/* 보상 내용 */}
      {phase === "reward" && (
        <div className="mt-6 w-full max-w-md animate-in fade-in slide-in-from-bottom-4
          duration-500 space-y-4 text-center">

          <h1 className={`font-bold text-[#b89a5a] ${th}`}>
            🎉 보물을 발견했습니다!
          </h1>

          <p className={`text-[#7a756c] ${ts}`}>
            {session.nickname} 탐험가, 수고하셨습니다!
          </p>

          {/* 보상 메시지 */}
          {game.reward_message && (
            <div className="rounded-2xl border border-[#b89a5a]/30
              bg-[#b89a5a]/10 px-6 py-5">
              <div className="mb-2 flex items-center justify-center gap-1.5">
                <span className="text-lg">
                  {game.reward_type === "coupon" ? "🎫" :
                   game.reward_type === "certificate" ? "🏆" : "💌"}
                </span>
                <span className="text-[11px] font-medium tracking-wide
                  uppercase text-[#b89a5a]">
                  {game.reward_type === "coupon" ? "쿠폰" :
                   game.reward_type === "certificate" ? "인증서" : "메시지"}
                </span>
              </div>
              <p className={`text-[#e8e4d9] leading-relaxed whitespace-pre-wrap
                ${seniorMode ? "text-xl" : "text-base"}`}>
                {game.reward_message}
              </p>
            </div>
          )}

          <p className="text-[13px] text-[#7a756c]">
            🎒 이 보상은 "내 보물함"에서 언제든 다시 확인할 수 있어요.
          </p>

          {/* 점수 / 통계 */}
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <StatItem label="획득 열쇠" value={`🗝 ${session.keys}개`} seniorMode={seniorMode} />
            <StatItem label="획득 점수" value={`🏅 ${session.score}점`} seniorMode={seniorMode} />
            {elapsed !== null && (
              <StatItem
                label="소요 시간"
                value={`⏱ ${Math.floor(elapsed / 60)}분 ${elapsed % 60}초`}
                seniorMode={seniorMode}
              />
            )}
          </div>

          {/* 버튼 */}
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={onRestart}
              className={`w-full rounded-xl border border-[#2a2924] font-medium
                text-[#7a756c] hover:border-[#3a3830] transition-colors
                ${btnH} ${ts}`}
            >
              다시 탐험하기
            </button>
            <button
              onClick={onExit}
              className={`w-full rounded-xl bg-[#b89a5a] font-bold
                text-[#0f0f10] hover:bg-[#c9aa6a] transition-colors
                ${btnH} ${seniorMode ? "text-xl" : "text-base"}`}
            >
              탐험 종료
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

function StatItem({
  label, value, seniorMode,
}: {
  label: string; value: string; seniorMode: boolean;
}) {
  return (
    <div className="text-center">
      <p className={`font-bold text-[#e8e4d9]
        ${seniorMode ? "text-2xl" : "text-lg"}`}>{value}</p>
      <p className={`text-[#5a5650] ${seniorMode ? "text-base" : "text-xs"}`}>
        {label}
      </p>
    </div>
  );
}
