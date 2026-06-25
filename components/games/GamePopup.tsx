"use client";
// components/games/GamePopup.tsx

import MoleGame   from "./MoleGame";
import TetrisGame from "./TetrisGame";
import BrickGame  from "./BrickGame";
import MemoryGame from "./MemoryGame";
import JumpGame   from "./JumpGame";
import { useState } from "react";

export type GameType = "mole" | "tetris" | "brick" | "memory" | "jump";

export const GAME_LABELS: Record<GameType, { name: string; icon: string; desc: string }> = {
  mole:   { name: "두더지 잡기", icon: "🐹", desc: "나타나는 두더지를 탭해서 잡으세요!" },
  tetris: { name: "테트리스",    icon: "🟦", desc: `블록을 쌓아 3줄을 지우면 통과!` },
  brick:  { name: "벽돌깨기",   icon: "🧱", desc: "공으로 벽돌 15개를 깨면 통과!" },
  memory: { name: "기억력 게임", icon: "🃏", desc: "카드를 뒤집어 같은 그림을 맞추세요!" },
  jump:   { name: "점프 게임",  icon: "🐦", desc: "탭해서 장애물 5개를 통과하면 성공!" },
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
  const info = GAME_LABELS[gameType] ?? GAME_LABELS.mole;

  if (!started) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f0f10]/95 px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="text-7xl">{info.icon}</div>
          <div>
            <h2 className={`font-bold text-[#e8e4d9] mb-1 ${seniorMode ? "text-3xl" : "text-2xl"}`}>{info.name}</h2>
            <p className={`text-[#7a756c] ${seniorMode ? "text-lg" : "text-sm"}`}>📍 {postName}</p>
          </div>
          <div className="rounded-2xl border border-[#2a2924] bg-[#18181a] px-5 py-4">
            <p className={`text-[#c4bfb4] ${seniorMode ? "text-xl" : "text-base"}`}>{info.desc}</p>
          </div>
          <div className="space-y-3">
            <button onClick={() => setStarted(true)}
              className={`w-full rounded-xl bg-[#b89a5a] font-bold text-[#0f0f10] hover:bg-[#c9aa6a] transition-colors ${seniorMode ? "py-5 text-xl" : "py-3 text-base"}`}>
              🎮 게임 시작!
            </button>
            <button onClick={onSkip}
              className={`w-full rounded-xl border border-[#2a2924] text-[#7a756c] hover:border-[#3a3830] transition-colors ${seniorMode ? "py-4 text-lg" : "py-2.5 text-sm"}`}>
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
      {gameType === "tetris" && <TetrisGame {...props}/>}
      {gameType === "brick"  && <BrickGame  {...props}/>}
      {gameType === "memory" && <MemoryGame {...props}/>}
      {gameType === "jump"   && <JumpGame   {...props}/>}
    </div>
  );
}
