"use client";
// components/games/MemoryGame.tsx - 기억력 카드 게임 (모두 맞히면 통과)

import { useState, useEffect } from "react";

interface Props { seniorMode: boolean; onComplete: (score: number) => void; onSkip: () => void; }

const EMOJIS = ["🌟","🎯","🗝","💎","🏆","🌈"];
const PAIRS = [...EMOJIS, ...EMOJIS];

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(()=>Math.random()-0.5); }

function MemoryBoard({ seniorMode, onComplete, onSkip }: Props) {
  const [cards, setCards] = useState(() => shuffle(PAIRS).map((e,i)=>({id:i,emoji:e,flipped:false,matched:false})));
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves]   = useState(0);
  const [locked, setLocked] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(()=>setElapsed(Math.floor((Date.now()-startTime)/1000)),500);
    return ()=>clearInterval(id);
  },[startTime]);

  function flipCard(id: number) {
    if (locked) return;
    const card = cards.find(c=>c.id===id);
    if (!card||card.flipped||card.matched) return;
    if (selected.length===1&&selected[0]===id) return;
    const newCards = cards.map(c=>c.id===id?{...c,flipped:true}:c);
    const newSel = [...selected,id];
    setCards(newCards); setSelected(newSel);
    if (newSel.length===2) {
      setLocked(true); setMoves(m=>m+1);
      const [a,b] = newSel.map(sid=>newCards.find(c=>c.id===sid)!);
      if (a.emoji===b.emoji) {
        const matched = newCards.map(c=>newSel.includes(c.id)?{...c,matched:true}:c);
        setCards(matched); setSelected([]); setLocked(false);
        if (matched.every(c=>c.matched)) onComplete(Math.max(100-moves*3,10));
      } else {
        setTimeout(()=>{
          setCards(prev=>prev.map(c=>newSel.includes(c.id)?{...c,flipped:false}:c));
          setSelected([]); setLocked(false);
        },900);
      }
    }
  }

  return (
    <div className="h-full flex flex-col px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className={`text-[#b89a5a] font-bold ${seniorMode?"text-xl":"text-base"}`}>🃏 기억력 게임</p>
        <p className={`text-[#7a756c] ${seniorMode?"text-lg":"text-sm"}`}>{moves}번 · {elapsed}초</p>
        <button onClick={onSkip} className={`text-[#4a4840] ${seniorMode?"text-base":"text-xs"}`}>포기</button>
      </div>
      <p className={`text-center text-[#5a5650] ${seniorMode?"text-base":"text-xs"}`}>카드를 모두 맞히면 통과!</p>
      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-4 gap-2 w-full max-w-sm">
          {cards.map(card=>(
            <button key={card.id} onPointerDown={()=>flipCard(card.id)}
              className={`aspect-square rounded-xl border-2 flex items-center justify-center transition-all duration-200 active:scale-95
                ${card.matched?"border-[#4a9d6f] bg-[#4a9d6f]/20":card.flipped?"border-[#b89a5a] bg-[#b89a5a]/20":"border-[#2a2924] bg-[#18181a]"}`}>
              {card.flipped||card.matched
                ? <span style={{fontSize:seniorMode?32:24}}>{card.emoji}</span>
                : <span style={{fontSize:seniorMode?24:18}}>❓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MemoryGame({ seniorMode, onComplete, onSkip }: Props) {
  const [key, setKey] = useState(0);
  const [done, setDone] = useState(false);

  if (done) return null; // onComplete 호출 후 GamePopup이 닫힘

  return <MemoryBoard key={key} seniorMode={seniorMode}
    onComplete={(s)=>{ setDone(true); onComplete(s); }}
    onSkip={onSkip}/>;
}
