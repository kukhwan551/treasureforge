"use client";

// app/games/page.tsx

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

type GameDifficulty = "easy" | "medium" | "hard";
type TargetAgeGroup = "child" | "teen" | "adult" | "senior" | "all";
type GameStatus     = "draft" | "published" | "archived";

interface Game {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  difficulty: GameDifficulty;
  target_age: TargetAgeGroup;
  status: GameStatus;
  share_code: string | null;
  map_url: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PaginatedGames {
  games: Game[];
  total: number;
  page: number;
  limit: number;
}

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────

const STATUS_LABEL: Record<GameStatus, string> = {
  draft:     "초안",
  published: "공개",
  archived:  "보관",
};

const STATUS_COLOR: Record<GameStatus, string> = {
  draft:     "bg-[#2a2924] text-[#7a756c]",
  published: "bg-[#b89a5a]/15 text-[#b89a5a]",
  archived:  "bg-[#3a2424] text-[#a06060]",
};

const DIFFICULTY_LABEL: Record<GameDifficulty, string> = {
  easy: "쉬움", medium: "보통", hard: "어려움",
};

const AGE_LABEL: Record<TargetAgeGroup, string> = {
  child: "어린이", teen: "청소년", adult: "성인",
  senior: "시니어", all: "전 연령",
};

// ─────────────────────────────────────────────
// 페이지
// ─────────────────────────────────────────────

export default function GamesPage() {
  const router = useRouter();

  const [data, setData]         = useState<PaginatedGames | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState<GameStatus | "">("");
  const [page, setPage]                   = useState(1);

  const [confirmId, setConfirmId]   = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition]         = useTransition();

  // ── fetch ──
  async function fetchGames(opts?: {
    p?: number; s?: string; st?: GameStatus | "";
  }) {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page",  String(opts?.p  ?? page));
    params.set("limit", "20");
    const s  = opts?.s  !== undefined ? opts.s  : search;
    const st = opts?.st !== undefined ? opts.st : statusFilter;
    if (s)  params.set("search", s);
    if (st) params.set("status", st);

    try {
      const res  = await fetch(`/api/games?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // 최초 로드
  useEffect(() => { fetchGames(); }, []); // eslint-disable-line

  // 검색 디바운스
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchGames({ p: 1, s: search, st: statusFilter });
    }, 350);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line

  function handleStatusFilter(s: GameStatus | "") {
    setStatusFilter(s);
    setPage(1);
    fetchGames({ p: 1, s: search, st: s });
  }

  function handlePage(next: number) {
    setPage(next);
    fetchGames({ p: next });
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/games/${id}`, { method: "DELETE" });
      setConfirmId(null);
      fetchGames();
    } finally {
      setDeletingId(null);
    }
  }

