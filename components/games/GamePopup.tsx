"use client";
// components/games/GamePopup.tsx

import { useState } from "react";
import MoleGame from "./MoleGame";
import DodgeGame from "./DodgeGame";
import MemoryGame from "./MemoryGame";
import TypingGame from "./TypingGame";
import TargetGame from "./TargetGame";

export type GameType = "mole" | "dodge" | "memory" | "typing" | "target";

export const GAME_LABELS: Record<GameType, { name: string; icon: string; desc: string }> = {
  mole:   { name: "두더지 잡기",   icon: "🐹", desc: "나타나는 두더지를 탭해서 잡으세요!" },
  dodge:  { name: "장애물 피하기", icon: "🚀", desc: "좌우로 움직여 장애물을 피하세요!" },
  memory: { name: "기억력 게임",   icon: "🃏", desc: "카드를 뒤집어 같은 그림을 맞추세요!" },
  typing: { name: "타이핑 게임",   icon: "⌨️", desc: "나타나는 단어를 빠르게 입력하세요!" },
  target: { name: "과녁 맞추기",   icon: "🎯", desc: "움직이는 과녁을 정확히 맞추세요!" },
};

interface GamePopupProps {
  gameType: GameType;
  postName: string;
  seniorMode: boolean;
  onComplete: (score: number) => void;
  onSkip: () => void;
}

export default function GamePopup({ gameType, postName, seniorMode, onComplete, onSkip }: GamePopupProps) {
  const [started, setStarted] = useState(false);
  const info = GAME_LABELS[gameType];

  if (!started) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f0f10]/95 px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="text-7xl">{info.icon}</div>
          <div>
            <h2 className={`font-bold text-[#e8e4d9] mb-1 ${seniorMode ? "text-3xl" : "text-2xl"}`}>
              {info.name}
            </h2>
            <p className={`text-[#7a756c] ${seniorMode ? "text-lg" : "text-sm"}`}>📍 {postName}</p>
          </div>
          <div className="rounded-2xl border border-[#2a2924] bg-[#18181a] px-5 py-4">
            <p className={`text-[#c4bfb4] ${seniorMode ? "text-xl" : "text-base"}`}>{info.desc}</p>
          </div>
          <div className="space-y-3">
            <button onClick={() => setStarted(true)}
              className={`w-full rounded-xl bg-[#b89a5a] font-bold text-[#0f0f10]
                hover:bg-[#c9aa6a] transition-colors ${seniorMode ? "py-5 text-xl" : "py-3 text-base"}`}>
              🎮 게임 시작!
            </button>
            <button onClick={onSkip}
              className={`w-full rounded-xl border border-[#2a2924] text-[#7a756c]
                hover:border-[#3a3830] transition-colors ${seniorMode ? "py-4 text-lg" : "py-2.5 text-sm"}`}>
              나중에 하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const props = { seniorMode, onComplete, onSkip };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f0f10]">
      {gameType === "mole"   && <MoleGame   {...props}/>}
      {gameType === "dodge"  && <DodgeGame  {...props}/>}
      {gameType === "memory" && <MemoryGame {...props}/>}
      {gameType === "typing" && <TypingGame {...props}/>}
      {gameType === "target" && <TargetGame {...props}/>}
    </div>
  );
}
