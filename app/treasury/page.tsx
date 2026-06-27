"use client";
// app/treasury/page.tsx

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

interface PlayerInfo {
  id: string;
  nickname: string;
  contact: string;
  total_points: number;
  rank: number | null;
}

interface TopPlayer {
  id: string;
  nickname: string;
  total_points: number;
  rank: number;
}

const REWARD_ICON: Record<string, string> = { message: "💌", coupon: "🎫", certificate: "🏆" };
const REWARD_LABEL: Record<string, string> = { message: "메시지", coupon: "쿠폰", certificate: "인증서" };

export default function TreasuryPage() {
  const [contact, setContact]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [sessions, setSessions] = useState<TreasurySession[] | null>(null);
  const [player, setPlayer]     = useState<PlayerInfo | null>(null);
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [openId, setOpenId]     = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [tab, setTab]           = useState<"rewards"|"ranking">("rewards");

  async function handleSearch() {
    const c = contact.trim();
    if (!c) { setError("휴대폰 번호 또는 이메일을 입력해 주세요."); return; }
    setLoading(true); setError(""); setSessions(null); setPlayer(null);
    try {
      const res  = await fetch(`/api/treasury?contact=${encodeURIComponent(c)}`);
      const json = await res.json();
      if (json.error) { setError(json.error.message); return; }
      setPlayer(json.data.player);
      setSessions(json.data.sessions);
      setTopPlayers(json.data.topPlayers ?? []);
      if (!json.data.player) setError("이 연락처로 등록된 정보가 없습니다.");
      else if (json.data.sessions.length === 0) setError("완료한 탐험 기록이 없습니다.");
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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const json = await res.json();
      if (json.error) return;
      setSessions(prev => prev ? prev.map(s =>
        s.id === sessionId ? { ...s, reward_claimed: true, reward_claimed_at: new Date().toISOString() } : s
      ) : prev);
    } finally { setClaiming(null); }
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
  }

  return (
    <div className="min-h-screen bg-[#0f0f10] px-4 py-10">
      <div className="mx-auto w-full max-w-xl">

        {/* 헤더 */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center justify-center rounded-2xl border border-[#2a2924] bg-[#18181a] p-3">
            <ChestIcon/>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e8e4d9]">내 보물함</h1>
          <p className="mt-2 text-sm text-[#7a756c]">탐험을 완료할 때 입력한 연락처로 보상과 포인트를 확인하세요</p>
        </div>

        {/* 검색 */}
        <div className="rounded-2xl border border-[#2a2924] bg-[#18181a] p-5">
          <label className="mb-1.5 block text-sm font-medium text-[#c4bfb4]">휴대폰 번호 또는 이메일</label>
          <div className="flex gap-2">
            <input type="text" value={contact}
              onChange={e => { setContact(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="010-1234-5678 또는 example@email.com"
              autoComplete="off"
              className="flex-1 rounded-xl border border-[#2a2924] bg-[#141414] px-4 py-3 text-[#e8e4d9] placeholder:text-[#3a3830] focus:outline-none focus:border-[#b89a5a] transition-colors"
              style={{ fontSize: "16px" }}/>
            <button onClick={handleSearch} disabled={loading}
              className="shrink-0 rounded-xl bg-[#b89a5a] px-5 py-3 font-bold text-[#0f0f10] hover:bg-[#c9aa6a] transition-all disabled:opacity-50">
              {loading ? "조회 중…" : "조회"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-[#e07070]">{error}</p>}
        </div>

        {/* 포인트 카드 */}
        {player && (
          <div className="mt-4 rounded-2xl border border-[#b89a5a]/30 bg-gradient-to-br from-[#b89a5a]/10 to-[#0f0f10] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#7a756c]">탐험가</p>
                <p className="text-xl font-bold text-[#e8e4d9]">{player.nickname}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#7a756c]">나의 포인트</p>
                <p className="text-3xl font-black text-[#b89a5a]">
                  {(player.total_points ?? 0).toLocaleString()}
                  <span className="text-base font-normal ml-1">pt</span>
                </p>
              </div>
            </div>
            {player.rank && (
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full border border-[#b89a5a]/40 bg-[#b89a5a]/10 px-3 py-1 text-sm font-bold text-[#b89a5a]">
                  🏆 전체 {player.rank}위
                </span>
              </div>
            )}
          </div>
        )}

        {/* 탭 */}
        {player && (
          <div className="mt-4 flex gap-2">
            <button onClick={() => setTab("rewards")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all
                ${tab==="rewards" ? "bg-[#b89a5a] text-[#0f0f10]" : "border border-[#2a2924] text-[#7a756c]"}`}>
              🎁 보상 목록
            </button>
            <button onClick={() => setTab("ranking")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all
                ${tab==="ranking" ? "bg-[#b89a5a] text-[#0f0f10]" : "border border-[#2a2924] text-[#7a756c]"}`}>
              🏆 포인트 순위
            </button>
          </div>
        )}

        {/* 보상 목록 */}
        {tab === "rewards" && sessions && sessions.length > 0 && (
          <div className="mt-4 space-y-3">
            {sessions.map(s => {
              const game = s.games;
              const isOpen = openId === s.id;
              return (
                <div key={s.id} className="rounded-2xl border border-[#2a2924] bg-[#18181a] overflow-hidden">
                  <button onClick={() => setOpenId(isOpen ? null : s.id)}
                    className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#1f1f21] transition-colors">
                    <span className="text-2xl shrink-0">{game ? REWARD_ICON[game.reward_type] : "🗝"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#e8e4d9] truncate">{game?.title ?? "삭제된 게임"}</p>
                      <p className="text-xs text-[#5a5650]">
                        {fmtDate(s.finished_at)} 완료 · 🗝 {s.keys}개 · 🏅 {s.score}점
                      </p>
                    </div>
                    {s.reward_claimed
                      ? <span className="shrink-0 rounded-full border border-[#4a9d6f]/30 bg-[#4a9d6f]/10 px-2.5 py-1 text-[11px] font-medium text-[#4a9d6f]">수령완료</span>
                      : <span className="shrink-0 rounded-full border border-[#b89a5a]/30 bg-[#b89a5a]/10 px-2.5 py-1 text-[11px] font-medium text-[#b89a5a]">미수령</span>}
                  </button>
                  {isOpen && (
                    <div className="border-t border-[#2a2924] px-5 py-4 space-y-3">
                      {game?.reward_message ? (
                        <div className="rounded-xl border border-[#b89a5a]/30 bg-[#b89a5a]/10 px-4 py-3.5">
                          <div className="mb-1.5 flex items-center gap-1.5">
                            <span className="text-sm">{REWARD_ICON[game.reward_type]}</span>
                            <span className="text-[11px] font-medium uppercase tracking-wide text-[#b89a5a]">{REWARD_LABEL[game.reward_type]}</span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#e8e4d9]">{game.reward_message}</p>
                        </div>
                      ) : <p className="text-sm text-[#5a5650]">설정된 보상이 없습니다.</p>}
                      {!s.reward_claimed
                        ? <button onClick={() => handleClaim(s.id)} disabled={claiming === s.id}
                            className="w-full rounded-xl bg-[#b89a5a] py-3 font-bold text-[#0f0f10] hover:bg-[#c9aa6a] transition-all disabled:opacity-50">
                            {claiming === s.id ? "처리 중…" : "수령 완료로 표시"}
                          </button>
                        : <p className="text-center text-xs text-[#5a5650]">{s.reward_claimed_at && fmtDate(s.reward_claimed_at)}에 수령 처리됨</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 포인트 순위 */}
        {tab === "ranking" && (
          <div className="mt-4 rounded-2xl border border-[#2a2924] bg-[#18181a] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a2924]">
              <p className="font-bold text-[#e8e4d9]">🏆 포인트 TOP 10</p>
              <p className="text-xs text-[#5a5650] mt-0.5">포스트 통과 시 10pt 적립</p>
            </div>
            {topPlayers.length === 0 ? (
              <p className="text-center text-sm text-[#5a5650] py-8">아직 포인트 기록이 없습니다.</p>
            ) : (
              <div className="divide-y divide-[#2a2924]">
                {topPlayers.map(p => (
                  <div key={p.id}
                    className={`flex items-center gap-3 px-5 py-3.5 ${player?.id === p.id ? "bg-[#b89a5a]/10" : ""}`}>
                    <span className={`w-8 text-center font-black text-lg
                      ${p.rank===1?"text-[#ffd700]":p.rank===2?"text-[#c0c0c0]":p.rank===3?"text-[#cd7f32]":"text-[#5a5650]"}`}>
                      {p.rank===1?"🥇":p.rank===2?"🥈":p.rank===3?"🥉":p.rank}
                    </span>
                    <p className={`flex-1 font-medium ${player?.id===p.id?"text-[#b89a5a]":"text-[#e8e4d9]"}`}>
                      {p.nickname}
                      {player?.id===p.id && <span className="ml-1 text-xs text-[#b89a5a]">← 나</span>}
                    </p>
                    <p className="font-bold text-[#b89a5a]">{p.total_points.toLocaleString()}pt</p>
                  </div>
                ))}
              </div>
            )}
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
