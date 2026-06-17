// lib/posts.ts
// Post + Quiz Supabase CRUD 서비스 레이어

import { SupabaseClient } from "@supabase/supabase-js";
import type {
  Post, Quiz,
  CreatePostInput, UpdatePostInput,
  CreateQuizInput, UpdateQuizInput,
} from "@/types/post";

// ═══════════════════════════════════════════
// POST CRUD
// ═══════════════════════════════════════════

/** 게임의 포스트 목록 (퀴즈 포함) */
export async function listPosts(
  supabase: SupabaseClient,
  gameId: string
): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*, quizzes(*)")
    .eq("game_id", gameId)
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Post[];
}

/** 포스트 단건 조회 */
export async function getPost(
  supabase: SupabaseClient,
  postId: string
): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .select("*, quizzes(*)")
    .eq("id", postId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Post | null;
}

/** 포스트 생성 */
export async function createPost(
  supabase: SupabaseClient,
  input: CreatePostInput
): Promise<Post> {
  // 현재 마지막 order_index 계산
  const { data: last } = await supabase
    .from("posts")
    .select("order_index")
    .eq("game_id", input.game_id)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextIndex = last ? (last.order_index ?? 0) + 1 : 0;

  const { data, error } = await supabase
    .from("posts")
    .insert({
      ...input,
      name:        input.name.trim(),
      description: input.description?.trim() ?? null,
      order_index: input.order_index ?? nextIndex,
      order_mode:  input.order_mode  ?? "free",
      score:       input.score       ?? 10,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Post;
}

/** 포스트 수정 */
export async function updatePost(
  supabase: SupabaseClient,
  postId: string,
  input: UpdatePostInput
): Promise<Post> {
  const patch: Record<string, unknown> = { ...input };
  if (input.name)        patch.name = input.name.trim();
  if (input.description) patch.description = input.description.trim();

  const { data, error } = await supabase
    .from("posts")
    .update(patch)
    .eq("id", postId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Post;
}

/** 포스트 삭제 (소프트: is_active = false) */
export async function deletePost(
  supabase: SupabaseClient,
  postId: string
): Promise<void> {
  const { error } = await supabase
    .from("posts")
    .update({ is_active: false })
    .eq("id", postId);

  if (error) throw new Error(error.message);
}

/** 포스트 순서 일괄 업데이트 (드래그 정렬용) */
export async function reorderPosts(
  supabase: SupabaseClient,
  updates: { id: string; order_index: number }[]
): Promise<void> {
  const promises = updates.map(({ id, order_index }) =>
    supabase.from("posts").update({ order_index }).eq("id", id)
  );
  await Promise.all(promises);
}

// ═══════════════════════════════════════════
// QUIZ CRUD
// ═══════════════════════════════════════════

/** 퀴즈 생성 */
export async function createQuiz(
  supabase: SupabaseClient,
  input: CreateQuizInput
): Promise<Quiz> {
  const { data, error } = await supabase
    .from("quizzes")
    .insert({
      post_id:     input.post_id,
      type:        input.type,
      question:    input.question.trim(),
      answer:      input.answer.trim(),
      options:     input.options     ?? [],
      pass_count:  input.pass_count  ?? 1,
      total_count: input.total_count ?? 1,
      explanation: input.explanation ?? null,
      score:       input.score       ?? 10,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Quiz;
}

/** 퀴즈 수정 */
export async function updateQuiz(
  supabase: SupabaseClient,
  quizId: string,
  input: UpdateQuizInput
): Promise<Quiz> {
  const patch: Record<string, unknown> = { ...input };
  if (input.question) patch.question = input.question.trim();
  if (input.answer)   patch.answer   = input.answer.trim();

  const { data, error } = await supabase
    .from("quizzes")
    .update(patch)
    .eq("id", quizId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Quiz;
}

/** 퀴즈 삭제 */
export async function deleteQuiz(
  supabase: SupabaseClient,
  quizId: string
): Promise<void> {
  const { error } = await supabase
    .from("quizzes")
    .delete()
    .eq("id", quizId);

  if (error) throw new Error(error.message);
}
