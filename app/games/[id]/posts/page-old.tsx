"use client";

// app/games/[id]/posts/page.tsx

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { listPosts, deletePost, reorderPosts } from "@/lib/posts";
import PostForm from "@/components/posts/PostForm";
import type { Post } from "@/types/post";
import { QUIZ_TYPE_LABEL, ORDER_MODE_LABEL } from "@/types/post";

type PageMode = "list" | "add" | "edit";

export default function PostsPage() {
  const { id: gameId } = useParams<{ id: string }>();
  const router   = useRouter();
  const supabase = createClient();

  const [gameTitle, setGameTitle] = useState("");
  const [posts, setPosts]         = useState<Post[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const [mode, setMode]                   = useState<PageMode>("list");
  const [editingPost, setEditingPost]     = useState<Post | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId]           = useState<string | null>(null);

  // ── 초기 로드 ──
  useEffect(() => {
    if (!gameId) return;
    (async () => {
      try {
        const { data: game } = await supabase
          .from("games")
          .select("title")
          .eq("id", gameId)
          .single();
        setGameTitle(game?.title ?? "");

        const data = await listPosts(supabase, gameId);
        setPosts(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [gameId]); // eslint-disable-line

  async function refreshPosts() {
    const data = await listPosts(supabase, gameId);
    setPosts(data);
  }

  async function handleDelete(postId: string) {
    setDeletingId(postId);
    try {
      await deletePost(supabase, postId);
      await refreshPosts();
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  }

  async function movePost(index: number, dir: "up" | "down") {
    const next = [...posts];
    const swap = dir === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    const updated = next.map((p, i) => ({ ...p, order_index: i }));
    setPosts(updated);
    await reorderPosts(
      supabase,
      updated.map((p) => ({ id: p.id, order_index: p.order_index }))
    );
  }

  // ─────────────────────────────────────────────
  // 로딩
  // ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f10]">
        <div className="h-5 w-5 animate-spin rounded-full
          border-2 border-[#b89a5a] border-t-transparent" />
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // 폼 모드 (추가 / 수정)
  // ─────────────────────────────────────────────

  if (mode === "add" || mode === "edit") {
    return (
      <div className="min-h-screen bg-[#0f0f10] text-[#e8e4d9]">
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">

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
                onClick={() => { setMode("list"); setEditingPost(null); }}
                className="text-xs text-[#5a5650] tracking-widest uppercase
                  hover:text-[#7a756c] transition-colors"
              >
                포스트 관리
              </button>
              <span className="text-[#3a3830]">/</span>
              <span className="text-xs text-[#5a5650] tracking-widest uppercase">
                {mode === "edit" ? "수정" : "새 포스트"}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-[#e8e4d9] tracking-tight">
              {mode === "edit" ? `${editingPost?.name} 수정` : "새 포스트 만들기"}
            </h1>
            {mode === "add" && (
              <p className="mt-1 text-sm text-[#7a756c]">
                포스트 정보를 입력하세요. 지도 좌표는 포스트 배치 편집기에서 설정할 수 있습니다.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-[#2a2924] bg-[#18181a] p-6">
            <PostForm
              gameId={gameId}
              initial={editingPost ?? undefined}
              onSaved={async () => {
                await refreshPosts();
                setMode("list");
                setEditingPost(null);
              }}
              onCancel={() => { setMode("list"); setEditingPost(null); }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // 목록 모드
  // ─────────────────────────────────────────────

  const totalQuizzes = posts.reduce((s, p) => s + (p.quizzes?.length ?? 0), 0);
  const placedCount  = posts.filter((p) => p.coord_x !== null).length;

  return (
    <div className="min-h-screen bg-[#0f0f10] text-[#e8e4d9]">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">

        {/* 헤더 */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => router.push("/games")}
                className="text-xs font-medium tracking-widest text-[#b89a5a]
                  uppercase hover:text-[#c9aa6a] transition-colors"
              >
                게임 관리
              </button>
              <span className="text-[#3a3830]">/</span>
              <span className="text-xs text-[#5a5650] tracking-widest uppercase
                truncate max-w-[160px]">
                {gameTitle}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-[#e8e4d9] tracking-tight">
              포스트 관리
            </h1>
            {/* 요약 통계 */}
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <StatBadge label="포스트" value={posts.length} />
              <StatBadge label="퀴즈" value={totalQuizzes} />
              <StatBadge
                label="지도 배치"
                value={`${placedCount}/${posts.length}`}
                highlight={placedCount < posts.length}
              />
            </div>
          </div>

          {/* 액션 버튼 2개 */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={() => router.push(`/games/${gameId}/posts/editor`)}
              className="flex items-center gap-1.5 rounded-xl border border-[#2a2924]
                px-4 py-2.5 text-sm text-[#7a756c]
                hover:border-[#b89a5a]/50 hover:text-[#b89a5a] transition-colors"
            >
              <MapPinIcon /> 지도에서 배치
            </button>
            <button
              onClick={() => { setEditingPost(null); setMode("add"); }}
              className="flex items-center gap-1.5 rounded-xl bg-[#b89a5a]
                px-4 py-2.5 text-sm font-medium text-[#0f0f10]
                hover:bg-[#c9aa6a] transition-colors"
            >
              <PlusIcon /> 직접 추가
            </button>
          </div>
        </div>

        {/* 지도 배치 안내 배너 (미배치 포스트 있을 때) */}
        {posts.length > 0 && placedCount < posts.length && (
          <div className="mb-5 flex items-center justify-between gap-3
            rounded-xl border border-[#b89a5a]/20 bg-[#b89a5a]/5 px-4 py-3">
            <p className="text-sm text-[#b89a5a]">
              <span className="font-medium">{posts.length - placedCount}개</span> 포스트가
              아직 지도에 배치되지 않았습니다.
            </p>
            <button
              onClick={() => router.push(`/games/${gameId}/posts/editor`)}
              className="shrink-0 rounded-lg bg-[#b89a5a] px-3 py-1.5
                text-xs font-medium text-[#0f0f10] hover:bg-[#c9aa6a] transition-colors"
            >
              지도 편집기 열기
            </button>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="mb-4 rounded-xl border border-[#c0504a]/30 bg-[#c0504a]/10
            px-4 py-3 text-sm text-[#e07070]">
            {error}
          </div>
        )}

        {/* 빈 상태 */}
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 text-4xl opacity-30">📍</div>
            <p className="text-sm font-medium text-[#5a5650]">포스트가 없습니다</p>
            <p className="mt-1 text-xs text-[#3a3830]">
              지도에서 직접 배치하거나 직접 추가할 수 있습니다
            </p>
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => router.push(`/games/${gameId}/posts/editor`)}
                className="flex items-center gap-1.5 rounded-xl border border-[#2a2924]
                  px-4 py-2.5 text-sm text-[#7a756c]
                  hover:border-[#b89a5a]/50 hover:text-[#b89a5a] transition-colors"
              >
                <MapPinIcon /> 지도에서 배치
              </button>
              <button
                onClick={() => setMode("add")}
                className="flex items-center gap-1.5 rounded-xl bg-[#b89a5a]
                  px-5 py-2.5 text-sm font-medium text-[#0f0f10]
                  hover:bg-[#c9aa6a] transition-colors"
              >
                <PlusIcon /> 직접 추가
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {posts.map((post, idx) => (
                <PostCard
                  key={post.id}
                  post={post}
                  index={idx}
                  total={posts.length}
                  isConfirming={confirmDeleteId === post.id}
                  isDeleting={deletingId === post.id}
                  onEdit={() => { setEditingPost(post); setMode("edit"); }}
                  onMoveUp={() => movePost(idx, "up")}
                  onMoveDown={() => movePost(idx, "down")}
                  onDeleteRequest={() => setConfirmDeleteId(post.id)}
                  onDeleteConfirm={() => handleDelete(post.id)}
                  onDeleteCancel={() => setConfirmDeleteId(null)}
                />
              ))}
            </div>

            {/* 하단 네비 */}
            <div className="mt-8 flex flex-col-reverse gap-3
              sm:flex-row sm:justify-between">
              <button
                onClick={() => router.push(`/games/${gameId}/map`)}
                className="rounded-xl border border-[#2a2924] px-5 py-2.5 text-sm
                  text-[#7a756c] hover:border-[#3a3830] transition-colors"
              >
                ← 지도 관리로
              </button>
              <button
                onClick={() => router.push(`/games/${gameId}/edit`)}
                className="rounded-xl border border-[#2a2924] px-5 py-2.5 text-sm
                  text-[#7a756c] hover:border-[#3a3830] transition-colors"
              >
                게임 설정으로 →
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PostCard
// ─────────────────────────────────────────────

function PostCard({
  post, index, total, isConfirming, isDeleting,
  onEdit, onMoveUp, onMoveDown,
  onDeleteRequest, onDeleteConfirm, onDeleteCancel,
}: {
  post: Post; index: number; total: number;
  isConfirming: boolean; isDeleting: boolean;
  onEdit: () => void;
  onMoveUp: () => void; onMoveDown: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  const quizCount = post.quizzes?.length ?? 0;
  const hasCoords = post.coord_x !== null && post.coord_y !== null;

  return (
    <div className="rounded-xl border border-[#2a2924] bg-[#18181a] px-5 py-4
      hover:border-[#3a3830] transition-colors">
      <div className="flex items-start justify-between gap-3">

        {/* 번호 + 이름 */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="shrink-0 flex h-7 w-7 items-center justify-center
            rounded-lg bg-[#2a2924] text-xs font-bold text-[#b89a5a]">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-[#e8e4d9] truncate">
                {post.name}
              </h3>
              <span className="inline-flex items-center rounded-md bg-[#2a2924]
                px-2 py-0.5 text-[11px] text-[#7a756c]">
                {ORDER_MODE_LABEL[post.order_mode]}
              </span>
              {/* 좌표 배치 여부 */}
              {hasCoords ? (
                <span className="inline-flex items-center rounded-md
                  bg-[#4a9d6f]/10 px-2 py-0.5 text-[11px] text-[#4a9d6f]">
                  📍 배치됨
                </span>
              ) : (
                <span className="inline-flex items-center rounded-md
                  bg-[#b89a5a]/10 px-2 py-0.5 text-[11px] text-[#b89a5a]">
                  ⚠ 미배치
                </span>
              )}
            </div>
            {post.description && (
              <p className="mt-0.5 text-xs text-[#5a5650] line-clamp-1">
                {post.description}
              </p>
            )}
          </div>
        </div>

        {/* 액션 버튼 */}
        {!isConfirming ? (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onMoveUp} disabled={index === 0}
              className="rounded-lg border border-[#2a2924] p-1.5 text-[#5a5650]
                hover:text-[#9a9590] disabled:opacity-20 transition-colors"
              title="위로">
              <ChevronUpIcon />
            </button>
            <button onClick={onMoveDown} disabled={index === total - 1}
              className="rounded-lg border border-[#2a2924] p-1.5 text-[#5a5650]
                hover:text-[#9a9590] disabled:opacity-20 transition-colors"
              title="아래로">
              <ChevronDownIcon />
            </button>
            <button onClick={onEdit}
              className="rounded-lg border border-[#2a2924] p-1.5 text-[#5a5650]
                hover:text-[#9a9590] hover:border-[#3a3830] transition-colors"
              title="수정">
              <EditIcon />
            </button>
            <button onClick={onDeleteRequest}
              className="rounded-lg border border-[#2a2924] p-1.5 text-[#5a5650]
                hover:text-[#e07070] hover:border-[#c0504a]/40 hover:bg-[#c0504a]/10
                transition-colors"
              title="삭제">
              <TrashIcon />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-[#7a756c]">삭제?</span>
            <button onClick={onDeleteConfirm} disabled={isDeleting}
              className="rounded-lg bg-[#c0504a]/20 border border-[#c0504a]/30
                px-2.5 py-1 text-xs text-[#e07070] hover:bg-[#c0504a]/30
                disabled:opacity-50 transition-colors">
              {isDeleting ? "…" : "삭제"}
            </button>
            <button onClick={onDeleteCancel}
              className="rounded-lg border border-[#2a2924] px-2.5 py-1
                text-xs text-[#5a5650] hover:border-[#3a3830] transition-colors">
              취소
            </button>
          </div>
        )}
      </div>

      {/* 메타 정보 */}
      <div className="mt-3 flex items-center gap-2 flex-wrap pl-10">
        {post.time_limit_sec != null && (
          <MetaChip>
            ⏱ {Math.floor(post.time_limit_sec / 60)}분 {post.time_limit_sec % 60}초
          </MetaChip>
        )}
        <MetaChip>🏅 {post.score}점</MetaChip>
        <MetaChip>📝 퀴즈 {quizCount}개</MetaChip>
        {post.hint_1 && <MetaChip>💡 힌트 있음</MetaChip>}
        {hasCoords && (
          <MetaChip>
            x {post.coord_x?.toFixed(1)}% · y {post.coord_y?.toFixed(1)}%
          </MetaChip>
        )}
        {quizCount > 0 && (
          <div className="flex gap-1 flex-wrap">
            {post.quizzes?.map((q) => (
              <span key={q.id}
                className="inline-flex items-center rounded-md bg-[#b89a5a]/10
                  px-2 py-0.5 text-[10px] text-[#b89a5a]">
                {QUIZ_TYPE_LABEL[q.type]}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 서브 컴포넌트
// ─────────────────────────────────────────────

function StatBadge({
  label, value, highlight,
}: {
  label: string; value: string | number; highlight?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1
      text-xs border
      ${highlight
        ? "border-[#b89a5a]/30 bg-[#b89a5a]/10 text-[#b89a5a]"
        : "border-[#2a2924] bg-[#18181a] text-[#5a5650]"
      }`}>
      <span className="font-semibold text-[#e8e4d9]">{value}</span>
      {label}
    </span>
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

// ─────────────────────────────────────────────
// 아이콘
// ─────────────────────────────────────────────

function MapPinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
