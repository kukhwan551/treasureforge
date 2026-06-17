"use client";

// app/treasury/page.tsx
// 내 보물함 — 연락처로 완료한 게임과 보상을 조회

import { useState } from "react";

interface RewardGame {
  id: string;
  title: string;
  description: string | null;
  reward_message: string | null;
  reward_type: "message" | "coupon" | "certificate";
}

interface TreasurySession {
  id: string;
  nickname: string;
  keys: number;
  score: number;
  started_at: string;
  finished_at: string;
  reward_claimed: boolean;
  reward_claimed_at: string | null;
  character_id: string | null;
  games: RewardGame | null;
}

const REWARD_ICON: Record<string, string> = {
  message: "💌", coupon: "🎫", certificate: "🏆",
};
const REWARD_LABEL: Record<string, string> = {
  message: "메시지", coupon: "쿠폰", certificate: "인증서",
};

export default function TreasuryPage() {
  const [contact, setContact]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [sessions, setSessions] = useState<TreasurySession[] | null>(null);
  const [openId, setOpenId]     = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);

  async function handleSearch() {
    const c = contact.trim();
    if (!c) { setError("휴대폰 번호 또는 이메일을 입력해 주세요."); return; }

    setLoading(true); setError(""); setSessions(null);
    try {
      const res  = await fetch(`/api/treasury?contact=${encodeURIComponent(c)}`);
      const json = await res.json();
      if (json.error) { setError(json.error.message); return; }
      setSessions(json.data.sessions);
      if (json.data.sessions.length === 0) {
        setError("이 연락처로 완료한 탐험 기록이 없습니다.");
      }
    } catch {
      setError("조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim(sessionId: string) {
    setClaiming(sessionId);
    try {
      const res  = await fetch("/api/treasury/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const json = await res.json();
      if (json.error) return;
      setSessions((prev) =>
        prev
          ? prev.map((s) =>
              s.id === sessionId
                ? { ...s, reward_claimed: true, reward_claimed_at: new Date().toISOString() }
                : s
            )
          : prev
      );
    } finally {
      setClaiming(null);
    }
  }

  function fmtDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#0f0f10] px-4 py-10">
      <div className="mx-auto w-full max-w-xl">

        {/* 헤더 */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center justify-center
            rounded-2xl border border-[#2a2924] bg-[#18181a] p-3">
            <ChestIcon />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e8e4d9]">
            내 보물함
          </h1>
          <p className="mt-2 text-sm text-[#7a756c]">
            탐험을 완료할 때 입력한 연락처로 보상을 확인하세요
          </p>
        </div>

        {/* 검색 */}
        <div className="rounded-2xl border border-[#2a2924] bg-[#18181a] p-5">
          <label className="mb-1.5 block text-sm font-medium text-[#c4bfb4]">
            휴대폰 번호 또는 이메일
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={contact}
              onChange={(e) => { setContact(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="010-1234-5678 또는 example@email.com"
              autoComplete="off"
              className="flex-1 rounded-xl border border-[#2a2924] bg-[#141414]
                px-4 py-3 text-[#e8e4d9] placeholder:text-[#3a3830]
                focus:outline-none focus:border-[#b89a5a]
                focus:ring-1 focus:ring-[#b89a5a]/20 transition-colors"
              style={{ fontSize: "16px" }}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="shrink-0 rounded-xl bg-[#b89a5a] px-5 py-3 font-bold
                text-[#0f0f10] hover:bg-[#c9aa6a] active:scale-[0.98]
                transition-all disabled:opacity-50"
            >
              {loading ? "조회 중…" : "조회"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-[#e07070]">{error}</p>}
        </div>

        {/* 결과 목록 */}
        {sessions && sessions.length > 0 && (
          <div className="mt-6 space-y-3">
            {sessions.map((s) => {
              const game = s.games;
              const isOpen = openId === s.id;
              return (
                <div key={s.id}
                  className="rounded-2xl border border-[#2a2924] bg-[#18181a] overflow-hidden">

                  {/* 카드 헤더 */}
                  <button
                    onClick={() => setOpenId(isOpen ? null : s.id)}
                    className="w-full flex items-center gap-3 px-5 py-4 text-left
                      hover:bg-[#1f1f21] transition-colors"
                  >
                    <span className="text-2xl shrink-0">
                      {game ? REWARD_ICON[game.reward_type] : "🗝"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#e8e4d9] truncate">
                        {game?.title ?? "삭제된 게임"}
                      </p>
                      <p className="text-xs text-[#5a5650]">
                        {fmtDate(s.finished_at)} 완료 · 🗝 {s.keys}개 · 🏅 {s.score}점
                      </p>
                    </div>
                    {s.reward_claimed ? (
                      <span className="shrink-0 rounded-full border border-[#4a9d6f]/30
                        bg-[#4a9d6f]/10 px-2.5 py-1 text-[11px] font-medium text-[#4a9d6f]">
                        수령완료
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full border border-[#b89a5a]/30
                        bg-[#b89a5a]/10 px-2.5 py-1 text-[11px] font-medium text-[#b89a5a]">
                        미수령
                      </span>
                    )}
                  </button>

                  {/* 상세 (펼침) */}
                  {isOpen && (
                    <div className="border-t border-[#2a2924] px-5 py-4 space-y-3">
                      {game?.reward_message ? (
                        <div className="rounded-xl border border-[#b89a5a]/30
                          bg-[#b89a5a]/10 px-4 py-3.5">
                          <div className="mb-1.5 flex items-center gap-1.5">
                            <span className="text-sm">{REWARD_ICON[game.reward_type]}</span>
                            <span className="text-[11px] font-medium uppercase
                              tracking-wide text-[#b89a5a]">
                              {REWARD_LABEL[game.reward_type]}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#e8e4d9]">
                            {game.reward_message}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-[#5a5650]">설정된 보상이 없습니다.</p>
                      )}

                      {!s.reward_claimed ? (
                        <button
                          onClick={() => handleClaim(s.id)}
                          disabled={claiming === s.id}
                          className="w-full rounded-xl bg-[#b89a5a] py-3 font-bold
                            text-[#0f0f10] hover:bg-[#c9aa6a] active:scale-[0.98]
                            transition-all disabled:opacity-50"
                        >
                          {claiming === s.id ? "처리 중…" : "수령 완료로 표시"}
                        </button>
                      ) : (
                        <p className="text-center text-xs text-[#5a5650]">
                          {s.reward_claimed_at && fmtDate(s.reward_claimed_at)}에 수령 처리됨
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

function ChestIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="#b89a5a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="9" width="18" height="11" rx="1.5"/>
      <path d="M3 9c0-3 2-5 9-5s9 2 9 5"/>
      <path d="M3 13h18"/>
      <circle cx="12" cy="13" r="1.3" fill="#b89a5a"/>
    </svg>
  );
}
