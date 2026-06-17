// lib/puzzles.ts

import { SupabaseClient } from "@supabase/supabase-js";
import type { PostPuzzle, CreatePuzzleInput, UpdatePuzzleInput } from "@/types/puzzle";

const FIELDS = "id, post_id, image_url, cols, rows, time_limit_sec, hint_enabled, created_at";

export async function getPuzzle(
  supabase: SupabaseClient,
  postId: string
): Promise<PostPuzzle | null> {
  const { data, error } = await supabase
    .from("post_puzzles")
    .select(FIELDS)
    .eq("post_id", postId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as PostPuzzle | null;
}

export async function upsertPuzzle(
  supabase: SupabaseClient,
  postId: string,
  input: CreatePuzzleInput
): Promise<PostPuzzle> {
  // 기존 퍼즐이 있으면 업데이트, 없으면 삽입
  const { data: existing } = await supabase
    .from("post_puzzles")
    .select("id")
    .eq("post_id", postId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("post_puzzles")
      .update(input)
      .eq("post_id", postId)
      .select(FIELDS)
      .single();
    if (error) throw new Error(error.message);
    return data as PostPuzzle;
  } else {
    const { data, error } = await supabase
      .from("post_puzzles")
      .insert({ ...input, post_id: postId })
      .select(FIELDS)
      .single();
    if (error) throw new Error(error.message);
    return data as PostPuzzle;
  }
}

export async function deletePuzzle(
  supabase: SupabaseClient,
  postId: string
): Promise<void> {
  const { error } = await supabase
    .from("post_puzzles")
    .delete()
    .eq("post_id", postId);
  if (error) throw new Error(error.message);
}

// 퍼즐 이미지 업로드
export async function uploadPuzzleImage(
  supabase: SupabaseClient,
  postId: string,
  file: File
): Promise<string> {
  const ext  = file.name.split(".").pop() ?? "jpg";
  const path = `${postId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("puzzles")
    .upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("puzzles").getPublicUrl(path);
  return data.publicUrl;
}
