"use client";

// app/play/[shareCode]/components/GameIntro.tsx
// 모바일 대응:
// - autoFocus 제거 (모바일 키보드 자동 팝업 방지)
// - 버튼 최소 높이 44px (터치 영역)
// - 지도 미리보기 높이 축소 (작은 화면 대응)
// - 입력 폰트 크기 16px 이상 (iOS 줌 방지)

import { useState } from "react";
import type { PublicGame } from "@/types/explore";
import { CHARACTERS, type CharacterId } from "@/types/character";

interface GameIntroProps {
  game: PublicGame;
  seniorMode: boolean;
  onStart: (nickname: string, characterId: CharacterId, contact: string) => void;
  onToggleSenior: () => void;
}

export default function GameIntro({
  game, seniorMode, onStart, onToggleSenior,
}: GameIntroProps) {
  const [nickname, setNickname] = useState("");
  const [contact, setContact]   = useState("");
  const [error, setError]       = useState("");
  const [characterId, setCharacterId] = useState<CharacterId>(CHARACTERS[0].id);

  function handleStart() {
    if (!nickname.trim()) { setError("닉네임을 입력해 주세요."); return; }
    if (nickname.trim().length > 20) { setError("닉네임은 20자 이하로 입력해 주세요."); return; }
    const c = contact.trim();
    if (!c) { setError("휴대폰 번호 또는 이메일을 입력해 주세요."); return; }
    const isPhone = /^[0-9-]{9,14}$/.test(c);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
    if (!isPhone && !isEmail) { setError("올바른 휴대폰 번호 또는 이메일을 입력해 주세요."); return; }
    onStart(nickname.trim(), characterId, c);
  }

  const ts   = seniorMode ? "text-xl"  : "text-sm";
  const th   = seniorMode ? "text-3xl" : "text-2xl";
  const btnH = seniorMode ? "py-5"     : "py-3.5"; // ★ 최소 44px 보장

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#0f0f10]
      flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">

        {/* 지도 미리보기 */}
        {game.map_url && (
          <div className="mb-5 relative rounded-2xl overflow-hidden border
            border-[#2a2924] h-32 sm:h-40">
            <img src={game.map_url} alt="게임 지도"
              className="w-full h-full object-cover opacity-60"/>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f10] to-transparent"/>
            <div className="absolute bottom-3 left-4">
              <span className="text-[11px] text-[#b89a5a] font-medium
                tracking-widest uppercase">보물지도</span>
            </div>
          </div>
        )}

        {/* 제목 */}
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex items-center justify-center
            rounded-2xl border border-[#2a2924] bg-[#18181a] p-3">
            <CompassIcon/>
          </div>
          <h1 className={`${th} font-bold text-[#e8e4d9] tracking-tight`}>
            {game.title}
          </h1>
          {game.description && (
            <p className={`mt-2 ${ts} text-[#7a756c] leading-relaxed`}>
              {game.description}
            </p>
          )}
          <div className="mt-3 flex items-center justify-center gap-3
            text-[11px] text-[#4a4840]">
            <span>📍 포스트 {game.posts.length}개</span>
            <span>🗝 황금열쇠 {game.posts.length}개</span>
          </div>
        </div>

        {/* ★ 캐릭터 선택 */}
        <div className="mb-5 rounded-2xl border border-[#2a2924] bg-[#18181a] p-4">
          <label className={`block mb-3 ${ts} font-medium text-[#c4bfb4]`}>
            캐릭터 선택
          </label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {CHARACTERS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCharacterId(c.id)}
                className={`flex flex-col items-center gap-1 rounded-xl border
                  py-2.5 px-1 transition-all active:scale-95
                  ${characterId === c.id
                    ? "border-[#b89a5a] bg-[#b89a5a]/15"
                    : "border-[#2a2924] hover:border-[#3a3830]"
                  }`}
                style={{ minHeight: "64px" }}
              >
                <span className="text-2xl leading-none">{c.emoji}</span>
                <span className={`text-[10px] leading-none
                  ${characterId === c.id ? "text-[#b89a5a]" : "text-[#5a5650]"}`}>
                  {c.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 닉네임 입력 */}
        <div className="rounded-2xl border border-[#2a2924] bg-[#18181a] p-5 space-y-4">
          <div className="space-y-1.5">
            <label className={`block ${ts} font-medium text-[#c4bfb4]`}>
              탐험가 이름
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => { setNickname(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              placeholder="이름을 입력하세요"
              maxLength={20}
              autoComplete="off"
              // ★ autoFocus 제거 (모바일에서 키보드 자동 팝업 방지)
              // ★ 폰트 크기 16px 이상 → iOS Safari 줌 방지
              className={`w-full rounded-xl border border-[#2a2924] bg-[#141414]
                px-4 ${seniorMode ? "py-4 text-xl" : "py-3"}
                text-[#e8e4d9] placeholder:text-[#3a3830]
                focus:outline-none focus:border-[#b89a5a]
                focus:ring-1 focus:ring-[#b89a5a]/20 transition-colors`}
              style={{
                // ★ iOS에서 16px 미만이면 자동 줌 → 강제 설정
                fontSize: seniorMode ? "20px" : "16px",
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className={`block ${ts} font-medium text-[#c4bfb4]`}>
              휴대폰 번호 또는 이메일
              <span className="ml-1.5 text-[11px] text-[#5a5650]">(보물함 조회용)</span>
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => { setContact(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              placeholder="010-1234-5678 또는 example@email.com"
              autoComplete="off"
              className={`w-full rounded-xl border border-[#2a2924] bg-[#141414]
                px-4 ${seniorMode ? "py-4 text-xl" : "py-3"}
                text-[#e8e4d9] placeholder:text-[#3a3830]
                focus:outline-none focus:border-[#b89a5a]
                focus:ring-1 focus:ring-[#b89a5a]/20 transition-colors`}
              style={{ fontSize: seniorMode ? "20px" : "16px" }}
            />
            {error && <p className={`${ts} text-[#e07070]`}>{error}</p>}
            <a href="/treasury" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-[#5a5650]
                hover:text-[#b89a5a] transition-colors">
              <ChestIcon /> 내 보물함 확인하기
            </a>
          </div>

          {/* ★ 탐험 시작 버튼 — 최소 터치 영역 44px */}
          <button
            onClick={handleStart}
            className={`w-full flex items-center justify-center gap-2
              rounded-xl bg-[#b89a5a] ${btnH} font-bold text-[#0f0f10]
              ${seniorMode ? "text-xl" : "text-base"}
              hover:bg-[#c9aa6a] active:bg-[#a88a4a] active:scale-[0.98]
              transition-all`}
            style={{ minHeight: "48px" }} // ★ 최소 48px
          >
            <span>🧭</span> 탐험 시작
          </button>
        </div>

        {/* 시니어 모드 토글 */}
        <button
          onClick={onToggleSenior}
          className={`mt-3 w-full flex items-center justify-center gap-2
            rounded-xl border border-[#2a2924]
            ${seniorMode ? "py-4 text-lg" : "py-3 text-sm"}
            text-[#5a5650] hover:border-[#3a3830] hover:text-[#7a756c]
            active:scale-[0.98] transition-all`}
          style={{ minHeight: "44px" }}
        >
          {seniorMode ? "👓 시니어 모드 켜짐" : "👓 시니어 모드"}
        </button>

        {/* ★ 모바일 안내 */}
        <p className="mt-4 text-center text-[11px] text-[#3a3830]">
          화면을 터치하며 탐험하세요 👆
        </p>

      </div>
    </div>
  );
}

function ChestIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="9" width="18" height="11" rx="1.5"/>
      <path d="M3 9c0-3 2-5 9-5s9 2 9 5"/>
      <path d="M3 13h18"/>
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="#b89a5a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
    </svg>
  );
}
