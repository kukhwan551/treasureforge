"use client";

// app/games/[id]/map/page.tsx
// 게임별 지도 관리 페이지

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MapUploader from "@/components/maps/MapUploader";
import type { MapRecord } from "@/lib/maps";

interface Game {
  id: string;
  title: string;
  status: string;
}

export default function GameMapPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [game, setGame]     = useState<Game | null>(null);
  const [map, setMap]       = useState<MapRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        // ★ 게임 정보 로드 — admin API 사용 (RLS 우회)
        const gameRes  = await fetch(`/api/games/${id}`);
        const gameJson = await gameRes.json();
        if (gameJson.error) throw new Error(gameJson.error.message);
        setGame(gameJson.data);

        // ★ 기존 지도 로드 — admin API 사용
        const mapRes  = await fetch(`/api/games/${id}/map`);
        const mapJson = await mapRes.json();
        if (!mapJson.error) setMap(mapJson.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]); // eslint-disable-line

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f10]">
        <div className="h-5 w-5 animate-spin rounded-full
          border-2 border-[#b89a5a] border-t-transparent" />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f10]">
        <p className="text-sm text-[#e07070]">{error ?? "게임을 찾을 수 없습니다."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f10] text-[#e8e4d9]">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">

        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => router.push("/games")}
              className="text-xs font-medium tracking-widest text-[#b89a5a]
                uppercase hover:text-[#c9aa6a] transition-colors"
            >
              게임 관리
            </button>
            <span className="text-[#3a3830]">/</span>
            <button
              onClick={() => router.push(`/games/${id}/edit`)}
              className="text-xs text-[#5a5650] tracking-widest uppercase
                truncate max-w-[160px] hover:text-[#7a756c] transition-colors"
            >
              {game.title}
            </button>
            <span className="text-[#3a3830]">/</span>
            <span className="text-xs text-[#5a5650] tracking-widest uppercase">
              지도
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-[#e8e4d9] tracking-tight">
            지도 관리
          </h1>
          <p className="mt-1.5 text-sm text-[#7a756c]">
            탐험 배경이 될 지도 이미지를 업로드하세요.
            JPG, PNG, WEBP 형식을 지원합니다.
          </p>
        </div>

        {/* 업로더 */}
        <div className="rounded-2xl border border-[#2a2924] bg-[#18181a] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-[#c4bfb4]">지도 이미지</h2>
            {map && (
              <span className="inline-flex items-center rounded-md
                bg-[#4a9d6f]/15 px-2 py-0.5 text-[11px] font-medium text-[#4a9d6f]">
                ✓ 등록됨
              </span>
            )}
          </div>

          <MapUploader
            gameId={id}
            initial={map}
            onUploaded={(newMap) => setMap(newMap)}
            onDeleted={() => setMap(null)}
          />
        </div>

        {/* 안내 카드 */}
        <div className="mt-4 rounded-xl border border-[#2a2924] bg-[#18181a] px-4 py-3.5">
          <p className="text-xs font-medium text-[#5a5650] mb-2">💡 지도 제작 팁</p>
          <ul className="space-y-1 text-xs text-[#4a4840]">
            <li>• 권장 크기: 1200 × 800px 이상 (가로형)</li>
            <li>• 포스트 배치가 쉽도록 랜드마크가 뚜렷한 이미지를 사용하세요</li>
            <li>• AI 이미지 생성 서비스로 만든 지도도 사용 가능합니다</li>
          </ul>
        </div>

        {/* 하단 버튼 */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            onClick={() => router.push(`/games/${id}/edit`)}
            className="rounded-xl border border-[#2a2924] px-5 py-2.5 text-sm
              text-[#7a756c] hover:border-[#3a3830] hover:text-[#9a9590]
              transition-colors"
          >
            ← 게임 정보로
          </button>

          <button
            onClick={() => router.push(`/games/${id}/posts/editor`)}
            disabled={!map}
            className="flex items-center justify-center gap-2 rounded-xl
              bg-[#b89a5a] px-6 py-2.5 text-sm font-medium text-[#0f0f10]
              hover:bg-[#c9aa6a] disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors"
          >
            포스트 편집으로 →
          </button>
        </div>

      </div>
    </div>
  );
}
