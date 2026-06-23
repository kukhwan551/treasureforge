// app/api/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get("game_id");
  if (!gameId) return NextResponse.json({ error: { message: "game_id required" } }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("posts")
    .select("*, quizzes(*), post_puzzles(*), post_photo_missions(*)")
    .eq("game_id", gameId)
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  if (error) return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  // post_photo_missions를 항상 배열로 정규화
  const normalized = (data ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    post_photo_missions: p.post_photo_missions
      ? Array.isArray(p.post_photo_missions) ? p.post_photo_missions : [p.post_photo_missions]
      : [],
  }));
  return NextResponse.json({ data: normalized, error: null });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

  const input = await req.json();
  const admin = createAdminClient();

  const { data: last } = await admin
    .from("posts").select("order_index")
    .eq("game_id", input.game_id)
    .order("order_index", { ascending: false })
    .limit(1).maybeSingle();

  const { data, error } = await admin
    .from("posts")
    .insert({ ...input, order_index: input.order_index ?? (last?.order_index ?? -1) + 1, is_active: true })
    .select("*, quizzes(*)")
    .single();

  if (error) return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  return NextResponse.json({ data, error: null }, { status: 201 });
}