  function handlePublish(id: string) {
    startTransition(async () => {
      await fetch(`/api/games/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      fetchGames();
    });
  }

  const games      = data?.games ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen bg-[#0f0f10] text-[#e8e4d9]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">

        {/* 헤더 */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-widest text-[#b89a5a] uppercase mb-1">
              게임 관리
            </p>
            <h1 className="text-2xl font-semibold text-[#e8e4d9] tracking-tight">
              내 게임 목록
            </h1>
          </div>
          <button
            onClick={() => router.push("/games/new")}
            className="flex items-center gap-2 self-start sm:self-auto
              rounded-xl bg-[#b89a5a] px-5 py-2.5 text-sm font-medium text-[#0f0f10]
              hover:bg-[#c9aa6a] transition-colors"
          >
            <PlusIcon /> 새 게임 만들기
          </button>
        </div>

        {/* 검색 + 필터 */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a4840]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="게임 제목 검색…"
              className="w-full rounded-xl border border-[#2a2924] bg-[#18181a]
                pl-9 pr-4 py-2.5 text-sm text-[#e8e4d9] placeholder:text-[#3a3830]
                focus:outline-none focus:border-[#b89a5a] focus:ring-1 focus:ring-[#b89a5a]/20
                transition-colors"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["", "draft", "published", "archived"] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusFilter(s)}
                className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all
                  ${statusFilter === s
                    ? "border-[#b89a5a] bg-[#b89a5a]/15 text-[#d4b06a]"
                    : "border-[#2a2924] bg-[#18181a] text-[#7a756c] hover:border-[#3a3830]"
                  }`}
              >
                {s === "" ? "전체" : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div className="mb-4 rounded-xl border border-[#c0504a]/30 bg-[#c0504a]/10
            px-4 py-3 text-sm text-[#e07070]">
            {error}
          </div>
        )}

        {/* 목록 */}
        {loading && games.length === 0 ? (
          <GameListSkeleton />
        ) : games.length === 0 ? (
          <EmptyState onNew={() => router.push("/games/new")} />
        ) : (
          <>
            <div className="space-y-3">
              {games.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  isConfirming={confirmId === game.id}
                  isDeleting={deletingId === game.id}
                  onEdit={()          => router.push(`/games/${game.id}/edit`)}
                  onPublish={()       => handlePublish(game.id)}
                  onDeleteRequest={() => setConfirmId(game.id)}
                  onDeleteConfirm={() => handleDelete(game.id)}
                  onDeleteCancel={()  => setConfirmId(null)}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <PageBtn disabled={page <= 1}          onClick={() => handlePage(page - 1)}>←</PageBtn>
                <span className="text-sm text-[#5a5650] tabular-nums">{page} / {totalPages}</span>
                <PageBtn disabled={page >= totalPages} onClick={() => handlePage(page + 1)}>→</PageBtn>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// GameCard
// ─────────────────────────────────────────────

function GameCard({
  game, isConfirming, isDeleting,
  onEdit, onPublish, onDeleteRequest, onDeleteConfirm, onDeleteCancel,
}: {
  game: Game;
  isConfirming: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onPublish: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#2a2924] bg-[#18181a] px-5 py-4
      hover:border-[#3a3830] transition-colors">

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-[#e8e4d9] truncate">
              {game.title}
            </h2>
            <span className={`inline-flex items-center rounded-md px-2 py-0.5
              text-[11px] font-medium ${STATUS_COLOR[game.status]}`}>
              {STATUS_LABEL[game.status]}
            </span>
          </div>
          {game.description && (
            <p className="mt-1 text-xs text-[#5a5650] line-clamp-1">
              {game.description}
            </p>
          )}
        </div>

        {!isConfirming ? (
          <div className="flex items-center gap-1.5 shrink-0">
            {game.status === "draft" && (
              <ActionBtn onClick={onPublish} title="공개"><ShareIcon /></ActionBtn>
            )}
            <ActionBtn onClick={onEdit}          title="수정"><EditIcon /></ActionBtn>
            <ActionBtn onClick={onDeleteRequest} title="삭제" danger><TrashIcon /></ActionBtn>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-[#7a756c]">삭제할까요?</span>
            <button
              onClick={onDeleteConfirm} disabled={isDeleting}
              className="rounded-lg bg-[#c0504a]/20 border border-[#c0504a]/30
                px-2.5 py-1 text-xs text-[#e07070]
                hover:bg-[#c0504a]/30 disabled:opacity-50 transition-colors"
            >
              {isDeleting ? "삭제 중…" : "삭제"}
            </button>
            <button
              onClick={onDeleteCancel}
              className="rounded-lg border border-[#2a2924] px-2.5 py-1
                text-xs text-[#5a5650] hover:border-[#3a3830] transition-colors"
            >
              취소
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <MetaChip>{DIFFICULTY_LABEL[game.difficulty]}</MetaChip>
        <MetaChip>{AGE_LABEL[game.target_age]}</MetaChip>
        {game.share_code && (
          <MetaChip>
            <span className="font-mono tracking-wider">{game.share_code}</span>
          </MetaChip>
        )}
        <span className="ml-auto text-[11px] text-[#3a3830] tabular-nums">
          {new Date(game.updated_at).toLocaleDateString("ko-KR", {
            month: "short", day: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 서브 컴포넌트
// ─────────────────────────────────────────────

function ActionBtn({ onClick, title, danger, children }: {
  onClick: () => void; title: string; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} title={title} aria-label={title}
      className={`rounded-lg border p-1.5 transition-colors
        ${danger
          ? "border-[#2a2924] text-[#5a5650] hover:border-[#c0504a]/40 hover:text-[#e07070] hover:bg-[#c0504a]/10"
          : "border-[#2a2924] text-[#5a5650] hover:border-[#3a3830] hover:text-[#9a9590]"
        }`}
    >
      {children}
    </button>
  );
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-[#1e1e20]
      border border-[#2a2924] px-2 py-0.5 text-[11px] text-[#5a5650]">
      {children}
    </span>
  );
}

function PageBtn({ onClick, disabled, children }: {
  onClick: () => void; disabled: boolean; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="rounded-lg border border-[#2a2924] px-3 py-1.5 text-sm text-[#7a756c]
        hover:border-[#3a3830] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
      {children}
    </button>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 text-4xl opacity-30">🧭</div>
      <p className="text-sm font-medium text-[#5a5650]">아직 만든 게임이 없습니다</p>
      <p className="mt-1 text-xs text-[#3a3830]">첫 번째 보물찾기를 만들어 보세요</p>
      <button onClick={onNew}
        className="mt-5 rounded-xl bg-[#b89a5a] px-5 py-2.5 text-sm font-medium
          text-[#0f0f10] hover:bg-[#c9aa6a] transition-colors">
        게임 만들기
      </button>
    </div>
  );
}

function GameListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-[#2a2924] bg-[#18181a]
          px-5 py-4 animate-pulse">
          <div className="flex justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-3.5 w-40 rounded bg-[#2a2924]" />
              <div className="h-2.5 w-64 rounded bg-[#2a2924]" />
            </div>
            <div className="flex gap-1.5">
              <div className="h-7 w-7 rounded-lg bg-[#2a2924]" />
              <div className="h-7 w-7 rounded-lg bg-[#2a2924]" />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <div className="h-5 w-12 rounded-md bg-[#2a2924]" />
            <div className="h-5 w-16 rounded-md bg-[#2a2924]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// 아이콘
// ─────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}
