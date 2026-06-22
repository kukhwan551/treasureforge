"use client";

// components/posts/PostForm.tsx
// 미션 유형 선택 추가: 퀴즈 | 그림퍼즐

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createPost, updatePost,
  createQuiz, updateQuiz, deleteQuiz,
} from "@/lib/posts";
import QuizForm      from "@/components/quizzes/QuizForm";
import AiQuizGenerator from "@/components/quizzes/AiQuizGenerator";
import PuzzleForm    from "@/components/puzzle/PuzzleForm";
import type { Post, Quiz, CreatePostInput, UpdatePostInput, CreateQuizInput, UpdateQuizInput } from "@/types/post";
import type { PostPuzzle } from "@/types/puzzle";
import { QUIZ_TYPE_LABEL } from "@/types/post";

interface GameContext {
  title: string;
  description: string | null;
  difficulty: "easy" | "medium" | "hard";
  target_age: "child" | "teen" | "adult" | "senior" | "all";
}

interface PostFormProps {
  gameId: string;
  game:   GameContext;
  initial?: Post;
  onSaved: (post: Post) => void;
  onCancel: () => void;
}

type MissionType = "quiz" | "puzzle" | "photo";

export default function PostForm({ gameId, game, initial, onSaved, onCancel }: PostFormProps) {
  const supabase = createClient();

  const [name,         setName]         = useState(initial?.name ?? "");
  const [description,  setDescription]  = useState(initial?.description ?? "");
  const [timeLimitSec, setTimeLimitSec] = useState<number | "">(initial?.time_limit_sec ?? "");
  const [score,        setScore]        = useState(initial?.score ?? 10);
  const [missionType,  setMissionType]  = useState<MissionType>(
    (initial?.mission_type as MissionType) ?? "quiz"
  );
  const [photoKeywords,  setPhotoKeywords]  = useState(
    (initial as unknown as { post_photo_missions?: {keywords:string;guide_text:string}[] })
      ?.post_photo_missions?.[0]?.keywords ?? ""
  );
  const [photoGuideText, setPhotoGuideText] = useState(
    (initial as unknown as { post_photo_missions?: {keywords:string;guide_text:string}[] })
      ?.post_photo_missions?.[0]?.guide_text ?? ""
  );

  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [saving,  setSaving]  = useState(false);

  const [savedPost, setSavedPost] = useState<Post | null>(initial ?? null);
  const currentPost = savedPost ?? initial;

  const [quizzes,       setQuizzes]       = useState<Quiz[]>(initial?.quizzes ?? []);
  const [quizMode,      setQuizMode]      = useState<"list" | "add" | "edit">("list");
  const [editingQuiz,   setEditingQuiz]   = useState<Quiz | null>(null);
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);
  const [showAiModal,   setShowAiModal]   = useState(false);

  const [puzzle, setPuzzle] = useState<PostPuzzle | null>(null);

  // 기존 퍼즐 로드
  useEffect(() => {
    if (!initial?.id) return;
    fetch(`/api/posts/${initial.id}/puzzle`)
      .then((r) => r.json())
      .then((j) => { if (j.data) setPuzzle(j.data); })
      .catch(() => {});
  }, [initial?.id]);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim())                e.name = "포스트 이름을 입력해 주세요.";
    else if (name.trim().length < 2) e.name = "이름은 2자 이상이어야 합니다.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSavePost(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name:           name.trim(),
        description:    description.trim() || null,
        time_limit_sec: timeLimitSec === "" ? null : Number(timeLimitSec),
        score,
        mission_type:   missionType,
      };
      let saved: Post;
      if (currentPost?.id) {
        const r = await fetch(`/api/posts/${currentPost.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = await r.json();
        if (j.error) throw new Error(j.error.message);
        saved = j.data as Post;
      } else {
        const r = await fetch(`/api/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, game_id: gameId }),
        });
        const j = await r.json();
        if (j.error) throw new Error(j.error.message);
        saved = j.data as Post;
      }
      // photo 미션 저장
      if (missionType === "photo" && saved.id) {
        await fetch("/api/photo-missions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ post_id: saved.id, keywords: photoKeywords, guide_text: photoGuideText }),
        });
      }
      const fullSaved = { ...saved, quizzes };
      setSavedPost(fullSaved);
      onSaved(fullSaved);
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "저장 중 오류" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveQuiz(data: CreateQuizInput | UpdateQuizInput) {
    if (!currentPost?.id) return;
    if (editingQuiz) {
      const r = await fetch(`/api/quizzes/${editingQuiz.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error.message);
      setQuizzes((q) => q.map((x) => (x.id === j.data.id ? j.data : x)));
    } else {
      const r = await fetch(`/api/quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(data as CreateQuizInput), post_id: currentPost.id }),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error.message);
      setQuizzes((q) => [...q, j.data]);
    }
    setQuizMode("list");
    setEditingQuiz(null);
  }

  async function handleDeleteQuiz(quizId: string) {
    setDeletingQuizId(quizId);
    try {
      const r = await fetch(`/api/quizzes/${quizId}`, { method: "DELETE" });
      const j = await r.json();
      if (j.error) throw new Error(j.error.message);
      setQuizzes((q) => q.filter((x) => x.id !== quizId));
    }
    finally { setDeletingQuizId(null); }
  }

  async function handleAiQuizSelect(input: CreateQuizInput) {
    if (!currentPost?.id) return;
    try {
      const r = await fetch(`/api/quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, post_id: currentPost.id }),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error.message);
      setQuizzes((q) => [...q, j.data]);
      setShowAiModal(false);
    } catch (err) { console.error("AI 퀴즈 저장 오류:", err); }
  }

  return (
    <div>
      <form onSubmit={handleSavePost} noValidate>
        <div className="space-y-5">

          {/* 포스트 이름 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#c4bfb4]">
              포스트 이름 <span className="text-[#b89a5a]">*</span>
            </label>
            <input type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 광화문, 경회루"
              className={iCls(!!errors.name)}/>
            {errors.name && <Err>{errors.name}</Err>}
          </div>

          {/* 설명 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#c4bfb4]">설명</label>
            <textarea rows={2} value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="참여자에게 보여줄 설명"
              className={`${iCls(false)} resize-none`}/>
          </div>

          {/* ★ 미션 유형 선택 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#c4bfb4]">미션 유형</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: "quiz"   as MissionType, label: "📝 퀴즈",    desc: "문제를 풀어서 통과" },
                { value: "puzzle" as MissionType, label: "🧩 그림 퍼즐", desc: "퍼즐을 맞춰서 통과" },
                { value: "photo"  as MissionType, label: "📸 인증샷",    desc: "사진으로 장소 인증" },
              ] as const).map((opt) => {
                const sel = missionType === opt.value;
                return (
                  <button key={opt.value} type="button"
                    onClick={() => setMissionType(opt.value)}
                    className={`rounded-xl border px-4 py-3 text-left transition-all
                      ${sel
                        ? "border-[#b89a5a] bg-[#b89a5a]/15"
                        : "border-[#2a2924] bg-[#141414] hover:border-[#3a3830]"
                      }`}>
                    <span className={`block text-sm font-semibold
                      ${sel ? "text-[#e8e4d9]" : "text-[#7a756c]"}`}>
                      {opt.label}
                    </span>
                    <span className="block text-[10px] text-[#5a5650] mt-0.5">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 퀴즈 제한 시간 (퀴즈 모드만) */}
          {missionType === "quiz" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#c4bfb4]">
                퀴즈 제한 시간
                <span className="ml-1.5 text-[11px] text-[#4a4840] font-normal">(비워두면 무제한)</span>
              </label>
              <div className="flex items-center gap-2">
                <input type="number" min={10} max={3600} value={timeLimitSec}
                  onChange={(e) => setTimeLimitSec(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="초"
                  className={`${iCls(false)} w-32`}/>
                <span className="text-sm text-[#5a5650]">초</span>
              </div>
            </div>
          )}

          {/* 기본 점수 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#c4bfb4]">기본 점수</label>
            <div className="flex items-center gap-2">
              <input type="number" min={0} max={100} value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className={`${iCls(false)} w-24`}/>
              <span className="text-sm text-[#5a5650]">점</span>
            </div>
          </div>

          {errors.submit && (
            <div className="rounded-lg border border-[#c0504a]/30 bg-[#c0504a]/10
              px-4 py-3 text-sm text-[#e07070]">{errors.submit}</div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel}
              className="rounded-xl border border-[#2a2924] px-4 py-2.5 text-sm
                text-[#7a756c] hover:border-[#3a3830] transition-colors">
              취소
            </button>
            <button type="submit" disabled={saving}
              className="rounded-xl bg-[#b89a5a] px-5 py-2.5 text-sm font-medium
                text-[#0f0f10] hover:bg-[#c9aa6a] disabled:opacity-60 transition-colors">
              {saving ? "저장 중…" : currentPost?.id ? "포스트 수정" : "포스트 저장"}
            </button>
          </div>
        </div>
      </form>

      {/* ── 미션 설정 (저장 후 표시) ── */}
      {currentPost?.id && (
        <div className="mt-8 pt-6 border-t border-[#2a2924]">

          {/* 퀴즈 섹션 */}
          {missionType === "quiz" && (
            <>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-sm font-semibold text-[#e8e4d9]">
                  퀴즈 목록
                  <span className="ml-2 text-[11px] text-[#5a5650] font-normal">{quizzes.length}개</span>
                </h3>
                {quizMode === "list" && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowAiModal(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#b89a5a]/50
                        bg-[#b89a5a]/10 px-3 py-1.5 text-xs font-medium text-[#b89a5a]
                        hover:bg-[#b89a5a]/20 transition-colors">
                      <SparkleIcon/> AI로 생성
                    </button>
                    <button type="button" onClick={() => { setEditingQuiz(null); setQuizMode("add"); }}
                      className="flex items-center gap-1.5 rounded-lg border border-[#2a2924]
                        px-3 py-1.5 text-xs text-[#7a756c] hover:border-[#3a3830] transition-colors">
                      <PlusIcon/> 직접 추가
                    </button>
                  </div>
                )}
              </div>

              {(quizMode === "add" || quizMode === "edit") && (
                <div className="mb-4 rounded-xl border border-[#2a2924] bg-[#141414] p-4">
                  <p className="mb-4 text-xs font-medium text-[#b89a5a]">
                    {quizMode === "edit" ? "퀴즈 수정" : "새 퀴즈"}
                  </p>
                  <QuizForm postId={currentPost.id} initial={editingQuiz ?? undefined}
                    onSave={handleSaveQuiz}
                    onCancel={() => { setQuizMode("list"); setEditingQuiz(null); }}/>
                </div>
              )}

              {quizMode === "list" && (
                <div className="space-y-2">
                  {quizzes.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#2a2924]
                      py-10 text-center space-y-3">
                      <p className="text-sm text-[#3a3830]">아직 퀴즈가 없습니다.</p>
                      <div className="flex justify-center gap-2">
                        <button type="button" onClick={() => setShowAiModal(true)}
                          className="inline-flex items-center gap-1.5 rounded-xl
                            border border-[#b89a5a]/40 bg-[#b89a5a]/10 px-4 py-2
                            text-sm font-medium text-[#b89a5a] hover:bg-[#b89a5a]/20 transition-colors">
                          <SparkleIcon/> AI로 퀴즈 자동 생성
                        </button>
                      </div>
                    </div>
                  ) : (
                    quizzes.map((quiz) => (
                      <div key={quiz.id}
                        className="rounded-xl border border-[#2a2924] bg-[#18181a] px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="inline-flex rounded-md bg-[#b89a5a]/15
                                px-2 py-0.5 text-[11px] text-[#b89a5a]">
                                {QUIZ_TYPE_LABEL[quiz.type]}
                              </span>
                              <span className="text-[11px] text-[#4a4840]">{quiz.score}점</span>
                              {quiz.hint_text && <span className="text-[11px] text-[#4a7a6a]">💡 힌트</span>}
                            </div>
                            <p className="text-sm text-[#c4bfb4] line-clamp-2">{quiz.question}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button type="button"
                              onClick={() => { setEditingQuiz(quiz); setQuizMode("edit"); }}
                              className="rounded-lg border border-[#2a2924] p-1.5 text-[#5a5650]
                                hover:text-[#9a9590] transition-colors">
                              <EditIcon/>
                            </button>
                            <button type="button"
                              onClick={() => handleDeleteQuiz(quiz.id)}
                              disabled={deletingQuizId === quiz.id}
                              className="rounded-lg border border-[#2a2924] p-1.5 text-[#5a5650]
                                hover:text-[#e07070] disabled:opacity-40 transition-colors">
                              <TrashIcon/>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {/* 퍼즐 섹션 */}
          {missionType === "puzzle" && (
            <>
              <h3 className="text-sm font-semibold text-[#e8e4d9] mb-4">
                🧩 퍼즐 설정
                {puzzle && <span className="ml-2 text-[11px] text-[#4a9d6f] font-normal">설정 완료</span>}
              </h3>
              <PuzzleForm
                postId={currentPost.id}
                initial={puzzle}
                onSaved={(p) => setPuzzle(p)}
              />
            </>
          )}
          {currentPost?.id && missionType === "photo" && (
            <div className="mt-4 space-y-3">
              <h3 className="text-sm font-semibold text-[#e8e4d9] mb-4">
                📸 인증샷 미션 설정
              </h3>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#c4bfb4]">
                  확인 키워드
                  <span className="ml-1 text-[#5a5650]">(쉼표 구분, 하나라도 이미지에 있으면 통과)</span>
                </label>
                <input type="text" value={photoKeywords}
                  onChange={e => setPhotoKeywords(e.target.value)}
                  placeholder="예: 스타벅스, STARBUCKS, 별다방"
                  className="w-full rounded-xl border border-[#2a2924] bg-[#0f0f10]
                    px-3 py-2.5 text-xs text-[#e8e4d9] placeholder:text-[#3a3830]
                    focus:outline-none focus:border-[#b89a5a] transition-colors"/>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#c4bfb4]">참여자 안내 문구</label>
                <input type="text" value={photoGuideText}
                  onChange={e => setPhotoGuideText(e.target.value)}
                  placeholder="예: 매장 입구 간판이 보이게 찍어주세요"
                  className="w-full rounded-xl border border-[#2a2924] bg-[#0f0f10]
                    px-3 py-2.5 text-xs text-[#e8e4d9] placeholder:text-[#3a3830]
                    focus:outline-none focus:border-[#b89a5a] transition-colors"/>
              </div>
              <button type="button" disabled={saving}
                onClick={async () => {
                  if (!currentPost?.id) return;
                  setSaving(true);
                  try {
                    await fetch("/api/photo-missions", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ post_id: currentPost.id, keywords: photoKeywords, guide_text: photoGuideText }),
                    });
                  } finally { setSaving(false); }
                }}
                className="w-full rounded-xl bg-[#b89a5a] px-4 py-2.5 text-sm font-medium text-[#0f0f10] hover:bg-[#c9aa6a] disabled:opacity-60 transition-colors mt-2">
                {saving ? "저장 중..." : "💾 인증샷 설정 저장"}
              </button>
            </div>
          )}
        </div>
      )}

      {!currentPost?.id && (
        <div className="mt-6 rounded-xl border border-dashed border-[#2a2924] py-6 text-center">
          <p className="text-xs text-[#4a4840]">포스트를 먼저 저장하면 미션을 추가할 수 있습니다</p>
        </div>
      )}

      {showAiModal && currentPost?.id && (
        <AiQuizGenerator
          game={game}
          post={{ id: currentPost.id, name: name || currentPost.name, description: description || currentPost.description }}
          onSelect={handleAiQuizSelect}
          onClose={() => setShowAiModal(false)}
        />
      )}
    </div>
  );
}

function iCls(hasErr: boolean) {
  return ["w-full rounded-xl border bg-[#141414] px-3.5 py-2.5 text-sm",
    "text-[#e8e4d9] placeholder:text-[#3a3830] transition-colors focus:outline-none focus:ring-1",
    hasErr
      ? "border-[#c0504a]/60 focus:border-[#c0504a] focus:ring-[#c0504a]/30"
      : "border-[#2a2924] hover:border-[#3a3830] focus:border-[#b89a5a] focus:ring-[#b89a5a]/20",
  ].join(" ");
}
function Err({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-[#e07070]" role="alert">{children}</p>;
}
function SparkleIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>;
}
function PlusIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>;
}
function EditIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>;
}
function TrashIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
  </svg>;
}
