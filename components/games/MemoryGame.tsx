"use client";
// components/games/MemoryGame.tsx - 기억력 카드 게임

import { useState, useEffect } from "react";

interface Props { seniorMode: boolean; onComplete: (score: number) => void; onSkip: () => void; }

const EMOJIS = ["🌟","🎯","🗝","💎","🏆","🌈"];
const PAIRS = [...EMOJIS, ...EMOJIS];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function MemoryGame({ seniorMode, onComplete, onSkip }: Props) {
  const [cards, setCards]       = useState(() => shuffle(PAIRS).map((e,i) => ({ id:i, emoji:e, flipped:false, matched:false })));
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves]       = useState(0);
  const [phase, setPhase]       = useState<"playing"|"result">("playing");
  const [locked, setLocked]     = useState(false);
  const [startTime]             = useState(Date.now());
  const [elapsed, setElapsed]   = useState(0);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 500);
    return () => clearInterval(id);
  }, [phase, startTime]);

  function flipCard(id: number) {
    if (locked || phase !== "playing") return;
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;
    if (selected.length === 1 && selected[0] === id) return;

    const newCards = cards.map(c => c.id === id ? { ...c, flipped: true } : c);
    const newSelected = [...selected, id];
    setCards(newCards);
    setSelected(newSelected);

    if (newSelected.length === 2) {
      setLocked(true);
      setMoves(m => m + 1);
      const [a, b] = newSelected.map(sid => newCards.find(c => c.id === sid)!);
      if (a.emoji === b.emoji) {
        const matched = newCards.map(c => newSelected.includes(c.id) ? { ...c, matched: true } : c);
        setCards(matched);
        setSelected([]);
        setLocked(false);
        if (matched.every(c => c.matched)) {
          setPhase("result");
        }
      } else {
        setTimeout(() => {
          setCards(prev => prev.map(c => newSelected.includes(c.id) ? { ...c, flipped: false } : c));
          setSelected([]);
          setLocked(false);
        }, 900);
      }
    }
  }

  if (phase === "result") {
    const score = Math.max(100 - moves * 3, 10);
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-6 px-4">
        <div className="text-7xl">🎉</div>
        <h2 className={`font-bold text-[#4a9d6f] ${seniorMode ? "text-3xl" : "text-2xl"}`}>완성!</h2>
        <p className={`text-[#c4bfb4] ${seniorMode ? "text-xl" : "text-base"}`}>
          {moves}번 시도 · {elapsed}초
        </p>
        <button onClick={() => onComplete(score)}
          className={`w-full max-w-xs rounded-xl bg-[#4a9d6f] font-bold text-white ${seniorMode ? "py-5 text-xl" : "py-3 text-base"}`}>
          🗝 열쇠 획득!
        </button>
        <button onClick={onSkip} className={`text-[#5a5650] ${seniorMode ? "text-base" : "text-sm"}`}>나가기</button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className={`text-[#b89a5a] font-bold ${seniorMode ? "text-xl" : "text-base"}`}>🃏 기억력 게임</p>
        <p className={`text-[#7a756c] ${seniorMode ? "text-lg" : "text-sm"}`}>시도: {moves}번 · {elapsed}초</p>
        <button onClick={onSkip} className={`text-[#4a4840] ${seniorMode ? "text-base" : "text-xs"}`}>포기</button>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-4 gap-2 w-full max-w-sm">
          {cards.map(card => (
            <button key={card.id} onPointerDown={() => flipCard(card.id)}
              className={`aspect-square rounded-xl border-2 flex items-center justify-center
                transition-all duration-300 active:scale-95
                ${card.matched
                  ? "border-[#4a9d6f] bg-[#4a9d6f]/20"
                  : card.flipped
                  ? "border-[#b89a5a] bg-[#b89a5a]/20"
                  : "border-[#2a2924] bg-[#18181a]"}`}>
              <span style={{ fontSize: card.flipped || card.matched ? (seniorMode ? 32 : 24) : 0, transition: "font-size 0.2s" }}>
                {card.flipped || card.matched ? card.emoji : ""}
              </span>
              {!card.flipped && !card.matched && (
                <span style={{ fontSize: seniorMode ? 24 : 18 }}>❓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <p className={`text-center text-[#5a5650] ${seniorMode ? "text-base" : "text-xs"}`}>
        같은 그림 카드를 찾아 모두 맞추세요!
      </p>
    </div>
  );
}
