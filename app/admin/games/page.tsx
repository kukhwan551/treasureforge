"use client";
// app/admin/games/page.tsx
import { useEffect, useState } from "react";

interface GameRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  is_public: boolean;
  public_agreed_at: string | null;
  share_code: string | null;
}

export default function AdminGamesPage() {
  const [games, setGames]     = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/games")
      .then(r => r.json())
      .then(j => { if (j.error) throw new Error(j.error); setGames(j.data ?? []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(gameId: string, is_public: boolean) {
    setUpdating(gameId);
    try {
      const res = await fetch("/api/admin/games", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, is_public }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setGames(prev => prev.map(g => g.id === gameId ? { ...g, is_public } : g));
    } catch (e) {
      alert(e instanceof Error ? e.message : "오류 발생");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f10] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-xs font-medium tracking-widest text-[#b89a5a] uppercase mb-1">
            관리자
          </p>
          <h1 className="text-2xl font-semibold text-[#e8e4d9]">공개 게임 관리</h1>
          <p className="text-xs text-[#5a5650] mt-1">
            부적합 게임을 비공개 처리하거나 공개 복원할 수 있습니다.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#b89a5a] border-t-transparent"/>
          </div>
        ) : error ? (
          <p className="text-center text-sm text-[#e07070] py-16">{error}</p>
        ) : games.length === 0 ? (
          <p className="text-center text-sm text-[#5a5650] py-16">공개 게임이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {games.map(g => (
              <div key={g.id}
                className="rounded-2xl border border-[#2a2924] bg-[#141414] px-5 py-4
                  flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#e8e4d9] truncate">{g.title}</p>
                  {g.description && (
                    <p className="text-xs text-[#5a5650] truncate mt-0.5">{g.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] rounded-full border px-2 py-0.5
                      ${g.is_public
                        ? "text-[#4a9d6f] border-[#4a9d6f]/30 bg-[#4a9d6f]/10"
                        : "text-[#5a5650] border-[#2a2924]"
                      }`}>
                      {g.is_public ? "공개 중" : "비공개"}
                    </span>
                    {g.share_code && (
                      <a href={`/play/${g.share_code}`} target="_blank"
                        className="text-[10px] text-[#b89a5a] hover:underline">
                        게임 보기 →
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(g.id, !g.is_public)}
                  disabled={updating === g.id}
                  className={`flex-shrink-0 rounded-xl border px-4 py-2 text-xs font-medium
                    transition-colors disabled:opacity-50
                    ${g.is_public
                      ? "border-[#c0504a]/30 text-[#e07070] hover:bg-[#c0504a]/10"
                      : "border-[#4a9d6f]/30 text-[#4a9d6f] hover:bg-[#4a9d6f]/10"
                    }`}>
                  {updating === g.id ? "처리 중…" : g.is_public ? "비공개 처리" : "공개 복원"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
