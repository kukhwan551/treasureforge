"use client";
// app/explore/page.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface GameCard {
  id: string;
  title: string;
  description: string | null;
  difficulty: string;
  share_code: string;
  time_limit_sec: number | null;
  compass_assist: boolean;
  maps: { public_url: string }[] | null;
}

const DIFF_LABEL: Record<string, string> = { easy: "쉬움", medium: "보통", hard: "어려움" };
const DIFF_COLOR: Record<string, string> = {
  easy: "text-[#4a9d6f] border-[#4a9d6f]/30 bg-[#4a9d6f]/10",
  medium: "text-[#b89a5a] border-[#b89a5a]/30 bg-[#b89a5a]/10",
  hard: "text-[#c0504a] border-[#c0504a]/30 bg-[#c0504a]/10",
};

export default function ExplorePage() {
  const router = useRouter();
  const [games, setGames]     = useState<GameCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/explore")
      .then(r => r.json())
      .then(j => { if (j.error) throw new Error(j.error.message); setGames(j.data ?? []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f10] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">

        {/* 헤더 */}
        <div className="mb-8 text-center">
          <p className="text-xs font-medium tracking-widest text-[#b89a5a] uppercase mb-2">
            🗺️ 공개 게임
          </p>
          <h1 className="text-3xl font-bold text-[#e8e4d9] tracking-tight mb-2">
            TreasureForge 탐험
          </h1>
          <p className="text-sm text-[#5a5650]">
            누구나 만들고 공유하는 보물찾기 게임 모음
          </p>
        </div>

        {/* 게임 목록 */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#b89a5a] border-t-transparent"/>
          </div>
        ) : error ? (
          <p className="text-center text-sm text-[#e07070] py-20">{error}</p>
        ) : games.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🗺️</p>
            <p className="text-sm text-[#5a5650]">아직 공개된 게임이 없습니다.</p>
            <p className="text-xs text-[#3a3830] mt-1">
              게임을 만들고 공개 등록해 보세요!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {games.map((g) => {
              const thumb = g.maps?.[0]?.public_url ?? null;
              return (
                <div key={g.id}
                  onClick={() => router.push(`/play/${g.share_code}`)}
                  className="group rounded-2xl border border-[#2a2924] bg-[#141414]
                    overflow-hidden cursor-pointer hover:border-[#b89a5a]/40
                    transition-all hover:shadow-lg hover:shadow-[#b89a5a]/5">

                  {/* 썸네일 */}
                  <div className="relative h-40 bg-[#0a0a0a] overflow-hidden">
                    {thumb ? (
                      <img src={thumb} alt={g.title}
                        className="w-full h-full object-cover opacity-80
                          group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"/>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl opacity-30">🗺️</span>
                      </div>
                    )}
                    {/* 난이도 뱃지 */}
                    <span className={`absolute top-2 right-2 rounded-full border px-2 py-0.5
                      text-[10px] font-medium ${DIFF_COLOR[g.difficulty] ?? "text-[#5a5650]"}`}>
                      {DIFF_LABEL[g.difficulty] ?? g.difficulty}
                    </span>
                    {g.compass_assist && (
                      <span className="absolute top-2 left-2 rounded-full border
                        border-[#b89a5a]/30 bg-[#b89a5a]/10 px-2 py-0.5
                        text-[10px] text-[#b89a5a]">
                        🧭 나침반
                      </span>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="px-4 py-3.5">
                    <h2 className="text-sm font-semibold text-[#e8e4d9] truncate mb-1">
                      {g.title}
                    </h2>
                    {g.description && (
                      <p className="text-xs text-[#5a5650] line-clamp-2 mb-3">
                        {g.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      {g.time_limit_sec ? (
                        <span className="text-[11px] text-[#4a4840]">
                          ⏱ {Math.floor(g.time_limit_sec / 60)}분 제한
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#4a4840]">⏱ 무제한</span>
                      )}
                      <span className="text-[11px] text-[#b89a5a] group-hover:underline">
                        게임 시작 →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 하단 - 게임 만들기 유도 */}
        <div className="mt-12 text-center border-t border-[#2a2924] pt-8">
          <p className="text-sm text-[#5a5650] mb-3">나만의 보물찾기 게임을 만들어 공유해보세요</p>
          <button onClick={() => router.push("/games/new")}
            className="rounded-xl bg-[#b89a5a] px-6 py-2.5 text-sm font-medium
              text-[#0f0f10] hover:bg-[#c9aa6a] transition-colors">
            게임 만들기
          </button>
        </div>

      </div>
    </div>
  );
}
