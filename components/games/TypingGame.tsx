"use client";
// components/games/TypingGame.tsx - 타이핑 게임

import { useState, useEffect, useRef } from "react";

interface Props { seniorMode: boolean; onComplete: (score: number) => void; onSkip: () => void; }

const WORDS = ["보물","탐험","황금","열쇠","지도","모험","발견","비밀","보상","탐험가","황금열쇠","보물상자","지도탐험","모험가","비밀장소"];
const PASS_SCORE = 5;
const TOTAL_TIME = 40;

export default function TypingGame({ seniorMode, onComplete, onSkip }: Props) {
  const [currentWord, setCurrentWord] = useState(() => WORDS[Math.floor(Math.random() * WORDS.length)]);
  const [input, setInput]     = useState("");
  const [score, setScore]     = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [phase, setPhase]     = useState<"playing"|"result">("playing");
  const [shake, setShake]     = useState(false);
  const scoreRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(id); setPhase("result"); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  function handleInput(val: string) {
    setInput(val);
    if (val === currentWord) {
      scoreRef.current++;
      setScore(scoreRef.current);
      setInput("");
      setCurrentWord(WORDS[Math.floor(Math.random() * WORDS.length)]);
    } else if (currentWord.startsWith(val)) {
      // 진행 중
    }
  }

  function handleWrong() {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }

  const passed = scoreRef.current >= PASS_SCORE;

  if (phase === "result") {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-6 px-4">
        <div className="text-7xl">{passed ? "🎉" : "😢"}</div>
        <h2 className={`font-bold ${passed ? "text-[#4a9d6f]" : "text-[#e07070]"} ${seniorMode ? "text-3xl" : "text-2xl"}`}>
          {passed ? "통과!" : "아쉽네요!"}
        </h2>
        <p className={`text-[#c4bfb4] ${seniorMode ? "text-xl" : "text-base"}`}>
          {scoreRef.current}개 완료 (통과 기준: {PASS_SCORE}개)
        </p>
        <div className="space-y-3 w-full max-w-xs">
          {passed
            ? <button onClick={() => onComplete(scoreRef.current * 10)}
                className={`w-full rounded-xl bg-[#4a9d6f] font-bold text-white ${seniorMode ? "py-5 text-xl" : "py-3 text-base"}`}>
                🗝 열쇠 획득!
              </button>
            : <button onClick={() => { scoreRef.current=0; setScore(0); setTimeLeft(TOTAL_TIME); setInput(""); setPhase("playing"); setCurrentWord(WORDS[Math.floor(Math.random()*WORDS.length)]); }}
                className={`w-full rounded-xl bg-[#b89a5a] font-bold text-[#0f0f10] ${seniorMode ? "py-5 text-xl" : "py-3 text-base"}`}>
                🔄 다시 도전
              </button>
          }
          <button onClick={onSkip} className={`w-full rounded-xl border border-[#2a2924] text-[#7a756c] ${seniorMode ? "py-4 text-lg" : "py-2.5 text-sm"}`}>나가기</button>
        </div>
      </div>
    );
  }

  const progress = input.length / currentWord.length;

  return (
    <div className="h-full flex flex-col items-center justify-center px-4 space-y-6">
      {/* HUD */}
      <div className="w-full max-w-sm flex justify-between">
        <p className={`font-bold text-[#b89a5a] ${seniorMode ? "text-2xl" : "text-lg"}`}>✅ {score}/{PASS_SCORE}</p>
        <p className={`font-bold ${timeLeft <= 10 ? "text-[#e07070] animate-pulse" : "text-[#e8e4d9]"} ${seniorMode ? "text-2xl" : "text-lg"}`}>⏱ {timeLeft}s</p>
      </div>

      {/* 단어 표시 */}
      <div className={`w-full max-w-sm rounded-2xl border-2 border-[#b89a5a]/40 bg-[#18181a] py-8 text-center transition-all ${shake ? "animate-[wiggle_0.3s]" : ""}`}>
        <p className={`font-bold text-[#e8e4d9] tracking-widest ${seniorMode ? "text-5xl" : "text-4xl"}`}>
          {currentWord.split("").map((ch, i) => (
            <span key={i} className={i < input.length ? "text-[#4a9d6f]" : "text-[#e8e4d9]"}>{ch}</span>
          ))}
        </p>
        <div className="mt-3 mx-8 h-1.5 bg-[#2a2924] rounded-full">
          <div className="h-full bg-[#4a9d6f] rounded-full transition-all" style={{ width: `${progress * 100}%` }}/>
        </div>
      </div>

      {/* 입력 */}
      <input ref={inputRef} value={input} type="text"
        onChange={e => {
          const val = e.target.value;
          if (!currentWord.startsWith(val) && val.length > 0) handleWrong();
          else handleInput(val);
        }}
        className={`w-full max-w-sm rounded-xl border bg-[#141414] text-center text-[#e8e4d9] focus:outline-none focus:border-[#b89a5a]
          border-[#2a2924] ${seniorMode ? "py-5 text-3xl" : "py-4 text-2xl"}`}
        placeholder="입력하세요"
        autoComplete="off" autoCorrect="off" spellCheck="false"
      />

      <button onClick={onSkip} className={`text-[#4a4840] ${seniorMode ? "text-base" : "text-xs"}`}>포기하기</button>
    </div>
  );
}
